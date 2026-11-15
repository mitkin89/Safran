#!/usr/bin/env node
// Baut oshb-lxx.js (Wortkarte: Wiedergabe eines Lemmas in der Septuaginta) aus den mitgelieferten Westminster- und CATSS-Dateien.
// Aufruf: node tools/catss/lxx-lemma.js      (nach Änderungen an diesen Texten oder an lxx.js; test22.js prüft den Stand)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const Lxx = require(path.join(root, 'lxx.js'));
const { BOOKS } = require(path.join(root, 'tools', 'oshb', 'forms.js'));
const read = (title, kind, name) => { try { return JSON.parse(fs.readFileSync(path.join(root, 'bundled', 'own', title, kind, name), 'utf8')).text; } catch { return null; } };
const load = () => BOOKS.map(title => ({ title, he: read(title, 'he', 'Westminster Leningrad Codex (OSHB, mit Morphologie).json') || [], gr: read(title, 'other', 'Septuaginta (CATSS).json') || [] }));
const HEAD = '// Wortkarte: Wiedergabe in der Septuaginta. Lemma (Strong-Nummer wie in der OSHB) -> "Zuordnungen|verschiedene Formen|Form:Anzahl,…" (die zwölf häufigsten griechischen Wortformen, nicht lemmatisiert); erzeugt mit tools/catss/lxx-lemma.js aus Westminster Leningrad Codex (OSHB, CC BY 4.0) und CATSS (Tov/Kraft, CC BY-NC-SA 3.0, siehe LICENSE-CATSS.md)\n';
const make = () => HEAD + 'window.OSHB_LXX=' + JSON.stringify(Lxx.build(load())) + ';\n';
module.exports = { make, load };
if (require.main === module) {
  const out = make();
  fs.writeFileSync(path.join(root, 'oshb-lxx.js'), out);
  console.log('oshb-lxx.js', (out.length / 1e6).toFixed(2) + ' MB (Zeichen)');
}
