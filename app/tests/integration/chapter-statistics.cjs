// Statistik eines Kapitels (passage.js stats): Leitwörter, Namen, Häufigkeitsstufen, Verbstämme
const assert = require('assert');
const P = require('../../passage.js');
const mk = (lemma, pos, n, stems) => ({ lemma, pos, n, word: lemma, raw: lemma, stems: stems || {} });
const T = { a: 50000, b: 40, c: 1, d: 300, e: 28, f: 14, g: 600, h: 9 };
const ws = [mk('a', 'Präposition', 20), mk('b', 'Nomen', 10), mk('c', 'Verb', 1, { 'Pi‘el': 1 }), mk('d', 'Nomen', 5), mk('e', 'Nomen', 26), mk('f', 'Eigenname', 12), mk('g', 'Verb', 4, { Qal: 3, 'Nif‘al': 1 }), mk('h', 'Nomen', 2)];
const BK = { b: 40, e: 28, h: 9 }; // Belege im selben Buch
const st = P.stats(ws, { tot: l => T[l], N: 300000, verses: 31, bookTot: l => BK[l] || 0 });
assert.strictEqual(st.words, 80);
assert.strictEqual(st.lemmas, 8);
assert.ok(!st.lead.some(r => ['a', 'f'].includes(r.w.lemma)), 'weder Funktionswörter noch Namen unter den Leitwörtern');
assert.strictEqual(st.lead[0].w.lemma, 'e', 'e (26 von 28) ist das typischste Wort');
assert.ok(!st.lead.some(r => r.w.lemma === 'h'), 'h kommt nur 2× vor und ist nicht selten genug');
assert.deepStrictEqual(st.names.map(r => r.w.lemma), ['f']);
assert.strictEqual(st.tiers.find(t => t.key === '1').items[0].w.lemma, 'c');
assert.ok(st.tiers.find(t => t.key === '>500').items.some(r => r.w.lemma === 'g'));
assert.deepStrictEqual(st.vocab.map(r => r.w.lemma), ['c', 'h', 'e', 'b'], 'Vokabeln (unter 100 Belege): selten zuerst');
assert.deepStrictEqual(st.only.map(r => r.w.lemma).sort(), ['b', 'e', 'h']);
assert.deepStrictEqual(st.stems.map(x => x.stem).sort(), ['Nif‘al', 'Pi‘el', 'Qal']);
assert.strictEqual(st.stems[0].stem, 'Qal');
assert.strictEqual(P.stats([], { tot: l => 1, N: 1, verses: 0 }), null);
assert.ok(P.BOXES.includes('stats'));
console.log('Kapitelstatistik ok');
