// Themen: Aufteilung wie bei Sefaria (Notable Sources = Stellen mit eigener Beschreibung; Erwähnungen und Blätter entfallen)
const assert = require('assert');
const T = require('./topics');
const d = {
  slug: 'abraham', primaryTitle: { en: 'Abraham', he: 'אברהם' }, subclass: 'person', description: { en: 'x' },
  refs: { about: { refs: [
    { ref: 'Genesis 17:1-2', expandedRefs: ['Genesis 17:1', 'Genesis 17:2'], is_sheet: false, order: { curatedPrimacy: { en: 5 }, availableLangs: ['en'], pr: 1, tfidf: 2, comp_date: -1400, order_id: 'a' }, descriptions: { en: { title: 'Bund', prompt: 'Text' } } },
    { ref: 'Genesis 12:1', expandedRefs: ['Genesis 12:1'], is_sheet: false, order: {}, descriptions: {} },
    { ref: 'Sheet 5', is_sheet: true },
    { ref: 'Berakhot 2a', expandedRefs: ['Berakhot 2a'], is_sheet: false },
  ] }, mention: { refs: [{ ref: 'Genesis 99:1', is_sheet: false }] } },
  links: { 'is-a': { links: [{ topic: 'biblical-figures', order: { linksInCommon: 3 } }] } },
};
const t = T.trimTopic(d);
assert.deepStrictEqual(t.n, [1, 2]);
assert.strictEqual(t.notable[0].r, 'Genesis 17:1-2');
assert.ok(t.sources.every(x => !/Sheet|99/.test(x.r)));
assert.deepStrictEqual(T.parseVerse('Genesis 17:2'), ['Genesis', '17', 2]);
assert.deepStrictEqual(T.parseVerse('Berakhot 2a:3'), ['Berakhot', '2a', 3]);
assert.strictEqual(T.parseVerse('Genesis 17'), null);
const a = { o: { cp: [0, 0], al: ['en'], pr: 1, s: 1, d: 5, id: 'b' } }, b = { o: { cp: [9, 0], al: ['en'], pr: 0, s: 0, d: 9, id: 'a' } };
assert.ok(T.refSort('rel', 'en', b, a) < 0, 'Kuratierte Stellen zuerst');
assert.ok(T.refSort('chrono', 'en', a, b) < 0, 'chronologisch nach Entstehungszeit');
console.log('Themen-Tests ok');
