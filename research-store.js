'use strict';
// Local research records. Source snapshots never change the library editions.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const R=require('./reader'),Layout=require('./research-layout'),Editions=require('./research-editions');
const MAX_BYTES=32*1024*1024,MAX_RECORDS=10000;
const clone=x=>structuredClone(x),uid=()=>crypto.randomUUID(),now=()=>new Date().toISOString();
function text(v,max=2000000){if(v==null)return '';if(typeof v!=='string'||v.length>max)throw Error('Text fehlt oder ist zu lang.');return v;}
const id=v=>{if(typeof v!=='string'||!v||v.length>250)throw Error('Ungültige Kennung.');return v;};
const tags=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>text(x,200).trim()).filter(Boolean))].slice(0,100);
function citation(c={}){return Object.fromEntries(['work','edition','translator','editor','publisher','year','locator','url','language'].map(k=>[k,text(c[k],20000)]));}
function reference(r){if(typeof r==='string')r={label:r};if(!r||typeof r!=='object')throw Error('Ungültige Quellenverknüpfung.');return {label:text(r.label,20000),key:text(r.key,20000),rel:text(r.rel,20000),quote:text(r.quote),citation:citation(r.citation),sectionPath:Array.isArray(r.sectionPath)?r.sectionPath.map(p=>typeof p==='number'&&Number.isInteger(p)&&p>=0?p:text(p,1000)):[],labels:(Array.isArray(r.labels)?r.labels:[]).map(x=>text(String(x),1000))};}
function legacyRefs(n){
 if(Array.isArray(n.refs))return n.refs;
 if(!n.key&&!n.secLabel&&!n.excerpt)return [];
 let sectionPath=[];try{const p=JSON.parse(n.sk);if(Array.isArray(p))sectionPath=p;}catch{}
 return [reference({label:[n.title,n.secLabel,n.row].filter(Boolean).join(' · '),key:n.key||'',sectionPath,labels:n.row?[String(n.row)]:[],quote:n.excerpt||''})];
}
function block(b){return cleanBlock(b,false);}
function cleanBlock(b,paired=false){
 if(!b||!['source','text','heading','note'].includes(b.type))throw Error('Unbekannter Quellenblatt-Baustein.');
 return {id:id(b.id||uid()),type:b.type,region:Layout.regions.includes(b.region)?b.region:'main',title:text(b.title,20000),text:text(b.text),originalText:text(b.originalText??b.text),
  citation:citation(b.citation),reference:b.reference?reference(b.reference):null,sourceHash:text(b.sourceHash,128),capturedAt:text(b.capturedAt,100),
  presentation:!paired&&b.presentation?presentation(b.presentation):null,
  noteId:b.noteId?id(b.noteId):'',noteSnapshot:b.noteSnapshot?note(b.noteSnapshot):null,
  search:b.search?{query:text(b.search.query,20000),capturedAt:text(b.search.capturedAt,100),complete:b.search.complete===true}:null};
}
function presentation(p,nested=false){
 if(p.additional!==undefined&&(!Array.isArray(p.additional)||p.additional.length>7||nested&&p.additional.length))throw Error('Höchstens 8 Übersetzungen ohne Verschachtelung auswählen.');
 const additional=(p.additional||[]).map(x=>presentation(x,true));
 if(additional.some(x=>x.mode!==p.mode))throw Error('Übersetzungsanzeigen müssen denselben Modus verwenden.');
 const rels=[p.companion?.reference?.rel,...additional.map(x=>x.companion.reference?.rel)];if(new Set(rels).size!==rels.length)throw Error('Übersetzungsausgaben dürfen nicht doppelt vorkommen.');
 if(!['parallel','interlinear'].includes(p.mode)||!Array.isArray(p.rows)||!p.rows.length||p.rows.length>200||!Array.isArray(p.references)||p.references.length>400)throw Error('Ungültige Übersetzungsanzeige.');
 if(additional.some(x=>x.rows.length!==p.rows.length||x.rows.some((r,i)=>r.label!==p.rows[i].label||r.key!==p.rows[i].key||r.original!==p.rows[i].original)))throw Error('Übersetzungszeilen passen nicht zum selben Originaltext.');
 const companion=cleanBlock(p.companion,true);if(companion.type!=='source')throw Error('Übersetzungsquelle fehlt.');
 return {...(additional.length?{additional}:{}),...Layout.pairSizes(p),mode:p.mode,companion,references:p.references.map(reference),rows:p.rows.map(r=>{if(p.mode==='interlinear'&&(!Array.isArray(r.groups)||r.groups.length>1000))throw Error('Ungültige Wortgruppen.');return {label:text(r.label,1000),targetLabel:text(r.targetLabel,1000),key:text(r.key,1000),original:text(r.original),translation:text(r.translation),...(r.missing===true?{missing:true}:{}),...(p.mode==='interlinear'?{groups:r.groups.map(g=>({original:text(g.original),translation:text(g.translation)}))}:{})};})};
}
function note(n){if(Array.isArray(n.refs)&&n.refs.length>100)throw Error('Höchstens 100 Fundstellen pro Notiz.');return {id:id(n.id||uid()),projectId:id(n.projectId),title:text(n.title,20000),note:text(n.note),tags:tags(n.tags),topics:tags(n.topics),refs:(Array.isArray(n.refs)?n.refs:[]).slice(0,100).map(reference),version:Number.isInteger(n.version)?n.version:0,ts:Number.isFinite(n.ts)?n.ts:Date.now(),kind:'free'};}
function entity(kind,x){
 const base={id:id(x.id||uid()),title:text(x.title,20000).trim(),description:text(x.description),tags:tags(x.tags),version:Number.isInteger(x.version)?x.version:0,createdAt:text(x.createdAt||now(),100),updatedAt:text(x.updatedAt||now(),100)};
 if(!base.title)throw Error('Bitte einen Titel eingeben.');
 if(kind==='projects')return {...base,archived:x.archived===true};
 if(kind==='notes')return note(x);
 if(!['sheets','collections'].includes(kind))throw Error('Unbekannter Datentyp.');
 const key=kind==='sheets'?'blocks':'items',xs=x[key]||[];if(!Array.isArray(xs)||xs.length>2000)throw Error('Zu viele Bausteine.');
 const out={...base,projectId:id(x.projectId),[key]:xs.map(block),...(kind==='sheets'?{layout:Layout.layout(x.layout)}:{})};
 if(new Set(out[key].map(b=>b.id)).size!==out[key].length)throw Error('Doppelte Baustein-Kennung.');return out;
}
const empty=()=>({version:1,revision:0,projects:[],sheets:[],collections:[],notes:[]});
function validate(data){
 if(!data||data.version!==1||!Number.isInteger(data.revision)||data.revision<0)throw Error('Unbekanntes Rechercheformat.');
 const out=empty();out.revision=data.revision;
 for(const kind of ['projects','sheets','collections','notes']){
  if(!Array.isArray(data[kind])||data[kind].length>MAX_RECORDS)throw Error('Ungültige Recherche-Datensätze.');
  out[kind]=data[kind].map(x=>entity(kind,x));if(new Set(out[kind].map(x=>x.id)).size!==out[kind].length)throw Error('Doppelte Kennungen.');
 }
 const ps=new Set(out.projects.map(p=>p.id));for(const x of [...out.sheets,...out.collections,...out.notes])if(!ps.has(x.projectId))throw Error('Projektverknüpfung fehlt.');
 return out;
}
class ResearchStore{
 constructor(dir){this.file=path.join(dir,'research.json');this.chain=Promise.resolve();}
 async _read(){
  let failure,backupExists=false;
  try{return {data:validate(JSON.parse(await fs.readFile(this.file,'utf8'))),recovered:false};}catch(e){failure=e;}
  for(let i=1;i<=5;i++)try{return {data:validate(JSON.parse(await fs.readFile(this.file+'.bak'+i,'utf8'))),recovered:true};}catch(e){if(e.code!=='ENOENT')backupExists=true;}
  if(failure.code==='ENOENT'&&!backupExists)return {data:empty(),recovered:false};
  throw Error('Recherchedatei beschädigt; keine lesbare Sicherung. Vorhandene Dateien wurden nicht überschrieben.');
 }
 async read(){const r=await this._read();return {...r.data,recovered:r.recovered};}
 transact(fn){
  const task=this.chain.catch(()=>{}).then(async()=>{
   const {data,recovered}=await this._read(),out=await fn(clone(data));out.revision=data.revision+1;const checked=validate(out),raw=JSON.stringify(checked);
   if(Buffer.byteLength(raw)>MAX_BYTES)throw Error('Recherchedatei ist zu groß.');await fs.mkdir(path.dirname(this.file),{recursive:true});
   if(recovered){try{await fs.copyFile(this.file,this.file+'.broken-'+Date.now());}catch(e){if(e.code!=='ENOENT')throw e;}}
   else{
    for(let i=5;i>1;i--)try{await fs.rename(this.file+'.bak'+(i-1),this.file+'.bak'+i);}catch(e){if(e.code!=='ENOENT')throw e;}
    try{await fs.copyFile(this.file,this.file+'.bak1');}catch(e){if(e.code!=='ENOENT')throw e;}
   }
   const temp=this.file+'.'+uid()+'.tmp';try{await fs.writeFile(temp,raw,{flag:'wx'});await fs.rename(temp,this.file);}finally{await fs.rm(temp,{force:true});}
   return checked;
  });this.chain=task;return task;
 }
 async put(kind,input,expectedVersion){
  const rec=entity(kind,input);
  return this.transact(s=>{
   const at=s[kind].findIndex(x=>x.id===rec.id),old=at>=0?s[kind][at]:null;
   if(old&&old.version!==expectedVersion){const e=Error('Dieser Eintrag wurde inzwischen geändert. Bitte neu laden; deine Eingaben bleiben erhalten.');e.code='CONFLICT';throw e;}
   if(!old&&expectedVersion!=null&&expectedVersion!==0)throw Error('Der Eintrag wurde entfernt.');
   if(kind!=='projects'&&!s.projects.some(p=>p.id===rec.projectId))throw Error('Projekt nicht gefunden.');
   rec.version=(old?.version||0)+1;rec.createdAt=old?.createdAt||now();rec.updatedAt=now();if(kind==='notes')rec.ts=Date.now();
   if(old)s[kind][at]=rec;else s[kind].push(rec);return s;
  });
 }
 async remove(kind,recordId,expectedVersion){
  if(!['sheets','collections','notes'].includes(kind))throw Error('Projekte können archiviert werden.');
  return this.transact(s=>{const old=s[kind].find(x=>x.id===recordId);if(!old)throw Error('Eintrag nicht gefunden.');if(old.version!==expectedVersion)throw Error('Eintrag inzwischen geändert. Bitte neu laden.');s[kind]=s[kind].filter(x=>x.id!==recordId);return s;});
 }
 async importBundle(bundle){
  if(Buffer.byteLength(JSON.stringify(bundle))>MAX_BYTES)throw Error('Projektpaket ist zu groß.');
  if(bundle?.format!=='safran-research'||bundle.version!==1)throw Error('Kein Safran-Projektpaket.');
  const incoming=validate({...bundle,revision:0}),maps={};
  for(const k of ['projects','sheets','collections','notes'])maps[k]=new Map(incoming[k].map(x=>[x.id,uid()]));
  for(const k of ['projects','sheets','collections','notes'])for(const x of incoming[k]){
   x.id=maps[k].get(x.id);x.version=1;x.createdAt=x.updatedAt=now();if(k!=='projects')x.projectId=maps.projects.get(x.projectId);
   for(const b of x.blocks||x.items||[]){b.id=uid();if(b.noteId){if(!maps.notes.has(b.noteId))throw Error('Verknüpfte Notiz fehlt im Paket.');b.noteId=maps.notes.get(b.noteId);}if(b.noteSnapshot){b.noteSnapshot.id=b.noteId;b.noteSnapshot.projectId=x.projectId;}}
  }
  return this.transact(s=>{for(const k of ['projects','sheets','collections','notes'])s[k].push(...incoming[k]);return s;});
 }
}
function cite(c){c=citation(c);const a=[c.work,c.locator].filter(Boolean).join(' '),details=[c.edition,c.translator?'Übersetzung: '+c.translator:'',c.editor?'Herausgabe: '+c.editor:'',c.publisher,c.year].filter(Boolean);return [a,details.join('; '),c.url].filter(Boolean).join('. ');}
function metadata(d,entry,locator){
 const vt=d.versionTitle||entry.versionTitle||'';
 // Use explicit attribution only. A missing translator is left editable, never guessed from a portrait.
 const translator=d.translator||d.versionTranslator||'',editor=d.editor||'';
 return citation({work:d.title||entry.title,edition:vt,translator:typeof translator==='string'?translator:'',editor:typeof editor==='string'?editor:'',publisher:typeof d.publisher==='string'?d.publisher:'',year:typeof d.year==='string'||Number.isFinite(d.year)?String(d.year):'',locator,url:d.versionSource||'',language:Editions.language({...entry,language:d.language||entry.language})});
}
function rangeLabels(input,available){
 if(!input||Array.isArray(input)&&!input.length)return available;
 if(Array.isArray(input)){if(input.some(x=>!available.includes(x)))throw Error('Eine gewählte Zeile fehlt in dieser Edition.');return available.filter(x=>input.includes(x));}
 const found=new Set();for(const part of text(input,10000).split(/[,;]/).map(s=>s.trim()).filter(Boolean)){
  if(available.includes(part)){found.add(part);continue;}const m=/^(.*?)\s*[–—-]\s*(.*?)$/.exec(part);if(!m)throw Error('Ungültige Zeilenauswahl: '+part);
  const a=available.indexOf(m[1]),b=available.indexOf(m[2]);if(a<0||b<a)throw Error('Zeilenbereich fehlt in dieser Edition: '+part);for(const x of available.slice(a,b+1))found.add(x);
 }if(!found.size)throw Error('Keine Zeilen gewählt.');return available.filter(x=>found.has(x));
}
// HTML 4 named entities (Unicode mappings generated from Python html.entities), plus XML apos.
const ENTITIES=require('./research-entities.json');
function plain(html){
 return R.splitFootnotes(String(html)).main.replace(/<sup data-fn="\d+">[\s\S]*?<\/sup>/g,'')
  .replace(/<br\s*\/?\s*>|<\/(?:p|div|li|h[1-6]|blockquote|tr)>/gi,'\n').replace(/<[^>]*>/g,'')
  .replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi,(m,n)=>{
   if(n[0]!=='#')return ENTITIES[n]??m;
   const c=n[1].toLowerCase()==='x'?parseInt(n.slice(2),16):Number(n.slice(1));
   return c>0&&c<=0x10ffff&&!(c>=0xd800&&c<=0xdfff)?String.fromCodePoint(c):'\ufffd';
  }).trim();
}
function capture(doc,entry,request,contentHash){
 const p=request.sectionPath;if(!Array.isArray(p)||p.length>20||p.some(x=>!Number.isInteger(x)&&typeof x!=='string'||['__proto__','constructor','prototype'].includes(x)))throw Error('Ungültige Fundstelle.');
 const sections=R.sectionsOf(doc.text,doc.sectionNames),section=sections.find(s=>JSON.stringify(s.path)===JSON.stringify(p));if(!section)throw Error('Abschnitt fehlt in dieser Edition.');
 const rows=R.flattenNode(R.getByPath(doc.text,p)),labels=rangeLabels(request.labels,rows.map(r=>r.label));
 const selected=rows.filter(r=>labels.includes(r.label)),body=selected.map(r=>r.label+'  '+plain(r.html)+(request.includeFootnotes?R.splitFootnotes(r.html).notes.map(n=>'\n[Fußnote '+(n.marker||'')+'] '+plain(n.html)).join(''):'')).join('\n');
 const where=section.label+(labels.length?' · '+labels.join(', '):''),c=metadata(doc,entry,where);
 const ref=reference({label:(doc.title||entry.title)+' · '+where,rel:entry.rel,sectionPath:p,labels,citation:c,quote:body});
 return block({type:'source',title:doc.title||entry.title,text:body,originalText:body,citation:c,reference:ref,sourceHash:/^[a-f0-9]{64}$/.test(contentHash||'')?contentHash:crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex'),capturedAt:now()});
}
function resolveBlocks(sheet,notes){const map=new Map(notes.map(n=>[n.id,n]));return sheet.blocks.map(b=>{if(b.type!=='note')return b;const n=map.get(b.noteId)||b.noteSnapshot;return {...b,title:n?.title||b.title,text:n?.note??b.text,noteSnapshot:n||null};});}
function bundleProject(s,projectId,legacy=[]){
 const project=s.projects.find(p=>p.id===projectId);if(!project)throw Error('Projekt fehlt.');
 const sheets=s.sheets.filter(x=>x.projectId===projectId),collections=s.collections.filter(x=>x.projectId===projectId);
 const linked=new Set([...sheets.flatMap(x=>x.blocks),...collections.flatMap(x=>x.items)].filter(b=>b.type==='note').map(b=>b.noteId));
 const all=[...s.notes,...legacy.map(n=>({...n,note:n.note||'',refs:legacyRefs(n),topics:n.topics||[]}))],notes=all.filter(n=>n.projectId===projectId||linked.has(n.id)).map(n=>note({...n,projectId}));
 // A deleted linked note may still be preserved as its last explicitly saved snapshot.
 for(const b of [...sheets.flatMap(x=>x.blocks),...collections.flatMap(x=>x.items)])if(b.type==='note'&&!notes.some(n=>n.id===b.noteId)){if(!b.noteSnapshot)throw Error('Eine verknüpfte Notiz fehlt; bitte den Baustein prüfen.');notes.push(note({...b.noteSnapshot,id:b.noteId,projectId}));}
 return {format:'safran-research',version:1,exportedAt:now(),projects:[clone(project)],sheets:clone(sheets),collections:clone(collections),notes};
}
function annotations(notes){return {'@context':['http://www.w3.org/ns/anno.jsonld',{safran:'https://github.com/mitkin89/Safran/ns/'}],type:'AnnotationPage',items:notes.map(n=>({id:/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(n.id)?'urn:uuid:'+n.id:'urn:safran:annotation:'+encodeURIComponent(n.id),type:'Annotation',modified:new Date(n.ts||0).toISOString(),body:[{type:'TextualBody',value:n.note||'',format:'text/plain',purpose:'commenting'},...(n.tags||[]).map(value=>({type:'TextualBody',value,purpose:'tagging'}))],target:(n.refs||[]).map(r=>{const url=r.citation?.url;return {type:'SpecificResource',source:/^https?:\/\/\S+$/.test(url||'')?url:'urn:safran:source:'+encodeURIComponent(r.rel||r.label),...(r.quote?{selector:{type:'TextQuoteSelector',exact:r.quote}}:{}),'safran:locator':r.label,'safran:edition':r.citation?.edition||''};}),'safran:project':n.projectId||'','safran:topics':n.topics||[]}))};}
function csv(items){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return '\uFEFF'+[['type','id','title','text','work','edition','translator','locator','source_url','captured_at','tags','topics','translation_mode','translation_edition','translation_locator','translation_text'],...items.map(x=>[x.type||'note',x.id,x.title,x.note??x.text,x.citation?.work||'',x.citation?.edition||'',x.citation?.translator||'',x.citation?.locator||'',x.citation?.url||'',x.capturedAt||'',(x.tags||[]).join('; '),(x.topics||[]).join('; '),x.presentation?.mode||'',...(x.presentation?['edition','locator','text'].map(k=>[x.presentation,...(x.presentation.additional||[])].map(p=>k==='text'?p.companion.text:p.companion.citation[k]).join('\n')):['','',''])])].map(row=>row.map(q).join(',')).join('\r\n')+'\r\n';}
module.exports={ResearchStore,empty,validate,entity,block,note,reference,citation,cite,capture,metadata,rangeLabels,plain,legacyRefs,resolveBlocks,bundleProject,annotations,csv,MAX_BYTES};
