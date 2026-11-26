'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
const C = require('../concordance'), {searchFiles} = require('../searchcore');
async function fixture(t, text) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'safran-surface-cache-'));
  t.after(() => fs.rm(dir, {recursive:true, force:true}));
  const file = path.join(dir, 'source.json'), cacheDir = path.join(dir, 'cache');
  const entry = {rel:'source.json', title:'Genesis', versionTitle:'Source', kind:'he', language:'Hebrew'};
  const write = text => fs.writeFile(file, JSON.stringify({title:'Genesis', sectionNames:['Chapter','Verse'], text:[text]}));
  await write(text);
  const find = (query, extra = {}) => searchFiles({dir, entries:[entry], cacheDir, params:{concordance:true, query, ...extra}});
  const files = () => fs.readdir(path.join(cacheDir, 'concordance-surface-v1')).catch(() => []);
  return {dir, file, cacheDir, entry, find, write, files};
}
test('cached and uncached surface searches preserve forms, positions, exclusions and complete counts', async t => {
  const f = await fixture(t, ['מַלְאָךְ מלאך מלאכים', 'Ἄγγελος ἄγγελος λόγος',
    'caf\u0065\u0301 café &amp; &#1502;&#1500;&#1488;&#1498; <small>לאך</small>',
    'טקסט <sup class="footnote-marker">1</sup><i class="footnote">לאך</i>']);
  for (const query of ['מלאך','לאך','ἄγγελος','λογος','café','מלאכים']) {
    const expected = await C.search({dir:f.dir, entries:[f.entry], params:{query,limit:1,perFile:1}});
    assert.deepEqual(await f.find(query,{limit:1,perFile:1}), expected);
    assert.deepEqual(await f.find(query,{limit:1,perFile:1}), expected);
  }
  assert.equal((await f.files()).length, 1, 'production search passes its cache directory through');
  assert.equal((await f.find('לאך')).results.length, 0, 'excluded headings and footnotes do not become matches');
});
test('negative vocabulary filters invalidate after source edits and do not hide new matches', async t => {
  const f = await fixture(t, ['ישן']);
  assert.equal((await f.find('חדש')).results.length, 0);
  const stat = await fs.stat(f.file);
  await f.write(['חדש']); // Same byte length, even if mtime is restored.
  await fs.utimes(f.file, stat.atime, stat.mtime);
  assert.equal((await f.find('חדש')).results.length, 1);
  assert.equal((await f.find('ישן')).results.length, 0);
});
test('preview and cancellation never publish an incomplete vocabulary', async t => {
  const f = await fixture(t, ['ראשון','אחרון']);
  await f.find('ראשון', {concordancePreview:true,limit:1});
  assert.equal((await f.files()).length, 0);
  let checks = 0;
  await C.search({dir:f.dir, entries:[f.entry], cacheDir:f.cacheDir, params:{query:'ראשון'}, isCancelled:() => ++checks > 2});
  assert.equal((await f.files()).length, 0);
  assert.equal((await f.find('אחרון')).results.length, 1);
});
test('damaged and unwritable caches fall back to the source', async t => {
  const f = await fixture(t, ['מלאך']);
  await f.find('אין');
  const [name] = await f.files();
  await fs.writeFile(path.join(f.cacheDir,'concordance-surface-v1',name), '{broken');
  assert.equal((await f.find('מלאך')).results.length, 1);
  const blocked = path.join(f.dir, 'blocked'); await fs.writeFile(blocked, 'not a directory');
  assert.equal((await searchFiles({dir:f.dir, entries:[f.entry], cacheDir:blocked, params:{concordance:true,query:'מלאך'}})).results.length, 1);
});
