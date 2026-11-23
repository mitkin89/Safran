'use strict';
const Pattern=require('./syntax-pattern');
function create(index,book,text,pattern,readWords,grammarMatches,lemmaOf,parents={},rootMatches=()=>null){
 const verified=new Map(),cache=new Map(),refsById=new Map(),children=new Map();
 for(const [id,parent]of Object.entries(parents))if(parent){if(!children.has(parent))children.set(parent,new Set());children.get(parent).add(Number(id));}
 for(const [ref,entry]of Object.entries(book||{}))for(const row of entry[1]){
  if(!refsById.has(row[0]))refsById.set(row[0],new Set());refsById.get(row[0]).add(ref);
  if(row[6]){if(!children.has(row[6]))children.set(row[6],new Set());children.get(row[6]).add(row[0]);}
 }
 function verse(ref){
  if(!verified.has(ref)){
   const [c,v]=ref.split(':').map(Number),html=text[c-1]?.[v-1],words=typeof html==='string'?readWords(html):[];
   const signature=words.map(w=>w.normalized).join(' ');
   verified.set(ref,words.length&&signature===index.text[ref]&&signature===book?.[ref]?.[0]?words:null);
  }return verified.get(ref);
 }
 function contexts(ref){
  if(cache.has(ref))return cache.get(ref);
  const out=[],words=verse(ref);cache.set(ref,out);if(!words)return out;
  const rows=book[ref][1];
  const validGroups=(groups,row)=>groups.every(([r,positions])=>{
   const ws=verse(r),entry=book[r]?.[1].find(x=>x[0]===row[0]);
   return ws&&entry&&positions.every(i=>ws[i]&&entry[4].includes(i));
  });
  for(const row of rows){
   const seen=new Set();
   for(const pair of index.pairs[ref]||[]){
    const at=pair[0];if(!row[4].includes(at)||rows.filter(x=>x[4].includes(at)).length!==1)continue;
    if(!validGroups([...pair[3],...pair[5]],row))continue;
    out.push({ref,row,words,pair,at});seen.add(at);
   }
   // Morphology/domain queries can still use verbs without MACULA role annotation.
   for(const at of row[4])if(!seen.has(at)&&rows.filter(x=>x[4].includes(at)).length===1&&grammarMatches(words[at],{pos:'V'}))out.push({ref,row,words,pair:null,at});
  }return out;
 }
 function heads(c,role){
  if(role==='verb')return {complete:true,items:[{ref:c.ref,at:c.at,word:c.words[c.at],lemma:c.pair?.[1]||lemmaOf(c.words[c.at])}]};
  if(!c.pair)return {complete:false,items:[]};
  const h=role==='subject'?2:role==='object'?4:6,refs=c.pair[h+1],lemmas=[...new Set(c.pair[h])];
  if(role==='referent'&&!refs.length)return {complete:false,items:[]};
  const candidates=[];let complete=true;
  for(const [ref,ids]of refs){const words=verse(ref);if(!words){complete=false;continue;}
   for(const at of ids){const word=words[at];if(!word){complete=false;continue;}const lemma=lemmaOf(word);if(lemmas.includes(lemma)&&!candidates.some(x=>x.ref===ref&&x.at===at))candidates.push({ref,at,word,lemma});}
  }
  const items=[];
  // Repeated identical lemmas inside a constituent do not identify its head.
  for(const lemma of lemmas){const xs=candidates.filter(x=>x.lemma===lemma);if(xs.length===1)items.push(xs[0]);else complete=false;}
  if(refs.length&&!lemmas.length)complete=false;
  return {complete,items};
 }
 function positionMatch(source,target,p){
  if(source.ref!==target.ref||source.at===target.at)return false;
  return (p.order==='either'||(p.order==='before'?source.at<target.at:source.at>target.at))&&
   (p.maxGap===null||Math.abs(source.at-target.at)-1<=p.maxGap);
 }
 function term(n,c){
  if(n.role==='domain')return c.row[1].at(-1)===n.value;
  if(n.role==='relation')return c.row[5]===undefined?null:c.row[5]===n.value;
  const constrained=n.mode==='root'||Object.keys(n.gram).length||n.position;
  // Keep the original lexical role matching when no token-level filter is set.
  if(n.role!=='verb'&&!constrained){
   if(!c.pair)return null;
   const h=n.role==='subject'?2:n.role==='object'?4:6,refs=c.pair[h+1];
   if(n.role==='referent'&&(!refs.length||refs.some(([r,ids])=>{const ws=verse(r);return !ws||ids.some(i=>!ws[i]);})))return null;
   return n.lemmas.length?c.pair[h].some(l=>n.lemmas.includes(l)):refs.length>0;
  }
  const own=heads(c,n.role),other=n.position?heads(c,n.position.relative):null;
  let unknown=!own.complete;
  for(const head of own.items){
   if(n.mode==='root'){const match=rootMatches(n.family,head.word);if(match===null){unknown=true;continue;}if(!match)continue;}
   else if(n.lemmas.length&&!n.lemmas.includes(head.lemma))continue;
   const grammar=grammarMatches(head.word,n.role==='verb'?{...n.gram,pos:'V'}:n.gram);
   if(grammar===null){unknown=true;continue;}if(!grammar)continue;
   if(!other)return true;
   if(other.items.some(target=>positionMatch(head,target,n.position)))return true;
   if(!other.complete||other.items.some(target=>target.ref!==head.ref))unknown=true;
  }
  return unknown?null:false;
 }
 function related(c,relation){
  if(relation==='later')return contexts(c.ref).filter(x=>Math.min(...x.row[4])>Math.max(...c.row[4]));
  if(c.row.length<7)return null;
  const ids=relation==='parent'?[c.row[6]].filter(Boolean):[...(children.get(c.row[0])||[])];
  if(ids.some(id=>!refsById.has(id)))return null;
  return ids.flatMap(id=>[...(refsById.get(id)||[])].flatMap(ref=>contexts(ref).filter(x=>x.row[0]===id)));
 }
 function evidence(c){
  const groups=refs=>refs.flatMap(([ref,ids])=>{const ws=verse(ref);return ws?[{text:ids.map(i=>ws[i]?.form||'').join(' '),ref:ref===c.ref?'':ref}]:[];});
  return {verb:c.words[c.at].form,subjects:groups(c.pair?.[3]||[]),objects:groups(c.pair?.[5]||[]),referents:groups(c.pair?.[7]||[]),clauseRef:c.ref,
   bhsa:{domain:c.row[1].at(-1),resumes:c.row[2],parent:c.row[3],relation:c.row[5]}};
 }
 return coords=>{
  const ref=(coords[0]+1)+':'+(coords[1]+1),words=verse(ref);if(!words)return null;
  const matched=new Set();
  for(const c of contexts(ref)){const r=Pattern.evaluate(pattern,c,term,related);if(r.value===true){matched.add(c);r.contexts.forEach(x=>matched.add(x));}}
  if(!matched.size)return null;
  const positions=new Set();
  for(const c of matched){if(c.ref===ref)positions.add(c.at);for(const [r,ids]of [...(c.pair?.[3]||[]),...(c.pair?.[5]||[])])if(r===ref)ids.forEach(i=>positions.add(i));}
  return {words,positions,evidence:[...matched].map(evidence)};
 };
}
module.exports={create};
