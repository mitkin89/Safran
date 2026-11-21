'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {find}=require('../rendering-search');
const enc=nums=>{let prev=0;return nums.map(n=>{const d=n-prev;prev=n;return d.toString(36);}).join('.');};
const index={books:['Genesis'],tr:{Zunz:{
  '1':[[['sprechen',['sprach',1],['sprechen',1]],['reden',['redet',1]]],[[0,'HV',1,enc([1001])],[0,'HV',1,enc([1001])],[1,'HV',1,enc([1002])]]],
  '2':[[['Sprechen',['spricht',1]]],[[0,'AV',1,enc([2001])]]],
  '3':[[['besprechen',['bespricht',1]]],[[0,'HV',1,enc([3001])]]]
},Philippson:{'4':[[['sprechen',['sprach',1]]],[[0,'HV',1,enc([1003])]]]}}};
test('reverse renderings span lemmas within one translation and preserve repeated occurrences',()=>{
 const found=find(index,'Zunz',' SPRECHEN ');
 assert.deepEqual(found.map(x=>[x.lemma,x.count]),[['1',2],['2',1]]);
 assert.deepEqual(found[0].refs,[1001,1001]);
 assert.deepEqual(found[1].languages,['arc']);
 assert.deepEqual(found[0].forms,[['sprach',1],['sprechen',1]]);
 assert.deepEqual(find(index,'Philippson','sprechen').map(x=>x.lemma),['4']);
});
test('reverse renderings use grouped base forms, no substring or synonym matching',()=>{
 assert.deepEqual(find(index,'Zunz','sprach'),[]);
 assert.deepEqual(find(index,'Zunz','reden').map(x=>x.lemma),['1']);
 assert.deepEqual(find(index,'missing','sprechen'),[]);
 assert.deepEqual(find(index,'Zunz','*'),[]);
});
