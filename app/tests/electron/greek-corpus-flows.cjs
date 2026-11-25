'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=async({docs,win,js,waitFor,book})=>{
 const root=path.resolve(__dirname,'../..'),manifest=require('../../bundled/manifest.json');
 const added=[];
 for(const id of ['tlg0018.tlg001','tlg0526.tlg004','tlg0526.tlg001','tlg0526.tlg003','tlg0526.tlg002']){
  const entry=manifest.items.find(e=>e.rel.startsWith('own/GreekCorpus-'+id+'/'));
  const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel)));
  docs.set(entry.rel,{...doc,entry:{...entry,own:false},textHash:crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex')});added.push(entry);
 }
 for(const title of ['The Antiquities of the Jews','The War of the Jews','Against Apion']){
  const entry=manifest.items.find(e=>e.title===title&&e.kind==='de'),doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel)));
  docs.set(entry.rel,{...doc,entry:{...entry,own:false},textHash:crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex')});
  if(title==='The Antiquities of the Jews'){
   const copy={...entry,rel:entry.rel.replace(/[^/]+$/, 'imported-copy.json')};
   docs.set(copy.rel,{...doc,entry:{...copy,own:false},textHash:crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex')});
   const en={...entry,rel:'fixture/Josephus/en/merged.json',kind:'en',language:'English',versionTitle:'merged'};
   docs.set(en.rel,{...doc,sectionNames:null,entry:en,textHash:'english-fixture',versionTitle:'merged'});
  }
 }
 for(const entry of manifest.items.filter(e=>e.title==='Ben Sira')){
  const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel)));
  docs.set(entry.rel,{...doc,entry:{...entry,own:false},textHash:crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex')});
 }
 const aristeas=manifest.items.find(e=>e.title==='Letter of Aristeas'&&e.language==='Greek');
 for(const entry of manifest.items.filter(e=>e.title==='Letter of Aristeas')){
  const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel)));
  docs.set(entry.rel,{...doc,entry:{...entry,own:false},textHash:crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex')});
 }
 const pseudo=require('../../tools/pseudepigrapha/coverage.json').editions;
 for(const entry of manifest.items.filter(e=>pseudo.some(p=>p.rel===e.rel)||e.kind==='de'&&['The Testaments of the Twelve Patriarchs','Das Buch Henoch'].includes(e.title))){
  const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel)));
  docs.set(entry.rel,{...doc,entry:{...entry,own:false},textHash:crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex')});
 }
 await js("localStorage.setItem('stackMode','split');localStorage.setItem('stackDictH','42')");
 const loaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.reload();await loaded;
 await waitFor("document.querySelector('#rOut .cell')",'Wiederhergestellter Leser');
 await waitFor("[...document.querySelectorAll('#tree .lib-item')].some(n=>n.dataset.key.includes('Philo:'))",'Griechische Bibliothek');
 assert(await js(`[${['The Antiquities of the Jews','The War of the Jews','Against Apion','The Life of Flavius Josephus'].map(t=>JSON.stringify(t)).join(',')}].every(t=>[...document.querySelectorAll('#tree .lib-item')].filter(n=>n.dataset.key.endsWith('¦'+t)).length===1)`));
 assert(await js("![...document.querySelectorAll('#tree .lib-item')].some(n=>n.dataset.key.includes('¦Josephus:'))"));
 async function clickFirst(rel,label,wordIndex=0){
  const selector=(label?`#rOut .row[data-l="${label}"] .cell[data-gt]`:'#rOut .cell[data-gt]')+`[data-rel="${rel}"]`;
  await waitFor(`[...document.querySelectorAll('#verList input[data-rel]')].some(c=>c.dataset.rel===${JSON.stringify(rel)})`,'Griechische Fassung im gemeinsamen Werk');
  await js(`{const c=[...document.querySelectorAll('#verList input[data-rel]')].find(c=>c.dataset.rel===${JSON.stringify(rel)});if(!c.checked){c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}}`);
  await waitFor(`[...document.querySelectorAll('#rOut .cell[data-gt]')].some(c=>c.dataset.rel===${JSON.stringify(rel)})`,'Gewählte griechische Ausgabe');
  await waitFor("document.querySelector('#rOut .cell[data-gt]')",'Griechischer Text');
  // Scroll the actual character into view: a long parallel-text cell can exceed the viewport.
  await js(`(()=>{const c=document.querySelector(${JSON.stringify(selector)}),walk=document.createTreeWalker(c.querySelector('.txt')||c,NodeFilter.SHOW_TEXT);let n,left=${wordIndex};while(n=walk.nextNode()){if(n.parentElement.closest('small,sup,.note'))continue;for(const m of n.textContent.matchAll(/[\u0370-\u03ff\u1f00-\u1fff][\\p{L}\\p{M}]*[᾿’'ʼ]?/gu)){if(left-->0)continue;const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+1);const marker=document.createElement('span');marker.id='greekClickTarget';r.surroundContents(marker);marker.scrollIntoView({block:'center',inline:'center'});return;}}throw Error('Greek word missing');})()`);
  await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const point=await js(`(()=>{const marker=document.querySelector('#greekClickTarget'),b=marker.getBoundingClientRect(),point={x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)},parent=marker.parentNode;if(!document.elementFromPoint(point.x,point.y)?.closest('.cell[data-gt]'))throw Error('Greek word is not visible');marker.replaceWith(document.createTextNode(marker.textContent));parent.normalize();return point;})()`);
  win.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:1});
  win.webContents.sendInputEvent({type:'mouseUp',...point,button:'left',clickCount:1});
  return point;
 }
 await book(added[0].title);
 await waitFor(`[...document.querySelectorAll('#verList input[data-rel]')].some(c=>c.dataset.rel===${JSON.stringify(added[0].rel)})`,'Philo für Wörterbuchpanel');
 await js("if(document.querySelector('#cmtPanel').hidden)document.querySelector('#cmtBtn').click();if(!document.querySelector('#cmtPanel .pinB').classList.contains('on'))document.querySelector('#cmtPanel .pinB').click()");
 const dblPoint=await clickFirst(added[0].rel);
 await waitFor("document.querySelector('#wpop [data-source=oga]')",'Philo OGA-Morphologie');
 const lemma=await js("document.querySelector('#wpop .wlem').textContent.replace(/[0-9]+$/,'')");
 assert(lemma);
 const meaning=await js("document.querySelector('#wpop .corpus-gloss')?.textContent");assert(meaning);
 assert(await js("parseFloat(getComputedStyle(document.querySelector('#wpop .corpus-gloss')).fontSize)>parseFloat(getComputedStyle(document.querySelector('#wpop .corpus-morph')).fontSize)"));
 win.webContents.sendInputEvent({type:'mouseDown',...dblPoint,button:'left',clickCount:2});
 win.webContents.sendInputEvent({type:'mouseUp',...dblPoint,button:'left',clickCount:2});
 await waitFor(`document.querySelector('#dictQ')?.value===${JSON.stringify(lemma)}`,'Griechisches Lemma im Wörterbuch');
 await waitFor("!document.querySelector('#dictPanel').hidden",'Wörterbuchpanel');
 await js("if(document.body.classList.contains('stack-split')||document.body.classList.contains('stack-side'))document.querySelector('#dictStack').click()");
 await waitFor("getComputedStyle(document.querySelector('#dictPanel')).visibility==='visible'",'Wörterbuch in voller Höhe');
 assert(await js("(()=>{const r=document.querySelector('#dictPanel').getBoundingClientRect();return r.height>innerHeight-r.top-3;})()"));
 await js("document.querySelector('#dockTabs [data-panel=cmt]').click()");
 await waitFor("getComputedStyle(document.querySelector('#dictPanel')).visibility==='hidden'",'Kommentar über Panel-Tab');
 await js("document.querySelector('#dockTabs [data-panel=dict]').click()");
 await waitFor("getComputedStyle(document.querySelector('#dictPanel')).visibility==='visible'",'Wörterbuchinhalt über Panel-Tab zurück');
 assert.equal(await js("document.querySelector('#dictQ').value"),lemma);

 const sirach=manifest.items.find(e=>e.title==='Ben Sira'&&e.language==='Greek');
 await book('Ben Sira');await clickFirst(sirach.rel);
 await waitFor("document.querySelector('#wpop .wlem.wgl')",'Sirach-Morphologie unter Ben Sira');
 assert(await js("![...document.querySelectorAll('#tree .lib-item')].some(n=>n.dataset.key.includes('Jesus Sirach (Septuaginta)'))"));
 assert(await js("[...document.querySelector('#rSection').options].some(o=>o.textContent===I18N.t('Prolog (griechisch)'))"));
 await js("document.querySelector('#wpop .wx').click()");
 await book(added[2].title);
 await js(`{for(const c of [...document.querySelectorAll('#verList input[data-rel]')].filter(c=>c.dataset.rel.includes('Clementz')||c.dataset.rel.endsWith('imported-copy.json'))){if(!c.checked){c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}}}`);
 await waitFor("[...document.querySelectorAll('#verList input[data-rel]')].filter(c=>c.dataset.rel.includes('Clementz')||c.dataset.rel.endsWith('imported-copy.json')).length===1",'Identische Clementz-Kopien zusammengeblendet');
 await clickFirst(added[2].rel);
 await waitFor("document.querySelector('#wpop [data-source=oga]')",'Josephus Morphologie in einer ganzen Buchansicht');
 assert.equal(await js("[...document.querySelectorAll('#rOut .row.head > div[data-hv]')].filter(n=>n.dataset.hv.includes('Clementz')).length"),1);
 await js("document.querySelector('#wpop .wx').click()");
 await js(`{const s=document.querySelector('#rSection'),o=[...s.options].find(o=>/^(Buch|Book) 8$/.test(o.textContent));if(!o)throw Error('Buch 8 missing');s.value=o.value;s.dispatchEvent(new Event('change'));}`);
 await clickFirst(added[2].rel);
 await waitFor("document.querySelector('#wpop [data-source=oga]')",'Antiquities Buch 8 Morphologie');
 assert(await js("document.querySelector('#wpop').textContent.includes('8.1')"));
 await js("document.querySelector('#wpop .wx').click()");
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
 await book('Letter of Aristeas');await clickFirst(aristeas.rel);
 await waitFor("document.querySelector('#wpop [data-source=glaux]')",'Aristeas GLAUx-Morphologie');
 assert.equal(await js("document.querySelector('#wpop .wlem').textContent"),'ἀξιόλογος');
 assert(await js("document.querySelector('#wpop').textContent.includes('GLAUx · automatically annotated')"));
 assert(await js("document.querySelector('#wpop [data-analysis=auto]')!==null"));
 assert(await js("CSS.highlights.has('gsel')"));
 await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 assert(await js("(()=>{const p=document.querySelector('#wpop'),r=p.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight;})()"));
 await win.webContents.capturePage().then(i=>fs.writeFileSync('/tmp/safran-aristeas-popup.png',i.toPNG()));
 await js("document.querySelector('#wpop .wdict').click()");
 await waitFor("document.querySelector('#dictQ').value==='ἀξιόλογος'",'Aristeas-Lemma im Wörterbuch');
 await clickFirst(aristeas.rel,'43');
 await waitFor("document.querySelector('#wpop')?.textContent.includes('No securely aligned morphology')",'Aristeas 43 ohne erfundene Analyse');
 assert(await js("!document.querySelector('#wpop .wlem')&&!document.querySelector('#wpop .wdict')"));
 console.log('Electron: Aristeas mit GLAUx-Herkunft, Wortmarkierung, Wörterbuch und ungelöstem Abschnitt 43 bestanden.');
 await js("document.querySelector('#wpop .wx').click()");
 for(const key of ['T12P-Wikisource','PsPhoc-Bergk','3Bar-Picard','1En-Gizeh']){
  const edition=pseudo.find(e=>e.key===key);await book(edition.title);
  await clickFirst(edition.rel,null,key==='T12P-Wikisource'?1:0);await waitFor("document.querySelector('#wpop [data-source=stanza]')",key+' automatische Morphologie');
  assert(await js("document.querySelector('#wpop').textContent.includes('automatically generated, not editorially reviewed')"));
  assert(await js("CSS.highlights.has('gsel')"));
  if(key==='T12P-Wikisource'){
   assert(await js("document.querySelector('#wpop .corpus-provisional').textContent.includes('not yet collated')"));
   await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
   await win.webContents.capturePage().then(i=>fs.writeFileSync('/tmp/safran-testaments-popup.png',i.toPNG()));
  }
  const lemma=await js("document.querySelector('#wpop .wlem').textContent.replace(/[0-9]+$/,'')");
  await js("document.querySelector('#wpop .wdict').click()");
  await waitFor(`document.querySelector('#dictQ').value===${JSON.stringify(lemma)}`,key+' Wörterbuchlemma');
 }
 console.log('Electron: Testamente, Pseudo-Phokylides, 3 Baruch und Henoch mit Quellenhinweis, Wortmarkierung und Wörterbuch bestanden.');
 await book('Genesis');
};
