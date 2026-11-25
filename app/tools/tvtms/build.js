#!/usr/bin/env node
// Versumrechnung zwischen Zähltraditionen: baut versemap-data.js aus TVTMS
// („Translators Versification Traditions with Methodology for Standardisation“, STEPBible.org / Tyndale House Cambridge, CC BY 4.0).
//
// Quelle (nicht im Projekt, vorher holen):
//   git clone https://github.com/STEPBible/STEPBible-Data      Datei: Versification/TVTMS - … - STEPBible.org CC BY.txt
//   optional lxx-morph (https://github.com/OpenScriptorium/lxx-morph, Rahlfs). TVTMS führt neben „Greek“ oft „Greek2“, „GreekUndivided“ …
//   für andere Ausgaben, und Rahlfs zählt stellenweise schlicht hebräisch (z. B. Gen 32, Ex 22, Lev 6, Dtn 13). Mit lxx-morph wird deshalb je
//   Abschnitt die Spalte gewählt, der Rahlfs tatsächlich folgt: (1) Wortlaut – die mitgelieferten CATSS-Fassungen zählen hebräisch, ihr Text
//   wird mit dem Rahlfs-Vers der jeweiligen Spalte verglichen; (2) die Tests von TVTMS („Jer.25:19=Last“ …) am Versbestand von Rahlfs;
//   (3) wie viele Verse der Spalte es bei Rahlfs gar nicht gibt. Passt danach ein einzelner Vers im Wortlaut nicht, steht derselbe Wortlaut
//   aber in einem der Kapitel des Abschnitts, gilt diese Stelle (Jer 49 = Rahlfs 30 …). Die Ausgabe nennt alle Abweichungen (--verbose).
// Aufruf:
//   node tools/tvtms/build.js <TVTMS-Datei oder STEPBible-Data> [<lxx-morph>]            schreibt versemap-data.js
//   node tools/tvtms/build.js <TVTMS-Datei oder STEPBible-Data> [<lxx-morph>] --check    nur Zahlen, nichts schreiben
//
// Gelesen wird die „Condensed Version“ der Datei: je Abschnitt eine Tabelle mit den Spalten English (KJV/NRSV), Hebrew (MT), Latin (Vulgata),
// Greek (LXX) und weiteren Ausgaben. Übernommen werden die vier Traditionen
//   heb  hebräisch (masoretisch; so zählt Sefaria und damit Safran)        eng  englisch (KJV/NRSV)
//   lat  lateinisch (Vulgata)                                             grk  griechisch (Septuaginta nach Rahlfs)
// für die 39 Bücher des Tanach, mit Sefaria-Buchtiteln. Eine deutsche (Luther-)Tradition führt TVTMS nicht (nur drei Sonderfälle in
// Ps 54, 64 und 127); sie wird deshalb nicht erzeugt.
// Ausgabe: je Buch Zeilen [eng, heb, lat, grk]; jede Zelle ist eine Versliste („32:2-33“, „37:1,37:2.1“ mit Teilvers, „51:0“ = Überschrift
// ohne Verszahl), „“ = der Vers fehlt in dieser Tradition, „=3:1“ = er fehlt als eigener Vers und steht in 3:1. Verse, die in keiner Zeile
// vorkommen, zählen in allen vier Traditionen gleich. Die Auswertung macht versemap.js.
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const CHECK = process.argv.includes('--check');
if (!args[0]) { console.error('Aufruf: node tools/tvtms/build.js <TVTMS-Datei oder STEPBible-Data> [<lxx-morph>] [--check]'); process.exit(1); }
let src = args[0];
if (fs.statSync(src).isDirectory()) {
  const d = fs.existsSync(path.join(src, 'Versification')) ? path.join(src, 'Versification') : src;
  const f = fs.readdirSync(d).find(n => /^TVTMS.*\.txt$/.test(n));
  if (!f) { console.error('Keine TVTMS-Datei in ' + d); process.exit(1); }
  src = path.join(d, f);
}
const SHAPE = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'ownlinks', 'tanakh_shape.json'), 'utf8'));

