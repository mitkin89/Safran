// Interlinear: jede Zuordnung ergibt genau den Übersetzungsvers, Wortnummern liegen im Vers
const assert = require('assert'), fs = require('fs'), path = require('path');
global.window = {}; require('./interlin.js');
const ALL = window.INTERLIN, rd = (b, l, re) => { const d = path.join(__dirname, 'bundled', 'own', b, l); return JSON.parse(fs.readFileSync(path.join(d, fs.readdirSync(d).find(f => re.test(f))), 'utf8')).text; };
const norm = s => s.replace(/<sup class="footnote-marker">.*?<\/sup><i class="footnote">.*?<\/i>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const PAT = { Zunz: /Zunz/, Breuer: /^Breuer/, Philippson: /Philippson/, Herxheimer: /ebräischen Texte/, Goldschmidt: /Übersetzung von Lazarus Goldschmidt, Berlin 1921/, Hirsch: /Die Psalmen, übersetzt und erläutert von Samson Raphael Hirsch/, JuliusHirsch: /^Julius Hirsch, Jesaia/ };
for (const [tr, D] of Object.entries(ALL)) for (const book of Object.keys(D)) {
  const he = rd(book, 'he', /^Westminster/), de = rd(book, 'de', PAT[tr]);
  let n = 0;
  he.forEach((ch, c) => ch.forEach((v, i) => {
    const segs = D[book][`${c + 1}:${i + 1}`]; assert(segs, `${tr} ${book} ${c + 1}:${i + 1} fehlt`);
    assert.strictEqual(norm(segs.map(s => s[1]).join(' ')), norm(de[c][i]), `${book} ${c + 1}:${i + 1}`);
    const nw = (v.match(/<span class="w"/g) || []).length;
    segs.forEach(s => s[0].forEach(x => assert(x >= 1 && x <= nw, `${book} ${c + 1}:${i + 1} Wortnummer ${x}`)));
    n++;
  }));
  assert.strictEqual(n, Object.keys(D[book]).length, `${tr} ${book}: unerwartete Versschlüssel`);
  console.log(`Interlinear ${tr} ${book}: ${n} Verse ok`);
}

assert.ok(ALL.Goldschmidt.Genesis && ALL.Goldschmidt.Exodus, 'Goldschmidt Genesis und Exodus fehlen');
assert.strictEqual(Object.keys(ALL.Goldschmidt.Exodus).length, 1210);
assert.strictEqual(Object.keys(ALL.Goldschmidt.Genesis).length, 1533);
assert.deepStrictEqual(ALL.Goldschmidt.Genesis['1:28'].find(s => s[1] === '(Gott)'), [[6], '(Gott)']);
assert.deepStrictEqual(ALL.Goldschmidt.Genesis['1:2'].find(s => s[1] === 'der Wasserfläche'), [[13, 14], 'der Wasserfläche']);

// Ketiv und Qere gemeinsam; ergänzte Wörter bleiben ohne Gegenstück.
assert.deepStrictEqual(ALL.Goldschmidt.Genesis['8:17'].find(s => s[1] === 'laß herausgehen'), [[14, 15], 'laß herausgehen']);
assert.deepStrictEqual(ALL.Goldschmidt.Genesis['13:3'].find(s => s[1] === 'sein Zelt'), [[12, 13], 'sein Zelt']);
assert.deepStrictEqual(ALL.Goldschmidt.Genesis['14:2'].find(s => s[1] === 'Zebojim,'), [[16, 17], 'Zebojim,']);
assert.deepStrictEqual(ALL.Goldschmidt.Genesis['8:5'].find(s => s[1] === '[Monate],'), [[], '[Monate],']);

assert.deepStrictEqual(ALL.Goldschmidt.Genesis['49:26'].find(s => s[1] === 'uralter Berge'), [[6, 7], 'uralter Berge']);
assert.deepStrictEqual(ALL.Goldschmidt.Genesis['49:26'].find(s => s[1] === 'die Lust'), [[8], 'die Lust']);

assert.deepStrictEqual(ALL.Goldschmidt.Exodus['21:8'].find(s => s[1] === 'für sich'), [[6, 7], 'für sich']);
assert.deepStrictEqual(ALL.Goldschmidt.Exodus['32:19'].find(s => s[1] === 'aus den Händen'), [[14, 15], 'aus den Händen']);

// Hirsch: vollständige Psalmen, ausdeutende Wiedergaben, Komposita und Ketiv/Qere.
assert.strictEqual(Object.keys(ALL.Hirsch.Psalms).length, 2527);
assert.deepStrictEqual(ALL.Hirsch.Psalms['1:1'].find(s => s[1] === 'Aller Fortschritt zum Heil'), [[1], 'Aller Fortschritt zum Heil']);
assert.deepStrictEqual(ALL.Hirsch.Psalms['23:2'].find(s => s[1] === 'Auf anmuthigen Kräuter-Auen'), [[1, 2], 'Auf anmuthigen Kräuter-Auen']);
assert.deepStrictEqual(ALL.Hirsch.Psalms['26:2'].find(s => s[1] === 'läutere'), [[4, 5], 'läutere']);
assert.deepStrictEqual(ALL.Hirsch.Psalms['3:6'].find(s => s[1] === '—'), [[], '—']);

// Julius Hirsch ist eine eigene Quelle; vollständiger Jesaja mit mehrwortigem Ketiv/Qere.
assert.strictEqual(Object.keys(ALL.JuliusHirsch.Isaiah).length, 1291);
assert.deepStrictEqual(ALL.JuliusHirsch.Isaiah['3:15'].find(s => s[1] === '„Was maßt ihr euch an,'), [[1, 2, 3], '„Was maßt ihr euch an,']);
assert.deepStrictEqual(ALL.JuliusHirsch.Isaiah['5:9'].find(s => s[1] === '[tönt das Wort]'), [[], '[tönt das Wort]']);
assert.deepStrictEqual(ALL.JuliusHirsch.Isaiah['7:14'].find(s => s[1] === '„Immanuel“'), [[14, 15], '„Immanuel“']);

// Goldschmidt Leviticus, Numeri, Deuteronomium (Codex): Umfang, Klammerwörter und sämtliche separat gezählten Ketiv-/Qere-Stellen
assert.deepStrictEqual(Object.keys(ALL.Goldschmidt).sort(), ['Deuteronomy', 'Exodus', 'Genesis', 'Leviticus', 'Numbers']);
for (const [book, count] of Object.entries({ Leviticus: 859, Numbers: 1288, Deuteronomy: 956 })) {
  assert.strictEqual(Object.keys(ALL.Goldschmidt[book]).length, count, `${book}: dokumentierter Gesamtumfang`);
}
assert.deepStrictEqual(ALL.Goldschmidt.Numbers['1:16'].find(s => s[1] === 'die Berufenen'), [[2, 3], 'die Berufenen']);
assert.deepStrictEqual(ALL.Goldschmidt.Deuteronomy['1:44'].find(s => s[1] === '(tun),'), [[10], '(tun),']);
assert.deepStrictEqual(ALL.Goldschmidt.Leviticus['1:6'].find(s => s[1] === 'in (seine) Stükke.'), [[6], 'in (seine) Stükke.']);
const KQ = {
  Leviticus: [['9:22',4,5],['11:21',12,13],['16:21',5,6],['21:5',2,3],['25:30',14,15]],
  Numbers: [['1:16',2,3],['12:3',3,4],['14:36',9,10],['16:11',12,13],['21:32',8,9],['23:13',4,5],['26:9',9,10],['32:7',2,3],['34:4',9,10]],
  Deuteronomy: [['2:33',8,9],['5:10',6,7],['7:9',14,15],['8:2',21,22],['13:16',6,7],['21:7',5,6],['22:15',3,4],['22:15',9,10],['22:16',3,4],['22:20',9,10],['22:21',3,4],['22:23',3,4],['22:24',13,14],['22:25',6,7],['22:26',1,2],['22:26',7,8],['22:27',5,6],['22:28',4,5],['22:29',6,7],['28:27',5,6],['28:30',5,6],['29:22',19,20],['32:13',3,4],['33:2',15,16,17],['33:9',11,12]]
};
for (const [book, cases] of Object.entries(KQ)) for (const [verse, ...words] of cases) {
  const touched = ALL.Goldschmidt[book][verse].filter(s => words.some(w => s[0].includes(w)));
  assert(touched.length, `${book} ${verse}: Ketiv/Qere fehlt`);
  touched.forEach(s => assert(words.every(w => s[0].includes(w)), `${book} ${verse}: Ketiv/Qere getrennt`));
}
