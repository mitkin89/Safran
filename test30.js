// Interlinear: jede Zuordnung ergibt genau den Übersetzungsvers, Wortnummern liegen im Vers
const assert = require('assert'), fs = require('fs'), path = require('path');
global.window = {}; require('./interlin.js');
const ALL = window.INTERLIN, rd = (b, l, re) => { const d = path.join(__dirname, 'bundled', 'own', b, l); return JSON.parse(fs.readFileSync(path.join(d, fs.readdirSync(d).find(f => re.test(f))), 'utf8')).text; };
const norm = s => s.replace(/<sup class="footnote-marker">.*?<\/sup><i class="footnote">.*?<\/i>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const PAT = { Zunz: /Zunz/, Breuer: /^(?:(?:Raphael )?Breuer|Das Buch Jecheskel, übersetzt und erläutert von Dr\. Joseph Breuer,)/, Philippson: /Philippson/, Herxheimer: /ebräischen Texte/, Goldschmidt: /Übersetzung von Lazarus Goldschmidt, Berlin 1921/, Hirsch: /Die Psalmen, übersetzt und erläutert von Samson Raphael Hirsch/, JuliusHirsch: /^Julius Hirsch, / };
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

// Trei Asar: sämtliche Versstellen, einschließlich der aus Scans ergänzten Verse.
const TREI_ASAR = { Hosea: 197, Joel: 73, Amos: 146, Obadiah: 21, Jonah: 48, Micah: 105, Nahum: 47, Habakkuk: 56, Zephaniah: 53, Haggai: 38, Zechariah: 211, Malachi: 55 };
for (const [book, count] of Object.entries(TREI_ASAR)) assert.strictEqual(Object.keys(ALL.JuliusHirsch[book]).length, count, `Julius Hirsch ${book}`);
// Die drei wiederhergestellten Amos-Verse müssen Text und sämtliche Wortnummern enthalten.
for (const [ref, count] of [['7:15', 12], ['7:16', 15], ['7:17', 24]]) {
  const segs = ALL.JuliusHirsch.Amos[ref];
  assert.ok(segs.some(s => s[1].length), `Amos ${ref}: ergänzter Text fehlt`);
  assert.deepStrictEqual([...new Set(segs.flatMap(s => s[0]))].sort((a, b) => a - b), Array.from({ length: count }, (_, i) => i + 1));
}
// Habakuks verlorene Fortsetzung enthält nun auch die bisher fehlenden Wörter 11–19.
assert.ok(Array.from({ length: 9 }, (_, i) => i + 11).every(n => ALL.JuliusHirsch.Habakkuk['2:6'].some(s => s[0].includes(n))));

// Breuer: alle verfügbaren Arba-Megillot-Bücher vollständig; Ruth bleibt erhalten.
assert.deepStrictEqual(Object.keys(ALL.Breuer).sort(), ['Ecclesiastes', 'Ezekiel', 'Ezra', 'Judges', 'Lamentations', 'Nehemiah', 'Ruth', 'Song of Songs']);
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

// Ezechiel vollständig: alle 48 Kapitel, einschließlich der ausdrücklich erhaltenen Quelllücken.
assert.strictEqual(Object.keys(ALL.Breuer.Ezekiel).length, 1273);
for (let v = 5; v <= 27; v++) assert.deepStrictEqual(ALL.Breuer.Ezekiel[`1:${v}`], [[[], '— —']]);
assert.deepStrictEqual(ALL.Breuer.Ezekiel['3:13'], [[[], '— —']]);
for (const [verse, ...words] of [['3:15',10,11],['4:6',7,8],['4:15',7,8],['6:3',15,16],['7:2',14,15],['7:21',8,9],['8:6',7,8,9],['9:4',3,4],['9:5',8,9],['9:5',11,12],['9:11',12,13,14],['12:14',4,5],['14:4',32,33],['14:14',7,8],['14:20',2,3],['16:13',5,6],['16:13',12,13],['16:18',8,9],['16:20',13,14],['16:22',6,7],['16:25',17,18],['16:31',7,8],['16:31',12,13],['16:43',4,5],['16:43',23,24],['16:47',5,6],['16:51',12,13],['16:51',17,18],['16:53',5,6],['16:53',10,11],['16:53',14,15],['16:59',6,7],['17:21',3,4],['18:20',20,21],['18:21',5,6],['18:24',14,15],['18:28',2,3],['21:28',3,4],['22:18',7,8],['23:14',10,11],['23:16',1,2],['23:42',10,11],['23:43',4,5],['23:43',6,7],['24:2',3,4],["25:7",8,9],["25:9",16,17],["27:3",3,4],["27:6",11,12],["27:15",10,11],["28:3",4,5],["29:4",2,3],["29:7",3,4],["30:16",5,6],["31:5",11,12],["32:31",7,8],["32:32",4,5],["33:13",12,13],["33:16",2,3],["35:9",6,7],["35:12",15,16],["36:13",10,11],["36:13",13,14],["36:14",6,7],["36:14",9,10],["36:15",12,13],["37:16",13,14],["37:16",26,27],["37:19",18,19],["37:22",14,15],["39:25",9,10],["40:6",9,10],["40:9",7,8],["40:15",4,5],["40:21",1,2],["40:21",7,8],["40:21",9,10],["40:22",1,2],["40:22",3,4],["40:22",5,6],["40:22",17,18],["40:24",9,10],["40:24",11,12],["40:25",3,4],["40:26",3,4],["40:26",5,6],["40:26",15,16],["40:29",1,2],["40:29",3,4],["40:29",5,6],["40:29",11,12],["40:31",7,8],["40:31",11,12],["40:33",1,2],["40:33",3,4],["40:33",5,6],["40:33",11,12],["40:34",1,2],["40:34",7,8],["40:34",13,14],["40:36",1,2],["40:36",3,4],["40:36",5,6],["40:37",1,2],["40:37",7,8],["40:37",13,14],["41:8",6,7],["41:15",10,11],["42:9",1,2,3,4],["42:9",6,7],["42:14",18,19],["42:16",7,8],["43:11",17,18],["43:11",20,21],["43:16",1,2],["43:26",9,10],["44:5",23,24],["44:24",5,6],["44:24",8,9],["45:3",6,7],["45:5",8,9],["46:9",33,34],["46:15",1,2],["46:19",17,18],["47:8",17,18],["47:10",2,3],["47:11",1,2],["47:12",25,26],["48:14",7,8],["48:15",17,18],["48:16",11,12],["48:18",17,18],["48:21",35,36]]) {
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

// Raphael Breuer: Nehemia einschließlich zweier leerer Quellverse und aller Ketiv/Qere-Lesungen.
assert.strictEqual(Object.keys(ALL.Breuer.Nehemiah).length, 405);
for (const ref of ["10:31", "10:32"]) assert.deepStrictEqual(ALL.Breuer.Nehemiah[ref], [[[], ""]]);
const BREUER_NEHEMIA_KQ = [["1:1",7,8],["1:9",14,15],["2:13",17,18,19],["3:15",15,16],["3:20",6,7],["3:30",1,2],["3:31",1,2],["4:7",6,7],["4:9",12,13],["5:7",15,16],["5:9",1,2],["7:3",1,2],["7:52",6,7],["9:6",5,6],["9:17",25,26],["10:20",3,4],["11:17",21,22],["12:9",2,3],["12:14",1,2],["12:16",1,2],["12:46",6,7],["13:23",9,10],["13:23",11,12]];
for (const [ref, ...words] of BREUER_NEHEMIA_KQ) {
  const touched = ALL.Breuer.Nehemiah[ref].filter(s => words.some(w => s[0].includes(w)));
  assert.ok(touched.length, `Breuer Nehemia ${ref}: Ketiv/Qere fehlt`);
  touched.forEach(s => assert.ok(words.every(w => s[0].includes(w)), `Breuer Nehemia ${ref}: Ketiv/Qere getrennt`));
}
assert.deepStrictEqual(ALL.Breuer.Nehemiah["7:67"].find(s => s[1] === "Pferde hatten sie 736, Maultiere 245."), [[], "Pferde hatten sie 736, Maultiere 245."]);

// Raphael Breuer: Richter vollständig, alle separat gezählten Ketiv-/Qere-Gruppen.
assert.strictEqual(Object.keys(ALL.Breuer.Judges).length, 618);
const BREUER_JUDGES_KQ = [['1:27',14,15],['4:11',13,14],['6:5',6,7],['7:13',13,14],['7:21',10,11],['9:8',9,10],['9:12',6,7],['11:37',20,21],['13:17',10,11],['16:18',18,19],['16:21',14,15],['16:25',2,3,4],['16:25',14,15],['16:26',9,10],['17:2',9,10],['19:3',8,9],['19:25',21,22],['21:20',1,2],['21:22',7,8]];
for (const [ref, ...words] of BREUER_JUDGES_KQ) {
  const touched = ALL.Breuer.Judges[ref].filter(s => words.some(w => s[0].includes(w)));
  assert.ok(touched.length, `Breuer Richter ${ref}: Ketiv/Qere fehlt`);
  touched.forEach(s => assert.ok(words.every(w => s[0].includes(w)), `Breuer Richter ${ref}: Ketiv/Qere getrennt`));
}
// Klammerwörter einzeln beurteilt: Zehen sind übersetzt, die Maßeinheit ist ergänzt.
assert.deepStrictEqual(ALL.Breuer.Judges['1:6'].find(s => s[1] === 'die Daumen (und großen Zehen)'), [[9,10], 'die Daumen (und großen Zehen)']);
assert.deepStrictEqual(ALL.Breuer.Judges['8:26'].find(s => s[1] === '(Sekel)'), [[], '(Sekel)']);
assert.deepStrictEqual(ALL.Breuer.Judges['19:26'].find(s => s[1] === 'dort)'), [[11], 'dort)']);

// Raphael Breuer: Esra vollständig, auch die aramäischen Abschnitte und sämtliche Ketiv/Qere.
assert.strictEqual(Object.keys(ALL.Breuer.Ezra).length, 280);
const BREUER_EZRA_KQ = [["2:1",9,10],["2:46",4,5],["2:50",4,5],["2:50",7,8],["3:3",10,11],["4:2",15,16],["4:4",8,9],["4:7",8,9],["4:7",11,12],["4:9",13,14],["4:9",17,18],["4:12",15,16],["4:12",18,19],["4:12",20,21],["4:23",7,8],["5:1",3,4],["5:1",8,9],["5:2",16,17],["5:12",14,15],["5:15",3,4],["6:14",7,8],["6:17",15,16],["7:18",3,4],["7:18",6,7],["7:25",12,13],["7:26",20,21],["8:14",4,5],["8:17",1,2],["8:17",16,17],["8:25",1,2],["10:2",6,7],["10:12",8,9],["10:29",8,9],["10:35",3,4],["10:37",3,4],["10:43",7,8],["10:44",3,4]];
for (const [ref, ...words] of BREUER_EZRA_KQ) {
  const touched = ALL.Breuer.Ezra[ref].filter(s => words.some(w => s[0].includes(w)));
  assert.ok(touched.length, `Breuer Esra ${ref}: Ketiv/Qere fehlt`);
  touched.forEach(s => assert.ok(words.every(w => s[0].includes(w)), `Breuer Esra ${ref}: Ketiv/Qere getrennt`));
}
assert.deepStrictEqual(ALL.Breuer.Ezra['2:6'].find(s => s[1] === '(und)'), [[], '(und)']);
assert.deepStrictEqual(ALL.Breuer.Ezra['6:21'].find(s => s[1] === '(das Peßachopfer),'), [[], '(das Peßachopfer),']);
assert.deepStrictEqual(ALL.Breuer.Ezra['8:17'].find(s => s[1] === 'eingesetzt waren'), [[16,17], 'eingesetzt waren']);
// Das fehlende Glied der Ahnenreihe wird weder erfunden noch dem nächsten Namen zugewiesen.
assert.ok(ALL.Breuer.Ezra['7:2'].every(s => !s[0].includes(3) && !s[0].includes(4)));
