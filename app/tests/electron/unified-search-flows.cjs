'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor})=>{
 await js("document.querySelector('header nav [data-tab=search]').click();document.querySelector('#sq').value='שוב';document.querySelector('#sq').dispatchEvent(new Event('input'))");
 assert.equal(await js("document.querySelector('#sConcordance')"),null);
 assert.equal(await js("document.querySelector('#sConcordanceMode')"),null);
 assert.deepEqual(await js("[...document.querySelector('#sMode').options].map(o=>o.value)"),['exact','lemma','root']);
 assert(await js("!document.querySelector('#sMode').disabled&&!document.querySelector('#sMode').closest('label').hidden&&!document.querySelector('#sLang').closest('label').hidden&&!document.querySelector('#sCatPanel').hidden"));
 // Compact defaults and query-dependent controls.
 assert(await js("!document.querySelector('#sAdv').open&&!document.querySelector('#sCatPanel').open&&document.querySelector('#sResearchBtn').hidden"));
 assert(await js("document.querySelector('#sDistLabel').hidden&&document.querySelector('#sOrdLabel').hidden"));
 await js("document.querySelector('#sq').value='Himmel Erde';document.querySelector('#sq').dispatchEvent(new Event('input'));document.querySelector('#sFuzzy').checked=true;document.querySelector('#sFuzzy').dispatchEvent(new Event('change',{bubbles:true}))");
 assert(await js("!document.querySelector('#sDistLabel').hidden&&document.querySelector('#sAdvN').textContent.includes('1')&&!document.querySelector('#sAdv').open"));
 await js("document.querySelector('#sFuzzy').checked=false;document.querySelector('#sq').value='שוב';document.querySelector('#sq').dispatchEvent(new Event('input'))");
 // Removing a scope chip updates the actual category selection, even while collapsed.
 await js("document.querySelector('#sCatPanel').open=true;document.querySelector('#sCatTree input[data-sc=Tanakh]').click();document.querySelector('#sCatPanel').open=false");
 assert(await js("document.querySelector('#sScopeChips button').textContent.includes('Tanakh')&&document.querySelector('#sCatBtn').textContent.includes('1')"));
 await js("document.querySelector('#sScopeChips button').click()");
 assert(await js("!document.querySelector('#sCatTree input:checked')&&!document.querySelector('#sScopeChips button')"));
 // History remains complete and removable when only five entries are initially visible.
 await js("localStorage.setItem('searchRecent',JSON.stringify(['a','b','c','d','e','f','g']));document.querySelector('#sq').dispatchEvent(new Event('input'))");
 assert.equal(await js("document.querySelectorAll('#sRecentL a').length"),5);
 await js("document.querySelector('#sRecentMore').click();document.querySelectorAll('#sRecentL button[data-rm]')[5].click()");
 assert.deepEqual(await js("JSON.parse(localStorage.getItem('searchRecent'))"),['a','b','c','d','e','g']);
 await js("document.querySelector('#sRecentMore').click();document.querySelector('#sRecentClear').click()");
 assert(await js("document.querySelector('#sRecentL').closest('.dsv').hidden&&document.querySelector('#sFavL').closest('.dsv').hidden"));
 const search=async mode=>{
  await js(`document.querySelector('#sMode').value=${JSON.stringify(mode)};document.querySelector('#sMode').dispatchEvent(new Event('change'));document.querySelector('#sGo').click()`);
  await waitFor("document.querySelector('#sGo').textContent==='Suchen'&&document.querySelector('#sOut mark')",mode+' Suche');
  return js("document.querySelector('#sInfo').textContent");
 };
 const lemma=await search('lemma');assert(lemma.includes('Wortvorkommen')&&lemma.includes('Versen/Absätzen'));
 await search('root');assert(await js("[...document.querySelectorAll('#sOut .ccRow')].every(e=>e.textContent.includes('OSHB'))"));
 assert(await js("!document.querySelector('#sChart').hidden"),'Verteilung bleibt auch bei Lemma/Wortfamilie sichtbar');
 const exact=await search('exact');assert(exact.includes('Wortvorkommen'));
 assert(await js("!document.querySelector('#sResearchBtn').hidden"));
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
 // A clean text-search view at a narrow window must not overflow horizontally.
 await js("document.querySelector('#sSyntaxTab').click();document.querySelector('#sTextTab').click();document.querySelector('#sq').value='Himmel Erde';document.querySelector('#sq').dispatchEvent(new Event('input'))");
 win.setSize(760,900);
 await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
 assert(await js("document.documentElement.scrollWidth<=window.innerWidth"));
 await win.webContents.capturePage().then(i=>fs.writeFileSync('/tmp/safran-compact-search-narrow.png',i.toPNG()));
 win.setSize(1250,900);
 await js("Theme.set('dark');document.querySelector('#sCatTree input[data-sc=Tanakh]').click();document.querySelector('#sFuzzy').checked=true;document.querySelector('#sFuzzy').dispatchEvent(new Event('change',{bubbles:true}))");
 await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
 await win.webContents.capturePage().then(i=>fs.writeFileSync('/tmp/safran-compact-search.png',i.toPNG()));
 await js("document.querySelector('#sCatPanel').open=true");
 await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
 await win.webContents.capturePage().then(i=>fs.writeFileSync('/tmp/safran-search-scope.png',i.toPNG()));
 console.log('Electron: unified Match menu, language, existing work scope, history and explicit result units passed.');
};
