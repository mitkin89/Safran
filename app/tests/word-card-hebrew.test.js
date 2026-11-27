'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {collect}=require('../word-card-hebrew'),{findAncient}=require('../rendering-search');
const fold=s=>s.normalize('NFD').replace(/\p{M}/gu,'');
test('Greek reverse alignments preserve source, lemma, counts and references',()=>{
 const indices={LXX:{'1':[['δοκέω'],[[0,'HN',2,'1.1']]],'2':[['λέγω'],[[0,'HN',9,'3']]]},hexapla:{renderings:{Aquila:{'3':[[{key:'lemma:δοκέω',type:'lemma',forms:['δοκέω']}],[[0,'HN',1,'4','δοκεῖ']]],'4':[[{key:'phrase:δοκέω',type:'phrase',forms:['δοκέω']}],[[0,'HN',8,'5','δοκεῖ']]]}}}};
 const result=collect(indices,'δοκέω',fold,findAncient);
 assert.deepEqual(result.LXX,[{lemma:'1',count:2,refs:[1,2]}]);
 assert.deepEqual(result.Aquila,[{lemma:'3',count:1,refs:[4]}]);
 assert.deepEqual(result.Symmachus,[]);assert.deepEqual(result.Theodotion,[]);
 assert.equal(result.all.reduce((n,r)=>n+r.count,0),3);
 assert.deepEqual(result.all[0].sources,[{source:'LXX',count:2,refs:[1,2]}]);
 assert.equal(result.Josephus,undefined);assert.equal(result.Philo,undefined);
});
