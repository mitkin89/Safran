#!/usr/bin/env node
// Septuaginta-Morphologie für Safran: baut lxx-morph.js (Index für Wort-Popup, Formentabelle, Wortkarte, Lemma-Suche) und die
// mitgelieferten griechischen Texte der deuterokanonischen Bücher (bundled/own/<Titel>/other/Septuaginta (Rahlfs….json).
//
// Quellen (nicht im Projekt, vorher holen):
//   lxx-morph   git clone https://github.com/OpenScriptorium/lxx-morph   (Spiegel: https://git.sr.ht/~sethkush/lxx-morph)
//               Daten CC BY 4.0 – „LXX morphology data by Seth Kushniryk, CC BY 4.0, derived from Rahlfs Septuagint (Eliran Wong digital edition).“
//   STEPBible   git clone https://github.com/STEPBible/STEPBible-Data    (Lexicons/TBESG, TFLSJ – Kurzbedeutungen; CC BY 4.0, Tyndale House / STEPBible.org)
// Aufruf:
//   node tools/lxxmorph/build.js <lxx-morph> <STEPBible-Data>            schreibt die Dateien, danach: node tools/catss/lxx-lemma.js
//   node tools/lxxmorph/build.js <lxx-morph> <STEPBible-Data> --check    nur Zahlen (Abdeckung), nichts schreiben
//   node tools/lxxmorph/build.js <lxx-morph> <STEPBible-Data> --check --books   dazu die Zuordnung je Buch
// Die griechischen Wörter der CATSS-Fassungen werden Vers für Vers den Wörtern von lxx-morph zugeordnet (Verse über den Wortlaut gesucht,
// weil CATSS der hebräischen Zählung folgt und Rahlfs der griechischen; Wörter über die längste gemeinsame Folge, ohne Akzente verglichen).
// Wörter, die sich so nicht zuordnen lassen, bekommen die häufigste Bestimmung ihrer Wortform (im Index gekennzeichnet).
// Bücher ohne brauchbare CATSS-Fassung (Hosea fehlt; die CATSS-Datei „Esther“ enthält den Text von Esra) und die deuterokanonischen Bücher
// kommen als Text nach Rahlfs dazu: an vorhandene Titel nur, wo Kapitel- und Verszählung übereinstimmen, sonst als eigene Titel „… (Septuaginta)“.
// tests/integration/greek-morphology.cjs prüft, dass der Index Wort für Wort zu den mitgelieferten Texten passt. Abgleich mit CrossWire: tools/lxxmorph/compare-crosswire.js.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..', '..');
const G = require(path.join(root, 'gmorph.js'));

// ---------- Zuordnung: Ströme (Titel in Safran, Fassung) <- Bücher von lxx-morph ----------
const CATSS = 'Septuaginta (CATSS)';
const RAHLFS = 'Septuaginta (Rahlfs)';
const TORA = [['Genesis', 'genesis'], ['Exodus', 'exodus'], ['Leviticus', 'leviticus'], ['Numbers', 'numbers'], ['Deuteronomy', 'deuteronomy']];
const PROPHETS = [['Joshua', 'joshua-vaticanus-b joshua'], ['Judges', 'judges', 'Septuaginta (CATSS, Judges A (Codex Alexandrinus))', 'A'], ['Judges', 'judges-vaticanus-b', 'Septuaginta (CATSS, Judges B (Codex Vaticanus))', 'B'],
  ['I Samuel', '1-samuel'], ['II Samuel', '2-samuel'], ['I Kings', '1-kings'], ['II Kings', '2-kings'], ['Isaiah', 'isaiah'], ['Jeremiah', 'jeremiah-lxx'], ['Ezekiel', 'ezekiel'],
  ['Hosea', 'hosea', RAHLFS], ['Joel', 'joel'], ['Amos', 'amos'], ['Obadiah', 'obadiah'], ['Jonah', 'jonah'], ['Micah', 'micah'], ['Nahum', 'nahum'], ['Habakkuk', 'habakkuk'], ['Zephaniah', 'zephaniah'], ['Haggai', 'haggai'], ['Zechariah', 'zechariah'], ['Malachi', 'malachi']];
