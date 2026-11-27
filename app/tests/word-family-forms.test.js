'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Forms = require('../forms');
const { roots } = require('../passage-stats-data');

test('the forms and book counts for מלא preserve the seven individual lexicon entries', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../oshb-forms.js'), 'utf8'), context);
  const D = context.window.OSHB_FORMS;
  const ids = Object.keys(roots).filter(id => roots[id].id === roots['4390'].id && roots[id].lang === roots['4390'].lang);
  const family = Forms.familyModel(D, ids);
  assert.equal(family.members.length, 7);
  assert.equal(family.total, 373);
  const dist = Forms.dist(D, family);
  assert.equal(dist.filter(book => book.n).length, 35);
  assert.equal(dist.reduce((n, book) => n + book.n, 0), 373);
  const genesis = Forms.refsIn(D, family, 'Genesis');
  assert.deepEqual(genesis.find(ref => ref.ch === 1 && ref.v === 22).lemmas, [['4390', 1]]);
  for (const section of family.sections) {
    for (const block of section.blocks) for (const table of block.tables) for (const row of table.rows) {
      for (const chip of row.cells.flat()) {
        assert(chip.i.split(',').every(i => family.forms[i].lemma === section.lemma));
      }
    }
  }
});


test('חסד families retain suffixed Strong IDs and keep homonymous roots separate', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../oshb-forms.js'), 'utf8'), context);
  const D = context.window.OSHB_FORMS;
  const familyFor = id => {
    const selected = Forms.rootInfo(roots, id);
    const ids = Forms.rootEntries(D, roots).filter(([, r]) => r.id === selected.id && r.lang === selected.lang).map(([key]) => key);
    return Forms.familyModel(D, ids);
  };
  const kindness = familyFor('2617 a'), reproach = familyFor('2617 b');
  assert.deepEqual(kindness.members.map(m => m.lemma).sort(), ['2616 a', '2617 a', '2623', '2624']);
  assert.equal(kindness.total, 285);
  assert.deepEqual(reproach.members.map(m => m.lemma).sort(), ['2616 b', '2617 b']);
  assert.equal(reproach.total, 3);
  assert.equal(Forms.dist(D, kindness).reduce((sum, book) => sum + book.n, 0), 285);
  assert.equal(Forms.rootInfo(roots, '2617 a'), Forms.rootInfo(roots, '2617a'));
});
