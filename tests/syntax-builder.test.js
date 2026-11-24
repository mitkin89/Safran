'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../syntax-pattern');
function editor(loadRoots){
 const events={},root={innerHTML:'',addEventListener:(k,v)=>events[k]=v,dispatchEvent(){}};
 const ctx={window:{SyntaxPattern:P,SyntaxGraph:require('../syntax-graph')},Event:class{},};vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../library-syntax-builder.js'),'utf8'),ctx);
 const api=ctx.window.LibrarySyntaxBuilder.create({root,esc:String,t:x=>x,loadRoots});
 const change=(path,field,value)=>events.change({target:{dataset:{field},value,closest:()=>({dataset:{path}})}});
 return {api,change,root,events};
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

test('Graph and form share edits and imported trees, including a root clause link',()=>{
 const e=editor(),original=e.api.query();assert(e.api.setView('graph'));assert.match(e.root.innerHTML,/sxGraphCanvas/);
 assert.deepEqual(e.api.query(),original);e.change('1','lemma','ברא');assert.equal(e.api.query().children[1].lemma,'ברא');
 assert(e.api.setView('form'));assert.match(e.root.innerHTML,/ברא/);
 assert(e.api.set({op:'related',relation:'child',child:{op:'term',role:'verb',lemma:'אמר'}}));
 assert.match(e.root.innerHTML,/data-path="child"/);assert(e.api.setView('graph'));
 assert.match(e.root.innerHTML,/data-graph-select="child"/);
});
test('Graph wraps a selected condition without losing constraints and can reorder siblings',()=>{
 const e=editor();e.api.setView('graph');
 const click=dataset=>e.events.click({target:{closest:selector=>selector==='[data-graph-select]'&&dataset.graphSelect!==undefined?{dataset}:selector==='[data-graph-command]'&&dataset.graphCommand?{dataset}:null}});
 click({graphSelect:'1'});click({graphCommand:'wrap-not'});
 assert.equal(e.api.query().children[1].op,'not');assert.equal(e.api.query().children[1].children[0].lemma,'אמר');assert(e.api.valid());
 click({graphCommand:'up'});assert.equal(e.api.query().children[0].op,'not');assert.equal(e.api.query().children[1].role,'subject');
});
test('Wrapping a maximum-depth query rolls back without losing its editable form',()=>{
 const e=editor();let tree={op:'term',role:'verb',lemma:'אמר'};
 for(let i=0;i<6;i++)tree={op:'not',children:[tree]};
 assert(e.api.set(tree));e.api.setView('graph');const before=e.api.query();
 e.events.click({target:{closest:selector=>selector==='[data-graph-command]'?{dataset:{graphCommand:'wrap-all'}}:null}});
 assert.deepEqual(e.api.query(),before);assert(e.api.valid());assert.match(e.root.innerHTML,/sxGraphCanvas/);
});
test('Binding editor locks inner roles and keeps added conditions in the same scope',()=>{
 const e=editor();assert(e.api.set({op:'same',role:'prepositional',child:{op:'all',children:[{op:'term',role:'prepositional',lemma:'משה',gram:{},preposition:'ל'}]}}));
 assert.match(e.root.innerHTML,/Dasselbe Wort/);assert.match(e.root.innerHTML,/Präposition/);
 e.events.click({target:{closest:selector=>selector==='[data-action]'?{dataset:{action:'term'},closest:()=>({dataset:{path:'child'}})}:null}});
 assert.equal(e.api.query().child.children[1].role,'prepositional');assert(e.api.valid());
 e.change('','boundRole','attribute');assert.equal(e.api.query().role,'attribute');assert.equal(e.api.query().child.children[0].role,'attribute');assert(!e.api.query().child.children[0].preposition);assert(e.api.valid());
 e.api.setView('graph');assert.match(e.root.innerHTML,/Dasselbe Wort/);
});
test('Clause path inputs stay numeric and survive changing between direct and transitive relations',()=>{
 const e=editor();assert(e.api.set({op:'related',relation:'parent',child:{op:'term',role:'verb'}}));
 e.change('','relation','ancestor');e.change('','minDepth','2');e.change('','maxDepth','4');
 assert.equal(e.api.query().minDepth,2);assert.equal(e.api.query().maxDepth,4);assert(e.api.valid());
 e.change('','relation','parent');assert(!('minDepth' in e.api.query()));assert(e.api.valid());
});
