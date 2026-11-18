'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../textcrit-core'),D=require('../textcrit-data'),S=require('../samaritan-data');
test('Apparatus preserves Tal source words, red masks, note anchors and MT provenance',()=>{
  const source=require('../tools/samaritan/tal-parallel.json');
  assert.equal(D.schema,1);assert.deepEqual(Object.keys(D.witnesses),['SMR']);
  for(const [ref,verse] of Object.entries(D.verses)){
    assert.deepEqual(verse.words.map(w=>w.slice(0,2)),source.he[ref]||[],ref);
    assert.deepEqual(verse.en,source.en[ref]||[],ref);
    for(const g of verse.groups){for(const i of g.indices)assert(verse.words[i],ref);for(const i of g.notes)assert(S.talNotes[i],ref);}
    for(const r of verse.mtRefs){assert(D.mt[r],r);assert(D.mtIndex[r].includes(ref));}
  }
  const manifest=require('../bundled/manifest.json').items;
  for(const [book,hash] of Object.entries(D.base.sha256)){
    const item=manifest.find(i=>i.title===book&&i.versionTitle.startsWith('Westminster'));
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../bundled',item.rel))).digest('hex'),hash);
  }
});
test('Numbering keeps split commandments, repetitive formulas and unresolved passages explicit',()=>{
  assert.deepEqual(C.resolve(D,'Genesis 28:10','mt').refs,['Genesis 28:10']);
  assert.deepEqual(D.verses['Exodus 20:2'].mtRefs,['Exodus 20:2','Exodus 20:3']);
  assert.deepEqual(C.resolve(D,'Exodus 20:12','mt').refs,['Exodus 20:11']);
  for(const n of [73,74,75,76,77,78,79,80,81,82,83])assert.deepEqual(D.verses['Numbers 7:'+n].mtRefs,['Numbers 7:'+n]);
  assert(C.resolve(D,'Exodus 29:21','mt').unresolved);
  assert.equal(C.resolve(D,'Exodus 29:21','tal').unresolved,false);
  assert.deepEqual(C.resolve(D,'Exodus 29:21','tal').baseRefs,[]);
});
test('Textual remarks keep their own word groups; spelling filter is based on explicit source signs',()=>{
  const remarks=C.remarks(D,S,'Genesis 28:10',true);
  assert(remarks.some(g=>g.words.map(w=>w[0]).join(' ')==='ללכת'&&g.notes.some(n=>n.html.includes('Infinitiv'))));
  assert(remarks.some(g=>g.words.map(w=>w[0]).join(' ')==='חרנה'&&g.notes.some(n=>n.html.includes('//'))));
  const all=C.remarks(D,S,'Genesis 28:2',true),filtered=C.remarks(D,S,'Genesis 28:2',false);
  assert(all.length>filtered.length);assert(all.some(g=>g.spelling));assert(filtered.every(g=>!g.spelling));
});
