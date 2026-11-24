'use strict';
// Reproduce coverage of rendered explanations, without treating comparisons as reviews.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../..'),window={},box={window};
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
vm.runInNewContext(fs.readFileSync(path.join(root,'library-textcrit-hexapla.js'),'utf8'),box);
const hx=window.LibraryHexaplaTC.create({esc:s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]),load:async(src,get)=>{if(!get())vm.runInNewContext(fs.readFileSync(path.join(root,src),'utf8'),box);return get();}});
(async()=>{
 const report={scope:'Field/Hexapla rendering; automatic comparisons are not philological reviews',books:0,units:0,synopsisUnits:0,explanations:{editorial:0,reviewed:0,comparison:0},reviewedRecords:0,unrenderedEditorialKeys:[]},editorial=new Set();
 for(const book of window.LibraryHexaplaTC.BOOKS){
  const d=await hx.load(book);report.books++;
  for(const [ref,units] of Object.entries(d.verses)){
   report.units+=units.length;
   const rendered=hx.entries(d,[{ref:book+' '+ref,row:ref}]);
   for(const row of rendered){
    if(row.html.includes('class="tc-hx-syn"'))report.synopsisUnits++;
    for(const m of row.html.matchAll(/data-hx-explanation="(editorial|reviewed|comparison)"/g))report.explanations[m[1]]++;
   }
   for(const [key,n] of Object.entries(window.HEXAPLA_EXPLANATIONS.records))if(key.startsWith(book+' '+ref+'#')&&rendered.some(row=>row.html.includes(escape(n.n))))editorial.add(key);
  }
 }
 report.reviewedRecords=Object.keys(window.HEXAPLA_VORLAGE||{}).length;
 report.unrenderedEditorialKeys=Object.keys(window.HEXAPLA_EXPLANATIONS.records).filter(k=>!editorial.has(k));
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
