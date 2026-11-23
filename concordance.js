'use strict';
// One source occurrence per row. Original spelling and source numbering are retained.
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
const R = require('./reader'), Order = require('./order'), Morph = require('./morph');
const GM = require('./gmorph'), GC = require('./greek-corpus'), SY = require('./syriac-morph');
const normalize = s => String(s || '').normalize('NFD').replace(/([\p{Script=Hebrew}\p{Script=Greek}\p{Script=Syriac}])\p{M}*/gu, m => m.replace(/\p{M}/gu, '')).toLowerCase().replace(/ς/g, 'σ').normalize('NFC');
const tokens = s => [...s.matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map(m => ({ text: m[0], key: normalize(m[0]), start: m.index, end: m.index + m[0].length }));
const plain = html => String(html).replace(/&nbsp;|&#160;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => {const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):' ';});
const textOf = html => plain(R.splitFootnotes(html).main.replace(/<br\s*\/?>(?=.)/gi, ' ').replace(/<small\b[^>]*>[\s\S]*?<\/small>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
let tables;
function data() {
  if (!tables) {
    const w = {};
    for (const f of ['oshb-lemmas.js', 'lxx-morph.js']) {
      try { new Function('window', require('node:fs').readFileSync(path.join(__dirname, f), 'utf8'))(w); } catch { /* explicit surface fallback */ }
    }
    tables = w;
  }
  return tables;
}
const sameTokens = (a, b) => a.length === b.length && a.every((x, i) => normalize(x) === b[i].key);
function analyses(e, d, html, p, ts, validHash) {
  // Never apply analyses to edited text or a different edition.
  if (d.greekMorphology && validHash) {
    const loc = R.makeLocator(d.text, d.sectionNames)(p);
    if (loc) {
      const a = GC.at(d, loc.path, loc.label, ts.map(t => t.text), null);
      if (a) return a.records.map(r => ({ lemmas: r.lemma ? [r.lemma] : [], source: r.source === 'gorman' ? 'GLAUx / Gorman' : 'OGA' }));
    }
  }
  if (d.syriacMorphology && validHash && p.length === 2) {
    const spans = [...html.matchAll(/<span class="syw" data-si="([^"]+)">([^<]+)<\/span>/g)];
    if (sameTokens(spans.map(m => m[2]), ts)) return spans.map(m => {
      const a = SY.at(d, m[1], m[2], [p[0]], String(p[1] + 1));
      return { lemmas: a ? a.parts.map(x => SY.lemma(x.lex)).filter(Boolean) : [], source: 'ETCBC Syriac' };
    });
  }
  if ((/Westminster/.test(e.versionTitle || '') || /Safran-Morphologie/.test(e.versionTitle || '')) && e.kind === 'he') {
    const spans = [...html.matchAll(/<span class="w" data-l="([^"]*)" data-m="([^"]*)">(.*?)<\/span>/g)];
    if (sameTokens(spans.map(m => textOf(m[3])), ts)) return spans.map(m => {
      let lemma = '';
      try { const a = Morph.decode(m[2], m[1]), id = a?.segs[a.main]?.lemma; lemma = data().OSHB_LEMMAS?.[id]?.[0] || ''; } catch {}
      return { lemmas: lemma ? [lemma] : [], source: /Westminster/.test(e.versionTitle) ? 'OSHB' : 'Safran' };
    });
  }
  if (/^Septuaginta \(/.test(e.versionTitle || '') && p.length === 2) {
    const D = data().LXX_MORPH, bi = D ? GM.bookIndex(D, e.title, e.versionTitle) : -1;
    if (bi >= 0 && sameTokens(GM.words(html), ts)) {
      const a = GM.verse(D, bi, p[0] + 1, p[1] + 1);
      return ts.map((_, i) => ({ lemmas: a?.[i] && !a[i].guess && !a[i].low ? [GM.info(D, a[i].id)?.lemma].filter(Boolean) : [], source: 'LXX morphology' }));
    }
  }
  return null;
}
async function search({ dir, entries, params, onProgress = () => {}, isCancelled = () => false }) {
  const qt = tokens(String(params.query || '').trim()), q = qt[0]?.key;
  const empty = { results: [], stats: [], dist: [], scanned: 0, total: 0, truncated: false, capped: false, cancelled: false, concordance: true, coverage: { annotated: 0, surface: 0 }, errors: 0 };
  if (!q || String(params.query).length > 100 || qt.length !== 1 || /[*?]/.test(params.query)) return { ...empty, error: 'Bitte ein einzelnes Wort ohne Platzhalter eingeben.' };
  const limit = Math.max(1, Math.min(5000, Number(params.limit) || 1000)), perFile = Math.max(1, Math.min(500, Number(params.perFile) || 25));
  const lemma = !!params.lemma, out = { ...empty, total: entries.length }, stats = new Map();
  for (const e of Order.sortTitles(entries, x => x.title)) {
    if (isCancelled()) break;
    let d;
    try { d = JSON.parse(await fs.readFile(path.join(dir, e.rel), 'utf8')); } catch { out.errors++; out.scanned++; continue; }
    let validHash = false;
    if (lemma && (d.greekMorphology || d.syriacMorphology)) {
      d.textHash = crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex');
      validHash = (d.greekMorphology || d.syriacMorphology).textHash === d.textHash;
    }
    let h = 0, o = 0, shown = 0, hasAnalysis = false, locator;
    const rows = []; R.walkStrings(d.text, [], (html, p) => rows.push({ html, p }));
    for (let row = 0; row < rows.length; row++) {
      if (isCancelled()) break;
      const { html, p } = rows[row], text = textOf(html), ts = tokens(text);
      const a = lemma ? analyses(e, d, html, p, ts, validHash) : null;
      if (a?.some(x => x.lemmas.length)) hasAnalysis = true;
      let passage = false;
      for (let i = 0; i < ts.length; i++) {
        const t = ts[i], aa = a?.[i], lemmaHit = aa?.lemmas.some(l => normalize(l) === q);
        if (t.key !== q && !lemmaHit) continue;
        o++; passage = true;
        if (out.results.length >= limit) { out.truncated = true; continue; }
        if (shown >= perFile) { out.capped = true; continue; }
        locator ||= R.makeLocator(d.text, d.sectionNames);
        const loc = locator(p), before = text.slice(ts[Math.max(0, i - 7)].start, t.start), after = text.slice(t.end, ts[Math.min(ts.length - 1, i + 7)].end);
        out.results.push({ rel: e.rel, title: e.title, heTitle: e.heTitle, versionTitle: e.versionTitle, kind: e.kind, language: e.language, path: p, loc: loc ? { path: loc.path, label: loc.label } : null, where: loc ? [loc.sectionLabel, loc.label].filter(Boolean).join(' · ') : '', snippet: { before, hit: t.text, after }, words: [t.text], sub: false, concordance: true, basis: lemmaHit ? 'lemma' : 'surface', analysisSource: lemmaHit ? aa.source : '', position: i + 1 });
        shown++;
      }
      if (passage) h++;
      if (params.concordancePreview && out.results.length >= limit) break;
      if (row % 100 === 0) await new Promise(r => setImmediate(r));
    }
    out.coverage[hasAnalysis ? 'annotated' : 'surface']++;
    if (o) { stats.set(e.title, (stats.get(e.title) || 0) + o); out.dist.push({ t: e.title, v: e.versionTitle || '', k: e.kind, h, o }); }
    out.scanned++; onProgress({ scanned: out.scanned, total: out.total, found: out.dist.reduce((n, x) => n + x.o, 0) });
    if (params.concordancePreview && out.results.length >= limit) break;
    await new Promise(r => setImmediate(r));
  }
  out.stats = Order.sortTitles([...stats].map(([title, n]) => ({ title, n })), x => x.title);
  if(params.crossLanguage&&!isCancelled()) await require('./concordance-parallels').attach({dir,entries,results:out.results,isCancelled});
  out.crossLanguage=!!params.crossLanguage;
  out.cancelled = isCancelled(); return out;
}
module.exports = { search, normalize, tokens, textOf };
