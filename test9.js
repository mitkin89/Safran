// OSHB: Morphologie-Decoder, Wort-Spans im Leser, Lemma-Tabelle
const assert = require('assert');
const M = require('./morph.js');
const R = require('./reader.js');
const D = require('./dsl.js');
const fs = require('fs');

let d = M.decode('HVqp3ms', '1254 a');
assert.deepStrictEqual([d.segs[0].pos, d.segs[0].stem, d.segs[0].tense, d.segs[0].info], ['Verb', 'Qal', 'Perfekt', '3. Pers., m., Sg.']);
d = M.decode('HC/Td/Ncbsa', 'c/d/776');
assert.strictEqual(d.segs.length, 3); assert.strictEqual(d.main, 2); assert.strictEqual(d.segs[0].prefix, 'und (וְ)');
d = M.decode('HR/Ncmsc/Sp3ms', 'l/4327');
assert.strictEqual(d.main, 1); assert(d.segs[2].suffix);
d = M.decode('HVhwq3ms', '1'); assert.strictEqual(d.segs[0].tense, 'Imperfekt consecutivum (wajjiqtol)' === d.segs[0].tense ? d.segs[0].tense : 'x');
d = M.decode('HVqrmsa', '6213 a'); assert.strictEqual(d.segs[0].tense, 'Partizip aktiv');
d = M.decode('AVqp3ms', '1'); assert.strictEqual(d.segs[0].stem, 'Pe‘al'); // Aramäisch
assert.strictEqual(M.decode('', ''), null);

// Wort-Spans bleiben, alles andere wird gefiltert
const ok = '<span class="w" data-l="1254 a" data-m="HVqp3ms">בָּרָא</span>';
assert.strictEqual(R.cleanHtml(ok), ok);
assert.strictEqual(R.cleanHtml('<span class="w" onclick="x" data-l="1" data-m="H">a</span>'), 'a');
assert.strictEqual(R.cleanHtml('<span style="x">a</span>b'), 'ab');
assert(!/<(script|span)/.test(R.cleanHtml('<span class="w" data-l="1" data-m="H&quot;><script>">a</span>')));
assert.strictEqual(R.normalize(ok + '־' + ok), 'ברא ברא');

// Lemma-Tabelle
global.window = {}; eval(fs.readFileSync(__dirname + '/oshb-lemmas.js', 'utf8'));
const L = window.OSHB_LEMMAS;
assert.strictEqual(D.norm(L['1254 a'][0]), D.norm('ברא'));
assert(Object.keys(L).length > 9000);

// Genesis-Datei im Paket
const g = JSON.parse(fs.readFileSync(__dirname + '/bundled/own/Genesis/he/Westminster Leningrad Codex (OSHB, mit Morphologie).json', 'utf8'));
assert.strictEqual(g.text.length, 50); assert.strictEqual(g.text[0].length, 31);
assert(g.text[0][0].startsWith('<span class="w" data-l="b/7225"'));
console.log('OSHB ok');
// Versionsvergleich für den Update-Hinweis
{ const U = require('./update.js');
  assert(U.newer('1.5.0', '1.4.0') && U.newer('v1.10.0', '1.9.2') && U.newer('2.0', '1.9.9'));
  assert(!U.newer('1.4.0', '1.4.0') && !U.newer('1.3.9', '1.4.0') && !U.newer('', '1.0.0'));
  console.log('Update-Vergleich ok'); }
