'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),H=require('../research-history');
test('draft history restores complete source snapshots, coalesces typing and clears redo after branching',()=>{
 const h=H.create(),a={id:'s',title:'A',blocks:[{id:'b',sourceHash:'hash',presentation:{groups:['original']}}]};h.reset(a);a.title='B';h.record(a,'title',1000);a.title='C';h.record(a,'title',1200);assert.equal(h.undo().title,'A');assert.equal(h.canUndo,false);assert.equal(h.redo().title,'C');
 a.blocks=[];h.record(a);const old=h.undo();assert.equal(old.blocks[0].sourceHash,'hash');old.blocks[0].presentation.groups.push('mutated outside history');assert.deepEqual(h.redo().blocks,[]);assert.deepEqual(h.undo().blocks[0].presentation.groups,['original']);
 h.record({...a,title:'New branch'});assert.equal(h.canRedo,false);h.reset({id:'other'});assert.equal(h.canUndo,false);assert.equal(h.canRedo,false);
});
test('save acceptance retains history and bounded memory discards oldest steps without changing current draft',()=>{
 const h=H.create({maxSteps:2});h.reset({title:'0',version:0});for(let i=1;i<=4;i++)h.record({title:String(i),version:0});h.accept({title:'4',version:1});assert.equal(h.undo().title,'3');assert.equal(h.undo().title,'2');assert.equal(h.undo(),null);assert.equal(h.redo().title,'3');assert.deepEqual(h.redo(),{title:'4',version:1});
 const tiny=H.create({maxBytes:200});tiny.reset({text:'x'.repeat(100)});tiny.record({text:'y'.repeat(100)});assert.equal(tiny.canUndo,false);
});

test('explicit save boundaries separate otherwise adjacent typing groups',()=>{const h=H.create();h.reset({text:'A'});h.record({text:'B'},'text',1000);h.breakGroup();h.accept({text:'B'});h.record({text:'C'},'text',1100);assert.equal(h.undo().text,'B');assert.equal(h.undo().text,'A');});