const WRITINGS = [['Psalms', 'psalms-lxx'], ['Proverbs', 'proverbs'], ['Job', 'job-lxx'], ['Song of Songs', 'song-of-solomon'], ['Ruth', 'ruth'], ['Lamentations', 'lamentations'], ['Ecclesiastes', 'ecclesiastes'], ['Esther', 'esther-greek', RAHLFS],
  ['Daniel', 'daniel'], ['Daniel', 'daniel-theodotion', 'Septuaginta (CATSS, Theodotion)', 'Theodotion'], ['Ezra', '2-esdras'], ['Nehemiah', '2-esdras'], ['I Chronicles', '1-chronicles'], ['II Chronicles', '2-chronicles']];
// Deuterokanonische Bücher: Text aus lxx-morph (Rahlfs). attach = vorhandener Titel mit derselben Kapitel- und Verszählung; sonst eigener Titel.
const SIN = 'Septuaginta (Rahlfs, Codex Sinaiticus)', THEOD = 'Septuaginta (Rahlfs, Theodotion)';
const DEUTERO = [
  { title: 'Makkabäer I (Septuaginta)', he: 'מקבים א (תרגום השבעים)', slug: '1-maccabees' },
  { title: 'Makkabäer II (Septuaginta)', he: 'מקבים ב (תרגום השבעים)', slug: '2-maccabees' },
  { title: 'Das dritte Buch der Makkabäer', slug: '3-maccabees', attach: true },
  { title: 'Makkabäer IV (Septuaginta)', he: 'מקבים ד (תרגום השבעים)', slug: '4-maccabees' },
  { title: 'Ben Sira', he: 'בן סירא', slug: 'sirach', rel: 'own/Jesus Sirach (Septuaginta)/other/Septuaginta (Rahlfs).json' },
  { title: 'Weisheit Salomos (Septuaginta)', he: 'חכמת שלמה (תרגום השבעים)', slug: 'wisdom' },
  { title: 'Tobit (Septuaginta)', he: 'טוביה (תרגום השבעים)', slug: 'tobit' },
  { title: 'Tobit (Septuaginta)', he: 'טוביה (תרגום השבעים)', slug: 'tobit-sinaiticus', version: SIN, tag: 'Sinaiticus' },
  { title: 'Judit (Septuaginta)', he: 'יהודית (תרגום השבעים)', slug: 'judith' },
  { title: 'Das Buch Baruch', slug: 'baruch', attach: true },
  { title: 'Der Brief Jeremias', slug: 'letter-of-jeremiah', attach: true },
  { title: 'Susanna (Septuaginta)', he: 'שושנה (תרגום השבעים)', slug: 'susanna' },
  { title: 'Susanna (Septuaginta)', he: 'שושנה (תרגום השבעים)', slug: 'susanna-theodotion', version: THEOD, tag: 'Theodotion' },
  { title: 'Bel und der Drache (Septuaginta)', he: 'בל והתנין (תרגום השבעים)', slug: 'bel-and-the-dragon' },
  { title: 'Bel und der Drache (Septuaginta)', he: 'בל והתנין (תרגום השבעים)', slug: 'bel-and-the-dragon-theodotion', version: THEOD, tag: 'Theodotion' },
  { title: 'Esdras I (Septuaginta)', he: 'עזרא החיצוני (תרגום השבעים)', slug: '1-esdras' },
  { title: 'Prayer of Manasseh', slug: 'odes', attach: true, only: 12, dup: true },
  { title: 'Oden (Septuaginta)', he: 'אודות (תרגום השבעים)', slug: 'odes' },
  { title: 'Die Psalmen Salomos', slug: 'psalms-of-solomon', attach: true },
];

