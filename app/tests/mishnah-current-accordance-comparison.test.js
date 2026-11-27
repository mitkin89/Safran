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
});
test('screenshot surface and split-span warnings take precedence over the local target spelling',()=>{
 const n=C.normalizeObservation({title:'Mishnah Test',ref:'1:1',sourceTextHash:'bound',sourceWordId:'K.1/word/0',sourceWord:'בית',accordance:{surface:'בת',lexemes:['בית'],rawTags:['cm fm sg']}},{});
 assert.equal(n.word,'בת');assert.equal(C.compareObservation(book([]),n).status,'surface-or-segmentation-difference');
 const grouped=C.normalizeObservation({sourceWordIds:['K.1/word/0','K.1/word/1'],sourceWord:'בית',confidence:'clear'},{});
 assert.equal(grouped.alignment,'many-to-one');
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
