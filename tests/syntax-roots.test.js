'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const P=require('../syntax-pattern'),Roots=require('../syntax-roots'),{searchFiles}=require('../searchcore');
const {create}=require('../syntax-pattern-matcher');
const family={op:'term',role:'verb',mode:'root',family:'heb:gyx',lemma:'מלא',gram:{}};
test('Explicit source families include related lemmas while separating Hebrew and Aramaic homonyms',()=>{
 assert(Roots.matches('heb:gyx',{lemma:'4390',morph:'HVqp3ms'}));
 assert(Roots.matches('heb:gyx',{lemma:'4393',morph:'HNcmsa'}));
 assert.equal(Roots.matches('heb:gyx',{lemma:'4391',morph:'AVqp3ms'}),false);
 assert.equal(Roots.matches('arc:oop',{lemma:'4391',morph:'AVqp3ms'}),true);
 assert.equal(Roots.matches('heb:gyx',{lemma:'unknown',morph:'HNcmsa'}),null);
 assert.equal(Roots.matches('heb:gyx',{lemma:'b/4393',morph:'HR/Ncmsa'}),true);
});
test('Family IDs are required, validated and retained by normalization',()=>{
 const q=P.clean(family);assert(q);assert.deepEqual(q.lemmas,[]);assert.deepEqual(P.clean(q),q);assert(Roots.valid(q));
 assert.equal(P.clean({...family,family:''}),null);assert.equal(P.clean({...family,mode:'fuzzy-root'}),null);
 assert.equal(Roots.valid(P.clean({...family,family:'heb:not-a-family'})),false);
});
test('Real nominal subjects can match the verb-derived family using their own annotated lemma ID',async()=>{
 const entries=require('../bundled/manifest.json').items.filter(e=>e.title==='Genesis'&&e.versionTitle.startsWith('Westminster'));
 const run=pattern=>searchFiles({dir:path.join(__dirname,'../bundled'),entries,params:{syntax:{pattern},perFile:1000}});
 const root=await run(family);
 assert(root.results.length>0);
 // Genesis 48:19: זרעו is the subject, with a different lemma from the verb זרע.
 const seed=require('../passage-stats-data').roots['2232'];assert(seed);
 const seedSubjects=await run({op:'term',role:'subject',mode:'root',family:seed.lang+':'+seed.id,lemma:'זרע',gram:{pos:'Nc',number:'s',suffix:'1'},position:{relative:'verb',order:'before',maxGap:0}});
 assert(seedSubjects.results.some(r=>r.path[0]===47&&r.path[1]===18));
 const seedObjects=await run({op:'term',role:'object',mode:'root',family:seed.lang+':'+seed.id,gram:{pos:'Nc'}});assert(seedObjects.results.length>0);
 const wrongLanguage=await run({...family,role:'subject',family:'arc:oop'});assert.equal(wrongLanguage.results.length,0);
});
test('Unknown root mappings stay unknown under NOT',()=>{
 const word={form:'אמר',normalized:'אמר',lemma:'559',morph:'HVqp3ms'};
 const index={text:{'1:1':'אמר'},pairs:{'1:1':[[0,'אמר',[],[],[],[],[],[]]]}},book={'1:1':['אמר',[[1,'?N',false,null,[0],'NA',null]]]};
 const run=pattern=>create(index,book,[['x']],P.clean(pattern),()=>[word],()=>true,()=> 'אמר',{},()=>null)([0,0]);
 assert.equal(run({op:'not',children:[family]}),null);
});
