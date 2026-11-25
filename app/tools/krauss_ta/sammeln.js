// Krauss, Talmudische Archäologie: Vollzitate und gesperrte Autorennamen maschinell sammeln – Arbeitsgrundlage für werke.js.
//   vollzitate.json – je Name die Stellen, an denen ein Werk vollständig genannt wird
//                     (Initialen + NAME, Titel, Ort Jahr; z. B. „FR. HELLWALD, Haus und Hof …, Leipz. 1888“)
//   namen.tsv       – alle Namen in Großbuchstaben mit ≥ 3 Vorkommen: Anzahl, Vollzitate, Werke in werke.js
// Aufruf: node tools/krauss_ta/sammeln.js
'use strict';
const fs = require('fs');
const path = require('path');
const { werke, SIGEL } = require('./werke');

const REL = 'own/Talmudische Archäologie/de/Samuel Krauss, Talmudische Archäologie, Bände I–III (Leipzig 1910–1912) – Transkription mit Claude.json';
const book = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'bundled', REL), 'utf8'));

// Klartext je Absatz; Fußnoten als „[Fn: …]“ an ihrer Stelle
const absaetze = [];
book.text.forEach((sec, i) => sec.forEach((p, j) => absaetze.push({
  stelle: `§${i + 1}.${j}`,
  t: p.replace(/<img[^>]*>/g, ' ').replace(/<sup class="footnote-marker">[^<]*<\/sup><i class="footnote">/g, ' [Fn: ')
    .replace(/<abbr[^>]*>|<\/abbr>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'),
})));

const NAME = '[A-ZÄÖÜÉ][A-ZÄÖÜÉßŠ]+(?:-[A-ZÄÖÜÉ][A-ZÄÖÜÉßŠ]+)?';
const ROEM = /^(?:[IVXLC]+|LXX|IMG|LAA|FN)$/; // römische Zahlen u. ä. sind keine Autoren
const anzahl = new Map();
const voll = new Map();
const VOLL = new RegExp(`((?:[A-ZÄÖÜ][A-Za-zäöü]?\\.\\s)*)(${NAME})(\\.?,\\s+|\\s+\\()([^;\\]]{4,220}?\\b1[5-9]\\d\\d\\b(?:[—–-]\\d{2,4})?)`, 'gu');
for (const { stelle, t } of absaetze) {
  for (const m of t.matchAll(new RegExp(`(?<![\\p{L}])${NAME}(?![\\p{L}])`, 'gu'))) if (!ROEM.test(m[0]) && m[0].length > 2) anzahl.set(m[0], (anzahl.get(m[0]) || 0) + 1);
  for (const m of t.matchAll(VOLL)) {
    const [, ini, n, , titel] = m;
    if (ROEM.test(n) || SIGEL[n]) continue;
    const kopf = titel.split(/\.\s+(?=[A-ZÄÖÜ]{2,})/)[0]; // nicht über das nächste gesperrte Zitat hinaus
    if (!/\b1[5-9]\d\d\b/.test(kopf) || /^\s*(?:S\.|p\.|\d)/.test(kopf)) continue;
    const vn = ini.replace(/^(?:[IVX]+\.\s)+/, ''); // „III. J. MARQUARDT“: III. gehört zum vorigen Zitat
    (voll.get(n) || voll.set(n, []).get(n)).push({ zitat: `${vn}${n}, ${kopf.trim()}`, stelle });
  }
}

const inWerke = new Map();
for (const x of werke) for (const n of x.namen) inWerke.set(n.replace(/\.$/, ''), (inWerke.get(n.replace(/\.$/, '')) || 0) + 1);
const zeilen = [...anzahl].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1])
  .map(([n, c]) => [n, c, (voll.get(n) || []).length, SIGEL[n] ? 'Sigel' : (inWerke.get(n) || 0)].join('\t'));
fs.writeFileSync(path.join(__dirname, 'namen.tsv'), 'Name\tVorkommen\tVollzitate\tWerke in werke.js\n' + zeilen.join('\n') + '\n');
const vz = {};
for (const n of [...voll.keys()].sort((a, b) => a.localeCompare(b, 'de'))) vz[n] = voll.get(n);
fs.writeFileSync(path.join(__dirname, 'vollzitate.json'), JSON.stringify(vz, null, 1) + '\n');
const ohne = zeilen.map(z => z.split('\t')).filter(z => z[3] === '0').map(z => `${z[0]} (${z[1]})`);
console.log(`${zeilen.length} Namen mit ≥ 3 Vorkommen, ${[...voll.values()].reduce((a, b) => a + b.length, 0)} Vollzitate zu ${voll.size} Namen`);
console.log('ohne Eintrag in werke.js:', ohne.join(', '));
