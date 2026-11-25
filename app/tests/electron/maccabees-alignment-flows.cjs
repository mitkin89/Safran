'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),R=require('../../reader'),data=require('../../maccabees-alignment-data');
module.exports=async({js,waitFor,book})=>{
 async function open(title){await book(title);await waitFor(`document.querySelector('#rTitle')?.firstChild?.textContent.trim()===${JSON.stringify(title)}`,'book loaded '+title);}
 async function choose(mode){
  await js("document.querySelector('#verBox').open=true");
  for(let n=0;n<12;n++){
   const change=await js(`(()=>{const options=[...document.querySelectorAll('#verList .voption')].map(e=>{const c=e.querySelector('input'),s=e.textContent;return {rel:c.dataset.rel,checked:c.checked,want:s.includes('Rahlfs')||(${JSON.stringify(mode)}==='de'?s.includes('Kautzsch'):${JSON.stringify(mode)}==='kahana'?s.includes('Kahana'):s.includes('Standardtext')&&!s.includes('Kahana'))};});return options.find(x=>x.want&&!x.checked)||options.find(x=>!x.want&&x.checked);})()`);
   if(!change)break;
   await js(`document.querySelectorAll('#verList input').forEach(c=>{if(c.dataset.rel===${JSON.stringify(change.rel)})c.click()});new Promise(resolve=>requestAnimationFrame(resolve))`);
   await waitFor("document.querySelectorAll('#rOut .row.head > div:not(.lab)').length===document.querySelectorAll('#verList input:checked').length",'version load completed');
  }
  await waitFor("document.querySelector('#rOut .aligned-passages') && document.querySelectorAll('#verList input:checked').length===2",'checked source pair');
 }
 async function chapterCheck(title,chapter,sources){
  await js(`document.querySelector('#rSection').value=${chapter};document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))`);
  await waitFor("document.querySelector('#rOut .aligned-passages')",title+' '+(chapter+1));
  const actual=await js("[...document.querySelectorAll('.passage-row')].reduce((r,p)=>{const cols=[...p.querySelectorAll(':scope > section')];cols.forEach((s,i)=>(r[i]??=[]).push(...[...s.querySelectorAll('.row[data-l]')].map(v=>v.dataset.l)));return r;},[])");
  const expected=sources.map(d=>R.flattenNode(d.text[chapter]).map(r=>r.label));
  // Columns follow the reader's language order: Hebrew, German, Greek.
  assert.deepEqual(actual,expected,title+' '+(chapter+1)+' source labels retained once');
  assert(await js("[...document.querySelectorAll('.passage-row')].every(p=>{const rows=[...p.querySelectorAll(':scope > section')].map(s=>s.querySelector('.row[data-l]')).filter(Boolean);return rows.length<2||Math.abs(rows[0].getBoundingClientRect().top-rows[1].getBoundingClientRect().top)<1})"),'passage starts align vertically');
 }
 let checked=0;
 for(const title of Object.keys(data.books)){
  await open(title);await choose('de');
  const sources=data.books[title].sources.filter(s=>s.rel).map(s=>require('../../bundled/'+s.rel));
  for(let c=0;c<data.books[title].chapters.length;c++){await chapterCheck(title,c,sources);checked++;}
 }
 // The chapter boundary differs in IV; navigation must name and open the
 // counterpart instead of assigning it to a false verse in chapter7.
 await js("document.querySelector('#rSection').value='6';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('.macc-continuation[data-macc-chapter=\"8\"]')",'IV7 counterpart in chapter8');
 await js("document.querySelector('.macc-continuation[data-macc-chapter=\"8\"]').click()");
 await waitFor("document.querySelector('#rSection').value==='7'&&document.querySelector('.macc-continuation[data-macc-chapter=\"7\"]')",'counterpart chapter navigation');
 await js("document.querySelector('.macc-continuation[data-macc-chapter=\"7\"]').click()");
 assert.equal(await js("document.querySelector('#rSection').value"),'6');
 for(const [title,slug]of [['Makkabäer I','i'],['Makkabäer II','ii']]){
  await open(title);await choose('he');
  const he=require('../fixtures/maccabees-'+slug+'-he.json'),gr=data.books[title].sources.find(s=>s.family===1),sources=[he,require('../../bundled/'+gr.rel)];
  for(let c=0;c<he.text.length;c++){await chapterCheck(title,c,sources);checked++;}
 }
 if(process.env.SAFRAN_KAHANA_SOURCE){
  await open('Makkabäer I');await choose('kahana');const raw=JSON.parse(fs.readFileSync(process.env.SAFRAN_KAHANA_SOURCE,'utf8')),s=data.books['Makkabäer I'].sources.find(s=>s.family===1),sources=[{text:raw.he},require('../../bundled/'+s.rel)];
  for(let c=0;c<raw.he.length;c++){await chapterCheck('Makkabäer I (Kahana)',c,sources);checked++;}
 }
 console.log('Electron: '+checked+' Maccabees edition/chapter comparisons, native labels, passage heights and IV cross-chapter navigation passed.');
};
