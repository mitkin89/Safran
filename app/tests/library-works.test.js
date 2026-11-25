'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const W = require('../library-works'), Order = require('../order');
const entries = require('../bundled/manifest.json').items.filter(e => W.canonicalTitle(e.title).startsWith('Makkabäer '));
test('bundled Maccabees editions become four ordered works without altering files or metadata', () => {
  const before = JSON.stringify(entries), groups = W.groupEntries(entries);
  assert.equal(entries.length, 8);
  assert.deepEqual(Order.sortTitles(groups).map(g => g.title), ['Makkabäer I','Makkabäer II','Makkabäer III','Makkabäer IV']);
  assert.deepEqual(groups.map(g => g.versions.length), [2,2,2,2]);
  assert.equal(JSON.stringify(entries), before);
  for (const e of entries) {
    const g = groups.find(g => g.key === W.keyOf(e));
    assert(g.versions.includes(e)); assert(g.aliases.includes(W.rawKey(e)));
    assert(W.titlesFor(g.title).includes(e.title));
  }
});
test('Kahana and ordinary merged editions remain distinct; unrelated titles are untouched', () => {
  const base = {categories:['Second Temple','Apocrypha'],kind:'he',versionTitle:'merged'};
  const a = {...base,title:'The Book of Maccabees I',rel:'a'}, b = {...base,title:'The Book of Maccabees I (Kahana Translation)',rel:'b'};
  const edition = {...a,rel:'c',versionTitle:'Named edition'};
  const groups = W.groupEntries([a,b,edition,{...a,title:'Rashi on Maccabees I',rel:'d'}]);
  assert.equal(groups.length,2); assert.equal(groups[0].versions.length,3);
  assert(!W.visibleVersion(a,groups[0].versions)); assert(W.visibleVersion(b,groups[0].versions));
  assert.equal(W.versionLabel(b),'Standardtext · Kahana');
  assert.notEqual(W.keyOf(a), W.keyOf({...a,title:'The Book of Maccabees II'}));
  assert.equal(W.canonicalTitle('Rashi on Maccabees I'),'Rashi on Maccabees I');
});
test('split Kautzsch verse fragments are not asserted to align with the Greek verses', () => {
  const R = require('../reader'), fs = require('node:fs'), path = require('node:path');
  for (const g of W.groupEntries(entries)) {
    const docs = g.versions.map(e => ({...JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',e.rel))),entry:e}));
    const cols = docs.map(d => R.flattenNode(d.text[0]));
    if (['Makkabäer I','Makkabäer II'].includes(g.title)) {
      assert(W.independentNumbering(g,docs,cols));
      const rows = W.independentRows(cols);
      assert.equal(rows.length, cols.reduce((n,c)=>n+c.length,0));
      assert(rows.every(r => r.cells.filter(c=>c!==null).length===1));
    }
  }
  assert(!W.independentNumbering({title:'Genesis'},[{},{ }],[[{label:'1'}],[{label:'2'}]]));
});
