// Eigene Talmud-CSV mit Daf-Fundstellen („Chullin 2a:1“) -> Sefaria-Struktur (Daf, Line)
const assert = require('assert');
const O = require('./offline.js');
const csv = 'Index Title,Chullin\nVersion Title,Test\nLanguage,de\nChullin 2a:1,eins\nChullin 2a:2,zwei\nChullin 2b:1,drei\nChullin 3a:2,vier\n';
const r = O.parseOwn(csv, 't.csv');
assert.deepStrictEqual(r.sectionNames, ['Daf', 'Line']);
assert.strictEqual(r.text[2][0], 'eins');
assert.strictEqual(r.text[2][1], 'zwei');
assert.strictEqual(r.text[3][0], 'drei');
assert.strictEqual(r.text[4][1], 'vier');
assert.strictEqual(r.segments, 4);
// Bibel-Fundstellen bleiben Kapitel:Vers
const b = O.parseOwn('Index Title,Genesis\nGenesis 1:1,a\nGenesis 1:2,b\n', 'g.csv');
assert.deepStrictEqual(b.sectionNames, ['Chapter', 'Verse']);
assert.strictEqual(b.text[0][1], 'b');
console.log('test16 ok');
