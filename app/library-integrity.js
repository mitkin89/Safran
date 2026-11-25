'use strict';
// Sefaria's catalogue uses language names, while merged exports use ISO codes.
// These are aliases for the same requested language, not different editions.
const languageAliases = new Map([['he','he'],['hebrew','he'],['en','en'],['english','en']]);
const languageId = value => {
  const n=value.normalize('NFC');
  return languageAliases.get(n.toLowerCase()) || n;
};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function parseLibraryIndex(raw) {
  const index = JSON.parse(raw);
  if (!object(index) || !object(index.entries) || (index.version != null && index.version !== 1)) throw new Error('Ungültiges Format des Bibliotheksindexes');
  for (const [rel, entry] of Object.entries(index.entries)) {
    if (!object(entry) || entry.rel !== rel || typeof entry.title !== 'string' || !Array.isArray(entry.categories) || !entry.categories.every(c => typeof c === 'string') || rel.startsWith('/') || /[\\\x00]/.test(rel) || rel.split('/').includes('..')) throw new Error('Ungültiger Eintrag im Bibliotheksindex: ' + rel);
  }
  return index;
}

function parseDownload(buffer, expected) {
  let doc;
  try { doc = JSON.parse(buffer.toString('utf8')); } catch { throw new Error('Download enthält kein gültiges JSON; bisherige Datei bleibt erhalten'); }
  if (!object(doc) || doc.error != null || !Object.hasOwn(doc, 'text') || doc.text == null || (typeof doc.text !== 'string' && !object(doc.text) && !Array.isArray(doc.text))) throw new Error('Download enthält keinen gültigen Textbestand');
  // Komplexe Sefaria-Werke enthalten benannte Teilbäume. Leere Felder sind erlaubt,
  // Fehlerobjekte, Zahlen und Wahrheitswerte anstelle von Segmenten dagegen nicht.
  const queue = [doc.text];
  while (queue.length) {
    const value = queue.pop();
    if (value == null || typeof value === 'string') continue;
    if (Array.isArray(value)) { for (const item of value) queue.push(item); }
    else if (object(value)) { for (const item of Object.values(value)) queue.push(item); }
    else throw new Error('Download enthält ungültige Textsegmente');
  }
  for (const field of ['title', 'language', 'versionTitle']) {
    if (expected[field] == null) continue;
    const normalize = field === 'language' ? languageId : value => value.normalize('NFC');
    if (typeof doc[field] !== 'string' || normalize(doc[field]) !== normalize(String(expected[field]))) throw new Error('Download gehört nicht zur angeforderten Ausgabe: ' + field);
  }
  return doc;
}

module.exports = { parseLibraryIndex, parseDownload };
