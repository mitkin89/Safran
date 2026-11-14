// Verknüpfungen aus den mitgelieferten eigenen Texten (bundled/own) erzeugen: jede Stellenangabe im Text
// (vorhandene <a class="aref" data-sref> und von autoref.js erkannte Bibelstellen) wird zu einer Verknüpfung
// in beide Richtungen und landet in bundled/links/<Buch>.tsv (Format wie die Sefaria-Links: Stelle, Gegenstelle, Typ, Kategorie).
// Aufruf: node tools/ownlinks/build.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const A = require(path.join(ROOT, 'autoref.js'));
const LK = require(path.join(ROOT, 'links.js'));
const SHAPE = JSON.parse(fs.readFileSync(path.join(__dirname, 'tanakh_shape.json'), 'utf8'));
const safe = s => String(s || '_').replace(/[\\:*?"<>|\u0000-\u001f\/]/g, '_').replace(/^\.+$/, '_').replace(/[. ]+$/, '').slice(0, 150) || '_';
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'bundled', 'manifest.json'), 'utf8')).items;
const SKIP = new Set(['Legends of the Jews']); // hat schon eigene Verknüpfungen aus Ginzbergs Noten

// Kategorie, unter der eine Stelle im Verknüpfungs-Reiter erscheint
const catOf = new Map();
for (const e of man) if (!catOf.has(e.title)) {
  const c = e.categories || [];
  catOf.set(e.title, c[0] === 'Eigene Texte' ? (c[1] === 'Kommentare' ? 'Commentary' : 'Eigene Texte') : (c[0] || 'Eigene Texte'));
}
const cat = book => SHAPE[book] ? 'Tanakh' : (catOf.get(book) || (/^Mishnah /.test(book) ? 'Mishnah' : 'Andere'));

// Stelle prüfen (Tanach: Kapitel/Vers vorhanden)
function valid(ref) {
  const { book, tail } = LK.splitRef(ref);
  const sh = SHAPE[book];
  if (!sh) return !!tail;
  const m = tail.match(/^(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) return false;
  const c = +m[1], v = +m[2], w = m[3] ? +m[3] : v;
  return c >= 1 && c <= sh.length && v >= 1 && v <= sh[c - 1] && w >= v && w <= sh[c - 1];
}
const dafOf = i => `${Math.floor(i / 2) + 1}${i % 2 ? 'b' : 'a'}`;

const out = new Map(); // Buch -> Set(Zeilen)
const add = (book, line) => { let s = out.get(book); if (!s) out.set(book, (s = new Set())); s.add(line); };
let nRefs = 0;
const perBook = new Map();
for (const e of man) {
  if (!e.rel.startsWith('own/') || SKIP.has(e.title)) continue;
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(ROOT, 'bundled', e.rel), 'utf8')); } catch { continue; }
  // mehrteilige Werke (Objekt): Standardteil „“ unter dem Titel, weitere Teile als „Titel, Teil“ (z. B. „…, Preface“)
  const parts = Array.isArray(d.text) ? [[e.title, d.text]] : Object.entries(d.text || {}).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k ? `${e.title}, ${k}` : e.title, v]);
  const daf = (d.sectionNames || [])[0] === 'Daf';
  const base = (e.title.match(/^.+? on (.+)$/) || [])[1] || null; // Kommentar zu …
  for (const [srcTitle, partText] of parts) {
  const walk = (node, addr) => {
    if (Array.isArray(node)) { node.forEach((x, i) => walk(x, addr.concat(i))); return; }
    if (typeof node !== 'string' || !/\d|[א-ת]/.test(node)) return;
    const html = A.link(node, { last: '' });
    const refs = new Set([...html.matchAll(/data-sref="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&').replace(/–/g, '-').trim()));
    if (!refs.size) return;
    const tail = addr.map((x, k) => (k === 0 && daf ? dafOf(x) : String(x + 1))).join(':');
    const src = `${srcTitle} ${tail}`;
    for (const r of refs) {
      if (!valid(r)) continue;
      const { book: tb, tail: tt } = LK.splitRef(r);
      if (tb === e.title) continue; // Verweise innerhalb desselben Buchs
      if (base && tb === base && tt.split('-')[0] === tail.split(':').slice(0, 2).join(':')) continue; // Kommentar auf seinen eigenen Vers
      add(srcTitle, `${tail}\t${r}\treference\t${cat(tb)}`);
      add(tb, `${tt}\t${src}\treference\t${cat(e.title)}`);
      nRefs++;
      perBook.set(e.title, (perBook.get(e.title) || 0) + 1);
    }
  };
  walk(partText, []);
  }
}

// mit den vorhandenen Dateien zusammenführen (vorhandene Zeilen bleiben, Doppeltes fällt weg)
const dir = path.join(ROOT, 'bundled', 'links');
let files = 0, lines = 0;
for (const [book, set] of out) {
  const p = path.join(dir, safe(book) + '.tsv');
  let have = [];
  try { have = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean); } catch { /* neu */ }
  const seen = new Set(have);
  const neu = [...set].filter(l => !seen.has(l));
  if (!neu.length) continue;
  fs.writeFileSync(p, have.concat(neu).join('\n') + '\n');
  files++; lines += neu.length;
}
console.log(`Stellen ${nRefs}, neue Zeilen ${lines} in ${files} Dateien`);
console.log([...perBook].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([b, n]) => `${n}\t${b}`).join('\n'));
