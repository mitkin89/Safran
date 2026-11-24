'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor,book})=>{
 await book('Psalms');await waitFor("document.querySelector('#rOut .row[data-l=\"1\"]')",'Psalm 1');
 await js("if(document.querySelector('#dockTabs').hidden)document.querySelector('#studyBtn').click();document.querySelector('#dockTabs [data-panel=masora]').click()");
 await waitFor("!document.querySelector('#masoraPanel').hidden&&document.querySelector('.masora-entry')",'Masora offline geladen');
 await js("{document.querySelector('#masoraMs').value=window.MASORA_INDEX.manuscripts.find(m=>m.label==='B32inf.').id;document.querySelector('#masoraQuery').value='אשרי';document.querySelector('#masoraType').value='mp';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}));}");
 await waitFor("document.querySelector('.masora-count')&&[...document.querySelectorAll('.masora-entry')].every(e=>e.querySelector('h4').textContent.includes('אשרי'))&&[...document.querySelectorAll('.masora-he')].some(e=>e.textContent==='דׄ בִׄטִע֙')",'Echte Masora-parva-Notiz von B32inf.');
 assert(await js("document.querySelector('.masora-scope-note').textContent.includes('benachbarte')||document.querySelector('.masora-scope-note').textContent.includes('neighbouring')"));
 assert(await js("[...document.querySelectorAll('.masora-external')].some(a=>a.href.includes('/manuscript/B32inf./009_B32inf_c.3r'))"));
 assert(await js("document.querySelector('.masora-credit').textContent.includes('CC BY-SA 4.0')"));
 const size=await js("getComputedStyle(document.querySelector('.masora-he')).fontSize");await js("document.querySelector('#masoraFsPlus').click()");assert.notEqual(await js("getComputedStyle(document.querySelector('.masora-he')).fontSize"),size);
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))");assert(await js("!document.querySelector('#masoraPanel').hidden"));
 await js("document.querySelector('#dockTabs [data-panel=outline]').click();document.querySelector('#dockTabs [data-panel=masora]').click()");
 await waitFor("document.querySelector('.masora-he')",'Rückkehr zum Masora-Tab');assert.equal(await js("document.querySelector('#masoraQuery').value"),'אשרי');
 fs.writeFileSync('/tmp/safran-masora-import.png',(await win.webContents.capturePage()).toPNG());
 // Source citations are separately searchable, including notes on pages of another Bible chapter.
 await js("{document.querySelector('#masoraQuery').value='';document.querySelector('#masoraMs').value='';document.querySelector('#masoraType').value='masora';document.querySelector('#masoraScope').value='citations';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}));}");
 await waitFor("document.querySelector('.masora-entry') && /zitieren|cite/.test(document.querySelector('.masora-scope-note')?.textContent||'')",'Explizite Stellenzitate getrennt von Seitenbelegen');
 // Empty coverage remains honest and still offers the manuscript collection search.
 await book('Genesis');await js("document.querySelector('#dockTabs [data-panel=masora]').click();document.querySelector('#masoraMs').value='';document.querySelector('#masoraScope').value='chapter';document.querySelector('#masoraQuery').value='no-such-masora-entry-8492';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-empty')&&!document.querySelector('.masora-entry')",'Leere Suche ohne erfundene Notiz');
 await js("document.querySelector('#masoraScope').value='all';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("Object.keys(window.MASORA_DATA||{}).length===window.MASORA_INDEX.manuscripts.length && document.querySelector('.masora-empty')",'Gesamter importierter Bestand offline durchsuchbar');
 console.log('Electron: Masorah source text, chapter/page scope, filters, credits, font size, pinning and empty results passed offline.');
};