// ---------- lxx-morph lesen ----------
const POSL = { verb: 'V', participle: 'V', noun: 'N', 'proper noun': 'E', adjective: 'A', article: 'T', pronoun: 'P', preposition: 'R', conjunction: 'C', adverb: 'D', particle: 'X', interjection: 'I', numeral: 'M', 'adverb/verb': 'D' };
const GEN = ['masc', 'fem', 'neut'], CAS = ['nom', 'gen', 'dat', 'acc', 'voc'];
function keyOf(pos, parsing) {
  let p = String(parsing || '').trim().split(/\s+/).filter(Boolean).map(w => {
    const a = w.split('/');
    if (a.every(x => GEN.includes(x))) return GEN.filter(x => a.includes(x)).join('/');
    if (a.every(x => CAS.includes(x))) return CAS.filter(x => a.includes(x)).join('/');
    return w;
  });
  let L = POSL[pos];
  if (!L) L = /^(masc|fem|neut)/.test(String(pos)) ? 'A' : 'X'; // vereinzelt steht die Bestimmung im Feld der Wortart
  if (pos === 'participle' && !p.includes('ptc')) p = ['ptc', ...p];
  return L + (p.length ? ' ' + p.join(' ') : '');
}
const nfc = s => String(s == null ? '' : s).normalize('NFC');
function loadBook(dir, slug) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'db', 'seeds', 'lxx_morph', slug + '.json'), 'utf8'));
  const vs = [];
  raw.forEach((v, k) => {
    const m = /(\d+):(\d+)([a-z]*)$/.exec(String(v.ref || '')); if (!m || !Array.isArray(v.words)) return; // Einträge ohne Wörter überspringen
    const toks = v.words.filter(w => w && w.surface).map(w => ({ s: nfc(w.surface), l: nfc(w.lemma || w.surface).split('/')[0], k: keyOf(w.pos, w.parsing), low: w.confidence === 'low' }));
    vs.push({ ch: +m[1], v: +m[2], sfx: m[3], k, toks });
  });
  vs.sort((a, b) => a.ch - b.ch || a.v - b.v || a.k - b.k); // Nachträge am Dateiende an ihre Stelle; Buchstabenverse in der Reihenfolge der Ausgabe
  return vs;
}

// ---------- Kurzbedeutungen (STEPBible) ----------
function loadGlosses(dir) {
  const gl = new Map(), fl = new Map();
  const files = fs.readdirSync(path.join(dir, 'Lexicons')).filter(f => /^(TBESG|TFLSJ)/.test(f)).sort(); // TBESG zuerst (Abbott-Smith), dann LSJ
  for (const f of files) for (const ln of fs.readFileSync(path.join(dir, 'Lexicons', f), 'utf8').split('\n')) {
    if (!/^G\d/.test(ln)) continue;
    const c = ln.split('\t'), lemma = nfc(c[3]).trim(), gloss = String(c[6] || '').replace(/<[^>]+>/g, '').replace(/[\t|]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!lemma || !gloss) continue;
    for (const l of lemma.split(/,\s*/)) { if (!gl.has(l)) gl.set(l, gloss); const k = G.fold(l); if (!fl.has(k)) fl.set(k, gloss); }
  }
  // lxx-morph nennt LSJ-Stichwörter (πορεύομαι, δείκνυμι, χρυσοῦς), STEPBible teils die aktive bzw. unkontrahierte Form
  const VAR = [[/ομαι$/, 'ω'], [/ω$/, 'ομαι'], [/υμι$/, 'υω'], [/υω$/, 'υμι'], [/ουσ$/, 'εοσ'], [/ουν$/, 'εον'], [/ττω$/, 'σσω'], [/σσω$/, 'ττω']];
  return l => {
    const f = G.fold(l);
    let g = gl.get(l) || fl.get(f);
    for (const [re, to] of VAR) { if (g) break; if (re.test(f)) g = fl.get(f.replace(re, to)); }
    return g || '';
  };
}

// ---------- Wortformen-Tabelle ----------
class Table {
  constructor() { this.lem = new Map(); this.n = 0; }
  // Bestimmung (Lemma, Schlüssel, Form) -> Zähler-Objekt
  get(l, k, s) {
    let L = this.lem.get(l); if (!L) this.lem.set(l, L = new Map());
    let K = L.get(k); if (!K) L.set(k, K = new Map());
    const f = G.form(s);
    let e = K.get(f); if (!e) K.set(f, e = { l, k, f, n: 0, id: -1 });
    return e;
  }
}

