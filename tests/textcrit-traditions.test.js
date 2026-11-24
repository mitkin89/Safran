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
    } else if (witness === 'HexSource') {
      load('hexapla-data/' + edition.replaceAll(' ', '_') + '.js');
      const data = window.HEXAPLA_DATA[edition];
      const unit = data.verses[ref][key[3]];
      assert.equal(unit.t, key[4], 'exact Field text must remain attached');
      assert(unit.fn.includes(tag.noteId), 'tag must identify its Field footnote');
      assert(window.TextCritTraditions.sourceTags(edition, ref, key[3], unit).includes(tag));
      assert.equal(window.TextCritTraditions.sourceTags(edition, ref, key[3], { ...unit, t: unit.t + ' changed' }).length, 0);
      continue;
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
  assert.equal(additions.length, 20);
  // Retain all seven previously checked parallels as well as the new comparisons.
  assert.equal(additions.filter(([, t]) => !t.evidence).length, 7);
  for (const [, tag] of additions) {
    assert.match(tag.url, /^https:\/\/(www\.sefaria\.org|ccel\.org)\//);
    assert(tag.de && tag.en && tag.source);
  }
});

test('reviewed additions have primary evidence and explicit limits to the comparison', () => {
  const reviewed = require('../tools/textcrit/traditions/reviewed.json');
  assert.equal(reviewed.decisions.length, 26);
  for (const { key, tag } of reviewed.decisions) {
    assert.equal(tag.author, 'Codex');
    assert.equal(tag.relation, 'parallel');
    assert.equal(tag.check, 'source-checked');
    for (const id of tag.evidence) {
      const source = reviewed.sources[id];
      assert(source?.ref && source.url && source.excerpt && source.version, id);
      assert.match(source.responseSha256 || source.localSha256, /^[a-f0-9]{64}$/);
    }
    if (key[0] === 'HexSource') assert(tag.noteId && tag.de.startsWith('Field, Fußnote'));
  }
  const philo = reviewed.decisions.find(d => d.key[0] === 'LXX' && d.key[2] === '21:22');
  assert.match(philo.tag.de, /keine Kennzeichnung als rabbinischer Konsens/);
  const mirrors = reviewed.decisions.find(d => d.key[2] === '38:8');
  assert.equal(mirrors.tag.category, 'targum');
  assert.match(mirrors.tag.de, /Onkelos behält die Spiegel/);
});

test('Field footnote comparisons render with their scope and enter the tradition search', async () => {
  const window = {}, context = vm.createContext({ window });
  const load = file => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  for (const file of ['textcrit-traditions-data.js', 'library-textcrit-traditions.js',
    'library-textcrit-hexapla.js', 'library-textcrit-search.js']) load(file);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
  const host = { esc, load: async (file, get) => { if (!get()) load(file); return get(); } };
  const hx = window.LibraryHexaplaTC.create(host);
  const data = await hx.load('Exodus');
  const entries = hx.entries(data, [{ ref: 'Exodus 35:22', row: '22' }]);
  assert.equal(entries.filter(e => /tc-hx-traditions/.test(e.html)).length, 1);
  assert.match(entries.map(e => e.html).join(''), /nicht der LXX-Zeile/);
  window.PeshittaAlignment = { READINGS: ['Exodus', 'Numbers', 'Deuteronomy'] };
  host.$ = () => ({ addEventListener() {} });
  const search = window.LibraryTextCritSearch.create(host);
  const results = await search.load();
  const field = results.filter(r => r.type === 'quellenhinweis');
  assert.equal(field.length, 4);
  assert(field.every(r => r.w === 'Hex' && !r.both));
  assert.equal(field.filter(r => r.book === 'Exodus' && r.ch === 35 && r.v === 22).length, 1);
  const legal = results.find(r => r.w === 'Syr' && r.book === 'Numbers' && r.ch === 4 && r.v === 20);
  assert.deepEqual(Array.from(legal.tags, t => t.category).sort(), ['halacha', 'targum']);
});
