'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor,book})=>{
 await book('Ezekiel');await waitFor("document.querySelector('#rOut .row[data-l=\"1\"] .w')",'Ezechiel 1');
 await js("document.querySelector('#tcTov').checked=true;document.querySelector('#tcHex').checked=true;document.querySelector('#tcSmr').checked=false;if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click();document.querySelector('#rOut .row[data-l=\"1\"] .txt').click()");
 await waitFor("document.querySelector('#tcBody .tc-hx-entry') && document.querySelector('#tcBody .tc-tov-entry')",'Field und CATSS');
 assert(await js("[...document.querySelectorAll('#tcBody [data-witness=LXX] .tc-witness-label')].every(n=>n.textContent==='Ο΄')"));
 assert(await js("document.querySelector('#tcBody .tc-hx-entry .tc-witness-label').textContent==='Field'"));
 assert(await js("[...document.querySelectorAll('#tcBody .tc-hx-sign')].some(n=>n.textContent==='↙'&&n.title.includes('Metobelus'))"));
 assert(await js("[...document.querySelectorAll('#tcBody .tc-lz')].some(n=>n.textContent.includes('Σ.')) && ![...document.querySelectorAll('#tcBody .tc-lz')].some(n=>n.textContent.includes('σ′'))"));
 await js("if(document.querySelector('#tcWitnessOptions').hidden)document.querySelector('#tcWitnessSummary').click();document.querySelector('#tcFieldSigla summary').click()");
 assert(await js("document.querySelector('#tcFieldSigla').open && document.querySelector('#tcFieldSigla').textContent.includes('Peschitta')"));
 assert.equal(await js("{const e=document.querySelector('#tcFieldSigla');e.scrollWidth>e.clientWidth+1}"),false);
 await js("document.querySelector('#tcFieldSigla').open=false;document.querySelector('#tcWitnessSummary').click();new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 fs.writeFileSync('/tmp/safran-field-sigla.png',(await win.webContents.capturePage()).toPNG());
 console.log('Field sigla: original Greek witnesses, metobelus and separate Peshitta provenance rendered.');
};