// ---------- Zuordnung eines CATSS-Buches ----------
function lcs(a, b) { // längste gemeinsame Folge zweier Wortlisten -> Paare [i, j]
  const n = a.length, m = b.length, W = m + 1, t = new Uint16Array((n + 1) * W);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i * W + j] = a[i] === b[j] ? t[(i + 1) * W + j + 1] + 1 : Math.max(t[(i + 1) * W + j], t[i * W + j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { out.push([i, j]); i++; j++; } else if (t[(i + 1) * W + j] >= t[i * W + j + 1]) i++; else j++; }
  return out;
}
function lev(a, b) { const d = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const q = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = q; } } return d[b.length]; }
const near = (a, b) => a === b || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)) && Math.abs(a.length - b.length) <= 2) || (Math.min(a.length, b.length) >= 5 && lev(a, b) <= 2) || (Math.min(a.length, b.length) >= 3 && lev(a, b) <= 1);
// text: [[Vers-HTML …] …]; src: Verse von lxx-morph (ein Buch oder mehrere hintereinander) -> je Vers [{ tok, how } | null]
function alignBook(text, src, stat) {
  const sf = src.map(v => v.toks.map(t => G.fold(t.s)));
  const inv = new Map(), df = new Map();
  sf.forEach((ws, si) => { for (const w of new Set(ws)) { if (!inv.has(w)) inv.set(w, []); inv.get(w).push(si); } });
  for (const [w, a] of inv) df.set(w, Math.log(1 + src.length / a.length));
  const byRef = new Map(); src.forEach((v, si) => { const k = v.ch + ':' + v.v; if (!byRef.has(k)) byRef.set(k, si); });
  const used = src.map(v => new Uint8Array(v.toks.length));
  let prev = -1;
  return text.map((chap, ci) => (Array.isArray(chap) ? chap : []).map((html, vi) => {
    const ws = G.words(html); if (!ws.length) return [];
    const tf = ws.map(G.fold);
    // den passenden Vers suchen: gewichtete Wortübereinstimmung; bei Gleichstand der nächste nach dem vorigen bzw. der mit derselben Zählung
    const score = new Map();
    for (const w of new Set(tf)) { const a = inv.get(w); if (a && a.length <= 400) for (const si of a) score.set(si, (score.get(si) || 0) + df.get(w)); }
    const same = byRef.get((ci + 1) + ':' + (vi + 1));
    let best = -1, bs = 0;
    for (const [si, s0] of score) { const s = s0 / Math.sqrt(Math.max(sf[si].length, tf.length)) * (si === prev + 1 ? 1.15 : 1) * (si === same ? 1.1 : 1); if (s > bs) { bs = s; best = si; } }
    if (best < 0) best = same != null ? same : prev + 1 < src.length ? prev + 1 : -1;
    const out = new Array(ws.length).fill(null);
    const take = (list, how) => { // list: [{ si, ti }] Kandidaten in Reihenfolge; offene Wörter über die längste gemeinsame Folge zuordnen
      const open = out.map((x, i) => (x ? -1 : i)).filter(i => i >= 0); if (!open.length || !list.length) return;
      for (const [a, b] of lcs(open.map(i => tf[i]), list.map(c => sf[c.si][c.ti]))) { const c = list[b]; out[open[a]] = { tok: src[c.si].toks[c.ti], how }; used[c.si][c.ti] = 1; c.done = true; }
    };
    if (best >= 0) {
      const win = si => (si >= 0 && si < src.length ? sf[si].map((_, ti) => ({ si, ti })) : []);
      take(win(best), 'v');
      take([...win(best - 1), ...win(best), ...win(best + 1)].filter(c => !c.done && !used[c.si][c.ti]), 'n'); // Versgrenzen liegen manchmal anders: Nachbarverse
      // ein CATSS-Vers kann mehrere Verse der Ausgabe umfassen (Buchstabenverse 2,35a–o, Zusätze, andere Zählung): weitere Verse suchen, solange genug passt
      // erst nur noch freie Wörter der Ausgabe; zuletzt auch schon vergebene (derselbe Wortlaut steht bei CATSS an zwei Stellen des Buches)
      for (const reuse of [false, true]) { const rejected = new Set(reuse ? [] : [best]);
      for (let round = 0, fails = 0; round < 300 && fails < 6; round++) {
        const open = out.map((x, i) => (x ? -1 : i)).filter(i => i >= 0); if (open.length < 3) break;
        const sc = new Map();
        for (const w of new Set(open.map(i => tf[i]))) { const a = inv.get(w); if (a && a.length <= 400) for (const si of a) if (!rejected.has(si)) sc.set(si, (sc.get(si) || 0) + df.get(w)); }
        let b2 = -1, s2 = 0;
        for (const [si, s0] of sc) { const s = s0 / Math.sqrt(sf[si].length) * (Math.abs(si - best) <= 30 ? 1.2 : 1); if (s > s2) { s2 = s; b2 = si; } }
        if (b2 < 0) break;
        rejected.add(b2);
        const list = win(b2).filter(c => reuse || !used[c.si][c.ti]);
        const m = lcs(open.map(i => tf[i]), list.map(c => sf[c.si][c.ti]));
        if (m.length < 3 || m.length < Math.min(open.length, list.length) * 0.5) { fails++; continue; } // zu wenig: lieber offen lassen
        for (const [a, b] of m) { const c = list[b]; out[open[a]] = { tok: src[c.si].toks[c.ti], how: 'n' }; used[c.si][c.ti] = 1; }
      } }
      // Lücken: ähnliche Schreibung (ν ephelkystikon, Elision, Namen) unter den noch freien Wörtern des Verses
      const cand = win(best).filter(c => !used[c.si][c.ti]);
      for (let i = 0; i < ws.length; i++) if (!out[i]) { const k = cand.findIndex(c => !c.done && near(tf[i], sf[c.si][c.ti])); if (k >= 0) { const c = cand[k]; c.done = true; used[c.si][c.ti] = 1; out[i] = { tok: src[c.si].toks[c.ti], how: 'f' }; } }
      prev = best;
    }
    for (const x of out) stat[x ? x.how : 'x'] = (stat[x ? x.how : 'x'] || 0) + 1;
    return out.map((x, i) => x || { word: ws[i] });
  }));
}

