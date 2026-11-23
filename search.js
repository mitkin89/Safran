'use strict';
// Erweiterte Suche: mehrere Wörter in der Nähe, Platzhalter (* und ?), Fuzzy
const R = require('./reader');

const TOK = /[\p{L}\p{N}]+/gu;
const fold = s => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss');
const HE_PRE = 'והבכלמשד';

function lev(a, b, max) { // Levenshtein-Abstand mit frühem Abbruch
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v); if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
const maxDist = len => (len <= 3 ? 0 : len <= 6 ? 1 : 2);

function wildcardMatcher(pattern) {
  const chars = [...pattern];
  return word => {
    const letters = [...word];
    let wordIndex = 0, patternIndex = 0, lastStar = -1, starEnd = 0;
    while (wordIndex < letters.length) {
      const char = chars[patternIndex];
      if (char === '*') {
        lastStar = patternIndex++;
        starEnd = wordIndex;
      } else if (char === '?' || char === letters[wordIndex]) {
        wordIndex++;
        patternIndex++;
      } else if (lastStar >= 0) {
        patternIndex = lastStar + 1;
        wordIndex = ++starEnd;
      } else return false;
    }
    while (chars[patternIndex] === '*') patternIndex++;
    return patternIndex === chars.length;
  };
}

function compileTerm(raw, { fuzzy = false, prefix = false, partial = false } = {}) {
  const t = fold(R.normalize(raw)).trim();
  if (!t) return null;
  const wild = /[*?]/.test(t);
  let test, literal = '';
  if (wild) {
    test = wildcardMatcher(t);
    literal = t.split(/[*?]+/).sort((a, b) => b.length - a.length)[0];
  } else if (fuzzy) {
    const m = maxDist([...t].length);
    test = w => w === t || (m > 0 && lev(w, t, m) <= m);
  } else if (partial) { // „Auch Wortteile“: das Suchwort darf mitten in einem Wort stehen
    test = w => w.includes(t);
    literal = t;
  } else {
    test = w => w === t;
    literal = t;
  }
  const cands = w => {
    const out = [w];
    if (prefix) for (let i = 1; i <= 3 && i < w.length - 1 && HE_PRE.includes(w[i - 1]); i++) out.push(w.slice(i));
    return out;
  };
  return { raw, test: w => cands(w).some(test), literal: fuzzy && !wild ? '' : literal };
}

// Suchfeld zerlegen: mehrere Wörter = alle müssen (in der Nähe) vorkommen; "…" = genau diese Wortfolge.
// Ergebnis: [{ words: [...], quoted }] – eine Einheit mit mehreren Wörtern ist eine Wortfolge (direkt hintereinander).
// Ein Anführungszeichen mitten im Wort (רש"י) ist kein Begrenzer; solche Wörter werden an der Stelle geteilt und als Wortfolge gesucht,
// weil auch der Text dort in zwei Wörter zerfällt.
const QO = '"“„«»', QC = '"“”»«';
const PHRASE = new RegExp('(^|\\s)[' + QO + '](.+?)[' + QC + '](?=\\s|$)', 'gu');
const QTOK = /[\p{L}\p{N}\p{M}*?]+/gu;
function parseQuery(str) {
  const units = [];
  const toks = s => (R.normalize(s).match(QTOK) || []).filter(w => /[\p{L}\p{N}]/u.test(w));
  const plain = s => { for (const w of s.split(/\s+/)) { const t = toks(w); if (t.length) units.push({ words: t, quoted: false }); } };
  const s = String(str == null ? '' : str);
  let last = 0;
  for (const m of s.matchAll(PHRASE)) {
    plain(s.slice(last, m.index));
    const t = toks(m[2]); if (t.length) units.push({ words: t, quoted: true });
    last = m.index + m[0].length;
  }
  plain(s.slice(last));
  return units;
}

