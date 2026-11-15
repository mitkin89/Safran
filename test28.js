// Statistik eines Kapitels (passage.js stats): häufigste, typische und einmalige Wörter
const assert = require('assert');
const P = require('./passage.js');
const mk = (lemma, pos, n) => ({ lemma, pos, n, word: lemma, raw: lemma });
const T = { a: 50000, b: 40, c: 1, d: 300, e: 28 };
const ws = [mk('a', 'Präposition', 20), mk('b', 'Nomen', 10), mk('c', 'Verb', 1), mk('d', 'Nomen', 5), mk('e', 'Nomen', 26)];
const st = P.stats(ws, l => T[l], 300000, 31);
assert.strictEqual(st.words, 62);
assert.strictEqual(st.lemmas, 5);
assert.ok(st.top.every(r => r.w.lemma !== 'a'), 'Präpositionen nicht in der Rangliste');
assert.strictEqual(st.top[0].w.lemma, 'e');
assert.strictEqual(st.typical[0].w.lemma, 'e', 'e (26 von 28) ist am typischsten');
assert.ok(!st.typical.some(r => r.w.lemma === 'a'));
assert.deepStrictEqual(st.hapax.map(r => r.w.lemma), ['c']);
assert.strictEqual(P.stats([], l => 1, 1, 0), null);
assert.ok(P.BOXES.includes('stats'));
console.log('Kapitelstatistik ok');
