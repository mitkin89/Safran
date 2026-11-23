'use strict';

// Compare the current open OT positions with a pinned UniMorph file and SEDRA release.
// node tools/peshitta/lexical-evidence.cjs source-directory combined-evidence.jsonl output-directory
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {norm, create} = require('../../syriac-cards');
const [sourceDir, inputFile, outputDir] = process.argv.slice(2);
assert(sourceDir && inputFile && outputDir);
const metadata = require('./lexical-source.json');
const bytes = fs.readFileSync(path.join(sourceDir, 'unimorph-syc.tsv'));
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), metadata.unimorph.sha256);
const latest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'sedra-latest.json')));
assert.equal(latest.generated_at, metadata.sedra.generated_at);
const old = require('../sedra/source.json');
const comparedTables = [];
for (const table of latest.files) {
  const name = path.basename(table.path);
  const previous = old.files.find(file => path.basename(file.path) === name);
  const local = previous ? path.join(__dirname, '../sedra/source', name) : path.join(sourceDir, name);
  const content = fs.readFileSync(local);
  assert.equal(crypto.createHash('sha256').update(content).digest('hex'), table.sha256, name);
  comparedTables.push({table: table.table, rows: table.rows, identicalToImport: previous?.sha256 === table.sha256});
}
const index = new Map();
let sourceRows = 0;
for (const line of bytes.toString('utf8').trim().split(/\r?\n/)) {
  const fields = line.split('\t');
  assert.equal(fields.length, 3);
  const [lemma, form, grammar] = fields;
  const key = norm(form);
  if (!index.has(key)) index.set(key, new Map());
  const candidates = index.get(key), head = norm(lemma);
  if (!candidates.has(head)) candidates.set(head, {lemma: head, spellings: new Set(), grammar: new Set()});
  candidates.get(head).spellings.add(lemma);
  candidates.get(head).grammar.add(grammar);
  sourceRows++;
}
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../sedra-data.js'), 'utf8'), context);
const data = context.window.SEDRA_DATA, dictionary = create(data);
const accepted = new Set(require('../../peshitta-nt-context-review.json').books.flatMap(book =>
  book.entries.map(word => book.book + '/' + word.id)));
const counts = {}, records = [], books = new Map();
for (const line of fs.readFileSync(inputFile, 'utf8').trim().split('\n')) {
  const row = JSON.parse(line);
  if (accepted.has(row.book + '/' + row.id)) continue;
  const candidates = [...(index.get(norm(row.form))?.values() || [])].map(candidate => ({
    lemma: candidate.lemma, spellings: [...candidate.spellings], grammar: [...candidate.grammar],
  }));
  const currentIds = dictionary.lookup(row.form);
  const dictionaryAgreement = currentIds.filter(id => candidates.some(candidate =>
    candidate.lemma === norm(data.lexemes[id].vocal || data.lexemes[id].form)));
  const finding = !candidates.length ? 'no-unimorph-form'
    : candidates.length > 1 ? 'multiple-unimorph-lemmas'
    : dictionaryAgreement.length ? 'single-unimorph-lemma-with-sedra' : 'single-unimorph-lemma';
  counts[finding] = (counts[finding] || 0) + 1;
  const summary = books.get(row.book) || {book: row.book, checked: 0, matched: 0, newFormEvidence: 0};
  summary.checked++;
  if (candidates.length) {
    summary.matched++;
    if (!currentIds.length) summary.newFormEvidence++;
  }
  books.set(row.book, summary);
  records.push({...row, lexicalEvidence: {
    finding, candidates, dictionaryAgreement, sourceFamily: 'SEDRA',
    newFormEvidence: !!candidates.length && !currentIds.length,
  }});
}
fs.mkdirSync(outputDir, {recursive: true});
const summary = {
  checked: records.length, sources: metadata, comparedTables,
  unimorph: {rows: sourceRows, normalizedForms: index.size}, counts,
  newFormEvidence: [...books.values()].reduce((n, book) => n + book.newFormEvidence, 0),
  books: [...books.values()],
  interpretation: 'Lexical candidates for contextual review. UniMorph Syriac derives from SEDRA. No automatic passage decisions.',
};
fs.writeFileSync(path.join(outputDir, 'lexical-evidence.jsonl'), records.map(row => JSON.stringify(row)).join('\n') + '\n');
fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
process.stdout.write(JSON.stringify({checked: summary.checked, counts, newFormEvidence: summary.newFormEvidence}) + '\n');
