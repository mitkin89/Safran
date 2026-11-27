(function(root){
'use strict';
const fold=s=>String(s||'').normalize('NFD').replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]);
const meaning=s=>String(s||'').toLowerCase().split(/[;,]/)[0].replace(/\b(to|a|an|the|be)\b/g,'').replace(/[^a-z ]/g,'').trim().replace(/\s+/g,' ');
function group(items,hebrew){
 const out=[],seen=new Set();
 const expanded=items.flatMap(item=>item.root&&item.language==='Aramäisch'&&item.lexemes?.length?item.lexemes:[item]);
 for(const item of expanded){
  if(seen.has(item.key))continue;seen.add(item.key);
  if(item.language!=='Aramäisch'||item.root){out.push(item);continue;}
  const spelling=fold(hebrew(item.rootLabel||item.label));
  // One Aramaic entry across witnesses; source lexemes retain separate meanings and IDs.
  const old=spelling&&out.find(x=>x.kind==='aramaic'&&x.spelling===spelling);
  if(old){old.members.push(item);old.count+=item.count||0;continue;}
  out.push({key:'arc:'+spelling,kind:'aramaic',language:'Aramäisch',label:item.label,spelling,count:item.count,members:[item]});
 }
 return out.filter(x=>!(x.root&&x.language==='Aramäisch'&&out.some(g=>g.kind==='aramaic'&&g.spelling===fold(x.label)))).map(x=>{
  if(x.kind!=='aramaic')return x;
  const glosses=[...new Set(x.members.map(m=>m.gloss).filter(Boolean))];
  x.gloss=glosses.slice(0,3).join(' / ')+(glosses.length>3?' …':'');
  x.label=x.spelling;
  x.displayLabels=[x.spelling,...new Set(x.members.filter(m=>m.kind==='peshitta'&&fold(hebrew(m.label))===x.spelling).map(m=>m.label))];
  x.root=true;
  return x;
 });
}
const api={group,fold,meaning};if(typeof module==='object'&&module.exports)module.exports=api;else root.WordCardSuggestions=api;
})(typeof window==='object'?window:globalThis);
