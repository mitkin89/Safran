'use strict';
const assert=require('node:assert/strict');
module.exports=async({js,waitFor,book})=>{
 await book('Psalms');await waitFor("document.querySelector('#rOut .row[data-l=\"1\"] .txt')",'Psalm 1:1 loaded');
 await js("for(const id of ['#tcTov','#tcDss','#tcKen','#tcPs','#tcMa','#tcSmr']){const n=document.querySelector(id);n.checked=false;n.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#tcHex').checked=true;document.querySelector('#tcHex').dispatchEvent(new Event('change',{bubbles:true}));if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click();document.querySelector('#rOut .row[data-l=\"1\"] .txt').click()");
 await waitFor("document.querySelector('#tcBody').textContent.includes('„Versammlung“ statt „Ratschlag“')",'Psalm explanations visible');
 assert.equal(await js("document.querySelectorAll('#tcBody [data-hx-explanation=editorial]').length"),8);
 assert(await js("document.querySelector('#tcBody').textContent.includes('„Fremde“ statt „Gottlose“')"));
 assert.equal(await js("[...document.querySelectorAll('#tcBody .tc-hx-row-sig')].filter(n=>n.textContent==='Ε΄. S΄.').length"),3);
 assert(await js("[...document.querySelectorAll('#tcBody [data-hx-explanation=editorial]')].every(n=>n.textContent.length<210)"));
};
