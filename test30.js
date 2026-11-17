// Interlinear: jede Zuordnung ergibt genau den Übersetzungsvers, Wortnummern liegen im Vers
const assert = require('assert'), fs = require('fs'), path = require('path');
global.window = {}; require('./interlin.js');
const ALL = window.INTERLIN, rd = (b, l, re) => { const d = path.join(__dirname, 'bundled', 'own', b, l); return JSON.parse(fs.readFileSync(path.join(d, fs.readdirSync(d).find(f => re.test(f))), 'utf8')).text; };
const norm = s => s.replace(/<sup class="footnote-marker">.*?<\/sup><i class="footnote">.*?<\/i>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const PARTIAL = { Goldschmidt: { Genesis: 1 }, Breuer: { Ezekiel: 24 } }; // ausdrücklich geprüfter Teilumfang: alle Verse bis einschließlich dieses Kapitels
const PAT = { Zunz: /Zunz/, Breuer: /^(?:Breuer|Das Buch Jecheskel, übersetzt und erläutert von Dr\. Joseph Breuer,)/, Philippson: /Philippson/, Herxheimer: /ebräischen Texte/, Goldschmidt: /Übersetzung von Lazarus Goldschmidt, Berlin 1921/ };
for (const [tr, D] of Object.entries(ALL)) for (const book of Object.keys(D)) {
  const he = rd(book, 'he', /^Westminster/), de = rd(book, 'de', PAT[tr]);
  let n = 0, pending = 0;
  he.forEach((ch, c) => ch.forEach((v, i) => {
    if (PARTIAL[tr]?.[book] && c + 1 > PARTIAL[tr][book]) { pending++; return; }
    const segs = D[book][`${c + 1}:${i + 1}`]; assert(segs, `${tr} ${book} ${c + 1}:${i + 1} fehlt`);
    assert.strictEqual(norm(segs.map(s => s[1]).join(' ')), norm(de[c][i]), `${book} ${c + 1}:${i + 1}`);
    const nw = (v.match(/<span class="w"/g) || []).length;
    segs.forEach(s => s[0].forEach(x => assert(x >= 1 && x <= nw, `${book} ${c + 1}:${i + 1} Wortnummer ${x}`)));
    n++;
  }));
  assert.strictEqual(n, Object.keys(D[book]).length, `${tr} ${book}: unerwartete Versschlüssel`);
  console.log(`Interlinear ${tr} ${book}: ${n} Verse ok${pending ? `; ${pending} weitere Verse ausdrücklich noch nicht zugeordnet/geprüft (ab Kapitel ${PARTIAL[tr][book] + 1})` : ""}`);
}

assert.deepStrictEqual(Object.keys(ALL.Goldschmidt).sort(), ['Deuteronomy', 'Genesis', 'Leviticus', 'Numbers']);
for (const [book, count] of Object.entries({ Leviticus: 859, Numbers: 1288, Deuteronomy: 956 })) {
  assert.strictEqual(Object.keys(ALL.Goldschmidt[book]).length, count, `${book}: dokumentierter Gesamtumfang`);
}
// Echte OSHB-Ketiv/Qere-Positionen gemeinsam, Klammerwörter nach ihrem Gegenstück.
assert.deepStrictEqual(ALL.Goldschmidt.Numbers['1:16'].find(s => s[1] === 'die Berufenen'), [[2, 3], 'die Berufenen']);
assert.deepStrictEqual(ALL.Goldschmidt.Deuteronomy['1:44'].find(s => s[1] === '(tun),'), [[10], '(tun),']);
assert.deepStrictEqual(ALL.Goldschmidt.Leviticus['1:6'].find(s => s[1] === 'in (seine) Stükke.'), [[6], 'in (seine) Stükke.']);
assert.strictEqual(Object.keys(ALL.Goldschmidt.Genesis).length, 31);
assert.deepStrictEqual(ALL.Goldschmidt.Genesis['1:28'].find(s => s[1] === '(Gott)'), [[6], '(Gott)']);
assert.deepStrictEqual(ALL.Goldschmidt.Genesis['1:2'].find(s => s[1] === 'der Wasserfläche'), [[13, 14], 'der Wasserfläche']);

// Sämtliche separat gezählten Ketiv-/Qere-Stellen in den drei neuen Büchern.
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

// Breuer: alle verfügbaren Arba-Megillot-Bücher vollständig; Ruth bleibt erhalten.
assert.deepStrictEqual(Object.keys(ALL.Breuer).sort(), ['Ecclesiastes', 'Ezekiel', 'Lamentations', 'Ruth', 'Song of Songs']);
for (const [book, count] of Object.entries({ Ruth: 85, 'Song of Songs': 117, Ecclesiastes: 222, Lamentations: 154 })) {
  assert.strictEqual(Object.keys(ALL.Breuer[book]).length, count, `Breuer ${book}: dokumentierter Gesamtumfang`);
}
const BREUER_KQ = {
  'Song of Songs': [['1:17',4,5],['2:11',3,4],['2:13',9,10],['4:9',5,6]],
  Ecclesiastes: [['4:8',15,16],['4:17',2,3],['5:8',4,5],['5:10',10,11],['5:17',19,20],['6:10',14,15],['7:22',9,10],['10:3',3,4],['10:10',11,12],['10:20',18,19],['12:6',4,5]],
  Lamentations: [['1:6',2,3,4],['1:11',7,8],['1:18',10,11],['2:2',3,4],['2:14',11,12],['2:19',3,4],['3:10',5,6],['3:20',3,4],['3:32',6,7],['3:39',7,8],['4:3',2,3],['4:3',11,12,13],['4:12',5,6],['4:16',11,12],['4:17',1,2],['4:21',5,6],['5:1',6,7],['5:3',3,4],['5:5',5,6],['5:7',3,4],['5:7',5,6],['5:21',4,5]]
};
for (const [book, cases] of Object.entries(BREUER_KQ)) for (const [verse, ...words] of cases) {
  const touched = ALL.Breuer[book][verse].filter(s => words.some(w => s[0].includes(w)));
  assert(touched.length, `Breuer ${book} ${verse}: Ketiv/Qere fehlt`);
  touched.forEach(s => assert(words.every(w => s[0].includes(w)), `Breuer ${book} ${verse}: Ketiv/Qere getrennt`));
}

// Ezechiel: überprüfter Anfang, einschließlich der ausdrücklich erhaltenen Quelllücken.
assert.strictEqual(Object.keys(ALL.Breuer.Ezekiel).length, 619);
for (let v = 5; v <= 27; v++) assert.deepStrictEqual(ALL.Breuer.Ezekiel[`1:${v}`], [[[], '— —']]);
assert.deepStrictEqual(ALL.Breuer.Ezekiel['3:13'], [[[], '— —']]);
for (const [verse, ...words] of [['3:15',10,11],['4:6',7,8],['4:15',7,8],['6:3',15,16],['7:2',14,15],['7:21',8,9],['8:6',7,8,9],['9:4',3,4],['9:5',8,9],['9:5',11,12],['9:11',12,13,14],['12:14',4,5],['14:4',32,33],['14:14',7,8],['14:20',2,3],['16:13',5,6],['16:13',12,13],['16:18',8,9],['16:20',13,14],['16:22',6,7],['16:25',17,18],['16:31',7,8],['16:31',12,13],['16:43',4,5],['16:43',23,24],['16:47',5,6],['16:51',12,13],['16:51',17,18],['16:53',5,6],['16:53',10,11],['16:53',14,15],['16:59',6,7],['17:21',3,4],['18:20',20,21],['18:21',5,6],['18:24',14,15],['18:28',2,3],['21:28',3,4],['22:18',7,8],['23:14',10,11],['23:16',1,2],['23:42',10,11],['23:43',4,5],['23:43',6,7],['24:2',3,4]]) {
  const touched = ALL.Breuer.Ezekiel[verse].filter(s => words.some(w => s[0].includes(w)));
  assert(touched.length, `Breuer Ezekiel ${verse}: Ketiv/Qere fehlt`);
  touched.forEach(s => assert(words.every(w => s[0].includes(w)), `Breuer Ezekiel ${verse}: Ketiv/Qere getrennt`));
}

for (const v of [5,8,9,10,11,12,13,14,15,16,17,21,22]) assert.deepStrictEqual(ALL.Breuer.Ezekiel[`10:${v}`], [[[], '— —']]);
// Freigegebene Versaufteilung 5:8–10: die beiden Folgeverse sind an ihrem Ort zugeordnet.
assert.deepStrictEqual(ALL.Breuer.Ezekiel['5:9'][0], [[1], 'Und tue']);
assert.deepStrictEqual(ALL.Breuer.Ezekiel['5:10'][0], [[1], 'Deshalb']);

// Freigegebene Schreibkorrekturen: Lesung und getrennte Wortnummern erhalten.
assert.deepStrictEqual(ALL.Breuer.Ezekiel['9:3'].find(s => s[1] === 'und rief'), [[13], 'und rief']);
assert.deepStrictEqual(ALL.Breuer.Ezekiel['6:9'].find(s => s[1] === 'eure Entronnenen'), [[2], 'eure Entronnenen']);
assert.deepStrictEqual(ALL.Breuer.Ezekiel['4:8'].find(s => s[1] === 'Bande'), [[4], 'Bande']);
assert.deepStrictEqual(ALL.Breuer.Ezekiel['4:8'].find(s => s[1] === 'angelegt,'), [[2], 'angelegt,']);
assert.deepStrictEqual(ALL.Breuer.Ezekiel['10:4'].find(s => s[1] === 'dem Cherub'), [[5], 'dem Cherub']);
assert.deepStrictEqual(ALL.Breuer.Ezekiel['10:4'].find(s => s[1] === 'zur'), [[6], 'zur']);
