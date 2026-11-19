'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({docs,win,js,waitFor,book})=>{
 const root=path.resolve(__dirname,'../..'),items=require(path.join(root,'bundled/manifest.json')).items;
 const patterns=[/^Aleppo-Kodex/,/^Qumran-Rollen/,/^Samaritanischer Pentateuch/,/^The Samaritan Pentateuch/,/^ETCBC Peshitta/,/^Septuaginta/];
 for(const pattern of patterns){const e=items.find(x=>x.title==='Genesis'&&pattern.test(x.versionTitle));assert(e);const d=JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel)));docs.set(e.rel,{...d,entry:{...e,own:true,source:'/fixture/source.json'}});}
 for(const kind of ['he','de','en']){const d=[...docs.values()].find(d=>d.entry.title==='Genesis'&&d.entry.kind===kind);const rel='fixture/Genesis/'+kind+'/merged.json';docs.set(rel,{...d,versionTitle:'merged',entry:{...d.entry,rel,own:false,versionTitle:'merged'}});}
 await js("localStorage.setItem('prefVer',JSON.stringify({he:['merged'],de:['merged']}))");await win.reload();await waitFor("document.querySelector('#tree .lib-item')",'Bibliothek mit Ausgaben');await book('Genesis');
 await js("document.querySelector('#verBox').open=true");await waitFor("document.querySelector('#verList .voption')&&document.querySelector('#verList').getBoundingClientRect().width>800",'Breite Versionsauswahl');
 assert(await js("!document.querySelector('#verList [data-csv],#verList [data-rl]')"),'Keine Dateiverwaltung im Versionsmenü');
 assert(await js("document.querySelector('#verSummary').textContent.trim().endsWith('/'+document.querySelectorAll('#verList input[data-rel]').length)"),'Versionszähler zählt die sichtbaren Ausgaben');
 assert(await js("![...document.querySelectorAll('#verList input')].some(b=>b.dataset.rel.endsWith('/merged.json'))"),'Zusammengeführte Fassungen durch Ausgaben ersetzt');
 assert(await js("document.querySelector('#verList .voption .vname').textContent.startsWith('Westminster')"),'Westminster zuerst');
 assert(await js("document.querySelector('#verList .voption .vmorph')"),'Westminster mit Morphologie');
 assert(await js("[...document.querySelectorAll('#verList .voption')].filter(l=>/Aleppo|Qumran|Samaritanischer Pentateuch|Peshitta|Septuaginta/.test(l.querySelector('.vname').textContent)&&!l.textContent.includes('englische Übersetzung')).every(l=>l.querySelector('.vmorph'))"),'Morphologie in unterstützten Textzeugen gekennzeichnet');
 assert(await js("(()=>{const l=[...document.querySelectorAll('#verList .voption')].find(l=>l.textContent.includes('englische Übersetzung'));return l&&!l.querySelector('.vmorph')})()"),'Englische Samaritanus-Übersetzung klar beschriftet und ohne falsches Morphologie-Badge');
 const zunz=items.find(e=>e.title==='Genesis'&&e.kind==='de'&&/Zunz/.test(e.versionTitle));
 assert(await js("[...document.querySelectorAll('#verList .vname')].some(n=>n.textContent==="+JSON.stringify(zunz.versionTitle)+")"),'Lange Versionsnamen vollständig');
 assert(await js("(()=>{const r=document.querySelector('#verList').getBoundingClientRect();return r.left>=8&&r.right<=innerWidth-8&&document.querySelector('#verList').scrollWidth<=r.width+1})()"),'Menü bleibt vollständig im Fenster');
 assert(await js("[...document.querySelectorAll('#verList .vgrp')].every(h=>parseFloat(getComputedStyle(h).fontSize)>=13)"),'Deutliche Sprachgruppen');
 fs.writeFileSync('/tmp/safran-version-menu.png',(await win.webContents.capturePage()).toPNG());
 await js("document.querySelector('#verBox').open=false;document.querySelector('#dispBtn').click()");
 assert.deepEqual(await js("[...document.querySelectorAll('#dispPanel .dbodyp > section > h4')].map(h=>h.textContent)"),['Schriftgröße','Vorschau beim Überfahren','Lesetext','Hebräischer Text']);
 await js("document.querySelector('#dispClose').click();document.querySelector('#verBox').open=true;const label=[...document.querySelectorAll('#verList .voption')].find(l=>l.textContent.includes('Aleppo-Kodex'));const c=label.querySelector('input');if(!c.checked){c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}");
 await waitFor("document.querySelector('#rOut .row[data-l=\"1\"]').querySelectorAll('.cell').length===3",'Zwei hebräische Ausgaben und eine deutsche Übersetzung');
 const menu=async(pattern)=>{await js("document.querySelector('#verBox').open=false;[...document.querySelectorAll('#rOut .row.head > div[data-hv]')].find(h=>h.textContent.includes("+JSON.stringify(pattern)+")).click()");await waitFor("!document.querySelector('#ctxMenu').hidden",'Spaltenmenü');};
 const action=async label=>{await js("[...document.querySelectorAll('#ctxMenu [data-n]')].find(b=>b.textContent.includes("+JSON.stringify(label)+")).click()");};
 const columns=n=>waitFor("document.querySelector('#rOut .row[data-l=\"1\"]').querySelectorAll('.cell').length==="+n,'Spaltenanzahl '+n);
 const addAleppo=async()=>{await js("{document.querySelector('#verBox').open=true;const l=[...document.querySelectorAll('#verList .voption')].find(l=>l.textContent.includes('Aleppo-Kodex')),c=l.querySelector('input');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}");await columns(3);};
 await menu('Westminster');
 assert(await js("[...document.querySelectorAll('#ctxMenu [data-n]')].filter(b=>/Diese Version aus|Nur diese hebräische|Alle anderen Versionen/.test(b.textContent)).every(b=>b.querySelector('.cm-mark[aria-hidden=true]')?.textContent)"),'Dezente Symbole an allen drei Aktionen');
 await action('Nur diese hebräische Version anzeigen');await columns(2);
 assert(await js("document.querySelector('#rOut .cell[data-k=de]')&&document.querySelector('#rOut .row.head').textContent.includes('Westminster')&&!document.querySelector('#rOut .row.head').textContent.includes('Aleppo')"),'Sprachfilter behält die deutsche Übersetzung');
 await addAleppo();await menu('Aleppo');await action('Diese Version aus der Anzeige entfernen');await columns(2);
 assert(await js("document.querySelector('#rOut .cell[data-k=de]')&&document.querySelector('#rOut .row.head').textContent.includes('Westminster')"),'Entfernen betrifft nur die gewählte Ausgabe');
 await addAleppo();await menu('Westminster');await action('Alle anderen Versionen schließen');await columns(1);
 assert(await js("document.querySelector('#rOut .row.head').textContent.includes('Westminster')&&!document.querySelector('#rOut .cell[data-k=de]')"),'Alle anderen Versionen schließen lässt genau die gewählte Ausgabe stehen');
 console.log('Electron: Breite Versionsauswahl, volle Namen, Westminster-Vorrang, Morphologie, Samaritanus-Übersetzung und Reihenfolge der Anzeigeoptionen bestanden.');
};
