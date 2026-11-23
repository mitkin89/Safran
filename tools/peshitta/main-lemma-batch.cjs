'use strict';
// node tools/peshitta/main-lemma-batch.cjs lexical-evidence.jsonl output-directory [number-to-assign]
const fs = require('node:fs'), path = require('node:path'), readline = require('node:readline');
const crypto = require('node:crypto'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const M = require('./main-lemma-evidence.cjs'), C = require('../../concordance');
const root = path.resolve(__dirname, '../..'), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function run() {
 const [input, output, amount = '20000'] = process.argv.slice(2), count = Number(amount);
 assert(input && output && Number.isSafeInteger(count) && count > 0);
 const excluded = new Set(), excludedFiles = [];
 const read = name => {const raw = fs.readFileSync(path.join(root, name)); excludedFiles.push({file: name, sha256: hash(raw)}); return JSON.parse(raw);};
 for (const name of ['peshitta-ruth-lemma-review.json','peshitta-isaiah-lemma-review.json','peshitta-lemma-assignments.json',
  'peshitta-nt-context-review.json','peshitta-lexical-context-review.json','peshitta-corpus-dictionary-review.json',
  'peshitta-automatic-context-review.json','peshitta-neighbor-review.json']) {
  const data = read(name); for (const b of data.books || [data]) for (const r of b.entries) excluded.add(r.id);
 }
 for (const name of ['tools/peshitta/lexical-context-decisions.json','tools/peshitta/lexical-context-batch-1000.json']) {
  for (const r of read(name).decisions) excluded.add(r.id);
 }
 const source = M.load(), ready = [], findings = {}, seen = new Set(), inputHash = crypto.createHash('sha256');
 const stream = fs.createReadStream(input); stream.on('data', bytes => inputHash.update(bytes));
 let scanned = 0, considered = 0;
 for await (const line of readline.createInterface({input: stream, crlfDelay: Infinity})) {
  if (!line) continue; const row = JSON.parse(line); scanned++;
  assert(!seen.has(row.id), row.id); seen.add(row.id);
  if (excluded.has(row.id)) continue;
  considered++;
  const result = M.assess(source, row);
  findings[result.reason] = (findings[result.reason] || 0) + 1;
  if (result.accepted) ready.push(result);
 }
 ready.sort((a,b) => Math.min(b.evidence.formCount,b.evidence.translationCount) - Math.min(a.evidence.formCount,a.evidence.translationCount) || Number(a.id)-Number(b.id));
 assert(ready.length >= count, `Only ${ready.length} supported assignments for requested ${count}`);
 const selected = ready.slice(0,count).map(r => {
  const chapter = source.docs.get(r.book).text[r.chapter-1], html = Array.isArray(chapter) ? chapter[r.verse-1] : chapter[String(r.verse)];
  return {...r, context: C.textOf(html)};
 });
 const raw = selected.map(r=>JSON.stringify(r)).join('\n')+'\n', review = M.exportReview(selected), benchmark = M.benchmark(source);
 const summary = {version:1, method:review.method, requestedNewAssignments:count, newAssignments:selected.length,
  source:review.source, reviewKind:'Automatic main-lemma assignment. No individual scholarly verification or complete morphological analysis.',
  input:{sha256:inputHash.digest('hex'),positions:scanned,consideredUnassigned:considered}, excludedFiles, sourceFiles:source.sourceFiles,
  alignmentAndHebrewFiles:source.provenance, findings, qualified:ready.length, qualifiedNotPublished:ready.length-selected.length,
  selection:'Most source-supported qualified rows first, then native ID. Earlier published assignments and individual review/exclusion records are protected. Earlier automatic pending rows can be reconsidered with this different method.',
  benchmark, alignmentProvenance:'Only one-to-one, edition-bound, review-marked alignments. Review metadata includes AI reviews and is retained per target and witness. This is semantic corroboration, not an independent gold standard.',
  licenses:{originalAnnotationAndText:'CC BY-NC 4.0',hebrewText:'See bundled Westminster/OSHB attribution',generatedAssignments:'CC BY-NC 4.0'},auditSha256:hash(raw)};
 fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,'main-lemma-20000.jsonl.gz'),zlib.gzipSync(raw));
 fs.writeFileSync(path.join(output,'main-lemma-20000-summary.json'),JSON.stringify(summary,null,2)+'\n');
 fs.writeFileSync(path.join(output,'peshitta-main-lemma-review.json'),JSON.stringify(review)+'\n');
 console.log(JSON.stringify({newAssignments:selected.length,qualified:ready.length,benchmark:{tested:benchmark.tested,agreed:benchmark.agreed,disagreements:benchmark.disagreements.length}}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
