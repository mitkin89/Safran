'use strict';
const Pattern=require('./syntax-pattern');
function create(index,book,text,pattern,readWords,grammarMatches,lemmaOf,parents={}){
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
   for(const at of row[4])if(!seen.has(at)&&rows.filter(x=>x[4].includes(at)).length===1&&grammarMatches(words[at],{}))out.push({ref,row,words,pair:null,at});
  }return out;
 }
 function term(n,c){
  if(n.role==='domain')return c.row[1].at(-1)===n.value;
  if(n.role==='relation')return c.row[5]===undefined?null:c.row[5]===n.value;
  if(n.role==='verb')return (!n.lemmas.length||n.lemmas.includes(c.pair?.[1]||lemmaOf(c.words[c.at])))&&grammarMatches(c.words[c.at],n.gram);
  if(!c.pair)return null;
  const head=n.role==='subject'?2:n.role==='object'?4:6,refs=head+1;
  if(n.role==='referent'&&!c.pair[refs].length)return null;
  if(n.role==='referent'&&c.pair[refs].some(([r,ids])=>{const ws=verse(r);return !ws||ids.some(i=>!ws[i]);}))return null;
  return n.lemmas.length?c.pair[head].some(l=>n.lemmas.includes(l)):c.pair[refs].length>0;
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
