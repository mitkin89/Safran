// Pairwise chapter vocabulary and morphology, using exact OSHB lexical IDs.
(function(){
'use strict';
const node=typeof module==='object'&&module.exports,S=node?require('./passage-statistics'):window.PassageStatistics,P=node?require('./passage'):window.Passage;
function collect(rows,index){
 const words=new Map(),families=new Map(),stems=new Map(),forms=new Map();let total=0;
 for(const row of rows)for(const w of S.tokens(row.html)){
  if(!w.lemma)continue;total++;
  const add=(map,key,value)=>{let r=map.get(key);if(!r){r={...value,n:0,refs:[]};map.set(key,r);}r.n++;if(!r.refs.includes(String(row.label)))r.refs.push(String(row.label));};
  if(!P.isFunction(w.pos)){
   add(words,w.lang+'|'+w.lemma,{w,key:w.lang+'|'+w.lemma});
   const f=index.roots?.[w.lemma];if(f)add(families,f.lang+'|'+f.id,{key:f.lang+'|'+f.id,root:f.root});
  }
  if(w.pos==='Verb'){add(stems,w.lang+'|'+w.stem,{key:w.lang+'|'+w.stem,stem:w.stem});add(forms,w.code,{key:w.code,stem:w.stem,tense:w.tense,info:w.info});}
 }
 return {words,families,stems,forms,total,verses:rows.length};
}
function compare(aRows,bRows,index){
 const a=collect(aRows,index),b=collect(bRows,index);
 const pair=(A,B)=>[...new Set([...A.keys(),...B.keys()])].map(key=>{
  const x=A.get(key),y=B.get(key),nA=x?.n||0,nB=y?.n||0,rateA=a.total?1000*nA/a.total:0,rateB=b.total?1000*nB/b.total:0;
  return {...(x||y),key,nA,nB,rateA,rateB,delta:rateA-rateB,refsA:x?.refs||[],refsB:y?.refs||[]};
 });
 const all=pair(a.words,b.words),sort=(x,y)=>Math.abs(y.delta)-Math.abs(x.delta)||(y.nA+y.nB)-(x.nA+x.nB)||x.key.localeCompare(y.key);
 return {a:{words:a.total,verses:a.verses,lemmas:a.words.size},b:{words:b.total,verses:b.verses,lemmas:b.words.size},
  shared:all.filter(x=>x.nA&&x.nB).sort((x,y)=>Math.min(y.rateA,y.rateB)-Math.min(x.rateA,x.rateB)||sort(x,y)),
  differences:all.filter(x=>Math.abs(x.delta)>1e-9).sort(sort),onlyA:all.filter(x=>!x.nB).sort((x,y)=>y.nA-x.nA||sort(x,y)),onlyB:all.filter(x=>!x.nA).sort((x,y)=>y.nB-x.nB||sort(x,y)),
  roots:pair(a.families,b.families).sort(sort),stems:pair(a.stems,b.stems).sort(sort),forms:pair(a.forms,b.forms).sort(sort)};
}
const api={compare};if(node)module.exports=api;else window.ChapterComparison=api;
})();
