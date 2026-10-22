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

function compileTerm(raw, { fuzzy = false, prefix = false } = {}) {
  const t = fold(R.normalize(raw)).trim();
  if (!t) return null;
  const wild = /[*?]/.test(t);
  let test, literal = '';
  if (wild) {
    const re = new RegExp('^' + [...t].map(c => c === '*' ? '.*' : c === '?' ? '.' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('') + '$', 'u');
    test = w => re.test(w);
    literal = t.split(/[*?]+/).sort((a, b) => b.length - a.length)[0];
  } else if (fuzzy) {
    const m = maxDist([...t].length);
    test = w => w === t || (m > 0 && lev(w, t, m) <= m);
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

// Gibt eine Funktion zurück: normalisierter Text -> null | { idx: [Token-Nummern], tokens }
function makeMatcher({ terms, fuzzy = false, prefix = false, distance = -1, ordered = false }) {
  const cs = terms.map(t => compileTerm(t, { fuzzy, prefix })).filter(Boolean);
  if (!cs.length) return null;
  const N = distance < 0 ? Infinity : distance;
  const k = cs.length;
  return function match(n) {
    if (cs.some(c => c.literal) && !cs.every(c => !c.literal || fold(n).includes(c.literal))) return null;
    const toks = [];
    for (const m of n.matchAll(TOK)) toks.push({ w: fold(m[0]), s: m.index, e: m.index + m[0].length });
    const pos = cs.map(c => { const o = []; toks.forEach((t, i) => { if (c.test(t.w)) o.push(i); }); return o; });
    if (pos.some(p => !p.length)) return null;
    if (k === 1) return { idx: [pos[0][0]], toks };
    let found = null, budget = 5000;
    const rec = (i, chosen) => {
      if (found || budget-- < 0) return;
      if (i === k) {
        if (!ordered) {
          const lo = Math.min(...chosen), hi = Math.max(...chosen);
          if (hi - lo + 1 - k > N * (k - 1)) return;
        }
        found = chosen.slice(); return;
      }
      for (const p of pos[i]) {
        if (chosen.includes(p)) continue;
        if (ordered && i > 0 && (p <= chosen[i - 1] || p - chosen[i - 1] - 1 > N)) continue;
        chosen.push(p); rec(i + 1, chosen); chosen.pop();
        if (found) return;
      }
    };
    rec(0, []);
    return found ? { idx: found, toks } : null;
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

module.exports = { makeMatcher, snippetParts, lev, fold, compileTerm };
