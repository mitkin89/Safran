'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs/promises');
module.exports = async ({win,js,waitFor,book}) => {
 assert.deepEqual(await js("[...document.querySelectorAll('#tree .lib-item')].map(a=>a.textContent).filter(t=>t.startsWith('Makkabäer')).map(t=>t.split('ספר')[0].trim())"), ['Makkabäer I','Makkabäer II','Makkabäer III','Makkabäer IV']);
 await book('Makkabäer I');
 await waitFor("document.querySelector('#rTitle').textContent.includes('Makkabäer I') && document.querySelectorAll('#verList input').length===4", 'Vier Fassungen in einem Werk');
 assert(await js("document.querySelector('#verList').textContent.includes('Standardtext · Kahana')"));
 await js("{const box=document.querySelector('#verBox');box.open=true;const greek=[...document.querySelectorAll('#verList .voption')].find(e=>e.textContent.includes('Septuaginta (Rahlfs)')).querySelector('input');if(!greek.checked)greek.click();}");
 await waitFor("(document.querySelector('.aligned-passages')||document.querySelector('.independent-columns')) && document.querySelector('#rOut').textContent.includes('Ἀλέξανδρος')", 'Griechisch und deutsche Quelle bleiben verfügbar');
 assert(await js("document.querySelector('.aligned-passages')?!!document.querySelector('.passage-row > .lab'):[...document.querySelectorAll('#rOut .row[data-l]')].every(r=>r.querySelectorAll('.cell:not(.empty)').length<=1)"));
 // Restore the old native-title session key after a real page reload.
 await waitFor("localStorage.getItem('session')?.includes('Second Temple/Apocrypha¦Makkabäer I')",'Sitzung gespeichert');
 await js("{const key='session';const v=localStorage.getItem(key);localStorage.setItem(key,v.replaceAll('Second Temple/Apocrypha¦Makkabäer I','Second Temple/Apocrypha¦Makkabäer I (Septuaginta)'));}");
 assert(await js("localStorage.getItem('session').includes('¦Makkabäer I (Septuaginta)')"));
 const ready = new Promise(r=>win.webContents.once('did-finish-load',r));win.reload();await ready;
 await waitFor("document.querySelector('#rTitle').textContent.includes('Makkabäer I') && document.querySelector('#rOut').textContent.includes('Ἀλέξανδρος')",'Alte gespeicherte Werkkennung');
 await fs.writeFile('/tmp/safran-maccabees.png',(await win.webContents.capturePage()).toPNG());
 await js("{document.querySelector('nav [data-tab=search]').click();const scope=document.querySelector('[data-st=\"Makkabäer I\"]');scope.checked=true;scope.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#sq').value='Ἀλέξανδρος';document.querySelector('#sLang').value='other';document.querySelector('#sq').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#sGo').click();}");
 await waitFor("document.querySelector('#sOut .sres')",'Suche im zusammengeführten Werk');
 assert(await js("document.querySelector('#sOut').textContent.includes('Makkabäer I (Septuaginta)')"));
 console.log('Maccabees: four works, editions, Kahana, numbering and legacy session passed');
};
