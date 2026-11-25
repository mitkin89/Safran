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
