const assert = require('assert');
const L = require('./lib');

// CSV-Roundtrip mit Komma, Anführungszeichen, Zeilenumbruch
const rows = [['Ref', 'Text'], ['Test 1:1', 'Hallo, "Welt"\nzweite Zeile'], ['Test 1:2', 'ok']];
const back = L.parseCSV(L.toCSV(rows));
assert.deepStrictEqual(back, rows);
assert.deepStrictEqual(L.parseCSV('\uFEFFa,b\r\nc,d\r\n'), [['a', 'b'], ['c', 'd']]);

// Referenzen
assert.deepStrictEqual(L.parseRef('Devarim Rabbah 1:5'), { title: 'Devarim Rabbah', chapter: 1, verse: 5, verseEnd: null });
assert.strictEqual(L.parseRef('Quatsch'), null);

// Validierung
const v = L.validateRows([
  ['Reference', 'Text'],
  ['T 1:1', 'a'],
  ['T 1:2', 'b <b>fett'],
  ['T 1:2', 'doppelt'],
  ['T 1:5', 'Lücke'],
  ['T 2:2', 'neues Kapitel falsch'],
  ['kaputt', 'x'],
]);
const msgs = v.issues.map(i => i.msg).join('|');
assert(/Doppelte Referenz/.test(msgs));
assert(/HTML-Tags/.test(msgs));
assert(/Lücke/.test(msgs));
assert(/beginnt nicht bei 1/.test(msgs));
assert(/nicht erkannt/.test(msgs));
assert.strictEqual(v.counts.T[1], 4);

// Text -> CSV
const t = L.textToRows('Kapitel 1\nEins\nZwei\nKapitel 2\nDrei', 'Buch');
assert.deepStrictEqual(t.rows, [['Buch 1:1', 'Eins'], ['Buch 1:2', 'Zwei'], ['Buch 2:1', 'Drei']]);
const t2 = L.textToRows('A\nB', 'Buch', 3);
assert.deepStrictEqual(t2.rows, [['Buch 3:1', 'A'], ['Buch 3:2', 'B']]);

// Vergleich
const cmp = L.compareSegments({ 1: 2, 2: 1 }, [2, 3]);
assert.deepStrictEqual(cmp.map(c => c.ok), [true, false]);
assert.strictEqual(cmp[1].diff, -2);

// Sefaria-Helfer
assert.strictEqual(L.stripHtml('<b>Hi</b>&nbsp;&amp;'), 'Hi &');
assert.deepStrictEqual(L.chapterLengths([['a', 'b'], ['c']]), [2, 1]);

console.log('Alle Tests bestanden.');
