'use strict';
const assert=require('node:assert/strict');
module.exports=async({js,waitFor,book})=>{
 await book('Exodus');await waitFor("document.querySelector('#rSection option[value=\"17\"]')",'Exodus chapter selector');
 await js("document.querySelector('#rSection').value='17';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}));for(const id of ['#tcDss','#tcKen','#tcPs','#tcMa','#tcSmr','#tcHex']){const n=document.querySelector(id);n.checked=false;n.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#tcTov').checked=true;document.querySelector('#tcTov').dispatchEvent(new Event('change',{bubbles:true}));if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click()");
 await waitFor("document.querySelector('#rOut .row[data-l=\"8\"] .txt')",'Exodus 18:8');await js("document.querySelector('#rOut .row[data-l=\"8\"] .txt').click()");
 await waitFor("document.querySelector('#tcBody .tc-tov-source-details')",'Source groups folded');
 assert(await js("{const d=document.querySelector('#tcBody .tc-tov-source-details');!d.open&&d.querySelectorAll('.tc-tov-entry').length===4&&d.previousElementSibling.matches('.tc-lxx-reading')}"),'The four source groups are kept under the main classified reading');
 assert(await js("document.querySelector('#tcBody .tc-lxx-reading').textContent.includes('18:10')"));
 await js("document.querySelector('#tcBody .tc-tov-source-details summary').click()");assert(await js("document.querySelector('#tcBody .tc-tov-source-details').open"));
 assert(await js("[...document.querySelectorAll('#tcBody .tc-tov-source-details [data-tc-note]')].some(n=>n.getBoundingClientRect().height>0)"));
 assert(await js("[...document.querySelectorAll('#tcBody .tc-witness-label')].every(n=>n.textContent==='Tov')"));
};
