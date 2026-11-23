'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { getOutline, searchOutlines } = require('../outline-store');

const bundled = path.join(__dirname, '..', 'outlines');

test('the bundled mitzvot are searchable across books, with exact lookup by number', async () => {
  const search = (query, kind, offset = 0) => searchOutlines([bundled], { query, kind, offset });
  const first = await search('', 'mitzvot');
  assert.equal(first.total, 613);
  assert.equal(first.next, 60);
  assert.equal(first.previous, null);
  assert.equal(first.results[0].number, 1);
  const second = await search('', 'mitzvot', first.next);
  assert.equal(second.previous, 0);
  assert.notEqual(second.results[0].number, first.results.at(-1).number);
  const sabbath = await search('Sabbat', 'mitzvot');
  assert(sabbath.results.some(hit => hit.book === 'Exodus'));
  assert(sabbath.results.some(hit => hit.book === 'Leviticus'));
  const numbered = await search('#421', 'all');
  assert.deepEqual(numbered.results.map(hit => [hit.number, hit.target]), [[421, 'Deuteronomy 6:8']]);
});

test('search includes headings, translated descriptions and subentries while respecting local overrides', async t => {
  const user = await fs.mkdtemp(path.join(os.tmpdir(), 'safran-outlines-'));
  t.after(() => fs.rm(user, { recursive: true, force: true }));
  const outline = { book: 'Genesis', sections: [{ head_de: 'Eigenes Kapitel', items: [
    { ref: '2:4–3:1', text: 'בריאה', text_de: 'Schöpfung', desc_en: 'History of creation',
      sub: [{ ref: '2:7', text: 'אָדָם', text_de: 'Erschaffung des Menschen' }] },
  ] }] };
  await fs.writeFile(path.join(user, 'Genesis.json'), JSON.stringify(outline));
  const dirs = [user, bundled];
  assert.deepEqual(await getOutline(dirs, 'Genesis'), outline);
  assert.equal((await getOutline(dirs, 'Qumran, further non-biblical scrolls, Cave 4')).book,
    'Qumran, further non-biblical scrolls, Cave 4');
  const search = async query => (await searchOutlines(dirs, { query, kind: 'outlines', lang: 'de' })).results
    .filter(hit => hit.book === 'Genesis');
  assert.equal((await search('eigenes kapitel'))[0].target, 'Genesis 2:4');
  assert.equal((await search('history creation'))[0].target, 'Genesis 2:4');
  assert.equal((await search('אדם'))[0].text, 'אָדָם');
  assert.deepEqual(await search('Weltschöpfung'), []);
});
