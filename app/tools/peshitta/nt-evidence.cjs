'use strict';

// Combine exact-form NT attestations with existing OT and SEDRA candidates.
// node tools/peshitta/nt-evidence.cjs source-directory open-words.jsonl output-directory
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {norm} = require('../../syriac-cards');
const SY = require('../../syriac-morph');
const [sourceDir, openFile, outputDir] = process.argv.slice(2);
assert(sourceDir && openFile && outputDir, 'source directory, open-word list and output directory required');
const metadata = require('./nt-source.json');
const expand = value => value.split(',').flatMap(part => {
  const [first, last = first] = part.split('-').map(Number);
  return Array.from({length: last - first + 1}, (_, i) => first + i);
});
function feature(name, edges = false) {
  const raw = fs.readFileSync(path.join(sourceDir, name + '.tf'));
  const file = metadata.files.find(file => file.path.endsWith('/' + name + '.tf'));
  assert(file, name);
  const blob = crypto.createHash('sha1').update('blob ' + raw.length + '\0').update(raw).digest('hex');
  assert.equal(blob, file.sha, name);
  const lines = raw.toString('utf8').split(/\r?\n/);
  const result = new Map();
  let node = 0;
  for (const line of lines.slice(lines.indexOf('') + 1)) {
    if (!line) continue;
    const tab = line.indexOf('\t');
    const nodes = tab < 0 ? [node + 1] : expand(line.slice(0, tab));
    const value = tab < 0 ? line : line.slice(tab + 1);
    for (node of nodes) result.set(node, edges ? expand(value) : value);
  }
  return result;
}
const types = feature('otype'), slots = feature('oslots', true);
const books = feature('book@en'), chapters = feature('chapter'), verses = feature('verse');
const forms = feature('word'), lemmas = feature('lexeme'), pos = feature('sp');
const bookAt = new Map(), chapterAt = new Map(), verseAt = new Map();
for (const [node, type] of types) {
  const table = type === 'book' ? bookAt : type === 'chapter' ? chapterAt : type === 'verse' ? verseAt : null;
  if (!table) continue;
  const label = (type === 'book' ? books : type === 'chapter' ? chapters : verses).get(node);
  assert(label, String(node));
  for (const word of slots.get(node)) table.set(word, label);
}
const index = new Map();
const contextIndex = new Map();
function localContext(form, before, after) {
  return before && after ? JSON.stringify([norm(before), norm(form), norm(after)]) : null;
}
for (const [id, form] of forms) {
  if (types.get(id) !== 'word') continue;
  const lemma = lemmas.get(id);
  if (!lemma) continue;
  const key = norm(form);
  if (!index.has(key)) index.set(key, new Map());
  const analyses = index.get(key);
  const signature = JSON.stringify([norm(lemma), pos.get(id)]);
  if (!analyses.has(signature)) analyses.set(signature, {lemma, pos: pos.get(id), count: 0, references: []});
  const analysis = analyses.get(signature);
  analysis.count++;
  if (analysis.references.length < 3) analysis.references.push({
    book: bookAt.get(id), chapter: Number(chapterAt.get(id)), verse: Number(verseAt.get(id)), id,
  });
  if (verseAt.get(id - 1) === verseAt.get(id) && verseAt.get(id + 1) === verseAt.get(id) &&
      chapterAt.get(id - 1) === chapterAt.get(id) && chapterAt.get(id + 1) === chapterAt.get(id) &&
      bookAt.get(id - 1) === bookAt.get(id) && bookAt.get(id + 1) === bookAt.get(id)) {
    const key = localContext(form, forms.get(id - 1), forms.get(id + 1));
    if (!contextIndex.has(key)) contextIndex.set(key, []);
    contextIndex.get(key).push({
      lemma: norm(lemma), pos: pos.get(id), book: bookAt.get(id),
      chapter: Number(chapterAt.get(id)), verse: Number(verseAt.get(id)), id,
    });
  }
}
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../sedra-data.js'), 'utf8'), context);
const sedra = context.window.SEDRA_DATA.lexemes;
const counts = {}, records = [];
const contextCounts = {};
for (const line of fs.readFileSync(openFile, 'utf8').trim().split('\n')) {
  const row = JSON.parse(line);
  const matches = [...(index.get(norm(row.form))?.values() || [])];
  const dictionaryAgreement = (row.sedra || []).filter(id =>
    sedra[id] && matches.some(match => norm(sedra[id].vocal || sedra[id].form) === norm(match.lemma)));
  const finding = !matches.length ? 'no-exact-nt-form'
    : matches.length > 1 ? 'multiple-nt-analyses'
    : dictionaryAgreement.length ? 'single-nt-analysis-with-sedra' : 'single-nt-analysis';
  counts[finding] = (counts[finding] || 0) + 1;
  let contextFinding = 'not-single-nt-analysis';
  let contextMatches = [];
  if (matches.length === 1) {
    const words = [...row.context.matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map(match => match[0]);
    const positions = words.flatMap((word, i) => norm(word) === norm(row.form) ? [i] : []);
    if (positions.length !== 1) contextFinding = 'surface-position-ambiguous';
    else {
      const position = positions[0];
      const key = localContext(row.form, words[position - 1], words[position + 1]);
      const hits = contextIndex.get(key) || [];
      const books = new Map(hits.map(hit => [hit.book, hit]));
      const agreement = hits.length && hits.every(hit =>
        hit.lemma === norm(matches[0].lemma) && hit.pos === matches[0].pos);
      contextFinding = !hits.length ? 'no-nt-context' : !agreement ? 'conflicting-nt-context'
        : books.size < 2 ? 'one-nt-book' : 'repeated-nt-context';
      if (agreement) contextMatches = [...books.values()].slice(0, 3);
    }
    if (contextFinding === 'repeated-nt-context') {
      const candidates = row.etcbc || [];
      const corpusAgreement = candidates.length === 1 &&
        candidates[0].parts.some(part => norm(SY.lemma(part.lexeme)) === norm(matches[0].lemma) &&
          ({subs: 'noun', verb: 'verb', adjv: 'adjective', advb: 'adverb', prep: 'preposition', conj: 'conjunction'}[part.pos]) === matches[0].pos);
      contextFinding = corpusAgreement ? 'repeated-nt-context-with-ot-analysis' : 'repeated-nt-context-needs-lemma-mapping';
    }
  }
  contextCounts[contextFinding] = (contextCounts[contextFinding] || 0) + 1;
  records.push({...row, ntEvidence: {finding, matches, dictionaryAgreement, contextFinding, contextMatches}});
}
fs.mkdirSync(outputDir, {recursive: true});
fs.writeFileSync(path.join(outputDir, 'combined-evidence.jsonl'), records.map(row => JSON.stringify(row)).join('\n') + '\n');
const summary = {
  source: {repository: metadata.repository, commit: metadata.commit, license: metadata.license, derivesFrom: 'SEDRA'},
  checked: records.length, ntWords: forms.size, exactForms: index.size, counts, contextCounts,
  interpretation: 'Exact-form attestations for review. SEDRA and syrnt share provenance. Passage-specific OT decisions remain required.',
};
fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
