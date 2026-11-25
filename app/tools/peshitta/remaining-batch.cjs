'use strict';
// node tools/peshitta/remaining-batch.cjs lexical-evidence.jsonl TF-source-directory output-directory
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const M=require('./main-lemma-evidence.cjs'),R=require('./remaining-evidence.cjs'),C=require('../../concordance'),{norm}=require('../../syriac-cards');
const root=path.resolve(__dirname,'../..');
async function run(){
 const [input,tfDir,output]=process.argv.slice(2);assert(input&&tfDir&&output);
 const current=R.currentReviews(),source=M.load();
 const label='ETCBC Syriac (automatischer Hauptlemma-Abgleich, erweitertes Korpus)';
 const laterLabels=new Set([label,'ETCBC Syriac (automatischer Wortgruppenabgleich)']);
 let appliedExtended=0;
 const baseline=await C.search({dir:path.join(root,'bundled'),entries:require('../../bundled/manifest.json').items.filter(e=>e.versionTitle.startsWith('ETCBC Peshitta')),params:{query:'ܡܪܝܐ',lemma:true,limit:1},onAnalysis:hit=>{if(laterLabels.has(hit.analysisSource))appliedExtended++;}});
 // Reproduce the pre-supplement baseline even after this and later batches have been installed.
 const assignedBefore=baseline.lemmaCoverage.withLemma-appliedExtended;
 const originalOpen=baseline.lemmaCoverage.words-assignedBefore;
 const extra=R.additionalCorpus(source,tfDir,require('./extended-source.json')),byForm=new Map();
 for(const r of extra.extras){const k=norm(r.form);if(!byForm.has(k))byForm.set(k,new Map());byForm.get(k).set(JSON.stringify(r.parts),{parts:r.parts});}
 const candidates=new Map([...byForm].map(([k,v])=>[k,[...v.values()]]));
 const audit=[],ready=[],findings={},seen=new Set(),inputHash=crypto.createHash('sha256');
 const stream=fs.createReadStream(input);stream.on('data',b=>inputHash.update(b));
 for await(const line of readline.createInterface({input:stream,crlfDelay:Infinity})){
  if(!line)continue;const row=JSON.parse(line);assert(!seen.has(row.id));seen.add(row.id);
  if(current.assigned.has(row.id))continue;
  const result=R.assess(source,row,current.protectedIds,candidates);
  const chapter=source.docs.get(row.book).text[row.chapter-1],html=Array.isArray(chapter)?chapter[row.verse-1]:chapter[String(row.verse)];
  result.context=C.textOf(html);
  if(current.protectedReasons.has(row.id))result.protection=current.protectedReasons.get(row.id);
  audit.push(result);findings[result.reason]=(findings[result.reason]||0)+1;
  if(result.accepted)ready.push(result);
 }
 assert.equal(audit.length,originalOpen,'audit must cover every actual remaining lexical position');
 const raw=audit.map(r=>JSON.stringify(r)).join('\n')+'\n',extraRaw=extra.extras.map(r=>JSON.stringify(r)).join('\n')+'\n';
 const review=M.exportReview(ready);review.source=label;
 for(const b of review.books)for(const r of b.entries){r.extendedMainLemmaSources=r.mainLemmaSources;delete r.mainLemmaSources;}
 const benchmark=M.benchmark(source);
 const summary={version:1,method:'remaining-gap-audit-original-ETCBC-extended-form-witnesses-same-semantic-thresholds',
  examined:audit.length,newAssignments:ready.length,remaining:audit.length-ready.length,
  before:{words:baseline.lemmaCoverage.words,assigned:assignedBefore,open:originalOpen},
  after:{words:baseline.lemmaCoverage.words,assigned:assignedBefore+ready.length,open:audit.length-ready.length},
  reviewKind:'Automatic source-evidence assessment of all remaining positions. No claim of individual scholarly verification or complete morphology.',
  findings,input:{sha256:inputHash.digest('hex'),positions:seen.size},priorReviews:current.files,sourceFiles:source.sourceFiles,
  alignmentAndHebrewFiles:source.provenance,additionalCorpus:extra.source,additionalCounts:extra.counts,
  additionalWitnesses:extra.extras.length,extraSnapshotSha256:R.digest(extraRaw),auditSha256:R.digest(raw),benchmark,
  safeguards:'No earlier inferred lemma is a witness. Earlier published entries are protected. Individual rejections/exclusions remain pending. Existing thresholds and current one-to-one Hebrew alignment checks are retained.',
  licenses:{originalAnnotationsAndText:'CC BY-NC 4.0',generatedAssignments:'CC BY-NC 4.0'}};
 fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,'remaining-gaps.jsonl.gz'),zlib.gzipSync(raw));
 fs.writeFileSync(path.join(output,'extended-corpus-forms.jsonl.gz'),zlib.gzipSync(extraRaw));
 fs.writeFileSync(path.join(output,'remaining-summary.json'),JSON.stringify(summary,null,2)+'\n');
 fs.writeFileSync(path.join(output,'peshitta-remaining-lemma-review.json'),JSON.stringify(review)+'\n');
 console.log(JSON.stringify({examined:summary.examined,newAssignments:summary.newAssignments,remaining:summary.remaining,additionalWitnesses:summary.additionalWitnesses,findings,benchmark:{tested:benchmark.tested,agreed:benchmark.agreed,disagreements:benchmark.disagreements.length}},null,2));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
