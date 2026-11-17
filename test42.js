// Bavli-Morphologie: Quelltreue, Wortpositionen, schwierige Kontexte und echte Suchwege.
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const B = require('./bavli-core'), M = require('./morph'), D = require('./bavli-morph'), R = require('./reader');
const { searchFiles } = require('./searchcore');
const source = require('./tools/bavli/berakhot/source.json');
const manifest = require('./bundled/manifest.json');
const item = manifest.items.find(x => x.title === 'Berakhot' && /Safran-Morphologie/.test(x.versionTitle));
assert(item, 'Bavli-Ausgabe fehlt im Manifest');
const raw = fs.readFileSync(path.join(__dirname, 'bundled', item.rel));
assert.strictEqual(crypto.createHash('sha1').update(raw).digest('hex'), item.hash);
const corpus = JSON.parse(raw), span = /<span class="w" data-l="([^"]+)" data-m="([^"]*)">([^<]*)<\/span>/g;
let words = 0, segments = 0;
const positions = new Map(D.occurrences.map(o => [o.ref + ':' + o.token, o]));
for (const [amud, rows] of Object.entries(source.pages)) {
  const page = (parseInt(amud, 10) - 1) * 2 + (amud.endsWith('b') ? 1 : 0);
  assert.strictEqual(corpus.text[page].length, rows.length);
  rows.forEach((text, vi) => {
    const marked = corpus.text[page][vi], ref = `Berakhot ${amud}:${vi + 1}`;
    assert.strictEqual(marked.replace(span, '$3'), text, ref + ': Original-HTML verändert');
    assert.deepStrictEqual([...R.cleanHtml(marked).matchAll(span)].map(m => m[1]), [...marked.matchAll(span)].map(m => m[1]), ref + ': HTML-Bereinigung entfernt Bavli-Wortmarkierungen');
    const expected = new Map([...text.replace(/<[^>]*>/g, '').matchAll(/\S+/g)].map((m, i) => [i + 1, m[0]]));
    for (const o of D.occurrences.filter(o => o.ref === ref)) assert.strictEqual(expected.get(o.token), o.word, ref + ': falsche Wortposition');
    for (const m of marked.matchAll(span)) {
      assert(B.own(m[1]) && D.lexicon[m[1]]);
      assert.strictEqual(B.definiteMorph(D.lexicon[m[1]]), m[2], ref + ': falsche Einzelbestimmung');
      words++;
    }
    segments++;
  });
}
assert.strictEqual(segments, 490);
assert.strictEqual(words, 10786);
assert.strictEqual(words, positions.size);
assert.strictEqual(words, D.occurrences.length);
assert.strictEqual(D.coverage.words, words);
assert.strictEqual(Object.values(D.coverage.statuses).reduce((a, b) => a + b, 0), words);
const at = (ref, i) => D.lexicon[positions.get(`Berakhot ${ref}:${i}`).id];
const has = (ref, i, morph) => assert(B.analyses(at(ref, i)).some(a => a.morph === morph), `${ref}/${i}: ${morph} fehlt`);
has('2a:8', 2, 'AR/Ncmsd'); // אקרא = auf die Schrift; kein hebräisches „ich lese“.
assert.strictEqual(B.definiteLemma(at('2a:8', 2)), 'קרא');
has('2a:7', 7, 'AVqi3ms'); // לתני = modale Präfixform, kein ל-Infinitiv.
has('2b:6', 6, 'ATi'); // מי leitet eine Entscheidungsfrage ein, nicht „wer“.
has('4b:14', 24, 'HNp'); // ה׳ ist hier der Gottesname.
has('5b:14', 12, 'HR/Ncmsa'); // בית אפל: keine Genitivkette.
has('5b:14', 52, 'HR/Acfdc');
has('6a:2', 13, 'HNcfsa'); // בריה ist hier „Geschöpf“, nicht „sein Sohn“.
has('6b:10', 32, 'HR/Ncmsc');
has('7a:16', 14, 'AR/Acmsa'); // אחד כרעא = auf einem Bein.
has('7b:10', 18, 'HTn'); // אל תקרא: Negation, kein Gottesname.
// Übersetzungsvergleich: fremde OSHB-Homographen dürfen lokale Syntax nicht verdrängen.
has('5a:3', 13, 'HC/Vqh1cs');
for (const [ref, i] of [['5a:10', 13], ['5a:16', 27]]) assert.strictEqual(B.definiteMorph(at(ref, i)), 'HTo');
for (const [ref, i] of [['5b:21', 18], ['5b:22', 1]]) assert.strictEqual(B.definiteMorph(at(ref, i)), 'HC/R');
assert.strictEqual(B.definiteMorph(at('7a:30', 4)), 'HR/Vqc');
assert.strictEqual(B.definiteMorph(at('7a:30', 6)), 'HNcbpc/Sp1cs');
assert.strictEqual(B.definiteMorph(at('7b:8', 6)), 'ATr/R');
assert.strictEqual(B.definiteMorph(at('7b:10', 15)), 'HVqp3ms');
assert.strictEqual(B.definiteMorph(at('8a:16', 11)), 'ANcfpd');
assert.strictEqual(B.definiteMorph(at('9b:29', 24)), 'HAampa');
assert.strictEqual(B.definiteMorph(at('10a:18', 9)), 'HAampa');
assert.strictEqual(at('10a:2', 36).status, 'ambiguous', 'Midraschische Umdeutung muss sichtbar bleiben');
has('8a:8', 10, 'HTd/Ncfsa');
has('8a:28', 1, 'AVqi3fs'); // תיקו < תיקום.
has('9a:13', 1, 'AC/Vqv2ms/Sp3fp');
has('9a:18', 13, 'HC/Ncmpa');
has('9b:9', 28, 'HNcbsc');
assert.strictEqual(String(at('10a:31', 2).subject.person), '1');
const nashra = D.occurrences.find(o => o.ref === 'Berakhot 8a:13' && R.normalize(o.word).replace(/[^א-ת]/g, '') === 'נשרא');
assert(nashra);
assert.strictEqual(D.lexicon[nashra.id].status, 'partial');
assert.strictEqual(B.definiteMorph(D.lexicon[nashra.id]), 'AVq');
assert.strictEqual(B.describe({ lemma: 'מלכא', morph: 'ANcmsd' }, M)[0].info.includes('bestimmt'), false);
assert(B.describe({ lemma: 'קא/תני', morph: 'AT/Vqrmsa' }, M)[0].label.includes('Aspektpartikel'));
assert.strictEqual(B.mainIndex('ATr/T/Vqrmsa'), 2);
assert.strictEqual(B.definiteMorph({ analyses: [{ morph: 'HVqp3ms' }, { morph: 'AVqp3ms' }] }), '');
assert.strictEqual(B.headLemma({ lemma: 'ד/קא/תני', morph: 'ATr/T/Vqrmsa' }), 'תני');
const forms = B.forms(D, 'קום', 'A');
assert(forms.some(f => f.refs.some(r => r.ref === 'Berakhot 8a:28')));
assert(forms.every(f => f.refs.every(r => /^Berakhot (?:[2-9]|10)[ab]:\d+$/.test(r.ref))));
const lib = fs.readFileSync(path.join(__dirname, 'library.js'), 'utf8');
assert(lib.includes('window.BavliMorph.own(w.dataset.l)'));
assert(lib.includes('showBavliWord(w)'));
assert(lib.includes('showBavliForms(D, a.lemma, a.lang)'));
assert(fs.readFileSync(path.join(__dirname, 'library.html'), 'utf8').includes('src="bavli-core.js"'));
(async () => {
  const opts = { dir: path.join(__dirname, 'bundled'), entries: [item], params: { query: '', gram: { pos: 'V', stem: 'q', tense: 'i' }, perFile: 1000, limit: 1000 } };
  const results = await searchFiles(opts);
  assert(results.results.some(r => r.path[0] === 2 && r.path[1] === 6 && r.words.includes('לתני')), 'Bavli-Grammatiksuche findet לתני nicht');
  assert(!results.results.some(r => r.path[0] === 14 && r.path[1] === 12 && r.words.includes('נשרא')), 'Unbestimmte Flexion darf nicht als Imperfekt gelten');
  const lemma = await searchFiles({ ...opts, params: { query: 'קום', lemma: true, perFile: 1000, limit: 1000 } });
  assert(lemma.results.some(r => r.path[0] === 14 && r.path[1] === 27), 'Bavli-Lemmasuche findet תיקו unter קום nicht');
  console.log('Bavli: 18 Amudim / 490 Segmente / 10786 Wortannotationen, Suchwege und Quelltreue geprüft.');
})().catch(err => { console.error(err); process.exitCode = 1; });
