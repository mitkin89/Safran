'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),R=require('../../reader'),data=require('../../maccabees-alignment-data');
module.exports=async({win,js,waitFor,book})=>{
 async function open(title){await book(title);await waitFor(`document.querySelector('#rTitle')?.firstChild?.textContent.trim()===${JSON.stringify(title)}`,'book loaded '+title);}
 async function choose(rels){
  await js("document.querySelector('#verBox').open=true");
  for(let n=0;n<16;n++){
   const change=await js(`(()=>{const wanted=${JSON.stringify(rels)},options=[...document.querySelectorAll('#verList input')].map(c=>({rel:c.dataset.rel,checked:c.checked,want:wanted.includes(c.dataset.rel)}));return options.find(x=>x.want&&!x.checked)||options.find(x=>!x.want&&x.checked);})()`);
   if(!change)break;
   await js(`document.querySelectorAll('#verList input').forEach(c=>{if(c.dataset.rel===${JSON.stringify(change.rel)})c.click()});new Promise(resolve=>requestAnimationFrame(resolve))`);
   await waitFor("document.querySelectorAll('#rOut .row.head > div:not(.lab)').length===document.querySelectorAll('#verList input:checked').length",'version load completed');
  }
  await waitFor(`document.querySelector('#rOut .aligned-passages') && document.querySelectorAll('#verList input:checked').length===${rels.length}`,'checked source set');
  await js("document.querySelector('#verBox').open=false");
 }
 async function chapterCheck(title,chapter,sources,screenshot=false){
  await js(`document.querySelector('#rSection').value=${chapter};document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}));new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  await waitFor("document.querySelector('#rOut .aligned-passages')",title+' '+(chapter+1));
  const actual=await js("[...document.querySelectorAll('.passage-row')].reduce((r,p)=>{[...p.querySelectorAll(':scope > .macc-column')].forEach((s,i)=>(r[i]??=[]).push(...[...s.querySelectorAll('.cell[data-macc-label]')].map(v=>v.dataset.maccLabel)));return r;},[])");
  const expected=sources.map(d=>R.flattenNode(d.text[chapter]||[]).map(r=>r.label));
  assert.deepEqual(actual,expected,title+' '+(chapter+1)+' source labels retained once');
  assert(await js(`[...document.querySelectorAll('.aligned-passages > .row.passage-row')].every(p=>p.querySelectorAll(':scope > .lab').length===1&&p.querySelectorAll(':scope > .macc-column').length===${sources.length}&&!p.querySelector('.row'))`),'one shared gutter, complete column grid, no nested rows');
  assert(await js("[...document.querySelectorAll('.passage-row')].every(p=>{const cols=[...p.querySelectorAll(':scope > .macc-column')];return cols.every(c=>Math.abs(c.getBoundingClientRect().top-cols[0].getBoundingClientRect().top)<1)})"),'passage columns align vertically');
  assert(await js("!document.querySelector('#rOut .numbering-note')"),'aligned layout needs no fallback warning');
  assert(await js("(()=>{const heads=[...document.querySelectorAll('#rOut .head > div:not(.lab)')];return [...document.querySelectorAll('.passage-row')].every(p=>[...p.querySelectorAll(':scope > .macc-column')].every((c,i)=>Math.abs(c.getBoundingClientRect().left-heads[i].getBoundingClientRect().left)<1));})()"),'passage columns share header grid');
  assert(await js("[...document.querySelectorAll('.passage-row .cell[data-macc-label]')].every(c=>c.dataset.rel&&c.dataset.k&&c.querySelector('.txt'))"),'native fragment keeps source and language metadata');
  if(screenshot){
   const path='/tmp/safran-maccabees-'+title.replace(/[^a-z0-9]/gi,'-')+'-'+(chapter+1),capture=await win.webContents.capturePage();fs.writeFileSync(path+'.png',capture.toPNG());
   // Headless Electron may return a 1×1 surface; retain a real rendered first
   // page for visual review while geometry assertions cover every chapter.
   if(chapter===0&&capture.getSize().width<=1)fs.writeFileSync(path+'.pdf',await win.webContents.printToPDF({printBackground:true,landscape:true,pageRanges:'1'}));
  }
 }
 let checked=0;
 for(const title of Object.keys(data.books)){
  await open(title);const src=data.books[title].sources.filter(s=>s.rel),sources=src.map(s=>require('../../bundled/'+s.rel));await choose(src.map(s=>s.rel));
  for(let c=0;c<data.books[title].chapters.length;c++){await chapterCheck(title,c,sources);checked++;}
 }
 await js("document.querySelector('#rSection').value='6';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('.macc-continuation[data-macc-chapter=\"8\"]')",'IV7 counterpart in chapter8');
 await js("document.querySelector('.macc-continuation[data-macc-chapter=\"8\"]').click()");
 await waitFor("document.querySelector('#rSection').value==='7'&&document.querySelector('.macc-continuation[data-macc-chapter=\"7\"]')",'counterpart chapter navigation');
 await js("document.querySelector('.macc-continuation[data-macc-chapter=\"7\"]').click()");
 assert.equal(await js("document.querySelector('#rSection').value"),'6');
 for(const [title,slug]of [['Makkabäer I','i'],['Makkabäer II','ii']]){
  await open(title);const he=require('../fixtures/maccabees-'+slug+'-he.json'),gr=data.books[title].sources.find(s=>s.family===1),heRel=slug==='i'?'fixture/The Book of Maccabees I/he.json':'fixture/maccabees-ii/he.json';await choose([heRel,gr.rel]);
  for(let c=0;c<he.text.length;c++){await chapterCheck(title,c,[he,require('../../bundled/'+gr.rel)]);checked++;}
  // The reported three-column selection: Hebrew, English, German.
  const en=require('../fixtures/maccabees-'+slug+'-en.json'),de=data.books[title].sources.find(s=>s.family===0);await choose([heRel,'fixture/maccabees-'+slug+'/en.json',de.rel]);
  for(let c=0;c<he.text.length;c++){await chapterCheck(title+' HE-EN-DE',c,[he,en,require('../../bundled/'+de.rel)],true);checked++;}
 }
 if(process.env.SAFRAN_KAHANA_SOURCE){
  await open('Makkabäer I');const raw=JSON.parse(fs.readFileSync(process.env.SAFRAN_KAHANA_SOURCE,'utf8')),gr=data.books['Makkabäer I'].sources.find(s=>s.family===1),heRel='fixture/The Book of Maccabees I (Kahana Translation)/he.json';await choose([heRel,gr.rel]);
  for(let c=0;c<raw.he.length;c++){await chapterCheck('Makkabäer I (Kahana)',c,[{text:raw.he},require('../../bundled/'+gr.rel)]);checked++;}
  const en=require('../fixtures/maccabees-kahana-i-en.json');await choose([heRel,'fixture/maccabees-kahana-i/en.json',gr.rel]);
  for(let c=0;c<raw.he.length;c++){await chapterCheck('Makkabäer I (Kahana English)',c,[{text:raw.he},en,require('../../bundled/'+gr.rel)]);checked++;}
 }
 console.log('Electron: '+checked+' Maccabees edition/chapter comparisons, shared gutter, native fragments, HE/EN/DE screenshots and IV cross-chapter navigation passed.');
};
