'use strict';
// Apparatus search: notes of the LXX/Peshitta/Hexapla readings, filters, and the jump to the verse.
const assert=require('node:assert/strict');
module.exports=async({js,waitFor,book})=>{
 await book('Genesis');await waitFor("!document.querySelector('#tcBtn').hidden",'Apparat verfügbar');
 if(await js("document.querySelector('#textcritPanel').hidden"))await js("document.querySelector('#tcBtn').click()");
 await waitFor("!document.querySelector('#textcritPanel').hidden",'Apparat offen');
 await js("for(let i=0;i<10;i++) document.querySelector('#tcFsPlus').click()");
 const apparatusSize=await js("getComputedStyle(document.querySelector('#tcBody')).fontSize");
 assert.equal(apparatusSize,'24px');
 await js("document.querySelector('#tcSearchBtn').click()");
 await waitFor("!document.querySelector('#tcSearch').hidden&&document.querySelector('#tcsQ')",'Suchansicht');
 assert(await js("document.querySelector('#tcBody').hidden"),'Apparat während der Suche ausgeblendet');
 await waitFor("/\\d+ (Lesarten|readings)/.test(document.querySelector('.tcs-count')?.textContent||'')",'alle Lesarten geladen');
 const total=await js("parseInt(document.querySelector('.tcs-count').textContent)");
 assert(total>20000,'alle Lesarten: '+total);
 assert.equal(await js("getComputedStyle(document.querySelector('#tcsQ')).fontSize"),'13px');
 assert.equal(await js("getComputedStyle(document.querySelector('.tcs-note')).fontSize"),'14px');
 await js("document.querySelector('#tcFsPlus').click()");
 assert.equal(await js("getComputedStyle(document.querySelector('.tcs-note')).fontSize"),'15px');
 assert.equal(await js("getComputedStyle(document.querySelector('#tcsQ')).fontSize"),'13px');
 assert.equal(await js("localStorage.getItem('tcSearchFs')"),'15');
 // Targum-shared place name: Ararat as the mountains of Qardu (Gen 8:4)
 await js("{const q=document.querySelector('#tcsQ');q.value='Qardu';q.dispatchEvent(new Event('input',{bubbles:true}));}");
 await waitFor("document.querySelector('.tcs-hit[data-tcs-book=\"Genesis\"][data-tcs-ch=\"8\"][data-tcs-v=\"4\"]')",'Gen 8:4 gefunden');
 assert(await js("document.querySelector('.tcs-hit mark')"),'Suchwort markiert');
 // A category works with an empty text query and keeps its attribution.
 await js("{document.querySelector('#tcsQ').value='';const f=document.querySelector('#tcsTradition');f.value='targum';f.dispatchEvent(new Event('change',{bubbles:true}));}");
 await waitFor("document.querySelector('.tcs-hit[data-tcs-book=Isaiah] .tc-tradition[data-tradition=targum]')",'Targum-Merkmal unabhängig vom Suchtext');
 assert(await js("[...document.querySelectorAll('.tcs-hit')].every(row=>row.querySelector('[data-tradition=targum]'))"));
 assert(await js("document.querySelector('.tcs-hit[data-tcs-book=Isaiah] .tc-tradition').title.includes('Mikraot Gedolot')"));
 await js("{const f=document.querySelector('#tcsTradition');f.value='aggada';f.dispatchEvent(new Event('change',{bubbles:true}));}");
 await waitFor("document.querySelector('.tcs-hit[data-tcs-book=Exodus][data-tcs-ch=\"2\"][data-tcs-v=\"9\"] [data-tradition=aggada]')",'Aggada-Merkmal zu Exodus 2:9');
 assert(await js("document.querySelector('.tcs-hit[data-tcs-book=Genesis][data-tcs-ch=\"38\"][data-tcs-v=\"5\"] [data-tradition=aggada]')"));
 assert(await js("[...document.querySelectorAll('.tcs-hit')].every(row=>row.querySelector('[data-tradition=aggada]'))"));
 await js("document.querySelector('#tcsTradition').value=''");
 // filter: LXX and Syr together against the MT, Genesis only: Gen 2:2 („am sechsten Tag“)
 await js("{const q=document.querySelector('#tcsQ');q.value='';document.querySelector('#tcsBook').value='Genesis';document.querySelector('#tcsBoth').checked=true;document.querySelector('#tcsBoth').dispatchEvent(new Event('change',{bubbles:true}));}");
 await waitFor("document.querySelector('.tcs-hit[data-tcs-ch=\"2\"][data-tcs-v=\"2\"]')",'Gen 2:2 gemeinsam gegen den MT');
 assert(await js("[...document.querySelectorAll('.tcs-hit')].every(h=>h.dataset.tcsBook==='Genesis'&&h.querySelector('.tcs-both'))"));
 // click opens the verse and shows its apparatus
 await js("{document.querySelector('#tcsBook').value='';document.querySelector('#tcsBoth').checked=false;const q=document.querySelector('#tcsQ');q.value='Qardu';q.dispatchEvent(new Event('input',{bubbles:true}));}");
 await waitFor("document.querySelector('.tcs-hit[data-tcs-ch=\"8\"][data-tcs-v=\"4\"]')",'Treffer erneut');
 await js("document.querySelector('.tcs-hit[data-tcs-ch=\"8\"][data-tcs-v=\"4\"]').click()");
 await waitFor("document.querySelector('#tcSearch').hidden&&!document.querySelector('#tcBody').hidden&&/Genesis 8:4/.test(document.querySelector('#tcPlace').textContent)",'Apparat zu Gen 8:4');
 await waitFor("document.querySelector('#tcBody .tc-entry')",'Apparat-Einträge zu Gen 8:4');
 assert.equal(await js("getComputedStyle(document.querySelector('#tcBody')).fontSize"),apparatusSize);
 await js("{const f=document.querySelector('#tcPsTech');f.checked=true;f.dispatchEvent(new Event('change',{bubbles:true}));}");
 await waitFor("document.querySelector('#tcBody [data-tradition=targum]')",'Targum-Merkmal im Versapparat');
 console.log('Electron: Lesarten-Suche im Apparat (Volltext, Filter, gemeinsam gegen den MT, Sprung zum Vers) bestanden.');
};
