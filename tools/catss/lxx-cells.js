#!/usr/bin/env node
// Baut lxx-ren.js: Wiedergabe hebräischer Lemmata in der Septuaginta, aufgeschlüsselt nach der Bestimmung des hebräischen Worts
// (für die Filter „Binjan, Form, Person …“ der Wortkarte). Gleiche Zuordnung wie oshb-lxx.js (lxx.js pairs).
// Format: {Lemma: [[griechisches Lemma …], [[Gruppe, OSHB-Code, Anzahl] …]]}; die 30 häufigsten Lemmata einzeln, alle weiteren als Gruppe 30 („*“ = Andere).
// Aufruf: node tools/catss/lxx-cells.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const Lxx = require(path.join(root, 'lxx.js'));
const { load } = require('./lxx-lemma.js');
const acc = new Map();
for (const b of load()) for (let c = 0; c < b.he.length; c++) {
  const hv = b.he[c] || [], gv = (b.gr && b.gr[c]) || [];
  for (let v = 0; v < hv.length; v++) {
    if (typeof hv[v] !== 'string' || typeof gv[v] !== 'string') continue;
    for (const [l, g, code] of Lxx.pairs(hv[v], gv[v], b.lems ? b.lems(c, v) : null, true)) {
      let L = acc.get(l); if (!L) acc.set(l, L = new Map());
      let G = L.get(g); if (!G) L.set(g, G = new Map());
      G.set(code, (G.get(code) || 0) + 1);
    }
  }
}
const out = {};
for (const [l, L] of acc) {
  const gs = [...L].map(([g, M]) => [g, M, [...M.values()].reduce((a, b) => a + b, 0)]).sort((a, b) => b[2] - a[2] || (a[0] < b[0] ? -1 : 1));
  const labels = [], cells = [];
  gs.forEach(([g, M], i) => { const gi = Math.min(i, 30); if (i <= 30) labels.push(i === 30 ? '*' : g); for (const [code, n] of M) cells.push([gi, code, n]); });
  out[l] = [labels, cells];
}
const txt = '// Wortkarte: Wiedergabe in der Septuaginta je Bestimmung des hebräischen Worts – erzeugt mit tools/catss/lxx-cells.js aus Westminster Leningrad Codex (OSHB, CC BY 4.0), CATSS (Tov/Kraft, CC BY-NC-SA 3.0, siehe LICENSE-CATSS.md) und lxx-morph (CC BY 4.0)\n// Format: {Lemma: [[griechisches Lemma …], [[Gruppe, OSHB-Code, Anzahl] …]]}; Gruppe 30 = alle weiteren („*“)\nwindow.LXX_REN=' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(root, 'lxx-ren.js'), txt);
console.log('lxx-ren.js', (txt.length / 1e6).toFixed(2), 'MB (Zeichen),', Object.keys(out).length, 'Lemmata');
