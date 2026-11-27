'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor})=>{
 await js("document.querySelector('header nav [data-tab=search]').click();document.querySelector('#sq').value='שוב';document.querySelector('#sq').dispatchEvent(new Event('input'))");
 assert.equal(await js("document.querySelector('#sConcordance')"),null);
 assert.equal(await js("document.querySelector('#sConcordanceMode')"),null);
 assert.deepEqual(await js("[...document.querySelector('#sMode').options].map(o=>o.value)"),['exact','lemma','root']);
 assert(await js("!document.querySelector('#sMode').disabled&&!document.querySelector('#sMode').closest('label').hidden&&!document.querySelector('#sLang').closest('label').hidden&&!document.querySelector('#sCatPanel').hidden"));
 for(const query of ['שוב','καταβαίνω','Himmel']) {
  await js(`document.querySelector('#sq').value=${JSON.stringify(query)};document.querySelector('#sq').dispatchEvent(new Event('input'))`);
  assert.equal(await js("document.querySelector('#sMode').value"),'exact','Word form is the default across scripts');
 }
 assert.equal(await js("document.querySelector('#sMode option[value=root]').textContent"),'Wurzel');
 await js("document.querySelector('#sq').value='שוב';document.querySelector('#sq').dispatchEvent(new Event('input'))");
 const search=async mode=>{
  await js(`document.querySelector('#sMode').value=${JSON.stringify(mode)};document.querySelector('#sMode').dispatchEvent(new Event('change'));document.querySelector('#sGo').click()`);
  await waitFor("document.querySelector('#sGo').textContent==='Suchen'&&document.querySelector('#sOut mark')",mode+' Suche');
  return js("document.querySelector('#sInfo').textContent");
 };
 const lemma=await search('lemma');assert(lemma.includes('Wortvorkommen')&&lemma.includes('Versen/Absätzen'));
 await search('root');assert(await js("[...document.querySelectorAll('#sOut .ccRow')].every(e=>e.textContent.includes('OSHB'))"));
 assert(await js("!document.querySelector('#sChart').hidden"),'Verteilung bleibt auch bei Lemma/Wortfamilie sichtbar');
 const exact=await search('exact');assert(exact.includes('Wortvorkommen'));
 assert.equal(await js("document.querySelector('#sAdv').hidden"),false);
 await js("document.querySelector('#sMode').value='lemma';document.querySelector('#sMode').dispatchEvent(new Event('change'));document.querySelector('#sRecentL a').click()");
 await waitFor("document.querySelector('#sGo').textContent==='Suchen'&&document.querySelector('#sMode').value==='exact'",'Suchverlauf erhält Wortform-Modus');
 // A book selected via the existing reader action remains the search scope for every match mode.
 await js("document.querySelector('header nav [data-tab=read]').click();document.querySelector('#bookSearch').click();document.querySelector('#sq').value='שוב';document.querySelector('#sq').dispatchEvent(new Event('input'))");
 await waitFor("document.querySelector('#sGo').textContent==='Suchen'",'Buchsuche abgeschlossen');
 await search('lemma');
 assert(await js("[...document.querySelectorAll('#sOut .ccRow b')].every(e=>e.textContent==='Genesis')"),'Bestehende Werkauswahl filtert die Lemmasuche');
 assert(await js("document.querySelector('#sCatTree input[data-st=Genesis]')?.checked"));
 await js("document.querySelector('#sRecentL').closest('.dsv').hidden=true;document.querySelector('#sFavL').closest('.dsv').hidden=true;document.querySelector('#sAdv').open=false;I18N.set('en')");
 await new Promise(r=>setTimeout(r,300));
 await js("document.querySelector('header nav [data-tab=search]').click();document.querySelector('#sq').value='שוב';document.querySelector('#sq').dispatchEvent(new Event('input'));document.querySelector('#sq').blur();window.scrollTo(0,0)");
 await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
 win.showInactive();
 await new Promise(r=>setTimeout(r,300));
 await win.webContents.capturePage({x:0,y:0,width:1250,height:600}).then(i=>fs.writeFileSync('/tmp/safran-unified-search.png',i.toPNG()));
 console.log('Electron: unified Match menu, language, existing work scope, history and explicit result units passed.');
};
