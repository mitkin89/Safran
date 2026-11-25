// node abk.js <Projektordner>: Abkürzungen (abkuerzungen.json) im Levy-Talmud-Wörterbuch (Bd. 1–4) als <abbr class="gab" data-t="Auflösung"> markieren.
// Hover-Anzeige übernimmt der vorhandene Handler in library.js. Bestehende Quellenlinks (<a>) bleiben unberührt. Schreibt .json.gz + manifest.json neu.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const P = path.resolve(process.argv[2]), dir = path.join(P, 'bundled', 'dict');
const list = JSON.parse(fs.readFileSync(path.join(__dirname, 'abkuerzungen.json'), 'utf8')).eintraege.filter(e => e.tooltip);
const MAP = new Map();
for (const e of list) {
  MAP.set(e.abk, e.aufloesung);
  if (/^[a-zäöü]/.test(e.abk) && e.abk.length >= 4) { const c = e.abk[0].toUpperCase() + e.abk.slice(1); if (!MAP.has(c)) MAP.set(c, e.aufloesung[0].toUpperCase() + e.aufloesung.slice(1)); }
}
const keys = [...MAP.keys()].sort((a, b) => b.length - a.length);
const RE = new RegExp('(?<![\\p{L}\\p{N}.])(' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ \\u00A0]')).join('|') + ')(?![\\p{L}\\p{N}])', 'gu');
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
let n = 0;
const mark = html => html.replace(/<abbr class="gab"[^>]*>(.*?)<\/abbr>/g, '$1')
  .split(/(<a\b[^>]*>.*?<\/a>|<[^>]+>)/s).map((s, i) => i % 2 ? s : s.replace(RE, (m, k) => { const t = MAP.get(k.replace(/\u00A0/g, ' ')); if (!t) return m; n++; return `<abbr class="gab" data-t="${esc(t)}">${m}</abbr>`; })).join('');
const mf = path.join(dir, 'manifest.json'), man = JSON.parse(fs.readFileSync(mf, 'utf8'));
const it = man.items.find(x => /Wörterbuch \(Bd\. 1–4\)/.test(x.name)); if (!it) throw new Error('Levy Bd. 1–4 nicht im Manifest');
const f = path.join(dir, it.id + '.json.gz'), d = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
d.html = d.html.map(mark);
const buf = Buffer.from(JSON.stringify(d), 'utf8');
fs.writeFileSync(f, zlib.gzipSync(buf, { level: 9 }));
it.hash = crypto.createHash('sha1').update(buf).digest('hex');
fs.writeFileSync(mf, JSON.stringify(man, null, 1));
console.log('Abkürzungen markiert:', n, it.id, it.hash);
