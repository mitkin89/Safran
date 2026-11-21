'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('Main-reader manuscripts retain original chapter/unit numbering and corrected reading text',async()=>{
 const root={addEventListener(){}},sandbox={window:{},document:{addEventListener(){}},addEventListener(){},localStorage:{getItem(){return null;}}};
 for(const file of ['mishnah-textcrit-data.js','library-mishnah-textcrit.js','library-mishnah-reader.js'])vm.runInNewContext(fs.readFileSync(require.resolve('../'+file),'utf8'),sandbox);
 const d=sandbox.window.MISHNAH_TEXTCRIT,module=sandbox.window.LibraryMishnahReader,g={title:'Mishnah Berakhot',cats:['Mishnah']},entries=module.entries(g);
 assert.equal(entries.length,3);assert.equal(module.entries({title:'Genesis'}).length,0);
 let loads=0;const ui=module.create({$:()=>root,esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'),getView:()=>null,load:async()=>{loads++;return d;}});
 for(const entry of entries){
  const doc=await ui.read(entry),units=d.witnesses[entry.mishnahWitness].units;
  assert.equal(doc.license,'CC BY 4.0');assert.equal(doc.text.length,9);assert.equal(doc.text.flat().length,Object.keys(units).length);
  for(const [ref,u]of Object.entries(units)){const [ch,m]=ref.split(':').map(Number);assert.equal(doc.text[ch-1][m-1],u.text);}
 }
 assert.equal(loads,1);assert.equal(await ui.read({rel:'other'}),null);
 assert.equal(entries.find(e=>e.mishnahWitness==='C').rel,'digital-mishnah/berakhot/C');
});
