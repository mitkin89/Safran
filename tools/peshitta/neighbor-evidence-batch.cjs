'use strict';
// node tools/peshitta/neighbor-evidence-batch.cjs lexical-evidence.jsonl output-directory [count]
const fs = require('node:fs'), path = require('node:path'), readline = require('node:readline');
const crypto = require('node:crypto'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const A = require('./automatic-context.cjs'), N = require('./neighbor-evidence.cjs');
const root = path.resolve(__dirname, '../..');
async function run() {
  const [input, output, size = '20000'] = process.argv.slice(2), count = Number(size);
  assert(input && output && Number.isSafeInteger(count) && count > 0);
  const excluded = new Set(), excludedFiles = [];
  function read(name) {
    const raw = fs.readFileSync(path.join(root, name));
    excludedFiles.push({name, sha256: crypto.createHash('sha256').update(raw).digest('hex')});
    return raw;
  }
  for (const name of ['tools/peshitta/lexical-context-decisions.json', 'tools/peshitta/lexical-context-batch-1000.json']) {
    for (const row of JSON.parse(read(name)).decisions) excluded.add(row.id);
  }
  for (const name of ['peshitta-ruth-lemma-review.json', 'peshitta-isaiah-lemma-review.json', 'peshitta-lemma-assignments.json',
    'peshitta-nt-context-review.json', 'peshitta-lexical-context-review.json', 'peshitta-corpus-dictionary-review.json',
    'peshitta-automatic-context-review.json']) {
    const data = JSON.parse(read(name));
    for (const book of data.books || [data]) for (const row of book.entries) excluded.add(row.id);
  }
  const priorRaw = zlib.gunzipSync(read('tools/peshitta/context-batch-10000.jsonl.gz'));
  assert.equal(crypto.createHash('sha256').update(priorRaw).digest('hex'), require('./context-batch-10000-summary.json').auditSha256);
  for (const line of priorRaw.toString().trim().split('\n')) excluded.add(JSON.parse(line).id);
  const source = N.prepare(A.loadCorpus()), buckets = new Map(), poolFindings = {}, seen = new Set();
  const hash = crypto.createHash('sha256'), stream = fs.createReadStream(input);
  stream.on('data', bytes => hash.update(bytes));
  let scanned = 0, pool = 0;
  for await (const line of readline.createInterface({input: stream, crlfDelay: Infinity})) {
    if (!line) continue;
    const row = JSON.parse(line);
    assert(!seen.has(row.id), `duplicate input ${row.id}`); seen.add(row.id); scanned++;
    if (excluded.has(row.id)) continue;
    pool++;
    const decision = N.assess(source, row);
    poolFindings[decision.reason] = (poolFindings[decision.reason] || 0) + 1;
    if (!buckets.has(decision.reason)) buckets.set(decision.reason, []);
    if (buckets.get(decision.reason).length < count) buckets.get(decision.reason).push(decision);
  }
  const priority = ['consistent-bilateral-neighbors', 'known-source-form-conflict', 'not-an-existing-corpus-candidate',
    'ambiguous-or-incompatible-nt-support', 'ambiguous-or-missing-lexical-support', 'competing-neighbor-analyses',
    'insufficient-neighbor-support', 'insufficient-form-support', 'competing-or-missing-form-analyses', 'missing-within-verse-neighbors'];
  assert([...buckets.keys()].every(k => priority.includes(k)));
  const decisions = priority.flatMap(reason => buckets.get(reason) || []).slice(0, count);
  assert.equal(decisions.length, count);
  const raw = decisions.map(r => JSON.stringify(r)).join('\n') + '\n';
  const review = N.exportReview(decisions), benchmark = N.benchmark(source);
  const summary = {version: 1, batch: 'additional-20000-001', method: review.method,
    reviewKind: 'Automatic bilateral neighbor/source evidence checks, not individual linguistic review.',
    selection: 'All previous reviews and the complete previous 10000-position audit are excluded. Prioritize qualified bilateral contexts, then evidential gaps, in original source order.',
    input: {sha256: hash.digest('hex'), positions: scanned, unreviewedPool: pool}, excludedFiles,
    examined: decisions.length, accepted: decisions.filter(r => r.accepted).length, pending: decisions.filter(r => !r.accepted).length,
    findings: Object.fromEntries(priority.map(k => [k, decisions.filter(r => r.reason === k).length]).filter(([,n]) => n)),
    sourcePoolFindings: poolFindings, benchmark, sourceFiles: source.sourceFiles,
    dictionaryEvidence: 'SEDRA, UniMorph and the SEDRA-derived NT lexicon share lexical provenance. Their agreement corroborates spelling and broad part of speech, not independently verified contextual meaning. Only original embedded ETCBC annotation supplies transferred main lemmas.',
    licenses: {textAndOriginalAnnotation: 'CC BY-NC 4.0', copiedUniMorphEvidence: 'CC BY-SA 3.0', ntEvidence: 'MIT', automaticAssignments: 'CC BY-NC 4.0'},
    auditSha256: crypto.createHash('sha256').update(raw).digest('hex')};
  fs.mkdirSync(output, {recursive: true});
  fs.writeFileSync(path.join(output, 'neighbor-batch-20000.jsonl.gz'), zlib.gzipSync(raw));
  fs.writeFileSync(path.join(output, 'neighbor-batch-20000-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'peshitta-neighbor-review.json'), JSON.stringify(review, null, 2) + '\n');
  console.log(JSON.stringify({examined: summary.examined, accepted: summary.accepted, pending: summary.pending,
    benchmark: {tested: benchmark.tested, agreed: benchmark.agreed, disagreements: benchmark.disagreements.length}}));
}
run().catch(error => {console.error(error); process.exitCode = 1;});
