'use strict';
const Pattern=require('./syntax-pattern');
function create(index,book,text,pattern,readWords,grammarMatches,lemmaOf,parents={},rootMatches=()=>null,describeRoot=()=>null,options={}){
 const lexical=n=>n.op==='bind'?true:n.op==='term'?Pattern.wordRoles.includes(n.role):n.child?lexical(n.child):n.children.some(lexical);
 const typeOnly=!lexical(pattern);
 const coverage={versesVisited:0,textMismatch:0,noAlignedClause:0,contexts:0,matchedContexts:0,nonmatches:0,unknownContexts:0};
 const visited=new Set();
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
  }
  for(const c of out)if(c.noVerb&&!c.pair){
   const xs=(index.nominals?.[ref]||[]).filter(n=>n.refs.length&&n.refs.every(([r,ids])=>{
    const row=book[r]?.[1].find(x=>x[0]===c.row[0]);return verse(r)&&row&&row[4].length===ids.length&&ids.every(i=>row[4].includes(i));
   })&&n.refs.some(([r])=>r===ref));
   const parts=[...refsById.get(c.row[0])||[]];
   if(xs.length===1&&parts.every(r=>xs[0].refs.some(([ref])=>ref===r)))c.nominal=xs[0];
  }
  return out;
 }
 function heads(c,role){
  if(c.binding?.role===role)return {complete:true,items:[c.binding.head]};
  if(require('./syntax-semantics').roles.includes(role)){const data=require('./syntax-semantics').heads(options.book,c.ref,c.at,role,c.words,lemmaOf);return {...data,items:data.items.filter(h=>c.row[4].includes(h.at))};}
  if(['secondObject','prepositional','adverbial','attribute'].includes(role)||['subject','object'].includes(role)&&(c.nominal||index.constituents?.[c.ref]?.some(x=>x[0]===c.at&&x[1][role]))){
   const records=(index.constituents?.[c.ref]||[]).filter(x=>x[0]===c.at);
   if(!c.nominal&&records.length!==1)return {complete:false,items:[]};
   const data=c.nominal?.roles[role]||records[0]?.[1][role];if(!data)return {complete:false,items:[]};
   let complete=data.complete;const items=[];
   for(const group of data.groups){
    const valid=group.refs.every(([ref,ids])=>{const ws=verse(ref),row=book[ref]?.[1].find(x=>x[0]===c.row[0]);return ws&&row&&ids.every(at=>ws[at]&&row[4].includes(at));});
    if(!valid){complete=false;continue;}
    for(const [ref,at,lemma,meta]of group.heads){const ws=verse(ref);
     if(!ws?.[at]||(meta?!meta.form||!ws[at].normalized.includes(meta.form):lemmaOf(ws[at])!==lemma)||!group.refs.some(([r,ids])=>r===ref&&ids.includes(at))){complete=false;continue;}
     const existing=items.find(x=>x.ref===ref&&x.at===at&&x.sourceId===meta?.sourceId);
     if(existing){existing.prepositions=[...new Set([...existing.prepositions,...(group.prepositions||[])])];for(const gov of group.governors||[])if(!existing.governors.some(x=>x.join(':')===gov.join(':')))existing.governors.push(gov);existing.governorComplete&&=group.governorComplete===true;}
     else items.push({ref,at,lemma,word:ws[at],...(meta?{sourceId:meta.sourceId,grammarWord:lemmaOf(ws[at])===lemma?ws[at]:{...ws[at],morph:meta.morph,lemma:meta.lemma,sourceSegment:true}}:{}),prepositions:group.prepositions||[],governors:[...(group.governors||[])],governorComplete:group.governorComplete===true});
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
 function gap(source,target,c){
  if(source.ref!==target.ref||source.at===target.at)return null;
  const excluded=new Set((index.alignment?.variants||[]).filter(([r,,kind])=>r===source.ref&&kind===(c?.pair||c?.nominal?'ketiv':'qere')).map(([,at])=>at));
  if(excluded.has(source.at)||excluded.has(target.at))return null;
  let result=0;for(let i=Math.min(source.at,target.at)+1;i<Math.max(source.at,target.at);i++)if(!excluded.has(i))result++;
  return result;
 }
 function positionMatch(source,target,p,c){
  const distance=gap(source,target,c);if(distance===null)return null;
  return (p.order==='either'||(p.order==='before'?source.at<target.at:source.at>target.at))&&(p.maxGap===null||distance<=p.maxGap);
 }
 function identity(head){
  const xs=(index.identities?.[head.ref]||[]).filter(x=>x[0]===head.at&&x[1]===head.lemma);
  if(xs.length!==1||!verse(xs[0][2])?.[xs[0][3]])return null;
  return xs[0][4]?{id:xs[0][4],explicit:xs[0][5]===true}:null;
 }
 function headMatch(n,c,head){
  if(n.sameAs){
   const bound=c.vars?.[n.sameAs];if(!bound)return null;
   if(n.identity==='token'){if(bound.ref!==head.ref||bound.at!==head.at)return false;}
   else {const own=identity(head),other=identity(bound);if(!own||!other)return null;if(own.id!==other.id)return own.explicit&&other.explicit?false:null;}
  }
  if(n.preposition){if(!head.prepositions?.length)return null;if(!head.prepositions.includes(n.preposition))return false;}
  if(n.mode==='root'){const match=rootMatches(n.family,head.grammarWord||head.word);if(match!==true)return match;}
  else if(n.lemmas.length&&!n.lemmas.includes(head.lemma))return false;
  const grammar=grammarMatches(head.grammarWord||head.word,n.role==='verb'?{...n.gram,pos:'V'}:n.gram);
  if(grammar!==true)return grammar;
  if(!n.position)return true;
  const other=heads(c,n.position.relative);
  if(other.items.some(target=>positionMatch(head,target,n.position,c)===true))return true;
  return !other.complete||other.items.some(target=>positionMatch(head,target,n.position,c)===null)?null:false;
 }
 function term(n,c){
  if(n.role==='kind')return c.row[7]==null?null:c.row[7]===n.value;
  if(n.role==='clauseType')return c.row[8]==null?null:c.row[8]===n.value;
  if(n.role==='domain'){const domain=c.row[1].at(-1);return ['N','D','Q'].includes(domain)?domain===n.value:null;}
  if(n.role==='relation')return c.row[5]===undefined?null:c.row[5]===n.value;
  const constrained=n.mode==='root'||Object.keys(n.gram).length||n.position||n.sameAs;
  // Keep the original lexical role matching when no token-level filter is set.
  if(['subject','object','referent'].includes(n.role)&&!constrained&&!c.binding&&!c.nominal){
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
  if(relation==='bind'){
   const own=heads(c,n.role),xs=own.items.map(head=>({...c,binding:{role:n.role,head},vars:{...c.vars,[n.name]:head}}));xs.unknown=!own.complete;return xs;
  }
  if(relation==='same'){
   const own=heads(c,n.role),xs=own.items.map(head=>({...c,binding:{role:n.role,head}}));xs.unknown=!own.complete;return xs;
  }
  if(relation==='later')return contexts(c.ref).filter(x=>Math.min(...x.row[4])>Math.max(...c.row[4])).map(x=>({...x,vars:c.vars}));
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
     if(depth>=min)out.push(...xs.map(x=>({...x,pathDepth:depth,vars:c.vars})));
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
    const result={text:head.word.form,ref:head.ref,indices:[head.at],lemma:head.lemma,morph:(head.grammarWord||head.word).morph,lemmaId:(head.grammarWord||head.word).lemma,part:'head',...(head.semantic?{semantic:head.semantic}:{})};
    if(n.sameAs){const bound=c.vars?.[n.sameAs];result.reference={name:n.sameAs,identity:n.identity,ref:bound?.ref,text:bound?.word.form};}
    if(n.position){const target=heads(c,n.position.relative).items.find(x=>positionMatch(head,x,n.position,c)===true);if(target)result.position={gap:gap(head,target,c),text:target.word.form,ref:target.ref,indices:[target.at]};}
    return result;
   });
   if(!out.words.length&&value===true&&c.pair&&['subject','object','referent'].includes(n.role)){
    const at=n.role==='subject'?3:n.role==='object'?5:7;
    out.words=c.pair[at].slice(0,8).flatMap(([ref,indices])=>{const words=verse(ref);return words?[{text:indices.map(i=>words[i].form).join(' '),ref,indices,part:'constituent'}]:[];});
   }
   if(n.mode==='root')out.family=describeRoot(n.family);
   out.headUncertain=!own.complete;return out;
  }
  if(['related','same','dependent','bind'].includes(n.op)){
   out.role=n.role;out.name=n.name;out.minDepth=n.minDepth;out.maxDepth=n.maxDepth;out.pathDepth=c.pathDepth;out.relation=n.relation;out.expected=displayQuery(n.child);
   const candidates=related(c,n.op==='related'?n.relation:n.op,n);out.candidates=candidates?.length??null;
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
  return {verb:c.noVerb?'':c.words[c.at].form,subjects:groups(c.pair?.[3]||c.nominal?.roles.subject?.groups.flatMap(g=>g.refs)||[]),objects:groups(c.pair?.[5]||c.nominal?.roles.object?.groups.flatMap(g=>g.refs)||[]),referents:groups(c.pair?.[7]||[]),clauseRef:c.ref,
   bhsa:{domain:c.row[1].at(-1),resumes:c.row[2],parent:c.row[3],relation:c.row[5],kind:c.row[7],type:c.row[8]}};
 }
 const match=coords=>{
  const ref=(coords[0]+1)+':'+(coords[1]+1),words=verse(ref);
  if(!visited.has(ref)){visited.add(ref);coverage.versesVisited++;if(!words)coverage.textMismatch++;else if(!contexts(ref).length)coverage.noAlignedClause++;}
  if(!words)return null;
  const matched=new Set(),anchors=[];
  for(const c of contexts(ref)){const r=Pattern.evaluate(pattern,c,term,related);coverage.contexts++;coverage[r.value===true?'matchedContexts':r.value===false?'nonmatches':'unknownContexts']++;if(r.value===true){if(!typeOnly||!anchors.some(x=>x.row[0]===c.row[0]))anchors.push(c);matched.add(c);r.contexts.forEach(x=>matched.add(x));}}
  if(!matched.size)return null;
  const positions=new Set();
  function mark(n,c){
   if(n.op==='not')return;
   if(n.op==='term'){
    if(Pattern.wordRoles.includes(n.role))for(const head of heads(c,n.role).items)if(head.ref===ref&&headMatch(n,c,head)===true)positions.add(head.at);
   }else if(n.child){
    const xs=related(c,n.op==='related'?n.relation:n.op,n)||[];
    for(const x of xs)if(Pattern.evaluate(n.child,x,term,related).value===true)mark(n.child,x);
   }else for(const child of n.children)if(Pattern.evaluate(child,c,term,related).value===true)mark(child,c);
  }
  for(const c of matched){if(c.ref===ref){if(c.noVerb||typeOnly)c.row[4].forEach(i=>positions.add(i));else positions.add(c.at);}for(const [r,ids]of [...(c.pair?.[3]||[]),...(c.pair?.[5]||[])])if(r===ref)ids.forEach(i=>positions.add(i));}
  for(const c of anchors)mark(pattern,c);
  return {words,positions,evidence:[...matched].map(evidence),explanation:{proofs:anchors.slice(0,5).map(c=>proof(pattern,c,{left:100})),omitted:Math.max(0,anchors.length-5)}};
 };
 match.coverage=coverage;return match;
}
module.exports={create};
