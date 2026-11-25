// Gemeinsame Logik für die eigene, beleggebundene Bavli-Morphologie.
// H/A und die Merkmalscodes folgen dem OSHB-Inventar; die Lemmata sind eigene IDs.
(function () {
  'use strict';
  const own = id => String(id || '').startsWith('bavli:');
  const refsCache = new WeakMap();
  function wordsAt(D, ref) {
    if (!refsCache.has(D)) {
      const refs = new Map();
      for (const o of D.occurrences || []) {
        if (!refs.has(o.ref)) refs.set(o.ref, []);
        refs.get(o.ref).push(o);
      }
      refsCache.set(D, refs);
    }
    return refsCache.get(D).get(ref) || [];
  }
  function atAnchor(D, anchor) {
    const m = /^(\d+[ab]:\d+)\/(\d+)$/.exec(String(anchor));
    return m ? wordsAt(D, 'Berakhot ' + m[1]).find(o => o.token === +m[2]) || null : null;
  }
  function matchWords(D, ref, words) {
    const expected = wordsAt(D, ref);
    if (!expected.length || expected.length !== words.length) return null;
    const normalized = (word, vowels) => String(word).normalize('NFD').replace(vowels ? /[^א-ת\u05b0-\u05bc\u05bf\u05c1\u05c2\u05c7]/g : /[^א-ת]/g, '');
    if (words.some((word, i) => {
      const vowels = /[\u05b0-\u05bc\u05bf\u05c1\u05c2\u05c7]/.test(word);
      return normalized(word, vowels) !== normalized(expected[i].word, vowels);
    })) return null;
    return expected;
  }
  const analyses = e => !e || e.status === 'unresolved' ? [] : e.analyses || (e.morph ? [e] : []);
  const mainIndex = morph => {
    const parts = String(morph || '').slice(1).split('/');
    let i = parts.findIndex(s => /^[NVA]/.test(s));
    if (i < 0) i = parts.findIndex(s => /^[PD]/.test(s));
    if (i < 0) i = parts.findIndex(s => !/^S/.test(s));
    return Math.max(0, i);
  };
  function headLemma(a) {
    const ls = String(a && a.lemma || '').split('/');
    if (ls.length === 1) return ls[0];
    const parts = String(a.morph || '').slice(1).split('/'), main = mainIndex(a.morph);
    const li = parts.slice(0, main).filter(p => !p.startsWith('S')).length;
    return ls[li] || ls.at(-1) || '';
  }
  function definiteLemma(e) {
    const aa = analyses(e), ls = [...new Set(aa.map(headLemma).filter(Boolean))];
    return aa.length && ls.length === 1 ? ls[0] : '';
  }
  function definiteMorph(e) {
    const aa = analyses(e), ms = [...new Set(aa.map(a => a.morph).filter(Boolean))];
    return aa.length && aa.every(a => a.morph) && ms.length === 1 ? ms[0] : '';
  }
  function describe(a, Morph, t = s => s) {
    if (!a || !a.morph) return [];
    const lang = a.morph[0], parts = a.morph.slice(1).split('/');
    return parts.map((code, i) => {
      const d = Morph.segment(code, lang);
      if (lang === 'A' && code === 'Tr') d.pos = 'Subordinationspartikel (ד־)';
      if (lang === 'A' && ['T', 'Ta'].includes(code) && String(a.lemma || '').split('/')[i] === 'קא') d.pos = 'Aspektpartikel (קא)';
      if (lang === 'A' && code[0] === 'V') {
        if (code[2] === 'p') d.tense = 'Suffixkonjugation (Perfekt)';
        if (code[2] === 'i') d.tense = 'Präfixkonjugation (Imperfekt)';
        if (code[2] === 'c') d.tense = 'Infinitiv';
      }
      // Der OSHB-Code d wird hier als Formstatus verwendet, nicht als Behauptung
      // semantischer Definitheit (Bar-Asher Siegal §2.2.3.2.1).
      if (lang === 'A' && /^(?:N[cg][mfcbx][spdx]|A[acgo][mfcbx][spdx]|V.[rs][mfcbx][spdx])d$/.test(code)) {
        d.info = (d.info || '').replace('bestimmt', 'lange Form (Emphaticus)');
      }
      return { ...d, main: i === mainIndex(a.morph), label: [d.pos, d.stem, d.tense, d.info].filter(Boolean).map(t).join(' · ') };
    });
  }
  function occurrences(D, lemma, lang) {
    return (D.occurrences || []).filter(o => analyses(D.lexicon[o.id]).some(a => headLemma(a) === lemma && a.lang === lang));
  }
  function forms(D, lemma, lang) {
    const rows = new Map();
    for (const o of occurrences(D, lemma, lang)) {
      const e = D.lexicon[o.id], status = e.status || 'reviewed';
      for (const a of analyses(e).filter(a => headLemma(a) === lemma && a.lang === lang)) {
        const key = JSON.stringify([o.word, a.morph, status]);
        if (!rows.has(key)) rows.set(key, { word: o.word, morph: a.morph, lang, status, refs: [], n: 0 });
        const r = rows.get(key);
        // Mehrere identische Alternativen zählen ein Vorkommen nur einmal.
        if (!r.refs.some(x => x.ref === o.ref && x.token === o.token)) { r.refs.push({ ref: o.ref, token: o.token }); r.n++; }
      }
    }
    return [...rows.values()].sort((a, b) => b.n - a.n || a.word.localeCompare(b.word, 'he'));
  }
  const api = { own, wordsAt, atAnchor, matchWords, analyses, mainIndex, headLemma, definiteLemma, definiteMorph, describe, occurrences, forms };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.BavliMorph = api;
})();
