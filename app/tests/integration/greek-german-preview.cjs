// Regression: griechische Karte Exodus 15:21 + zusätzliche deutsche Vorschau folgt Zunz.
'use strict';
const repoRoot = require('node:path').resolve(__dirname, '../..');
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const G = require('../../gmorph'), Links = require('../../links');
const ui = require('../reader-source.cjs')() + fs.readFileSync(path.join(repoRoot, 'library-word-popup.js'), 'utf8'), main = fs.readFileSync(path.join(repoRoot, 'main.js'), 'utf8');
const part = (s, a, b) => { const start = s.indexOf(a), end = s.indexOf(b, start); assert(start >= 0 && end > start); return s.slice(start, end); };
const ctx = vm.createContext({ window: { GMorph: G } });
ctx.host = ctx;
vm.runInContext(fs.readFileSync(path.join(repoRoot, 'lxx-morph.js'), 'utf8'), ctx);
const D = ctx.window.LXX_MORPH, items = require('../../bundled/manifest.json').items.filter(x => x.title === 'Exodus');
const lxx = items.find(x => x.versionTitle === 'Septuaginta (CATSS)'), zunz = items.find(x => /Zunz/.test(x.versionTitle));
const hirsch = items.find(x => /Hirsch/.test(x.versionTitle)), bernfeld = { ...hirsch, versionTitle: 'Die Heilige Schrift, übersetzt von Simon Bernfeld' };
const catalogue = [bernfeld, hirsch, zunz, lxx]; let preview;
const server = vm.createContext({ LK: Links, heRank: () => 0, ipcMain: { handle: (_, fn) => { preview = fn; } }, getLibrary: async () => ({
  list: () => catalogue, read: async rel => JSON.parse(fs.readFileSync(path.join(repoRoot, 'bundled', rel), 'utf8')),
}) });
vm.runInContext(part(main, "ipcMain.handle('links:preview'", '// Export eines Abschnitts'), server);
(async () => {
  for (const de of ['', zunz.versionTitle]) {
    const r = await preview(null, 'Exodus 15:21', ['other'], { vt: '^Septuaginta \\(CATSS\\)$' }, { de, x: '@de' });
    assert.strictEqual(r.parts[0].versionTitle, lxx.versionTitle);
    assert.strictEqual(r.parts[1].versionTitle, zunz.versionTitle, 'deutsche Zusatzvorschau folgt Zunz');
  }
  const specific = await preview(null, 'Exodus 15:21', ['other'], { vt: '^Septuaginta \\(CATSS\\)$' }, { de: zunz.versionTitle, x: hirsch.versionTitle });
  assert.strictEqual(specific.parts[1].versionTitle, hirsch.versionTitle, 'explizite zusätzliche Fassung bleibt verbindlich');
  const first = await preview(null, 'Exodus 15:21', ['other'], { vt: '^Septuaginta \\(CATSS\\)$' }, { de: '*', x: '@de' });
  assert.strictEqual(first.parts[1].versionTitle, bernfeld.versionTitle, 'bewusst erste vorhandene Fassung');
  assert(G.sameForm('ᾄσωμεν', 'αἴσωμεν'));
  assert(!G.sameForm('ᾄσωμεν', 'λέγουσα'));
  const html = JSON.parse(fs.readFileSync(path.join(repoRoot, 'bundled', lxx.rel), 'utf8')).text[14][20];
  const plainNodes = html.split(/<[^>]*>/).filter(Boolean).map(nodeValue => ({ nodeType: 3, nodeValue, parentElement: { closest: () => null } }));
  const root = { querySelector: () => null, nodes: plainNodes, dataset: { vt: lxx.versionTitle } }, marked = [];
  Object.assign(ctx, { loadGM: async () => D, hovRef: 'Exodus 15:21', NodeFilter: { SHOW_TEXT: 4 }, document: {
    createTreeWalker: el => { let i = 0; return { nextNode: () => el.nodes[i++] || null }; },
    createElement: () => ({ append(fragment) { this.textContent = fragment.textContent; } }),
    createRange: () => { let a, b, start, end; return {
      setStart(n, i) { a = n; start = i; }, setEnd(n, i) { b = n; end = i; },
      extractContents() { assert.strictEqual(a, b); return { textContent: a.nodeValue.slice(start, end) }; },
      insertNode(mark) { marked.push(mark); },
    }; },
  } });
  // Echte Wortzählung und Bereichsauswahl aus dem Renderer, kein Ersatz für greekWordAt.
  vm.runInContext(part(ui, '  function greekWordAt(', '  async function showGreekWord'), ctx);
  vm.runInContext(part(ui, '    const pvMarkGreek =', '    const startHov =') + '\nthis.markGreek = pvMarkGreek;', ctx);
  const box = { isConnected: true, querySelectorAll: () => [root] };
  await ctx.markGreek(box, 'Exodus 15:21', 'ᾄδω');
  assert.deepStrictEqual(marked.map(x => x.textContent), ['αἴσωμεν']);
  assert(marked.every(x => x.className === 'pvhl'));
  marked.length = 0;
  // Ein anderer Unterschied im Vers darf die konkret passende Zielform nicht blockieren.
  plainNodes[0].nodeValue = plainNodes[0].nodeValue.replace('ἐξῆρχεν', 'ἔρχεται');
  await ctx.markGreek(box, 'Exodus 15:21', 'ᾄδω');
  assert.deepStrictEqual(marked.map(x => x.textContent), ['αἴσωμεν']);
  console.log('Vorschau: Zunz statt zufälliger Zusatzfassung; αἴσωμεν in Exodus 15:21 mit echtem Renderer markiert.');
})().catch(e => { console.error(e); process.exitCode = 1; });
