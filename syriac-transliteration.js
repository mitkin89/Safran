// Exact SEDRA mappings. Input is explicit and case-sensitive, never guessed from Latin text.
(function(global){
'use strict';
function create(D){
 const supported=['sedra4','calcode','leiden'];
 function convert(value,scheme){
  if(!supported.includes(scheme))return {error:'scheme',queries:[]};
  const id=D.schemes.find(s=>s.code===scheme)?.id,map=new Map();
  for(const r of D.patterns){if(r.scheme_id!==id||!r.latin_char)continue;const to=r.latin_char===' '||/^\s+$/u.test(r.syriac_char)?' ':r.syriac_char;const values=map.get(r.latin_char)||new Set();values.add(to);map.set(r.latin_char,values);}
  const tokens=[...map.keys()].sort((a,b)=>b.length-a.length);let queries=[''];
  const input=String(value).normalize('NFC');
  for(let pos=0;pos<input.length;){
   const token=tokens.find(k=>input.startsWith(k,pos));
   const literal=input[pos];
   const options=token?[...map.get(token)]:/[\s*?"]/u.test(literal)?[literal]:null;
   if(!options)return {error:'character',character:literal,queries:[]};
   queries=[...new Set(queries.flatMap(q=>options.map(s=>q+s)))];
   if(queries.length>64)return {error:'ambiguous',queries:[]};
   pos+=token?token.length:1;
  }
  return {queries:[...new Set(queries.map(q=>q.trim()).filter(Boolean))]};
 }
 return {convert,supported};
}
let promise;
function load(){return promise||(promise=new Promise((resolve,reject)=>{if(global.SYRIAC_TRANSLITERATION_DATA){resolve(create(global.SYRIAC_TRANSLITERATION_DATA));return;}const s=document.createElement('script');s.src='syriac-transliteration-data.js';s.onload=()=>global.SYRIAC_TRANSLITERATION_DATA?resolve(create(global.SYRIAC_TRANSLITERATION_DATA)):reject(new Error('SEDRA transliteration data'));s.onerror=()=>reject(new Error('SEDRA transliteration data'));document.body.appendChild(s);}).catch(e=>{promise=null;throw e;}));}
const api={create,load};if(typeof module==='object'&&module.exports)module.exports=api;else global.SyriacTransliteration=api;
})(typeof window==='object'?window:globalThis);
