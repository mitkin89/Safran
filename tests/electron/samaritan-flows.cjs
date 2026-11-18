'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const D=require('../../samaritan-data');
module.exports=async function run({docs,win,js,waitFor,book}){
  const root=path.resolve(__dirname,'../..');
  const entries=require('../../bundled/manifest.json').items.filter(i=>['Samaritanischer Pentateuch (Tal–Florentin)','The Samaritan Pentateuch, Florentin and Tal (2024)'].includes(i.versionTitle));
  for(const entry of entries){const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel)));docs.set(entry.rel,{...doc,entry:{...entry,own:false,bytes:fs.statSync(path.join(root,'bundled',entry.rel)).size},textHash:crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex')});}
  const loaded=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));win.reload();await loaded;
  await waitFor("[...document.querySelectorAll('#tree .lib-item')].some(n=>n.dataset.key.endsWith('¦Genesis'))",'Bibliothek mit Samaritanus');
  await book('Genesis');
  const select=async(prefix='document')=>js(`{const d=${prefix};const c=[...d.querySelectorAll('#verList input[data-rel]')].find(n=>n.dataset.rel.includes('Samaritanischer Pentateuch'));if(!c)throw Error('Samaritanische Fassung fehlt');if(!c.checked){c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}}`);
  await waitFor("[...document.querySelectorAll('#verList input')].some(n=>n.dataset.rel?.includes('Samaritanischer Pentateuch'))",'Samaritanische Fassungswahl');
  const clickWord=async(id,prefix='document')=>{
    // Programmatic clicks must wait for the word to be visible and layout scroll
    // events to finish, just as a real pointer click does after changing editions.
    await js(`{const d=${prefix};d.querySelector('#rOut .w[data-l=\"'+${JSON.stringify(id)}+'\"]').scrollIntoView({block:'center'});}`);
    await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    await js(`{const d=${prefix};d.querySelector('#rOut .w[data-l=\"'+${JSON.stringify(id)}+'\"]').click();}`);
  };
  await js("if(!document.querySelector('#cmtPanel').hidden)document.querySelector('#cmtClose').click();if(!document.querySelector('#pane2').hidden)document.querySelector('#splitBtn').click()");
  await select();
  await waitFor("document.querySelector('#rOut .w[data-l=\"sp:405429\"]')",'Samaritanischer Lesetext');
  assert(await js("!!window.SamaritanMorph"),'Samaritan morphology adapter loaded');
  const others=await js("[...document.querySelectorAll('#verList input[data-rel]')].filter(n=>n.checked&&!n.dataset.rel.includes('Samaritanischer Pentateuch')).map(n=>n.dataset.rel)");
  for(const rel of others){
    await js(`{const c=[...document.querySelectorAll('#verList input[data-rel]')].find(n=>n.dataset.rel===${JSON.stringify(rel)});c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));}`);
    await waitFor(`![...document.querySelectorAll('#rOut .cell')].some(n=>n.dataset.rel===${JSON.stringify(rel)})`,'Andere Fassung abgewählt');
  }
  await waitFor("document.querySelectorAll('#rOut .row[data-l=\"11\"] .cell').length===1",'Tal als hebräischer Haupttext');
  await js(`{const c=[...document.querySelectorAll('#verList input[data-rel]')].find(n=>n.dataset.rel.includes('Florentin and Tal'));if(!c)throw Error('English Tal edition missing');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}`);
  await waitFor("[...document.querySelectorAll('#rOut .cell[data-k=en]')].some(n=>n.textContent.includes('In the beginning'))",'Englische Tal-Fassung');
  assert(await js("[...document.querySelectorAll('#rOut .cell[data-k=en] .mt-diff')].some(n=>!n.closest('.note')&&n.textContent==='and')"));
  assert(await js("{const n=document.querySelector('#rOut .cell[data-k=he] .w .mt-diff');const c=getComputedStyle(n).color.match(/\\d+/g).map(Number);c[0]>c[1]+50&&c[0]>c[2]+50}"),'Hebrew MT differences are red');

  await js(`{for(const label of ['Fußnote Genesis 1:11','Endnote Genesis 1:11']){const note=[...document.querySelectorAll('#rOut .note')].find(n=>n.textContent.includes(label));if(!note)throw Error('Tal–Florentin note missing: '+label);note.previousElementSibling.click();}}`);
  await waitFor("[...document.querySelectorAll('#rOut .note.open')].some(n=>n.textContent.includes('syntactic structure'))",'Tal–Florentin-Fußnote und vollständige Endnote geöffnet');
  assert(await js("[...document.querySelectorAll('#rOut .note.open')].some(n=>n.textContent.includes('S. 899') && n.textContent.includes('clarifies') && n.textContent.includes('ועץ'))"));
  assert(await js("!!document.querySelector('#rOut .note.open .mt-diff')"),'Footnote red from print retained');
  if(process.env.SAFRAN_NOTES_CAPTURE){
    await js("[...document.querySelectorAll('#rOut .note.open')].find(n=>n.textContent.includes('syntactic structure')).scrollIntoView({block:'center'})");
    await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    fs.writeFileSync(process.env.SAFRAN_NOTES_CAPTURE,(await win.webContents.capturePage()).toPNG());
  }
  await js("document.querySelectorAll('#rOut .note.open').forEach(n=>n.previousElementSibling.click())");

  await clickWord('sp:405429');
  await waitFor("!!window.SAMARITAN_DATA",'Samaritanische Morphologiedaten geladen');
  await waitFor("document.querySelector('#wpop')?.textContent.includes('Stamm: Qal')",'Samaritanische Verbmorphologie');
  assert(await js("document.querySelector('#wpop').textContent.includes('Perfekt') && document.querySelector('#wpop').textContent.includes('3. Person') && document.querySelector('#wpop').textContent.includes('Samaritanisches Hebräisch')"));
  await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await clickWord('sp:405427');
  await waitFor("document.querySelectorAll('#wpop .wseg').length===2",'Präposition und Hauptwort getrennt bestimmt');
  assert(await js("document.querySelector('#wpop').textContent.includes('Präposition') && document.querySelector('#wpop').textContent.includes('Substantiv')"));
  await js("document.querySelector('#wpop .wx').click()");
  const variant=D.variants.find(v=>v.ref==='Genesis 1:12'&&v.base==='ותוצא');assert(variant);
  assert(await js("[...document.querySelectorAll('#rOut .cell[data-k=he]')].some(n=>n.textContent.includes('ותוציא'))"),'Tal reading incorporated in main text');
  assert.equal(await js(`!!document.querySelector('#rOut .w[data-l="sp:${variant.node}"]')`),false,'No inherited analysis on changed form');
  await clickWord('sp:405429');
  await waitFor("document.querySelector('#wpop .wdict[data-q=\"ברא\"]')",'Samaritanisches Lexem für Wörterbuch');
  await js("document.querySelector('#wpop .wdict[data-q=\"ברא\"]').click()");
  await waitFor("document.querySelector('#dictQ').value==='ברא' && !document.querySelector('#wpop')",'Samaritanisches Lexem im Wörterbuch');
  await js("document.querySelector('nav [data-tab=read]').click();if(document.querySelector('#pane2').hidden)document.querySelector('#splitBtn').click()");
  await waitFor("[...document.querySelector('#pane2').contentDocument.querySelectorAll('#tree .lib-item')].some(n=>n.dataset.key.endsWith('¦Genesis'))",'Zweites Fenster mit Samaritanus');
  await book('Genesis',"document.querySelector('#pane2').contentDocument");
  await waitFor("[...document.querySelector('#pane2').contentDocument.querySelectorAll('#verList input')].some(n=>n.dataset.rel?.includes('Samaritanischer Pentateuch'))",'Fassungswahl im zweiten Fenster');
  await select("document.querySelector('#pane2').contentDocument");
  await waitFor("document.querySelector('#pane2').contentDocument.querySelector('#rOut .w[data-l=\"sp:405429\"]')",'Samaritanischer Text im zweiten Fenster');
  await clickWord('sp:405429',"document.querySelector('#pane2').contentDocument");
  await waitFor("document.querySelector('#pane2').contentDocument.querySelector('#wpop')?.textContent.includes('Stamm: Qal')",'Eigene Samaritanus-Karte im zweiten Fenster');
  assert.equal(await js("!!document.querySelector('#wpop')"),false);
  console.log('Electron: Samaritanische Fassung, Verbmorphologie, Präfixe, Tal–Florentin-Lesarten, Wörterbuch und unabhängiges zweites Fenster bestanden.');
};
