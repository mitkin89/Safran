// Oberflächensprache: Englisch-Tabelle (i18n.js) – jede Vorlage passt auf ihren eigenen Beispieltext, alle data-i18n-Absätze haben eine Übersetzung
const fs = require('fs'), assert = require('assert');
global.window = global; global.localStorage = { getItem: () => 'en', setItem() {} }; global.navigator = { language: 'de' };
global.document = { body: null, addEventListener() {}, documentElement: {} }; global.location = { reload() {} }; global.MutationObserver = class { observe() {} };
global.alert = global.confirm = global.prompt = () => {};
const src = fs.readFileSync(__dirname + '/i18n.js', 'utf8');
eval(src); // eslint-disable-line no-eval
const I = global.I18N;
assert.strictEqual(I.lang, 'en');
// Einträge der Tabelle: aus dem Quelltext lesen (exakte Schlüssel und Vorlagen)
const EN = (() => { const m = /const EN = (\{[\s\S]*?\n  \});/.exec(src); return eval('(' + m[1] + ')'); })();
let n = 0;
for (const [k, v] of Object.entries(EN)) {
  const sample = k.replace(/\s+/g, ' ').trim().replace(/\{#\}/g, '7').replace(/\{\}/g, 'Xy');
  const vals = [...sample.matchAll(/7|Xy/g)].map(x => x[0]); let i = 0;
  const expected = v.replace(/\{\}/g, () => vals[i++]);
  assert.strictEqual(I.tr(sample), expected, `Falsche Übersetzung für: ${k}`);
  n++;
}
// einzelne Fälle
assert.strictEqual(I.tr('  Suche  '), '  Search  ');
assert.strictEqual(I.tr('Auswahl: 2 Kategorien, 1 Buch'), 'Selection: 2 categories, 1 book');
assert.strictEqual(I.tr('Unbekannter deutscher Text'), 'Unbekannter deutscher Text');
assert.strictEqual(I.t('{#} Treffer in {#} {} ({#} von {#} Dateien durchsucht)', '12+', 3, 'Büchern', 40, 100), '12+ matches in 3 books (40 of 100 files searched)');
assert.strictEqual(I.t('Kein Englischer Text zu diesem Vers:'), 'No English text for this verse:');
// jedes data-i18n der HTML-Datei hat einen englischen Absatz
const html = fs.readFileSync(__dirname + '/library.html', 'utf8');
const ids = [...html.matchAll(/data-i18n="(h\d+)"/g)].map(m => m[1]);
const H = (() => { const m = /const HTML = (\{[\s\S]*?\n  \});/.exec(src); return eval('(' + m[1] + ')'); })();
for (const id of ids) assert.ok(H[id], 'fehlt: ' + id);
console.log(`i18n ok (${n} Einträge, ${ids.length} Absätze)`);
