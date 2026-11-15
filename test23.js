// Septuaginta-Morphologie (gmorph.js, Index lxx-morph.js): Bestimmung der Wörter, Formentabelle/Wortkarte griechisch, Lemma-Suche,
// und: der Index passt Wort für Wort zu den mitgelieferten griechischen Texten (sonst: node tools/lxxmorph/build.js …)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const G = require('./gmorph.js');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, 'lxx-morph.js'), 'utf8')); // eslint-disable-line no-eval
const D = window.LXX_MORPH;
const text = (title, vt) => JSON.parse(fs.readFileSync(path.join(__dirname, 'bundled', 'own', title, 'other', vt + '.json'), 'utf8')).text;
const CATSS = 'Septuaginta (CATSS)', RAHLFS = 'Septuaginta (Rahlfs)';

(async () => {
  // ----- Wörter zählen wie die Oberfläche -----
  assert.deepStrictEqual(G.words('<span class="wg" data-h="בראשית">ἐν ἀρχῇ</span> <small>[LXX 3]</small> <span class="wg wm" data-h="x" data-f="m"></span> <span class="wg">ἀπ’ αὐτοῦ,</span>'), ['ἐν', 'ἀρχῇ', 'ἀπ’', 'αὐτοῦ']);
  assert.strictEqual(G.fold('Ἐποίησεν'), 'εποιησεν'); assert.strictEqual(G.fold('θεὸς'), 'θεοσ');
  assert.strictEqual(G.form('θεὸς'), 'θεός'); assert.strictEqual(G.form('ἔλεός'), 'ἔλεος'); assert.strictEqual(G.form('ἀπ᾿'), 'ἀπ’');

  // ----- Kodierung -----
  { const C = G.encoder(50000, Array.from({ length: 6000 }, (_, i) => i * 7 % 50000));
    assert.strictEqual(C.enc(0).length, 1); assert.strictEqual(C.enc(7 * 40).length, 2); assert.strictEqual(C.enc(49999).length, 3);
    assert.ok(!/["\\`~! ]/.test(G.ALPH) && G.ALPH.length === 89); }

  // ----- Gen 1,1 -----
  const gi = G.bookIndex(D, 'Genesis', CATSS); assert.ok(gi >= 0);
  const v = G.verse(D, gi, 1, 1).map(t => G.info(D, t.id));
  assert.deepStrictEqual(v.map(x => x.lemma), ['ἐν', 'ἀρχή', 'ποιέω', 'ὁ', 'θεός', 'ὁ', 'οὐρανός', 'καί', 'ὁ', 'γῆ']);
  assert.strictEqual(v[2].form, 'ἐποίησεν'); assert.strictEqual(v[2].key, 'V aor ind act 3rd sg');
  assert.deepStrictEqual(G.describe(v[2].key), { pos: 'Verb', info: 'Aorist Indikativ Aktiv · 3. Sg.' }); // ἐποίησεν → ποιέω
  assert.deepStrictEqual(G.describe(v[1].key), { pos: 'Nomen', info: 'Dativ Sg. f.' });
  assert.deepStrictEqual(G.describe(v[0].key), { pos: 'Präposition', info: '' });
  assert.ok(/make|do/.test(v[2].gloss) && /God/.test(v[4].gloss));
  // θεοῦ → θεός (Gen 1,2: πνεῦμα θεοῦ)
  const v2 = G.verse(D, gi, 1, 2), w2 = G.words(text('Genesis', CATSS)[0][1]);
  const k = w2.indexOf('θεοῦ'); assert.ok(k > 0);
  assert.strictEqual(G.info(D, v2[k].id).lemma, 'θεός'); assert.deepStrictEqual(G.describe(G.info(D, v2[k].id).key), { pos: 'Nomen', info: 'Genitiv Sg. m.' });
  // weitere Bestimmungen
  assert.deepStrictEqual(G.describe('V pres ptc act masc nom sg'), { pos: 'Verb', info: 'Partizip Präsens Aktiv · Nominativ Sg. m.' });
  assert.deepStrictEqual(G.describe('V aor inf act'), { pos: 'Verb', info: 'Infinitiv Aorist Aktiv' });
  assert.deepStrictEqual(G.describe('N neut nom/acc/voc sg'), { pos: 'Nomen', info: 'Nom./Akk./Vok. Sg. n.' });
  assert.deepStrictEqual(G.describe('P 3rd gen sg'), { pos: 'Pronomen', info: '3. Pers. · Genitiv Sg.' });
  assert.deepStrictEqual(G.describe('V aor ind mid/pass 3rd sg', s => ({ Aorist: 'aorist', Indikativ: 'indicative', 'Medium/Passiv': 'middle/passive', 'Sg.': 'sg.', Verb: 'verb' }[s] || s)), { pos: 'verb', info: 'aorist indicative middle/passive · 3. sg.' });
  assert.strictEqual(G.verse(D, gi, 99, 1), null);
  assert.strictEqual(G.bookIndex(D, 'Esther', CATSS), -1); // die CATSS-Datei zu Ester enthält nicht das Buch Ester: ohne Bestimmung (stattdessen Rahlfs)
  assert.ok(G.hasBook(D, 'Esther', RAHLFS) && G.hasBook(D, 'Hosea', RAHLFS));

  // ----- Formentabelle / Wortkarte -----
  let m = G.model(D, 'ποιέω');
  assert.ok(m.total > 3000 && m.greek);
  assert.deepStrictEqual(m.sections.slice(0, 4).map(s => s.title), ['Präsens', 'Imperfekt', 'Futur', 'Aorist']);
  const aor = m.sections.find(s => s.title === 'Aorist'), ind = aor.blocks.find(b => b.title === 'Indikativ').tables[0];
  assert.ok(ind.cols.includes('Aktiv'));
  const c3 = ind.rows.find(r => r.label === '3. Sg.').cells[ind.cols.indexOf('Aktiv')];
  assert.strictEqual(c3[0].f, 'ἐποίησεν'); assert.ok(c3[0].n > 500);
  const rs = G.refs(D, m, c3[0].i);
  assert.deepStrictEqual([rs[0].book, rs[0].ch, rs[0].v], ['Genesis', 1, 1]);
  assert.strictEqual(rs.reduce((s, r) => s + r.n, 0), c3[0].n);
  const ds = G.dist(D, m);
  assert.strictEqual(ds.reduce((s, x) => s + x.n, 0), m.total);
  assert.strictEqual(ds.length, D.groups.reduce((s, g) => s + g[1], 0)); // die Gruppen (Tora, Propheten, Schriften, Apokryphen) decken alle gezählten Bücher
  assert.deepStrictEqual(ds.slice(0, 5).map(x => x.book), ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']);
  assert.ok(ds.some(x => x.book === 'Judges (A)') && ds.some(x => x.book === 'Judges (B)') && ds.some(x => x.book === 'Daniel (Theodotion)'));
  assert.ok(!ds.some(x => x.title === 'Prayer of Manasseh')); // = Ode 12, zählt nicht doppelt
  assert.ok(ds.every(x => x.verses <= x.n && x.verses <= x.size));
  assert.ok(G.refsIn(D, m, 'Genesis').length > 100 && G.refsIn(D, m, 'Genesis').every(r => r.title === 'Genesis'));
  let tf = G.topForms(m, 5); assert.strictEqual(tf.list.length, 5); assert.ok(tf.list[0].n >= tf.list[1].n && tf.kinds > 100);
  assert.ok(/<table class="fmT fmG">/.test(G.render(m)) && /lang="grc"/.test(G.render(m)));
  // Nomen: Kasus × Numerus; Artikel: je Numerus Kasus × Genus, mehrdeutige Formen in jeder passenden Spalte
  m = G.model(D, 'θεός');
  assert.strictEqual(m.sections[0].title, 'Nomen');
  let tb = m.sections[0].blocks[0].tables[0];
  assert.deepStrictEqual(tb.cols, ['Sg.', 'Pl.']); assert.deepStrictEqual(tb.rows.slice(0, 4).map(r => r.label), ['Nom.', 'Gen.', 'Dat.', 'Akk.']);
  assert.strictEqual(tb.rows[1].cells[0][0].f, 'θεοῦ'); assert.strictEqual(tb.rows[0].cells[0][0].f, 'θεός');
  m = G.model(D, 'ὁ'); tb = m.sections[0].blocks[0].tables;
  assert.deepStrictEqual(tb.map(x => x.title), ['Singular', 'Plural']); assert.deepStrictEqual(tb[0].cols, ['m.', 'f.', 'n.']);
  const gen = tb[0].rows.find(r => r.label === 'Gen.');
  assert.strictEqual(gen.cells[0][0].f, 'τοῦ'); assert.strictEqual(gen.cells[2][0].f, 'τοῦ'); assert.strictEqual(gen.cells[1][0].f, 'τῆς');
  assert.strictEqual(G.model(D, 'gibtesnicht'), null);
  assert.strictEqual(G.findLemma(D, 'θεος'), 'θεός'); assert.strictEqual(G.findLemma(D, 'ποιέω'), 'ποιέω'); assert.strictEqual(G.findLemma(D, 'xyz'), null);

  // ----- der Index passt zu den mitgelieferten Texten -----
  const man = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundled', 'manifest.json'), 'utf8')).items;
  let words = 0, same = 0, none = 0, low = 0, guess = 0, rahlfs = 0;
  D.B.forEach((b, bi) => {
    const [title, vt] = b, tx = text(title, vt), exact = /Rahlfs/.test(vt);
    assert.ok(man.some(i => i.title === title && i.versionTitle === vt && i.language === 'Greek' && i.kind === 'other'), `${title} · ${vt} fehlt im Manifest`);
    assert.strictEqual(b[3].length, tx.length, `${title} · ${vt}: Kapitelzahl`);
    tx.forEach((ch, ci) => {
      const vs = b[3][ci].split(' ');
      (Array.isArray(ch) ? ch : []).forEach((html, vi) => {
        const ws = G.words(html), toks = G.decode(D, vs[vi] || '');
        assert.strictEqual(toks.length, ws.length, `${title} · ${vt} ${ci + 1}:${vi + 1}: der Index ist veraltet (node tools/lxxmorph/build.js)`);
        toks.forEach((t, i) => {
          words++; if (!t) { none++; return; }
          if (t.low) low++; if (t.guess) guess++;
          const ok = G.fold(G.info(D, t.id).form) === G.fold(ws[i]); if (ok) same++;
          if (exact) { rahlfs++; assert.ok(ok, `${title} ${ci + 1}:${vi + 1} ${ws[i]}`); }
        });
      });
    });
  });
  assert.ok(none / words < 0.001 && guess / words < 0.002 && same / words > 0.999, `Abdeckung: ${words} Wörter, ${none} ohne, ${guess} nach Wortform, ${same} gleich`);
  const o = G.occ(D);
  assert.ok(o.total > 600000 && rahlfs > 100000);
  // neue Texte: Kapitel- und Verszahl wie die vorhandenen Fassungen desselben Titels
  for (const title of ['Hosea', 'Esther']) assert.deepStrictEqual(text(title, RAHLFS).map(c => c.length), JSON.parse(fs.readFileSync(path.join(__dirname, 'bundled', 'own', title, 'he', 'Westminster Leningrad Codex (OSHB, mit Morphologie).json'), 'utf8')).text.map(c => c.length));
  for (const title of ['Das dritte Buch der Makkabäer', 'Das Buch Baruch', 'Der Brief Jeremias', 'Die Psalmen Salomos', 'Prayer of Manasseh']) {
    const de = fs.readdirSync(path.join(__dirname, 'bundled', 'own', title, 'de'))[0];
    assert.deepStrictEqual(text(title, RAHLFS).map(c => c.length), JSON.parse(fs.readFileSync(path.join(__dirname, 'bundled', 'own', title, 'de', de), 'utf8')).text.map(c => c.length), title);
  }
  assert.ok(/<small>\[1a\]<\/small>/.test(text('Esther', RAHLFS)[0][0])); // Zusatz A steht mit Versbuchstaben im ersten Vers
  assert.ok(G.words(text('Makkabäer I (Septuaginta)', RAHLFS)[0][0]).length > 20);

  // ----- Lemma-Suche (Treffer „Alle Formen“) -----
  const { searchFiles } = require('./searchcore.js');
  const entries = man.filter(i => i.language === 'Greek' && ['Genesis', 'Ruth', 'Das Buch Baruch'].includes(i.title));
  const dir = path.join(__dirname, 'bundled');
  let r = await searchFiles({ dir, entries, params: { query: 'ποιέω', lemma: true, prefix: true, parse: true, limit: 5000, perFile: 5000 } });
  const g11 = r.results.find(x => x.title === 'Genesis' && x.path[0] === 0 && x.path[1] === 0);
  assert.ok(g11 && g11.words.includes('ἐποίησεν'), 'Gen 1,1: ἐποίησεν über das Lemma ποιέω');
  assert.strictEqual(r.results.filter(x => x.title === 'Genesis').length, new Set(G.refsIn(D, G.model(D, 'ποιέω'), 'Genesis').map(x => x.ch + ':' + x.v)).size); // dieselben Verse wie die Wortkarte
  assert.ok(r.results.some(x => x.title === 'Das Buch Baruch') && r.results.some(x => x.title === 'Ruth'));
  r = await searchFiles({ dir, entries, params: { query: 'θεος', lemma: true, prefix: true, parse: true, limit: 5000, perFile: 5000 } }); // ohne Akzente
  assert.ok(r.results.some(x => x.words.includes('θεοῦ')) && r.results.some(x => x.words.includes('θεὸς') || x.words.includes('θεός')));
  r = await searchFiles({ dir, entries, params: { query: 'ἐποίησεν', exact: true, parse: true, limit: 5000, perFile: 5000 } }); // „Genau dieses Wort“: keine anderen Formen
  assert.ok(r.results.length > 50 && r.results.every(x => x.words.every(w => G.fold(w) === 'εποιησεν')));

  console.log(`Septuaginta-Morphologie ok (${D.B.length} Fassungen, ${words.toLocaleString('de-DE')} Wörter, davon ${none} ohne Bestimmung, ${guess} nach der Wortform, ${low} unsicher; ${G.ix(D).lemma.length} Lemmata)`);
})().catch(e => { console.error(e); process.exit(1); });
