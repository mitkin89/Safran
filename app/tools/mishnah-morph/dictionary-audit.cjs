'use strict';
// Exhaustive lexical lookup, deliberately separate from morphological adjudication.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const M=require('../../mishnah-morph');
const ROOT=path.resolve(__dirname,'../..'),IDS=['d895bc1c727b','e8d290b744f6','d701423861c6'];
const consonants=s=>String(s).normalize('NFD').replace(/[^א-ת]/g,'');
const pointed=s=>M.normalize(s).replace(/[׳״]/g,'');
function dictionaries(){return IDS.map(id=>{const bytes=fs.readFileSync(path.join(ROOT,'bundled/dict',id+'.json.gz')),d=JSON.parse(zlib.gunzipSync(bytes)),index=new Map();
 d.heads.forEach((heads,entry)=>heads.forEach(head=>{const k=consonants(head);if(!k)return;const a=index.get(k)||[];a.push({entry,head});index.set(k,a);}));
 return {id,name:d.name,heads:d.heads,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),index};});}
function queries(row){const out=new Map();function add(text,kind){const key=consonants(text);if(key&&!out.has(key))out.set(key,{text,key,kind});}
 add(row.word,'surface');for(const a of row.analyses||[])add(M.headLemma(a),'candidate-lemma');
 // Proclitic removal offers search targets, never an assigned segmentation.
 let rest=pointed(row.word);for(let depth=0;depth<3;depth++){
  const cs=rest.match(/[א-ת][\u05b0-\u05bc\u05c1\u05c2\u05c7]*/gu)||[];if(cs.length<3)break;
  const first=cs[0];if(!/^(?:ו[\u05b0\u05b7\u05b8\u05bc]|[בכל][\u05b0-\u05bb]|מ[\u05b4\u05b5]|ש[\u05b6\u05b7]|ה[\u05b6\u05b7\u05b8])/.test(first))break;
  rest=cs.slice(1).join('').replace(/^([א-ת][\u05b0-\u05c7]*)/,s=>s.replace(/\u05bc/g,''));add(rest,'possible-proclitic-remainder');
 }return [...out.values()];}
function lookup(row,dicts){return queries(row).map(q=>({...q,matches:dicts.flatMap(d=>(d.index.get(q.key)||[]).map(h=>({dictId:d.id,dict:d.name,entry:h.entry,head:h.head,match:pointed(q.text)===pointed(h.head)?(/[\u05b0-\u05bc]/.test(q.text)&&/[\u05b0-\u05bc]/.test(h.head)?'pointed-head':'exact-head'):'consonantal-head'})))}));}
function build(){const D=require('../../mishnah-zeraim-data'),dicts=dictionaries(),groups=new Map();
 for(const [title,source]of Object.entries(D.sources))source.chapters.forEach((ch,c)=>ch.forEach((unit,m)=>unit.forEach((id,t)=>{const f=D.forms[id];if(!['unresolved','partial','ambiguous'].includes(f.status))return;
 const k=f.key+'|'+f.status+'|'+JSON.stringify(f.analyses),r=groups.get(k)||{word:f.word,key:f.key,status:f.status,analyses:f.analyses,count:0,positions:[]};r.count++;r.positions.push({title,ref:`${c+1}:${m+1}`,token:t+1});groups.set(k,r);
 })));
 const rows=[...groups.values()].map(r=>({...r,queries:lookup(r,dicts)}));
 const summary={groups:rows.length,positions:rows.reduce((n,r)=>n+r.count,0),withHit:rows.filter(r=>r.queries.some(q=>q.matches.length)).length,withoutHit:rows.filter(r=>!r.queries.some(q=>q.matches.length)).length,byDictionary:Object.fromEntries(dicts.map(d=>[d.name,rows.filter(r=>r.queries.some(q=>q.matches.some(h=>h.dictId===d.id))).length]))};
 const audit={version:1,scope:'Every unresolved/partial/ambiguous group in the current Seder Zeraim candidate corpus',method:'Dictionary head/alias lookup; candidates and possible proclitic remainders remain search targets, not confirmed analyses. No inferred POS or genus from a search hit.',dictionaries:dicts.map(({id,name,sha256})=>({id,name,sha256})),summary,rows};
 fs.writeFileSync(path.join(__dirname,'zeraim-dictionary-audit.json'),JSON.stringify(audit,null,2)+'\n');
 const forms={};for(const r of rows){const list=forms[r.key]||[];for(const q of r.queries)for(const h of q.matches){const hit={...h,query:q.text,queryKind:q.kind};if(!list.some(a=>a.dictId===h.dictId&&a.entry===h.entry&&a.query===q.text))list.push(hit);}forms[r.key]=list;}
 for(const r of [...require('./zeraim-dictionary-decisions.json'),...require('./zeraim-context-review-1.json')]){
  const key=M.normalize(r.word),list=forms[key]||[];
  for(const e of r.evidence){const d=dicts.find(d=>d.id===e.dictId),head=d?.heads[e.entry]?.[0];if(!head)throw Error('Dictionary entry missing');
   if(!list.some(h=>h.dictId===e.dictId&&h.entry===e.entry))list.push({dictId:d.id,dict:d.name,entry:e.entry,head,query:r.word,queryKind:'reviewed-lexical-evidence',match:'reviewed-entry'});
  }forms[key]=list;
 }
 const out={version:1,dictionaries:audit.dictionaries,summary,forms};fs.writeFileSync(path.join(ROOT,'mishnah-dictionary-data.js'),'// Generated lexical search evidence, not validated morphology.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.MISHNAH_DICTIONARY_DATA=D;})('+JSON.stringify(out)+');\n');console.log(summary);return audit;
}
module.exports={consonants,pointed,queries,lookup,dictionaries,build};if(require.main===module)build();
