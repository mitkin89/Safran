// Reine Logik ohne Electron-Abhängigkeiten (getestet mit Node).

// ---------- CSV ----------
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

function csvEscape(v) {
  v = String(v ?? '');
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function toCSV(rows) {
  return rows.map(r => r.map(csvEscape).join(',')).join('\n') + '\n';
}

// ---------- Referenzen ----------
// Erwartet "Titel Kapitel:Vers" (z. B. "Devarim Rabbah 1:5"). Titel darf Leerzeichen/Ziffern enthalten.
const REF_RE = /^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/;

function parseRef(ref) {
  const m = String(ref).trim().match(REF_RE);
  if (!m) return null;
  return { title: m[1], chapter: +m[2], verse: +m[3], verseEnd: m[4] ? +m[4] : null };
}

// ---------- Prüfung ----------
// rows: [[ref, text], ...]; Kopfzeile wird erkannt und übersprungen.
function validateRows(rows) {
  const issues = [];
  const add = (level, line, msg) => issues.push({ level, line, msg });
  let start = 0;
  if (rows.length && !parseRef(rows[0][0]) && /ref|reference|verweis/i.test(rows[0][0] || '')) start = 1;

  const seen = new Map();
  const counts = {}; // title -> chapter -> Anzahl Segmente
  let prev = null;
  let valid = 0;

  for (let i = start; i < rows.length; i++) {
    const line = i + 1, r = rows[i];
    if (r.length < 2) { add('Fehler', line, 'Weniger als 2 Spalten (Referenz, Text erwartet).'); continue; }
    if (r.length > 2) add('Warnung', line, `${r.length} Spalten – Sefaria erwartet Referenz und Text.`);
    const ref = parseRef(r[0]);
    const text = r[1] ?? '';
    if (!ref) { add('Fehler', line, `Referenz nicht erkannt: "${r[0]}" (erwartet z. B. "Titel 1:1").`); continue; }
    if (!text.trim()) add('Warnung', line, `Leerer Text bei ${r[0]}.`);
    if (/^\s|\s$/.test(text)) add('Hinweis', line, 'Leerzeichen am Anfang/Ende des Textes.');
    if (/\s{2,}/.test(text)) add('Hinweis', line, 'Mehrfache Leerzeichen im Text.');
    if (/\r|\n/.test(text)) add('Hinweis', line, 'Zeilenumbruch im Text (wird in Sefaria evtl. nicht erwartet).');
    const opens = (text.match(/<(b|i|small|big|sup|sub|strong|em|span|a)\b[^>]*>/gi) || []).length;
    const closes = (text.match(/<\/(b|i|small|big|sup|sub|strong|em|span|a)>/gi) || []).length;
    if (opens !== closes) add('Warnung', line, 'HTML-Tags nicht ausgeglichen.');
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) add('Fehler', line, 'Steuerzeichen im Text.');

    const key = r[0].trim();
    if (seen.has(key)) add('Fehler', line, `Doppelte Referenz ${key} (auch Zeile ${seen.get(key)}).`);
    else seen.set(key, line);

    if (prev && prev.title === ref.title) {
      if (ref.chapter < prev.chapter || (ref.chapter === prev.chapter && ref.verse < prev.verse))
        add('Warnung', line, `Reihenfolge: ${r[0]} steht nach ${prev.raw}.`);
      else if (ref.chapter === prev.chapter && ref.verse > (prev.verseEnd || prev.verse) + 1)
        add('Warnung', line, `Lücke: nach ${prev.raw} folgt ${r[0]}.`);
      else if (ref.chapter > prev.chapter && ref.verse !== 1)
        add('Warnung', line, `Neues Kapitel beginnt nicht bei 1: ${r[0]}.`);
    } else if (!prev || prev.title !== ref.title) {
      if (ref.verse !== 1) add('Warnung', line, `Abschnitt beginnt nicht bei Vers 1: ${r[0]}.`);
    }
    prev = { ...ref, raw: r[0] };

    counts[ref.title] = counts[ref.title] || {};
    counts[ref.title][ref.chapter] = (counts[ref.title][ref.chapter] || 0) + 1;
    valid++;
  }
  return { issues, counts, valid, total: rows.length - start };
}

// ---------- Text -> CSV ----------
// Eine Zeile = ein Segment. Zeilen, die nur aus "Kapitel N" o. ä. bestehen, starten ein neues Kapitel.
function textToRows(text, title, startChapter = 1, opts = {}) {
  const chapterRe = opts.chapterRe || /^\s*(?:Kapitel|Chapter|Parascha|Sidra|Perek|פרק)\s+(\d+)\s*$/i;
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(s => s.trim()).filter(Boolean);
  const rows = [];
  let chapter = startChapter, verse = 0, sawChapterMarker = false;
  for (const line of lines) {
    const m = line.match(chapterRe);
    if (m) { chapter = +m[1]; verse = 0; sawChapterMarker = true; continue; }
    verse++;
    rows.push([`${title} ${chapter}:${verse}`, line]);
  }
  return { rows, sawChapterMarker };
}

// ---------- Segmentvergleich ----------
// mine: { kapitel: anzahl }, ref: Array mit Anzahl Segmenten je Kapitel (Index 0 = Kapitel 1)
function compareSegments(mine, ref) {
  const out = [];
  const maxCh = Math.max(ref.length, ...Object.keys(mine).map(Number), 0);
  for (let c = 1; c <= maxCh; c++) {
    const a = mine[c] || 0, b = ref[c - 1] ?? 0;
    out.push({ chapter: c, mine: a, reference: b, diff: a - b, ok: a === b });
  }
  return out;
}

// ---------- Sefaria-Text-Hilfen ----------
function stripHtml(s) {
  return String(s ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function flatten(arr, out = []) {
  if (Array.isArray(arr)) arr.forEach(x => flatten(x, out));
  else out.push(arr);
  return out;
}

// Länge je Kapitel aus einer verschachtelten Textstruktur
function chapterLengths(arr) {
  return Array.isArray(arr) ? arr.map(ch => (Array.isArray(ch) ? flatten(ch).length : 1)) : [];
}

module.exports = { parseCSV, toCSV, parseRef, validateRows, textToRows, compareSegments, stripHtml, flatten, chapterLengths };
