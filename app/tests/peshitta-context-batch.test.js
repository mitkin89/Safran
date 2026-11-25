'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {execFileSync} = require('node:child_process');
const C = require('../concordance');
const audit = require('../tools/peshitta/lexical-context-batch-1000.json');
const review = require('../peshitta-corpus-dictionary-review.json');
const root = path.resolve(__dirname, '..'), bundle = path.join(root, 'bundled');

test('1000 contextual decisions reproduce the published subset without reusing earlier assignments', t => {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'safran-context-batch-'));
 t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
 const output = path.join(dir, 'review.json');
 const result = execFileSync(process.execPath, ['tools/peshitta/export-context-batch.cjs', 'tools/peshitta/lexical-context-batch-1000.json', output], {cwd: root, encoding: 'utf8'});
 assert.deepEqual(JSON.parse(result), {reviewed: 1000, accepted: 999});
 assert.deepEqual(JSON.parse(fs.readFileSync(output)), review);
 assert.equal(new Set(audit.decisions.map(row => row.id)).size, 1000);
 assert.equal(audit.decisions.filter(row => !row.accepted).length, 1);
});

test('every accepted position resolves under its canonical ETCBC main lemma at the exact native word position', async () => {
 const manifest = require('../bundled/manifest.json').items;
 const queries = new Map(), docs = new Map();
 for (const row of audit.decisions) {
  const entry = manifest.find(e => e.title === row.book && e.versionTitle.startsWith('ETCBC Peshitta'));
  if (!docs.has(row.book)) docs.set(row.book, JSON.parse(fs.readFileSync(path.join(bundle, entry.rel))));
  const doc = docs.get(row.book), chapter = doc.text[row.chapter - 1];
  const html = Array.isArray(chapter) ? chapter[row.verse - 1] : chapter[String(row.verse)];
  const spans = C.syriacWordSpans(html, C.tokens(C.textOf(html)));
  assert(spans, `${row.book} ${row.chapter}:${row.verse}`);
  const position = spans.findIndex(span => span.id === row.id) + 1;
  assert(position > 0, row.id);
  const key = JSON.stringify([row.book, row.contextLemma]);
  if (!queries.has(key)) {
   const matches = new Map();
   const result = await C.search({dir: bundle, entries: [entry], params: {query: row.contextLemma, lemma: true, limit: 10000, perFile: 10000},
    onOccurrence: hit => matches.set(JSON.stringify([Number(hit.path[0]) + 1, typeof hit.path[1] === 'number' ? hit.path[1] + 1 : Number(hit.path[1]), hit.position]), hit)});
   assert.equal(matches.size, result.dist.reduce((n, d) => n + d.o, 0));
   queries.set(key, matches);
  }
  const hit = queries.get(key).get(JSON.stringify([row.chapter, row.verse, position]));
  if (!row.accepted) {
   assert(!hit || hit.analysisSource !== review.source, row.id);
   continue;
  }
  assert.equal(hit?.basis, 'lemma', row.id);
  assert.equal(hit.form, row.form, row.id);
  assert.equal(hit.analysisSource, review.source, row.id);
  assert(hit.analysisReference.startsWith(`SEDRA #${row.corpusDictionaryReview.sedraId} · ETCBC Syriac`));
 }
});
