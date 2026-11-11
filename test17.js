// Fußnotenzeichen ohne Fußnote (Goldschmidt, Ketubot 51a:8: „viii“) darf den Text bis zur nächsten Fußnote nicht verschlucken
const assert = require('assert');
const R = require('./reader.js');
const h = '<sup class="footnote-marker">viii</sup>. S<small>CHRIEB ER</small> P<small>RIESTERSFRAU</small><sup class="footnote-marker">264</sup><i class="footnote">Die dadurch verboten wird.</i>: <small>UND</small>';
const r = R.splitFootnotes(h);
assert.strictEqual(r.notes.length, 1);
assert.strictEqual(r.notes[0].marker, '264');
assert.strictEqual(r.notes[0].html, 'Die dadurch verboten wird.');
assert.ok(r.main.startsWith('<sup class="footnote-marker">viii</sup>. S<small>CHRIEB ER</small>'));
assert.ok(r.main.includes('<sup data-fn="0">264</sup>: <small>UND</small>'));
// normaler Fall unverändert
const n = R.splitFootnotes('a<sup class="footnote-marker">1</sup><i class="footnote">x <i>y</i> z</i> b');
assert.deepStrictEqual(n.notes, [{ marker: '1', html: 'x <i>y</i> z' }]);
assert.strictEqual(n.main, 'a<sup data-fn="0">1</sup> b');
console.log('test17 ok');
