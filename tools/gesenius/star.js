// node star.js <Projektordner>: im Gesenius (Handwörterbuch 1915) das Kreuz † (Zeichen für "alle Stellen angegeben") durch ein hochgestelltes ✡ ersetzen
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const dir = path.join(path.resolve(process.argv[2]), 'bundled', 'dict');
const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const it = man.items.find(x => /Gesenius/.test(x.name)); if (!it) throw new Error('Gesenius nicht im Manifest');
const f = path.join(dir, it.id + '.json.gz'), d = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
const STAR = '<sup class="gstar">✡︎</sup>'; let n = 0;
d.html = d.html.map(h => h.replace(/<sup class="gstar">[^<]*<\/sup>/g, '†').replace(/†/g, () => { n++; return STAR; }));
const buf = Buffer.from(JSON.stringify(d), 'utf8');
fs.writeFileSync(f, zlib.gzipSync(buf, { level: 9 }));
it.hash = crypto.createHash('sha1').update(buf).digest('hex');
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(man, null, 1));
console.log('† ersetzt:', n, it.hash);
