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
// Sefaria-Upload-Zeilen „Titel K:V<Tab>Text“ als .txt: werden als Kommentar mit Lücken eingelesen
{
  const O2 = require('./offline');
  const r = O2.parseOwn('Hertz on Deuteronomy 1:1\tEinleitung, mit Komma<br>x\nHertz on Deuteronomy 1:3\tdrittes\nHertz on Deuteronomy 2:1\tzweites Kapitel', 'x.txt');
  assert.strictEqual(r.meta.titleGuess, 'Hertz on Deuteronomy');
  assert.deepStrictEqual(r.text, [['Einleitung, mit Komma<br>x', '', 'drittes'], ['zweites Kapitel']]);
  const plain = O2.parseOwn('Erste Zeile\nZweite Zeile', 'y.txt');
  assert.strictEqual(plain.segments, 2);
  console.log('Import-Tests bestanden.');
}
// Mitgelieferte Texte: Export -> Import in frischer Bibliothek, Entfernen kommt nicht wieder
(async () => {
  const O2 = require('./offline'), fs = require('fs'), os = require('os'), path = require('path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'bund-'));
  const a = await new O2.Library(path.join(t, 'a')).load();
  await a.addOwn({ title: 'Hertz on Exodus', kind: 'de', versionTitle: 'Test', categories: ['Eigene Texte', 'Kommentare'], text: [['x']], sectionNames: ['Kapitel', 'Vers'] });
  assert.strictEqual(await a.exportBundled(path.join(t, 'b')), 1);
  const b = await new O2.Library(path.join(t, 'c')).load();
  assert.strictEqual(await b.importBundled(path.join(t, 'b')), 1);
  assert.strictEqual(await b.importBundled(path.join(t, 'b')), 0);
  const rel = Object.keys(b.index.entries)[0];
  assert.ok(fs.existsSync(path.join(t, 'c', rel)));
  await b.removeOwn(rel);
  assert.strictEqual(await b.importBundled(path.join(t, 'b')), 0);
  console.log('Bundled-Tests bestanden.');
})().catch(e => { console.error(e); process.exit(1); });
