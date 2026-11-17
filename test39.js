// Bereinigter Pape: vollständiger Artikeltext-Hash, Suchindex, Bilder, Verweise und griechische Wortkarten.
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib'), vm = require('vm'), os = require('os');
const D = require('./dsl'), G = require('./gmorph'), source = require('./tools/pape/source.json');
const item = require('./bundled/dict/manifest.json').items.find(x => x.id === source.dictionaryId);
const packed = fs.readFileSync(path.join(__dirname, 'bundled/dict', source.dictionaryId + '.json.gz'));
const raw = zlib.gunzipSync(packed), data = JSON.parse(raw);
const sha = (b, kind = 'sha256') => crypto.createHash(kind).update(b).digest('hex');
const greek = s => /\p{Script=Greek}/u.test(s);
const clean = s => s.replace(/[-\u00ad\u2010\u2011]/g, '');
const plain = s => s.replace(/<(?:br\b[^>]*|\/?(?:p|div)\b[^>]*)>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot);|&#(?:x[\da-f]+|\d+);/gi, m => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' }[m] || String.fromCodePoint(m[2].toLowerCase() === 'x' ? parseInt(m.slice(3, -1), 16) : parseInt(m.slice(2, -1), 10)))).replace(/[\s\u0085\u001c-\u001f]+/g, ' ').trim();
function index(buf) {
  const out = []; let p = 0;
  while (p < buf.length) { const q = buf.indexOf(0, p); assert(q >= p && q + 9 <= buf.length); out.push([buf.toString('utf8', p, q), buf.readUInt32BE(q + 1), buf.readUInt32BE(q + 5)]); p = q + 9; }
  return out;
}
assert.strictEqual(sha(raw, 'sha1'), item.hash); assert.strictEqual(item.hash, source.jsonSha1);
assert.strictEqual(data.heads.length, 98833); assert.strictEqual(source.removedLatinEntries.length, 60);
assert.strictEqual(data.heads.length, data.html.length); assert.strictEqual(data.keys.length, data.html.length);
assert(data.heads.every(hs => hs.every(h => greek(h) && clean(h) === h)));
assert(data.keys.every(hs => hs.every(h => greek(h) && clean(h) === h)));
const text = crypto.createHash('sha256');
for (let k = 0; k < data.html.length; k++) text.update(data.heads[k][0] + '\0' + plain(data.html[k]) + '\n');
assert.strictEqual(text.digest('hex'), source.articleTextSha256, 'Text aller 98.833 Artikel gegen Quelle');
assert.strictEqual(data.html.reduce((n, h) => n + (h.match(/<img src="data:image\//g) || []).length, 0), 17);
assert.strictEqual(data.html.reduce((n, h) => n + (h.match(/class="dref"/g) || []).length, 0), source.crossReferences);
assert(!data.html.some(h => /style=|<script\b|<iframe\b|<img src="(?!data:)/i.test(h)), 'Bilder offline, Farben erben das App-Design');

// Optionaler unabhängiger Vollabgleich mit den vom Nutzer gelieferten StarDict-Dateien.
if (process.argv[2]) {
  const file = process.argv[2], original = fs.readFileSync(file), rows = index(fs.readFileSync(file.replace(/\.dict$/, '.idx')));
  assert.strictEqual(sha(original), source.sourceSha256);
  const lower = s => Buffer.from(s).map(v => v >= 65 && v <= 90 ? v + 32 : v);
  const kept = rows.map((r, old) => ({ original: r[0], head: clean(r[0]), offset: r[1], size: r[2], old })).filter(r => greek(r.original));
  kept.sort((a, b) => Buffer.compare(lower(a.head), lower(b.head)) || Buffer.compare(Buffer.from(a.head), Buffer.from(b.head)) || a.old - b.old);
  assert.strictEqual(kept.length, data.heads.length);
  const exportData = process.argv[3] && fs.readFileSync(process.argv[3]);
  const exported = exportData && index(fs.readFileSync(process.argv[3].replace(/\.dict$/, '.idx')));
  if (exported) assert.strictEqual(exported.length, kept.length);
  for (let k = 0; k < kept.length; k++) {
    const r = kept[k], originalBody = original.toString('utf8', r.offset, r.offset + r.size);
    const expected = originalBody.replace(/(<b>)([\s\S]*?)(<\/b>)/, (_, a, b, c) => a + clean(b) + c);
    assert.strictEqual(data.heads[k][0], r.head); assert.strictEqual(plain(data.html[k]), plain(expected), r.original);
    if (exported) { const [head, off, size] = exported[k]; assert.strictEqual(head, r.head); assert.strictEqual(exportData.toString('utf8', off, off + size), expected); }
  }
  if (exported) {
    const readSyn = buf => { let p = 0; const out = []; while (p < buf.length) { const q = buf.indexOf(0, p); assert(q >= p && q + 5 <= buf.length); out.push([buf.toString('utf8', p, q), buf.readUInt32BE(q + 1)]); p = q + 5; } return out; };
    const oldToNew = new Map(kept.map((r, i) => [r.old, i]));
    const expectedAliases = new Set();
    for (const [word, target] of readSyn(fs.readFileSync(file.replace(/\.dict$/, '.syn')))) {
      if (!greek(word) || !oldToNew.has(target)) continue;
      const id = oldToNew.get(target), cleaned = clean(word);
      if (cleaned !== kept[id].head) expectedAliases.add(JSON.stringify([cleaned, id]));
    }
    const actual = readSyn(fs.readFileSync(process.argv[3].replace(/\.dict$/, '.syn')));
    for (const [word, target] of actual) {
      assert(greek(word) && clean(word) === word && target < kept.length);
      assert(expectedAliases.delete(JSON.stringify([word, target])), 'Alias korrekt neu zugeordnet: ' + word);
    }
    assert.strictEqual(expectedAliases.size, 0, 'alle erhaltenen Alias-Zugänge erfasst');
    const info = Object.fromEntries(fs.readFileSync(process.argv[3].replace(/\.dict$/, '.ifo'), 'utf8').split('\n').filter(s => s.includes('=')).map(s => [s.slice(0, s.indexOf('=')), s.slice(s.indexOf('=') + 1)]));
    assert.strictEqual(Number(info.wordcount), exported.length); assert.strictEqual(Number(info.synwordcount), actual.length);
    assert.strictEqual(Number(info.idxfilesize), fs.statSync(process.argv[3].replace(/\.dict$/, '.idx')).size);
  }
  console.log('Originaldatei und bereinigtes StarDict: alle erhaltenen Artikel vollständig verglichen.');
}
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'safran-pape-'));
  try {
    const dir = path.join(tmp, 'bundle/dict'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, item.id + '.json.gz'), packed); fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ version: 1, items: [item] }));
    const ds = new D.Dictionaries(path.join(tmp, 'dict'));
    assert.strictEqual(await ds.importBundled(path.join(tmp, 'bundle')), 1);
    const r = await ds.lookup('ευρυεδης', { only: item.id });
    assert(r.some(x => x.kind === 'exact' && x.head === 'εὐρυέδης' && !x.html.includes('<b>εὐρυ-έδης</b>')));
    for (const q of ['echo', 'Lundinium', 'interstes', 'lumbus', 'logos']) assert.strictEqual((await ds.lookup(q)).length, 0, 'lateinisches Stichwort/Alias entfernt: ' + q);
    const brother = (await ds.lookup('ἀδελφός')).find(x => x.kind === 'exact'); assert(brother && brother.html.includes('Geschwister'));
    const ctx = vm.createContext({ window: {} }); vm.runInContext(fs.readFileSync(path.join(__dirname, 'lxx-morph.js'), 'utf8'), ctx);
    assert(G.dictionaryLemmas(ctx.window.LXX_MORPH, brother.head).includes('ἀδελφός'), 'Verbindung zur griechischen Wortkarte');
    const hits = await ds.search('brüderlich Geschwister', { only: item.id, full: true }); assert(hits.some(x => x.k === brother.k));
    const refs = data.html.find(h => /class="dref"/.test(h)), target = /data-q="([^"]+)"/.exec(refs)[1]; assert((await ds.lookup(target)).length > 0);
    assert.strictEqual((await ds.headList(item.id)).includes('εὐρυέδης'), true);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  console.log('Pape: 98.833 griechische Artikel, keine lateinischen Zugänge/Trennstriche, Bilder, Verweise, Suche und Wortkarten geprüft.');
})().catch(e => { console.error(e); process.exitCode = 1; });
