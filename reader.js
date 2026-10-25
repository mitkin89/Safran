// Reine Lese-Hilfen für die Sefaria-Export-Dateien (kein Electron, kein Dateizugriff).
// Wird im Hauptprozess (Suche) und – über das Preload-Skript – in der Oberfläche benutzt.

const SEC_DE = {
  Chapter: 'Kapitel', Halakhah: 'Halacha', Mishnah: 'Mischna', Verse: 'Vers', Section: 'Abschnitt', Paragraph: 'Absatz',
  Siman: 'Siman', Seif: 'Seif', Daf: 'Daf', Line: 'Zeile', Segment: 'Segment', Comment: 'Kommentar', Folio: 'Folio',
  Page: 'Seite', Day: 'Tag', Psalm: 'Psalm', Aliyah: 'Aliyah', Parasha: 'Parascha', Teshuva: 'Teschuwa', Gate: 'Tor',
  Part: 'Teil', Book: 'Buch', Sefer: 'Buch', Passage: 'Abschnitt', Pasuk: 'Pasuk',
};

function nonEmpty(x) {
  if (typeof x === 'string') return x.trim() !== '';
  if (Array.isArray(x)) return x.some(nonEmpty);
  if (x && typeof x === 'object') return Object.values(x).some(nonEmpty);
  return false;
}

// Talmud-Index -> Seite: 0 = 1a, 1 = 1b, 2 = 2a, 3 = 2b, ...
function dafLabel(i) { return (Math.floor(i / 2) + 1) + (i % 2 === 0 ? 'a' : 'b'); }

function indexLabel(sectionNames, depth, i) {
  const n = sectionNames && sectionNames[depth];
  if (n === 'Daf') return 'Daf ' + dafLabel(i);
  return `${n ? (SEC_DE[n] || n) : 'Abschnitt'} ${i + 1}`;
}

// Pfad (Zahlen = Listenindex ab 0, Strings = Schlüssel komplexer Texte) -> lesbare Bezeichnung
function pathLabel(path, sectionNames) {
  let depth = 0;
  return path.map(p => {
    if (typeof p === 'number') { const l = indexLabel(sectionNames, depth, p); depth++; return l; }
    return p || null; // leerer Schlüssel = Standardknoten, kein eigener Name
  }).filter(x => x !== null).join(' › ') || 'Text';
}

// Zerlegt einen Text in lesbare Abschnitte (Kapitel, Dapim, Knoten komplexer Texte).
function sectionsOf(text, sectionNames) {
  const out = [];
  const walk = (node, path) => {
    if (!nonEmpty(node)) return;
    if (Array.isArray(node)) {
      const kids = node.map((c, i) => [c, i]).filter(([c]) => nonEmpty(c));
      if (kids.some(([c]) => typeof c === 'string')) {
        out.push({ path, label: path.length ? pathLabel(path, sectionNames) : 'Text' });
        return;
      }
      kids.forEach(([c, i]) => walk(c, [...path, i]));
    } else if (node && typeof node === 'object') {
      Object.keys(node).forEach(k => walk(node[k], [...path, k]));
    } else {
      out.push({ path, label: path.length ? pathLabel(path, sectionNames) : 'Text' });
    }
  };
  walk(text, []);
  return out;
}

function getByPath(text, path) {
  let n = text;
  for (const p of path) {
    if (n == null) return undefined;
    n = n[p];
  }
  return n;
}

// Verschachtelten Abschnitt zu Zeilen [{label, html}] glätten. label z. B. "3" oder "2:5".
function flattenNode(node, parts = [], out = []) {
  if (typeof node === 'string') {
    if (node.trim()) out.push({ label: parts.join(':'), html: node });
  } else if (Array.isArray(node)) {
    node.forEach((c, i) => flattenNode(c, [...parts, i + 1], out));
  } else if (node && typeof node === 'object') {
    Object.keys(node).forEach(k => flattenNode(node[k], [...parts, k || '·'], out));
  }
  return out;
}

// Mehrere Versionen (z. B. Hebräisch, Englisch, Deutsch) nach Zeilenbezeichnung nebeneinanderstellen.
function alignRows(versions) {
  const rows = [];
  const idx = new Map();
  versions.forEach((vrows, vi) => {
    vrows.forEach(r => {
      let k = idx.get(r.label);
      if (k === undefined) {
        k = rows.length;
        idx.set(r.label, k);
        rows.push({ label: r.label, cells: versions.map(() => null) });
      }
      rows[k].cells[vi] = r.html;
    });
  });
  return rows;
}

// Trennt Fußnoten vom Text. Sefaria-Format: <sup class="footnote-marker">a</sup><i class="footnote">…</i>
// (der Fußnotentext kann selbst <i>-Tags enthalten, deshalb wird die Verschachtelung gezählt)
function splitFootnotes(html) {
  const s = String(html ?? '');
  const markRe = /<sup[^>]*class="footnote-marker"[^>]*>(.*?)<\/sup>\s*<i[^>]*class="footnote"[^>]*>/g;
  const notes = [];
  let main = '';
  let last = 0;
  let m;
  while ((m = markRe.exec(s))) {
    main += s.slice(last, m.index);
    const start = markRe.lastIndex;
    const tagRe = /<(\/?)i\b[^>]*>/g;
    tagRe.lastIndex = start;
    let depth = 1, t = null;
    while (depth > 0 && (t = tagRe.exec(s))) depth += t[1] ? -1 : 1;
    const end = t && depth === 0 ? t.index : s.length;
    notes.push({ marker: m[1], html: s.slice(start, end) });
    main += `<sup data-fn="${notes.length - 1}">${m[1]}</sup>`; // data-fn = Nummer der Fußnote, für „per Klick öffnen“
    last = t && depth === 0 ? t.index + t[0].length : s.length;
    markRe.lastIndex = last;
  }
  main += s.slice(last);
  return { main, notes };
}

