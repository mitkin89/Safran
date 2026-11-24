'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const S=require('./research-store'),E=require('./research-export'),R=require('./reader'),LK=require('./links');
function register({ipcMain,getLibrary,readLegacyNotes,saveLegacyNote,dialog,BrowserWindow,winOf,tempDir,broadcast=()=>{}}){
 let current;
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
 ipcMain.handle('research:captureCommentary',async(_e,request)=>{
  const {doc,entry}=await rich(request.rel),ref=String(request.ref||''),parts=LK.splitRef(ref);
  if(parts.book!==doc.title&&parts.book!==entry.title)throw Error('Kommentar und Edition passen nicht zusammen.');
  if(parts.tail.includes('-')&&(parts.tail.split('-')[0].split(':').length!==2||parts.tail.split('-')[1].includes(':')))throw Error('Diesen Kommentarbereich bitte im Lesefenster mit ausdrücklicher Zeilenauswahl übernehmen.');
  const items=LK.resolveText(doc,parts.tail);if(!items)throw Error('Kommentarstelle fehlt in dieser Edition.');
  const c=S.metadata(doc,entry,parts.tail),body=items.map(S.plain).join('\n');
  const p=LK.parseTail(parts.tail),talmud=doc.sectionNames?.[0]==='Daf',chap=/[ab]$/.test(p.chap)?(parseInt(p.chap)-1)*2+(p.chap.endsWith('b')?1:0):(parseInt(p.chap)-1)*(talmud?2:1);
  const prefix=doc.text&&!Array.isArray(doc.text)&&typeof doc.text==='object'?['']:[];
  const wanted=[...prefix,chap,...parts.tail.split('-')[0].split(':').slice(1).map(n=>Number(n)-1)];
  const loc=R.makeLocator(doc.text,doc.sectionNames)(wanted);
  return S.block({type:'source',title:doc.title,text:body,originalText:body,citation:c,reference:{label:ref,rel:entry.rel,sectionPath:loc?.path||prefix,labels:loc?.label?[loc.label]:[],citation:c,quote:body},sourceHash:crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex'),capturedAt:new Date().toISOString()});
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
   try{win.webContents.setWindowOpenHandler(()=>({action:'deny'}));await win.loadFile(tmp);content=await win.webContents.printToPDF({pageSize:'A4',printBackground:true});}finally{win.destroy();await fs.rm(tmp,{force:true});}
  }else if(format==='html')content=html;
  await fs.writeFile(chosen.filePath,content);return {path:chosen.filePath};
 }
 ipcMain.handle('research:export',save);
 return {state,captured,store,save};
}
module.exports={register};
