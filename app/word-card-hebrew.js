// Reverse alignments retain their edition and lexical identity.
(function(root){
'use strict';
const sources=['LXX','Aquila','Symmachus','Theodotion'];
function collect(indices,head,fold,reverse){
 const result={};
 for(const source of sources){
  const data=source==='LXX'?indices.LXX:indices.hexapla?.renderings?.[source],labels=new Map();
  for(const [ls] of Object.values(data||{}))for(const label of ls){
   const selected=typeof label==='string'?{forms:[label]}:label;
   if(selected.type&&selected.type!=='lemma')continue;
   if(fold(selected.forms[0])===fold(head))labels.set(selected.key||selected.forms[0],selected);
  }
  const by=new Map();
  for(const selected of labels.values())for(const row of reverse(indices,source,selected)){
   const item=by.get(row.lemma)||{lemma:row.lemma,count:0,refs:new Set()};
   item.count+=row.count;row.refs.forEach(r=>item.refs.add(r));by.set(row.lemma,item);
  }
  result[source]=[...by.values()].map(r=>({...r,refs:[...r.refs].sort((a,b)=>a-b)})).sort((a,b)=>b.count-a.count);
 }
 const merged=new Map();
 for(const [source,rows]of Object.entries(result))for(const row of rows){
  const item=merged.get(row.lemma)||{lemma:row.lemma,count:0,refs:new Set(),sources:[]};
  item.count+=row.count;row.refs.forEach(r=>item.refs.add(r));item.sources.push({source,count:row.count,refs:row.refs});merged.set(row.lemma,item);
 }
 return {all:[...merged.values()].map(r=>({...r,refs:[...r.refs].sort((a,b)=>a-b)})).sort((a,b)=>b.count-a.count),...result};
}
const api={sources,collect};if(typeof module==='object'&&module.exports)module.exports=api;else root.WordCardHebrew=api;
})(typeof window==='object'?window:globalThis);
