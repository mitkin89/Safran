// node apply_corrections.js <Projektordner> [--dry]: wendet tools/gesenius/korrekturprotokoll.md auf das Gesenius-Wörterbuch an
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const root = path.resolve(process.argv[2]), dry = process.argv.includes('--dry');
const dir = path.join(root, 'bundled', 'dict');
const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const it = man.items.find(x => /Gesenius/.test(x.name));
const f = path.join(dir, it.id + '.json.gz'), d = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
const NIQ = /[֑-ׇ]/g, strip = s => s.normalize('NFC').replace(NIQ, '');
const bb = s => s.replace(/\[b\]/g, '<b>').replace(/\[\/b\]/g, '</b>').replace(/\[i\]/g, '<i>').replace(/\[\/i\]/g, '</i>');
const text = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
const SKIP = new Set([3012, 4319, 4382, 6372, 8583]); // laut Protokoll "im Druck prüfen"
const rows = fs.readFileSync(path.join(__dirname, 'korrekturprotokoll.md'), 'utf8').split('\n').filter(l => /^\| \d+ \|/.test(l))
  .map(l => l.trim().replace(/^\||\|$/g, '').split(' | ').map(x => x.trim())).filter(c => c.length === 7);
const A = /<a class="dsrc" data-sref="([^"]*)">([\s\S]*?)<\/a>/g;
let done = 0, skipped = [], missing = [];
for (const [id, lem, art, vor, nach, lq, ln] of rows) {
  const n = +id;
  if (SKIP.has(n)) { skipped.push([id, lem, art]); continue; }
  let hit = null;
  const order = [n, n - 1, n + 1, n - 2, n + 2].filter(i => i >= 0 && i < d.html.length);
  for (const i of order) {
    if (!d.heads[i].some(h => strip(h) === strip(lem))) continue;
    const h = d.html[i]; let m; A.lastIndex = 0;
    while ((m = A.exec(h))) if (m[1] === lq && text(m[2]).trim() === text(bb(vor)).trim()) { hit = { i, m }; break; }
    if (hit) break;
  }
  if (!hit) { // Notlösung: gleiche Stelle in beliebigem Eintrag mit passendem Lemma
    for (let i = 0; i < d.html.length && !hit; i++) {
      if (!d.heads[i].some(h => strip(h) === strip(lem))) continue;
      let m; A.lastIndex = 0;
      while ((m = A.exec(d.html[i]))) if (m[1] === lq && text(m[2]).trim() === text(bb(vor)).trim()) { hit = { i, m }; break; }
    }
  }
  if (!hit) { missing.push([id, lem, vor, lq]); continue; }
  const { i, m } = hit, inner = nach === vor ? m[2] : (/<[^>]+>/.test(m[2]) && text(bb(nach)) === text(m[2]) ? m[2] : bb(nach).replace(/&/g, '&amp;'));
  const rep = ln === '–' ? inner : `<a class="dsrc" data-sref="${ln}">${inner}</a>`;
  d.html[i] = d.html[i].slice(0, m.index) + rep + d.html[i].slice(m.index + m[0].length); done++;
}
console.log('angewendet:', done, '| übersprungen (im Druck prüfen):', skipped.length, '| nicht gefunden:', missing.length);
skipped.forEach(s => console.log(' skip', s.join(' | '))); missing.forEach(s => console.log(' MISSING', s.join(' | ')));
if (!dry) {
  const buf = Buffer.from(JSON.stringify(d), 'utf8');
  fs.writeFileSync(f, zlib.gzipSync(buf, { level: 9 }));
  it.hash = crypto.createHash('sha1').update(buf).digest('hex');
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(man, null, 1));
  console.log('geschrieben', it.hash);
}
