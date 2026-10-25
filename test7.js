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
