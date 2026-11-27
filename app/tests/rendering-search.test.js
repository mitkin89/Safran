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

test('word-family renderings combine counts while preserving the source lemma of each cell',()=>{
 const {familySources}=require('../rendering-search');
 const entry=(gloss,count,form)=>({lang:'de',total:count,labels:[{forms:[gloss,[form,count]]}],
   cells:[{g:0,code:'HV',n:count,refs:enc([1001])}],para:{}});
 const a=entry('füllen',2,'füllt'), b=entry('Füllen',1,'gefüllt');
 const merged=familySources([
   ['4390',{src:{Zunz:a,Philippson:a}}],
   ['4393',{src:{Zunz:b}}],
 ]);
 assert.equal(merged.Zunz.total,3);
 assert.deepEqual(merged.Zunz.labels,[{forms:['füllen',['füllt',2],['gefüllt',1]]}]);
 assert.deepEqual(merged.Zunz.cells.map(({g,lemma,n})=>[g,lemma,n]),[[0,'4390',2],[0,'4393',1]]);
 assert.equal(merged.Zunz.byLemma['4393'],b);
 assert.equal(merged.Philippson.total,2);
 assert.equal(a.cells[0].lemma,undefined);
});
test('witness families preserve lexical identities even when displayed lemmas are identical',()=>{
 const {familySources}=require('../rendering-search');
 const entry=key=>({lang:'syr',grouped:true,total:1,labels:[{key,type:'lemma',forms:['ܡܝ',['ܡ̈ܝܐ',1]]}],cells:[{g:0,n:1,code:'HN',refs:'rt',form:'ܡ̈ܝܐ'}]});
 const merged=familySources([['1',{src:{Peshitta:entry('MJ')}}],['2',{src:{Peshitta:entry('MJ=')}}]]).Peshitta;
 assert.equal(merged.grouped,true);assert.equal(merged.labels.length,2);assert.equal(merged.total,2);
 assert(merged.cells.every(c=>c.form==='ܡ̈ܝܐ'));
});

test('paradigm renderings count attested surface forms by morphology and verse, retaining repetitions',()=>{
 const {surfaceIndex}=require('../rendering-search');
 const aggregate=surfaceIndex([
  {g:0,code:'perfect',refs:enc([1001,1001,1002]),targets:[[1,'εἶπα'],[3,'εἶπα'],[2,'εἶπον']]},
  {g:0,code:'imperfect',refs:enc([1001]),targets:[[4,'λέγει']]},
  {g:1,code:'perfect',refs:enc([1001]),form:'אמרית'},
  {g:2,code:'perfect',refs:enc([1001])}
 ]);
 const entry=aggregate(new Set(['perfect']),new Set([1001]));
 assert.equal(entry.n,3);
 assert.deepEqual(entry.cores.map(x=>[x.t,x.c]),[['εἶπα',2],['אמרית',1]]);
 assert.equal(aggregate(new Set(['perfect']),new Set([1002])).cores[0].t,'εἶπον');
 assert.equal(aggregate(new Set(['absent']),null),null);
});

test('ancient reverse lookup keeps source, lexeme identity and repeated original forms',()=>{
 const {findAncient}=require('../rendering-search');
 const indices={LXX:{'1':[['λέγω'],[[0,'HV',2,enc([1001,1001]),['εἶπα','εἶπα']]]],'2':[['λέγω'],[[0,'HV',1,enc([1002]),['λέγει']]]]},
 targum:{'1':[[['אמר','say','a'],['אמר','other','b']],[[0,'HV',1,0,9,enc([1001]),'',enc([1002]),[[2,'אמרית']]],[1,'HV',4,0,0,enc([1003]),'','',[[1,'אמר']]]]]},witness:{groups:{}}};
 const greek=findAncient(indices,'LXX',{forms:['λέγω']});
 assert.deepEqual(greek.map(x=>[x.lemma,x.count]),[['1',2],['2',1]]);
 assert.deepEqual(greek[0].forms,[['εἶπα',2]]);assert.deepEqual(greek[0].refs,[1001,1001]);
 const aramaic=findAncient(indices,'O',{forms:['אמר'],targumLex:'a'});
 assert.equal(aramaic[0].count,1);assert.deepEqual(aramaic[0].forms,[['אמרית',1]]);
 for(const source of ['Peshitta','Samaritan']){
  const label={key:'lemma:a',type:'lemma',forms:['אב']};
  indices.witness.groups[source]={
   '1':[[label,{key:'lemma:b',type:'lemma',forms:['אב']},{key:'form:אב',type:'form',forms:['אב']}],[[0,'HV',2,enc([1001,1001]),'אביו'],[1,'HV',8,enc([1002]),'אב'],[2,'HV',5,enc([1003]),'אב']]],
   '2':[[label],[[0,'AV',1,enc([2001]),'אבי']]]};
  const found=findAncient(indices,source,label);
  assert.deepEqual(found.map(x=>[x.lemma,x.count]),[['1',2],['2',1]]);
  assert.deepEqual(found[0].forms,[['אביו',2]]);assert.deepEqual(found[1].languages,['arc']);
  assert.equal(findAncient(indices,source,{key:'form:אב',type:'form',forms:['אב']})[0].count,5);
 }
 assert.deepEqual(findAncient(indices,'LXX',{forms:['*'],other:true}),[]);
 assert.deepEqual(findAncient({},'O',{forms:['אמר']}),[]);
});
