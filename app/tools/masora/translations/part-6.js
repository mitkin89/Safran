'use strict';
// Reproducible German working translations for source contexts 21501–26969.
// Combining inspected formula dictionaries and exact quote spans never repairs the source.
const fs=require('node:fs'),path=require('node:path');
const P0=require('./part-0'),P1=require('./part-1'),P2=require('./part-2'),P3=require('./part-3');
const exactFile=path.join(__dirname,'part-6-manual.json');
const exact=new Map((fs.existsSync(exactFile)?JSON.parse(fs.readFileSync(exactFile,'utf8')):[]).map(r=>[r.source,r]));
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f׳״'"·]/g,'').replace(/\s+/g,' ').trim();
const cache=new Map();
function normalize(result,r,e){
 if(!result||typeof result.de!=='string'||!result.de.trim())return null;
 const out={...result,uuid:r.uuid,uncertain:[...(result.uncertain||[])]};
 if(!['draft','partial'].includes(out.status))out.status=out.uncertain.length?'partial':'draft';
 const gaps=[...String(r.text||'').matchAll(/#+|[\[\]]|�|…|\.{2,}|∅/g)].map(m=>m[0]);
 if(gaps.length){out.status='partial';out.uncertain=[...new Set([...out.uncertain,...gaps])];if(!/\[(?:Unklar|Lücke|Textlücke|Beschädigte|unsicher)/i.test(out.de))out.de+=' [Lücke oder unsichere Zeichen im Original.]';}
 // Hebrew spelling objects are legitimate, but unexplained prose is not a full German draft.
 if(out.status==='draft'&&/[א-ת]/.test(out.de)){
  const cited=[...out.de.matchAll(/[„‚]([^“’]+)[“’]/g)].map(m=>m[1]).filter(x=>/[א-ת]/.test(x));
  const instruction=/^(?:Gelesen|Geschrieben|Zu lesen|Zu schreiben)/.test(out.de);
  if(!instruction&&(!cited.length||cited.some(x=>fold(x)!==fold(e.label)))){out.status='partial';out.uncertain.push(r.text);out.de+=' [Hebräischer Wortlaut noch nicht vollständig übersetzt.]';}
 }
 if(out.uncertain.length)out.status='partial';return out;
}
function score(r,reading){
 const german=r.de.replace(/\[[^\]]*\]/g,'').replace(/[א-ת]/g,'').replace(/[^A-Za-zÄÖÜäöüß0-9]/g,'');
 return (r.status==='draft'?100000:0)+(r.method&&/editorial|manual/.test(r.method)?2000:0)+(r.method&&/aligned-quotation/.test(r.method)?(reading.references?.length?3000:1000):0)+Math.min(900,german.length)-Math.min(400,r.uncertain.join('').length);
}
function manualFor(r,e){
 const manual=exact.get(r.text),contextOK=manual&&(!manual.contexts||manual.contexts.some(c=>(c.label&&fold(c.label)===fold(e?.label))||(c.references||[]).some(ref=>(r.references||[]).includes(ref))));if(contextOK)return normalize({...manual,method:'manual-working-translation'},r,e);
 const ts=String(r.text||'').trim().split(/\s+/),marks='[\\u05c4\\u05c5\\u0307׳״]';
 // Individually marked R-P is the initials of 'verse beginning', not the lexical Rafe.
 if(ts.length===2&&new RegExp('^ר'+marks+'+פ'+marks+'+$').test(ts[1])){
  const n=fold(ts[0])==='ל'?1:P2.number(ts[0]),valid=fold(ts[0])==='ל'||new RegExp('^(?:[א-ת]'+marks+'+)+$').test(ts[0]);
  if(valid&&n!==null)return {uuid:r.uuid,de:(fold(ts[0])==='ל'?'Einmalig':n+'-mal')+' am Versanfang.',status:'draft',uncertain:[],method:'source-verified-formula'};
 }
 return null;
}
function translate(r,e){
 const key=JSON.stringify([r.text,r.references,e.label]);if(cache.has(key))return {...cache.get(key),uuid:r.uuid};
 const manual=manualFor(r,e);if(manual){cache.set(key,manual);return manual;}
 const options=[P2.translate(r,e),P1.translateReading(r,e),P0.translateReading(r,e),P3.translate(r)].map(x=>normalize(x,r,e)).filter(Boolean);
 options.sort((a,b)=>score(b,r)-score(a,r));const chosen=options[0]||{uuid:r.uuid,de:'[Unklar: '+r.text+']',status:'partial',uncertain:[r.text],method:'unresolved'};
 cache.set(key,chosen);return chosen;
}
function build(rows){return rows.map(e=>({ordinal:e.ordinal,uuid:e.uuid,sourceHash:e.sourceHash,readings:e.readings.map(r=>translate(r,e))}));}
module.exports={build,translate,manualFor};
if(require.main===module){const input=process.argv[2]||'/tmp/safran-masora-rest-6.jsonl',out=build(fs.readFileSync(input,'utf8').trim().split('\n').map(JSON.parse));fs.writeFileSync(path.join(__dirname,'../../../masora-translations/part-6.json'),JSON.stringify(out,null,2)+'\n');const rs=out.flatMap(e=>e.readings);console.log({notes:out.length,readings:rs.length,draft:rs.filter(r=>r.status==='draft').length,partial:rs.filter(r=>r.status==='partial').length});}
