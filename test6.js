const assert = require('assert');
const D = require('./diff');
const O = require('./order');
const L = require('./lib');
const Links = require('./links');
// Wortvergleich
assert.strictEqual(D.wordDiff('a b c', 'a b c').same, true);
assert.ok(D.diffHtml('im Anfang schuf Gott', 'am Anfang schuf Gott').includes('<del class="wd">im</del>'));
assert.ok(D.diffHtml('a <b>', 'a').includes('&lt;b&gt;'));
// Reihenfolge wie Sefaria
assert.deepStrictEqual(O.sortTitles(['Exodus', 'Genesis', 'Psalms', 'Joshua'], x => x), ['Genesis', 'Exodus', 'Joshua', 'Psalms']);
assert.deepStrictEqual(O.sortTitles(['Zzz Buch', 'Genesis'], x => x), ['Genesis', 'Zzz Buch']);
// Upload-CSV
assert.deepStrictEqual(L.parseCSV(L.toCSV([['Genesis 1:1', 'Im "Anfang", ok']])), [['Genesis 1:1', 'Im "Anfang", ok']]);
assert.deepStrictEqual(L.textToRows('Kapitel 2\nA\nB', 'Genesis').rows, [['Genesis 2:1', 'A'], ['Genesis 2:2', 'B']]);
// Kommentartext-Auflösung bei Werken mit Standardteil
const data = { text: { '': [['x', 'y'], ['z']] }, sectionNames: [] };
assert.ok(Links.resolveText(data, '1:2'));
console.log('Zusatz-Tests bestanden.');