// ---------- Hauptteil ----------
function build(morphDir, stepDir, opts = {}) {
  const gloss = loadGlosses(stepDir);
  const cache = new Map(), book = slug => { if (!cache.has(slug)) cache.set(slug, loadBook(morphDir, slug)); return cache.get(slug); };
  const man = JSON.parse(fs.readFileSync(path.join(root, 'bundled', 'manifest.json'), 'utf8'));
  const table = new Table();
  const streams = []; // { title, version, tag, chapters: [[ [entry|{word}] … ] … ] }
  const report = { catss: {}, books: [] };
  // Text und Bestimmungen unmittelbar aus lxx-morph (Rahlfs): deuterokanonische Bücher, dazu Hosea und Ester
  const texts = [];
  function rahlfs(d) {
    const vs = book(d.slug).filter(v => !d.only || v.ch === d.only);
    const last = Math.max(...vs.map(v => v.ch));
    const chapters = [], html = [];
    for (const v of vs) {
      const ci = d.only ? 0 : v.ch === 0 ? last : v.ch - 1; // Sirach: der Prolog („Kapitel 0“ bei Rahlfs) steht als zusätzliches letztes Kapitel, damit die Kapitelzahlen stimmen
      while (chapters.length <= ci) { chapters.push([]); html.push([]); }
      while (chapters[ci].length < v.v) { chapters[ci].push([]); html[ci].push(''); }
      chapters[ci][v.v - 1].push(...v.toks.map(t => ({ e: table.get(t.l, t.k, t.s), low: t.low })));
      html[ci][v.v - 1] += (html[ci][v.v - 1] ? ' ' : '') + (v.sfx ? `<small>[${v.v}${v.sfx}]</small> ` : v.ch === 0 && v.v === 1 ? '<small>[Prolog]</small> ' : '') + v.toks.map(t => t.s.replace(/᾿/g, '’')).join(' ');
    }
    const version = d.version || RAHLFS;
    streams.push({ title: d.title, version, tag: d.tag || '', chapters, dup: !!d.dup });
    texts.push({ d, version, html });
    report.books.push({ title: d.title, tag: d.tag || '', words: vs.reduce((s, v) => s + v.toks.length, 0), rahlfs: true });
  }
  // ----- Tanach: CATSS-Fassungen -----
  const groups = [];
  for (const [name, list] of [['Tora', TORA], ['Propheten', PROPHETS], ['Schriften', WRITINGS]]) { groups.push([name, 0]); for (const [title, slugs, version = CATSS, tag = ''] of list) {
    groups[groups.length - 1][1]++;
    if (version === RAHLFS) { rahlfs({ title, slug: slugs, attach: true, canon: true }); continue; } // Buch ohne (brauchbare) CATSS-Fassung: Text nach Rahlfs, Zählung wie im hebräischen Text
    const text = JSON.parse(fs.readFileSync(path.join(root, 'bundled', 'own', title, 'other', version + '.json'), 'utf8')).text;
    const src = slugs.split(' ').flatMap(book), stat = {};
    const al = alignBook(text, src, stat);
    streams.push({ title, version, tag, chapters: al.map(ch => ch.map(v => v.map(x => (x.tok ? { e: table.get(x.tok.l, x.tok.k, x.tok.s), low: x.tok.low } : x)))) });
    const n = Object.values(stat).reduce((s, x) => s + x, 0);
    report.books.push({ title, tag, words: n, ...stat, src: src.reduce((s, v) => s + v.toks.length, 0) });
    for (const k of Object.keys(stat)) report.catss[k] = (report.catss[k] || 0) + stat[k];
  } }
  groups.push(['Apokryphen', DEUTERO.filter(d => !d.dup).length]);
  for (const d of DEUTERO) rahlfs(d);
  // ----- Zähler, Wörter ohne Zuordnung aus der Wortform bestimmen -----
  const count = e => { e.n++; };
  for (const s of streams) for (const ch of s.chapters) for (const v of ch) for (const x of v) if (x.e) count(x.e);
  const byFold = new Map(); // Wortform ohne Akzente -> häufigste Bestimmung
  for (const L of table.lem.values()) for (const K of L.values()) for (const e of K.values()) { const k = G.fold(e.f), c = byFold.get(k); if (!c || e.n > c.n) byFold.set(k, e); }
  let guess = 0, none = 0;
  for (const s of streams) for (const ch of s.chapters) for (const v of ch) v.forEach((x, i) => {
    if (x.e) return;
    const e = byFold.get(G.fold(x.word));
    if (e) { v[i] = { e, guess: true }; guess++; } else { v[i] = null; none++; }
  });
  for (const s of streams) for (const ch of s.chapters) for (const v of ch) for (const x of v) if (x && x.guess) x.e.n++;
  report.guess = guess; report.none = none;
  // ----- Nummern vergeben: Lemmata alphabetisch, darin Schlüssel und Formen -----
  const P = [], pIdx = new Map(), L = [], all = [];
  const coll = new Intl.Collator('el');
  for (const l of [...table.lem.keys()].sort((a, b) => coll.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0))) {
    const groups = [];
    for (const k of [...table.lem.get(l).keys()].sort()) {
      const fs_ = [...table.lem.get(l).get(k).values()].sort((a, b) => (a.f < b.f ? -1 : 1));
      if (!pIdx.has(k)) { pIdx.set(k, P.length); P.push(k); }
      for (const e of fs_) { e.id = all.length; all.push(e); }
      groups.push(pIdx.get(k).toString(36) + '=' + fs_.map(e => e.f).join(','));
    }
    L.push(l + '\t' + gloss(l) + '\t' + groups.join(';'));
  }
  const hotIds = all.slice().sort((a, b) => b.n - a.n || a.id - b.id).map(e => e.id);
  const C = G.encoder(all.length, hotIds);
  const hot = hotIds.slice(0, C.hotLen);
  const B = streams.map(s => [s.title, s.version, s.tag, s.chapters.map(ch => ch.map(v => v.map(x => (x ? (x.low ? '~' : x.guess ? '`' : '') + C.enc(x.e.id) : '!')).join('')).join(' ').replace(/ +$/, ''))].concat(s.dup ? [1] : []));
  report.entries = all.length; report.lemmas = L.length; report.glossed = L.filter(r => r.split('\t')[1]).length;
  report.tokens = streams.reduce((s, x) => s + x.chapters.reduce((a, ch) => a + ch.reduce((b, v) => b + v.filter(Boolean).length, 0), 0), 0);
  const out = { v: 1, src: opts.src || '', cA: C.A, cB: C.B, groups, P, hot: hot.map(i => i.toString(36)).join(','), L, B };
  return { out, texts, man, report };
}

