(function(root){
'use strict';
const fold=s=>String(s||'').normalize('NFD').replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]);
const meaning=s=>String(s||'').toLowerCase().split(/[;,]/)[0].replace(/\b(to|a|an|the|be)\b/g,'').replace(/[^a-z ]/g,'').trim().replace(/\s+/g,' ');
function group(items,hebrew){
 const out=[];
 for(const item of items){
  if(item.language!=='Aramäisch'||item.root){out.push(item);continue;}
  const spelling=fold(hebrew(item.label)),sense=meaning(item.groupGloss||item.gloss);
  // Group the search presentation only; each source keeps its own lexical ID.
  const old=spelling&&sense&&out.find(x=>x.kind==='aramaic'&&x.spelling===spelling&&x.sense===sense);
  if(old){old.members.push(item);old.count+=item.count||0;continue;}
  out.push({key:'arc:'+item.key,kind:'aramaic',language:'Aramäisch',label:item.label,gloss:item.gloss,spelling,sense,count:item.count,members:[item]});
 }
 return out.map(x=>x.kind==='aramaic'&&x.members.length===1?x.members[0]:x);
}
const api={group,fold,meaning};if(typeof module==='object'&&module.exports)module.exports=api;else root.WordCardSuggestions=api;
})(typeof window==='object'?window:globalThis);
