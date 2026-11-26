'use strict';
const assert=require('node:assert/strict'),D=require('../../mishnah-zeraim-data'),M=require('../../mishnah-morph');
module.exports=async({docs,js,waitFor,book})=>{
 const requests=[],{ipcMain}=require('electron');ipcMain.removeHandler('dict:lookup');ipcMain.handle('dict:lookup',(_e,q,only)=>{requests.push({q,only});return {results:[]};});
 let total=0,chapters=0;
 for(const title of M.titles){const source=[...docs.values()].find(d=>d.entry.title===title&&d.entry.versionTitle===D.edition);assert(source);
 await book(title);await waitFor(`[...document.querySelectorAll('#verList input')].some(c=>c.dataset.rel===${JSON.stringify(source.entry.rel)})`,'Kaufmann edition '+title);
 await js(`{const c=[...document.querySelectorAll('#verList input')].find(c=>c.dataset.rel===${JSON.stringify(source.entry.rel)});if(!c.checked)c.click();}`);
 for(let c=0;c<D.sources[title].chapters.length;c++){
 await js(`document.querySelector('#rSection').value=${c};document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))`);
 await waitFor(`document.querySelectorAll('#rOut .cell[data-mishnah-morph][data-mishnah-morph-ready]').length===${D.sources[title].chapters[c].length}`,'decoration '+title+' '+(c+1));
 const got=await js("[...document.querySelectorAll('#rOut .cell[data-mishnah-morph]')].map(c=>[...c.querySelectorAll('.mhw')].map(w=>w.textContent))");
 assert.deepEqual(got.map(ws=>ws.map(M.normalize)),D.sources[title].chapters[c].map(unit=>unit.map(id=>D.forms[id].key)));total+=got.flat().length;chapters++;
 }
 await js("document.querySelector('#rOut .mhw').click()");await waitFor("document.querySelector('#mishnahMorphPopup')",'card '+title);assert(await js("document.querySelector('#mishnahMorphPopup .mhm-badge').textContent.includes('Maschinell')"));
 }
 // A reviewed loanword exposes real article links in the chosen dictionary.
 await book('Mishnah Peah');await js("document.querySelector('#rSection').value='2';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelectorAll('#rOut .cell[data-mishnah-morph][data-mishnah-morph-ready]').length===8",'Peah chapter three');
 await js("[...document.querySelectorAll('#rOut .mhw')].find(w=>w.textContent.normalize('NFD').replace(/[^א-ת]/g,'')==='פרוזבול').click()");
 assert(await js("document.querySelector('#mishnahMorphPopup .mhm-meaning').textContent.includes('Prosbul')"));
 assert(await js("document.querySelector('#mishnahMorphPopup .mhm-dictionaries').textContent.includes('Krauss')&&document.querySelector('#mishnahMorphPopup .mhm-dictionaries').textContent.includes('Levy')"));
 await js("document.querySelector('#mishnahMorphPopup .mhm-dictionaries').open=true;[...document.querySelectorAll('#mishnahMorphPopup [data-mhm-evidence]')].find(b=>b.textContent.includes('Levy')).click()");
 await waitFor("!document.querySelector('#dictPanel').hidden&&['פרוזבול','פרוסבול'].includes(document.querySelector('#dictQ').value)",'specific rabbinic dictionary opened');
 assert(requests.some(r=>['פרוזבול','פרוסבול'].includes(r.q)&&r.only==='e8d290b744f6'),'Levy filter reaches the dictionary service');
 // Contextual homographs must show the meaning of this exact occurrence.
 async function meaningAt(title,ch,m,token,expected){
  await book(title);const rel=D.sources[title].rel;
  await waitFor(`[...document.querySelectorAll('#verList input')].some(e=>e.dataset.rel===${JSON.stringify(rel)})`,'context edition');
  await js(`document.querySelector('#rSection').value=${ch-1};document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))`);
  await waitFor(`document.querySelectorAll('#rOut .cell[data-mishnah-morph][data-mishnah-morph-ready]').length===${D.sources[title].chapters[ch-1].length}`,'context chapter');
  await js(`document.querySelector('#rOut .row[data-l="${m}"] .cell[data-mishnah-morph]').querySelectorAll('.mhw')[${token-1}].click()`);
  assert(await js(`document.querySelector('#mishnahMorphPopup .mhm-meaning')?.textContent.includes(${JSON.stringify(expected)})`),'contextual meaning '+title+' '+ch+':'+m);
 }
 await meaningAt('Mishnah Terumot',3,8,9,'Brandopfer');
 await meaningAt('Mishnah Terumot',4,7,5,'Beimischung');
 await meaningAt('Mishnah Kilayim',4,1,55,'Bearbeitungsraum');
 await meaningAt('Mishnah Terumot',8,1,83,'Priesterdienst');
 await book('Mishnah Bikkurim');await waitFor("document.querySelector('#rOut .mhw')",'return from dictionary');
 // The independent Seder dataset also refuses changed source fingerprints.
 await js("window.zeraimSavedHash=window.MISHNAH_ZERAIM_DATA.sources['Mishnah Bikkurim'].textHash;window.MISHNAH_ZERAIM_DATA.sources['Mishnah Bikkurim'].textHash='changed';document.querySelector('#rSection').value='1';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('.cell[data-mishnah-morph][data-mishnah-morph-state=source-mismatch]')&&!document.querySelector('#rOut .mhw')",'changed Seder source rejected');
 await js("window.MISHNAH_ZERAIM_DATA.sources['Mishnah Bikkurim'].textHash=window.zeraimSavedHash");
 assert.equal(total,D.coverage.reduce((n,c)=>n+c.words,0));console.log(`Electron: ${total} tokens across ${chapters} chapters and all eleven Zeraim tractates; exact pointed word decoration and cards passed.`);
};
