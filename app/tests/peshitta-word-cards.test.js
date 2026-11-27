const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const api=require('../peshitta-word-cards'),morph=require('../syriac-morph');
const c={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../peshitta-word-index'),'utf8'),c);
const model=api.create(c.window.PESHITTA_WORD_INDEX,morph);
test('Peshitta suggestions support both scripts and preserve separate lexemes',()=>{
 const sy=model.suggest('ܡܠ',true),he=model.suggest('מל',true);
 assert(sy.length>1);assert.deepEqual(sy.map(x=>x.id),he.map(x=>x.id));
 assert(sy.every(x=>x.gloss&&x.count>0&&x.language==='Aramäisch'&&x.source==='Peschitta'));
 assert.equal(model.suggest('zzzz',true).length,0);
});
test('Peshitta cards use attested forms, references and grammar filters',()=>{
 const x=model.suggest('ܒܪܐ',false).find(x=>x.id==='BRJ');assert(x);
 const all=model.render(x.id,{},200,String,s=>s),part=model.render(x.id,{vt:'pf'},200,String,s=>s);
 assert(all.concordance.includes('Genesis 1:1'));assert(all.grammar.includes('data-pesh-field="vt"'));
 assert(part.forms.includes('Perfekt'));assert(!part.forms.includes('Imperfekt'));
});
test('Peshitta verse links retain attested forms for preview highlighting',()=>{
 const out=model.render('BRJ',{},200,String,s=>s);
 assert(out.concordance.includes('data-target-forms='));
 const {targetRanges}=require('../concordance-preview');
 const text='ܒܪܐ ܒܪܝܐ ܒܪܐ';
 assert.deepEqual(targetRanges(text,['ܒܪܐ']),[[0,3],[9,12]]);
 assert.equal(targetRanges('ܒܪܝܐ',['ܒܪܐ']).length,0);
});
