// Shared bounded query tree for the clause-search editor and worker.
(function(){
'use strict';
const roles=['verb','subject','object','referent','domain','relation'];
const relations=['Attr','Coor','Subj','Objc','Cmpl','Adju','Resu','NA'];
function clean(input){
 let count=0;
 function walk(n,depth){
  if(!n||typeof n!=='object'||depth>6||++count>40)throw Error('pattern limit');
  if(['all','any','not'].includes(n.op)){
   if(!Array.isArray(n.children)||!n.children.length||n.children.length>12||(n.op==='not'&&n.children.length!==1))throw Error('group');
   return {op:n.op,children:n.children.map(c=>walk(c,depth+1))};
  }
  if(n.op==='related'){
   if(!['child','parent','later'].includes(n.relation))throw Error('relation');
   return {op:'related',relation:n.relation,child:walk(n.child,depth+1)};
  }
  if(n.op!=='term'||!roles.includes(n.role))throw Error('term');
  if(['domain','relation'].includes(n.role)){
   if(!(n.role==='domain'?['N','D','Q']:relations).includes(n.value))throw Error('value');
   return {op:'term',role:n.role,value:n.value};
  }
  const words=String(n.lemma??(Array.isArray(n.lemmas)?n.lemmas.join(' '):'')).trim().split(/[\s,]+/u).filter(Boolean);
  if(words.length>12||words.some(w=>! /^[\u0591-\u05C7א-ת]+$/u.test(w)||!/[א-ת]/u.test(w)))throw Error('lemma');
  const gram={};
  const values={pos:['V','N','Nc','Np','Ng','A','P','R','C','D','T'],stem:[...'qNpPhHtoOraiG'],tense:[...'pqiwvhjarsc'],person:[...'123'],gender:[...'mfbc'],number:[...'spd'],state:[...'acd'],suffix:['0','1'],article:['0','1']};
  for(const [k,allowed]of Object.entries(values)){
   const v=n.gram?.[k];if(v){if(typeof v!=='string'||!allowed.includes(v))throw Error('grammar');gram[k]=v;}
  }
  let position;
  if(n.position){
   const p=n.position;
   if(!['verb','subject','object'].includes(n.role)||!['verb','subject','object'].includes(p.relative)||n.role===p.relative||!['before','after','either'].includes(p.order))throw Error('position');
   const maxGap=p.maxGap??null;
   if(maxGap!==null&&(!Number.isInteger(maxGap)||maxGap<0||maxGap>200))throw Error('gap');
   position={relative:p.relative,order:p.order,maxGap};
  }
  return {op:'term',role:n.role,lemmas:words.map(w=>w.replace(/[^א-ת]/g,'')),gram,...(position?{position}:{})};
 }
 try{return walk(input,0);}catch{return null;}
}
// Three-valued logic: missing annotation stays unknown under NOT as well.
function evaluate(n,context,term,related){
 if(n.op==='term')return {value:term(n,context),contexts:[context]};
 if(n.op==='related'){
  const xs=related(context,n.relation);if(xs===null)return {value:null,contexts:[]};
  const rs=xs.map(c=>evaluate(n.child,c,term,related)),ok=rs.filter(r=>r.value===true);
  return {value:ok.length?true:rs.some(r=>r.value===null)?null:false,contexts:ok.flatMap(r=>r.contexts)};
 }
 const rs=n.children.map(c=>evaluate(c,context,term,related));
 if(n.op==='not')return {value:rs[0].value===null?null:!rs[0].value,contexts:[context]};
 if(n.op==='all')return {value:rs.some(r=>r.value===false)?false:rs.some(r=>r.value===null)?null:true,contexts:rs.flatMap(r=>r.contexts)};
 const ok=rs.filter(r=>r.value===true);
 return {value:ok.length?true:rs.some(r=>r.value===null)?null:false,contexts:ok.flatMap(r=>r.contexts)};
}
const api={clean,evaluate,relations};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.SyntaxPattern=api;
})();
