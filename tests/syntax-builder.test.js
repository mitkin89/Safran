'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../syntax-pattern');
function editor(loadRoots){
 const events={},root={innerHTML:'',addEventListener:(k,v)=>events[k]=v,dispatchEvent(){}};
 const ctx={window:{SyntaxPattern:P},Event:class{},};vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../library-syntax-builder.js'),'utf8'),ctx);
 const api=ctx.window.LibrarySyntaxBuilder.create({root,esc:String,t:x=>x,loadRoots});
 const change=(path,field,value)=>events.change({target:{dataset:{field},value,closest:()=>({dataset:{path}})}});
 return {api,change,root};
}
test('Changing an AND group to NOT preserves its original conditions inside a nested group',()=>{
 const e=editor();e.change('','op','not');const query=e.api.query();assert.equal(query.op,'not');assert.equal(query.children.length,1);
 assert.equal(query.children[0].op,'all');assert.equal(query.children[0].children.length,2);assert(e.api.valid());
});
test('Role changes keep the tree valid and linked-clause examples remain editable',()=>{
 const e=editor();e.change('0','role','relation');assert.equal(e.api.query().children[0].value,'Attr');assert(e.api.valid());
 const tree={op:'related',relation:'child',child:{op:'term',role:'verb',gram:{stem:'h'}}};assert(e.api.set(tree));
 tree.relation='parent';assert.equal(e.api.query().relation,'child','editor owns its copy');e.change('child','role','subject');assert(e.api.valid());
 assert(!e.api.set({op:'invalid'}));
});

test('Root mode keeps homonymous families separate and preserves an imported selection',async()=>{
 const roots={'559':{id:'awn',root:'אמר',lang:'heb'},'560':{id:'abc',root:'אמר',lang:'arc'}};
 const e=editor(async()=>({roots}));e.change('1','mode','root');await new Promise(setImmediate);
 assert.equal(e.api.query().children[1].family,'');assert(!e.api.valid(),'ambiguous root requires an explicit family selection');
 assert(e.root.innerHTML.includes('heb:awn')&&e.root.innerHTML.includes('arc:abc'));
 e.change('1','family','heb:awn');assert(e.api.valid());
 const imported=editor(async()=>({roots}));
 assert(imported.api.set({op:'term',role:'subject',mode:'root',family:'heb:awn',gram:{number:'s'}}));
 await new Promise(setImmediate);assert.equal(imported.api.query().family,'heb:awn');assert(imported.api.valid());
});
