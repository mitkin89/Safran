'use strict';
const assert=require('node:assert/strict');
module.exports=async({js,waitFor,book})=>{
 await book('Genesis');await waitFor("document.querySelector('#rOut .cell[data-rel]')",'Genesis geladen');
 await js("document.querySelector('#dispBtn').click()");
 assert(await js("document.querySelector('#dispPanel').textContent.includes('Bibel-Standardausgaben')"));
 async function choose(id,pattern){await js(`{const e=document.querySelector('#${id}');e.value=[...e.options].find(o=>new RegExp(${JSON.stringify(pattern)}).test(o.value)).value;e.dispatchEvent(new Event('input',{bubbles:true}));}`);}
 await choose('dPvDe','Philippson');await waitFor("[...document.querySelectorAll('#rOut .cell[data-rel]')].some(c=>c.dataset.rel.includes('Philippson'))&&!document.querySelector('#rOut .cell[data-rel*=\"Zunz\"]')",'Deutsche Standardausgabe sofort im Lesetext');
 await choose('dPvHe','Aleppo');await waitFor("document.querySelector('#rOut .cell[data-rel*=\"Aleppo\"]')&&!document.querySelector('#rOut .cell[data-rel*=\"Westminster\"]')",'Hebräische Standardausgabe sofort im Lesetext');
 await choose('dPvX','Septuaginta');await waitFor("document.querySelector('#rOut .cell[data-rel*=\"Septuaginta\"]')",'Zusätzliche Ausgabe im Lesetext');
 await js("document.querySelector('#dispClose').click()");await book('Exodus');
 await waitFor("document.querySelector('#rOut .cell[data-rel*=\"Philippson\"]')&&document.querySelector('#rOut .cell[data-rel*=\"Westminster\"]')",'Nächstes Buch nutzt die Vorgabe und vorhandenen Ersatz');
 await book('Genesis');await waitFor("document.querySelector('#rOut .cell[data-rel*=\"Aleppo\"]')&&document.querySelector('#rOut .cell[data-rel*=\"Septuaginta\"]')",'Alle Vorgaben gelten beim erneuten Öffnen');
 assert(await js("JSON.parse(localStorage.getItem('disp')).pvDe.includes('Philippson')"));
 await js("{const next=JSON.parse(localStorage.getItem('disp'));next.pvDe='';const value=JSON.stringify(next);localStorage.setItem('disp',value);window.dispatchEvent(new StorageEvent('storage',{key:'disp',newValue:value}));}");
 await waitFor("document.querySelector('#rOut .cell[data-rel*=\"Zunz\"]')&&!document.querySelector('#rOut .cell[data-rel*=\"Philippson\"]')&&document.querySelector('#rOut .cell[data-rel*=\"Aleppo\"]')",'Geänderte Vorgaben aus einem anderen Fenster werden übernommen');
 console.log('Electron: Bible defaults update the current reader, persist and apply to other books with available fallback editions.');
};
