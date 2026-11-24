'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor})=>{
 const books=require('../../peshitta-concordance-status.json').books.filter(b=>['Genesis','Ruth'].includes(b.book));
 const total=books.reduce((t,b)=>({withLemma:t.withLemma+b.withLemma,unassigned:t.unassigned+b.unassigned}),{withLemma:0,unassigned:0});
 await js("document.querySelector('[data-tab=search]').click();document.querySelector('#sTextTab').click();document.querySelector('#sLang').value='auto';document.querySelector('#sq').value='ܡܪܝܐ';document.querySelector('#sConcordance').checked=true;document.querySelector('#sConcordance').dispatchEvent(new Event('change'));document.querySelector('#sConcordanceMode').value='lemma';document.querySelector('#sGo').click()");
 await waitFor("document.querySelector('#sLemmaCoverage .ccDataStatus') && document.querySelector('#sOut .ccRow') && document.querySelector('#sGo').textContent==='Suchen'",'Peschitta-Datenstand aus dem echten Such-Worker');
 const text=await js("document.querySelector('#sLemmaCoverage .ccDataStatus').textContent");
 assert(text.includes(total.withLemma.toLocaleString('de-DE')));assert(text.includes(total.unassigned.toLocaleString('de-DE')));assert(!text.includes('70.960'),'scope is the two searched editions');assert(text.includes('keine vollständige Wortanalyse oder unabhängige fachliche Prüfung'));
 await js("document.querySelector('#sLemmaCoverage .ccDataStatus summary').click()");
 assert(await js("document.querySelector('#sLemmaCoverage .ccDataStatus details').open"));
 assert((await js("document.querySelector('#sLemmaCoverage .ccDataStatus').textContent")).includes('KI-Kontextentscheidungen'));
 const overflow=await js("{const e=document.querySelector('#sLemmaCoverage .ccDataStatus');e.scrollIntoView({block:'center'});e.scrollWidth>e.clientWidth+1}");assert.equal(overflow,false);
 await js("document.documentElement.dataset.theme='light';new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 await win.webContents.capturePage().then(i=>fs.writeFileSync('/tmp/safran-peshitta-status-light.png',i.toPNG()));
 await js("document.documentElement.dataset.theme='dark';new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 await win.webContents.capturePage().then(i=>fs.writeFileSync('/tmp/safran-peshitta-status-dark.png',i.toPNG()));
 console.log('Peshitta closure status: exact live scope, documented gaps, provenance, limitations and expandable details rendered.');
};
