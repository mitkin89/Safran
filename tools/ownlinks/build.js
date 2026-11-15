// Verknüpfungen aus den mitgelieferten eigenen Texten (bundled/own) erzeugen: jede Stellenangabe im Text
// (vorhandene <a class="aref" data-sref> und von autoref.js erkannte Bibelstellen) wird zu einer Verknüpfung
// in beide Richtungen und landet in bundled/links/<Buch>.tsv (Format wie die Sefaria-Links: Stelle, Gegenstelle, Typ, Kategorie).
// Zählung: Stellen aus Texten, die nicht hebräisch zitieren (bundled/versification.json, Feld „cites“), rechnet autoref.js über versemap.js
// in Sefarias Zählung um; in hebräisch zitierenden Texten werden Stellen, die es hebräisch nicht gibt, als englische Zählung
// gelesen („Joel 3, 11“ -> Joel 4:11). Zeilen, die ein früherer Lauf mit der unveränderten Angabe geschrieben hat, werden dabei ersetzt.
// Aufruf: node tools/ownlinks/build.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const A = require(path.join(ROOT, 'autoref.js'));
const LK = require(path.join(ROOT, 'links.js'));
const SHAPE = JSON.parse(fs.readFileSync(path.join(__dirname, 'tanakh_shape.json'), 'utf8'));
const VM = require(path.join(ROOT, 'versemap.js'));
let VCFG = { rules: [] };
try { VCFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'bundled', 'versification.json'), 'utf8')); } catch { /* ohne Tabelle: alles hebräisch */ }
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

// Krauss zitiert die Mechiltha de-R. Jischmael nach Exodusvers und Seite der alten Ausgabe („Mekh zu Exod 15,2 p. 37ᵃ“): ein Vers genügt,
// um sie den Mechiltha-Stellen zuzuordnen, die Sefaria mit diesem Exodusvers verknüpft (Mechiltha des R. Schimon bar Jochai: „Mekh RSbJ“ – nicht enthalten)
const MEK_FROM = 'Talmudische Archäologie';
const MEK_RE = /Mekh(?!\w*\s+R[SŠ])\w*\.?\s+(?:zu\s+|z\.\s*)?(?:Exod|Ex)\.?\s*(\d+)\s*,\s*(\d+)/g;
const mekByVerse = new Map(); // „15:2“ -> [Mechiltha-Stellen]
try {
  for (const l of fs.readFileSync(path.join(ROOT, 'bundled', 'links', 'Exodus.tsv'), 'utf8').split('\n')) {
    const [t, r] = l.split('\t');
    if (!r || !/^Mekhilta DeRabbi Yishmael, Tractate /.test(r)) continue;
    const m = t.match(/^(\d+):(\d+)(?:-(\d+))?$/); if (!m) continue;
    for (let v = +m[2]; v <= (m[3] ? +m[3] : +m[2]); v++) { const k = `${m[1]}:${v}`; (mekByVerse.get(k) || mekByVerse.set(k, []).get(k)).push(r); }
  }
} catch { /* ohne Exodus-Verknüpfungen */ }
let nMek = 0;

