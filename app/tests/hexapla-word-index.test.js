'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),box={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'hexapla-word-index.js'),'utf8'),box);
const index=box.window.HEXAPLA_WORD_INDEX,manifest=require('../bundled/manifest.json'),cache=new Map();
function data(book){
 if(!cache.has(book)){
  vm.runInNewContext(fs.readFileSync(path.join(root,'hexapla-data',book.replace(/ /g,'_')+'.js'),'utf8'),box);
  const item=manifest.items.find(x=>x.title===book&&x.versionTitle?.startsWith('Westminster'));
  cache.set(book,{field:box.window.HEXAPLA_DATA[book],text:JSON.parse(fs.readFileSync(path.join(root,'bundled',item.rel))).text});
 }
 return cache.get(book);
}
test('Field word index preserves anchors, sources and citations without treating gaps as words',()=>{
 const counts={Aquila:0,Symmachus:0,Theodotion:0};
 for(const row of index.rows){
  const [,book,cv]=/^(.*) (\d+:\d+)$/.exec(row.ref),unit=data(book).field.verses[cv][row.unit];
  assert(!unit.gap&&unit.s>=0);assert.equal(row.phrase,unit.e>unit.s);assert.equal(row.he,unit.h);assert.equal(row.page,unit.pg);
  for(const source of row.sources){assert(source in counts);counts[source]++;}
 }
 for(const count of Object.values(counts))assert(count>100);
 for(const [lemma,ids] of Object.entries(index.lemmas)){
  assert.equal(ids.length,new Set(ids).size);
  for(const id of ids){
   const row=index.rows[id],[,book,cv]=/^(.*) (\d+:\d+)$/.exec(row.ref),[c,v]=cv.split(':').map(Number),d=data(book),unit=d.field.verses[cv][row.unit];
   const words=[...d.text[c-1][v-1].matchAll(/<span class="w" data-l="([^"]*)"[^>]*>/g)].map(m=>(m[1].split('/').find(x=>/\d/.test(x))||'').trim());
   assert(words.slice(unit.s,unit.e+1).includes(lemma));
  }
 }
});
test('collective Three attribution remains visible and distinct from individual attribution',()=>{
 const shared=index.rows.find(r=>/Οἱ Γ/.test(r.head));assert(shared);assert.equal(shared.sources.length,3);
 assert(index.rows.some(r=>r.sources.length===1&&r.sources[0]==='Aquila'));
 assert(index.lemmas['4390'].length>0);
});
