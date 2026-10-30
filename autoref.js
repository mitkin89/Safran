// Erkennt Bibelstellen im Fließtext (Hebräisch „שמות לא יח“, Englisch „Exodus 24:10“, Deutsch „Ex. 24, 10“, „ibid. 31:18“) und macht sie anklickbar.
// Reine Textfunktion ohne Oberfläche; läuft in Node (Tests: test15.js) und als <script> (window.AutoRef).
(function () {
'use strict';
// Schreibweisen -> Sefaria-Titel (Kleinbuchstaben, ohne Punkt)
const EN = {
  'Genesis': 'gen genesis gn', 'Exodus': 'ex exod exodus', 'Leviticus': 'lev leviticus lv', 'Numbers': 'num numbers nu', 'Deuteronomy': 'deut deuteronomy dt dtn',
  'Joshua': 'josh joshua jos', 'Judges': 'judg judges ri', 'I Samuel': '1 sam|1 samuel|i sam|i samuel', 'II Samuel': '2 sam|2 samuel|ii sam|ii samuel',
  'I Kings': '1 kings|1 kgs|1 kg|i kings|1 kön|1 könige', 'II Kings': '2 kings|2 kgs|2 kg|ii kings|2 kön|2 könige',
  'Isaiah': 'isa isaiah jes jesaja', 'Jeremiah': 'jer jeremiah jeremia', 'Ezekiel': 'ezek ezekiel ez hes hesekiel ezechiel', 'Hosea': 'hos hosea', 'Joel': 'joel', 'Amos': 'amos',
  'Obadiah': 'obad obadiah ob obadja', 'Jonah': 'jonah jon jona', 'Micah': 'mic micah mi micha', 'Nahum': 'nah nahum', 'Habakkuk': 'hab habakkuk habakuk',
  'Zephaniah': 'zeph zephaniah zef zefanja', 'Haggai': 'hag haggai', 'Zechariah': 'zech zechariah sach sacharja', 'Malachi': 'mal malachi maleachi',
  'Psalms': 'ps psalm psalms psalmen pss', 'Proverbs': 'prov proverbs spr sprüche', 'Job': 'job hiob ijob hi', 'Song of Songs': 'song of songs|cant|hohelied|hld',
  'Ruth': 'ruth rut', 'Lamentations': 'lam lamentations klgl klagelieder', 'Ecclesiastes': 'eccl ecclesiastes koh kohelet prediger qoh', 'Esther': 'esth esther est ester',
  'Daniel': 'dan daniel dn', 'Ezra': 'ezra esr esra', 'Nehemiah': 'neh nehemiah nehemia',
  'I Chronicles': '1 chron|1 chr|1 chronicles|i chron|i chronicles|1 chronik', 'II Chronicles': '2 chron|2 chr|2 chronicles|ii chron|ii chronicles|2 chronik'
};
const ALIAS = new Map();
for (const [title, s] of Object.entries(EN)) {
  const parts = s.includes('|') ? s.split('|') : s.split(' ');
  for (const a of parts) ALIAS.set(a, title);
  ALIAS.set(title.toLowerCase(), title);
}
// deutsche Nummern „1 Mose“ usw.
Object.entries({ '1 mose': 'Genesis', '2 mose': 'Exodus', '3 mose': 'Leviticus', '4 mose': 'Numbers', '5 mose': 'Deuteronomy', 'gen': 'Genesis' }).forEach(([k, v]) => ALIAS.set(k, v));
// hebräische Namen
const HE = {
  'בראשית': 'Genesis', 'שמות': 'Exodus', 'ויקרא': 'Leviticus', 'במדבר': 'Numbers', 'דברים': 'Deuteronomy', 'יהושע': 'Joshua', 'שופטים': 'Judges',
  'ישעיהו': 'Isaiah', 'ישעיה': 'Isaiah', 'ירמיהו': 'Jeremiah', 'ירמיה': 'Jeremiah', 'יחזקאל': 'Ezekiel', 'הושע': 'Hosea', 'יואל': 'Joel', 'עמוס': 'Amos',
  'עובדיה': 'Obadiah', 'יונה': 'Jonah', 'מיכה': 'Micah', 'נחום': 'Nahum', 'חבקוק': 'Habakkuk', 'צפניה': 'Zephaniah', 'חגי': 'Haggai', 'זכריה': 'Zechariah', 'מלאכי': 'Malachi',
  'תהלים': 'Psalms', 'משלי': 'Proverbs', 'איוב': 'Job', 'שיר השירים': 'Song of Songs', 'רות': 'Ruth', 'איכה': 'Lamentations', 'קהלת': 'Ecclesiastes', 'אסתר': 'Esther',
  'דניאל': 'Daniel', 'עזרא': 'Ezra', 'נחמיה': 'Nehemiah'
};
const HE2 = { 'שמואל': ['I Samuel', 'II Samuel'], 'מלכים': ['I Kings', 'II Kings'], 'דברי הימים': ['I Chronicles', 'II Chronicles'] };
const GEM = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400 };
function gem(s) { // „לא“ -> 31, „כ״ד“ -> 24, „קמ“ -> 140
  const t = s.replace(/[׳״'"’”]/g, '');
  if (!/^[א-ת]{1,4}$/.test(t)) return 0;
  let n = 0; for (const c of t) n += GEM[c] || 0;
  return n;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
// Alle lateinischen Namen/Kürzel, längste zuerst (damit „1 Kings“ vor „Kings“ gewinnt)
const LAT = [...ALIAS.keys()].sort((a, b) => b.length - a.length).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s?'));
const CHVS = '(\\d{1,3})\\s*(?::|,\\s)\\s*(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?';
const LAT_RE = new RegExp('(?<![\\p{L}\\d])(' + LAT.join('|') + ')\\.?\\s*' + CHVS + '(?![\\d])', 'giu');
const IBID_RE = new RegExp('(?<![\\p{L}\\d])(ibid|ib|ebd|ebenda|idem)\\.?\\s*' + CHVS + '(?![\\d])', 'giu');
const HEBK = Object.keys(HE).concat(Object.keys(HE2)).sort((a, b) => b.length - a.length).join('|');
const HE_RE = new RegExp('(?<=[(\\[])(' + HEBK + ')(?:\\s+([אב])(?![\\u05D0-\\u05EA]))?\\s+([א-ת][א-ת׳״\'"]{0,4})[,:]?\\s*([א-ת][א-ת׳״\'"]{0,4})(?![א-ת])', 'g');
function norm(name) { return name.toLowerCase().replace(/\.$/, '').replace(/\s+/g, ' ').trim(); }
function titleOf(name) {
  let n = norm(name); if (ALIAS.has(n)) return ALIAS.get(n);
  n = n.replace(/\s/g, ''); for (const [k, v] of ALIAS) if (k.replace(/\s/g, '') === n) return v;
  return '';
}
// text: reiner Text (nach dem Entfernen der Tags); st.last: zuletzt genannte Schrift (für „ibid.“)
function linkText(text, st) {
  const out = [];
  let i = 0;
  const matches = [];
  let m;
  LAT_RE.lastIndex = 0;
  while ((m = LAT_RE.exec(text))) {
    if (/^[a-zäöü]/.test(m[1])) continue; // „Ex. 24:10“, nicht „ex 24:10“ mitten im Satz
    const t = titleOf(m[1]); if (!t) continue;
    const ch = +m[2], v = +m[3]; if (!ch || !v || ch > 150) continue;
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `${t} ${ch}:${v}` + (m[4] ? '-' + m[4] : ''), book: t });
  }
  IBID_RE.lastIndex = 0;
  while ((m = IBID_RE.exec(text))) {
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `${+m[2]}:${+m[3]}` + (m[4] ? '-' + m[4] : ''), ibid: true }); // Buch wird erst beim Zusammensetzen eingesetzt
  }
  HE_RE.lastIndex = 0;
  while ((m = HE_RE.exec(text))) {
    let t = HE[m[1]];
    if (!t) { const p = HE2[m[1]]; t = p && p[m[2] === 'ב' ? 1 : 0]; }
    const ch = gem(m[3]), v = gem(m[4]); if (!t || !ch || !v || ch > 150 || v > 176) continue;
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `${t} ${ch}:${v}`, book: t });
  }
  matches.sort((a, b) => a.s - b.s || b.e - a.e);
  for (const x of matches) {
    if (x.s < i) continue; // Überlappung: erste gewinnt
    if (x.ibid) { if (!st.last) continue; x.book = st.last; x.ref = st.last + ' ' + x.ref; }
    out.push(esc2(text.slice(i, x.s)));
    out.push(`<a class="aref" data-sref="${esc(x.ref)}" title="${esc(x.ref)}">${esc2(text.slice(x.s, x.e))}</a>`);
    st.last = x.book; i = x.e;
  }
  out.push(esc2(text.slice(i)));
  return out.join('');
}
// bereits maskierte Textstücke (HTML-Entitäten) bleiben unverändert, deshalb nur sehr sparsam maskieren
const esc2 = s => s;
// html: Zellen-HTML. Tags bleiben unverändert; in Textstücken außerhalb von <a> werden Stellenangaben verlinkt.
function link(html, st) {
  st = st || { last: '' };
  if (!html || !/[\d׳״א-ת]/.test(html)) return html;
  const parts = String(html).split(/(<[^>]*>)/);
  let inA = 0, out = '';
  for (const p of parts) {
    if (p.startsWith('<')) {
      if (/^<a[\s>]/i.test(p)) inA++; else if (/^<\/a>/i.test(p)) inA = Math.max(0, inA - 1);
      out += p;
    } else out += inA ? p : linkText(p, st);
  }
  return out;
}
const api = { link, gem, titleOf };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.AutoRef = api;
})();
