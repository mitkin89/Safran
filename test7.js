const assert = require('assert');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib');
const D = require('./dsl');
// Beispielwörterbuch (UTF-16LE mit Kennung, wie Lingvo es schreibt)
const dsl = `#NAME "Testlexikon"
#INDEX_LANGUAGE "Hebrew"
#CONTENTS_LANGUAGE "German"

אָב
אַבָּא
	[m1][b]אָב[/b] [i]m.[/i] [c green]Vater[/c], [ref]אם[/ref] und <<אח>> [s]bild.jpg[/s]
	[m2][trn]Urheber[/trn] \\[Klammer\\] [ex]אב הרחמים[/ex][/m]
{{Kommentar}}
אֵם {(Mutter)}
	[m1]Mutter, [b]fett [i]kursiv[/i][/b]
בַּיִת
	[m1]Haus, & <Tag>
`;
const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(dsl.replace(/\n/g, '\r\n'), 'utf16le')]);
const p = D.parseDsl(buf, 'x.dsl');
assert.strictEqual(p.name, 'Testlexikon');
assert.strictEqual(p.entries.length, 3);
assert.deepStrictEqual(p.entries[0].heads, ['אָב', 'אַבָּא']);
assert.deepStrictEqual(p.entries[1].heads, ['אֵם']);
assert.ok(p.entries[0].html.includes('<b>אָב</b>') && p.entries[0].html.includes('dc-green') && p.entries[0].html.includes('data-q="אח"'));
assert.ok(!p.entries[0].html.includes('bild.jpg'), 'Bilder weglassen');
assert.ok(p.entries[0].html.includes('[Klammer]'));
assert.ok(p.entries[2].html.includes('&amp;') && p.entries[2].html.includes('&lt;Tag&gt;'));
assert.ok(p.entries[1].html.includes('<b>fett <i>kursiv</i></b>'));
// Normalisierung
assert.strictEqual(D.norm('אָב'), D.norm('אב'));
assert.strictEqual(D.norm('מֶלֶךְ'), D.norm('מלכ'));
// gepackt (.dsl.dz) und UTF-8 funktionieren auch
assert.strictEqual(D.parseDsl(zlib.gzipSync(buf), 'x.dsl.dz').entries.length, 3);
assert.strictEqual(D.parseDsl(Buffer.from(dsl, 'utf8'), 'y.dsl').entries.length, 3);
assert.throws(() => D.parseDsl(Buffer.from('nur ein Satz', 'utf8'), 'z.dsl'));
(async () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'dsl-'));
  const ds = new D.Dictionaries(t);
  const r = await ds.add(buf, 'x.dsl');
  assert.strictEqual(r.count, 3);
  assert.strictEqual((await ds.list()).length, 1);
  assert.strictEqual((await ds.lookup('אב'))[0].head, 'אָב · אַבָּא');   // ohne Vokalzeichen
  assert.strictEqual((await ds.lookup('אבא'))[0].kind, 'exact');           // zweites Stichwort
  assert.strictEqual((await ds.lookup('ובית'))[0].head, 'בַּיִת');          // Vorsilbe ו
  assert.ok((await ds.lookup('ובית'))[0].note.includes('Vorsilbe'));
  assert.strictEqual((await ds.lookup('א')).length, 2);                    // Wortanfang: אב/אבא-Eintrag und אם
  assert.strictEqual((await ds.lookup('xyz')).length, 0);
  await ds.remove(r.id);
  assert.strictEqual((await ds.list()).length, 0);
  console.log('DSL-Tests bestanden.');
})().catch(e => { console.error(e); process.exit(1); });

// Quellenangaben: {{ref:Ort}}Text{{/ref}} wird in Safran zum Link, in anderen Programmen bleibt nur der Text
{
  const h = D.bodyToHtml(['\t[m1]siehe {{ref:Rosh Hashanah 18b}}Ib. 18b{{/ref}} und <<wort>>.[/m]']);
  assert(/<a class="dsrc" data-sref="Rosh Hashanah 18b">Ib\. 18b<\/a>/.test(h), h);
  assert(/data-q="wort"/.test(h));
  console.log('DSL-Quellenlinks ok');
}

// Reihenfolge der Wörterbücher
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsl-ord-'));
  const ds = new D.Dictionaries(dir);
  const mk = n => Buffer.from(`#NAME "${n}"\n#INDEX_LANGUAGE "Hebrew"\n\nשלום\n\t[m1]${n} Eintrag[/m]\n`, 'utf8');
  const a = await ds.add(mk('Anton'), 'a.dsl'), b = await ds.add(mk('Berta'), 'b.dsl');
  let l = (await ds.list()).map(x => x.name);
  assert.deepStrictEqual(l, ['Anton', 'Berta']);
  await ds.setOrder([b.id, a.id]);
  l = (await ds.list()).map(x => x.name);
  assert.deepStrictEqual(l, ['Berta', 'Anton']);
  assert.strictEqual((await ds.lookup('שלום'))[0].dict, 'Berta');
  console.log('DSL-Reihenfolge ok');
})().catch(e => { console.error(e); process.exit(1); });

// Mitgelieferte Wörterbücher: Export → Einspielen → Entfernen bleibt entfernt → Änderung wird übernommen
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dsl-bun-'));
  const src = new D.Dictionaries(path.join(tmp, 'a'));
  const mk = (n, w) => Buffer.from(`#NAME "${n}"\n#INDEX_LANGUAGE "Hebrew"\n\n${w}\n\t[m1]${n} Eintrag[/m]\n`, 'utf8');
  const a = await src.add(mk('Mit', 'שלום'), 'a.dsl'), b = await src.add(mk('Ohne', 'שלום'), 'b.dsl');
  await src.setShip(a.id, true);
  const out = path.join(tmp, 'bundled');
  assert.strictEqual(await src.exportBundled(out), 1);
  const dst = new D.Dictionaries(path.join(tmp, 'b'));
  assert.strictEqual(await dst.importBundled(out), 1);
  let l = await dst.list();
  assert.deepStrictEqual(l.map(x => x.name), ['Mit']); assert(l[0].bundled && l[0].ship);
  assert.strictEqual(await dst.importBundled(out), 0, 'unverändert: nichts zu tun');
  await dst.remove(a.id);
  assert.strictEqual(await dst.importBundled(out), 0, 'entfernt bleibt entfernt');
  assert.strictEqual((await dst.list()).length, 0);
  // neue Fassung (anderer Inhalt, gleiche Kennung) wird bei einem anderen Nutzer übernommen
  const dst2 = new D.Dictionaries(path.join(tmp, 'c'));
  await dst2.importBundled(out);
  fs.writeFileSync(path.join(tmp, 'a', a.id + '.json'), JSON.stringify({ name: 'Mit', indexLang: 'Hebrew', contentsLang: '', heads: [['שלום']], html: ['<p>neu</p>'] }));
  src.cache.clear();
  assert.strictEqual(await src.exportBundled(out), 1);
  assert.strictEqual(await dst2.importBundled(out), 1);
  assert.strictEqual((await dst2.lookup('שלום'))[0].html, '<p>neu</p>');
  console.log('DSL-Mitliefern ok');
})().catch(e => { console.error(e); process.exit(1); });
