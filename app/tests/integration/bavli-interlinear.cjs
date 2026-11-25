// Bavli-Wortzuordnung: Quellwortlaut, Blattgrenzen und Sichtbarkeit ungeprüfter Vorschläge.
'use strict';
const assert = require('assert'), fs = require('fs'), crypto = require('crypto');
const data = require('../../bavli-il-data'), view = require('../../bavli-il-view');
const source = require('../../tools/bavli/interlinear/source.json');
const he = require('../../tools/bavli/berakhot/source.json');
const sha = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
assert.strictEqual(data.sourceSha256, sha('./tools/bavli/interlinear/source.json'));
assert.strictEqual(data.hebrewSourceSha256, sha('./tools/bavli/berakhot/source.json'));
assert.strictEqual(Object.keys(data.pages).length, 18);
let count = 0;
for (const [page, value] of Object.entries(data.pages)) {
  const index = view.indexPage(value), anchors = new Set(value.he.flat().map(([a]) => a));
  assert.strictEqual(value.he.length, he.pages[page].length);
  value.he.forEach((row, i) => {
    assert.strictEqual(row.map(([, w]) => w).join(' '), he.pages[page][i].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), page + ': hebräischer Wortlaut');
    row.forEach(([anchor], wi) => assert.strictEqual(anchor, `${page}:${i + 1}/${wi + 1}`));
  });
  for (const version of ['goldschmidt', 'pinner']) {
    const groups = value[version];
    assert.strictEqual(groups.filter(g => g.de).map(g => g.de).join(' '), source.pages[page][version].join(' '), page + ': deutscher Wortlaut');
    groups.forEach(g => {
      assert(['reviewed', 'machine', 'uncertain'].includes(g.status));
      assert(g.he.every(a => anchors.has(a)), page + ': Anker außerhalb der Blattseite');
      assert.strictEqual(view.visible(g, false), g.status === 'reviewed', 'Kein ungeprüfter Vorschlag im Standard-Interlinear');
      assert.strictEqual(view.visible(g, true), true);
      count++;
    });
  }
  for (const group of index.groups) for (const anchor of group.he) assert(index.byWord.get(anchor).some(g => g.key === group.key));
}
// Die ursprünglichen deutschen Segmentgrenzen dürfen die Wortzuordnung nicht verschieben.
for (const version of ['goldschmidt', 'pinner']) {
  const groups = data.pages['5b'][version];
  assert(groups.some(g => g.status === 'reviewed' && g.he.some(a => a.startsWith('5b:18/'))), 'Huna-Erzählung im Kontext zugeordnet');
  const first = data.pages['2a'][version].find(g => g.he.includes('2a:1/1'));
  assert(first && /wann|welcher/i.test(first.de), 'מאימתי muss auf die Zeitfrage zeigen');
}
assert(view.statusLabel({ status: 'uncertain', he: [] }).includes('offen'), 'Offen ist kein gesicherter Übersetzerzusatz');
assert(view.statusLabel({ status: 'machine', he: [] }).includes('nicht im Kontext geprüft'));
console.log(`Bavli-Wortzuordnung:18 Blattseiten, beide unveränderten Übersetzungen, ${count} Gruppen und getrennte Prüfstände.`);
