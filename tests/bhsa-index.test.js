'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const BHSA = require('../bhsa-index');
const { alignVerse } = require('../bhsa-build');
const { format, revision } = require('../bhsa-source');
const { searchFiles } = require('../searchcore');

const bundled = path.join(__dirname, '..', 'bundled');
const entry = require('../bundled/manifest.json').items.find(e => e.title === 'Genesis' && e.versionTitle.startsWith('Westminster'));
const words = ['ויאמר', 'אלהים', 'יהי', 'אור', 'ויהי', 'אור'];
const signature = words.join(' ');
const row = [signature, [[1, '?N', false, null, [0, 1]], [2, '?NQ', true, ['Genesis', '1:2'], [2, 3]], [3, '?N', false, null, [4, 5]]]];
const books = { Genesis: { '1:3': row } };

test('BHSA alignment rejoins prefixes and retains separate positions for repeated words', () => {
  assert.deepEqual(alignVerse([1, 2, 3], ['', 'ו', 'יאמר', 'אור'], ['ויאמר', 'אור']),
    [[[0, 1]], [[0, 4]], [[1, 3]]]);
  assert.equal(alignVerse([1, 2], ['', 'אור', 'אור'], ['אור', 'יום']), null);
});

test('BHSA can filter a whole clause and combine with MACULA at the same predicate', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'safran-bhsa-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const bhsaFile = path.join(dir, 'bhsa.json');
  await fs.writeFile(bhsaFile, JSON.stringify({ version: format, revision, aligned: 1, total: 1, books }));
  const run = syntax => searchFiles({ dir: bundled, entries: [entry], params: { syntax, bhsaFile } });
  const res = await run({ verb: 'אמר', subject: 'אלהים', domain: 'N' });
  assert.deepEqual(res.results[0].path, [0, 2]);
  assert.equal((await run({ verb: 'אמר', subject: 'אלהים', domain: 'Q' })).results.length, 0);
  const speech = (await run({ domain: 'Q', relation: 'Resu' })).results[0];
  assert.deepEqual(speech.words, ['יהי', 'אור']);
  assert.deepEqual(speech.syntax[0].bhsa.parent, ['Genesis', '1:2']);
});

test('word context and merged matching reject ambiguous or changed positions', () => {
  const match = BHSA.clauseFilter(books.Genesis, { domain: 'N' });
  const current = words.map(normalized => ({ normalized }));
  assert.equal(match('1:3', current, 0, [{ ref: '1:3', signature, indices: [1] }]).domain, 'N');
  assert.equal(match('1:3', current, 0, [{ ref: '1:3', signature, indices: [2] }]), null);
  assert.equal(match('1:3', current.slice(1), 0, []), null);
  assert.deepEqual(BHSA.wordContext({ books }, 'Genesis', '1:3', 2).parent, ['Genesis', '1:2']);
});
