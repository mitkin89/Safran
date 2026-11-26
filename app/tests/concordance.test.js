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
test('Greek lemma search excludes edited annotations; word-form search remains available',async t=>{
 const d={title:'The War of the Jews',kind:'other',language:'Greek',text:[['ἐποίησεν ποιεῖ']],greekMorphology:{version:1,work:'test',F:['ἐποίησεν','ποιεῖ'],L:['ποιέω'],T:['v3saia---'],E:[[0,0,0],[1,0,0]],P:{'1.1':'0.1'},locator:{'[0,"1"]':'1.1'}}};d.greekMorphology.textHash=hash(d);
 const bad=structuredClone(d);bad.title='Edited work';bad.text=[['ἐποίησεν ποιεῖ καλῶς']];const find=await fixture(t,[d,bad]);
 const r=await find({query:'ποιέω',lemma:true});assert.equal(r.results.length,2);assert(r.results.every(x=>x.basis==='lemma'&&x.analysisSource==='OGA'&&x.title===d.title));assert.deepEqual(r.coverage,{annotated:1,surface:0});assert.equal(r.excludedWithoutLemma,1);assert.equal(r.total,1);
 assert.deepEqual([r.lemmaCoverage.withLemma,r.lemmaCoverage.words],[2,2]);
 assert(!r.lemmaCoverage.editions.some(row=>row.title===bad.title));
 assert.equal((await find({query:'ποιει',lemma:true})).results.length,0,'surface spelling must not match a different lemma');
 const surface=await find({query:'ποιει',lemma:false});assert.equal(surface.results.length,2);assert(surface.results.every(x=>x.snippet.hit==='ποιεῖ'));
});
test('Syriac consonantal lemma annotations require matching text and numbering',async t=>{
 const d={title:'Genesis',kind:'other',language:'Syriac',text:[['<h2>ܚܕ</h2><span class="syw" data-si="1">ܡܪܚܦܐ</span><small>ܚܕ</small>']],syriacMorphology:{version:1,fields:['lex'],analyses:[['RXP'],['M']],words:{'1':['ܡܪܚܦܐ',[0,1],1,1,[25,26]]}}};d.syriacMorphology.textHash=hash(d);
 const find=await fixture(t,[d]);const r=await find({query:'ܪܚܦ',lemma:true});assert.equal(r.results.length,1);assert.equal(r.results[0].analysisSource,'ETCBC Syriac');assert.equal(r.results[0].snippet.hit,'ܡܪܚܦܐ');
 assert.deepEqual([r.lemmaCoverage.withLemma,r.lemmaCoverage.words],[1,1],'one surface position despite two parts and excluded headings');
 assert.deepEqual(r.hitsByBasis,{lemma:1,surface:0,root:0});
});
test('Ruth adds only reviewed lemma hits and preserves the Peshitta verse keys', async t => {
 const bundle = path.join(__dirname, '../bundled');
 const entry = require('../bundled/manifest.json').items.find(e => e.title === 'Ruth' && e.language === 'Syriac' && e.versionTitle.startsWith('ETCBC Peshitta'));
 const find = (query, lemma = true) => C.search({dir: bundle, entries: [entry], params: {query, lemma}});
 const reviewed = await find('ܥܡܪ');
 assert(reviewed.results.some(hit => hit.loc.label === '1' && hit.loc.path[0] === 0 && hit.snippet.hit === 'ܠܡܥܡܪ' && hit.analysisSource === 'Safran (KI-Kontextprüfung)'));
 const drink = await find('ܫܬܝ');
 assert(drink.results.some(hit => hit.loc.label === '3' && hit.loc.path[0] === 2 && hit.snippet.hit === 'ܘܫ̇ܬܐ'));
 const vinegar = await find('ܚܠ');
 assert(vinegar.results.some(hit => hit.loc.label === '14' && hit.loc.path[0] === 1 && hit.snippet.hit === 'ܒܚܠܐ'));
 const bread = await find('ܠܚܡ');
 assert(bread.results.some(hit => hit.loc.label === '14' && hit.loc.path[0] === 1 && hit.snippet.hit === 'ܠܚܡܐ' && hit.basis === 'lemma'));
 assert(!bread.results.some(hit => hit.basis === 'surface'));
 assert((await find('ܠܚܡ', false)).results.some(hit => hit.loc.label === '4' && hit.loc.path[0] === 1 && hit.snippet.hit === 'ܠܚܡ'));
 const review = require('../peshitta-ruth-lemma-review.json').entries;
 assert.equal(review.find(row => row.id === '283299').parts[1][1], 'XL=');
 assert.equal(review.find(row => row.id === '283526').parts[1][1], 'CN>=');
 const enter = await find('ܥܠܠ');
 assert(enter.results.some(hit => hit.loc.label === '13' && hit.loc.path[0] === 3 && hit.snippet.hit === 'ܘܥܠ' && hit.basis === 'lemma'));
 assert(!(await find('ܥܠ')).results.some(hit => hit.snippet.hit === 'ܘܥܠ' && hit.loc.label === '13' && hit.loc.path[0] === 3));
 assert.equal(review.find(row => row.id === '283433').sedra.id, '127');
 assert.deepEqual(review.find(row => row.id === '283090').parts.map(part => part[1]), ['XM>=', 'H=']);
 const glean = await find('ܠܩܛ');
 assert(glean.results.some(hit => hit.loc.label === '7' && hit.loc.path[0] === 1 && hit.snippet.hit === 'ܘܠܩܛܬ' && hit.basis === 'lemma'));
 const gleanReview = review.find(row => row.id === '283165');
 assert.equal(gleanReview.seenIn, 'Joshua');
 assert.deepEqual(gleanReview.parts.map(part => part[1]), ['W', 'LQV']);
 const measured = (await find('ܟܝܠ')).results.find(hit => hit.loc.label === '15' && hit.loc.path[0] === 2 && hit.snippet.hit === 'ܘܐܟܝܠ');
 assert.equal(measured?.basis, 'lemma');
 assert.equal(measured.analysisSource, 'Safran (KI-Kontextprüfung mit SEDRA)');
 assert.equal(measured.analysisReference, 'SEDRA #1511');
 assert(!(await find('ܟܝܠ', false)).results.some(hit => hit.snippet.hit === 'ܘܐܟܝܠ'));
 const orpah = (await find('ܥܪܦܐ')).results.filter(hit => hit.loc.path[0] === 0);
 assert.equal(orpah.length, 2);
 assert(orpah.every(hit => hit.basis === 'lemma' && hit.analysisSource === 'Safran (KI-Kontextprüfung)' && !hit.analysisReference));
 const obed = await find('ܥܘܒܕ');
 assert.deepEqual(obed.results.map(hit => [hit.loc.label, hit.snippet.hit]), [['17', 'ܥܘܒܕ'], ['21', 'ܠܥܘܒܪ'], ['22', 'ܘܥܘܒܪ']]);
 const you = await find('ܟܝ');
 assert(you.results.some(hit => hit.loc.label === '17' && hit.loc.path[0] === 0 && hit.snippet.hit === 'ܘܠܟܝ' && hit.basis === 'lemma'));
 assert(!(await find('ܫܬ')).results.some(hit => hit.snippet.hit === 'ܘܫ̇ܬܐ'));
 assert(!(await find('ܛܠܝ')).results.some(hit => hit.snippet.hit === 'ܠܛܠܝܐ̣'));
 assert(!(await find('ܥܡܪ', false)).results.some(hit => hit.snippet.hit === 'ܠܡܥܡܪ'));
 const edited = JSON.parse(await fs.readFile(path.join(bundle, entry.rel), 'utf8'));
 edited.text[0]['1'] += 'ܐ';
 const findEdited = await fixture(t, [{...edited, kind: entry.kind}]);
 assert(!(await findEdited({query: 'ܫܬܝ', lemma: true})).results.some(hit => hit.snippet.hit === 'ܘܫ̇ܬܐ'));
 assert(!(await findEdited({query: 'ܟܝܠ', lemma: true})).results.some(hit => hit.snippet.hit === 'ܘܐܟܝܠ'));
 assert(!(await findEdited({query: 'ܥܘܒܕ', lemma: true})).results.some(hit => hit.snippet.hit === 'ܠܥܘܒܪ'));
});
test('Isaiah exposes contextual and parallel-text lemmas with their respective provenance', async t => {
 const bundle = path.join(__dirname, '../bundled');
 const entry = require('../bundled/manifest.json').items.find(e => e.title === 'Isaiah' && e.versionTitle.startsWith('ETCBC Peshitta'));
 const find = (query, lemma = true) => C.search({dir: bundle, entries: [entry], params: {query, lemma, perFile: 500}});
 const inVerse = (result, chapter, verse, form) => result.results.find(hit =>
   hit.loc.path[0] === chapter - 1 && hit.loc.label === verse && hit.snippet.hit === form);
 const context = inVerse(await find('ܕܝܢ'), 4, '4', 'ܕܕܝܢܐ');
 assert.equal(context?.basis, 'lemma');
 assert.equal(context.analysisSource, 'Safran (KI-Kontextprüfung)');
 const parallel = inVerse(await find('ܐܡܪ'), 36, '4', 'ܐܡܪܘ');
 assert.equal(parallel?.basis, 'lemma');
 assert.equal(parallel.analysisSource, 'ETCBC Syriac (Paralleltext)');
 assert.equal(parallel.analysisReference, 'II Kings 18:19');
 assert(!inVerse(await find('ܐܡܪ', false), 36, '4', 'ܐܡܪܘ'));
 assert(!inVerse(await find('ܡܕܝܢܐ'), 1, '21', 'ܡܕܝܢܬܐ'), 'a candidate based on spelling alone stays out of the lemma index');
 assert(!inVerse(await find('ܡܕܝܢܬܐ'), 1, '21', 'ܡܕܝܢܬܐ'));
 assert.equal(inVerse(await find('ܡܕܝܢܬܐ', false), 1, '21', 'ܡܕܝܢܬܐ')?.basis, 'surface');
 const killers = inVerse(await find('ܩܛܘܠ'), 1, '21', 'ܩܛܘ̈ܠܐ');
 assert.equal(killers?.analysisSource, 'ETCBC Syriac (automatischer Übersetzungsabgleich)');
 assert.equal(killers.analysisReference, 'Numbers 35:6 · Deuteronomy 4:42');
 assert.equal(inVerse(await find('ܣܘܓܐ'), 1, '11', 'ܣܘܓܐܐ')?.basis, 'lemma');
 const heed = await find('ܨܘܬ');
 assert.equal(inVerse(heed, 1, '2', 'ܘܨܘܬܝ')?.basis, 'lemma');
 assert.equal(inVerse(heed, 1, '10', 'ܘܨܘܬܘ')?.basis, 'lemma');
 assert.equal(inVerse(await find('ܥܡܘܪܐ'), 1, '10', 'ܕܥܡܘܪܐ')?.basis, 'lemma');
 assert(!inVerse(await find('ܥܡܘܪ'), 1, '10', 'ܕܥܡܘܪܐ'));
 const stall = inVerse(await find('ܐܘܪܝܐ'), 1, '3', 'ܐܘܪܝܐ');
 assert.equal(stall?.analysisReference, 'SEDRA #60');
 const struck = inVerse(await find('ܒܠܥ'), 1, '5', 'ܬܒܠܥܘܢ');
 assert.equal(struck?.analysisReference, 'SEDRA #402');
 const matched = inVerse(await find('ܝܗܘܕܐ'), 2, '1', 'ܝܗܘܕܐ');
 assert.equal(matched?.basis, 'lemma');
 assert.equal(matched.analysisSource, 'ETCBC Syriac (automatischer Kontextabgleich)');
 assert.equal(matched.analysisReference, 'II Kings 21:12 · Jeremiah 35:17');
 const all = inVerse(await find('ܟܠ'), 2, '2', 'ܟܠܗܘܢ');
 assert.equal(all?.analysisSource, 'ETCBC Syriac (automatischer Hauptlemma-Abgleich)', 'repeated form and Hebrew lemma-pair evidence can support the main lemma without assigning the suffix');
 assert(all.analysisReference.startsWith('H:3605 · Genesis 2:2 · Exodus 4:19'));

 const edited = JSON.parse(await fs.readFile(path.join(bundle, entry.rel), 'utf8'));
 edited.text[0]['1'] += 'ܐ';
 const findEdited = await fixture(t, [{...edited, kind: entry.kind}]);
 assert(!inVerse(await findEdited({query: 'ܐܡܪ', lemma: true}), 36, '4', 'ܐܡܪܘ'));
});
test('New Peshitta books expose form-changing lemma hits with translation alignment provenance', async t => {
 const bundle = path.join(__dirname, '../bundled');
 const entry = require('../bundled/manifest.json').items.find(e =>
   e.title === 'Song of Songs' && e.versionTitle.startsWith('ETCBC Peshitta'));
 const find = lemma => C.search({dir: bundle, entries: [entry], params: {query: 'ܡܫܚ', lemma}});
 const hit = result => result.results.find(row => row.loc.path[0] === 0 && row.loc.label === '3' && row.snippet.hit === 'ܡܫܚܐ');
 const matched = hit(await find(true));
 assert.equal(matched?.basis, 'lemma');
 assert.equal(matched.analysisSource, 'ETCBC Syriac (automatischer Übersetzungsabgleich)');
 assert.equal(matched.analysisReference, 'Genesis 28:18 · Exodus 27:20');
 assert(!hit(await find(false)));

 const edited = JSON.parse(await fs.readFile(path.join(bundle, entry.rel), 'utf8'));
 edited.text[0][0] += 'ܐ';
 const findEdited = await fixture(t, [{...edited, kind: entry.kind}]);
 assert(!hit(await findEdited({query: 'ܡܫܚ', lemma: true})));
});
test('Peshitta review fills missing words alongside the embedded morphology', async () => {
 const bundle = path.join(__dirname, '../bundled');
 const entry = require('../bundled/manifest.json').items.find(e =>
   e.title === 'Joshua' && e.versionTitle.startsWith('ETCBC Peshitta'));
 const result = await C.search({dir: bundle, entries: [entry], params: {query: 'ܫܒܛ', lemma: true, perFile: 500}});
 assert(result.results.some(hit => hit.analysisSource === 'ETCBC Syriac'));
 assert(result.results.some(hit => hit.loc.path[0] === 20 && hit.loc.label === '34' && hit.analysisSource === 'Safran (KI-Kontextprüfung)'));
 assert.equal(result.lemmaCoverage.withLemma, result.lemmaCoverage.words);
 const jeremiah = require('../bundled/manifest.json').items.find(e =>
   e.title === 'Jeremiah' && e.versionTitle.startsWith('ETCBC Peshitta'));
 const news = await C.search({dir: bundle, entries: [jeremiah], params: {query: 'ܫܡܘܥܬܐ', lemma: true, perFile: 500}});
 assert(news.results.some(hit => hit.loc.path[0] === 48 && hit.loc.label === '23' && hit.analysisReference === 'SEDRA #6339'));
 assert.equal(news.lemmaCoverage.withLemma, news.lemmaCoverage.words);
});
test('NT-supported Peshitta context reviews retain their separate provenance', async () => {
 const bundle = path.join(__dirname, '../bundled');
 const entries = require('../bundled/manifest.json').items.filter(e => e.title === 'Isaiah' && e.versionTitle.startsWith('ETCBC Peshitta'));
 const result = await C.search({dir: bundle, entries, params: {query: 'ܨܗܝܘܢ', lemma: true, perFile: 500}});
 const zion = result.results.find(hit => hit.loc.path[0] === 27 && hit.loc.label === '16' && hit.snippet.hit === 'ܒܨܗܝܘܢ');
 assert.equal(zion?.analysisSource, 'Safran (KI-Kontextprüfung mit NT-Belegen)');
 assert.equal(zion.analysisReference, 'syrnt · Romans 9:33 · syrnt · 1_Peter 2:6');
 const heart = await C.search({dir: bundle, entries, params: {query: 'ܠܒܐ', lemma: true, perFile: 500}});
 const reviewed = heart.results.find(hit => hit.loc.path[0] === 5 && hit.loc.label === '10' && hit.snippet.hit === 'ܠܒܗ');
 assert.equal(reviewed?.analysisSource, 'Safran (KI-Kontextprüfung mit NT-Belegen)');
 assert(reviewed.analysisReference.startsWith('SEDRA #1619 · syrnt'));
 const surface = await C.search({dir: bundle, entries, params: {query: 'ܨܗܝܘܢ', lemma: false}});
 assert(!surface.results.some(hit => hit.snippet.hit === 'ܒܨܗܝܘܢ'));
});
test('Syriac punctuation does not shift verse positions or cross-language peers', async () => {
 const bundle = path.join(__dirname, '../bundled');
 const entries = require('../bundled/manifest.json').items.filter(e => e.title === 'Ruth' && /^(Westminster|ETCBC Peshitta)/.test(e.versionTitle));
 const find = query => C.search({dir: bundle, entries, params: {query, lemma: true, crossLanguage: true}});
 assert.deepEqual(C.tokens('܀ ܰ ܐܠܗܐ').map(token => token.text), ['ܐܠܗܐ']);
 const toSyriac = (await find('ערפה')).results.find(hit => hit.loc.label === '4');
 const peer = toSyriac?.parallels.find(hit => hit.language === 'Syriac');
 assert.deepEqual(peer?.path, [0, '4']);
 assert.match(peer.context, /ܥܪܦܐ/);
 const toHebrew = (await find('ܥܘܒܕ')).results.find(hit => hit.loc.label === '22');
 assert(toHebrew?.parallels.some(hit => hit.mtRef === 'Ruth 4:22' && hit.kind === 'he'));
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
 const find = await fixture(t, [{ title: 'Genesis', text: [['שיח שיח שיח', 'אחר']] }, { title: 'Exodus', text: [['שיח']] }]);
 const preview = await find({ concordancePreview: true, limit: 2 });
 assert.equal(preview.results.length, 2);
 assert.equal(preview.scanned, 1);
 assert.equal(preview.lemmaCoverage, undefined);
 assert.deepEqual(preview.hitsByBasis,{lemma:0,surface:3,root:0});
 const full = await find({ limit: 2 });
 assert.equal(full.scanned, 2);
 assert.equal(full.stats.reduce((count, work) => count + work.n, 0), 4);
});

