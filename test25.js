// Rückwärtsindex der Wörterbuch-Zitate: „In Wörterbüchern“ am Vers (dsl.js citesAt) und das neue Fach in passage.js
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const D = require('./dsl'), P = require('./passage');
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cites-'));
  const ds = new D.Dictionaries(path.join(tmp, 'dict'));
  await ds.importBundled(path.join(__dirname, 'bundled'));
  const C = await ds.buildCites();
  const n = [...C.idx.values()].reduce((s, a) => s + a.length / 4, 0);
  assert.ok(n > 300000, 'Zitate im Index: ' + n);
  const gen = await ds.citesAt('Genesis', '12', 1);
  assert.ok(gen.length > 5 && gen.every(x => x.dictId && x.head), 'Genesis 12,1');
  assert.ok(gen.some(x => x.exact), 'genaue Treffer');
  // genaue Treffer stehen vor Angaben zum ganzen Kapitel
  const firstWide = gen.findIndex(x => !x.exact); assert.ok(firstWide < 0 || gen.slice(firstWide).every(x => !x.exact));
  const bk = await ds.citesAt('Berakhot', '2a', 1);
  assert.ok(Array.isArray(bk));
  assert.deepStrictEqual(await ds.citesAt('Gibt es nicht', '1', 1), []);
  assert.ok(P.BOXES.includes('dicts') && P.BOXES.indexOf('dicts') > P.BOXES.indexOf('words'));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`Wörterbuch-Zitate rückwärts ok (${Math.round(n).toLocaleString('de')} Angaben, Genesis 12,1: ${gen.length} Artikel)`);
})().catch(e => { console.error(e); process.exit(1); });
