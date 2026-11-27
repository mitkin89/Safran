'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../tools/mishnah-morph/compare-current-accordance.cjs');
function book(analyses){return {title:'Mishnah Test',source:{textHash:'bound'},units:{'1:1':{id:'K.1',offsetText:'בית',words:[{text:'בית',start:0,end:3}]}},sources:{'Mishnah Test':{chapters:[[[0]]]}},forms:[{word:'בית',analyses}]};}
function obs(extra={}){return {title:'Mishnah Test',ref:'1:1',textHash:'bound',wordId:'K.1/word/0',wordIndex:0,word:'בית',lex:'בית',tags:'cm ms sg cnst',confidence:'clear',alignment:'one-to-one',image:{file:'reference.png'},...extra};}
test('visible tags compare only explicit head features, without inferred suffixes or lexical both-gender range',()=>{
 assert.deepEqual(C.parseHead('prp; cm bth sg cnst').features,{type:'N',number:'s',state:'c'});
 const r=C.compareObservation(book([{lemma:'בית',morph:'HNcmsc/Sp3ms'}]),obs());
 assert.equal(r.status,'visible-head-features-compatible');assert.equal(r.lexicalComparison.status,'candidate-head-lexeme-present-in-visible-components');
 assert(!('suffix' in r.parsed.features));
 const preposition=C.compareObservation(book([{lemma:'ב',morph:'HR/Sp3ms'}]),obs({tags:'prp',lex:'ב'}));
 assert.equal(preposition.status,'visible-head-features-compatible','the visible preposition is compared to R, never to its unprinted suffix');
});
test('unresolved source cards are bound through exact source spans, without invented analysis provenance',()=>{
 assert.equal(C.compareObservation(book([]),obs()).status,'draft-unresolved');
 assert.equal(C.compareObservation(book([]),obs({textHash:'wrong'})).status,'binding-refused');
 assert.equal(C.compareObservation(book([]),obs({wordId:'other/word/0'})).status,'binding-refused');
 assert.equal(C.compareObservation(book([]),obs({word:'בת'})).status,'surface-or-segmentation-difference');
});
test('partial nominal gender does not become a complete noun agreement',()=>{
 const r=C.compareObservation(book([{lemma:'בית',morph:'H',partialFeatures:{gender:'m'}}]),obs());
 assert.equal(r.status,'draft-partial-visible-features');assert(r.candidates[0].missing.includes('type'));
});
test('unknown source tags and split source groups remain review cases',()=>{
 assert.equal(C.compareObservation(book([]),obs({tags:'unknown-tag'})).status,'reference-features-not-parsed');
 assert.equal(C.compareObservation(book([]),obs({alignment:'one-to-many'})).status,'reference-needs-review');
 const r=C.compareObservation(book([{lemma:'בנה',morph:'HVqp3ms'}]),obs({tags:'pi imprf 3 ms sg'}));
 assert.equal(r.status,'visible-head-feature-difference');assert(r.candidates[0].different.some(d=>d.feature==='stem'));
 const lexical=C.compareObservation(book([{lemma:'גג',morph:'HNcmsc'}]),obs());
 assert.equal(lexical.status,'visible-head-features-compatible');assert.equal(lexical.lexicalComparison.status,'candidate-head-lexeme-differs');
 const partial=C.normalizeObservation({...obs(),sourceTextHash:'bound',sourceWordId:'K.1/word/0',sourceWordIndex:0,confidence:undefined,status:'partial-visible-raw-observation'},{});
 assert.equal(C.compareObservation(book([]),partial).status,'reference-needs-review');
});
test('screenshot surface and split-span warnings take precedence over the local target spelling',()=>{
 const n=C.normalizeObservation({title:'Mishnah Test',ref:'1:1',sourceTextHash:'bound',sourceWordId:'K.1/word/0',sourceWord:'בית',accordance:{surface:'בת',lexemes:['בית'],rawTags:['cm fm sg']}},{});
 assert.equal(n.word,'בת');assert.equal(C.compareObservation(book([]),n).status,'surface-or-segmentation-difference');
 const grouped=C.normalizeObservation({sourceWordIds:['K.1/word/0','K.1/word/1'],sourceWord:'בית',confidence:'clear'},{});
 assert.equal(grouped.alignment,'many-to-one');
 for(const literal of [{actualObservedWord:'בת'},{observation:{observedWord:'בת'}},{observed:{word:'בת'}}]){
  assert.equal(C.normalizeObservation({sourceWord:'בית',word:'בית',...literal},{}).word,'בת','literal observed aliases precede the local target');
 }
});
test('overlapping observations count once and contradictory visible features remain explicit',()=>{
 const one=C.compareObservation(book([{lemma:'בית',morph:'HNcmsc'}]),obs());
 const two=C.compareObservation(book([{lemma:'בית',morph:'HNcmsc'}]),obs({tags:'cm ms pl cnst'}));
 const summary=C.summarizePositions([one,{...one},two,{...one,status:'binding-refused',sourceWordId:'invalid'}]);
 assert.equal(summary.positions.length,1);assert.equal(summary.positions[0].observationRows,3);
 assert.equal(summary.positions[0].status,'conflicting-visible-reference-features');
 assert.deepEqual(summary.positions[0].conflictingReferenceFeatures,[{feature:'number',values:['p','s']}]);
 assert.deepEqual(C.summarizePositions([one,one]).counts,{'visible-head-features-compatible':1});
});
test('a verified visible word group covers its source parts only as review evidence',()=>{
 const d=book([]);d.units['1:1'].words.push({text:'פי',start:4,end:6});
 const o=obs({groupWordIds:['K.1/word/0','K.1/word/1'],alignment:'many-to-one'}),r=C.compareObservation(d,o);
 assert.equal(r.status,'reference-needs-review');assert(!r.candidates);
 const summary=C.summarizePositions([r]);assert.equal(summary.positions.length,2);
 assert(summary.positions.every(p=>p.status==='reference-needs-review'));
 assert.equal(C.compareObservation(d,{...o,groupWordIds:['K.1/word/0','OTHER/word/1']}).status,'binding-refused');
});

