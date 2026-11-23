'use strict';

// Original embedded annotation is the only source of transferred lemmas.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const SY = require('../../syriac-morph'), {norm} = require('../../syriac-cards');
const root = path.resolve(__dirname, '../..');
const SOURCE = 'ETCBC Syriac (automatischer Kontextabgleich)';
function mainPart(parts) {
  const content = parts.filter(p => ['subs', 'verb', 'adjv', 'advb', 'nmpr', 'nega'].includes(p.pos));
  if (content.length === 1) return content[0];
  if (content.length > 1) return null;
  const remaining = parts.filter(p => !['conj', 'pron'].includes(p.pos));
  return remaining.length === 1 ? remaining[0] : parts.length === 1 ? parts[0] : null;
}
const signature = p => p ? JSON.stringify([p.lexeme, p.pos]) : '?';
const contextKey = (left, form, right) => JSON.stringify([norm(left), norm(form), norm(right)]);
function loadCorpus() {
  const docs = new Map(), forms = new Map(), contexts = new Map(), sourceFiles = [];
  for (const entry of require('../../bundled/manifest.json').items.filter(e => e.versionTitle.startsWith('ETCBC Peshitta'))) {
    const raw = fs.readFileSync(path.join(root, 'bundled', entry.rel)), d = JSON.parse(raw), m = d.syriacMorphology;
    const textHash = crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex');
    assert.equal(textHash, m.textHash, entry.title);
    sourceFiles.push({book: entry.title, rel: entry.rel, textHash, sha256: crypto.createHash('sha256').update(raw).digest('hex')});
    docs.set(entry.title, d);
    for (const [id, w] of Object.entries(m.words)) {
      if (!w[1].length) continue;
      const parts = w[1].map(i => {
        const p = Object.fromEntries(m.fields.map((f, j) => [f, m.analyses[i][j]]));
        return {form: p.form, lexeme: p.lex, pos: p.sp};
      });
      const main = mainPart(parts);
      const ref = {book: entry.title, id, chapter: w[2], verse: w[3], form: w[0], main, textHash};
      const form = norm(w[0]);
      if (!forms.has(form)) forms.set(form, []);
      forms.get(form).push(ref);
      const left = m.words[Number(id) - 1], right = m.words[Number(id) + 1];
      if (!left || !right || [left, right].some(n => n[2] !== w[2] || n[3] !== w[3])) continue;
      ref.neighbors = [left[0], right[0]];
      const key = contextKey(left[0], w[0], right[0]);
      if (!contexts.has(key)) contexts.set(key, []);
      contexts.get(key).push(ref);
    }
  }
  return {docs, forms, contexts, sourceFiles};
}
function judge(source, target) {
  const otherForms = (source.forms.get(norm(target.form)) || []).filter(s => s.book !== target.book);
  const formSignatures = [...new Set(otherForms.map(s => signature(s.main)))];
  const matches = target.neighbors ? (source.contexts.get(contextKey(target.neighbors[0], target.form, target.neighbors[1])) || []).filter(s => s.book !== target.book) : [];
  const contextSignatures = [...new Set(matches.map(s => signature(s.main)))];
  const books = [...new Set(matches.map(s => s.book))];
  let reason = !matches.length ? 'no-annotated-three-word-context' : contextSignatures.length !== 1 || contextSignatures[0] === '?' ? 'competing-context-analyses' : books.length < 2 ? 'only-one-source-book' : formSignatures.length !== 1 || formSignatures[0] !== contextSignatures[0] ? 'competing-form-analyses' : 'consistent-context-and-form';
  const first = matches.find(s => s.main)?.main;
  return {reason, main: first || null, sourceBooks: books, contextOccurrences: matches.length,
    formSignatures, formOccurrences: otherForms.length,
    sources: books.slice(0, 2).map(book => matches.find(s => s.book === book))};
}
function assess(source, row) {
  const doc = source.docs.get(row.book), m = doc.syriacMorphology, w = m.words[row.id];
  assert.deepEqual([w[0], w[2], w[3]], [row.form, row.chapter, row.verse]);
  assert.equal(w[1].length, 0, `existing embedded annotation at ${row.id}`);
  const l = m.words[Number(row.id) - 1], r = m.words[Number(row.id) + 1];
  const neighbors = l && r && [l, r].every(n => n[2] === w[2] && n[3] === w[3]) ? [l[0], r[0]] : null;
  const finding = judge(source, {...row, neighbors});
  const dictionary = row.lexicalEvidence?.dictionaryAgreement || [];
  const candidate = (row.etcbc || []).some(c => signature(mainPart(c.parts)) === signature(finding.main));
  const allFormSignatures = [...new Set((source.forms.get(norm(row.form)) || []).map(s => signature(s.main)))];
  let reason = finding.reason;
  if (reason === 'consistent-context-and-form' && allFormSignatures.length !== 1) reason = 'known-source-form-conflict';
  if (reason === 'consistent-context-and-form' && !dictionary.length) reason = 'no-lexical-spelling-corroboration';
  if (reason === 'consistent-context-and-form' && !candidate) reason = 'not-an-existing-corpus-candidate';
  const accepted = reason === 'consistent-context-and-form';
  return {book: row.book, id: row.id, form: row.form, chapter: row.chapter, verse: row.verse,
    textHash: m.textHash, context: row.context, neighbors, accepted, reason, etcbcCandidates: row.etcbc || [],
    ...(finding.main ? {proposedMain: finding.main} : {}),
    evidence: {sourceBooks: finding.sourceBooks, contextOccurrences: finding.contextOccurrences,
      formOccurrences: finding.formOccurrences, formSignatures: finding.formSignatures, allFormSignatures, sources: finding.sources,
      dictionaryAgreement: dictionary, lexicalCandidates: row.lexicalEvidence?.candidates || []},
    ...(accepted ? {contextLemma: SY.lemma(finding.main.lexeme)} : {})};
}
function benchmark(source) {
  const result = {method: 'Leave one complete annotated book out of both context and form evidence. Benchmark tests the structural rule before the additional lexical and candidate gates.', tested: 0, agreed: 0, disagreements: []};
  for (const refs of source.contexts.values()) for (const target of refs) {
    if (!target.main) continue;
    const predicted = judge(source, target);
    if (predicted.reason !== 'consistent-context-and-form') continue;
    result.tested++;
    if (signature(predicted.main) === signature(target.main)) result.agreed++;
    else result.disagreements.push({book: target.book, id: target.id, chapter: target.chapter, verse: target.verse,
      form: target.form, neighbors: target.neighbors, expected: target.main, predicted: predicted.main, sources: predicted.sources});
  }
  return result;
}
function exportReview(decisions) {
  const books = new Map();
  for (const row of decisions.filter(row => row.accepted)) {
    if (!books.has(row.book)) books.set(row.book, {book: row.book, textHash: row.textHash, entries: []});
    books.get(row.book).entries.push({id: row.id, form: row.form, chapter: row.chapter, verse: row.verse,
      contextLemma: row.contextLemma, contextualSources: row.evidence.sources.map(s => ({book: s.book, ref: `${s.chapter}:${s.verse}`, id: s.id})),
      note: 'Automatic main-lemma transfer from identical normalized three-word contexts in two other annotated books, with unanimous other-book form analyses and lexical spelling evidence. No individual contextual review or full morphology assignment.'});
  }
  return {version: 1, source: SOURCE, method: 'automatic-three-word-context-two-other-books-unanimous-form',
    license: 'CC BY-NC 4.0', books: [...books.values()]};
}
module.exports = {loadCorpus, judge, assess, benchmark, exportReview, mainPart, signature};
