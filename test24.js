// Versumrechnung zwischen Zähltraditionen (versemap.js; Tabelle versemap-data.js aus TVTMS, STEPBible.org / Tyndale House, CC BY 4.0):
// bekannte Stellen, Bereiche, Teilverse, Stellenerkennung mit anderer Zählung, Umstellen einer Fassung, Regeln und Verknüpfungen
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const V = require('./versemap.js');
const A = require('./autoref.js');
const D = require('./versemap-data.js');
const SHAPE = JSON.parse(fs.readFileSync(path.join(__dirname, 'tools', 'ownlinks', 'tanakh_shape.json'), 'utf8'));
const to = (ref, from, t) => V.map(ref, from, t).ref;

// ----- englisch <-> hebräisch -----
assert.strictEqual(to('Psalms 51:1', 'eng', 'heb'), 'Psalms 51:3');   // Überschrift zählt hebräisch als Vers 1–2
assert.strictEqual(to('Psalms 51:3', 'heb', 'eng'), 'Psalms 51:1');
assert.strictEqual(to('Psalms 51:19', 'eng', 'heb'), 'Psalms 51:21');
assert.strictEqual(to('Psalms 3:1', 'eng', 'heb'), 'Psalms 3:2');     // Überschrift = ein Vers
assert.strictEqual(to('Psalms 23:1', 'eng', 'heb'), 'Psalms 23:1');   // Überschrift im ersten Vers: keine Verschiebung
assert.strictEqual(to('Joel 3:1', 'eng', 'heb'), 'Joel 4:1');
assert.strictEqual(to('Joel 2:28', 'eng', 'heb'), 'Joel 3:1');
assert.strictEqual(to('Joel 4:21', 'heb', 'eng'), 'Joel 3:21');
assert.strictEqual(to('Malachi 4:1', 'eng', 'heb'), 'Malachi 3:19');
assert.strictEqual(to('Malachi 4:6', 'eng', 'heb'), 'Malachi 3:24');
assert.strictEqual(to('Malachi 3:19', 'heb', 'eng'), 'Malachi 4:1');
assert.strictEqual(to('Genesis 32:1', 'eng', 'heb'), 'Genesis 32:2');
assert.strictEqual(to('Genesis 31:55', 'eng', 'heb'), 'Genesis 32:1');
assert.strictEqual(to('I Kings 4:32', 'eng', 'heb'), 'I Kings 5:12');
assert.strictEqual(to('Hosea 1:10', 'eng', 'heb'), 'Hosea 2:1');
assert.strictEqual(to('Nehemiah 7:73', 'eng', 'heb'), 'Nehemiah 7:72');
assert.strictEqual(to('Daniel 4:1', 'eng', 'heb'), 'Daniel 3:31');
let r = V.map('Genesis 1:1', 'eng', 'heb');
assert.deepStrictEqual([r.ref, r.changed], ['Genesis 1:1', false]);  // nicht genannte Verse zählen überall gleich
// Bereiche, auch über die Kapitelgrenze der Zieltradition
assert.strictEqual(to('Joel 2:28-32', 'eng', 'heb'), 'Joel 3:1-5');
assert.strictEqual(to('Psalms 51:1-3', 'eng', 'heb'), 'Psalms 51:3-5');
r = V.map('Joel 2:30-3:2', 'eng', 'heb');
assert.strictEqual(r.ref, 'Joel 3:3-4:2');
// 1→n, n→1 und die Überschrift ohne Verszahl
r = V.map('Psalms 51:1', 'heb', 'eng');
assert.deepStrictEqual([r.ref, r.changed], ['Psalms 51:title', true]);
assert.deepStrictEqual(V.verse('Psalms', 51, 0, 'eng', 'heb'), [[51, 1], [51, 2]]);
// ----- griechisch (Septuaginta, Rahlfs) / lateinisch (Vulgata) <-> hebräisch -----
assert.strictEqual(to('Psalms 22', 'grk', 'heb'), 'Psalms 23');        // ganzes Kapitel
assert.strictEqual(to('Psalms 22:1', 'grk', 'heb'), 'Psalms 23:1');
assert.strictEqual(to('Psalms 23:4', 'heb', 'grk'), 'Psalms 22:4');
assert.strictEqual(to('Psalms 9:22', 'grk', 'heb'), 'Psalms 10:1');    // Ps 9 und 10 sind griechisch ein Psalm
assert.strictEqual(to('Psalms 113:9', 'lat', 'heb'), 'Psalms 115:1');  // Ps 114 und 115 ebenso
assert.strictEqual(to('Psalms 147:1', 'grk', 'heb'), 'Psalms 147:12'); // Ps 147 ist griechisch 146 und 147
assert.strictEqual(to('Psalms 148:1', 'grk', 'heb'), 'Psalms 148:1');
assert.strictEqual(to('Jeremiah 38:31', 'grk', 'heb'), 'Jeremiah 31:31');
assert.strictEqual(to('Jeremiah 31:31', 'heb', 'grk'), 'Jeremiah 38:31');
assert.strictEqual(to('Jeremiah 30:1', 'grk', 'heb'), 'Jeremiah 49:7'); // nach dem Wortlaut auf Rahlfs berichtigt (Edom)
assert.strictEqual(to('Malachi 3:22', 'grk', 'heb'), 'Malachi 3:23');  // Rahlfs: Elia vor Mose
assert.strictEqual(to('Malachi 3:24', 'grk', 'heb'), 'Malachi 3:22');
assert.strictEqual(to('Hosea 2:1', 'grk', 'heb'), 'Hosea 2:1');        // Rahlfs zählt hier hebräisch
assert.strictEqual(to('Genesis 32:1', 'grk', 'heb'), 'Genesis 32:1');
assert.strictEqual(V.map('Jeremiah 25:14', 'heb', 'grk').none, true);   // fehlt griechisch
assert.strictEqual(to('Joel 3:1', 'lat', 'heb'), 'Joel 4:1');
assert.strictEqual(to('Joel 4:1', 'heb', 'grk'), 'Joel 4:1');
// hin und zurück: jeder hebräische Vers, der eine Entsprechung hat, findet über sie zurück
for (const t of ['eng', 'lat', 'grk']) {
  let n = 0, bad = 0;
  for (const [book, sh] of Object.entries(SHAPE)) sh.forEach((cnt, ci) => {
    for (let v = 1; v <= cnt; v++) for (const x of V.verse(book, ci + 1, v, 'heb', t)) { n++; if (!V.verse(book, x[0], x[1], t, 'heb').some(y => y[0] === ci + 1 && y[1] === v)) bad++; }
  });
  assert.ok(n > 23000 && bad / n < 0.002, `${t}: ${bad} von ${n} Versen finden nicht zurück`);
}
// alle hebräischen Angaben der Tabelle gibt es in Sefarias Zählung
for (const [book, rows] of Object.entries(D.books)) for (const row of rows) for (const p of row[1].replace(/^=/, '').split(',').filter(Boolean)) {
  const m = /^(\d+):(\d+)(?:-(\d+))?/.exec(p), sh = SHAPE[book];
  assert.ok(m && sh && +m[1] <= sh.length && +(m[3] || m[2]) <= sh[+m[1] - 1], `${book} ${p}`);
}
assert.deepStrictEqual(Object.keys(D.shape).length, 39);
assert.ok(/CC BY 4\.0/.test(D.source) && /Tyndale House/.test(D.source));

