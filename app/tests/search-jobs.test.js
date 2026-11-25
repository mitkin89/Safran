'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
const {Worker}=require('worker_threads'),{once}=require('events');
const {SearchJobs,ownerOf,runSearchWorker}=require('../search-jobs');
const {EventEmitter}=require('events');
test('echte Such- und Cache-Worker beenden sich nach ihrem Ergebnis',async()=>{
 for(const name of ['searchWorker.js','cacheWorker.js']){
  const worker=new Worker(path.join(__dirname,'..',name),{workerData:{dir:require('os').tmpdir(),entries:[],cacheDir:null,params:{query:'test'}}});
  const exit=once(worker,'exit');await once(worker,'message');assert.equal((await exit)[0],0,name);
 }
});
test('Abbruch bleibt beim Auftrag des jeweiligen Lesefensters',()=>{
 const jobs=new SearchJobs(),a=jobs.begin('window:1',1),b=jobs.begin('window:2',1);let ac=0,bc=0;a.stop=()=>ac++;b.stop=()=>bc++;
 jobs.cancel('window:1',1);assert.equal(ac,1);assert.equal(bc,0);assert.equal(b.cancelled,false);
 const newer=jobs.begin('window:1',2);jobs.cancel('window:1',1);assert.equal(newer.cancelled,false);jobs.finish(a);assert(jobs.current(newer));
 assert.notEqual(ownerOf({sender:{id:1},senderFrame:{routingId:2}}),ownerOf({sender:{id:1},senderFrame:{routingId:3}}));
});
test('fertiger Worker wird beendet und verspätete Ergebnisse werden ignoriert',async()=>{
 let w;class Fake extends EventEmitter{constructor(){super();w=this;this.terminated=0}terminate(){this.terminated++;return Promise.resolve(0)}postMessage(){}}
 const job=new SearchJobs().begin('one',1),promise=runSearchWorker({},job,()=>{},Fake);w.emit('message',{type:'done',res:{results:['first']}});w.emit('message',{type:'done',res:{results:['late']}});assert.deepEqual((await promise).results,['first']);assert.equal(w.terminated,1);assert.equal(job.stop,null);
});
test('Workerfehler startet nicht heimlich dieselbe Suche erneut',async()=>{
 let w;class Fake extends EventEmitter{constructor(){super();w=this}terminate(){return Promise.resolve(0)}postMessage(){}}
 const p=runSearchWorker({},new SearchJobs().begin('one',1),()=>{},Fake);w.emit('message',{type:'error',error:'defekte Quelle'});await assert.rejects(p,/defekte Quelle/);
});
test('nicht kooperativer Worker wird nach Abbruch beendet',async()=>{
 let worker;class Fake extends EventEmitter{constructor(){super();worker=this;this.stopped=false}terminate(){this.stopped=true;return Promise.resolve(0)}postMessage(){}}
 const jobs=new SearchJobs(),job=jobs.begin('one',1),result=runSearchWorker({},job,()=>{},Fake);jobs.cancel('one',1);assert.equal((await result).cancelled,true);assert.equal(worker.stopped,true);
});
test('Produktions-Preload filtert Fortschritt und Abbruch nach Anfrage-ID',async()=>{
 const vm=require('vm'),fs=require('fs');const bridge={},listeners={},sent=[],pending=[];
 const ipcRenderer={on:(channel,fn)=>listeners[channel]=fn,send:(...args)=>sent.push(args),invoke:(channel,data)=>new Promise(resolve=>pending.push({channel,data,resolve}))};
 const ctx=vm.createContext({window:{addEventListener(){}},process,require:name=>name==='electron'?{contextBridge:{exposeInMainWorld:(key,value)=>bridge[key]=value},ipcRenderer,webUtils:{},webFrame:{}}:require(path.join('..',name))});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../preload.js'),'utf8'),ctx);
 const a=bridge.offline.search({query:'a'}),b=bridge.offline.search({query:'b'});const shown=[];bridge.offline.onSearchProgress(p=>shown.push(p.requestId));
 listeners['off:searchProgress']({}, {requestId:1});listeners['off:searchProgress']({}, {requestId:2});assert.deepEqual(shown,[2]);
 pending[0].resolve({});await a;bridge.offline.cancelSearch();assert.deepEqual(Array.from(sent[0]),['off:cancelSearch',2]);pending[1].resolve({});await b;bridge.offline.cancelSearch();assert.equal(sent.length,1);
 const panel=bridge.offline.search({outline:{query:'Sabbat'}}, 'olSearch');
 bridge.offline.cancelSearch('sOutline');
 bridge.offline.cancelSearch();
 assert.equal(sent.length,1);
 bridge.offline.cancelSearch('olSearch');
 assert.deepEqual(Array.from(sent[1]),['off:cancelSearch',3]);
 pending[2].resolve({});await panel;
});
