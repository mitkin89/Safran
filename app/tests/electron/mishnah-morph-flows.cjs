'use strict';
const assert=require('node:assert/strict'),D=require('../../mishnah-morph-data'),M=require('../../mishnah-morph');
module.exports=async({docs,win,js,waitFor,book,dictionaryRequests})=>{
 const title='Mishnah Berakhot',source=[...docs.values()].find(d=>d.entry.title===title&&d.entry.versionTitle===D.edition);
 assert(source,'actual Kaufmann source fixture');
 async function chapter(ch){await js(`document.querySelector('#rSection').value=${ch-1};document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))`);await waitFor(`document.querySelectorAll('#rOut .cell[data-mishnah-morph][data-mishnah-morph-ready]').length===${D.sources[title].chapters[ch-1].length}`,'source-bound word decoration '+ch);}
 async function word(ref){await chapter(ref.ch);await js(`document.querySelector('#rOut .row[data-l="${ref.m}"] .cell[data-mishnah-morph]').querySelectorAll('.mhw')[${ref.i}].click()`);await waitFor("document.querySelector('#mishnahMorphPopup')",'word popup');}
 function find(status){for(let c=0;c<D.sources[title].chapters.length;c++)for(let m=0;m<D.sources[title].chapters[c].length;m++)for(let i=0;i<D.sources[title].chapters[c][m].length;i++){const f=D.forms[D.sources[title].chapters[c][m][i]];if(f.status===status)return {ch:c+1,m:m+1,i,word:f.word,analyses:f.analyses};}return null;}
 await book(title);await waitFor(`[...document.querySelectorAll('#verList input')].some(c=>c.dataset.rel===${JSON.stringify(source.entry.rel)})`,'Mishnah editions');
 await js(`{const c=[...document.querySelectorAll('#verList input')].find(c=>c.dataset.rel===${JSON.stringify(source.entry.rel)});if(!c.checked)c.click();}`);
 await waitFor("document.querySelector('#rOut .cell[data-mishnah-morph]')",'named vocalized edition selected');
 for(let i=0;i<3;i++){const rel=await js("[...document.querySelectorAll('#verList input:checked')].find(c=>c.dataset.rel.startsWith('digital-mishnah/'))?.dataset.rel");if(!rel)break;await js(`{const c=[...document.querySelectorAll('#verList input')].find(c=>c.dataset.rel===${JSON.stringify(rel)});c.click();}`);}
 await waitFor("document.querySelector('#rOut .mhw')",'Mishnah morphology ready');
 let total=0;
 for(let c=0;c<D.sources[title].chapters.length;c++){
  await chapter(c+1);
  const got=await js("[...document.querySelectorAll('#rOut .cell[data-mishnah-morph]')].map(c=>({label:c.closest('.row').dataset.l,words:[...c.querySelectorAll('.mhw')].map(w=>w.textContent),all:c.querySelector('.txt').textContent,skipped:[...c.querySelectorAll('small,sup,.note,.footnote,.aref')].every(n=>!n.querySelector('.mhw'))}))");
  assert.equal(got.length,source.text[c].length);
  for(let m=0;m<got.length;m++){
   const expected=D.sources[title].chapters[c][m].map(id=>D.forms[id].key);assert.deepEqual(got[m].words.map(M.normalize),expected,'every source token keeps its exact position and niqqud '+(c+1)+':'+(m+1));assert(got[m].skipped,'editorial labels and footnotes not decorated');total+=expected.length;
  }
  assert(await js("!document.querySelector('#rOut .cell[data-k=de] .mhw')"),'translation never inherits Hebrew analyses');
 }
 assert.equal(total,D.coverage.words);
 const known={ch:1,m:1,i:1};
 // A tempting biblical gloss in a globally loaded lexicon must remain unavailable here.
 await js("{const id=window.MISHNAH_MORPH_DATA.sources['Mishnah Berakhot'].chapters[0][0][1];window.mhmMeaningFixture={id,form:window.MISHNAH_MORPH_DATA.forms[id],lexicon:window.OSHB_LEMMAS};window.OSHB_LEMMAS={tempting:['עַיִן','BIBLICAL ONLY GLOSS','NUR BIBLISCHER GLOSS']};window.MISHNAH_MORPH_DATA.forms[id]={...window.mhmMeaningFixture.form,analyses:[{lemma:'עין',morph:'HNcbsa',rules:[]}]};}");
 await word(known);
 assert(await js("document.querySelector('#mishnahMorphPopup .mhm-meaning')?.textContent.includes('Noch keine Kurzbedeutung')&&!document.querySelector('#mishnahMorphPopup').textContent.includes('BIBLISCH')"),'no biblical fallback even when that lexicon is globally loaded');
 await js("window.MISHNAH_MORPH_DATA.forms[window.mhmMeaningFixture.id]=window.mhmMeaningFixture.form;window.OSHB_LEMMAS=window.mhmMeaningFixture.lexicon");
 await word(known);
 assert(await js("document.querySelector('#mishnahMorphPopup .mhm-meaning')?.textContent.includes('lesen')"),'word card includes a short meaning');
 assert(await js("document.querySelector('#mishnahMorphPopup .mhm-meaning small')?.textContent.includes('Redaktionelle')"),'editorial meaning source is explicit');
 assert(await js("document.querySelector('#mishnahMorphPopup').textContent.includes('Maschineller Vorschlag')&&document.querySelector('#mishnahMorphPopup').textContent.includes('Partizip aktiv')&&document.querySelector('#mishnahMorphPopup').textContent.includes('Pl.')"),'קורין candidate is a participle, not a guessed perfect');
 if(process.env.SAFRAN_MISHNAH_MORPH_CAPTURE==='1'){
  const fs=require('node:fs'),capture=await win.webContents.capturePage();fs.writeFileSync('/tmp/safran-mishnah-morph.png',capture.toPNG());
  if(capture.getSize().width<=1)fs.writeFileSync('/tmp/safran-mishnah-morph.pdf',await win.webContents.printToPDF({printBackground:true,landscape:true,pageRanges:'1'}));
 }
 await js("document.querySelector('#mishnahMorphPopup .mhm-grammar').open=true");
 assert(await js("document.querySelector('#mishnahMorphPopup .mhm-grammar li small')?.textContent.length>0"),'expandable grammar citations');
 await js("document.querySelector('#mishnahMorphPopup [data-mhm-forms]').click()");
 await waitFor("document.querySelector('#mishnahMorphForms')?.open",'attested forms dialog');
 assert(await js("document.querySelector('#mishnahMorphForms').textContent.includes('Vorkommen')&&document.querySelector('#mishnahMorphForms tbody tr')"));
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))");
 assert(await js("!document.querySelector('#mishnahMorphForms')"),'Escape closes only morphology dialog');
 const ambiguous=find('ambiguous');assert(ambiguous);await word(ambiguous);
 assert.equal(await js("document.querySelectorAll('#mishnahMorphPopup .mhm-analysis').length"),ambiguous.analyses.length,'all alternative analyses remain visible');
 assert(await js("document.querySelector('#mishnahMorphPopup .mhm-badge').textContent.includes('Maschinell')"),'ambiguous result also visibly machine-generated');
 const unknown=find('unresolved')||{ch:1,m:1,i:0};
 await js(`{const id=window.MISHNAH_MORPH_DATA.sources['Mishnah Berakhot'].chapters[${unknown.ch-1}][${unknown.m-1}][${unknown.i}];window.mhmUnknownFixture={id,form:window.MISHNAH_MORPH_DATA.forms[id]};window.MISHNAH_MORPH_DATA.forms[id]={...window.mhmUnknownFixture.form,status:'unresolved',analyses:[],hints:[]};}`);await word(unknown);
 assert(await js("document.querySelector('#mishnahMorphPopup').textContent.includes('Keine Bestimmung')&&!document.querySelector('#mishnahMorphPopup .mhm-analysis')"),'unresolved words have no invented stem or lemma');
 await js("window.MISHNAH_MORPH_DATA.forms[window.mhmUnknownFixture.id]=window.mhmUnknownFixture.form");
 await chapter(2);assert(await js("!document.querySelector('#mishnahMorphPopup')"),'navigation closes old popup');
 await word(known);await js("document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))");assert(await js("!document.querySelector('#mishnahMorphPopup')"),'outside click closes popup');
 await word(known);await js("document.querySelector('#mishnahMorphPopup [data-mhm-dict]').click()");
 await waitFor("!document.querySelector('#dictPanel').hidden&&document.querySelector('#dictQ').value==='קרא'",'dictionary opens the unprefixed lemma');
 assert.deepEqual(dictionaryRequests.at(-1).only,['d895bc1c727b','e8d290b744f6','d701423861c6'],'Mishnah dictionary lookup is restricted to Jastrow, Levy and Krauss even without matching entries');
 await book(title);await waitFor("document.querySelector('#rOut .mhw')",'return to the Mishnah');
 // A changed source fingerprint cannot keep the previously loaded candidate index.
 await js("window.mishnahMorphSavedHash=window.MISHNAH_MORPH_DATA.sources['Mishnah Berakhot'].textHash;window.MISHNAH_MORPH_DATA.sources['Mishnah Berakhot'].textHash='changed';document.querySelector('#rSection').value='1';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('.cell[data-mishnah-morph][data-mishnah-morph-state=source-mismatch]')&&!document.querySelector('#rOut .mhw')",'changed source is not analysed');
 await js("window.MISHNAH_MORPH_DATA.sources['Mishnah Berakhot'].textHash=window.mishnahMorphSavedHash");
 await chapter(1);
 // Compare the original reading view, without the separately rendered witness labels.
 await js("document.querySelector('#ilBtn').click()");await waitFor("!document.querySelector('#ilPop').hidden&&document.querySelector('#ilPop [data-a=none]')",'Mishnah witness controls');
 await js("document.querySelector('#ilPop [data-a=none]').click()");await waitFor("!document.querySelector('#rOut .mci-grid')&&document.querySelector('.cell[data-mishnah-morph-state=matched]')",'original reading without witness rows');
 const first=await js("document.querySelector('#rOut .cell[data-mishnah-morph] .txt').textContent");
 const expected=await js(`(()=>{const t=document.createElement('template');t.innerHTML=${JSON.stringify(source.text[0][0])};return t.content.textContent;})()`);
 assert.equal(first,expected,'source text including original editorial labels stays unchanged');
 console.log('Electron: '+total+' Kaufmann Berakhot tokens across all9chapters, candidate/ambiguous/unresolved popups, references, forms, dictionary and source guards passed.');
};