test('root scope uses explicit lexicon family IDs, excluding homonymous roots and plain surface hits', async t => {
 const annotated = (id, word) => `<span class="w" data-l="${id}" data-m="HNcmsa">${word}</span>`;
 const text = [[[
  annotated('5265','נָסַע'), annotated('4550','מַסָּע'), annotated('4551b','מַסָּע'), annotated('0','נסע')
 ].join(' ')]];
 const find = await fixture(t, [
  { title:'Genesis',versionTitle:'Westminster fixture',text },
  { title:'Exodus',versionTitle:'Other edition',text }
 ]);
 const result = await find({ query:'נסע',concordanceRoot:'5265' });
 assert.equal(result.total,1);
 assert.deepEqual(result.results.map(r=>r.position),[1,2]);
 assert(result.results.every(r=>r.basis==='root' && r.matchedLemma));
 const homonym = await find({ query:'נסע',concordanceRoot:'4551b' });
 assert.deepEqual(homonym.results.map(r=>r.position),[3]);
});

test('word-card lemma scope excludes homonyms of Strong 2805 even when their spelling matches', async t => {
 const word = (id, code, text) => `<span class="w" data-l="${id}" data-m="${code}">${text}</span>`;
 const find = await fixture(t, [
  { title: 'Genesis', versionTitle: 'Westminster fixture', text: [[[
   word('2805', 'HNcmsa', 'חֵשֶׁב'), word('2803', 'HVqp3ms', 'חָשַׁב'), word('4284', 'HNcfsa', 'מַחֲשָׁבָה')
  ].join(' ')]] },
  { title: 'Exodus', text: [['חשב']] }
 ]);
 const lemma = await find({ query: 'חֵשֶׁב', concordanceLemma: '2805' });
 assert.deepEqual(lemma.results.map(r => r.position), [1]);
 assert.equal(lemma.stats[0].n, 1);
 const family = await find({ query: 'חשב', concordanceRoot: '2805' });
 assert.deepEqual(family.results.map(r => r.matchedLemmaId), ['2805', '2803', '4284']);
});