const BOOKS = { Gen: 'Genesis', Exo: 'Exodus', Lev: 'Leviticus', Num: 'Numbers', Deu: 'Deuteronomy', Jos: 'Joshua', Jdg: 'Judges', '1Sa': 'I Samuel', '2Sa': 'II Samuel',
  '1Ki': 'I Kings', '2Ki': 'II Kings', Isa: 'Isaiah', Jer: 'Jeremiah', Ezk: 'Ezekiel', Hos: 'Hosea', Jol: 'Joel', Amo: 'Amos', Oba: 'Obadiah', Jon: 'Jonah', Mic: 'Micah',
  Nam: 'Nahum', Hab: 'Habakkuk', Zep: 'Zephaniah', Hag: 'Haggai', Zec: 'Zechariah', Mal: 'Malachi', Psa: 'Psalms', Pro: 'Proverbs', Job: 'Job', Sng: 'Song of Songs',
  Rut: 'Ruth', Lam: 'Lamentations', Ecc: 'Ecclesiastes', Est: 'Esther', Dan: 'Daniel', Ezr: 'Ezra', Neh: 'Nehemiah', '1Ch': 'I Chronicles', '2Ch': 'II Chronicles' };
const CODE = new Map(Object.keys(BOOKS).map(k => [k.toLowerCase(), k]));
// lxx-morph: Buch -> Datei; Esra und Nehemia sind bei Rahlfs ein Buch (2 Esdras 1–10 und 11–23)
const SLUG = { Gen: 'genesis', Exo: 'exodus', Lev: 'leviticus', Num: 'numbers', Deu: 'deuteronomy', Jos: 'joshua-vaticanus-b joshua', Jdg: 'judges', '1Sa': '1-samuel', '2Sa': '2-samuel', '1Ki': '1-kings', '2Ki': '2-kings',
  Isa: 'isaiah', Jer: 'jeremiah-lxx', Ezk: 'ezekiel', Hos: 'hosea', Jol: 'joel', Amo: 'amos', Oba: 'obadiah', Jon: 'jonah', Mic: 'micah', Nam: 'nahum', Hab: 'habakkuk', Zep: 'zephaniah', Hag: 'haggai',
  Zec: 'zechariah', Mal: 'malachi', Psa: 'psalms-lxx', Pro: 'proverbs', Job: 'job-lxx', Sng: 'song-of-solomon', Rut: 'ruth', Lam: 'lamentations', Ecc: 'ecclesiastes', Est: 'esther-greek',
  Dan: 'daniel-theodotion', Ezr: '2-esdras', Neh: '2-esdras', '1Ch': '1-chronicles', '2Ch': '2-chronicles' };

// ---------- Wortlaut: die mitgelieferten CATSS-Fassungen zählen hebräisch; ihr Wortlaut zeigt, welcher Rahlfs-Vers zu welchem hebräischen gehört ----------
const gnorm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ω]/g, '');
const NO_CATSS = new Set(['Est']); // die CATSS-Datei „Esther“ enthält den Text von Esra
const CATSS_FILE = { Jdg: 'Septuaginta (CATSS, Judges B (Codex Vaticanus))', Dan: 'Septuaginta (CATSS, Theodotion)' };
const catss = new Map(); // Code -> Map('c:v' -> Wörter) | null
function catssOf(code) {
  if (catss.has(code)) return catss.get(code);
  let m = null;
  if (!NO_CATSS.has(code)) try {
    const d = JSON.parse(fs.readFileSync(path.join(root, 'bundled', 'own', BOOKS[code], 'other', (CATSS_FILE[code] || 'Septuaginta (CATSS)') + '.json'), 'utf8'));
    m = new Map();
    d.text.forEach((ch, ci) => (ch || []).forEach((v, vi) => { if (typeof v === 'string' && v.trim()) m.set(`${ci + 1}:${vi + 1}`, v.replace(/<small>.*?<\/small>/g, ' ').replace(/<[^>]*>/g, ' ').split(/\s+/).map(gnorm).filter(Boolean)); }));
  } catch { m = null; }
  catss.set(code, m);
  return m;
}
// Anteil gemeinsamer Wörter (bezogen auf die kürzere Seite)
function overlap(a, b) {
  if (!a.length || !b.length) return null;
  const cnt = new Map(); for (const w of a) cnt.set(w, (cnt.get(w) || 0) + 1);
  let n = 0; for (const w of b) { const k = cnt.get(w); if (k) { n++; cnt.set(w, k - 1); } }
  return n / Math.min(a.length, b.length);
}
// Wörter einer griechischen Versliste bei Rahlfs (Teilvers n = n-ter Buchstabenvers, 0 = der Vers selbst)
function rahlfsToks(inv, items) {
  const out = [];
  for (const [c, v, sub] of items) { const e = inv.v.get(c + ':' + v); if (!e) continue; if (sub == null) { out.push(...e.toks); e.sub.forEach(t => out.push(...t)); } else if (sub === 0) out.push(...e.toks); else if (e.sub[sub - 1]) out.push(...e.sub[sub - 1]); }
  return out;
}
// Wie gut passt eine Spalte eines Abschnitts im Wortlaut zu Rahlfs? -> { n: verglichene Zeilen, sum: Summe der Übereinstimmung }
function content(sec, i, hebCol) {
  const inv = inventory(sec.code), ca = catssOf(sec.code), dummy = { other: 0, odd: [] };
  const res = { n: 0, sum: 0 };
  if (!inv || !ca) return res;
  for (const r of sec.rows) {
    const H = parseCell(r[hebCol], sec.code, dummy), G = parseCell(r[i], sec.code, dummy);
    if (!H || !H.items || !G || G.skip) continue;
    const pairs = G.items && G.items.length === H.items.length ? H.items.map((h, k) => [[h], [G.items[k]]]) : [[H.items, (G.items || G.into || [])]];
    for (const [hs, gs] of pairs) {
      const a = [].concat(...hs.map(([c, v]) => ca.get(c + ':' + v) || []));
      if (!a.length) continue;
      const b = rahlfsToks(inv, gs), o = b.length ? overlap(a, b) : 0;
      res.n++; res.sum += o == null ? 0 : o;
    }
  }
  return res;
}

