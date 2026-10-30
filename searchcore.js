'use strict';
// Volltextsuche über die heruntergeladenen Dateien. Läuft im Hintergrund-Thread (searchWorker.js), damit die Oberfläche nicht hakt;
// dieselbe Funktion wird auch direkt aufgerufen (Tests, Notfall-Ersatz).
const fs = require('fs/promises');
const path = require('path');
const R = require('./reader');
const S = require('./search');
const SefOrder = require('./order');
const Morph = require('./morph');

// Strong-Nummer -> Lemma (nur bei der Lemma-Suche geladen; die Datei ist für die Oberfläche geschrieben: window.OSHB_LEMMAS=…)
let lemmaTable = null;
function lemmas() {
  if (!lemmaTable) {
    const w = {};
    try { new Function('window', require('fs').readFileSync(path.join(__dirname, 'oshb-lemmas.js'), 'utf8'))(w); } catch { /* ohne Tabelle: nur die Wortformen */ }
    lemmaTable = w.OSHB_LEMMAS || {};
  }
  return lemmaTable;
}
const letters = s => R.normalize(s).replace(/[^\p{L}]/gu, '');
const isWlc = e => e.kind === 'he' && /Westminster/.test(e.versionTitle || '');
const SPAN = /<span class="w" data-l="([^"]*)" data-m="([^"]*)">(.*?)<\/span>/g;
// Westminster-Zeile -> zwei gleich lange Wortlisten: Wortformen und Lemmata (Wörterbuchform des Hauptwortes)
function wlcTokens(str) {
  const L = lemmas(), forms = [], lems = [];
  for (const m of str.matchAll(SPAN)) {
    const f = letters(m[3]); if (!f) continue;
    let lem = '';
    try { const d = Morph.decode(m[2], m[1]); const sg = d && d.segs[d.main]; if (sg && sg.lemma && L[sg.lemma]) lem = letters(L[sg.lemma][0]); } catch { /* egal */ }
    forms.push(f); lems.push(lem || f);
  }
  return forms.length ? { n: forms.join(' '), nl: lems.join(' ') } : null;
}

// ---------- Such-Cache: normalisierte Zeilen pro Datei, damit nicht jede Suche alles neu parst und normalisiert ----------
// <cacheDir>/<hash>.n  = normalisierte Textzeilen (eine pro Segment, in Reihenfolge von walkStrings), mit \n getrennt
// <cacheDir>/<hash>.wn / .wl = nur Westminster: Wortformen bzw. Lemmata je Segment (leer, wenn das Segment keine Wörter hat)
// Der Dateiname enthält Größe und Änderungszeit der Quelldatei; ändert sich die Datei, wird neu gebaut.
const CACHE_V = 1;
const crypto = require('crypto');
async function loadSource(dir, e, cacheDir, wantW) {
  const file = path.join(dir, e.rel);
  let st = null;
  try { st = await fs.stat(file); } catch { return null; }
  let base = null;
  if (cacheDir) {
    base = path.join(cacheDir, crypto.createHash('sha1').update(e.rel).digest('hex').slice(0, 20) + `-${CACHE_V}-${st.size}-${Math.floor(st.mtimeMs)}`);
    try {
      const n = await fs.readFile(base + '.n', 'utf8');
      if (!wantW) return { n, wn: null, wl: null, d: null, paths: null };
      const [wn, wl] = await Promise.all([fs.readFile(base + '.wn', 'utf8'), fs.readFile(base + '.wl', 'utf8')]);
      return { n, wn, wl, d: null, paths: null };
    } catch { /* kein (vollständiger) Cache: neu bauen */ }
  }
  const d = JSON.parse(await fs.readFile(file, 'utf8'));
  const N = [], WN = [], WL = [], paths = [];
  const w = isWlc(e) && (wantW || cacheDir);
  R.walkStrings(d.text, [], (str, p) => {
    paths.push(p); N.push(R.normalize(str));
    if (w) { const wt = wlcTokens(str); WN.push(wt ? wt.n : ''); WL.push(wt ? wt.nl : ''); }
  });
  const out = { n: N.join('\n'), wn: w ? WN.join('\n') : null, wl: w ? WL.join('\n') : null, d, paths };
  if (cacheDir) {
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      const pre = path.basename(base).split('-')[0] + '-';
      for (const f of await fs.readdir(cacheDir)) if (f.startsWith(pre) && !f.startsWith(path.basename(base) + '.')) fs.unlink(path.join(cacheDir, f)).catch(() => {}); // alte Stände derselben Datei
      const tmp = base + '.tmp' + process.pid + Math.random().toString(36).slice(2);
      if (w) { await fs.writeFile(base + '.wn', out.wn); await fs.writeFile(base + '.wl', out.wl); }
      await fs.writeFile(tmp, out.n); await fs.rename(tmp, base + '.n'); // .n zuletzt: es gilt als „Cache fertig“
    } catch { /* Cache ist nur Beschleunigung */ }
  }
  return out;
}

// Cache im Hintergrund vorbauen (damit auch die erste Suche schnell ist)
async function buildCache({ dir, entries, cacheDir, isCancelled = () => false }) {
  let built = 0;
  for (const e of entries) {
    if (isCancelled()) break;
    try { await loadSource(dir, e, cacheDir, isWlc(e)); built++; } catch { /* egal */ }
    await new Promise(r => setImmediate(r));
  }
  return built;
}

// ---------- Grammatik-Suche (nur Westminster): Wortart, Stamm, Zeitform, Person, Genus, Numerus, Status, Suffix, Artikel ----------
const GRAM_KEYS = ['pos', 'stem', 'tense', 'person', 'gender', 'number', 'state', 'suffix', 'article'];
// Hauptsegment eines OSHB-Morphcodes ("HVqp3ms", "HR/Td/Ncfsa" …) in seine Merkmale zerlegen
function gramOf(m, l) {
  m = String(m || ''); if (!m) return null;
  const ms = m.slice(1).split('/'), ls = String(l || '').split('/');
  let li = 0, main = -1;
  ms.forEach((c, i) => { if (c[0] === 'S') return; const x = ls[li++] || ''; if (/^\d/.test(x) && main < 0) main = i; });
  if (main < 0) main = Math.max(0, ms.findIndex(c => c[0] !== 'S'));
  const code = ms[main] || '', r = code.slice(1), g = { code, pos: code[0] };
  if (code[0] === 'V') {
    g.stem = r[0]; g.tense = r[1];
    if (g.tense === 'r' || g.tense === 's') { g.gender = r[2]; g.number = r[3]; g.state = r[4]; }
    else if (g.tense !== 'a' && g.tense !== 'c') { g.person = r[2]; g.gender = r[3]; g.number = r[4]; }
  } else if (code[0] === 'N' || code[0] === 'A') { g.gender = r[1]; g.number = r[2]; g.state = r[3]; }
  else if (code[0] === 'P') { g.person = r[1]; g.gender = r[2]; g.number = r[3]; }
  g.suffix = ms.some(c => c[0] === 'S'); g.article = ms.includes('Td');
  return g;
}
function gramTest(G, g) {
  if (!g) return false;
  if (G.pos && !g.code.startsWith(G.pos)) return false;
  for (const k of ['stem', 'tense', 'person', 'gender', 'number', 'state']) if (G[k] && g[k] !== G[k]) return false;
  if (G.suffix && g.suffix !== (G.suffix === '1')) return false;
  if (G.article && g.article !== (G.article === '1')) return false;
  return true;
}
// Westminster-Zeile -> { n: Wortformen, ok: [Wort passt?] }, optional nur Wörter, die zum Suchtext passen (Form enthält ihn oder Lemma ist gleich)
function wlcGram(str, G, qL) {
  const L = lemmas(), forms = [], ok = [];
  for (const m of str.matchAll(SPAN)) {
    const f = letters(m[3]); if (!f) continue;
    let hit = gramTest(G, gramOf(m[2], m[1]));
    if (hit && qL) {
      let lem = '';
      try { const d = Morph.decode(m[2], m[1]); const sg = d && d.segs[d.main]; if (sg && sg.lemma && L[sg.lemma]) lem = letters(L[sg.lemma][0]); } catch { /* egal */ }
      hit = f.includes(qL) || lem === qL;
    }
    forms.push(f); ok.push(hit);
  }
  return forms.length ? { n: forms.join(' '), ok } : null;
}
const cleanGram = g => { const o = {}; if (g && typeof g === 'object') for (const k of GRAM_KEYS) { const v = String(g[k] == null ? '' : g[k]); if (/^[A-Za-z0-9]{1,3}$/.test(v)) o[k] = v; } return Object.keys(o).length ? o : null; };

const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function searchFiles({ dir, entries, params, cacheDir = null, onProgress = () => {}, isCancelled = () => false }) {
  const { query, extra = [], fuzzy = false, distance = -1, ordered = false, prefix = false, exact = false, limit = 1000, perFile = 25, wlc = false, lemma = false, countAll = false } = params;
  const q = R.normalize(query);
  const G = cleanGram(params.gram), gramOn = !!G;
  if (!q && !gramOn) return { results: [], scanned: 0, total: 0, truncated: false, capped: false, cancelled: false, stats: [] };
  const terms = [query, ...extra].filter(t => String(t || '').trim());
  const advanced = terms.length > 1 || fuzzy || exact || /[*?]/.test(query); // exact: genau dieses Wort (Wortvergleich, keine Vorsilben, keine anderen Formen)
  const matcher = advanced ? S.makeMatcher({ terms, fuzzy, prefix: exact ? false : prefix, distance, ordered }) : null;
  // „Ganze Wörter“: Suchwort muss ein ganzes Wort sein (Satzzeichen davor/danach sind erlaubt), hebräische Vorsilben (ו ה ב כ ל מ ש …) davor ebenfalls
  const preRe = !advanced && prefix ? new RegExp('(?:^|[\\s\\p{P}\\p{S}])([והבכלמשד]{0,3})' + escRe(q) + '(?=[\\s\\p{P}\\p{S}]|$)', 'u') : null;
  // Tanach hebräisch nur im Westminster-Text (sonst käme jeder Vers mehrfach, und die Morphologie fehlt)
  const wlcTitles = new Set(wlc ? entries.filter(isWlc).map(e => e.title) : []);
  const skip = e => wlc && e.kind === 'he' && wlcTitles.has(e.title) && !isWlc(e) && /^Tanakh/.test((e.categories || [])[0] || '');
  const lemMatcher = lemma && !exact ? S.makeMatcher({ terms, fuzzy, prefix, distance, ordered }) : null;
  const list = SefOrder.sortTitles(entries.filter(e => (gramOn ? isWlc(e) : !skip(e))), e => e.title); // Treffer in der Reihenfolge wie auf Sefaria

  const results = [];
  const dist = new Map(); // Titel \u0000 Version -> { h: Verse mit Treffer, o: Vorkommen } (für die Verteilung auf die Bücher)
  const stats = new Map(); // Titel -> Gesamtzahl der Treffer (auch über die Anzeigegrenze hinaus)
  let scanned = 0, truncated = false, capped = false, lastProg = 0;
  for (const e of list) {
    if (isCancelled()) break;
    let src = null;
    if (gramOn) { // Grammatik-Suche: Westminster-Datei direkt lesen (die Morphologiecodes stehen nur dort)
      let d = null;
      try { d = JSON.parse(await fs.readFile(path.join(dir, e.rel), 'utf8')); } catch { /* überspringen */ }
      if (d) {
        let locator = null, shown = 0, hits = 0; const qL = q ? letters(query) : '';
        R.walkStrings(d.text, [], (str, p) => {
          if (truncated) return;
          const wg = wlcGram(str, G, qL); if (!wg || !wg.ok.some(Boolean)) return;
          hits++;
          if (shown >= perFile) { capped = true; return; }
          locator = locator || R.makeLocator(d.text, d.sectionNames);
          const loc = locator(p), n = wg.n;
          const idx = wg.ok.map((x, i) => x ? i : -1).filter(i => i >= 0);
          const mm = { idx, toks: [...n.matchAll(/[\p{L}\p{N}]+/gu)].map(m => ({ w: m[0], s: m.index, e: m.index + m[0].length })) };
          const r = { rel: e.rel, title: e.title, heTitle: e.heTitle, versionTitle: e.versionTitle, kind: e.kind, path: p, loc: loc ? { path: loc.path, label: loc.label } : null, where: loc ? (loc.label ? `${loc.sectionLabel} · ${loc.label}` : loc.sectionLabel) : '' };
          r.snippet = { before: '', hit: '', after: '' }; r.parts = S.snippetParts(n, mm);
          r.words = [...new Set(idx.map(i => mm.toks[i] && n.slice(mm.toks[i].s, mm.toks[i].e)).filter(Boolean))]; r.sub = false;
          results.push(r); shown++;
          if (results.length >= limit) truncated = true;
        });
        if (hits) stats.set(e.title, (stats.get(e.title) || 0) + hits);
      }
      scanned++; const now0 = Date.now();
      if (now0 - lastProg > 150 || scanned === list.length) { lastProg = now0; onProgress({ scanned, total: list.length, found: results.length }); }
      if (truncated) break;
      await new Promise(r => setImmediate(r)); continue;
    }
    const needW = !!(lemMatcher && isWlc(e));
    try { src = await loadSource(dir, e, cacheDir, needW); } catch { /* Datei überspringen */ }
    if (src && !(!matcher && !needW && !src.n.includes(q))) { // einfache Suche: Datei ohne den Suchtext sofort überspringen
      let locator = null, shown = 0, hits = 0, occ = 0;
      const N = src.n.split('\n'), WN = needW ? src.wn.split('\n') : null, WL = needW ? src.wl.split('\n') : null;
      const ensure = () => { // Pfade/Struktur erst bei einem Treffer nachladen (bei Cache-Treffer ohne Parsen vorher)
        if (!src.d) { src.d = JSON.parse(require('fs').readFileSync(path.join(dir, e.rel), 'utf8')); src.paths = []; R.walkStrings(src.d.text, [], (_s, p) => src.paths.push(p)); }
      };
      for (let i = 0; i < N.length; i++) {
        if (truncated && !countAll) break;
        let n = N[i];
        let mm = null, pos = -1;
        const wt = needW && WN[i] ? { n: WN[i], nl: WL[i] } : null;
        if (wt) { // Lemma-Suche: gefunden wird die Wortform oder jede Form desselben Lemmas; markiert wird die Wortform im Text
          n = wt.n;
          mm = lemMatcher(wt.n);
          if (!mm) { const ml = lemMatcher(wt.nl); if (ml) mm = { idx: ml.idx, toks: [...wt.n.matchAll(/[\p{L}\p{N}]+/gu)].map(m => ({ w: m[0], s: m.index, e: m.index + m[0].length })) }; }
          if (!mm) continue;
        }
        else if (matcher) { mm = matcher(n); if (!mm) continue; }
        else if (preRe) { const m = preRe.exec(n); if (!m) continue; pos = m.index + m[0].length - q.length; }
        else { pos = n.indexOf(q); if (pos < 0) continue; }
        hits++;
        occ += mm ? Math.max(1, mm.idx.length) : preRe ? Math.max(1, [...n.matchAll(new RegExp(preRe.source, 'gu'))].length) : Math.max(1, n.split(q).length - 1);
        if (truncated) continue; // nur noch zählen (Verteilung auf die Bücher)
        if (shown >= perFile) { capped = true; continue; }
        ensure();
        const p = src.paths[i];
        locator = locator || R.makeLocator(src.d.text, src.d.sectionNames);
        const loc = locator(p);
        const r = {
          rel: e.rel, title: e.title, heTitle: e.heTitle, versionTitle: e.versionTitle, kind: e.kind, path: p,
          loc: loc ? { path: loc.path, label: loc.label } : null,
          where: loc ? (loc.label ? `${loc.sectionLabel} · ${loc.label}` : loc.sectionLabel) : '',
        };
        if (mm) { r.snippet = { before: '', hit: '', after: '' }; r.parts = S.snippetParts(n, mm); }
        else r.snippet = { before: n.slice(Math.max(0, pos - 60), pos), hit: n.slice(pos, pos + q.length), after: n.slice(pos + q.length, pos + q.length + 80) };
        r.words = mm ? [...new Set(mm.idx.map(i => mm.toks[i] && n.slice(mm.toks[i].s, mm.toks[i].e)).filter(Boolean))] : [q]; // gefundene Wörter (für die Markierung im Lesetext)
        r.sub = !mm; // ohne Wortvergleich: Teilstück eines Wortes
        results.push(r); shown++;
        if (results.length >= limit) truncated = true;
      }
      if (hits) { stats.set(e.title, (stats.get(e.title) || 0) + hits); dist.set(e.title + '\u0000' + (e.versionTitle || '') + '\u0000' + e.kind, { t: e.title, v: e.versionTitle || '', k: e.kind, h: hits, o: occ }); }
    }
    scanned++;
    const now = Date.now();
    if (now - lastProg > 150 || scanned === list.length) { lastProg = now; onProgress({ scanned, total: list.length, found: results.length }); }
    if (truncated && !countAll) break;
    await new Promise(r => setImmediate(r)); // andere Aufgaben (z. B. Abbrechen) dürfen dazwischen
  }
  return {
    results, scanned, total: list.length, truncated, capped, cancelled: isCancelled(),
    dist: [...dist.values()],
    stats: SefOrder.sortTitles([...stats.entries()].map(([title, n]) => ({ title, n })), x => x.title),
  };
}

module.exports = { searchFiles, buildCache };
