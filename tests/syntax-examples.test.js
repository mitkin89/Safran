'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const E=require('../syntax-examples'),S=require('../syntax-patterns'),{searchFiles}=require('../searchcore');
test('each sidebar example validates, has its advertised Genesis passage, and is independently editable',async()=>{
 const entries=require('../bundled/manifest.json').items.filter(e=>e.title==='Genesis'&&/^Westminster/.test(e.versionTitle));
 assert.equal(E.examples.filter(e=>e.query.type==='clause').length,4);assert.equal(E.examples.filter(e=>e.query.type==='advanced').length,6);
 for(const e of E.examples){
  const q=S.snapshot(e.query);const r=await searchFiles({dir:path.join(__dirname,'../bundled'),entries,params:{syntax:q.type==='advanced'?{pattern:q.pattern}:q.syntax,gram:q.gram,limit:300,perFile:300}});
  assert(r.results.some(r=>'Genesis '+r.path.map(i=>i+1).join(':')===e.ref),e.id+' missing advertised passage '+e.ref);
 }
 const copy=E.get('god-speaks');copy.query.syntax.verb='הלך';assert.equal(E.get('god-speaks').query.syntax.verb,'אמר');
});
