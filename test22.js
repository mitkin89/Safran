// Wortkarte: Verteilung je Buch und häufigste Formen (forms.js), Wiedergabe in der Septuaginta (lxx.js, Index oshb-lxx.js)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const F = require('./forms.js');
const X = require('./lxx.js');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, 'oshb-forms.js'), 'utf8')); // eslint-disable-line no-eval
eval(fs.readFileSync(path.join(__dirname, 'oshb-lxx.js'), 'utf8'));   // eslint-disable-line no-eval
const D = window.OSHB_FORMS, L = window.OSHB_LXX;

// ----- Verteilung je Buch -----
let m = F.model(D, '1254 a'); // בָּרָא
let ds = F.dist(D, m);
assert.strictEqual(ds.length, 39);
assert.deepStrictEqual(ds.slice(0, 5).map(x => x.book), ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']); // Reihenfolge des Tanach
assert.strictEqual(ds[38].book, 'II Chronicles');
assert.strictEqual(ds.reduce((s, x) => s + x.n, 0), m.total); // jede Belegstelle in genau einem Buch
const by = Object.fromEntries(ds.map(x => [x.book, x]));
assert.strictEqual(by.Genesis.n, 11);  // 1:1, 1:21, 1:27 (3×), 2:3, 2:4, 5:1, 5:2 (2×), 6:7
assert.strictEqual(by.Genesis.verses, 8);
assert.ok(by.Isaiah.n > by.Genesis.n);  // am häufigsten bei Jesaja
assert.strictEqual(by.Ruth.n, 0);
assert.strictEqual(by.Genesis.size, 1533); assert.strictEqual(by.Psalms.size, 2527); // Verse des Buches (für „je 1000 Verse“)
// Stellen in einem Buch
let rs = F.refsIn(D, m, 'Genesis');
assert.deepStrictEqual(rs.map(r => `${r.ch}:${r.v}` + (r.n > 1 ? '×' + r.n : '')), ['1:1', '1:21', '1:27×3', '2:3', '2:4', '5:1', '5:2×2', '6:7']);
assert.deepStrictEqual(F.refsIn(D, m, 'Ruth'), []);
// ein häufiges Wort: Summe und Verszahl stimmen
m = F.model(D, '430'); ds = F.dist(D, m);
assert.strictEqual(ds.reduce((s, x) => s + x.n, 0), m.total);
assert.ok(ds.every(x => x.verses <= x.n && x.verses <= x.size));
assert.strictEqual(ds.find(x => x.book === 'Esther').n, 0); // im Buch Esther kommt אלהים nicht vor

// ----- häufigste Formen -----
let tf = F.topForms(m, 8);
assert.strictEqual(tf.list.length, 8);
assert.strictEqual(tf.list[0].f, 'אֱלֹהִים');
assert.ok(tf.list.every((x, i) => !i || tf.list[i - 1].n >= x.n)); // absteigend
assert.strictEqual(F.refs(D, m, tf.list[0].i).reduce((s, r) => s + r.n, 0), tf.list[0].n); // die Stellen der Form ergeben ihre Zahl
assert.ok(tf.kinds >= tf.list.length && tf.kinds <= m.forms.length);
tf = F.topForms(F.model(D, '1254 a'), 100);
assert.strictEqual(tf.list.length, tf.kinds);
assert.strictEqual(tf.list.reduce((s, x) => s + x.n, 0), F.model(D, '1254 a').total);

// ----- Septuaginta -----
assert.strictEqual(X.greek('ὁ θεὸς'), 'θεός');                       // Artikel weg, Gravis -> Akut
assert.strictEqual(X.greek('καὶ τὴν γῆν'), 'γῆν');
assert.strictEqual(X.greek('ἐν ἀρχῇ'), 'ἐν ἀρχῇ');                   // ohne hebräische Vorsilbe bleibt die Präposition
assert.strictEqual(X.greek('ἐν ἀρχῇ', { prep: true }), 'ἀρχῇ');
assert.strictEqual(X.greek('τὸ ἔλεός σου', { suf: true }), 'ἔλεος'); // Pronomen weg, Enklise-Akzent auch
assert.strictEqual(X.greek('εἶπεν δὲ'), 'εἶπεν');
assert.strictEqual(X.greek('πρὸς'), 'πρός');                          // ein einzelnes Wort bleibt immer
const he = '<span class="w" data-l="b/7225" data-m="HR/Ncfsa">בְּרֵאשִׁ֖ית</span> <span class="w" data-l="1254 a" data-m="HVqp3ms">בָּרָ֣א</span> <span class="w" data-l="430" data-m="HNcmpa">אֱלֹהִ֑ים</span> <span class="w" data-l="853" data-m="HTo">אֵ֥ת</span> <span class="w" data-l="d/8064" data-m="HTd/Ncmpa">הַשָּׁמַ֖יִם</span> <span class="w" data-l="c/853" data-m="HC/To">וְאֵ֥ת</span> <span class="w" data-l="d/776" data-m="HTd/Ncbsa">הָאָֽרֶץ</span>׃';
const gr = '<span class="wg" data-h="בראשית">ἐν ἀρχῇ</span> <span class="wg" data-h="ברא">ἐποίησεν</span> <span class="wg" data-h="אלהים">ὁ θεὸς</span> <span class="wg" data-h="את השמים">τὸν οὐρανὸν</span> <span class="wg" data-h="ואת הארץ">καὶ τὴν γῆν</span>';
assert.deepStrictEqual(X.pairs(he, gr), [['7225', 'ἀρχῇ'], ['1254 a', 'ἐποίησεν'], ['430', 'θεός'], ['8064', 'οὐρανόν'], ['776', 'γῆν']]); // את zählt nicht mit
assert.deepStrictEqual(X.pairs(he, '<span class="wg wm" data-h="ברא" data-f="m"></span> <span class="wg" data-h="" data-f="z">αὕτη</span>'), []); // Minus und Zusatz: keine Wiedergabe
assert.deepStrictEqual(X.pairs(he, '<span class="wg" data-h="ברא אלהים">ἐποίησεν ὁ θεὸς</span>'), []); // zwei Wörter für eine Gruppe: nicht eindeutig
// zweimal dasselbe Schriftbild im Vers: jede griechische Gruppe nur einmal
assert.deepStrictEqual(X.pairs('<span class="w" data-l="430" data-m="HNcmpa">אֱלֹהִ֑ים</span> <span class="w" data-l="430" data-m="HNcmpa">אֱלֹהִ֑ים</span> <span class="w" data-l="430" data-m="HNcmpa">אֱלֹהִ֑ים</span>', '<span class="wg" data-h="אלהים">θεοῦ</span> <span class="wg" data-h="אלהים">κύριος</span>').map(p => p[1]), ['θεοῦ', 'κύριος']);
const idx = X.build([{ he: [[he]], gr: [[gr]] }]);
assert.strictEqual(idx.lem['430'], '1|1|θεός:1');
assert.deepStrictEqual(X.renderings(idx, '430'), { total: 1, kinds: 1, list: [{ g: 'θεός', n: 1 }] });
assert.strictEqual(X.renderings(idx, '853'), null);
// der mitgelieferte Index
let r = X.renderings(L, '430');
assert.strictEqual(r.list[0].g, 'θεός'); assert.ok(r.total > 2000 && r.list.length <= 12);
r = X.renderings(L, '3068'); assert.strictEqual(r.list[0].g, 'κύριος');
r = X.renderings(L, '8451'); assert.ok(r.list.slice(0, 3).every(x => x.g.startsWith('νόμ'))); // תּוֹרָה → νόμος
assert.ok(r.list.every((x, i) => !i || r.list[i - 1].n >= x.n));
assert.ok(Object.keys(L.lem).length > 8000);
// Der Index ist auf dem Stand der mitgelieferten Texte (sonst: node tools/catss/lxx-lemma.js)
assert.strictEqual(require('./tools/catss/lxx-lemma.js').make(), fs.readFileSync(path.join(__dirname, 'oshb-lxx.js'), 'utf8'), 'oshb-lxx.js ist veraltet: node tools/catss/lxx-lemma.js');
console.log(`Wortkarte ok (Verteilung auf ${ds.length} Bücher, ${Object.keys(L.lem).length} Lemmata mit Septuaginta-Wiedergabe)`);
