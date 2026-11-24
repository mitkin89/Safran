'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('../note-anchors');
const groups=[{key:'Tanakh/Torah¦Genesis',versions:[{rel:'gen-he'},{rel:'gen-de'}]},{key:'Tanakh/Writings¦Job',versions:[{rel:'job-he'}]}];
test('all structured references mark their locations across editions without duplicating the note',()=>{
 const n={id:'n',key:groups[0].key,sk:'[0]',row:'1',kind:'row',refs:[{rel:'gen-de',sectionPath:[0],labels:['1']},{rel:'job-he',sectionPath:[0],labels:['1','2']}]},ix=A.index([n],groups);
 assert.equal(ix.get(A.signature(groups[0].key,'[0]','1')).length,1);assert.equal(ix.get(A.signature(groups[1].key,'[0]','1'))[0],n);assert.equal(ix.get(A.signature(groups[1].key,'[0]','2'))[0],n);
 assert.equal(A.index([{...n,refs:[]}],groups).has(A.signature(groups[1].key,'[0]','1')),false);
});
test('project and legacy notes with the same id remain separate; unlocated text is not guessed',()=>{
 const ref={rel:'job-he',sectionPath:[0],labels:['1']},a={id:'same',_store:'legacy',refs:[ref]},b={id:'same',_store:'research',refs:[ref]};assert.equal(A.index([a,b],groups).get(A.signature(groups[1].key,'[0]','1')).length,2);
 assert.equal(A.index([{id:'manual',refs:[{label:'Job 1:1'}]}],groups).size,0);assert.equal(A.index([{id:'conflict',refs:[{...ref,key:groups[0].key}]}],groups).size,0);assert.equal(A.index([{...a,kind:'hl'}],groups).size,0);
});
