// Counts and comparisons over OSHB tokens; no guessed roots or cross-verse n-grams.
(function(){
'use strict';
const node=typeof module!=='undefined'&&module.exports;
const Morph=node?require('./morph'):window.Morph,P=node?require('./passage'):window.Passage;
function tokens(html){
 const out=[];
 for(const m of String(html||'').matchAll(/<span class="w" data-l="([^"]*)" data-m="([^"]*)">(.*?)<\/span>/g)){
  const d=Morph.decode(m[2],m[1]),seg=d?.segs[d.main];
  out.push({word:P.bare(m[3]),raw:m[3].replace(/<[^>]*>/g,''),lemma:seg?.lemma||null,l:m[1],m:m[2],pos:seg?.pos||'',stem:seg?.stem,tense:seg?.tense,info:seg?.info||'',code:d?d.lang+m[2].slice(1).split('/')[d.main]:'',lang:d?.lang||'H'});
 }
 return out;
}
function analyze(rows,index,book,chapter){
 const units=rows.map((r,i)=>({label:String(r.label??i+1),tokens:tokens(r.html)})),map=new Map(),formMap=new Map();
 for(const unit of units)for(const t of unit.tokens){
  if(!t.lemma)continue;
  let w=map.get(t.lemma);if(!w){w={...t,n:0,stems:{}};map.set(t.lemma,w);}w.n++;if(t.stem)w.stems[t.stem]=(w.stems[t.stem]||0)+1;
  if(t.pos==='Verb'){const f=formMap.get(t.code)||{...t,n:0};f.n++;formMap.set(t.code,f);}
 }
 const bookData=index.books[book];if(!bookData)return null;
 const stats=P.stats([...map.values()],{tot:l=>index.lemmas[l]||0,N:index.N,verses:units.length,bookTot:l=>bookData.lemmas[l]||0});if(!stats)return null;
 const all=[...map.values()].map(w=>({w,n:w.n,T:index.lemmas[w.lemma]||0,B:bookData.lemmas[w.lemma]||0}));
 const content=all.filter(r=>!/^Eigenname$/.test(r.w.pos)&&!P.isFunction(r.w.pos));
 // Normalized frequency against the rest of the chosen corpus. Half-count
 // smoothing keeps exclusive words finite; this is a ranking, not a p-value.
 const compare=(field,N)=>N<=stats.words?[]:content.filter(r=>r.n>=3||r.n>=2&&r[field]<=5).map(r=>{
  const outside=Math.max(0,r[field]-r.n),size=N-stats.words,fold=((r.n+.5)/(stats.words+1))/((outside+.5)/(size+1));
  return {...r,fold,k:r.n*Math.log(fold),outside,rateHere:1000*r.n/stats.words,rateRest:1000*outside/size};
 }).filter(r=>r.k>0).sort((a,b)=>b.k-a.k||b.n-a.n);
 for(const list of [stats.names,stats.vocab,stats.only,stats.verbs,...stats.tiers.map(t=>t.items)])for(const r of list)r.B=bookData.lemmas[r.w.lemma]||0;
 const rareIn=field=>content.filter(r=>r[field]>0&&r[field]<=19).sort((a,b)=>a[field]-b[field]||b.n-a.n||a.T-b.T||a.w.lemma.localeCompare(b.w.lemma));
 const vocabularyIn=field=>{const tiers=[['>500',n=>n>500],['100–500',n=>n>=100&&n<=500],['20–99',n=>n>=20&&n<100],['2–19',n=>n>=2&&n<20],['1',n=>n===1]];return {tiers:tiers.map(([key,f])=>({key,items:content.filter(r=>f(r[field])).sort((a,b)=>b.n-a.n||a[field]-b[field])})).filter(t=>t.items.length),vocab:content.filter(r=>r[field]>0&&r[field]<100).sort((a,b)=>a[field]-b[field]||b.n-a.n)};};
 const families=new Map();
 for(const r of content){const family=index.roots[r.w.lemma];if(!family)continue;const key=family.lang+'|'+family.id;let f=families.get(key);if(!f){f={...family,n:0,items:[]};families.set(key,f);}f.n+=r.n;f.items.push(r);}
 const phrases=new Map();
 for(const unit of units)for(const len of [2,3])for(let i=0;i+len<=unit.tokens.length;i++){
  const ts=unit.tokens.slice(i,i+len);if(ts.some(t=>!t.lemma))continue;
  const key=ts.map(t=>t.lang+':'+t.lemma).join('|'),p=phrases.get(key)||{tokens:ts,n:0,refs:[],length:len};p.n++;if(!p.refs.includes(unit.label))p.refs.push(unit.label);phrases.set(key,p);
 }
 const tenses=new Map(),forms=[...formMap.values()].sort((a,b)=>b.n-a.n||a.code.localeCompare(b.code));let verbs=0;
 for(const f of forms){verbs+=f.n;tenses.set(f.tense,(tenses.get(f.tense)||0)+f.n);}
 return {...stats,book,all,comparisonAvailable:{book:bookData.N>stats.words,tanakh:index.N>stats.words},comparisons:{book:compare('B',bookData.N),tanakh:compare('T',index.N)},rare:rareIn('T'),rareByCorpus:{book:rareIn('B'),tanakh:rareIn('T')},vocabularyByCorpus:{book:vocabularyIn('B'),tanakh:vocabularyIn('T')},families:[...families.values()].sort((a,b)=>b.n-a.n),rootWords:[...families.values()].reduce((n,f)=>n+f.n,0),forms,tenses:[...tenses].map(([tense,n])=>({tense,n,pct:Math.round(1000*n/verbs)/10})).sort((a,b)=>b.n-a.n),phrases:[...phrases.values()].filter(p=>p.n>=2).sort((a,b)=>b.n-a.n||b.length-a.length),evidence:units.map(u=>({verse:u.label,sources:index.coverage[book]?.[chapter+':'+u.label]||0}))};
}
function profile(rows,index,book,chapter,links=[]){
 const bookData=index.books[book];if(!bookData)return [];
 return rows.map((r,i)=>{
  const verse=String(r.label??i+1),ts=tokens(r.html).filter(t=>t.lemma),content=ts.filter(t=>t.pos!=='Eigenname'&&!P.isFunction(t.pos));
  const rare=field=>content.filter(t=>{const n=field[t.lemma]||0;return n>=1&&n<=19;}).length;
  const comments=new Set(links.filter(l=>l.type==='commentary'&&Number(l.v1)>0&&Number(verse)>=Number(l.v1)&&Number(verse)<=Number(l.v2||l.v1)).map(l=>l.other).filter(Boolean));
  const sources=index.coverage[book]?.[chapter+':'+verse]||0;
  return {verse,words:ts.length,rare:{book:rare(bookData.lemmas),tanakh:rare(index.lemmas)},comments:comments.size,sources,sourceKinds:[1,2,4,8].filter(bit=>sources&bit).length};
 });
}
const concentration=(here,total)=>total>1&&here<=total&&here/total>=.5?Math.round(100*here/total):null;
const api={tokens,analyze,concentration,profile};if(node)module.exports=api;else window.PassageStatistics=api;
})();
