// node build.js <datei.dsl> <Projektordner>: BDB als mitgeliefertes Wörterbuch in <Projekt>/bundled/dict eintragen (die vorhandenen bleiben)
const fs = require('fs'), os = require('os'), path = require('path');
const P = path.resolve(process.argv[3]); const DSL = require(path.join(P, 'dsl.js'));
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bdb-'));
  const d = new DSL.Dictionaries(tmp);
  await d.importBundled(path.join(P, 'bundled'));            // vorhandene mitgelieferte
  for (const x of await d.list()) await d.setShip(x.id, true);
  const r = await d.add(fs.readFileSync(process.argv[2]), 'bdb.dsl');
  await d.setShip(r.id, true);
  const n = await d.exportBundled(path.join(P, 'bundled'));
  console.log('Wörterbücher im Paket:', n, r);
})();
