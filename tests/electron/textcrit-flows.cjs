'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor,book})=>{
  await js("if(!document.querySelector('#dictPanel').hidden)document.querySelector('#dictClose').click();if(!document.querySelector('#cmtPanel').hidden)document.querySelector('#cmtClose').click();if(!document.querySelector('#pane2').hidden)document.querySelector('#splitBtn').click()");
  await js("document.querySelector('#tcTov').checked=false;document.querySelector('#tcTov').dispatchEvent(new Event('change',{bubbles:true}))");
  await book('Genesis');
  await waitFor("[...document.querySelectorAll('#verList input[data-rel]')].some(n=>n.dataset.rel.includes('Westminster'))",'MT-Fassung auswählbar');
  await js("{const mt=[...document.querySelectorAll('#verList input[data-rel]')].find(n=>n.dataset.rel.includes('Westminster'));if(!mt.checked){mt.checked=true;mt.dispatchEvent(new Event('change',{bubbles:true}));}}");
  await waitFor("document.querySelector('#rOut .w[data-l=\"b/7225\"]')",'MT-Fassung geladen');
  const others=await js("[...document.querySelectorAll('#verList input[data-rel]')].filter(n=>n.checked&&!n.dataset.rel.includes('Westminster')).map(n=>n.dataset.rel)");
  for(const rel of others){
    await js(`{const c=[...document.querySelectorAll('#verList input[data-rel]')].find(n=>n.dataset.rel===${JSON.stringify(rel)});if(c.checked){c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));}}`);
    await waitFor(`![...document.querySelectorAll('#rOut .cell')].some(n=>n.dataset.rel===${JSON.stringify(rel)})`,'Andere Fassung ausgeblendet');
  }
  await waitFor("document.querySelectorAll('#rOut .row[data-l=\"1\"] .cell').length===1 && document.querySelector('#rOut .w[data-l=\"b/7225\"]')",'Nur MT im Lesetext');
  await js("document.querySelector('#rSection').value='27';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("!document.querySelector('#tcBtn').hidden && document.querySelector('#rOut .row[data-l=\"10\"]')",'Textkritik für Genesis 28');
  await js("document.querySelector('#tcBtn').click();document.querySelector('#rOut .row[data-l=\"10\"] .txt').click()");
  await waitFor("document.querySelector('#tcPlace').textContent.includes('Genesis 28:10') && document.querySelector('#tcBody .tc-entry')",'Apparat ohne ausgewählte Samaritanus-Lesespalte');
  assert(await js("document.querySelector('#textcritPanel').classList.contains('docked') && document.querySelector('#cmtPanel').hidden"),'Verse selection keeps the apparatus docked');
  assert(await js("!document.querySelector('#tcBody .tc-base, #tcBody details, #tcBody summary, #tcContext, #tcBody .tc-context') && document.querySelector('#tcBody').textContent.includes('ללכת')"),'Flat apparatus without repeated MT or inline context');
  await waitFor("[...document.querySelectorAll('#tcBody .tal-cite')].some(n=>n.textContent.includes('Genesis 28:10 (S. 184)'))",'Originalanmerkung direkt sichtbar');
  assert(await js("[...document.querySelectorAll('#tcBody .ab')].some(n=>n.textContent==='INF'&&n.title==='Infinitiv')"));
  const target="[...document.querySelectorAll('#tcBody .tc-context-word.w')].find(n=>n.textContent==='ללכת')";
  await js(`{const n=${target};n.scrollIntoView({block:'center'});}`);
  await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
  const point=await js(`{const r=${target}.getBoundingClientRect();({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}`);
  win.webContents.sendInputEvent({type:'mouseMove',...point});
  await waitFor("document.querySelector('#tcHover[role=tooltip]')?.textContent.includes('to go')",'Zweisprachiger Kontext beim tatsächlichen Überfahren des Lemmas');
  assert(await js("document.querySelector('#tcHover .tc-he').textContent.includes('ויצא') && document.querySelector('#tcHover p .mt-diff')?.textContent==='to go' && document.querySelector('#tcHover .tc-he .mt-diff')?.textContent==='ללכת'"),'Hover preserves Hebrew and English red differences');
  if(process.env.SAFRAN_CRIT_CAPTURE){
    await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    await new Promise(r=>setTimeout(r,150));fs.writeFileSync(process.env.SAFRAN_CRIT_CAPTURE,(await win.webContents.capturePage()).toPNG());
  }
  await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await waitFor("!document.querySelector('#tcHover') && !document.querySelector('#textcritPanel').hidden",'Escape schließt zuerst nur die Kontextvorschau');
  await js(`${target}.click()`);
  await waitFor("document.querySelector('#wpop')?.textContent.includes('Infinitiv')",'Morphologie vom Lemma der Anmerkung aus');
  await js("document.querySelector('#wpop .wx').click()");
  // The hidden test window has no OS focus, so focus() sets activeElement
  // without dispatching focusin. Supply that browser event explicitly.
  await js(`{const n=${target};n.focus({preventScroll:true});n.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));}`);
  await waitFor("document.querySelector('#tcHover')",'Kontext auch per Tastaturfokus');
  await js("document.querySelector('#tcPrev').click()");
  await waitFor("document.querySelector('#tcPlace').textContent.includes('Genesis 28:9') && !document.querySelector('#tcHover')",'Verswechsel entfernt die alte Kontextvorschau');
  await js("document.querySelector('#rOut .row[data-l=\"4\"] .txt').click()");
  await waitFor("document.querySelector('#tcPlace').textContent.includes('Genesis 28:4') && document.querySelectorAll('#tcBody .tc-entry').length===3",'Drei flache Anmerkungen zum Beispielvers');
  assert(await js("document.querySelectorAll('#tcBody .tc-entry h4, #tcBody .tc-entry .tc-he, #tcBody details').length===0 && document.querySelectorAll('#tcBody .tc-entry .tal-cite').length===3"),'No repeated lemma headings or word blocks');
  if(process.env.SAFRAN_CRIT_FLAT_CAPTURE){
    await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    await new Promise(r=>setTimeout(r,150));fs.writeFileSync(process.env.SAFRAN_CRIT_FLAT_CAPTURE,(await win.webContents.capturePage()).toPNG());
  }
  await js("document.querySelector('#rOut .row[data-l=\"2\"] .txt').click()");
  await waitFor("document.querySelector('#tcPlace').textContent.includes('Genesis 28:2') && !document.querySelector('#tcBody .tc-entry')",'Schreibungsfilter');
  await js("document.querySelector('#tcSpelling').checked=true;document.querySelector('#tcSpelling').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("document.querySelector('#tcBody .tc-entry')?.textContent.includes('בית')",'Schreibunterschiede einblenden');
  await js("document.querySelector('#tcSmr').checked=false;document.querySelector('#tcSmr').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("document.querySelector('#tcBody').textContent.includes('SMR ist ausgeblendet')",'Zeugenfilter');
  await js("document.querySelector('#tcSmr').checked=true;document.querySelector('#tcSmr').dispatchEvent(new Event('change',{bubbles:true}))");
  await book('Exodus');
  await waitFor("document.querySelector('#rSection option[value=\"19\"]')",'Exodus-Kapitelauswahl');
  await js("document.querySelector('#rSection').value='19';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("document.querySelector('#rOut .row[data-l=\"12\"]')",'Exodus 20');
  await js("document.querySelector('#tcNumbering').value='mt';document.querySelector('#tcNumbering').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#rOut .row[data-l=\"12\"] .txt').click()");
  await waitFor("[...document.querySelectorAll('#tcBody .tc-status')].some(n=>n.textContent.includes('Exodus 20:11')&&n.textContent.includes('Exodus 20:12'))",'Abweichende Samaritanus-Zählung der Gebote');
  assert(await js("document.querySelector('#tcBody .tc-status')?.textContent.includes('Abweichende Versgrenzen')"));
  await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await waitFor("document.querySelector('#textcritPanel').hidden",'Escape schließt Textkritik');
  await js("document.querySelector('#splitBtn').click()");
  await waitFor("document.querySelector('#pane2').contentDocument?.querySelector('#tcBtn')",'Textkritik im zweiten Fenster verfügbar');
  await book('Genesis',"document.querySelector('#pane2').contentDocument");
  await waitFor("!document.querySelector('#pane2').contentDocument.querySelector('#tcBtn').hidden",'Genesis im zweiten Fenster');
  await js("{const d=document.querySelector('#pane2').contentDocument;d.querySelector('#rSection').value='27';d.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}));}");
  await waitFor("document.querySelector('#pane2').contentDocument.querySelector('#rOut .row[data-l=\"10\"]')",'Genesis 28 im zweiten Fenster');
  await js("{const d=document.querySelector('#pane2').contentDocument;d.querySelector('#tcBtn').click();d.querySelector('#rOut .row[data-l=\"10\"] .txt').click();}");
  await waitFor("document.querySelector('#pane2').contentDocument.querySelector('#tcBody .tc-witness')",'Unabhängiger Apparat im zweiten Fenster');
  assert(await js("document.querySelector('#textcritPanel').hidden"),'Opening second apparatus leaves first pane closed');
  await js("document.querySelector('#pane2').contentDocument.querySelector('#tcClose').click();document.querySelector('#splitBtn').click()");
  await book('Berakhot');await waitFor("document.querySelector('#tcBtn').hidden",'Kein Samaritanus-Apparat im Bavli');
  console.log('Electron: Textkritik ohne Zeugen-Lesespalte, Verswechsel, Quellen/Hover, Morphologie, Filter, Kontext und abweichende Verszählung bestanden.');
};
