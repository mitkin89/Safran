'use strict';

const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { gzipSync } = require('node:zlib');
const source = require('../../bhsa-source');
const { supports } = require('../../tanakh-syntax');
const root = path.resolve(__dirname, '../..');

const BOOKS = {
  Genesis: 'Genesis', Exodus: 'Exodus', Leviticus: 'Leviticus', Numeri: 'Numbers', Deuteronomium: 'Deuteronomy',
  Josua: 'Joshua', Judices: 'Judges', Samuel_I: 'I Samuel', Samuel_II: 'II Samuel', Reges_I: 'I Kings', Reges_II: 'II Kings',
  Jesaia: 'Isaiah', Jeremia: 'Jeremiah', Ezechiel: 'Ezekiel', Hosea: 'Hosea', Joel: 'Joel', Amos: 'Amos', Obadia: 'Obadiah',
  Jona: 'Jonah', Micha: 'Micah', Nahum: 'Nahum', Habakuk: 'Habakkuk', Zephania: 'Zephaniah', Haggai: 'Haggai',
  Sacharia: 'Zechariah', Maleachi: 'Malachi', Psalmi: 'Psalms', Iob: 'Job', Proverbia: 'Proverbs', Ruth: 'Ruth',
  Canticum: 'Song of Songs', Ecclesiastes: 'Ecclesiastes', Threni: 'Lamentations', Esther: 'Esther', Daniel: 'Daniel',
  Esra: 'Ezra', Nehemia: 'Nehemiah', Chronica_I: 'I Chronicles', Chronica_II: 'II Chronicles',
};
const letters = value => String(value ?? '').replace(/[^א-ת]/gu, '');
const SPAN = /<span class="w" data-l="[^"]*" data-m="[^"]*">(.*?)<\/span>/gu;

function* ranges(spec) {
  if (!/^(?:\d+(?:-\d+)?)(?:,\d+(?:-\d+)?)*$/.test(spec)) throw new Error('Ungültige BHSA-Knotenliste');
  for (const part of spec.split(',')) {
    const [start, end = start] = part.split('-').map(Number);
    yield [start, end];
  }
}

function* records(dir, name) {
  const content = readFileSync(path.join(dir, name + '.tf'));
  if (createHash('sha256').update(content).digest('hex') !== source.hashes[name]) {
    throw new Error('BHSA-Prüfsumme stimmt nicht: ' + name);
  }
  const lines = content.toString('utf8').split(/\r?\n/);
  let previous = 0;
  for (let i = lines.indexOf('') + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line && i === lines.length - 1) break;
    const tab = line.indexOf('\t');
    if (tab < 0) {
      yield [++previous, line];
      continue;
    }
    for (const [start, end] of ranges(line.slice(0, tab))) {
      for (let node = start; node <= end; node++) yield [node, line.slice(tab + 1)];
      previous = end;
    }
  }
}

function* slots(spec) {
  for (const [start, end] of ranges(spec)) {
    for (let slot = start; slot <= end; slot++) yield slot;
  }
}

function alignVerse(sourceSlots, words, western) {
  // Confirm the whole consonant stream before applying any annotation.
  // Text-Fabric slots often split a prefix and its lexical word.
  if (!western.length || western.some(word => !word) ||
      sourceSlots.map(slot => words[slot]).join('') !== western.join('')) return null;
  const result = [];
  let index = 0, used = 0;
  for (const slot of sourceSlots) {
    const fragments = [];
    let left = words[slot].length;
    while (left) {
      const take = Math.min(left, western[index].length - used);
      fragments.push([index, take]);
      left -= take;
      used += take;
      if (used === western[index].length) { used = 0; index++; }
    }
    result.push(fragments);
  }
  return result;
}

