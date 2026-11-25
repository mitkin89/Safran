'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({docs,win,js,waitFor,book})=>{
 const edition="Mishnah based on the Kaufmann manuscript, edited by Dan Be'eri",sources=[...docs.values()].filter(d=>d.versionTitle===edition);
 assert.equal(sources.length,63);let chapters=0,segments=0;
 async function choose(rels){
  await js("document.querySelector('#verBox').open=true");
  for(let n=0;n<12;n++){
   const change=await js(`(()=>{const wanted=${JSON.stringify(rels)},a=[...document.querySelectorAll('#verList input')].map(c=>({rel:c.dataset.rel,checked:c.checked,want:wanted.includes(c.dataset.rel)}));return a.find(x=>x.want&&!x.checked)||a.find(x=>!x.want&&x.checked);})()`);
   if(!change)break;
   await js(`{const c=[...document.querySelectorAll('#verList input')].find(c=>c.dataset.rel===${JSON.stringify(change.rel)});c.click();}new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
   await waitFor("document.querySelectorAll('#rOut .row.head > div:not(.lab)').length===document.querySelectorAll('#verList input:checked').length",'version change loaded');
  }
  await js("document.querySelector('#verBox').open=false");
 }
 for(const d of sources){
  const rel=JSON.stringify(d.entry.rel);
  await book(d.title);
  await waitFor(`document.querySelector('#rTitle')?.textContent.includes(${JSON.stringify(d.title)})&&[...document.querySelectorAll('#verList input')].some(c=>c.dataset.rel===${rel})`,'Kaufmann available '+d.title);
  await choose([d.entry.rel]);
  await waitFor(`document.querySelector('#rOut .cell[data-rel='+CSS.escape(${rel})+'] .txt')`,'Kaufmann selected');
  assert(await js("document.querySelector('#rOut .head').textContent.includes('Kaufmann A50')"),'named edition in header');
  assert.equal(await js("document.querySelectorAll('#rSection option').length"),d.text.length,d.title+' chapters');
  for(let c=0;c<d.text.length;c++){
   await js(`document.querySelector('#rSection').value=${JSON.stringify(String(c))};document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}));new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
   const result=await js(`(()=>{const rows=[...document.querySelectorAll('#rOut .row[data-l]')];return {labels:rows.map(r=>r.dataset.l),pointed:rows.every(r=>[...r.querySelectorAll('.cell')].some(cell=>cell.dataset.rel===${rel}&&/[\\u05b0-\\u05bb\\u05c7]/u.test(cell.querySelector('.txt').textContent)))};})()`);
   assert.deepEqual(result.labels,d.text[c].map((_,i)=>String(i+1)),d.title+' '+(c+1)+' mishnah positions');assert(result.pointed,d.title+' '+(c+1)+' vowels shown');
   chapters++;segments+=d.text[c].length;
  }
 }
 // Comparison with a translation uses the ordinary reader; the separate
 // diplomatic Digital Mishnah pilot must not replace this pointed edition.
 await book('Mishnah Berakhot');
 const he=sources.find(d=>d.title==='Mishnah Berakhot'),de=[...docs.values()].find(d=>d.title==='Mishnah Berakhot'&&d.entry.kind==='de');
 await waitFor("document.querySelector('#rTitle').textContent.includes('Mishnah Berakhot')",'return to Berakhot');await choose([he.entry.rel,de.entry.rel]);
 await js("document.querySelector('#rSection').value='0';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}));new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 assert(await js("[...document.querySelectorAll('#rOut .row[data-l]')].every(r=>r.querySelectorAll('.cell').length===2)&&!document.querySelector('#rOut .mci-grid')"),'pointed edition and translation in normal columns');
 await win.reload();await waitFor("document.querySelector('#rOut .head')?.textContent.includes('Kaufmann A50')",'Kaufmann selection survives restart');
 await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 const capture=await win.webContents.capturePage();fs.writeFileSync('/tmp/safran-kaufmann.png',capture.toPNG());
 if(capture.getSize().width<=1)fs.writeFileSync('/tmp/safran-kaufmann.pdf',await win.webContents.printToPDF({printBackground:true,landscape:true,pageRanges:'1'}));
 console.log(`Kaufmann: 63 tractates, ${chapters} chapters, ${segments} pointed mishnayot, parallel translation and session restoration passed.`);
};
