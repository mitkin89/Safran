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
  for(const [rel,doc] of docs){const file=path.join(searchDir,rel);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(doc));}
  const entries=['UI Download A','UI Download B'].map(title=>({title,language:'English',versionTitle:'Testausgabe [de]',categories:['Test'],json_url:'https://example.invalid/sefaria-export/'+encodeURIComponent(title)+'/en/Testausgabe.json'}));
  const groups=OFF.buildGroups({books:entries}),jobs=new SearchJobs(),gates=[];
  let catalog=false,catalogError=true,searchError=false,holdSearch=false,holdDownload=false,downloadGate=null,cancelled=false,badDownload=true;
  const fetched=[];
  const lib=await new OFF.Library(dir,async url=>{
    const entry=entries.find(e=>e.json_url===url);assert(entry);fetched.push(entry.title);
    if(holdDownload){downloadGate=deferred();await downloadGate.promise;downloadGate=null;}
    if(badDownload&&entry===entries[1])return Buffer.from('<html>Keine Textdatei</html>');
    return Buffer.from(JSON.stringify({title:entry.title,language:entry.language,versionTitle:entry.versionTitle,sectionNames:['Chapter','Verse'],text:[['Heruntergeladener Testtext.']]}));
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
  ipcMain.on('off:cancel',()=>{cancelled=true;downloadGate?.resolve();});
  replace('off:search',async (e,params)=>{
    const job=jobs.begin(ownerOf(e),params.requestId);
    try{
      if(searchError)throw Error('Suchquelle nicht lesbar (Test)');
      if(holdSearch){const gate=deferred();gates.push({job,...gate});job.stop=gate.resolve;await gate.promise;job.stop=null;}
      if(job.cancelled)return emptyResult();
      const selected=[...docs.values()].map(d=>d.entry).filter(d=>(!params.kinds?.length||params.kinds.includes(d.kind))&&(!params.titles?.length||params.titles.includes(d.title)));
      return await runSearchWorker({dir:searchDir,entries:selected,params,cacheDir:null},job,p=>{if(jobs.current(job))e.senderFrame.send('off:searchProgress',{...p,requestId:job.requestId});});
    }finally{jobs.finish(job);}
  });
  ipcMain.on('off:cancelSearch',(e,id)=>jobs.cancel(ownerOf(e),id));

  return async function run({js,waitFor}){
    const pane="document.querySelector('#pane2').contentDocument";
    const search=async (doc='document')=>js(`{const d=${doc};d.querySelectorAll('dialog[open]').forEach(n=>n.close());d.querySelector('nav [data-tab=search]').click();d.querySelector('#sq').value='Gott';d.querySelector('#sq').dispatchEvent(new Event('input',{bubbles:true}));d.querySelector('#sLang').value='de';d.querySelector('#sLang').dispatchEvent(new Event('change',{bubbles:true}));d.querySelector('#sGo').click();}`);
    await search();
    await waitFor("document.querySelector('#sOut .sres mark') && document.querySelector('#sGo').textContent==='Suchen'",'Echte Suchtreffer');
    const marked=await js("document.querySelector('#sOut .sres mark').textContent");
    assert(/gott/i.test(marked),'Markierter Suchtreffer: '+marked);
    await js("document.querySelector('#sOut .sres').click()");
    await waitFor("document.documentElement.dataset.tab==='read' && document.querySelector('#rTitle').textContent.includes('Genesis') && document.querySelector('#rOut .row.hit')",'Suchtreffer öffnet markierten Vers');
    console.log('Electron: Echte Such-Worker, Treffermarkierung und Sprung zum Vers bestanden.');

    holdSearch=true;await search();await search(pane);
    await until(()=>gates.length===2,'Zwei unabhängige Suchaufträge');
    assert.notEqual(gates[0].job.owner,gates[1].job.owner);
    await js("document.querySelector('#sGo').click()");
    await waitFor("document.querySelector('#sInfo').textContent.includes('abgebrochen') && document.querySelector('#sGo').textContent==='Suchen'",'Suchabbruch im ersten Fenster');
    assert.equal(gates[1].job.cancelled,false);
    assert.equal(await js(`${pane}.querySelector('#sGo').textContent`),'Abbrechen');
    gates[1].resolve();holdSearch=false;
    await waitFor(`${pane}.querySelector('#sOut .sres mark') && ${pane}.querySelector('#sGo').textContent==='Suchen'`,'Zweites Fenster beendet eigene Suche');
    assert.equal(jobs.jobs.size,0);
    searchError=true;await search();
    await waitFor("document.querySelector('#sInfo').textContent==='Die Suche ist fehlgeschlagen.' && document.querySelector('#sGo').textContent==='Suchen'",'Suchfehler gibt Oberfläche frei');
    searchError=false;await search();
    await waitFor("document.querySelector('#sOut .sres') && document.querySelector('#sGo').textContent==='Suchen'",'Erneute Suche nach Fehler');
    console.log('Electron: Suchabbruch pro Fenster, Fehleranzeige und erneute Suche bestanden.');

    await js("document.querySelector('#moreMenu').open=true;document.querySelector('#goGet').click();document.querySelector('#catFetch').click()");
    await waitFor("document.querySelector('#catStatus .err') && !document.querySelector('#catFetch').disabled",'Katalogfehler');
    assert.equal(await js("document.querySelector('#catStatus .err').textContent"),'Katalog nicht erreichbar <Test>');
    assert.equal(await js("!!document.querySelector('#catStatus test')"),false);
    catalogError=false;await js("document.querySelector('#catFetch').click()");
    await waitFor("!document.querySelector('#pickCard').hidden && document.querySelector('#picker input[data-id]')",'Katalog erneut laden');
    await js("{const d=document.querySelector('#picker input[data-id=\"0\"]');d.checked=true;d.dispatchEvent(new Event('change',{bubbles:true}));}");
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
  };
};
