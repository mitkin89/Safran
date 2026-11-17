// Das echte LSJ-Paket über denselben Offline-Import und Suchdienst wie die App prüfen.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
const D = require('./dsl');
const { abbreviations, explain } = require('./tools/lsj/build');

(async () => {
  const source = require('./tools/lsj/source.json');
  const manifest = require('./bundled/dict/manifest.json');
  const item = manifest.items.find(x => x.id === source.dictionaryId);
  assert(item, 'LSJ im mitgelieferten Wörterbuchmanifest');
  assert.strictEqual(item.count, 115617);
  const packed = path.join(__dirname, 'bundled/dict', item.id + '.json.gz');
  const raw = zlib.gunzipSync(fs.readFileSync(packed));
  assert.strictEqual(crypto.createHash('sha1').update(raw).digest('hex'), item.hash);
  assert.strictEqual(item.hash, source.jsonSha1);
  const j = JSON.parse(raw);
  assert.strictEqual(j.indexLang, 'Greek');
  assert.strictEqual(j.contentsLang, 'English');
  assert.strictEqual(j.heads.length, j.html.length);
  assert.strictEqual(j.heads.reduce((n, hs) => n + hs.length, 0), 115628);
  assert(j.html.every(h => h && !/\[\/?(?:trn|lang|ref|m\d?)\b[^\]]*\]/i.test(h)), 'DSL-Auszeichnung vollständig gerendert');
  assert.deepStrictEqual(j.heads[0], ["'κτώ"]);
  assert(j.heads.some(hs => hs.includes('ὦ')), 'Omega-Artikel enthalten');
  assert(j.heads.some(hs => hs.includes('[τ]υπογράφος')), 'Escapes im Stichwort aufgelöst');
  assert.strictEqual(D.norm('ΛΌΓΟΣ'), D.norm('λογοσ'));
  assert.strictEqual(D.norm('ἄνθρωπος'), D.norm('ανθρωποσ'));
  assert(/class="dhit"/.test(D.markTerms('λόγος', D.parseQuery('λογοσ'))), 'griechische Treffer hervorgehoben');
  const map = abbreviations('\nV. General List of Abbreviations\nA. = Aeschylus\naor. = aorist\nPreface 1925\n');
  const sample = '<span class="dc dc-gray">A.</span> &amp; <span class="dc dc-darkviolet">aor.</span>';
  const annotated = explain(sample, map);
  assert(annotated.includes('data-t="Aeschylus"') && annotated.includes('data-t="aorist"'));
  assert.strictEqual(annotated.replace(/<abbr[^>]*>|<\/abbr>/g, ''), sample, 'Erklärungen verändern keinen sichtbaren Text');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'safran-lsj-'));
  try {
    // Das echte Paket isoliert importieren: keine Änderungen an der Bibliothek des Nutzers.
    const bundle = path.join(tmp, 'bundled');
    fs.mkdirSync(path.join(bundle, 'dict'), { recursive: true });
    fs.copyFileSync(packed, path.join(bundle, 'dict', item.id + '.json.gz'));
    fs.writeFileSync(path.join(bundle, 'dict/manifest.json'), JSON.stringify({ version: 1, items: [item] }));
    const ds = new D.Dictionaries(path.join(tmp, 'dict'));
    assert.strictEqual(await ds.importBundled(bundle), 1);
    assert.strictEqual(await ds.importBundled(bundle), 0, 'identisches Paket nicht erneut importieren');
    const list = await ds.list();
    assert.strictEqual(list.length, 1);
    assert(list[0].bundled && list[0].ship && list[0].count === 115617);
    const lookup = async q => (await ds.lookup(q, { only: item.id })).find(x => x.kind === 'exact');
    const logos = await lookup('λόγος');
    assert(logos && logos.html.includes('reckoning'), 'vollständiger längerer Artikel');
    for (const q of ['λογος', 'ΛΟΓΟΣ', 'λογοσ', 'λόγος']) assert.strictEqual((await lookup(q)).k, logos.k, q);
    assert((await lookup('ανθρωπος')).head.includes('ἄνθρωπος'));
    assert((await lookup('θεος')).html.includes('[dialect]'), 'sichtbare eckige Klammern erhalten');
    assert((await lookup('ζωη')).html.includes('data-t="Herodotus"'), 'Autorenkürzel erklärt');
    assert.strictEqual((await lookup('λέχω')).k, (await lookup('λέγω')).k, 'zweites Stichwort desselben Artikels');
    const alpha = await lookup('Α α');
    assert(alpha.html.includes('class="dref" data-q="εἷς"'), 'interner Verweis anklickbar');
    assert(await lookup('εἷς'), 'Verweisziel auffindbar');
    const suggestions = await ds.suggest('ανθρωπος');
    assert(suggestions.some(x => x.head.includes('ἄνθρωπος')), 'Vorschläge ohne Spiritus');
    const heads = await ds.headList(item.id);
    assert.strictEqual(heads.length, 115628);
    assert(heads.includes('λέχω') && heads.includes('ὦ'));
    const hits = await ds.search('"computation reckoning"', { only: item.id, full: true, limit: 100 });
    assert(hits.some(x => x.k === logos.k && /class="dhit"/.test(x.html)), 'englische Volltextphrase mit Hervorhebung');
    await ds.remove(item.id);
    assert.strictEqual(await ds.importBundled(bundle), 0, 'entferntes Wörterbuch bleibt entfernt');
    assert.deepStrictEqual(await ds.list(), []);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  console.log('LSJ: Paket, 115.617 Artikel / 115.628 Stichwörter, Import, griechische Suche, Verweise, Abkürzungen und Volltext geprüft.');
})().catch(e => { console.error(e); process.exitCode = 1; });
