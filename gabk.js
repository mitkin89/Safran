// Abkürzungen im Gesenius (17. Aufl. 1915): im Text erkennen und mit <abbr class="gab" data-t="Auflösung"> auszeichnen
// Läuft in Node (Tests) und als <script> in der Oberfläche (window.GAbk); Daten: gabk-data.js
(function () {
'use strict';
const D = typeof module !== 'undefined' && module.exports ? require('./gabk-data.js') : window.GAbkData;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const keys = Object.keys(D).sort((a, b) => b.length - a.length);
const BIBLE = new Set(Object.keys(D).filter(k => D[k][1] === 'b'));
const SINGLE = /^[a-zäöü]\.$/; // Kleinwörter (d. u. v. …): nur Hinweis beim Überfahren, ohne Unterstreichung
const re = new RegExp('(?<![\\p{L}\\p{N}.§])(' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|') + ')(?![\\p{L}\\p{N}])', 'gu');
function mark(html) {
  let skip = 0;
  return String(html).split(/(<[^>]+>)/).map(part => {
    if (part.startsWith('<')) { if (/^<(a|b)[\s>]/i.test(part)) skip++; else if (/^<\/(a|b)>/i.test(part)) skip = Math.max(0, skip - 1); return part; }
    if (skip || !part.trim()) return part;
    return part.replace(re, (m, k, off, str) => {
      const key = k.replace(/\s+/g, ' '), ent = D[key] || D[k];
      if (!ent) return m;
      const after = str.slice(off + m.length), before = str.slice(0, off);
      if (key.length <= 2 && /^\p{Lu}\.?$/u.test(key) && /^\s+\p{Lu}/u.test(after)) return m; // Initiale eines Namens („E. Meyer“)
      if (/^\p{Lu}$/u.test(key) && /^\./.test(after)) return m; // „E. Meyer“, „J. Lury“: Vorname, nicht Quellenschrift
      if (BIBLE.has(key) && !/^\s+\d/.test(after)) return m; // Bücherkürzel nur vor einer Stellenangabe („Ps 37“)
      let t = ent[0];
      if (key === 'f.' && /\d\s*$/.test(before)) t = 'folgende';
      if (key === 'V.' && /^\s*\d/.test(after)) t = 'Vers';
      return `<abbr class="gab${SINGLE.test(key) ? ' g2' : ''}" data-t="${esc(t)}">${m}</abbr>`;
    });
  }).join('');
}
const api = { mark };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.GAbk = api;
})();
