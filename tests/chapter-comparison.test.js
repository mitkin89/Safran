'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{compare}=require('../chapter-comparison');
const w=(l,m='HNcmsa')=>`<span class="w" data-l="${l}" data-m="${m}">אב</span>`;
const a=[{label:'1',html:w('1')+w('1')+w('2')+w('c','HC')}],b=[{label:'2',html:w('1')+w('3')}];
test('chapter comparison normalizes by all recognized tokens and retains lexical identities',()=>{
 const x=compare(a,b,{roots:{'1':{lang:'H',id:'r1',root:'אב'},'2':{lang:'H',id:'r1',root:'אב'}}});
 assert.equal(x.a.words,3);assert.equal(x.b.words,2);assert.equal(x.shared.length,1);
 assert.equal(x.shared[0].rateA,2000/3);assert.equal(x.shared[0].rateB,500);
 assert.deepEqual(x.shared[0].refsA,['1']);assert.deepEqual(x.onlyA.map(x=>x.w.lemma),['2']);assert.deepEqual(x.onlyB.map(x=>x.w.lemma),['3']);
 assert.equal(x.roots[0].nA,3);assert.equal(x.roots[0].nB,1);
});
test('identical chapters have zero differences; empty chapters never produce infinite rates',()=>{
 assert.equal(compare(a,a,{}).differences.length,0);
 const x=compare(a,[],{});assert(x.differences.every(x=>Number.isFinite(x.rateB)));assert.equal(x.shared.length,0);
});
test('verb stem and form counts remain separate from vocabulary, with source verses',()=>{
 const x=compare([{label:'1',html:w('100','HVqp3ms')+w('100','HVqi3ms')+w('b/2','HR/Ncmsa')}],[{label:'7',html:w('100','HVqp3ms')}],{});
 assert.equal(x.stems.length,1);assert.equal(x.stems[0].nA,2);assert.equal(x.forms.length,2);assert.deepEqual(x.forms.find(x=>x.nB).refsB,['7']);
 assert.equal(x.onlyA[0].w.lemma,'2');
});

test('recognized function words count in denominators but not vocabulary lists',()=>{
 const x=compare([{label:'1',html:w('1')+w('853','HTo')}],[{label:'1',html:w('1')}],{});
 assert.equal(x.a.words,2);assert.equal(x.shared[0].rateA,500);assert.equal(x.shared[0].rateB,1000);assert.equal(x.onlyA.length,0);
});
