'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor,book})=>{
 await book('Psalms');await waitFor("document.querySelector('#rOut .row[data-l=\"1\"]')",'Psalm 1');
 await js("document.querySelector('#rOut .row[data-l=\"1\"] .verse-tool').click();if(document.querySelector('#dockTabs').hidden)document.querySelector('#studyBtn').click();document.querySelector('#dockTabs [data-panel=masora]').click()");
 await waitFor("!document.querySelector('#masoraPanel').hidden&&document.querySelector('.masora-entry')",'Masora offline geladen');
 // Shared apparatus controls are functional, including scroll following and verse stepping.
 assert(await js("document.querySelector('#masoraPrev').disabled && !document.querySelector('#masoraNext').disabled"));
 await js("document.querySelector('#masoraSearchBtn').click()");assert(await js("!document.querySelector('#masoraSearch').hidden && document.activeElement.id==='masoraQuery'"));
 await js("document.querySelector('#masoraSearchBtn').click();document.querySelector('#masoraWitnesses').click()");assert(await js("document.querySelector('#masoraSettings').open && document.activeElement.id==='masoraMs'"));
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))");assert(await js("!document.querySelector('#masoraSettings').open && !document.querySelector('#masoraPanel').hidden"));
 await js("document.querySelector('#masoraWhole').click()");await waitFor("document.querySelector('#masoraScope').value==='chapter' && document.querySelector('#masoraWhole').textContent==='Ausgewählter Vers'",'Kapitelumschaltung');
 await js("document.querySelector('#masoraWhole').click();document.querySelector('#masoraNext').click()");await waitFor("document.querySelector('#masoraPlace').textContent.endsWith('1:2')",'Nächster Masora-Vers');
 await js("document.querySelector('#masoraPrev').click()");await waitFor("document.querySelector('#masoraPlace').textContent.endsWith('1:1')",'Voriger Masora-Vers');
 await js("new Promise(resolve=>setTimeout(resolve,400))");
 await js("document.querySelector('#masoraFollow').click();{document.querySelector('#rOut').style.paddingBottom='100vh';const r=document.querySelector('#rOut .row[data-l=\"3\"]'),s=document.querySelector('#stick').getBoundingClientRect().bottom;window.scrollBy(0,r.getBoundingClientRect().top+r.offsetHeight/2-s-(innerHeight-s)*.25);}");
 await js("new Promise(resolve=>setTimeout(resolve,500))");
 const followState=await js("(()=>{const top=document.querySelector('#stick').getBoundingClientRect().bottom,y=top+(innerHeight-top)*.25;let pick;for(const r of document.querySelectorAll('#rOut .row[data-l]')){if(r.getBoundingClientRect().bottom<top+4)continue;pick=r;if(r.getBoundingClientRect().bottom>=y)break;}window.masoraExpectedRow=pick?.dataset.l;return {expected:window.masoraExpectedRow,shown:document.querySelector('#masoraPlace').textContent,tab:document.documentElement.dataset.tab,scroll:scrollY};})()");
 assert.notEqual(followState.expected,'1');
 await waitFor("document.querySelector('#masoraPlace').textContent.endsWith('1:'+window.masoraExpectedRow) && document.querySelector('#masoraFollow').getAttribute('aria-pressed')==='true'",'Masora folgt dem sichtbaren Lesetext');
 await js("document.querySelector('#masoraFollow').click();document.querySelector('#rOut .row[data-l=\"4\"]').scrollIntoView({block:'center'});new Promise(resolve=>setTimeout(resolve,350))");
 assert(await js("document.querySelector('#masoraPlace').textContent.endsWith('1:'+window.masoraExpectedRow)"));
 await js("document.querySelector('#rOut').style.paddingBottom='';document.querySelector('#rOut .row[data-l=\"1\"] .verse-tool').click()");
 await js("{document.querySelector('#masoraMs').value=window.MASORA_INDEX.manuscripts.find(m=>m.label==='B32inf.').id;document.querySelector('#masoraQuery').value='אשרי';document.querySelector('#masoraType').value='mp';document.querySelector('#masoraScope').value='chapter';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}));}");
 await waitFor("document.querySelector('.masora-count')&&[...document.querySelectorAll('.masora-entry')].every(e=>e.closest('.masora-word-group').querySelector('.masora-entry-head').textContent.includes('אשרי'))&&[...document.querySelectorAll('.masora-he')].some(e=>e.textContent==='דׄ בִׄטִע֙')",'Echte Masora-parva-Notiz von B32inf.');
 await js("document.querySelector('#masoraScope').value='verse';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-primary .masora-entry') && !document.querySelector('.masora-choices')",'Versansicht enthält nur eindeutige Wortbezüge');
 assert(await js("document.querySelector('#masoraScope').value==='verse' && /automatisch|automatically/i.test(document.querySelector('.masora-scope-note').textContent)"));
 assert(await js("document.querySelector('.masora-primary .masora-translation')"));
 assert(await js("document.querySelector('.masora-primary .masora-translation .masora-de[lang=de]').textContent.trim().length>0"));
 await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 fs.writeFileSync('/tmp/safran-masora-working-translation.png',(await win.webContents.capturePage()).toPNG());
 assert(await js("document.querySelector('.masora-word-nav button') && document.querySelector('.masora-explanation') && document.querySelector('.masora-transcription').tagName==='DIV' && !document.querySelector('.masora-related')"));
 assert(await js("(()=>{const e=document.querySelector('.masora-primary .masora-translation');return e.tagName==='SECTION'&&!e.querySelector('summary')&&e.querySelector('.masora-de').getBoundingClientRect().height>0&&e.closest('.masora-entry').querySelectorAll('.masora-explanation').length===1&&!e.closest('.masora-entry').querySelector('.masora-page-source').open;})()"));
 // The unique phrase marks both reader words; the ambiguous single word offers both source verses.
 await js("[...document.querySelectorAll('.masora-primary .masora-word')].find(b=>b.textContent.includes('אשרי האיש')).click()");
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
 await js("document.querySelector('#rOut .row[data-l=\"2\"] .verse-tool').click()");
 await waitFor("document.querySelector('#masoraPlace').textContent.endsWith('1:2') && !document.querySelector('.masora-primary .masora-entry')",'Verswechsel aktualisiert Notizen ohne falsche Zuordnung');
 await js("document.querySelector('#rOut .row[data-l=\"1\"] .verse-tool').click()");
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
 await js("document.querySelector('#rOut .row[data-l=\"15\"] .verse-tool').click();document.querySelector('#masoraScope').value='verse';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("[...document.querySelectorAll('.masora-primary .masora-entry')].some(e=>e.dataset.masoraContext==='70503a61-4a9c-493b-b3c7-0c9014dbad1e'&&e.textContent.includes('Joshua 23:14'))",'Deutsche Übersetzung und Belege für die Fünferliste');
 assert(await js("!document.querySelector('.masora-related') && !document.querySelector('details.masora-transcription') && [...document.querySelectorAll('.masora-primary .masora-entry')].filter(e=>e.querySelectorAll('.masora-reading').length===1).every(e=>e.querySelector('.masora-explanation').getBoundingClientRect().height>0 && e.querySelector('.masora-transcription').getBoundingClientRect().height>0)"));

 await js("document.querySelector('.masora-primary').scrollIntoView({block:'start'});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 fs.writeFileSync('/tmp/safran-masora-flat.png',(await win.webContents.capturePage()).toPNG());
 await js("{const e=[...document.querySelectorAll('.masora-primary .masora-entry')].find(e=>e.dataset.masoraContext==='70503a61-4a9c-493b-b3c7-0c9014dbad1e'&&e.textContent.includes('Joshua 23:14'));e.scrollIntoView({block:'start'});}");
 await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 assert(await js("[...document.querySelectorAll('.masora-primary .masora-explanation')].some(e=>e.getBoundingClientRect().height>0&&e.textContent.includes('5-mal'))"));
 fs.writeFileSync('/tmp/safran-masora-explanation.png',(await win.webContents.capturePage()).toPNG());
 // Hidden page notes cannot produce a false continuation button in verse mode.
 await book('Genesis');await waitFor("document.querySelector('#rSection option[value=\"0\"]')",'Genesis 1 verfügbar');
 await js("document.querySelector('#rSection').value='0';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"2\"]')",'Genesis 1,2');
 await js("document.querySelector('#rOut .row[data-l=\"2\"] .verse-tool').click()");
 await waitFor("document.querySelector('#masoraPlace').textContent.endsWith('1:2') && document.querySelectorAll('.masora-primary .masora-entry').length===53 && !document.querySelector('#masoraMore')",'Kein leeres Nachladen für ausgeblendete Seitennotizen');
 await js("document.querySelector('#masoraWhole').click()");
 await waitFor("document.querySelectorAll('.masora-primary .masora-entry').length===100 && document.querySelector('#masoraMore')",'Kapitel mit echten weiteren Notizen');
 await js("document.querySelector('#masoraMore').click()");
 await waitFor("document.querySelectorAll('.masora-primary .masora-entry').length===200",'Weitere anzeigen lädt tatsächlich weitere sichtbare Notizen');
 fs.writeFileSync('/tmp/safran-masora-controls.png',(await win.webContents.capturePage()).toPNG());
 // Empty coverage remains honest and still offers the manuscript collection search.
 await book('Genesis');await js("document.querySelector('#dockTabs [data-panel=masora]').click();document.querySelector('#masoraMs').value='';document.querySelector('#masoraScope').value='chapter';document.querySelector('#masoraQuery').value='no-such-masora-entry-8492';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-empty')&&!document.querySelector('.masora-entry')",'Leere Suche ohne erfundene Notiz');
 await js("document.querySelector('#masoraScope').value='all';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("Object.keys(window.MASORA_DATA||{}).length===window.MASORA_INDEX.manuscripts.length && document.querySelector('.masora-empty')",'Gesamter importierter Bestand offline durchsuchbar');
 // Translation coverage extends through the final corpus batch, not just the first10000.
 await js("{const ids=new Set(window.MASORA_TRANSLATION_INDEX.batches.at(-1).ids);let found;for(const [id,ms]of Object.entries(window.MASORA_DATA)){for(const page of ms.pages){for(const entry of page.contexts){if(!ids.has(entry.uuid))continue;const reading=entry.readings.find(r=>window.MasoraData.text(r).length>60);if(reading){found={id,entry,reading};break;}}if(found)break;}if(found)break;}if(!found)throw Error('No final translation source');window.masoraLastExpected=found.entry.uuid;document.querySelector('#masoraMs').value=found.id;document.querySelector('#masoraQuery').value=window.MasoraData.text(found.reading);document.querySelector('#masoraScope').value='all';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}));}");
 await waitFor("document.querySelector('.masora-entry[data-masora-context=\"'+window.masoraLastExpected+'\"] .masora-translation')",'Arbeitsübersetzung im letzten Bestandsabschnitt geladen');
 assert(await js("window.MASORA_TRANSLATION_INDEX.count===26969 && Object.keys(window.MASORA_TRANSLATION_PARTS[10].notes).length>0"));
 await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const e=document.querySelector('.masora-entry[data-masora-context=\"'+window.masoraLastExpected+'\"] .masora-translation'),p=document.querySelector('#masoraPanel');p.scrollTop+=e.getBoundingClientRect().top-p.querySelector('.masora-head').getBoundingClientRect().bottom-8;requestAnimationFrame(resolve);})))");
 fs.writeFileSync('/tmp/safran-masora-complete-translations.png',(await win.webContents.capturePage()).toPNG());
 // A newly reviewed translation is rendered from its actual source-bound runtime batch.
 const translationIndex=require('../../masora-translations/index');
 let revised;
 for(const batch of translationIndex.batches){for(const record of Object.values(require('../../'+batch.file).notes)){
  const reading=record.readings.find(r=>r.reviewRound===2&&/review/.test(r.method||'')&&r.source.length>35);
  if(reading){revised={uuid:record.uuid,source:reading.source,de:reading.de};break;}
 }if(revised)break;}
 assert(revised,'at least one actual reviewed translation');
 await js(`{const expected=${JSON.stringify(revised)};window.masoraReviewExpected=expected;let id;for(const [key,ms] of Object.entries(window.MASORA_DATA)){if(ms.pages.some(p=>p.contexts.some(e=>e.uuid===expected.uuid))){id=key;break;}}if(!id)throw Error('Missing reviewed source');document.querySelector('#masoraMs').value=id;document.querySelector('#masoraQuery').value=expected.source;document.querySelector('#masoraScope').value='all';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}));}`);
 await waitFor("(()=>{const entry=document.querySelector('.masora-entry[data-masora-context=\"'+window.masoraReviewExpected.uuid+'\"]');return entry?.querySelector('.masora-translation')&&entry.textContent.includes(window.masoraReviewExpected.de);})()",'Neu geprüfte deutsche Übersetzung erscheint an ihrer Quelle');
 await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 fs.writeFileSync('/tmp/safran-masora-reviewed-translation.png',(await win.webContents.capturePage()).toPNG());
 await js("document.querySelector('#masoraScope').value='verse';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 // Parenthetical context and a source suffix must not hide the real Job 2:13 head.
 await book('Job');await waitFor("document.querySelector('#rSection option[value=\"1\"]')",'Hiob 2 verfügbar');
 await js("document.querySelector('#rSection').value='1';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"13\"]')",'Hiob 2,13');
 await js("document.querySelector('#rOut .row[data-l=\"13\"] .verse-tool').click();document.querySelector('#masoraMs').value=window.MASORA_INDEX.manuscripts.find(m=>m.label==='Vat.Urb.ebr.1').id;document.querySelector('#masoraQuery').value='גדל';document.querySelector('#masoraType').value='masora';document.querySelector('#masoraScope').value='verse';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-primary [data-masora-context=\"77cd9d16-679d-4ee7-b32d-c0e5f99a3390\"]')",'גדל mit Kontext in der Versansicht');
 await js("[...document.querySelectorAll('.masora-primary .masora-word')].find(b=>b.textContent.includes('גדל (כי גדל)')).click()");
 await waitFor("document.querySelector('#rOut .row[data-l=\"13\"] .tc-mt-selected')",'גדל trotz Maqqef im Lesetext markiert');
 assert.deepEqual(await js("[...document.querySelectorAll('#rOut .tc-mt-selected')].map(w=>window.MasoraData.wordTokens(w.textContent).join(' '))"),['גדל']);
 fs.writeFileSync('/tmp/safran-masora-job-context.png',(await win.webContents.capturePage()).toPNG());
 // A shared label belongs in both verse views, with a direct mark action in each.
 await book('Psalms');await waitFor("document.querySelector('#rSection option[value=\"3\"]')",'Psalmen 3 und 4 verfügbar');
 for(const chapter of [3,4]){
  await js(`document.querySelector('#rSection').value='${chapter-1}';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))`);
  await waitFor("document.querySelector('#rOut .row[data-l=\"1\"]')",'Psalmüberschrift');
  await js("document.querySelector('#rOut .row[data-l=\"1\"] .verse-tool').click();document.querySelector('#masoraMs').value=window.MASORA_INDEX.manuscripts.find(m=>m.label==='B32inf.').id;document.querySelector('#masoraQuery').value='מזמור לדוד';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}))");
  await waitFor(`document.querySelector('#masoraPlace').textContent.endsWith('${chapter}:1') && [...document.querySelectorAll('.masora-primary .masora-word')].some(b=>b.textContent.includes('מזמור לדוד')) && !document.querySelector('.masora-primary .masora-choices')`,'Gemeinsame Notiz im jeweiligen Vers');
  await js("[...document.querySelectorAll('.masora-primary .masora-word')].find(b=>b.textContent.includes('מזמור לדוד')).click()");
  await waitFor("document.querySelectorAll('#rOut .row[data-l=\"1\"] .tc-mt-selected').length===2",'Beide Wörter im ausgewählten Psalm markiert');
 }
 await book('Job');await waitFor("document.querySelector('#rSection option[value=\"3\"]')",'Zurück zu Hiob');
 await js("document.querySelector('#masoraMs').value=window.MASORA_INDEX.manuscripts.find(m=>m.label==='Vat.Urb.ebr.1').id");
 // The long Ginsburg/Okhla label is an exact word reference too.
 await js("document.querySelector('#rSection').value='3';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"5\"]')",'Hiob 4,5');
 await js("document.querySelector('#rOut .row[data-l=\"5\"] .verse-tool').click();document.querySelector('#masoraQuery').value='עדיך';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-primary [data-masora-context=\"320be318-cab1-40c6-bff2-a82fbc2cffea\"]')",'Ginsburg/Okhla-Notiz zu עדיך');
 await js("[...document.querySelectorAll('.masora-primary .masora-word')].find(b=>b.textContent.includes('עדיך')).click()");
 await waitFor("document.querySelector('#rOut .row[data-l=\"5\"] .tc-mt-selected')",'עדיך im Lesetext markiert');
 assert.deepEqual(await js("[...document.querySelectorAll('#rOut .tc-mt-selected')].flatMap(w=>window.MasoraData.wordTokens(w.textContent))"),['עדיך']);
 fs.writeFileSync('/tmp/safran-masora-job4-word.png',(await win.webContents.capturePage()).toPNG());
 // MT fallback also navigates and marks the manuscript's abbreviated divine name.
 await book('Psalms');await waitFor("document.querySelector('#rSection option[value=\"1\"]')",'Psalm 2 verfügbar');
 await js("document.querySelector('#rSection').value='1';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"2\"]')",'Psalm 2,2');
 await js("document.querySelector('#rOut .row[data-l=\"2\"] .verse-tool').click();document.querySelector('#masoraMs').value=window.MASORA_INDEX.manuscripts.find(m=>m.label==='B32inf.').id;document.querySelector('#masoraQuery').value='על ייי';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-primary [data-masora-context=\"81bf9869-2fa5-4f56-9143-b12e5ccd0ff9\"]')",'MT-Wortbezug im Masora-Panel');
 await js("document.querySelector('.masora-primary .masora-word').click()");
 await waitFor("document.querySelectorAll('#rOut .row[data-l=\"2\"] .tc-mt-selected').length===2",'MT-Rückfall markiert die ausgeschriebene Gottesbezeichnung');
 // Explicit label references restrict the note to its stated verse.
 await js("document.querySelector('#rSection').value='7';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"10\"]')",'Psalm 8,10');
 await js("document.querySelector('#rOut .row[data-l=\"10\"] .verse-tool').click();document.querySelector('#masoraQuery').value='ייי אדנינו (8:10)';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-primary [data-masora-context=\"67ff9320-95aa-4981-b6b3-472f15f96b86\"]')",'Stellenangabe im Label ausgewertet');
 await js("document.querySelector('.masora-primary .masora-word').click()");
 await waitFor("document.querySelectorAll('#rOut .row[data-l=\"10\"] .tc-mt-selected').length===2 && !document.querySelector('#rOut .row[data-l=\"2\"] .tc-mt-selected')",'Psalm 8,10 statt des gleichen Ausdrucks in Vers 2 markiert');
 await js("document.querySelector('#rSection').value='36';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"26\"]')",'Psalm 37,26');
 await js("document.querySelector('#rOut .row[data-l=\"26\"] .verse-tool').click();document.querySelector('#masoraQuery').value='וזרעו';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-primary [data-masora-context=\"25aeb2a9-2f5c-495c-8103-54d163d2a95f\"]') && !document.querySelector('.masora-primary [data-masora-context=\"4532ea53-46c9-492a-acd6-c8da6ced85ad\"]')",'Label mit 37,26 erscheint nicht beim falschen Vers');
 await js("document.querySelector('.masora-primary [data-masora-context=\"25aeb2a9-2f5c-495c-8103-54d163d2a95f\"]').closest('.masora-word-group').querySelector('.masora-word').click()");
 await waitFor("document.querySelector('#rOut .row[data-l=\"26\"] .tc-mt-selected')",'וזרעו markiert');
 await js("document.querySelector('#rSection').value='11';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"7\"]')",'Psalm 12,7');
 await js("document.querySelector('#rOut .row[data-l=\"7\"] .verse-tool').click();document.querySelector('#masoraQuery').value='אמרות (2)';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}))");
 await waitFor("[...document.querySelectorAll('.masora-primary .masora-word')].some(b=>b.textContent.includes('(2)'))",'Nummeriertes Label bleibt sichtbar');
 await js("document.querySelector('.masora-primary .masora-word').click()");
 await waitFor("document.querySelectorAll('#rOut .row[data-l=\"7\"] .tc-mt-selected').length===2",'Nummeriertes Label markiert passende Vorkommen ohne erfundene Ordinaldeutung');
 fs.writeFileSync('/tmp/safran-masora-numbered-label.png',(await win.webContents.capturePage()).toPNG());
 // The user's ארוץ note supplies checked cross-book citations and a source-quoted spelling variant.
 await js("document.querySelector('#rSection').value='17';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"30\"]')",'Psalm 18,30');
 await js("document.querySelector('#rOut .row[data-l=\"30\"] .lab').click();document.querySelector('#masoraQuery').value='ארוץ';document.querySelector('#masoraQuery').dispatchEvent(new Event('input',{bubbles:true}))");
 await waitFor("document.querySelector('.masora-primary [data-masora-context=\"55bb1141-2922-40c7-b2dd-6bb46028e39b\"] .masora-refs .masora-word span[aria-label]')",'Cited ארוץ spellings checked against MT');
 await js("document.querySelector('.masora-primary .masora-word').click()");
 await waitFor("document.querySelector('#rOut .row[data-l=\"30\"] .tc-mt-selected')",'Defektive Schreibung ארץ in Psalm 18,30 markiert');
 assert.deepEqual(await js("[...document.querySelectorAll('#rOut .tc-mt-selected')].flatMap(w=>window.MasoraData.wordTokens(w.textContent))"),['ארץ']);
 await js("document.querySelector('#masoraScope').value='citations';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 for(const [reference,verse]of [['18:23',23],['22:30',30],['119:32',32]]){
  await waitFor(`(()=>{const e=document.querySelector('[data-masora-context=\"55bb1141-2922-40c7-b2dd-6bb46028e39b\"]');return e&&[...e.querySelectorAll('.masora-refs .masora-word')].some(b=>b.textContent.includes('${reference}')&&b.querySelector('span[aria-label]'));})()`,'Geprüfter Vergleichsbeleg '+reference);
  await js(`[...document.querySelector('[data-masora-context=\"55bb1141-2922-40c7-b2dd-6bb46028e39b\"]').querySelectorAll('.masora-refs .masora-word')].find(b=>b.textContent.includes('${reference}')).click()`);
  await waitFor(`document.querySelector('#rOut .row[data-l=\"${verse}\"] .tc-mt-selected')`,'Zitierte Schreibung ארוץ markiert '+reference);
  assert.deepEqual(await js("[...document.querySelectorAll('#rOut .tc-mt-selected')].flatMap(w=>window.MasoraData.wordTokens(w.textContent))"),['ארוץ']);
 }
 fs.writeFileSync('/tmp/safran-masora-aruts-citations.png',(await win.webContents.capturePage()).toPNG());
 // Other source-listed forms and cf. references are checked through the same path.
 for(const [chapter,verse,query,uuid,word]of [[26,12,'רגלי לרגלי','9824b4e7-35e3-422b-81da-fe5f5c51b426','רגלי'],[61,6,'נתת ונתת','82ea22c6-c590-47cb-82e3-786da23c69ac','נתת'],[51,18,'ואתנה cf.','fc3db0c8-641f-4a62-8976-012f3eb64419','ואתנה']]){
  await js(`document.querySelector('#rSection').value='${chapter-1}';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))`);
  await waitFor(`window.MasoraData.wordTokens(document.querySelector('#rOut .row[data-l=\"${verse}\"]')?.textContent||'').includes('${word}')`,'MT-Vers für gelistete Form '+query);
  await js(`document.querySelector('#rOut .row[data-l=\"${verse}\"] .lab').click();document.querySelector('#masoraScope').value='verse';document.querySelector('#masoraQuery').value=${JSON.stringify(query)};document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))`);
  await waitFor(`document.querySelector('.masora-primary [data-masora-context=\"${uuid}\"]')`,'Weitere Notiz zugeordnet '+query);
  await js(`document.querySelector('.masora-primary [data-masora-context=\"${uuid}\"]').closest('.masora-word-group').querySelector('.masora-word').click()`);
  await waitFor(`document.querySelector('#rOut .row[data-l=\"${verse}\"] .tc-mt-selected')`,'Weitere Form markiert '+query);
  assert.deepEqual(await js("[...document.querySelectorAll('#rOut .tc-mt-selected')].flatMap(w=>window.MasoraData.wordTokens(w.textContent))"),[word]);
 }
 // A reference naming two alternative spellings exposes both checked mark actions.
 await book('Exodus');await waitFor("document.querySelector('#rSection option[value=\"2\"]')",'Exodus 3 verfügbar');
 await js("document.querySelector('#rSection').value='2';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("window.MasoraData.wordTokens(document.querySelector('#rOut .row[data-l=\"22\"]')?.textContent||'').includes('ומגרת')",'Exodus 3,22');
 await js("document.querySelector('#masoraMs').value='';document.querySelector('#masoraQuery').value='משכנתה or ומגרת';document.querySelector('#masoraScope').value='citations';document.querySelector('#masoraScope').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelectorAll('[data-masora-context=\"6c3f8c2f-3532-4d60-b363-abec5fec1a3c\"] .masora-refs .masora-word bdi').length===2",'Beide zitierten Alternativen anklickbar');
 for(const word of ['משכנתה','ומגרת']){
  await js(`[...document.querySelectorAll('[data-masora-context=\"6c3f8c2f-3532-4d60-b363-abec5fec1a3c\"] .masora-refs .masora-word')].find(b=>window.MasoraData.wordTokens(b.querySelector('bdi')?.textContent).join(' ')==='${word}').click()`);
  await waitFor(`(()=>{const s=[...document.querySelectorAll('#rOut .tc-mt-selected')].flatMap(w=>window.MasoraData.wordTokens(w.textContent));return s.length===1&&s[0]==='${word}';})()`,'Alternative im MT markiert '+word);
 }
 console.log('Electron: Masorah verse scope, unique/ambiguous word navigation, reader highlights, filters, fonts and pinning passed offline.');
};
