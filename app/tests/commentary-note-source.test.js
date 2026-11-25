'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),K=require('../links');
test('commentary item locators preserve actual paragraph addresses, empty gaps and identical text',()=>{
 const d={text:[[['Erster','','Gleich','Gleich'],['Zweiter Vers']]],sectionNames:['Chapter','Verse','Comment']};
 assert.deepEqual(K.resolveTextEntries(d,'1:1'),[{html:'Erster',tail:'1:1:1'},{html:'Gleich',tail:'1:1:3'},{html:'Gleich',tail:'1:1:4'}]);
 assert.deepEqual(K.resolveTextEntries(d,'1:1-2').map(x=>x.tail),['1:1:1','1:1:3','1:1:4','1:2:1']);
 assert.deepEqual(K.resolveText(d,'1:1-2'),['Erster','Gleich','Gleich','Zweiter Vers']);
 assert.deepEqual(K.resolveTextEntries(d,'1:1:4'),[{html:'Gleich',tail:'1:1:4'}]);assert.equal(K.resolveTextEntries(d,'3:1'),null);
});
test('commentary item locators retain native folios and default nodes',()=>{
 const text=[[],[],[['אחד','שנים']]];assert.deepEqual(K.resolveTextEntries({text,sectionNames:['Daf','Line','Comment']},'2a:1').map(x=>x.tail),['2a:1:1','2a:1:2']);
 assert.deepEqual(K.resolveTextEntries({text:{'':[[['Standard']]]}},'1:1'),[{html:'Standard',tail:'1:1:1'}]);
});
