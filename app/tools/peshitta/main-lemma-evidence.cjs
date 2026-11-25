'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm');
const assert = require('node:assert/strict');
const A = require('./automatic-context.cjs'), alignment = require('../../peshitta-alignment'), {decode} = require('../../morph');
const SY = require('../../syriac-morph'), {norm} = require('../../syriac-cards');
const root = path.resolve(__dirname, '../..');
const SOURCE = 'ETCBC Syriac (automatischer Hauptlemma-Abgleich)';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const pairKey = (strong, main) => JSON.stringify([strong, A.signature(main)]);
const anchorKey = (form, strong) => JSON.stringify([norm(form), strong]);
function load() {
 const source = A.loadCorpus(), catalog = require('../../bundled/manifest.json').items;
 const alignments = new Map(), provenance = new Map(), tags = new Map(), forms = new Map(), pairs = new Map(), anchors = new Map();
 const add = (index, key, ref) => {if (!index.has(key)) index.set(key, []); index.get(key).push(ref);};
 for (const [book, sy] of source.docs) {
  const e = catalog.find(e => e.title === book && e.versionTitle.startsWith('Westminster'));
  const raw = fs.readFileSync(path.join(root, 'bundled', e.rel)), he = JSON.parse(raw);
  he.textHash = hash(JSON.stringify(he.text)); sy.textHash = sy.syriacMorphology.textHash;
  provenance.set('bundled/' + e.rel, {file: 'bundled/' + e.rel, sha256: hash(raw)});
  const file = alignment.file(book);
  if (!alignments.has(file)) {
   const raw = fs.readFileSync(path.join(root, file)), w = {};
   vm.runInNewContext(raw.toString(), {window: w});
   alignments.set(file, w.PESHITTA_ALIGNMENT_DATA || {version: 2, books: w.PESHITTA_ALIGNMENT_BOOKS});
   provenance.set(file, {file, sha256: hash(raw)});
  }
  const links = alignment.book(alignments.get(file), book);
  assert(alignment.prepare(links, he, sy), book);
  const local = new Map();
  for (const [ref, row] of Object.entries(links.verses)) {
   if (!row.review) continue;
   const [chapter, verse] = ref.split(':').map(Number), html = he.text[chapter - 1]?.[verse - 1];
   if (typeof html !== 'string') continue;
   const words = [...html.matchAll(/<span class="w" data-l="([^"]*)" data-m="([^"]*)"[^>]*>(.*?)<\/span>/g)];
   if (!alignment.verse(links, ref, words.map(m => m[3]))) continue;
   const uses = new Map();
   for (const ix of row.links) for (const i of ix) uses.set(i, (uses.get(i) || 0) + 1);
   for (const [i, ix] of row.links.entries()) {
    if (ix.length !== 1 || uses.get(ix[0]) !== 1) continue;
    const id = String(row.ids[i]), word = sy.syriacMorphology.words[id];
    if (!word || word[0] !== row.sy[i] || word[2] + ':' + word[3] !== (row.refs?.[i] || ref)) continue;
    const [, lemma, morph, form] = words[ix[0] - 1], parsed = decode(morph, lemma), strong = parsed?.segs[parsed.main]?.lemma;
    if (strong && /^\d/u.test(strong)) local.set(id, {strong: parsed.lang + ':' + strong, ref, form, reviewBy: row.review.by || 'unspecified'});
   }
  }
  tags.set(book, local);
 }
 for (const refs of source.forms.values()) for (const ref of refs) {
  const tag = tags.get(ref.book).get(ref.id);
  add(forms, norm(ref.form), ref);
  if (ref.main && tag) {
   const tagged = {...ref, tag};
   add(pairs, pairKey(tag.strong, ref.main), tagged);
   add(anchors, anchorKey(ref.form, tag.strong), tagged);
  }
 }
 return {...source, forms, pairs, anchors, tags, provenance: [...provenance.values()], cache: new Map()};
}
const distinct = (refs, max) => [...new Set(refs.map(r => r.book))].slice(0, max).map(b => refs.find(r => r.book === b));
function candidates(source, form, strong, book) {
 const cacheKey = JSON.stringify([norm(form), strong, book]);
 if (source.cache.has(cacheKey)) return source.cache.get(cacheKey);
 const refs = (source.forms.get(norm(form)) || []).filter(r => r.book !== book), out = [];
 // A compound with no supported single main lemma is not resolved by dropping parts.
 if (refs.some(r => !r.main)) {source.cache.set(cacheKey, out); return out;}
 for (const sig of new Set(refs.map(r => A.signature(r.main)))) {
  const same = refs.filter(r => A.signature(r.main) === sig);
  if (same.length < 3 || new Set(same.map(r => r.book)).size < 2) continue;
  const translated = (source.pairs.get(pairKey(strong, same[0].main)) || []).filter(r => r.book !== book);
  if (translated.length < 12 || new Set(translated.map(r => r.book)).size < 4) continue;
  out.push({main: same[0].main, formCount: same.length, formBooks: new Set(same.map(r => r.book)).size,
   translationCount: translated.length, translationBooks: new Set(translated.map(r => r.book)).size,
   formSources: distinct(same, 2), translationSources: distinct(translated, 4)});
 }
 source.cache.set(cacheKey, out);
 return out;
}
function assess(source, row) {
 const doc = source.docs.get(row.book), m = doc.syriacMorphology, word = m.words[row.id];
 assert.deepEqual([word[0], word[2], word[3]], [row.form, row.chapter, row.verse]);
 assert.equal(word[1].length, 0, `existing source annotation ${row.id}`);
 const tag = source.tags.get(row.book).get(row.id);
 let reason = 'no-current-one-to-one-hebrew-alignment', match = null;
 if (tag) {
  const cs = candidates(source, row.form, tag.strong, row.book);
  reason = !cs.length ? 'insufficient-form-and-translation-support' : cs.length > 1 ? 'competing-main-lemmas' : 'supported-main-lemma';
  if (cs.length === 1) {
   match = cs[0];
   const known = new Set((source.anchors.get(anchorKey(row.form, tag.strong)) || []).map(r => A.signature(r.main)));
   if (known.size > 1 || known.size === 1 && !known.has(A.signature(match.main))) reason = 'known-source-anchor-conflict';
   if (!(row.etcbc || []).some(c => A.signature(A.mainPart(c.parts)) === A.signature(match.main))) reason = 'not-an-existing-corpus-candidate';
  }
 }
 return {book: row.book, id: row.id, form: row.form, chapter: row.chapter, verse: row.verse,
  textHash: m.textHash, accepted: reason === 'supported-main-lemma', reason, tag: tag || null, evidence: match,
  etcbcCandidates: row.etcbc || [], ...(reason === 'supported-main-lemma' ? {contextLemma: SY.lemma(match.main.lexeme)} : {})};
}
function benchmark(source) {
 const out = {method: 'Leave a complete original annotated book out of form and Hebrew/Syriac main-lemma pair indexes. Also exclude it from known-anchor conflict detection. No inferred assignments are source evidence.', tested: 0, agreed: 0, disagreements: []};
 for (const refs of source.anchors.values()) for (const target of refs) {
  const cs = candidates(source, target.form, target.tag.strong, target.book);
  if (cs.length !== 1) continue;
  const known = new Set(refs.filter(r => r.book !== target.book).map(r => A.signature(r.main)));
  if (known.size > 1 || known.size === 1 && !known.has(A.signature(cs[0].main))) continue;
  out.tested++;
  if (A.signature(target.main) === A.signature(cs[0].main)) out.agreed++;
  else out.disagreements.push({book: target.book, id: target.id, form: target.form, strong: target.tag.strong, expected: target.main, proposed: cs[0].main});
 }
 return out;
}
function exportReview(rows) {
 const books = new Map(), ref = r => ({book: r.book, ref: `${r.chapter}:${r.verse}`, id: r.id});
 for (const r of rows) {
  assert(r.accepted);
  if (!books.has(r.book)) books.set(r.book, {book: r.book, textHash: r.textHash, entries: []});
  books.get(r.book).entries.push({id: r.id, form: r.form, chapter: r.chapter, verse: r.verse, contextLemma: r.contextLemma,
   mainLemmaSources: {strong: r.tag.strong, form: r.evidence.formSources.map(ref), translation: r.evidence.translationSources.map(ref)}});
 }
 return {version: 1, source: SOURCE, method: 'main-lemma-intersection-form-3-in-2-books-translation-12-in-4-books', license: 'CC BY-NC 4.0',
  note: 'Automatic main-lemma assignments. Affix analysis and complete morphology remain unassigned. Edition-bound alignment data includes AI reviews. This is not individual scholarly verification.', books: [...books.values()]};
}
module.exports = {load, candidates, assess, benchmark, exportReview};
