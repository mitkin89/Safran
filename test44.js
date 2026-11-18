// Vollständige Bavli-Klickwege: HTML-Bereinigung, normale Leseausgabe und modale Wortzuordnung.
'use strict';
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const B = require('./bavli-core'), D = require('./bavli-morph'), M = require('./morph');
const IL = require('./bavli-il-data'), source = require('./tools/bavli/berakhot/source.json');
class Element {
  constructor(tag = 'div', text = '') { this.tagName = tag; this._text = text; this.children = []; this.dataset = {}; this.style = {}; this.handlers = {}; this.className = ''; this.open = false; this.classList = { contains: x => this.className.split(' ').includes(x), add: x => { if (!this.classList.contains(x)) this.className += ' ' + x; }, remove: x => { this.className = this.className.split(' ').filter(c => c !== x).join(' '); }, toggle: (x, on) => { const yes = on == null ? !this.classList.contains(x) : on; this.classList[yes ? 'add' : 'remove'](x); return yes; } }; }
  get textContent() { return this._text + this.children.map(n => n.textContent).join(''); }
  set textContent(t) { this._text = t; this.children = []; }
  get data() { return this._text; } set data(t) { this._text = t; }
  get firstChild() { return this.children[0] || null; }
  get isConnected() { return this.tagName === 'body' || !!this.parentElement?.isConnected; }
  append(...nodes) { nodes.forEach(n => this.appendChild(typeof n === 'string' ? new Element('#text', n) : n)); }
  appendChild(n) { n.remove(); n.parentElement = this; this.children.push(n); return n; }
  replaceChildren(...nodes) { this.children.forEach(n => { n.parentElement = null; }); this.children = []; this._text = ''; this.append(...nodes); }
  remove() { if (this.parentElement) { const p = this.parentElement; p.children = p.children.filter(n => n !== this); this.parentElement = null; } }
  replaceWith(n) { const p = this.parentElement, i = p.children.indexOf(this); p.children[i] = n; n.parentElement = p; this.parentElement = null; }
  splitText(i) { const n = new Element('#text', this.data.slice(i)); this.data = this.data.slice(0, i); const p = this.parentElement; p.children.splice(p.children.indexOf(this) + 1, 0, n); n.parentElement = p; return n; }
  contains(n) { return n === this || this.children.some(c => c.contains(n)); }
  setAttribute(k, v) { this[k] = v; }
  addEventListener(k, fn) { this.handlers[k] = fn; }
  showModal() { this.open = true; }
  close() { this.open = false; this.handlers.close?.(); }
  matches(s) { if (s === 'dialog[open]') return this.tagName === 'dialog' && this.open; if (s === 'sup') return this.tagName === 'sup'; if (s.startsWith('.')) return this.classList.contains(s.slice(1).split('[')[0]); if (s === '[data-anchor]') return this.dataset.anchor != null; if (s === '[data-group]') return this.dataset.group != null; return false; }
  closest(s) { if (s.split(',').some(x => this.matches(x.trim()))) return this; return this.parentElement?.closest(s) || null; }
  querySelectorAll(s) { return this.children.flatMap(c => [...(s.split(',').some(x => c.matches(x.trim())) ? [c] : []), ...c.querySelectorAll(s)]); }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  getBoundingClientRect() { return { left: 50, top: 20, bottom: 45, width: 50 }; }
  get offsetWidth() { return 300; } get offsetHeight() { return 400; }
}
const body = new Element('body'), document = {
  body, createElement: t => new Element(t), createTextNode: t => new Element('#text', t),
  getElementById: id => { const scan = n => n.id === id ? n : n.children.map(scan).find(Boolean); return scan(body) || null; },
  createTreeWalker: root => { const walk = n => n.children.flatMap(c => c.tagName === '#text' ? [c] : walk(c)); const texts = walk(root); let i = 0; return { nextNode: () => texts[i++] || null }; }
};
let cells = [], readerClick, dictQuery, formCall;
const $ = () => ({ addEventListener: (_name, fn) => { readerClick = fn; } });
const $$ = selector => selector.includes('cell[data-bavli]') ? cells : body.querySelectorAll('.sel');
const ctx = vm.createContext({ document, window: { BavliMorph: B, Morph: M, BAVLI_MORPH: D, innerWidth: 1200, innerHeight: 900, getSelection: () => '' }, console, NodeFilter: { SHOW_TEXT: 4 }, $, $$,
  I18N: { t: s => s }, esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
  Q_GN: { m: 'maskulin', f: 'feminin', c: 'gemeinsam' }, Q_NU: { s: 'Singular', p: 'Plural' },
  lazyScript: async (_src, get) => get(), alert: message => { throw new Error(message); },
  apChap: s => s.label, verseOf: s => +s, view: { sections: [{ label: '2a' }], idx: 0 },
  openDict: q => { dictQuery = q; }, showBavliForms: (...args) => { formCall = args; }
});
vm.runInContext('var gTok=0,wpop=null; function closeWpop(){gTok++;if(wpop)wpop.remove();wpop=null; $$(".sel").forEach(n=>n.classList.remove("sel"));}', ctx);
ctx.reader = { get view() { return ctx.view; } };
const lib = fs.readFileSync('library-word-popup.js', 'utf8');
const part = (from, to) => { const start = lib.indexOf(from), end = lib.indexOf(to, start); assert(start >= 0 && end > start); return lib.slice(start, end); };
vm.runInContext(part('  let bavliP =', '  function showBavliForms('), ctx);
vm.runInContext(fs.readFileSync('bavli-il-view.js', 'utf8'), ctx);
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  // Jede vollständige Quellzeile ist zuordenbar, auch mit ausgeblendeter Punktierung.
  for (const [page, rows] of Object.entries(source.pages)) rows.forEach((html, i) => {
    const words = html.replace(/<[^>]+>/g, '').split(/\s+/).filter(w => /[א-ת]/.test(w));
    const ref = `Berakhot ${page}:${i + 1}`;
    assert(B.matchWords(D, ref, words), ref);
    assert(B.matchWords(D, ref, words.map(w => w.replace(/[\u0591-\u05af\u05bd]/g, ''))), ref + ': ohne Kantillation');
    assert(B.matchWords(D, ref, words.map(w => w.replace(/[\u0591-\u05c7]/g, ''))), ref + ': ohne Punktierung');
  });
  assert.strictEqual(B.matchWords(D, 'Berakhot 2a:7', ['falscher Text']), null);
  // Die normale William-Davidson-Fassung besitzt zunächst keine .w-Spans.
  const row = new Element(); row.className = 'row'; row.dataset.l = '7';
  const cell = new Element(); cell.className = 'cell'; const text = new Element(); text.className = 'txt';
  const original = source.pages['2a'][6].replace(/<[^>]+>/g, ''); text.appendChild(new Element('#text', original)); cell.appendChild(text); row.appendChild(cell); body.appendChild(row); cells = [cell];
  await ctx.decorateBavliReader();
  assert.strictEqual(text.textContent, original);
  const words = text.querySelectorAll('.w'); assert.strictEqual(words.length, B.wordsAt(D, 'Berakhot 2a:7').length);
  const selected = words.find(w => w.dataset.l === B.atAnchor(D, '2a:7/7').id); assert(selected);
  vm.runInContext(part("  $('#rOut').addEventListener('click', e => {", "  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWpop();"), ctx);
  readerClick({ target: selected }); await tick();
  let popup = vm.runInContext('wpop', ctx); assert(popup && popup.parentElement === body);
  assert(popup.innerHTML.includes('Präfixkonjugation (Imperfekt)'));
  assert(popup.innerHTML.includes('Belegte Formen'));
  ctx.closeWpop();
  // Derselbe Klick im echten Viewer ruft die Karte auf; sie muss IN der Top-Layer-Dialogbox liegen.
  let pending;
  ctx.window.BavliInterlinear.open(IL, '2a', { onWord: (w, anchor) => { pending = ctx.openBavliAnchor(w, anchor); } });
  const dialog = document.getElementById('bavliInterlinear'), button = dialog.querySelectorAll('[data-anchor]').find(n => n.dataset.anchor === '2a:7/7');
  assert(button);
  const viewerBody = dialog.querySelector('.bil-body'); viewerBody.handlers.click({ target: button }); await pending;
  popup = vm.runInContext('wpop', ctx); assert(popup && popup.parentElement === dialog, 'Morphologiekarte hinter dem modalen Fenster');
  assert(popup.innerHTML.includes('Präfixkonjugation (Imperfekt)'));
  assert(popup.innerHTML.includes('Belegte Formen'));
  popup.onclick({ target: { closest: s => s === '.bvforms' ? { dataset: { i: '0' } } : null } });
  assert(formCall && formCall[1] === 'תני');
  viewerBody.handlers.click({ target: button }); await pending;
  popup = vm.runInContext('wpop', ctx);
  popup.onclick({ target: { closest: s => s === '.wdict' ? { dataset: { q: 'תני' } } : null } });
  assert.strictEqual(dictQuery, 'תני'); assert.strictEqual(dialog.open, false);
  console.log('Bavli-Klickwege: normale Ausgabe, modaler Viewer, sichtbare Morphologie, Formen und Wörterbuch geprüft.');
})().catch(err => { console.error(err); process.exitCode = 1; });
