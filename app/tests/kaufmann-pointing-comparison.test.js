'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {parseReference, uniqueConsonantAnchors, pointingSignature, comparePointing, main} = require('../tools/mishnah-morph/compare-kaufmann-pointing.cjs');
function fixture(words) {
  return {source: {textHash: 'a'.repeat(64), donorTextHash: 'b'.repeat(64)}, units: {'1:1': {words: words.map((text, i) => ({originalWord: text.replace(/[\u05b0-\u05c7]/gu, ''), text, transferId: 't' + i}))}}, transfers: words.map((text, i) => ({id: 't' + i, targetRef: '1:1', targetWordIndex: i, sourceRef: '1:1', sourceToken: i + 1, originalWord: text.replace(/[\u05b0-\u05c7]/gu, ''), pointedWord: text, status: 'transferred'}))};
}

test('parser preserves raw spans/markup and separates numeric divisions without treating annotations as a base hand', () => {
  const raw = 'Ber. 1:1\u200f (2) אָב(3)גַּד ה{ו}ז ⟦חַ⟧ (ט) <י> כ׳ִ׃\r\n';
  const parsed = parseReference(raw), unit = parsed.units[0];
  assert.equal(unit.ref, '1:1');
  assert.equal(unit.raw, raw.slice(unit.start, unit.end));
  assert.deepEqual(unit.tokens.map(t => t.consonants), ['אב', 'גד', 'הוז', 'ח', 'ט', 'י', 'כ']);
  assert.deepEqual(unit.tokens.map(t => t.annotationTouched), [false, false, true, true, true, true, false]);
  for (const token of unit.tokens) assert.equal(token.raw, raw.slice(token.start, token.end));
  for (const annotation of unit.annotations) assert.equal(annotation.raw, raw.slice(annotation.start, annotation.end));
  assert.equal(unit.excluded.filter(s => s.kind === 'numeric-division').length, 2);
  assert.equal(pointingSignature(unit.tokens.at(-1).raw).status, 'blocked');
});

test('only the identified unlabelled opening can infer 1:1; duplicate and unlabelled later units fail', () => {
  assert.equal(parseReference(' מֵאֵמָּתַיִ קוֹרִין אֶת\nBer. 1:2 אָב').units[0].refInferred, true);
  assert.throws(() => parseReference('אָב'), /Unlabelled/);
  assert.throws(() => parseReference('Ber. 1:1 אָב\nגַּד'), /Unlabelled/);
  assert.throws(() => parseReference('Ber. 1:1 אָב\nBer. 1:1 גַּד'), /Duplicate/);
});

// Independent exhaustive oracle: intersection of all optimal index-pair paths.
function oracle(a, b) {
  const paths = [];
  function walk(i, j, pairs) {
    if (i === a.length || j === b.length) { paths.push(pairs); return; }
    if (a[i] === b[j]) walk(i + 1, j + 1, [...pairs, i + ':' + j]);
    walk(i + 1, j, pairs); walk(i, j + 1, pairs);
  }
  walk(0, 0, []);
  const size = Math.max(...paths.map(p => p.length)), best = paths.filter(p => p.length === size);
  return best[0].filter(edge => best.every(p => p.includes(edge))).sort();
}
test('mandatory unique LCS anchors agree with every optimal alignment, not a greedy or vowel-based selection', () => {
  const sequences = [[]];
  for (let length = 1; length <= 3; length++) for (let bits = 0; bits < 2 ** length; bits++) sequences.push(Array.from({length}, (_, i) => bits & (1 << i) ? 'א' : 'ב'));
  for (const a of sequences) for (const b of sequences) {
    const actual = uniqueConsonantAnchors(a, b).anchors.map(e => e.targetIndex + ':' + e.referenceIndex).sort();
    assert.deepEqual(actual, oracle(a, b), JSON.stringify({a, b}));
  }
  assert.deepEqual(uniqueConsonantAnchors(['אָב'], ['אַב', 'אָב']).anchors, []);
  assert.deepEqual(uniqueConsonantAnchors(['אָב', 'גַּד'], ['אֶב', 'גֵד']).anchors, [{targetIndex: 0, referenceIndex: 0}, {targetIndex: 1, referenceIndex: 1}]);
});

