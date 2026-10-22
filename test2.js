const assert = require('assert');
const S = require('./sefaria');

assert.strictEqual(S.encRef('Genesis 1:1'), 'Genesis_1:1');
assert.strictEqual(S.encRef('Devarim Rabbah 1'), 'Devarim_Rabbah_1');
assert.strictEqual(S.versionParams('hebrew, german|Mein Titel'), 'version=hebrew&version=german%7CMein%20Titel');
assert.strictEqual(S.textUrl('Genesis 1', ''), '/api/v3/texts/Genesis_1');
assert.strictEqual(S.textUrl('Genesis 1', 'hebrew'), '/api/v3/texts/Genesis_1?version=hebrew');

// Kapitelreferenz mit Versen
assert.deepStrictEqual(S.segmentsFromText('Genesis 1', ['a', '', 'c']), [['Genesis 1:1', 'a'], ['Genesis 1:3', 'c']]);
// einzelner Vers als String
assert.deepStrictEqual(S.segmentsFromText('Genesis 1:1', 'x'), [['Genesis 1:1', 'x']]);
// tiefer verschachtelt
assert.deepStrictEqual(S.segmentsFromText('X 1', [['a', 'b'], ['c']]), [['X 1:1:1', 'a'], ['X 1:1:2', 'b'], ['X 1:2:1', 'c']]);
// HTML entfernen
assert.deepStrictEqual(S.segmentsFromText('X 1', ['<b>fett</b> &amp; gut'], true), [['X 1:1', 'fett & gut']]);

// Shape
assert.deepStrictEqual(S.shapeLengths([{ chapters: [31, 25, 24] }]), [31, 25, 24]);
assert.deepStrictEqual(S.shapeLengths([{ chapters: [[1, 2], [3]] }]), [2, 1]);
assert.strictEqual(S.shapeLengths({ error: 'x' }), null);

// URL -> Buchtitel
assert.strictEqual(S.titleFromSefariaUrl('https://www.sefaria.org/Genesis.1.1?lang=en'), 'Genesis');
assert.strictEqual(S.titleFromSefariaUrl('https://www.sefaria.org/Rashi_on_Genesis.1.1.1'), 'Rashi on Genesis');
assert.strictEqual(S.titleFromSefariaUrl('https://www.sefaria.org/Devarim_Rabbah.1'), 'Devarim Rabbah');
assert.strictEqual(S.titleFromSefariaUrl('https://www.sefaria.org/texts'), '');
assert.strictEqual(S.titleFromSefariaUrl('https://www.sefaria.org/topics/abraham'), '');
assert.strictEqual(S.titleFromSefariaUrl('https://www.sefaria.org/'), '');
assert.strictEqual(S.titleFromSefariaUrl('https://example.com/Genesis.1'), '');

console.log('Sefaria-Tests bestanden.');
