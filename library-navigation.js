// LibraryNavigation: eigener Zustand und explizite Anbindung an den Leser.
window.LibraryNavigation = (() => {
  'use strict';
  function create(host) {
  // ---------- Vor/Zurück im Verlauf des Tabs ----------
  let navSuppress = false;
  function recordNav(s, row) {
    if (!host.view) return;
    const nav = host.view.nav || (host.view.nav = { stack: [], pos: -1 });
    if (!navSuppress) {
      const top = nav.stack[nav.pos];
      if (top && top.key === host.view.group.key && top.sk === s.k) { if (row) top.row = row; }
      else {
        nav.stack.length = nav.pos + 1; // Vorwärts-Verlauf abschneiden
        nav.stack.push({ key: host.view.group.key, sk: s.k, row: row || '' });
        if (nav.stack.length > 100) nav.stack.shift();
        nav.pos = nav.stack.length - 1;
      }
    }
    updateNav();
  }
  // Vor dem Verlassen per Link: die aktuelle Zeile im Verlauf merken, damit „Zurück“ dorthin führt und nicht an den Kapitelanfang
  function navRemember(el) {
    const nav = host.view && host.view.nav, top = nav && nav.stack[nav.pos];
    if (!top || !host.view.group || top.key !== host.view.group.key) return;
    let r = el && el.closest && el.closest('#rOut .row[data-l]');
    if (!r) { const t = host.syncTop(); r = host.$$('#rOut .row[data-l]').find(x => x.getBoundingClientRect().bottom > t + 4); }
    if (r) top.row = r.dataset.l;
  }
  function updateNav() {
    const nav = host.view && host.view.nav;
    host.$('#navBack').disabled = !nav || nav.pos <= 0;
    host.$('#navFwd').disabled = !nav || nav.pos >= nav.stack.length - 1;
  }
  async function navGo(delta) {
    const nav = host.view && host.view.nav;
    if (!nav) return;
    const p = nav.pos + delta;
    if (p < 0 || p >= nav.stack.length) return;
    nav.pos = p;
    const e = nav.stack[p];
    navSuppress = true;
    try {
      if (host.view.group && e.key === host.view.group.key) {
        const i = host.view.sections.findIndex(s => s.k === e.sk);
        if (i >= 0) { host.view.idx = i; host.renderSection(e.row || undefined); }
      } else {
        const g = host.groupsByKey.get(e.key);
        if (g) await host.openGroup(g, { sectionPath: JSON.parse(e.sk), rowLabel: e.row || undefined });
      }
    } finally { navSuppress = false; updateNav(); }
  }
  host.$('#navBack').onclick = () => navGo(-1);
  host.$('#navFwd').onclick = () => navGo(1);
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key === '[' || e.key === ']')) { e.preventDefault(); navGo(e.key === '[' ? -1 : 1); }
  });
  document.addEventListener('mouseup', e => { if (e.button === 3) navGo(-1); if (e.button === 4) navGo(1); });

  // ---------- Verlauf ----------
  let history = [];
  try { history = JSON.parse(localStorage.getItem('history') || '[]'); } catch { history = []; }
  if (!Array.isArray(history)) history = [];
  const saveHistory = () => { try { localStorage.setItem('history', JSON.stringify(history.slice(0, 100))); } catch { /* egal */ } };
  function renderRecent() {
    host.$('#recentBox').hidden = !history.length;
    host.$('#recent').innerHTML = history.slice(0, 100).map((h, i) =>
      `<a data-i="${i}" title="${host.esc(h.title + ' – ' + h.label)}"><span>${host.esc(h.title)}</span><small>${host.esc(h.label)}${h.row ? ' · ' + host.esc(h.row) : ''}</small></a>`).join('');
  }
  function pushHistory(s, row) {
    if (!host.view) return;
    const g = host.view.group;
    const e = { key: g.key, title: g.title, label: s.label, sk: s.k, row: row || '' };
    // gleiches Buch und gleicher Abschnitt: nur nach vorn holen
    history = history.filter(h => !(h.key === e.key && h.sk === e.sk));
    history.unshift(e);
    history = history.slice(0, 100);
    saveHistory();
    renderRecent();
  }
  host.$('#recent').addEventListener('click', e => {
    const a = e.target.closest('a[data-i]');
    const h = a && history[+a.dataset.i];
    if (!h) return;
    const g = host.groupsByKey.get(h.key);
    if (g) host.openGroup(g, { sectionPath: JSON.parse(h.sk), rowLabel: h.row || undefined }, host.BG(e));
  });
  let recentOpen = true;
  try { recentOpen = localStorage.getItem('recentOpen3') !== '0'; } catch { /* egal */ }
  const applyRecent = () => {
    host.$('#recent').hidden = !recentOpen;
    host.$('#recentArrow').textContent = recentOpen ? '▾' : '▸';
    try { localStorage.setItem('recentOpen3', recentOpen ? '1' : '0'); } catch { /* egal */ }
  };
  host.$('#recentHead').onclick = () => { recentOpen = !recentOpen; applyRecent(); };
  applyRecent();
  host.$('#recentClear').onclick = () => { history = []; saveHistory(); renderRecent(); };
  renderRecent();


  // ---------- Sitzung merken und beim Start wiederherstellen ----------
  let saveTimer = null;
  const sesKey = () => (document.documentElement.classList.contains('pane2') ? 'session2' : 'session');
  function sessionData() {
    let ui = null;
    try { // was außer den Tabs offen war: Reiter, Kommentar (Vers, Kommentator), Wörterbuch (Suchwort), welcher der beiden vorn lag
      ui = { tab: document.documentElement.dataset.tab || 'read', cmt: !!host.cmtOpen, cmtRow: host.cmtRow, cmtTop: (() => { const n = host.cmtTopName(); return n === undefined ? host.commentaryUI.keepName : n; })(),
        dict: !!host.dictOpen, dq: host.$('#dictQ').value.trim().slice(0, 100), stk: host.stackActive };
    } catch { /* beim Start noch nicht alles angelegt */ }
    return {
      idx: host.tabIdx,
      tabs: host.tabs.map(t => t.group ? { key: t.group.key, rels: [...t.selected], sk: t.key, label: t.label || '', scroll: t === host.view ? window.scrollY : (t.scroll || 0), hit: t.hit || null } : t.sres ? { sres: { q: t.sres.q, he: !!t.sres.he, limit: t.sres.limit || 300, params: t.sres.params } } : { empty: true }),
      ui,
    };
  }
  function saveSession() {
    clearTimeout(saveTimer); // das zweite Fenster speichert seine eigene Sitzung (Schlüssel session2), damit es das Hauptfenster nicht überschreibt
    saveTimer = setTimeout(() => { try { localStorage.setItem(sesKey(), JSON.stringify(sessionData())); } catch { /* egal */ } }, 300);
  }
  // beim Schließen sofort alles festhalten (auch die Leseposition und offene Seitenleisten)
  window.addEventListener('beforeunload', () => { if (!sesRestored) return; clearTimeout(saveTimer); try { localStorage.setItem(sesKey(), JSON.stringify(sessionData())); } catch { /* egal */ } });
  let sesRestored = false;
  async function restoreSession() {
    let ses = null;
    try { ses = JSON.parse(localStorage.getItem(document.documentElement.classList.contains('pane2') ? 'session2' : 'session') || 'null'); } catch { ses = null; }
    if (!ses || !Array.isArray(ses.tabs) || !ses.tabs.length) { sesRestored = true; return; }
    for (const t of ses.tabs) {
      if (t.sres && typeof t.sres.q === 'string' && t.sres.params && typeof t.sres.params === 'object') { host.tabs.push({ group: null, sres: { q: t.sres.q.slice(0, 200), he: !!t.sres.he, limit: Math.min(3000, t.sres.limit | 0 || 300), html: null, params: t.sres.params } }); continue; }
      if (t.empty) { host.tabs.push({ group: null }); continue; }
      const g = host.groupsByKey.get(t.key);
      if (!g) continue;
      const sel = new Set((t.rels || []).filter(r => g.versions.some(v => v.rel === r)));
      if (!sel.size && g.versions[0]) sel.add(g.versions[0].rel);
      host.tabs.push({ group: g, selected: sel, loaded: [], sections: [], idx: 0, key: t.sk || null, label: t.label || '', scroll: t.scroll || 0, hit: t.hit && typeof t.hit.k === 'string' ? t.hit : null, lazy: true });
    }
    if (!host.tabs.length) { sesRestored = true; return; }
    host.tabIdx = Math.min(Math.max(0, ses.idx | 0), host.tabs.length - 1);
    host.view = host.tabs[host.tabIdx];
    const ui = ses.ui && typeof ses.ui === 'object' ? ses.ui : null;
    if (ui && typeof ui.cmtRow === 'string') host.cmtRow = ui.cmtRow.slice(0, 40); // Vers des Kommentars wie beim Schließen
    if (ui && typeof ui.cmtTop === 'string') host.commentaryUI.keepName = ui.cmtTop.slice(0, 200);
    host.showView();
    if (host.view.group) { const sc = host.view.scroll || 0; await host.loadView({ noKeep: true }); window.scrollTo(0, sc); }
    if (ui) {
      try {
        if (ui.cmt && !host.cmtOpen) host.toggleCmt(true);
        if (ui.dict && !host.dictOpen) { host.toggleDict(true); if (typeof ui.dq === 'string' && ui.dq) host.dictLookup(ui.dq.slice(0, 100)); }
        if (ui.stk === 'cmt' || ui.stk === 'dict') host.setStackActive(ui.stk);
        if (['search', 'dict', 'notes'].includes(ui.tab)) host.showTab(ui.tab);
        if (host.view.group) window.scrollTo(0, host.view.scroll || 0); // Seitenleisten ändern die Breite: Leseposition danach noch einmal setzen
      } catch { /* egal */ }
    }
    sesRestored = true;
  }

    return {
      get history() { return history; }, set history(value) { history = value; },
      get navRemember() { return navRemember; },
      get pushHistory() { return pushHistory; },
      get recordNav() { return recordNav; },
      get restoreSession() { return restoreSession; },
      get saveSession() { return saveSession; },
      get updateNav() { return updateNav; },
    };
  }
  return { create };
})();
