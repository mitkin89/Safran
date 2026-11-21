'use strict';
// Apparatus witness „Syr“: pluses/minuses from the MT–Peshitta word alignment.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),box={window:{}};box.window.PeshittaAlignment=require('../peshitta-alignment');
vm.runInNewContext(fs.readFileSync(path.join(root,'library-textcrit-peshitta.js'),'utf8'),box);
const host={esc:s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]),load:async(src,get)=>{if(!get())vm.runInNewContext(fs.readFileSync(path.join(root,src),'utf8'),box);return get();}};
const ps=box.window.LibraryPeshittaTC.create({...host,load:async(src,get)=>{if(!get()){const w={window:box.window};vm.runInNewContext(fs.readFileSync(path.join(root,src),'utf8'),w);}return get();}});
const text=e=>e.html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
test('pluses anchor after the preceding linked MT word, long ones fold',async()=>{
  const d=await ps.load('Genesis'),e=ps.entries(d,[{ref:'Genesis 4:8',row:'8'}]);
  assert.equal(e.length,1);assert.deepEqual({k:e[0].anchor.kind,s:e[0].anchor.start},{k:'gap',s:4});assert.match(text(e[0]),/ܢܪܕܐ ܠܦܩܥܬܐ/);
  const x=ps.entries(await ps.load('Exodus'),[{ref:'Exodus 2:22',row:'22'}]);assert.equal(x.length,1);assert.match(x[0].html,/<details class="tc-ps-long">/);assert.match(text(x[0]),/16 Wörter/);
});
test('minuses group MT words without rendering and skip the object marker',async()=>{
  const e=ps.entries(await ps.load('Exodus'),[{ref:'Exodus 13:7',row:'7'}]);
  assert.equal(e.length,1);assert.deepEqual([e[0].anchor.kind,e[0].anchor.start,e[0].anchor.end],['word',9,12]);
  const g=ps.entries(await ps.load('Genesis'),[{ref:'Genesis 1:1',row:'1'}]);assert.equal(g.length,0);
});
test('per-book data for the Writings and shifted native numbering',async()=>{
  const d=await ps.load('Daniel'),e=ps.entries(d,[{ref:'Daniel 3:23',row:'23'}]);
  assert(e.some(x=>/624 Wörter/.test(text(x))));assert(e.some(x=>/Peschitta-Zählung/.test(text(x))));
  assert.equal(await ps.load('Tobit'),null);
});
