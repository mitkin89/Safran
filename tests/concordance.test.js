'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {searchFiles}=require('../searchcore'),C=require('../concordance');
const hash=d=>crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex');
async function fixture(t, docs) {
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'safran-concordance-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const entries=[];for(const [i,d]of docs.entries()){const e={rel:i+'.json',title:d.title||'Work '+i,versionTitle:d.versionTitle||'Source',kind:d.kind||'he',language:d.language||'Hebrew'};await fs.writeFile(path.join(dir,e.rel),JSON.stringify({sectionNames:['Chapter','Verse'],...d}));entries.push(e);}
 return params=>searchFiles({dir,entries,params:{concordance:true,query:'שיח',...params}});
}
test('cross-work occurrences retain spelling, context, source locations and complete counts beyond display caps',async t=>{
 const find=await fixture(t,[{title:'Genesis',text:[['שיח שיחור שִׂיחַ <sup class="footnote-marker">1</sup><i class="footnote">שיח</i>']]},{title:'Exodus',text:[['שיח שיח שיח']]}]);
 const r=await find({limit:2,perFile:1});assert.equal(r.stats.reduce((n,x)=>n+x.n,0),5);assert.equal(r.dist.reduce((n,x)=>n+x.h,0),2);assert.equal(r.results.length,2);assert(r.capped||r.truncated);assert.equal(r.scanned,2);assert.deepEqual(r.results[0].loc,{path:[0],label:'1'});
 const full=await find({perFile:10});assert.equal(full.results.length,5);assert(full.results.some(x=>x.snippet.hit==='שִׂיחַ'));assert(!full.results.some(x=>x.snippet.hit==='שיחור'));assert.equal(full.results[1].position,3);
});
test('Greek source lemmas work across inflections but edited source falls back to word forms',async t=>{
 const d={title:'The War of the Jews',kind:'other',language:'Greek',text:[['ἐποίησεν ποιεῖ']],greekMorphology:{version:1,work:'test',F:['ἐποίησεν','ποιεῖ'],L:['ποιέω'],T:['v3saia---'],E:[[0,0,0],[1,0,0]],P:{'1.1':'0.1'},locator:{'[0,"1"]':'1.1'}}};d.greekMorphology.textHash=hash(d);
 const bad=structuredClone(d);bad.title='Edited work';bad.text=[['ἐποίησεν ποιεῖ καλῶς']];const find=await fixture(t,[d,bad]);
 const r=await find({query:'ποιέω',lemma:true});assert.equal(r.results.length,2);assert(r.results.every(x=>x.basis==='lemma'&&x.analysisSource==='OGA'&&x.title===d.title));assert.deepEqual(r.coverage,{annotated:1,surface:1});
 const surface=await find({query:'ποιει',lemma:false});assert.equal(surface.results.length,2);assert(surface.results.every(x=>x.snippet.hit==='ποιεῖ'));
});
test('Syriac consonantal lemma annotations require matching text and numbering',async t=>{
 const d={title:'Genesis',kind:'other',language:'Syriac',text:[['<span class="syw" data-si="1">ܡܪܚܦܐ</span>']],syriacMorphology:{version:1,fields:['lex'],analyses:[['RXP']],words:{'1':['ܡܪܚܦܐ',[0],1,1,[25]]}}};d.syriacMorphology.textHash=hash(d);
 const find=await fixture(t,[d]);const r=await find({query:'ܪܚܦ',lemma:true});assert.equal(r.results.length,1);assert.equal(r.results[0].analysisSource,'ETCBC Syriac');assert.equal(r.results[0].snippet.hit,'ܡܪܚܦܐ');
});
test('rejects phrases and wildcards, yields to cancellation, and reports unreadable files',async t=>{
 const find=await fixture(t,[{text:[['שיח']]}]);assert((await find({query:'שיח*'})).error);assert((await find({query:'שיח שיח'})).error);
 const cancelled=await C.search({dir:'.',entries:[{title:'A',rel:'absent.json'}],params:{query:'שיח'},isCancelled:()=>true});assert(cancelled.cancelled);assert.equal(cancelled.scanned,0);
 const missing=await C.search({dir:os.tmpdir(),entries:[{title:'A',rel:'safran-no-such-source.json'}],params:{query:'שיח'}});assert.equal(missing.errors,1);assert.equal(missing.scanned,1);
});

test('Latin diacritics stay distinct while Greek and Semitic pointing is ignored',()=>{
 assert.notEqual(C.normalize('für'),C.normalize('fur'));assert.equal(C.normalize('שִׂיחַ'),C.normalize('שיח'));assert.equal(C.normalize('ποιεῖ'),C.normalize('ποιει'));assert.equal(C.textOf('one<br>two &quot;three&quot;'),'one two \"three\"');
});

test('real MT, CATSS and Peshitta links are bidirectional, source-specific and separate from counts',async t=>{
 const root=path.join(__dirname,'..'),manifest=require('../bundled/manifest.json');
 const entries=manifest.items.filter(e=>e.title==='Genesis'&&(/^(Westminster|ETCBC Peshitta)/.test(e.versionTitle)||e.versionTitle==='Septuaginta (CATSS)'));
 for(const query of ['ברא','ἐποίησεν','ܒܪܐ']){
  const r=await searchFiles({dir:path.join(root,'bundled'),entries,params:{query,concordance:true,crossLanguage:true,limit:1,perFile:1}});
  assert.equal(r.results.length,1);assert.equal(r.results[0].parallels.length,2,query);assert(r.results[0].parallels.every(p=>p.loc.label==='1'&&p.mtRef==='Genesis 1:1'));assert(r.stats[0].n>1);
 }
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'safran-cross-edited-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 for(const e of entries){const d=JSON.parse(await fs.readFile(path.join(root,'bundled',e.rel),'utf8'));if(e.language==='Syriac'||e.language==='Greek')d.text[0][0]+=' changed';const f=path.join(dir,e.rel);await fs.mkdir(path.dirname(f),{recursive:true});await fs.writeFile(f,JSON.stringify(d));}
 const r=await searchFiles({dir,entries,params:{query:'ברא',concordance:true,crossLanguage:true,limit:1}});assert.deepEqual(r.results[0].parallels,[],'edited translations must not inherit a different edition’s alignment');
});

test('word card preview stops after its result limit while full concordance counts both works', async t => {
 const find = await fixture(t, [{ title: 'Genesis', text: [['שיח שיח שיח']] }, { title: 'Exodus', text: [['שיח']] }]);
 const preview = await find({ concordancePreview: true, limit: 2 });
 assert.equal(preview.results.length, 2);
 assert.equal(preview.scanned, 1);
 const full = await find({ limit: 2 });
 assert.equal(full.scanned, 2);
 assert.equal(full.stats.reduce((count, work) => count + work.n, 0), 4);
});
