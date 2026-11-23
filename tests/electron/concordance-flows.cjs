'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {ipcMain}=require('electron');
module.exports=async({win,js,waitFor})=>{
 let saved;
 ipcMain.removeHandler('file:save');ipcMain.handle('file:save',(_e,name,content)=>{saved={name,content};return {};});
 await js("document.querySelector('[data-tab=search]').click();document.querySelector('#sTextTab').click();document.querySelector('#sLang').value='auto';document.querySelector('#sq').value='Gott';document.querySelector('#sConcordance').checked=true;document.querySelector('#sConcordance').dispatchEvent(new Event('change'));document.querySelector('#sGo').click()");
 await waitFor("document.querySelector('#sOut .ccRow') && document.querySelector('#sGo').textContent==='Suchen'",'Konkordanz über mehrere Werke');
 assert.equal(await js("document.querySelector('#sAdv').hidden"),true);
 assert(await js("[...document.querySelectorAll('#sOut .ccRow mark')].every(x=>x.textContent.toLowerCase()==='gott')"),'nur ganze Wörter');
 assert(await js("document.querySelector('#sSum').textContent.includes('Genesis') && document.querySelector('#sSum').textContent.includes('Exodus')"));
 assert(await js("document.querySelector('#sInfo').textContent.includes('Vorkommen')"));
 await js("document.querySelector('#sExport').click()");
 await waitFor("document.querySelector('#sGo').textContent==='Suchen'",'CSV');
 for(let i=0;!saved&&i<20;i++)await new Promise(r=>setTimeout(r,25));
 assert(saved?.content.includes('Wortposition'));assert(saved.content.includes('"Gott"'));assert(saved.content.includes('"surface"'));
 await js("document.querySelector('#sSum .chip[data-t=Genesis]').click()");
 await waitFor("document.querySelector('#sSum .chip[data-t=\"\"]') && document.querySelector('#sGo').textContent==='Suchen'",'Werkfilter');
 assert(await js("[...document.querySelectorAll('#sOut .ccRow b')].every(x=>x.textContent==='Genesis')"));
 await js("document.querySelector('#sSum .chip[data-t=\"\"]').click()");
 await waitFor("document.querySelector('#sOut .ccRow') && document.querySelector('#sGo').textContent==='Suchen'",'Alle Werke');
 await waitFor("document.querySelector('#sSum .chip[data-t=Exodus]')",'Werkübergreifende Übersicht wiederhergestellt');
 await win.webContents.capturePage().then(i=>fs.writeFileSync('/tmp/safran-concordance.png',i.toPNG()));
 await js("document.querySelector('#sOut .ccRow').click()");
 await waitFor("document.documentElement.dataset.tab==='read' && document.querySelector('#rOut .row.hit')",'Fundstelle öffnen');
 await js("document.querySelector('[data-tab=search]').click();document.querySelector('#sConcordance').checked=false;document.querySelector('#sConcordance').dispatchEvent(new Event('change'));document.querySelector('#sRecentL a').click()");
 await waitFor("document.querySelector('#sConcordance').checked && document.querySelector('#sOut .ccRow') && document.querySelector('#sGo').textContent==='Suchen'",'Konkordanz im Suchverlauf');
 await js("document.querySelector('#sq').value='אמר';document.querySelector('#sq').dispatchEvent(new Event('input'));document.querySelector('#sConcordanceMode').value='lemma';document.querySelector('#sGo').click()");
 await waitFor("document.querySelector('#sOut .ccRow') && document.querySelector('#sGo').textContent==='Suchen'",'Hebräische Grundformen');
 assert(await js("document.querySelector('#sOut').textContent.includes('OSHB')"));
 await js("document.querySelector('#sConcordance').checked=false;document.querySelector('#sConcordance').dispatchEvent(new Event('change'));document.querySelector('[data-tab=read]').click()");
 await js("document.querySelector('#rOut .w').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))");
 await waitFor("!document.querySelector('#formsPanel').hidden && document.querySelector('#fmHead').textContent.trim().length>0",'Wortkarte');
 await waitFor("!document.querySelector('#fmConcordance').disabled",'Konkordanz-Reiter bereit');
 await js("document.querySelector('#fmConcordance').click()");
 await waitFor("document.querySelector('#fmConcordance[aria-selected=true]') && document.querySelector('#fmConcordanceBody .wcCcHit')",'Belege direkt in der Wortkarte');
 assert.equal(await js("document.documentElement.dataset.tab"),'read');
 if(process.env.SAFRAN_SMOKE_CONCORDANCE==='1'){
  assert(await js("document.querySelector('#fmConcordanceBody [data-cc-peer]')"),'Sprachübergreifende Entsprechungen in der Wortkarte');
 }
 // Measure rendered glyphs because CSS zoom leaves the computed font-size unchanged.
 const textHeight = selector => js(`{const node=document.querySelector(${JSON.stringify(selector)}),range=document.createRange();range.selectNodeContents(node);range.getClientRects()[0].height}`);
 const selectors = ['#fmConcordanceBody .ccContext mark'];
 if(process.env.SAFRAN_SMOKE_CONCORDANCE==='1')selectors.push('#fmConcordanceBody .wcCcPeer bdi');
 const beforeZoom = await Promise.all(selectors.map(textHeight));
 await js("document.querySelector('#fmBg').click()");
 const enlarged = await Promise.all(selectors.map(textHeight));
 assert(enlarged.every((height, i) => height > beforeZoom[i]),'A+ vergrößert Beleg und Entsprechung');
 await js("document.querySelector('#fmSm').click()");
 assert.deepEqual(await Promise.all(selectors.map(textHeight)),beforeZoom,'A− stellt die vorige Schriftgröße wieder her');
 if(process.env.SAFRAN_SMOKE_CONCORDANCE==='1'){
  await js("document.querySelector('#fmConcordanceBody [data-cc-mode=root]').click()");
  await waitFor("document.querySelector('[data-cc-mode=root][aria-pressed=true]') && document.querySelector('.wcCcHit')",'Wortfamilie in der Wortkarte');
 }
 await js("document.querySelector('#fmConcordanceBody [data-cc-search]').click()");
 await waitFor("document.documentElement.dataset.tab==='search' && document.querySelector('#sConcordance').checked && document.querySelector('#sOut .ccRow') && document.querySelector('#sGo').textContent==='Suchen'",'Konkordanz aus der Wortkarte');
 assert.equal(await js("document.querySelectorAll('#sCatTree input:checked').length"),0,'Wortkarte startet ohne alte Werkfilter');
 if(process.env.SAFRAN_SMOKE_CONCORDANCE==='1')assert.equal(await js("document.querySelector('#sConcordanceMode').value"),'root','Wortfamilie bleibt in der ausführlichen Suche ausgewählt');
 await js("document.querySelector('#fmClose').click();document.querySelector('#sConcordance').checked=false;document.querySelector('#sConcordance').dispatchEvent(new Event('change'));document.querySelector('[data-tab=read]').click()");
 if(process.env.SAFRAN_SMOKE_CONCORDANCE==='1'){
  await js("document.querySelector('[data-tab=search]').click();document.querySelector('#sq').value='ברא';document.querySelector('#sq').dispatchEvent(new Event('input'));document.querySelector('#sConcordance').checked=true;document.querySelector('#sConcordance').dispatchEvent(new Event('change'));document.querySelector('#sConcordanceMode').value='surface';document.querySelector('#sGo').click()");
  await waitFor("document.querySelector('#sOut .ccPeer[lang]') || (document.querySelector('#sOut .ccPeer') && document.querySelector('#sGo').textContent==='Suchen')",'Sprachübergreifende Zuordnungen');
  assert(await js("document.querySelector('#sOut .ccRow').textContent.includes('ἐποίησεν') && document.querySelector('#sOut .ccRow').textContent.includes('ܒܪܐ')"));
  await win.webContents.capturePage().then(i=>fs.writeFileSync('/tmp/safran-cross-concordance.png',i.toPNG()));
  await js("document.querySelector('#sOut .ccPeer').click()");
  await waitFor("document.documentElement.dataset.tab==='read' && document.querySelector('#rOut .row.hit')",'Zugeordneten Quelltext öffnen');
 }
 ipcMain.removeHandler('file:save');
 console.log('Electron: Werkübergreifende Konkordanz, ganze Wörter, Zählung, Werkfilter, Originalstelle, CSV, Verlauf und OSHB-Grundformen bestanden.');
};
