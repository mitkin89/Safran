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

  assert.equal(await js("document.querySelectorAll('#rOut .note, #rOut sup[data-fn]').length"),0,'No oversized inline Tal footnote numbers');
  const tree=await js("[...document.querySelectorAll('#rOut .cell[data-k=he] .w')].find(n=>n.textContent==='ועץ').dataset.l");
  await clickWord(tree);
  await waitFor("document.querySelector('#wpop .tal-cite')?.textContent.includes('Genesis 1:11')",'Anmerkung in der Morphologiekarte');
  assert(await js("document.querySelector('#wpop').textContent.includes('syntactic structure') && document.querySelectorAll('#wpop .wseg').length>0"));
  await js("document.querySelector('#wpop .wx').click();document.querySelector('#rSection').value='27';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("[...document.querySelectorAll('#rOut .cell[data-k=he] .w')].some(n=>n.textContent==='ללכת')",'Genesis 28');
  const go=await js("[...document.querySelectorAll('#rOut .cell[data-k=he] .w')].find(n=>n.textContent==='ללכת').dataset.l");
  await clickWord(go);
  await waitFor("document.querySelector('#wpop .tal-cite')?.textContent==='Tal–Florentin, Fußnote Genesis 28:10 (S. 184)'",'Quelle klein in der Wortkarte');
  assert(await js("document.querySelector('#wpop .tal-apparatus').textContent.includes('INF') && parseFloat(getComputedStyle(document.querySelector('#wpop .tal-cite')).fontSize)<parseFloat(getComputedStyle(document.querySelector('#wpop')).fontSize)"));
  assert(await js("[...document.querySelectorAll('#wpop .tal-apparatus .ab')].some(n=>n.textContent==='INF'&&n.title==='Infinitiv') && [...document.querySelectorAll('#wpop .tal-apparatus .ab')].some(n=>n.textContent===']'&&n.title.includes('Inhaltliche Abweichung')) && [...document.querySelectorAll('#wpop .tal-apparatus .ab')].some(n=>n.textContent==='MT'&&n.title==='Masoretischer Text')"),'Dictionary-style hover explanations in word popup');
  assert(await js("{const p=document.querySelector('#wpop');const size=n=>getComputedStyle(n).fontSize;size(p.querySelector('.wphon'))===size(p.querySelector('.wseg'))&&size(p.querySelector('.tal-apparatus-entry > div'))===size(p.querySelector('.wseg'))}"),'Transcription and annotation match morphology font size');
  if(process.env.SAFRAN_NOTES_CAPTURE){
    await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    await new Promise(resolve=>setTimeout(resolve,150));
    fs.writeFileSync(process.env.SAFRAN_NOTES_CAPTURE,(await win.webContents.capturePage()).toPNG());
  }
  await js("document.querySelector('#wpop .wx').click()");
  const haran=await js("[...document.querySelectorAll('#rOut .cell[data-k=he] .w')].find(n=>n.textContent==='חרנה').dataset.l");
  assert(await js("{const n=[...document.querySelectorAll('#rOut .cell[data-k=he] .w')].find(n=>n.textContent==='חרנה');n.classList.contains('tal-note')&&!n.querySelector('.mt-diff')}"),'Neutral remark is discreetly marked');
  await clickWord(haran);
  await waitFor("document.querySelector('#wpop .tal-apparatus')?.textContent.includes('חרנה')",'Eigene Anmerkung am neutralen Wort');
  assert.equal(await js("document.querySelector('#wpop .tal-apparatus').textContent.includes('ללכת')"),false);
  await js("document.querySelector('#wpop .wx').click();document.querySelector('#rSection').value='0';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("document.querySelector('#rOut .w[data-l=\"sp:405429\"]')",'Zurück zu Genesis 1');
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
