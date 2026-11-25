'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), crypto = require('node:crypto');
const A = require('../tools/peshitta/automatic-context.cjs'), C = require('../concordance');
const {norm} = require('../syriac-cards');
const summary = require('../tools/peshitta/context-batch-10000-summary.json');
const review = require('../peshitta-automatic-context-review.json');
const raw = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../tools/peshitta/context-batch-10000.jsonl.gz')));
const decisions = raw.toString().trim().split('\n').map(JSON.parse);
let corpus;
const originalCorpus = () => corpus ||= A.loadCorpus();

test('automatic context transfer requires two other books and rejects homographs', () => {
 const target = {book: 'Target', form: 'ܒܝܬܐ', neighbors: ['ܡܢ', 'ܕܡܪܝܐ']};
 const main = {form: 'ܒܝܬܐ', lexeme: 'BJT', pos: 'subs'};
 const refs = ['A', 'B'].map((book, i) => ({...target, book, id: String(i + 10), main}));
 const key = JSON.stringify([target.neighbors[0], target.form, target.neighbors[1]].map(norm));
 const source = {forms: new Map([[norm(target.form), refs]]), contexts: new Map([[key, refs]])};
 assert.equal(A.judge(source, target).reason, 'consistent-context-and-form');
 source.contexts.set(key, [{...refs[0]}, {...refs[0], id: '99'}]);
 assert.equal(A.judge(source, target).reason, 'only-one-source-book');
 source.contexts.set(key, refs);
 source.forms.set(norm(target.form), [...refs, {...refs[0], book: 'C', main: {...main, lexeme: 'BWT', pos: 'verb'}}]);
 assert.equal(A.judge(source, target).reason, 'competing-form-analyses');
 source.contexts.set(key, [refs[0], {...refs[1], main: {...main, lexeme: 'BWT', pos: 'verb'}}]);
 assert.equal(A.judge(source, target).reason, 'competing-context-analyses');
 assert.equal(A.judge(source, {...target, neighbors: null}).reason, 'no-annotated-three-word-context');
 source.contexts.set(key, refs);
 source.forms.set(norm(target.form), [...refs, {...refs[0], book: target.book, main: {...main, lexeme: 'BWT', pos: 'verb'}}]);
 source.docs = new Map([[target.book, {syriacMorphology: {textHash: 'fixture', words: {
  '1': [target.neighbors[0], [], 1, 1], '2': [target.form, [], 1, 1], '3': [target.neighbors[1], [], 1, 1],
 }}}]]);
 const checked = A.assess(source, {...target, id: '2', chapter: 1, verse: 1, context: 'fixture',
  etcbc: [{parts: [main]}], lexicalEvidence: {dictionaryAgreement: ['389'], candidates: []}});
 assert.equal(checked.reason, 'known-source-form-conflict');
 assert.equal(checked.accepted, false);
});

test('the 10000-position audit reproduces all decisions from original source annotation', () => {
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'), summary.auditSha256);
 assert.equal(decisions.length, 10000);
 assert.equal(new Set(decisions.map(r => r.id)).size, 10000);
 const previous = new Set([
  ...require('../tools/peshitta/lexical-context-decisions.json').decisions,
  ...require('../tools/peshitta/lexical-context-batch-1000.json').decisions,
 ].map(r => r.id));
 for (const book of [require('../peshitta-ruth-lemma-review.json'), require('../peshitta-isaiah-lemma-review.json'),
  ...require('../peshitta-lemma-assignments.json').books, ...require('../peshitta-nt-context-review.json').books,
  ...require('../peshitta-lexical-context-review.json').books, ...require('../peshitta-corpus-dictionary-review.json').books]) {
  for (const row of book.entries) previous.add(row.id);
 }
 const source = originalCorpus();
 assert.deepEqual(source.sourceFiles, summary.sourceFiles);
 for (const row of decisions) {
  assert(!previous.has(row.id), `already reviewed ${row.id}`);
  const repeated = A.assess(source, {...row, etcbc: row.etcbcCandidates, lexicalEvidence: {
   dictionaryAgreement: row.evidence.dictionaryAgreement, candidates: row.evidence.lexicalCandidates,
  }});
  assert.deepEqual(repeated, row, row.id);
 }
 assert.equal(decisions.filter(r => r.accepted).length, 490);
 assert.equal(decisions.filter(r => !r.accepted).length, 9510);
 assert.deepEqual(A.exportReview(decisions), review);
 assert.deepEqual(A.benchmark(source), summary.benchmark);
 assert.equal(summary.benchmark.disagreements.length, 1, 'preserve the actual nonzero holdout disagreement');
});

test('all 490 automatic assignments resolve at their native positions with automatic provenance', async () => {
 const source = originalCorpus(), manifest = require('../bundled/manifest.json').items;
 const queries = new Map();
 for (const row of decisions.filter(r => r.accepted)) {
  const doc = source.docs.get(row.book), chapter = doc.text[row.chapter - 1];
  const html = Array.isArray(chapter) ? chapter[row.verse - 1] : chapter[String(row.verse)];
  const spans = C.syriacWordSpans(html, C.tokens(C.textOf(html)));
  assert(spans, row.id);
  const position = spans.findIndex(s => s.id === row.id) + 1;
  assert(position > 0, row.id);
  const key = JSON.stringify([row.book, row.contextLemma]);
  if (!queries.has(key)) {
   const matches = new Map();
   const entry = manifest.find(e => e.title === row.book && e.versionTitle.startsWith('ETCBC Peshitta'));
   await C.search({dir: path.join(__dirname, '../bundled'), entries: [entry], params: {query: row.contextLemma, lemma: true},
    onOccurrence: hit => matches.set(JSON.stringify([Number(hit.path[0]) + 1, typeof hit.path[1] === 'number' ? hit.path[1] + 1 : Number(hit.path[1]), hit.position]), hit)});
   queries.set(key, matches);
  }
  const hit = queries.get(key).get(JSON.stringify([row.chapter, row.verse, position]));
  assert.equal(hit?.basis, 'lemma', row.id);
  assert.equal(hit.form, row.form, row.id);
  assert.equal(hit.analysisSource, review.source, row.id);
  assert.equal(hit.analysisReference, row.evidence.sources.map(s => `${s.book} ${s.chapter}:${s.verse}`).join(' · '), row.id);
 }
});