test('Kodashim scope uses exactly its own eleven catalog entries and observation prefix',()=>{
 const path=require('node:path'),fs=require('node:fs'),vm=require('node:vm'),root=path.resolve(__dirname,'..'),ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'mishnah-kaufmann-kodashim-catalog.js'),'utf8'),ctx);
 const expected=Object.values(ctx.window)[0],scope=C.selectScope('kodashim');
 assert.equal(scope.catalogFile,'mishnah-kaufmann-kodashim-catalog.js');assert.equal(scope.scopeBooks.length,11);assert.deepEqual(scope.scopeBooks.map(x=>x.title),Object.keys(expected));
 for(const {title}of scope.scopeBooks)assert.equal(scope.catalog[title].file,expected[title].file);
 assert(!scope.catalog['Mishnah Sotah']);assert(!scope.catalog['Mishnah Shabbat']);
 assert(scope.observationPattern.test('accordance-kodashim-current-menachot-b-observations.json'));assert(!scope.observationPattern.test('accordance-nashim-current-sotah-observations.json'));assert(!scope.observationPattern.test('accordance-kodashim-current-menachot-b-observationsXjson'));
 assert.throws(()=>C.selectScope('zeraim'),/Supply --seder/);
});
test('existing Moed and Nashim scope selection retains completion-audit order and original catalog',()=>{
 const fs=require('node:fs'),path=require('node:path');for(const seder of ['moed','nashim']){const scope=C.selectScope(seder),expected=JSON.parse(fs.readFileSync(path.join(__dirname,'../tools/mishnah-morph/moed-nashim-morphology-completion-'+seder+'-audit.json'))).books;assert.equal(scope.catalogFile,'mishnah-accordance-catalog.js');assert.deepEqual(scope.scopeBooks.map(x=>x.title),expected.map(x=>x.title));}
});
test('Kodashim selection refuses incomplete and foreign catalog projections',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'kodashim-scope-'));try{const cat=C.selectScope('kodashim').catalog;for(const entries of [Object.entries(cat).slice(1),Object.entries(cat).map(([title,item],i)=>[title,{...item,file:i?'mishnah-kaufmann-kodashim-fixture-data.js':'mishnah-kaufmann-accordance-sotah-data.js'}])]){fs.writeFileSync(path.join(dir,'mishnah-kaufmann-kodashim-catalog.js'),'window.C='+JSON.stringify(Object.fromEntries(entries)));assert.throws(()=>C.selectScope('kodashim',dir),/Incomplete or foreign/);}}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