// Gibt eine Funktion zurück: normalisierter Text -> null | { idx: [Token-Nummern], tokens }
// terms: Wörter; ein Eintrag kann auch eine Wortfolge sein: [wort, wort …] oder { seq: [...], partial, prefix } (Wörter direkt hintereinander)
function makeMatcher({ terms, fuzzy = false, prefix = false, distance = -1, ordered = false }) {
  const us = terms.map(t => {
    const o = typeof t === 'string' ? { seq: [t] } : Array.isArray(t) ? { seq: t } : t;
    const cs = (o.seq || []).map(x => compileTerm(x, { fuzzy, prefix: o.prefix == null ? prefix : !!o.prefix, partial: !!o.partial })).filter(Boolean);
    return cs.length ? cs : null;
  }).filter(Boolean);
  if (!us.length) return null;
  const all = us.flat();
  const N = distance < 0 ? Infinity : distance;
  const k = us.length;
  const span = (p, len) => Array.from({ length: len }, (_, j) => p + j);
  return function match(n) {
    if (all.some(c => c.literal)) { const f = fold(n); if (!all.every(c => !c.literal || f.includes(c.literal))) return null; }
    const toks = [];
    for (const m of n.matchAll(TOK)) toks.push({ w: fold(m[0]), s: m.index, e: m.index + m[0].length });
    // Startpositionen je Einheit (bei einer Wortfolge: alle Wörter stehen ab dort direkt hintereinander)
    const pos = us.map(cs => { const o = []; for (let i = 0; i + cs.length <= toks.length; i++) { let ok = true; for (let j = 0; j < cs.length && ok; j++) ok = cs[j].test(toks[i + j].w); if (ok) o.push(i); } return o; });
    if (pos.some(p => !p.length)) return null;
    if (k === 1) return { idx: span(pos[0][0], us[0].length), toks };
    const end = (i, p) => p + us[i].length - 1;
    let found = null, budget = 5000;
    const rec = (i, chosen) => {
      if (found || budget-- < 0) return;
      if (i === k) {
        if (!ordered) { // Abstand je benachbartem Paar prüfen (nach Position sortiert), nicht nur die Gesamtspanne
          const sorted = chosen.map((p, j) => [p, end(j, p)]).sort((a, b) => a[0] - b[0]);
          for (let j = 1; j < sorted.length; j++) if (sorted[j][0] - sorted[j - 1][1] - 1 > N) return;
        }
        found = chosen.slice(); return;
      }
      for (const p of pos[i]) {
        if (chosen.some((c, j) => p <= end(j, c) && c <= end(i, p))) continue; // kein Wort doppelt belegen
        if (ordered && i > 0 && (p <= end(i - 1, chosen[i - 1]) || p - end(i - 1, chosen[i - 1]) - 1 > N)) continue;
        chosen.push(p); rec(i + 1, chosen); chosen.pop();
        if (found) return;
      }
    };
    rec(0, []);
    return found ? { idx: found.flatMap((p, i) => span(p, us[i].length)), toks } : null;
  };
}

// Textausschnitt mit markierten Treffern: [{ t, m }]
function snippetParts(n, m, ctxBefore = 50, ctxAfter = 70) {
  const sel = m.idx.map(i => m.toks[i]).sort((a, b) => a.s - b.s);
  const first = sel[0].s, last = sel[sel.length - 1].e;
  const parts = [];
  parts.push({ t: (first - ctxBefore > 0 ? '…' : '') + n.slice(Math.max(0, first - ctxBefore), first), m: false });
  let cur = first;
  for (const t of sel) {
    if (t.s > cur) {
      const gap = n.slice(cur, t.s);
      parts.push({ t: gap.length > 120 ? gap.slice(0, 55) + ' … ' + gap.slice(-55) : gap, m: false });
    }
    parts.push({ t: n.slice(t.s, t.e), m: true });
    cur = t.e;
  }
  parts.push({ t: n.slice(last, last + ctxAfter) + (last + ctxAfter < n.length ? '…' : ''), m: false });
  return parts;
}

module.exports = { makeMatcher, snippetParts, lev, fold, compileTerm, parseQuery };
