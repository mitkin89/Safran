// node build_abk.js <Projektordner>: erzeugt gabk-data.js (Kürzel -> Auflösung) aus tools/gesenius/abkuerzungen.json
const fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || '.');
const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'abkuerzungen.json'), 'utf8')).eintraege;
const OVER = { // gezielte Texte für mehrdeutige Kürzel
  'm.': 'masculinum · auch: mit', 'f.': 'femininum (nach einer Zahl: folgende)', 's.': 'siehe (im Verzeichnis: sein)',
  'St.': 'Stamm (oder: Stelle; auch: Stade, s. dort)', 'a.': 'andere(r), auch', 'V.': 'Verbum (vor einer Zahl: Vers)',
};
const out = {};
for (const x of src) {
  const k = String(x.abk || '').trim();
  if (!k || /[\u0590-\u05FF]/.test(k) || k === '†' || k === '*') continue; // hebräische Zeichen und Sonderzeichen: nicht im Text suchen
  if (/\d/.test(k) && !/§/.test(k)) continue; // Muster mit Zahl („Gl. 1238“)
  let v = OVER[k] || x.voll;
  if (!OVER[k] && x.notiz && !/^Verweis$|^Muster/.test(x.notiz)) v += ' (' + x.notiz + ')';
  if (out[k]) continue; out[k] = [v, x.art[0]];
}
const txt = '// erzeugt von tools/gesenius/build_abk.js aus abkuerzungen.json (Gesenius, Hebr. u. aram. Handwörterbuch, 17. Aufl. 1915, S. XI–XIII)\n'
  + '(function (g) { const D = ' + JSON.stringify(out) + ';\nif (typeof module !== \'undefined\' && module.exports) module.exports = D; else g.GAbkData = D; })(typeof window !== \'undefined\' ? window : globalThis);\n';
fs.writeFileSync(path.join(root, 'gabk-data.js'), txt);
console.log(Object.keys(out).length, 'Kürzel');