test('point sets ignore canonical mark order, but do not collapse vowels/shin/dagesh or repair abbreviation marks', () => {
  assert.deepEqual(pointingSignature('שַּׁ').clusters, pointingSignature('שַּׁ').clusters);
  for (const word of ['בֶַ', 'בׁ', 'שׁׂ', 'בּֿ', 'אוֹמְ׳ִ', 'ְאב']) assert.equal(pointingSignature(word).status, 'blocked', word);
});

test('all six statuses are disjoint, with open targets excluded and no full reference text in aggregate', () => {
  const d = fixture(['אָב', 'גַּד', 'הוּז', 'טִי', 'כַּל', 'מָן']);
  d.transfers[5].status = 'open';
  const raw = 'Ber. 1:1 אַב גַּד {הוּז} ט׳ִי כמל מָן';
  const {aggregate, privateDetails} = comparePointing(d, raw);
  assert.deepEqual(aggregate.counts, {match: 1, different: 1, 'reference-suspect': 1, 'annotation-open': 1, 'alignment-open': 1, 'target-open': 1});
  assert.equal(aggregate.reference.sha256.length, 64);
  assert.equal(privateDetails.units[0].raw, raw);
  assert(!JSON.stringify(aggregate).includes(raw));
  assert(!JSON.stringify(aggregate).includes('"targetWord":'));
  assert.equal(privateDetails.comparisons.length, 6);
  assert.equal(aggregate.differencesByMarkCategory.vowel.positions, 1);
  assert.equal(aggregate.differencesByMarkCategory.vowel.differingNonemptySets, 1);
  assert.equal(aggregate.differenceShapes.hasDifferingNonemptySets, 1);
});

test('standalone pointing marks remain suspect and do not silently disappear from comparison', () => {
  const result = comparePointing(fixture(['אָב', 'גַּד']), 'Ber. 1:1 אָב ִ גַּד');
  assert.equal(result.aggregate.counts['reference-suspect'], 2);
  assert.equal(result.privateDetails.units[0].floatingMarkRanges.length, 1);
});

test('unit/transfer consistency is fail closed and private CLI output cannot enter repository', () => {
  const d = fixture(['אָב']); d.transfers[0].pointedWord = 'אַב';
  assert.throws(() => comparePointing(d, 'Ber. 1:1 אָב'), /no longer matches/);
  assert.throws(() => main(['unused.txt', '--private-details', path.join(__dirname, 'private-reference.json')]), /outside the repository/);
});

test('critical corner signs are preserved annotations and mark-category counts separate missing from changed points', () => {
  const marked = comparePointing(fixture(['אֱלֹהֵינוּ']), 'Ber. 1:1 אֱ⌝לֹהֵ⌜ינוּ');
  assert.equal(marked.aggregate.counts['annotation-open'], 1);
  assert.equal(marked.aggregate.referenceInventory.annotationTouchedTokens, 1);
  const changed = comparePointing(fixture(['שַׁ', 'בַ']), 'Ber. 1:1 שַׂ בַּ').aggregate;
  assert.equal(changed.differencesByMarkCategory['shin-dot'].differingNonemptySets, 1);
  assert.equal(changed.differencesByMarkCategory.dagesh.targetMissing, 1);
  assert.equal(changed.differenceShapes.onlyMissingMarks, 1);
  assert.equal(changed.differenceShapes.hasDifferingNonemptySets, 1);
  assert.throws(() => comparePointing(fixture(['אָב']), 'Ber. 1:1 אָב', {expectedTargetTextHash: 'c'.repeat(64)}), /text hash mismatch/);
});
