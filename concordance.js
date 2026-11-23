'use strict';
// One source occurrence per row. Original spelling and source numbering are retained.
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
const R = require('./reader'), Order = require('./order'), Morph = require('./morph');
const GM = require('./gmorph'), GC = require('./greek-corpus'), SY = require('./syriac-morph');
let syriacReviewCatalog;
const syriacReviews = new Map();
function syriacReview(book) {
  if (syriacReviews.has(book)) return syriacReviews.get(book);
  if (!syriacReviewCatalog) {
    const reviews = [require('./peshitta-ruth-lemma-review.json'), require('./peshitta-isaiah-lemma-review.json'),
      ...require('./peshitta-lemma-assignments.json').books];
    const catalog = new Map(reviews.map(review => [review.book, review]));
    const supplements = [require('./peshitta-nt-context-review.json'), require('./peshitta-lexical-context-review.json'),
      require('./peshitta-corpus-dictionary-review.json')].flatMap(source => source.books);
    for (const supplement of supplements) {
      const review = catalog.get(supplement.book);
      if (review && supplement.textHash !== review.textHash) throw new Error('Peshitta review edition mismatch');
      catalog.set(supplement.book, review ? {...review, entries: [...review.entries, ...supplement.entries]} : supplement);
    }
    syriacReviewCatalog = catalog;
  }
  const review = syriacReviewCatalog.get(book);
  if (!review) {
    syriacReviews.set(book, null);
    return null;
  }
  const words = new Map();
  for (const row of review.entries) {
    if (!row.parts && !row.sedra && !row.contextLemma) continue;
    const lemmas = row.parts ? row.parts.map(([, lexeme]) => SY.lemma(lexeme)).filter(Boolean) : [row.contextLemma];
    let analysis = { lemmas, source: review.source };
    if (row.sedra) analysis = {
      lemmas: [row.sedra.lemma], source: 'Safran (KI-Kontextprüfung mit SEDRA)', reference: `SEDRA #${row.sedra.id}`,
    };
    if (row.parallel) analysis = {
      lemmas, source: 'ETCBC Syriac (Paralleltext)', reference: `${row.parallel.book} ${row.parallel.ref}`,
    };
    if (row.contextualSources) analysis = {
      lemmas, source: 'ETCBC Syriac (automatischer Kontextabgleich)',
      reference: row.contextualSources.map(({book, ref}) => `${book} ${ref}`).join(' · '),
    };
    if (row.alignedSources) analysis = {
      lemmas, source: 'ETCBC Syriac (automatischer Übersetzungsabgleich)',
      reference: row.alignedSources.map(({book, ref}) => `${book} ${ref}`).join(' · '),
    };
    if (row.ntSources) analysis = {
      lemmas: analysis.lemmas, source: 'Safran (KI-Kontextprüfung mit NT-Belegen)',
      reference: [
        row.sedra && `SEDRA #${row.sedra.id}`,
        ...row.ntSources.map(({book, chapter, verse}) => `syrnt · ${book} ${chapter}:${verse}`),
      ].filter(Boolean).join(' · '),
    };
    if (row.unimorph) analysis = {
      lemmas: analysis.lemmas, source: 'Safran (KI-Kontextprüfung mit UniMorph-Belegen)',
      reference: `UniMorph Syriac · ${row.contextLemma} · ${row.unimorph.grammar.join(' / ')}`,
    };
    if (row.corpusDictionaryReview) analysis = {
      lemmas: analysis.lemmas, source: 'Safran (KI-Kontextprüfung mit ETCBC- und SEDRA-Belegen)',
      reference: [`SEDRA #${row.corpusDictionaryReview.sedraId}`,
        ...row.corpusDictionaryReview.sources.map(s => `ETCBC Syriac · ${s.book} ${s.chapter}:${s.verse}`),
      ].join(' · '),
    };
    words.set(row.id, { ...row, analysis });
  }
  const result = { textHash: review.textHash, words };
  syriacReviews.set(book, result);
  return result;
}
const normalize = s => String(s || '').normalize('NFD').replace(/([\p{Script=Hebrew}\p{Script=Greek}\p{Script=Syriac}])\p{M}*/gu, m => m.replace(/\p{M}/gu, '')).toLowerCase().replace(/ς/g, 'σ').normalize('NFC');
const tokens = s => [...s.matchAll(/[\p{L}\p{M}\p{N}]+/gu)]
  .filter(m => /[\p{L}\p{N}]/u.test(m[0]))
  .map(m => ({ text: m[0], key: normalize(m[0]), start: m.index, end: m.index + m[0].length }));
