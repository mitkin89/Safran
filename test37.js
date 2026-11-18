// Targum-Karten: vollständiger Vergleich des Formenindexes mit allen 15 Quellfassungen und UI-Rundweg zu Levy.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto'), os = require('os'), zlib = require('zlib');
const F = require('./targum-forms-core'), DSL = require('./dsl');
const ctx = vm.createContext({ window: { TargumForms: F, OSHB_LEMMAS: { '1': ['אמר', 'Hebrew homograph'] } }, console });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'targum-forms.js'), 'utf8'), ctx);
const D = ctx.window.TARGUM_FORMS;
const source = require('./tools/targum/forms-source.json');
vm.runInContext(fs.readFileSync(path.join(__dirname, 'targum-lex.js'), 'utf8'), ctx);
const lexemes = ctx.window.TARGUM_LEX;
const counts = new Map(); let total = 0;
for (let bi = 0; bi < source.sources.length; bi++) {
  const item = source.sources[bi], raw = fs.readFileSync(path.join(__dirname, item.rel));
  assert.strictEqual(crypto.createHash('sha1').update(raw).digest('hex'), item.sha1, 'Quellfassung geändert: ' + item.rel);
  const data = JSON.parse(raw);
  assert.strictEqual(data.versionTitle, D.B[bi][1]);
  data.text.forEach((ch, ci) => ch.forEach((html, vi) => {
    for (const m of String(html || '').matchAll(/<span class="wt" data-l="([0-9a-f]+)" data-m="([^"]*)">([^<]*)<\/span>/g)) {
      if (!(lexemes[m[1]] || [''])[0]) continue;
      assert(D.L[m[1]], 'belegtes Lexem fehlt: ' + m[1]);
      const key = JSON.stringify([m[1], m[3], m[2], bi * 1000000 + (ci + 1) * 1000 + vi + 1]);
      counts.set(key, (counts.get(key) || 0) + 1); total++;
    }
  }));
}
let indexed = 0;
for (const id of Object.keys(D.L)) {
  const model = F.model(D, id);
  indexed += model.total;
  for (const form of model.forms) for (const code of form.refs) {
    const key = JSON.stringify([id, form.f, form.key, code]), n = counts.get(key);
    assert(n > 0, 'Indexform nicht in Quelle belegt: ' + key);
    if (n === 1) counts.delete(key); else counts.set(key, n - 1);
  }
  assert(F.dist(D, model).every(b => b.size > 0 && b.verses <= b.size), 'Verteilung pro 1000 Verse');
  assert.strictEqual(F.dist(D, model).reduce((n, b) => n + b.n, 0), model.total);
}
assert.strictEqual(counts.size, 0, 'alle bestimmten Quellwörter erfasst');
assert.strictEqual(indexed, total); assert.strictEqual(total, source.tokens);
assert.strictEqual(total, 379419);
assert.strictEqual(F.dictionaryLemmas(D, 'אמר').length, 4, 'gleich geschriebene Lexeme nicht zusammengelegt');
assert.strictEqual(F.dictionaryLemmas(D, 'שמין')[0], '6', 'Endbuchstaben');
assert.deepStrictEqual(F.dictionaryLemmas(D, 'abcdefghijkl'), []);
assert.strictEqual(F.dictionaryLemmas(D, 'ארע')[0], '8');
const model = F.model(D, '8');
assert.strictEqual(F.dist(D, model).length, 15);
assert(F.dist(D, model).filter(x => x.n).length > 5);
assert(F.refsIn(D, model, 'Genesis (Onkelos)').every(r => /Onkelos/.test(r.vt)));
assert(F.render(model).includes('lang="arc"') && F.render(model).includes('data-i='));