function build(dir) {
  const wordForms = [];
  for (const [id, form] of records(dir, 'g_word_utf8')) wordForms[id] = letters(form);
  const clauses = new Map(), verses = new Map();
  let maxNode = 0;
  for (const [id, type] of records(dir, 'otype')) {
    if (type === 'verse') verses.set(id, {});
    if (type === 'clause') clauses.set(id, {});
    maxNode = Math.max(maxNode, id);
  }
  const firstSlot = new Uint32Array(maxNode + 1);
  for (const [id, spec] of records(dir, 'oslots')) {
    firstSlot[id] = parseInt(spec, 10);
    const verse = verses.get(id), clause = clauses.get(id);
    if (verse) verse.slots = spec;
    if (clause) clause.slots = spec;
  }
  for (const [feature, attr] of [['book', 'book'], ['chapter', 'chapter'], ['verse', 'verse']]) {
    for (const [id, value] of records(dir, feature)) {
      const verse = verses.get(id);
      if (verse) verse[attr] = value;
    }
  }
  for (const [feature, attr] of [['txt', 'txt'], ['rela', 'relation'], ['mother', 'mother'],['kind','kind'],['typ','type']]) {
    for (const [id, value] of records(dir, feature)) {
      const clause = clauses.get(id);
      if (clause) clause[attr] = value;
    }
  }

  // A clause may depend on a phrase or word. Resolve that explicit anchor to
  // its owning clause only when every anchor slot belongs to one unique clause.
  const owner = new Uint32Array(wordForms.length), ambiguous = new Set();
  for(const [id,c] of clauses)for(const slot of slots(c.slots)){
    if(owner[slot] && owner[slot]!==id)ambiguous.add(slot);else owner[slot]=id;
  }
  const wanted=new Set([...clauses.values()].map(c=>Number(c.mother)).filter(id=>Number.isInteger(id)&&id>=wordForms.length&&!clauses.has(id)));
  const anchors=new Map();
  for(const [id,spec]of records(dir,'oslots'))if(wanted.has(id))anchors.set(id,spec);
  for(const [id,c]of clauses){
    const mother=/^\d+$/.test(c.mother||'')?Number(c.mother):0;
    if(clauses.has(mother)){c.motherClause=mother;continue;}
    const positions=mother>0&&mother<wordForms.length?[mother]:anchors.has(mother)?[...slots(anchors.get(mother))]:[];
    const owners=new Set(positions.map(slot=>ambiguous.has(slot)?0:owner[slot]));
    c.motherClause=owners.size===1&&!owners.has(0)?[...owners][0]:null;
    if(c.motherClause===id)c.motherClause=null;
  }

  const bundled = path.join(root, 'bundled');
  const books = new Map(require('../../bundled/manifest.json').items.filter(supports).map(entry =>
    [entry.title, JSON.parse(readFileSync(path.join(bundled, entry.rel), 'utf8')).text]));
  const result = Object.fromEntries([...books.keys()].map(book => [book, {}]));
  const verseBySlot = new Uint32Array(wordForms.length), slotParts = [];
  let aligned = 0;
  for (const [id, verse] of verses) {
    const book = BOOKS[verse.book];
    if (!books.has(book)) throw new Error('Unbekanntes BHSA-Buch: ' + verse.book);
    const ref = verse.chapter + ':' + verse.verse;
    const sourceSlots = [...slots(verse.slots)];
    for (const slot of sourceSlots) verseBySlot[slot] = id;
    verse.book = book;
    verse.ref = ref;
    const html = books.get(book)[Number(verse.chapter) - 1]?.[Number(verse.verse) - 1];
    if (typeof html !== 'string') continue;
    const words = [...html.matchAll(SPAN)].map(match => letters(match[1]));
    const positions = alignVerse(sourceSlots, wordForms, words);
    if (!positions) continue;
    verse.lengths = words.map(word => word.length);
    result[book][ref] = [words.join(' '), []];
    sourceSlots.forEach((slot, i) => { slotParts[slot] = positions[i]; });
    aligned++;
  }

  for (const [id, clause] of clauses) {
    if (!/^[?NDQ]+$/.test(clause.txt || '')) continue;
    const byVerse = new Map();
    for (const slot of slots(clause.slots)) {
      const verseId = verseBySlot[slot];
      if (!slotParts[slot]) continue;
      const counts = byVerse.get(verseId) || new Map();
      for (const [i, length] of slotParts[slot]) counts.set(i, (counts.get(i) || 0) + length);
      byVerse.set(verseId, counts);
    }
    // A resumption may point to a clause, phrase, or word node.
    const mother = clause.relation === 'Resu' && /^\d+$/.test(clause.mother || '') ? Number(clause.mother) : 0;
    const parentSlot = mother && (mother < wordForms.length ? mother : firstSlot[mother]);
    const parent = parentSlot && verses.get(verseBySlot[parentSlot]);
    for (const [verseId, counts] of byVerse) {
      const verse = verses.get(verseId);
      const positions = [...counts].filter(([i, count]) => count === verse.lengths[i]).map(([i]) => i);
      if (!positions.length) continue;
      result[verse.book][verse.ref][1].push([id, clause.txt, clause.relation === 'Resu',
        parent ? [parent.book, parent.ref] : null, positions, clause.relation || 'NA',
        clause.motherClause || null,clause.kind||null,clause.type||null]);
    }
  }
  return { version: source.format, revision: source.revision, patternVersion: 1, clauseFeatures: ['kind','typ'], clauseParents: Object.fromEntries([...clauses].map(([id,c])=>[id,c.motherClause||null])), aligned, total: verses.size, books: result };
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) throw new Error('Usage: node tools/bhsa/build.js /path/to/bhsa/tf/2021');
  const index = build(dir);
  writeFileSync(path.join(root, 'bundled', 'bhsa', 'index.json.gz'),
    gzipSync(JSON.stringify(index), { level: 9 }));
  console.log(`${Object.keys(index.books).length} books, ${index.aligned}/${index.total} verses aligned`);
}

module.exports = { build, alignVerse };