// ---------- Rahlfs (lxx-morph): Versbestand je Buch, für die Tests von TVTMS ----------
const rahlfs = new Map(); // Code -> { last: Map(Kapitel -> letzter Vers), v: Map('c:v' -> { words, subs }) } | null
function inventory(code) {
  if (rahlfs.has(code)) return rahlfs.get(code);
  let inv = null;
  if (args[1] && SLUG[code]) {
    try {
      const raw = [].concat(...SLUG[code].split(' ').map(sl => JSON.parse(fs.readFileSync(path.join(args[1], 'db', 'seeds', 'lxx_morph', sl + '.json'), 'utf8'))));
      inv = { last: new Map(), v: new Map() };
      for (const r of raw) {
        const m = /(\d+):(\d+)([a-z]*)$/.exec(String(r.ref || '')); if (!m || !Array.isArray(r.words)) continue;
        let c = +m[1]; const v = +m[2];
        if (code === 'Neh') { if (c <= 10) continue; c -= 10; } else if (code === 'Ezr' && c > 10) continue;
        const k = c + ':' + v; let e = inv.v.get(k); if (!e) inv.v.set(k, (e = { words: 0, subs: 0, toks: [], sub: [] }));
        const toks = r.words.map(w => gnorm(w && w.surface)).filter(Boolean);
        e.words += r.words.length; if (m[3]) { e.subs++; e.sub.push(toks); } else e.toks.push(...toks);
        inv.last.set(c, Math.max(inv.last.get(c) || 0, v));
      }
    } catch { inv = null; }
  }
  rahlfs.set(code, inv);
  return inv;
}
// ein Test von TVTMS gegen den Bestand: true / false / null (nicht auswertbar)
function evalTest(test) {
  const t = test.trim(); if (!t) return null;
  const refRe = /^([1-4A-Za-z][A-Za-z0-9]{2})\.(\d+):(\d+)(?:\.(\d+))?$/;
  let m = /^(.+?)=(Last|Exist|NotExist)$/i.exec(t);
  if (m) {
    const tb = /^([1-4A-Za-z][A-Za-z0-9]{2})\.(\d+):TextBeforeV1$/i.exec(m[1]);
    if (tb) { const inv = inventory(CODE.get(tb[1].toLowerCase())); return inv ? /^NotExist$/i.test(m[2]) : null; } // Rahlfs zählt die Überschrift als Vers
    const r = refRe.exec(m[1]); if (!r) return null;
    const code = CODE.get(r[1].toLowerCase()), inv = code && inventory(code); if (!inv) return null;
    const c = +r[2], v = +r[3], e = inv.v.get(c + ':' + v);
    if (/^last$/i.test(m[2])) return inv.last.get(c) === v;
    const ex = r[4] != null ? !!e && e.subs > 0 : !!e; // Teilverse: Rahlfs zählt sie mit Buchstaben (17a–17z), die Anzahl kann abweichen
    return /^exist$/i.test(m[2]) ? ex : !ex;
  }
  m = /^(.+?)([<>])(.+)$/.exec(t);
  if (m) {
    const val = s => { // „Mal.4:5*2“, „Mal.4:4+Mal.4:6“
      let sum = 0;
      for (const part of s.split('+')) {
        const mm = /^(.+?)(?:\*(\d+))?$/.exec(part.trim()), r = mm && refRe.exec(mm[1]); if (!r || r[4] != null) return null;
        const code = CODE.get(r[1].toLowerCase()), inv = code && inventory(code); if (!inv) return null;
        const e = inv.v.get(+r[2] + ':' + +r[3]); if (!e) return null;
        sum += e.words * (mm[2] ? +mm[2] : 1);
      }
      return sum;
    };
    const a = val(m[1]), b = val(m[3]); if (a == null || b == null) return null;
    return m[2] === '<' ? a < b : a > b;
  }
  return null;
}

