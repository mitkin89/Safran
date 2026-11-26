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
 await waitFor(`document.querySelectorAll('#rOut .cell[data-mishnah-morph][data-mci-vocalized][data-mishnah-morph-state=matched]').length===${D.sources[title].chapters[c].length}`,'decoration '+title+' '+(c+1));
 const got=await js("[...document.querySelectorAll('#rOut .cell[data-mishnah-morph]')].map(c=>[...c.querySelectorAll('.mhw')].map(w=>w.textContent))");
 assert.deepEqual(got.map(ws=>ws.map(M.normalize)),D.sources[title].chapters[c].map(unit=>unit.map(id=>D.forms[id].key)));total+=got.flat().length;chapters++;
 }
 await js("document.querySelector('#rOut .mhw').click()");await waitFor("document.querySelector('#mishnahMorphPopup')",'card '+title);assert(await js("document.querySelector('#mishnahMorphPopup .mhm-badge').textContent.includes('Maschinell')"));
 }
 // A reviewed loanword exposes real article links in the chosen dictionary.
 await book('Mishnah Peah');await js("document.querySelector('#rSection').value='2';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelectorAll('#rOut .cell[data-mishnah-morph][data-mci-vocalized][data-mishnah-morph-state=matched]').length===8",'Peah chapter three');
 await js("[...document.querySelectorAll('#rOut .mhw')].find(w=>w.textContent.normalize('NFD').replace(/[^א-ת]/g,'')==='פרוזבול').click()");
 assert(await js("document.querySelector('#mishnahMorphPopup .mhm-meaning').textContent.includes('Prosbul')"));
 assert(await js("document.querySelector('#mishnahMorphPopup .mhm-dictionaries').textContent.includes('Krauss')&&document.querySelector('#mishnahMorphPopup .mhm-dictionaries').textContent.includes('Levy')"));
 await js("document.querySelector('#mishnahMorphPopup .mhm-dictionaries').open=true;[...document.querySelectorAll('#mishnahMorphPopup [data-mhm-evidence]')].find(b=>b.textContent.includes('Levy')).click()");
 await waitFor("!document.querySelector('#dictPanel').hidden&&['פרוזבול','פרוסבול'].includes(document.querySelector('#dictQ').value)",'specific rabbinic dictionary opened');
 assert(requests.some(r=>['פרוזבול','פרוסבול'].includes(r.q)&&r.only==='e8d290b744f6'),'Levy filter reaches the dictionary service');
 // Contextual homographs must show the meaning of this exact occurrence.
 let cardTitle=null,cardChapter=null;
 async function meaningAt(title,ch,m,token,expected){
  if(cardTitle!==title){await book(title);cardTitle=title;cardChapter=null;}const rel=D.sources[title].rel;
  await waitFor(`[...document.querySelectorAll('#verList input')].some(e=>e.dataset.rel===${JSON.stringify(rel)})`,'context edition');
  if(cardChapter!==ch){await js(`document.querySelector('#rSection').value=${ch-1};document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))`);cardChapter=ch;}
  await waitFor(`document.querySelectorAll('#rOut .cell[data-mishnah-morph][data-mci-vocalized][data-mishnah-morph-state=matched]').length===${D.sources[title].chapters[ch-1].length}`,'context chapter');
  await js(`document.querySelector('#rOut .row[data-l="${m}"] .cell[data-mishnah-morph]').querySelectorAll('.mhw')[${token-1}].click()`);
  assert(await js(`document.querySelector('#mishnahMorphPopup .mhm-meaning')?.textContent.includes(${JSON.stringify(expected)})`),'contextual meaning '+title+' '+ch+':'+m);
 }
 await meaningAt('Mishnah Terumot',3,8,9,'Brandopfer');
 await meaningAt('Mishnah Terumot',4,7,5,'Beimischung');
 await meaningAt('Mishnah Kilayim',4,1,55,'Bearbeitungsraum');
 await meaningAt('Mishnah Terumot',8,1,83,'Priesterdienst');
 // Each seed lexeme opens a word card with attributed etymology and article link.
 const firstCards=require('../../tools/mishnah-morph/krauss-cards-1.json'),seenLexemes=new Set();
 for(const r of firstCards){const a=r.analyses[0],lemma=M.headLemma(a);if(seenLexemes.has(lemma))continue;seenLexemes.add(lemma);
  const [ch,m]=r.ref.split(':').map(Number);await meaningAt(r.title,ch,m,r.token,a.gloss.de);
  assert(await js(`document.querySelector('#mishnahMorphPopup .mhm-loanword')?.textContent.includes(${JSON.stringify(a.loanword.form)})&&document.querySelector('#mishnahMorphPopup .mhm-loanword').textContent.includes('Krauss')`));
  assert(await js("document.querySelector('#mishnahMorphPopup .mhm-dictionaries')?.textContent.includes('Krauss')"));
 }
 const accordanceCards=require('../../tools/mishnah-morph/accordance-reviews.json').flatMap(file=>require('../../tools/mishnah-morph/'+file));
 const cardGroups=new Map();
 for(const r of accordanceCards){const [ch]=r.ref.split(':').map(Number),key=r.title+'/'+ch;if(!cardGroups.has(key))cardGroups.set(key,[]);cardGroups.get(key).push(r);}
 for(const rows of cardGroups.values()){
  const first=rows[0],[ch,m]=first.ref.split(':').map(Number);await meaningAt(first.title,ch,m,first.token,first.analyses[0].gloss.de);
  const expected=rows.map(r=>({unit:r.ref,token:r.token,meaning:r.analyses[0].gloss.de,...r.analyses[0].comparison}));
  // Click every real word card; batch within a loaded chapter to avoid thousands of IPC round trips.
  const failures=await js(`(()=>{document.querySelector('#mishnahMorphPopup .mhm-close')?.click();const failures=[];for(const e of ${JSON.stringify(expected)}){const m=e.unit.split(':').pop();document.querySelector('#rOut .row[data-l="'+m+'"] .cell[data-mishnah-morph]').querySelectorAll('.mhw')[e.token-1].click();const p=document.querySelector('#mishnahMorphPopup'),meaning=p?.querySelector('.mhm-meaning')?.textContent||'',comparison=p?.querySelector('.mhm-comparison')?.textContent||'';if(!meaning.includes(e.meaning)||![e.ref,e.tags,e.lex].every(v=>comparison.includes(v)))failures.push({at:e.unit+'#'+e.token,meaning,expectedMeaning:e.meaning,comparison,expectedRef:e.ref,expectedTags:e.tags,expectedLex:e.lex});}return failures;})()`);
  assert.deepEqual(failures,[],'all Accordance cards in '+first.title+' '+ch);
 }
 await book('Mishnah Bikkurim');await waitFor("document.querySelector('#rOut .mhw')",'return from dictionary');
 // The independent Seder dataset also refuses changed source fingerprints.
 await js("window.zeraimSavedHash=window.MISHNAH_ZERAIM_DATA.sources['Mishnah Bikkurim'].textHash;window.MISHNAH_ZERAIM_DATA.sources['Mishnah Bikkurim'].textHash='changed';document.querySelector('#rSection').value='1';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('.cell[data-mishnah-morph][data-mishnah-morph-state=source-mismatch]')&&!document.querySelector('#rOut .mhw')",'changed Seder source rejected');
 await js("window.MISHNAH_ZERAIM_DATA.sources['Mishnah Bikkurim'].textHash=window.zeraimSavedHash");
 assert.equal(total,D.coverage.reduce((n,c)=>n+c.words,0));console.log(`Electron: ${total} tokens across ${chapters} chapters and all eleven Zeraim tractates; exact pointed word decoration and ${accordanceCards.length} source-bound cards passed.`);
};
