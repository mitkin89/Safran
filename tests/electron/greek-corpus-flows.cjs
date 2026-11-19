'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=async({docs,win,js,waitFor,book})=>{
 const root=path.resolve(__dirname,'../..'),manifest=require('../../bundled/manifest.json');
 const added=[];
 for(const id of ['tlg0018.tlg001','tlg0526.tlg004']){
  const entry=manifest.items.find(e=>e.rel.startsWith('own/GreekCorpus-'+id+'/'));
  const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel)));
  docs.set(entry.rel,{...doc,entry:{...entry,own:false},textHash:crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex')});added.push(entry);
 }
 const loaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.reload();await loaded;
 await waitFor("document.querySelector('#rOut .cell')",'Wiederhergestellter Leser');
 await waitFor("[...document.querySelectorAll('#tree .lib-item')].some(n=>n.dataset.key.includes('Philo:'))",'Griechische Bibliothek');
 async function clickFirst(rel){
  await waitFor(`[...document.querySelectorAll('#rOut .cell[data-gt]')].some(c=>c.dataset.rel===${JSON.stringify(rel)})`,'Gewählte griechische Ausgabe');
  await waitFor("document.querySelector('#rOut .cell[data-gt]')",'Griechischer Text');
  await js(`{const cell=document.querySelector('#rOut .cell[data-gt]');cell.scrollIntoView({block:'center'});}`);
  await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const point=await js(`(()=>{const c=document.querySelector('#rOut .cell[data-gt]'),walk=document.createTreeWalker(c,NodeFilter.SHOW_TEXT);let n;while(n=walk.nextNode()){const m=/[Ͱ-Ͽἀ-῿]/.exec(n.textContent);if(m){const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+1);const b=r.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};}}})()`);
  win.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:1});
  win.webContents.sendInputEvent({type:'mouseUp',...point,button:'left',clickCount:1});
 }
 await book(added[0].title);await clickFirst(added[0].rel);
 await waitFor("document.querySelector('#wpop [data-source=oga]')",'Philo OGA-Morphologie');
 const lemma=await js("document.querySelector('#wpop .wlem').textContent.replace(/[0-9]+$/,'')");
 assert(lemma);
 await js("document.querySelector('#wpop .wdict').click()");
 await waitFor(`document.querySelector('#dictQ')?.value===${JSON.stringify(lemma)}`,'Griechisches Lemma im Wörterbuch');
 await book(added[1].title);await clickFirst(added[1].rel);
 await waitFor("document.querySelector('#wpop [data-source=gorman]')",'Josephus manuelle Morphologie');
 assert(await js("document.querySelector('#wpop').textContent.includes('Whiston:')"));
 await win.webContents.capturePage().then(i=>fs.writeFileSync('/tmp/safran-greek-popup.png',i.toPNG()));
 console.log('Electron: Philo/OGA, Josephus/Gorman, Wörterbuch und Whiston-Verweis bestanden.');
 await js("document.querySelector('#wpop .wx').click()");
 await js("localStorage.setItem('uiLang','en')");
 const english=new Promise(r=>win.webContents.once('did-finish-load',r));win.reload();await english;
 await waitFor("document.querySelector('#rOut .cell')",'Wiederhergestellter englischer Leser');
 await book(added[0].title);await clickFirst(added[0].rel);
 await waitFor("document.querySelector('#wpop')?.textContent.includes('automatically annotated')",'English morphology provenance');
 assert(await js("!document.querySelector('#wpop').textContent.includes('automatisch')"));
 await js("document.querySelector('#wpop .wx').click()");
 await js(`{const c=document.querySelector('#rOut .cell[data-gt]'),walk=document.createTreeWalker(c,NodeFilter.SHOW_TEXT);let n;while(n=walk.nextNode()){if(/[Ͱ-Ͽἀ-῿]/.test(n.textContent)){n.textContent='ἄλλος '+n.textContent;break;}}}`);
 await clickFirst(added[0].rel);
 await waitFor("document.querySelector('#wpop')?.textContent.includes('No securely aligned morphology')",'Geänderter Wortlaut erhält keine fremde Bestimmung');
 assert(await js("!document.querySelector('#wpop .wdict')"));
 console.log('Electron: Englische Herkunftsanzeige und Schutz vor verändertem Wortlaut bestanden.');
 await js("document.querySelector('#wpop .wx').click()");
 await book('Genesis');
};
