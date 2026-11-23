'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),zlib=require('node:zlib');
const {Dictionaries}=require('../dsl');
// Syriac forms within the first 300 characters (head of the entry) are headword hits instead, see dictionary-syriac-head.test.js
test('Syriac article index respects complete forms, pointing, dictionary selection and headword separation',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'safran-symentions-'));
 try{
  const dict=new Dictionaries(dir),a='111111111111',b='222222222222';
  await fs.writeFile(path.join(dir,a+'.json'),JSON.stringify({name:'Lexicon A',heads:[['חשכא'],['unrelated'],['ܚܫܟܐ']],html:['Erläuterung '.repeat(30)+'syr. <bdi lang="syr">ܚܸܫܟܵܐ</bdi>: Finsternis; ܚܫܟܐ','<span data-q="ܚܫܟܐ">ܚܫܟܐܐ</span>','ܚܫܟܐ direct entry']}));
  await fs.writeFile(path.join(dir,b+'.json'),JSON.stringify({name:'Lexicon B',heads:[['חשך']],html:['Erläuterung '.repeat(30)+'syr. ܚܫܟܐ: Dunkelheit']}));
  const r=await dict.syriacMentions(['ܚܫܟܐ','ܚܸܫܟܵܐ'],{only:[a]});
  assert.equal(r.length,1);assert.equal(r[0].head,'חשכא');assert.equal(r[0].n,2);assert.deepEqual(r[0].matched,['ܚܫܟܐ']);
  assert(r[0].html.includes('<mark class="dhit">ܚܸܫܟܵܐ</mark>'));assert(r[0].html.includes('lang="syr"'));
  const index=(await dict.load(a)).syriacIndex;await dict.syriacMentions(['ܚܫܟܐ']);assert.equal((await dict.load(a)).syriacIndex,index,'reuse token index');
  assert.equal((await dict.syriacMentions(['ܚܫܟܐ'])).length,2);assert.equal((await dict.syriacMentions(['ܚܫܟ'])).length,0);assert.equal((await dict.syriacMentions(['חשכא','*'])).length,0);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('Existing Levy and Gesenius articles are found by their Syriac comparison form',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'safran-symentions-real-'));
 try{
  const catalog=require('../bundled/dict/manifest.json'),dict=new Dictionaries(dir);
  for(const name of ['Levy, Wörterbuch (Bd. 1–4)','Levy, Targumim-Wörterbuch (Bd. 1–2)','Gesenius HWB 1915']){
   const e=catalog.items.find(x=>x.name===name);assert(e,name);
   const d=JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(__dirname,'../bundled/dict',e.id+'.json.gz'))));
   const ks=d.html.map((h,k)=>h.includes('ܚ')?k:-1).filter(k=>k>=0);
   await fs.writeFile(path.join(dir,e.id+'.json'),JSON.stringify({name:e.name,heads:ks.map(k=>d.heads[k]),html:ks.map(k=>d.html[k])}));
  }
  // Syriac forms in the head of an entry are headword hits (lookup), the others are mentions
  const r=[...await dict.syriacMentions(['ܚܫܘܟܐ']),...await dict.lookup('ܚܫܘܟܐ')];
  for(const name of ['Levy, Wörterbuch (Bd. 1–4)','Levy, Targumim-Wörterbuch (Bd. 1–2)','Gesenius HWB 1915'])assert(r.some(x=>x.dict===name&&/Finstern|Dunkel/.test(x.html)),name);
  assert(r.every(x=>x.html.includes('class="dhit"')));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
