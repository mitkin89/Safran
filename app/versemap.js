// Versumrechnung zwischen Zähltraditionen (hebräisch = Sefaria, englisch, lateinisch, griechisch) für die Bücher des Tanach.
// Tabelle: versemap-data.js, erzeugt von tools/tvtms/build.js aus TVTMS (STEPBible.org / Tyndale House Cambridge, CC BY 4.0).
// Reine Rechenfunktionen ohne Oberfläche; läuft in Node (Tests: tests/integration/verse-numbering.cjs) und als <script> (window.VerseMap).
//  - map(ref, from, to)          'Psalms 51:1', 'eng', 'heb' -> { ref: 'Psalms 51:3', refs: ['Psalms 51:3'], changed: true, partial: false, none: false }
//                                Bereiche („Joel 2:28-32“), ganze Kapitel („Psalms 22“, griechisch -> „Psalms 23“), 1→n, n→1 und Teilverse (partial)
//  - resolve(ref, trad)         Stellenangabe aus einem Text mit der Zitier-Tradition „trad“ auf die hebräische Zählung bringen (für autoref.js)
//  - valid(ref)                 gibt es die Stelle in der hebräischen Zählung?
//  - verse(book, c, v, from, to) -> [[Kapitel, Vers, Teilvers?] …]   (leer = der Vers fehlt in der Zieltradition)
//  - remap(text, book, from)     Text (Kapitel -> Verse) aus einer anderen Zählung in die hebräische umstellen, für die Spaltenansicht
//  - tradOf(cfg, entry, what)    Zähltradition einer Fassung aus bundled/versification.json ('text' = ihre eigene Zählung, 'cites' = die ihrer Stellenangaben)
(function () {
'use strict';
const DATA = typeof module !== 'undefined' && module.exports ? require('./versemap-data.js') : window.VERSEMAP_DATA;
const TRAD = ['heb', 'eng', 'lat', 'grk'];
const LABEL = { heb: 'hebräische Zählung', eng: 'englische Zählung', lat: 'lateinische Zählung (Vulgata)', grk: 'griechische Zählung (Septuaginta)' };
const SHORT = { heb: 'hebr.', eng: 'engl.', lat: 'lat.', grk: 'griech.' };
const BOOKS = new Set(['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ruth',
  'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles']);
const COL = {}; ((DATA && DATA.trad) || []).forEach((t, i) => { COL[t] = i; });

// Zelle „32:2-33“, „37:1,37:2.1“, „=3:1“, „“, „?“ -> { items: [[c, v, sub|null] …], into } | { none } | null
const cellCache = new Map();
function cell(s) {
  if (cellCache.has(s)) return cellCache.get(s);
  let r;
  if (s === '?') r = null;
  else if (s === '') r = { none: true };
  else {
    const into = s[0] === '=';
    const items = [];
    for (const p of (into ? s.slice(1) : s).split(',')) {
      const m = /^(\d+):(\d+)(?:-(\d+))?(?:\.(\d+))?$/.exec(p); if (!m) continue;
      if (m[3] != null) for (let v = +m[2]; v <= +m[3]; v++) items.push([+m[1], v, null]);
      else items.push([+m[1], +m[2], m[4] != null ? +m[4] : null]);
    }
    r = { items, into };
  }
  cellCache.set(s, r);
  return r;
}
// Verzeichnis je Buch und Richtung: 'c:v' -> { to: [[c, v, teil] …], part }
const idxCache = new Map();
function index(book, from, to) {
  const key = book + '|' + from + '|' + to;
  let ix = idxCache.get(key); if (ix) return ix;
  ix = new Map();
  const rows = (DATA && DATA.books && DATA.books[book]) || [], fi = COL[from], ti = COL[to];
  if (fi != null && ti != null) for (const row of rows) {
    const A = cell(row[fi]), B = cell(row[ti]);
    if (!A || !B || A.none) continue; // in der Quelltradition nicht vorhanden
    if (A.into && (B.none || B.into)) continue;
    const bItems = B.none ? [] : B.items;
    // „steht in 3:1“ (A.into): der Vers 3:1 der Quelltradition umfasst auch diese Zielverse
    const pairwise = !A.into && !B.none && !B.into && A.items.length === bItems.length;
    A.items.forEach((a, i) => {
      const k = a[0] + ':' + a[1];
      let e = ix.get(k); if (!e) ix.set(k, (e = { to: [], part: false }));
      const targets = pairwise ? [bItems[i]] : bItems;
      // Teilvers: die Zielstelle umfasst mehr als diesen Vers (n→1, „steht in …“) oder nur ein Stück von ihm / der Quelle
      if (!pairwise && bItems.length && (B.into || A.into || A.items.length > 1)) e.part = true;
      for (const b of targets) {
        if (b[2] != null && b[2] > 0) e.part = true;
        if (!e.to.some(x => x[0] === b[0] && x[1] === b[1])) e.to.push([b[0], b[1]]);
      }
    });
  }
  idxCache.set(key, ix);
  return ix;
}
const known = book => BOOKS.has(book);
// ein Vers -> Zielverse; nicht genannte Verse zählen in allen Traditionen gleich
function verse(book, c, v, from, to) {
  if (from === to || !known(book)) return [[c, v]];
  const e = index(book, from, to).get(c + ':' + v);
  if (e) return e.to.map(x => x.slice());
  // nicht genannt: gleiche Nummer – außer diese Nummer ist in der Zieltradition schon ein anderer Vers (dann fehlt er dort)
  const back = index(book, to, from).get(c + ':' + v);
  return back && back.to.length && !back.to.some(x => x[0] === c && x[1] === v) ? [] : [[c, v]];
}
function partial(book, c, v, from, to) { const e = from !== to && known(book) ? index(book, from, to).get(c + ':' + v) : null; return !!(e && e.part); }
const vs = v => (v === 0 ? 'title' : String(v)); // Vers 0 = Überschrift ohne eigene Verszahl (englische Psalmen)
// Versliste -> „51:3-5“, „3:3-5“ + „4:1-2“ …
function chunks(items) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    let j = i;
    while (j + 1 < items.length && items[j + 1][0] === items[i][0] && items[j + 1][1] === items[j][1] + 1) j++;
    out.push({ c: items[i][0], a: items[i][1], b: items[j][1] });
    i = j;
  }
  return out;
}
const chunkStr = k => `${k.c}:${vs(k.a)}` + (k.b > k.a ? '-' + k.b : '');
// „Buch 3:4“, „Buch 3:4-7“, „Buch 3“, „Buch 3:4-4:2“
function parse(ref) {
  const m = /^(.*?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(?:(\d+):)?(\d+))?)?$/.exec(String(ref || '').trim());
  if (!m) return null;
  return { book: m[1], c: +m[2], v: m[3] != null ? +m[3] : null, c2: m[4] != null ? +m[4] : null, v2: m[5] != null ? +m[5] : null };
}
function map(ref, from, to) {
  const same = { ref, refs: [ref], changed: false, partial: false, none: false };
  const p = parse(ref);
  if (!p || from === to || !known(p.book) || COL[from] == null || COL[to] == null) return same;
  if (p.v == null) { // ganzes Kapitel: wohin der Anfang des Kapitels fällt
    for (let v = 1; v <= 3; v++) { const t = verse(p.book, p.c, v, from, to); if (t.length) { const r = `${p.book} ${t[0][0]}`; return { ref: r, refs: [r], changed: t[0][0] !== p.c, partial: false, none: false }; } }
    return same;
  }
  let items = [], part = false;
  if (p.c2 != null && p.c2 !== p.c) { // Bereich über die Kapitelgrenze: Anfang und Ende umrechnen
    const a = verse(p.book, p.c, p.v, from, to), b = verse(p.book, p.c2, p.v2, from, to);
    if (!a.length || !b.length) return { ref: null, refs: [], changed: true, partial: false, none: true };
    const z = b[b.length - 1], r = `${p.book} ${a[0][0]}:${vs(a[0][1])}-${z[0]}:${vs(z[1])}`;
    return { ref: r, refs: [r], changed: r !== ref, partial: false, none: false };
  }
  const end = p.v2 != null && p.v2 >= p.v && p.v2 - p.v <= 200 ? p.v2 : p.v;
  for (let v = p.v; v <= end; v++) {
    if (partial(p.book, p.c, v, from, to)) part = true;
    for (const t of verse(p.book, p.c, v, from, to)) if (!items.some(x => x[0] === t[0] && x[1] === t[1])) items.push(t);
  }
  if (!items.length) return { ref: null, refs: [], changed: true, partial: false, none: true };
  // in Leserichtung ordnen, wenn die Tradition nur zusammenhängende Stücke vertauscht
  const ks = chunks(items);
  const refs = ks.map(k => `${p.book} ${chunkStr(k)}`);
  let first = refs[0];
  if (ks.length === 2 && ks[1].c === ks[0].c + 1 && ks[1].a === 1) first = `${p.book} ${ks[0].c}:${vs(ks[0].a)}-${ks[1].c}:${ks[1].b}`; // läuft über die Kapitelgrenze weiter
  const norm = `${p.book} ${p.c}:${p.v}` + (end > p.v ? '-' + end : '');
  return { ref: first, refs, changed: refs.length !== 1 || refs[0] !== norm, partial: part, none: false };
}
// ---------- hebräische Zählung prüfen und Stellenangaben auf sie bringen ----------
const shapeCache = new Map();
function shapeOf(book) {
  if (!shapeCache.has(book)) shapeCache.set(book, DATA && DATA.shape && DATA.shape[book] ? DATA.shape[book].split(' ').map(Number) : null);
  return shapeCache.get(book);
}
// Gibt es die Stelle in der hebräischen Zählung? (Bücher außerhalb des Tanach: immer ja)
function valid(ref) {
  const p = parse(ref); if (!p) return false;
  const sh = shapeOf(p.book); if (!sh) return true;
  const ok = (c, v) => c >= 1 && c <= sh.length && (v == null || (v >= 1 && v <= sh[c - 1]));
  if (!ok(p.c, p.v)) return false;
  if (p.v2 != null) return p.c2 != null ? ok(p.c2, p.v2) && (p.c2 > p.c || (p.c2 === p.c && p.v2 >= p.v)) : p.v2 >= p.v && ok(p.c, p.v2);
  return true;
}
// Stellenangabe aus einem Text, der nach „trad“ zitiert, in die hebräische Zählung bringen.
//  - trad eng/lat/grk: umrechnen
//  - trad heb (Standard): die Stelle bleibt; gibt es sie hebräisch aber nicht (z. B. „Joel 3:11“, „1 Kön 4:24“ in einem Werk, das sonst
//    hebräisch zählt), wird sie als englische Zählung gelesen, wenn das eine vorhandene Stelle ergibt
// -> { ref, orig, from, partial, guessed } ; from = null: unverändert
function resolve(ref, trad) {
  const same = { ref, orig: ref, from: null, partial: false, guessed: false };
  const p = parse(ref);
  if (!p || !known(p.book)) return same;
  if (trad && trad !== 'heb') {
    const r = map(ref, trad, 'heb');
    return r.changed && r.ref ? { ref: r.ref, orig: ref, from: trad, partial: r.partial, guessed: false, refs: r.refs } : same;
  }
  if (p.v == null || valid(ref)) return same;
  // nur die englische Zählung: sie teilt die Kapitel wie ältere deutsche (Luther-)Bibeln, und die Probe an den mitgelieferten Texten trifft
  // („1 Kön 4, 32“ = 5,12; „Joel 3, 11“ = 4,11). Die lateinische Psalmzählung würde dagegen bloße Druckfehler „berichtigen“.
  const r = map(ref, 'eng', 'heb');
  if (r.changed && r.ref && r.refs.every(valid)) return { ref: r.ref, orig: ref, from: 'eng', partial: r.partial, guessed: true, refs: r.refs };
  return same;
}

