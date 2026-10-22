'use strict';
// Volltextsuche über die heruntergeladenen Dateien. Läuft im Hintergrund-Thread (searchWorker.js), damit die Oberfläche nicht hakt;
// dieselbe Funktion wird auch direkt aufgerufen (Tests, Notfall-Ersatz).
const fs = require('fs/promises');
const path = require('path');
const R = require('./reader');
const S = require('./search');
const SefOrder = require('./order');

const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function searchFiles({ dir, entries, params, onProgress = () => {}, isCancelled = () => false }) {
  const { query, extra = [], fuzzy = false, distance = -1, ordered = false, prefix = false, limit = 1000, perFile = 25 } = params;
  const q = R.normalize(query);
  if (!q) return { results: [], scanned: 0, total: 0, truncated: false, capped: false, cancelled: false, stats: [] };
  const terms = [query, ...extra].filter(t => String(t || '').trim());
  const advanced = terms.length > 1 || fuzzy || /[*?]/.test(query);
  const matcher = advanced ? S.makeMatcher({ terms, fuzzy, prefix, distance, ordered }) : null;
  // „Ganze Wörter“: Suchwort muss ein ganzes Wort sein (Satzzeichen davor/danach sind erlaubt), hebräische Vorsilben (ו ה ב כ ל מ ש …) davor ebenfalls
  const preRe = !advanced && prefix ? new RegExp('(?:^|[\\s\\p{P}\\p{S}])([והבכלמשד]{0,3})' + escRe(q) + '(?=[\\s\\p{P}\\p{S}]|$)', 'u') : null;
  const list = SefOrder.sortTitles(entries, e => e.title); // Treffer in der Reihenfolge wie auf Sefaria

  const results = [];
  const stats = new Map(); // Titel -> Gesamtzahl der Treffer (auch über die Anzeigegrenze hinaus)
  let scanned = 0, truncated = false, capped = false, lastProg = 0;
  for (const e of list) {
    if (isCancelled()) break;
    let d = null;
    try { d = JSON.parse(await fs.readFile(path.join(dir, e.rel), 'utf8')); } catch { /* Datei überspringen */ }
    if (d) {
      let locator = null, shown = 0, hits = 0;
      R.walkStrings(d.text, [], (str, p) => {
        if (truncated) return;
        const n = R.normalize(str);
        let mm = null, pos = -1;
        if (matcher) { mm = matcher(n); if (!mm) return; }
        else if (preRe) { const m = preRe.exec(n); if (!m) return; pos = m.index + m[0].length - q.length; }
        else { pos = n.indexOf(q); if (pos < 0) return; }
        hits++;
        if (shown >= perFile) { capped = true; return; }
        locator = locator || R.makeLocator(d.text, d.sectionNames);
        const loc = locator(p);
        const r = {
          rel: e.rel, title: e.title, heTitle: e.heTitle, versionTitle: e.versionTitle, kind: e.kind, path: p,
          loc: loc ? { path: loc.path, label: loc.label } : null,
          where: loc ? (loc.label ? `${loc.sectionLabel} · ${loc.label}` : loc.sectionLabel) : '',
        };
        if (mm) { r.snippet = { before: '', hit: '', after: '' }; r.parts = S.snippetParts(n, mm); }
        else r.snippet = { before: n.slice(Math.max(0, pos - 60), pos), hit: n.slice(pos, pos + q.length), after: n.slice(pos + q.length, pos + q.length + 80) };
        results.push(r); shown++;
        if (results.length >= limit) truncated = true;
      });
      if (hits) stats.set(e.title, (stats.get(e.title) || 0) + hits);
    }
    scanned++;
    const now = Date.now();
    if (now - lastProg > 150 || scanned === list.length) { lastProg = now; onProgress({ scanned, total: list.length, found: results.length }); }
    if (truncated) break;
    await new Promise(r => setImmediate(r)); // andere Aufgaben (z. B. Abbrechen) dürfen dazwischen
  }
  return {
    results, scanned, total: list.length, truncated, capped, cancelled: isCancelled(),
    stats: SefOrder.sortTitles([...stats.entries()].map(([title, n]) => ({ title, n })), x => x.title),
  };
}

module.exports = { searchFiles };
