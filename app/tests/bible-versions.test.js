'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),B=require('../bible-versions');
const versions=[['he','Westminster','w'],['he','Aleppo','a'],['de','Zunz 1838','z'],['de','Philippson','p'],['other','Septuaginta','s']].map(([kind,versionTitle,rel])=>({kind,versionTitle,rel}));
test('Bible defaults replace remembered editions and add the selected extra',()=>{
 assert.deepEqual([...B.select(versions,['w','z'],{pvHe:'Aleppo',pvDe:'Philippson',pvX:'Septuaginta'})],['a','p','s']);
 assert.deepEqual([...B.select(versions,['a','p'])],['w','z']);
});
test('missing editions fall back to available texts without losing all columns',()=>{
 const subset=versions.filter(v=>!['a','p','s'].includes(v.rel));
 assert.deepEqual([...B.select(subset,['w','z'],{pvHe:'Aleppo',pvDe:'Philippson',pvX:'Septuaginta'})],['w','z']);
 assert.deepEqual([...B.select(versions,[],{pvX:'@other'})],['w','z','s']);
 assert.equal(B.select(versions,[],{pvX:'Zunz 1838'}).size,2);
});
test('first-available German option and interface language are respected',()=>{
 const reversed=[versions[3],...versions.filter(v=>v.rel!=='p')];
 assert(B.select(reversed,[],{pvDe:'*'}).has('p'));
 assert.deepEqual([...B.select(versions,[],{},'en')],['w']);
});

test('exact remembered editions retain order and excluded languages instead of applying defaults',()=>{
 const saved=B.snapshot(versions,new Set(['s','p','a']));
 assert.deepEqual([...B.restore(versions,saved)],['s','p','a']);
 assert.deepEqual([...B.restore(versions,['p','s'])],['p','s']);
});
test('moved files restore only by an unambiguous edition and language identity',()=>{
 const saved=B.snapshot(versions,['p','s']);
 const moved=versions.map(v=>({...v,rel:'new/'+v.rel}));
 assert.deepEqual([...B.restore(moved,saved)],['new/p','new/s']);
 assert.deepEqual([...B.restore(moved.filter(v=>v.kind!=='de'),saved)],['new/s']);
 assert.deepEqual([...B.restore([...moved,{...moved.find(v=>v.rel==='new/p'),rel:'duplicate'}],saved)],['new/s']);
 assert.deepEqual([...B.restore(versions,[null,{},4])],[]);
});
