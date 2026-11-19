'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=async({docs,win,js,waitFor,book})=>{
 const root=path.resolve(__dirname,'../..'),manifest=require('../../bundled/manifest.json'),entries=[];
 for(const title of ['Genesis','Isaiah']){
  const e=manifest.items.find(e=>e.title===title&&e.language==='Syriac'),d=JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel)));entries.push(e);
  docs.set(e.rel,{...d,entry:{...e,own:false},textHash:crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex')});
 }
 await js("localStorage.setItem('uiLang','en')");
 const loaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.reload();await loaded;
 await waitFor("document.querySelector('#rOut .cell')",'Wiederhergestellter Leser');
 async function select(title){
  await book(title);
  const e=entries.find(e=>e.title===title);
  await waitFor(`[...document.querySelectorAll('#verList input[data-rel]')].some(n=>n.dataset.rel===${JSON.stringify(e.rel)})`,'Peschitta in der Fassungswahl');
  await js(`{const c=[...document.querySelectorAll('#verList input[data-rel]')].find(n=>n.dataset.rel===${JSON.stringify(e.rel)});if(!c.checked){c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}}`);
  await waitFor("document.querySelector('#rOut .cell[data-syriac] .syw')",'Syrischer Lesetext');
 }
 await select('Genesis');
 assert.equal(await js("document.querySelector('#rOut .cell[data-syriac]').dir"),'rtl');
 assert(await js("document.querySelector('#rOut .head').textContent.includes('Peshitta numbering')"));
 assert(await js("document.fonts.load('20px \"Safran Syriac\"','ܒܪܫܝܬ').then(x=>x.length===1)"));
 await js("document.querySelector('#rOut .syw[data-si=\"1\"]').scrollIntoView({block:'center'})");
 await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 await js("document.querySelector('#rOut .syw[data-si=\"1\"]').click()");
 await waitFor("document.querySelectorAll('#wpop.syriac-word .wseg.main').length===2",'Präfix und Hauptwort der Peschitta');
 assert(await js("document.querySelector('#wpop .wword').lang==='syr'&&document.querySelector('#wpop .wword').dir==='rtl'"));
 assert(await js("document.querySelector('#wpop').textContent.includes('Preposition')"));
 const query=await js("document.querySelector('#wpop .wdict').dataset.q");await js("document.querySelector('#wpop .wdict').click()");
 await waitFor(`document.querySelector('#dictQ').value===${JSON.stringify(query)}`,'Syrisches Lemma im Wörterbuch');
 await win.webContents.capturePage().then(i=>fs.writeFileSync('/tmp/safran-peshitta-popup.png',i.toPNG()));
 await select('Isaiah');
 await js("document.querySelector('#rOut .syw').scrollIntoView({block:'center'})");
 await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 await js("document.querySelector('#rOut .syw').click()");
 await waitFor("document.querySelector('#wpop')?.textContent.includes('No securely aligned morphology')",'Peschitta ohne erfundene Bestimmung');
 assert(await js("!document.querySelector('#wpop .wdict')"));
 await js("document.querySelector('#wpop .wx').click()");
 await book('Genesis');
 console.log('Electron: Peschitta RTL, Offline-Schrift, eigene Zählung, Wortbestandteile, englische Morphologie, Wörterbuch und Lücken bestanden.');
};
