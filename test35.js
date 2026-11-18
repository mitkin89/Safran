// Echte LSJ-Artikel und die UI-Ereignisse in beiden Richtungen zur griechischen Wortkarte.
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib'), vm = require('vm');
const GM = require('./gmorph'), DSL = require('./dsl');
const ui = fs.readFileSync(path.join(__dirname, 'library.js'), 'utf8');
const ctx = vm.createContext({ window: { GMorph: GM, OSHB_LEMMAS: { '1': ['אָב', 'father'] } } });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'lxx-morph.js'), 'utf8'), ctx);
const D = ctx.window.LXX_MORPH;
const part = (from, to) => ui.slice(ui.indexOf(from), ui.indexOf(to, ui.indexOf(from)));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const nodes = new Map(), handlers = new Map(), calls = [];
const $ = sel => {
  if (!nodes.has(sel)) nodes.set(sel, { innerHTML: '', value: '', hidden: true, addEventListener: (event, fn) => handlers.set(sel + ':' + event, fn) });
  return nodes.get(sel);
};
Object.assign(ctx, { $, esc, I18N: { t: s => s }, portraitOf: () => null, heFix: s => s,
  loadGM: async () => D, dictSel: null, dictOnly: null, dictSrc: null, dictHist: [], dictPos: -1, dictShown: [], dtabs: [{}], dcur: 0,
  renderDtabs() {}, dictNavButtons() {}, document: { documentElement: { dataset: { tab: 'dict' } } },
  openGForms: (...args) => calls.push(['greek', ...args]), openForms: (...args) => calls.push(['hebrew', ...args]),
});
vm.runInContext(part('  let lemByCons = null;', '  // Eigene Wörterbuchinstanz'), ctx);
const dictionaryUI = fs.readFileSync(path.join(__dirname, 'library-dictionary.js'), 'utf8');
ctx.getSelection = () => ctx.dictSel; ctx.getSource = () => ctx.dictSrc;
vm.runInContext(dictionaryUI.slice(dictionaryUI.indexOf('  function dictCardButtons('), dictionaryUI.indexOf('  const dictGoHist =')), ctx);

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'safran-grcard-'));
  try {
    const source = require('./tools/lsj/source.json'), id = source.dictionaryId;
    fs.writeFileSync(path.join(tmp, id + '.json'), zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'bundled/dict', id + '.json.gz'))));
    const dictionaries = new DSL.Dictionaries(tmp);
    ctx.O = { dictLookup: async (q, only) => ({ results: await dictionaries.lookup(q, { only }) }), dictList: async () => ({ list: await dictionaries.list() }) };
    for (const lemma of ['λόγος', 'θεός', 'ἄνθρωπος', 'ποιέω', 'ἀρχή', 'οὐρανός', 'βασιλεύς', 'κύριος']) {
      const results = await dictionaries.lookup(lemma, { only: id });
      const article = results.find(x => x.kind === 'exact' && x.head.split(' · ').includes(lemma));
      assert(article, 'LSJ-Artikel: ' + lemma);
      assert(GM.dictionaryLemmas(D, article.head).includes(lemma), 'Rückverbindung: ' + lemma);
      assert(GM.model(D, lemma).total > 0, 'belegte Wortkarte: ' + lemma);
    }
    assert.deepStrictEqual(GM.dictionaryLemmas(D, 'ΛΟΓΟΣ'), ['λόγος']);
    assert.deepStrictEqual(GM.dictionaryLemmas(D, 'λογοσ'), ['λόγος']);
    assert.deepStrictEqual(GM.dictionaryLemmas(D, 'λόγος · θεός'), ['λόγος', 'θεός']);
    assert.deepStrictEqual(GM.dictionaryLemmas(D, 'λόγος · ΛΟΓΟΣ'), ['λόγος']);
    for (const unknown of ['אב', 'not Greek', 'ἀβγδεζηθικλμνξοπρστυφχψω', 'λόγος θεός']) assert.deepStrictEqual(GM.dictionaryLemmas(D, unknown), [], unknown);
    await ctx.dictLookup('λόγος');
    assert($('#dictOut').innerHTML.includes('data-gl="λόγος"'), 'Lexikon zeigt Wortkarten-Knopf');
    await handlers.get('#dictOut:click')({ target: { closest: s => s === '.dwk' ? { dataset: { gl: 'λόγος' } } : null } });
    assert.deepStrictEqual(calls.pop(), ['greek', 'λόγος', null, 'card'], 'Knopf öffnet die griechische Wortkarte');
    assert(ctx.dictCardButtons('אָב', null).includes('data-ids="1"'), 'hebräischer Zugang erhalten');
    await handlers.get('#dictOut:click')({ target: { closest: () => ({ dataset: { ids: '1' } }) } });
    assert.deepStrictEqual(calls.pop(), ['hebrew', '1', null, 'card']);
    assert.strictEqual(ctx.dictCardButtons('ἀβγδεζηθικλμνξοπρστυφχψω', D), '', 'keine unbelegte Karte');

    // Der tatsächliche Wortkarten-Abschnitt lädt denselben Artikel zurück.
    ctx.fmCur = { lem: ['λόγος', 'word'], greek: true }; ctx.wcToken = 1;
    vm.runInContext(part('  async function wcDicts(token)', '  // Septuaginta: häufigste griechische Lemmata'), ctx);
    await ctx.wcDicts(1);
    assert($('#wcDict').innerHTML.includes('Liddell&amp;Scott') && $('#wcDict').innerHTML.includes('reckoning'));
    assert($('#wcDict').innerHTML.includes('class="wcDGo"') && !$('#fmHead .wdict').hidden);
    ctx.closeForms = () => {}; ctx.showTab = tab => calls.push(['tab', tab]);
    vm.runInContext(part("  $('#wcBody').addEventListener('click', e => {", "  $('#wcBody').addEventListener('keydown'"), ctx);
    const lookup = ctx.dictLookup; let navigation;
    ctx.dictLookup = (...args) => (navigation = lookup(...args));
    handlers.get('#wcBody:click')({ target: { closest: s => s === '.wcDGo' ? { dataset: { id, name: source.name } } : null } });
    // Der Handler startet den echten asynchronen dictLookup.
    await navigation;
    ctx.dictLookup = lookup;
    assert(calls.some(x => x[0] === 'tab' && x[1] === 'dict'));
    assert($('#dictOut').innerHTML.includes('data-gl="λόγος"'), 'Rundweg wieder im Lexikon');

    // Ein später geladener Formenindex darf eine neuere Suche nicht überschreiben.
    let release, started;
    const waiting = new Promise(resolve => { started = resolve; });
    ctx.loadGM = () => { started(); return new Promise(resolve => { release = resolve; }); };
    const slow = ctx.dictLookup('λόγος'); await waiting;
    await ctx.dictLookup('no-such-dictionary-headword');
    release(D); await slow;
    assert($('#dictOut').innerHTML.includes('no-such-dictionary-headword') && !$('#dictOut').innerHTML.includes('data-gl="λόγος"'));
    // Fehler beim Laden des Index lassen den Artikel weiterhin lesen.
    ctx.loadGM = async () => { throw new Error('index missing'); };
    await ctx.dictLookup('λόγος');
    assert($('#dictOut').innerHTML.includes('reckoning') && !$('#dictOut').innerHTML.includes('data-gl='));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  console.log('Griechische Wortkarten ↔ LSJ: echte Artikel, Knöpfe, beide Richtungen, Hebräisch und asynchrone Suche geprüft.');
})().catch(e => { console.error(e); process.exitCode = 1; });
