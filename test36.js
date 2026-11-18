// LXX-Wortkarte: Vorschau der tatsächlich gezählten Fassung statt hebräisch/deutschem Standard.
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const GM = require('./gmorph'), Links = require('./links');
const ui = require('./tests/reader-source.cjs')();
const main = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
const part = (s, from, to) => s.slice(s.indexOf(from), s.indexOf(to, s.indexOf(from)));
const ctx = vm.createContext({ window: { GMorph: GM }, console });
ctx.host = ctx;
vm.runInContext(fs.readFileSync(path.join(__dirname, 'lxx-morph.js'), 'utf8'), ctx);
const D = ctx.window.LXX_MORPH, mdl = GM.model(D, 'ἀδελφός');
const rs = GM.refsIn(D, mdl, 'Genesis'), reference = rs.find(r => r.ch === 25 && r.v === 18);
assert(reference && reference.vt, 'Fassung des im Screenshot gezeigten Belegs');
for (const r of GM.refs(D, mdl, mdl.forms.map((_, i) => i).join(','))) {
  assert(D.B.some(b => GM.bookId(b) === r.book && b[1] === r.vt), 'genaue Fassung: ' + r.book);
}
Object.assign(ctx, { fmCur: { greek: true, lemma: 'ἀδελφός' }, fmTrData: null, fmTrCur: () => 'off', wcTrLive: () => null,
  WC_TR_VT: { LXX: /^Septuaginta/ }, WC_TR_LABEL: { LXX: 'Septuaginta' }, IL_VT: {}, I18N: { lang: 'de', t: s => s },
  esc: s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'), fmBook: s => s, wcNum: n => String(n),
});
vm.runInContext(part(ui, '  function wcHovPick(a)', '  const WC_TR_PIC'), ctx);
vm.runInContext(part(ui, '  function wcRefList(rs, head, all)', '  function wcBookRefs'), ctx);
const anchor = { dataset: { gvt: reference.vt }, closest: s => ['.fmRL', '#wcBody'].includes(s) ? {} : null, getBoundingClientRect: () => ({ left: 400, right: 420, top: 200, bottom: 220 }) };
const pick = ctx.wcHovPick(anchor);
assert(new RegExp(pick.vt).test(reference.vt));
assert(!new RegExp(pick.vt).test(reference.vt + ' alternative'));
assert.strictEqual(pick.greek, 'ἀδελφός');
assert(ctx.wcRefList([reference], '', false).includes('data-gvt='));
for (const b of D.B.filter(b => b[2])) {
  const selected = ctx.wcHovPick({ dataset: { gvt: b[1] }, closest: () => ({}) });
  assert(new RegExp(selected.vt).test(b[1]), 'Fassungsname einschließlich Sonderzeichen: ' + b[1]);
  assert(!new RegExp(selected.vt).test(b[1] + 'x'));
}
ctx.fmCur = { greek: false, lemma: '251' };
assert.strictEqual(ctx.wcHovPick(anchor).lem, '251', 'hebräische Markierung unverändert');
ctx.fmCur = { greek: true, lemma: 'ἀδελφός' };

// Tatsächlichen IPC-Vorschaucode mit den mitgelieferten Textdateien ausführen.
const manifest = require('./bundled/manifest.json').items;
const entries = manifest.filter(x => x.title === 'Genesis' && (x.versionTitle === reference.vt || x.kind === 'he' || /Zunz/.test(x.versionTitle)));
let previewHandler;
const server = vm.createContext({ ipcMain: { handle: (_, fn) => { previewHandler = fn; } }, LK: Links, heRank: vt => /Westminster/.test(vt) ? 0 : 1,
  getLibrary: async () => ({ list: () => entries, read: async rel => JSON.parse(fs.readFileSync(path.join(__dirname, 'bundled', rel), 'utf8')) }) });
