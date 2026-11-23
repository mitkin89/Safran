'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { searchFiles } = require('../searchcore');

const bundled = path.join(__dirname, '..', 'bundled');
const manifest = require('../bundled/manifest.json');
const books = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'];
const entries = manifest.items.filter(e => books.includes(e.title) && e.versionTitle.startsWith('Westminster'));
const search = (syntax, gram) => searchFiles({ dir: bundled, entries, params: { syntax, gram } });
const key = hit => hit.title + ' ' + hit.path.map(i => i + 1).join(':');

test('verb and explicit subject match in one clause in the real Westminster files', async () => {
  const result = await search({ verb: 'בָּרָא', subject: 'אֱלֹהִים' }, { stem: 'q' });
  assert.deepEqual(result.results.map(key), [
    'Genesis 1:1', 'Genesis 1:21', 'Genesis 1:27', 'Genesis 2:3', 'Genesis 5:1', 'Deuteronomy 4:32',
  ]);
  const first = result.results[0];
  assert.deepEqual(first.loc, { path: [0], label: '1' });
  assert.deepEqual(first.parts.filter(part => part.m).map(part => part.t), ['ברא', 'אלהים']);
  assert.equal(first.syntax[0].subjects[0].text, 'אֱלֹהִ֑ים');
  const mismatch = await search({ verb: 'ברא', subject: 'אלהים' }, { stem: 'N' });
  assert.equal(mismatch.results.length, 0);
});

test('can search all five books and accepts alternative explicit subjects', async () => {
  const result = await search({ verb: 'אמר', subject: 'אלהים, יהוה' });
  assert.deepEqual(result.stats.map(r => r.title), books);
  const named = await search({ verb: 'ברא', subject: 'יהוה' });
  assert.deepEqual(named.results.map(key), ['Numbers 16:30']);
  const noMatch = await search({ verb: 'ירד', subject: 'פרעה' });
  // Exodus 2:5 names Pharaoh as part of "daughter of Pharaoh". The daughter descends.
  assert(!noMatch.results.some(r => key(r) === 'Exodus 2:5'));
  const daughter = await search({ verb: 'ירד', subject: 'בת' });
  assert(daughter.results.some(r => key(r) === 'Exodus 2:5'));
});

test('syntax data refuses a modified verse and a non-Hebrew query', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'safran-syntax-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const entry = entries.find(e => e.title === 'Genesis');
  const original = JSON.parse(await fs.readFile(path.join(bundled, entry.rel), 'utf8'));
  original.text[0][0] = original.text[0][0].replace('בָּרָ֣א', 'אָמַר');
  const local = { ...entry, rel: 'genesis.json' };
  await fs.writeFile(path.join(dir, local.rel), JSON.stringify(original));
  const result = await searchFiles({ dir, entries: [local], params: { syntax: { verb: 'ברא', subject: 'אלהים' } } });
  assert(!result.results.some(r => key(r) === 'Genesis 1:1'));
  assert(result.results.some(r => key(r) === 'Genesis 1:21'));
  assert.equal((await search({ verb: 'create', subject: 'אלהים' })).results.length, 0);
});
