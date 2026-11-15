// Wortkarte: Wiedergabe eines hebräischen Lemmas in der Septuaginta (CATSS-Zuordnung Wort für Wort).
// Läuft in Node (Tests; tools/catss/lxx-lemma.js baut daraus oshb-lxx.js) und als <script> (window.Lxx).
//  - build(books)       Index bauen: Lemma -> griechische Wortformen mit Häufigkeit
//  - renderings(data, lemma)  -> { total, kinds, list: [{ g, n }] }
// Gezählt wird, wo CATSS genau ein hebräisches Wort (את und ואת nicht mitgerechnet) einer griechischen Wortgruppe zuordnet und dieses Wort
// im Westminster-Text dasselbe Schriftbild hat. Die griechischen Formen sind nicht lemmatisiert (θεός und θεοῦ zählen getrennt);
// Artikel und καί am Anfang der Gruppe fallen weg.
(function () {
  'use strict';
  const Morph = typeof module !== 'undefined' && module.exports ? require('./morph') : window.Morph;
  const WSPAN = /<span class="w" data-l="([^"]*)" data-m="([^"]*)">(.*?)<\/span>/g;
  const GSPAN = /<span class="wg[^"]*"([^>]*)>(.*?)<\/span>/g;
  const cons = w => String(w).replace(/<[^>]*>/g, '').replace(/[^א-ת]/g, '');
  const ARTICLE = new Set('ὁ ἡ τό τοῦ τῆς τῷ τῇ τόν τήν οἱ αἱ τά τῶν τοῖς ταῖς τούς τάς καί'.split(' '));
  const PARTICLE = new Set(['את', 'ואת']);
  // Akzent am Wortende vereinheitlichen (Gravis -> Akut), Satzzeichen weg, klein
  const gnorm = s => String(s).normalize('NFD').replace(/̀/g, '́').normalize('NFC').toLowerCase().replace(/[.,;:·’'()\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const FILL = new Set(['δέ', 'γάρ', 'οὖν', 'τε', 'μέν']); // Partikeln ohne hebräisches Gegenstück
  const PREP = new Set('ἐν εἰς ἐκ ἐξ ἀπό ἀπ ἀφ ἐπί ἐπ ἐφ πρός κατά κατ καθ διά δι μετά μετ μεθ παρά παρ ὑπό ὑπ ὑφ ὑπέρ περί ἕως ὡς ὥσπερ ἐνώπιον ἐναντίον ἔναντι σύν'.split(' '));
  const PRON = new Set('μου σου αὐτοῦ αὐτῆς αὐτῶν ἡμῶν ὑμῶν με σε αὐτόν αὐτήν αὐτό αὐτούς αὐτάς αὐτά ἡμᾶς ὑμᾶς μοι σοι αὐτῷ αὐτῇ αὐτοῖς αὐταῖς ἡμῖν ὑμῖν'.split(' '));
  // zweiter Akzent vor einem Enklitikon (ἔλεός σου) entfällt, wenn das Pronomen abgetrennt wird
  const oneAccent = w => { const d = w.normalize('NFD'), i = d.lastIndexOf('\u0301'); return (d.match(/[\u0301\u0342]/g) || []).length > 1 && i >= 0 ? (d.slice(0, i) + d.slice(i + 1)).normalize('NFC') : w; };
  // Wortgruppe auf das eigentliche Wort kürzen: Artikel und καί vorn immer; Präposition vorn / Pronomen hinten nur, wenn das hebräische Wort
  // eine vorangestellte Präposition bzw. ein Suffix hat (sonst ist die Präposition oder das Pronomen selbst die Übersetzung)
  function greek(s, o = {}) {
    const t = gnorm(s).split(' ').filter(Boolean);
    const lead = () => { while (t.length > 1 && (ARTICLE.has(t[0]) || FILL.has(t[0]))) t.shift(); };
    lead();
    while (t.length > 1 && FILL.has(t[t.length - 1])) t.pop(); // εἶπεν δέ
    if (o.prep && t.length > 1 && PREP.has(t[0])) { t.shift(); lead(); }
    if (o.suf && t.length > 1 && PRON.has(t[t.length - 1])) { t.pop(); t[t.length - 1] = oneAccent(t[t.length - 1]); }
    return t.join(' ');
  }
  // ein Vers: Westminster-HTML und Septuaginta-HTML -> [[Lemma, griechische Form], …]
  function pairs(heHtml, grHtml) {
    const units = new Map(); // Schriftbild -> Liste griechischer Gruppen (in der Reihenfolge des Verses)
    for (const m of String(grHtml || '').matchAll(GSPAN)) {
      const h = (/data-h="([^"]*)"/.exec(m[1]) || [])[1] || '', f = (/data-f="([^"]*)"/.exec(m[1]) || [])[1] || '';
      const g = m[2].replace(/<[^>]*>/g, '');
      if (!h || !greek(g) || /[mz]/.test(f)) continue;
      const toks = h.split(' ').filter(Boolean), content = toks.filter(t => !PARTICLE.has(t));
      const one = content.length === 1 ? content[0] : (!content.length && toks.length === 1 ? toks[0] : null);
      if (!one) continue; // mehrere hebräische Wörter für eine Gruppe: nicht eindeutig
      let a = units.get(one); if (!a) units.set(one, a = []); a.push(g);
    }
    const out = [], used = new Map();
    if (!units.size) return out;
    for (const m of String(heHtml || '').matchAll(WSPAN)) {
      let d = null; try { d = Morph.decode(m[2], m[1]); } catch { d = null; }
      const seg = d && d.segs[d.main]; if (!seg || !seg.lemma) continue;
      const c = cons(m[3]), a = units.get(c); if (!a) continue;
      const k = used.get(c) || 0; if (k >= a.length) continue; // jede Gruppe nur einmal
      used.set(c, k + 1);
      const codes = m[2].slice(1).split('/');
      out.push([seg.lemma, greek(a[k], { prep: codes.slice(0, d.main).some(x => x[0] === 'R'), suf: codes.slice(d.main + 1).some(x => x[0] === 'S') })]);
    }
    return out;
  }
  const TOP = 12;
  // books: [{ he: [[Vers …] …], gr: [[Vers …] …] }]
  function build(books) {
    const lem = new Map();
    for (const b of books) for (let c = 0; c < b.he.length; c++) {
      const hv = b.he[c] || [], gv = (b.gr && b.gr[c]) || [];
      for (let v = 0; v < hv.length; v++) {
        if (typeof hv[v] !== 'string' || typeof gv[v] !== 'string') continue;
        for (const [l, g] of pairs(hv[v], gv[v])) { let m = lem.get(l); if (!m) lem.set(l, m = new Map()); m.set(g, (m.get(g) || 0) + 1); }
      }
    }
    const out = {};
    for (const k of [...lem.keys()].sort()) {
      const all = [...lem.get(k)].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      const total = all.reduce((s, x) => s + x[1], 0);
      out[k] = total + '|' + all.length + '|' + all.slice(0, TOP).map(([g, n]) => g + ':' + n).join(',');
    }
    return { v: 1, lem: out };
  }
  function renderings(data, lemma) {
    const raw = data && data.lem && data.lem[lemma]; if (!raw) return null;
    const [total, kinds, rest] = raw.split('|');
    return { total: +total, kinds: +kinds, list: rest ? rest.split(',').map(x => { const i = x.lastIndexOf(':'); return { g: x.slice(0, i), n: +x.slice(i + 1) }; }) : [] };
  }
  const api = { build, pairs, greek, renderings, cons };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Lxx = api;
})();
