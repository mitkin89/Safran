// Interlinear: jede Zuordnung ergibt genau den Übersetzungsvers, Wortnummern liegen im Vers
const assert = require('assert'), fs = require('fs'), path = require('path');
global.window = {}; require('./interlin.js');
const ALL = window.INTERLIN, rd = (b, l, re) => { const d = path.join(__dirname, 'bundled', 'own', b, l); return JSON.parse(fs.readFileSync(path.join(d, fs.readdirSync(d).find(f => re.test(f))), 'utf8')).text; };
const norm = s => s.replace(/<sup class="footnote-marker">.*?<\/sup><i class="footnote">.*?<\/i>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const PAT = { Zunz: /Zunz/, Breuer: /^Breuer/, Philippson: /Philippson/, Herxheimer: /ebräischen Texte/, Goldschmidt: /Übersetzung von Lazarus Goldschmidt, Berlin 1921/ };
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
