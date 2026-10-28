// Suche: einfache Treffer, Lemma/Westminster-Wörter und Abbruch
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const { searchFiles } = require('./searchcore');
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-'));
  const mk = (rel, t) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), JSON.stringify({ title: t, text: [['Im Anfang schuf Gott', 'und die Erde'], ['Gott sprach']] })); };
  mk('a/Genesis.json', 'Genesis'); mk('b/Exodus.json', 'Exodus');
  const entries = [{ rel: 'a/Genesis.json', title: 'Genesis', kind: 'de', categories: ['Tanakh'] }, { rel: 'b/Exodus.json', title: 'Exodus', kind: 'de', categories: ['Tanakh'] }];
  const base = { query: 'gott', extra: [], distance: -1, ordered: false, fuzzy: false, prefix: false, kinds: ['de'], categories: [], titles: [], limit: 50 };
  const r = await searchFiles({ dir, entries, params: base, onProgress() {}, isCancelled: () => false });
  assert.strictEqual(r.results.length, 4);
  assert.ok(!r.cancelled);
  const c = await searchFiles({ dir, entries, params: base, onProgress() {}, isCancelled: () => true });
  assert.ok(c.results.length < 4);
  const none = await searchFiles({ dir, entries, params: { ...base, query: 'xyzxyz' }, onProgress() {}, isCancelled: () => false });
  assert.strictEqual(none.results.length, 0);
  // Cache: gleiche Ergebnisse mit und ohne Cache, zweiter Lauf liest aus dem Cache, geänderte Datei wird neu gebaut
  const cd = path.join(dir, '.cache');
  const sig = x => JSON.stringify(x.results.map(y => [y.rel, y.path, y.snippet]));
  const c1 = await searchFiles({ dir, entries, cacheDir: cd, params: base, onProgress() {}, isCancelled: () => false });
  const c2 = await searchFiles({ dir, entries, cacheDir: cd, params: base, onProgress() {}, isCancelled: () => false });
  assert.strictEqual(sig(c1), sig(r)); assert.strictEqual(sig(c2), sig(r));
  assert.ok(fs.readdirSync(cd).some(f => f.endsWith('.n')));
  await new Promise(x => setTimeout(x, 20));
  fs.writeFileSync(path.join(dir, 'a/Genesis.json'), JSON.stringify({ title: 'Genesis', text: [['Kein Treffer hier']] }));
  const c3 = await searchFiles({ dir, entries, cacheDir: cd, params: base, onProgress() {}, isCancelled: () => false });
  assert.strictEqual(c3.results.length, 2); // nur noch Exodus
  // Grammatik-Suche (Westminster-Morphologiecodes)
  const W = (m, l, w) => `<span class="w" data-l="${l}" data-m="${m}">${w}</span>`;
  fs.mkdirSync(path.join(dir, 'w'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'w/Genesis.json'), JSON.stringify({ title: 'Genesis', sectionNames: ['Chapter', 'Verse'], text: [[
    W('HVqp3ms', 'b/1254 a', 'בָּרָא') + ' ' + W('HNcmpa', '430', 'אֱלֹהִים'),
    W('HC/Vqw3ms', 'c/559', 'וַיֹּאמֶר') + ' ' + W('HVhp3ms', '914', 'הִבְדִּיל'),
  ]] }));
  const went = [{ rel: 'w/Genesis.json', title: 'Genesis', kind: 'he', versionTitle: 'Westminster Leningrad Codex (OSHB, mit Morphologie)', categories: ['Tanakh'] }];
  const gp = g => ({ ...base, query: '', kinds: ['he'], gram: g });
  const g1 = await searchFiles({ dir, entries: went, params: gp({ pos: 'V', stem: 'q' }), onProgress() {}, isCancelled: () => false });
  assert.strictEqual(g1.results.length, 2); // Qal-Verben: בָּרָא und וַיֹּאמֶר (V mit Präfix-Konjunktion)
  const g2 = await searchFiles({ dir, entries: went, params: gp({ pos: 'V', tense: 'w' }), onProgress() {}, isCancelled: () => false });
  assert.strictEqual(g2.results.length, 1); assert.deepStrictEqual(g2.results[0].path, [0, 1]);
  const g3 = await searchFiles({ dir, entries: went, params: gp({ stem: 'h', person: '3', gender: 'm', number: 's' }), onProgress() {}, isCancelled: () => false });
  assert.strictEqual(g3.results.length, 1);
  const g4 = await searchFiles({ dir, entries: went, params: gp({ pos: 'N', number: 'p' }), onProgress() {}, isCancelled: () => false });
  assert.strictEqual(g4.results.length, 1); assert.ok(g4.results[0].words.length === 1);
  const g5 = await searchFiles({ dir, entries: went, params: { ...gp({ pos: 'V' }), query: 'ברא' }, onProgress() {}, isCancelled: () => false });
  assert.strictEqual(g5.results.length, 1); // Verb UND Wort ברא
  console.log('Such-Tests ok');
})().catch(e => { console.error(e); process.exit(1); });
