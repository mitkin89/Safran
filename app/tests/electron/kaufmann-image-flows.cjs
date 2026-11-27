'use strict';
const assert=require('node:assert/strict'),{ipcMain}=require('electron'),D=require('../../mishnah-kaufmann-berakhot-data'),B=require('../../mishnah-morph-data'),E=require('../../mishnah-kaufmann-image-data');
module.exports=async({docs,js,waitFor,book})=>{
 const source=[...docs.values()].find(d=>d.entry.versionTitle===D.edition),old=[...docs.values()].find(d=>d.entry.title==='Mishnah Berakhot'&&d.entry.versionTitle===B.edition),rels=[source.entry.rel,old.entry.rel],opened=[];
 ipcMain.handle('open:external',(_e,url)=>{opened.push(url);return true;});
 await book('Mishnah Berakhot');await waitFor("document.querySelector('#rTitle').textContent.includes('Mishnah Berakhot')",'Berakhot');
 for(let n=0;n<8;n++){const change=await js(`[...document.querySelectorAll('#verList input')].map(c=>({rel:c.dataset.rel,checked:c.checked,want:${JSON.stringify(rels)}.includes(c.dataset.rel)})).find(x=>x.want!==x.checked)`);if(!change)break;await js(`{const c=[...document.querySelectorAll('#verList input')].find(c=>c.dataset.rel===${JSON.stringify(change.rel)});c.click();}new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);}
 async function chapter(c){await js(`document.querySelector('#rSection').value='${c-1}';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))`);await waitFor(`document.querySelectorAll('#rOut .cell[data-mishnah-morph-ready]').length===${D.sources['Mishnah Berakhot'].chapters[c-1].length*2}`,'image cards chapter '+c);}
 async function click(ref,i){const c=+ref.split(':')[0];await chapter(c);const id=D.units[ref].id+'/word/'+i;await js(`document.querySelector('#mishnahMorphPopup .mhm-close')?.click();document.querySelector('.mhw[data-kaufmann-word="${id}"]').click()`);await waitFor("document.querySelector('#mishnahMorphPopup .mhm-image-source')",'bound image evidence');return id;}
 await click('6:7',7);assert(await js("document.querySelector('#mishnahMorphPopup .mhm-image-source').textContent.includes('KI-Bildlesung · als klar erfasst')"));
 await js("document.querySelector('#mishnahMorphPopup [data-mhm-image]').click()");await waitFor("document.querySelector('#mishnahMorphPopup')",'image button');assert.equal(opened.length,1);assert.equal(opened[0],E.images['004r'].url);
 await click('6:7',5);assert(await js("document.querySelector('#mishnahMorphPopup .mhm-image-source').textContent.includes('unsicher / Teilpunktierung')"));
 // Source locations alone must never become a claimed visual review, even once all pages are reviewed.
 const id=D.units['1:1'].id+'/word/0';await js(`{const d=window.MISHNAH_KAUFMANN_IMAGE_DATA;window.kptEvidenceSaved=d.words[${JSON.stringify(id)}];d.words[${JSON.stringify(id)}]={...d.words[${JSON.stringify(id)}],reviewStatus:'not-reviewed',reviews:[]};}`);await click('1:1',0);
 assert(await js("document.querySelector('#mishnahMorphPopup .mhm-image-location-only').textContent.includes('nur Quellenort')&&!document.querySelector('#mishnahMorphPopup .mhm-image-reading')"));
 await js(`window.MISHNAH_KAUFMANN_IMAGE_DATA.words[${JSON.stringify(id)}]=window.kptEvidenceSaved`);
 await chapter(8);const abbr=D.units['8:6'].id+'/word/9';const count=await js(`document.querySelectorAll('.mhw[data-kaufmann-word="${abbr}"]').length`);assert.equal(count,2,'two lexical pieces keep one image source word');
 for(let i=0;i<2;i++){await js(`document.querySelector('#mishnahMorphPopup .mhm-close')?.click();document.querySelectorAll('.mhw[data-kaufmann-word="${abbr}"]')[${i}].click()`);assert(await js("!!document.querySelector('#mishnahMorphPopup .mhm-image-source')"));}
 await js("window.kptEvidenceHash=window.MISHNAH_KAUFMANN_IMAGE_DATA.targetTextHash;window.MISHNAH_KAUFMANN_IMAGE_DATA.targetTextHash='wrong';document.querySelector('#mishnahMorphPopup .mhm-close').click();document.querySelector('.mhw[data-kaufmann-word]').click()");
 assert(await js("!!document.querySelector('#mishnahMorphPopup')&&!document.querySelector('#mishnahMorphPopup .mhm-image-source')"),'wrong target hash suppresses evidence, not the word card');
 await js("window.MISHNAH_KAUFMANN_IMAGE_DATA.targetTextHash=window.kptEvidenceHash");
 await js(`document.querySelector('#mishnahMorphPopup .mhm-close').click();[...document.querySelectorAll('#rOut .cell')].find(c=>c.dataset.rel===${JSON.stringify(old.entry.rel)}).querySelector('.mhw').click()`);assert(await js("!document.querySelector('#mishnahMorphPopup .mhm-image-source')"),'legacy edition never inherits derived image evidence');
 console.log('Electron image evidence: clear / uncertain / location-only / split abbreviation, exact archive button, hash rejection and legacy isolation passed.');
};
