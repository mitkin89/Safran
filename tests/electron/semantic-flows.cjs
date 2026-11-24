'use strict';
const assert=require('node:assert/strict');
module.exports=async({js,waitFor,win})=>{
 await js("document.querySelector('nav [data-tab=search]').click();document.querySelector('#sSemanticTab').click()");
 assert.equal(await js("document.querySelector('#sSemantic').hidden"),false);
 await js("document.querySelector('#smQuery').value='Angst';document.querySelector('#smQuery').dispatchEvent(new Event('input'))");
 assert.equal(await js("document.querySelector('#smField').options.length"),1);
 assert(await js("document.querySelector('#smMembers').textContent.includes('3372')"));
 await js("document.querySelector('#smGo').click()");
 await waitFor("document.querySelector('#smGo').textContent==='Suchen' && document.querySelector('#sOut .smReason')",'Bedeutungsfeld: echte Worker-Ergebnisse');
 assert(await js("document.querySelector('#sInfo').textContent.includes('Mögliche Belege')"));
 assert(await js("document.querySelector('#sOut .smTranslation mark')"),'deutsche Wiedergabe hervorgehoben');
 assert(await js("[...document.querySelectorAll('#sOut .smReason')].some(e=>e.textContent.includes('lxx-morph'))"),'griechische Belege');
 await js("document.querySelector('#smCopy').click();document.querySelector('#smTitle').value='Meine Angstwörter';document.querySelector('#smSave').click()");
 assert(await js("document.querySelector('#smMembers').textContent.includes('Meine Angstwörter')"));
 await js("document.querySelector('#smGo').click()");
 await waitFor("document.querySelector('#smGo').textContent==='Suchen' && document.querySelector('#sOut .smReason')?.textContent.includes('Meine Angstwörter')",'Eigenes Bedeutungsfeld');
 await js("document.querySelector('#sReadBtn').click()");
 await waitFor("document.documentElement.dataset.tab==='read' && document.querySelector('#rOut .sresv .cell[data-k=de] mark')",'Lesetext mit deutscher Markierung');
 assert(await js("document.querySelector('#rOut .sresv .w.hl')"),'hebräische Markierung im Lesetext');
 await js("document.querySelector('nav [data-tab=search]').click();document.querySelector('#sTextTab').click();document.querySelector('#sq').value='Gott';document.querySelector('#sGo').click()");
 await waitFor("document.querySelector('#sGo').textContent==='Suchen' && document.querySelector('#sOut .sres')",'Textsuche nach Wechsel zurück');
 assert.equal(await js("document.querySelector('#sOut .smReason')"),null);
 await js("document.querySelector('#sSemanticTab').click();document.querySelector('#smQuery').value='Angst';document.querySelector('#smQuery').dispatchEvent(new Event('input'));document.querySelector('#smGo').click()");
 await waitFor("document.querySelector('#smGo').textContent==='Suchen' && document.querySelector('#sOut .smReason')",'Ansicht zur Sichtprüfung');
 await js("document.querySelector('#sOut').scrollIntoView({block:'start'})");
 if(process.env.SAFRAN_SEMANTIC_QA_DIR){const fs=require('node:fs/promises');await fs.mkdir(process.env.SAFRAN_SEMANTIC_QA_DIR,{recursive:true});await fs.writeFile(require('node:path').join(process.env.SAFRAN_SEMANTIC_QA_DIR,'semantic-search.png'),(await win.webContents.capturePage()).toPNG());}
 console.log('Electron: semantic field selection, Greek/Hebrew/German results, custom field, highlighted reader and return to text search passed.');
};
