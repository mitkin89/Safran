// Stellenerkennung: Bavli-Blätter in deutscher Schreibweise, Folgeblätter einer Aufzählung (bKidd 13ᵃ. 22ᵇ. 25ᵇ. 28ᵃᵇ) und Josephus
const assert = require('assert'), A = require('./autoref');
const refs = t => [...A.link(t, { last: '' }).matchAll(/data-sref="([^"]*)"[^>]*>([^<]*)</g)].map(m => m[1]);
const eq = (t, want) => assert.deepStrictEqual(refs(t), want, t);
eq('siehe Sanh. 109 b (Perles)', ['Sanhedrin 109b']);
eq('bKidd 13ᵃ. 22ᵇ. 25ᵇ. 28ᵃᵇ, danach', ['Kiddushin 13a', 'Kiddushin 22b', 'Kiddushin 25b', 'Kiddushin 28a']); // Folgeblätter gehören zum selben Traktat
eq('bSabb 102b; 31a', ['Shabbat 102b', 'Shabbat 31a']);
eq('Baba bathra 133 b; Kiddusch. 40a', ['Bava Batra 133b', 'Kiddushin 40a']);
eq('Bab. mez. 96 a und Sota 49 a, Men. 10a, Rosch Hasch. 17 a', ['Bava Metzia 96a', 'Sotah 49a', 'Menachot 10a', 'Rosh Hashanah 17a']);
eq('Jos. Ant. IV, 1, 1 und B. J. VI 3, 4 ff.; c. Ap. II, 24; Ant. 14. 9. 4', ['The Antiquities of the Jews 4:1:1', 'The War of the Jews 6:3:4', 'Against Apion 2:24', 'The Antiquities of the Jews 14:9:4']);
eq('Ant. XI, 8', ['The Antiquities of the Jews 11:8']);
// keine Treffer: Verse, Offenbarung, Fremdes
eq('in V. 13 a fehlt; Apoc. 14, 13; Justin Ap. I, 12, 10; Seite 12 a', []);
// Bibelstellen und Krauss-Schreibweise unverändert
eq('Gen. 1, 2 und bBerakh 3a', ['Genesis 1:2', 'Berakhot 3a']);
console.log('Stellenerkennung (Blätter, Folgeblätter, Josephus) ok');
