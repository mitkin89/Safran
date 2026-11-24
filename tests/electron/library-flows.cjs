'use strict';
// Produktions-Renderer/Preload und echte Such-Worker/Downloadvalidierung;
// nur Katalog und Transport stammen aus lokalen, steuerbaren Testdaten.
const {ipcMain}=require('electron');
const fs=require('fs/promises'),path=require('path'),assert=require('assert/strict');
const OFF=require('../../offline');
const {SearchJobs,ownerOf,runSearchWorker,emptyResult}=require('../../search-jobs');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function until(check,label){const end=Date.now()+20000;while(Date.now()<end){if(check())return;await pause(20);}throw Error('Zeitüberschreitung: '+label);}

module.exports=async function setup({profile,docs,handlers}){
  const dir=path.join(profile,'flow-library'),searchDir=path.join(profile,'search');
  for(const [rel,doc] of docs){const file=path.join(searchDir,rel);await fs.mkdir(path.dirname(file),{recursive:true});
    // Keep audited Peshitta edition bytes intact; reader-only fixture metadata is not part of the source file.
    const raw=doc.entry.language==='Syriac'&&doc.entry.versionTitle.startsWith('ETCBC Peshitta')
      ?await fs.readFile(path.join(__dirname,'../../bundled',rel)):JSON.stringify(doc);
    await fs.writeFile(file,raw);
  }
  const entries=['UI Download A','UI Download B'].map(title=>({title,language:'English',versionTitle:'Testausgabe [de]',categories:['Test'],json_url:'https://example.invalid/sefaria-export/'+encodeURIComponent(title)+'/en/Testausgabe.json'}));
  const groups=OFF.buildGroups({books:entries}),jobs=new SearchJobs(),gates=[];
  let catalog=false,catalogError=true,searchError=false,holdSearch=false,holdDownload=false,downloadGate=null,cancelled=false,badDownload=true;
  const fetched=[],searchRequests=[];let updateChecks=0,updatedText=false;
  const lib=await new OFF.Library(dir,async url=>{
    const entry=entries.find(e=>e.json_url===url);assert(entry);fetched.push(entry.title);
    if(holdDownload){downloadGate=deferred();await downloadGate.promise;downloadGate=null;}
    if(badDownload&&entry===entries[1])return Buffer.from('<html>Keine Textdatei</html>');
    return Buffer.from(JSON.stringify({title:entry.title,language:entry.language,versionTitle:entry.versionTitle,sectionNames:['Chapter','Verse'],text:[[updatedText?'Aktualisierter Testtext.':'Heruntergeladener Testtext.']]}));
  }).load();
  const replace=(name,fn)=>{ipcMain.removeHandler(name);ipcMain.handle(name,fn);};
  replace('off:state',async e=>({...await handlers['off:state'](e),catalog:catalog?{generated_at:'2026-11-17',total:entries.length}:null}));
  replace('off:library',async e=>[...await handlers['off:library'](e),...lib.list()]);
  replace('off:read',(e,rel)=>docs.has(rel)?handlers['off:read'](e,rel):lib.read(rel));
  replace('off:summary',()=>OFF.summarize(groups));
  replace('off:catalogFetch',()=>{if(catalogError)return {error:'Katalog nicht erreichbar <Test>'};catalog=true;return {};});
  replace('off:plan',(_e,sel,opts)=>OFF.planEntries(groups,sel,opts));
  replace('off:download',async (e,sel,opts)=>{
    cancelled=false;
    return lib.downloadEntries(OFF.planEntries(groups,sel,opts).entries,{concurrency:1,isCancelled:()=>cancelled,onProgress:p=>e.senderFrame.send('off:progress',p)});
  });
  replace('off:updateCheck',()=>{
    updateChecks++;
    return updateChecks===1?{error:'Aktualisierung nicht erreichbar <Test>'}:{checked:2,changed:updateChecks===2?1:0,added:0};
  });
  replace('off:updateRun',async e=>{
    updatedText=true;
    return lib.downloadEntries([entries[0]],{force:new Set([OFF.relPathOf(entries[0])]),onProgress:p=>e.senderFrame.send('off:progress',p)});
  });
  ipcMain.on('off:cancel',()=>{cancelled=true;downloadGate?.resolve();});
  const productionSearch=require('../production-search-handler.cjs')({
    searchJobs:jobs,
    getLibrary:async()=>({dir:searchDir,entriesFor:({kinds,categories,titles})=>[...docs.values()].map(d=>d.entry)
      .filter(e=>kinds.includes(e.kind)&&require('../../search-categories').matches(e,categories,new Set(titles)))}),
  });
  replace('off:search',async (e,params)=>{
    searchRequests.push(params);
    if(process.env.SAFRAN_SMOKE_EXAMPLES==='1')return productionSearch(e,params);
    const job=jobs.begin(ownerOf(e),params.requestId);
    try{
      if(params.outline) return await runSearchWorker({
        outline:params.outline,dirs:[path.join(profile,'outlines'),path.join(__dirname,'../../outlines')],
      },job,()=>{});
      if(searchError)throw Error('Suchquelle nicht lesbar (Test)');
      if(holdSearch){e.senderFrame.send('off:searchProgress',{scanned:5,total:10,found:2,requestId:job.requestId});const gate=deferred();gates.push({job,...gate});job.stop=gate.resolve;await gate.promise;job.stop=null;}
      if(job.cancelled)return emptyResult();
      const selected=[...docs.values()].map(d=>d.entry).filter(d=>(!params.kinds?.length||params.kinds.includes(d.kind))&&(!params.titles?.length||params.titles.includes(d.title)));
      return await runSearchWorker({dir:searchDir,entries:selected,params,cacheDir:null},job,p=>{if(jobs.current(job))e.senderFrame.send('off:searchProgress',{...p,requestId:job.requestId});});
    }finally{jobs.finish(job);}
  });
  ipcMain.on('off:cancelSearch',(e,id)=>jobs.cancel(ownerOf(e),id));

  return async function run({js,waitFor}){
    const pane="document.querySelector('#pane2').contentDocument";
    const search=async (doc='document')=>js(`{const d=${doc};d.querySelectorAll('dialog[open]').forEach(n=>n.close());d.querySelector('nav [data-tab=search]').click();d.querySelector('#sTextTab').click();d.querySelector('#sq').value='Gott';d.querySelector('#sq').dispatchEvent(new Event('input',{bubbles:true}));d.querySelector('#sLang').value='de';d.querySelector('#sLang').dispatchEvent(new Event('change',{bubbles:true}));d.querySelector('#sGo').click();}`);
    await search();
    await waitFor("document.querySelector('#sOut .sres mark') && document.querySelector('#sGo').textContent==='Suchen'",'Echte Suchtreffer');
    const marked=await js("document.querySelector('#sOut .sres mark').textContent");
    assert(/gott/i.test(marked),'Markierter Suchtreffer: '+marked);
    await js("document.querySelector('#sStar').click()");
    assert((await js("document.querySelector('#sFavL').textContent")).includes('Gott'));
    await js("document.querySelector('#sSum .chip[data-t=Genesis]').click()");
    await waitFor("document.querySelector('#sSum .chip[data-t=\"\"]') && document.querySelector('#sGo').textContent==='Suchen'",'Einzelbuch aus Suchtreffern');
    const beforeRestore=searchRequests.length;
    await js("document.querySelector('#sSum .chip[data-t=\"\"]').click()");
    await waitFor("document.querySelector('#sSum .chip[data-t=Genesis]') && document.querySelector('#sSum .chip[data-t=Exodus]')",'Zurück zu allen Büchern');
    assert.equal(searchRequests.length,beforeRestore,'Vollständige Übersicht wird ohne erneute Suche wiederverwendet');
    await js("document.querySelector('#sOut .sres').click()");
    await waitFor("document.documentElement.dataset.tab==='read' && document.querySelector('#rTitle').textContent.includes('Genesis') && document.querySelector('#rOut .row.hit')",'Suchtreffer öffnet markierten Vers');
    await js("document.querySelector('#bookSearch').click()");
    await waitFor("document.querySelector('#sOut .sres') && document.querySelector('#sGo').textContent==='Suchen'",'Nur im gelesenen Buch suchen');
    assert.deepEqual(searchRequests.at(-1).titles,['Genesis']);
    assert.equal(await js("document.querySelector('#sCatTree input[data-st=Genesis]').checked"),true);
    assert.equal(await js("document.querySelector('#sCatTree input[data-st=Exodus]').checked"),false);
    await js("document.querySelector('#sCatAll').click()");
    console.log('Electron: Suchmodul mit Favoriten, Einzelbuch-Rücksprung und Suche im gelesenen Buch bestanden.');
    console.log('Electron: Echte Such-Worker, Treffermarkierung und Sprung zum Vers bestanden.');

    await js("document.querySelector('#sSyntaxTab').click();document.querySelector('[data-syntax-kind=clause]').click()");
    await waitFor("!document.querySelector('#sxBhsa').hidden", 'Mitgelieferte BHSA-Filter');
    await js(`{
      document.querySelector('#sxFilters').open = true;
      document.querySelector('#sxgStem').value = 'q';
      document.querySelector('#sxVerb').value = 'ברא';
      document.querySelector('#sxSubject').value = 'אלהים';
      document.querySelector('#sxGo').click();
    }`);
    await waitFor("document.querySelector('#sOut .sres bdi') && document.querySelector('#sxGo').textContent==='Suchen'",'Syntaktische Suche im Pentateuch');
    assert.deepEqual(searchRequests.at(-1).syntax,{verb:'ברא',subject:'אלהים',object:'',referents:false,domain:'',relation:''});
    assert.equal(searchRequests.at(-1).gram.stem, 'q');
    assert.deepEqual(await js("Array.from(document.querySelectorAll('#sOut .sres:first-child mark'), el => el.textContent)"),['ברא','אלהים']);
    assert((await js("document.querySelector('#sOut .sres').textContent")).includes('Subjekt'));
    console.log('Electron: Syntaktische Suche mit markiertem Verb und Subjekt bestanden.');

    await js(`document.querySelector('#sOut .sres').click();
      const stem = document.querySelector('#sxgStem');
      stem.value = '';
      stem.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('#sxFilters').open = false;`);
    await waitFor("document.querySelector('#rOut .row[data-l=\"5\"] .cell[data-mt] .w')",'Westminster im Leser');
    await js(`document.querySelectorAll('#rOut .row[data-l="5"] .cell[data-mt] .w[data-m]')[5].click()`);
    await waitFor("document.querySelector('#wpop .macula-target') && document.querySelector('#rOut .macula-mark')",'MACULA-Satzrolle im Wort-Popup');
    await js("document.querySelector('#wpop .macula-target').click()");
    await waitFor("document.querySelector('#rOut .macula-mark')?.textContent.replace(/[^א-ת]/g,'')==='אלהים'",'MACULA-Bezugswort nach Sprung');
    await js(`document.querySelectorAll('#rOut .row[data-l="5"] .cell[data-mt] .w[data-m]')[5].click()`);
    await waitFor("document.querySelector('#wpop .wcard')",'Wort-Popup nach Sprung');
    await js("document.querySelector('#wpop .wcard').click()");
    await waitFor("document.querySelector('#wcBody .macula-roles')",'MACULA-Satzrolle in der Wortkarte');
    await js("document.querySelector('#formsPanel').hidden=true");
    console.log('Electron: MACULA-Wortklick, Bezugswortmarkierung und Wortkarte bestanden.');



    holdSearch=true;await search();await search(pane);
    await until(()=>gates.length===2,'Zwei unabhängige Suchaufträge');
    assert.notEqual(gates[0].job.owner,gates[1].job.owner);
    await waitFor("!document.querySelector('#sProgress').hidden && document.querySelector('#sProgressBar').value===5 && document.querySelector('#sProgressBar').max===10 && document.querySelector('#sProgressLabel').textContent.includes('50 %')",'Suchfortschritt mit echtem IPC');
    await js("document.querySelector('#sGo').click()");
    await waitFor("document.querySelector('#sInfo').textContent.includes('abgebrochen') && document.querySelector('#sGo').textContent==='Suchen'",'Suchabbruch im ersten Fenster');
    assert.equal(gates[1].job.cancelled,false);
    assert(await js("document.querySelector('#sProgress').hidden"),'Abgebrochene Suche blendet Fortschrittsbalken aus');
    assert(await js(`${pane}.querySelector('#sProgress').hidden===false`),'Zweites Fenster behält eigenen Fortschrittsbalken');
    assert.equal(await js(`${pane}.querySelector('#sGo').textContent`),'Abbrechen');
    gates[1].resolve();holdSearch=false;
    await waitFor(`${pane}.querySelector('#sOut .sres mark') && ${pane}.querySelector('#sGo').textContent==='Suchen'`,'Zweites Fenster beendet eigene Suche');
    assert.equal(jobs.jobs.size,0);
    searchError=true;await search();
    await waitFor("document.querySelector('#sInfo').textContent==='Die Suche ist fehlgeschlagen.' && document.querySelector('#sGo').textContent==='Suchen'",'Suchfehler gibt Oberfläche frei');
    assert(await js("document.querySelector('#sProgress').hidden"),'Fehler blendet Fortschrittsbalken aus');
    searchError=false;await search();
    await waitFor("document.querySelector('#sOut .sres') && document.querySelector('#sGo').textContent==='Suchen'",'Erneute Suche nach Fehler');
    console.log('Electron: Suchabbruch pro Fenster, Fehleranzeige und erneute Suche bestanden.');

    await js("document.querySelector('#moreMenu').open=true;document.querySelector('#goGet').click();document.querySelector('#catFetch').click()");
    await waitFor("document.querySelector('#catStatus .err') && !document.querySelector('#catFetch').disabled",'Katalogfehler');
    assert.equal(await js("document.querySelector('#catStatus .err').textContent"),'Katalog nicht erreichbar <Test>');
    assert.equal(await js("!!document.querySelector('#catStatus test')"),false);
    catalogError=false;await js("document.querySelector('#catFetch').click()");
    await waitFor("!document.querySelector('#pickCard').hidden && document.querySelector('#picker input[data-id]')",'Katalog erneut laden');
    await js("document.querySelector('#pickFilter').value='Download A';document.querySelector('#pickFilter').dispatchEvent(new Event('input',{bubbles:true}))");
    await waitFor("!document.querySelector('#flat').hidden && document.querySelectorAll('#flat input[data-id]').length===1",'Downloadtitel filtern');
    await js("document.querySelector('#pickAllHits').click()");
    await waitFor("!document.querySelector('#dGo').disabled",'Downloadplan');
    holdDownload=true;await js("document.querySelector('#dGo').click()");await until(()=>downloadGate,'Laufender Download');
    await js("document.querySelector('#dCancel').click()");
    await waitFor("document.querySelector('#dInfo').textContent.startsWith('Abgebrochen') && !document.querySelector('#dGo').disabled && document.querySelector('#dCancel').disabled",'Downloadabbruch');
    assert.equal(lib.list().length,0);await assert.rejects(fs.access(path.join(dir,OFF.relPathOf(entries[0]))));
    holdDownload=false;await js("document.querySelector('#pickAll').click()");
    await waitFor("document.querySelector('#planInfo').textContent.includes('2 Dateien')",'Zwei Dateien ausgewählt');
    await js("document.querySelector('#dGo').click()");
    await waitFor("document.querySelector('#dInfo').textContent.startsWith('Fertig') && document.querySelector('#dWarn .err')",'Ungültige Downloadantwort angezeigt');
    assert.equal(lib.list().length,1);
    await assert.rejects(fs.access(path.join(dir,OFF.relPathOf(entries[1]))));
    assert((await js("document.querySelector('#dWarn').textContent")).includes(entries[1].title));
    const previous=await fs.readFile(path.join(dir,OFF.relPathOf(entries[0]))),timesA=fetched.filter(t=>t===entries[0].title).length;
    badDownload=false;await js("document.querySelector('#dGo').click()");
    await waitFor("document.querySelector('#dInfo').textContent.startsWith('Fertig') && !document.querySelector('#dGo').disabled && document.querySelector('#dWarn').textContent===''",'Fehlenden Download erneut laden');
    assert.equal(lib.list().length,2);assert.equal(fetched.filter(t=>t===entries[0].title).length,timesA);
    assert.deepEqual(await fs.readFile(path.join(dir,OFF.relPathOf(entries[0]))),previous);
    await waitFor("[...document.querySelectorAll('#tree .lib-item')].some(n=>n.textContent.includes('UI Download B'))",'Neue Texte in Bibliotheksliste');
    console.log('Electron: Katalogfehler, Downloadabbruch, JSON-Prüfung und Wiederaufnahme ohne erneuten Abruf gültiger Dateien bestanden.');
    await js("document.querySelector('#uCheck').click()");
    await waitFor("document.querySelector('#uInfo .err') && !document.querySelector('#uCheck').disabled",'Update-Prüfung mit Fehler');
    assert.equal(await js("document.querySelector('#uInfo .err').textContent"),'Aktualisierung nicht erreichbar <Test>');
    assert.equal(await js("!!document.querySelector('#uInfo test')"),false);
    await js("document.querySelector('#uCheck').click()");
    await waitFor("!document.querySelector('#uRun').hidden && document.querySelector('#uInfo').textContent.includes('1 geändert')",'Update-Angebot');
    await js("document.querySelector('#uRun').click()");
    await waitFor("document.querySelector('#uInfo').textContent.startsWith('Fertig: 1 Dateien') && !document.querySelector('#uCheck').disabled && document.querySelector('#uRun').hidden && document.querySelector('#uProg').hidden",'Aktualisierung abgeschlossen');
    assert.equal((await lib.read(OFF.relPathOf(entries[0]))).text[0][0],'Aktualisierter Testtext.');
    await js("document.querySelector('#uCheck').click()");
    await waitFor("document.querySelector('#uInfo').textContent.startsWith('Alles aktuell') && document.querySelector('#uRun').hidden",'Keine weiteren Aktualisierungen');
    console.log('Electron: Download-Titelfilter sowie Update-Fehler, Wiederholung und aktualisierte Textdatei bestanden.');
  };
};
