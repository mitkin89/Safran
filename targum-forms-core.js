// Aramäische Wortkarten aus den bereits bestimmten ETCBC-Targum-Wörtern.
// Der Index enthält ausschließlich belegte Wortformen, keine ergänzten Paradigmen.
(function () {
  'use strict';
  const FINAL = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };
  const fold = s => String(s || '').normalize('NFD').replace(/[^א-ת]/g, '').replace(/[ךםןףץ]/g, c => FINAL[c]);
  const decode = s => { let n = 0; return s.split('.').map(v => (n += parseInt(v, 36))); };
  const bookId = b => b[0] + ' (' + b[2] + ')';
  const indexes = new WeakMap();
  function index(D) {
    if (indexes.has(D)) return indexes.get(D);
    const lemmas = new Map(), forms = new Map();
    const add = (m, k, id) => { if (!k) return; if (!m.has(k)) m.set(k, new Set()); m.get(k).add(id); };
    for (const [id, [lex, rows]] of Object.entries(D.L)) {
      add(lemmas, fold(lex[0]), id);
      for (const [f] of rows) add(forms, fold(f), id);
    }
    const out = { lemmas, forms }; indexes.set(D, out); return out;
  }
  function dictionaryLemmas(D, head) {
    const ix = index(D), found = new Set();
    for (const h of String(head || '').split(/[·,;/\s]+/)) {
      const key = fold(h); if (!key) continue;
      // Zuerst das tatsächliche Lexem, sonst eine so belegte Wortform; nie bloß dieselbe Wurzel.
      for (const id of (ix.lemmas.get(key) || ix.forms.get(key) || [])) found.add(id);
    }
    return [...found];
  }
  function model(D, id) {
    const entry = D.L[id]; if (!entry) return null;
    const forms = entry[1].map(([f, key, packed], i) => { const refs = decode(packed); return { f, key, refs, n: refs.length, i }; });
    return { lemma: id, forms, total: forms.reduce((n, f) => n + f.n, 0) };
  }
  function refs(D, mdl, selection) {
    const grouped = new Map();
    for (const i of String(selection).split(',')) {
      const form = mdl.forms[+i]; if (!form) continue;
      for (const code of form.refs) grouped.set(code, (grouped.get(code) || 0) + 1);
    }
    return [...grouped].sort((a, b) => a[0] - b[0]).map(([code, n]) => {
      const bi = Math.floor(code / 1000000), rest = code % 1000000, b = D.B[bi];
      return { book: bookId(b), title: b[0], vt: b[1], ch: Math.floor(rest / 1000), v: rest % 1000, n };
    });
  }
  function dist(D, mdl) {
    const out = D.B.map(b => ({ book: bookId(b), title: b[0], n: 0, verses: 0, size: b[3] })), byBook = new Map(out.map(x => [x.book, x]));
    for (const r of refs(D, mdl, mdl.forms.map((_, i) => i).join(','))) { const b = byBook.get(r.book); b.n += r.n; b.verses++; }
    return out;
  }
  const refsIn = (D, mdl, book) => refs(D, mdl, mdl.forms.map((_, i) => i).join(',')).filter(r => r.book === book);
  function topForms(mdl, limit = 8) {
    const combined = new Map();
    for (const f of mdl.forms) {
      if (!combined.has(f.f)) combined.set(f.f, { f: f.f, n: 0, ids: [] });
      const x = combined.get(f.f); x.n += f.n; x.ids.push(f.i);
    }
    const list = [...combined.values()].sort((a, b) => b.n - a.n).map(x => ({ f: x.f, n: x.n, i: x.ids.join(',') }));
    return { kinds: list.length, list: list.slice(0, limit) };
  }
  const LABELS = {
    subs: 'Substantiv', pron: 'Pronomen', unknown: 'unbekannt', noun: 'Nomen', verb: 'Verb', adjv: 'Adjektiv', advb: 'Adverb', conj: 'Konjunktion', prep: 'Präposition', prps: 'Personalpronomen', prde: 'Demonstrativpronomen', prin: 'Interrogativpronomen', nega: 'Negation', art: 'Artikel', intj: 'Interjektion', nmpr: 'Eigenname', numr: 'Zahlwort', inrg: 'Interrogativpartikel',
    G: 'Peal (G)', D: 'Pael (D)', C: 'Aphel (C)', Gt: 'Ethpeel (Gt)', Dt: 'Ethpaal (Dt)', Ct: 'Ittaphal (Ct)', DD: 'Pael-Variante (DD)', PO: 'Pol (PO)', POT: 'Ethpol (POT)',
    e: 'Emphaticus', a: 'Absolutus', c: 'Constructus', x: 'Absolutus oder Constructus', s: 'Singular', pl: 'Plural', m: 'maskulin', f: 'feminin',
  };
  const describe = (key, t = s => s) => String(key).split('.').filter(x => x && x !== '-').map(x => t(LABELS[x] || x)).join(' · ');
  function render(mdl, { esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), t = s => s, current } = {}) {
    const rows = mdl.forms.slice().sort((a, b) => b.n - a.n);
    return `<table class="fmT"><thead><tr><th>${esc(t('Form'))}</th><th>${esc(t('Bestimmung'))}</th><th>${esc(t('Belege'))}</th></tr></thead><tbody>${rows.map(f => `<tr><td><button type="button" class="fmF${current && current.form === f.f ? ' cur' : ''}" data-i="${f.i}"><span lang="arc" dir="rtl">${esc(f.f)}</span><small>${f.n}</small></button></td><td>${esc(describe(f.key, t))}</td><td>${f.n}</td></tr>`).join('')}</tbody></table>`;
  }
  const api = { fold, bookId, dictionaryLemmas, model, refs, refsIn, dist, topForms, describe, render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.TargumForms = api;
})();