// Hinweis für Vorschau und Tooltip: „englische Zählung Psalms 51:1 = hebr. Psalms 51:3“ (labels: eigene Bezeichnungen, z. B. übersetzt)
function note(orig, mapped, from, labels) {
  const L = labels || LABEL, S = (labels && labels.short) || SHORT;
  const p = parse(orig), q = parse(mapped);
  const tail = q && p && q.book === p.book ? mapped.slice(q.book.length + 1) : mapped;
  return `${L[from] || from} ${orig} = ${S.heb} ${tail}`;
}

// Text (Kapitel -> Verse) aus der Zählung „from“ in die hebräische umstellen. Verse, die anders zählen, bekommen ihre eigene Nummer als
// kleines Zeichen davor („[38:31]“); was hebräisch nicht vorhanden ist (Zusätze), hängt am vorangehenden Vers.
// -> { text, src: { 'c:v' (hebräisch) -> [[c, v] der Quelle …] }, moved } ; moved = 0: nichts zu tun, text ist das Original
function remap(text, book, from) {
  const plain = { text, src: {}, moved: 0 };
  if (from === 'heb' || !known(book) || COL[from] == null || !Array.isArray(text) || !text.every(ch => ch == null || (Array.isArray(ch) && ch.every(v => v == null || typeof v === 'string')))) return plain;
  if (!((DATA.books[book] || []).length)) return plain;
  const out = [], src = {};
  let moved = 0, lastSlot = null;
  const put = (hc, hv, c, v, html, mark) => {
    while (out.length < hc) out.push([]);
    const ch = out[hc - 1];
    while (ch.length < hv) ch.push('');
    const k = hc + ':' + hv;
    (src[k] = src[k] || []).push([c, v]);
    ch[hv - 1] = (ch[hv - 1] ? ch[hv - 1] + ' ' : '') + (mark ? `<small>[${c}:${v}]</small> ` : '') + html;
    lastSlot = [hc, hv];
  };
  // erst alle Verse mit hebräischem Gegenstück in der Reihenfolge der Quelle, damit zusammengelegte Verse richtig aufeinander folgen
  const extra = [];
  text.forEach((ch, ci) => (ch || []).forEach((html, vi) => {
    if (typeof html !== 'string' || !html.trim()) return;
    const c = ci + 1, v = vi + 1, t = verse(book, c, v, from, 'heb').filter(x => x[1] > 0);
    if (!t.length) { extra.push([c, v, html, lastSlot]); return; }
    const diff = t[0][0] !== c || t[0][1] !== v;
    if (diff || t.length > 1) moved++;
    put(t[0][0], t[0][1], c, v, html, diff);
  }));
  for (const [c, v, html, after] of extra) { // ohne hebräisches Gegenstück: an den Vers davor (sonst an den Anfang des gleichnamigen Kapitels)
    const [hc, hv] = after || [c, 1];
    moved++;
    put(hc, hv, c, v, html, true);
  }
  for (const k of Object.keys(src)) if (src[k].length > 1) { // mehrere Quellverse in einem hebräischen: jeder trägt seine Nummer
    const [hc, hv] = k.split(':').map(Number);
    if (!/^<small>\[/.test(out[hc - 1][hv - 1])) out[hc - 1][hv - 1] = `<small>[${src[k][0][0]}:${src[k][0][1]}]</small> ` + out[hc - 1][hv - 1];
  }
  return moved ? { text: out, src, moved } : plain;
}

// ---------- Zähltradition einer Fassung (bundled/versification.json) ----------
// cfg.rules: [{ versionTitle | versionTitlePrefix | title | titlePrefix | rel, text?: 'grk', cites?: 'eng' }] – die erste passende Regel mit dem gefragten Feld gilt
function tradOf(cfg, entry, what) {
  const e = entry || {};
  for (const r of (cfg && cfg.rules) || []) {
    if (!r[what] || !TRAD.includes(r[what])) continue;
    if (r.rel != null && r.rel !== e.rel) continue;
    if (r.versionTitle != null && r.versionTitle !== e.versionTitle) continue;
    if (r.versionTitlePrefix != null && !String(e.versionTitle || '').startsWith(r.versionTitlePrefix)) continue;
    if (r.title != null && r.title !== e.title) continue;
    if (r.titlePrefix != null && !String(e.title || '').startsWith(r.titlePrefix)) continue;
    return r[what];
  }
  return 'heb';
}

const api = { map, verse, partial, remap, note, tradOf, known, parse, valid, resolve, TRAD, LABEL, SHORT, source: DATA && DATA.source };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.VerseMap = api;
})();
