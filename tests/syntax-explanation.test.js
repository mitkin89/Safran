'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {searchFiles}=require('../searchcore'),P=require('../syntax-pattern'),E=require('../syntax-explanation'),Types=require('../syntax-types'),BHSA=require('../bhsa-index');
const entries=require('../bundled/manifest.json').items.filter(e=>['Genesis','Exodus'].includes(e.title)&&e.versionTitle.startsWith('Westminster'));
const term=(role,lemma='',gram={},position)=>({op:'term',role,lemma,gram,...(position?{position}:{})});
const run=pattern=>searchFiles({dir:path.join(__dirname,'../bundled'),entries,params:{syntax:{pattern},perFile:1000}});
const flat=p=>[p,...(p.children||[]).flatMap(flat)];
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const t=(s,...args)=>s.replace(/\{\}/g,()=>String(args.shift()));
test('Proofs identify the exact source head, morphology condition and measured gap',async()=>{
 const r=await run({op:'all',children:[term('verb','ירד'),term('subject','בת',{gender:'f'},{relative:'verb',order:'after',maxGap:0})]});
 const hit=r.results.find(x=>x.title==='Exodus'&&x.path[0]===1&&x.path[1]===4);assert(hit);
 const proof=hit.explanation.proofs.flatMap(flat).find(p=>p.rule?.role==='subject');assert.equal(proof.value,true);
 assert.deepEqual(proof.words[0].indices,[1]);assert.equal(proof.words[0].position.gap,0);assert.deepEqual(proof.words[0].position.indices,[0]);
 assert(proof.words[0].morph.includes('N'));
 const html=E.render(hit.explanation,{esc,t});assert(html.includes('Warum dieser Treffer?'));assert(html.includes('Genus: f.'));assert(html.includes('0 Wörter dazwischen'));
});
test('NOT explains the failed child condition; simple clause searches also carry reasons',async()=>{
 const r=await run({op:'all',children:[term('verb','ברא'),{op:'not',children:[term('object','אדם')]}]});
 const hit=r.results.find(x=>x.title==='Genesis'&&x.path[0]===0&&x.path[1]===0);assert(hit);
 const neg=hit.explanation.proofs.flatMap(flat).find(p=>p.op==='not');assert.equal(neg.value,true);assert.equal(neg.children[0].value,false);
 const simple=await searchFiles({dir:path.join(__dirname,'../bundled'),entries,params:{syntax:{verb:'ברא',subject:'אלהים'}}});
 assert(simple.results[0].explanation.simple);assert.equal(simple.results[0].explanation.conditions.length,2);assert(E.render(simple.results[0].explanation,{esc,t}).includes('אלהים'));
});
test('Bundled BHSA kind/type features cover all source rows and nominal clauses do not invent verbs',async()=>{
 const index=await BHSA.readBundled();assert.deepEqual(index.clauseFeatures,['kind','typ']);
 for(const book of Object.values(index.books))for(const [,rows]of Object.values(book))for(const row of rows){assert(Types.kinds[row[7]]);assert(Types.types[row[8]]);}
 const r=await run({op:'all',children:[{op:'term',role:'kind',value:'NC'},{op:'term',role:'clauseType',value:'NmCl'}]});assert(r.results.length);
 assert(r.results.some(x=>x.title==='Genesis'&&x.path[0]===0&&x.path[1]===1));
 for(const hit of r.results)assert(hit.syntax.every(x=>x.bhsa.kind==='NC'&&x.bhsa.type==='NmCl'));
 const nominal=r.results.find(x=>x.title==='Genesis'&&x.path[0]===0&&x.path[1]===1);assert(nominal.syntax.every(x=>x.verb===''));assert(nominal.parts.some(p=>p.m));
 assert.equal(P.clean({op:'term',role:'clauseType',value:'invented-type'}),null);
});
test('Explanation rendering escapes source text and preserves bounds notices',()=>{
 const html=E.render({proofs:[{op:'term',value:true,ref:'1:1',rule:{role:'verb',lemmas:['<script>']},words:[{text:'<img onerror=x>',ref:'1:1'}]},{truncated:true}],omitted:3},{esc,t});
 assert(!html.includes('<img'));assert(html.includes('&lt;img'));assert(html.includes('Erklärung gekürzt.'));assert(html.includes('3 weitere Treffer im Vers'));
});

test('Unclassified text domain is unknown under NOT rather than a false negative',()=>{
 const {create}=require('../syntax-pattern-matcher');
 const w={form:'אור',normalized:'אור',lemma:'216',morph:'HNcmsa'};
 const index={text:{'1:1':'אור'},pairs:{}},book={'1:1':['אור',[[1,'?',false,null,[0],'NA',null,'NC','NmCl']]]};
 const matcher=create(index,book,[['x']],P.clean({op:'not',children:[{op:'term',role:'domain',value:'Q'}]}),()=>[w],()=>false,()=> 'אור');assert.equal(matcher([0,0]),null);
});