test('UniMorph context supplement admits reviewed positions and withholds incompatible homographs', async () => {
 const review = require('../peshitta-lexical-context-review.json');
 const decisions = require('../tools/peshitta/lexical-context-decisions.json').decisions;
 const manifest = require('../bundled/manifest.json').items;
 assert.equal(decisions.length, 121);
 assert.equal(review.books.reduce((n, b) => n + b.entries.length, 0), 71);
 const queries = new Map();
 for (const decision of decisions) {
  const lemma = decision.lexicalEvidence.candidates[0].lemma;
  const key = JSON.stringify([decision.book, lemma]);
  if (!queries.has(key)) {
   const entries = manifest.filter(e => e.title === decision.book && e.versionTitle.startsWith('ETCBC Peshitta'));
   queries.set(key, await C.search({dir: path.join(__dirname, '../bundled'), entries, params: {query: lemma, lemma: true, perFile: 10000, limit: 10000}}));
  }
  const hits = queries.get(key).results.filter(hit => hit.loc.path[0] === decision.chapter - 1 && Number(hit.loc.label) === decision.verse && hit.snippet.hit === decision.form && hit.analysisSource === review.source);
  assert.equal(hits.length > 0, decision.contextReview.accepted, `${decision.book} ${decision.chapter}:${decision.verse} ${decision.form}`);
  if (decision.contextReview.accepted) assert(hits.every(hit => hit.basis === 'lemma' && hit.analysisReference.startsWith('UniMorph Syriac')));
 }
});

