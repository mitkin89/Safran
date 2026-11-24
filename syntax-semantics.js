'use strict';
const data=require('./bundled/syntax-semantic.json');
const roles=['recipient','beneficiary','location'];
function heads(book,ref,at,role,words,lemmaOf){
 const xs=data.records.filter(x=>x.book===book&&x.ref===ref&&x.anchor===at&&x.role===role);
 if(xs.length!==1)return {complete:false,items:[]};
 const r=xs[0],signature=words.map(w=>w.normalized).join(' ');
 if(signature!==r.signature||words[at]?.normalized!==r.anchorForm||r.indices.some(i=>!words[i]))return {complete:false,items:[]};
 // Positive working annotations deliberately do not claim that every possible
 // semantic argument of the clause has been independently reviewed.
 return {complete:false,items:r.indices.map(i=>({ref,at:i,word:words[i],lemma:lemmaOf(words[i]),semantic:{source:data.source,status:data.status,rationale:r.rationale}}))};
}
module.exports={heads,roles,data};
