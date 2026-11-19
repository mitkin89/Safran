'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor,book})=>{
 await book('Genesis');await js("document.querySelector('#rSection').value='0';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}));if(document.querySelector('#allPanel').hidden)document.querySelector('#apBtn').click();else if(!document.querySelector('#apWhole').hidden)document.querySelector('#apWhole').click()");
 await waitFor("document.querySelector('#apBody .apScope[data-scope=c] [data-seg=roots]')",'Erweiterte Kapitelstatistik');
 assert(await js("!document.querySelector('#apBody .apBox[data-b=stats]').textContent.includes('carry the theme')&&!document.querySelector('#apBody .apBox[data-b=stats]').textContent.includes('tragen das Thema')"));
 await js("document.querySelector('#apBody [data-scope=c] button[data-compare=book]').click()");
 assert(await js("document.querySelector('#apBody [data-scope=c] [data-compare=book]').getAttribute('aria-pressed')==='true'"));
 assert(await js("{const e=document.querySelector('#apBody .apBox[data-b=stats]');e.scrollWidth<=e.clientWidth+2}"),'Statistik bleibt innerhalb der Panelbreite');
 const before=await js("document.querySelector('#apBody [data-scope=c] .apPane[data-seg=lead]').textContent");
 await js("document.querySelector('#apBody [data-scope=c] button[data-compare=tanakh]').click()");
 const after=await js("document.querySelector('#apBody [data-scope=c] .apPane[data-seg=lead]').textContent");assert.notEqual(before,after,'Eigene Buch- und Tanachzahlen');
 const pane=seg=>`document.querySelector('#apBody [data-scope=c] .apPane[data-seg=${seg}]')`;
 for(const seg of ['rare','roots','verbs','phrases','evidence']){
  await js(`document.querySelector('#apBody [data-scope=c] .apSeg button[data-seg=${seg}]').click()`);
  assert(await js(`!${pane(seg)}.hidden`),seg+' sichtbar');
 }
 assert(await js(`${pane('rare')}.querySelector('.apRow')&&${pane('roots')}.querySelector('.apFamily')&&${pane('verbs')}.querySelector('.apMorphRow')&&${pane('phrases')}.querySelector('.apPhrase')&&${pane('evidence')}.querySelector('.apEvidence')`));
 assert(await js("document.querySelector('#apBody [data-scope=c] .apEvidence').textContent.includes('Kennicott')"));
 await js("document.querySelector('#apBody [data-scope=c] .apPane[data-seg=evidence] [data-stat-verse]').click()");
 await waitFor("document.querySelector('#rOut .row.flash')",'Belegvers im Lesetext markieren');
 await js("document.querySelector('#apBody [data-scope=c] .apSeg button[data-seg=roots]').click();document.querySelector('#apBody [data-scope=c] button[data-compare=book]').click()");
 assert(await js("!document.querySelector('#apBody [data-scope=c] .apPane[data-seg=roots]').hidden"),'Tab bleibt beim Vergleichswechsel offen');
 await js("document.querySelector('#apBody [data-scope=c] .apSeg button[data-seg=lead]').click();new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");fs.writeFileSync('/tmp/safran-passage-statistics.png',(await win.webContents.capturePage()).toPNG());
 await js("document.querySelector('#apBody [data-scope=c] button[data-compare=tanakh]').click()");
 await win.reload();await waitFor("document.querySelector('#rOut .w')",'Neustart');await js("if(document.querySelector('#allPanel').hidden)document.querySelector('#apBtn').click()");
 await waitFor("document.querySelector('#apBody [data-scope=c] [data-compare=tanakh][aria-pressed=true]')",'Tanachvergleich nach Neustart gespeichert');
 // Verse/chapter counts must remain separate, and both scopes support comparison.
 await js("document.querySelector('#rOut .row[data-l=\"1\"] .lab').click()");
 await waitFor("document.querySelector('#apBody .apScope[data-scope=v]')",'Versstatistik');
 assert(await js("document.querySelector('#apBody [data-scope=v] .apSum').textContent!==document.querySelector('#apBody [data-scope=c] .apSum').textContent"));
 console.log('Electron: Statistik, Buch/Tanach-Umschaltung, seltene Wörter, Wurzeln, Verbformen, Wortverbindungen, Quellenbelege, Verssprung und gespeicherter Vergleich bestanden.');
};
