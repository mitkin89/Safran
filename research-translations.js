'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const S=require('./research-store'),R=require('./reader'),C=require('./research-comments'),V=require('./versemap'),cfg=require('./bundled/versification.json'),manifest=require('./interlin-sources');
const hash=d=>crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex');
function groups(words,segs){
 const parent=words.map((_,i)=>i),find=i=>parent[i]===i?i:parent[i]=find(parent[i]);
 for(const [ix]of segs){if(ix.some(i=>!Number.isInteger(i)||i<1||i>words.length))throw Error('Wortzuordnung passt nicht zum Original.');if(ix.length)for(let i=Math.min(...ix);i<Math.max(...ix);i++)parent[find(i)]=find(Math.min(...ix)-1);}
 const out=[];for(let i=0;i<words.length;i++){const first=find(i);let g=out.find(g=>g.index===first);if(!g){g={index:first,original:'',translation:'',parts:[]};out.push(g);}g.original+=(g.original?' ':'')+words[i];}
 for(const [ix,t]of segs){if(!ix.length){out.push({index:-1,original:'+',translation:t});continue;}const g=out.find(g=>g.index===find(ix[0]-1));g.parts.push(t);}
 return out.map(g=>({original:g.original,translation:g.parts?g.parts.join(' '):g.translation}));
}
async function aligned(book,sourceDoc,targetDoc,rows){
 const sourceHash=hash(sourceDoc),targetHash=hash(targetDoc);
 const match=Object.entries(manifest).find(([,books])=>{const p=books[book];return p&&((p.he.versionTitle===sourceDoc.versionTitle&&p.he.textHash===sourceHash&&p.translation.versionTitle===targetDoc.versionTitle&&p.translation.textHash===targetHash)||(p.he.versionTitle===targetDoc.versionTitle&&p.he.textHash===targetHash&&p.translation.versionTitle===sourceDoc.versionTitle&&p.translation.textHash===sourceHash));});
 if(!match)throw Error('Für diese Ausgaben und Textstände ist keine passende Interlinear-Zuordnung vorhanden. Bitte nebeneinander anzeigen.');
 const raw=await fs.readFile(path.join(__dirname,'interlin',book.replace(/ /g,'_')+'.js'),'utf8'),marker='window.INTERLIN_PARTS['+JSON.stringify(book)+']=';
 const start=raw.indexOf(marker);if(start<0)throw Error('Interlinear-Daten fehlen.');const data=JSON.parse(raw.slice(start+marker.length).trim().replace(/;$/,''))[match[0]],he=match[1][book].he.versionTitle===sourceDoc.versionTitle?sourceDoc:targetDoc;
 return rows.map(row=>{const [ch,v]=row.key.split(':').map(Number),html=he.text[ch-1]?.[v-1],segs=data?.[row.key];if(typeof html!=='string'||!segs)throw Error('Für '+row.key+' fehlt die Wortzuordnung.');const tokens=[...html.matchAll(/<span class="w"[^>]*>([\s\S]*?)<\/span>/g)];const words=tokens.map((m,i)=>(i===0?S.plain(html.slice(0,m.index)):'')+S.plain(m[1])+S.plain(html.slice(m.index+m[0].length,tokens[i+1]?.index??html.length)));if(!words.length)throw Error('Westminster-Wörter fehlen.');return {...row,groups:groups(words,segs)};});
}
async function prepare({source,rel,mode},rich){
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
  const target=S.capture(b.doc,b.entry,{sectionPath:source.reference.sectionPath,labels:source.reference.labels},b.doc.textHash),native=R.flattenNode(R.getByPath(b.doc.text,target.reference.sectionPath));plans.push({sectionPath:target.reference.sectionPath,labels:target.reference.labels});
  for(const r of originalRows)rows.push({label:r.label,targetLabel:r.label,key:r.label,original:S.plain(r.html),translation:S.plain(native.find(n=>n.label===r.label).html)});
 }
 const companion=S.capture(b.doc,b.entry,plans[0],b.doc.textHash);companion.text=companion.originalText=rows.map(r=>r.targetLabel+'  '+r.translation).join('\n');companion.reference.quote=companion.text;
 // Keep every mapped native location, including chapter shifts, in the paired snapshot.
 const references=plans.map(req=>S.capture(b.doc,b.entry,req,b.doc.textHash).reference);
 companion.citation.locator=[...new Set(references.map(r=>r.citation.locator))].join('; ');companion.reference.citation=companion.citation;
 return {mode,companion,rows:mode==='interlinear'?await aligned(book,a.doc,b.doc,rows):rows,references};
}
module.exports={prepare,groups,aligned};
