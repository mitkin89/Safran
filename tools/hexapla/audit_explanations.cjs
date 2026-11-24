'use strict';
// Reproduce coverage of rendered explanations, without treating comparisons as reviews.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../..'),window={},box={window};
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
vm.runInNewContext(fs.readFileSync(path.join(root,'library-textcrit-hexapla.js'),'utf8'),box);
const hx=window.LibraryHexaplaTC.create({esc:s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]),load:async(src,get)=>{if(!get())vm.runInNewContext(fs.readFileSync(path.join(root,src),'utf8'),box);return get();}});
(async()=>{
 const report={scope:'Field/Hexapla rendering; editorial notes, source references and signs are counted separately',books:0,units:0,synopsisUnits:0,explanations:{editorial:0,reviewed:0,reference:0,sign:0},reviewedRecords:0,unrenderedEditorialKeys:[]},editorial=new Set(),gaps=[],byBook=[];
 const editorialByVerse=new Map();
 for(const [key,n] of Object.entries(JSON.parse(fs.readFileSync(path.join(__dirname,'explanations.json'),'utf8')).records)){const ref=key.slice(0,key.indexOf('#'));if(!editorialByVerse.has(ref))editorialByVerse.set(ref,[]);editorialByVerse.get(ref).push([key,n]);}
 const needsNote=new Set(['wiedergabe','translit','vorlage','deutung','mt']);
 for(const book of window.LibraryHexaplaTC.BOOKS){
  const d=await hx.load(book);report.books++;
  const coverage={book,units:0,comparisonRows:0,rowsWithoutExplanation:0,unitsWithoutSynopsis:0};
  for(const [ref,units] of Object.entries(d.verses)){
   report.units+=units.length;coverage.units+=units.length;
   const rendered=hx.entries(d,[{ref:book+' '+ref,row:ref}]);
   for(const row of rendered){
    if(row.html.includes('class="tc-hx-syn"'))report.synopsisUnits++;
    else coverage.unitsWithoutSynopsis++;
    coverage.comparisonRows+=(row.hexaplaRows||[]).filter(r=>r.type).length;
    for(const comparison of row.hexaplaRows||[])if(needsNote.has(comparison.type)&&!comparison.hasExplanation){
     coverage.rowsWithoutExplanation++;
     gaps.push({book,ref,...row.hexaplaSource,...comparison});
    }
    for(const m of row.html.matchAll(/data-hx-explanation="(editorial|reviewed|reference|sign)"/g))report.explanations[m[1]]++;
   }
   for(const [key,n] of editorialByVerse.get(book+' '+ref)||[])if((n.variants||[n]).every(note=>rendered.some(row=>row.html.includes(escape(note.n)))))editorial.add(key);
  }
  byBook.push(coverage);
 }
 report.reviewedRecords=Object.keys(window.HEXAPLA_VORLAGE||{}).length;
 report.unrenderedEditorialKeys=Object.keys(window.HEXAPLA_EXPLANATIONS.records).filter(k=>!editorial.has(k));
 report.coverage={definition:'Translator rows with a difference label but no visible explanatory note; text presence is not a philological quality assessment',typesRequiringNotes:[...needsNote],rowsWithoutExplanation:gaps.length,versesWithGaps:new Set(gaps.map(g=>g.book+' '+g.ref)).size,byBook};
 const csvIndex=process.argv.indexOf('--gaps-csv');
 if(csvIndex>=0){
  if(!process.argv[csvIndex+1])throw Error('Missing --gaps-csv filename');
  const quote=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
  const header=['Buch','MT-Stelle','Schlüssel','Zeuge','Art','Griechischer Wortlaut','Hebräisches Stichwort','Field-Stelle','Field-Band','Field-Seite','Scanblatt'];
  const rows=gaps.map(g=>[g.book,g.ref,g.key,g.siglum,g.type,g.reading,g.lemma,g.fieldRef,g.volume,g.page,g.leaf]);
  fs.writeFileSync(process.argv[csvIndex+1],'\ufeff'+[header,...rows].map(r=>r.map(quote).join(';')).join('\n')+'\n');
 }
 report.otherWitnessNotes={};
 for(const [dir,name] of [['lxx-readings','LXX_READINGS'],['peshitta-readings','PESHITTA_READINGS']]){
  for(const file of fs.readdirSync(path.join(root,dir)))if(file.endsWith('.js')&&file!=='index.js')vm.runInNewContext(fs.readFileSync(path.join(root,dir,file),'utf8'),box);
  let readings=0,missingNotes=0;
  for(const data of Object.values(window[name]))for(const verse of Object.values(data.verses||data))for(const reading of (Array.isArray(verse)?verse:verse?.r)||[]){readings++;if(!reading.note?.trim())missingNotes++;}
  report.otherWitnessNotes[dir]={readings,missingNotes};
 }
 const output=JSON.stringify(report,null,2)+'\n';
 if(process.argv.includes('--write'))fs.writeFileSync(path.join(__dirname,'explanations-audit.json'),output);
 process.stdout.write(output);
})().catch(e=>{console.error(e);process.exitCode=1;});
