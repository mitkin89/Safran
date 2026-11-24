'use strict';
// Source-inspected German working translations. Each exact source text is restricted
// to the reviewed context UUIDs; the dictionary cannot become a global word rule.
// Numbers, Ketiv/Qere, plene/defective, accents and Bible excerpts were read in context.
// Damaged or variant source text remains explicitly partial; no source repairs occur.
const manual = require('./round-1-a-manual.json');
const exact = new Map(manual.map(item=>[item.source,item]));
function manualFor(reading,entry) {
 const m=exact.get(reading.text);
 if(!m || !m.entryUUIDs.includes(entry.uuid)) return null;
 const uncertain=[...new Set(m.uncertain||[])];
 let de=m.de;
 const gaps=[...String(reading.text).matchAll(/#+|\[[^\]]*\]|�|…|\.{2,}|∅/g)].map(x=>x[0]);
 for(const gap of gaps) if(!uncertain.includes(gap)) uncertain.push(gap);
 for(const fragment of uncertain) if(!de.includes('[Unklar: '+fragment+']')) de+=' [Unklar: '+fragment+']';
 return {uuid:reading.uuid,de,status:uncertain.length?'partial':'draft',uncertain,method:'manual-source-context-review'};
}
function review(entry,priorRecord) {
 return {...priorRecord,readings:priorRecord.readings.map(prior=>{
  if(prior.status!=='partial') return prior;
  const reading=entry.readings.find(r=>r.uuid===prior.uuid);
  return reading ? (manualFor(reading,entry)||prior) : prior;
 })};
}
module.exports={review,manualFor};
