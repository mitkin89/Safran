'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Saved=require('../syntax-patterns');
const word={type:'word',book:'Genesis',query:'ברא',gram:{pos:'V',stem:'q'}};
const clause={type:'clause',book:'Exodus',syntax:{subject:'אלהים',verb:'אמר',object:'',referents:true,domain:'Q',relation:''},gram:{stem:'q'}};
const advanced={type:'advanced',book:'',pattern:{op:'all',children:[{op:'term',role:'subject',lemma:'אֱלֹהִים',gram:{number:'p'}},{op:'term',role:'verb',mode:'root',family:'heb:gyx',lemma:'מלא',gram:{stem:'h'},position:{relative:'subject',order:'after',maxGap:3}}]}};
function storage(){const values=new Map();return {values,getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};}
test('Named queries persist across sessions and retain modes, filters, nested roots and word positions',()=>{
 const local=storage(),s=Saved.create(local);
 const a=s.save('Wortmerkmale',word),b=s.save('Gott spricht',clause),c=s.save('Wurzelmuster',advanced);
 const other=Saved.create(local),list=other.list();assert.equal(list.length,3);
 assert.deepEqual(list.find(x=>x.id===a.id).query,word);assert.deepEqual(list.find(x=>x.id===b.id).query,clause);
 const query=list.find(x=>x.id===c.id).query;assert.equal(query.pattern.children[1].family,'heb:gyx');assert.equal(query.pattern.children[1].position.maxGap,3);
 assert.equal(query.pattern.children[0].lemma,'אלהים');
 other.save('Neuer Name',{...word,book:'Exodus'},a.id);assert.equal(s.list().find(x=>x.id===a.id).name,'Neuer Name');
 other.remove(b.id);assert.equal(s.list().length,2);assert.throws(()=>s.save('Neuer Name',word),/bereits vergeben/);
});
test('JSON export/import round trips all query types without overwriting existing queries',()=>{
 const a=Saved.create(storage());for(const [i,q]of [word,clause,advanced].entries())a.save('Muster '+i,q);
 const b=Saved.create(storage());b.save('Muster 0',{...word,query:'אמר'});
 assert.deepEqual(b.import(a.export()),{added:3,skipped:0});assert.equal(b.list().length,4);
 assert.deepEqual(b.import(a.export()),{added:0,skipped:3});
 assert.equal(b.list().find(x=>x.name==='Muster 0').query.query,'אמר');assert(b.list().some(x=>x.name==='Muster 0 (2)'));
 const c=Saved.create(storage());c.import(a.export());assert.deepEqual(c.import(a.export()),{added:0,skipped:3});
 assert.equal(Saved.parse(a.export(a.list()[0].id)).length,1);
});
test('Invalid imports, quota errors and oversized batches leave existing storage unchanged',()=>{
 const local=storage(),s=Saved.create(local);s.save('Bestehend',word);const before=local.getItem(Saved.KEY);
 for(const input of ['bad json',JSON.stringify({app:'Safran',kind:'syntax-patterns',version:99,items:[]}),JSON.stringify({app:'Safran',kind:'syntax-patterns',version:1,items:[{id:'a',name:'bad',query:{...advanced,pattern:{op:'invalid'}}}]})]){
  assert.throws(()=>s.import(input));assert.equal(local.getItem(Saved.KEY),before);
 }
 const incoming={app:'Safran',kind:'syntax-patterns',version:1,items:Array.from({length:200},(_,i)=>({id:'a'+i,name:'Import '+i,query:word}))};
 assert.throws(()=>s.import(incoming),/200/);assert.equal(local.getItem(Saved.KEY),before);
 assert.throws(()=>Saved.create({...local,setItem(){throw Error('quota');}}).save('Neu',word),/quota/);assert.equal(local.getItem(Saved.KEY),before);
 assert.throws(()=>s.save('Ungültig',{...word,gram:{article:false}}));
 assert.throws(()=>s.save('Unbekannt',{...word,gram:{case:'nominative'}}));
 assert.throws(()=>s.save('Leer',{type:'word',query:'',gram:{}}));
});
