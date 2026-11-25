'use strict';
const {readFileSync}=require('node:fs'),{gunzipSync}=require('node:zlib'),{createHash}=require('node:crypto'),path=require('node:path');
function load(book,text){
 const data=JSON.parse(gunzipSync(readFileSync(path.join(__dirname,'../../bundled/syntax-alignment.json.gz')))),proof=data.books[book],tokens=[];
 text.forEach((ch,c)=>ch.forEach((html,v)=>{let i=0;for(const w of html.matchAll(/<span class="w" data-l="[^"]*" data-m="[^"]*">(.*?)<\/span>/gu))tokens.push({ref:(c+1)+':'+(v+1),at:i++,form:w[1].replace(/[^א-ת]/gu,'')});}));
 const hash=createHash('sha256').update(tokens.map(t=>t.ref+'\t'+t.at+'\t'+t.form).join('\n')).digest('hex');
 if(hash!==proof.tokenHash)throw Error('Stale OSHB alignment proof: '+book);
 return {data,proof,tokens};
}
function project(rows,tokens,proof,basis='ketiv'){
 const variants=new Map(proof.variants.map(([i,k])=>[i,k]));
 const selected=tokens.map((t,i)=>({...t,index:i})).filter(t=>variants.get(t.index)!==(basis==='ketiv'?'qere':'ketiv'));
 const mapping=new Map(),verified=new Set(),rejected=[];
 function exact(source,target){
  if(source.map(x=>x.form).join('')!==target.map(x=>x.form).join(''))return false;
  let ti=0,used=0;
  for(const word of source){
   const parts=[];let left=word.form.length;
   while(left){const t=target[ti],take=Math.min(left,t.form.length-used);parts.push([t.ref,t.at,take]);left-=take;used+=take;if(used===t.form.length){used=0;ti++;}}
   mapping.set(word.key,parts);
  }return true;
 }
 if(exact(rows.flatMap(r=>r.words),selected))rows.forEach(r=>verified.add(r.ref));
 else for(const r of rows){const span=proof.sourceVerses[r.ref],target=span?tokens.slice(span[0],span[1]).map((t,i)=>({...t,index:span[0]+i})).filter(t=>variants.get(t.index)!==(basis==='ketiv'?'qere':'ketiv')):[];if(span&&exact(r.words,target))verified.add(r.ref);else rejected.push({ref:r.ref,reason:span?'different_consonants':'missing_source_reference',source:r.words.map(w=>w.form).join(''),target:target.map(w=>w.form).join('')});}
 return {mapping,verified,rejected};
}
module.exports={load,project};
