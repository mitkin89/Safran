'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../library-word-popup.js'), 'utf8');
function setup() {
  const events = new Map();
  let release, anchors = 0;
  const data = new Promise(resolve => {release = resolve;});
  const context = {window: {BavliMorph: {atAnchor() {anchors++; return null;}}},
    CSS: {highlights: {delete() {}}},
    document: {addEventListener: (type, fn) => events.set(type, fn),
      createElement() {throw Error('Ein geschlossenes Popup darf nicht wieder erscheinen');}},
    alert() {throw Error('Unerwarteter Ladefehler');}};
  vm.runInNewContext(code, context);
  const api = context.window.LibraryWordPopup.create({$: () => ({addEventListener() {}}),
    $$: () => [], reader: {}, lazyScript: () => data});
  const word = {isConnected: true, classList: {contains: () => false}};
  return {api, word, events, release: () => release({}), anchors: () => anchors};
}
test('Closing or Escape cancels a pending morphology popup', async () => {
  for (const escape of [false, true]) {
    const h = setup();
    const loading = h.api.openBavliAnchor(h.word, '2a:1/1');
    if (escape) h.events.get('keydown')({key: 'Escape'}); else h.api.close();
    h.release(); await loading;
    assert.equal(h.anchors(), 0);
  }
});
test('A pending popup from one reading frame does not cancel another frame', async () => {
  const a = setup(), b = setup();
  const first = a.api.openBavliAnchor(a.word, '2a:1/1');
  const second = b.api.openBavliAnchor(b.word, '2a:1/2');
  a.api.close(); a.release(); b.release();
  await Promise.all([first, second]);
  assert.equal(a.anchors(), 0);
  assert.equal(b.anchors(), 1);
});
