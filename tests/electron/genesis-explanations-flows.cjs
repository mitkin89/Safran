'use strict';
const assert=require('node:assert/strict');
module.exports=async({js,waitFor,book})=>{
 await book('Genesis');await waitFor("document.querySelector('#rOut .row[data-l=\"14\"] .txt')",'Genesis 1 loaded');
 await js("for(const id of ['#tcTov','#tcDss','#tcKen','#tcPs','#tcMa','#tcSmr']){const n=document.querySelector(id);n.checked=false;n.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#tcHex').checked=true;document.querySelector('#tcHex').dispatchEvent(new Event('change',{bubbles:true}));if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click();document.querySelector('#rOut .row[data-l=\"14\"] .txt').click()");
 await waitFor("document.querySelectorAll('#tcBody [data-hx-explanation=editorial]').length===3",'Three distinct subreading notes visible');
 assert.equal(await js("[...document.querySelectorAll('#tcBody [data-hx-explanation=editorial]')].filter(n=>n.textContent.includes('Andere Befehlsform')).length"),1);
 assert.equal(await js("[...document.querySelectorAll('#tcBody [data-hx-explanation=editorial]')].filter(n=>n.textContent.includes('Andere Präposition')).length"),2);
 await js("document.querySelector('#rSection').value='1';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"2\"] .txt')",'Genesis 2 loaded');await js("document.querySelector('#rOut .row[data-l=\"2\"] .txt').click()");
 await waitFor("document.querySelector('#tcBody [data-hx-explanation=editorial]')?.textContent.includes('siebten Tag')",'Seventh versus sixth day explanation');
};
