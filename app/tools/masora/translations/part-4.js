'use strict';
// Remaining Masorah working translations. No changes to source transcriptions.
const fs=require('node:fs'),path=require('node:path');
const P2=require('./part-2'),P1=require('./part-1'),P0=require('./part-0'),P3=require('./part-3');
const ROOT=path.resolve(__dirname,'../../..'),manual=new Map(require('./part-4-manual.json').map(r=>[r.source,r]));
const cache=new Map();
function germanScore(r){const text=String(r.de||'').replace(/\[[^\]]*\]/g,'');return (text.match(/[A-Za-zÄÖÜäöüß]+/g)||[]).length;}
function guard(result,reading){
 const out={...result,uncertain:[...(result.uncertain||[])]},source=String(reading.text||'');
 if(/[#\[\]…�∅?]|\.{2,}/.test(source)){
  if(out.status==='draft')out.de+=' [Textlücke oder unsichere Zeichen im Original.]';
  out.status='partial';if(!out.uncertain.includes(source))out.uncertain.push(source);
 }
 if(!source.trim()){out.de='[Keine Texttranskription vorhanden.]';out.status='partial';out.uncertain=[];}
 return out;
}
const quoteCache=new Map();
function quotation(text,refs){const key=JSON.stringify([text,refs]);if(!quoteCache.has(key))quoteCache.set(key,P2.quote(text,refs));return quoteCache.get(key);}
function dividedQuotation(reading){
 const source=String(reading.text||''),tokens=source.trim().split(/\s+/);
 if(!reading.references?.length||tokens.length<2||tokens.length>25||/[#\[\]…�\u05c4\u05c5]/.test(source))return null;
 for(let split=1;split<tokens.length;split++){
  const left=quotation(tokens.slice(0,split).join(' '),reading.references),right=quotation(tokens.slice(split).join(' '),reading.references);
  if(left?.status==='draft'&&right?.status==='draft')return {de:left.de.replace(/[.,;:]+$/,'')+' — '+right.de,status:'draft',uncertain:[],method:'aligned-juxtaposed-quotation',attribution:[left.edition,right.edition].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' / '),ref:reading.references.join(' · ')};
 }
 return null;
}
function manualFor(reading){const row=manual.get(reading.text);return row?guard({de:row.de,status:row.status,uncertain:row.uncertain,method:'editorial-draft'},reading):null;}
function translate(reading,entry){
 const key=JSON.stringify([reading.text,reading.references||[],entry.label]),cached=cache.get(key);if(cached)return {...cached,uncertain:[...cached.uncertain]};
 const exact=manual.get(reading.text);if(exact){const r=guard({de:exact.de,status:exact.status,uncertain:exact.uncertain,method:'editorial-draft'},reading);cache.set(key,r);return {...r,uncertain:[...r.uncertain]};}
 const engines=[()=>P2.translate(reading,entry),()=>P1.translateReading(reading,entry),()=>P0.translateReading(reading,entry),()=>P3.translate(reading)];
 let best=null;
 for(const run of engines){
  let candidate=run();if(!candidate||!candidate.de)continue;candidate=guard(candidate,reading);
  if(candidate.status==='draft'){best=candidate;break;}
  if(!best||germanScore(candidate)>germanScore(best))best=candidate;
 }
 if(best?.status!=='draft'){const divided=dividedQuotation(reading);if(divided)best=divided;}
 const out=best||{de:'[Unklar: '+reading.text+']',status:'partial',uncertain:[reading.text],method:'unresolved'};cache.set(key,out);return {...out,uncertain:[...out.uncertain]};
}
function build(rows){return rows.map(entry=>({ordinal:entry.ordinal,uuid:entry.uuid,sourceHash:entry.sourceHash,readings:entry.readings.map(reading=>({...translate(reading,entry),uuid:reading.uuid}))}));}
module.exports={build,translate,manualFor};
if(require.main===module){const rows=fs.readFileSync(process.argv[2]||'/tmp/safran-masora-rest-4.jsonl','utf8').trim().split('\n').map(JSON.parse),result=build(rows);fs.writeFileSync(process.argv[3]||path.join(ROOT,'masora-translations/part-4.json'),JSON.stringify(result,null,2)+'\n');const counts={contexts:result.length,readings:0,draft:0,partial:0,partialContexts:0};for(const e of result){if(e.readings.some(r=>r.status==='partial'))counts.partialContexts++;for(const r of e.readings){counts.readings++;counts[r.status]++;}}console.log(counts);}
