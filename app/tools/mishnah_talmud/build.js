// Zuordnung Mischna → Stelle im Babylonischen Talmud erzeugen: bundled/mishnah_talmud.json
// Quelle: Sefarias Verknüpfungen vom Typ „mishnah in talmud“, je Traktat eine JSON-Datei mit den Link-Objekten der API
// (https://www.sefaria.org/api/links/<Traktat>?with_text=0, gefiltert auf type === 'mishnah in talmud'; Felder anchorRef/ref).
// Aufruf: node tools/mishnah_talmud/build.js <Ordner mit den *.json>
'use strict';
const fs = require('fs');
const path = require('path');
const MT = require(path.join(__dirname, '..', '..', 'mishtal.js'));
const dir = process.argv[2];
if (!dir) { console.error('Aufruf: node tools/mishnah_talmud/build.js <Ordner mit den Sefaria-Link-Dateien>'); process.exit(1); }
const out = {}, names = {};
let n = 0, skipped = 0;
for (const f of fs.readdirSync(dir).filter(x => /\.json$/.test(x)).sort()) {
  const seen = new Set(), rows = [];
  for (const l of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) {
    if (!l || l.type !== 'mishnah in talmud') continue;
    const pair = [l.anchorRef, l.ref].map(String);
    const mi = pair.find(r => /^Mishnah /.test(r)), ta = pair.find(r => !/^Mishnah /.test(r));
    if (!mi || !ta) { skipped++; continue; }
    const sp = r => { const x = /^(.*?)\s+(\d+[ab]?:\d+(?:-(?:\d+[ab]?:)?\d+)?)$/.exec(r); return x ? [x[1], x[2]] : [r, '']; };
    const [mTitle, m] = sp(mi), [tract, t] = sp(ta);
    if (mTitle !== 'Mishnah ' + tract) names[tract] = mTitle; // abweichende Schreibweise (Taanit / Mishnah Ta'anit)
    if (!MT.parseMishnah(m) || !MT.parseTalmud(t)) { skipped++; console.warn('übersprungen:', mi, '|', ta); continue; }
    if (seen.has(m + '|' + t)) continue;
    seen.add(m + '|' + t);
    rows.push([m, t, tract]);
  }
  for (const [m, t, tract] of rows) { (out[tract] = out[tract] || []).push([m, t]); n++; }
}
const key = r => { const a = MT.parseMishnah(r[0]), b = MT.parseTalmud(r[1]); return [a.chap, a.n1, b.d1, b.s1]; };
for (const k of Object.keys(out)) out[k].sort((x, y) => { const a = key(x), b = key(y); for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; });
const json = '{\n' + (Object.keys(names).length ? '"~names":' + JSON.stringify(names) + ',\n' : '') + Object.keys(out).sort().map(k => JSON.stringify(k) + ':' + JSON.stringify(out[k])).join(',\n') + '\n}\n';
fs.writeFileSync(path.join(__dirname, '..', '..', 'bundled', 'mishnah_talmud.json'), json);
console.log(`${Object.keys(out).length} Traktate, ${n} Zuordnungen, ${skipped} übersprungen`);
