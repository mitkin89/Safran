'use strict';
// Echte Electron-Darstellung mit Produktions-HTML, -Skripten und -Preload.
// Öffentliche Testtexte, isoliertes Profil, keine Netzwerkzugriffe und keine Nutzerdaten.
const {app,BrowserWindow,ipcMain,session}=require('electron');
const fs=require('fs'),fsp=require('fs/promises'),os=require('os'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'safran-ui-'));
app.setPath('userData',profile);
// Erst nach der Profilbereinigung mit dem tatsächlichen Testergebnis beenden.
app.on('window-all-closed',()=>{});
const manifest=require(path.join(root,'bundled/manifest.json'));
const docs=new Map();let oldTranslation=false,win;
const hash=text=>crypto.createHash('sha256').update(JSON.stringify(text)).digest('hex');
function add(book,kind,pattern){const item=manifest.items.find(e=>e.title===book&&e.kind===kind&&pattern.test(e.versionTitle));assert(item);const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',item.rel)));const entry={...item,own:false,bytes:Buffer.byteLength(JSON.stringify(doc))};docs.set(entry.rel,{...doc,entry,textHash:hash(doc.text)});}
add('Genesis','he',/^Westminster/);add('Isaiah','he',/^Westminster/);add('Genesis','de',/Zunz/);add('Exodus','de',/Zunz/);add('Exodus','he',/^Westminster/);
if(process.env.SAFRAN_SMOKE_PSALMNOTES==='1')add('Psalms','he',/^Westminster/);
if(process.env.SAFRAN_SMOKE_CONCORDANCE==='1')add('Genesis','other',/^Septuaginta \(CATSS\)/);
if(process.env.SAFRAN_SMOKE_CONCORDANCE==='1'||process.env.SAFRAN_SMOKE_TCSEARCH==='1'||process.env.SAFRAN_SMOKE_PESHITTA_STATUS==='1')add('Genesis','other',/^ETCBC Peshitta/);
if(process.env.SAFRAN_SMOKE_CONCORDANCE==='1'||process.env.SAFRAN_SMOKE_PESHITTA_STATUS==='1')add('Ruth','other',/^ETCBC Peshitta/);
if(process.env.SAFRAN_SMOKE_FIELD_SIGLA==='1')add('Ezekiel','he',/^Westminster/);
if(process.env.SAFRAN_SMOKE_PSAPP==='1'){add('Ezekiel','he',/^Westminster/);add('Ezekiel','other',/^ETCBC Peshitta/);}
const raw=require(path.join(root,'tools/bavli/berakhot/source.json'));
const bavli={title:'Berakhot',heTitle:'ברכות',language:'Hebrew',versionTitle:raw.versionTitle,sectionNames:['Daf','Line'],text:[[],[],...Object.values(raw.pages)]};
const be={rel:'fixture/Berakhot/he.json',title:bavli.title,heTitle:bavli.heTitle,language:bavli.language,versionTitle:bavli.versionTitle,kind:'he',categories:['Talmud','Bavli','Seder Zeraim'],bytes:100000};docs.set(be.rel,{...bavli,entry:be,textHash:hash(bavli.text)});
const BHSA = require('../../bhsa-index');
const handlers={
 'off:state':()=>({dir:profile,stats:{files:docs.size,titles:2,bytes:100000},catalog:null}),
 'off:library':()=>[...docs.values()].map(d=>d.entry),
 'off:read':(_e,rel)=>{const doc=structuredClone(docs.get(rel));if(!doc)throw Error(rel);if(oldTranslation&&doc.entry.title==='Genesis'&&doc.entry.kind==='de'){doc.text[0][0]+=' [abweichende Fassung]';doc.textHash=hash(doc.text);}return doc;},
 'off:bhsaStatus':async()=>{
   const {aligned,total}=await BHSA.readBundled();
   return {ready:true,aligned,total};
 },
 'off:wordSyntax':async(_e,book,verse,position)=>{
   const macula=require('../../tanakh-syntax').wordRoles(book,verse,position);
   const bhsa=BHSA.wordContext(await BHSA.readBundled(),book,verse,position);
   return bhsa?{...macula,signature:bhsa.signature,bhsa}:macula;
 },
 'off:summary':()=>[], 'notes:list':()=>[], 'dict:list':()=>({list:[]}), 'dict:suggest':()=>({list:[]}), 'dict:syriacMentions':()=>({results:[]}),
 'interlinear:read':()=>({data:{},renderings:null}), 'links:status':()=>({ready:false,complete:false,done:[],total:0}), 'topics:status':()=>({ready:false}),
 'links:section':()=>[], 'links:texts':()=>({}), 'links:preview':()=>({missing:true}), 'topics:section':()=>[],
 'links:versification':()=>require(path.join(root,'bundled/versification.json')),
 'links:mishnahTalmud':()=>require(path.join(root,'bundled/mishnah_talmud.json')),
 'outline:get':()=>null,'dict:cites':()=>({list:[]}), 'audio:index':()=>({dir:'',files:[]}), 'audio:list':()=>({items:[]}),
 'app:calendar':()=>({today:'2026-11-17',items:[]}), 'app:checkUpdate':()=>({current:'2.5.0'}),
 'app:setLang':()=>true,'app:setTheme':()=>true,'app:startupLog':()=>true,
};
const readerExtras=require('./reader-extras.cjs')({profile,handlers});
for(const [channel,fn]of Object.entries(handlers))ipcMain.handle(channel,fn);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function js(code){try{return await win.webContents.executeJavaScript(code,true);}catch(err){throw new Error('Renderer evaluation failed: '+code,{cause:err});}}
async function waitFor(expression,label){const until=Date.now()+20000;while(Date.now()<until){if(await js(`Boolean(${expression})`))return;await pause(50);}throw Error('Zeitüberschreitung: '+label+'\n'+await js("document.querySelector('#rOut').textContent.slice(0,500)"));}
async function book(title,prefix='document'){await js(`{const d=${prefix};d.querySelectorAll('dialog[open]').forEach(n=>n.close());const a=[...d.querySelectorAll('#tree .lib-item')].find(a=>a.dataset.key.endsWith('¦'+${JSON.stringify(title)}));if(!a)throw Error('Buch fehlt');a.click();}`);}
(async()=>{
 await app.whenReady();app.dock?.hide();session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_details,cb)=>cb({cancel:true}));
 const libraryFlows=await require('./library-flows.cjs')({profile,docs,handlers});
 const dictionaryFlows=await require('./dictionary-flows.cjs')({profile});
 const researchFlows=await require('./research-flows.cjs')({profile,docs,handlers});
 win=new BrowserWindow({show:false,width:1250,height:900,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,nodeIntegrationInSubFrames:true,sandbox:false}});
 const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error'){errors.push(event.message);console.error('Renderer:',event.message)}});
 win.webContents.on('render-process-gone',(_e,d)=>{console.error(d);app.exit(1)});
 const expectedTitles=new Set([...docs.values()].map(doc=>doc.entry.title)).size;
 await win.loadFile(path.join(root,'library.html'));await waitFor(`document.querySelectorAll('#tree .lib-item').length===${expectedTitles}`,'Start');
 await book('Genesis');await waitFor("document.querySelector('#rOut .w')",'Genesis');
 if(process.env.SAFRAN_SMOKE_RESEARCH==='1'){await researchFlows({win,js,waitFor,book});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_FIELD_SIGLA==='1'){await require('./field-sigla-flows.cjs')({win,js,waitFor,book});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_PESHITTA_STATUS==='1'){
  await require('./peshitta-status-flows.cjs')({win,js,waitFor});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_EXAMPLES==='1'){await require('./syntax-examples-flows.cjs')({js,waitFor,win});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_GENNOTES==='1'){await require('./genesis-explanations-flows.cjs')({js,waitFor,book});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_PSALMNOTES==='1'){await require('./psalm-explanations-flows.cjs')({js,waitFor,book});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_HXEXPL==='1'){await require('./hexapla-explanations-flows.cjs')({js,waitFor,book});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_PSAPP==='1'){await require('./peshitta-apparatus-flows.cjs')({js,waitFor,book});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_SEARCH==='1'){await js("document.querySelector('#splitBtn').click()");await waitFor("document.querySelector('#pane2')?.contentDocument?.querySelector('#sGo')",'Suchmaske im zweiten Fenster');await libraryFlows({js,waitFor});await require('./syntax-flows.cjs')({js,waitFor});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_OUTLINES==='1'){
  await require('./outline-search-flows.cjs')({js,waitFor,book});
  await readerExtras({win,js,waitFor,book});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_SYNTAX==='1'){await require('./syntax-flows.cjs')({js,waitFor});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}

 if(process.env.SAFRAN_SMOKE_QUMRAN_ALL==='1'){await require('./qumran-all-flows.cjs')({docs,win,js,waitFor,book});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_DICT==='1'){await waitFor('window.OSHB_LEMMAS','Lemmaindex für den isolierten Wörterbuchtest');await dictionaryFlows({js,waitFor});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_WORD_DBL==='1'){await require('./word-double-click-flows.cjs')({js,waitFor,book});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_VERSIONS==='1'){
  await require('./version-menu-flows.cjs')({docs,win,js,waitFor,book});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_DOCK==='1'){
  await require('./dock-tabs-flows.cjs')({win,js,waitFor,book});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_STUDY==='1'){
  await require('./study-tools-flows.cjs')({win,js,waitFor});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_MAP==='1'){
  await require('./map-navigation-flows.cjs')({win,js,waitFor});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_ALEPPO_IL==='1'){
  await require('./aleppo-interlinear-flows.cjs')({docs,win,js,waitFor,book});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_PESHITTA==='1'){
  await require('./peshitta-flows.cjs')({profile,docs,win,js,waitFor,book});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_GREEK==='1'){
  await require('./greek-corpus-flows.cjs')({docs,win,js,waitFor,book});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_STATS==='1'){
  await require('./passage-statistics-flows.cjs')({win,js,waitFor,book});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_MISHNAH==='1'){
  await js("localStorage.setItem('uiLang','en')");
  await require('./mishnah-textcrit-flows.cjs')({docs,win,js,waitFor,book});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_CONCORDANCE==='1'){
  await require('./outline-search-flows.cjs')({js,waitFor,book});
 await require('./concordance-flows.cjs')({win,js,waitFor});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_LZ==='1'){
  await require('./textcrit-summary-flows.cjs')({win,js,waitFor,book});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_TOVDETAIL==='1'){await require('./tov-details-flows.cjs')({js,waitFor,book});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_MASEARCH==='1'){await require('./aleppo-search-flows.cjs')({js,waitFor,book});assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;}
 if(process.env.SAFRAN_SMOKE_TCSEARCH==='1'){
  await js("localStorage.setItem('uiLang','en')");await win.reload();await waitFor("document.documentElement.lang==='en'&&document.querySelector('#tree .lib-item')",'Englische Oberfläche');
  await require('./textcrit-search-flows.cjs')({js,waitFor,book});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 if(process.env.SAFRAN_SMOKE_APPARATUS==='1'){
  await require('./taamim-flows.cjs')({win,js,waitFor,book});
  await require('./textcrit-english-flows.cjs')({win,js,waitFor,book});
  assert.deepEqual(errors,[]);win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);return;
 }
 await js("document.querySelector('#rOut .w').click()");await waitFor("document.querySelector('#wpop .wseg')",'Tanach-Morphologie');await js("document.querySelector('#wpop .wx').click()");
 await js("document.querySelector('#ilBtn').click()");await waitFor("document.querySelector('#ilPop input[value=Zunz]')",'Interlinear-Auswahl');
 await js("{const c=document.querySelector('#ilPop input[value=Zunz]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#ilBtn').click();}");
 await waitFor("document.querySelector('#rOut .ilt[data-tr=Zunz]')",'Gebundener Zunz-Text');
 console.log('Electron: Tanach-Klick und geprüfter Interlinear-Quellstand bestanden.');
 await require('./interlinear-flows.cjs')({js,waitFor});
 await require('./word-double-click-flows.cjs')({js,waitFor,book});
 oldTranslation=true;await win.reload();await waitFor("document.querySelector('#rOut .il-source-warning')",'Abweichende beibehaltene Fassung');
 assert(await js("document.querySelector('#rOut').textContent.includes('[abweichende Fassung]')"));assert.equal(await js("!!document.querySelector('#rOut .ilt[data-tr=Zunz]')"),false);
 console.log('Electron: Abweichende Textfassung bleibt sichtbar, fremde Wortzuordnung unterbleibt.');
 await book('Berakhot');await waitFor("document.querySelector('#rOut .w[data-l^=\"bavli:\"]')",'Berachot-Wortmarkierungen');
 await js("document.querySelectorAll('#rOut .w')[1].click()");await waitFor("document.querySelector('#wpop .bvforms')",'Bavli-Morphologie');await js("document.querySelector('#wpop .wx').click();document.querySelector('#bavliIlBtn').click()");
 await waitFor("document.querySelector('#bavliInterlinear[open] [data-anchor=\"2a:1/2\"]')",'Wortzuordnungs-Dialog');
 await js("document.querySelector('#bavliInterlinear [data-anchor=\"2a:1/2\"]').click()");await waitFor("document.querySelector('#bavliInterlinear #wpop .bvforms')",'Karte im modalen Dialog');
 assert(await js("{const p=document.querySelector('#bavliInterlinear #wpop'),r=p.getBoundingClientRect();r.width>0&&r.height>0&&!!document.elementFromPoint(r.left+10,r.top+10)?.closest('#wpop')}"));
 await js("document.querySelector('#bavliInterlinear #wpop .bvforms').click()");await waitFor("document.querySelector('#bavliForms[open] [data-ref]')",'Belegte Formen');
 await js("document.querySelector('#bavliForms [data-ref]').click()");await waitFor("!document.querySelector('#bavliInterlinear[open]')",'Rückkehr zur Stelle');
 console.log('Electron: Bavli-Klick, sichtbare modale Karte, Formen und Stellensprung bestanden.');
 await js("document.querySelector('#splitBtn').click()");await waitFor("document.querySelector('#pane2')?.contentDocument?.querySelectorAll('#tree .lib-item').length===4",'Zweites Lesefenster');
 await book('Berakhot',"document.querySelector('#pane2').contentDocument");await waitFor("document.querySelector('#pane2').contentDocument.querySelector('#rOut .w[data-l^=\"bavli:\"]')",'Berachot im zweiten Fenster');
 await js("document.querySelector('#pane2').contentDocument.querySelectorAll('#rOut .w')[1].click()");await waitFor("document.querySelector('#pane2').contentDocument.querySelector('#wpop .bvforms')",'Wortkarte im zweiten Fenster');
 console.log('Electron: Zweites Lesefenster mit eigenständiger Wortkarte bestanden.');
 await libraryFlows({js,waitFor});
 await require('./syntax-flows.cjs')({js,waitFor});
 await require('./concordance-flows.cjs')({win,js,waitFor});
 await dictionaryFlows({js,waitFor});
 await require('./comment-flows.cjs')({docs,win,js,waitFor,book});
 await require('./display-flows.cjs')({win,js,waitFor,book});
 await require('./tab-flows.cjs')({win,js,waitFor,book});
 oldTranslation=false;await book('Genesis');
 await require('./export-flows.cjs')({profile,docs,win,js,waitFor,book});
 await readerExtras({win,js,waitFor,book});
 await require('./samaritan-flows.cjs')({docs,win,js,waitFor,book});
 await require('./textcrit-flows.cjs')({win,js,waitFor,book});
 await require('./textcrit-header-flows.cjs')({win,js,waitFor,book});
 await require('./textcrit-summary-flows.cjs')({win,js,waitFor,book});
 await require('./tov-flows.cjs')({docs,win,js,waitFor,book});
 await require('./qumran-apparatus-flows.cjs')({win,js,waitFor,book});
 await require('./kennicott-flows.cjs')({win,js,waitFor,book});
 await require('./qumran-all-flows.cjs')({docs,win,js,waitFor,book});
 await require('./kennicott-all-flows.cjs')({docs,win,js,waitFor,book});
  await require('./dock-tabs-flows.cjs')({win,js,waitFor,book});
 await require('./samaritan-interlinear-flows.cjs')({win,js,waitFor,book});
 await require('./taamim-flows.cjs')({win,js,waitFor,book});
 await require('./textcrit-english-flows.cjs')({win,js,waitFor,book});
 await require('./passage-statistics-flows.cjs')({win,js,waitFor,book});
 await require('./mishnah-textcrit-flows.cjs')({docs,win,js,waitFor,book});
 assert.deepEqual(errors,[],'Keine unbehandelten Fehler im Renderer');
 await require('./greek-corpus-flows.cjs')({docs,win,js,waitFor,book});
 assert.deepEqual(errors,[],'Keine unbehandelten Fehler nach griechischer Morphologie');
 await require('./peshitta-flows.cjs')({profile,docs,win,js,waitFor,book});
 assert.deepEqual(errors,[],'Keine unbehandelten Fehler nach Peschitta');
 await require('./map-navigation-flows.cjs')({win,js,waitFor});
 assert.deepEqual(errors,[],'Keine unbehandelten Fehler nach Karten-Navigation');
 await require('./font-restart.cjs')();
 win.destroy();await fsp.rm(profile,{recursive:true,force:true});app.exit(0);
})().catch(async err=>{console.error(err);if(win&&!win.isDestroyed())win.destroy();await fsp.rm(profile,{recursive:true,force:true}).catch(()=>{});app.exit(1)});