test('lemma search excludes Bach and falsely labelled sources while word-form search keeps them', async t => {
 const word = '<span class="w" data-l="4397" data-m="HNcmsa">מלאך</span>';
 const find = await fixture(t, [
  {title:'Genesis',versionTitle:'Westminster fixture',text:[[word+' <span class="w" data-l="0" data-m="HNcmsa">מלאך</span>']]},
  {title:'Bach',text:[['מלאך']]},
  {title:'Unsupported',versionTitle:'Westminster fixture',text:[['מלאך']]},
 ]);
 const lemmas = await find({query:'מלאך',lemma:true});
 assert.deepEqual(lemmas.results.map(hit=>[hit.title,hit.position,hit.basis]),[['Genesis',1,'lemma']]);
 assert.equal(lemmas.total,1); assert.equal(lemmas.scanned,1);assert.equal(lemmas.excludedWithoutLemma,2);
 assert.equal(lemmas.lemmaCoverage.editions.length,1);
 assert.equal(lemmas.hitsByBasis.surface,0);
 const forms = await find({query:'מלאך'});
 assert.equal(forms.results.length,4);assert(forms.results.some(hit=>hit.title==='Bach'));
 const excluded = await C.search({dir:os.tmpdir(),entries:[{rel:'nonexistent-bach.json',title:'Bach',kind:'he',language:'Hebrew'}],params:{query:'מלאך',lemma:true}});
 assert.equal(excluded.total,0);assert.equal(excluded.excludedWithoutLemma,1);assert.equal(excluded.errors,0,'known unsupported editions are excluded before reading files');
});

test('unified family search resolves explicit root links from an entered lemma and keeps verse and occurrence counts separate', async t=>{
 const w=(id,word)=>`<span class="w" data-l="${id}" data-m="HVqp3ms">${word}</span>`;
 const find=await fixture(t,[{title:'Genesis',versionTitle:'Westminster fixture',text:[[
  [w('7725','שָׁב'),w('7725','שָׁב'),w('4878','מְשׁוּבָה')].join(' '),w('8666','תְּשׁוּבָה')
 ]]}]);
 const lemma=await find({query:'שוב',lemma:true});
 assert.equal(lemma.dist[0].o,2);assert.equal(lemma.dist[0].h,1);
 const family=await find({query:'שוב',concordanceFamily:true});
 assert.deepEqual(family.results.map(x=>x.matchedLemmaId),['7725','7725','4878','8666']);
 assert.equal(family.dist[0].o,4);assert.equal(family.dist[0].h,2);
 const derivative=await find({query:'משובה',concordanceFamily:true});
 assert.equal(derivative.dist[0].o,4);
 assert((await find({query:'לאקיים',concordanceFamily:true})).error);
});
