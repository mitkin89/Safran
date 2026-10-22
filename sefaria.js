// Sefaria-spezifische Hilfen (ohne Electron-Abhängigkeit, getestet mit Node).
const { stripHtml, flatten, chapterLengths } = require('./lib');

const LANG_NAMES = { he: 'hebrew', en: 'english', de: 'german' };

// "Genesis 1:1" -> "Genesis_1:1" (URL-tauglich, Doppelpunkt/Komma bleiben lesbar)
function encRef(ref) {
  return encodeURIComponent(String(ref).trim().replace(/ /g, '_'))
    .replace(/%3A/gi, ':').replace(/%2C/gi, ',');
}

// "hebrew, german|Titel" -> "version=hebrew&version=german%7CTitel"
function versionParams(str) {
  return String(str || '').split(',').map(s => s.trim()).filter(Boolean)
    .map(v => 'version=' + encodeURIComponent(v)).join('&');
}

function textUrl(ref, versions) {
  const vp = versionParams(versions);
  return `/api/v3/texts/${encRef(ref)}` + (vp ? '?' + vp : '');
}

// Wandelt (verschachtelten) Sefaria-Text in [[Referenz, Text], ...]. Leere Segmente werden ausgelassen.
function segmentsFromText(ref, text, strip = false) {
  const out = [];
  const walk = (r, t) => {
    if (Array.isArray(t)) t.forEach((x, i) => walk(`${r}:${i + 1}`, x));
    else if (t != null && String(t).trim() !== '') out.push([r, strip ? stripHtml(t).trim() : String(t)]);
  };
  if (Array.isArray(text)) text.forEach((x, i) => walk(`${ref}:${i + 1}`, x));
  else walk(ref, text);
  return out;
}

// Antwort von /api/shape/<Titel> -> Segmentzahl je Kapitel (oder null)
function shapeLengths(data) {
  if (!Array.isArray(data) || !data.length) return null;
  const ch = data[0] && data[0].chapters;
  if (!Array.isArray(ch)) return null;
  return ch.map(c => (typeof c === 'number' ? c : flatten(c).length));
}

// Buchtitel aus einer Sefaria-Seiten-URL, z. B. https://www.sefaria.org/Genesis.1.1?lang=en -> "Genesis".
// Gibt '' zurück, wenn die Seite kein einzelner Text ist (Startseite, Themen, Blätter …).
const RESERVED_PAGES = new Set(['texts', 'topics', 'sheets', 'collections', 'community', 'calendars', 'search',
  'profile', 'settings', 'login', 'register', 'about', 'help', 'donate', 'updates', 'explore', 'visualizations',
  'translations', 'educators', 'torah-tab', 'sheets-community', 'new-home', 'texts-community']);
function titleFromSefariaUrl(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)sefaria\.org$/.test(u.hostname)) return '';
    const seg = decodeURIComponent(u.pathname.replace(/^\//, ''));
    if (!seg || seg.includes('/') || RESERVED_PAGES.has(seg.toLowerCase())) return '';
    return seg.split('.')[0].replace(/_/g, ' ').trim();
  } catch { return ''; }
}

module.exports = { LANG_NAMES, encRef, versionParams, textUrl, segmentsFromText, shapeLengths, chapterLengths, titleFromSefariaUrl };
