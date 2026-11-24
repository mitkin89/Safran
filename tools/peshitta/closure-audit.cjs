'use strict';
// Reconcile every assigned and pending lexical position. This is technical validation, not expert certification.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const C=require('../../concordance'),SY=require('../../syriac-morph'),A=require('./automatic-context.cjs'),R=require('./remaining-evidence.cjs');
const root=path.resolve(__dirname,'../..');
const categories=[
 {id:'missingAlignment',label:'Keine vorhandene Wortverknüpfung'},
 {id:'alignmentGroup',label:'Wortgruppe nicht eindeutig auflösbar'},
 {id:'insufficientEvidence',label:'Zu wenig passende Vergleichsbelege'},
 {id:'competingLemmas',label:'Mehrere mögliche Lemmata'},
 {id:'conflictingEvidence',label:'Widersprüchliche Quellenbelege'},
 {id:'protectedReview',label:'Bewusst zurückgestellte Einzelentscheidung'},
];
const categoryByReason={
 'no-existing-alignment-link':'missingAlignment',
 'unresolved-or-lexical-syriac-companion':'alignmentGroup','no-hebrew-lexical-head':'alignmentGroup','multiple-hebrew-lexical-heads':'alignmentGroup','unsupported-hebrew-main-pos':'alignmentGroup','alignment-component-too-large':'alignmentGroup','missing-hebrew-main-lemma':'alignmentGroup',
 'insufficient-form-and-translation-support':'insufficientEvidence','competing-main-lemmas':'competingLemmas','known-source-anchor-conflict':'conflictingEvidence','held-out-control-conflict':'conflictingEvidence','protected-individual-review-or-exclusion':'protectedReview',
};
const sourceKind=source=>source==='ETCBC Syriac'?'original':source==='ETCBC Syriac (Paralleltext)'?'parallel':source.startsWith('ETCBC Syriac (automatischer ')?'automatic':source.startsWith('Safran (KI-Kontextprüfung')?'aiContext':null;
const add=(o,k)=>o[k]=(o[k]||0)+1;
function frozenRows(file,expected){const raw=zlib.gunzipSync(fs.readFileSync(path.join(root,file)));assert.equal(R.digest(raw),expected,file);return raw.toString().trim().split('\n').map(JSON.parse);}
async function build(){
 const corpus=A.loadCorpus(),files=[],pending=new Map();
 const read=file=>{const raw=fs.readFileSync(path.join(root,file));files.push({file,sha256:R.digest(raw)});return JSON.parse(raw);};
 const remaining=read('tools/peshitta/remaining-summary.json'),grouped=read('tools/peshitta/group-anchor-summary.json');
 const old=frozenRows('tools/peshitta/remaining-gaps.jsonl.gz',remaining.auditSha256),newer=frozenRows('tools/peshitta/group-anchor-audit.jsonl.gz',grouped.auditSha256);
 for(const r of old)if(!r.accepted)pending.set(r.id,r);
 for(const r of newer){assert.equal(pending.get(r.id)?.reason,'no-current-one-to-one-hebrew-alignment');if(r.accepted)pending.delete(r.id);else pending.set(r.id,r);}
 assert.equal(pending.size,grouped.after.open);
 const supplementFiles=R.currentReviews().files.filter(f=>f.file.startsWith('peshitta')).map(f=>f.file).concat(['peshitta-remaining-lemma-review.json','peshitta-group-anchor-review.json']);
 const supplements=new Map();
 for(const file of supplementFiles){const data=read(file);for(const b of data.books||[data]){
  const doc=corpus.docs.get(b.book);assert(doc,b.book);assert.equal(b.textHash,doc.syriacMorphology.textHash);
  for(const r of b.entries){if(!r.parts?.length&&!r.sedra?.lemma&&!r.contextLemma)continue;
   const native=doc.syriacMorphology.words[r.id];assert(native,r.id);assert.deepEqual([native[0],native[2],native[3]],[r.form,r.chapter,r.verse],r.id);assert.equal(native[1].length,0,'do not overwrite source annotation');
   assert(!supplements.has(r.id),'overlapping supplementary assignment '+r.id);assert(!pending.has(r.id),'assigned and pending '+r.id);
   const lemmas=r.sedra?[r.sedra.lemma]:r.parts?r.parts.map(p=>SY.lemma(p[1])).filter(Boolean):[r.contextLemma];assert(lemmas.length&&lemmas.every(Boolean),r.id);
   supplements.set(r.id,{...r,book:b.book,lemmas});
  }
 }}
 const nativePositions=new Map(),nativeIds=new Set(),books=new Map();
 for(const [book,doc]of corpus.docs){
  const b={book,textHash:doc.syriacMorphology.textHash,sourceSha256:corpus.sourceFiles.find(f=>f.book===book).sha256,words:0,withLemma:0,unassigned:0,sources:{original:0,parallel:0,automatic:0,aiContext:0},gaps:{},reasons:{}};books.set(book,b);
  const rows=[];require('../../reader').walkStrings(doc.text,[],(html,p)=>rows.push({html,p}));
  for(const {html,p}of rows){const ts=C.tokens(C.textOf(html)),spans=C.syriacWordSpans(html,ts);assert(spans,book+' '+p);for(const [i,span]of spans.entries()){
   if(!/\p{L}/u.test(ts[i].text))continue;const w=doc.syriacMorphology.words[span.id];assert(w,span.id);assert(!nativeIds.has(span.id));nativeIds.add(span.id);
   const lexIndex=doc.syriacMorphology.fields.indexOf('lex'),original=w[1].map(n=>SY.lemma(doc.syriacMorphology.analyses[n][lexIndex])).filter(Boolean);
   nativePositions.set(JSON.stringify([book,p,i+1]),{id:span.id,book,form:span.form,tokenForm:ts[i].text,original});b.words++;
  }}
 }
 const seen=new Set(),supplementSeen=new Set(),bySource={};
 const result=await C.search({dir:path.join(root,'bundled'),entries:require('../../bundled/manifest.json').items.filter(e=>e.versionTitle.startsWith('ETCBC Peshitta')),params:{query:'ܡܪܝܐ',lemma:true,limit:1},onAnalysis:hit=>{
  const native=nativePositions.get(JSON.stringify([hit.title,hit.path,hit.position]));assert(native);assert(!seen.has(native.id));seen.add(native.id);assert.equal(native.tokenForm,hit.form);assert(!pending.has(native.id));
  const sup=supplements.get(native.id);assert.deepEqual(hit.lemmas,native.original.length?native.original:sup?.lemmas,native.id);
  if(sup)supplementSeen.add(native.id);else assert.equal(hit.analysisSource,'ETCBC Syriac');
  const kind=sourceKind(hit.analysisSource);assert(kind,'unclassified provenance '+hit.analysisSource);const b=books.get(native.book);b.withLemma++;b.sources[kind]++;add(bySource,hit.analysisSource);
 }});
 const outcomes=[],counts={};
 for(const n of nativePositions.values()){
  if(seen.has(n.id))continue;const r=pending.get(n.id);assert(r,'unclassified native gap '+n.id);assert.equal(r.book,n.book);assert.equal(r.form,n.form);assert.equal(r.textHash,books.get(n.book).textHash);
  const category=categoryByReason[r.reason];assert(category,'unclassified reason '+r.reason);const b=books.get(n.book);b.unassigned++;add(b.gaps,category);add(b.reasons,r.reason);add(counts,category);
  outcomes.push({book:r.book,id:r.id,form:r.form,chapter:r.chapter,verse:r.verse,textHash:r.textHash,category,reason:r.reason,context:r.context});
 }
 assert.equal(outcomes.length,pending.size);assert.equal(supplementSeen.size,supplements.size);assert.equal(seen.size,result.lemmaCoverage.withLemma);assert.equal(nativePositions.size,result.lemmaCoverage.words);assert.equal(nativePositions.size,seen.size+pending.size);assert.deepEqual([seen.size,pending.size],[237767,70960]);
 for(const b of books.values()){assert.equal(b.words,b.withLemma+b.unassigned);assert.equal(Object.values(b.sources).reduce((a,n)=>a+n,0),b.withLemma);assert.equal(Object.values(b.gaps).reduce((a,n)=>a+n,0),b.unassigned);}
 const controls=['tools/peshitta/context-batch-10000-summary.json','tools/peshitta/neighbor-batch-20000-summary.json','tools/peshitta/main-lemma-20000-summary.json','tools/peshitta/remaining-summary.json','tools/peshitta/group-anchor-summary.json'].map(file=>{const d=files.some(f=>f.file===file)?JSON.parse(fs.readFileSync(path.join(root,file))):read(file);return {file,method:d.benchmark.method,tested:d.benchmark.tested,agreed:d.benchmark.agreed,disagreements:d.benchmark.disagreements.length};});
 const status={version:1,stage:'documented-gaps',scope:'39 bundled Tanakh Peshitta editions',validation:'All lexical positions reconciled with source-bound runtime assignments or documented gap causes. This is technical validation; automatic/AI decisions are not independently certified.',independentScholarlyVerification:false,totals:{words:nativePositions.size,withLemma:seen.size,unassigned:pending.size},categories:categories.map(c=>({...c,count:counts[c.id]||0})),sources:bySource,books:[...books.values()]};
 const raw=outcomes.map(r=>JSON.stringify(r)).join('\n')+'\n';
 const audit={version:1,statusSha256:R.digest(JSON.stringify(status)+'\n'),gapsSha256:R.digest(raw),sourceFiles:corpus.sourceFiles,inputs:files,previousAuditSha256:remaining.auditSha256,groupAuditSha256:grouped.auditSha256,quality:{lexicalPositions:nativePositions.size,assignedPositions:seen.size,supplementaryPositions:supplementSeen.size,documentedGaps:pending.size,overlappingAssignments:0,overwrittenSourceAnnotations:0,runtimeLemmaMismatches:0,unclassifiedGaps:0},controls,limits:'No independent expert gold standard. Controls overlap and must not be pooled into an accuracy estimate. Main-lemma coverage does not imply complete morphology or cross-language semantic identity.'};
 return {status,audit,raw};
}
async function run(output){assert(output);const {status,audit,raw}=await build();fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'peshitta-concordance-status.json'),JSON.stringify(status)+'\n');fs.writeFileSync(path.join(output,'closure-summary.json'),JSON.stringify(audit,null,2)+'\n');fs.writeFileSync(path.join(output,'documented-gaps.jsonl.gz'),zlib.gzipSync(raw));console.log(JSON.stringify({totals:status.totals,categories:status.categories,quality:audit.quality,controls:audit.controls},null,2));}
if(require.main===module)run(process.argv[2]).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={build,categories,categoryByReason,sourceKind};
