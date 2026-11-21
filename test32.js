// Private Interlinear-Zuordnungen: ausschließlich künstliche Testtexte.
const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { validate, plain, matchLibrary, PrivateInterlinear } = require('./private-interlinear');
const wrap = verses => ({ BuberRosenzweig: { Genesis: verses } });
const verse = text => [[[1], text]];
const raw = wrap({ '1:1': verse('Alpha Beta.'), '1:2': verse('Gamma.') });
const entries = [
  { title: 'Genesis', versionTitle: 'Test Martin Buber gemeinsam mit Franz Rosenzweig', rel: 'de' },
  { title: 'Genesis', versionTitle: 'Westminster Test', rel: 'he' },
];
const docs = { de: { text: [['Alpha <b>Beta.</b>', 'Gamma.']] }, he: { text: [['<span class="w">א</span>', '<span class="w">ב</span>']] } };
const lib = { list: () => entries, read: async rel => docs[rel] };

(async () => {
  assert.deepStrictEqual(validate(raw), raw);
  for (const bad of [null, [], {}, { Zunz: {} }, { BuberRosenzweig: {} }, { BuberRosenzweig: { '../outside': {} } }, wrap({ '0:1': verse('X') }), wrap({ '1:1': [[[0], 'X']] }), wrap({ '1:1': [[[1, 1], 'X']] }), wrap({ '1:1': [[[1.5], 'X']] }), wrap({ '1:1': [[[1], 'X', 'extra']] }), JSON.parse('{"BuberRosenzweig":{"__proto__":{}}}')]) assert.throws(() => validate(bad));
  assert.strictEqual(plain('A<sup class="footnote-marker">1</sup><i class="footnote">B <i>C</i></i> &amp; &#x44;'), 'A & D');
  assert.deepStrictEqual((await matchLibrary(raw, lib, true)).data, raw);
  await assert.rejects(matchLibrary(wrap({ '1:1': verse('Other.') }), lib, true), /Text weicht ab/);
  await assert.rejects(matchLibrary(wrap({ '1:1': [[[2], 'Alpha Beta.']] }), lib, true), /Wortnummer/);
  await assert.rejects(matchLibrary(wrap({ '1:3': verse('X') }), lib, true), /Vers/);
  await assert.rejects(matchLibrary(raw, { list: () => [], read: lib.read }, true), /zuerst/);
  assert.deepStrictEqual((await matchLibrary(raw, { list: () => [], read: lib.read })).data, { BuberRosenzweig: {} });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'safran-il-'));
  try {
    const file = path.join(dir, 'private', 'interlinear.json');
    const store = new PrivateInterlinear(file, async () => lib);
    assert.deepStrictEqual((await store.read()).data, { BuberRosenzweig: {} });
    assert.deepStrictEqual(await store.import(raw), { books: 1, verses: 2 });
    assert.deepStrictEqual((await new PrivateInterlinear(file, async () => lib).read()).data, raw);
    const saved = await fs.readFile(file, 'utf8');
    await assert.rejects(store.import(wrap({ '1:1': verse('Wrong') })), /Text weicht ab/);
    assert.strictEqual(await fs.readFile(file, 'utf8'), saved); // fehlgeschlagener Import ersetzt keine Daten
    docs.de.text[0][0] = 'Changed.';
    const changed = await store.read();
    assert.deepStrictEqual(changed.data, { BuberRosenzweig: {} });
    assert(changed.skipped[0].includes('Text weicht ab')); // geänderter Textstand wird nicht falsch verknüpft
    docs.de.text[0][0] = 'Alpha <b>Beta.</b>';
    await store.import(wrap({ '1:1': verse('Alpha Beta.') }));
    assert.deepStrictEqual(Object.keys((await store.read()).data.BuberRosenzweig.Genesis), ['1:1']); // entfernte Verse bleiben nicht als Altbestand
    assert.deepStrictEqual(await fs.readdir(path.dirname(file)), ['interlinear.json']);
    await fs.writeFile(file, 'not json');
    await assert.rejects(store.read());
    await assert.rejects(store.import(raw)); // beschädigten Speicher nicht stillschweigend überschreiben
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
  const js = await fs.readFile(path.join(__dirname, 'library.js'), 'utf8');
  const html = await fs.readFile(path.join(__dirname, 'library.html'), 'utf8');
  const display = await fs.readFile(path.join(__dirname, 'library-interlinear.js'), 'utf8');
  assert(display.includes("'Qumran', 'BuberRosenzweig'")); // vorhandene Farben nicht verschieben
  assert(js.includes('O.interlinearRead()') && display.includes('O.interlinearImport()'));
  assert(html.includes('id="importInterlinear"'));
  // Tatsächlichen Loader mit künstlichem IPC prüfen: Cache, Ersetzen, vorhandene Fassungen.
  const block = js.slice(js.indexOf("  let ilP = null, ilRevision"), js.indexOf('  const IL_VT ='));
  assert(block.includes('const loadIL'));
  let local = { data: raw }, calls = 0;
  const button = {}, built = { Zunz: { synthetic: true } }, alerts = [];
  const ctx = { window: { INTERLIN: built }, $: () => button, $$: () => [],
    ilRenP: null, wcTrState: null, I18N: { t: (s, x) => s.replace('{}', x) }, alert: x => alerts.push(x), ilPick: [], ilSave() {},
    lazyScript: async () => built,
    O: { interlinearRead: async () => { calls++; return local; }, onInterlinearChanged() {}, interlinearImport: async () => ({ verses: 1 }) },
  };
  ctx.wordCardsUI = ctx; // live adapter for shared rendering caches
  ctx.ilRefresh = () => ctx.testIL.loadIL();
  const importer = display.slice(display.indexOf("  $('#importInterlinear').onclick"), display.indexOf('  // Jede deutsche Übersetzung'));
  vm.runInNewContext(block + importer + '\nglobalThis.testIL = { loadIL, resetPrivateIL };', ctx);
  assert((await ctx.testIL.loadIL()).Zunz.synthetic);
  assert.equal(Object.keys((await ctx.testIL.loadIL()).BuberRosenzweig.Genesis).length, 2);
  assert.equal(calls, 1);
  local = { data: wrap({ '1:2': verse('Gamma.') }) };
  await button.onclick();
  assert.deepStrictEqual(Object.keys(ctx.window.INTERLIN.BuberRosenzweig.Genesis), ['1:2']);
  assert(ctx.ilPick.includes('BuberRosenzweig'));
  local = { error: 'Synthetic read failure' };
  await ctx.testIL.resetPrivateIL();
  assert(ctx.window.INTERLIN.Zunz.synthetic && !ctx.window.INTERLIN.BuberRosenzweig);
  assert(alerts.some(s => s.includes('Synthetic read failure')));
  const pkg = JSON.parse(await fs.readFile(path.join(__dirname, 'package.json'), 'utf8'));
  assert(pkg.build.files.includes('!private/**') && pkg.build.files.includes('!interlin-buber*'));
  console.log('Private Interlinear-Tests bestanden.');
})().catch(err => { console.error(err); process.exit(1); });
