'use strict';
// English versions of the apparatus notes (tools/textcrit-en): every German note has an "en" field.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const notes=(obj,out=[])=>{if(Array.isArray(obj))obj.forEach(x=>notes(x,out));else if(obj&&typeof obj==='object'){if(typeof obj.note==='string'||typeof obj.n==='string')out.push(obj);Object.values(obj).forEach(x=>notes(x,out));}return out;};
test('LXX, Peshitta and Hexapla notes carry an English version',()=>{
  const box={window:{}};let n=0;
  for(const dir of ['lxx-readings','peshitta-readings'])for(const f of fs.readdirSync(path.join(root,dir)).filter(f=>f!=='index.js'))vm.runInNewContext(fs.readFileSync(path.join(root,dir,f),'utf8'),box);
  vm.runInNewContext(fs.readFileSync(path.join(root,'hexapla-vorlage.js'),'utf8'),box);
  for(const data of [box.window.LXX_READINGS,box.window.PESHITTA_READINGS,box.window.HEXAPLA_VORLAGE])for(const o of notes(data)){
    assert.equal(typeof o.en,'string',JSON.stringify(o).slice(0,120));assert(!/„/.test(o.en),o.en);n++;
  }
  assert(n>20000,String(n));
});
