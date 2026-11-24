'use strict';
const R=require('./reader'),V=require('./versemap'),cfg=require('./bundled/versification.json');
function targets(doc,entry,reference){
 const s=R.sectionsOf(doc.text,doc.sectionNames).find(s=>JSON.stringify(s.path)===JSON.stringify(reference.sectionPath));
 if(!s)throw Error('Die gespeicherte Fundstelle fehlt in dieser Edition.');
 const rows=R.flattenNode(R.getByPath(doc.text,s.path)),labels=reference.labels?.length?reference.labels:rows.map(r=>r.label);
 if(labels.length>200)throw Error('Bitte für die Kommentarauswahl höchstens 200 Zeilen wählen.');
 if(labels.some(l=>!rows.some(r=>r.label===l)))throw Error('Eine gespeicherte Zeile fehlt in dieser Edition.');
 const parts=s.path.filter(p=>p!=='');let book=entry.title,index;
 if(parts.length===1&&typeof parts[0]==='number')index=parts[0];
 else if(parts.length===2&&typeof parts[0]==='string'&&typeof parts[1]==='number'){book+=', '+parts[0];index=parts[1];}
 else throw Error('Diese Abschnittsstruktur lässt sich nicht eindeutig mit Kommentaren verknüpfen.');
 if(labels.some(l=>!/^\d+$/.test(l)))throw Error('Diese Zeilenzählung lässt sich nicht eindeutig mit Kommentaren verknüpfen.');
 const daf=doc.sectionNames?.[0]==='Daf',chapter=daf?String(Math.floor(index/2)+1)+(index%2?'b':'a'):String(index+1);
 const trad=doc.versification?.text||V.tradOf(cfg,entry,'text'),out=new Map(),warnings=[];
 for(const label of labels){
  let mapped=[[chapter,+label]];
  if(V.known(book)){
   if(V.partial(book,+chapter,+label,trad,'heb')){warnings.push(book+' '+chapter+':'+label+' – Teilverszuordnung nicht eindeutig.');continue;}
   mapped=V.verse(book,+chapter,+label,trad,'heb');if(!mapped.length)warnings.push(book+' '+chapter+':'+label+' – kein Gegenstück in der Linkzählung.');
  }
  for(const [c,v]of mapped){const key=String(c);if(!out.has(key))out.set(key,new Set());out.get(key).add(v);}
 }
 return {book,sections:[...out].map(([chapter,verses])=>({chapter,verses:[...verses]})),warnings};
}
function overlaps(link,verses){return link.type==='commentary'&&(link.v1===0||verses.some(v=>v>=link.v1&&v<=link.v2));}
module.exports={targets,overlaps};
