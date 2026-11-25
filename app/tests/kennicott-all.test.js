'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),vm=require('node:vm');
const index=require('../kennicott-index'),catalog=require('../tools/kennicott/catalog.json'),K=require('../kennicott-core');
const root=path.resolve(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('Every public Kennicott book preserves its complete licensed source apparatus and independent MT source',()=>{
 assert.equal(catalog.books.length,39);assert.equal(Object.keys(index.books).length,39);
 const ids=new Set();let entries=0;
 for(const item of catalog.books){
  const meta=index.books[item.book];assert(meta,item.book);const file=path.join(root,meta.file),D=require(file),raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'tools/kennicott',item.file+'.gz')));
  assert.equal(hash(raw),D.source.sha256,item.book);assert.equal(D.source.book,item.book);assert.equal(D.source.license,'CC BY-NC-SA 4.0');
  assert.equal(Object.keys(D.entries).length,(raw.toString().match(/<app\b/g)||[]).length,item.book);
  assert.equal(Object.values(D.entries).reduce((n,e)=>n+e.readings.length,0),meta.counts.readings,item.book);
  assert.equal(meta.counts.readings,(raw.toString().match(/<rdg\b/g)||[]).length,item.book+' complete source readings');
  assert.equal(hash(fs.readFileSync(path.join(root,'bundled',D.source.mt.rel))),D.source.mt.sha256,item.book);
  for(const e of Object.values(D.entries)){
   assert(!ids.has(e.id),e.id);ids.add(e.id);entries++;assert(e.raw.includes('app'));
   for(const ref of e.refs){assert(ref.startsWith(item.book+' '),ref);}
   for(const r of e.readings)assert.equal(r.nodes.attrs.wit||'',r.witnesses.join(' '));
  }
  for(const ref of Object.keys(D.base))assert(ref.startsWith(item.book+' '));
  delete require.cache[require.resolve(file)];
 }
 assert(entries>100000);
});
test('Lazy Kennicott book loads do not overwrite a newer book or fabricate unavailable data',async()=>{
 const G=require('../kennicott-data'),O=require('../kennicott/018_obad'),E=require('../kennicott/002_exod'),N=require('../kennicott/004_num');
 const w={Kennicott:K,KENNICOTT_INDEX:index},ctx={window:w};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'library-kennicott.js'),'utf8'),ctx);
 let finish;const calls=[];const ui=w.LibraryKennicott.create({esc:s=>String(s),load:(file)=>{calls.push(file);if(file.includes('002_exod'))return new Promise(r=>finish=()=>r(E));return Promise.resolve(file==='kennicott-data.js'?G:file.includes('004_num')?N:O);}});
 await ui.load();const slow=ui.load('Exodus');await ui.load('Obadiah');finish();await slow;
 assert(ui.entries([{ref:'Obadiah 1:1',row:'1'}]).length);assert.equal(ui.entries([{ref:'Exodus 1:1',row:'1'}]).length,0);
 assert(ui.mt('Genesis 1:1'));assert(ui.available('II Samuel'));assert(!ui.available('Unknown'));
 const n=calls.length;await ui.load('Exodus');assert.equal(calls.length,n,'Cached book is reused');assert(ui.entries([{ref:'Exodus 1:1',row:'1'}]).length);
 await ui.load('Unknown');assert.equal(ui.entries([{ref:'Exodus 1:1',row:'1'}]).length,0);
 await ui.load('Numbers');const extras=ui.entries([{ref:'Numbers 25:18',row:'18'}],true).filter(e=>e.sourceOnly);assert.equal(extras.length,2);assert(extras.every(e=>e.anchor===null&&e.displayRef==='Numbers 25:19'&&e.rows.length===0),'Source-only entries remain available without a fabricated MT verse');
});

test('Kennicott verse numbering and merged commandments map by the complete reference text',()=>{
 const D=require('../kennicott/002_exod'),N=require('../kennicott/037_neh');
 assert.deepEqual(D.referenceMap['Exodus 20:24'].refs,['Exodus 20:21']);
 assert.deepEqual(D.entries['exod-app-3589'].refs,['Exodus 20:24']);
 assert(D.index['Exodus 20:21'].includes('exod-app-3589'));
 const merged=D.entries['exod-app-3535'];assert.deepEqual(merged.refs,['Exodus 20:14']);
 const at=K.locateMapped(D,merged);assert.equal(at.anchor.ref,'Exodus 20:13');assert.equal(at.anchor.start,2,'The second לא belongs to the second commandment');
 assert.deepEqual(N.referenceMap['Nehemiah 7:73'].refs,['Nehemiah 7:72']);
 const changed=structuredClone(merged);changed.lemma=['כי','כי'];assert.equal(K.locateMapped(D,changed).anchor,null);
});
