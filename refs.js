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
const api = { normT, rowVerse, noteId, parseVerseList, fmtVerses, relatedTitles, sefariaUrl, noteUrl, parseMulti };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Refs = api;
})();
