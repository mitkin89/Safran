'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const S=require('./research-store'),R=require('./reader'),C=require('./research-comments'),V=require('./versemap'),cfg=require('./bundled/versification.json'),manifest=require('./interlin-sources'),Private=require('./private-interlinear');
const hash=d=>crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex');
function groups(words,segs){
 const parent=words.map((_,i)=>i),find=i=>parent[i]===i?i:parent[i]=find(parent[i]);
 for(const [ix]of segs){if(ix.some(i=>!Number.isInteger(i)||i<1||i>words.length))throw Error('Wortzuordnung passt nicht zum Original.');if(ix.length)for(let i=Math.min(...ix);i<Math.max(...ix);i++)parent[find(i)]=find(Math.min(...ix)-1);}
 const out=[];for(let i=0;i<words.length;i++){const first=find(i);let g=out.find(g=>g.index===first);if(!g){g={index:first,original:'',translation:'',parts:[]};out.push(g);}g.original+=(g.original?' ':'')+words[i];}
 for(const [ix,t]of segs){if(!ix.length){out.push({index:-1,original:'+',translation:t});continue;}const g=out.find(g=>g.index===find(ix[0]-1));g.parts.push(t);}
 return out.map(g=>({original:g.original,translation:g.parts?g.parts.join(' '):g.translation}));
}
async function aligned(book,sourceDoc,targetDoc,rows,privateRead=async()=>null){
 const sourceHash=hash(sourceDoc),targetHash=hash(targetDoc);
 const match=Object.entries(manifest).find(([,books])=>{const p=books[book];return p&&((p.he.versionTitle===sourceDoc.versionTitle&&p.he.textHash===sourceHash&&p.translation.versionTitle===targetDoc.versionTitle&&p.translation.textHash===targetHash)||(p.he.versionTitle===targetDoc.versionTitle&&p.he.textHash===targetHash&&p.translation.versionTitle===sourceDoc.versionTitle&&p.translation.textHash===sourceHash));});
 let data,he,translation;
 if(match){
  const raw=await fs.readFile(path.join(__dirname,'interlin',book.replace(/ /g,'_')+'.js'),'utf8'),marker='window.INTERLIN_PARTS['+JSON.stringify(book)+']=';
  const start=raw.indexOf(marker);if(start<0)throw Error('Interlinear-Daten fehlen.');data=JSON.parse(raw.slice(start+marker.length).trim().replace(/;$/,''))[match[0]];he=match[1][book].he.versionTitle===sourceDoc.versionTitle?sourceDoc:targetDoc;
 }else if((Private.VERSION.test(sourceDoc.versionTitle)&&/^Westminster/.test(targetDoc.versionTitle))||(Private.VERSION.test(targetDoc.versionTitle)&&/^Westminster/.test(sourceDoc.versionTitle))){
  const local=await privateRead();if(local?.error)throw Error(local.error);data=local?.data?.BuberRosenzweig?.[book];he=Private.VERSION.test(sourceDoc.versionTitle)?targetDoc:sourceDoc;translation=he===sourceDoc?targetDoc:sourceDoc;
  if(!data)throw Error('Für Buber/Rosenzweig fehlen passende lokal importierte Wortzuordnungen für '+book+'.');
 }else throw Error('Für diese Ausgaben und Textstände ist keine passende Interlinear-Zuordnung vorhanden. Bitte nebeneinander anzeigen.');
 return rows.map(row=>{const [ch,v]=row.key.split(':').map(Number),html=he.text[ch-1]?.[v-1],segs=data?.[row.key];if(typeof html!=='string'||!segs)throw Error('Für '+row.key+' fehlt die Wortzuordnung.');if(translation&&Private.plain(translation.text[ch-1]?.[v-1]||'')!==segs.map(s=>s[1]).join(' ').replace(/\s+/g,' ').trim())throw Error('Für '+row.key+' passt die private Wortzuordnung nicht zum gewählten Übersetzungstext.');const tokens=[...html.matchAll(/<span class="w"[^>]*>([\s\S]*?)<\/span>/g)];const words=tokens.map((m,i)=>(i===0?S.plain(html.slice(0,m.index)):'')+S.plain(m[1])+S.plain(html.slice(m.index+m[0].length,tokens[i+1]?.index??html.length)));if(!words.length)throw Error('Westminster-Wörter fehlen.');return {...row,groups:groups(words,segs)};});
}
async function prepare({source,rel,rels,mode,sourceSize,translationSize},rich,privateRead=async()=>null){
 if(rels!==undefined){
  if(!Array.isArray(rels)||!rels.length||rels.length>8||new Set(rels).size!==rels.length)throw Error('Bitte 1 bis 8 unterschiedliche Übersetzungen auswählen.');
  const pairs=[];for(const selected of rels)pairs.push(await prepare({source,rel:selected,mode,sourceSize,translationSize},rich,privateRead));
  return {...pairs[0],...(pairs.length>1?{additional:pairs.slice(1)}:{})};
 }
 const sizes=require('./research-layout').pairSizes({sourceSize,translationSize});
 if(!['parallel','interlinear'].includes(mode))throw Error('Ungültige Übersetzungsanzeige.');
 if(source.type!=='source'||!source.reference?.rel||source.reference.rel===rel)throw Error('Bitte eine andere Ausgabe auswählen.');
 if(source.text!==source.originalText)throw Error('Der Auszug wurde bearbeitet. Bitte den Originaltext wiederherstellen, bevor du eine Übersetzung zuordnest.');
 const a=await rich(source.reference.rel),b=await rich(rel);if(a.entry.title!==b.entry.title)throw Error('Die Ausgabe gehört nicht zum selben Werk.');
 const captured=S.capture(a.doc,a.entry,{sectionPath:source.reference.sectionPath,labels:source.reference.labels},a.doc.textHash);
 if(captured.sourceHash!==source.sourceHash||captured.text!==source.originalText)throw Error('Der gespeicherte Auszug und die Originalausgabe stimmen nicht überein. Bitte die Quelle neu übernehmen.');
 const originalRows=R.flattenNode(R.getByPath(a.doc.text,source.reference.sectionPath)).filter(r=>source.reference.labels.includes(r.label)),rows=[],plans=[];
 if(originalRows.length>200)throw Error('Bitte höchstens 200 Verse auf einmal auswählen.');
 const book=a.entry.title;
 if(V.known(book)){
  const trad=b.doc.versification?.text||V.tradOf(cfg,b.entry,'text');
  for(const r of originalRows){const t=C.targets(a.doc,a.entry,{...source.reference,labels:[r.label]});if(t.warnings.length)throw Error(t.warnings.join(' '));const pairs=[];
   for(const s of t.sections)for(const v of s.verses){if(V.partial(book,+s.chapter,v,'heb',trad))throw Error('Teilverszuordnung nicht eindeutig.');pairs.push(...V.verse(book,+s.chapter,v,'heb',trad));}
   if(!pairs.length)throw Error('Kein Gegenstück in dieser Ausgabe für '+r.label+'.');
   const selected=pairs.map(([ch,v])=>{const req={sectionPath:[ch-1],labels:[String(v)]},capture=S.capture(b.doc,b.entry,req,b.doc.textHash);plans.push(req);return {ch,v,text:capture.text.replace(/^\S+\s+/,'')};});
   const parts=source.reference.sectionPath.filter(p=>p!=='');rows.push({label:r.label,key:(parts[0]+1)+':'+r.label,targetLabel:selected.map(x=>x.ch+':'+x.v).join(', '),original:S.plain(r.html),translation:selected.map(x=>x.text).join('\n')});
  }
 }else{
  if(JSON.stringify(a.doc.sectionNames)!==JSON.stringify(b.doc.sectionNames))throw Error('Die Abschnittsstrukturen der Ausgaben unterscheiden sich.');
  const section=R.sectionsOf(b.doc.text,b.doc.sectionNames).find(s=>JSON.stringify(s.path)===JSON.stringify(source.reference.sectionPath));
  if(!section)throw Error('Abschnitt fehlt in dieser Ausgabe.');
  const native=R.flattenNode(R.getByPath(b.doc.text,section.path)),byLabel=new Map(native.map(r=>[r.label,r])),present=originalRows.filter(r=>byLabel.has(r.label)).map(r=>r.label);
  if(!present.length)throw Error('Für die gewählten Zeilen ist in dieser Ausgabe keine Übersetzung vorhanden.');
  plans.push({sectionPath:section.path,labels:present});
  for(const r of originalRows){const translated=byLabel.get(r.label);rows.push({label:r.label,targetLabel:r.label,key:r.label,original:S.plain(r.html),translation:translated?S.plain(translated.html):'',...(!translated?{missing:true}:{})});}
 }
 const mergedPlans=new Map();for(const plan of plans){const key=JSON.stringify(plan.sectionPath);if(!mergedPlans.has(key))mergedPlans.set(key,{sectionPath:plan.sectionPath,labels:[]});for(const label of plan.labels)if(!mergedPlans.get(key).labels.includes(label))mergedPlans.get(key).labels.push(label);}plans.splice(0,plans.length,...mergedPlans.values());
 const companion=S.capture(b.doc,b.entry,plans[0],b.doc.textHash);companion.text=companion.originalText=rows.filter(r=>!r.missing).map(r=>r.targetLabel+'  '+r.translation).join('\n');companion.reference.quote=companion.text;
 // Keep every mapped native location, including chapter shifts, in the paired snapshot.
 const references=plans.map(req=>S.capture(b.doc,b.entry,req,b.doc.textHash).reference);
 companion.citation.locator=[...new Set(references.map(r=>r.citation.locator))].join('; ');companion.reference.citation=companion.citation;
 return {...sizes,mode,companion,rows:mode==='interlinear'?await aligned(book,a.doc,b.doc,rows,privateRead):rows,references};
}
async function readerView(request,rich,privateRead=async()=>null){
 const {rel,visibleRels,interlinearRels=[],sizes={},glossSize=12}=request;
 if(!Array.isArray(visibleRels)||!visibleRels.length||visibleRels.length>9||visibleRels[0]!==rel||new Set(visibleRels).size!==visibleRels.length||!Array.isArray(interlinearRels)||interlinearRels.length>8||new Set(interlinearRels).size!==interlinearRels.length)throw Error('Ungültige Auswahl aus dem Lesefenster.');
 const {doc,entry}=await rich(rel),source=S.capture(doc,entry,{sectionPath:request.sectionPath,labels:request.labels},doc.textHash),pairSize=target=>({sourceSize:sizes[rel],translationSize:sizes[target]});
 const parallel=[];for(const target of visibleRels.slice(1))parallel.push(await prepare({source,rel:target,mode:'parallel',...pairSize(target)},rich,privateRead));
 const interlinear=[];for(const target of interlinearRels)interlinear.push(await prepare({source,rel:target,mode:'interlinear',sourceSize:sizes[rel],translationSize:glossSize},rich,privateRead));
 if(parallel.length)source.presentation={...parallel[0],...(parallel.length>1?{additional:parallel.slice(1)}:{}),...(interlinear.length?{originalInterlinear:interlinear}:{})};
 else if(interlinear.length)source.presentation={...interlinear[0],...(interlinear.length>1?{additional:interlinear.slice(1)}:{})};
 if(source.presentation&&Array.isArray(request.headings))source.presentation.readerHeadings=request.headings.filter(h=>source.reference.labels.includes(h.before)).map(h=>({before:h.before,text:h.text}));
 return S.block(source);
}
async function rangePreview({source,sectionPath,labels},rich,privateRead=async()=>null){
 if(source?.type!=='source'||!source.reference?.rel)throw Error('Quellenverknüpfung fehlt.');
 const cache=new Map(),read=rel=>{if(!cache.has(rel))cache.set(rel,rich(rel));return cache.get(rel);},a=await read(source.reference.rel),fresh=S.capture(a.doc,a.entry,{sectionPath,labels},a.doc.textHash);
 if(source.sourceHash!==fresh.sourceHash)throw Error('Die Quelldatei wurde inzwischen geändert. Bitte zuerst die Ausgabe neu übernehmen.');
 fresh.id=source.id;fresh.region=source.region||'main';fresh.title=source.title;fresh.citation={...source.citation,locator:fresh.citation.locator,language:fresh.citation.language};fresh.reference.citation=fresh.citation;
 if(source.presentation){
  const old=source.presentation,make=async pair=>{const next=await prepare({source:fresh,rel:pair.companion.reference.rel,mode:pair.mode,sourceSize:pair.sourceSize,translationSize:pair.translationSize},read,privateRead);if(next.companion.sourceHash!==pair.companion.sourceHash)throw Error('Eine zugehörige Ausgabe wurde inzwischen geändert. Bitte die Übersetzungsanzeige zuerst neu auswählen.');next.companion.id=pair.companion.id;next.companion.citation={...pair.companion.citation,locator:next.companion.citation.locator,language:next.companion.citation.language};next.companion.reference.citation=next.companion.citation;next.references.forEach(ref=>ref.citation={...pair.companion.citation,locator:ref.citation.locator,language:next.companion.citation.language});return next;},primary=await make(old),additional=[];
  for(const pair of old.additional||[])additional.push(await make(pair));
  const originalInterlinear=[];for(const pair of old.originalInterlinear||[])originalInterlinear.push(await make(pair));
  fresh.presentation={...primary,...(additional.length?{additional}:{}),...(originalInterlinear.length?{originalInterlinear}:{}),...(old.readerHeadings?.length&&JSON.stringify(sectionPath)===JSON.stringify(source.reference.sectionPath)?{readerHeadings:old.readerHeadings.filter(h=>fresh.reference.labels.includes(h.before))}:{})};
 }
 return S.block(fresh);
}
async function editionPreview({source,rel},rich){
 if(source?.type!=='source'||!source.reference?.rel)throw Error('Quellenverknüpfung fehlt.');
 const a=await rich(source.reference.rel),fresh=S.capture(a.doc,a.entry,{sectionPath:source.reference.sectionPath,labels:source.reference.labels},a.doc.textHash);
 if(rel===source.reference.rel)return [fresh];
 const pair=await prepare({source:fresh,rel,mode:'parallel'},rich);
 if(pair.rows.some(r=>r.missing))throw Error('Die gewählte Haupttext-Ausgabe enthält nicht alle gewählten Zeilen. Bitte eine andere Ausgabe wählen.');
 const b=await rich(rel),plans=new Map();
 for(const r of pair.references){const k=JSON.stringify(r.sectionPath);if(!plans.has(k))plans.set(k,{sectionPath:r.sectionPath,labels:new Set()});r.labels.forEach(l=>plans.get(k).labels.add(l));}
 return [...plans.values()].map(p=>S.capture(b.doc,b.entry,{sectionPath:p.sectionPath,labels:[...p.labels]},b.doc.textHash));
}
module.exports={prepare,groups,aligned,editionPreview,readerView,rangePreview};
