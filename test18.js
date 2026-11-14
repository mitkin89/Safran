// Suchfeld: mehrere Wörter = alle in der Nähe, "…" = genau diese Wortfolge, „Auch Wortteile“ (partial), mehr als drei Wörter
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const S = require('./search');
const { searchFiles } = require('./searchcore');
(async () => {
  // ----- Zerlegung des Suchfelds -----
  const P = s => S.parseQuery(s).map(u => (u.quoted ? '"' + u.words.join(' ') + '"' : u.words.join('+')));
  assert.deepStrictEqual(P('gott erde'), ['gott', 'erde']);
  assert.deepStrictEqual(P('  Anf*  "Himmel und Erde" gott '), ['anf*', '"himmel und erde"', 'gott']);
  assert.deepStrictEqual(P('„Himmel und Erde“ »im Anfang«'), ['"himmel und erde"', '"im anfang"']);
  assert.deepStrictEqual(P('רש"י אמר'), ['רש+י', 'אמר']); // Anführungszeichen mitten im Wort ist kein Begrenzer
  assert.deepStrictEqual(P('"רש"י אמר"'), ['"רש י אמר"']);
  assert.deepStrictEqual(P('בְּרֵאשִׁית בָּרָא'), ['בראשית', 'ברא']); // ohne Vokalzeichen
  assert.deepStrictEqual(P('gott, "erde"'), ['gott', '"erde"']);
  assert.deepStrictEqual(P('" ,'), []);
  assert.deepStrictEqual(P('a b c d e'), ['a', 'b', 'c', 'd', 'e']);

  // ----- Wortfolgen im Vergleich -----
  const T = 'im anfang schuf gott den himmel und die erde und die erde war wüst';
  const M = (terms, o = {}) => S.makeMatcher({ terms, ...o })(T);
  assert.deepStrictEqual(M([['himmel', 'und', 'die', 'erde']]).idx, [5, 6, 7, 8]);
  assert.strictEqual(M([['himmel', 'die']]), null); // nicht direkt hintereinander
  assert.deepStrictEqual(M([['die', 'erde'], 'wüst'], { distance: 1 }).idx, [10, 11, 13]); // die zweite „die Erde“ liegt nah genug
  assert.strictEqual(M([['die', 'erde'], 'wüst'], { distance: 0 }), null);
  assert.strictEqual(M(['wüst', ['die', 'erde']], { distance: 3, ordered: true }), null);
  assert.ok(M(['wüst', ['die', 'erde']], { distance: 3 }));
  assert.strictEqual(M([['die', 'erde'], ['erde', 'war']], { distance: 0 }), null); // kein Wort doppelt belegt („die Erde“ 10–11 und „Erde war“ 11–12 überlappen)
  assert.deepStrictEqual(M([['die', 'erde'], ['erde', 'war']], { distance: 2 }).idx, [7, 8, 11, 12]);
  assert.ok(M(['anfang', 'gott', 'himmel', 'erde', 'wüst'], { distance: 5, ordered: true })); // mehr als drei Wörter
  assert.strictEqual(M(['anfang', 'gott', 'himmel', 'erde', 'wüst'], { distance: 1, ordered: true }), null);
  assert.strictEqual(M(['anf', 'wüs']), null);
  assert.deepStrictEqual(M([{ seq: ['anf'], partial: true }, { seq: ['wüs'], partial: true }]).idx, [1, 13]);
  // alte Aufrufe (nur Wörter) verhalten sich wie bisher
  assert.deepStrictEqual(M(['gott', 'erde'], { distance: 10 }).idx, [3, 8]);
  assert.deepStrictEqual(M(['gott']).idx, [3]);

  // ----- Suche über Dateien -----
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf18-'));
  const mk = (rel, t, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), JSON.stringify({ title: t, text })); };
  mk('a/Genesis.json', 'Genesis', [[
    'Im Anfang schuf Gott den Himmel und die Erde.', // 0
    'Und die Erde war wüst und leer, und Gottes Geist schwebte.', // 1
    'Gott nannte das Trockene Erde; Himmel, und Erde nicht.', // 2
    'Die Erde, der Himmel und Gott am Anfang.', // 3
  ]]);
  mk('h/Bereschit.json', 'Bereschit', [['אָמַר רַבִּי יוֹחָנָן בעיר דוד', 'ואמר רש"י בְּעִיר שֶׁל דָּוִד', 'דוד אמר לעיר']]);
  const de = [{ rel: 'a/Genesis.json', title: 'Genesis', kind: 'de', categories: ['Tanakh'] }];
  const he = [{ rel: 'h/Bereschit.json', title: 'Bereschit', kind: 'he', versionTitle: 'Test', categories: ['Talmud'] }];
  const base = { extra: [], distance: 10, ordered: false, fuzzy: false, prefix: false, exact: false, lemma: false, limit: 50, parse: true };
  const run = async (entries, p) => (await searchFiles({ dir, entries, params: { ...base, ...p } })).results.map(r => r.path[1]);

  assert.deepStrictEqual(await run(de, { query: 'gott erde', partial: true }), [0, 1, 2, 3]); // „Gottes“ zählt als Wortteil
  assert.deepStrictEqual(await run(de, { query: 'gott erde' }), [0, 2, 3]); // ganze Wörter
  assert.deepStrictEqual(await run(de, { query: 'gott erde', exact: true }), [0, 2, 3]);
  assert.deepStrictEqual(await run(de, { query: 'gott erde', ordered: true }), [0, 2]);
  assert.deepStrictEqual(await run(de, { query: 'gott erde', distance: 3 }), [2, 3]);
  assert.deepStrictEqual(await run(de, { query: '"himmel und die erde"', partial: true }), [0]); // genau diese Wortfolge
  assert.deepStrictEqual(await run(de, { query: '„Himmel und Erde“', partial: true }), [2]); // Satzzeichen dazwischen stören nicht
  assert.deepStrictEqual(await run(de, { query: '"die erde" gott', partial: true }), [0, 1, 3]);
  assert.deepStrictEqual(await run(de, { query: '"gott"', partial: true }), [0, 2, 3]); // ein Wort in Anführungszeichen: ganzes Wort
  assert.deepStrictEqual(await run(de, { query: 'gott', partial: true }), [0, 1, 2, 3]); // ein Wort: wie bisher als Textstück
  assert.deepStrictEqual(await run(de, { query: 'anfang gott himmel erde', partial: true }), [0, 3]); // vier Wörter
  assert.deepStrictEqual(await run(de, { query: 'anfang gott himmel erde', ordered: true }), [0]);
  assert.deepStrictEqual(await run(de, { query: 'anf* got? erde' }), [0, 3]);
  assert.deepStrictEqual(await run(de, { query: 'got erde', fuzzy: true }), []); // „got“ ist für Fuzzy zu kurz
  assert.deepStrictEqual(await run(de, { query: 'himel erde', fuzzy: true }), [0, 2, 3]);
  const hl = (await searchFiles({ dir, entries: de, params: { ...base, query: '"die erde" wüst' } })).results[0];
  assert.deepStrictEqual(hl.words, ['die', 'erde', 'wüst']); // Markierung: alle Wörter der Wortfolge

  // ohne parse: das frühere Verhalten (zwei Wörter im Feld = Textstück)
  assert.deepStrictEqual(await run(de, { query: 'gott erde', parse: false }), []);
  assert.deepStrictEqual(await run(de, { query: 'die erde', parse: false }), [0, 1, 3]);
  assert.deepStrictEqual(await run(de, { query: 'gott', extra: ['erde'], parse: false }), [0, 2, 3]);

  // hebräisch: Vorsilben, Wortfolge, Abkürzung mit Anführungszeichen
  assert.deepStrictEqual(await run(he, { query: 'עיר דוד', prefix: true }), [0, 1, 2]);
  assert.deepStrictEqual(await run(he, { query: 'עיר דוד', exact: true }), []);
  assert.deepStrictEqual(await run(he, { query: '"עיר דוד"', prefix: true }), [0]);
  assert.deepStrictEqual(await run(he, { query: '"עיר דוד"', exact: true }), []);
  assert.deepStrictEqual(await run(he, { query: 'עיר דוד', prefix: true, ordered: true, distance: 0 }), [0]);
  assert.deepStrictEqual(await run(he, { query: 'רש"י אמר', prefix: true }), [1]);
  assert.deepStrictEqual(await run(he, { query: 'אמר', prefix: true }), [0, 1, 2]);
  assert.deepStrictEqual(await run(he, { query: 'אמר', exact: true }), [0, 2]);
  assert.deepStrictEqual(await run(he, { query: 'אמ יוח', partial: true }), [0]);
  console.log('Mehrwort-Suche ok');
})().catch(e => { console.error('FEHLER', e.stack); process.exit(1); });
