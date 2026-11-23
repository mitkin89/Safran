'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), crypto = require('node:crypto');
const A = require('../tools/peshitta/automatic-context.cjs'), N = require('../tools/peshitta/neighbor-evidence.cjs');
const C = require('../concordance'), {norm} = require('../syriac-cards');
const summary = require('../tools/peshitta/neighbor-batch-20000-summary.json');
const review = require('../peshitta-neighbor-review.json');
const raw = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../tools/peshitta/neighbor-batch-20000.jsonl.gz')));
const decisions = raw.toString().trim().split('\n').map(JSON.parse);
let corpus;
const originalCorpus = () => corpus ||= N.prepare(A.loadCorpus());

function fixture(change = refs => refs) {
 const target = {book: 'Target', id: '2', chapter: 1, verse: 1, form: 'ܒܝܬܐ', neighbors: ['ܡܢ', 'ܕܡܪܝܐ'], context: 'ܡܢ ܒܝܬܐ ܕܡܪܝܐ',
  etcbc: [{parts: [{form: 'ܒܝܬܐ', lexeme: 'BJT', pos: 'subs'}]}],
  lexicalEvidence: {dictionaryAgreement: ['389'], candidates: [{lemma: 'ܒܝܬܐ'}]}, ntEvidence: {matches: [{lemma: 'ܒܝܬܐ', pos: 'noun'}]}};
 const refs = change(['A', 'B', 'C', 'D'].flatMap((book, i) => Array.from({length: 3}, (_, j) => ({book, id: String(10 + i * 3 + j), chapter: 1, verse: j + 1, form: target.form,
  main: {form: target.form, lexeme: 'BJT', pos: 'subs'}, neighbors: i < 2 ? [target.neighbors[0], 'ܐܚܪܢܐ'] : ['ܐܚܪܢܐ', target.neighbors[1]]}))));
 const doc = {syriacMorphology: {textHash: 'fixture', words: {'1': [target.neighbors[0], [], 1, 1], '2': [target.form, [], 1, 1], '3': [target.neighbors[1], [], 1, 1]}}};
 return {target, source: N.prepare({docs: new Map([[target.book, doc]]), forms: new Map([[norm(target.form), refs]]), sourceFiles: []})};
}

test('bilateral evidence requires separate book support, adequate form counts and unambiguous source lemmas', () => {
 const good = fixture();
 assert.equal(N.assess(good.source, good.target).accepted, true, 'pair witnesses need not share the whole three-word context');
 const oneSide = fixture(refs => refs.map(r => ({...r, neighbors: [r.neighbors[0], 'ܐܚܪܢܐ']})));
 assert.equal(N.assess(oneSide.source, oneSide.target).reason, 'insufficient-neighbor-support');
 const tooFewBooks = fixture(refs => refs.map(r => ({...r, book: 'A'})));
 assert.equal(N.assess(tooFewBooks.source, tooFewBooks.target).reason, 'insufficient-form-support');
 const homograph = fixture(refs => refs.map((r, i) => i ? r : {...r, main: {...r.main, lexeme: 'BWT', pos: 'verb'}}));
 assert.equal(N.assess(homograph.source, homograph.target).accepted, false);
 const sameBookConflict = fixture(refs => [...refs, {...refs[0], book: 'Target', main: {...refs[0].main, lexeme: 'BWT', pos: 'verb'}}]);
 assert.equal(N.assess(sameBookConflict.source, sameBookConflict.target).reason, 'known-source-form-conflict');
});

test('lexical ambiguity, incompatible NT evidence and verse boundaries block neighbor transfer', () => {
 const {source, target} = fixture();
 assert.equal(N.assess(source, {...target, lexicalEvidence: {...target.lexicalEvidence, dictionaryAgreement: ['389', '390']}}).reason, 'ambiguous-or-missing-lexical-support');
 assert.equal(N.assess(source, {...target, ntEvidence: {matches: [{lemma: 'ܒܝܬܐ', pos: 'verb'}]}}).reason, 'ambiguous-or-incompatible-nt-support');
 source.docs.get('Target').syriacMorphology.words['1'][3] = 2;
 assert.equal(N.assess(source, target).reason, 'missing-within-verse-neighbors');
});