const plain = html => String(html).replace(/&nbsp;|&#160;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => {const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):' ';});
const textOf = html => plain(R.splitFootnotes(html).main.replace(/<br\s*\/?>(?=.)/gi, ' ').replace(/<(small|h[1-6])\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
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
function syriacWordSpans(html, ts) {
  const spans = [...String(html || '').matchAll(/<span class="syw" data-si="([^"]+)">([^<]+)<\/span>/g)]
    .map(([, id, form]) => ({ id, form, tokens: tokens(form) }))
    .filter(span => span.tokens.length);
  return spans.length === ts.length && spans.every((span, i) => span.tokens.length === 1 && span.tokens[0].key === ts[i].key)
    ? spans
    : null;
}
function analyses(e, d, html, p, ts, validHash, locate) {
  // Never apply analyses to edited text or a different edition.
  if (d.greekMorphology && validHash) {
    const loc = locate(p);
    if (loc) {
      const a = GC.at(d, loc.path, loc.label, ts.map(t => t.text), null);
      if (a) return a.records.map(r => ({ lemmas: r.lemma ? [r.lemma] : [], source: r.source === 'gorman' ? 'GLAUx / Gorman' : 'OGA' }));
    }
  }
  if (d.syriacMorphology && validHash && p.length === 2) {
    const spans = syriacWordSpans(html, ts);
    const review = syriacReview(e.title);
    if (spans) return spans.map(({ id, form }) => {
      const label = typeof p[1] === 'number' ? String(p[1] + 1) : p[1];
      const a = SY.at(d, id, form, [p[0]], label);
      if (a && !a.parts.length && review?.textHash === d.textHash) {
        const reviewed = review.words.get(a.id);
        if (reviewed && reviewed.form === a.form && reviewed.chapter === a.chapter && reviewed.verse === a.verse) {
          return reviewed.analysis;
        }
      }
      return { lemmas: a ? a.parts.map(x => SY.lemma(x.lex)).filter(Boolean) : [], source: 'ETCBC Syriac' };
    });
  }
  if ((/Westminster/.test(e.versionTitle || '') || /Safran-Morphologie/.test(e.versionTitle || '')) && e.kind === 'he') {
    const spans = [...html.matchAll(/<span class="w" data-l="([^"]*)" data-m="([^"]*)">(.*?)<\/span>/g)];
    if (sameTokens(spans.map(m => textOf(m[3])), ts)) return spans.map(m => {
      let lemma = '', id;
      try { const a = Morph.decode(m[2], m[1]); id = a?.segs[a.main]?.lemma; lemma = data().OSHB_LEMMAS?.[id]?.[0] || ''; } catch {}
      return { lemmaId: id, lemmas: lemma ? [lemma] : [], source: /Westminster/.test(e.versionTitle) ? 'OSHB' : 'Safran' };
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
async function search({ dir, entries, params, onProgress = () => {}, onOccurrence = null, isCancelled = () => false }) {
  const qt = tokens(String(params.query || '').trim()), q = qt[0]?.key;
  const empty = { results: [], stats: [], dist: [], scanned: 0, total: 0, truncated: false, capped: false, cancelled: false, concordance: true, coverage: { annotated: 0, surface: 0 }, hitsByBasis: { lemma: 0, surface: 0, root: 0 }, errors: 0 };
  if (!q || String(params.query).length > 100 || qt.length !== 1 || /[*?]/.test(params.query)) return { ...empty, error: 'Bitte ein einzelnes Wort ohne Platzhalter eingeben.' };
  const limit = Math.max(1, Math.min(5000, Number(params.limit) || 1000)), perFile = Math.max(1, Math.min(500, Number(params.perFile) || 25));
  const roots = params.concordanceRoot ? require('./passage-stats-data').roots : null;
  const family = roots?.[params.concordanceRoot];
  if (roots && !family) return { ...empty, error: 'Keine Wurzelzuordnung für dieses Lemma.' };
  const exactLemma = family ? '' : params.concordanceLemma;
  const scan = family || exactLemma ? entries.filter(e => e.kind === 'he' && /^Westminster/.test(e.versionTitle || '')) : entries;
  const lemma = !!params.lemma || !!family || !!exactLemma, out = { ...empty, total: scan.length }, stats = new Map();
  if (lemma) out.lemmaCoverage = { words: 0, withLemma: 0, editions: [] };
  for (const e of Order.sortTitles(scan, x => x.title)) {
    if (isCancelled()) break;
    let d;
    try { d = JSON.parse(await fs.readFile(path.join(dir, e.rel), 'utf8')); } catch { out.errors++; out.scanned++; continue; }
    let validHash = false;
    if (lemma && (d.greekMorphology || d.syriacMorphology)) {
      d.textHash = crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex');
      validHash = (d.greekMorphology || d.syriacMorphology).textHash === d.textHash;
    }
    let h = 0, o = 0, shown = 0, words = 0, withLemma = 0, locator;
    const locate = p => (locator ||= R.makeLocator(d.text, d.sectionNames))(p);
    const rows = []; R.walkStrings(d.text, [], (html, p) => rows.push({ html, p }));
    for (let row = 0; row < rows.length; row++) {
      if (isCancelled()) break;
      const { html, p } = rows[row], text = textOf(html), ts = tokens(text);
      const a = lemma && ts.length ? analyses(e, d, html, p, ts, validHash, locate) : null;
      let passage = false;
      for (let i = 0; i < ts.length; i++) {
        const t = ts[i], aa = a?.[i], lemmaHit = aa?.lemmas.some(l => normalize(l) === q);
        if (lemma && /\p{L}/u.test(t.text)) {
          words++;
          if (aa?.lemmas.length) withLemma++;
        }
        const root = family && roots[aa?.lemmaId];
        if (family) {
          if (root?.id !== family.id || root.lang !== family.lang) continue;
        } else if (exactLemma ? aa?.lemmaId !== exactLemma : t.key !== q && !lemmaHit) {
          continue;
        }
        o++; passage = true;
        const basis = family ? 'root' : exactLemma || lemmaHit ? 'lemma' : 'surface';
        out.hitsByBasis[basis]++;
        // Audit consumers receive all matches, including those beyond the UI display caps.
        if (onOccurrence) onOccurrence({title: e.title, path: p, position: i + 1, form: t.text, basis,
          analysisSource: basis === 'surface' ? '' : aa.source, analysisReference: aa?.reference || ''});
        if (out.results.length >= limit) { out.truncated = true; continue; }
        if (shown >= perFile) { out.capped = true; continue; }
        const loc = locate(p), before = text.slice(ts[Math.max(0, i - 7)].start, t.start), after = text.slice(t.end, ts[Math.min(ts.length - 1, i + 7)].end);
        out.results.push({ rel: e.rel, title: e.title, heTitle: e.heTitle, versionTitle: e.versionTitle, kind: e.kind, language: e.language, path: p, loc: loc ? { path: loc.path, label: loc.label } : null, where: loc ? [loc.sectionLabel, loc.label].filter(Boolean).join(' · ') : '', snippet: { before, hit: t.text, after }, words: [t.text], sub: false, concordance: true, basis, analysisSource: basis === 'surface' ? '' : aa.source, ...(lemmaHit && aa.reference ? { analysisReference: aa.reference } : {}), ...(family ? { matchedLemma: aa.lemmas[0] || '', matchedLemmaId: aa.lemmaId } : {}), position: i + 1 });
        shown++;
      }
      if (passage) h++;
      // Lemma coverage is reported only for complete editions.
      if (!lemma && params.concordancePreview && out.results.length >= limit) break;
      if (row % 100 === 0) await new Promise(r => setImmediate(r));
    }
    if (lemma && !isCancelled()) {
      out.lemmaCoverage.words += words;
      out.lemmaCoverage.withLemma += withLemma;
      out.lemmaCoverage.editions.push({ title: e.title, versionTitle: e.versionTitle || '', words, withLemma, hits: o });
    }
    out.coverage[withLemma ? 'annotated' : 'surface']++;
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
module.exports = { search, normalize, tokens, textOf, syriacWordSpans };
