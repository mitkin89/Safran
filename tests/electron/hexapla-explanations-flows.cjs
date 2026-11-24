'use strict';
const assert=require('node:assert/strict');
module.exports=async({js,waitFor,book})=>{
 await book('Exodus');
 await waitFor("document.querySelector('#rSection option[value=\"16\"]')",'Exodus chapter selector');
 await js("document.querySelector('#rSection').value='16';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}));for(const id of ['#tcTov','#tcDss','#tcKen','#tcPs','#tcMa','#tcSmr']){const n=document.querySelector(id);if(n.checked){n.checked=false;n.dispatchEvent(new Event('change',{bubbles:true}));}}const hex=document.querySelector('#tcHex');hex.checked=true;hex.dispatchEvent(new Event('change',{bubbles:true}));if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click();");
 await waitFor("document.querySelector('#rOut .row[data-l=\"12\"] .txt')",'Exodus 17:12');
 await js("document.querySelector('#rOut .row[data-l=\"12\"] .txt').click()");
 await waitFor("document.querySelector('#tcBody [data-hx-explanation=editorial]')?.textContent.includes('Nomen')",'Concrete explanation visible without hover');
 assert(await js("document.querySelector('#tcBody').textContent.includes('laut Field fraglich')"));
 assert(await js("{const e=document.querySelector('#tcBody .tc-hx-explanation');getComputedStyle(e).display==='block'&&e.lang==='de'&&e.getBoundingClientRect().height>0}"));
 assert(await js("!!document.querySelector('#tcBody .tc-hx-w[data-hx-an]')&&!!document.querySelector('#tcBody .tc-hx-fn')"),'Greek word popups and original footnotes remain available');
 await js("document.querySelector('#tcBody .tc-hx-syn-toggle').click()");
 assert(await js("document.querySelector('#tcBody .tc-hx-syn').classList.contains('full')&&document.querySelectorAll('#tcBody [data-hx-explanation=editorial]').length===2"));
 await js("document.querySelector('#rSection').value='17';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"2\"] .txt')",'Exodus 18:2');
 await js("document.querySelector('#rOut .row[data-l=\"2\"] .txt').click()");
 await waitFor("document.querySelector('#tcBody [data-hx-type=gleich]')",'Symmachus reference remains one row');
 assert.equal(await js("document.querySelectorAll('#tcBody .tc-hx-row-sig').length"),4);
 assert(await js("!document.querySelector('#tcBody').textContent.includes('Abweichende Wörter:')"),'No redundant automatic comparisons');
 await js("document.querySelector('#rOut .row[data-l=\"5\"] .txt').click()");
 await waitFor("document.querySelector('#tcBody [data-hx-explanation=editorial]')?.textContent.includes('Er kam')",'Exodus 18:5 explains the actual change in meaning');
 assert(await js("document.querySelector('#tcBody').textContent.includes('Schwiegervater')"));

 await js("document.querySelector('#rOut .row[data-l=\"1\"] .txt').click()");
 await waitFor("document.querySelector('#tcBody').textContent.includes('„Des Herrn“ statt')",'Exodus 18:1 gets short translated differences');
 assert(await js("[...document.querySelectorAll('#tcBody [data-hx-explanation=editorial]')].every(n=>n.textContent.length<210)"));
 assert(await js("[...document.querySelectorAll('#tcBody .tc-hx-row-sig')].some(n=>n.textContent==='Καὶ οἱ Γ΄.')"));
};
