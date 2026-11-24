'use strict';
const assert=require('node:assert/strict');
module.exports=async({js,waitFor,book})=>{
 await book('Ezekiel');
 await waitFor("[...document.querySelectorAll('#verList input[data-rel]')].some(n=>n.dataset.rel.includes('Westminster'))",'Ezekiel MT available');
 await js("{for(const n of document.querySelectorAll('#verList input[data-rel]')){const on=n.dataset.rel.includes('Westminster');if(n.checked!==on){n.checked=on;n.dispatchEvent(new Event('change',{bubbles:true}));}}}");
 await waitFor("document.querySelector('#rOut .row[data-l=\"1\"] .w')&&!document.querySelector('#rOut .cell[data-syriac]')",'MT without a Syriac reading column');
 await js("document.querySelector('#tcBtn').click();document.querySelector('#rOut .row[data-l=\"1\"] .txt').click();for(const id of ['#tcTov','#tcDss','#tcKen','#tcHex','#tcMa']){const n=document.querySelector(id);if(n.checked){n.checked=false;n.dispatchEvent(new Event('change',{bubbles:true}));}}const ps=document.querySelector('#tcPs');if(!ps.checked){ps.checked=true;ps.dispatchEvent(new Event('change',{bubbles:true}));}");
 const word="document.querySelector('#tcBody .tc-ps-word[data-tc-ps-word=\"Ezekiel 1:1\"][data-tc-ps-at=\"9\"]')";
 await waitFor(word,'Syriac plus word is clickable');
 assert.equal(await js(word+'.textContent'),'ܗܘܝܬ');await js(word+'.click()');
 await waitFor("!document.querySelector('#formsPanel').hidden&&document.querySelector('#wcBody .sc-apparatus-source')",'Peshitta word card opened directly from apparatus');
 const source=await js("document.querySelector('#wcBody .sc-apparatus-source').textContent");assert(source.includes('Ezekiel 1:1'));assert(source.includes('ܗܘܝܬ'));
 assert(await js("document.querySelector('#wcBody').textContent.includes('SEDRA')"));
 assert(!(await js("document.querySelector('#rOut .cell[data-syriac]')")),'No Syriac column or chapter navigation needed');
};
