'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor,book})=>{
 await book('Psalms');await waitFor("document.querySelector('#rOut .row[data-l=\"1\"]')",'Psalm 1');
 await js("document.querySelector('#rOut .row[data-l=\"1\"] .lab').click();if(document.querySelector('#dockTabs').hidden)document.querySelector('#studyBtn').click();document.querySelector('#dockTabs [data-panel=masora]').click()");
 await waitFor("!document.querySelector('#masoraPanel').hidden&&document.querySelector('.masora-entry')",'Masora offline geladen');
 await js("{document.querySelector('#masoraMs').value=window.MASORA_INDEX.manuscripts.find(m=>m.label==='B32inf.').id;document.querySelector('#masoraQuery').value='אשרי';document.querySelector('#masoraType').value='mp';document.querySelector('#masoraScope').value='chapter';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}));}");
 await waitFor("document.querySelector('.masora-count')&&[...document.querySelectorAll('.masora-entry')].every(e=>e.closest('.masora-word-group').querySelector('.masora-entry-head').textContent.includes('אשרי'))&&[...document.querySelectorAll('.masora-he')].some(e=>e.textContent==='דׄ בִׄטִע֙')",'Echte Masora-parva-Notiz von B32inf.');
 await js("document.querySelector('#masoraScope').value='verse';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-primary .masora-entry') && !document.querySelector('.masora-choices')",'Versansicht enthält nur eindeutige Wortbezüge');
 assert(await js("document.querySelector('#masoraScope').value==='verse' && /automatisch|automatically/i.test(document.querySelector('.masora-scope-note').textContent)"));
 assert(await js("document.querySelector('.masora-word-nav button') && document.querySelector('.masora-explanation') && document.querySelector('.masora-transcription').tagName==='DIV' && !document.querySelector('.masora-related')"));
 await js("document.querySelector('.masora-primary .masora-explanation').open=true");
 assert(await js("document.querySelector('.masora-explanation').textContent.includes('Lesehilfe')"));
 // The unique phrase marks both reader words; the ambiguous single word offers both source verses.
 await js("document.querySelector('.masora-primary .masora-word').click()");
 await waitFor("document.querySelectorAll('#rOut .tc-mt-selected').length===2",'Wortgruppe im Lesetext markiert');
 await waitFor("(()=>{const r=document.querySelector('#rOut .row[data-l=\"1\"]');let p=r.parentElement;while(p&&p!==document.body&&!(p.scrollHeight>p.clientHeight+1&&/(auto|scroll)/.test(getComputedStyle(p).overflowY)))p=p.parentElement;const root=!p||p===document.body;if(root)p=document.scrollingElement;const a=r.getBoundingClientRect(),b=root?{top:0,bottom:innerHeight}:p.getBoundingClientRect();const desired=Math.max(0,Math.min(p.scrollHeight-p.clientHeight,p.scrollTop+a.top-b.top-(p.clientHeight-a.height)/2));return Math.abs(p.scrollTop-desired)<8;})()",'Zielvers wird im Lesebereich zentriert');
 assert(await js("[...document.querySelectorAll('#rOut .tc-mt-selected')].every(w=>w.closest('.cell').dataset.rel.includes('Westminster'))"));
 await js("document.querySelector('#masoraScope').value='chapter';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-choices')",'Kapitelansicht mit mehrdeutigen Wortbezügen');
 await js("document.querySelector('.masora-choices').open=true;[...document.querySelectorAll('.masora-choices .masora-word')].find(b=>b.textContent.includes('2:12')).click()");
 await waitFor("document.querySelector('#rOut .row[data-l=\"12\"] .tc-mt-selected')",'Gewählter Wortbezug im Lesetext');
 await js("document.querySelector('#masoraScope').value='verse';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#masoraPlace').textContent.endsWith('2:12') && document.querySelector('#rOut .row[data-l=\"12\"] .tc-mt-selected')",'Mehrdeutiges Wort nach Auswahl in Psalm 2,12 markiert');
 await js("document.querySelector('#masoraScope').value='chapter';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-choices')",'Kapitelansicht mit mehrdeutigen Wortbezügen');
 await js("document.querySelector('.masora-choices').open=true;[...document.querySelectorAll('.masora-choices .masora-word')].find(b=>b.textContent.includes('1:1')).click()");
 await waitFor("document.querySelector('#rOut .row[data-l=\"1\"] .tc-mt-selected')",'Gewählter Wortbezug im Lesetext');
 await js("document.querySelector('#masoraScope').value='verse';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
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
 // The user's real Genesis example has a conservative count explanation and direct citations.
 await book('Genesis');await waitFor("document.querySelector('#rSection option[value=\"27\"]')",'Genesis 28 verfügbar');
 await js("document.querySelector('#rSection').value='27';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"15\"]')",'Genesis 28,15');
 await js("document.querySelector('#rOut .row[data-l=\"15\"] .lab').click();document.querySelector('#masoraScope').value='verse';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("[...document.querySelectorAll('.masora-primary .masora-entry')].some(e=>e.textContent.includes('5 Vorkommen')&&e.textContent.includes('Joshua 23:14'))",'Deutsche Lesehilfe und Belege für die Fünferliste');
 assert(await js("!document.querySelector('.masora-related') && !document.querySelector('details.masora-transcription') && [...document.querySelectorAll('.masora-primary .masora-entry')].filter(e=>e.querySelectorAll('.masora-reading').length===1).every(e=>e.getBoundingClientRect().height<100 && e.querySelector('.masora-transcription').getBoundingClientRect().height>0)"));
 await js("document.querySelector('.masora-primary').scrollIntoView({block:'start'});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 fs.writeFileSync('/tmp/safran-masora-flat.png',(await win.webContents.capturePage()).toPNG());
 await js("{const e=[...document.querySelectorAll('.masora-primary .masora-entry')].find(e=>e.textContent.includes('5 Vorkommen')&&e.textContent.includes('Joshua 23:14'));e.querySelector('.masora-explanation').open=true;e.scrollIntoView({block:'start'});}");
 await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 assert(await js("[...document.querySelectorAll('.masora-primary .masora-explanation')].some(e=>e.open&&e.textContent.includes('5 Vorkommen'))"));
 fs.writeFileSync('/tmp/safran-masora-explanation.png',(await win.webContents.capturePage()).toPNG());
 // Empty coverage remains honest and still offers the manuscript collection search.
 await book('Genesis');await js("document.querySelector('#dockTabs [data-panel=masora]').click();document.querySelector('#masoraMs').value='';document.querySelector('#masoraScope').value='chapter';document.querySelector('#masoraQuery').value='no-such-masora-entry-8492';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-empty')&&!document.querySelector('.masora-entry')",'Leere Suche ohne erfundene Notiz');
 await js("document.querySelector('#masoraScope').value='all';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("Object.keys(window.MASORA_DATA||{}).length===window.MASORA_INDEX.manuscripts.length && document.querySelector('.masora-empty')",'Gesamter importierter Bestand offline durchsuchbar');
 console.log('Electron: Masorah verse scope, unique/ambiguous word navigation, reader highlights, filters, fonts and pinning passed offline.');
};
