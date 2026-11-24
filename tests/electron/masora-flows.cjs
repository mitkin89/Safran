'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor,book})=>{
 await book('Psalms');await waitFor("document.querySelector('#rOut .row[data-l=\"1\"]')",'Psalm 1');
 await js("document.querySelector('#rOut .row[data-l=\"1\"] .lab').click();if(document.querySelector('#dockTabs').hidden)document.querySelector('#studyBtn').click();document.querySelector('#dockTabs [data-panel=masora]').click()");
 await waitFor("!document.querySelector('#masoraPanel').hidden&&document.querySelector('.masora-entry')",'Masora offline geladen');
 await js("{document.querySelector('#masoraMs').value=window.MASORA_INDEX.manuscripts.find(m=>m.label==='B32inf.').id;document.querySelector('#masoraQuery').value='אשרי';document.querySelector('#masoraType').value='mp';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}));}");
 await waitFor("document.querySelector('.masora-count')&&[...document.querySelectorAll('.masora-entry')].every(e=>e.querySelector('.masora-entry-head').textContent.includes('אשרי'))&&[...document.querySelectorAll('.masora-he')].some(e=>e.textContent==='דׄ בִׄטִע֙')",'Echte Masora-parva-Notiz von B32inf.');
 assert(await js("document.querySelector('#masoraScope').value==='verse' && /automatisch|automatically/i.test(document.querySelector('.masora-scope-note').textContent)"));
 // The unique phrase marks both reader words; the ambiguous single word offers both source verses.
 await js("document.querySelector('.masora-primary .masora-word').click()");
 await waitFor("document.querySelectorAll('#rOut .tc-mt-selected').length===2",'Wortgruppe im Lesetext markiert');
 assert(await js("[...document.querySelectorAll('#rOut .tc-mt-selected')].every(w=>w.closest('.cell').dataset.rel.includes('Westminster'))"));
 await js("document.querySelector('.masora-related').open=true;document.querySelector('.masora-choices').open=true;[...document.querySelectorAll('.masora-choices .masora-word')].find(b=>b.textContent.includes('2:12')).click()");
 await waitFor("document.querySelector('#masoraPlace').textContent.endsWith('2:12') && document.querySelector('#rOut .row[data-l=\"12\"] .tc-mt-selected')",'Mehrdeutiges Wort nach Auswahl in Psalm 2,12 markiert');
 await js("document.querySelector('.masora-related').open=true;document.querySelector('.masora-choices').open=true;[...document.querySelectorAll('.masora-choices .masora-word')].find(b=>b.textContent.includes('1:1')).click()");
 await waitFor("document.querySelector('#masoraPlace').textContent.endsWith('1:1') && document.querySelector('#rOut .row[data-l=\"1\"] .tc-mt-selected')",'Zurück zu Psalm 1,1');
 await js("document.querySelector('#rOut .row[data-l=\"2\"] .lab').click()");
 await waitFor("document.querySelector('#masoraPlace').textContent.endsWith('1:2') && !document.querySelector('.masora-primary .masora-entry')",'Verswechsel aktualisiert Notizen ohne falsche Zuordnung');
 await js("document.querySelector('#rOut .row[data-l=\"1\"] .lab').click()");
 await waitFor("document.querySelector('.masora-primary .masora-entry')",'Notizen zu Vers 1 wiederhergestellt');
 assert(await js("[...document.querySelectorAll('.masora-external')].some(a=>a.href.includes('/manuscript/B32inf./009_B32inf_c.3r'))"));
 assert(await js("document.querySelector('.masora-credit').textContent.includes('CC BY-SA 4.0')"));
 const size=await js("getComputedStyle(document.querySelector('.masora-he')).fontSize");await js("document.querySelector('#masoraFsPlus').click()");assert.notEqual(await js("getComputedStyle(document.querySelector('.masora-he')).fontSize"),size);
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))");assert(await js("!document.querySelector('#masoraPanel').hidden"));
 await js("document.querySelector('#dockTabs [data-panel=outline]').click();document.querySelector('#dockTabs [data-panel=masora]').click()");
 await waitFor("document.querySelector('.masora-he')",'Rückkehr zum Masora-Tab');assert.equal(await js("document.querySelector('#masoraQuery').value"),'אשרי');
 fs.writeFileSync('/tmp/safran-masora-import.png',(await win.webContents.capturePage()).toPNG());
 // A spelling absent from the actual reader must produce a notice, not a wrong index highlight.
 await js("{const w=document.querySelector('#rOut .row[data-l=\"1\"] .cell[data-mt] .w');w.dataset.savedMasoraHtml=w.innerHTML;w.textContent='בדיקה';document.querySelector('.masora-primary .masora-word').click();}");
 await waitFor("document.querySelector('#masoraWordStatus')?.textContent && !document.querySelector('#rOut .tc-mt-selected')",'Abweichende Lesefassung wird nicht falsch markiert');
 await js("{const w=document.querySelector('#rOut [data-saved-masora-html]');w.innerHTML=w.dataset.savedMasoraHtml;delete w.dataset.savedMasoraHtml;}");
 // Source citations are separately searchable, including notes on pages of another Bible chapter.
 await js("{document.querySelector('#masoraQuery').value='';document.querySelector('#masoraMs').value='';document.querySelector('#masoraType').value='masora';document.querySelector('#masoraScope').value='citations';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}));}");
 await waitFor("document.querySelector('.masora-entry') && /zitieren|cite/.test(document.querySelector('.masora-scope-note')?.textContent||'')",'Explizite Stellenzitate getrennt von Seitenbelegen');
 // Empty coverage remains honest and still offers the manuscript collection search.
 await book('Genesis');await js("document.querySelector('#dockTabs [data-panel=masora]').click();document.querySelector('#masoraMs').value='';document.querySelector('#masoraScope').value='chapter';document.querySelector('#masoraQuery').value='no-such-masora-entry-8492';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-empty')&&!document.querySelector('.masora-entry')",'Leere Suche ohne erfundene Notiz');
 await js("document.querySelector('#masoraScope').value='all';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("Object.keys(window.MASORA_DATA||{}).length===window.MASORA_INDEX.manuscripts.length && document.querySelector('.masora-empty')",'Gesamter importierter Bestand offline durchsuchbar');
 console.log('Electron: Masorah verse scope, unique/ambiguous word navigation, reader highlights, filters, fonts and pinning passed offline.');
};
