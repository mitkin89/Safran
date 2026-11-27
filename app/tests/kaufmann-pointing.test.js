'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('../kaufmann-pointing');

// Remove only the recorded additions, not every point: existing source marks
// must survive this round trip as well.
function undo(text, insertions) {
  const positions = []; let added = 0;
  for (const insertion of insertions) {
    positions.push({...insertion, outputOffset: insertion.offset + added});
    added += insertion.text.length;
  }
  for (const insertion of positions.reverse()) {
    assert.equal(text.slice(insertion.outputOffset, insertion.outputOffset + insertion.text.length), insertion.text);
    text = text.slice(0, insertion.outputOffset) + text.slice(insertion.outputOffset + insertion.text.length);
  }
  return text;
}

test('stripPointing removes only the specified characters, without normalization', () => {
  const retained = '😀אב־ג׀ד׃ה׆ו֑זׄחׅט׳י״כ\u0301שׁ';
  const allowed = Array.from({length: 14}, (_, i) => String.fromCharCode(0x5b0 + i)).join('') + '\u05bf\u05c1\u05c2\u05c7';
  assert.equal(P.stripPointing(retained + allowed), retained);
  assert.equal(P.stripPointing('שׁ'), 'שׁ');
});

test('a true 1:1 pair adds only points and is reversible and idempotent', () => {
  const r = P.transferWord('שמע', 'שְׁמַע');
  assert.equal(r.status, 'transferred');
  assert.equal(r.text, 'שְׁמַע');
  assert.deepEqual(r.insertions, [{offset: 1, text: 'ְׁ'}, {offset: 2, text: 'ַ'}]);
  assert.equal(undo(r.text, r.insertions), 'שמע');
  assert.equal(P.transferWord(r.text, r.donor).status, 'unchanged');
});

test('matres, prefixes, abbreviations, quote styles and presentation forms are not normalized', () => {
  for (const [target, donor] of [
    ['האשמורת', 'הָאַשְׁמֹרֶת'], ['דבר', 'דִּבְרֵי'], ['י', 'רְבִּי'],
    ["וחכ'", 'וַחֲכָמִים'], ['אד ם', 'הָאָדָם'], ['ר׳', "ר'"],
    ['שׁמע', 'שְׁמַע'], ['שמע\u0301', 'שְׁמַע']
  ]) {
    const r = P.transferWord(target, donor);
    assert.equal(r.status, 'blocked'); assert.equal(r.text, target);
    assert.deepEqual(r.insertions, []);
  }
});

test('existing points and their order survive; an unpointed donor cannot remove them', () => {
  const target = 'שָׁמַע';
  assert.equal(P.transferWord(target, 'שמע').text, target);
  assert.equal(P.transferWord(target, 'שָׁמַע').status, 'unchanged');
  const partial = 'שָמַע', r = P.transferWord(partial, 'שָׁמַע');
  assert.equal(r.text, target);
  assert.equal(undo(r.text, r.insertions), partial);
});

test('conflicting vowel, shin/sin and dagesh/rafe classes block the entire word', () => {
  for (const [target, donor] of [
    ['שָמע', 'שֶׁמַע'], ['שׂמע', 'שְׁמַע'], ['בֿרך', 'בָּרַךְ'],
    ['בּרך', 'בָֿרַךְ'], ['כָל', 'כׇל'], ['שַָמע', 'שמע'], ['שמע', 'שׁׂמע']
  ]) {
    const r = P.transferWord(target, donor);
    assert.equal(r.status, 'blocked'); assert.equal(r.text, target);
    assert.deepEqual(r.insertions, []);
  }
});

test('meteg and retained cantillation remain independent and reversible', () => {
  const target = 'ש֑מַע', donor = 'שְֽׁ֑מַע', r = P.transferWord(target, donor);
  assert.equal(r.status, 'transferred');
  assert.equal(P.stripPointing(r.text), P.stripPointing(target));
  assert.equal(undo(r.text, r.insertions), target);
  assert.equal(P.transferWord('שֽמע', 'שְׁמַע').text, 'שְֽׁמַע');
});

test('orphan points and misplaced shin/sin points are blocked', () => {
  for (const [target, donor] of [['שמע', 'ְשמע'], ['אב', 'אׁב'], ['א!', 'א!ָ']]) {
    assert.equal(P.transferWord(target, donor).status, 'blocked');
  }
});

test('batch application uses exact original UTF-16 spans, even for unsorted edits', () => {
  const original = '😀 שמע — וחכ\' / בֿרך\nשָמע';
  const specs = [['שמע', 'שְׁמַע'], ["וחכ'", 'וַחֲכָמִים'], ['בֿרך', 'בָּרַךְ'], ['שָמע', 'שָׁמַע']];
  const edits = specs.map(([target, donor]) => ({start: original.indexOf(target), end: original.indexOf(target) + target.length, target, donor}));
  const r = P.applyWordTransfers(original, edits.reverse());
  assert.equal(r.text, '😀 שְׁמַע — וחכ\' / בֿרך\nשָׁמַע');
  assert.equal(r.insertions[0].offset, 4); // Emoji occupies two UTF-16 units.
  assert.equal(undo(r.text, r.insertions), original);
  assert.deepEqual(P.applyWordTransfers(original, []), {text: original, insertions: []});
});

test('batch validation rejects stale, overlapping, out-of-range and split-surrogate spans', () => {
  const edit = {start: 0, end: 3, target: 'שמע', donor: 'שְׁמַע'};
  assert.throws(() => P.applyWordTransfers('שמע', [{...edit, target: 'שםע'}]), /does not match/);
  assert.throws(() => P.applyWordTransfers('שמע', [edit, edit]), /Overlapping/);
  assert.throws(() => P.applyWordTransfers('שמע', [edit, {start: 1, end: 2, target: 'מ', donor: 'מַ'}]), /Overlapping/);
  for (const [start, end] of [[-1, 2], [0, 4], [0.5, 2], [1, 1]]) {
    assert.throws(() => P.applyWordTransfers('שמע', [{...edit, start, end}]), RangeError);
  }
  assert.throws(() => P.applyWordTransfers('😀', [{start: 1, end: 2, target: '\ude00', donor: '\ude00'}]), RangeError);
});

test('UMD browser export and input validation', () => {
  const box = {window: {}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../kaufmann-pointing'), 'utf8'), box);
  assert.equal(box.window.KaufmannPointing.transferWord('שמע', 'שְׁמַע').text, 'שְׁמַע');
  assert.throws(() => P.stripPointing(null), TypeError);
  assert.throws(() => P.transferWord('שמע', undefined), TypeError);
  assert.throws(() => P.applyWordTransfers('שמע', {}), TypeError);
});
