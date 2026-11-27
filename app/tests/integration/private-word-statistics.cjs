// Wortkartenstatistiken: synthetische Daten, kein privater Übersetzungstext.
const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const vm = require('vm');
const P = require('../../private-interlinear');
const copy = x => JSON.parse(JSON.stringify(x));
const alignment = { BuberRosenzweig: { Genesis: { '1:1': [[[1], 'Alpha.']], '1:2': [[[1], 'Beta.']] } } };
const stats = { books: P.BOOKS, tr: { BuberRosenzweig: { '1': [[['test', ['alpha', 1], ['beta', 1]]], [[0, 'HNcmsa', 2, (1001).toString(36) + '.1', 'alpha']], { HNcmsa: { synthetic: [2, 2, [['alpha', 1, 0], ['beta', 1, 0]]] } }] } } };
const bundle = { ...alignment, renderings: stats };
const entries = [{ title: 'Genesis', versionTitle: 'Martin Buber und Franz Rosenzweig', rel: 'de' }, { title: 'Genesis', versionTitle: 'Westminster Test', rel: 'he' }];
const docs = { de: { text: [['Alpha.', 'Beta.']] }, he: { text: [['<span class="w">א</span>', '<span class="w">ב</span>']] } };
const lib = { list: () => entries, read: async rel => docs[rel] };
(async () => {
  assert.deepStrictEqual(P.validate(bundle), bundle);
  // Umfang eines vollständigen Korpus: viele Lemmata und Formen, nur künstliche Wiedergaben.
  const corpusEntry = copy(stats.tr.BuberRosenzweig['1']);
  const formRow = corpusEntry[2].HNcmsa.synthetic;
  corpusEntry[2].HNcmsa = Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['form' + i, formRow]));
  const corpus = { ...alignment, renderings: { books: P.BOOKS, tr: {
    BuberRosenzweig: Object.fromEntries(Array.from({ length: 8000 }, (_, i) => [String(i + 1), corpusEntry])),
  } } };
  assert.equal(Object.keys(P.validate(corpus).renderings.tr.BuberRosenzweig).length, 8000);
  // Auch mit höherer Grenze bleibt übermäßiger Aufwand abgewiesen.
  corpusEntry[2].HNcmsa = Object.fromEntries(Array.from({ length: 50 }, (_, i) => ['form' + i, formRow]));
  assert.throws(() => P.validate(corpus), /Wortkartenstatistik/);
  for (const mutate of [
    x => x.renderings.books.reverse(),
    x => { x.renderings.tr.Zunz = {}; },
    x => { x.renderings.tr.BuberRosenzweig['1'][1][0][0] = 4; },
    x => { x.renderings.tr.BuberRosenzweig['1'][1][0][3] = (1003).toString(36) + '.1'; },
    x => { x.renderings.tr.BuberRosenzweig['1'][1][0][2] = 3; },
    x => { x.renderings.tr.BuberRosenzweig['1'][2].HNcmsa.synthetic[2][0][2] = 9; },
  ]) { const bad = copy(bundle); mutate(bad); assert.throws(() => P.validate(bad), /Wortkartenstatistik/); }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'safran-ren-'));
  try {
    const file = path.join(dir, 'private.json'), store = new P.PrivateInterlinear(file, async () => lib);
    await store.import(bundle);
    assert.deepStrictEqual((await new P.PrivateInterlinear(file, async () => lib).read()).renderings, stats);
    docs.de.text[0][0] = 'Changed.';
    assert.strictEqual((await store.read()).renderings, null);
    docs.de.text[0][0] = 'Alpha.';
    await store.import(alignment); // neuer Zuordnungsstand ohne Statistik entfernt den alten Stand
    assert.strictEqual((await store.read()).renderings, null);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
  const js = require('../reader-source.cjs')();
  const start = js.indexOf('  const loadIlRen ='), end = js.indexOf('  const WC_TR_DE', start);
  const built = { books: [...P.BOOKS], tr: { Zunz: {} } };
  const ctx = { ilRenP: null, ilRevision: 0, ilPrivateRen: stats, window: {}, loadIL: async () => {}, lazyScript: async () => built };
  ctx.host = ctx;
  vm.runInNewContext(js.slice(start, end) + '\nglobalThis.ren = loadIlRen;', ctx);
  assert((await ctx.ren()).tr.Zunz);
  assert.equal(Object.keys((await ctx.ren()).tr.BuberRosenzweig).length, 1);
  const srcStart = js.indexOf('  async function wcTrSources('), srcEnd = js.indexOf('  async function wcTrans(', srcStart);
  Object.assign(ctx, { loadIlRen: ctx.ren, loadLxxRen: async () => null, loadTgRen: async () => null, loadQRen: async () => null, WC_TR_LABEL: { Zunz: 'Zunz', BuberRosenzweig: 'Buber/Rosenzweig' } });
  vm.runInNewContext(js.slice(srcStart, srcEnd) + '\nglobalThis.sources = wcTrSources;', ctx);
  const sources = await ctx.sources('1');
  assert(sources.keys.includes('BuberRosenzweig'));
  assert.equal(sources.src.BuberRosenzweig.total, 2);
  ctx.ilPrivateRen = null; ctx.ilRenP = null;
  assert(!(await ctx.ren()).tr.BuberRosenzweig);
  assert((await ctx.ren()).tr.Zunz);
  console.log('Private Wortkartenstatistik-Tests bestanden.');
})().catch(err => { console.error(err); process.exit(1); });
