// Shared bounded query tree for the clause-search editor and worker.
(function(){
'use strict';
const Types=typeof module!=='undefined'&&module.exports?require('./syntax-types'):window.SyntaxTypes;
const wordRoles=['verb','subject','object','referent','secondObject','prepositional','adverbial','attribute'];
const roles=['secondObject','prepositional','adverbial','attribute','kind','clauseType','verb','subject','object','referent','domain','relation'];
const relations=['Attr','Coor','Subj','Objc','Cmpl','Adju','Resu','NA'];
function clean(input){
 let count=0;
 function walk(n,depth){
  if(!n||typeof n!=='object'||depth>6||++count>40)throw Error('pattern limit');
  if(['all','any','not'].includes(n.op)){
   if(!Array.isArray(n.children)||!n.children.length||n.children.length>12||(n.op==='not'&&n.children.length!==1))throw Error('group');
   return {op:n.op,children:n.children.map(c=>walk(c,depth+1))};
  }
  if(n.op==='dependent'){
   const child=walk(n.child,depth+1);
   const scoped=x=>x.op==='term'?x.role==='attribute':['all','any','not'].includes(x.op)&&x.children.every(scoped);
   if(!scoped(child))throw Error('attribute scope');
   return {op:'dependent',child};
  }
  if(n.op==='same'){
   if(!wordRoles.includes(n.role))throw Error('binding role');
   const child=walk(n.child,depth+1);
   const scoped=x=>x.op==='term'?x.role===n.role:x.op==='dependent'||['all','any','not'].includes(x.op)&&x.children.every(scoped);
   if(!scoped(child))throw Error('binding scope');
   return {op:'same',role:n.role,child};
  }
  if(n.op==='related'){
   if(!['child','parent','later','ancestor','descendant'].includes(n.relation))throw Error('relation');
   const path={};
   if(['ancestor','descendant'].includes(n.relation)){
    const minDepth=n.minDepth??1,maxDepth=n.maxDepth??5;
    if(!Number.isInteger(minDepth)||!Number.isInteger(maxDepth)||minDepth<1||maxDepth<minDepth||maxDepth>12)throw Error('path depth');
    Object.assign(path,{minDepth,maxDepth});
   }
   return {op:'related',relation:n.relation,...path,child:walk(n.child,depth+1)};
  }
  if(n.op!=='term'||!roles.includes(n.role))throw Error('term');
  if(['domain','relation','kind','clauseType'].includes(n.role)){
   if(!(n.role==='domain'?['N','D','Q']:n.role==='relation'?relations:Object.keys(n.role==='kind'?Types.kinds:Types.types)).includes(n.value))throw Error('value');
   return {op:'term',role:n.role,value:n.value};
  }
  const mode=n.mode??'lemma';if(!['lemma','root'].includes(mode))throw Error('mode');
  if(mode==='root'&&(typeof n.family!=='string'||! /^(heb|arc):[a-zA-Z0-9._-]{1,32}$/.test(n.family)))throw Error('family');
  const words=String(n.lemma??(Array.isArray(n.lemmas)?n.lemmas.join(' '):'')).trim().split(/[\s,]+/u).filter(Boolean);
  if(words.length>12||words.some(w=>! /^[\u0591-\u05C7א-ת]+$/u.test(w)||!/[א-ת]/u.test(w)))throw Error('lemma');
  const gram={};
  const values={pos:['V','N','Nc','Np','Ng','A','P','R','C','D','T'],stem:[...'qNpPhHtoOraiG'],tense:[...'pqiwvhjarsc'],person:[...'123'],gender:[...'mfbc'],number:[...'spd'],state:[...'acd'],suffix:['0','1'],article:['0','1']};
  for(const [k,allowed]of Object.entries(values)){
   const v=n.gram?.[k];if(v){if(typeof v!=='string'||!allowed.includes(v))throw Error('grammar');gram[k]=v;}
  }
  let preposition;
  if(n.preposition){if(n.role!=='prepositional'||typeof n.preposition!=='string'||!['ב','כ','ל','מ','אל','על','את','עם','מן','עד','בין','אחר','תחת','לפני'].includes(n.preposition))throw Error('preposition');preposition=n.preposition;}
  let position;
  if(n.position){
   const p=n.position;
   if(!wordRoles.filter(r=>r!=='referent').includes(n.role)||!wordRoles.filter(r=>r!=='referent').includes(p.relative)||n.role===p.relative||!['before','after','either'].includes(p.order))throw Error('position');
   const maxGap=p.maxGap??null;
   if(maxGap!==null&&(!Number.isInteger(maxGap)||maxGap<0||maxGap>200))throw Error('gap');
   position={relative:p.relative,order:p.order,maxGap};
  }
  return {op:'term',role:n.role,lemmas:mode==='root'?[]:words.map(w=>w.replace(/[^א-ת]/g,'')),gram,...(preposition?{preposition}:{}),...(mode==='root'?{mode,family:n.family}:{}),...(position?{position}:{})};
 }
 function scopes(n,bound=false){if(n.op==='dependent')return bound&&scopes(n.child,false);if(n.op==='same')return scopes(n.child,true);return n.children?n.children.every(c=>scopes(c,bound)):n.child?scopes(n.child,false):true;}
 try{const out=walk(input,0);return scopes(out)?out:null;}catch{return null;}
}
// Three-valued logic: missing annotation stays unknown under NOT as well.
function evaluate(n,context,term,related){
 if(n.op==='term')return {value:term(n,context),contexts:[context]};
 if(['related','same','dependent'].includes(n.op)){
  const xs=related(context,n.op==='same'?'same':n.op==='dependent'?'dependent':n.relation,n);if(xs===null)return {value:null,contexts:[]};
  const rs=xs.map(c=>evaluate(n.child,c,term,related)),ok=rs.filter(r=>r.value===true);
  return {value:ok.length?true:xs.unknown||rs.some(r=>r.value===null)?null:false,contexts:ok.flatMap(r=>r.contexts)};
 }
 const rs=n.children.map(c=>evaluate(c,context,term,related));
 if(n.op==='not')return {value:rs[0].value===null?null:!rs[0].value,contexts:[context]};
 if(n.op==='all')return {value:rs.some(r=>r.value===false)?false:rs.some(r=>r.value===null)?null:true,contexts:rs.flatMap(r=>r.contexts)};
 const ok=rs.filter(r=>r.value===true);
 return {value:ok.length?true:rs.some(r=>r.value===null)?null:false,contexts:ok.flatMap(r=>r.contexts)};
}
const api={clean,evaluate,relations,wordRoles};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.SyntaxPattern=api;
})();
