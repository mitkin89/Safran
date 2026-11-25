'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../syntax-pattern'),{searchFiles}=require('../searchcore'),BHSA=require('../bhsa-index');
const entries=require('../bundled/manifest.json').items.filter(e=>e.title==='Genesis'&&e.versionTitle.startsWith('Westminster'));
const term=(role,lemma='',gram={})=>({op:'term',role,lemma,gram});
const all=(...children)=>({op:'all',children}),any=(...children)=>({op:'any',children}),not=child=>({op:'not',children:[child]});
const run=pattern=>searchFiles({dir:require('node:path').join(__dirname,'../bundled'),entries,params:{syntax:{pattern},perFile:1000}});
const includes=(r,key)=>r.results.some(x=>x.path.map(i=>i+1).join(':')===key);
test('Pattern validation rejects invalid, too large and deeply nested expressions',()=>{
 assert(P.clean(all(term('verb','בָּרָא',{stem:'q'}),not(term('object','אדם')))));
 for(const n of [all(),{op:'not',children:[term('verb'),term('subject')]},term('verb','English'),term('verb','',{stem:'bogus'}),{op:'unknown'}])assert.equal(P.clean(n),null);
 let deep=term('verb');for(let i=0;i<8;i++)deep=not(deep);assert.equal(P.clean(deep),null);
 assert.equal(P.clean({op:'all',children:Array.from({length:13},()=>term('verb'))}),null);
});
test('NOT preserves unknown annotations and OR highlights only successful branches',()=>{
 const t=()=>null,r=()=>[];assert.equal(P.evaluate(P.clean(not(term('subject','אדם'))),{},t,r).value,null);
 const tree=P.clean(any(term('subject','אדם'),term('verb','אמר')));
 assert.equal(P.evaluate(tree,{},n=>n.role==='verb'?true:null,r).value,true);
});
test('Real Genesis predicates combine roles, morphology and nested exclusions',async()=>{
 const r=await run(all(term('subject','אלהים'),term('verb','ברא',{stem:'q'}),not(term('object','אדם'))));
 assert(includes(r,'1:1'));assert(!includes(r,'1:27'));
 assert(r.results[0].syntax.length);assert(r.results[0].parts.some(x=>x.m));
 // Two verbs in one verse are not one predicate.
 const impossible=await run(all(term('verb','אמר'),term('verb','היה')));assert.equal(impossible.results.length,0);
 const either=await run(any(term('verb','אמר'),term('verb','היה')));assert(includes(either,'1:3'));
});
test('BHSA-linked clauses are explicit, source-backed and can cross verses',async()=>{
 const data=await BHSA.readBundled();assert.equal(data.patternVersion,1);assert(Object.keys(data.clauseParents).length>80000);
 const result=await run(all(term('verb'),{op:'related',relation:'child',child:term('verb')}));
 assert(result.results.length>0);
 for(const hit of result.results){
  const clauses=hit.syntax.map(x=>x.clauseRef);assert(clauses.length>1);
  assert(hit.syntax.every(x=>x.bhsa.relation));
 }
 const attr=await run(all(term('verb'),{op:'related',relation:'child',child:{op:'term',role:'relation',value:'Attr'}}));
 assert(attr.results.length>0);assert(attr.results.some(x=>x.syntax.some(c=>c.bhsa.relation==='Attr')));
});

test('Missing role and unaligned linked clauses cannot become NOT matches',()=>{
 const create=require('../syntax-pattern-matcher').create;
 const text=[['אמר']],read=()=>[{form:'אמר',normalized:'אמר',morph:'HVqp3ms',lemma:'559'}];
 const source={text:{'1:1':'אמר'},pairs:{}};
 const bhsa={'1:1':['אמר',[[1,'?N',false,null,[0],'NA',90]]]};
 const match=pattern=>create(source,bhsa,text,P.clean(pattern),read,()=>true,()=> 'אמר',{2:1})([0,0]);
 assert.equal(match(all(term('verb'),not(term('subject','אלהים')))),null);
 assert.equal(match(all(term('verb'),not({op:'related',relation:'parent',child:term('verb')}))),null);
 assert.equal(match(all(term('verb'),not({op:'related',relation:'child',child:term('verb')}))),null);
 assert(match(term('verb','אמר')),'verb-only queries can use morphology without a role record');
});
