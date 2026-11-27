#!/usr/bin/env node
// Baut lxx-ren.js: Wiedergabe hebräischer Lemmata in der Septuaginta, aufgeschlüsselt nach der Bestimmung des hebräischen Worts
// (für die Filter „Binjan, Form, Person …“ der Wortkarte). Gleiche Zuordnung wie oshb-lxx.js (lxx.js pairs).
// Format: {Lemma: [[griechisches Lemma …], [[Gruppe, OSHB-Code, Anzahl, Stellen, Originalformen je Stelle] …]]}; Stellen wie in interlin-ren.js (Buch*1000000+Kapitel*1000+Vers, Differenzen Basis 36); alle Lemmata einzeln, damit seltene Wiedergaben rückwärts auffindbar bleiben.
// Aufruf: node tools/catss/lxx-cells.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const Lxx = require(path.join(root, 'lxx.js'));
const { load } = require('./lxx-lemma.js');
// Bücher in derselben Reihenfolge wie interlin-ren.js (tools/interlinear/renderings.py), damit die Wortkarte die Stellen gleich entschlüsselt
const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job', 'Song of Songs',
  'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles'];
const b36 = refs => { let prev = 0; return refs.sort((a, b) => a - b).map(r => { const d = (r - prev).toString(36); prev = r; return d; }).join('.'); };
const acc = new Map();
for (const b of load()) { const bi = BOOKS.indexOf(b.title); for (let c = 0; c < b.he.length; c++) {
  const hv = b.he[c] || [], gv = (b.gr && b.gr[c]) || [];
  for (let v = 0; v < hv.length; v++) {
    if (typeof hv[v] !== 'string' || typeof gv[v] !== 'string') continue;
    for (const [l, g, code, form] of Lxx.pairs(hv[v], gv[v], b.lems ? b.lems(c, v) : null, true, true)) {
      let L = acc.get(l); if (!L) acc.set(l, L = new Map());
      let G = L.get(g); if (!G) L.set(g, G = new Map());
      let R = G.get(code); if (!R) G.set(code, R = []);
      R.push({ref:bi>=0?bi*1e6+(c+1)*1000+v+1:-1,form});
    }
  }
} }
const out = {};
for (const [l, L] of acc) {
  const gs = [...L].map(([g, M]) => [g, M, [...M.values()].reduce((a, b) => a + b.length, 0)]).sort((a, b) => b[2] - a[2] || (a[0] < b[0] ? -1 : 1));
  const labels = [], cells = [];
  gs.forEach(([g, M], i) => { const gi = i; labels.push(g); for (const [code, R] of M) { const ok = R.filter(r => r.ref >= 0).sort((a,b)=>a.ref-b.ref); cells.push([gi, code, R.length, b36(ok.map(r=>r.ref)),ok.map(r=>r.form)]); } });
  out[l] = [labels, cells];
}
const txt = '// Wortkarte: Wiedergabe in der Septuaginta je Bestimmung des hebräischen Worts – erzeugt mit tools/catss/lxx-cells.js aus Westminster Leningrad Codex (OSHB, CC BY 4.0), CATSS (Tov/Kraft, CC BY-NC-SA 3.0, siehe LICENSE-CATSS.md) und lxx-morph (CC BY 4.0)\n// Format: {Lemma: [[griechisches Lemma …], [[Gruppe, OSHB-Code, Anzahl, Stellen, Originalformen je Stelle] …]]}; Stellen: Buch*1000000+Kapitel*1000+Vers als Differenzen (Basis 36), Bücher wie interlin-ren.js; alle griechischen Lemmata bleiben einzeln erhalten\n// Fünftes Feld jeder Zelle: belegte Originalformen in derselben Reihenfolge wie die dekodierten Stellen; Auch seltene Lemmagruppen bleiben für die Rücksuche erhalten.\nwindow.LXX_REN=' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(root, 'lxx-ren.js'), txt);
console.log('lxx-ren.js', (txt.length / 1e6).toFixed(2), 'MB (Zeichen),', Object.keys(out).length, 'Lemmata');
