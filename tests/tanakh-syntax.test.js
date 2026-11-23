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

test('MACULA indexes all 39 Westminster books, including Prophets and Writings', async () => {
  const X = require('../tanakh-syntax');
  const tanakh = manifest.items.filter(X.supports);
  assert.equal(tanakh.length, 39);
  for (const entry of tanakh) assert(Object.keys(X.load(entry.title).roles).length > 0, entry.title);
  const result = await searchFiles({ dir: bundled, entries: tanakh.filter(e => ['Isaiah', 'Psalms'].includes(e.title)),
    params: { syntax: { verb: 'אמר', subject: 'יהוה' } } });
  assert(result.results.some(r => key(r) === 'Isaiah 1:11'));
  assert(result.results.some(r => key(r) === 'Psalms 2:7'));
});

test('lemma filters combine within one clause and resolved subjects are opt-in', async () => {
  const objects = await search({ verb: 'ברא', subject: 'אלהים', object: 'שמים' });
  assert(objects.results.some(r => key(r) === 'Genesis 1:1' && r.syntax[0].objects.length));
  const otherClause = await search({ verb: 'בדל', subject: 'אלהים', object: 'אור' });
  assert(!otherClause.results.some(r => key(r) === 'Genesis 1:4'));
  const query = { verb: 'קרא', subject: 'אלהים' };
  const verse = async syntax => (await search(syntax)).results.find(r => key(r) === 'Genesis 1:5');
  assert.equal((await verse(query)).syntax.length, 1);
  const expanded = await verse({ ...query, referents: true });
  assert.equal(expanded.syntax.length, 2);
  assert.match(expanded.syntax[1].referents[0].text, /אֱלֹהִ/u);
  const roles = require('../tanakh-syntax').wordRoles('Genesis', '1:5', 5);
  assert.deepEqual(roles.roles[0].referents[0].indices, [1]);
});