// ----- Stellenangaben auf die hebräische Zählung bringen -----
assert.strictEqual(V.valid('Psalms 51:21'), true);
assert.strictEqual(V.valid('Joel 3:11'), false);
assert.strictEqual(V.valid('Mishnah Peah 9:9'), true); // außerhalb des Tanach wird nicht geprüft
r = V.resolve('Joel 3:11', 'heb'); // gibt es hebräisch nicht: als englische Zählung gelesen
assert.deepStrictEqual([r.ref, r.from, r.guessed], ['Joel 4:11', 'eng', true]);
assert.strictEqual(V.resolve('Psalms 51:3', 'heb').from, null);
assert.strictEqual(V.resolve('Psalms 23:9', 'heb').from, null);        // Druckfehler bleiben stehen (keine lateinische Vermutung)
assert.strictEqual(V.resolve('Psalms 51:3', 'eng').ref, 'Psalms 51:5');
assert.strictEqual(V.resolve('Bereshit Rabbah 12:15', 'eng').from, null);
let h = A.link('vgl. Ps. 51, 3 und Joel 3, 11; ebd. 3, 1', { last: '' });
assert.ok(h.includes('data-sref="Psalms 51:3"') && h.includes('data-sref="Joel 4:11" data-oref="Joel 3:11" data-vt="eng"') && h.includes('data-sref="Joel 3:1"'));
assert.ok(h.includes('title="englische Zählung Joel 3:11 = hebr. 4:11"'));
h = A.link('Ps. 51, 3; Mal. 4, 5; Gen. 1, 1', { last: '', trad: 'eng' });
assert.ok(h.includes('data-sref="Psalms 51:5" data-oref="Psalms 51:3"') && h.includes('data-sref="Malachi 3:23"') && h.includes('data-sref="Genesis 1:1" title="Genesis 1:1"'));
h = A.link('LXX Jer. 38, 31; Ps. 22, 1', { last: '', trad: 'grk' });
assert.ok(h.includes('data-sref="Jeremiah 31:31"') && h.includes('data-sref="Psalms 23:1"'));
assert.ok(!A.link('Joel 3, 11', { last: '', vers: false }).includes('data-oref')); // abschaltbar
assert.ok(!A.link('bSabb 109ᵇ; MKel 2,3', { last: '', trad: 'eng' }).includes('data-oref')); // rabbinische Stellen bleiben

