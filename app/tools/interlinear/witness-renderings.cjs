'use strict';

// Regenerate with node tools/interlinear/witness-renderings.cjs.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const Peshitta = require('../../peshitta-alignment');
const Samaritan = require('../../samaritan-il');
const SamaritanMorph = require('../../samaritan-core'), SamaritanData = require('../../samaritan-data');
const SyriacMorph = require('../../syriac-morph'), Groups = require('./witness-groups.cjs');
const Concordance = require('../../concordance');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const books = JSON.parse(read('interlin-ren.js').match(/"books":(\[[^\]]+\])/)[1]);
const loadData = file => {
  const window = {};
  vm.runInNewContext(read(file), { window }, { filename: file });
  return window;
};
const readEdition = source => {
  const doc = JSON.parse(read(path.join('bundled', source.rel)));
  const hash = createHash('sha256').update(JSON.stringify(doc.text)).digest('hex');
  assert.equal(hash, source.textHash, source.rel);
  doc.textHash = hash;
  return doc;
};
const newIndex = () => new Map();
const samaritan = newIndex();
const peshitta = newIndex();
const groupedSamaritan = newIndex(), groupedPeshitta = newIndex();

function addVerse(index, book, ref, words, segments, grouped) {
  const [chapter, verse] = ref.split(':').map(Number);
  const number = books.indexOf(book) * 1000000 + chapter * 1000 + verse;
  const aligned = new Map();
  for (const [indices, surface, descriptor] of segments) {
    if (indices.length !== 1 || !surface) continue;
    const position = indices[0] - 1;
    if (!words[position]) continue;
    if (!aligned.has(position)) aligned.set(position, []);
    aligned.get(position).push({surface,descriptor});
  }
  for (const [position, surfaces] of aligned) {
    const [rawLemma, rawMorph] = words[position];
    const lemmas = rawLemma.split('/');
    const main = lemmas.findIndex(lemma => /\d/.test(lemma));
    if (main < 0 || !rawMorph) continue;
    const lemma = lemmas[main].trim();
    const morphology = rawMorph.slice(1).split('/');
    const suffix = morphology.slice(main + 1).find(part => part.startsWith('S'));
    const code = rawMorph[0] + (morphology[main] ?? morphology.at(-1)) + (suffix ? '/' + suffix : '');
    const label = surfaces.map(s=>s.surface).join(' ').normalize('NFC');
    Groups.add(grouped,lemma,surfaces.length===1&&surfaces[0].descriptor || Groups.describe(label,[],''),label,code,number);
    if (!index.has(lemma)) index.set(lemma, new Map());
    const labels = index.get(lemma);
    if (!labels.has(label)) labels.set(label, new Map());
    const codes = labels.get(label);
    if (!codes.has(code)) codes.set(code, []);
    codes.get(code).push(number);
  }
}

function serialize(index) {
  return Object.fromEntries([...index].map(([lemma, readings]) => {
    const labels = [...readings.keys()];
    const cells = labels.flatMap((label, group) => [...readings.get(label)].map(([code, refs]) => {
      let previous = 0;
      const deltas = refs.sort((a, b) => a - b).map(ref => {
        const delta = ref - previous;
        previous = ref;
        return delta.toString(36);
      });
      return [group, code, refs.length, deltas.join('.')];
    }));
    return [lemma, [labels, cells]];
  }));
}

const pentateuch = loadData('peshitta-alignment-data.js').PESHITTA_ALIGNMENT_DATA;
for (const book of books) {
  if (!Peshitta.has(book) && !Samaritan.source.books[book]) continue;
  const samaritanSource = Samaritan.source.books[book];
  const sy = Peshitta.has(book)
    ? Peshitta.book(Peshitta.file(book) === 'peshitta-alignment-data.js'
      ? pentateuch : loadData(Peshitta.file(book)).PESHITTA_ALIGNMENT_BOOKS[book], book)
    : null;
  const source = sy?.source.he ?? samaritanSource.he;
  const mt = readEdition(source);
  if (samaritanSource) {
    assert.equal(source.textHash, samaritanSource.he.textHash, book);
    readEdition(samaritanSource.translation);
  }
  const syDoc = sy && readEdition(sy.source.translation);
  for (const [c, chapter] of mt.text.entries()) {
    for (const [v, html] of chapter.entries()) {
      const ref = (c + 1) + ':' + (v + 1);
      const words = [...html.matchAll(/<span class="w" data-l="([^"]*)" data-m="([^"]*)"[^>]*>([^<]*)/g)]
        .map(match => match.slice(1));
      if (samaritanSource) {
        const target = book + ' ' + ref;
        const segments = (Samaritan.index[target] ?? []).flatMap(sourceRef =>
          Samaritan.verses[sourceRef].words
            .filter(row => row[3] === target)
            .map(row => [row[4], row[0], Groups.describe(row[0],(SamaritanMorph.word(SamaritanData,row[2])?.parts||[]).map(p=>({lex:p[0],sp:p[2]})),'he')]));
        addVerse(samaritan, book, ref, words, segments,groupedSamaritan);
      }
      if (sy?.verses[ref]) {
        const aligned = Peshitta.verse(sy, ref, words.map(word => word[2]));
        assert.ok(aligned, book + ' ' + ref);
        const [chapter,verse]=ref.split(':').map(Number);
        const ids=aligned.ids || [...String(syDoc.text[chapter-1]?.[verse-1]||'').matchAll(/data-si="(\d+)"/g)].map(m=>m[1]);
        const segments=aligned.sy.map((surface,i)=>{
          const native=aligned.refs?.[i]||ref, [c,v]=native.split(':').map(Number);
          const record=ids.length===aligned.sy.length?SyriacMorph.at(syDoc,ids[i],surface,[c-1],String(v)):null;
          const parts=record?.parts.length?record.parts:record?Concordance.reviewedSyriacParts(syDoc,ids[i],surface,c,v):[];
          return [aligned.links[i],surface,Groups.describe(surface,parts,'syr')];
        });
        addVerse(peshitta, book, ref, words, segments,groupedPeshitta);
      }
    }
  }
}

const data = { books, Samaritan: serialize(samaritan), Peshitta: serialize(peshitta),
  groups:{Samaritan:Groups.serialize(groupedSamaritan),Peshitta:Groups.serialize(groupedPeshitta)} };
fs.writeFileSync(path.join(root, 'witness-ren.js'),
  '// Generated by tools/interlinear/witness-renderings.cjs. Tal–Florentin and ETCBC Peshitta, CC BY-NC 4.0; OSHB, CC BY 4.0.\n' +
  'window.WITNESS_REN=' + JSON.stringify(data) + ';\n');