const HEAD = '// Septuaginta-Morphologie: Bestimmung jedes griechischen Wortes der mitgelieferten Septuaginta-Fassungen (CATSS-Text; deuterokanonische Bücher nach Rahlfs).\n'
  + '// L = Lemma \\t Kurzbedeutung (englisch) \\t "Schlüssel=Form,…;…" (Schlüssel = Nummer in P, Basis 36); B = [Titel, Fassung, Kennzeichen, [Kapitel: Verse mit Leerzeichen getrennt, je Wort 1–3 Zeichen, siehe gmorph.js]].\n'
  + '// Erzeugt mit tools/lxxmorph/build.js. Morphologie: LXX morphology data by Seth Kushniryk, CC BY 4.0, derived from Rahlfs Septuagint (Eliran Wong digital edition); den Wörtern des CATSS-Textes zugeordnet.\n'
  + '// Kurzbedeutungen: STEPBible TBESG/TFLSJ (Tyndale House, Cambridge / STEPBible.org, CC BY 4.0).\n';
const serialize = out => HEAD + 'window.LXX_MORPH=' + JSON.stringify(out) + ';\n';

module.exports = { build, serialize, keyOf, alignBook, loadBook, lcs, DEUTERO, CATSS, RAHLFS };

if (require.main === module) {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--')), check = process.argv.includes('--check');
  if (args.length < 2) { console.error('Aufruf: node tools/lxxmorph/build.js <lxx-morph> <STEPBible-Data> [--check]'); process.exit(1); }
  let rev = '';
  try { rev = require('child_process').execFileSync('git', ['-C', args[0], 'log', '-1', '--format=%h %cs'], { encoding: 'utf8' }).trim(); } catch { /* ohne git: kein Stand */ }
  const { out, texts, man, report } = build(args[0], args[1], { src: 'lxx-morph ' + rev });
  const js = serialize(out);
  const c = report.catss, n = Object.values(c).reduce((s, x) => s + x, 0);
  console.log(`CATSS-Wörter: ${n} · im Vers zugeordnet ${c.v || 0} · im Nachbarvers ${c.n || 0} · ähnliche Schreibung ${c.f || 0} · nur aus der Wortform ${report.guess} · ohne Bestimmung ${report.none}`);
  console.log(`Abdeckung im Zusammenhang: ${(((c.v || 0) + (c.n || 0) + (c.f || 0)) / n * 100).toFixed(2)} % · mit Wortform: ${((n - report.none) / n * 100).toFixed(2)} %`);
  console.log(`${report.lemmas} Lemmata (${report.glossed} mit Kurzbedeutung) · ${report.entries} Bestimmungen · ${report.tokens} Wörter · lxx-morph.js ${(Buffer.byteLength(js) / 1e6).toFixed(2)} MB`);
  if (process.argv.includes('--books')) for (const b of report.books) console.log(' ', (b.title + (b.tag ? ' (' + b.tag + ')' : '')).padEnd(40), String(b.words).padStart(6), b.rahlfs ? 'Rahlfs' : `v ${b.v || 0} n ${b.n || 0} f ${b.f || 0} x ${b.x || 0}  (lxx-morph ${b.src})`);
  if (check) process.exit(0);
  fs.writeFileSync(path.join(root, 'lxx-morph.js'), js);
  // Texte und Manifest
  const meta = new Map(); for (const it of man.items) if (!meta.has(it.title)) meta.set(it.title, it);
  man.items = man.items.filter(i => !/^Septuaginta \(Rahlfs/.test(i.versionTitle));
  for (const { d, version, html } of texts) {
    const he = d.attach ? (meta.get(d.title) || {}).heTitle || '' : d.he;
    const data = { title: d.title, heTitle: he, language: 'Greek', versionTitle: version,
      versionSource: 'https://github.com/OpenScriptorium/lxx-morph (Rahlfs, Septuaginta 1935, gemeinfrei; digitale Ausgabe Eliran Wong; Wortlaut aus lxx-morph von Seth Kushniryk, CC BY 4.0)',
      sectionNames: ['Chapter', 'Verse'], text: html };
    const rel = d.rel || `own/${d.title}/other/${version}.json`, p = path.join(root, 'bundled', rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const raw = JSON.stringify(data); fs.writeFileSync(p, raw);
    man.items.push({ rel, title: d.title, heTitle: he, language: 'Greek', versionTitle: version, categories: (d.attach && (meta.get(d.title) || {}).categories) || ['Second Temple', 'Apocrypha'], kind: 'other', hash: crypto.createHash('sha1').update(raw).digest('hex') });
  }
  fs.writeFileSync(path.join(root, 'bundled', 'manifest.json'), JSON.stringify(man, null, 1));
  console.log(`${texts.length} griechische Texte (Rahlfs) geschrieben`);
}
