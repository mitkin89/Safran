'use strict';

// Export explicit contextual decisions only. This command does not approve candidates.
// node tools/peshitta/export-context-batch.cjs audit.json output.json
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const SY = require('../../syriac-morph');
const {norm} = require('../../syriac-cards');
const root = path.resolve(__dirname, '../..');
const [input, output] = process.argv.slice(2);
assert(input && output, 'audit and output paths required');
const audit = JSON.parse(fs.readFileSync(input));
const manifest = require('../../bundled/manifest.json').items;
const docs = new Map();
function edition(book) {
  if (!docs.has(book)) {
    const entry = manifest.find(e => e.title === book && e.versionTitle.startsWith('ETCBC Peshitta'));
    assert(entry, book);
    const doc = JSON.parse(fs.readFileSync(path.join(root, 'bundled', entry.rel)));
    assert.equal(crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex'), doc.syriacMorphology.textHash);
    docs.set(book, doc);
  }
  return docs.get(book);
}
const previous = [
  require('../../peshitta-ruth-lemma-review.json'), require('../../peshitta-isaiah-lemma-review.json'),
  ...require('../../peshitta-lemma-assignments.json').books,
  ...require('../../peshitta-nt-context-review.json').books,
  ...require('../../peshitta-lexical-context-review.json').books,
];
const published = new Set(previous.flatMap(b => b.entries.map(row => row.id)));
const seen = new Set(), books = new Map();
for (const row of audit.decisions) {
  assert.equal(typeof row.accepted, 'boolean');
  assert(row.note && row.context);
  assert(!seen.has(row.id), `duplicate position ${row.id}`);
  assert(!published.has(row.id), `already assigned ${row.id}`);
  seen.add(row.id);
  const doc = edition(row.book), word = doc.syriacMorphology.words[row.id];
  assert.equal(row.textHash, doc.syriacMorphology.textHash);
  assert.deepEqual([word[0], word[2], word[3]], [row.form, row.chapter, row.verse]);
  assert.equal(word[1].length, 0, `embedded analysis at ${row.id}`);
  if (!row.accepted) continue;
  const evidence = row.corpusDictionaryReview;
  assert.equal(row.contextLemma, SY.lemma(evidence.lexeme));
  assert(row.lexicalEvidence.dictionaryAgreement.includes(evidence.sedraId));
  assert(row.etcbcCandidates.some(c => c.parts.some(p => p.lexeme === evidence.lexeme && p.pos === 'subs')));
  assert(new Set(evidence.sources.map(s => s.book)).size >= 2);
  for (const source of evidence.sources) {
    const sourceDoc = edition(source.book), morphology = sourceDoc.syriacMorphology;
    assert.equal(source.textHash, morphology.textHash);
    const sourceWord = morphology.words[source.id];
    assert.equal(norm(sourceWord[0]), norm(row.form));
    assert.deepEqual(sourceWord.slice(2, 4), [source.chapter, source.verse]);
    assert(sourceWord[1].some(index => {
      const analysis = Object.fromEntries(morphology.fields.map((field, i) => [field, morphology.analyses[index][i]]));
      return analysis.lex === evidence.lexeme && analysis.sp === 'subs';
    }));
  }
  if (!books.has(row.book)) books.set(row.book, {book: row.book, textHash: row.textHash, entries: []});
  const {id, form, chapter, verse, contextLemma, corpusDictionaryReview, note} = row;
  books.get(row.book).entries.push({id, form, chapter, verse, contextLemma, corpusDictionaryReview, note});
}
fs.writeFileSync(output, JSON.stringify({
  version: 1, source: audit.source, batch: audit.batch, license: 'CC BY-NC 4.0',
  method: audit.method, books: [...books.values()],
}, null, 2) + '\n');
console.log(JSON.stringify({reviewed: seen.size, accepted: [...books.values()].reduce((n, b) => n + b.entries.length, 0)}));
