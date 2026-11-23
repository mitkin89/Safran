'use strict';
const assert = require('node:assert/strict');
const A = require('./automatic-context.cjs'), SY = require('../../syriac-morph'), {norm} = require('../../syriac-cards');
const key = (a, b) => JSON.stringify([norm(a), norm(b)]);
const SOURCE = 'ETCBC Syriac (automatischer Nachbarwortabgleich)';
const compatible = {subs: ['noun'], nmpr: ['noun'], verb: ['verb'], adjv: ['adjective'],
  advb: ['adverb', 'particle'], prep: ['preposition', 'particle'], conj: ['conjunction', 'particle'],
  pron: ['pronoun'], nega: ['particle']};
function prepare(source) {
  const left = new Map(), right = new Map();
  for (const refs of source.forms.values()) for (const ref of refs) {
    if (!ref.neighbors) continue;
    for (const [index, k] of [[left, key(ref.neighbors[0], ref.form)], [right, key(ref.form, ref.neighbors[1])]]) {
      if (!index.has(k)) index.set(k, []);
      index.get(k).push(ref);
    }
  }
  return {...source, left, right, formCache: new Map(), pairCache: new Map()};
}
function describe(refs) {
  const books = [...new Set(refs.map(s => s.book))];
  return {count: refs.length, books, signatures: [...new Set(refs.map(s => A.signature(s.main)))],
    main: refs.find(s => s.main)?.main || null,
    sources: books.slice(0, 4).map(book => refs.find(s => s.book === book))};
}
function formEvidence(source, form, book) {
  const k = JSON.stringify([norm(form), book]);
  if (!source.formCache.has(k)) source.formCache.set(k, describe((source.forms.get(norm(form)) || []).filter(s => s.book !== book)));
  return source.formCache.get(k);
}
function pairEvidence(source, side, k, book) {
  const cacheKey = JSON.stringify([side, k, book]);
  if (!source.pairCache.has(cacheKey)) source.pairCache.set(cacheKey, describe((source[side].get(k) || []).filter(s => s.book !== book)));
  return source.pairCache.get(cacheKey);
}
function judge(source, target) {
  const form = formEvidence(source, target.form, target.book);
  const left = target.neighbors ? pairEvidence(source, 'left', key(target.neighbors[0], target.form), target.book) : describe([]);
  const right = target.neighbors ? pairEvidence(source, 'right', key(target.form, target.neighbors[1]), target.book) : describe([]);
  let reason;
  if (form.signatures.length !== 1 || form.signatures[0] === '?') reason = 'competing-or-missing-form-analyses';
  else if (form.count < 12 || form.books.length < 4) reason = 'insufficient-form-support';
  else if (!target.neighbors) reason = 'missing-within-verse-neighbors';
  else if (left.books.length < 2 || right.books.length < 2) reason = 'insufficient-neighbor-support';
  else if ([left, right].some(side => side.signatures.length !== 1 || side.signatures[0] !== form.signatures[0])) reason = 'competing-neighbor-analyses';
  else reason = 'consistent-bilateral-neighbors';
  return {reason, form, left, right};
}
function assess(source, row) {
  const m = source.docs.get(row.book).syriacMorphology, w = m.words[row.id];
  assert.deepEqual([w[0], w[2], w[3]], [row.form, row.chapter, row.verse]);
  assert.equal(w[1].length, 0, `existing source analysis ${row.id}`);
  const l = m.words[Number(row.id) - 1], r = m.words[Number(row.id) + 1];
  const neighbors = l && r && [l, r].every(n => n[2] === w[2] && n[3] === w[3]) ? [l[0], r[0]] : null;
  const evidence = judge(source, {...row, neighbors});
  const lexical = row.lexicalEvidence || {}, nt = row.ntEvidence?.matches || [];
  let reason = evidence.reason;
  if (reason === 'consistent-bilateral-neighbors' && new Set((source.forms.get(norm(row.form)) || []).map(s => A.signature(s.main))).size !== 1) reason = 'known-source-form-conflict';
  if (reason === 'consistent-bilateral-neighbors' && !(row.etcbc || []).some(c => A.signature(A.mainPart(c.parts)) === evidence.form.signatures[0])) reason = 'not-an-existing-corpus-candidate';
  if (reason === 'consistent-bilateral-neighbors' && (lexical.dictionaryAgreement?.length !== 1 || lexical.candidates?.length !== 1)) reason = 'ambiguous-or-missing-lexical-support';
  if (reason === 'consistent-bilateral-neighbors' && (nt.length !== 1 || norm(nt[0].lemma) !== lexical.candidates[0].lemma || !compatible[evidence.form.main.pos]?.includes(nt[0].pos))) reason = 'ambiguous-or-incompatible-nt-support';
  const accepted = reason === 'consistent-bilateral-neighbors';
  return {book: row.book, id: row.id, form: row.form, chapter: row.chapter, verse: row.verse, textHash: m.textHash,
    context: row.context, neighbors, accepted, reason, evidence,
    etcbcCandidates: row.etcbc || [], lexicalEvidence: lexical, ntEvidence: row.ntEvidence || null,
    ...(accepted ? {contextLemma: SY.lemma(evidence.form.main.lexeme)} : {})};
}
function benchmark(source) {
  const result = {method: 'Leave a whole original annotated book out of form and both pair-context indexes. This tests the structural rule before the additional lexical/NT and known-conflict gates.', tested: 0, agreed: 0, disagreements: []};
  for (const refs of source.forms.values()) for (const target of refs) {
    if (!target.main) continue;
    const predicted = judge(source, target);
    if (predicted.reason !== 'consistent-bilateral-neighbors') continue;
    result.tested++;
    if (A.signature(target.main) === A.signature(predicted.form.main)) result.agreed++;
    else result.disagreements.push({book: target.book, id: target.id, chapter: target.chapter, verse: target.verse,
      form: target.form, neighbors: target.neighbors, expected: target.main, predicted: predicted.form.main,
      left: predicted.left.sources.slice(0, 2), right: predicted.right.sources.slice(0, 2)});
  }
  return result;
}
function exportReview(decisions) {
  const books = new Map();
  const ref = s => ({book: s.book, ref: `${s.chapter}:${s.verse}`, id: s.id});
  for (const row of decisions.filter(r => r.accepted)) {
    if (!books.has(row.book)) books.set(row.book, {book: row.book, textHash: row.textHash, entries: []});
    books.get(row.book).entries.push({id: row.id, form: row.form, chapter: row.chapter, verse: row.verse,
      contextLemma: row.contextLemma,
      neighborSources: {left: row.evidence.left.sources.slice(0, 2).map(ref), right: row.evidence.right.sources.slice(0, 2).map(ref)},
      note: 'Automatic main-lemma transfer. Each adjacent word pair is independently supported by two other original annotated books. All other-book form analyses agree across at least twelve occurrences in four books. Unique SEDRA/UniMorph and compatible NT lexical evidence corroborate spelling. This is not an individual linguistic review or a full morphology assignment.'});
  }
  return {version: 1, source: SOURCE, method: 'bilateral-neighbor-pairs-two-other-books-form-12-occurrences-four-books-lexical-nt', license: 'CC BY-NC 4.0', books: [...books.values()]};
}
module.exports = {prepare, judge, assess, benchmark, exportReview};