const out = new Map(); // Buch -> Set(Zeilen)
const add = (book, line) => { let s = out.get(book); if (!s) out.set(book, (s = new Set())); s.add(line); };
const stale = new Map(); // Buch -> Set(Zeilen mit der nicht umgerechneten Angabe; fallen weg, wenn sie nicht auch richtig entstehen)
const drop = (book, line) => { let s = stale.get(book); if (!s) stale.set(book, (s = new Set())); s.add(line); };
let nRefs = 0, nConv = 0, nGuess = 0;
const convBy = new Map(), convEx = [];
const perBook = new Map();
for (const e of man) {
  if (!e.rel.startsWith('own/') || SKIP.has(e.title)) continue;
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(ROOT, 'bundled', e.rel), 'utf8')); } catch { continue; }
  // mehrteilige Werke (Objekt): Standardteil „“ unter dem Titel, weitere Teile als „Titel, Teil“ (z. B. „…, Preface“)
  const parts = Array.isArray(d.text) ? [[e.title, d.text]] : Object.entries(d.text || {}).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k ? `${e.title}, ${k}` : e.title, v]);
  const daf = (d.sectionNames || [])[0] === 'Daf';
  const base = (e.title.match(/^.+? on (.+)$/) || [])[1] || null; // Kommentar zu …
  const trad = VM.tradOf(VCFG, e, 'cites'); // Zählung der Stellenangaben dieses Textes
  for (const [srcTitle, partText] of parts) {
  const walk = (node, addr) => {
    if (Array.isArray(node)) { node.forEach((x, i) => walk(x, addr.concat(i))); return; }
    if (typeof node !== 'string' || !/\d|[א-ת]/.test(node)) return;
    if (srcTitle === MEK_FROM && mekByVerse.size) {
      const plain = node.replace(/<[^>]+>/g, '');
      const mt = addr.map(x => String(x + 1)).join(':');
      for (const m of plain.matchAll(MEK_RE)) {
        const sr = (A.link(`Exod. ${m[1]},${m[2]}`, { last: '', trad }).match(/data-sref="([^"]+)"/) || [])[1]; // Zählung des Textes -> Sefaria
        const e1 = sr && sr.match(/^Exodus (\d+):(\d+)/); if (!e1) continue;
        for (const r of mekByVerse.get(`${e1[1]}:${e1[2]}`) || []) {
          const { book: tb, tail: tt } = LK.splitRef(r);
          add(srcTitle, `${mt}\t${r}\treference\tMidrash`);
          add(tb, `${tt}\t${srcTitle} ${mt}\treference\t${cat(e.title)}`);
          nMek++;
        }
      }
    }
    const html = A.link(node, { last: '', trad });
    const clean = x => x.replace(/&amp;/g, '&').replace(/–/g, '-').trim();
    const refs = new Set(), orig = new Map(); // umgerechnete Stelle -> Angabe im Text
    for (const m of html.matchAll(/<a class="aref" data-sref="([^"]+)"(?: data-oref="([^"]+)" data-vt="([a-z]+)")?/g)) {
      const r = clean(m[1]);
      if (m[2]) {
        // läuft die umgerechnete Stelle über eine Kapitelgrenze („Joel 3:3-4:2“), zählt für die Verknüpfung ihr Anfang
        const r1 = /^(.*\s\d+:\d+)-\d+:\d+$/.test(r) ? r.replace(/-\d+:\d+$/, '') : r;
        refs.add(r1); orig.set(r1, [clean(m[2]), m[3]]);
      } else refs.add(r);
    }
    if (!refs.size) return;
    const tail = addr.map((x, k) => (k === 0 && daf ? dafOf(x) : String(x + 1))).join(':');
    const src = `${srcTitle} ${tail}`;
    for (const r of refs) {
      if (!valid(r)) continue;
      const { book: tb, tail: tt } = LK.splitRef(r);
      const o = orig.get(r);
      if (o) {
        nConv++; if (trad === 'heb') nGuess++;
        convBy.set(e.versionTitle, (convBy.get(e.versionTitle) || 0) + 1);
        if (convEx.length < 400) convEx.push(`${src}: ${o[0]} (${o[1]}) -> ${r}`);
        if (valid(o[0]) && !refs.has(o[0])) { // die unveränderte Angabe gibt es hebräisch auch: ein früherer Lauf hat sie so verknüpft
          const { book: ob, tail: ot } = LK.splitRef(o[0]);
          drop(srcTitle, `${tail}\t${o[0]}\treference\t${cat(ob)}`);
          drop(ob, `${ot}\t${src}\treference\t${cat(e.title)}`);
        }
      }
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
let files = 0, lines = 0, removed = 0;
for (const book of new Set([...out.keys(), ...stale.keys()])) {
  const set = out.get(book) || new Set(), old = stale.get(book) || new Set();
  const p = path.join(dir, safe(book) + '.tsv');
  let have = [];
  try { have = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean); } catch { /* neu */ }
  const keep = have.filter(l => !old.has(l) || set.has(l)); // Zeilen mit der nicht umgerechneten Angabe fallen weg
  const seen = new Set(keep);
  const neu = [...set].filter(l => !seen.has(l));
  if (!neu.length && keep.length === have.length) continue;
  fs.writeFileSync(p, keep.concat(neu).join('\n') + '\n');
  files++; lines += neu.length; removed += have.length - keep.length;
}
console.log(`Mechiltha-Zuordnungen aus Krauss (über Exodusvers): ${nMek}`);
console.log(`Stellen ${nRefs}, neue Zeilen ${lines}, entfernte Zeilen ${removed} in ${files} Dateien`);
console.log(`in Sefarias Zählung umgerechnet: ${nConv} Stellen (davon ${nGuess} in hebräisch zitierenden Texten, weil es die Angabe hebräisch nicht gibt)`);
if (process.argv.includes('--verbose')) console.log(convEx.join('\n'));
if (convBy.size) console.log([...convBy].sort((a, b) => b[1] - a[1]).map(([b, n]) => `  ${n}\t${b}`).join('\n'));
console.log([...perBook].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([b, n]) => `${n}\t${b}`).join('\n'));
