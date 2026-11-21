'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const R=require('../reader'),S=require('../syriac-morph'),M=require('../bundled/manifest.json'),report=require('../tools/peshitta/coverage.json');
const items=M.items.filter(e=>e.language==='Syriac'&&e.versionTitle.startsWith('ETCBC Peshitta'));
const hash=text=>crypto.createHash('sha256').update(JSON.stringify(text)).digest('hex');
test('all 39 Peshitta books retain every source word and bind analyses to original verse numbers',()=>{
 assert.equal(items.length,39);let zero=0;
 for(const e of items){
  const raw=fs.readFileSync(path.join(__dirname,'../bundled',e.rel),'utf8'),d=JSON.parse(raw);d.textHash=hash(d.text);
  assert.equal(e.hash,crypto.createHash('sha1').update(raw).digest('hex'));
  let count=0,annotated=0;
  for(const section of R.sectionsOf(d.text,d.sectionNames))for(const row of R.flattenNode(R.getByPath(d.text,section.path))){
   if(row.label==='0')zero++;
   assert.equal(R.cleanHtml(row.html),row.html);
   for(const m of row.html.matchAll(/<span class="syw" data-si="(\d+)">([^<]*)<\/span>/g)){
    const rec=S.at(d,m[1],m[2],section.path,row.label);assert(rec,e.title+' '+row.label);count++;annotated+=!!rec.parts.length;
    for(const p of rec.parts)assert.equal(typeof p.lex,'string');
   }
  }
  const expected=report.books.find(x=>x.title===e.title);assert.equal(count,expected.words);assert.equal(annotated,expected.annotated);
 }
 assert(zero>0);
});
test('Peshitta morphology rejects altered text and incorrect references; prefixes remain separate',()=>{
 const e=items.find(e=>e.title==='Genesis'),d=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',e.rel)));d.textHash=hash(d.text);
 const rec=S.at(d,'1','ܒܪܫܝܬ',[0],'1');assert.equal(rec.parts.length,2);assert.equal(rec.parts[0].sp,'prep');assert.equal(rec.parts[1].lex,'RJCJ');assert.deepEqual(rec.parts.map(p=>p.sourceId),[1,2]);
 assert.equal(S.at({...d,textHash:'changed'},'1','ܒܪܫܝܬ',[0],'1'),null);
 assert.equal(S.at(d,'1','ܐܚܪܢܐ',[0],'1'),null);assert.equal(S.at(d,'1','ܒܪܫܝܬ',[1],'1'),null);
 assert.match(S.describe({sp:'verb',vs:'pe',vt:'pf',ps:'third',gn:'m',nu:'sg'}).info,/Peʿal.*Perfekt.*3\. Person/);
 assert.equal(S.lemma('BRJ'),'ܒܪܝ');
});
test('numbered verse zero dictionaries are one chapter and preserve later labels',()=>{
 const text=[{'0':'heading','1':'first','2':'second'}];assert.deepEqual(R.sectionsOf(text,['Chapter','Verse']).map(x=>x.path),[[0]]);
 assert.deepEqual(R.flattenNode(text[0]).map(r=>r.label),['0','1','2']);
});

test('Syriac words and lemmas have consonantal Hebrew transliteration without invented vowels',()=>{
 assert.equal(S.hebrew('ܒܪܫܝܬ'),'ברשית');assert.equal(S.hebrew('ܐܠܗܐ'),'אלהא');
 assert.equal(S.hebrew('ܟܐܦ̈ܐ'),'כאפא');assert.equal(S.hebrew('ܡܢ'),'מן');assert.equal(S.hebrew('ܡܠܟ.'),'מלך.');
 for(const e of items){const d=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',e.rel)));for(const [form]of Object.values(d.syriacMorphology.words))assert(!/[\u0710-\u072f]/.test(S.hebrew(form)),form);}
});