// ----- eine Fassung mit anderer Zählung in die hebräische umstellen (Spaltenansicht, Gleichlauf) -----
const mk = shape => shape.map((n, c) => Array.from({ length: n }, (_, v) => `t${c + 1}.${v + 1}`));
let m = V.remap(mk([20, 32, 21]), 'Joel', 'eng'); // englisch: 3 Kapitel
assert.deepStrictEqual(m.text.map(c => c.length), SHAPE.Joel);
assert.strictEqual(m.text[1][26], 't2.27');                                   // 2:27 bleibt
assert.strictEqual(m.text[2][0], '<small>[2:28]</small> t2.28');              // 2:28 -> 3:1, eigene Nummer davor
assert.strictEqual(m.text[3][20], '<small>[3:21]</small> t3.21');
assert.deepStrictEqual(m.src['4:1'], [[3, 1]]);
assert.strictEqual(m.moved, 26);
m = V.remap(mk([14, 17, 24]), 'Malachi', 'grk'); // Rahlfs: Verse 3:22–24 in anderer Reihenfolge
assert.deepStrictEqual([m.text[2][21], m.text[2][22], m.text[2][23]], ['<small>[3:24]</small> t3.24', '<small>[3:22]</small> t3.22', '<small>[3:23]</small> t3.23']);
const ps = Array.from({ length: 51 }, () => ['x']); ps[50] = Array.from({ length: 19 }, (_, v) => `p${v + 1}`); // englischer Psalm 51 ohne Überschrift
m = V.remap(ps, 'Psalms', 'eng');
assert.strictEqual(m.text[50].length, 21);
assert.deepStrictEqual([m.text[50][0], m.text[50][1], m.text[50][2]], ['', '', '<small>[51:1]</small> p1']);
m = V.remap(mk(SHAPE.Ruth), 'Ruth', 'grk');
assert.strictEqual(m.moved, 0);                                               // nichts zu tun: der Text bleibt, wie er ist
assert.strictEqual(V.remap(mk([5, 5]), 'Ben Sira', 'grk').moved, 0);           // nur Bücher des Tanach
// die mitgelieferten Rahlfs-Texte des Tanach (Hosea, Ester) zählen wie der hebräische Text und bleiben unverändert
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundled', 'versification.json'), 'utf8'));
const man = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundled', 'manifest.json'), 'utf8')).items;
let rahlfs = 0;
for (const e of man) {
  if (V.tradOf(cfg, e, 'text') === 'heb') continue;
  assert.ok(/^Septuaginta \(Rahlfs/.test(e.versionTitle), e.versionTitle);
  assert.strictEqual(V.tradOf(cfg, e, 'text'), 'grk');
  rahlfs++;
  if (!V.known(e.title)) continue;
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundled', e.rel), 'utf8'));
  assert.strictEqual(V.remap(d.text, e.title, 'grk').moved, 0, e.title);
}
assert.ok(rahlfs >= 19);
// die deutschen Bibeln und Kommentare zitieren hebräisch (Stichprobe dokumentiert in bundled/versification.json)
for (const vt of ['Die Israelitische Bibel, übersetzt und erläutert von Dr. Ludwig Philippson — Kommentar', 'Die Psalmen, übersetzt und erläutert von Samson Raphael Hirsch. Frankfurt am Main 1882', 'Septuaginta (CATSS)'])
  assert.strictEqual(V.tradOf(cfg, { versionTitle: vt, title: 'Psalms' }, 'cites'), 'heb');
assert.strictEqual(V.tradOf({ rules: [{ titlePrefix: 'Luther', cites: 'eng' }, { title: 'Psalms', text: 'lat' }] }, { title: 'Luther on Joel' }, 'cites'), 'eng');
assert.strictEqual(V.tradOf({ rules: [{ titlePrefix: 'Luther', cites: 'eng' }, { title: 'Psalms', text: 'lat' }] }, { title: 'Psalms' }, 'text'), 'lat');

// ----- Verknüpfungen aus den eigenen Texten stehen in hebräischer Zählung (tools/ownlinks/build.js) -----
const tsv = fs.readFileSync(path.join(__dirname, 'bundled', 'links', 'I Kings.tsv'), 'utf8').split('\n');
assert.ok(tsv.includes('5:12\tSong of Songs 1:1\treference\tTanakh'));  // „1 Kön 4, 32“ bei Herxheimer = 5,12
assert.ok(fs.readFileSync(path.join(__dirname, 'bundled', 'links', 'Joel.tsv'), 'utf8').includes('4:11\tPhilippson on Isaiah 11:11\t'));
let bad = 0, all = 0;
for (const f of fs.readdirSync(path.join(__dirname, 'bundled', 'links'))) {
  const book = f.replace(/\.tsv$/, ''); if (!SHAPE[book]) continue;
  for (const l of fs.readFileSync(path.join(__dirname, 'bundled', 'links', f), 'utf8').split('\n')) {
    if (!l || l.split('\t')[1].startsWith('Legends of the Jews ')) continue; // Ginzbergs Noten haben eigene Verknüpfungen (nicht aus tools/ownlinks)
    all++; if (!V.valid(book + ' ' + l.split('\t')[0])) bad++;
  }
}
assert.strictEqual(bad, 0, `${bad} Verknüpfungen an Stellen, die es hebräisch nicht gibt`);
console.log(`Versumrechnung ok (${Object.values(D.books).reduce((s, x) => s + x.length, 0)} Zeilen für ${Object.keys(D.books).length} Bücher, ${rahlfs} Rahlfs-Fassungen griechisch, ${all} Verknüpfungen im Tanach geprüft)`);
