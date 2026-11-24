'use strict';
// Exact-source German working translations, restricted to inspected context UUIDs.
// Source losses, uncertain abbreviations and variants are explicitly retained.
const exact=new Map(require('./round-2-a-manual.json').map(m=>[m.source,m]));
function manualFor(reading,entry){
 const m=exact.get(reading.text);if(!m||!m.entryUUIDs.includes(entry.uuid))return null;
 const uncertain=[...new Set(m.uncertain||[])];let de=m.de;
 const gaps=[...String(reading.text).matchAll(/#+|\*+|\[[^\]]*\]|[\[\]]|�|…|\.{2,}|∅|⌀|\?+/g)].map(x=>x[0]);
 for(const g of gaps)if(!uncertain.includes(g))uncertain.push(g);
 for(const s of uncertain)if(!de.includes('[Unklar: '+s+']'))de+=' [Unklar: '+s+']';
 return {uuid:reading.uuid,de,status:uncertain.length?'partial':'draft',uncertain,method:'manual-source-context-review'};
}
function review(entry,priorRecord){return {...priorRecord,readings:priorRecord.readings.map(p=>{if(p.status!=='partial')return p;const r=entry.readings.find(r=>r.uuid===p.uuid);return r?(manualFor(r,entry)||p):p;})};}
module.exports={review,manualFor};
