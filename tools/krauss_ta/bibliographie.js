// Erzeugt tools/krauss_ta/bibliographie.json aus der Werkliste werke.js:
// Schlüssel = Kurzform, wie sie bei Krauss im Text steht (Name allein, Name + Kurztitel, Initiale + Name, Sigel),
// Wert = voller Titel. Mehrdeutige bloße Namen nennen alle Kandidaten („…; oder: …“).
// Aufruf: node tools/krauss_ta/bibliographie.js
'use strict';
const fs = require('fs');
const path = require('path');
const { werke, SIGEL } = require('./werke');

const MAX_KAND = 4;
const bib = {};
const warn = [];
const put = (k, v) => {
  if (/["<>&]/.test(v)) throw new Error(`Titel mit verbotenem Zeichen (" < > &): ${v}`);
  if (v.length > 600) throw new Error(`Titel zu lang: ${k}`);
  if (bib[k] !== undefined && bib[k] !== v) { warn.push(`doppelt: ${k}`); return; }
  bib[k] = v;
};
const kandidaten = (ws, name) => {
  const t = [...new Set(ws.map(x => x.titel))];
  if (t.length === 1) return t[0];
  return t.slice(0, MAX_KAND).join('; oder: ') + (t.length > MAX_KAND ? `; oder ein anderes Werk von ${name} (insgesamt ${t.length})` : '');
};
const wahl = (ws, name) => {
  const std = ws.filter(x => x.std);
  if (std.length) return std[0].titel;
  return ws.length ? kandidaten(ws, name) : null;
};

const namen = new Set();
for (const x of werke) x.namen.forEach(n => namen.add(n));
for (const n of namen) {
  const alle = werke.filter(x => x.namen.includes(n));
  for (const x of alle) for (const k of x.kurz) put(`${n}, ${k}`, x.titel);
  const ws = alle.filter(x => !x.nb);
  const v = wahl(ws, n);
  if (v) put(n, v);
  // Initiale vor dem Namen trennt Personen gleichen Namens (I. LÖW – L. LÖW)
  const inis = [...new Set(ws.map(x => x.ini).filter(Boolean))];
  if (inis.length > 1 || (inis.length === 1 && ws.some(x => !x.ini)))
    for (const i of inis) { const vi = wahl(ws.filter(x => x.ini === i), n); if (vi) put(`${i} ${n}`, vi); }
}
for (const [k, v] of Object.entries(SIGEL)) put(k, v);

const out = {};
for (const k of Object.keys(bib).sort((a, b) => a.localeCompare(b, 'de'))) out[k] = bib[k];
fs.writeFileSync(path.join(__dirname, 'bibliographie.json'), JSON.stringify(out, null, 1) + '\n');
const nWerke = new Set(werke.map(x => x.titel)).size;
console.log(`bibliographie.json: ${Object.keys(out).length} Kurzformen, ${nWerke} Werke, ${Object.keys(SIGEL).length} Sigel`);
if (warn.length) console.log(warn.join('\n'));
