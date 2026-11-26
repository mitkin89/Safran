'use strict';
const assert=require('node:assert/strict');
module.exports=async({js,waitFor,book,restart})=>{
 const selected=()=>js("[...document.querySelectorAll('#verList input[data-rel]:checked')].map(i=>i.dataset.rel)");
 const choose=async pattern=>{
  await js(`(()=>{const input=[...document.querySelectorAll('#verList input[data-rel]')].find(i=>new RegExp(${JSON.stringify(pattern)}).test(i.dataset.rel));if(!input)throw Error('Ausgabe fehlt');input.click();})()`);
  await waitFor("!document.querySelector('#rOut').textContent.startsWith('Lade')&&document.querySelector('#rOut .row')",'Ausgabe geladen');
 };
 await choose('Philippson');await choose('Septuaginta');await choose('Peshitta');
 const expected=await selected();assert(expected.length>=4,'Mehrere ausgewählte Fassungen');
 await restart();
 await waitFor("document.querySelector('#verList input[data-rel]:checked')&&document.querySelector('#rOut .row')",'Versionen wiederhergestellt');
 assert.deepEqual(await selected(),expected,'Fenster wieder geöffnet: dieselben Fassungen und Reihenfolge');
 // Close the book tab, then open it again after another window restart.
 await js("document.querySelector('#tabbar .tab.active button[data-x]').click()");
 await restart();
 await book('Genesis');
 await waitFor("document.querySelector('#verList input[data-rel]:checked')&&document.querySelector('#rOut .row')",'Buch erneut geöffnet');
 assert.deepEqual(await selected(),expected,'Geschlossener Buchtab behält seine Versionsauswahl');
 // An explicitly deselected language must not be silently re-added by Bible defaults.
 await choose('Westminster');
 const withoutMT=await selected();
 assert(!withoutMT.some(rel=>/Westminster/.test(rel)));
 await restart();
 await waitFor("document.querySelector('#verList input[data-rel]:checked')&&document.querySelector('#rOut .row')",'Versionen wiederhergestellt');
 assert.deepEqual(await selected(),withoutMT,'Abgewählte Fassung bleibt auch nach dem Neustart aus');
 console.log('Electron: version selection survives closing and reopening the reader and book tabs.');
};
