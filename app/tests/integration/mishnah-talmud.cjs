// Mischna ↔ Talmud: mitgelieferte Zuordnung (bundled/mishnah_talmud.json) und Nachschlagen in beide Richtungen (mishtal.js)
const assert = require('assert');
const MT = require('../../mishtal.js');
const table = require('../../bundled/mishnah_talmud.json');
const ix = MT.index(table);
const tracts = Object.keys(table).filter(k => k !== '~names');
assert.strictEqual(tracts.length, 37);
// jede Zeile ist lesbar: Mischna „Kap:n“ oder „Kap:n-m“, Talmud „Daf:Segment“ (auch über die Seite hinweg)
let n = 0;
for (const k of tracts) for (const [m, t] of table[k]) { assert.ok(MT.parseMishnah(m), `${k} ${m}`); const p = MT.parseTalmud(t); assert.ok(p && (p.d2 > p.d1 || (p.d2 === p.d1 && p.s2 >= p.s1)), `${k} ${t}`); n++; }
assert.ok(n > 2300);
// Mischna → Talmud
assert.deepStrictEqual(ix.toTalmud('Mishnah Berakhot', 1, 1), ['Berakhot 2a:1-5']);
assert.ok(ix.toTalmud('Mishnah Berakhot', '1', '2')[0].startsWith('Berakhot 9b:'));
assert.deepStrictEqual(ix.toTalmud('Mishnah Arakhin', 1, 1), ['Arakhin 2a:1-3', 'Arakhin 5a:16']); // später fortgesetzte Mischna: die erste Stelle zuerst
assert.deepStrictEqual(ix.toTalmud('Mishnah Arakhin', 2, 4), ['Arakhin 10a:2-4']); // Bereich „2:3-4“ gilt für beide Mischnajot
assert.deepStrictEqual(ix.toTalmud('Mishnah Peah', 1, 1), []); // kein Bavli
// Talmud → Mischna
assert.deepStrictEqual(ix.toMishnah('Berakhot', '2a', 3), ['Mishnah Berakhot 1:1']);
assert.deepStrictEqual(ix.toMishnah('Berakhot', '2a', 6), []);
assert.deepStrictEqual(ix.startsOn('Berakhot', '2a'), [[1, 'Mishnah Berakhot 1:1']]);
assert.deepStrictEqual(ix.startsOn('Berakhot', '2b'), []);
// über die Seite hinweg: „15a:12-15b:2“
assert.deepStrictEqual(ix.toMishnah('Taanit', '15b', 1), ["Mishnah Ta'anit 2:5"]);
assert.deepStrictEqual(ix.toMishnah('Taanit', '15a', 20), ["Mishnah Ta'anit 2:5"]);
// abweichende Schreibweise des Traktats (Taanit / Mishnah Ta'anit)
assert.strictEqual(ix.toTalmud("Mishnah Ta'anit", 1, 1)[0], 'Taanit 2a:1-3');
assert.ok(ix.has("Mishnah Ta'anit") && ix.has('Taanit') && !ix.has('Genesis'));
console.log(`Mischna ↔ Talmud ok (${tracts.length} Traktate, ${n} Zuordnungen)`);
