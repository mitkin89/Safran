'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const G=require('../gmorph'),C=require('../greek-corpus'),R=require('../reader'),manifest=require('../bundled/manifest.json');
const entry=manifest.items.find(e=>e.title==='Letter of Aristeas'&&e.language==='Greek');
const raw=fs.readFileSync(path.join(__dirname,'../bundled',entry.rel)),doc=JSON.parse(raw);
doc.textHash=crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex');
const report=require('../tools/aristeas/coverage.json');

test('all 322 Aristeas sections expose only their own checked word positions',()=>{
 assert.equal(doc.text.length,322);assert.equal(entry.hash,crypto.createHash('sha1').update(raw).digest('hex'));
 assert.equal(doc.greekMorphology.textHash,doc.textHash);assert.equal(doc.greekMorphology.source,'glaux');
 let words=0,annotated=0,unresolved=0;
 for(const section of R.sectionsOf(doc.text,doc.sectionNames))for(const row of R.flattenNode(R.getByPath(doc.text,section.path))){
  const ws=G.words(row.html),at=C.at(doc,section.path,row.label,ws);assert(at,'section '+row.label);
  assert.equal(at.locus,row.label);assert(at.records.every(r=>r.source==='glaux'&&r.analysis==='auto'));
  const count=at.records.filter(r=>r.lemma&&r.tag).length;
  assert.equal(ws.length,report.coverage[Number(row.label)-1].words);assert.equal(count,report.coverage[Number(row.label)-1].annotated);
  for(const record of at.records){if(record.tag){assert.match(record.tag,/^[a-z0-9-]{9}$/);assert(C.key(record.tag));}}
  words+=ws.length;annotated+=count;unresolved+=ws.length-count;
 }
 assert.equal(words,12931);assert.equal(annotated,12785);assert.equal(unresolved,146);
 assert.equal(annotated,report.annotated);assert.equal(unresolved,report.unresolved);
});

test('Aristeas 43 stays readable without invented morphology; 44 and 271 keep their numbering',()=>{
 const at=n=>C.at(doc,[],String(n),G.words(doc.text[n-1]));
 assert.equal(at(43).records.length,42);assert(at(43).records.every(r=>!r.lemma&&!r.tag));
 assert(at(42).records.some(r=>r.lemma));assert(at(44).records.some(r=>r.lemma));
 assert.equal(at(44).locus,'44');assert.equal(at(271).locus,'271');assert.equal(at(322).locus,'322');
 assert(doc.text[270].includes('οφῶς')); // source spelling retained, no silent emendation to σοφῶς
 const typo=at(8).records.find(r=>r.form==='ὠφέλεισαν');assert(typo);assert.equal(typo.lemma,null);
 assert.equal(C.at(doc,[],'323',G.words(doc.text[321])),null);
});

test('Aristeas rejects edited text, swapped tokens and incompatible source hashes',()=>{
 const ws=G.words(doc.text[0]);assert.equal(C.at({...doc,textHash:'edited'},[],'1',ws),null);
 assert.equal(C.at(doc,[],'1',ws.slice().reverse()),null);assert.equal(C.at(doc,[],'2',ws),null);
 assert.equal(C.at(doc,[],'1',['ἄλλος',...ws.slice(1)]),null);
});

test('Greek and Kautzsch Aristeas share one library work and keep the German bytes unchanged',()=>{
 const O=require('../offline'),items=manifest.items.filter(e=>e.title==='Letter of Aristeas');
 const groups=O.buildGroups({books:items});assert.equal(groups.length,1);assert.equal(items.length,2);
 const german=items.find(e=>e.kind==='de');
 assert.equal(german.hash,'088ccbfed910326b8b07e498fbdef6a97d34f585');
 assert.equal(crypto.createHash('sha1').update(fs.readFileSync(path.join(__dirname,'../bundled',german.rel))).digest('hex'),german.hash);
 assert(!doc.text.some(s=>/\bE\b/.test(s)));assert.equal(report.discardedNavigation.length,168);
});

test('bundled import carries Greek analyses through the production Library.read path',async t=>{
 const fsp=require('node:fs/promises'),os=require('node:os'),{Library}=require('../offline');
 const tmp=await fsp.mkdtemp(path.join(os.tmpdir(),'safran-aristeas-'));t.after(()=>fsp.rm(tmp,{recursive:true,force:true}));
 const pack=path.join(tmp,'bundle'),file=path.join(pack,entry.rel);await fsp.mkdir(path.dirname(file),{recursive:true});
 await fsp.writeFile(file,raw);await fsp.writeFile(path.join(pack,'manifest.json'),JSON.stringify({items:[entry]}));
 const lib=await new Library(path.join(tmp,'library')).load();assert.equal(await lib.importBundled(pack),1);
 const loaded=await lib.read(entry.rel),at=C.at(loaded,[],'1',G.words(loaded.text[0]));
 assert.equal(at.records[0].lemma,'ἀξιόλογος');assert.equal(at.records[0].tag,'a-s---fg-');
 assert.equal(at.records[0].source,'glaux');
});

test('concordance lemma hits retain GLAUx attribution and report unresolved coverage',async()=>{
 const result=await require('../concordance').search({dir:path.join(__dirname,'../bundled'),entries:[entry],params:{query:'ἀξιόλογος',lemma:true}});
 assert(result.results.length>0);assert(result.results.some(r=>r.snippet.hit==='Ἀξιολόγου'&&r.basis==='lemma'&&r.analysisSource==='GLAUx'));
 assert.equal(result.lemmaCoverage.words,12931);assert.equal(result.lemmaCoverage.withLemma,12785);
});
