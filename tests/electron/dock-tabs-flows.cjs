'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor,book})=>{
 await book('Genesis');await waitFor("document.querySelector('#rTitle').textContent.includes('Genesis')",'Genesis für Panel-Tabs');
 await js("document.querySelector('#rSection').value='0';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"1\"] .w')",'Lesetext für Panels');
 const ensure=async(panel,button)=>{await js(`if(document.querySelector(${JSON.stringify(panel)}).hidden)document.querySelector(${JSON.stringify(button)}).click()`);await waitFor(`!document.querySelector(${JSON.stringify(panel)}).hidden`,'Panel geöffnet');await js(`{const p=document.querySelector(${JSON.stringify(panel)});if(!p.querySelector('.pinB').classList.contains('on'))p.querySelector('.pinB').click();}`);await waitFor(`document.querySelector(${JSON.stringify(panel)}).classList.contains('docked')`,'Panel angepinnt');};
 await ensure('#cmtPanel','#cmtBtn');await ensure('#textcritPanel','#tcBtn');
 await js("document.querySelector('#rOut .row[data-l=\"1\"] .w').click()");
 await waitFor("document.querySelector('#wpop')",'Wort-Popup über angepinnter Werkzeug-Pane');
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))");
 await waitFor("!document.querySelector('#wpop')&&!document.querySelector('#textcritPanel').hidden",'Esc schließt nur das Wort-Popup');
 assert(await js("document.querySelector('#textcritPanel').classList.contains('docked')&&!document.querySelector('#dockTabs').hidden"),'Angepinnte Pane bleibt nach Popup-Esc sichtbar');

 await waitFor("document.querySelector('#dockTabs [data-panel=cmt]')&&document.querySelector('#dockTabs [data-panel=textcrit]')",'Gemeinsame Kommentar-/Textkritik-Tabs');
 await js("document.querySelector('#dockTabs [data-panel=cmt]').click()");
 await waitFor("!document.querySelector('#cmtPanel').hidden&&document.querySelector('#textcritPanel').hidden",'Kommentar über Tab aktiv');
 await ensure('#allPanel','#apBtn');await ensure('#outlinePanel','#olBtn');await ensure('#linkPanel','#lkBtn');await ensure('#topicPanel','#tpBtn');await ensure('#mapPanel','#mapBtn');
 for(const k of ['cmt','textcrit','all','outline','link','topic','map'])assert(await js(`!!document.querySelector('#dockTabs [data-panel=${k}]')`),'Tab für '+k);
 for(const k of ['cmt','dict','all','outline','link','topic','textcrit','map']){
  if(await js(`document.querySelector('#dockTabs [data-panel=${k}]').disabled`))continue;
  await js(`document.querySelector('#dockTabs [data-panel=${k}]').click()`);
  await waitFor(`!document.getElementById(document.querySelector('#dockTabs [data-panel=${k}]').getAttribute('aria-controls')).hidden`,'Angepinntes Werkzeug '+k);
  await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))");
  assert(await js(`!document.getElementById(document.querySelector('#dockTabs [data-panel=${k}]').getAttribute('aria-controls')).hidden`),'Esc lässt angepinntes Werkzeug geöffnet: '+k);
 }

 await js("document.querySelector('#dockTabs [data-panel=outline]').click()");
 await waitFor("!document.querySelector('#outlinePanel').hidden&&document.querySelector('#mapPanel').hidden",'Gliederung per Tab');
 const outline=await js("document.querySelector('#olBody').textContent");
 await js("document.querySelector('#dockTabs [data-panel=all]').click();document.querySelector('#dockTabs [data-panel=outline]').click()");
 await waitFor("!document.querySelector('#outlinePanel').hidden",'Gliederung wiederhergestellt');assert.equal(await js("document.querySelector('#olBody').textContent"),outline);
 await js("document.querySelector('#rOut .row[data-l=\"1\"] .w').click()");await waitFor("document.querySelector('#wpop .wcard')",'Wortkarte öffnen');await js("document.querySelector('#wpop .wcard').click()");
 await waitFor("!document.querySelector('#formsPanel').hidden&&document.querySelector('#wcBody .wcSec')",'Wortkarte bereit');
 await js("if(!document.querySelector('#formsPanel .pinB').classList.contains('on'))document.querySelector('#formsPanel .pinB').click()");
 await waitFor("document.querySelector('#dockTabs [data-panel=forms]')",'Wortkarte als Panel-Tab');
 const card=await js("document.querySelector('#fmHead').textContent");
 await js("document.querySelector('#dockTabs [data-panel=textcrit]').click();document.querySelector('#dockTabs [data-panel=forms]').click()");
 await waitFor("!document.querySelector('#formsPanel').hidden",'Wortkarte über Tab zurück');assert.equal(await js("document.querySelector('#fmHead').textContent"),card,'Wortkarteninhalt bleibt erhalten');
 await js("document.querySelector('#dockTabs [data-panel=textcrit]').focus();document.querySelector('#dockTabs [data-panel=textcrit]').dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}))");
 await waitFor("document.querySelector('#dockTabs [role=tab][aria-selected=true]')===document.querySelector('#dockTabs [data-panel]')",'Tabwechsel mit Tastatur');
 await js("document.querySelector('#dockTabs [data-panel=forms]').click()");await waitFor("!document.querySelector('#formsPanel').hidden",'Wortkarte aktiv vor Lösen');
 await js("document.querySelector('#formsPanel .pinB').click()");await waitFor("!!document.querySelector('#dockTabs [data-panel=forms]')&&!document.querySelector('#formsPanel').classList.contains('docked')",'Gelöstes Panel behält seinen Werkzeug-Tab');
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))");
 await waitFor("document.querySelector('#formsPanel').hidden&&document.querySelector('#dockTabs').hidden",'Esc schließt die gelöste Seitenleiste');
 await js("document.querySelector('#dockTabs [data-panel=textcrit]').click()");await waitFor("!document.querySelector('#textcritPanel').hidden",'Textkritik für Sichtprüfung');
 await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
 await waitFor("document.querySelector('#dockTabs').getBoundingClientRect().bottom<=document.querySelector('#textcritPanel').getBoundingClientRect().top+2",'Tab-Leiste überdeckt keinen Panel-Kopf');
 if(process.env.SAFRAN_DOCK_TABS_CAPTURE){await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");fs.writeFileSync(process.env.SAFRAN_DOCK_TABS_CAPTURE,(await win.webContents.capturePage()).toPNG());}
 console.log('Electron: Gemeinsame Panel-Tabs für Kommentare, Textkritik, Überblick, Gliederung, Verknüpfungen, Themen, Karte und Wortkarte; Zustand, Tastatur und Lösen bestanden.');
};
