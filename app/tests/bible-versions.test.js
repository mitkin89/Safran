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
