'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Lxx=require('../lxx'),window={};vm.runInNewContext(fs.readFileSync(require.resolve('../lxx-ren.js'),'utf8'),{window});
const D=JSON.parse(JSON.stringify(window.LXX_REN));
test('LXX occurrence metadata covers the full index without empty or invented source forms',()=>{
 let total=0;
 for(const [labels,cells]of Object.values(D))for(const [g,code,n,refs,forms]of cells){
  assert(labels[g]);assert(code);assert.equal(forms.length,refs.split('.').filter(Boolean).length);
  assert.equal(forms.length,n);assert(forms.every(form=>typeof form==='string'&&form.trim()));total+=n;
 }
 assert.equal(total,252548);
});
test('image occurrences show the original Greek accusative, dative and plural instead of the lemma',()=>{
 const [labels,cells]=D['6754'],found=new Map();
 for(const [g,,n,refs,forms]of cells){if(labels[g]!=='εἰκών')continue;let ref=0;
  refs.split('.').filter(Boolean).forEach((delta,i)=>{ref+=parseInt(delta,36);found.set(ref,forms[i].normalize('NFC'));});
 }
 assert.equal(found.get(1027),'εἰκόνα');assert.equal(found.get(9006),'εἰκόνι');assert.equal(found.get(10011018),'εἰκόνας');assert.equal(found.size,9);
});
test('surface metadata preserves source spelling while the existing lemma-pair API stays unchanged',()=>{
 const he='<span class="w" data-l="6754" data-m="HNcmsa">צֶלֶם</span>',gr='<span class="wg" data-h="צלם">εἰκόνα</span>';
 assert.deepEqual(Lxx.pairs(he,gr,['εἰκών'],true),[['6754','εἰκών','HNcmsa']]);
 assert.deepEqual(Lxx.pairs(he,gr,['εἰκών'],true,true),[['6754','εἰκών','HNcmsa','εἰκόνα']]);
});
test('Rare Greek lemmas remain searchable instead of disappearing in an Other bucket',()=>{
 const H=require('../word-card-hebrew'),R=require('../rendering-search');
 assert(Object.values(D).every(([labels])=>!labels.includes('*')));
 const result=H.collect({LXX:D},'δοκέω',x=>x.normalize('NFC'),R.findAncient).LXX;
 assert.equal(result.reduce((n,r)=>n+r.count,0),7);assert.equal(result.length,6);
 assert(result.some(r=>r.lemma==='1961'));assert(result.some(r=>r.lemma==='5375'));
 const alternatives=H.renderings({LXX:D},'5068','LXX');
 assert(alternatives.some(r=>r.label==='δοκέω'));assert(alternatives.length>1);
 assert(alternatives.every(r=>r.sources[0].source==='LXX'&&r.sources[0].refs.length));
});
test('Reverse occurrence rows retain attested forms, morphology and edition',()=>{
 const H=require('../word-card-hebrew');
 const rows=H.occurrences({LXX:D},'3201','δύναμαι',x=>x.normalize('NFC'));
 assert.equal(rows.length,165);
 const exodus=rows.find(r=>r.ref===1015023);
 assert.equal(exodus.source,'LXX');assert.equal(exodus.form.normalize('NFC'),'ἠδύναντο');assert(exodus.code.startsWith('HV'));
});
