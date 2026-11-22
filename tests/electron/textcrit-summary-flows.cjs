'use strict';
// Lesartenzeile: Zeugen derselben MT-Stelle nach Lesart gruppiert (textcrit-summary.js).
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor,book})=>{
  const set=(id,on)=>js(`{const c=document.querySelector('#${id}');if(c.checked!==${on}){c.checked=${on};c.dispatchEvent(new Event('change',{bubbles:true}));}}`);
  await js("for(const id of ['#dictPanel','#cmtPanel'])if(!document.querySelector(id).hidden)document.querySelector(id.replace('Panel','Close')).click()");
  await book('Genesis');
  await waitFor("[...document.querySelectorAll('#verList input[data-rel]')].some(n=>n.dataset.rel.includes('Westminster'))",'MT-Fassung auswählbar');
  await js("{const mt=[...document.querySelectorAll('#verList input[data-rel]')].find(n=>n.dataset.rel.includes('Westminster'));if(!mt.checked){mt.checked=true;mt.dispatchEvent(new Event('change',{bubbles:true}));}}");
  await waitFor("document.querySelector('#rOut .w[data-l=\"b/7225\"]')",'MT geladen');
  await js("document.querySelector('#rSection').value='1';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("document.querySelector('#rOut .row[data-l=\"2\"]')",'Genesis 2');
  if(await js("document.querySelector('#textcritPanel').hidden"))await js("document.querySelector('#tcBtn').click()");
  const ids=['tcSmr','tcTov','tcDss','tcKen','tcPs','tcHex','tcCompact'],before=await js(`${JSON.stringify(ids)}.map(id=>document.querySelector('#'+id).checked)`);
  for(const id of ids.slice(0,6))await set(id,true);
  await set('tcCompact',false);
  await js("document.querySelector('#rOut .row[data-l=\"2\"] .txt').click()");
  await waitFor("document.querySelector('#tcPlace').textContent.includes('Genesis 2:2') && document.querySelector('#tcBody .tc-lz')",'Lesartenzeile Gen 2:2');
  const line=await js("[...document.querySelectorAll('#tcBody .tc-lz-var')].map(n=>n.textContent.replace(/\\s+/g,' ').trim())");
  // Die bewertete LXX-Lesart (Zahl, Vorlage הששי) ersetzt den rohen CATSS-Hinweis und gruppiert mit SMR und Syr
  assert(line.some(t=>/^הששי SMR LXX Syr$/.test(t)),'הששי SMR LXX Syr in einer Gruppe: '+JSON.stringify(line));
  assert(await js("!![...document.querySelectorAll('#tcBody .tc-lxx-reading')].find(e=>e.dataset.lxxType==='zahl'&&e.textContent.includes('ἕκτῃ'))"),'Bewertete LXX-Lesart als eigener Eintrag');
  assert(await js("![...document.querySelectorAll('#tcBody .tc-lz-line')].some(l=>/הששי/.test(l.textContent)&&l.querySelector('.tc-lz-note'))"),'Kein doppeltes ≠ LXX aus CATSS');
  assert(await js("!!document.querySelector('#tcBody .tc-lz-var .tc-lz-ret')"),'Erschlossene Vorlagen kursiv');
  await set('tcCompact',true);
  await waitFor("document.querySelector('#tcBody details.tc-locus-detail:not([open])')",'Kompaktansicht klappt Einzelbelege ein');
  assert(await js("document.querySelector('#tcBody .tc-lz') && [...document.querySelectorAll('#tcBody .tc-entry')].every(e=>e.closest('details.tc-locus-detail'))"));
  if(process.env.SAFRAN_LZ_CAPTURE){
    await waitFor("document.querySelector('#tcBody .tc-lz')",'Lesartenzeile sichtbar');win.showInactive();win.webContents.invalidate();await new Promise(r=>setTimeout(r,800));console.log(await js("document.querySelector('#tcBody').innerText.slice(0,1500)"));fs.writeFileSync(process.env.SAFRAN_LZ_CAPTURE,(await win.webContents.capturePage()).toPNG());
  }
  // Hexapla: Siglen erklärt, Morphologie erst beim Klick, Fußnoten aufklappbar (englisch, Latein eingeklappt)
  await set('tcCompact',false);
  await js("document.querySelector('#rOut .row[data-l=\"2\"] .txt').click()");
  await waitFor("document.querySelector('#tcBody .tc-hx-entry .tc-hx-w')",'Hexapla Gen 2:2');
  assert(await js("[...document.querySelectorAll('#tcBody .tc-hx-sig')].some(b=>b.title.startsWith('Ο΄ = die Septuaginta'))"),'Sigle erklärt');
  assert(await js("[...document.querySelectorAll('#tcBody .tc-hx-w')].every(w=>!w.title)"),'keine Morphologie beim Überfahren');
  await js("document.querySelector('#tcBody .tc-hx-w').click()");
  await waitFor("document.querySelector('#tcHover')?.textContent.includes('–')",'Morphologie beim Klick');
  await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  const fn=await js("{const e=[...document.querySelectorAll('#tcBody .tc-hx-entry')].find(e=>e.querySelector('.tc-hx-note p[lang=en]'));e?e.querySelector('.tc-hx-fn').dataset.hxFn:null}");
  if(fn){
    await js(`[...document.querySelectorAll('#tcBody .tc-hx-entry')].find(e=>e.querySelector('.tc-hx-note p[lang=en]')).querySelector('.tc-hx-fn[data-hx-fn="${fn}"]').click()`);
    assert(await js(`{const d=[...document.querySelectorAll('#tcBody .tc-hx-note[open]')][0];d&&d.querySelector(':scope>p').lang==='en'&&!d.querySelector('.tc-hx-la').open}`),'Fußnote offen, Englisch oben, Latein eingeklappt');
  }
  if(process.env.SAFRAN_HX_CAPTURE){console.log('Fußnote mit Englisch:',fn);await js("document.querySelector('#tcBody .tc-hx-note[open]')?.closest('.tc-hx-entry').scrollIntoView({block:'start'})");win.showInactive();win.webContents.invalidate();await new Promise(r=>setTimeout(r,800));fs.writeFileSync(process.env.SAFRAN_HX_CAPTURE,(await win.webContents.capturePage()).toPNG());}
  // LXX: das griechische Wort zeigt beim Überfahren nichts, das LXX-Etikett den CATSS-Verskontext
  assert(await js("[...document.querySelectorAll('#tcBody .tc-tov-lemma')].every(n=>!n.hasAttribute('data-tc-tov'))"),'kein Hover am griechischen Wort');
  assert(await js("[...document.querySelectorAll('#tcBody .tc-tov-entry .tc-witness-label')].every(n=>n.hasAttribute('data-tc-tov'))"),'Hover am LXX-Etikett');
  // Zeugenauswahl der folgenden Abläufe wiederherstellen
  for(const [i,id] of ids.entries())await set(id,before[i]);
  console.log('Electron: Lesartenzeile gruppiert SMR, LXX (bewertet) und Syr; Kompaktansicht.');
};
