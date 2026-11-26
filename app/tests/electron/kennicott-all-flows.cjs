'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({docs,win,js,waitFor,book})=>{
 const root=path.resolve(__dirname,'../..'),manifest=require(path.join(root,'bundled/manifest.json'));
 for(const [title,prefix]of [['Exodus','exod-app-'],['I Samuel','1sam-app-'],['Psalms','ps-app-']]){
  await book(title);await waitFor(`document.querySelector('#rTitle').textContent.includes(${JSON.stringify(title)})`,'Buch für Kennicott geladen');
  await js("document.querySelector('#rSection').value='0';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
  const entry=manifest.items.find(e=>e.title===title&&e.versionTitle.startsWith('Westminster')),doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel)));
  const want=[...doc.text[0][0].matchAll(/<span class="w"[^>]*>(.*?)<\/span>/g)].map(m=>m[1].replace(/[^א-ת]/g,'')).join('');
  await waitFor(`(()=>{const r=document.querySelector('#rOut .row[data-l="1"] .cell[data-k=he]');return r&&[...r.querySelectorAll('.w')].map(w=>w.textContent.replace(/[^א-ת]/g,'')).join('')===${JSON.stringify(want)}})()`,'Richtiges MT-Kapitel');
  await js("for(const id of ['tcSmr','tcTov','tcDss']){const c=document.getElementById(id);c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#tcKen').checked=true;document.querySelector('#tcKen').dispatchEvent(new Event('change',{bubbles:true}));if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click();document.querySelector('#rOut .row[data-l=\"1\"] .txt').click()");
  await waitFor(`document.querySelector('#tcBody .tc-ken-entry')?.dataset.kenId.startsWith(${JSON.stringify(prefix)})`,'Kennicott-Apparat '+title);
  assert(await js(`[...document.querySelectorAll('#tcBody .tc-ken-entry .tal-cite')].every(n=>n.textContent.includes(${JSON.stringify(title+' ')}))`),'Belege gehören zum aktuellen Buch');
  await js("document.querySelector('#tcBody .tc-ken-entry .tc-source').click()");
  await waitFor(`document.querySelector('#tcHover')?.textContent.includes(${JSON.stringify(title+' 1:1')})`,'Quelle und Editionskontext '+title);
  assert(await js("!!document.querySelector('#tcHover .tc-he')"));
  await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  assert(await js("(()=>{const b=document.querySelector('#tcBody .tc-ken-entry .tc-source'),w=document.querySelector('#tcBody .tc-ken-entry .tc-ken-reading bdi[lang=he]');return !w||getComputedStyle(b).color!==getComputedStyle(w).color})()"),'Sigle und Lesart unterscheidbar');
 }
 // Source-only entries remain accessible in a chapter without inventing MT 25:19.
 {const item=manifest.items.find(e=>e.title==='Numbers'&&e.versionTitle.startsWith('Westminster'));const raw=fs.readFileSync(path.join(root,'bundled',item.rel)),doc=JSON.parse(raw);docs.set(item.rel,{...doc,entry:{...item,own:false,bytes:raw.length}});}
 {const loaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.reload();await loaded;}
 // The library appears before the previous reading session finishes loading.
 await waitFor("[...document.querySelectorAll('#tree .lib-item')].some(n=>n.dataset.key.endsWith('¦Numbers')) && document.querySelector('#rOut .row .cell')",'Numbers verfügbar und wiederhergestellter Lesetext geladen');
 await book('Numbers');await waitFor("document.querySelector('#rTitle').textContent.includes('Numbers')",'Numbers geladen');
 await js("document.querySelector('#rSection').value='24';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"18\"] .txt')&&document.querySelector('#rOut .row[data-l=\"1\"] .w')?.textContent.replace(/[^א-ת]/g,'')==='וישב'",'Numbers 25 bereit');
 await js("if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click();document.querySelector('#rOut .row[data-l=\"1\"] .txt').click();document.querySelector('#tcWhole').click()");
 await waitFor("document.querySelector('#tcBody [data-ken-id=\"num-app-5620\"]')",'Quellenhinweis ohne MT-Vers bleibt im Kapitel sichtbar');
 assert(await js("{const s=document.querySelector('#tcBody [data-ken-id=\"num-app-5620\"]').closest('.tc-reader-verse');s.textContent.includes('Numbers 25:19 · Kennicott · MT-Bezug offen')&&!s.querySelector('.tc-mt-jump,.tc-jump')}"),'Kein erfundener MT-Vers und kein falscher Sprung');
 await book('Genesis');await waitFor("document.querySelector('#rTitle').textContent.includes('Genesis')",'Genesis für Zeugenfarben');
 await js("document.querySelector('#rSection').value='0';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"1\"] .w')?.textContent.replace(/[^א-ת]/g,'')==='בראשית'",'Genesis 1 bereit');
 await js("for(const id of ['tcSmr','tcTov','tcDss','tcKen']){const c=document.getElementById(id);c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#rOut .row[data-l=\"1\"] .txt').click()");
 await waitFor("document.querySelector('#tcBody .tc-dss-entry .tc-source')&&document.querySelector('#tcBody .tc-ken-entry .tc-source')",'Mehrere Zeugenfarben');
 assert(await js("getComputedStyle(document.querySelector('#tcBody .tc-dss-entry .tc-source')).color!==getComputedStyle(document.querySelector('#tcBody .tc-ken-entry .tc-source')).color"),'DSS und Kennicott verschieden gefärbt');
 if(process.env.SAFRAN_KEN_ALL_CAPTURE){await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");const rect=await js("{const r=document.querySelector('#textcritPanel').getBoundingClientRect();({x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)})}");fs.writeFileSync(process.env.SAFRAN_KEN_ALL_CAPTURE,(await win.webContents.capturePage(rect)).toPNG());}
 console.log('Electron: Kennicott Exodus, Samuel und Psalmen, lazy Buchwechsel, Originalbelege, Kontext und farbige Siglen bestanden.');
};
