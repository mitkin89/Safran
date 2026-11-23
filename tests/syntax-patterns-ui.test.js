'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),Saved=require('../syntax-patterns');
const query={type:'word',book:'Genesis',query:'ברא',gram:{pos:'V'}};
function panel(storage){
 const nodes=new Map(),events={};
 const node=k=>{if(!nodes.has(k))nodes.set(k,{value:'',innerHTML:'',textContent:'',dataset:{},addEventListener(){},focus(){}});return nodes.get(k);};
 const actions=['load','new','delete','save','export','export-all','import'];
 const buttons=actions.map(act=>{const b=node('[data-act='+act+']');b.dataset.act=act;return b;});
 const root={innerHTML:'',querySelector:node,querySelectorAll:()=>buttons,addEventListener:(name,fn)=>events[name]=fn};
 const ctx={window:{SyntaxPatterns:Saved}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../library-syntax-patterns.js'),'utf8'),ctx);
 const applied=[],exports=[];
 ctx.window.LibrarySyntaxPatterns.create({root,storage,esc:String,t:(s,...v)=>s.replace(/\{\}/g,()=>v.shift()),capture:()=>query,apply:async q=>applied.push(q),files:{saveFile:async(name,data)=>{exports.push(data);return name;},openFile:async()=>null}});
 return {node,applied,exports,act:act=>events.click({target:{closest:()=>({dataset:{act}})}})};
}
test('Panel saves and explicitly loads a named query without running a search; export preserves filters',async()=>{
 const values=new Map(),local={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},p=panel(local);
 p.node('[data-name]').value='Mein Muster';await p.act('save');assert.equal(Saved.create(local).list().length,1);
 assert.equal(p.applied.length,0);await p.act('load');assert.deepEqual(p.applied,[query]);
 await p.act('export');assert.deepEqual(Saved.parse(p.exports[0])[0].query,query);
 await p.act('delete');assert.equal(Saved.create(local).list().length,0);
});
test('A storage failure is shown and never reported as a successful save',async()=>{
 const p=panel({getItem:()=>null,setItem(){throw Error('quota exceeded');}});
 p.node('[data-name]').value='Mein Muster';await p.act('save');assert.equal(p.node('[data-status]').textContent,'quota exceeded');
});
