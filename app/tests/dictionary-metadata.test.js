'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises'), os = require('os'), path = require('path');
const {Dictionaries} = require('../dsl');
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'safran-dict-meta-'));
  t.after(() => fs.rm(dir, {recursive: true, force: true}));
  const ds = new Dictionaries(dir);
  const mk = name => Buffer.from(`#NAME "${name}"\n#INDEX_LANGUAGE "Hebrew"\n\nשלום\n\t[m1]${name} Artikel[/m]\n`);
  const a = await ds.add(mk('Anton'), 'a.dsl'), b = await ds.add(mk('Berta'), 'b.dsl');
  return {dir, ds, a, b};
}
test('Inventur lädt keine Suchindizes; eingeschränktes Nachschlagen lädt nur das gewählte Lexikon', async t => {
  const {ds, a, b} = await fixture(t);
  const [one, two] = await Promise.all([ds.list(), ds.list()]);
  assert.deepEqual(one, two);
  assert.deepEqual(one.map(d => [d.name, d.count, d.lang]), [['Anton', 1, 'Hebrew'], ['Berta', 1, 'Hebrew']]);
  assert.equal(ds.cache.size, 0);
  const hits = await ds.lookup('שלום', {only: a.id});
  assert.equal(hits.length, 1); assert.equal(hits[0].dict, 'Anton');
  assert(ds.cache.has(a.id)); assert(!ds.cache.has(b.id));
});
test('Neustart liest für die Liste nur den kleinen Katalog und Dateistände', async t => {
  const {dir, ds} = await fixture(t); const expected = await ds.list();
  const read = fs.readFile;
  t.mock.method(fs, 'readFile', async function(file, ...args) {
    assert(!String(file).endsWith('.json'), 'Artikeldatei darf für einen gültigen Katalog nicht gelesen werden');
    return read.call(this, file, ...args);
  });
  const restarted = new Dictionaries(dir);
  assert.deepEqual(await restarted.list(), expected);
  assert.equal(restarted.cache.size, 0);
});
test('Änderungen, Reihenfolge, Mitlieferstatus und Entfernen bleiben aktuell', async t => {
  const {dir, ds, a, b} = await fixture(t);
  await ds.list(); await ds.lookup('שלום', {only: a.id});
  await ds.setOrder([b.id, a.id]); await ds.setShip(b.id, true);
  const file = ds.file(a.id), doc = JSON.parse(await fs.readFile(file, 'utf8'));
  doc.name = 'Anton neu'; doc.heads.push(['בית']); doc.html.push('<p>Neuer Artikel</p>');
  await fs.writeFile(file, JSON.stringify(doc));
  const list = await ds.list();
  assert.deepEqual(list.map(d => d.name), ['Berta', 'Anton neu']);
  assert.equal(list[0].ship, true); assert.equal(list[1].count, 2);
  assert.equal(list[1].bytes, (await fs.stat(file)).size);
  assert.equal((await ds.lookup('בית', {only: a.id}))[0].html, '<p>Neuer Artikel</p>');
  await ds.remove(b.id);
  assert.deepEqual((await new Dictionaries(dir).list()).map(d => d.id), [a.id]);
});
test('Defekter Katalog wird neu aufgebaut; defektes Wörterbuch wird weiter übersprungen', async t => {
  const {dir, ds, a, b} = await fixture(t);
  await ds.list();
  await fs.writeFile(path.join(dir, '_catalog.txt'), 'kaputt');
  await fs.writeFile(ds.file(b.id), 'kaputt');
  const fresh = new Dictionaries(dir), list = await fresh.list();
  assert.deepEqual(list.map(d => d.id), [a.id]); assert.equal(fresh.cache.size, 0);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir, '_catalog.txt'), 'utf8')).version, 1);
});