vm.runInContext(part(main, "ipcMain.handle('links:preview'", '// Export eines Abschnitts'), server);
let callback, requested, highlighted;
const box = { style: {}, hidden: true, offsetWidth: 300, offsetHeight: 200, isConnected: true };
Object.assign(ctx, { box, disp: {}, hov: box, hovRef: null, hovT: null, pvCache: new Map(),
  setTimeout: fn => { callback = fn; return 1; }, hideHov: () => { ctx.hovRef = null; },
  LK: { preview: async (...args) => { requested = args; return previewHandler(null, ...args); } },
  R: { cleanHtml: s => s, splitFootnotes: s => ({ main: s }) }, stripHe: s => s,
  pvVer: s => `<i>${s}</i>`, pvMark() {}, pvMarkGreek: (...args) => { highlighted = args; },
  versNote: () => '', document: {},
});
ctx.window.innerWidth = 1200; ctx.window.innerHeight = 800;
vm.runInContext(part(ui, '    const startHov =', '    hovApi =') + '\nthis.start = startHov;', ctx);
(async () => {
  ctx.start(anchor, 'Genesis 25:18', true, false, pick); await callback();
  assert.deepStrictEqual(Array.from(requested[1]), ['other'], 'griechischer Beleg wählt LXX als Vorschautext');
  assert(box.innerHTML.includes(reference.vt) && /ἀδελφ/.test(box.innerHTML));
  assert(!box.innerHTML.includes('Westminster') && !box.innerHTML.includes('Zunz'), 'keine allgemeine hebräisch-deutsche Vorschau');
  assert.strictEqual(highlighted[2], 'ἀδελφός', 'griechisches Lemma wird markiert');
  // Gleicher Vers und gleiche Fassung in einer hebräischen Karte: eigener Cache-Eintrag.
  ctx.start(anchor, 'Genesis 25:18', true, false, { vt: pick.vt, lem: '251' }); await callback();
  assert.deepStrictEqual(Array.from(requested[1]), ['he', 'de']);
  assert(box.innerHTML.includes('Westminster'), 'hebräische Wortkarte behält ihre Vorschau');

  // Die Hervorhebung nimmt die Morphologie der genauen LXX-Fassung und alle passenden Formen.
  const html = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundled', entries.find(x => x.versionTitle === reference.vt).rel), 'utf8')).text[24][17];
  const words = GM.words(html), bi = GM.bookIndex(D, 'Genesis', reference.vt), toks = GM.verse(D, bi, 25, 18);
  const expected = toks.flatMap((t, i) => t && GM.info(D, t.id).lemma === 'ἀδελφός' ? [i] : []);
  assert(expected.length > 0);
  const marked = [], paragraph = { dataset: { vt: reference.vt } };
  Object.assign(ctx, { loadGM: async () => D, hovRef: 'Genesis 25:18',
    document: { createElement: () => ({ append: i => marked.push(i) }) },
    greekWordAt: () => ({ words: words.map(t => ({ t })), range: i => ({ extractContents: () => i, insertNode() {} }) }),
  });
  vm.runInContext(part(ui, '    const pvMarkGreek =', '    const startHov =') + '\nthis.markGreek = pvMarkGreek;', ctx);
  await ctx.markGreek({ isConnected: true, querySelectorAll: () => [paragraph] }, 'Genesis 25:18', 'ἀδελφός');
  assert.deepStrictEqual(marked.sort((a, b) => a - b), expected);
  marked.length = 0;
  ctx.greekWordAt = () => ({ words: [{ t: 'falscher Text' }] });
  await ctx.markGreek({ isConnected: true, querySelectorAll: () => [paragraph] }, 'Genesis 25:18', 'ἀδελφός');
  assert.strictEqual(marked.length, 0, 'abweichender Text bleibt unmarkiert');
  console.log('LXX-Vorschau: Genesis 25:18, genaue Fassung, griechische Markierung, Cache und hebräische Vorschau geprüft.');
})().catch(e => { console.error(e); process.exitCode = 1; });
