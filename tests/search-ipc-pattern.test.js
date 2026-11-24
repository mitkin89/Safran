'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const make=require('./production-search-handler.cjs'),{SearchJobs}=require('../search-jobs'),Examples=require('../syntax-examples'),Saved=require('../syntax-patterns');
const entries=require('../bundled/manifest.json').items.filter(e=>e.title==='Genesis'&&/^Westminster/.test(e.versionTitle));
function fixture(){let reads=0;const handler=make({searchJobs:new SearchJobs(),getLibrary:async()=>({dir:path.join(__dirname,'../bundled'),entriesFor:({kinds,titles})=>{reads++;return entries.filter(e=>(!kinds.length||kinds.includes(e.kind))&&(!titles.length||titles.includes(e.title)));}})});
 const event={sender:{id:1,isDestroyed:()=>false},senderFrame:{routingId:1,send(){}}};
 return {run:params=>handler(event,{kinds:['he'],titles:['Genesis'],query:'',limit:300,perFile:300,...params}),get reads(){return reads;}};
}
test('first advanced sidebar example reaches real IPC, worker and Genesis source instead of an empty search',async()=>{
 const q=Saved.snapshot(Examples.get('god-speaks-or-sees').query),f=fixture(),r=await f.run({syntax:{pattern:q.pattern}});
 assert.equal(r.total,1);assert.equal(r.scanned,1);assert(r.results.some(r=>r.path[0]===0&&r.path[1]===2),'Genesis 1:3');
});
test('all sidebar examples retain their advertised passage through production IPC',async()=>{
 const f=fixture();for(const e of Examples.examples){const q=Saved.snapshot(e.query),r=await f.run({syntax:q.type==='advanced'?{pattern:q.pattern}:q.syntax,gram:q.gram});
 assert(r.results.some(r=>'Genesis '+r.path.map(i=>i+1).join(':')===e.ref),e.id+' '+e.ref);}
});
test('invalid advanced pattern is rejected rather than becoming a different query',async()=>{
 const r=await fixture().run({syntax:{pattern:{op:'invalid'},verb:'אמר',subject:'אלהים'}});assert(r.error);assert.equal(r.results.length,0);
});
