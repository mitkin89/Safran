// node apply_clean.js <Projektordner> <gesenius_sauber.json> [--dry]
// Übernimmt die Bibelstellen-Links (hebräische Verszählung, Korrekturen eingearbeitet) aus der bereinigten Quelle
// in das App-Wörterbuch. Der übrige HTML-Aufbau der App bleibt unverändert; Zuordnung über Position der Links + Linktext.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const root = path.resolve(process.argv[2]), src = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), dry = process.argv.includes('--dry');
const dir = path.join(root, 'bundled', 'dict'), man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const it = man.items.find(x => /Gesenius/.test(x.name)), f = path.join(dir, it.id + '.json.gz');
const d = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
const byid = new Map(src.eintraege.map(e => [e.id, e]));
const plain = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, '');
const stat = { entries: 0, changed: 0, links: 0, skippedCount: [], skippedText: [] };
d.html = d.html.map((h, i) => {
  // verschachtelte Doppel-Anker (<a><a>Pr. </a><a>30</a></a>) zu einem Link zusammenfassen
  h = h.replace(/<a class="dsrc" data-sref="([^"]*)">((?:<a class="dsrc" data-sref="\1">(?:(?!<\/a>)[\s\S])*<\/a>)+)<\/a>/g, (_, r, inner) => `<a class="dsrc" data-sref="${r}">${inner.replace(/<\/?a[^>]*>/g, '')}</a>`);
  const e = byid.get(i + 1); if (!e) return h;
  const nb = []; const re = /\[bib=([^\]]*)\]([\s\S]*?)\[\/bib\]/g; let m;
  const all = e.absaetze.map(a => a.text).join('\n');
  while ((m = re.exec(all))) nb.push([m[1], m[2].replace(/\[\/?[a-z]+\]/g, '')]);
  const ar = /<a class="dsrc" data-sref="([^"]*)">([\s\S]*?)<\/a>/g, ab = []; while ((m = ar.exec(h))) ab.push([m[1], plain(m[2]), m.index, m[0].length, m[2]]);
  stat.entries++;
  if (ab.length !== nb.length) { // Quelle hat einen Link in Fragmente zerlegt: Fragmente nach Text zusammenführen, Ziel des ersten nehmen
    const g = []; let k = 0;
    for (const a of ab) { let acc = '', first = null; while (k < nb.length && acc.length < a[1].length) { first = first || nb[k][0]; acc += plain(nb[k][1]); k++; } if (acc !== a[1]) { g.length = 0; break; } g.push([first, a[1]]); }
    if (g.length !== ab.length || k !== nb.length) { stat.skippedCount.push(i + 1); return h; }
    nb.length = 0; g.forEach(x => nb.push(x));
  }
  if (ab.some((a, k) => a[1] !== plain(nb[k][1]))) { stat.skippedText.push(i + 1); return h; }
  let out = '', pos = 0, ch = false;
  ab.forEach((a, k) => { out += h.slice(pos, a[2]) + `<a class="dsrc" data-sref="${nb[k][0]}">${a[4]}</a>`; pos = a[2] + a[3]; if (a[0] !== nb[k][0]) { stat.links++; ch = true; } });
  if (ch) stat.changed++;
  return out + h.slice(pos);
});
console.log('Einträge:', stat.entries, '| geändert:', stat.changed, '| Links angepasst:', stat.links);
console.log('übersprungen (Linkanzahl):', stat.skippedCount.join(','), '| (Linktext):', stat.skippedText.join(','));
if (!dry) {
  const buf = Buffer.from(JSON.stringify(d), 'utf8'); fs.writeFileSync(f, zlib.gzipSync(buf, { level: 9 }));
  it.hash = crypto.createHash('sha1').update(buf).digest('hex'); fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(man, null, 1)); console.log('geschrieben', it.hash);
}