const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'small', 'big', 'sup', 'sub', 'br', 'u', 'span'];
// Nur einfache Formatierungs-Tags durchlassen; alle anderen Tags und alle Attribute entfernen
function cleanHtml(s) {
  let spans = 0; // offene, erlaubte <span class="w">; fremde <span> fallen weg, und ihr </span> darf dann nicht übrig bleiben
  return String(s ?? '').replace(/<\/?([a-z0-9]+)[^>]*>/gi, (m, t) => {
    t = t.toLowerCase();
    // Eingebettete Bilder: nur <img src="data:image/png|jpeg|gif|webp;base64,…"> (bis ca. 4 MB), alles andere am Tag fällt weg
    if (t === 'img') {
      const im = m.length < 6e6 && m.match(/\ssrc\s*=\s*["']?(data:image\/(?:png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+\/=\s]+)["']?/i);
      return im ? `<img src="${im[1].replace(/\s+/g, '')}" alt="">` : '';
    }
    if (!ALLOWED_TAGS.includes(t)) return '';
    if (m.startsWith('</')) return t === 'span' ? (spans > 0 ? (spans--, '</span>') : '') : `</${t}>`;
    // einzige erlaubte Attributform: <sup data-fn="12"> (Fußnotenzeichen, nur Ziffern)
    // OSHB-Wörter: <span class="w" data-l="1254 a" data-m="HVqp3ms"> (Lemma-Nummer und Morphologiecode, nur Ziffern/Buchstaben)
    if (t === 'span') {
      const w = m.match(/^<span class="w" data-l="([0-9a-z\/+ ]{0,40})" data-m="([A-Za-z0-9\/]{0,40})">$/);
      if (!w) return '';
      spans++;
      return `<span class="w" data-l="${w[1]}" data-m="${w[2]}">`;
    }
    const fn = t === 'sup' && m.match(/^<sup\s+data-fn="(\d{1,4})"\s*>$/);
    return fn ? `<sup data-fn="${fn[1]}">` : `<${t}>`;
  });
}

// Für die Suche: Tags und hebräische Vokal-/Betonungszeichen entfernen, kleinschreiben
function normalize(s) {
  return String(s ?? '')
    .replace(/<sup[^>]*class="footnote-marker"[^>]*>.*?<\/sup>/g, ' ') // Fußnotenzeichen stören den Text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<i[^>]*class="footnote"[^>]*>/g, ' ') // Fußnotentext bleibt durchsuchbar, aber abgesetzt
    .replace(/<[^>]+>/g, '') // übrige Tags (z. B. <big>ב</big> mitten im Wort) ohne Lücke entfernen
    .replace(/־/g, ' ') // Maqaf trennt Wörter
    .replace(/[֑-ׇ]/g, '') // Vokal- und Betonungszeichen
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

function walkStrings(node, path, cb) {
  if (typeof node === 'string') { if (node) cb(node, path); }
  else if (Array.isArray(node)) node.forEach((c, i) => walkStrings(c, [...path, i], cb));
  else if (node && typeof node === 'object') Object.keys(node).forEach(k => walkStrings(node[k], [...path, k], cb));
}

// Fundstellen-Finder für einen Text: Pfad zu einem Segment -> {path: Abschnittspfad, sectionLabel, label: Zeile im Abschnitt}
function makeLocator(text, sectionNames) {
  const secs = sectionsOf(text, sectionNames);
  return segPath => {
    let best = null;
    for (const s of secs) {
      if (s.path.length <= segPath.length && s.path.every((p, i) => p === segPath[i])) {
        if (!best || s.path.length > best.path.length) best = s;
      }
    }
    if (!best) return null;
    const rest = segPath.slice(best.path.length);
    return { path: best.path, sectionLabel: best.label, label: rest.map(p => (typeof p === 'number' ? p + 1 : (p || '·'))).join(':') };
  };
}

function locate(text, segPath, sectionNames) {
  const r = makeLocator(text, sectionNames)(segPath);
  return r && { path: r.path, label: r.label };
}

// Achtung: Der Name darf nicht "api", "lib" oder "offline" sein – diese globalen Namen belegt das Preload-Skript
// im Fenster, und eine gleichnamige const würde die ganze Datei mit einem SyntaxError abbrechen.
const readerExports = {
  nonEmpty, dafLabel, pathLabel, sectionsOf, getByPath, flattenNode, alignRows,
  splitFootnotes, cleanHtml, normalize, walkStrings, makeLocator, locate,
};
// Läuft sowohl in Node (require) als auch direkt als <script> in der Oberfläche (window.Reader)
if (typeof module !== 'undefined' && module.exports) module.exports = readerExports;
else window.Reader = readerExports;
