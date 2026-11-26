'use strict';
// Sefaria's catalogue uses language names, while merged exports use ISO codes.
// These are aliases for the same requested language, not different editions.
const languageAliases = new Map([['he','he'],['hebrew','he'],['en','en'],['english','en']]);
const languageId = value => {
  const n=value.normalize('NFC');
  return languageAliases.get(n.toLowerCase()) || n;
};
// Verified spellings from the export catalogue and the corresponding JSON files.
// The three JPS editions use the same labels across books.
const versionTitleAliases = [
  ["THE JPS TANAKH Gender-Sensitive Edition", "THE JPS TANAKH: Gender-Sensitive Edition", ""],
  ["Tanakh The Holy Scriptures, published by JPS", "Tanakh: The Holy Scriptures, published by JPS", ""],
  ["The Holy Scriptures A New Translation JPS 1917", "The Holy Scriptures: A New Translation (JPS 1917)", ""],
  ["Bíblia catalana, traducció interconfessional Catalan Bible, interconfessional translation [ca]", "Bíblia catalana, traducció interconfessional (Catalan Bible, interconfessional translation [ca]", "Exodus"],
  ["Catalan Bible, interconfessional translation Bíblia catalana, traducció interconfessional [ca]", "Catalan Bible, interconfessional translation (Bíblia catalana, traducció interconfessional) [ca]", "Exodus"],
  ["El Pentateuco Con El Comentario de Rabí Shelomó Itzjakí Rashí [es]", "El Pentateuco Con El Comentario de Rabí Shelomó Itzjakí (Rashí) [es]", "Genesis"],
  ["THE OLD TESTAMENT TRANSLATED OUT OF THE ORIGINAL TONGUES AND WITH THE FORMER TRANSLATIONS DILIGENTLY COMPARED AND REVISED, BY HIS MAJESTY’S SPECIAL COMMAND  AUTHORIZED KING JAMES VERSION  ", "THE OLD TESTAMENT TRANSLATED OUT OF THE ORIGINAL TONGUES: AND WITH THE FORMER TRANSLATIONS DILIGENTLY COMPARED AND REVISED, BY HIS MAJESTY’S SPECIAL COMMAND  AUTHORIZED KING JAMES VERSION  ", "Genesis"],
  ["Ejchah Übers. u. Komm. Igor Itkin [de]", "Ejchah Übers. u. Komm.: Igor Itkin [de]", "Lamentations"],
  ["Berlin Jüdischer Buch-Verlag Erwin Löwe, 1938 [de]", "Berlin: Jüdischer Buch-Verlag Erwin Löwe, 1938 [de]", "What is the Talmud"],
];
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
  // In this merged export false marks a missing segment. The reader skips it
  // while retaining the position of subsequent segments.
  const allowsFalseGap = expected.title === 'Midrash Aggadah' && expected.versionTitle === 'merged' &&
    languageId(String(expected.language)) === 'he' && doc.title === expected.title &&
    doc.versionTitle === expected.versionTitle && typeof doc.language === 'string' && languageId(doc.language) === 'he';
  const queue = [doc.text];
  while (queue.length) {
    const value = queue.pop();
    if (value == null || typeof value === 'string' || (value === false && allowsFalseGap)) continue;
    if (Array.isArray(value)) { for (const item of value) queue.push(item); }
    else if (object(value)) { for (const item of Object.values(value)) queue.push(item); }
    else throw new Error('Download enthält ungültige Textsegmente');
  }
  for (const field of ['title', 'language', 'versionTitle']) {
    if (expected[field] == null) continue;
    const normalize = field === 'language' ? languageId : value => value.normalize('NFC');
    const actual = typeof doc[field] === 'string' ? normalize(doc[field]) : null;
    const wanted = normalize(String(expected[field]));
    if (actual === wanted) continue;
    if (field === 'versionTitle' && versionTitleAliases.some(([listed, exported, book]) =>
      (!book || (typeof doc.title === 'string' && doc.title.normalize('NFC') === book)) &&
      (listed === wanted && exported === actual || exported === wanted && listed === actual))) continue;
    throw new Error('Download gehört nicht zur angeforderten Ausgabe: ' + field);
  }
  return doc;
}

module.exports = { parseLibraryIndex, parseDownload };