// ---------- Zellen lesen ----------
// „Gen.32:2-33“, „Exo.37:1, 2.1“, „Exo.37:17; 38:20“, „Psa.51:Title“, „Absent [=Gen.3:1]“, „NoVerse“, „Exo.37:24-28.0“ -> { items: [[c, v, sub|null] …] } | { none } | { into: […] }
function parseCell(raw, code, stat) {
  let s = String(raw || '').trim();
  if (!s) return null; // Spalte fehlt in dieser Zeile
  const into = /^Absent\s*\[=\s*([^\]]+)\]/i.exec(s);
  if (into) { const t = parseCell(into[1].split(/\s*\/\s*/)[0], code, stat); return t && t.items && t.items.length ? { into: t.items } : { none: true }; }
  if (/^(Absent|NoVerse|Empty)\b/i.test(s)) return { none: true };
  s = s.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
  const items = [];
  let chap = null;
  for (let seg of s.split(/[;,]/)) {
    seg = seg.trim(); if (!seg) continue;
    const bk = /^([1-4A-Za-z][A-Za-z0-9]{2})\./.exec(seg);
    if (bk) { if (bk[1].toLowerCase() !== code.toLowerCase()) { stat.other++; return { skip: true }; } seg = seg.slice(bk[0].length); }
    let m = /^(\d+):Title$/i.exec(seg);
    if (m) { chap = +m[1]; items.push([chap, 0, null]); continue; }
    m = /^(?:(\d+):)?(\d+)(?:\.(\d+))?(?:-(\d+)(?:\.(\d+))?)?$/.exec(seg);
    if (!m) { stat.odd.push(code + ' ' + raw); return { skip: true }; }
    if (m[1] != null) chap = +m[1];
    if (chap == null) { stat.odd.push(code + ' ' + raw); return { skip: true }; }
    const v1 = +m[2], s1 = m[3] != null ? +m[3] : null;
    if (m[4] == null) { items.push([chap, v1, s1]); continue; }
    const b = +m[4], sb = m[5] != null ? +m[5] : null;
    if (s1 != null && sb == null) { for (let k = s1; k <= b; k++) items.push([chap, v1, k]); continue; } // „22.1-6“: Teilverse 1–6 von Vers 22
    if (s1 != null && sb != null) { stat.odd.push(code + ' ' + raw); return { skip: true }; }
    if (b < v1 || b - v1 > 200) { stat.odd.push(code + ' ' + raw); return { skip: true }; }
    for (let v = v1; v <= b; v++) items.push([chap, v, v === b ? sb : null]); // „24-28.0“: 24–27 ganz, 28 nur der erste Teil
  }
  return items.length ? { items } : { none: true };
}
// Versliste -> kompakte Zeichenkette
function enc(cell) {
  if (!cell || cell.none) return '';
  if (cell.into) return '=' + enc({ items: cell.into });
  const out = [];
  const it = cell.items;
  for (let i = 0; i < it.length; i++) {
    const [c, v, s] = it[i];
    if (s != null) { out.push(`${c}:${v}.${s}`); continue; }
    let j = i;
    while (j + 1 < it.length && it[j + 1][0] === c && it[j + 1][2] == null && it[j + 1][1] === it[j][1] + 1) j++;
    out.push(j > i ? `${c}:${v}-${it[j][1]}` : `${c}:${v}`);
    i = j;
  }
  return out.join(',');
}

