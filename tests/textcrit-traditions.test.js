'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('editorial tags resolve to exactly one reading per source, independent of the note wording', () => {
  const window = {};
  const box = vm.createContext({ window });
  const loaded = new Set();
  function load(file) {
    if (loaded.has(file)) return;
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), box);
    loaded.add(file);
  }
  load('textcrit-traditions-data.js');
  load('library-textcrit-traditions.js');
  for (const [key, tag] of window.TEXTCRIT_TRADITIONS) {
    const [witness, edition, ref] = key;
    let readings;
    if (witness === 'Syr') {
      load('peshitta-readings/' + edition.replaceAll(' ', '_') + '.js');
      readings = window.PESHITTA_READINGS[edition][ref];
    } else if (witness === 'LXX') {
      load('lxx-readings/' + edition + '.js');
      readings = window.LXX_READINGS[edition].verses[ref].r;
    } else {
      load('hexapla-vorlage.js');
      readings = [window.HEXAPLA_VORLAGE[edition]].filter(Boolean);
    }
    const matching = readings.filter(reading =>
      window.TextCritTraditions.tags(witness, edition, witness === 'Hex' ? edition : ref, { ...reading, note: '' }).includes(tag));
    assert.equal(matching.length, 1, JSON.stringify(key));
    assert(window.TextCritTraditions.categories[tag.category] && tag.author && tag.source);
  }
});

test('new aggadic and halakhic parallels retain precise source references', () => {
  const window = {};
  const context = vm.createContext({ window });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../textcrit-traditions-data.js'), 'utf8'), context);
  const additions = window.TEXTCRIT_TRADITIONS.filter(([, tag]) =>
    ['aggada', 'halacha'].includes(tag.category) && tag.check === 'source-checked');
  assert.equal(additions.length, 7);
  for (const [, tag] of additions) {
    assert.match(tag.url, /^https:\/\/www\.sefaria\.org\//);
    assert(tag.de && tag.en && tag.source);
  }
});
