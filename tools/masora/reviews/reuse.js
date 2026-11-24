'use strict';
// Reuse only a complete, manually translated exact source string whose original
// context restrictions also accept this source. No global word or numeral rules.
let dictionaries;
let baseline=new Map();
const referenceKey=refs=>JSON.stringify([...new Set(refs||[])].sort());
function sourceKey(entry,reading,quoted){return JSON.stringify([quoted?'quotation':'manual',quoted?null:entry.label||((reading.references||[]).length?null:'context:'+entry.uuid),reading.text,referenceKey(reading.references)]);}
function acceptsContext(row,entry,reading){
 if(!row.contexts)return true;
 return row.contexts.some(c=>typeof c.uuid==='string'&&c.uuid===entry.uuid||typeof c.contextUUID==='string'&&c.contextUUID===entry.uuid||Number.isInteger(c.ordinal)&&c.ordinal===entry.ordinal||typeof c.label==='string'&&c.label.length>0&&c.label===entry.label||(c.references||[]).some(ref=>(reading.references||[]).includes(ref)));
}
function prepareBaseline(rows,records){
 baseline=new Map();
 for(const entry of rows){const record=records.get(entry.uuid);record.readings.forEach((r,i)=>{
  if(r.status!=='draft'||r.uncertain.length)return;
  const quoted=['aligned-quotation','aligned-juxtaposed-quotation'].includes(r.method);
  const manual=/^(?:manual-|editorial-review-working-translation$)/.test(r.method||'');
  if(!quoted&&!manual||quoted&&!entry.readings[i].references.length)return;
  const key=sourceKey(entry,entry.readings[i],quoted),existing=baseline.get(key);
  if(existing===null)return;
  if(existing&&(existing.reading.de!==r.de||existing.reading.edition!==r.edition)){baseline.set(key,null);return;}
  if(!existing)baseline.set(key,{context:entry.uuid,reading:r});
 });}
}
function improve(entry,reading,prior){
 if(prior.status!=='partial')return prior;
 if(!dictionaries)dictionaries=['round-1-a','round-1-b','round-1-c','round-2-a','round-2-b','round-2-c'].map(name=>({name,sources:new Map(require('./'+name+'-manual.json').map(m=>[m.source,m])),module:require('./'+name)}));
 for(const dictionary of dictionaries){
  if(!dictionary.sources.has(reading.text)||!acceptsContext(dictionary.sources.get(reading.text),entry,reading))continue;
  const candidate=dictionary.module.manualFor(reading,entry);
  if(candidate?.status==='draft'&&Array.isArray(candidate.uncertain)&&!candidate.uncertain.length)return {...candidate,uuid:reading.uuid,reusedFromReview:dictionary.name};
 }
 for(const quoted of [true,false]){
  const found=baseline.get(sourceKey(entry,reading,quoted));if(!found)continue;
  return {...found.reading,uuid:reading.uuid,reusedFromSource:{context:found.context,reading:found.reading.uuid}};
 }
 return prior;
}
module.exports={improve,prepareBaseline};
