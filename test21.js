// „Alles zu dieser Stelle“ (passage.js): Verteilung der Verknüpfungen auf die Fächer, Wörter des Verses, Gliederung/Mizwa, Notizen, Orte, Themen
const assert = require('assert');
const P = require('./passage.js');

// ----- Fächer -----
const rows = [
  { v1: 2, v2: 2, other: 'Rashi on Genesis 22:2:1', type: 'commentary', cat: 'Commentary' },
  { v1: 2, v2: 2, other: 'Rashi on Genesis 22:2:2', type: 'commentary', cat: 'Commentary' },
  { v1: 2, v2: 2, other: 'Ibn Ezra on Genesis 22:2:1', type: 'commentary', cat: 'Commentary' },
  { v1: 3, v2: 3, other: 'Rashi on Genesis 22:3:1', type: 'commentary', cat: 'Commentary' },   // anderer Vers
  { v1: 0, v2: 0, other: 'Ramban on Genesis 22', type: 'commentary', cat: 'Commentary' },       // ganzes Kapitel: kein Vers-Kommentar
  { v1: 2, v2: 2, other: 'II Chronicles 3:1', type: 'reference', cat: 'Tanakh' },               // Sefaria / OpenBible
  { v1: 1, v2: 19, other: 'Hebrews-frei 1:1', type: 'reference', cat: 'Tanakh' },
  { v1: 2, v2: 2, other: 'II Chronicles 3:1-2', type: 'reference', cat: 'Tanakh' },             // dieselbe Stelle noch einmal (Bereich)
  { v1: 2, v2: 2, other: 'Genesis 12:1', type: '82 %', cat: 'Parallelstellen' },                // ETCBC
  { v1: 2, v2: 2, other: 'The Antiquities of the Jews 1:13:1', type: 'reference', cat: 'Second Temple' },
  { v1: 2, v2: 2, other: 'Book of Jubilees 18:2', type: 'reference', cat: 'Second Temple' },
  { v1: 2, v2: 2, other: 'Legends of the Jews 1:5:214', type: 'reference', cat: 'Midrash' },
  { v1: 2, v2: 2, other: 'Sanhedrin 89b:7', type: 'reference', cat: 'Talmud' },
  { v1: 2, v2: 2, other: 'Bereshit Rabbah 55:7', type: 'midrash', cat: 'Midrash' },
  { v1: 2, v2: 2, other: 'Mishnah Taanit 2:4', type: 'reference', cat: 'Mishnah' },
  { v1: 2, v2: 2, other: 'Mishneh Torah, Temple 2:2', type: 'reference', cat: 'Halakhah' },
  { v1: 2, v2: 2, other: 'Guide for the Perplexed 3:24', type: 'reference', cat: 'Jewish Thought' },
  { v1: 2, v2: 2, other: 'Hertz on Exodus 4:14', type: 'reference', cat: 'Commentary' },          // zitiert den Vers, kommentiert ihn nicht
  { v1: 5, v2: 5, other: 'Isaiah 1:1', type: 'reference', cat: 'Tanakh' },                        // anderer Vers
];
const cl = P.classify(rows, 2);
assert.deepStrictEqual(cl.commentary.map(x => x.other), ['Rashi on Genesis 22:2:1', 'Rashi on Genesis 22:2:2', 'Ibn Ezra on Genesis 22:2:1']);
assert.deepStrictEqual(cl.parallels.map(x => x.other), ['II Chronicles 3:1', 'Hebrews-frei 1:1', 'Genesis 12:1', 'The Antiquities of the Jews 1:13:1', 'Book of Jubilees 18:2']);
assert.deepStrictEqual(cl.legends.map(x => x.other), ['Legends of the Jews 1:5:214']);
assert.deepStrictEqual(cl.rabbinic.map(x => x.other), ['Sanhedrin 89b:7', 'Bereshit Rabbah 55:7', 'Mishnah Taanit 2:4']);
assert.deepStrictEqual(cl.halakhah.map(x => x.other), ['Mishneh Torah, Temple 2:2']);
assert.deepStrictEqual(cl.other.map(x => x.other), ['Guide for the Perplexed 3:24', 'Hertz on Exodus 4:14']);
assert.strictEqual(P.classify(rows, 5).parallels.length, 2); // Vers 5: eigene Stelle + der Bereich 1–19
assert.strictEqual(P.classify(rows, 5).commentary.length, 0);
// Krauss, Talmudische Archäologie: eigenes Fach
assert.strictEqual(P.boxOf({ other: 'Talmudische Archäologie 12:3', type: 'reference', cat: 'Eigene Texte' }), 'krauss');
assert.ok(P.BOXES.indexOf('krauss') === P.BOXES.indexOf('legends') + 1);
// ganzes Kapitel (v = null, all): alle Vers-Kommentare, aber nicht der Kommentar zum ganzen Kapitel; ohne all keine Kommentare
{ const w = P.classify(rows, null, true); assert.strictEqual(w.commentary.length, 4); assert.ok(!w.commentary.some(x => x.other === 'Ramban on Genesis 22'));
  assert.ok(w.parallels.length >= P.classify(rows, 2).parallels.length); assert.strictEqual(P.classify(rows, null).commentary.length, 0); }
