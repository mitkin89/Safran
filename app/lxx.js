// Wortkarte: Wiedergabe eines hebräischen Lemmas in der Septuaginta (CATSS-Zuordnung Wort für Wort) und umgekehrt.
// Läuft in Node (Tests; tools/catss/lxx-lemma.js baut daraus oshb-lxx.js) und als <script> (window.Lxx).
//  - build(books)             Index bauen: hebräisches Lemma -> griechische Lemmata mit Häufigkeit, und griechisches Lemma -> hebräische Lemmata
//  - renderings(data, lemma)  -> { total, kinds, list: [{ g, n }] }      (hebräisches Lemma = Strong-Nummer wie in der OSHB)
//  - hebrew(data, lemma)      -> { total, kinds, list: [{ h, n }] }      (griechisches Lemma)
// Gezählt wird, wo CATSS genau ein hebräisches Wort (את und ואת nicht mitgerechnet) einer griechischen Wortgruppe zuordnet und dieses Wort
// im Westminster-Text dasselbe Schriftbild hat. Die griechischen Wörter sind auf ihr Lemma zurückgeführt (θεός statt θεός/θεοῦ getrennt;
// Morphologie: lxx-morph, Index lxx-morph.js); wo die Bestimmung fehlt, bleibt die Wortform. Artikel und καί am Anfang der Gruppe fallen weg.
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
  // -> { t: übrige Wörter, i: ihre Stellen in der Gruppe }
  function pick(s, o = {}) {
    const t = gnorm(s).split(' ').filter(Boolean), i = t.map((_, k) => k);
    const shift = () => { t.shift(); i.shift(); };
    const lead = () => { while (t.length > 1 && (ARTICLE.has(t[0]) || FILL.has(t[0]))) shift(); };
    lead();
    while (t.length > 1 && FILL.has(t[t.length - 1])) { t.pop(); i.pop(); } // εἶπεν δέ
    if (o.prep && t.length > 1 && PREP.has(t[0])) { shift(); lead(); }
    if (o.suf && t.length > 1 && PRON.has(t[t.length - 1])) { t.pop(); i.pop(); t[t.length - 1] = oneAccent(t[t.length - 1]); }
    return { t, i };
  }
  const greek = (s, o) => pick(s, o).t.join(' ');
  // ein Vers: Westminster-HTML und Septuaginta-HTML -> [[Lemma, griechisches Lemma (oder Wortform)], …]
  // lems: Lemma je griechischem Wort des Verses (in der Reihenfolge von GMorph.words; null = unbekannt) – ohne lems bleiben die Wortformen
  // withCode: dritter Eintrag = Bestimmung des hebräischen Hauptworts (OSHB-Code ohne Vorsilben, Suffix angehängt), für die Filter der Wortkarte
  function pairs(heHtml, grHtml, lems, withCode, withSurface = false) {
    const units = new Map(); // Schriftbild -> Liste griechischer Gruppen (in der Reihenfolge des Verses)
    let at = 0;
    for (const m of String(grHtml || '').matchAll(GSPAN)) {
      const h = (/data-h="([^"]*)"/.exec(m[1]) || [])[1] || '', f = (/data-f="([^"]*)"/.exec(m[1]) || [])[1] || '';
      const g = m[2].replace(/<[^>]*>/g, '');
      const off = at, n = gnorm(g).split(' ').filter(Boolean).length; at += n;
      if (!h || !greek(g) || /[mz]/.test(f)) continue;
      const toks = h.split(' ').filter(Boolean), content = toks.filter(t => !PARTICLE.has(t));
      const one = content.length === 1 ? content[0] : (!content.length && toks.length === 1 ? toks[0] : null);
      if (!one) continue; // mehrere hebräische Wörter für eine Gruppe: nicht eindeutig
      let a = units.get(one); if (!a) units.set(one, a = []); a.push({ g, off });
    }
    const out = [], used = new Map();
    if (!units.size) return out;
    if (lems && lems.length !== at) lems = null; // Wortzählung passt nicht zum Index: lieber die Wortformen
    for (const m of String(heHtml || '').matchAll(WSPAN)) {
      let d = null; try { d = Morph.decode(m[2], m[1]); } catch { d = null; }
      const seg = d && d.segs[d.main]; if (!seg || !seg.lemma) continue;
      const c = cons(m[3]), a = units.get(c); if (!a) continue;
      const k = used.get(c) || 0; if (k >= a.length) continue; // jede Gruppe nur einmal
      used.set(c, k + 1);
      const codes = m[2].slice(1).split('/');
      const p = pick(a[k].g, { prep: codes.slice(0, d.main).some(x => x[0] === 'R'), suf: codes.slice(d.main + 1).some(x => x[0] === 'S') });
      const gr = p.t.map((w, j) => (lems && lems[a[k].off + p.i[j]]) || w).join(' ');
      if (withCode) {
        const ms = m[2].slice(1).split('/'), suf = ms.slice(d.main + 1).find(x => x[0] === 'S');
        const row=[seg.lemma, gr, m[2][0] + ms[d.main] + (suf ? '/' + suf : '')];
        if(withSurface){
          const original=a[k].g.match(/[^\s.,;:··’'()[\]]+/gu)||[],normalized=gnorm(a[k].g).split(' ').filter(Boolean);
          row.push(original.length===normalized.length&&p.i.every(i=>original[i])?p.i.map(i=>original[i]).join(' '):'');
        }
        out.push(row);
      } else out.push([seg.lemma, gr]);
    }
    return out;
  }
  const TOP = 12;
  // books: [{ he: [[Vers …] …], gr: [[Vers …] …], lems?: (Kapitel, Vers ab 0) => [Lemma | null …] }]
  function build(books) {
    const lem = new Map(), rev = new Map();
    const add = (M, a, b) => { let m = M.get(a); if (!m) M.set(a, m = new Map()); m.set(b, (m.get(b) || 0) + 1); };
    for (const b of books) for (let c = 0; c < b.he.length; c++) {
      const hv = b.he[c] || [], gv = (b.gr && b.gr[c]) || [];
      for (let v = 0; v < hv.length; v++) {
        if (typeof hv[v] !== 'string' || typeof gv[v] !== 'string') continue;
        for (const [l, g] of pairs(hv[v], gv[v], b.lems ? b.lems(c, v) : null)) { add(lem, l, g); if (!g.includes(' ')) add(rev, g, l); }
      }
    }
    const pack = M => {
      const out = {};
      for (const k of [...M.keys()].sort()) {
        const all = [...M.get(k)].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
        const total = all.reduce((s, x) => s + x[1], 0);
        out[k] = total + '|' + all.length + '|' + all.slice(0, TOP).map(([g, n]) => g + ':' + n).join(',');
      }
      return out;
    };
    return { v: 2, lem: pack(lem), gr: pack(rev) };
  }
  function unpack(raw, key) {
    if (!raw) return null;
    const [total, kinds, rest] = raw.split('|');
    return { total: +total, kinds: +kinds, list: rest ? rest.split(',').map(x => { const i = x.lastIndexOf(':'); return { [key]: x.slice(0, i), n: +x.slice(i + 1) }; }) : [] };
  }
  const renderings = (data, lemma) => unpack(data && data.lem && data.lem[lemma], 'g');
  const hebrew = (data, lemma) => unpack(data && data.gr && data.gr[lemma], 'h');
  const api = { build, pairs, greek, pick, renderings, hebrew, cons };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Lxx = api;
})();
