'use strict';
const assert=require('node:assert/strict');
module.exports=async({js,waitFor,book})=>{
 await book('Exodus');
 await waitFor("document.querySelector('#rSection option[value=\"16\"]')",'Exodus chapter selector');
 await js("document.querySelector('#rSection').value='16';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}));for(const id of ['#tcTov','#tcDss','#tcKen','#tcPs','#tcMa','#tcSmr']){const n=document.querySelector(id);if(n.checked){n.checked=false;n.dispatchEvent(new Event('change',{bubbles:true}));}}const hex=document.querySelector('#tcHex');hex.checked=true;hex.dispatchEvent(new Event('change',{bubbles:true}));if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click();");
 await waitFor("document.querySelector('#rOut .row[data-l=\"12\"] .txt')",'Exodus 17:12');
 await js("document.querySelector('#rOut .row[data-l=\"12\"] .txt').click()");
 await waitFor("document.querySelector('#tcBody [data-hx-explanation=editorial]')?.textContent.includes('Nomen')",'Concrete explanation visible without hover');
 assert(await js("document.querySelector('#tcBody').textContent.includes('Field bezweifelt in Fußnote 14')"));
 assert(await js("{const e=document.querySelector('#tcBody .tc-hx-explanation');getComputedStyle(e).display==='block'&&e.lang==='de'&&e.getBoundingClientRect().height>0}"));
 assert(await js("!!document.querySelector('#tcBody .tc-hx-w[data-hx-an]')&&!!document.querySelector('#tcBody .tc-hx-fn')"),'Greek word popups and original footnotes remain available');
 await js("document.querySelector('#tcBody .tc-hx-syn-toggle').click()");
 assert(await js("document.querySelector('#tcBody .tc-hx-syn').classList.contains('full')&&document.querySelectorAll('#tcBody [data-hx-explanation=editorial]').length===2"));
};
