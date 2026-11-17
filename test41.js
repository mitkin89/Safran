// Greek hover -> CATSS group -> Westminster occurrence -> German alignment.
'use strict';
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const G = require('./gmorph');
const ui = fs.readFileSync('library.js', 'utf8');
const part = (a, b) => ui.slice(ui.indexOf(a), ui.indexOf(b, ui.indexOf(a)));
const ctx = vm.createContext({ window: { GMorph: G } });
vm.runInContext(fs.readFileSync('lxx-morph.js', 'utf8'), ctx);
const manifest = require('./bundled/manifest.json').items.filter(x => x.title === 'Genesis');
const read = re => JSON.parse(fs.readFileSync('bundled/' + manifest.find(x => re.test(x.versionTitle)).rel, 'utf8')).text[30][24];
const html = read(/^Septuaginta \(CATSS\)$/), he = read(/Westminster/);
const groups = [...html.matchAll(/<span class="wg([^"]*)" data-h="([^"]*)"[^>]*>(.*?)<\/span>/g)].map(m => ({
  dataset: { h: m[2] }, textContent: m[3].replace(/<[^>]*>/g, ''), classList: { contains: n => m[1].split(/\s+/).includes(n) },
}));
const words = [...he.matchAll(/<span class="w" data-l="([^"]*)"[^>]*>([^<]*)/g)].map(m => ({ lem: m[1].split('/').find(x => /\d/.test(x)), he: m[2] }));
assert.strictEqual(words.length, 15);
const nodes = groups.map(g => ({ nodeValue: g.textContent, parentElement: { closest: selector => selector === '.wg[data-h]' ? g : null } }));
// Preserve the spaces between CATSS groups for the real renderer's word ranges.
const allNodes = nodes.flatMap(n => [n, { nodeValue: ' ', parentElement: { closest: () => null } }]);
const greek = { dataset: { vt: 'Septuaginta (CATSS)' }, querySelector: () => null, contains: g => groups.includes(g), querySelectorAll: () => groups, nodes: allNodes };
const tagged = [], german = { dataset: { vt: 'Philippson' }, children: [{}], firstElementChild: { classList: { add() {} } }, querySelectorAll: () => tagged };
const line = fs.readFileSync('tools/interlinear/philippson/Genesis.txt', 'utf8').split('\n').find(x => x.startsWith('31:25\t'));
const segments = line.split('\t')[1].split(' | ').map(x => { const i = x.indexOf(':'); return [x.slice(0, i).split(',').map(Number), x.slice(i + 1)]; });
let marks = [], release;
Object.assign(ctx, {
  consOf: s => s.replace(/[^\u05D0-\u05EA]/g, '').replace(/[ךםןףץ]/g, c => 'כמנפצ'['ךםןףץ'.indexOf(c)]),
  loadGM: async () => ctx.window.LXX_MORPH, hovRef: 'Genesis 31:25',
  loadIL: async () => ({ philippson: { Genesis: { '31:25': segments } } }),
  wcVerseWords: new Map([['Genesis 31:25', words]]), wcTrCtxLoad: async () => {},
  ilName: vt => vt === 'Philippson' ? 'philippson' : null,
  ilTagCell: (_, segs) => { tagged.splice(0); for (const [idx, text] of segs) tagged.push({ text, dataset: { ix: idx.join(',') }, classList: { add() { marks.push(text); } } }); },
  NodeFilter: { SHOW_TEXT: 4 }, document: {
    createTreeWalker: el => { let i = 0; return { nextNode: () => el.nodes[i++] || null }; },
    createElement: () => ({ append() {} }),
    createRange: () => { let node; return { setStart(n) { node = n; this.startContainer = n; }, setEnd() {}, extractContents: () => ({}), insertNode() {} }; },
  },
});
vm.runInContext(part('  function ilLxxIndices(', '  function ilLxxSegs('), ctx);
vm.runInContext(part('  function greekWordAt(', '  async function showGreekWord'), ctx);
vm.runInContext(part('    const pvMarkGreek =', '    const startHov =') + '\nthis.markGreek = pvMarkGreek;', ctx);
const box = { isConnected: true, querySelectorAll: () => [greek, german] };
(async () => {
  // The two identical תקע groups must retain their separate occurrences.
  const mapped = ctx.ilLxxIndices(words.map(w => w.he), groups);
  assert.strictEqual(mapped.get(groups[4]).join(','), '6');
  assert.strictEqual(mapped.get(groups[8]).join(','), '11');
  assert.strictEqual(mapped.get(groups[9]).join(','), '12,13');
  await ctx.markGreek(box, 'Genesis 31:25', 'ἀδελφός');
  assert.deepStrictEqual(marks, ['mit', 'seinen Brüdern']);
  // A popup replaced during the extra asynchronous load must stay untouched.
  marks = [];
  ctx.wcTrCtxLoad = () => new Promise(resolve => { release = resolve; });
  const pending = ctx.markGreek(box, 'Genesis 31:25', 'ἀδελφός');
  await new Promise(resolve => setImmediate(resolve));
  ctx.hovRef = 'Genesis 31:26'; release(); await pending;
  assert.deepStrictEqual(marks, []);
  console.log('Greek hover: actual Genesis 31:25 marks Philippson „seinen Brüdern“; repeated Hebrew occurrences and stale popup checked.');
})().catch(e => { console.error(e); process.exitCode = 1; });
