// Tests für refs.js (Stellenangaben, Verslisten, Notiz-IDs, Links)
const assert = require('assert');
const R = require('./refs.js');

// Verslisten
assert.strictEqual(R.fmtVerses([1, 2, 3, 4, 5, 9]), '1–5, 9');
assert.strictEqual(R.fmtVerses([3, 1, 2, 2]), '1–3');
assert.strictEqual(R.fmtVerses([1, 2]), '1–2');
assert.strictEqual(R.fmtVerses([7]), '7');
assert.strictEqual(R.fmtVerses([]), '');
{ const p = R.parseVerseList('1-5, 9'); assert.deepStrictEqual([...p.set], [1, 2, 3, 4, 5, 9]); assert.strictEqual(p.vs, '1–5, 9'); }
{ const p = R.parseVerseList('5-3'); assert.deepStrictEqual([...p.set], [3, 4, 5]); }
{ const p = R.parseVerseList('2, 2, x'); assert.deepStrictEqual([...p.set], [2]); }
assert.strictEqual(R.parseVerseList('1-99999').set.size, 501); // Obergrenze

// Zeilen, IDs, verwandte Titel
assert.strictEqual(R.rowVerse('12'), 12);
assert.strictEqual(R.rowVerse('2:5'), 2);
assert.strictEqual(R.rowVerse('a'), null);
assert.strictEqual(R.noteId({ key: 'K' }, '[0]', 'blk:1–3'), 'K|[0]|blk:1–3');
assert(R.relatedTitles('Genesis', 'Rashi on Genesis'));
assert(R.relatedTitles('Genesis', 'Genesis'));
assert(!R.relatedTitles('Genesis', 'Exodus'));
assert(!R.relatedTitles('', 'Exodus'));

// Links
assert.strictEqual(R.sefariaUrl('Genesis 1:3'), 'https://www.sefaria.org/Genesis_1.3');
assert.strictEqual(R.noteUrl({ kind: 'row', title: 'Genesis', secLabel: 'Kapitel 1', row: '3' }), 'https://www.sefaria.org/Genesis_1.3');
assert.strictEqual(R.noteUrl({ kind: 'block', title: 'Genesis', secLabel: 'Kapitel 1', vs: '2–4, 9' }), 'https://www.sefaria.org/Genesis_1.2-4');
assert.strictEqual(R.noteUrl({ kind: 'block', title: 'Genesis', secLabel: 'Kapitel 1', vs: '' }), 'https://www.sefaria.org/Genesis_1');
assert.strictEqual(R.noteUrl({ kind: 'free', title: 'x' }), '');

// Stellen-Eingabe
const books = ['genesis', 'exodus', 'psalms', '1 samuel', '1 kings', 'berakhot'];
const best = b => { const n = R.normT(b); return books.find(x => x.startsWith(n) || x.split(' ').some(w => w.startsWith(n))) ? {} : null; };
const pm = q => { const r = R.parseMulti(q, best, 'Genesis'); return r ? { u: r.units.map(u => `${u.book}|${u.chap}|${u.vs}${u.ab ? '|ab' : ''}`), bad: r.bad } : null; };
const eq = (q, u, bad = []) => assert.deepStrictEqual(pm(q), { u, bad }, q);
assert.strictEqual(pm('gen 1:2-4'), null);            // einzelne Versliste: Sprung, kein Mehrfach-Dialog
assert.strictEqual(pm('genesis 1:1-5, 9'), null);
assert.strictEqual(pm('Psalms 23'), null);
eq('gen 1:3, 2:5', ['gen|1|3', 'gen|2|5']);
eq('gen 1:3; 2:5', ['gen|1|3', 'gen|2|5']);
eq('gen 1:3, ex 2:1', ['gen|1|3', 'ex|2|1']);
eq('gen 1:3, 1 Kings 2:1', ['gen|1|3', '1 Kings|2|1']);
eq('Psalms 23, 24', ['Psalms|23|', 'Psalms|24|']);
eq('Psalms 23-25', ['Psalms|23||ab', 'Psalms|24||ab', 'Psalms|25||ab']);
eq('Berakhot 2-4', ['Berakhot|2||ab', 'Berakhot|3||ab', 'Berakhot|4||ab']);
eq('gen 1:3, 1 Samuel', ['gen|1|3', '1 Samuel|1|']);
eq('genesis 1:1-5,9, exodus 3', ['genesis|1|1–5, 9', 'exodus|3|']);
eq('gen 1:1-2:3', ['gen|1|1–…', 'gen|2|1–3']);
eq('gen 1:3, nirgendwo 4', ['gen|1|3', 'nirgendwo|4|']); // unbekanntes Buch wird erst beim Öffnen gemeldet
assert.strictEqual(pm('gen 1:3, ???'), null); // unlesbarer Rest: kein Mehrfach-Dialog
console.log('refs ok');
{
  const R = require('./reader.js'), assert = require('assert');
  assert(!/<img|<a /i.test(R.cleanHtml('x <img src=x onerror=alert(1)//')));
  assert.strictEqual(R.cleanHtml('1 < 2 <b>x</b>'), '1 &lt; 2 <b>x</b>');
  console.log('cleanHtml-Härtung ok');
}
// deutsche Buchnamen
{ const a = require('assert'); a(R.deHit('I Kings', 'kön') && R.deHit('II Kings', 'kön') && R.deHit('I Kings', '1 kön') && !R.deHit('II Kings', '1 kön'));
  a(R.deHit('Judges', 'richter') && R.deHit('Genesis', '1 mose') && R.deHit('Job', 'hiob') && R.deHit('Psalms', 'ps') && !R.deHit('Genesis', 'kön')); console.log('deutsche Buchnamen ok'); }
{ const a = require('assert'); a.strictEqual(R.canonBook('1_Samuel'), 'I Samuel'); a.strictEqual(R.canonBook('2_Kings'), 'II Kings'); a.strictEqual(R.canonBook('Richter'), 'Judges'); a.strictEqual(R.canonBook('Isaiah'), 'Isaiah'); a.strictEqual(R.canonBook('xyz'), ''); console.log('Audio-Buchnamen ok'); }
// Gesenius-Abkürzungen
{ const a = require('assert'), G = require('./gabk.js');
  const m = G.mark('<b>אֵב</b> (vgl. <a class="dsrc" data-sref="x">Ps 37</a>) m. <i>pl. cstr.</i> Ges. § 23; E. Meyer, EdJ 196; 139 f.; Ps 37; Am Anfang; V. 30');
  a(/<abbr class="gab" data-t="vergleiche">vgl\.<\/abbr>/.test(m)); a(/data-t="status constructus">cstr\./.test(m)); a(/data-t="folgende">f\./.test(m)); a(/data-t="Vers">V\./.test(m));
  a(/data-t="Psalmen">Ps<\/abbr> 37/.test(m)); a(!/>Ps<\/abbr><\/a>/.test(m)); a(!/>Am<\/abbr>/.test(m)); a(!/data-t="Elohist"/.test(m)); a(/>Ges\. §<\/abbr>/.test(m)); a(/>Meyer, EdJ<\/abbr>/.test(m));
  a(G.mark('<b>x</b>') === '<b>x</b>'); console.log('Gesenius-Abkürzungen ok'); }
