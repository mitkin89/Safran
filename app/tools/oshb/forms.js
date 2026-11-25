#!/usr/bin/env node
// Baut oshb-forms.js (Formen-Index für die Formentabelle) aus den mitgelieferten Westminster-Dateien.
// Aufruf: node tools/oshb/forms.js        (nach jeder Änderung an den Westminster-Texten oder an forms.js; tests/integration/hebrew-forms.cjs prüft den Stand)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const Forms = require(path.join(root, 'forms.js'));
const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles'];
const VERSION = 'Westminster Leningrad Codex (OSHB, mit Morphologie).json';
function load() {
  return BOOKS.map(title => ({ title, text: JSON.parse(fs.readFileSync(path.join(root, 'bundled', 'own', title, 'he', VERSION), 'utf8')).text }));
}
const HEAD = '// Formen-Index der Formentabelle: Lemma (Strong-Nummer wie in der OSHB) -> "Schlüssel=Form:Stellen,…;…" (Schlüssel = Sprache + Morph-Code des Hauptwortes, * = mit Artikel, /S… = Suffix; Stellen = je 3 Zeichen Versnummer zur Basis 36, gezählt über books); erzeugt mit tools/oshb/forms.js aus dem Westminster Leningrad Codex (OSHB, CC BY 4.0)\n';
const make = () => HEAD + 'window.OSHB_FORMS=' + JSON.stringify(Forms.build(load())) + ';\n';
module.exports = { make, load, BOOKS };
if (require.main === module) {
  const out = make();
  fs.writeFileSync(path.join(root, 'oshb-forms.js'), out);
  console.log('oshb-forms.js', (out.length / 1e6).toFixed(2) + ' MB (Zeichen)');
}
