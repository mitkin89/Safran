// Lesetabs: Lebenszyklus und Darstellung, je Lesefenster eine Instanz.
window.LibraryTabs = (() => {
  'use strict';
  function create({ $, esc, state, isPane2, showTab, showView, saveSession,
    resetCalendar, loadView, jumpTo }) {
    // Fenstertitel: zeigt, wo man gerade liest („Mishneh Torah, Foundations of the Torah · Kapitel 1“); in den anderen Reitern der App-Name
    function updateTitle(name) {
      if (isPane2()) return;
      const base = 'Offline-Bibliothek', onRead = (document.documentElement.dataset.tab || 'read') === 'read';
      document.title = onRead && name && name !== 'Neuer Tab' ? name : base;
    }
    function renderTabs() {
      $('#tabbar').innerHTML = state.tabs.map((t, i) => {
        const s = t.group && t.sections && t.sections[t.idx];
        if (s) t.label = s.label;
        const name = t.group ? t.group.title + (t.label ? ' · ' + t.label : '') : t.sres ? I18N.t('Suche') + ': ' + t.sres.q : 'Neuer Tab';
        if (i === state.tabIdx) updateTitle(t.group || t.sres ? name : ''); // erst hier: t.label ist oben gerade aktualisiert worden
        return `<div class="tab${i === state.tabIdx ? ' active' : ''}" data-i="${i}" title="${esc(name)}"><span>${esc(name)}</span><button data-x="${i}" title="Tab schließen">✕</button></div>`;
      }).join('') + '<button id="tabNew" title="Neuer Tab (Cmd+T)">＋</button>';
      if (!state.tabs.length) updateTitle('');
      const act = $('#tabbar .tab.active'); if (act) act.scrollIntoView({ inline: 'nearest', block: 'nearest' }); // bei vielen Tabs immer den geöffneten zeigen
    }
    // Neue Tabs stehen direkt rechts vom aktiven Tab (nicht am Ende); mehrere Hintergrund-Tabs vom selben Tab aus reihen sich der Reihe nach dahinter
    let bgFrom = null, bgLast = null; // Tab-Objekte statt Nummern: bleiben richtig, wenn dazwischen Tabs geschlossen oder verschoben werden
    function addTab(nv, bg = false) {
      let pos = state.tabs.length ? state.tabIdx + 1 : 0;
      const li = bg && bgFrom && bgFrom === state.tabs[state.tabIdx] ? state.tabs.indexOf(bgLast) : -1;
      if (li >= pos) pos = li + 1;
      pos = Math.min(Math.max(pos, 0), state.tabs.length);
      state.tabs.splice(pos, 0, nv);
      if (bg) { bgFrom = state.tabs[state.tabIdx]; bgLast = nv; } else { bgFrom = bgLast = null; state.tabIdx = pos; }
      return pos;
    }
    function newTab() {
      resetCalendar(); // neuer Tab zeigt wieder den heutigen Kalender
      saveScroll();
      state.view = { group: null };
      addTab(state.view);
      showTab('read');
      showView();
    }
    function saveScroll() { if (state.view) { state.view.scroll = window.scrollY; saveSession(); } }
    async function switchTab(i) {
      if (!state.tabs[i]) return;
      if (i === state.tabIdx) { if (document.documentElement.dataset.tab !== 'read') showTab('read'); return; }
      saveScroll();
      state.tabIdx = i; state.view = state.tabs[i];
      showTab('read');
      showView();
      if (state.view.group) await loadTabView();
    }
    const closedTabs = []; // zuletzt geschlossene Tabs (Cmd+Shift+T öffnet sie wieder, wie im Browser)
    async function closeTab(i) {
      if (!state.tabs[i]) return;
      const wasActive = i === state.tabIdx;
      if (wasActive) saveScroll();
      if (state.tabs[i].group || state.tabs[i].sres) { closedTabs.push({ t: state.tabs[i], i }); if (closedTabs.length > 30) closedTabs.shift(); }
      state.tabs.splice(i, 1);
      if (!state.tabs.length) { state.tabIdx = -1; state.view = null; if (document.documentElement.classList.contains('pane2')) { showView(); return; } newTab(); return; } // nie ohne Tab
      if (i < state.tabIdx) state.tabIdx--;
      if (wasActive) {
        state.tabIdx = Math.min(i, state.tabs.length - 1);
        state.view = state.tabs[state.tabIdx];
        showView();
        if (state.view.group) await loadTabView();
      } else renderTabs();
    }
    async function reopenTab() {
      const c = closedTabs.pop(); if (!c) return;
      if (state.tabs.length === 1 && !state.tabs[0].group && !state.tabs[0].sres) state.tabs.length = 0; // nur ein leerer „Neuer Tab“ (z. B. nach dem Schließen des letzten): ersetzen
      const i = Math.min(c.i, state.tabs.length);
      saveScroll();
      c.t.target = null;
      state.tabs.splice(i, 0, c.t); state.tabIdx = i; state.view = c.t;
      showTab('read');
      showView();
      if (state.view.group) await loadTabView();
    }
    $('#tabbar').addEventListener('click', e => {
      if (e.target.id === 'tabNew') return newTab();
      const x = e.target.closest('button[data-x]');
      if (x) return closeTab(+x.dataset.x);
      const t = e.target.closest('.tab');
      if (t) switchTab(+t.dataset.i);
    });
    $('#tabbar').addEventListener('auxclick', e => { const t = e.target.closest('.tab'); if (t && e.button === 1) closeTab(+t.dataset.i); });
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 't') { e.preventDefault(); newTab(); }
    });

    // Tab laden; ein im Hintergrund angelegter Tab springt dabei an seine Stelle (target), sonst an die gemerkte Scrollposition
    let loadSerial = 0;
    async function loadTabView() {
      const serial = ++loadSerial;
      const V = state.view;
      const sc = V.scroll || 0, tg = V.target || {}; V.target = null;
      await loadView({ noKeep: true, ...tg });
      if (state.view !== V || serial !== loadSerial) return; // Ein inzwischen gewählter Tab behält seine Stelle.
      if (tg.jumpRef) { await jumpTo(tg.jumpRef, false); return; } // Verweis (z. B. „Gen. 1:3“): im geladenen Tab an die Stelle springen
      if (!tg.sectionPath && tg.rowLabel == null) window.scrollTo(0, sc);
    }

    return { render: renderTabs, add: addTab, newTab, saveScroll, switchTab, closeTab, reopenTab, load: loadTabView };
  }
  return { create };
})();
