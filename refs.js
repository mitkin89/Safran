// Reine Hilfsfunktionen für Stellenangaben, Verslisten, Notiz-IDs und Links (kein Zugriff auf die Oberfläche).
// Läuft in Node (Tests: test11.js) und als <script> in der Oberfläche (window.Refs).
(function () {
'use strict';
const normT = x => String(x).toLowerCase().replace(/[.\s]+/g, ' ').trim();
const rowVerse = lab => { const m = String(lab || '').match(/^(\d+)/); return m ? +m[1] : null; };
const noteId = (g, sk, row) => `${g.key}|${sk}|${row}`;
// „1-5, 9“ -> { set: Set{1..5,9}, vs: "1–5, 9" }
function parseVerseList(txt) {
  const set = new Set(), parts = [];
  for (const part of String(txt).split(',')) {
    const [a, b] = part.split(/[-–]/).map(x => parseInt(x, 10));
    if (!Number.isFinite(a)) continue;
    const lo = Number.isFinite(b) ? Math.min(a, b) : a, hi = Number.isFinite(b) ? Math.min(Math.max(a, b), lo + 500) : a;
    for (let v = lo; v <= hi; v++) set.add(v);
    parts.push(lo === hi ? String(lo) : lo + '–' + hi);
  }
  return { set, vs: parts.join(', ') };
}
const fmtVerses = arr => { // [1,2,3,4,5,9] -> „1–5, 9“
  const a = [...new Set(arr)].sort((x, y) => x - y), out = [];
  for (let i = 0; i < a.length;) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; out.push(j > i ? a[i] + '–' + a[j] : String(a[i])); i = j + 1; }
  return out.join(', ');
};
function relatedTitles(a, b) {
  const n = x => ' ' + String(x || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
  const x = n(a), y = n(b);
  return x.trim() !== '' && y.trim() !== '' && (x.includes(y) || y.includes(x));
}
const sefariaUrl = ref => 'https://www.sefaria.org/' + encodeURIComponent(ref.replace(/ /g, '_').replace(/:/g, '.')).replace(/%2C/g, ',').replace(/%2F/g, '/');
// Link zur Stelle einer Notiz auf sefaria.org (freie Notizen haben keine Stelle)
function noteUrl(n) {
  const k = n.kind || 'row';
  if (k === 'free' || !n.title) return '';
  const chap = String(n.secLabel || '').replace(/^\D+/, '') || String(n.secLabel || '');
  let v = k === 'block' ? String(n.vs || '').split(',')[0].trim().replace(/[–]/g, '-') : String(n.row || '');
  const ref = (v.includes(':') ? `${n.title} ${v}` : `${n.title} ${chap}${v ? ':' + v : ''}`).replace(/\s+/g, ' ').trim();
  return sefariaUrl(ref);
}
// Deutsche Buchnamen und Kürzel (Luther/Einheitsübersetzung/Gesenius) -> Sefaria-Titel; für „Springen zu“ und Buchvorschläge
const DE_BOOKS = {
  'Genesis': ['1 Mose', 'Genesis', 'Gn'], 'Exodus': ['2 Mose', 'Exodus', 'Ex'], 'Leviticus': ['3 Mose', 'Levitikus', 'Lv'],
  'Numbers': ['4 Mose', 'Numeri', 'Nu'], 'Deuteronomy': ['5 Mose', 'Deuteronomium', 'Dtn', 'Dt'],
  'Joshua': ['Josua', 'Jos'], 'Judges': ['Richter', 'Ri'], 'I Samuel': ['1 Samuel', '1 Sam', '1 S'], 'II Samuel': ['2 Samuel', '2 Sam', '2 S'],
  'I Kings': ['1 Könige', '1 Kön', '1 Kg', '1 K'], 'II Kings': ['2 Könige', '2 Kön', '2 Kg', '2 K'],
  'Isaiah': ['Jesaja', 'Jes'], 'Jeremiah': ['Jeremia', 'Jer'], 'Ezekiel': ['Ezechiel', 'Hesekiel', 'Hes', 'Ez'],
  'Hosea': ['Hosea', 'Hos'], 'Joel': ['Joel'], 'Amos': ['Amos'], 'Obadiah': ['Obadja', 'Ob'], 'Jonah': ['Jona', 'Jon'], 'Micah': ['Micha', 'Mi'],
  'Nahum': ['Nahum', 'Nah'], 'Habakkuk': ['Habakuk', 'Hab'], 'Zephaniah': ['Zefanja', 'Zephanja', 'Zef'], 'Haggai': ['Haggai', 'Hag'],
  'Zechariah': ['Sacharja', 'Sach'], 'Malachi': ['Maleachi', 'Mal'],
  'Psalms': ['Psalmen', 'Psalm', 'Ps'], 'Proverbs': ['Sprüche', 'Sprichwörter', 'Spr'], 'Job': ['Hiob', 'Ijob', 'Hi'],
  'Song of Songs': ['Hohelied', 'Hoheslied', 'Hld'], 'Ruth': ['Ruth', 'Rut'], 'Lamentations': ['Klagelieder', 'Klgl'],
  'Ecclesiastes': ['Kohelet', 'Prediger', 'Koh'], 'Esther': ['Ester', 'Esther', 'Est'], 'Daniel': ['Daniel', 'Dn'], 'Ezra': ['Esra', 'Esr'],
  'Nehemiah': ['Nehemia', 'Neh'], 'I Chronicles': ['1 Chronik', '1 Chr', '1 Chron'], 'II Chronicles': ['2 Chronik', '2 Chr', '2 Chron']
};
const fold = x => String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const DE_BY_TITLE = new Map(Object.entries(DE_BOOKS).map(([t, l]) => [fold(t), l.map(fold)]));
const wordHit = (t, b) => t.startsWith(b) || t.split(' ').some(w => w.startsWith(b)) || (b.includes(' ') && b.split(' ').every(k => t.split(' ').some(w => w.startsWith(k))));
// passt die Eingabe b (Anfang eines deutschen Namens/Kürzels) zum Sefaria-Titel?
const deHit = (title, b) => { const l = DE_BY_TITLE.get(fold(title)), q = fold(b); return !!(l && q && l.some(a => wordHit(a, q))); };
// deutsche Namen zu einem Titel, für die Anzeige
const deNames = title => { const l = DE_BOOKS[title]; return l ? l.filter(x => x.length > 3).slice(0, 2).join(' / ') : ''; };
// Buchname aus Dateinamen („1_Samuel“, „Richter“, „2 Kön“) -> Sefaria-Titel („I Samuel“, „Judges“) oder ''
const nkBook = x => { let f = fold(x); const m = f.match(/^([123])\s*(?=[a-z])|^(i{1,3})\s+/); if (m) f = ({ '1': 'i', '2': 'ii', '3': 'iii' }[m[1]] || m[2]) + ' ' + f.slice(m[0].length); return f; };
const BOOK_BY_NAME = new Map(); for (const [t, l] of Object.entries(DE_BOOKS)) { BOOK_BY_NAME.set(nkBook(t), t); for (const a of l) if (!BOOK_BY_NAME.has(nkBook(a))) BOOK_BY_NAME.set(nkBook(a), t); }
const canonBook = x => BOOK_BY_NAME.get(nkBook(String(x).replace(/[_]+/g, ' '))) || '';
function parseMulti(q, bestGroup, defaultBook) {
  // Aufteilen: „;“ trennt immer. „,“ trennt, wenn danach ein Buchname („gen“, „1 Kings 2:1“) oder Kapitel:Vers („2:5“) folgt;
  // eine bloße Zahl gehört zur Versliste („gen 1:1-5, 9“), außer die Stelle davor hat noch kein „:“ („Psalms 23, 24“ = zwei Kapitel)
  const segs = [];
  for (const chunk of String(q).split(';')) {
    let cur = null;
    for (const t of chunk.split(',')) {
      const tt = t.trim(); if (!tt) continue;
      if (cur === null) { cur = tt; continue; }
      const startsNew = /^\p{L}/u.test(tt) || /^\d+\s*:/.test(tt) || /^\d+\s+\p{L}/u.test(tt) || !cur.includes(':');
      if (startsNew) { segs.push(cur); cur = tt; } else cur += ', ' + tt;
    }
    if (cur !== null) segs.push(cur);
  }
  const units = [], bad = [];
  let multi = segs.length > 1, lastBook = '';
  const NUM = '\\d+', RNG = '(?:\\d+(?:\\s*[-–]\\s*\\d+)?)';
  for (const seg of segs) {
    let m;
    if ((m = seg.match(new RegExp('^(.*?)\\s*(' + NUM + ')\\s*:\\s*(' + NUM + ')\\s*[-–]\\s*(' + NUM + ')\\s*:\\s*(' + NUM + ')$')))) {
      multi = true; const book = m[1].trim() || lastBook; lastBook = book;
      const c1 = +m[2], v1 = +m[3], c2 = +m[4], v2 = +m[5];
      if (c2 < c1 || c2 - c1 > 60) { bad.push(seg); continue; }
      for (let c = c1; c <= c2; c++) units.push({ book, chap: String(c), vs: (c === c1 ? `${v1}–` : '1–') + (c === c2 ? v2 : '…'), pred: v => (c !== c1 || v >= v1) && (c !== c2 || v <= v2) });
    } else if ((m = seg.match(new RegExp('^(.*?)\\s*(?<![:\\d])(' + NUM + ')\\s*[-–]\\s*(' + NUM + ')$')))) {
      multi = true; const book = m[1].trim() || lastBook; lastBook = book;
      const c1 = +m[2], c2 = +m[3];
      if (c2 < c1 || c2 - c1 > 60) { bad.push(seg); continue; }
      for (let c = c1; c <= c2; c++) units.push({ book, chap: String(c), vs: '', pred: null, ab: true }); // ab: beim Talmud beide Seiten (2a und 2b)
    } else if ((m = seg.match(new RegExp('^(.*?)\\s*(?:\\b(?:daf|kapitel|chapter|kap)\\s*)?(\\d+[ab]?)(?:\\s*:\\s*(' + RNG + '(?:\\s*,\\s*' + RNG + ')*))?$', 'i')))) {
      const book = m[1].trim() || lastBook || defaultBook || ''; lastBook = book;
      let set = null, vs = '';
      if (m[3]) {
        const pv = parseVerseList(m[3]); set = pv.set; vs = pv.vs;
      }
      units.push({ book, chap: m[2].toLowerCase(), vs, pred: set ? (v => set.has(v)) : null });
    } else if (/\p{L}/u.test(seg) && bestGroup(seg)) { // nur ein Buchname („1 Samuel“): erstes Kapitel
      lastBook = seg; units.push({ book: seg, chap: '1', vs: '', pred: null }); // ein einzelner Buchname ist keine Stellenliste (jumpTo öffnet das Buch selbst)
    } else bad.push(seg);
  }
  return multi ? { units, bad } : null;
}
const api = { normT, rowVerse, noteId, parseVerseList, fmtVerses, relatedTitles, sefariaUrl, noteUrl, parseMulti, deHit, deNames, canonBook };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Refs = api;
})();