assert.deepStrictEqual(P.classify([], 1).parallels, []);
// Kommentatoren
const cs = P.commentators(cl.commentary);
assert.deepStrictEqual(cs.map(c => [c.name, c.refs.length]), [['Rashi', 2], ['Ibn Ezra', 1]]);
// Herkunft der Parallelstellen
assert.deepStrictEqual(cl.parallels.map(x => P.sourceOf(x).k), ['bible', 'bible', 'etcbc', 'josephus', 'second']);
assert.strictEqual(P.sourceOf(rows[8]).sim, '82 %');
// Mischna ↔ Talmud ist ein eigenes Fach
assert.strictEqual(P.boxOf({ other: 'Berakhot 2a:1-5', type: 'mishnah in talmud', cat: 'Talmud' }), 'mishtal');
assert.strictEqual(P.boxOf({ other: 'The War of the Jews 5:1:1', type: 'reference', cat: 'Andere' }), 'parallels');
// Zähler
const sum = P.summary({ ...cl, words: [1, 2, 3], notes: [] });
assert.strictEqual(sum.n.commentary, 3); assert.strictEqual(sum.n.words, 3); assert.strictEqual(sum.n.notes, 0);
assert.deepStrictEqual(sum.shown, ['commentary', 'parallels', 'legends', 'rabbinic', 'halakhah', 'words', 'other']);
assert.strictEqual(sum.total, 3 + 5 + 1 + 3 + 1 + 3 + 2);

// ----- Wörter (echter Westminster-Text) -----
const gen = require('./bundled/own/Genesis/he/Westminster Leningrad Codex (OSHB, mit Morphologie).json');
let ws = P.words(gen.text[0][0]);
assert.deepStrictEqual(ws.map(w => w.lemma), ['7225', '1254 a', '430', '853', '8064', '776']);
assert.strictEqual(ws[0].word, 'בְּרֵאשִׁית'); // ohne Akzente
assert.strictEqual(ws.find(w => w.lemma === '853').n, 2); // אֵת und וְאֵת: ein Eintrag, zweimal im Vers
assert.strictEqual(ws[1].m, 'HVqp3ms');
ws = P.words(gen.text[21][1]);
assert.ok(ws.some(w => w.lemma === '4179') && ws.some(w => w.lemma === '3327')); // Morija, Isaak
assert.deepStrictEqual(P.words('ohne Wörter'), []);

// ----- Gliederung / Mizwa -----
assert.deepStrictEqual(P.spans('1:27-2:5'), [[10027, 20005]]);
assert.deepStrictEqual(P.spans('15:32-37, 16:14-19'), [[150032, 150037], [160014, 160019]]);
assert.deepStrictEqual(P.spans('3'), [[30000, 39999]]);
assert.deepStrictEqual(P.spans('2a:1-5'), [[40001, 40005]]);
assert.deepStrictEqual(P.spans('2a:6-2b:3'), [[40006, 50003]]);
const ex = require('./outlines/Exodus.json');
let at = P.outlineAt(ex, '12', 6);
assert.ok(at.some(e => e.mz === 5), 'Mizwa 5 (Schlachtung des Pessachopfers) an Ex 12:6');
assert.ok(at.some(e => !e.mz && e.depth === 0));
assert.ok(at.findIndex(e => e.mz) > at.findIndex(e => !e.mz), 'Mizwot nach den Gliederungspunkten');
assert.ok(P.outlineAt(ex, '12', 2).some(e => e.mz === 4)); // „12:2, 13:10“
assert.ok(P.outlineAt(ex, '13', 10).some(e => e.mz === 4));
assert.ok(!P.outlineAt(ex, '12', 3).some(e => e.mz === 4));
const ber = require('./outlines/Berakhot.json');
at = P.outlineAt(ber, '2a', 3);
assert.strictEqual(at[0].ref, '2a:1-5');
assert.ok(at.filter(e => e.depth === 1).length <= 1); // höchstens ein (der genaueste) Unterpunkt
assert.deepStrictEqual(P.outlineAt(null, '1', 1), []);
assert.deepStrictEqual(P.outlineAt(ex, '1:2', 1), []); // Band:Kapitel (Ginzberg): keine Zuordnung

// ----- Notizen, Orte, Themen -----
const notes = [
  { id: 'a', key: 'K', sk: '[0]', row: '2', note: 'x' },
  { id: 'b', key: 'K', sk: '[0]', kind: 'block', set: [1, 2, 3] },
  { id: 'c', key: 'K', sk: '[0]', row: '3' },
  { id: 'd', key: 'K', sk: '[1]', row: '2' },
  { id: 'e', key: 'X', sk: '[0]', row: '2' },
  { id: 'f', kind: 'free', note: 'frei' },
];
assert.deepStrictEqual(P.notesAt(notes, 'K', '[0]', '2', 2).map(n => n.id), ['a', 'b']);
assert.deepStrictEqual(P.notesAt(notes, 'K', '[0]', '4', 4), []);
assert.deepStrictEqual(P.placesAt([{ i: 7, vs: [1, 2] }, { i: 9, vs: [5] }, { i: 3 }], 2), [7]);
assert.deepStrictEqual(P.topicsAt([{ slug: 'a', verses: [2, 3] }, { slug: 'b', verses: [9] }], 2).map(t => t.slug), ['a']);
console.log(`Alles zu dieser Stelle ok (${rows.length} Verknüpfungen auf ${sum.shown.length} Fächer, ${ws.length} Wörter)`);
