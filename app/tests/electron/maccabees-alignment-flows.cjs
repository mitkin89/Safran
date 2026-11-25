'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),R=require('../../reader'),A=require('../../maccabees-alignment'),data=require('../../maccabees-alignment-data');
module.exports=async({win,js,waitFor,book})=>{
 const normal=s=>String(s).replace(/\s+/g,' ').trim();
 const source=(rel,doc)=>({...doc,rel});
 async function open(title){await book(title);await waitFor(`document.querySelector('#rTitle')?.firstChild?.textContent.trim()===${JSON.stringify(title)}`,'book loaded '+title);}
 async function choose(rels){
  await js("document.querySelector('#verBox').open=true");
  for(let n=0;n<16;n++){
   const change=await js(`(()=>{const wanted=${JSON.stringify(rels)},options=[...document.querySelectorAll('#verList input')].map(c=>({rel:c.dataset.rel,checked:c.checked,want:wanted.includes(c.dataset.rel)}));return options.find(x=>x.want&&!x.checked)||options.find(x=>!x.want&&x.checked);})()`);
   if(!change)break;
   await js(`document.querySelectorAll('#verList input').forEach(c=>{if(c.dataset.rel===${JSON.stringify(change.rel)})c.click()});new Promise(resolve=>requestAnimationFrame(resolve))`);
   await waitFor("document.querySelectorAll('#rOut .row.head > div:not(.lab)').length===document.querySelectorAll('#verList input:checked').length",'version load completed');
  }
  await waitFor(`document.querySelector('#rOut .aligned-passages.canonical-verses') && document.querySelectorAll('#verList input:checked').length===${rels.length}`,'checked canonical source set');
  await js("document.querySelector('#verBox').open=false");
 }
 function coverage(sources){return sources.map(()=>new Map());}
 function recordParts(seen,sources,cells,label){
  for(const cell of cells){
   const i=sources.findIndex(s=>s.rel===cell.rel);assert(i>=0,label+' displayed source belongs to selection');
   assert(cell.parts.length,label+' filled cell has original intervals');
   for(const part of cell.parts){
    assert(Number.isInteger(part.chapter)&&Number.isInteger(part.slot)&&Number.isInteger(part.start)&&Number.isInteger(part.end),label+' integer source provenance');
    const raw=sources[i].text[part.chapter-1]?.[part.slot-1];assert.equal(typeof raw,'string',label+' original chapter and slot exist');
    assert(part.start>=0&&part.start<part.end&&part.end<=raw.length,label+' source interval in bounds');
    const key=part.chapter+':'+part.slot,list=seen[i].get(key)||[];list.push(part);seen[i].set(key,list);
   }
  }
 }
 function checkCoverage(seen,sources,label){
  sources.forEach((s,i)=>s.text.forEach((chapter,c)=>chapter.forEach((raw,v)=>{
   const parts=(seen[i].get((c+1)+':'+(v+1))||[]).sort((a,b)=>a.start-b.start);let cursor=0,restored='';
   for(const p of parts){assert.equal(p.start,cursor,label+' source '+i+' '+(c+1)+':'+(v+1)+' no dropped or duplicated characters');restored+=raw.slice(p.start,p.end);cursor=p.end;}
   assert.equal(cursor,raw.length,label+' complete original source '+i+' '+(c+1)+':'+(v+1));
   assert.equal(restored,raw,label+' exact original HTML including footnotes');
  })));
 }
 async function chapterCheck(title,chapter,sources,seen,screenshot=false){
  await js(`document.querySelector('#rSection').value=${chapter};document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}));new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  await waitFor("document.querySelector('#rOut .aligned-passages.canonical-verses')",title+' '+(chapter+1));
  const actual=await js("[...document.querySelectorAll('.canonical-verses > .row.passage-row')].map(p=>({label:p.dataset.l,gutters:[...p.querySelectorAll(':scope > .lab .verse-tool')].map(b=>b.textContent.trim()),columns:[...p.querySelectorAll(':scope > .macc-column')].map(s=>{const cell=s.querySelector(':scope > .cell[data-macc-parts]');return cell?{rel:cell.dataset.rel,label:cell.dataset.maccLabel,parts:JSON.parse(cell.dataset.maccParts),main:(()=>{const t=cell.querySelector('.txt').cloneNode(true);t.querySelectorAll('.note').forEach(n=>n.remove());return t.textContent;})()}:null;})}))");
  const canonicalBook=title.split(' (')[0],total=data.books[canonicalBook].sources.find(s=>s.family===1).chapters[chapter].slots;
  assert.deepEqual(actual.map(r=>r.label),Array.from({length:total},(_,i)=>String(i+1)),title+' '+(chapter+1)+' exactly one row per canonical Greek verse, independent of source selection');
  const cells=[];
  for(const row of actual){
   assert.deepEqual(row.gutters,[row.label],title+' one canonical verse number');assert.equal(row.columns.length,sources.length);
   row.columns.forEach((cell,i)=>{if(!cell)return;assert.equal(cell.rel,sources[i].rel,title+' column order');assert.equal(cell.label,row.label,title+' one combined cell per canonical verse');cells.push(cell);});
  }
  recordParts(seen,sources,cells,title+' '+(chapter+1));
  // Compare the rendered main text to the checked raw source intervals. Source
  // footnotes are audited byte-for-byte by checkCoverage, independently of their UI.
  const expectedMain=cells.map(cell=>{const s=sources.find(s=>s.rel===cell.rel),html=cell.parts.map(p=>A.fragmentHtml(s.text[p.chapter-1][p.slot-1],p.start,p.end)).join(' ');return R.splitFootnotes(html).main;});
  const decoded=await js(`(()=>{const t=document.createElement('template');return ${JSON.stringify(expectedMain)}.map(h=>{t.innerHTML=h;return t.content.textContent.replace(/\\s+/g,' ').trim();});})()`);
  assert.deepEqual(cells.map(c=>normal(c.main)),decoded,title+' '+(chapter+1)+' displayed words match the source fragments');
  assert(await js(`[...document.querySelectorAll('.canonical-verses > .row.passage-row')].every(p=>p.querySelectorAll(':scope > .lab').length===1&&p.querySelectorAll(':scope > .macc-column').length===${sources.length}&&!p.querySelector('.row')&&[...p.querySelectorAll(':scope > .macc-column')].every(c=>c.querySelectorAll(':scope > .cell').length===1))`),'one shared gutter, one combined source cell per column, no nested rows');
  assert(await js("[...document.querySelectorAll('.passage-row')].every(p=>{const cols=[...p.querySelectorAll(':scope > .macc-column')];return cols.every(c=>Math.abs(c.getBoundingClientRect().top-cols[0].getBoundingClientRect().top)<1)})"),'canonical verse columns align vertically');
  assert(await js("!document.querySelector('#rOut .numbering-note,#rOut .macc-continuation,#rOut .macc-native-label')"),'no warning, native numbering or continuation buttons in canonical display');
  assert(await js("(()=>{const heads=[...document.querySelectorAll('#rOut .head > div:not(.lab)')];return [...document.querySelectorAll('.passage-row')].every(p=>[...p.querySelectorAll(':scope > .macc-column')].every((c,i)=>Math.abs(c.getBoundingClientRect().left-heads[i].getBoundingClientRect().left)<1));})()"),'canonical columns share header grid');
  assert(await js("[...document.querySelectorAll('.passage-row .cell[data-macc-label]')].every(c=>c.dataset.rel&&c.dataset.k&&c.querySelector('.txt'))"),'combined cell retains source and language metadata');
  if(canonicalBook==='Makkabäer IV'&&chapter===7){
   const originalPrevious=cells.flatMap(c=>c.parts.filter(p=>p.chapter===7&&p.slot===24).map(p=>({label:c.label,...p})));assert(originalPrevious.length,'IV Greek8:1 includes actual German7:24 source');assert(originalPrevious.every(p=>p.label==='1'));
  }
  if(screenshot){
   const path='/tmp/safran-maccabees-'+title.replace(/[^a-z0-9]/gi,'-')+'-'+(chapter+1),capture=await win.webContents.capturePage();fs.writeFileSync(path+'.png',capture.toPNG());
   if(chapter===0&&capture.getSize().width<=1)fs.writeFileSync(path+'.pdf',await win.webContents.printToPDF({printBackground:true,landscape:true,pageRanges:'1'}));
  }
 }
 async function wholeBook(title,sources,count,screenshot=false){const seen=coverage(sources);for(let c=0;c<count;c++){await chapterCheck(title,c,sources,seen,screenshot&&c===0);checked++;}checkCoverage(seen,sources,title);}
 let checked=0;
 for(const title of Object.keys(data.books)){
  await open(title);const src=data.books[title].sources.filter(s=>s.rel),sources=src.map(s=>source(s.rel,require('../../bundled/'+s.rel)));await choose(src.map(s=>s.rel));
  await wholeBook(title,sources,data.books[title].chapters.length);
 }
 for(const [title,slug]of [['Makkabäer I','i'],['Makkabäer II','ii']]){
  await open(title);const he=require('../fixtures/maccabees-'+slug+'-he.json'),gr=data.books[title].sources.find(s=>s.family===1),heRel=slug==='i'?'fixture/The Book of Maccabees I/he.json':'fixture/maccabees-ii/he.json';await choose([heRel,gr.rel]);
  await wholeBook(title,[source(heRel,he),source(gr.rel,require('../../bundled/'+gr.rel))],he.text.length);
  const en=require('../fixtures/maccabees-'+slug+'-en.json'),de=data.books[title].sources.find(s=>s.family===0),enRel='fixture/maccabees-'+slug+'/en.json';await choose([heRel,enRel,de.rel]);
  await wholeBook(title+' (HE-EN-DE)',[source(heRel,he),source(enRel,en),source(de.rel,require('../../bundled/'+de.rel))],he.text.length,true);
  // The English/German/Greek selection in the reported screenshot must use the
  // same canonical row labels as the Hebrew selections, including the final verse.
  await choose([enRel,de.rel,gr.rel]);await chapterCheck(title+' (EN-DE-GR)',0,[source(enRel,en),source(de.rel,require('../../bundled/'+de.rel)),source(gr.rel,require('../../bundled/'+gr.rel))],coverage([en,de,gr]),true);checked++;
 }
 if(process.env.SAFRAN_KAHANA_SOURCE){
  await open('Makkabäer I');const raw=JSON.parse(fs.readFileSync(process.env.SAFRAN_KAHANA_SOURCE,'utf8')),gr=data.books['Makkabäer I'].sources.find(s=>s.family===1),heRel='fixture/The Book of Maccabees I (Kahana Translation)/he.json';await choose([heRel,gr.rel]);
  await wholeBook('Makkabäer I (Kahana)',[source(heRel,{text:raw.he}),source(gr.rel,require('../../bundled/'+gr.rel))],raw.he.length);
  const en=require('../fixtures/maccabees-kahana-i-en.json'),enRel='fixture/maccabees-kahana-i/en.json';await choose([heRel,enRel,gr.rel]);
  await wholeBook('Makkabäer I (Kahana English)',[source(heRel,{text:raw.he}),source(enRel,en),source(gr.rel,require('../../bundled/'+gr.rel))],raw.he.length);
 }
 console.log('Electron: '+checked+' Maccabees edition/chapter comparisons, canonical verse labels, exact original HTML coverage, rendered words, shared header geometry and IV8:1 cross-chapter source passed.');
};
