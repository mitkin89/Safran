'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=async({docs,win,js,waitFor,book})=>{
 const root=path.resolve(__dirname,'../..'),manifest=require(path.join(root,'bundled/manifest.json'));
 for(const title of ['Isaiah','I Samuel','Psalms','Proverbs','Hosea','Esther']){
  const e=manifest.items.find(e=>e.title===title&&e.versionTitle.startsWith('Westminster'));
  const d=JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel)));
  docs.set(e.rel,{...d,entry:{...e,own:false,bytes:fs.statSync(path.join(root,'bundled',e.rel)).size},textHash:crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex')});
 }
 {const loaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.reload();await loaded;}
 await waitFor("[...document.querySelectorAll('#tree .lib-item')].some(n=>n.dataset.key.endsWith('¦Isaiah')) && document.querySelector('#rOut .w')",'Bibliothek und wiederhergestellter Leser nach Neustart bereit');
 let currentTitle=null;
 const choose=async title=>{currentTitle=title;await book(title);await waitFor(`document.querySelector('#rTitle').textContent.includes(${JSON.stringify(title)})`,'Buch im Leser geladen');};
 const chapter=async value=>{await js(`document.querySelector('#rSection').value=${JSON.stringify(String(value))};document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))`);
  const entry=manifest.items.find(e=>e.title===currentTitle&&e.versionTitle.startsWith('Westminster')),doc=docs.get(entry.rel);
  const want=[...doc.text[value][0].matchAll(/<span class="w"[^>]*>(.*?)<\/span>/g)].map(m=>m[1].replace(/<[^>]*>/g,'')).join('').replace(/[^א-ת]/g,'');
  await waitFor(`(()=>{const c=document.querySelector('#rOut .row[data-l="1"] .cell[data-rel='+CSS.escape(${JSON.stringify(entry.rel)})+']');return c&&[...c.querySelectorAll('.w')].map(w=>w.textContent).join('').replace(/[^א-ת]/g,'')===${JSON.stringify(want)}})()`,'Gewähltes Kapitel gerendert');
 };
 const verse=async n=>{await waitFor(`document.querySelector('#rOut .row[data-l="${n}"] .txt')`,'Vers geladen');await js(`document.querySelector('#rOut .row[data-l="${n}"] .txt').click()`);};
 await choose('Isaiah');await chapter(52);await verse(11);
 await js("for(const id of ['tcSmr','tcKen']){document.getElementById(id).checked=false;document.getElementById(id).dispatchEvent(new Event('change',{bubbles:true}));}for(const id of ['tcTov','tcDss']){document.getElementById(id).checked=true;document.getElementById(id).dispatchEvent(new Event('change',{bubbles:true}));}if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click()");
 await waitFor("[...document.querySelectorAll('#tcBody .tc-dss-entry[data-scroll=\"1Qisaa\"]')].some(e=>e.textContent.includes('אור')&&e.closest('.tc-locus').dataset.kind==='gap')",'Jesaja 53:11 אור an der MT-Lücke');
 assert(await js("document.querySelector('#tcBody .tc-tov-entry')!==null"),'DSS und LXX gemeinsam im Apparat');
 await js("{const e=[...document.querySelectorAll('#tcBody .tc-dss-entry[data-scroll=\"1Qisaa\"]')].find(e=>e.textContent.includes('אור')),a=e.querySelector('.tc-dss-token');a.focus({preventScroll:true});a.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));}");
 await waitFor("document.querySelector('#tcHover')?.textContent.includes('1Qisaa')",'Handschriftenkontext Jesaja');
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
 await chapter(0);await verse(1);
 await waitFor("document.querySelector('#tcBody .tc-dss-entry[data-scroll=\"1Qisaa\"] .tc-dss-token')",'Jesaja 1:1 Nachträge');
 await js("{const a=document.querySelector('#tcBody .tc-dss-entry[data-scroll=\"1Qisaa\"] .tc-dss-token');a.focus({preventScroll:true});a.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));}");
 await waitFor("document.querySelector('#tcHover')?.textContent.includes('בי(ו)מי')",'Eingeklammertes Waw im echten Vorschau-Popup');
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
 await choose('I Samuel');await chapter(0);await verse(24);
 await waitFor("document.querySelector('#tcBody .tc-dss-entry[data-scroll=\"4Q51\"]')",'Mehrteiliger Buchtitel im DSS-Apparat');
 assert(await js("document.querySelector('#tcPlace').textContent.includes('I Samuel 1:24')"));
 await choose('Psalms');await chapter(144);await verse(13);
 await waitFor("document.querySelector('#tcBody .tc-dss-entry[data-scroll=\"11Q5\"]')",'Psalm 145 mit Rollenbefund');
 await choose('Proverbs');await chapter(0);await verse(1);
 await waitFor("document.querySelector('#tcBody .tc-tov-entry .tal-cite')?.textContent.includes('CATSS-Lesetext')",'Sprüche: explizite Lesetext-Provenienz');
 assert(await js("document.querySelector('#tcBody').textContent.includes('LXX-Zusatz')"));
 await js("{const a=document.querySelector('#tcBody [data-tc-tov]');a.focus({preventScroll:true});a.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));}");
 await waitFor("document.querySelector('#tcHover')?.textContent.includes('CATSS-Lesetext interlinear')",'Erhaltene CATSS-Gruppen als Vorschau');
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
 await choose('Hosea');await chapter(0);await verse(2);
 await waitFor("document.querySelector('#tcBody .tc-tov-entry .tal-cite')?.textContent.includes('Tov/Kraft')",'Hosea aus Originaldatei ohne falsche Lesefassung');
 await choose('Esther');await chapter(0);await verse(1);
 await waitFor("document.querySelector('#tcPlace').textContent.includes('Esther 1:1')&&!document.querySelector('#tcBody').textContent.includes('Apparat wird geladen')",'Nicht überlieferte Abdeckung bleibt leer');
 assert(await js("!document.querySelector('#tcBody .tc-dss-entry,#tcBody .tc-tov-entry')"),'Keine falsch etikettierten Esther-Daten');
 console.log('Electron: DSS im Tanach (Jesaja, Samuel, Psalmen), LXX-Erweiterung, sichere Plus-Position, Hover und Quellenunterscheidung bestanden.');
};