test('all 20000 decisions reproduce from original sources and exclude every earlier audit position', () => {
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'), summary.auditSha256);
 assert.equal(decisions.length, 20000);
 assert.equal(new Set(decisions.map(r => r.id)).size, 20000);
 const previous = new Set([
  ...require('../tools/peshitta/lexical-context-decisions.json').decisions,
  ...require('../tools/peshitta/lexical-context-batch-1000.json').decisions,
  ...zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../tools/peshitta/context-batch-10000.jsonl.gz'))).toString().trim().split('\n').map(JSON.parse),
 ].map(r => r.id));
 for (const b of [require('../peshitta-ruth-lemma-review.json'), require('../peshitta-isaiah-lemma-review.json'),
  ...require('../peshitta-lemma-assignments.json').books, ...require('../peshitta-nt-context-review.json').books,
  ...require('../peshitta-lexical-context-review.json').books, ...require('../peshitta-corpus-dictionary-review.json').books,
  ...require('../peshitta-automatic-context-review.json').books]) for (const r of b.entries) previous.add(r.id);
 const source = originalCorpus();
 assert.deepEqual(source.sourceFiles, summary.sourceFiles);
 for (const row of decisions) {
  assert(!previous.has(row.id), `previously examined ${row.id}`);
  assert.deepEqual(N.assess(source, {...row, etcbc: row.etcbcCandidates}), row, row.id);
 }
 assert.equal(decisions.filter(r => r.accepted).length, 380);
 assert.equal(decisions.filter(r => !r.accepted).length, 19620);
 assert.deepEqual(N.exportReview(decisions), review);
 assert.deepEqual(N.benchmark(source), summary.benchmark);
 assert.equal(summary.benchmark.tested, 8016);
});

test('all 380 neighbor-based assignments resolve at the exact native positions with separate provenance', async () => {
 const source = originalCorpus(), manifest = require('../bundled/manifest.json').items, queries = new Map();
 for (const row of decisions.filter(r => r.accepted)) {
  const chapter = source.docs.get(row.book).text[row.chapter - 1];
  const html = Array.isArray(chapter) ? chapter[row.verse - 1] : chapter[String(row.verse)];
  const spans = C.syriacWordSpans(html, C.tokens(C.textOf(html)));
  assert(spans, row.id);
  const position = spans.findIndex(s => s.id === row.id) + 1;
  assert(position > 0, row.id);
  const key = JSON.stringify([row.book, row.contextLemma]);
  if (!queries.has(key)) {
   const matches = new Map(), entry = manifest.find(e => e.title === row.book && e.versionTitle.startsWith('ETCBC Peshitta'));
   await C.search({dir: path.join(__dirname, '../bundled'), entries: [entry], params: {query: row.contextLemma, lemma: true},
    onOccurrence: hit => matches.set(JSON.stringify([Number(hit.path[0]) + 1, typeof hit.path[1] === 'number' ? hit.path[1] + 1 : Number(hit.path[1]), hit.position]), hit)});
   queries.set(key, matches);
  }
  const hit = queries.get(key).get(JSON.stringify([row.chapter, row.verse, position]));
  assert.equal(hit?.basis, 'lemma', row.id);
  assert.equal(hit.form, row.form, row.id);
  assert.equal(hit.analysisSource, review.source, row.id);
  const refs = [...new Set([...row.evidence.left.sources.slice(0, 2), ...row.evidence.right.sources.slice(0, 2)].map(s => `${s.book} ${s.chapter}:${s.verse}`))];
  assert.equal(hit.analysisReference, refs.join(' · '), row.id);
 }
});