// ---------- Abschnitte lesen ----------
const lines = fs.readFileSync(src, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
const a = lines.findIndex(l => l.startsWith('#DataStart(Condensed)')), z = lines.findIndex(l => l.startsWith('#DataEnd(Condensed)'));
if (a < 0 || z < 0) { console.error('Die „Condensed Version“ wurde in der Datei nicht gefunden.'); process.exit(1); }
const sections = [];
let cur = null;
for (const line of lines.slice(a + 1, z)) {
  if (line.startsWith('$')) {
    const cols = line.split('\t').map(x => x.trim());
    const m = /^\$([1-4A-Za-z][A-Za-z0-9]{2})\./.exec(cols[0]);
    cur = m && CODE.has(m[1].toLowerCase()) ? { code: CODE.get(m[1].toLowerCase()), name: cols[0].slice(1), heads: cols.slice(1).filter(Boolean), tests: [], named: [], rows: [] } : null;
    if (cur) sections.push(cur);
    continue;
  }
  if (!cur || !line.trim() || line.startsWith('#') || line.startsWith("'") || line.startsWith(',')) continue;
  const cols = line.split('\t').map(x => x.trim());
  if (/TEST:/i.test(cols[0])) { cur.tests.push(cols.slice(1)); continue; }
  if (cols[0] === 'BIBLES') { cur.heads = cols.slice(1).filter(Boolean); continue; }
  if (cols[1] && /^\s*&/.test(' ' + cols[1])) { cur.named.push([cols[0], cols.slice(1).join(' ')]); continue; } // „Latin + Greek   & Psa.9:30=Exist & …“ (vor der Kopfzeile BIBLES)
  if (/^([1-4A-Za-z][A-Za-z0-9]{2})\.\d|^Absent|^NoVerse/i.test(cols[1] || '')) cur.rows.push(cols.slice(1));
}

// Spalte je Tradition; die griechische wird an Rahlfs geprüft
const stat = { other: 0, odd: [], pick: [], noInv: 0, rows: 0, dropped: 0, sections: 0, fitN: 0, fitSum: 0, low: [], fixed: [], vAll: 0, vLow: 0 };
const DATA = {};
for (const sec of sections) {
  const H = sec.heads, find = re => H.findIndex(h => re.test(h));
  const ci = { eng: find(/^English/i), heb: find(/^Hebrew/i), lat: find(/^Latin/i), grk: find(/^Greek/i) };
  if (ci.eng !== 0 || ci.heb !== 1 || ci.lat !== 2 || ci.grk !== 3) { stat.odd.push('Spalten: ' + sec.name + ' ' + H.join('|')); continue; }
  // Tests je Spalte: Zeilen „TEST:“ (spaltenweise) und benannte Zeilen („Latin + Greek“)
  const testsOf = i => {
    const out = sec.tests.map(t => t[i]).filter(Boolean);
    const base = h => h.replace(/\*+$/, '').replace(/\s*\(.*$/, '').replace(/\s+KJV$/, '').trim().toLowerCase();
    for (const [names, body] of sec.named) {
      const ns = names.split('+').map(x => base(x.replace(/\s+v\.[\d-]+$/, '')));
      if (ns.includes(base(H[i]))) out.push(...body.split('&').map(x => x.trim()).filter(Boolean));
    }
    return out;
  };
  // Rahlfs folgt nicht überall der Spalte „Greek“: mal einer anderen griechischen Ausgabe (Greek2 …), mal der hebräischen Zählung.
  // Gewählt wird die Spalte, deren Tests am Versbestand von Rahlfs am wenigsten scheitern; bei Gleichstand „Greek“, dann die übrigen
  // griechischen Spalten, dann Hebrew, English, Latin.
  const rank = i => (i === 3 ? 0 : /^(Greek|Grk|Brenton)/i.test(H[i]) ? 1 : i === 1 ? 2 : i === 0 ? 3 : i === 2 ? 4 : 9);
  const cand = H.map((h, i) => i).filter(i => rank(i) < 9 && !/\+NRSV/i.test(H[i]));
  let best = 3;
  if (inventory(sec.code)) {
    const inv = inventory(sec.code), dummy = { other: 0, odd: [] };
    const missing = i => { let n = 0; for (const r of sec.rows) { const c = parseCell(r[i], sec.code, dummy); for (const [ch, v] of (c && c.items) || []) if (v && !inv.v.has(ch + ':' + v)) n++; } return n; };
    const score = cand.map(i => { const r = testsOf(i).map(evalTest).filter(x => x != null), ct = content(sec, i, 1); return { i, ok: r.filter(Boolean).length, bad: r.filter(x => !x).length, miss: missing(i), fit: ct.n ? Math.round(100 * ct.sum / ct.n) : -1 }; });
    // zuerst der Wortlaut (CATSS, hebräisch gezählt, gegen Rahlfs; nur deutliche Unterschiede zählen), dann die Tests, dann: wie viele Verse der Spalte es bei Rahlfs nicht gibt
    score.sort((x, y) => (Math.abs(y.fit - x.fit) > 5 ? y.fit - x.fit : 0) || x.bad - y.bad || x.miss - y.miss || rank(x.i) - rank(y.i) || x.i - y.i);
    if (score.length && score[0].fit >= 0) { stat.fitN++; stat.fitSum += score[0].fit; if (score[0].fit < 60) stat.low.push(`${sec.name}: ${H[score[0].i]} ${score[0].fit} %`); }
    if (score.length) best = score[0].i;
    if (best !== 3) stat.pick.push(`${sec.name}: ${H[best]} statt ${H[3]}` + (score[0].bad ? ` (${score[0].bad} Tests passen nicht)` : ''));
    else if (score[0].bad) stat.pick.push(`${sec.name}: ${H[3]} bleibt, ${score[0].bad} Tests passen nicht`);
  } else stat.noInv++;
  ci.grk = best;
  stat.sections++;
  const book = BOOKS[sec.code];
  const rows = DATA[book] || (DATA[book] = []);
  const seen = new Set(rows.map(r => r.join('|')));
  const units = []; // Zeilen des Abschnitts, Vers für Vers, wo alle Spalten gleich viele Verse nennen
  for (const r of sec.rows) {
    stat.rows++;
    const cells = ['eng', 'heb', 'lat', 'grk'].map(t => parseCell(r[ci[t]], sec.code, stat));
    // hebräische Verse, die Sefaria nicht zählt (Num 25:19 als eigener Vers in manchen Ausgaben), fallen weg, wenn die Zelle noch andere nennt
    if (cells[1] && cells[1].items) {
      const sh = SHAPE[BOOKS[sec.code]], ok = cells[1].items.filter(([c, v]) => sh && c >= 1 && c <= sh.length && v >= 1 && v <= sh[c - 1]);
      if (ok.length && ok.length < cells[1].items.length) { stat.hebFix = (stat.hebFix || 0) + cells[1].items.length - ok.length; cells[1] = { items: ok }; }
    }
    // ohne hebräische Angabe ist die Zeile nicht verwertbar
    if (!cells[1] || cells[1].skip) { stat.dropped++; continue; }
    const n = cells[1].items ? cells[1].items.length : 0;
    if (n > 1 && cells.every(c => !c || c.skip || c.none || (c.items && !c.into && c.items.length === n))) {
      for (let k = 0; k < n; k++) units.push(cells.map(c => (c && c.items ? { items: [c.items[k]] } : c)));
    } else units.push(cells);
  }
  // Wortlaut prüfen: passt der griechische Vers der Tabelle nicht zum (hebräisch gezählten) CATSS-Vers, steht derselbe Wortlaut bei Rahlfs
  // aber eindeutig an anderer Stelle, gilt diese Stelle (Rahlfs zählt z. B. in Jer 25–51 stellenweise anders als beide Spalten von TVTMS)
  const inv = inventory(sec.code), ca = catssOf(sec.code);
  const near = new Set();
  for (const u of units) for (const c of u) for (const it of (c && (c.items || c.into)) || []) near.add(it[0]);
  for (const r of sec.rows) for (const x of r) for (const m of String(x || '').matchAll(/(\d+):\d+/g)) near.add(+m[1]);
  if (inv && ca) for (const u of units) {
    const h = u[1].items;
    if (!h || h.length !== 1 || h[0][2] != null) continue;
    const a = ca.get(h[0][0] + ':' + h[0][1]); if (!a || a.length < 5) continue;
    const g = u[3] && !u[3].skip ? (u[3].items || u[3].into || []) : null; if (g == null) continue;
    const b = rahlfsToks(inv, g), fit = b.length ? overlap(a, b) : 0;
    stat.vAll++;
    if (fit >= 0.5) continue;
    let best = null, bo = 0;
    for (const [k, e] of inv.v) {
      if (e.toks.length < 4 || !near.has(+k.split(':')[0])) continue; // nur in den Kapiteln, die der Abschnitt nennt (gleichlautende Verse stehen auch anderswo)
      const cnt = new Map(); for (const w of a) cnt.set(w, (cnt.get(w) || 0) + 1);
      let nn = 0; for (const w of e.toks) { const x = cnt.get(w); if (x) { nn++; cnt.set(w, x - 1); } }
      const o = nn / Math.max(a.length, e.toks.length);
      if (o > bo) { bo = o; best = k; }
    }
    if (best && bo >= 0.6) {
      const [bc, bv] = best.split(':').map(Number);
      stat.fixed.push(`${BOOKS[sec.code]} ${h[0][0]}:${h[0][1]}: ${enc(u[3]) || '–'} -> ${bc}:${bv}`);
      u[3] = { items: [[bc, bv, null]] };
    } else stat.vLow++;
  }
  // aufeinanderfolgende Verse wieder zu Bereichen zusammenfassen
  const single = c => c && c.items && !c.into && c.items.length >= 1 && c.items.every(x => x[2] == null);
  const follows = (p, q) => (single(p) && single(q) && q.items.length === 1 && q.items[0][0] === p.items[p.items.length - 1][0] && q.items[0][1] === p.items[p.items.length - 1][1] + 1 && q.items[0][1] > 1)
    || (!!p && !!q && p.none && q.none) || (!p && !q) || (!!p && !!q && p.skip && q.skip);
  const groups = [];
  for (const u of units) {
    const g = groups[groups.length - 1];
    if (g && u.every((c, k) => follows(g[k], c)) && u.some(c => c && c.items)) { u.forEach((c, k) => { if (c && c.items) g[k] = { items: g[k].items.concat(c.items) }; }); continue; }
    groups.push(u.slice());
  }
  for (const cells of groups) {
    const out = cells.map(c => (c && !c.skip ? enc(c) : null));
    const row = out.map(x => (x == null ? '?' : x)); // „?“ = in dieser Tradition nicht verwertbar (anderes Buch, unlesbare Angabe)
    if (row.every(x => x === row[1])) continue; // überall gleich: keine Zeile nötig
    const k = row.join('|'); if (seen.has(k)) continue; seen.add(k);
    rows.push(row);
  }
  if (!rows.length) delete DATA[book];
}

// ---------- Prüfungen ----------
// 1. hebräische Angaben müssen zur Zählung von Sefaria passen
let hebBad = 0, hebAll = 0;
const each = (cell, fn) => { if (!cell || cell === '?' ) return; for (const p of cell.replace(/^=/, '').split(',')) { const m = /^(\d+):(\d+)(?:-(\d+))?/.exec(p); if (m) for (let v = +m[2]; v <= +(m[3] || m[2]); v++) fn(+m[1], v); } };
const hebBadList = [];
for (const [book, rows] of Object.entries(DATA)) for (const r of rows) each(r[1], (c, v) => { hebAll++; const sh = SHAPE[book]; if (!(sh && c >= 1 && c <= sh.length && v >= 1 && v <= sh[c - 1])) { hebBad++; if (hebBadList.length < 12) hebBadList.push(`${book} ${c}:${v}`); } });
// 2. griechisch gegen Rahlfs: jeder griechische Vers der Tabelle sollte es bei Rahlfs geben
let grkBad = 0, grkAll = 0; const grkBadBooks = {};
for (const [code, book] of Object.entries(BOOKS)) {
  const inv = inventory(code), rows = DATA[book]; if (!inv || !rows) continue;
  for (const r of rows) each(r[3], (c, v) => { if (!v) return; grkAll++; if (!inv.v.has(c + ':' + v)) { grkBad++; if (process.argv.includes('--verbose')) (grkBadBooks['_' + book] = grkBadBooks['_' + book] || []).push(c + ':' + v); grkBadBooks[book] = (grkBadBooks[book] || 0) + 1; } });
}

// 3. Verse außerhalb der Tabelle zählen überall gleich – stimmt das im Wortlaut (CATSS gegen Rahlfs, gleicher Vers)?
let idAll = 0, idBad = 0; const idBadBooks = {};
for (const [code, book] of Object.entries(BOOKS)) {
  const inv = inventory(code), ca = catssOf(code); if (!inv || !ca) continue;
  const inTable = new Set(); for (const r of DATA[book] || []) each(r[1], (c, v) => inTable.add(c + ':' + v));
  SHAPE[book].forEach((n, ci) => { for (let v = 1; v <= n; v++) {
    const k = `${ci + 1}:${v}`; if (inTable.has(k)) continue;
    const a = ca.get(k), e = inv.v.get(k); if (!a || a.length < 5 || !e || e.toks.length < 4) continue;
    idAll++; if (overlap(a, e.toks.concat(...e.sub)) < 0.5) { idBad++; idBadBooks[book] = (idBadBooks[book] || 0) + 1; }
  } });
}

const nRows = Object.values(DATA).reduce((s, r) => s + r.length, 0);
const body = '{\n' + Object.entries(DATA).map(([b, rows]) => ` ${JSON.stringify(b)}:[\n${rows.map(r => '  ' + JSON.stringify(r)).join(',\n')}\n ]`).join(',\n') + '\n}';
const shapeBody = '{\n' + Object.entries(SHAPE).map(([b, a]) => ` ${JSON.stringify(b)}:${JSON.stringify(a.join(' '))}`).join(',\n') + '\n}';
const out = `// Versumrechnung zwischen Zähltraditionen – erzeugt von tools/tvtms/build.js, nicht von Hand ändern.
// Quelle: TVTMS (Translators Versification Traditions with Methodology for Standardisation), STEPBible.org, auf Grundlage der Arbeit von
// Tyndale House Cambridge, CC BY 4.0 – https://github.com/STEPBible/STEPBible-Data
// Je Buch (Sefaria-Titel) Zeilen [eng, heb, lat, grk]: englisch (KJV/NRSV), hebräisch (MT, = Sefaria), lateinisch (Vulgata), griechisch
// (Septuaginta; je Abschnitt die Spalte, der Rahlfs folgt, ${stat.fixed.length} Verse nach dem Wortlaut berichtigt – siehe tools/tvtms/build.js). Zelle: Versliste „Kapitel:Vers[-Vers][.Teilvers]“, Vers 0 = Überschrift ohne
// Verszahl, „“ = fehlt, „=3:1“ = steht in 3:1, „?“ = nicht verwertbar. Nicht genannte Verse zählen überall gleich. Auswertung: versemap.js.
(function () {
const VERSEMAP_DATA = { v: 1, source: 'TVTMS, STEPBible.org / Tyndale House Cambridge, CC BY 4.0', trad: ['eng', 'heb', 'lat', 'grk'], books: ${body},
// Verszahl je Kapitel in der hebräischen Zählung (Sefaria), zum Prüfen, ob es eine Stelle gibt
shape: ${shapeBody} };
if (typeof module !== 'undefined' && module.exports) module.exports = VERSEMAP_DATA; else window.VERSEMAP_DATA = VERSEMAP_DATA;
})();
`;
console.log(`Abschnitte ${stat.sections} (Tanach), Zeilen gelesen ${stat.rows}, in der Tabelle ${nRows} in ${Object.keys(DATA).length} Büchern, ${(out.length / 1024).toFixed(0)} KB`);
console.log(`ohne hebräische Angabe übergangen: ${stat.dropped}; Angaben in ein anderes Buch: ${stat.other}; unlesbar: ${stat.odd.length}`);
if (stat.odd.length) console.log('  ' + stat.odd.slice(0, 30).join('\n  '));
console.log(`hebräische Verse der Tabelle: ${hebAll}, an Sefarias Zählung angepasst: ${stat.hebFix || 0}, davon nicht in Sefarias Zählung: ${hebBad}${hebBadList.length ? ' (' + hebBadList.join(', ') + ')' : ''}`);
if (args[1]) {
  console.log(`griechische Spalte nach Rahlfs gewählt: ${stat.pick.length} Abschnitte weichen von „Greek“ ab${stat.noInv ? `, ${stat.noInv} ohne Rahlfs-Bestand` : ''}`);
  if (process.argv.includes('--verbose')) console.log('  ' + stat.pick.join('\n  '));
  if (stat.fitN) console.log(`Wortlaut (CATSS hebräisch gezählt gegen Rahlfs nach der Tabelle): ${stat.fitN} Abschnitte verglichen, mittlere Übereinstimmung ${(stat.fitSum / stat.fitN).toFixed(0)} %, unter 60 %: ${stat.low.length}`);
  if (process.argv.includes('--verbose') && stat.low.length) console.log('  ' + stat.low.join('\n  '));
  console.log(`Vers für Vers am Wortlaut geprüft: ${stat.vAll}; nach dem Wortlaut auf den Rahlfs-Vers berichtigt: ${stat.fixed.length}; ohne passenden Rahlfs-Vers (Text fehlt oder weicht ab): ${stat.vLow}`);
  if (process.argv.includes('--verbose') && stat.fixed.length) console.log('  ' + stat.fixed.join('\n  '));
  console.log(`Verse außerhalb der Tabelle (zählen gleich), am Wortlaut geprüft: ${idAll}, davon mit anderem Wortlaut bei Rahlfs: ${idBad} ${JSON.stringify(idBadBooks)}`);
  console.log(`griechische Verse der Tabelle: ${grkAll}, davon bei Rahlfs nicht vorhanden: ${grkBad} ${JSON.stringify(grkBadBooks)}`);
} else console.log('ohne lxx-morph: griechisch = Spalte „Greek“ von TVTMS (nicht an Rahlfs geprüft)');
if (!CHECK) { fs.writeFileSync(path.join(root, 'versemap-data.js'), out); console.log('geschrieben: versemap-data.js'); }
