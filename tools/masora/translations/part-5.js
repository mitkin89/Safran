'use strict';
// Additional German Masorah working translations; uncertainties remain explicit.
const fs=require('node:fs'),path=require('node:path');
const P2=require('./part-2'),P1=require('./part-1'),P0=require('./part-0'),P3=require('./part-3');
const root=path.resolve(__dirname,'../../..');
const manualFile=path.join(__dirname,'part-5-manual.json');
const manual=fs.existsSync(manualFile)?JSON.parse(fs.readFileSync(manualFile,'utf8')):[];
const exact=new Map(manual.map(r=>[r.source,r]));
const cache=new Map();
function score(r){const clean=r.de.replace(/\[[^\]]*\]/g,'').replace(/[א-ת]/g,'').replace(/(?:Unklar|Lücke|unsicher)/gi,'');return (clean.match(/[A-Za-zÄÖÜäöüß]/g)||[]).length;}
function guard(r,source){const loss=[...source.matchAll(/#+|[\[\]]|�|\.{2,}|…|∅|\?+/g)].map(m=>m[0]);if(loss.length)return {...r,de:r.de+(r.de.includes('Quelle')||r.de.includes('Vorlage')?'':' [Lücke oder unsichere Zeichen in der Vorlage.]'),status:'partial',uncertain:[...new Set([...(r.uncertain||[]),...loss])]};return r;}
function manualFor(reading,entry){
 const source=String(reading.text||''),e=exact.get(source);
 if(!e||((e.references||[]).length&&!(reading.references||[]).some(ref=>e.references.includes(ref))))return null;
 return guard({uuid:reading.uuid,de:e.de,status:e.status,uncertain:e.uncertain,method:'editorial-working-translation'},source);
}
function translate(reading,entry){
 const source=String(reading.text||''),key=JSON.stringify([source,reading.references,entry.label]);if(cache.has(key))return {...cache.get(key),uuid:reading.uuid};
 let result;
 if(manualFor(reading,entry))result=manualFor(reading,entry);
 else {
  const choices=[];
  const methods=[()=>P2.translate(reading,entry),()=>P1.translateReading(reading,entry),()=>P0.translateReading(reading,entry),()=>P3.translate(reading)];
  for(let i=0;i<methods.length;i++){
   // Very long rubrics need separate review, not cubic fragment matching.
   if(i===3&&source.length>600)continue;
   const r=methods[i]();if(!r||typeof r.de!=='string'||!r.de.trim())continue;choices.push(r);if(r.status==='draft'){result=r;break;}
  }
  if(!result)result=choices.sort((a,b)=>score(b)-score(a))[0]||{de:'[Unklar: '+source+']',status:'partial',uncertain:[source],method:'unresolved'};
 }
 result=guard(result,source);cache.set(key,result);return {...result,uuid:reading.uuid};
}
function build(rows){return rows.map(e=>({ordinal:e.ordinal,uuid:e.uuid,sourceHash:e.sourceHash,readings:e.readings.map(r=>translate(r,e))}));}
module.exports={build,translate,manualFor};
if(require.main===module){const rows=fs.readFileSync(process.argv[2]||'/tmp/safran-masora-rest-5.jsonl','utf8').trim().split('\n').map(JSON.parse),out=build(rows);fs.writeFileSync(process.argv[3]||path.join(root,'masora-translations/part-5.json'),JSON.stringify(out,null,2)+'\n');let readings=0,draft=0,partial=0,partialNotes=0;for(const n of out){if(n.readings.some(r=>r.status==='partial'))partialNotes++;for(const r of n.readings){readings++;r.status==='draft'?draft++:partial++;}}console.log({contexts:out.length,readings,draft,partial,partialNotes});}