const ui = fs.readFileSync(path.join(__dirname, 'library.js'), 'utf8');
const part = (from, to) => { const start = ui.indexOf(from), end = ui.indexOf(to, start); assert(start >= 0 && end > start, from + ' … ' + to); return ui.slice(start, end); };
const nodes = new Map(), handlers = new Map(), calls = [];
const node = () => ({ innerHTML: '', hidden: true, dataset: {}, style: {}, value: '', scrollTop: 0, querySelector: () => null, classList: { toggle() {}, contains: () => false }, addEventListener() {}, scrollIntoView() {} });
const $ = sel => { if (!nodes.has(sel)) nodes.set(sel, { ...node(), addEventListener: (event, fn) => handlers.set(sel + ':' + event, fn) }); return nodes.get(sel); };
Object.assign(ctx, { $, $$: () => [], esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
  I18N: { t: (s, ...args) => s.replace(/\{\}/g, () => args.shift()), lang: 'de', loc: 'de-DE' },
  lemByCons: null, heFix: s => s, portraitOf: () => null, fmCur: null, wcToken: 0, fmRest: null, fmShowTab() {}, fmRestBase() {},
  fmHistOpen: (...args) => calls.push(['history', ...args]), lazyScript: async () => D,
  dictSel: null, dictOnly: null, dictSrc: null, dictHist: [], dictPos: -1, dictShown: [], dtabs: [{}], dcur: 0,
  renderDtabs() {}, dictNavButtons() {}, document: { documentElement: { dataset: { tab: 'dict' } } },
  fmBook: s => s, closeForms() {}, openForms() { throw new Error('Keine hebräische Karte für Levy-Targum!'); },
});
vm.runInContext(part('  let targumFormsP =', '  // Belegstellen als Zeilen'), ctx);
vm.runInContext(part('  async function wcDicts(token)', '  // Septuaginta: häufigste griechische Lemmata'), ctx);
vm.runInContext(part('  let lemByCons = null;', '  // Eigene Wörterbuchinstanz'), ctx);
const dictionaryUI = fs.readFileSync(path.join(__dirname, 'library-dictionary.js'), 'utf8');
ctx.getSelection = () => ctx.dictSel; ctx.getSource = () => ctx.dictSrc;
vm.runInContext(dictionaryUI.slice(dictionaryUI.indexOf('  function dictCardButtons('), dictionaryUI.indexOf('  const dictGoHist =')), ctx);
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'safran-tgcard-'));
  try {
    const id = '9ce7ea6c00f1';
    fs.writeFileSync(path.join(tmp, id + '.json'), zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'bundled/dict', id + '.json.gz'))));
    const ds = new DSL.Dictionaries(tmp);
    ctx.O = { dictLookup: async (q, only) => ({ results: await ds.lookup(q, { only }) }), dictList: async () => ({ list: await ds.list() }) };
    const wcDicts = ctx.wcDicts; let dictionaryReady;
    ctx.wcDicts = (...args) => (dictionaryReady = wcDicts(...args));
    await ctx.openTForms('8', null, 'card'); await dictionaryReady;
    assert.strictEqual(ctx.fmCur.lemma, 'tg:8');
    assert.strictEqual(ctx.fmCur.targum, '8');
    assert($('#wcBody').innerHTML.includes('Verteilung in den Targumim'));
    assert($('#wcBody').innerHTML.includes('Pseudo-Jonathan'));
    assert($('#fmBody').innerHTML.includes('data-i='));
    assert($('#wcDict').innerHTML.includes('Levy, Targumim-Wörterbuch'));
    assert(calls.some(c => c[0] === 'history' && c[2] === 'tg:8' && c[3].targum));
    await ctx.dictLookup('אמר');
    const html = $('#dictOut').innerHTML;
    assert(html.includes('data-tl="1a"') && html.includes('data-tl="506"'), 'Levy zeigt getrennte Zugänge');
    assert(!html.includes('data-ids='), 'kein hebräischer Ersatz bei gleicher Schreibung');
    const open = ctx.openTForms; let navigation;
    ctx.openTForms = (...args) => (navigation = open(...args));
    await handlers.get('#dictOut:click')({ target: { closest: () => ({ dataset: { tl: '1a' } }) } });
    await navigation; await dictionaryReady;
    assert.strictEqual(ctx.fmCur.lemma, 'tg:1a');
    assert($('#fmHead').innerHTML.includes('to say, command, speak'));
    // Selbst bei vielen Treffern in anderen Wörterbüchern bleibt Levy erreichbar.
    const realLookup = ctx.O.dictLookup;
    ctx.O.dictLookup = async (q, only) => only ? realLookup(q, only) : ({ results: [{ dictId: 'other', k: 0, dict: 'Other', head: 'אמר', html: 'other' }] });
    await ctx.wcDicts(ctx.wcToken);
    assert($('#wcDict').innerHTML.includes('Levy, Targumim-Wörterbuch'));
    ctx.dictSel = ['other'];
    await ctx.wcDicts(ctx.wcToken);
    assert(!$('#wcDict').innerHTML.includes('Levy, Targumim-Wörterbuch'), 'Wörterbuchauswahl respektieren');
    ctx.dictSel = null; ctx.O.dictLookup = realLookup;
    const count = ctx.wcToken;
    await ctx.openTForms('missing', null, 'forms');
    assert(ctx.wcToken > count && $('#wcBody').innerHTML.includes('keine Formen'));
    // Targum-Wortpopup -> dieselbe Karte über die exakte Corpus-ID.
    let popup;
    ctx.document = { ...ctx.document, body: { appendChild: p => { popup = p; } }, createElement: () => ({ ...node(), offsetWidth: 200, offsetHeight: 100 }) };
    ctx.window.innerWidth = 1200; ctx.window.innerHeight = 900; ctx.closeWpop = () => {};
    vm.runInContext(part('  const T_SP =', '  // Qumran (ETCBC DSS)'), ctx);
    const attested = D.L['1a'][1][0];
    ctx.showTargumWord({ dataset: { l: '1a', m: attested[1] }, textContent: attested[0], classList: { add() {} }, getBoundingClientRect: () => ({ left: 200, right: 220, width: 20, top: 100, bottom: 120 }) });
    assert(popup.innerHTML.includes('class="wforms wtcard"') && popup.innerHTML.includes('data-tl="1a"'));
    popup.onclick({ target: { closest: selector => selector === '.wtcard, .wttable' ? { dataset: { tl: '1a' }, classList: { contains: () => false } } : null } });
    await navigation; await dictionaryReady;
    assert.strictEqual(ctx.fmCur.targum, '1a');
    assert($('#fmBody').innerHTML.includes('fmF cur'), 'angeklickte Wortform in der Tabelle hervorgehoben');
    // Aramäische Karten behalten beim Zurück/Vor ihre eigene Sprachidentität.
    ctx.fmHist = [{ lemma: 'tg:1a', info: { targum: true }, tab: 'forms', scroll: 0 }, { lemma: '1', greek: false }];
    ctx.fmHi = 1; ctx.fmCur = null; ctx.fmHistSave = () => {}; ctx.fmHistUI = () => {}; ctx.hovApi = null;
    ctx.fmShowTab = tab => { ctx.fmTab = tab; };
    vm.runInContext(part('  function fmHistGo(d)', "  $('#fmBack').onclick"), ctx);
    ctx.fmHistGo(-1); await navigation; await dictionaryReady;
    assert.strictEqual(ctx.fmCur.lemma, 'tg:1a'); assert.strictEqual(ctx.fmTab, 'forms');
    // Vorschau des Belegs wählt den konkreten Targum statt Westminster.
    Object.assign(ctx, { fmCur: { targum: '8', lemma: 'tg:8' }, WC_TR_VT: {}, WC_TR_LABEL: {}, IL_VT: {} });
    vm.runInContext(part('  function wcHovPick(a)', '  const WC_TR_PIC'), ctx);
    const vt = D.B[0][1], pick = ctx.wcHovPick({ dataset: { gvt: vt }, closest: () => ({}) });
    assert(new RegExp(pick.vt).test(vt) && pick.rtl && pick.targum === '8');
    assert(!new RegExp(pick.vt).test(vt + ' alternative'));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  console.log(`Targum-Wortkarten ↔ Levy: ${total} Quellwörter vollständig verglichen; Formen, Belege, Homonyme, beide Zugänge und Vorschau geprüft.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
