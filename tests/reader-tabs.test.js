'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../library-tabs.js'), 'utf8');
function harness(loadView = async () => {}) {
  const scrolls = [], jumps = [];
  const element = {addEventListener() {}};
  const context = {window: {scrollY: 0, scrollTo: (...args) => scrolls.push(args)},
    document: {addEventListener() {}, documentElement: {dataset: {tab: 'read'}}}};
  vm.runInNewContext(source, context);
  const state = {tabs: [], tabIdx: -1, view: null};
  const api = context.window.LibraryTabs.create({$: () => element, esc: s => s, state,
    isPane2: () => false, showTab() {}, showView() {}, saveSession() {}, resetCalendar() {},
    loadView, jumpTo: ref => jumps.push(ref)});
  return {api, state, scrolls, jumps};
}
test('Late tab loads cannot scroll or jump in the newly active tab', async () => {
  for (const target of [null, {jumpRef: 'Genesis 1:3'}]) {
    let finish;
    const h = harness(() => new Promise(resolve => {finish = resolve;}));
    h.state.view = {group: {}, scroll: 420, target};
    const loading = h.api.load();
    h.state.view = {group: {}, scroll: 80};
    finish(); await loading;
    assert.deepEqual(h.scrolls, []);
    assert.deepEqual(h.jumps, []);
  }
});
test('Background insertion order is independent in each reading pane', () => {
  const a = harness(), b = harness();
  for (const h of [a, b]) {
    const first = {group: {title: 'Genesis'}};
    h.api.add(first); h.state.view = first;
  }
  const ex = {group: {title: 'Exodus'}}, lev = {group: {title: 'Leviticus'}};
  a.api.add(ex, true); a.api.add(lev, true);
  assert.deepEqual(a.state.tabs.map(t => t.group.title), ['Genesis', 'Exodus', 'Leviticus']);
  assert.deepEqual(b.state.tabs.map(t => t.group.title), ['Genesis']);
  assert.equal(a.state.tabIdx, 0);
  assert.equal(a.state.view, a.state.tabs[0]);
});

test('Only the newest load may restore the position after switching back', async () => {
  const pending = [];
  const h = harness(() => new Promise(resolve => pending.push(resolve)));
  h.state.view = {group: {}, scroll: 420};
  const first = h.api.load();
  h.state.view.scroll = 80;
  const second = h.api.load();
  pending[1](); await second;
  pending[0](); await first;
  assert.deepEqual(h.scrolls, [[0, 80]]);
});
