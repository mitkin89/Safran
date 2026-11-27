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
function renderings(indices,lemma,scope='all'){
 const by=new Map();
 for(const source of scope==='all'?sources:[scope]){
  const entry=(source==='LXX'?indices.LXX:indices.hexapla?.renderings?.[source])?.[lemma];if(!entry)continue;
  const [labels,cells]=entry;
  for(const [g,,n,encoded]of cells){
   const raw=labels[g],label=typeof raw==='string'?raw:raw.forms[0],type=typeof raw==='string'?'lemma':raw.type;
   if(!label||label==='*'||!n)continue;
   const key=JSON.stringify([label,type]),item=by.get(key)||{label,type,count:0,sources:{}};
   const edition=item.sources[source]||{count:0,refs:new Set()};let ref=0;
   for(const delta of String(encoded||'').split('.').filter(Boolean)){ref+=parseInt(delta,36);edition.refs.add(ref);}
   edition.count+=n;item.count+=n;item.sources[source]=edition;by.set(key,item);
  }
 }
 return [...by.values()].map(r=>({...r,sources:Object.entries(r.sources).map(([source,d])=>({source,count:d.count,refs:[...d.refs].sort((a,b)=>a-b)}))})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
}
function occurrences(indices,lemma,head,fold,scope='all'){
 const rows=[];
 for(const source of scope==='all'?sources:[scope]){
  const entry=(source==='LXX'?indices.LXX:indices.hexapla?.renderings?.[source])?.[lemma];if(!entry)continue;
  for(const [g,code,,encoded,forms] of entry[1]){
   const label=entry[0][g],word=typeof label==='string'?label:label.forms[0];
   if(fold(word)!==fold(head))continue;
   let ref=0;
   String(encoded||'').split('.').filter(Boolean).forEach((delta,i)=>{
    ref+=parseInt(delta,36);rows.push({source,ref,code,form:source==='LXX'?forms?.[i]||'':forms||''});
   });
  }
 }
 return rows.sort((a,b)=>a.ref-b.ref||sources.indexOf(a.source)-sources.indexOf(b.source));
}
const api={sources,collect,renderings,occurrences};if(typeof module==='object'&&module.exports)module.exports=api;else root.WordCardHebrew=api;
})(typeof window==='object'?window:globalThis);
