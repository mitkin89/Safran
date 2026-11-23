'use strict';

// Offline evaluation. Candidates are exported separately from the reader's morphology.
// Run with: node tools/peshitta/lemma-pilot.cjs Ruth > ruth-lemma-pilot.json
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {runInNewContext} = require('node:vm');
const {create, norm} = require('../../syriac-cards');
const {items} = require('../../bundled/manifest.json');

const title = process.argv[2] || 'Ruth';
const bundle = path.join(__dirname, '../../bundled');
const books = items
  .filter(item => item.language === 'Syriac' && item.versionTitle.startsWith('ETCBC Peshitta'))
  .map(item => {
    const doc = JSON.parse(readFileSync(path.join(bundle, item.rel), 'utf8'));
    const {fields, analyses, words, textHash} = doc.syriacMorphology;
    assert.equal(createHash('sha256').update(JSON.stringify(doc.text)).digest('hex'), textHash, item.title);
    const signatures = analyses.map(row => Object.fromEntries(
      ['form', 'lex', 'sp'].map(field => [field, row[fields.indexOf(field)]])
    ));
    return {
      title: item.title,
      textHash,
      words: Object.entries(words).map(([id, [form, parts, chapter, verse]]) => ({
        id, form, chapter, verse,
        signature: parts.length && JSON.stringify(parts.map(index => {
          const part = signatures[index];
          return [norm(part.form), part.lex, part.sp];
        }))
      }))
    };
  });
const target = books.find(book => book.title === title);
assert(target, 'Peshitta book not found: ' + title);

// Keep book-level provenance so a whole book can be excluded from evaluation.
const index = new Map();
for (const book of books) {
  for (const word of book.words) {
    if (!word.signature) continue;
    const form = norm(word.form);
    if (!index.has(form)) index.set(form, new Map());
    const candidates = index.get(form);
    if (!candidates.has(word.signature)) candidates.set(word.signature, new Set());
    candidates.get(word.signature).add(book.title);
  }
}

function candidatesFor(form, excludedBook) {
  return [...(index.get(norm(form)) || [])]
    .map(([signature, seenIn]) => [signature, [...seenIn].filter(book => book !== excludedBook)])
    .filter(([, seenIn]) => seenIn.length);
}

const benchmark = [];
for (const book of books) {
  const result = {book: book.title, annotated: 0, unique: 0, uniqueCorrect: 0, twoBooks: 0, twoBooksCorrect: 0};
  for (const word of book.words) {
    if (!word.signature) continue;
    result.annotated++;
    const candidates = candidatesFor(word.form, book.title);
    if (candidates.length !== 1) continue;
    const [[signature, seenIn]] = candidates;
    result.unique++;
    const correct = signature === word.signature;
    result.uniqueCorrect += Number(correct);
    if (seenIn.length >= 2) {
      result.twoBooks++;
      result.twoBooksCorrect += Number(correct);
    }
  }
  if (result.annotated) benchmark.push(result);
}

const context = {window: {}};
runInNewContext(readFileSync(path.join(__dirname, '../../sedra-data.js'), 'utf8'), context);
const sedraData = context.window.SEDRA_DATA;
const sedra = create(sedraData);
const predictions = target.words.map(({signature, ...word}) => ({
  ...word,
  etcbc: candidatesFor(word.form, title).map(([candidate, seenIn]) => ({
    parts: JSON.parse(candidate).map(([form, lexeme, pos]) => ({form, lexeme, pos})),
    seenIn
  })),
  sedra: sedra.lookup(word.form)
}));
const usedSedraIds = new Set(predictions.flatMap(word => word.sedra));
const sedraEntries = Object.fromEntries([...usedSedraIds].map(id => {
  const lexeme = sedraData.lexemes[id];
  const gloss = lexeme.meanings.find(([, language]) => language === 'English')?.[0] ?? null;
  return [id, {headword: lexeme.vocal || lexeme.form, category: lexeme.category, gloss}];
}));

process.stdout.write(JSON.stringify({
  status: 'Experimental spelling-based candidates, not occurrence annotations',
  source: {etcbc: 'ETCBC Syriac Corpus 0.92', sedra: sedraData.source, license: 'CC BY-NC 4.0'},
  book: title,
  textHash: target.textHash,
  benchmark,
  words: predictions,
  sedraEntries
}, null, 2) + '\n');
