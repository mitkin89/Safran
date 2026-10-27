const assert = require('assert');
const fs = require('fs'), os = require('os'), path = require('path');
const K = require('./links');
(async () => {
  assert.deepStrictEqual(K.parseTail('1:5'), { chap: '1', v1: 5, v2: 5 });
  assert.deepStrictEqual(K.parseTail('1:3-5'), { chap: '1', v1: 3, v2: 5 });
  assert.deepStrictEqual(K.parseTail('1:1-6:1'), { chap: '1', v1: 1, v2: Infinity });
  assert.deepStrictEqual(K.parseTail('2a:3'), { chap: '2a', v1: 3, v2: 3 });
  assert.deepStrictEqual(K.parseTail('4'), { chap: '4', v1: 0, v2: 0 });
  assert.strictEqual(K.parseTail('Introduction'), null);
  assert.deepStrictEqual(K.splitRef('Shir HaShirim Rabbah 6:11:1'), { book: 'Shir HaShirim Rabbah', tail: '6:11:1' });
  assert.deepStrictEqual(K.splitRef('Exodus 1:1-6:1'), { book: 'Exodus', tail: '1:1-6:1' });
  const csv = 'Citation 1,Citation 2,Conection Type,Text 1,Text 2,Category 1,Category 2\n' +
    '"Rashi on Genesis 1:1:1",Genesis 1:1,commentary,Rashi on Genesis,Genesis,Commentary,Tanakh\n' +
    'Genesis 1:2-3,"Bereshit Rabbah 1:2",,Genesis,Bereshit Rabbah,Tanakh,Midrash\n';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-'));
  const st = new K.LinkStore(dir, async url => Buffer.from(url.endsWith('/links0.csv') ? csv : csv.split('\n')[0] + '\n'), { xref: false });
  const r = await st.build();
  assert.strictEqual(r.complete, true);
  const g1 = await st.forSection('Genesis', 1);
  assert.deepStrictEqual(g1.map(x => [x.v1, x.v2, x.other, x.cat]).sort(), [[1, 1, 'Rashi on Genesis 1:1:1', 'Commentary'], [2, 3, 'Bereshit Rabbah 1:2', 'Midrash']].sort());
  assert.strictEqual((await st.forSection('Rashi on Genesis', 1))[0].other, 'Genesis 1:1');
  assert.strictEqual((await st.forSection('Genesis', 9)).length, 0);
  const d = { sectionNames: ['Chapter', 'Verse'], text: [['a', 'b', 'c'], ['d']] };
  assert.deepStrictEqual(K.resolveText(d, '1:2'), ['b']);
  assert.deepStrictEqual(K.resolveText(d, '1:2-3'), ['b', 'c']);
  assert.deepStrictEqual(K.resolveText(d, '2'), ['d']);
  const t = { sectionNames: ['Daf', 'Line'], text: [[], [], ['x', 'y'], ['z']] };
  assert.deepStrictEqual(K.resolveText(t, '2a:2'), ['y']);
  assert.strictEqual(K.resolveText(d, '9:1'), null);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('Link-Tests bestanden.');
})().catch(e => { console.error(e); process.exit(1); });
