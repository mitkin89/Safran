'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const S=require('./research-store'),E=require('./research-export'),R=require('./reader'),LK=require('./links');
const Sources=require('./research-sources'),{SearchJobs,ownerOf,runSearchWorker}=require('./search-jobs');
function register({ipcMain,getLibrary,readLegacyNotes,saveLegacyNote,dialog,BrowserWindow,winOf,tempDir,commentaryLinks=async()=>[],privateInterlinearRead=async()=>null,broadcast=()=>{}}){
 let current;const sourceJobs=new SearchJobs();
 async function store(){const lib=await getLibrary();if(!current||current.dir!==lib.dir)current={dir:lib.dir,store:new S.ResearchStore(lib.dir)};return current.store;}
 async function state(){const data=await(await store()).read();try{return {...data,legacyNotes:(await readLegacyNotes()).map(n=>({...n,refs:S.legacyRefs(n)}))};}catch(e){return {...data,legacyNotes:[],legacyError:e.message};}}
 async function rich(rel){const lib=await getLibrary(),entry=lib.index.entries[rel];if(!entry)throw Error('Diese Edition ist nicht in der Bibliothek.');const doc=await lib.read(rel);const raw=JSON.parse(await fs.readFile(path.join(lib.dir,rel),'utf8'));return {doc:{...doc,translator:raw.translator||raw.versionTranslator,editor:raw.editor,publisher:raw.publisher,year:raw.year},entry};}
 async function captured(request,cache){
  let pair=cache?.get(request.rel);if(!pair){pair=await rich(request.rel);cache?.set(request.rel,pair);}
  const {doc,entry}=pair;let req=request;
  if(request.hitPath){const loc=R.makeLocator(doc.text,doc.sectionNames)(request.hitPath);if(!loc)throw Error('Fundstelle fehlt in dieser Edition.');req={...request,sectionPath:loc.path,labels:[loc.label]};}
  return S.capture(doc,entry,req,doc.textHash);
 }
 ipcMain.handle('research:state',state);
 ipcMain.handle('research:sheetPreview',async(_e,sheet)=>{const data=await state();return E.html(S.entity('sheets',sheet),[...data.notes,...data.legacyNotes]);});
 ipcMain.handle('research:put',async(_e,kind,record,version)=>{
  if(!['projects','sheets','collections','notes'].includes(kind))throw Error('Unbekannter Datentyp.');
  await(await store()).put(kind,record,version);broadcast();return state();
 });
 ipcMain.handle('research:remove',async(_e,kind,id,version)=>{await(await store()).remove(kind,id,version);broadcast();return state();});
 ipcMain.handle('research:legacyNote',async(_e,input,expectedTs)=>{
  const notes=await readLegacyNotes(),old=notes.find(n=>n.id===input.id);if(!old)throw Error('Notiz nicht gefunden.');
  if((old.ts||0)!==expectedTs)throw Error('Notiz inzwischen geändert. Bitte neu laden.');
  const projects=(await(await store()).read()).projects;if(input.projectId&&!projects.some(p=>p.id===input.projectId))throw Error('Projekt fehlt.');
  const patch={title:String(input.title||old.title||''),note:String(input.note||''),tags:S.note({...input,projectId:input.projectId||'unassigned'}).tags,topics:S.note({...input,projectId:input.projectId||'unassigned'}).topics,refs:(input.refs||[]).map(S.reference),projectId:input.projectId||''};
  await saveLegacyNote(old.id,patch,expectedTs);broadcast();return state();
 });
 ipcMain.handle('research:sections',async(_e,rel)=>{const {doc,entry}=await rich(rel);return {sections:R.sectionsOf(doc.text,doc.sectionNames).map(s=>({path:s.path,label:s.label})),citation:S.metadata(doc,entry,'')};});
 ipcMain.handle('research:capture',(_e,request)=>captured(request));
 ipcMain.handle('research:workEditions',async(_e,reference)=>{const {entry}=await rich(reference.rel);return Sources.editions(Object.values((await getLibrary()).index.entries),entry.title);});
 ipcMain.handle('research:sourceEditionPreview',(_e,request)=>require('./research-translations').editionPreview(request,rich));
 ipcMain.handle('research:translationEditions',async(_e,reference)=>{
  const {entry}=await rich(reference.rel),editions=Sources.editions(Object.values((await getLibrary()).index.entries),entry.title).filter(e=>e.rel!==entry.rel);
  if(editions.some(e=>require('./private-interlinear').VERSION.test(e.versionTitle))||require('./private-interlinear').VERSION.test(entry.versionTitle||'')){
   const local=await privateInterlinearRead(),verses=local?.data?.BuberRosenzweig?.[entry.title];
   if(verses&&reference.sectionPath?.length===1&&reference.labels?.length&&reference.labels.every(v=>verses[(reference.sectionPath[0]+1)+':'+v]))for(const e of editions)if(require('./private-interlinear').VERSION.test(e.versionTitle)||/^Westminster/.test(e.versionTitle))e.interlinear=true;
  }return editions;
 });
 ipcMain.handle('research:translationPreview',(_e,request)=>require('./research-translations').prepare(request,rich,privateInterlinearRead));
 ipcMain.handle('research:suggestWorks',async(_e,query)=>Sources.suggest(query,Object.values((await getLibrary()).index.entries)));
 ipcMain.handle('research:sourceEditions',async(_e,query)=>{
  const lib=await getLibrary(),entries=Object.values(lib.index.entries),ref=Sources.parse(query,entries);
  return {reference:ref,editions:Sources.editions(entries,ref.title)};
 });
 ipcMain.handle('research:sourcePreview',async(_e,request)=>{
  const lib=await getLibrary(),ref=Sources.parse(request.query,Object.values(lib.index.entries)),{doc,entry}=await rich(request.rel);
  if(entry.title!==ref.title)throw Error('Die gewählte Edition gehört nicht zu diesem Werk.');
  return Sources.plans(doc,ref).map(req=>S.capture(doc,entry,req,doc.textHash));
 });
 ipcMain.handle('research:cancelSourceSearch',(e,id)=>{sourceJobs.cancel(ownerOf(e),id);return true;});
 ipcMain.handle('research:searchSources',async(e,request)=>{
  if(typeof request.query!=='string'||request.query.trim().length<2||request.query.length>500)throw Error('Bitte mindestens zwei Zeichen als Suchtext eingeben.');
  const lib=await getLibrary(),entries=Object.values(lib.index.entries).filter(e=>
   (!request.language||e.language===request.language)&&(!request.comments||(e.categories||[]).some(c=>/commentary|kommentar/i.test(c))));
  const job=sourceJobs.begin(ownerOf(e),request.requestId),timer=setTimeout(()=>sourceJobs.cancel(job.owner,job.requestId),30000);
  try{
   const res=await runSearchWorker({dir:lib.dir,entries,params:{query:request.query.trim(),limit:40,perFile:5,countAll:false,parse:false},cacheDir:null},job,()=>{});
   return {results:res.results.map(h=>({rel:h.rel,title:h.title,versionTitle:h.versionTitle,where:h.where,path:h.path,snippet:(h.snippet?.before||'')+(h.snippet?.hit||'')+(h.snippet?.after||'')})),cancelled:res.cancelled,limited:res.truncated||res.capped,scanned:res.scanned,total:res.total};
  }finally{clearTimeout(timer);sourceJobs.finish(job);}
 });

 async function commentaryCapture(request,cache){
  let pair=cache?.get(request.rel);if(!pair){pair=await rich(request.rel);cache?.set(request.rel,pair);}const {doc,entry}=pair,ref=String(request.ref||''),parts=LK.splitRef(ref);
  let sourceDoc=doc,node='';if(parts.book!==doc.title&&parts.book!==entry.title){const prefix=entry.title+', ';node=parts.book.startsWith(prefix)?parts.book.slice(prefix.length):'';if(!node||!doc.text||!Object.hasOwn(doc.text,node))throw Error('Kommentar und Edition passen nicht zusammen.');sourceDoc={...doc,text:doc.text[node]};}
  if(parts.tail.includes('-')&&(parts.tail.split('-')[0].split(':').length!==2||parts.tail.split('-')[1].includes(':')))throw Error('Diesen Kommentarbereich bitte im Lesefenster mit ausdrücklicher Zeilenauswahl übernehmen.');
  const items=LK.resolveText(sourceDoc,parts.tail);if(!items)throw Error('Kommentarstelle fehlt in dieser Edition.');
  const c=S.metadata(doc,entry,[node,parts.tail].filter(Boolean).join(' · ')),body=items.map(S.plain).join('\n');
  const p=LK.parseTail(parts.tail),talmud=doc.sectionNames?.[0]==='Daf',chap=/[ab]$/.test(p.chap)?(parseInt(p.chap)-1)*2+(p.chap.endsWith('b')?1:0):(parseInt(p.chap)-1)*(talmud?2:1);
  const prefix=[...(node?[node]:[]),...(sourceDoc.text&&!Array.isArray(sourceDoc.text)&&typeof sourceDoc.text==='object'?['']:[])];
  const wanted=[...prefix,chap,...parts.tail.split('-')[0].split(':').slice(1).map(n=>Number(n)-1)];
  const loc=R.makeLocator(doc.text,doc.sectionNames)(wanted);
  return S.block({type:'source',title:doc.title,text:body,originalText:body,citation:c,reference:{label:ref,rel:entry.rel,sectionPath:loc?.path||prefix,labels:loc?.label?[loc.label]:[],citation:c,quote:body},sourceHash:doc.textHash||crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex'),capturedAt:new Date().toISOString()});
 }
 ipcMain.handle('research:captureCommentary',(_e,request)=>commentaryCapture(request));
 ipcMain.handle('research:relatedComments',async(_e,reference,options={})=>{
  const query=String(options.query||'').trim().toLowerCase(),language=String(options.language||'');if(query.length>200||language.length>100)throw Error('Bitte einen kurzen Kommentarfilter eingeben.');
  const {doc,entry}=await rich(reference.rel),C=require('./research-comments'),where=C.targets(doc,entry,reference),refs=new Set();
  for(const section of where.sections){const links=await commentaryLinks(where.book,section.chapter);for(const l of links)if(C.overlaps(l,section.verses))refs.add(l.other);}
  const resultLimit=query||language?2000:200;
  const lib=await getLibrary(),entries=Object.values(lib.index.entries),items=[],available=[],cache=new Map();let limited=false,unavailable=0;
  for(const ref of refs){const book=LK.splitRef(ref).book,candidates=entries.filter(e=>e.title===book||book.startsWith(e.title+', '));
   const exact=candidates.filter(e=>e.title===book),picked=exact.length?exact:candidates.filter(e=>e.title.length===Math.max(...candidates.map(e=>e.title.length)));
   if(!picked.length){unavailable++;continue;}
   for(const entry of picked)available.push({ref,e:{...entry,language:Sources.language(entry)}});
  }
  for(const {ref,e}of available){if(language&&e.language!==language||query&&![ref,e.title,e.versionTitle].join(' ').toLowerCase().includes(query))continue;if(items.length>=resultLimit){limited=true;break;}try{const block=await commentaryCapture({ref,rel:e.rel},cache);items.push({ref,title:e.title,rel:e.rel,edition:e.versionTitle,language:e.language,block});}catch(err){items.push({ref,title:e.title,rel:e.rel,edition:e.versionTitle,language:e.language,error:err.message});}}
  return {items,limited,limit:resultLimit,unavailable,languages:[...new Set(available.map(x=>x.e.language).filter(Boolean))].sort(),warnings:where.warnings};
 });


 ipcMain.handle('research:captureHits',async(_e,request)=>{
  if(!Array.isArray(request.hits)||request.hits.length>200)throw Error('Höchstens 200 gespeicherte Suchtreffer pro Übernahme.');
  const items=[],cache=new Map();for(const h of request.hits){
   const b=await captured({rel:h.rel,hitPath:h.path,includeFootnotes:true},cache);b.search={query:String(request.query||''),capturedAt:new Date().toISOString(),complete:request.complete===true};items.push(b);
  }return items;
 });
 ipcMain.handle('research:import',async e=>{
  const r=await dialog.showOpenDialog(winOf(e),{properties:['openFile'],filters:[{name:'Safran-Projektpaket',extensions:['json']}]});if(r.canceled||!r.filePaths[0])return {cancelled:true};
  const st=await fs.stat(r.filePaths[0]);if(st.size>S.MAX_BYTES)throw Error('Projektpaket ist zu groß.');const raw=JSON.parse(await fs.readFile(r.filePaths[0],'utf8'));
  await(await store()).importBundle(raw);broadcast();return {state:await state()};
 });
 async function save(e,request){
  const data=await state(),project=data.projects.find(p=>p.id===request.projectId);if(!project)throw Error('Projekt fehlt.');
  const allNotes=[...data.notes,...data.legacyNotes],format=request.format;
  let name=project.title,content,html,sheet;
  if(request.kind==='sheet'){
   sheet=data.sheets.find(s=>s.id===request.id&&s.projectId===project.id);if(!sheet)throw Error('Quellenblatt fehlt.');name=sheet.title;
   if(!['pdf','docx','html'].includes(format))throw Error('Unbekanntes Exportformat.');
   if(format==='docx')content=E.docx(sheet,allNotes);else html=E.html(sheet,allNotes);
  }else{
   const bundle=S.bundleProject(data,project.id,data.legacyNotes);
   if(format==='json')content=JSON.stringify(bundle,null,2);
   else if(format==='jsonld')content=JSON.stringify(S.annotations(bundle.notes),null,2);
   else if(format==='csv')content=S.csv([...bundle.sheets.flatMap(s=>s.blocks),...bundle.collections.flatMap(c=>c.items),...bundle.notes]);
   else throw Error('Unbekanntes Datenformat.');
  }
  const ext=format==='jsonld'?'jsonld':format,filename=String(name||'Recherche').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_')+'.'+ext;
  const chosen=await dialog.showSaveDialog(winOf(e),{defaultPath:filename,filters:[{name:format.toUpperCase(),extensions:[ext]}]});if(chosen.canceled||!chosen.filePath)return {cancelled:true};
  if(format==='pdf'){
   const tmp=path.join(tempDir(),'safran-sheet-'+crypto.randomUUID()+'.html');await fs.writeFile(tmp,html,'utf8');
   const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,javascript:false}});
   try{win.webContents.setWindowOpenHandler(()=>({action:'deny'}));await win.loadFile(tmp);content=await win.webContents.printToPDF({pageSize:'A4',landscape:sheet.layout?.orientation==='landscape',preferCSSPageSize:true,printBackground:true});}finally{win.destroy();await fs.rm(tmp,{force:true});}
  }else if(format==='html')content=html;
  await fs.writeFile(chosen.filePath,content);return {path:chosen.filePath};
 }
 ipcMain.handle('research:export',save);
 return {state,captured,store,save};
}
module.exports={register};
