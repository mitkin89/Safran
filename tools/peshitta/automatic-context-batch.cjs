'use strict';
// node tools/peshitta/automatic-context-batch.cjs lexical-evidence.jsonl output-directory [count]
const fs = require('node:fs'), path = require('node:path'), readline = require('node:readline');
const crypto = require('node:crypto'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const A = require('./automatic-context.cjs');
async function run() {
  const [input, output, size = '10000'] = process.argv.slice(2), count = Number(size);
  assert(input && output && Number.isSafeInteger(count) && count > 0);
  const excluded = new Set(), excludedFiles = [];
  for (const name of ['lexical-context-decisions.json', 'lexical-context-batch-1000.json']) {
    const raw = fs.readFileSync(path.join(__dirname, name));
    excludedFiles.push({name, sha256: crypto.createHash('sha256').update(raw).digest('hex')});
    for (const row of JSON.parse(raw).decisions) excluded.add(row.id);
  }
  for (const name of ['peshitta-ruth-lemma-review.json', 'peshitta-isaiah-lemma-review.json',
    'peshitta-lemma-assignments.json', 'peshitta-nt-context-review.json',
    'peshitta-lexical-context-review.json', 'peshitta-corpus-dictionary-review.json']) {
    const raw = fs.readFileSync(path.join(__dirname, '../..', name)), data = JSON.parse(raw);
    excludedFiles.push({name, sha256: crypto.createHash('sha256').update(raw).digest('hex')});
    for (const book of data.books || [data]) for (const row of book.entries) excluded.add(row.id);
  }
  const corpus = A.loadCorpus(), buckets = new Map(), poolFindings = {}, seen = new Set();
  const hash = crypto.createHash('sha256'), inputStream = fs.createReadStream(input);
  inputStream.on('data', bytes => hash.update(bytes));
  let scanned = 0, pool = 0;
  for await (const line of readline.createInterface({input: inputStream, crlfDelay: Infinity})) {
    if (!line) continue;
    const row = JSON.parse(line);
    assert(!seen.has(row.id), `duplicate input ${row.id}`); seen.add(row.id); scanned++;
    if (excluded.has(row.id)) continue;
    pool++;
    const decision = A.assess(corpus, row);
    poolFindings[decision.reason] = (poolFindings[decision.reason] || 0) + 1;
    if (!buckets.has(decision.reason)) buckets.set(decision.reason, []);
    const bucket = buckets.get(decision.reason);
    if (bucket.length < count) bucket.push(decision);
  }
  const priority = ['consistent-context-and-form', 'competing-form-analyses', 'known-source-form-conflict', 'competing-context-analyses',
    'no-lexical-spelling-corroboration', 'not-an-existing-corpus-candidate', 'only-one-source-book', 'no-annotated-three-word-context'];
  assert([...buckets.keys()].every(k => priority.includes(k)));
  const decisions = priority.flatMap(reason => buckets.get(reason) || []).slice(0, count);
  assert.equal(decisions.length, count);
  const audit = decisions.map(row => JSON.stringify(row)).join('\n') + '\n';
  const result = A.exportReview(decisions), benchmark = A.benchmark(corpus);
  const summary = {version: 1, batch: 'additional-10000-001', method: result.method,
    reviewKind: 'Automatic source-evidence checks. No individual linguistic review of these 10000 positions.',
    selection: 'Exclude all prior review records, including unresolved and explicitly excluded entries, plus the prior 121 and 1000 decisions. Prioritize strong multi-book contexts, conflicting contexts, then single-book contexts and remaining positions in source order.',
    input: {sha256: hash.digest('hex'), positions: scanned, unreviewedPool: pool}, excludedFiles,
    examined: decisions.length, accepted: decisions.filter(r => r.accepted).length,
    pending: decisions.filter(r => !r.accepted).length,
    findings: Object.fromEntries(priority.map(k => [k, decisions.filter(r => r.reason === k).length]).filter(([,n]) => n)),
    sourcePoolFindings: poolFindings, benchmark, sourceFiles: corpus.sourceFiles,
    dictionaryEvidence: 'UniMorph and SEDRA corroborate normalized spelling only. Shared SEDRA provenance is not independent semantic verification. Context transfer uses original ETCBC annotation, never earlier transfers.',
    licenses: {textAndOriginalAnnotation: 'CC BY-NC 4.0', copiedUniMorphEvidence: 'CC BY-SA 3.0', automaticAssignments: 'CC BY-NC 4.0'},
    auditSha256: crypto.createHash('sha256').update(audit).digest('hex')};
  fs.mkdirSync(output, {recursive: true});
  fs.writeFileSync(path.join(output, 'context-batch-10000.jsonl.gz'), zlib.gzipSync(audit));
  fs.writeFileSync(path.join(output, 'context-batch-10000-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'peshitta-automatic-context-review.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({examined: summary.examined, accepted: summary.accepted, pending: summary.pending,
    benchmark: {tested: benchmark.tested, agreed: benchmark.agreed, disagreements: benchmark.disagreements.length}}));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
