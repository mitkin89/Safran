'use strict';
const Pattern=require('./syntax-pattern');
function create(index,book,text,pattern,readWords,grammarMatches,lemmaOf,parents={},rootMatches=()=>null,describeRoot=()=>null){
 const lexical=n=>n.op==='term'?Pattern.wordRoles.includes(n.role):n.child?lexical(n.child):n.children.some(lexical);
 const typeOnly=!lexical(pattern);
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
   if(!row[4].length)continue;
   const start=out.length;
   const seen=new Set();
   for(const pair of index.pairs[ref]||[]){
    const at=pair[0];if(!row[4].includes(at)||rows.filter(x=>x[4].includes(at)).length!==1)continue;
    if(!validGroups([...pair[3],...pair[5]],row))continue;
    out.push({ref,row,words,pair,at,noVerb:grammarMatches(words[at],{pos:'V'})!==true});seen.add(at);
   }
   // Morphology/domain queries can still use verbs without MACULA role annotation.
   for(const at of row[4])if(!seen.has(at)&&rows.filter(x=>x[4].includes(at)).length===1&&grammarMatches(words[at],{pos:'V'}))out.push({ref,row,words,pair:null,at});
   if(out.length===start)out.push({ref,row,words,pair:null,at:row[4][0],noVerb:true});
  }return out;
 }
 function heads(c,role){
  if(c.binding?.role===role)return {complete:true,items:[c.binding.head]};
  if(['secondObject','prepositional','adverbial','attribute'].includes(role)){
   const records=(index.constituents?.[c.ref]||[]).filter(x=>x[0]===c.at);
   if(records.length!==1)return {complete:false,items:[]};
   const data=records[0][1][role];if(!data)return {complete:false,items:[]};
   let complete=data.complete;const items=[];
   for(const group of data.groups){
    const valid=group.refs.every(([ref,ids])=>{const ws=verse(ref),row=book[ref]?.[1].find(x=>x[0]===c.row[0]);return ws&&row&&ids.every(at=>ws[at]&&row[4].includes(at));});
    if(!valid){complete=false;continue;}
    for(const [ref,at,lemma]of group.heads){const ws=verse(ref);
     if(!ws?.[at]||lemmaOf(ws[at])!==lemma||!group.refs.some(([r,ids])=>r===ref&&ids.includes(at))){complete=false;continue;}
     const existing=items.find(x=>x.ref===ref&&x.at===at);
     if(existing){existing.prepositions=[...new Set([...existing.prepositions,...(group.prepositions||[])])];for(const gov of group.governors||[])if(!existing.governors.some(x=>x.join(':')===gov.join(':')))existing.governors.push(gov);existing.governorComplete&&=group.governorComplete===true;}
     else items.push({ref,at,lemma,word:ws[at],prepositions:group.prepositions||[],governors:[...(group.governors||[])],governorComplete:group.governorComplete===true});
    }
   }
   return {complete,items};
  }
  if(role==='verb'&&c.noVerb)return {complete:false,items:[]};
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
 function headMatch(n,c,head){
  if(n.preposition){if(!head.prepositions?.length)return null;if(!head.prepositions.includes(n.preposition))return false;}
  if(n.mode==='root'){const match=rootMatches(n.family,head.word);if(match!==true)return match;}
  else if(n.lemmas.length&&!n.lemmas.includes(head.lemma))return false;
  const grammar=grammarMatches(head.word,n.role==='verb'?{...n.gram,pos:'V'}:n.gram);
  if(grammar!==true)return grammar;
  if(!n.position)return true;
  const other=heads(c,n.position.relative);
  if(other.items.some(target=>positionMatch(head,target,n.position)))return true;
  return !other.complete||other.items.some(target=>target.ref!==head.ref)?null:false;
 }
 function term(n,c){
  if(n.role==='kind')return c.row[7]==null?null:c.row[7]===n.value;
  if(n.role==='clauseType')return c.row[8]==null?null:c.row[8]===n.value;
  if(n.role==='domain'){const domain=c.row[1].at(-1);return ['N','D','Q'].includes(domain)?domain===n.value:null;}
  if(n.role==='relation')return c.row[5]===undefined?null:c.row[5]===n.value;
  const constrained=n.mode==='root'||Object.keys(n.gram).length||n.position;
  // Keep the original lexical role matching when no token-level filter is set.
  if(['subject','object','referent'].includes(n.role)&&!constrained&&!c.binding){
   if(!c.pair)return null;
   const h=n.role==='subject'?2:n.role==='object'?4:6,refs=c.pair[h+1];
   if(n.role==='referent'&&(!refs.length||refs.some(([r,ids])=>{const ws=verse(r);return !ws||ids.some(i=>!ws[i]);})))return null;
   return n.lemmas.length?c.pair[h].some(l=>n.lemmas.includes(l)):refs.length>0;
  }
  const own=heads(c,n.role),matches=own.items.map(head=>headMatch(n,c,head));
  return matches.some(x=>x===true)?true:!own.complete||matches.some(x=>x===null)?null:false;
 }
 function related(c,relation,n={}){
  if(relation==='dependent'){
   if(!c.binding)return null;
   const source=c.binding.head;if(source.ref!==c.ref||!c.row[4].includes(source.at))return null;
   const own=heads({...c,binding:null},'attribute');
   let unknown=!own.complete;
   const xs=[];
   for(const head of own.items){
    const valid=head.governors.filter(([ref,at,lemma])=>{const ws=verse(ref),row=book[ref]?.[1].find(x=>x[0]===c.row[0]);return ws?.[at]&&row?.[4].includes(at)&&lemmaOf(ws[at])===lemma;});
    if(!head.governorComplete||valid.length!==head.governors.length)unknown=true;
    if(valid.some(([ref,at])=>ref===source.ref&&at===source.at))xs.push({...c,binding:{role:'attribute',head}});
   }
   xs.unknown=unknown;return xs;
  }
  if(relation==='same'){
   const own=heads(c,n.role),xs=own.items.map(head=>({...c,binding:{role:n.role,head}}));xs.unknown=!own.complete;return xs;
  }
  if(relation==='later')return contexts(c.ref).filter(x=>Math.min(...x.row[4])>Math.max(...c.row[4]));
  if(c.row.length<7)return null;
  const transitive=['ancestor','descendant'].includes(relation),up=['parent','ancestor'].includes(relation);
  const max=transitive?n.maxDepth:1,min=transitive?n.minDepth:1,out=[],seen=new Set([c.row[0]]);
  let frontier=[c.row[0]],unknown=false;
  const parentOf=id=>id===c.row[0]?c.row[6]:Object.hasOwn(parents,id)?parents[id]:[...(refsById.get(id)||[])].flatMap(ref=>book[ref][1]).find(row=>row[0]===id)?.[6];
  for(let depth=1;depth<=max&&frontier.length;depth++){
   const next=[];
   for(const id of frontier){
    const parent=up?parentOf(id):null;
    if(up&&parent===undefined){unknown=true;continue;}
    const ids=up?[parent].filter(Boolean):[...(children.get(id)||[])];
    for(const target of ids){
     if(seen.has(target)){unknown=true;continue;}seen.add(target);
     if(seen.size>4096){unknown=true;continue;}
     next.push(target);
     if(!refsById.has(target)){unknown=true;continue;}
     const xs=[...refsById.get(target)].flatMap(ref=>contexts(ref).filter(x=>x.row[0]===target));
     if(!xs.length)unknown=true;
     if(depth>=min)out.push(...xs.map(x=>({...x,pathDepth:depth})));
    }
   }
   frontier=next;
  }
  // An unavailable intermediate source node is not evidence of absence.
  if(!transitive&&unknown)return null;
  out.unknown=unknown;return out;
 }

 function displayQuery(n){
  if(n.op==='term')return n.mode==='root'?{...n,familyInfo:describeRoot(n.family)}:n;
  if(n.child)return {...n,child:displayQuery(n.child)};
  return {...n,children:n.children.map(displayQuery)};
 }
 function proof(n,c,budget){
  if(--budget.left<0)return {truncated:true};
  const value=Pattern.evaluate(n,c,term,related).value;
  const out={op:n.op,value,ref:c.ref,clause:c.row[0],kind:c.row[7],type:c.row[8],pathDepth:c.pathDepth,clauseText:c.row[4].map(i=>c.words[i]?.form||'').join(' ')};
  if(n.op==='term'){
   out.rule=n;
   if(['domain','relation','kind','clauseType'].includes(n.role)){
    out.actual=n.role==='domain'?c.row[1].at(-1):n.role==='relation'?c.row[5]:n.role==='kind'?c.row[7]:c.row[8];return out;
   }
   const own=heads(c,n.role),xs=value===true?own.items.filter(head=>headMatch(n,c,head)===true):own.items;
   out.words=xs.slice(0,8).map(head=>{
    const result={text:head.word.form,ref:head.ref,indices:[head.at],lemma:head.lemma,morph:head.word.morph,lemmaId:head.word.lemma,part:'head'};
    if(n.position){const target=heads(c,n.position.relative).items.find(x=>positionMatch(head,x,n.position));if(target)result.position={gap:Math.abs(head.at-target.at)-1,text:target.word.form,ref:target.ref,indices:[target.at]};}
    return result;
   });
   if(!out.words.length&&value===true&&c.pair&&['subject','object','referent'].includes(n.role)){
    const at=n.role==='subject'?3:n.role==='object'?5:7;
    out.words=c.pair[at].slice(0,8).flatMap(([ref,indices])=>{const words=verse(ref);return words?[{text:indices.map(i=>words[i].form).join(' '),ref,indices,part:'constituent'}]:[];});
   }
   if(n.mode==='root')out.family=describeRoot(n.family);
   out.headUncertain=!own.complete;return out;
  }
  if(['related','same','dependent'].includes(n.op)){
   out.role=n.role;out.minDepth=n.minDepth;out.maxDepth=n.maxDepth;out.pathDepth=c.pathDepth;out.relation=n.relation;out.expected=displayQuery(n.child);
   const candidates=related(c,n.op==='same'?'same':n.op==='dependent'?'dependent':n.relation,n);out.candidates=candidates?.length??null;
   if(!candidates){out.children=[];return out;}
   let hits=candidates.filter(x=>Pattern.evaluate(n.child,x,term,related).value===true);
   if(n.op==='related'&&!lexical(n.child))hits=hits.filter((x,i)=>hits.findIndex(y=>y.row[0]===x.row[0])===i);
   if(n.op!=='related')out.words=hits.slice(0,8).map(x=>({text:x.binding.head.word.form,ref:x.binding.head.ref,indices:[x.binding.head.at],part:'head'}));
   out.matches=hits.length;out.children=hits.slice(0,3).map(x=>proof(n.child,x,budget));out.omitted=Math.max(0,hits.length-3);return out;
  }
  const children=n.op==='any'&&value===true?n.children.filter(child=>Pattern.evaluate(child,c,term,related).value===true):n.children;
  out.children=children.map(child=>proof(child,c,budget));return out;
 }
 function evidence(c){
  const groups=refs=>refs.flatMap(([ref,ids])=>{const ws=verse(ref);return ws?[{text:ids.map(i=>ws[i]?.form||'').join(' '),ref:ref===c.ref?'':ref}]:[];});
  return {verb:c.noVerb?'':c.words[c.at].form,subjects:groups(c.pair?.[3]||[]),objects:groups(c.pair?.[5]||[]),referents:groups(c.pair?.[7]||[]),clauseRef:c.ref,
   bhsa:{domain:c.row[1].at(-1),resumes:c.row[2],parent:c.row[3],relation:c.row[5],kind:c.row[7],type:c.row[8]}};
 }
 return coords=>{
  const ref=(coords[0]+1)+':'+(coords[1]+1),words=verse(ref);if(!words)return null;
  const matched=new Set(),anchors=[];
  for(const c of contexts(ref)){const r=Pattern.evaluate(pattern,c,term,related);if(r.value===true){if(!typeOnly||!anchors.some(x=>x.row[0]===c.row[0]))anchors.push(c);matched.add(c);r.contexts.forEach(x=>matched.add(x));}}
  if(!matched.size)return null;
  const positions=new Set();
  function mark(n,c){
   if(n.op==='not')return;
   if(n.op==='term'){
    if(Pattern.wordRoles.includes(n.role))for(const head of heads(c,n.role).items)if(head.ref===ref&&headMatch(n,c,head)===true)positions.add(head.at);
   }else if(n.child){
    const xs=related(c,n.op==='same'?'same':n.op==='dependent'?'dependent':n.relation,n)||[];
    for(const x of xs)if(Pattern.evaluate(n.child,x,term,related).value===true)mark(n.child,x);
   }else for(const child of n.children)if(Pattern.evaluate(child,c,term,related).value===true)mark(child,c);
  }
  for(const c of matched){if(c.ref===ref){if(c.noVerb||typeOnly)c.row[4].forEach(i=>positions.add(i));else positions.add(c.at);}for(const [r,ids]of [...(c.pair?.[3]||[]),...(c.pair?.[5]||[])])if(r===ref)ids.forEach(i=>positions.add(i));}
  for(const c of anchors)mark(pattern,c);
  return {words,positions,evidence:[...matched].map(evidence),explanation:{proofs:anchors.slice(0,5).map(c=>proof(pattern,c,{left:100})),omitted:Math.max(0,anchors.length-5)}};
 };
}
module.exports={create};
