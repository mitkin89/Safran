(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const R = window.Reader;
  const O = window.offline;

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KIND_LABEL = { he: 'Hebr.', en: 'Engl.', de: 'Deutsch', other: 'Andere' };
  const KIND_RANK = { he: 0, en: 1, de: 2, other: 3 };
  const fmtSize = b => (b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : (b / 1048576).toFixed(1) + ' MB');
  const fmtEst = mb => (mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : Math.round(mb) + ' MB');
  const shortVer = v => {
    if (v === 'merged') return 'zusammengeführt';
    const s = String(v || '').replace(/\s*\[[a-z]{2,3}\]\s*$/i, '');
    return s.length > 90 ? s.slice(0, 90) + '…' : s;
  };
  // Kennung eines Buchs; steht in HTML-Attributen, darf daher kein Steuerzeichen enthalten
  const keyOf = e => e.categories.join('/') + '¦' + e.title;

  // ---------- Reiter ----------
  let onTabChange = null; // wird weiter unten für den Reiter „Wörterbuch“ gesetzt
  const tabScroll = {}; // Scrollposition von Notizen/Suche, damit man nach einem Sprung ins Lesen an derselben Stelle zurückkommt
  function showTab(t) {
    const prevTab = document.documentElement.dataset.tab || 'read'; // vor dem ersten Wechsel steht noch kein data-tab, die Seite zeigt aber „Lesen“
    if (prevTab === 'notes' || prevTab === 'search') tabScroll[prevTab] = window.scrollY;
    $$('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    $$('main > section').forEach(s => (s.hidden = s.id !== 'tab-' + t));
    document.documentElement.dataset.tab = t;
    try { renderTabs(); } catch { /* beim ersten Aufruf sind die Tabs noch nicht angelegt */ } // Fenstertitel neu setzen
    $('#togglePanel').hidden = t !== 'read'; // die Bücherliste gibt es nur im Reiter „Lesen“
    if (prevTab && prevTab !== t && (prevTab === 'read' || t === 'read') && panelOpen) { panelOpen = false; applyPanel(); } // beim Verlassen und Zurückkehren ist die Bücherliste zu
    if (onTabChange) onTabChange(t, prevTab);
    if ((t === 'notes' || t === 'search') && prevTab !== t && tabScroll[t]) { const y = tabScroll[t]; requestAnimationFrame(() => window.scrollTo(0, y)); setTimeout(() => window.scrollTo(0, y), 150); }
  }
  $$('nav button').forEach(b => (b.onclick = () => { if (b.dataset.tab === 'read' && b.classList.contains('active')) togglePanel(); else showTab(b.dataset.tab); })); // erneuter Klick auf „Lesen“ blendet die Bücherliste ein/aus
  $('#goGet').onclick = () => showTab('get'); // „Herunterladen“ liegt im ⋯-Menü, damit die Kopfzeile Platz für die Tabs lässt

  // ---------- Zustand ----------
  let entries = [];            // lokale Dateien (aus dem Index)
  let groups = [];             // nach Titel gruppiert
  const groupsByKey = new Map();
  const cache = new Map();     // rel -> geladene Datei (die letzten paar)
  let view = null;             // aktuell geöffnetes Buch

  async function refreshState() {
    const st = await O.state();
    $('#stats').textContent = `${st.stats.titles} Titel · ${st.stats.files} Dateien · ${fmtSize(st.stats.bytes)}`;
    $('#chooseDir').title = 'Aktueller Speicherort: ' + st.dir;
    return st;
  }

  async function loadLibrary() {
    entries = await O.library();
    const map = new Map();
    for (const e of entries) {
      const k = keyOf(e);
      let g = map.get(k);
      if (!g) { g = { key: k, title: e.title, heTitle: e.heTitle, cats: e.categories, versions: [] }; map.set(k, g); }
      g.versions.push(e);
    }
    groups = [...map.values()];
    groups.forEach(g => g.versions.sort((a, b) =>
      (KIND_RANK[a.kind] - KIND_RANK[b.kind]) || ((a.versionTitle === 'merged' ? 0 : 1) - (b.versionTitle === 'merged' ? 0 : 1)) || a.versionTitle.localeCompare(b.versionTitle)));
    groupsByKey.clear();
    groups.forEach(g => groupsByKey.set(g.key, g));
    cache.clear();
    renderSCats();
    // geöffnete Tabs auf die neu aufgebauten Buchobjekte umstellen; Bücher, die es nicht mehr gibt, schließen
    for (let i = tabs.length - 1; i >= 0; i--) {
      const t = tabs[i];
      if (!t.group) continue;
      const ng = groupsByKey.get(t.group.key);
      if (ng) { t.group = ng; if (t.selected) { t.selected = new Set([...t.selected].filter(r => ng.versions.some(v => v.rel === r))); if (!t.selected.size && ng.versions[0]) t.selected.add(ng.versions[0].rel); } } else { tabs.splice(i, 1); if (i < tabIdx) tabIdx--; }
    }
    if (!tabs.length) tabIdx = -1; else tabIdx = Math.min(Math.max(0, tabIdx), tabs.length - 1);
    view = tabs[tabIdx] || null; // view zeigt immer auf den aktiven Tab
    if (typeof showView === 'function' && document.readyState !== 'loading') { try { showView(); } catch { /* beim ersten Aufruf noch nicht bereit */ } }
    renderTree();
  }

  // ---------- Lesen: Bücherliste ----------
  const closedCats = new Set(); // beim Filtern selbst zugeklappte obere Ebenen
  const openCats = new Set(); // vom Nutzer geöffnete Kategorien (bleiben beim Filtern erhalten)
  function renderTree() {
    const f = $('#treeFilter').value.trim().toLowerCase();
    const root = { name: '', children: new Map(), titles: [] };
    for (const g of groups) {
      let n = root;
      for (const c of g.cats) {
        if (!n.children.has(c)) n.children.set(c, { name: c, children: new Map(), titles: [] });
        n = n.children.get(c);
      }
      n.titles.push(g);
    }
    const match = g => !f || (g.title + ' ' + (g.heTitle || '') + ' ' + g.cats.join(' ')).toLowerCase().includes(f);
    const count = n => n.titles.filter(match).length + [...n.children.values()].reduce((a, c) => a + count(c), 0);
    const node = (n, pth, depth = 0) => {
      const kids = SefOrder.sortCats([...n.children.keys()], n.name).map(k => n.children.get(k)).map(c => node(c, pth + '/' + c.name, depth + 1)).join('');
      const ts = SefOrder.sortTitles(n.titles.filter(match))
        .map(g => `<a class="lib-item" data-key="${esc(g.key)}">${esc(g.title)}${g.heTitle ? `<small dir="rtl">${esc(g.heTitle)}</small>` : ''}${g.cats[0] === 'Eigene Texte' ? '<button class="treex" title="Eigenen Text entfernen">✕</button>' : ''}</a>`).join('');
      if (!kids && !ts) return '';
      if (!n.name) return kids + ts;
      // Kategorien bleiben zu, bis man sie selbst öffnet (auch beim Filtern); bei aktivem Filter steht die Trefferzahl dabei
      const auto = !!f && depth < 3 && !closedCats.has(pth); // beim Filtern: die obersten zwei Ebenen offen
      return `<details data-p="${esc(pth)}" data-d="${depth}" ${openCats.has(pth) || auto ? 'open' : ''}><summary>${esc(n.name)}${f ? ` <span class="muted">(${count(n)})</span>` : ''}${kids ? '<button class="catall" title="Alle Unterpunkte öffnen/schließen">⊞</button>' : ''}</summary>${kids}${ts}</details>`;
    };
    $('#tree').innerHTML = node(root, '') || `<p class="muted">${groups.length ? 'Keine Treffer.' : 'Noch keine Texte heruntergeladen.'}</p>`;
  }
  { let tft = null; $('#treeFilter').addEventListener('input', () => { clearTimeout(tft); tft = setTimeout(renderTree, 80); }); }
  $('#tree').addEventListener('click', e => {
    const b = e.target.closest('.catall'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const d = b.closest('details'), subs = [...d.querySelectorAll('details')];
    const open = subs.some(x => !x.open);
    d.open = true; subs.forEach(x => (x.open = open));
  }, true);
  const allCatPaths = () => $$('#tree details[data-p]').map(d => d.dataset.p);
  $('#treeOpenAll').onclick = () => { for (const p of allCatPaths()) { openCats.add(p); closedCats.delete(p); } renderTree(); };
  $('#treeShutAll').onclick = () => { for (const p of allCatPaths()) closedCats.add(p); openCats.clear(); renderTree(); };
  $('#tree').addEventListener('toggle', e => {
    const d = e.target;
    if (!d.dataset || d.dataset.p == null) return;
    const auto = !!$('#treeFilter').value.trim() && +d.dataset.d < 3;
    if (auto) { if (d.open) closedCats.delete(d.dataset.p); else closedCats.add(d.dataset.p); }
    else if (d.open) openCats.add(d.dataset.p); else openCats.delete(d.dataset.p);
  }, true);
  // Eigene Texte entfernen (alle eigenen Versionen eines Titels); die Originaldateien bleiben unberührt
  async function removeOwnGroup(g) {
    const own = g.versions.filter(v => v.own);
    if (!own.length) return;
    const names = own.map(v => `„${shortVer(v.versionTitle)}“`).join(', ');
    if (!confirm(`Eigene Texte zu „${g.title}“ aus der Bibliothek entfernen?\n\n${names}\n\n(Die Originaldateien bleiben unberührt.)`)) return;
    for (const v of own) { const r = await O.ownRemove(v.rel); if (r.error) { alert(r.error); break; } cache.delete(v.rel); }
    await loadLibrary();
    refreshState();
  }
  $('#tree').addEventListener('click', e => {
    const x = e.target.closest('.treex');
    if (!x) return;
    e.stopImmediatePropagation(); e.preventDefault();
    removeOwnGroup(groupsByKey.get(x.closest('.lib-item').dataset.key));
  }, true);
  $('#tree').addEventListener('click', e => {
    const a = e.target.closest('.lib-item');
    if (a) openGroup(groupsByKey.get(a.dataset.key), {}, e.metaKey || e.ctrlKey);
  });

  // ---------- Lesen: Buch öffnen und anzeigen ----------
  // ---------- Tabs ----------
  const tabs = [];
  let tabIdx = -1;
  // Fenstertitel: zeigt, wo man gerade liest („Mishneh Torah, Foundations of the Torah · Kapitel 1“); in den anderen Reitern der App-Name
  function updateTitle(name) {
    if (IS_PANE2) return;
    const base = 'Offline-Bibliothek', onRead = (document.documentElement.dataset.tab || 'read') === 'read';
    document.title = onRead && name && name !== 'Neuer Tab' ? name : base;
  }
  function renderTabs() {
    $('#tabbar').innerHTML = tabs.map((t, i) => {
      const s = t.group && t.sections && t.sections[t.idx];
      if (s) t.label = s.label;
      const name = t.group ? t.group.title + (t.label ? ' · ' + t.label : '') : t.sres ? I18N.t('Suche') + ': ' + t.sres.q : 'Neuer Tab';
      if (i === tabIdx) updateTitle(t.group || t.sres ? name : ''); // erst hier: t.label ist oben gerade aktualisiert worden
      return `<div class="tab${i === tabIdx ? ' active' : ''}" data-i="${i}" title="${esc(name)}"><span>${esc(name)}</span><button data-x="${i}" title="Tab schließen">✕</button></div>`;
    }).join('') + '<button id="tabNew" title="Neuer Tab (Cmd+T)">＋</button>';
    if (!tabs.length) updateTitle('');
    const act = $('#tabbar .tab.active'); if (act) act.scrollIntoView({ inline: 'nearest', block: 'nearest' }); // bei vielen Tabs immer den geöffneten zeigen
  }
  function showView() {
    saveSession();
    updateNav();
    const none = !tabs.length;
    $('#rEmpty').hidden = !none;
    $('#rMain').hidden = none;
    $('#stick').classList.toggle('emptytab', !none && !view.group);
    if (!none && view.sres) { if (view.sres.html) $('#rOut').innerHTML = view.sres.html; else if (!view.sres.running) runSres(view); }
    else if (!none && !view.group) {
      $('#rOut').innerHTML = `<div class="newtab"><img class="logo" src="logo.png" alt="talmud.de" width="130"><p class="muted">Neuer Tab – Stelle oder Buch eingeben (z. B. <b>Gen. 1</b>, <b>Berakhot 2a</b>, <b>Mishnah Peah 6:6</b>) und Enter drücken, oder links ein Buch wählen.</p>
        <input id="ntIn" placeholder="Gen. 1:1" autocomplete="off"><p id="ntMsg" class="muted"></p></div>`;
      setTimeout(() => { const i = $('#ntIn'); if (i) { attachSuggest(i); i.focus(); } }, 0);
    }
    renderTabs();
  }
  function newTab() {
    saveScroll();
    view = { group: null };
    tabs.push(view); tabIdx = tabs.length - 1;
    showTab('read');
    showView();
  }
  function saveScroll() { if (view) { view.scroll = window.scrollY; saveSession(); } }
  async function switchTab(i) {
    if (!tabs[i]) return;
    if (i === tabIdx) { if (document.documentElement.dataset.tab !== 'read') showTab('read'); return; }
    saveScroll();
    tabIdx = i; view = tabs[i];
    showTab('read');
    showView();
    if (view.group) { const sc = view.scroll || 0; await loadView({ noKeep: true }); window.scrollTo(0, sc); }
  }
  async function closeTab(i) {
    if (!tabs[i]) return;
    const wasActive = i === tabIdx;
    tabs.splice(i, 1);
    if (!tabs.length) { tabIdx = -1; view = null; showView(); return; }
    if (i < tabIdx) tabIdx--;
    if (wasActive) {
      tabIdx = Math.min(i, tabs.length - 1);
      view = tabs[tabIdx];
      showView();
      if (view.group) { const sc = view.scroll || 0; await loadView({ noKeep: true }); window.scrollTo(0, sc); }
    } else renderTabs();
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

  $('#rOut').addEventListener('keydown', async e => {
    if (e.key !== 'Enter' || e.target.id !== 'ntIn') return;
    const q = e.target.value.trim();
    if (!q) return;
    let ok = await jumpTo(q);
    if (!ok) { const m = $('#ntMsg'); if (m) m.textContent = 'Nicht gefunden – nur Bücher aus deiner Bibliothek sind möglich.'; }
  });

  // gemerkte Sprachauswahl (he/en/de), wird beim Umschalten der Versionen aktualisiert
  let prefKinds = ['he', 'en', 'de'];
  try { const k = JSON.parse(localStorage.getItem('prefKinds') || 'null'); if (Array.isArray(k) && k.length) prefKinds = k.filter(x => ['he', 'en', 'de'].includes(x)); } catch { /* egal */ }
  // gemerkte Fassungen: je Sprache die Titel der Versionen, die man zuletzt ausgewählt hat; sie werden in jedem Buch, das sie hat, wieder geöffnet
  let prefVer = {};
  try { const p = JSON.parse(localStorage.getItem('prefVer') || '{}'); if (p && typeof p === 'object' && !Array.isArray(p)) prefVer = p; } catch { /* egal */ }
  const kindKey = v => (['he', 'en', 'de'].includes(v.kind) ? v.kind : 'other');
  function rememberVersions() {
    if (!view || !view.group) return;
    for (const k of new Set(view.group.versions.map(kindKey))) {
      const titles = [...new Set(view.group.versions.filter(v => kindKey(v) === k && view.selected.has(v.rel)).map(v => v.versionTitle))];
      if (titles.length) prefVer[k] = titles; else delete prefVer[k];
    }
    try { localStorage.setItem('prefVer', JSON.stringify(prefVer)); } catch { /* egal */ }
  }
  function rememberKinds() {
    if (!view || !view.group) return;
    rememberVersions();
    const ks = [...new Set(view.group.versions.filter(v => view.selected.has(v.rel) && ['he', 'en', 'de'].includes(v.kind)).map(v => v.kind))];
    if (!ks.length) return;
    // eine Sprache, die dieses Buch gar nicht hat, bleibt in der Auswahl erhalten
    const have = new Set(view.group.versions.map(v => v.kind));
    prefKinds = [...new Set([...ks, ...prefKinds.filter(k => !have.has(k))])];
    try { localStorage.setItem('prefKinds', JSON.stringify(prefKinds)); } catch { /* egal */ }
  }
  // Voreinstellung der Versionen eines Buchs (Hebräisch immer, dazu die Sprache der Oberfläche)
  function pickVersions(g) {
    const sel = new Set();
    // Hebräisch: der Westminster-Text (OSHB) hat Vorrang, sonst die zusammengeführte Fassung
    const first = k => (k === 'he' && g.versions.find(v => v.kind === 'he' && /westminster/i.test(v.versionTitle))) || g.versions.find(v => v.kind === k && v.versionTitle === 'merged') || g.versions.find(v => v.kind === k);
    // Voreinstellung nach Oberflächensprache: Hebräisch immer, dazu Englisch bzw. Deutsch (Hebräisch-Oberfläche: nur Hebräisch); fehlt Deutsch, hilft Englisch aus
    const want = new Set(['he']);
    if (I18N.lang === 'en') want.add('en'); else if (I18N.lang === 'de') { want.add('de'); if (!first('de')) want.add('en'); }
    // Zuletzt gewählte Versionen gelten in jedem Buch weiter, das sie hat; sonst die Voreinstellung der Sprache
    for (const k of ['he', 'en', 'de', 'other']) {
      const titles = Array.isArray(prefVer[k]) ? prefVer[k] : [];
      const mine = g.versions.filter(v => kindKey(v) === k && titles.includes(v.versionTitle));
      if (mine.length) mine.forEach(v => sel.add(v.rel));
      else if (want.has(k)) { const v = first(k); if (v) sel.add(v.rel); }
    }
    if (!sel.size) ['he', 'en', 'de'].forEach(k => { const v = first(k); if (v) sel.add(v.rel); });
    if (!sel.size && g.versions[0]) sel.add(g.versions[0].rel);
    return sel;
  }
  async function openGroup(g, target = {}, inNewTab = false) {
    if (!g) return;
    saveScroll();
    const nv = { group: g, selected: new Set(), loaded: [], sections: [], idx: 0, key: null };
    if (!tabs.length || (tabs[tabIdx] && tabs[tabIdx].sres) || (inNewTab && tabs[tabIdx] && tabs[tabIdx].group)) { tabs.push(nv); tabIdx = tabs.length - 1; }
    else { nv.nav = tabs[tabIdx] && tabs[tabIdx].nav; tabs[tabIdx] = nv; } // Verlauf des Tabs bleibt beim Buchwechsel erhalten
    view = nv;
    if (target.showCompare) nv.cmpRel = target.rel;
    pickVersions(g).forEach(r => view.selected.add(r));
    if (target.rel) view.selected.add(target.rel);
    showTab('read');
    showView();
    await loadView(target);
  }

  async function loadView(target = {}) {
    const V = view; // Tab, für den geladen wird (der Nutzer kann inzwischen woanders sein)
    const tok = V.loadTok = (V.loadTok || 0) + 1;
    // Versionen ändern: an derselben Stelle bleiben (markierter Vers, sonst der oberste sichtbare), statt zu Vers 1 zurückzuspringen
    let keepRow = null;
    if (view === V && !target.noKeep && !target.sectionPath && target.rowLabel == null && V.key) {
      const rowsEl = [...$$('#rOut .row[data-l]')];
      const hitEl = rowsEl.find(x => x.classList.contains('hit'));
      const topEl = rowsEl.find(x => x.getBoundingClientRect().bottom > 90);
      keepRow = (hitEl || topEl || {}).dataset ? (hitEl || topEl).dataset.l : null;
      V.keepQuiet = !hitEl;
    }
    if (view === V) $('#rOut').innerHTML = '<p class="muted">Lade …</p>';
    const loaded = [];
    for (const rel of [...V.selected]) {
      let d = cache.get(rel);
      if (!d) {
        try { d = await O.read(rel); } catch { continue; }
        const ver = V.group.versions.find(x => x.rel === rel);
        d.__b = (ver && ver.bytes) || 2e6;
        cache.set(rel, d);
        let tot = 0; for (const x of cache.values()) tot += x.__b || 0;
        for (const k of cache.keys()) { if (tot <= 80e6 || cache.size <= 1) break; if (k === rel) continue; tot -= cache.get(k).__b || 0; cache.delete(k); } // nach Datenmenge begrenzen (große Talmud-Dateien)
      }
      loaded.push(d);
    }
    if (V.loadTok !== tok) return; // ein neuerer Ladevorgang für diesen Tab läuft
    loaded.sort((a, b) => KIND_RANK[a.entry.kind] - KIND_RANK[b.entry.kind]);
    V.loaded = loaded;

    // Abschnitte aller gewählten Versionen vereinen (Reihenfolge der ersten Version, Fehlendes angehängt)
    const seen = new Set();
    const secs = [];
    for (const d of loaded) {
      for (const s0 of R.sectionsOf(d.text, d.sectionNames)) {
        // Auswahl nur bis zur ersten Listenebene (Kapitel/Daf) – Verse und Kommentare stehen dann untereinander im Abschnitt
        const fi = s0.path.findIndex(p => typeof p === 'number');
        const path = fi >= 0 ? s0.path.slice(0, fi + 1) : s0.path;
        const label = fi >= 0 && fi + 1 < s0.path.length ? R.pathLabel(path, d.sectionNames) : s0.label;
        const k = JSON.stringify(path);
        if (!seen.has(k)) { seen.add(k); secs.push({ path, label, k }); }
      }
    }
    const prevKey = V.key;
    V.sections = secs;
    let idx = 0;
    const wanted = target.sectionPath ? JSON.stringify(target.sectionPath) : prevKey;
    if (target.sectionPath) {
      const tp = target.sectionPath;
      const i = secs.findIndex(s => s.path.length <= tp.length && s.path.every((p, j) => p === tp[j]));
      if (i >= 0) {
        idx = i;
        const rest = tp.slice(secs[i].path.length).map(p => (typeof p === 'number' ? p + 1 : p));
        if (rest.length) target = { ...target, rowLabel: [...rest, ...(target.rowLabel ? [target.rowLabel] : [])].join(':') };
      }
    } else if (wanted) { const i = secs.findIndex(s => s.k === wanted); if (i >= 0) idx = i; }
    V.idx = idx;
    if (view !== V) { renderTabs(); return; } // Tab wurde inzwischen gewechselt: Daten bleiben im Tab, angezeigt wird später

    const g = V.group;
    $('#rTitle').innerHTML = `${esc(g.title)}${g.heTitle ? ` <small dir="rtl" class="muted">${esc(g.heTitle)}</small>` : ''}`;
    $('#rTitle').title = `${g.title} – ${I18N.t('Klicken, um zu einem Buch oder einer Stelle zu springen')}`;
    $('#rSection').innerHTML = secs.map((s, i) => `<option value="${i}">${esc(s.label)}</option>`).join('');
    renderVersions();
    renderCompare();
    renderSection(target.rowLabel != null ? target.rowLabel : keepRow, target.rowLabel == null && keepRow != null && V.keepQuiet);
  }

  function renderVersions() {
    const g = view.group;
    $('#verSummary').innerHTML = `<span class="vi">📚</span> Versionen ${view.selected.size}/${g.versions.length}`;
    const KN = { he: 'Hebräisch', en: 'Englisch', de: 'Deutsch', other: 'Andere' };
    const itemH = v => `<label><input type="checkbox" data-rel="${esc(v.rel)}" ${view.selected.has(v.rel) ? 'checked' : ''}>${v.own ? '<span class="badge own">eigen</span>' : ''}${esc(shortVer(v.versionTitle))}${v.own ? ` <button class="ownc" data-csv="${esc(v.rel)}" title="Als Upload-CSV für Sefaria speichern (Ref,Text)">CSV</button>` : ''}${v.own && v.source ? ` <button class="ownr" data-rl="${esc(v.rel)}" title="Quelldatei neu einlesen (${esc(v.source)})">⟳</button>` : ''}${v.own ? ` <button class="ownx" data-rm="${esc(v.rel)}" title="Diesen eigenen Text entfernen">✕</button>` : ''}</label>`;
    $('#verList').innerHTML = ['he', 'en', 'de', 'other'].map(k => {
      const vs = g.versions.filter(v => (KN[v.kind] ? v.kind : 'other') === k);
      return vs.length ? `<div class="vgrp ${k}">${KN[k]}</div>` + vs.map(itemH).join('') : '';
    }).join('');
  }
  $('#verList').addEventListener('click', async e => {
    const csvRel = e.target.dataset && e.target.dataset.csv;
    if (csvRel) {
      e.preventDefault();
      const d = view.loaded.find(x => x.entry.rel === csvRel) || await O.read(csvRel);
      const q = v => /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      const rows = R.flattenNode(d.text).map(r => [`${d.entry.title} ${r.label}`, plain(r.html)]);
      const r = await window.api.saveFile(`${d.entry.title.replace(/[\\/:*?"<>|]/g, '_')}_${d.entry.versionTitle.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)}.csv`, rows.map(x => x.map(q).join(',')).join('\n') + '\n');
      return;
    }
    const rl = e.target.dataset && e.target.dataset.rl;
    if (rl) {
      e.preventDefault();
      const r = await O.ownReload(rl);
      if (r.error) return alert(r.error);
      cache.delete(rl);
      const key = view.group.key, keepSec = view.sections[view.idx] ? view.sections[view.idx].path : null;
      await loadLibrary();
      const g = groupsByKey.get(key);
      if (g) await openGroup(g, { rel: rl, sectionPath: keepSec || undefined, showCompare: true });
      refreshState();
      return;
    }
    const rel = e.target.dataset && e.target.dataset.rm;
    if (!rel) return;
    e.preventDefault();
    if (!confirm('Diesen eigenen Text aus der Bibliothek entfernen? (Die Originaldatei bleibt unberührt.)')) return;
    const r = await O.ownRemove(rel);
    if (r.error) return alert(r.error);
    const key = view.group.key;
    await loadLibrary();
    const g = groupsByKey.get(key);
    if (g) openGroup(g); else showView(); // war das Buch weg, hat loadLibrary den Tab schon entfernt
    refreshState();
  });
  $('#verList').addEventListener('change', async e => {
    const rel = e.target.dataset.rel;
    if (!rel || !view) return;
    if (e.target.checked) view.selected.add(rel); else view.selected.delete(rel);
    if (!view.selected.size) { view.selected.add(rel); }
    rememberKinds();
    view.key = view.sections[view.idx] ? view.sections[view.idx].k : null;
    await loadView();
  });

  // Klick auf eine Spaltenüberschrift: Liste mit den verfügbaren Texten dieser Sprache (anhaken = zeigen) und Schnellauswahlen
  const HEAD_ALL = {
    he: 'Alle hebräischen Texte anzeigen', de: 'Alle deutschen Texte anzeigen', en: 'Alle englischen Texte anzeigen', other: 'Alle anderen Texte anzeigen',
    hede: 'Alle hebräischen und deutschen Texte anzeigen', heen: 'Alle hebräischen und englischen Texte anzeigen', heother: 'Alle hebräischen und anderen Texte anzeigen'
  };
  $('#rOut').addEventListener('click', e => {
    const h = e.target.closest('.row.head > div:not(.lab)');
    if (!h || !view || h.closest('#passDlg')) return;
    const g = view.group, kn = v => (['he', 'en', 'de'].includes(v.kind) ? v.kind : 'other');
    const ci = [...h.parentNode.children].indexOf(h) - 1; // erste Kindzelle ist das Label
    const d = view.loaded[ci]; if (!d) return;
    const k = (['he', 'en', 'de'].includes(d.entry.kind) ? d.entry.kind : 'other');
    const apply = async rels => {
      if (!rels.size) return;
      view.selected = rels; rememberKinds();
      view.key = view.sections[view.idx] ? view.sections[view.idx].k : null;
      await loadView();
    };
    const ofKinds = ks => new Set(g.versions.filter(v => ks.includes(kn(v))).map(v => v.rel));
    const items = [];
    if (view.selected.size > 1) { items.push({ label: 'Diese Version aus der Anzeige entfernen', fn: () => { const n = new Set(view.selected); n.delete(d.entry.rel); apply(n); } }); items.push({ label: 'Nur diese Version anzeigen', fn: () => apply(new Set([d.entry.rel])) }); items.push({ sep: true }); }
    for (const v of g.versions.filter(v => kn(v) === k)) {
      const cur = v.rel === d.entry.rel;
      items.push({ label: (cur ? '✓ ' : '\u2003 ') + shortVer(v.versionTitle), fn: () => { if (cur) return; const n = new Set(view.selected); n.delete(d.entry.rel); n.add(v.rel); apply(n); } }); // ersetzt die Version dieser Spalte
    }
    const r = h.getBoundingClientRect();
    setTimeout(() => ctxShow({ clientX: r.left, clientY: r.bottom + 2, preventDefault() {} }, items), 0); // erst nach dem Klick, sonst schließt ihn der Dokument-Klick sofort wieder
  });

  // Fußnoten werden immer mitgerendert; ob sie sichtbar sind, steuert der Modus (data-notes) per CSS
  function cellHtml(html, d, hit) {
    if (html == null) return '<div class="cell empty"></div>';
    const rtl = d.entry.language === 'Hebrew' || d.entry.language === 'Aramaic';
    if (d.entry.kind === 'he') html = stripHe(html);
    const { main, notes } = R.splitFootnotes(html);
    // Fußnote steht direkt hinter ihrem Zeichen im Text (nicht darunter)
    const inline = R.cleanHtml(main).replace(/<sup data-fn="(\d{1,4})">(.*?)<\/sup>/g, (m, i, mk) => {
      const n = notes[+i];
      return n ? `${m}<span class="note" data-fn="${i}"><span class="nm">${esc(n.marker)}</span> ${R.cleanHtml(n.html)}</span>` : m;
    });
    const linked = d.entry.kind === 'he' && /Tanakh/.test((d.entry.categories || []).join()) ? inline : window.AutoRef.link(inline); // Stellenangaben im Text anklickbar (nicht im Bibeltext selbst)
    return `<div class="cell" data-k="${d.entry.kind}" dir="${rtl ? 'rtl' : 'ltr'}"><div class="txt">${hit ? markHits(linked, hit) : linked}</div></div>`;
  }

  let syncPane = false; // Gleichlauf: Blättern im Hauptfenster blättert im zweiten Fenster mit
  function renderSection(rowLabel, quiet) {
    if (!IS_PANE2 && syncPane && view && p2Frame && !p2Frame.hidden && p2Frame.contentWindow) p2Frame.contentWindow.postMessage({ type: 'sync', idx: view.idx, title: view.group ? view.group.title : '' }, '*');
    const s = view.sections[view.idx];
    $('#rSection').value = String(view.idx);
    fitSection();
    $('#prevSec').disabled = view.idx <= 0;
    $('#nextSec').disabled = view.idx >= view.sections.length - 1;
    if (!s) { $('#rOut').innerHTML = '<p class="muted">In den gewählten Versionen ist kein Text vorhanden.</p>'; return; }
    view.key = s.k;
    const cols = view.loaded.map(d => R.flattenNode(R.getByPath(d.text, s.path)));
    const rows = R.alignRows(cols);
    const vis = view.loaded.map((_, i) => i); // alle gewählten Versionen bleiben als Spalten stehen, auch wenn eine im Abschnitt leer ist
    const n = vis.length;
    const head = `<div class="row head" style="--n:${n}"><div class="lab"></div>${vis.map(i => view.loaded[i]).map(d =>
      `<div title="${esc(I18N.t('Klicken: verfügbare Texte dieser Sprache auswählen'))}">${esc(KIND_LABEL[d.entry.kind])} · ${esc(shortVer(d.versionTitle))}</div>`).join('')}</div>`;
    if (rowLabel != null && !rows.some(r => r.label === rowLabel)) { // „2“ trifft bei Kommentaren die erste Zeile „2:1“
      const f = rows.find(r => r.label.startsWith(rowLabel + ':'));
      if (f) rowLabel = f.label;
    }
    // der gesuchte Vers bleibt markiert (auch nach Tab-Wechseln), bis man das Kapitel wechselt
    if (rowLabel != null && !quiet) view.hit = { k: s.k, label: rowLabel };
    else if (rowLabel == null) { if (view.hit && view.hit.k === s.k && rows.some(r => r.label === view.hit.label)) rowLabel = view.hit.label; else view.hit = null; }
    if (view.vf && view.vf.k !== s.k) view.vf = null; // die Versauswahl gilt nur für den Abschnitt, in den gesprungen wurde
    const shownRows = view.vf ? rows.filter(r => { const v = rowVerse(r.label); return v != null && view.vf.set.has(v); }) : rows;
    if (view.vf && shownRows.length) view.vf.set = new Set(shownRows.map(r => rowVerse(r.label))); // „1-40“ in einem Kapitel mit 31 Versen gilt als 1–31, damit der Favorit überall dieselbe ID hat
    const vfBar = view.vf ? `<div class="vfbar">${esc(I18N.t('Ausgewählte Verse: {}', view.vf.text))} <button id="vfStar" type="button" title="${esc(I18N.t('Als Favorit speichern / entfernen'))}">☆</button> <button id="vfClear" type="button">${esc(I18N.t('Alle Verse zeigen'))}</button></div>` : '';
    const body = shownRows.map(r =>
      `<div class="row${rowLabel != null && !quiet && r.label === rowLabel ? ' hit' : ''}" data-l="${esc(r.label)}" style="--n:${n}"><div class="lab">${esc(r.label)}</div>${vis.map(i => cellHtml(r.cells[i], view.loaded[i])).join('')}</div>`).join('');
    $('#rOut').innerHTML = vfBar + head + body;
    recordNav(s, rowLabel);
    pushHistory(s, rowLabel);
    renderTabs();
    saveSession();
    markNotes();
    markAudio();
    if (!$('#outlinePanel').hidden) renderOutline();
    markMismatch();
    loadLinks(s);
    if (window.__refind) setTimeout(window.__refind, 0);
    { const ck = view.group.key + '|' + s.k; if (ck !== lastCmtKey) { cmtRow = null; lastCmtKey = ck; } }
    applyCmtRowSoon();
    const hit = $('#rOut .row.hit') || (quiet && rowLabel != null ? [...$$('#rOut .row[data-l]')].find(x => x.dataset.l === rowLabel) : null);
    if (hit) hit.scrollIntoView({ block: quiet ? 'start' : 'center' }); else window.scrollTo(0, 0);
  }

  // Die Kapitel-Auswahl ist nur so breit wie der gewählte Eintrag
  let fitSpan = null;
  function fitSection() {
    const sel = $('#rSection'); if (!sel || !sel.selectedOptions[0]) return;
    if (!fitSpan) { fitSpan = document.createElement('span'); fitSpan.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0'; document.body.appendChild(fitSpan); }
    const cs = getComputedStyle(sel);
    fitSpan.style.font = cs.font; fitSpan.style.letterSpacing = cs.letterSpacing;
    fitSpan.textContent = sel.selectedOptions[0].textContent;
    sel.style.width = Math.ceil(fitSpan.getBoundingClientRect().width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 34) + 'px';
  }
  $('#rSection').onchange = () => { view.idx = +$('#rSection').value; renderSection(); };
  $('#prevSec').onclick = () => { if (view.idx > 0) { view.idx--; renderSection(); } };
  $('#nextSec').onclick = () => { if (view.idx < view.sections.length - 1) { view.idx++; renderSection(); } };
  // Fußnoten: Klick auf das Zeichen im Text öffnet/schließt die Fußnote; ein Klick auf die geöffnete Fußnote schließt sie
  $('#rOut').addEventListener('click', e => {
    const sup = e.target.closest('sup[data-fn]');
    if (sup) {
      const note = sup.nextElementSibling && sup.nextElementSibling.classList.contains('note') ? sup.nextElementSibling : null;
      if (note) note.classList.toggle('open');
      return;
    }
    // Klick in den Fußnotentext schließt nichts – so lässt sich der Text markieren und kopieren
  });

  // OSHB-Texte: Klick auf ein Wort zeigt Lemma, Stamm, Zeit und Form; „Im Wörterbuch“ schlägt das Lemma nach
  let wpop = null;
  const closeWpop = () => { if (wpop) { wpop.remove(); wpop = null; } $$('#rOut .w.sel, #rOut .wt.sel, #rOut .wg.sel').forEach(x => x.classList.remove('sel')); };
  // Septuaginta (CATSS): Klick auf eine griechische Wortgruppe zeigt die hebräischen Wörter, denen sie zugeordnet ist
  const GFLAG = { z: 'Zusatz der Septuaginta (kein hebräisches Gegenstück)', m: 'Minus der Septuaginta (hebräisches Wort ohne griechisches Gegenstück)', d: 'Doublette: ein hebräisches Wort ist doppelt übersetzt', i: 'Infinitivus absolutus im Hebräischen', t: 'Transliteriertes hebräisches Wort', v: 'Griechisches Präverb für eine hebräische Präposition', s: 'Komparativ/Superlativ (hebr. מ)', u: 'Gegenstück steht an anderer Stelle im Vers (Umstellung oder Verteilung)' };
  function showGreekUnit(w) {
    const hs = (w.dataset.h || '').split(' ').filter(Boolean), rs = (w.dataset.r || '').split(' ').filter(Boolean), fl = (w.dataset.f || '').split('').filter(c => GFLAG[c]);
    w.classList.add('sel');
    wpop = document.createElement('div');
    wpop.id = 'wpop';
    const btns = a => `<div class="wgh">${a.map(h => `<button class="wdict" dir="rtl" lang="he" data-q="${esc(h)}" title="Im Wörterbuch nachschlagen">${esc(h)}</button>`).join(' ')}</div>`;
    let body = hs.length ? `<div class="wseg main">${fl.includes('m') ? 'Hebräisches Wort (CATSS)' : 'Hebräisches Gegenstück (CATSS)'}</div>${btns(hs)}`
      : (fl.includes('m') ? '' : '<div class="wseg main">Kein hebräisches Gegenstück (Zusatz der Septuaginta)</div>');
    if (rs.length) body += `<div class="wseg">Rückübersetzung (vermutliche hebräische Vorlage)</div>${btns(rs)}`;
    const notes = fl;
    if (notes.length) body += `<div class="wseg">Besonderheiten</div><ul class="gfl">${notes.map(c => `<li>${GFLAG[c]}</li>`).join('')}</ul>`;
    const word = fl.includes('m') ? hs.join(' ') : w.textContent;
    wpop.innerHTML = `<div class="wtop"><span dir="${fl.includes('m') ? 'rtl' : 'ltr'}" lang="${fl.includes('m') ? 'he' : 'grc'}" class="wword">${esc(word)}</span><button class="wx" title="Schließen">✕</button></div>${body}`;
    document.body.appendChild(wpop);
    const r = w.getBoundingClientRect(), pw = wpop.offsetWidth, ph = wpop.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2));
    let y = r.bottom + 6; if (y + ph > window.innerHeight - 8) y = Math.max(8, r.top - ph - 6);
    wpop.style.left = x + 'px'; wpop.style.top = y + 'px';
    wpop.onclick = ev => {
      if (ev.target.closest('.wx')) closeWpop();
      const b = ev.target.closest('.wdict'); if (b) openDict(b.dataset.q);
    };
  }
  // Targum-Wörter (ETCBC): Lexem, Wurzel, Bedeutung, Wortart, Stamm, Genus/Numerus/Status
  const T_SP = { subs: 'Substantiv', verb: 'Verb', prep: 'Präposition', conj: 'Konjunktion', pron: 'Pronomen', advb: 'Adverb', adjv: 'Adjektiv', intj: 'Interjektion', nmpr: 'Eigenname', art: 'Artikel', unknown: 'unbekannt' };
  const T_VS = { G: 'Peal (G)', D: 'Pael (D)', C: 'Aphel (C)', Gt: 'Ethpeel (Gt)', Dt: 'Ethpaal (Dt)', Ct: 'Ittaphal (Ct)', DD: 'Pael-Variante (DD)', PO: 'Pol (PO)', POT: 'Ethpol (POT)' };
  const T_ST = { e: 'Emphaticus', a: 'Absolutus', c: 'Constructus', x: 'Absolutus oder Constructus' };
  const T_NU = { s: 'Singular', pl: 'Plural' }, T_GN = { m: 'maskulin', f: 'feminin' };
  function showTargumWord(w) {
    const [sp, vs, st, nu, gn] = w.dataset.m.split('.');
    const lx = (window.TARGUM_LEX || {})[w.dataset.l] || ['', '', ''];
    w.classList.add('sel');
    const parts = [];
    if (sp !== '-') parts.push(`<b>${esc(T_SP[sp] || sp)}</b>`);
    if (vs !== '-') parts.push(`Stamm: <b>${esc(T_VS[vs] || vs)}</b>`);
    if (gn !== '-') parts.push(esc(T_GN[gn] || gn));
    if (nu !== '-') parts.push(esc(T_NU[nu] || nu));
    if (st !== '-') parts.push(esc(T_ST[st] || st));
    let h = '<div class="wseg main">';
    if (lx[0]) h += `<span class="wlem" dir="rtl" lang="he">${esc(lx[0])}</span> `;
    if (lx[2]) h += `<span class="muted">${esc(lx[2])}</span><br>`;
    if (lx[1] && lx[1] !== lx[0]) h += `Wurzel: <span dir="rtl" lang="he" class="wlem">${esc(lx[1])}</span><br>`;
    h += parts.join(' · ') + '</div>';
    wpop = document.createElement('div');
    wpop.id = 'wpop';
    wpop.innerHTML = `<div class="wtop"><span dir="rtl" lang="he" class="wword">${esc(w.textContent)}</span><button class="wx" title="Schließen">✕</button></div>${h}${lx[0] ? `<button class="wdict" data-q="${esc(lx[0])}">Im Wörterbuch nachschlagen</button>` : ''}`;
    document.body.appendChild(wpop);
    const r = w.getBoundingClientRect(), pw = wpop.offsetWidth, ph = wpop.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2));
    let y = r.bottom + 6; if (y + ph > window.innerHeight - 8) y = Math.max(8, r.top - ph - 6);
    wpop.style.left = x + 'px'; wpop.style.top = y + 'px';
    wpop.onclick = ev => {
      if (ev.target.closest('.wx')) closeWpop();
      const b = ev.target.closest('.wdict'); if (b) openDict(b.dataset.q);
    };
  }
  $('#rOut').addEventListener('click', e => {
    const w = e.target.closest('.w[data-m], .wt[data-m], .wg');
    if (!w) { if (!e.target.closest('#wpop')) closeWpop(); return; }
    if (window.getSelection && String(window.getSelection())) return; // beim Markieren nicht stören
    const same = w.classList.contains('sel');
    closeWpop();
    if (same) return;
    if (w.classList.contains('wt')) { showTargumWord(w); return; }
    if (w.classList.contains('wg')) { showGreekUnit(w); return; }
    const d = window.Morph.decode(w.dataset.m, w.dataset.l);
    if (!d) return;
    const LEM = window.OSHB_LEMMAS || {};
    w.classList.add('sel');
    const rows = d.segs.map((s, i) => {
      const lem = s.lemma && LEM[s.lemma] ? LEM[s.lemma] : null;
      const parts = [`<b>${esc(s.pos)}</b>`];
      if (s.stem) parts.push(`Stamm: <b>${esc(s.stem)}</b>`);
      if (s.tense) parts.push(`Zeit/Form: <b>${esc(s.tense)}</b>`);
      if (s.info) parts.push(esc(s.info));
      let h = `<div class="wseg${i === d.main ? ' main' : ''}">`;
      if (s.prefix) h += `<span class="wpre">${esc(s.prefix)}</span> `;
      if (lem) h += `<span class="wlem" dir="rtl" lang="he">${esc(lem[0])}</span> <span class="muted">${esc(I18N.lang === 'de' && lem[2] ? lem[2] : lem[1])}</span><br>`;
      return h + parts.join(' · ') + '</div>';
    }).join('');
    const mainSeg = d.segs[d.main], lem = mainSeg && mainSeg.lemma && LEM[mainSeg.lemma];
    wpop = document.createElement('div');
    wpop.id = 'wpop';
    wpop.innerHTML = `<div class="wtop"><span dir="rtl" lang="he" class="wword">${esc(w.textContent)}</span><button class="wx" title="Schließen">✕</button></div>${rows}${lem ? `<button class="wdict" data-q="${esc(lem[0])}">Im Wörterbuch nachschlagen</button>` : ''}`;
    document.body.appendChild(wpop);
    const r = w.getBoundingClientRect(), pw = wpop.offsetWidth, ph = wpop.offsetHeight;
    let x = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2));
    let y = r.bottom + 6; if (y + ph > window.innerHeight - 8) y = Math.max(8, r.top - ph - 6);
    wpop.style.left = x + 'px'; wpop.style.top = y + 'px';
    wpop.ondblclick = ev => { // Doppelklick auf ein Wort im Popup schlägt es im Wörterbuch nach (das Lemma als Ganzes mit seinen Zeichen)
      if (ev.target.closest('button')) return;
      const lw = ev.target.closest('.wlem');
      const sel = (window.getSelection() + '').trim().replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '');
      const q = lw ? lw.textContent.trim() : sel;
      if (q && q.length <= 40 && !/\s/.test(q)) openDict(q);
    };
    wpop.onclick = ev => {
      if (ev.target.closest('.wx')) closeWpop();
      const b = ev.target.closest('.wdict'); if (b) openDict(b.dataset.q);
    };
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWpop(); });
  window.addEventListener('scroll', closeWpop, { passive: true, capture: true });

  // Fußnoten-Modus (per Klick / immer / aus), wird gemerkt
  let noteMode = 'click';
  try { noteMode = localStorage.getItem('noteMode') || 'click'; } catch { /* egal */ }
  if (!['click', 'all', 'off'].includes(noteMode)) noteMode = 'click';
  const applyNoteMode = () => { $('#rOut').dataset.notes = noteMode; $('#noteMode').value = noteMode; try { localStorage.setItem('noteMode', noteMode); } catch { /* egal */ } };
  $('#noteMode').onchange = () => { noteMode = $('#noteMode').value; applyNoteMode(); };
  applyNoteMode();
  // Septuaginta interlinear: hebräisches Wort über der griechischen Wortgruppe (Standard: an)
  let gIlin = true;
  try { gIlin = localStorage.getItem('gIlin') !== '0'; } catch { /* egal */ }
  const applyIlin = () => { $('#rOut').dataset.ilin = gIlin ? '1' : '0'; $('#gIlin').checked = gIlin; try { localStorage.setItem('gIlin', gIlin ? '1' : '0'); } catch { /* egal */ } };
  $('#gIlin').onchange = () => { gIlin = $('#gIlin').checked; applyIlin(); };
  applyIlin();

  // Bücherliste links ein-/ausklappen (Knopf oder Cmd+B), wird gemerkt
  let panelOpen = true;
  try { panelOpen = localStorage.getItem('panel') !== '0'; } catch { /* egal */ }
  const applyPanel = () => {
    $('.layout').classList.toggle('collapsed', !panelOpen);
    $('#togglePanel').setAttribute('aria-pressed', String(panelOpen));
    $('nav [data-tab=read]').classList.toggle('listoff', !panelOpen);
    try { localStorage.setItem('panel', panelOpen ? '1' : '0'); } catch { /* egal */ }
  };
  const togglePanel = () => { panelOpen = !panelOpen; applyPanel(); };
  $('#togglePanel').onclick = togglePanel;
  const closeListOutside = e => { // Klick außerhalb der Bücherliste schließt sie
    if (!panelOpen || (document.documentElement.dataset.tab || 'read') !== 'read') return;
    if (e.target.closest('aside:not(#dictPanel):not(#cmtPanel):not(#linkPanel), nav, #togglePanel, #suggest, #ctxMenu, #tip, dialog')) return;
    // Knöpfe, Links, Auswahlfelder: erst beim Klick schließen – sonst verschiebt sich das Layout schon beim Drücken und der Klick geht ins Leere
    if (e.type !== 'click' && e.target.closest('button, a, select, label, input, [role=button], .chip, [data-ref]')) return;
    panelOpen = false; applyPanel();
  };
  ['pointerdown', 'mousedown', 'click'].forEach(ev => document.addEventListener(ev, closeListOutside, true));
  $('#treeClose').onclick = togglePanel;
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') { e.preventDefault(); togglePanel(); }
  });
  applyPanel();

  // Zu einer Stelle springen: "3", "3:7", "Daf 2a", "gen. 1:1" (Buchname optional, Anfang genügt)
  // ---------- Mehrere Stellen in einem Fenster: „gen 1:3, ex 7:9“, „gen 1:30-2:3“, „gen 1-3“ ----------
  const { normT, rowVerse, noteId, parseVerseList, fmtVerses, relatedTitles, sefariaUrl, noteUrl, deHit, deNames } = window.Refs;
  // Titel passt zur Eingabe: Anfang des Titels, Anfang eines Titelworts oder – bei mehreren Wörtern („rashi genesis“) – jedes Eingabewort beginnt ein Titelwort
  const titleHit = (title, b) => { const t = normT(title); return deHit(title, b) || t.startsWith(b) || t.split(' ').some(w => w.startsWith(b)) || (b.includes(' ') && b.split(' ').every(k => t.split(' ').some(w => w.startsWith(k)))); };
  const bestGroup = book => {
    const b = normT(book);
    const c = groups.filter(x => titleHit(x.title, b));
    c.sort((x, y) => (normT(x.title) === b ? 0 : 1) - (normT(y.title) === b ? 0 : 1) || (normT(x.title).startsWith(b) ? 0 : 1) - (normT(y.title).startsWith(b) ? 0 : 1) || x.title.length - y.title.length);
    return c[0] || null;
  };
  function parseMulti(q) {
    // Aufteilen: „;“ trennt immer. „,“ trennt, wenn danach ein Buchname („gen“, „1 Kings 2:1“) oder Kapitel:Vers („2:5“) folgt;
    // eine bloße Zahl gehört zur Versliste („gen 1:1-5, 9“), außer die Stelle davor hat noch kein „:“ („Psalms 23, 24“ = zwei Kapitel)
    const segs = [];
    // Buchtitel mit Komma („Mishneh Torah, Vows“, „Pesikta d'Rav Kahana, …“) dürfen nicht an diesem Komma zerteilt werden
    let q0 = String(q);
    { const lo = q0.toLowerCase();
      for (const g of groups) { if (!g.title.includes(',')) continue; const t = g.title.toLowerCase(), i = lo.indexOf(t); if (i >= 0) q0 = q0.slice(0, i) + g.title.replace(/,/g, '\u0001') + q0.slice(i + t.length); } }
    for (const chunk of q0.split(';')) {
      let cur = null;
      for (const t of chunk.split(',')) {
        const tt = t.trim(); if (!tt) continue;
        if (cur === null) { cur = tt; continue; }
        const startsNew = /^\p{L}/u.test(tt) || /^\d+\s*:/.test(tt) || /^\d+\s+\p{L}/u.test(tt) || !cur.includes(':');
        if (startsNew) { segs.push(cur); cur = tt; } else cur += ', ' + tt;
      }
      if (cur !== null) segs.push(cur);
    }
    for (let i = 0; i < segs.length; i++) segs[i] = segs[i].replace(/\u0001/g, ',');
    const units = [], bad = [];
    let multi = segs.length > 1, lastBook = '';
    const NUM = '\\d+', RNG = '(?:\\d+(?:\\s*[-–]\\s*\\d+)?)';
    for (const seg of segs) {
      let m;
      if ((m = seg.match(new RegExp('^(.*?)\\s*(' + NUM + ')\\s*:\\s*(' + NUM + ')\\s*[-–]\\s*(' + NUM + ')\\s*:\\s*(' + NUM + ')$')))) {
        multi = true; const book = m[1].trim() || lastBook; lastBook = book;
        const c1 = +m[2], v1 = +m[3], c2 = +m[4], v2 = +m[5];
        if (c2 < c1 || c2 - c1 > 60) { bad.push(seg); continue; }
        for (let c = c1; c <= c2; c++) units.push({ book, chap: String(c), vs: (c === c1 ? `${v1}–` : '1–') + (c === c2 ? v2 : '…'), pred: v => (c !== c1 || v >= v1) && (c !== c2 || v <= v2) });
      } else if ((m = seg.match(new RegExp('^(.*?)\\s*(?<![:\\d])(' + NUM + ')\\s*[-–]\\s*(' + NUM + ')$')))) {
        multi = true; const book = m[1].trim() || lastBook; lastBook = book;
        const c1 = +m[2], c2 = +m[3];
        if (c2 < c1 || c2 - c1 > 60) { bad.push(seg); continue; }
        for (let c = c1; c <= c2; c++) units.push({ book, chap: String(c), vs: '', pred: null, ab: true }); // ab: beim Talmud beide Seiten (2a und 2b)
      } else if ((m = seg.match(new RegExp('^(.*?)\\s*(?:\\b(?:daf|kapitel|chapter|kap)\\s*)?(\\d+[ab]?)(?:\\s*:\\s*(' + RNG + '(?:\\s*,\\s*' + RNG + ')*))?$', 'i')))) {
        const book = m[1].trim() || lastBook || (view && view.group ? view.group.title : ''); lastBook = book;
        let set = null, vs = '';
        if (m[3]) {
          set = new Set(); const parts = [];
          for (const part of m[3].split(',')) { const [a, b] = part.split(/[-–]/).map(x => parseInt(x, 10)); const lo = Number.isFinite(b) ? Math.min(a, b) : a, hi = Number.isFinite(b) ? Math.min(Math.max(a, b), lo + 500) : a; for (let v = lo; v <= hi; v++) set.add(v); parts.push(lo === hi ? String(lo) : lo + '–' + hi); }
          vs = parts.join(', ');
        }
        units.push({ book, chap: m[2].toLowerCase(), vs, pred: set ? (v => set.has(v)) : null });
      } else if (/\p{L}/u.test(seg) && bestGroup(seg)) { // nur ein Buchname („1 Samuel“): erstes Kapitel
        lastBook = seg; units.push({ book: seg, chap: '1', vs: '', pred: null }); // ein einzelner Buchname ist keine Stellenliste (jumpTo öffnet das Buch selbst)
      } else bad.push(seg);
    }
    return multi ? { units, bad } : null;
  }
  function toggleBlock(b) { // b: { key, title, sk, secLabel, set: [Verse], vs }
    const id = noteId({ key: b.key }, b.sk, 'blk:' + b.vs);
    const old = notesAll.find(n => n.id === id);
    openNoteDlg(old || { id, kind: 'block', key: b.key, title: b.title, sk: b.sk, secLabel: b.secLabel, row: String(b.set.length ? Math.min(...b.set) : ''), vs: b.vs, set: b.set, excerpt: '', note: '', order: topOrder() }, { canDelete: !!old });
  }
  async function openPassages(pm) {
    const gcache = new Map(), blocks = [], missing = [...pm.bad];
    for (const u of pm.units) {
      const g = bestGroup(u.book);
      if (!g) { missing.push(`${u.book} ${u.chap}`); continue; }
      let G = gcache.get(g.key);
      if (!G) {
        const loaded = [];
        for (const rel of pickVersions(g)) {
          let d = cache.get(rel);
          if (!d) { try { d = await O.read(rel); const ver = g.versions.find(x => x.rel === rel); d.__b = (ver && ver.bytes) || 2e6; cache.set(rel, d); } catch { continue; } }
          loaded.push(d);
        }
        loaded.sort((a, b) => KIND_RANK[a.entry.kind] - KIND_RANK[b.entry.kind]);
        const seen = new Set(), secs = [];
        for (const d of loaded) for (const s0 of R.sectionsOf(d.text, d.sectionNames)) {
          const fi = s0.path.findIndex(p => typeof p === 'number');
          const path = fi >= 0 ? s0.path.slice(0, fi + 1) : s0.path;
          const label = fi >= 0 && fi + 1 < s0.path.length ? R.pathLabel(path, d.sectionNames) : s0.label;
          const k = JSON.stringify(path);
          if (!seen.has(k)) { seen.add(k); secs.push({ path, label, k }); }
        }
        G = { g, loaded, secs }; gcache.set(g.key, G);
      }
      const find = n => G.secs.findIndex(x => x.label.toLowerCase().endsWith(' ' + n) || x.label.toLowerCase() === n);
      const idxs = [], i0 = find(u.chap);
      if (i0 >= 0) idxs.push(i0);
      else if (/^\d+$/.test(u.chap)) { const a = find(u.chap + 'a'); if (a >= 0) idxs.push(a); if (u.ab) { const b2 = find(u.chap + 'b'); if (b2 >= 0) idxs.push(b2); } }
      if (!idxs.length) { missing.push(`${g.title} ${u.chap}`); continue; }
      for (const i of idxs) {
      const sec = G.secs[i];
      const cols = G.loaded.map(d => R.flattenNode(R.getByPath(d.text, sec.path)));
      let rows = R.alignRows(cols);
      if (u.pred) rows = rows.filter(r => { const v = rowVerse(r.label); return v != null && u.pred(v); });
      if (!rows.length) { missing.push(`${g.title} ${u.chap}${u.vs ? ':' + u.vs : ''}`); continue; }
      const n = G.loaded.length;
      const head = `<div class="row head" style="--n:${n}"><div class="lab"></div>${G.loaded.map(d => `<div>${esc(KIND_LABEL[d.entry.kind])} · ${esc(shortVer(d.versionTitle))}</div>`).join('')}</div>`;
      const body = rows.map(r => `<div class="row" data-l="${esc(r.label)}" style="--n:${n}"><div class="lab">${esc(r.label)}</div>${G.loaded.map((d, k) => cellHtml(r.cells[k], d)).join('')}</div>`).join('');
      const vset = u.pred ? rows.map(r => rowVerse(r.label)).filter(v => v != null) : [], vtxt = vset.length ? fmtVerses(vset) : '';
      blocks.push(`<section class="pgb"><h3 class="pgh" data-key="${esc(g.key)}" data-sk="${esc(sec.k)}" data-row="${esc(rows[0].label)}" data-set="${esc(JSON.stringify(vset))}" data-vs="${esc(vtxt)}" data-title="${esc(g.title)}" data-sec="${esc(sec.label)}" title="Zum Lesen öffnen"><button class="pstar" type="button" title="Als Favorit speichern / entfernen" data-id="${esc(noteId(g, sec.k, 'blk:' + vtxt))}">☆</button> ${esc(g.title)} · ${esc(sec.label)}${vtxt ? ' · ' + esc(vtxt) : ''}</h3>${head}${body}</section>`);
      }
    }
    if (!blocks.length) return false;
    $('#passOut').innerHTML = blocks.join('') + (missing.length ? `<p class="muted">${esc(I18N.t('Nicht gefunden: {}', missing.join(', ')))}</p>` : '');
    markNotes();
    if (!$('#passDlg').open) $('#passDlg').showModal();
    $('#passOut').scrollTop = 0; $('#passOut').focus(); // Fokus nicht auf den ✕-Knopf, sonst schließt das Enter-Loslassen das Fenster sofort
    return true;
  }
  $('#passOut').addEventListener('click', e => {
    const h = e.target.closest('.pgh'); if (!h) return;
    if (e.target.closest('.pstar')) { toggleBlock({ key: h.dataset.key, title: h.dataset.title, sk: h.dataset.sk, secLabel: h.dataset.sec, set: JSON.parse(h.dataset.set || '[]'), vs: h.dataset.vs }); return; }
    const g = groupsByKey.get(h.dataset.key); if (!g) return;
    $('#passDlg').close();
    openGroup(g, { sectionPath: JSON.parse(h.dataset.sk), rowLabel: h.dataset.row }, e.metaKey || e.ctrlKey);
  });
  async function jumpTo(q, inNewTab = false) {
    { const ps = window.Parashot && window.Parashot.find(q); if (ps) return jumpTo(window.Parashot.ref(ps), inNewTab); } // Wochenabschnitt: „Noach“, „Parascha Lech Lecha“, „פרשת ויחי“
    { const pm = parseMulti(q); if (pm) return openPassages(pm); }
    // Versauswahl wie „gen 1:1-5,9“: springt zum Kapitel und zeigt nur diese Verse
    let vsel = null;
    { const rg = String(q).trim().match(/^(.*?)\s*(?:\b(?:daf|kapitel|chapter|kap)\s*)?(\d+[ab]?)\s*:\s*(\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)*)$/i);
      if (rg && /[-–,]/.test(rg[3])) {
        const pv = parseVerseList(rg[3]), set = pv.set;
        vsel = { set, text: rg[2] + ':' + pv.vs };
        q = rg[1] + ' ' + rg[2] + ':' + Math.min(...set);
      } }
    const m = String(q).trim().match(/^(.*?)\s*(?:\b(?:daf|kapitel|chapter|kap)\s*)?(\d+[ab]?)(?:\s*[:,.\s]\s*(?:(?:vers|verse|v)\.?\s*)?(\d+))?(?::\d+)*$/i);
    if (!m) {
      // nur ein Buchname ohne Zahl („genesis“ + Enter): Buch von vorn (erstes Kapitel) öffnen
      const b = normT(q);
      if (!b || !/\p{L}/u.test(b)) return false;
      const c = groups.filter(g => titleHit(g.title, b))
        .sort((a, b2) => (normT(a.title) === b ? 0 : 1) - (normT(b2.title) === b ? 0 : 1) || (normT(a.title).startsWith(b) ? 0 : 1) - (normT(b2.title).startsWith(b) ? 0 : 1) || a.title.length - b2.title.length);
      if (!c.length) return false;
      await openGroup(c[0], {}, inNewTab);
      return true;
    }
    const book = normT(m[1]), num = m[2].toLowerCase(), verse = m[3];
    let g = view && view.group;
    if (book) {
      const cands = groups.filter(x => titleHit(x.title, book));
      cands.sort((a, b) => (normT(a.title) === book ? 0 : 1) - (normT(b.title) === book ? 0 : 1) || (normT(a.title).startsWith(book) ? 0 : 1) - (normT(b.title).startsWith(book) ? 0 : 1) || a.title.length - b.title.length);
      // Kein Treffer auf den Buchnamen selbst, nur Kommentare „X on <Buch>“: nicht den falschen Kommentar öffnen
      if (cands.length && normT(cands[0].title) !== book && !/\bon\b/.test(book) && cands.every(x => /\bon\b/.test(normT(x.title)))) return false;
      if (!cands.length) return false;
      if (!g || cands[0] !== g || inNewTab) { g = cands[0]; await openGroup(g, {}, inNewTab); }
    }
    if (!g || !view) return false;
    const find = n => view.sections.findIndex(s => s.label.toLowerCase().endsWith(' ' + n) || s.label.toLowerCase() === n);
    let idx = find(num);
    if (idx < 0 && /^\d+$/.test(num)) idx = find(num + 'a'); // Talmud: „3“ = Daf 3a
    if (idx < 0) return false;
    view.idx = idx;
    view.vf = vsel ? { k: view.sections[idx].k, set: vsel.set, text: vsel.text } : null;
    renderSection(verse);
    return true;
  }
  // Springen-Feld als Suche: Wörter (hebräisch: mit allen Formen) im Tanach suchen; die Fundstellen stehen als Lesetext in einem eigenen Tab
  function jumpSearch(q) {
    q = String(q || '').trim();
    if (!q || !/\p{L}/u.test(q)) return false;
    const he = /[֐-׿]/.test(q);
    saveScroll();
    const nv = { group: null, sres: { q, he, limit: 300, html: null, params: { query: q, extra: [], distance: -1, ordered: false, fuzzy: false, prefix: false, kinds: he ? ['he'] : ['de', 'en'], categories: [], titles: [...TANAKH_BOOKS], wlc: true, lemma: he } } };
    if (view && !view.group && tabs[tabIdx] === view) tabs[tabIdx] = nv; // „Neuer Tab“ oder alte Suche wird ersetzt
    else { tabs.push(nv); tabIdx = tabs.length - 1; }
    view = nv;
    showTab('read');
    showView();
    return true;
  }
  async function runSres(V) {
    const S = V.sres;
    S.running = true;
    $('#rOut').innerHTML = `<p class="muted">${esc(I18N.t('Suche läuft …'))}</p>`;
    let res;
    try {
      res = await O.search({ ...S.params, limit: S.limit, perFile: 5000 });
    } catch { res = null; }
    if (!res) { S.running = false; if (view === V) $('#rOut').innerHTML = '<p class="muted">' + esc(I18N.t('Die Suche ist fehlgeschlagen.')) + '</p>'; return; }
    S.res = res;
    return renderSres(V);
  }
  // Fassung wählen: bei nichthebräischer Suche immer nur eine Übersetzung (plus hebräischer Text), nicht alle Fassungen gleichzeitig
  async function renderSres(V) {
    const S = V.sres, res0 = S.res;
    S.running = true;
    let res = res0, verSel = '';
    if (!S.he) {
      const cnt = new Map();
      res0.results.forEach(r => { if (r.kind === 'he') return; const k = (r.versionTitle || '') + '\u0000' + r.kind; cnt.set(k, (cnt.get(k) || 0) + 1); });
      const keys = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
      if (keys.length) {
        if (!S.ver || !cnt.has(S.ver)) S.ver = keys[0][0];
        res = { ...res0, results: res0.results.filter(r => r.kind !== 'he' && (r.versionTitle || '') + '\u0000' + r.kind === S.ver) };
        res.stats = []; const sm = new Map(); res.results.forEach(r => sm.set(r.title, (sm.get(r.title) || 0) + 1)); sm.forEach((n, title) => res.stats.push({ title, n }));
        verSel = `<select id="sresVer" title="${esc(I18N.t('Fassungen'))}">${keys.map(([k, n]) => { const [v, kind] = k.split('\u0000'); return `<option value="${esc(k)}"${k === S.ver ? ' selected' : ''}>${esc(KIND_LABEL[kind] + ' · ' + (v ? shortVer(v) : '') + ' (' + n + ')')}</option>`; }).join('')}</select>`;
      }
    }
    const body = await buildReadHtml(res.results, () => tabs.includes(V), !S.he && !!verSel);
    S.running = false;
    if (body == null) return;
    const books = res.stats.length, hits = res.results.length;
    const chips = res.stats.map(x => `<button class="chip" data-jb="${esc(x.title)}" title="${esc(I18N.t('Zu diesem Buch springen'))}">${esc(x.title)} (${x.n})</button>`).join(' ');
    S.html = `<div class="sread sresv"><div class="sresHead" id="sresTop"><b>${esc(I18N.t('Suche'))}: <span dir="auto">${esc(S.q)}</span></b> · ${esc(I18N.t('{#} Verse in {#} Büchern', hits + (res.truncated ? '+' : ''), books))}${S.params.lemma ? ' · ' + esc(I18N.t('alle Formen des Wortes')) : ''} ${verSel}${res.truncated ? ` <button id="sresMore">${esc(I18N.t('Weitere laden'))}</button>` : ''}</div>${books > 1 ? `<div class="sresBooks">${chips}</div>` : ''}${body || `<p class="muted">${esc(I18N.t('Nichts gefunden.'))}</p>`}</div>`;
    if (view === V) { $('#rOut').innerHTML = S.html; ['he', 'en', 'de'].forEach(k => $('#rOut').style.setProperty('--' + k + 'f', disp[k])); }
  }
  // Klicks im Suchtab: Vers wählen (Kommentare, Verknüpfungen), Kapitel öffnen, weitere laden
  let cmtVirt = null; // Fundstelle, zu der das Kommentar-Panel im Suchtab gerade Kommentare zeigt
  async function sresSelect(row, what) {
    const v = /^\d+$/.test(row.dataset.sl) ? +row.dataset.sl : null;
    if (v == null || !view || !view.sres) return;
    cmtVirt = { title: row.dataset.t, ch: row.dataset.ch, label: row.dataset.sec };
    cmtRow = String(v);
    secLinks = [];
    if (linksReady) { try { secLinks = await LK.section(cmtVirt.title, cmtVirt.ch); } catch { secLinks = []; } }
    secLinks = secLinks.concat(parRows(cmtVirt.title, cmtVirt.ch));
    $$('#rOut .row.cmtrow').forEach(r => r.classList.remove('cmtrow'));
    row.classList.add('cmtrow');
    if (what === 'lk') { lkVerse = v; renderLinkPanel(); }
    else if (!cmtOpen) toggleCmt(true); else renderCmt();
  }
  $('#rOut').addEventListener('change', e => { if (e.target.id !== 'sresVer' || !view || !view.sres || !view.sres.res) return; view.sres.ver = e.target.value; view.sres.html = null; renderSres(view); });
  $('#rOut').addEventListener('click', e => {
    if (!view || !view.sres) return;
    if (e.target.id === 'sresMore') { view.sres.limit += 300; view.sres.html = null; view.sres.running = false; runSres(view); return; }
    const jb = e.target.closest('[data-jb]');
    if (jb) { const h = [...$$('#rOut .sbook')].find(x => x.dataset.t === jb.dataset.jb); if (h) h.scrollIntoView({ block: 'start' }); return; }
    if (e.target.closest('.sup')) { $('#sresTop').scrollIntoView({ block: 'start' }); return; }
    const go = e.target.closest('.sgo');
    if (go) { const g = [...groupsByKey.values()].find(x => x.title === go.dataset.t); const nx = go.closest('.ssec').nextElementSibling; const first = nx && nx.dataset && nx.dataset.sl; if (g) openGroup(g, { sectionPath: JSON.parse(go.dataset.sp), rowLabel: first || undefined }, true); return; }
    const row = e.target.closest('.row[data-sp]');
    if (!row) return;
    if (e.target.closest('.slk')) return sresSelect(row, 'lk');
    if (e.target.closest('.scm')) return sresSelect(row, 'cmt');
    if (e.target.closest('.lab')) { if (cmtOpen) sresSelect(row, 'cmt'); else { $$('#rOut .row.cmtrow').forEach(r => r.classList.remove('cmtrow')); row.classList.add('cmtrow'); } }
  });
  $('#rOut').addEventListener('dblclick', e => { // Doppelklick auf die Versnummer: Kommentare dieses Verses
    if (!view || !view.sres) return;
    const row = e.target.closest('.row[data-sp]');
    if (row && e.target.closest('.lab') && !e.target.closest('.slk')) sresSelect(row, 'cmt');
  });
  // Vorschläge beim Tippen (Springen-Feld und „Neuer Tab“): Buchname eintippen, z. B. „ge“ → Genesis
  let suggEl = null;
  function attachSuggest(input) {
    if (!suggEl) { suggEl = document.createElement('div'); suggEl.id = 'suggest'; suggEl.hidden = true; document.body.appendChild(suggEl); document.addEventListener('mousedown', e => { if (!e.target.closest('#suggest')) suggEl.hidden = true; }); }
    let list = [], sel = -1;
    const hide = () => { suggEl.hidden = true; sel = -1; };
    const split = v => { const ld = v.match(/^\s*([1-5]|i{1,3})\.?\s*(?=\p{L})/iu); if (ld) { const r = split0(v.slice(ld[0].length)); return { book: (ld[1] + ' ' + r.book).trim(), rest: r.rest }; } return split0(v); };
    const split0 = v => { const m = v.match(/^(.*?)(\s*(?:\b(?:daf|kapitel|chapter|kap)\s*)?\d.*)?$/i); return { book: (m[1] || '').trim(), rest: m[2] || '' }; };
    const show = () => {
      const { book, rest } = split(input.value);
      const q = normT(book);
      if (!q || rest.trim()) { hide(); return; } // Vorschläge nur, solange noch kein Kapitel eingegeben ist
      const pars = input.id === 'jump' && window.Parashot ? window.Parashot.suggest(input.value, 4).map(p => ({ parasha: p })) : [];
      const hits = groups.filter(g => titleHit(g.title, q) || (g.heTitle && g.heTitle.includes(book)));
      hits.sort((a, b) => (normT(a.title).startsWith(q) ? 0 : 1) - (normT(b.title).startsWith(q) ? 0 : 1));
      const first = hits.filter(g => normT(g.title).startsWith(q)), other = hits.filter(g => !normT(g.title).startsWith(q));
      list = [...pars, ...SefOrder.sortTitles(first), ...SefOrder.sortTitles(other)].slice(0, 8 + pars.length);
      if (input.id === 'jump' && /\p{L}/u.test(book)) list.push({ search: book }); // immer wählbar: das Wort im Tanach suchen
      if (!list.length) { hide(); return; }
      sel = -1;
      suggEl.innerHTML = list.map((g, i) => g.search ? `<div class="si" data-i="${i}">🔍 ${esc(I18N.t('Suche nach'))} „<span dir="auto">${esc(g.search)}</span>“ ${esc(I18N.t('im Tanach'))}</div>` : g.parasha ? `<div class="si" data-i="${i}">${esc(I18N.t('Parascha'))} ${esc(g.parasha.name)} <small dir="rtl">${esc(g.parasha.he)}</small><span class="muted">${esc(window.Parashot.label(g.parasha))}</span></div>` : `<div class="si" data-i="${i}">${esc(g.title)}${deNames(g.title) ? ` <small>(${esc(deNames(g.title))})</small>` : ''}${g.heTitle ? ` <small dir="rtl">${esc(g.heTitle)}</small>` : ''}<span class="muted">${esc(g.cats.slice(-1)[0] || '')}</span></div>`).join('');
      const r = input.getBoundingClientRect();
      suggEl.style.left = r.left + 'px'; suggEl.style.top = (r.bottom + 2) + 'px'; suggEl.style.minWidth = Math.max(240, r.width) + 'px';
      suggEl.hidden = false;
    };
    const pick = i => {
      const g = list[i]; if (!g) return;
      if (g.search) { hide(); const ok = jumpSearch(g.search); input.classList.toggle('bad', !ok); if (ok && input.id === 'jump') input.dispatchEvent(new Event('blur')); return; }
      if (g.parasha) { input.value = g.parasha.name; hide(); input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return; }
      input.value = g.title + ' '; hide(); input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      hide();
    };
    const mark = () => [...suggEl.children].forEach((c, i) => c.classList.toggle('on', i === sel));
    input.addEventListener('input', show);
    input.addEventListener('focus', () => { if (input.value) show(); });
    input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) hide(); }, 150));
    input.addEventListener('keydown', e => {
      if (suggEl.hidden || !list.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % list.length; mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + list.length) % list.length; mark(); }
      else if (e.key === 'Escape') { hide(); }
      else if ((e.key === 'Enter' || e.key === 'Tab') && sel >= 0) { e.preventDefault(); e.stopImmediatePropagation(); pick(sel); }
    }, true);
    suggEl.addEventListener('mousedown', e => { const d = e.target.closest('.si'); if (d && suggEl._for === input) { e.preventDefault(); pick(+d.dataset.i); } });
    input.addEventListener('focus', () => { suggEl._for = input; });
    input.addEventListener('input', () => { suggEl._for = input; });
  }
  attachSuggest($('#jump'));
  $('#jump').addEventListener('keydown', async e => {
    if (e.key !== 'Enter') return;
    if ((e.shiftKey || e.metaKey || e.ctrlKey) && jumpSearch($('#jump').value)) { $('#jump').classList.remove('bad'); return; } // Umschalt/Cmd+Enter: immer suchen
    let ok = await jumpTo($('#jump').value);
    if (!ok) ok = jumpSearch($('#jump').value); // kein Buch und keine Stelle: die Wörter im Tanach suchen
    $('#jump').classList.toggle('bad', !ok);
  });
  $('#jump').addEventListener('input', () => $('#jump').classList.remove('bad'));
  // Der Titel links ist zugleich das Sprungfeld: ein Klick macht daraus ein Eingabefeld (alles markiert, Tippen ersetzt es)
  { let startVal = '';
    const open = () => {
      if (!view || !view.group) return;
      startVal = $('#rTitle').textContent.replace(/\s+/g, ' ').trim();
      $('#rTitle').hidden = true; $('#jump').hidden = false; $('#jump').value = startVal; $('#jump').classList.remove('bad');
      $('#jump').focus(); $('#jump').select();
    };
    const close = () => { $('#jump').hidden = true; $('#rTitle').hidden = false; };
    $('#rTitle').addEventListener('click', open);
    $('#rTitle').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    $('#jump').addEventListener('keydown', async e => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Enter') return;
      if ($('#jump').value.trim() === startVal) { close(); return; } // nichts geändert
      await new Promise(r => setTimeout(r, 0)); // erst die eigene Auswertung oben abwarten
      if (!$('#jump').classList.contains('bad')) close();
    });
    $('#jump').addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== $('#jump')) close(); }, 150));
  }



  // ---------- Vor/Zurück im Verlauf des Tabs ----------
  let navSuppress = false;
  function recordNav(s, row) {
    if (!view) return;
    const nav = view.nav || (view.nav = { stack: [], pos: -1 });
    if (!navSuppress) {
      const top = nav.stack[nav.pos];
      if (top && top.key === view.group.key && top.sk === s.k) { if (row) top.row = row; }
      else {
        nav.stack.length = nav.pos + 1; // Vorwärts-Verlauf abschneiden
        nav.stack.push({ key: view.group.key, sk: s.k, row: row || '' });
        if (nav.stack.length > 100) nav.stack.shift();
        nav.pos = nav.stack.length - 1;
      }
    }
    updateNav();
  }
  function updateNav() {
    const nav = view && view.nav;
    $('#navBack').disabled = !nav || nav.pos <= 0;
    $('#navFwd').disabled = !nav || nav.pos >= nav.stack.length - 1;
  }
  async function navGo(delta) {
    const nav = view && view.nav;
    if (!nav) return;
    const p = nav.pos + delta;
    if (p < 0 || p >= nav.stack.length) return;
    nav.pos = p;
    const e = nav.stack[p];
    navSuppress = true;
    try {
      if (view.group && e.key === view.group.key) {
        const i = view.sections.findIndex(s => s.k === e.sk);
        if (i >= 0) { view.idx = i; renderSection(e.row || undefined); }
      } else {
        const g = groupsByKey.get(e.key);
        if (g) await openGroup(g, { sectionPath: JSON.parse(e.sk), rowLabel: e.row || undefined });
      }
    } finally { navSuppress = false; updateNav(); }
  }
  $('#navBack').onclick = () => navGo(-1);
  $('#navFwd').onclick = () => navGo(1);
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key === '[' || e.key === ']')) { e.preventDefault(); navGo(e.key === '[' ? -1 : 1); }
  });
  document.addEventListener('mouseup', e => { if (e.button === 3) navGo(-1); if (e.button === 4) navGo(1); });

  // ---------- Verlauf ----------
  let history = [];
  try { history = JSON.parse(localStorage.getItem('history') || '[]'); } catch { history = []; }
  if (!Array.isArray(history)) history = [];
  const saveHistory = () => { try { localStorage.setItem('history', JSON.stringify(history.slice(0, 20))); } catch { /* egal */ } };
  function renderRecent() {
    $('#recentBox').hidden = !history.length;
    $('#recent').innerHTML = history.slice(0, 15).map((h, i) =>
      `<a data-i="${i}" title="${esc(h.title + ' – ' + h.label)}"><span>${esc(h.title)}</span><small>${esc(h.label)}${h.row ? ' · ' + esc(h.row) : ''}</small></a>`).join('');
  }
  function pushHistory(s, row) {
    if (!view) return;
    const g = view.group;
    const e = { key: g.key, title: g.title, label: s.label, sk: s.k, row: row || '' };
    // gleiches Buch und gleicher Abschnitt: nur nach vorn holen
    history = history.filter(h => !(h.key === e.key && h.sk === e.sk));
    history.unshift(e);
    history = history.slice(0, 20);
    saveHistory();
    renderRecent();
  }
  $('#recent').addEventListener('click', e => {
    const a = e.target.closest('a[data-i]');
    const h = a && history[+a.dataset.i];
    if (!h) return;
    const g = groupsByKey.get(h.key);
    if (g) openGroup(g, { sectionPath: JSON.parse(h.sk), rowLabel: h.row || undefined }, e.metaKey || e.ctrlKey);
  });
  let recentOpen = true;
  try { recentOpen = localStorage.getItem('recentOpen3') !== '0'; } catch { /* egal */ }
  const applyRecent = () => {
    $('#recent').hidden = !recentOpen;
    $('#recentArrow').textContent = recentOpen ? '▾' : '▸';
    try { localStorage.setItem('recentOpen3', recentOpen ? '1' : '0'); } catch { /* egal */ }
  };
  $('#recentHead').onclick = () => { recentOpen = !recentOpen; applyRecent(); };
  applyRecent();
  $('#recentClear').onclick = () => { history = []; saveHistory(); renderRecent(); };
  renderRecent();

  // ---------- Verknüpfungen ----------
  const LK = window.links;
  let linksReady = false;
  let secLinks = [];   // Verknüpfungen des angezeigten Abschnitts
  let lkVerse = null;  // null = ganzer Abschnitt
  async function refreshLinkStatus() {
    const st = await LK.status();
    linksReady = st.complete;
    $('#lkInfo').textContent = st.complete ? '✓ vollständig vorhanden' : st.done.length ? `${st.done.length} von ${st.total} Dateien verarbeitet` : 'noch nicht heruntergeladen';
    $('#lkGet').textContent = st.complete ? 'Erneut prüfen' : st.done.length ? 'Fortsetzen' : 'Verknüpfungen herunterladen';
    $('#lkGet').disabled = st.complete;
    return st;
  }
  $('#lkGet').onclick = async () => {
    $('#lkGet').disabled = true; $('#lkStop').disabled = false; $('#lkProg').hidden = false;
    const r = await LK.build();
    $('#lkStop').disabled = true; $('#lkProg').hidden = true;
    await refreshLinkStatus();
    if (r.error) $('#lkInfo').textContent = '⚠ ' + r.error;
    else if (r.failed && r.failed.length) $('#lkInfo').textContent += ` · ${r.failed.length} Fehler (erneut starten zum Fortsetzen)`;
    if (view) renderSection();
  };
  $('#lkStop').onclick = () => LK.cancel();
  LK.onProgress(p => { $('#lkProg').value = p.file - (/fertig/.test(p.phase) ? 0 : 1); $('#lkInfo').textContent = `${p.phase} (${p.file}/${p.total})`; });

  // Parallelstellen (ETCBC Parallels, ab 75 % Ähnlichkeit) als zusätzliche Verknüpfungen
  const parRows = (title, ch) => {
    const P = (window.PARALLELS || {})[title + ' ' + ch], rows = [];
    if (P) for (const v of Object.keys(P)) for (const s of P[v]) { const [ref, sim] = s.split('~'); rows.push({ v1: +v, v2: +v, other: ref, type: sim + ' %', cat: 'Parallelstellen' }); }
    return rows;
  };
  const verseOf = lab => (/^\d+$/.test(lab) ? +lab : null);
  async function loadLinks(s) {
    loadTopics(s).catch(() => {}); try { mapRefresh(); } catch { /* Karte noch nicht bereit */ }
    secLinks = [];
    $('#lkBtn').hidden = true;
    if (!view) return;
    const first = s.label.split(' › ')[0];
    const m = s.path.length === 1 && !s.label.includes('›') && first.match(/(\d+[ab]?)$/i);
    if (!m) return;
    const token = view.idx + ':' + view.group.key;
    let rows;
    try { rows = linksReady ? await LK.section(view.group.title, m[1]) : []; } catch { rows = []; }
    rows = (Array.isArray(rows) ? rows : []).concat(parRows(view.group.title, m[1]));
    if (!view || token !== view.idx + ':' + view.group.key) return; // inzwischen woanders
    secLinks = rows;
    if (!rows.length) return;
    $('#lkBtn').hidden = false;
    btnLbl('#lkBtn', '🔗', 'Verknüpfungen', rows.length);
    $$('#rOut .row[data-l]').forEach(r => {
      const v = verseOf(r.dataset.l);
      if (v == null) return;
      const n = rows.filter(x => v >= x.v1 && v <= x.v2 && x.v1 > 0).length;
      const lab = r.querySelector('.lab');
      lab.querySelectorAll('.lk').forEach(x => { if (x.previousSibling && x.previousSibling.tagName === 'BR') x.previousSibling.remove(); x.remove(); }); // wurde der Abschnitt zweimal geladen, nicht doppelt anzeigen
      if (n) lab.insertAdjacentHTML('beforeend', `<br><span class="lk" data-v="${v}" title="${n} Verknüpfungen">🔗</span>`);
    });
    if (!$('#linkPanel').hidden) renderLinkPanel();
    if (cmtOpen) renderCmt();
  }
  $('#rOut').addEventListener('click', e => {
    const b = e.target.closest('.lk');
    if (b) { lkVerse = +b.dataset.v; renderLinkPanel(); }
  });
  $('#lkBtn').onclick = () => { lkVerse = null; renderLinkPanel(); };
  $('#lkClose').onclick = () => { $('#linkPanel').hidden = true; };
  // Klick außerhalb des Verknüpfungen-Fensters schließt es (Klick auf die Verknüpfungs-Knöpfe, Menüs und Vorschau zählt nicht)
  document.addEventListener('mousedown', e => {
    if ($('#linkPanel').hidden || $('#linkPanel').classList.contains('docked') || !e.target.closest) return;
    if (e.target.closest('#linkPanel, #lkBtn, .lk, .slk, #ctxMenu, #lkHover, #suggest, #tip, #undoBar, dialog')) return;
    $('#linkPanel').hidden = true;
  }, true);
  $('#lkFilter').addEventListener('input', () => renderLinkPanel());
  const localTitles = () => new Set(groups.map(g => g.title));
  const splitOther = ref => { const m = String(ref).match(/^(.*?)\s+\d+[ab]?(?::\d+)*(?:-.*)?$/i); return m ? m[1] : ref; };
  // Reihenfolge wie in der Bibliotheksliste links: Kategorien und Buchtitel in derselben Sortierung
  const catCmp = (x, y, parent) => x === y ? 0 : (SefOrder.sortCats([x, y], parent)[0] === x ? -1 : 1);
  const titleCmp = (x, y) => x === y ? 0 : (SefOrder.sortTitles([x, y], t => t)[0] === x ? -1 : 1);
  function libCmpGroups(ga, gb) { // ga, gb: Bibliotheksbücher (oder null, wenn nicht in der Bibliothek)
    if (ga && !gb) return -1; if (!ga && gb) return 1; if (!ga) return 0;
    const pa = ga.categories || [], pb = gb.categories || [];
    for (let i = 0; i < Math.min(pa.length, pb.length); i++) { const c = catCmp(pa[i], pb[i], i ? pa[i - 1] : ''); if (c) return c; }
    if (pa.length !== pb.length) return pa.length < pb.length ? -1 : 1; // Bücher vor Unterkategorien
    return titleCmp(ga.title, gb.title);
  }
  // nur die 39 Bücher des Tanach selbst klappen im Verknüpfungen-Fenster auf; Kommentare, Targumim und alles andere bleiben zu
  const TANAKH_BOOKS = new Set('Genesis,Exodus,Leviticus,Numbers,Deuteronomy,Joshua,Judges,I Samuel,II Samuel,I Kings,II Kings,Isaiah,Jeremiah,Ezekiel,Hosea,Joel,Amos,Obadiah,Jonah,Micah,Nahum,Habakkuk,Zephaniah,Haggai,Zechariah,Malachi,Psalms,Proverbs,Job,Song of Songs,Ruth,Lamentations,Ecclesiastes,Esther,Daniel,Ezra,Nehemiah,I Chronicles,II Chronicles'.split(','));
  function renderLinkPanel() {
    if (!view) return;
    const virt = view.sres ? cmtVirt : null;
    if (view.sres && !virt) return;
    const s = virt ? { label: virt.label } : view.sections[view.idx];
    const f = $('#lkFilter').value.trim().toLowerCase();
    let list = secLinks.filter(x => lkVerse == null ? true : (x.v1 === 0 || (lkVerse >= x.v1 && lkVerse <= x.v2)));
    if (f) list = list.filter(x => (x.other + ' ' + x.cat + ' ' + x.type).toLowerCase().includes(f));
    $('#lkTitle').textContent = `${virt ? virt.title : view.group.title} · ${s ? s.label : ''}${lkVerse != null ? ':' + lkVerse : ''} – ${list.length} Verknüpfungen`;
    const byT = new Map(groups.map(g => [g.title, g]));
    const titleToGroup = t => byT.get(t) || byT.get(String(t).split(', ')[0]) || null;
    const local = localTitles();
    const LK_FIRST = ['tanakh', 'mishnah', 'tosefta', 'talmud', 'responsa']; // feste Reihenfolge oben, danach der Rest nach Anzahl
    const lkRank = c => { const i = LK_FIRST.indexOf(String(c).toLowerCase()); return i < 0 ? 99 : i; };
    const cats = new Map();
    for (const x of list) {
      const c = x.cat || 'Andere';
      if (!cats.has(c)) cats.set(c, new Map());
      const bk = splitOther(x.other);
      const m = cats.get(c);
      if (!m.has(bk)) m.set(bk, []);
      m.get(bk).push(x);
    }
    const open = f || lkVerse != null ? 'open' : '';
    $('#lkBody').innerHTML = (() => { const order = SefOrder.sortCats([...cats.keys()], ''); return [...cats.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])); })().map(([c, books]) => {
      const total = [...books.values()].reduce((a, v) => a + v.length, 0);
      return `<details ${open}><summary>${esc(c)} (${total})</summary>${[...books.entries()].sort((a, b) => { const ga = titleToGroup(a[0]), gb = titleToGroup(b[0]); return libCmpGroups(ga, gb) || titleCmp(a[0], b[0]); }).map(([bk, xs]) =>
        `<details ${f || (String(c).toLowerCase() === 'tanakh' && TANAKH_BOOKS.has(bk)) ? 'open' : ''}><summary>${esc(bk)} (${xs.length})${local.has(bk) ? '' : ' <span class="muted">· nicht lokal</span>'}</summary>${xs.slice(0, 300).map(x =>
          `<div class="ent${local.has(bk) ? '' : ' off'}"><a data-ref="${esc(x.other)}">${esc(x.other)}</a>${local.has(bk) ? ` <button data-pv="${esc(x.other)}" title="Vorschau">▸</button>` : ''}${x.type ? ` <small class="muted">${esc(x.type)}</small>` : ''}</div>`).join('')}${xs.length > 300 ? `<div class="muted ent">… ${xs.length - 300} weitere (Filter benutzen)</div>` : ''}</details>`).join('')}</details>`;
    }).join('') || '<p class="muted">Keine Verknüpfungen.</p>';
    $('#linkPanel').hidden = false;
  }
  $('#lkBody').addEventListener('click', async e => {
    const a = e.target.closest('a[data-ref]');
    if (a) {
      if (a.parentElement.classList.contains('off')) return;
      await jumpTo(a.dataset.ref.replace(/-.*$/, ''), e.metaKey || e.ctrlKey);
      return;
    }
    const b = e.target.closest('button[data-pv]');
    if (b) {
      const nxt = b.parentElement.nextElementSibling;
      if (nxt && nxt.classList.contains('pv')) { nxt.remove(); b.textContent = '▸'; return; }
      b.textContent = '▾';
      const r = await LK.preview(b.dataset.pv);
      const html = r.items ? r.items.map(t => `<div dir="${r.he ? 'rtl' : 'ltr'}">${R.cleanHtml(R.splitFootnotes(t).main.replace(/<sup[^>]*>.*?<\/sup>/g, ''))}</div>`).join('') : '<i>Keine Vorschau möglich.</i>';
      b.parentElement.insertAdjacentHTML('afterend', `<div class="pv">${html}</div>`);
    }
  });
  // Vorschau beim Überfahren eines Querverweises (nur bei lokal vorhandenen Büchern)
  let hovApi = null; // Vorschau-Blase auch für das Themenfenster
  { let hov = null, hovT = null, hovRef = null; const pvCache = new Map();
    const hideHov = () => { clearTimeout(hovT); hovRef = null; if (hov) hov.hidden = true; };
    const startHov = (a, ref, quiet, below) => {
      hideHov(); hovRef = ref;
      hovT = setTimeout(async () => {
        let r = pvCache.get(ref);
        if (!r) { try { r = await LK.preview(ref, ['he', I18N.lang === 'de' ? 'de' : 'en']); } catch { r = {}; } pvCache.set(ref, r); if (pvCache.size > 200) pvCache.delete(pvCache.keys().next().value); }
        if (hovRef !== ref) return; // Maus ist inzwischen woanders
        const none = !(r.parts && r.parts.length) && !(r.items && r.items.length);
        if (none && quiet) return; // Wörterbuch: ohne Text keine leere Blase
        if (!hov) { hov = document.createElement('div'); hov.id = 'lkHover'; document.body.appendChild(hov); }
        const partHtml = p => p.items.map(t => `<div dir="${p.he ? 'rtl' : 'ltr'}"${p.he ? ' lang="he" class="phe"' : ''}>${R.cleanHtml(R.splitFootnotes(p.he ? stripHe(t) : t).main.replace(/<sup[^>]*>.*?<\/sup>/g, ''))}</div>`).join('');
        const html = r.parts && r.parts.length ? r.parts.map((p, i) => (i ? '<hr>' : '') + partHtml(p)).join('') : r.items && r.items.length ? partHtml({ items: r.items, he: r.he }) : `<i>${esc(I18N.t('Keine Vorschau möglich.'))}</i>`;
        hov.innerHTML = `<b>${esc(ref)}</b>${html}`; hov.hidden = false;
        const rc = a.getBoundingClientRect(), w = hov.offsetWidth, h = hov.offsetHeight;
        if (below) { // Wörterbuch-Leiste: unter dem Link, sonst darüber
          hov.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, rc.left)) + 'px';
          hov.style.top = Math.max(8, rc.bottom + 6 + h > window.innerHeight - 8 ? rc.top - h - 6 : rc.bottom + 6) + 'px';
        } else {
          hov.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, rc.left - w - 10 > 8 ? rc.left - w - 10 : rc.right + 10)) + 'px'; // bevorzugt links vom Panel
          hov.style.top = Math.max(8, Math.min(window.innerHeight - h - 8, rc.top - 8)) + 'px';
        }
      }, 350);
    };
    hovApi = { start: startHov, hide: hideHov, current: () => hovRef };
    $('#lkBody').addEventListener('mouseover', e => {
      const a = e.target.closest('a[data-ref]');
      if (!a || a.parentElement.classList.contains('off') || a.dataset.ref === hovRef) return;
      startHov(a, a.dataset.ref, false, false);
    });
    // Wörterbuch: Vorschau beim Überfahren einer Bibelstelle oder Quellenangabe (nur wenn der Text lokal vorliegt)
    $('#dictOut').addEventListener('mouseover', e => {
      const a = e.target.closest('.dsrc[data-sref]');
      if (!a) return;
      const ref = a.dataset.sref.replace(/-.*$/, '');
      if (ref === hovRef) return;
      startHov(a, ref, true, true);
    });
    { // Abkürzungen (Gesenius): sofortige Erklärung beim Überfahren
      let tip = null;
      const hideTip = () => { if (tip) tip.hidden = true; };
      $('#dictOut').addEventListener('mouseover', e => {
        const a = e.target.closest('.gab'); if (!a) return;
        if (!tip) { tip = document.createElement('div'); tip.id = 'gabTip'; tip.hidden = true; document.body.appendChild(tip); }
        tip.textContent = a.dataset.t; tip.hidden = false;
        const r = a.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
        tip.style.left = Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2)) + 'px';
        tip.style.top = (r.top - h - 6 < 4 ? r.bottom + 6 : r.top - h - 6) + 'px';
      });
      $('#dictOut').addEventListener('mouseout', e => { const a = e.target.closest('.gab'); if (a && !a.contains(e.relatedTarget)) hideTip(); });
      $('#dictOut').addEventListener('scroll', hideTip, true); $('#dictPanel').addEventListener('scroll', hideTip);
    }
    $('#dictOut').addEventListener('mouseout', e => { const a = e.target.closest('.dsrc[data-sref]'); if (a && !a.contains(e.relatedTarget)) hideHov(); });
    $('#dictOut').addEventListener('click', hideHov);
    $('#dictPanel').addEventListener('scroll', hideHov, { passive: true });
    $('#lkBody').addEventListener('mouseout', e => { const a = e.target.closest('a[data-ref]'); if (a && !a.contains(e.relatedTarget)) hideHov(); });
    $('#linkPanel').addEventListener('scroll', hideHov, { passive: true });
    $('#lkBody').addEventListener('click', hideHov);
  }
  refreshLinkStatus().then(() => { if (view) renderSection(); });

  // ---------- Themen (Sefaria Topics) ----------

  // ---------- Audio: eigener Ordner mit Versdateien (Buch_Kapitel_Vers.mp3), ▶ in der Zeilenbeschriftung, fortlaufendes Abspielen ----------
  const AU = { dir: '', map: new Map(), chap: new Map(), chapRel: '', pendingSeek: null, el: new Audio(), cur: null, speed: 1, paused: false };
  const auKey = (book, ch, v) => `${String(book).replace(/ /g, '_')}_${String(ch).padStart(3, '0')}_${String(v).padStart(3, '0')}`;
  const auSrc = rel => 'file://' + AU.dir.split('/').map(encodeURIComponent).join('/') + '/' + String(rel).split('/').map(encodeURIComponent).join('/');
  // Gibt es zu dieser Stelle Audio? Versdatei oder Kapiteldatei mit Marker (ohne Markerliste nur Vers 1 = Kapitelanfang)
  const auHas = (book, ch, v) => { if (AU.map.has(auKey(book, ch, v))) return true; const e = AU.chap.get(book + '|' + ch); return !!e && (e.marks.some(m => m.v === v) || (!e.marks.length && v === 1)); };
  function auChapter() { const s = view && view.sections && view.sections[view.idx]; const m = s && String(s.label || '').match(/(\d+)\s*$/); return m ? +m[1] : null; }
  async function auRefresh(st) {
    if (!window.audio) return;
    st = st || await window.audio.index();
    AU.dir = st.dir || ''; AU.map = new Map(); AU.chap = new Map(); AU.chapRel = ''; AU.bk = new Map();
    for (const n of st.files || []) { // Dateinamen wie „Genesis_001_001“, „1_Samuel_001_002“ oder „Richter_003_004“ -> Schlüssel mit Sefaria-Titel („I_Samuel_001_002“)
      const base = n.split('/').pop().replace(/\.[^.]+$/, ''); AU.map.set(base, n);
      const m = base.match(/^(.+?)[_ -](\d{1,3})[_ -](\d{1,3})$/), t = m && window.Refs.canonBook(m[1]);
      if (t) AU.map.set(auKey(t, +m[2], +m[3]), n);
    }
    const byName = new Map(); // ganze Kapitel („1_Samuel_01.mp3“) mit Markerliste (Vers -> Startzeit)
    for (const n of st.chapters || []) {
      const name = n.split('/').pop(), base = name.replace(/\.[^.]+$/, ''), m = base.match(/^(.+?)[_ -](\d{1,3})$/), t = m && window.Refs.canonBook(m[1]);
      if (!t) continue; const e = { rel: n, marks: [] }; AU.chap.set(t + '|' + (+m[2]), e); byName.set(name, e);
    }
    const bookFile = new Map(); // eine Datei für das ganze Buch („Isaiah.mp3“, „Jesaja.mp3“) + Marker ohne Dateiname (Zeiten im ganzen Buch)
    for (const n of st.books || []) { const t = window.Refs.canonBook(n.split('/').pop().replace(/\.[^.]+$/, '')); if (t) bookFile.set(t, n); }
    for (const [datei, buch, kap, v, ms] of st.markers || []) {
      const t = window.Refs.canonBook(buch);
      let e = datei ? byName.get(datei) : null;
      if (!e && t) { e = AU.chap.get(t + '|' + kap); if (!e && !datei && bookFile.has(t)) { e = { rel: bookFile.get(t), marks: [], bk: true }; AU.chap.set(t + '|' + kap, e); } }
      if (e) { e.marks.push({ v, ms }); if (e.bk) { if (!AU.bk.has(e.rel)) AU.bk.set(e.rel, []); AU.bk.get(e.rel).push({ book: t, ch: +kap, v, ms }); } }
    }
    AU.chap.forEach(e => e.marks.sort((a, b) => a.v - b.v));
    AU.bk.forEach(l => { l.sort((a, b) => a.ms - b.ms); l.forEach((x, i) => { const e = AU.chap.get(x.book + '|' + x.ch), nx = l.slice(i + 1).find(y => y.ch !== x.ch); if (e && !e.end) e.end = nx ? nx.ms / 1000 : Infinity; }); });
    const total = AU.map.size + AU.chap.size;
    const el = $('#auInfo'); if (el) el.textContent = !AU.dir ? I18N.t('Kein Audio-Ordner gewählt.') : st.error ? I18N.t('Ordner nicht lesbar.') : AU.dir + ' · ' + I18N.t('{#} Audiodateien gefunden', total);
    markAudio();
  }
  function markAudio() {
    if ((!AU.map.size && !AU.chap.size) || !view || !view.group) return;
    const ch = auChapter(); if (ch == null) return;
    $$('#rOut .row[data-l]').forEach(r => {
      const l = r.dataset.l; if (!/^\d+$/.test(l)) return;
      const lab = r.querySelector('.lab'); if (!lab || lab.querySelector('.aud') || !auHas(view.group.title, ch, +l)) return;
      lab.insertAdjacentHTML('afterbegin', `<span class="aud" data-v="${l}" title="${esc(I18N.t('Vers anhören'))}">▶</span>`);
    });
    auHighlight();
  }
  function auHighlight() {
    $$('#rOut .row.playing').forEach(r => r.classList.remove('playing'));
    const c = AU.cur; if (!c || !view || !view.group || view.group.title !== c.book || auChapter() !== c.ch) return;
    const r = [...$$('#rOut .row[data-l]')].find(x => x.dataset.l === String(c.v));
    if (r) { r.classList.add('playing'); r.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    olMark();
  }
  function auBar() {
    const c = AU.cur; $('#audioBar').hidden = !c; if (!c) return;
    $('#auTitle').textContent = `${c.book} ${c.ch}:${c.v}`; $('#auPlay').textContent = AU.el.paused ? '▶' : '⏸';
  }
  async function auPlay(book, ch, v) {
    const key = auKey(book, ch, v);
    if (AU.map.has(key)) { AU.cur = { book, ch, v }; AU.chapRel = ''; AU.el.src = auSrc(AU.map.get(key)); AU.el.playbackRate = AU.speed; try { await AU.el.play(); } catch { /* abgebrochen */ } auHighlight(); auBar(); return true; }
    const e = AU.chap.get(book + '|' + ch); if (!e) return false;
    const mk = e.marks.find(m => m.v === v); if (!mk && !(v === 1 && !e.marks.length)) return false;
    AU.cur = { book, ch, v, chap: true }; const t = (mk ? mk.ms : 0) / 1000; // ganzes Kapitel: ab dem Marker des Verses, die Anzeige folgt den Markern
    if (AU.chapRel === e.rel && AU.el.src) AU.el.currentTime = t; else { AU.chapRel = e.rel; AU.pendingSeek = t; AU.el.src = auSrc(e.rel); }
    AU.el.playbackRate = AU.speed; try { await AU.el.play(); } catch { /* abgebrochen */ }
    auHighlight(); auBar(); return true;
  }
  function auNextRef(c, dir) {
    if (dir > 0) { if (AU.map.has(auKey(c.book, c.ch, c.v + 1))) return { ...c, v: c.v + 1 }; if (AU.map.has(auKey(c.book, c.ch + 1, 1))) return { book: c.book, ch: c.ch + 1, v: 1 }; return null; }
    if (c.v > 1 && AU.map.has(auKey(c.book, c.ch, c.v - 1))) return { ...c, v: c.v - 1 };
    for (let v = 200; v >= 1 && c.ch > 1; v--) if (AU.map.has(auKey(c.book, c.ch - 1, v))) return { book: c.book, ch: c.ch - 1, v };
    return null;
  }
  function auChapNext(c, dir) { // Kapiteldatei: nächster/vorheriger Marker, am Kapitelende das nächste/vorherige Kapitel
    const e = AU.chap.get(c.book + '|' + c.ch); const mk = e ? e.marks : [];
    if (dir > 0) {
      const nx = mk.find(m => m.v > c.v); if (nx) return { ...c, v: nx.v };
      const ne = AU.chap.get(c.book + '|' + (c.ch + 1)); return ne ? { book: c.book, ch: c.ch + 1, v: ne.marks.length ? ne.marks[0].v : 1 } : null;
    }
    const cur = mk.find(m => m.v === c.v);
    if (cur && AU.el.currentTime * 1000 - cur.ms > 2000) return { ...c }; // erst an den Versanfang, dann zum vorigen Vers
    const pv = [...mk].reverse().find(m => m.v < c.v); if (pv) return { ...c, v: pv.v };
    const pe = AU.chap.get(c.book + '|' + (c.ch - 1)); return pe && pe.marks.length ? { book: c.book, ch: c.ch - 1, v: pe.marks[pe.marks.length - 1].v } : null;
  }
  async function auStep(dir) { // nächster/vorheriger Vers; bei Kapitelwechsel springt die Leseansicht mit
    if (!AU.cur) return;
    const n = AU.cur.chap ? auChapNext(AU.cur, dir) : auNextRef(AU.cur, dir); if (!n) { auStop(); return; }
    if (view && view.group && (view.group.title !== n.book || auChapter() !== n.ch)) await jumpTo(`${n.book} ${n.ch}:${n.v}`);
    auPlay(n.book, n.ch, n.v);
  }
  function auStop() { AU.el.pause(); AU.cur = null; auHighlight(); auBar(); }
  AU.el.addEventListener('ended', () => auStep(1));
  const auFmt = t => isFinite(t) ? Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') : '0:00';
  let auDrag = false;
  // Kapiteldatei: Zeitleiste nur für den aktuellen Vers (Marker bis zum nächsten Marker bzw. Dateiende)
  function auSpan() {
    const c = AU.cur; if (!c || !c.chap) return null; const e = AU.chap.get(c.book + '|' + c.ch); if (!e || !e.marks.length) return null;
    const i = e.marks.findIndex(m => m.v === c.v); if (i < 0) return null;
    const s = e.marks[i].ms / 1000, d = AU.el.duration, en = i + 1 < e.marks.length ? e.marks[i + 1].ms / 1000 : (e.end != null && isFinite(e.end) ? e.end : (isFinite(d) ? d : s));
    return en > s ? { s, e: en } : null;
  }
  function auTimes() {
    const sp = auSpan(), t = AU.el.currentTime;
    if (!sp) { $('#auCur').textContent = auFmt(t); $('#auDur').textContent = auFmt(AU.el.duration); if (!auDrag && AU.el.duration) $('#auSeek').value = Math.round(1000 * t / AU.el.duration); return; }
    const x = Math.min(Math.max(t - sp.s, 0), sp.e - sp.s);
    $('#auCur').textContent = auFmt(x); $('#auDur').textContent = auFmt(sp.e - sp.s);
    if (!auDrag) $('#auSeek').value = Math.round(1000 * x / (sp.e - sp.s));
  }
  AU.el.addEventListener('timeupdate', () => {
    auTimes();
    const c = AU.cur; if (c && c.chap && AU.pendingSeek == null) { // Kapiteldatei: aktuellen Vers aus den Markern bestimmen
      let e = AU.chap.get(c.book + '|' + c.ch); if (!e || !e.marks.length) return;
      if (e.bk) { // Datei mit dem ganzen Buch: ins nächste Kapitel gelaufen? Dann wechselt die Leseansicht mit
        const l = AU.bk.get(e.rel), t = AU.el.currentTime * 1000 + 30; let h = null;
        for (const x of l || []) { if (x.ms <= t) h = x; else break; }
        if (h && h.ch !== c.ch) { const follow = view && view.group && view.group.title === c.book && auChapter() === c.ch; c.ch = h.ch; c.v = h.v; e = AU.chap.get(c.book + '|' + c.ch); if (follow) jumpTo(`${c.book} ${h.ch}:${h.v}`); auHighlight(); auBar(); auTimes(); }
      }
      const ms = AU.el.currentTime * 1000 + 30; let v = e.marks[0].v; for (const m of e.marks) { if (m.ms <= ms) v = m.v; else break; }
      if (v !== c.v) { c.v = v; auHighlight(); auBar(); auTimes(); }
    } });
  AU.el.addEventListener('loadedmetadata', () => { auTimes(); if (AU.pendingSeek != null) { AU.el.currentTime = AU.pendingSeek; AU.pendingSeek = null; } });
  $('#auSeek').addEventListener('input', e => { auDrag = true; const sp = auSpan(); if (sp) { AU.el.currentTime = sp.s + (sp.e - sp.s) * e.target.value / 1000; $('#auCur').textContent = auFmt((sp.e - sp.s) * e.target.value / 1000); } else if (AU.el.duration) { AU.el.currentTime = AU.el.duration * e.target.value / 1000; $('#auCur').textContent = auFmt(AU.el.currentTime); } });
  $('#auSeek').addEventListener('change', () => { auDrag = false; });
  AU.el.addEventListener('pause', auBar); AU.el.addEventListener('play', auBar);
  $('#rOut').addEventListener('click', e => {
    const a = e.target.closest('.aud'); if (!a) return;
    e.stopPropagation(); e.preventDefault();
    const book = view.group.title, ch = auChapter(), v = +a.dataset.v;
    auPlay(book, ch, v); // auch beim erneuten Klick auf denselben Vers: von vorne (Pause über die Leiste unten)
  }, true);
  $('#auPlay').onclick = () => { if (AU.el.paused) AU.el.play(); else AU.el.pause(); };
  $('#auStop').onclick = auStop; $('#auPrev').onclick = () => auStep(-1); $('#auNext').onclick = () => auStep(1);
  $('#auSpeed').onchange = e => { AU.speed = +e.target.value; AU.el.playbackRate = AU.speed; };
  if (window.audio) {
    $('#auPick').onclick = async () => auRefresh(await window.audio.pick());
    $('#auClear').onclick = async () => { auStop(); auRefresh(await window.audio.clear()); };
    auRefresh();
  }
  if (window.audio && window.audio.list) { // Aufnahme aus dem GitHub-Release „audio“ laden
    let auItems = [], auBusy = false;
    const mb = n => (n / 1048576).toFixed(n > 1e8 ? 0 : 1) + ' MB';
    const info = t => { $('#auNetInfo').textContent = t; };
    window.audio.onProgress(p => {
      const pr = $('#auNetProg'); pr.hidden = false; pr.max = p.total || 1; pr.value = p.phase === 'Lade' ? (p.got || 0) : (p.total || 1);
      info(`${p.book} (${p.i + 1}/${p.n}) · ` + (p.phase === 'Lade' ? `${I18N.t('lade')} ${mb(p.got || 0)} / ${mb(p.total || 0)}` : `${I18N.t('entpacke')} ${p.d || 0}/${p.nf || '…'}`));
    });
    $('#auNetList').onclick = async () => {
      if (auBusy) return; info(I18N.t('Suche …'));
      const r = await window.audio.list();
      if (r.error) { info(I18N.t('Fehler') + ': ' + r.error); return; }
      if (!r.items.length) { info(I18N.t('Noch keine Audio-Pakete veröffentlicht.')); return; }
      auItems = r.items; info(`${auItems.length} ${I18N.t('Bücher')}, ${mb(auItems.reduce((a, b) => a + b.size, 0))}`);
      const box = $('#auNetBooks'); box.hidden = false; $('#auNetGo').hidden = false;
      box.innerHTML = `<label><input type="checkbox" id="auNetAll"> <b>${esc(I18N.t('Alle'))}</b></label> ` + auItems.map((it, k) => `<label style="display:inline-block;margin:2px 10px 2px 0"><input type="checkbox" class="auNetB" data-k="${k}"> ${esc(it.book)} <small class="muted">${mb(it.size)}</small></label>`).join('');
      $('#auNetAll').onchange = e => box.querySelectorAll('.auNetB').forEach(c => { c.checked = e.target.checked; });
    };
    $('#auNetGo').onclick = async () => {
      const sel = [...document.querySelectorAll('.auNetB:checked')].map(c => auItems[+c.dataset.k]);
      if (!sel.length || auBusy) { if (!sel.length) info(I18N.t('Nichts ausgewählt.')); return; }
      auBusy = true; $('#auNetGo').disabled = true; $('#auNetList').disabled = true; $('#auNetStop').hidden = false;
      const r = await window.audio.get(sel);
      auBusy = false; $('#auNetGo').disabled = false; $('#auNetList').disabled = false; $('#auNetStop').hidden = true; $('#auNetProg').hidden = true;
      info(r.error ? I18N.t('Fehler') + ': ' + r.error : `${I18N.t('Fertig')}: ${r.downloaded} ${I18N.t('Dateien')}`);
      auRefresh(r);
    };
    $('#auNetStop').onclick = () => window.audio.stop();
  }

  // ---------- Gliederung: Wochenabschnitte, Kapitel und Absätze (offen/geschlossen: פ ס) des gewählten Buches ----------
  const olOwnCache = new Map();
  const olMz = () => { try { return localStorage.getItem('olMz') === '1'; } catch { return false; } };
  async function olOwn(book) { if (!window.outline) return null; if (!olOwnCache.has(book)) olOwnCache.set(book, await window.outline.get(book)); return olOwnCache.get(book); }
  function olContentHtml(g, ol) {
    const cur = olPos(g), L = I18N.lang;
    const T = (o, k) => (L !== 'he' && o[k + '_' + L]) || o[k]; // Text in der Oberflächensprache, sonst Hebräisch
    const heUi = L === 'he' || !ol.sections[0] || !ol.sections[0]['head_' + L];
    const first = r => { const m = String(r).match(/^(\d+)(?::(\d+))?/); return m ? { ch: +m[1], v: m[2] ? +m[2] : 1 } : null; };
    const mzOn = olMz() && ol.sections.some(x => x.items.some(i => i.mz));
    return (T(ol, 'title') ? `<p class="${heUi ? 'he' : ''}" ${heUi ? 'lang="he"' : ''}><b>${esc(T(ol, 'title'))}</b></p>` : '') + ol.sections.filter(s => s.items.some(it => !!it.mz === mzOn)).map(s => {
      return `<details open><summary>${heUi ? `<span class="he" lang="he">${esc(s.head)}</span>` : `${esc(T(s, 'head'))} <small class="he" lang="he">${esc(s.head)}</small>`}</summary>${s.desc ? `<p class="he olnote" lang="he">${esc(s.desc)}</p>` : ''}${s.items.filter(it => !!it.mz === mzOn).map(it => { const f = first(it.ref); const ih = heUi || (!it['text_' + L] && /[\u0590-\u05FF]/.test(it.text)); const meta = [T(it, 'speaker'), T(it, 'author'), T(it, 'kind'), T(it, 'place'), T(it, 'time'), T(it, 'par'), T(it, 'desc'), it.seg ? (L === 'he' ? 'סגולה: ' : L === 'de' ? 'Segula: ' : 'Segula: ') + T(it, 'seg') : ''].filter(Boolean).map(esc).join(' · '); const np = window.__mapCount ? window.__mapCount(g.title, it.ref) : 0; return `<div class="olp olc${ih ? '' : ' lt'}${it.mz ? ' olmz' : ''}${olIn(it.ref, cur, !olPlaying(g)) ? ' cur' : ''}" data-r="${esc(it.ref)}" data-ref="${esc(g.title + ' ' + (f ? f.ch + ':' + f.v : it.ref))}"><span class="ref">${esc(String(it.ref).replace(/-/g, '–'))}</span><span class="${ih ? 'he' : 'tx'}"${ih ? ' lang="he"' : ''}>${it.mz ? `<b class="mzn">${it.mz}</b> ` : ''}${esc(T(it, 'text'))}${meta ? `<small class="olm"${ih ? '' : ' style="direction:ltr"'}>${meta}</small>` : ''}</span>${np ? `<span class="olmap" data-n="${np}" title="${esc(I18N.t('Karte: Orte dieses Abschnitts'))}">🗺 ${np}</span>` : ''}</div>`; }).join('')}</details>`;
    }).join('') + (T(ol, 'note') ? `<p class="muted olnote">${esc(T(ol, 'note'))}</p>` : '');
  }
  async function renderOutline() {
    const body = $('#olBody'); const g = view && view.group;
    if (!g) { body.innerHTML = ''; return; }
    $('#olTitle').textContent = I18N.t('Gliederung') + ' · ' + g.title;
    const ol = await olOwn(g.title);
    const hasMz = !!(ol && ol.sections.some(x => x.items.some(i => i.mz))); $('#olMzW').hidden = !hasMz; $('#olTabT').classList.toggle('on', !olMz() || !hasMz); $('#olTabM').classList.toggle('on', olMz() && hasMz);
    body.innerHTML = ol ? olContentHtml(g, ol) : `<p class="muted">${esc(I18N.t('Keine Gliederung verfügbar.'))}</p>`;
    olMark(true);
    if (window.__olLast) { const el = [...body.querySelectorAll('.olp')].find(x => x.dataset.r === window.__olLast); window.__olLast = null; if (el) el.scrollIntoView({ block: 'center' }); }
  }
  // aktuelle Stelle: der gerade gespielte Vers, sonst der Vers in der Leseansicht
  function olPos(g) { const c = AU.cur; if (c && g && c.book === g.title) return { ch: c.ch, v: c.v }; return auChapterSafe(); }
  // liegt die Stelle (Kapitel, Vers) im ref der Gliederung? („1:27-2:5“, „4-5“, „3“, „15:32-37, 16:14-19“)
  const olPlaying = g => !!(AU.cur && g && AU.cur.book === g.title);
  function olIn(ref, pos, wholeCh) { // wholeCh: alle Punkte, die das Kapitel berühren; sonst nur der Punkt mit dem Vers
    if (!pos) return false;
    return String(ref).split(',').some(part => {
      const m = part.trim().match(/^(\d+)(?::(\d+))?(?:\s*[-–]\s*(\d+)(?::(\d+))?)?$/); if (!m) return false;
      let a, b;
      if (m[2]) { a = [+m[1], +m[2]]; b = m[4] ? [+m[3], +m[4]] : m[3] ? [+m[1], +m[3]] : a; } else { a = [+m[1], 0]; b = [m[3] ? +m[3] : +m[1], 9999]; }
      const lo = pos.ch * 10000 + (wholeCh ? 0 : pos.v), hi = pos.ch * 10000 + (wholeCh ? 9999 : pos.v);
      return hi >= a[0] * 10000 + a[1] && lo <= b[0] * 10000 + b[1];
    });
  }
  function olMark(scroll) {
    const pnl = $('#outlinePanel'); if (!pnl || pnl.hidden) return;
    const g = view && view.group, pos = olPos(g), whole = !olPlaying(g); let first = null;
    $$('#olBody .olc').forEach(el => { const on = olIn(el.dataset.r, pos, whole); el.classList.toggle('cur', on); if (on && !first) first = el; });
    if (first && (scroll || AU.cur)) first.scrollIntoView({ block: 'center' });
  }
  function auChapterSafe() { const ch = typeof auChapter === 'function' ? auChapter() : null; if (ch == null || !view) return null; const l = $('#rOut .row.hit, #rOut .row[data-l]'); return { ch, v: l && /^\d+$/.test(l.dataset.l) ? +l.dataset.l : 1 }; }
  const olPlace = () => { const h = document.querySelector('header'); const t = (h ? h.getBoundingClientRect().bottom : 44) + 'px'; $('#outlinePanel').style.top = t; $('#tpResize').style.top = t; };
  $('#olBtn').onclick = () => { if (!$('#outlinePanel').hidden) { $('#outlinePanel').hidden = true; return; } $('#topicPanel').hidden = true; $('#mapPanel').hidden = true; olPlace(); $('#outlinePanel').hidden = false; renderOutline(); };
  $('#olClose').onclick = () => { $('#outlinePanel').hidden = true; };
  // Klick außerhalb oder Esc schließt die Gliederung
  document.addEventListener('mousedown', e => { const p = $('#outlinePanel'); if (p.hidden || p.classList.contains('docked') || e.target.closest('#outlinePanel, #olBtn, #tpResize, #suggest, #audioBar')) return; p.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#outlinePanel').hidden) { $('#outlinePanel').hidden = true; e.stopPropagation(); } }, true);
  new MutationObserver(() => { $('#tpResize').hidden = $('#topicPanel').hidden && $('#outlinePanel').hidden; }).observe($('#outlinePanel'), { attributes: true, attributeFilter: ['hidden'] });
  const olSetMz = on => { try { localStorage.setItem('olMz', on ? '1' : '0'); } catch { /* ohne Speicher */ } renderOutline(); };
  $('#olTabT').onclick = () => olSetMz(false); $('#olTabM').onclick = () => olSetMz(true);
  $('#mapOl').onclick = () => { $('#mapPanel').hidden = true; $('#olBtn').click(); };
  $('#olBody').addEventListener('click', e => {
    const mp = e.target.closest('.olmap'); if (mp) { const q = mp.closest('.olp'); e.stopPropagation(); window.__olLast = q.dataset.r; window.__mapOpenFor && window.__mapOpenFor(view.group.title, q.dataset.r, q.querySelector('.ref').textContent + ' ' + (q.querySelector('.tx, .he')?.firstChild?.textContent || '')); return; }
    const p = e.target.closest('.olp'); if (!p) return;
    jumpTo(p.dataset.ref, e.metaKey || e.ctrlKey);
  });
  const TPS = window.topics;
  let topicsReady = false, tpIdx = null, tpSec = [], tpSecKey = '';
  const tpS = { slug: null, data: null, tab: 'notable', sort: 'rel', n: 60, q: '', sq: '', books: new Set(), booksOpen: false, stack: [] };
  const tpBookOf = ref => ref.replace(/\s+[\dIVXLC][\dabIVXLC:.,\- ]*$/, '').split(', ')[0];
  const tpLang = () => (I18N.lang === 'he' ? 'he' : 'en');
  const tpName = t => (I18N.lang === 'he' && t.he) ? t.he : (t.en || t.slug || t.s);
  async function refreshTopicStatus() {
    const st = await TPS.status();
    topicsReady = st.complete;
    $('#tpInfo').textContent = st.complete ? I18N.t('✓ vollständig vorhanden') : st.count ? `${st.count} / ${st.total}` : I18N.t('noch nicht heruntergeladen');
    $('#tpGet').textContent = st.complete ? I18N.t('Erneut laden') : st.count ? I18N.t('Fortsetzen') : I18N.t('Themen herunterladen');
    return st;
  }
  $('#tpGet').onclick = async () => {
    $('#tpGet').disabled = true; $('#tpStop').disabled = false; $('#tpProg').hidden = false;
    const r = await TPS.build();
    $('#tpStop').disabled = true; $('#tpProg').hidden = true; $('#tpGet').disabled = false; tpIdx = null;
    await refreshTopicStatus();
    if (r.error) $('#tpInfo').textContent = '⚠ ' + r.error;
    else if (r.failed) $('#tpInfo').textContent += ' · ' + I18N.t('{} Fehler (erneut starten zum Fortsetzen)', r.failed);
    if (view) loadTopics(view.sections[view.idx]);
  };
  $('#tpStop').onclick = () => TPS.cancel();
  TPS.onProgress(p => { $('#tpProg').max = p.total || 1; $('#tpProg').value = p.file; $('#tpInfo').textContent = `${I18N.t(p.phase)} (${p.file}/${p.total})`; });

  function btnLbl(sel, icon, key, n) { const el = $(sel); if (el) el.innerHTML = `${icon}<span class="bl">${esc(I18N.t(key))}</span>${n ? ' ' + n : ''}`; }
  async function loadTopics(s) {
    $('#tpBtn').hidden = !topicsReady; tpSec = []; tpSecKey = '';
    if (!topicsReady || !view || !s) return;
    const first = s.label.split(' › ')[0];
    const m = s.path.length === 1 && !s.label.includes('›') && first.match(/(\d+[ab]?)$/i);
    if (!m) { btnLbl('#tpBtn', '🏷', 'Themen', 0); return; }
    const token = view.idx + ':' + view.group.key;
    let rows = []; try { rows = await TPS.section(view.group.title, m[1]); } catch { rows = []; }
    if (!view || token !== view.idx + ':' + view.group.key) return;
    tpSec = rows; tpSecKey = view.group.title + ' ' + m[1];
    btnLbl('#tpBtn', '🏷', 'Themen', rows.length);
    if (!$('#topicPanel').hidden && !tpS.slug) renderTopicPanel();
  }
  const tpSort = (a, b) => {
    const A = a.o, B = b.o, lang = tpLang();
    if (!A && !B) return 0;
    if (!A !== !B) return A ? -1 : 1;
    if (tpS.sort === 'chrono') return A.d === B.d ? (A.id < B.id ? -1 : A.id > B.id ? 1 : 0) : A.d - B.d;
    const i = lang === 'he' ? 1 : 0;
    if (A.cp[i] > 0 || B.cp[i] > 0) return B.cp[i] - A.cp[i];
    if (lang === 'en' && A.al.length !== B.al.length) return A.al.includes('en') ? -1 : B.al.includes('en') ? 1 : 0;
    if (A.pr !== B.pr) return B.pr - A.pr;
    return B.s - A.s;
  };
  const tpPara = s => esc(s || '').trim().replace(/\n\s*\n/g, '<br><br>');
  const REL = { 'is-a': 'Ist ein', 'parent-of': 'Übergeordnet zu', 'child-of': 'Untergeordnet zu', 'related-to': 'Verwandt', 'member-of': 'Gehört zu', 'has-role': 'Rolle', 'participates-in': 'Beteiligt an', 'person-participates-in-event': 'Beteiligte', 'spouse-of': 'Ehepartner', 'sibling-of': 'Geschwister', 'opposed': 'Gegensatz', 'has-relationship': 'Beziehungen' };
  async function renderTopicPanel() {
    const body = $('#tpBody'); const fl = $('#tpFilter'); fl.hidden = !!tpS.slug; fl.placeholder = I18N.t('Thema suchen (z. B. Abraham, Pessach) …'); if (fl.value !== tpS.q) fl.value = tpS.q;
    if (!tpS.slug) {
      $('#tpTitle').textContent = I18N.t('Themen');
      let rows, head = '';
      if (tpS.q) {
        if (!tpIdx) tpIdx = await TPS.list();
        const q = tpS.q.toLowerCase();
        rows = tpIdx.filter(x => (x.en || '').toLowerCase().includes(q) || (x.he || '').includes(tpS.q)).sort((a, b) => (b.n - a.n)).slice(0, 80).map(x => ({ slug: x.s, en: x.en, he: x.he, n: x.n }));
        head = `<p class="muted">${esc(I18N.t('{} Treffer', rows.length))}</p>`;
      } else {
        rows = tpSec; head = `<p class="muted">${esc(tpSecKey ? I18N.t('Themen in {}', tpSecKey) : I18N.t('Gib einen Namen ein, um ein Thema zu suchen.'))}</p>`;
        if (tpSecKey && !rows.length) head += `<p class="muted">${esc(I18N.t('Keine Themen zu diesem Abschnitt.'))}</p>`;
      }
      body.innerHTML = head + rows.map(r => `<button class="tpItem" data-slug="${esc(r.slug)}"><b>${esc(tpName(r))}</b>${r.he && I18N.lang !== 'he' ? ` <span class="he muted" lang="he">${esc(r.he)}</span>` : ''}${r.verses ? ` <span class="muted">· ${esc(I18N.t('V. {}', r.verses.slice(0, 6).join(', ') + (r.verses.length > 6 ? ' …' : '')))}</span>` : ''}</button>`).join('');
      return;
    }
    if (!tpS.data || tpS.data.slug !== tpS.slug) { body.innerHTML = `<p class="muted">…</p>`; tpS.data = await TPS.get(tpS.slug); }
    const d = tpS.data;
    if (!d) { body.innerHTML = `<p class="muted">${esc(I18N.t('Thema nicht gefunden.'))}</p><button data-act="back">←</button>`; return; }
    $('#tpTitle').textContent = tpName(d);
    const lang = tpLang(), allN = d.notable, allO = d.sources;
    const bookCount = new Map(); allN.concat(allO).forEach(x => { const b = tpBookOf(x.r); bookCount.set(b, (bookCount.get(b) || 0) + 1); });
    const bookList = [...bookCount.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    tpS.bookList = bookList.map(x => x[0]);
    const sqq = tpS.sq.toLowerCase();
    const keep = x => (!tpS.books.size || tpS.books.has(tpBookOf(x.r))) && (!sqq || x.r.toLowerCase().includes(sqq) || JSON.stringify(x.d || '').toLowerCase().includes(sqq));
    const notable = allN.filter(keep), others = allO.filter(keep);
    const tab = tpS.tab === 'notable' && !allN.length ? 'sources' : tpS.tab;
    if (tpS.auto !== d.slug + '|' + tab) { tpS.auto = d.slug + '|' + tab; tpS.sort = tab === 'sources' ? 'chrono' : 'rel'; } // „Alle Quellen“ zuerst chronologisch, „Notable Sources“ nach Relevanz
    const notableSorted = notable.slice().sort(tpSort), othersSorted = others.slice().sort(tpSort);
    const list = tab === 'notable' ? notableSorted : notable.concat(others).sort(tpSort);
    const text = d.desc && (d.desc[lang] || d.desc.en || d.desc.he);
    const chips = Object.entries(d.links || {}).map(([k, arr]) => `<div><span class="muted">${esc(I18N.t(REL[k] || k))}:</span> <span class="tpChips">${arr.slice(0, 14).map(x => `<button data-slug="${esc(x.t)}">${esc(I18N.lang === 'he' && x.he ? x.he : x.en)}</button>`).join('')}</span></div>`).join('');
    body.innerHTML = `<button data-act="back">←</button>
      ${d.he && I18N.lang !== 'he' ? `<div class="he" lang="he"><b>${esc(d.he)}</b></div>` : ''}
      ${text ? `<p>${tpPara(text)}</p>` : ''}
      ${chips}
      <input id="tpSq" class="tpSq" value="${esc(tpS.sq)}" placeholder="${esc(I18N.t('Quellen filtern (z. B. Rashi, Genesis) …'))}">
      <div class="tpTabs">
        ${allN.length ? `<button data-tab="notable" class="${tab === 'notable' ? 'on' : ''}">${esc(I18N.t('Notable Sources'))} (${notable.length})</button>` : ''}
        <button data-tab="sources" class="${tab === 'sources' ? 'on' : ''}">${esc(I18N.t(allN.length ? 'Alle Quellen' : 'Quellen'))} (${notable.length + others.length})</button>
        <span class="spacer"></span>
        <select data-act="sort"><option value="rel"${tpS.sort === 'rel' ? ' selected' : ''}>${esc(I18N.t('Relevanz'))}</option><option value="chrono"${tpS.sort === 'chrono' ? ' selected' : ''}>${esc(I18N.t('Chronologisch'))}</option></select>
      </div>` + list.slice(0, tpS.n).map(x => {
        const de = x.d && (x.d[lang] || x.d.en || x.d.he);
        return `<div class="tpSrc"><a data-ref="${esc(x.r)}">${esc(x.r)}</a>${de ? `<div class="tpD">${de.t ? `<b>${esc(de.t)}</b><br>` : ''}${tpPara(de.p)}</div>` : ''}</div>`;
      }).join('') + (!list.length ? `<p class="muted">${esc(I18N.t('Keine Quellen für diesen Filter.'))}</p>` : '') + (list.length > tpS.n ? `<button data-act="more">${esc(I18N.t('Mehr anzeigen'))} (${list.length - tpS.n})</button>` : '');
  }
  function openTopic(slug, push = true) {
    if (push && tpS.slug) tpS.stack.push(tpS.slug);
    tpS.slug = slug; tpS.data = null; tpS.n = 60; tpS.tab = 'notable'; tpS.sq = ''; tpS.books = new Set();
    placeTp(); $('#topicPanel').hidden = false; renderTopicPanel(); $('#topicPanel').scrollTop = 0;
  }
  const placeTp = () => { const h = document.querySelector('header'); const t = (h ? h.getBoundingClientRect().bottom : 44) + 'px'; $('#topicPanel').style.top = t; $('#tpResize').style.top = t; };
  // Breite per Ziehen am linken Rand (gemeinsam mit Kommentar- und Wörterbuchleiste)
  new MutationObserver(() => { $('#tpResize').hidden = $('#topicPanel').hidden && $('#outlinePanel').hidden; }).observe($('#topicPanel'), { attributes: true, attributeFilter: ['hidden'] });
  $('#tpResize').addEventListener('mousedown', ev => {
    ev.preventDefault(); const rt = document.documentElement; rt.classList.add('cmt-dragging');
    const off = IS_PANE2 ? 0 : (rt.classList.contains('split') ? window.innerWidth * (parseFloat(getComputedStyle(rt).getPropertyValue('--p2w')) / 100) : 0);
    const mv = e2 => window.setPanelW(window.innerWidth - off - e2.clientX);
    const up = () => { rt.classList.remove('cmt-dragging'); document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  });
  $('#tpResize').addEventListener('dblclick', () => window.setPanelW(400));
  $('#tpBtn').onclick = () => { $('#outlinePanel').hidden = true; $('#mapPanel').hidden = true; placeTp(); tpS.slug = null; tpS.stack = []; tpS.q = ''; $('#tpFilter').value = ''; $('#topicPanel').hidden = false; renderTopicPanel(); };
  $('#tpClose').onclick = () => { $('#topicPanel').hidden = true; };

  // ---------- Karte: Orte des Kapitels (OpenBible.info) auf einem Relief aus dem Copernicus-Höhenmodell ----------
  const BM = window.BMAP, BB = window.BBORD;
  // Orte der Werke des Josephus (ToposText, ODC-BY) werden zu den Bibelorten hinzugefügt; „Kapitel“ = Buch*1000+Kapitel (0 = Vorwort)
  if (BM && window.BMJOS) {
    BM.nOrig = BM.books.length; BM.j3 = new Set(); const km = (a, b) => Math.hypot((a[0] - b[0]) * 95, (a[1] - b[1]) * 111), nn = s => String(s).replace(/\(.*?\)/g, '').split('/')[0].toLowerCase().replace(/[^a-z]/g, ''), seen = new Map();
    window.BMJOS.forEach(w => {
      const bi = BM.books.push(w.title) - 1; if (w.depth3) BM.j3.add(bi); const map = w.places.map(pl => {
        const key = pl[0] + '|' + pl[2] + '|' + pl[3]; if (seen.has(key)) return seen.get(key);
        let ix = BM.places.findIndex(p => !p[7] && nn(p[0]) === nn(pl[0]) && km([p[2], p[3]], [pl[2], pl[3]]) < 25); // gleicher Ort schon aus OpenBible?
        if (ix < 0) { ix = BM.places.push([pl[0], pl[1], pl[2], pl[3], [], '', []]) - 1; }
        if (!BM.places[ix][7]) BM.places[ix][7] = { g: pl[4], pl: pl[5], wd: pl[6] };
        seen.set(key, ix); return ix;
      });
      Object.entries(w.by).forEach(([k, l]) => l.forEach(n => BM.places[map[n]][4].push(w.depth3 ? [bi, +k, 0] : [bi, Math.floor(k / 1000), k % 1000])));
    });
  }
  // Jerusalem: OpenBible kennt für Tore, Türme, Teiche und Paläste nur den Stadtmittelpunkt. Hier sind Lagen nach Neh 3 und der Forschung gesetzt (vermutet, teils umstritten).
  const JERPOS = { 'Sheep Gate': [35.2364, 31.7808], 'Fish Gate': [35.2305, 31.7815], 'Gate of Yeshanah': [35.2290, 31.7800], 'Valley Gate': [35.2263, 31.7720], 'Dung Gate': [35.2325, 31.7690], 'Fountain Gate': [35.2352, 31.7698], 'Water Gate': [35.2370, 31.7728], 'Horse Gate': [35.2368, 31.7770], 'East Gate': [35.2374, 31.7788], 'Muster Gate': [35.2368, 31.7798], 'Corner Gate': [35.2282, 31.7774], 'Ephraim Gate': [35.2275, 31.7790], 'Benjamin Gate': [35.2318, 31.7822], 'Potsherd Gate': [35.2312, 31.7686], 'Shallecheth': [35.2337, 31.7777],
    'Tower of the Ovens': [35.2303, 31.7766], 'Tower of Hananel': [35.2360, 31.7803], 'Tower of the Hundred': [35.2364, 31.7804], 'Millo': [35.2362, 31.7752], 'Jebus': [35.2362, 31.7738], 'Lower Pool': [35.2348, 31.7692],
    'House of the Forest of Lebanon': [35.2363, 31.7764], 'Hall of the Throne': [35.2363, 31.7764], 'Hall of Pillars': [35.2363, 31.7764], 'Hall of Judgment': [35.2363, 31.7764] };
  BM.places.forEach(p => { const q = JERPOS[p[0]]; if (q && !p[7] && Math.abs(p[2] - 35.234) < 0.003 && p[3] > 31.776 && p[3] < 31.781) { p[2] = q[0]; p[3] = q[1]; p[8] = 1; } });
  const mapJosKey = () => { const s = view && view.sections && view.sections[view.idx], p = s && s.path; if (!p) return null; if (p[0] === 'Preface') return 0; const nums = p.filter(x => typeof x === 'number'); return nums.length >= 1 ? nums[0] + 1 : null; }; // Seitenabschnitt = Buch (Kapitel stehen darin)
  const MP = { img: null, ok: false, s: 1, tx: 0, ty: 0, cur: [], sel: -1, alt: -1, byChap: null, byBook: null, over: null, drag: null, lay: [], rul: null };
  const mapPx = p => [(p[2] - BM.W0) * BM.ppd * BM.k, (BM.N0 - p[3]) * BM.ppd];
  const mapHe = p => p[5] || '';
  const mapXY = (lon, lat) => [(lon - BM.W0) * BM.ppd * BM.k, (BM.N0 - lat) * BM.ppd];
  const mapConf = p => p[8] ? 400 : (p[6] && p[6][0] ? p[6][0][3] : 1000);   // Sicherheit der wahrscheinlichsten Zuordnung (Promille, neuestes Jahrzehnt)
  // Orte, deren Verse in einem Gliederungs-ref liegen („1:27-2:5“, „15:32-37, 16:14-19“)
  function mapRanges(ref) {
    return String(ref).split(',').map(part => {
      const m = part.trim().match(/^(\d+)(?::(\d+))?(?:\s*[-–]\s*(\d+)(?::(\d+))?)?$/); if (!m) return null; let a, b;
      if (m[2]) { a = +m[1] * 10000 + +m[2]; b = m[4] ? +m[3] * 10000 + +m[4] : m[3] ? +m[1] * 10000 + +m[3] : a; } else { a = +m[1] * 10000; b = (m[3] ? +m[3] : +m[1]) * 10000 + 9999; }
      return [a, b];
    }).filter(Boolean);
  }
  function mapByBook() { if (MP.byBook) return MP.byBook; MP.byBook = new Map(); BM.places.forEach((p, i) => p[4].forEach(([b, c, v]) => { if (!MP.byBook.has(b)) MP.byBook.set(b, []); MP.byBook.get(b).push([i, c * 10000 + v, c * 10000 + (v ? v : 9999)]); })); return MP.byBook; }
  function mapForRef(title, ref) { // -> [{i, vs}]
    const bi = BM.books.indexOf(title); if (bi < 0) return []; const rg = mapRanges(ref); if (!rg.length) return []; const out = new Map();
    (mapByBook().get(bi) || []).forEach(([i, lo, hi]) => { if (rg.some(([a, b]) => hi >= a && lo <= b)) { if (!out.has(i)) out.set(i, []); out.get(i).push(lo % 10000); } });
    return [...out].map(([i, vs]) => ({ i, vs }));
  }
  function mapChapPlaces() {
    if (MP.over) return MP.over.list;
    if (!BM || !view || !view.group) return [];
    const bi = BM.books.indexOf(view.group.title); const jos = bi >= 0 && !!BM.j3 && BM.j3.has(bi), ch = jos ? mapJosKey() : auChapter(); if (bi < 0 || ch == null) return [];
    if (!MP.byChap) { MP.byChap = new Map(); BM.places.forEach((p, i) => p[4].forEach(([b, c, v]) => { const k = b + '|' + c; let m = MP.byChap.get(k); if (!m) MP.byChap.set(k, m = new Map()); if (!m.has(i)) m.set(i, []); m.get(i).push(v); })); }
    if (jos) { // Josephus: alle Kapitel des Buches (bzw. Vorwort)
      const u = new Map(); MP.byChap.forEach((mm, k) => { const [b, c] = k.split('|').map(Number); if (b !== bi || (ch === 0 ? c !== 0 : Math.floor(c / 1000) !== ch)) return; mm.forEach((vs, i) => { if (!u.has(i)) u.set(i, []); u.get(i).push(...vs); }); });
      return [...u].map(([i, vs]) => ({ i, vs }));
    }
    const m = MP.byChap.get(bi + '|' + ch); return m ? [...m].map(([i, vs]) => ({ i, vs })) : [];
  }
  function mapRefresh() {
    if (!BM) return; MP.over = null; MP.cur = mapChapPlaces(); $('#mapBtn').hidden = !MP.cur.length && $('#mapPanel').hidden; btnLbl('#mapBtn', '🗺', 'Karte', MP.cur.length);
    if (!$('#mapPanel').hidden) { MP.sel = -1; mapFit(); mapInfo(); mapDraw(); }
  }
  function mapSize() { const cv = $('#mapCv'), r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; const w = Math.max(50, Math.round(r.width * d)), h = Math.max(50, Math.round(r.height * d)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } return { w, h, d }; }
  function mapFit() {
    const { w, h } = mapSize(); const pts = MP.cur.map(c => mapPx(BM.places[c.i]));
    const all = Math.min(w / BM.w, h / BM.h);
    if (!pts.length) { MP.s = all; MP.tx = (w - BM.w * all) / 2; MP.ty = (h - BM.h * all) / 2; return; }
    let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
    const pad = 90, sx = w / (x1 - x0 + 2 * pad), sy = h / (y1 - y0 + 2 * pad);
    MP.s = Math.min(Math.max(Math.min(sx, sy), all), 1.6); MP.tx = w / 2 - (x0 + x1) / 2 * MP.s; MP.ty = h / 2 - (y0 + y1) / 2 * MP.s;
  }
  // Bildschirmpositionen; dicht beieinanderliegende Orte des Kapitels werden zu einem kleinen Kreis auseinandergezogen
  function mapLayout() {
    const { d } = mapSize(), lay = [], inCh = new Set(MP.cur.map(c => c.i));
    const pts = MP.cur.map(c => { const [x, y] = mapPx(BM.places[c.i]); return { i: c.i, x: x * MP.s + MP.tx, y: y * MP.s + MP.ty, chap: true }; });
    const near = 17 * d, seen = new Array(pts.length).fill(false);
    pts.forEach((a, ai) => {
      if (seen[ai]) return; const grp = [ai]; seen[ai] = true;
      for (let k = 0; k < grp.length; k++) pts.forEach((b, bi) => { if (!seen[bi] && Math.hypot(pts[grp[k]].x - b.x, pts[grp[k]].y - b.y) < near) { seen[bi] = true; grp.push(bi); } });
      if (grp.length === 1) { lay.push(a); return; }
      const cx = grp.reduce((t, g) => t + pts[g].x, 0) / grp.length, cy = grp.reduce((t, g) => t + pts[g].y, 0) / grp.length, R = (grp.length === 2 ? 15 : 12 + grp.length * 2) * d;
      grp.sort((p, q) => BM.places[pts[p].i][0].localeCompare(BM.places[pts[q].i][0])).forEach((g, k) => { const an = -Math.PI / 2 + k * 2 * Math.PI / grp.length + (grp.length === 2 ? Math.PI / 2 : 0); lay.push({ i: pts[g].i, x: cx + R * Math.cos(an), y: cy + R * Math.sin(an), chap: true, spread: true, cx, cy }); });
    });
    if ($('#mapAll').checked) BM.places.forEach((p, i) => { if (inCh.has(i)) return; const [x, y] = mapPx(p); lay.push({ i, x: x * MP.s + MP.tx, y: y * MP.s + MP.ty, chap: false }); });
    return lay;
  }
  function mapDraw() {
    if ($('#mapPanel').hidden || !MP.ok) return; const cv = $('#mapCv'), { w, h, d } = mapSize(), g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#7aa0be'; g.fillRect(0, 0, w, h);
    g.imageSmoothingQuality = 'high'; g.drawImage(MP.img, MP.tx, MP.ty, BM.w * MP.s, BM.h * MP.s);
    const r = d, ll = I18N.lang;
    mapJerDraw(g, r);
    if (BB && $('#mapBord').checked) {
      g.save(); g.lineJoin = 'round'; g.setLineDash([6 * r, 4 * r]); g.strokeStyle = 'rgba(120,20,60,.85)'; g.lineWidth = 1.6 * r;
      BB.lines.forEach(l => { g.beginPath(); l.forEach(([x, y], k) => { const X = x * MP.s + MP.tx, Y = y * MP.s + MP.ty; if (k) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); });
      g.restore(); g.font = `italic 600 ${13 * r}px -apple-system, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(100,15,50,.9)'; g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3 * r; g.lineJoin = 'round';
      BB.names.forEach(n => { const t = (ll === 'de' ? n[1] : ll === 'he' && n[2] ? n[2] : n[0]).toUpperCase(), X = n[3] * MP.s + MP.tx, Y = n[4] * MP.s + MP.ty; if (X < 0 || Y < 0 || X > w || Y > h) return; g.strokeText(t, X, Y); g.fillText(t, X, Y); });
      g.textAlign = 'start';
    }
    MP.lay = mapLayout();
    g.fillStyle = 'rgba(40,40,40,.55)'; MP.lay.forEach(o => { if (o.chap) return; g.beginPath(); g.arc(o.x, o.y, 2.6 * r, 0, 7); g.fill(); });
    g.font = `${12 * r}px -apple-system, system-ui, sans-serif`; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const boxes = [], hit = (a, b) => boxes.some(q => a.x < q.x + q.w && a.x + a.w > q.x && a.y < q.y + q.h && a.y + a.h > q.y);
    const chap = MP.lay.filter(o => o.chap).sort((a, b) => (a.i === MP.sel) - (b.i === MP.sel) || a.y - b.y);
    chap.filter(o => o.spread).forEach(o => { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5 * r; g.beginPath(); g.moveTo(o.cx, o.cy); g.lineTo(o.x, o.y); g.stroke(); });
    chap.forEach(o => {
      const on = o.i === MP.sel; g.beginPath(); g.arc(o.x, o.y, (on ? 8 : 6) * r, 0, 7); g.fillStyle = on ? '#ffcc00' : mapConf(BM.places[o.i]) < 500 ? '#ee9a94' : '#d6382f'; g.fill(); g.lineWidth = 2 * r; g.strokeStyle = '#fff'; if (!on && mapConf(BM.places[o.i]) < 500) g.setLineDash([3 * r, 2 * r]); g.stroke(); g.setLineDash([]);
    });
    if (MP.sel >= 0) { // andere mögliche Lagen des gewählten Ortes
      const me = MP.lay.find(o => o.i === MP.sel), al = BM.places[MP.sel][6] || [];
      al.forEach((a, k) => { if (k === 0) return; const [x0, y0] = mapXY(a[1], a[2]), X = x0 * MP.s + MP.tx, Y = y0 * MP.s + MP.ty, on = k === MP.alt;
        if (me) { g.save(); g.setLineDash([4 * r, 3 * r]); g.strokeStyle = 'rgba(30,30,30,.7)'; g.lineWidth = 1.2 * r; g.beginPath(); g.moveTo(me.x, me.y); g.lineTo(X, Y); g.stroke(); g.restore(); }
        g.beginPath(); g.arc(X, Y, (5 + a[3] / 1000 * 5) * r, 0, 7); g.fillStyle = on ? '#ffcc00' : 'rgba(255,255,255,.55)'; g.fill(); g.lineWidth = 2 * r; g.strokeStyle = '#222'; g.stroke();
        const t = a[0] + ' · ' + Math.round(a[3] / 10) + ' %'; g.font = `${11 * r}px -apple-system, system-ui, sans-serif`; g.lineWidth = 3 * r; g.strokeStyle = 'rgba(255,255,255,.9)'; g.strokeText(t, X + 9 * r, Y); g.fillStyle = '#222'; g.fillText(t, X + 9 * r, Y); });
    }
    chap.forEach(o => boxes.push({ x: o.x - 8 * r, y: o.y - 8 * r, w: 16 * r, h: 16 * r })); // Marker selbst sind auch Hindernisse für Namen
    chap.forEach(o => { // Beschriftung: erst rechts, dann links, oben, unten; was nirgends frei ist, bleibt ohne Namen (Hover/Klick zeigt ihn)
      const name = BM.places[o.i][0], tw = g.measureText(name).width, th = 14 * r, on = o.i === MP.sel, off = 10 * r;
      const opts = [[o.x + off, o.y - th / 2, 'start'], [o.x - off - tw, o.y - th / 2, 'start'], [o.x - tw / 2, o.y - off - th, 'start'], [o.x - tw / 2, o.y + off, 'start']];
      for (const [bx, by] of opts) { const bb = { x: bx - 2, y: by, w: tw + 4, h: th }; if (!hit(bb) || (on && opts.indexOf(opts.find(q => q[0] === bx)) === 3)) { boxes.push(bb); g.lineWidth = 3.5 * r; g.strokeStyle = 'rgba(255,255,255,.9)'; g.strokeText(name, bx, by + th / 2); g.fillStyle = '#222'; g.fillText(name, bx, by + th / 2); break; } }
    });
    try { const noted = new Set(notesAll.filter(n => n.place).map(n => n.place)); if (noted.size) { g.font = `${12 * r}px -apple-system, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; MP.lay.forEach(o => { if (noted.has(BM.places[o.i][0])) { g.lineWidth = 3 * r; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText('✎', o.x + 5 * r, o.y - 5 * r); g.fillStyle = '#b8570a'; g.fillText('✎', o.x + 5 * r, o.y - 5 * r); } }); } } catch { /* Notizen noch nicht geladen */ }
    mapRouteDraw(g, r);
    mapRulDraw(g, r);
  }
  // Entfernungsmessung: Klicks setzen Punkte (rasten auf Orte ein), Luftlinie in km
  // Höhenraster (map/elev.js, zlib+Base64) wird beim ersten Öffnen der Karte entpackt
  let ELV = null;
  async function mapElevLoad() {
    if (ELV !== null || !window.BELEV) return; ELV = false;
    try { const E = window.BELEV, bin = Uint8Array.from(atob(E.z), c => c.charCodeAt(0)), ds = new DecompressionStream('deflate'); const buf = await new Response(new Blob([bin]).stream().pipeThrough(ds)).arrayBuffer(); ELV = { E, a: new Uint8Array(buf) }; if (!$('#mapPanel').hidden) { mapInfo(); mapRulInfo(); } } catch { ELV = false; }
  }
  function mapElev(lon, lat) { // Höhe in m (bilinear), null wenn nicht geladen/außerhalb
    if (!ELV) return null;
    const { E, a } = ELV, x = (lon - E.W0) * E.ppd - 0.5, y = (E.N0 - lat) * E.ppd - 0.5; if (x < 0 || y < 0 || x >= E.w - 1 || y >= E.h - 1) return null;
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, g = (i, j) => a[(y0 + j) * E.w + x0 + i];
    const v = g(0, 0) * (1 - fx) * (1 - fy) + g(1, 0) * fx * (1 - fy) + g(0, 1) * (1 - fx) * fy + g(1, 1) * fx * fy; return Math.round(v * E.step + E.off);
  }
  const mapM = m => m === null ? '' : (m < 0 ? '−' : '') + Math.abs(m).toLocaleString(I18N.lang === 'de' ? 'de-DE' : 'en-US') + ' m';
  const mapLL = (x, y) => [BM.W0 + x / (BM.ppd * BM.k), BM.N0 - y / BM.ppd];
  function mapKm(a, b) { const R = 6371, t = Math.PI / 180, dl = (b[1] - a[1]) * t, dn = (b[0] - a[0]) * t, s = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); }
  function mapRulDraw(g, r) {
    const R = MP.rul; if (!R || !R.pts.length) return; const sc = p => { const [x, y] = mapXY(p[0], p[1]); return [x * MP.s + MP.tx, y * MP.s + MP.ty]; };
    const P = R.pts.map(sc); g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    const line = (pts, dash) => { g.beginPath(); pts.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.setLineDash(dash); g.stroke(); };
    g.lineWidth = 5 * r; g.strokeStyle = 'rgba(255,255,255,.9)'; if (P.length > 1) line(P, []);
    g.lineWidth = 2.5 * r; g.strokeStyle = '#1f4fd8'; if (P.length > 1) line(P, [7 * r, 4 * r]);
    if (R.cur) { const q = [R.cur[0], R.cur[1]], a = P[P.length - 1]; g.lineWidth = 2 * r; g.strokeStyle = 'rgba(31,79,216,.6)'; line([a, q], [3 * r, 4 * r]); const km = mapKm(R.pts[R.pts.length - 1], mapLL((q[0] - MP.tx) / MP.s, (q[1] - MP.ty) / MP.s)); g.setLineDash([]); g.font = `600 ${12 * r}px -apple-system, sans-serif`; const tx = Math.round(km) + ' km'; g.lineWidth = 3.5 * r; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(tx, q[0] + 10 * r, q[1] - 8 * r); g.fillStyle = '#1f4fd8'; g.fillText(tx, q[0] + 10 * r, q[1] - 8 * r); }
    g.setLineDash([]); g.font = `600 ${12 * r}px -apple-system, sans-serif`;
    const many = P.length > 12;
    for (let k = 1; !many && k < P.length; k++) { const km = Math.round(mapKm(R.pts[k - 1], R.pts[k])) + ' km', mx = (P[k - 1][0] + P[k][0]) / 2, my = (P[k - 1][1] + P[k][1]) / 2; g.lineWidth = 3.5 * r; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(km, mx + 4 * r, my - 5 * r); g.fillStyle = '#1f4fd8'; g.fillText(km, mx + 4 * r, my - 5 * r); }
    P.forEach((q, k) => { if (many && k && k < P.length - 1) return; g.beginPath(); g.arc(q[0], q[1], 5 * r, 0, 7); g.fillStyle = k ? '#fff' : '#1f4fd8'; g.fill(); g.lineWidth = 2.5 * r; g.strokeStyle = '#1f4fd8'; g.stroke(); });
    if (R.hov) { const q = sc([R.hov.lon, R.hov.lat]); g.beginPath(); g.arc(q[0], q[1], 7 * r, 0, 7); g.fillStyle = 'rgba(31,79,216,.3)'; g.fill(); g.lineWidth = 2 * r; g.strokeStyle = '#1f4fd8'; g.stroke(); }
    g.restore();
  }
  function mapProfile(pts) { // Stützpunkte alle ~2 km entlang der Linie
    const out = []; let km = 0;
    for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k], L = mapKm(a, b), n = Math.max(1, Math.min(400, Math.ceil(L / 2)));
      for (let s = k === 1 ? 0 : 1; s <= n; s++) { const t = s / n, lon = a[0] + (b[0] - a[0]) * t, lat = a[1] + (b[1] - a[1]) * t; out.push({ km: km + L * t, lon, lat, e: mapElev(lon, lat) }); } km += L; }
    return out;
  }
  function mapProfDraw(hov) {
    const R = MP.rul, cv = $('#mapRulProf'); if (!R || !cv || !R.prof) return; const d = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * d; cv.height = H * d; const g = cv.getContext('2d'); g.scale(d, d);
    const P = R.prof.filter(p => p.e !== null); if (P.length < 2) return; const tot = R.prof[R.prof.length - 1].km || 1; let lo = Math.min(...P.map(p => p.e)), hi = Math.max(...P.map(p => p.e)); lo = Math.min(lo, 0); hi = Math.max(hi, lo + 100); const padL = 34, padB = 12, X = km => padL + (km / tot) * (W - padL - 4), Y = e => 4 + (1 - (e - lo) / (hi - lo)) * (H - 4 - padB);
    g.fillStyle = '#9db8d6'; g.fillRect(padL, Y(0), W - padL - 4, H - padB - Y(0) + 0.5); // unter dem Meeresspiegel
    g.beginPath(); g.moveTo(X(P[0].km), Y(lo)); P.forEach(p => g.lineTo(X(p.km), Y(p.e))); g.lineTo(X(P[P.length - 1].km), Y(lo)); g.closePath(); g.fillStyle = 'rgba(150,120,70,.55)'; g.fill();
    g.beginPath(); P.forEach((p, k) => k ? g.lineTo(X(p.km), Y(p.e)) : g.moveTo(X(p.km), Y(p.e))); g.lineWidth = 1.5; g.strokeStyle = '#6b4a1e'; g.stroke();
    g.font = '10px -apple-system, sans-serif'; g.fillStyle = '#444'; g.textAlign = 'right'; g.fillText(Math.round(hi) + '', padL - 3, 10); g.fillText(Math.round(lo) + '', padL - 3, H - padB); if (lo < 0 && hi > 0) g.fillText('0', padL - 3, Y(0) + 3);
    g.textAlign = 'left'; g.fillText('0', padL, H - 1); g.textAlign = 'right'; g.fillText(Math.round(tot) + ' km', W - 4, H - 1);
    R.hov = null; if (hov !== undefined && hov !== null) { const p = R.prof[hov]; if (p && p.e !== null) { R.hov = p; g.strokeStyle = '#1f4fd8'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(p.km), 2); g.lineTo(X(p.km), H - padB); g.stroke(); g.beginPath(); g.arc(X(p.km), Y(p.e), 3, 0, 7); g.fillStyle = '#1f4fd8'; g.fill(); const t = Math.round(p.km) + ' km · ' + mapM(p.e); g.textAlign = X(p.km) > W / 2 ? 'right' : 'left'; g.fillStyle = '#1f4fd8'; g.fillText(t, X(p.km) + (X(p.km) > W / 2 ? -4 : 4), 11); } }
    R.profX = X;
  }
  function mapRulInfo() {
    const R = MP.rul, b = $('#mapRuler'); if (!R || !R.on) { b.hidden = true; return; } b.hidden = false; const t = I18N.t.bind(I18N); let tot = 0, rows = '';
    for (let k = 1; k < R.pts.length; k++) { const km = mapKm(R.pts[k - 1], R.pts[k]); tot += km; if (R.pts.length <= 12) rows += `<div>${esc(R.pts[k - 1][2] || t('Punkt') + ' ' + k)} → ${esc(R.pts[k][2] || t('Punkt') + ' ' + (k + 1))}: <b>${Math.round(km)} km</b></div>`; }
    b.innerHTML = R.pts.length < 2 ? `<div class="rh">${esc(t('Entfernung messen'))}</div><div class="rs">${esc(t('Klicke Orte oder Punkte auf der Karte an. Esc beendet.'))}</div>`
      : `<div class="rh">${esc(t('Luftlinie'))}: <b>${Math.round(tot)} km</b></div>${rows}<div class="rs">≈ ${(tot / 30).toFixed(1)} ${esc(t('Tagesreisen zu Fuß (je 30 km, grob; echte Wege sind länger)'))}</div>`;
    R.prof = null;
    if (R.pts.length >= 2 && ELV) { R.prof = mapProfile(R.pts); const P = R.prof.filter(p => p.e !== null); if (P.length > 1) { let up = 0, dn = 0, ref = P[0].e; P.forEach(p => { if (p.e - ref > 30) { up += p.e - ref; ref = p.e; } else if (ref - p.e > 30) { dn += ref - p.e; ref = p.e; } });
        b.innerHTML += `<canvas id="mapRulProf"></canvas><div class="rs">${esc(t('Höhenprofil'))}: ↑ ${Math.round(up)} m · ↓ ${Math.round(dn)} m · ${esc(t('höchster Punkt'))} ${mapM(Math.max(...P.map(p => p.e)))} · ${esc(t('tiefster Punkt'))} ${mapM(Math.min(...P.map(p => p.e)))}</div>`; } }
    b.innerHTML += `<div class="rb"><button data-x="undo">${esc(t('Letzter Punkt zurück'))}</button><button data-x="clr">${esc(t('Neu'))}</button></div>`;
    if (R.prof) mapProfDraw(null);
  }
  function mapRulToggle(on) { if (on) mapElevLoad(); if (on === undefined) on = !(MP.rul && MP.rul.on); MP.rul = on ? { on: true, pts: [], cur: null } : null; $('#mapRulB').classList.toggle('on', on); $('#mapCv').style.cursor = on ? 'crosshair' : ''; mapRulInfo(); mapDraw(); }
  function mapPick(ev, all) {
    const cv = $('#mapCv'), b = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1, mx = (ev.clientX - b.left) * d, my = (ev.clientY - b.top) * d; const out = [];
    MP.lay.forEach(o => { const dd = Math.hypot(o.x - mx, o.y - my); if (dd < 11 * d) out.push([dd - (o.chap ? 4 * d : 0), o.i]); });
    out.sort((a, b2) => a[0] - b[0]); return all ? out.map(o => o[1]) : (out.length ? out[0][1] : -1);
  }
  const mapRefLink = (bi, c, v) => { const t = BM.books[bi]; if (BM.j3 && BM.j3.has(bi)) return c ? `<a data-ref="${esc(t + ' ' + Math.floor(c / 1000) + ':' + (c % 1000))}">${Math.floor(c / 1000)}.${c % 1000}</a>` : `<a data-ref="${esc(t + ', Preface')}">${esc(I18N.t('Vorwort'))}</a>`; return `<a data-ref="${esc(t + ' ' + c + (v ? ':' + v : ''))}">${esc(c + (v ? ':' + v : ''))}</a>`; };
  const mapName = i => { const p = BM.places[i], he = mapHe(p); return esc(p[0]) + (he ? ` <span class="he" dir="rtl">${esc(he)}</span>` : (p[7] && p[7].g ? ` <span class="he" lang="grc">${esc(p[7].g)}</span>` : '')); };
  // Routen (UBS MARBLE, CC BY-SA 4.0): ausgewählte Route wird als Linie gezeichnet
  const BR = window.BROUTES || [];
  const TANAKH_ORD = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles']; // Rückfallebene, falls ein Buch nicht in der Bibliothek ist
  const mapRouteTitle = r => I18N.lang === 'de' ? r.de : r.en;
  const mapLen = ln => { let s = 0; for (let k = 1; k < ln.length; k++) s += mapKm(ln[k - 1], ln[k]); return s; };
  function mapRouteFill() {
    const sel = $('#mapRoute'), keep = MP.route ? MP.route.id : ''; let h = `<option value="">${esc(I18N.t('Routen …'))}</option>`, cur = null;
    const bk = r => r.ref.replace(/ \d.*$/, ''), ord = BR.map((r, i) => [r, i]).sort((a, b) => { try { return libCmpGroups(groups.find(g => g.title === bk(a[0])) || null, groups.find(g => g.title === bk(b[0])) || null) || (TANAKH_ORD.indexOf(bk(a[0])) - TANAKH_ORD.indexOf(bk(b[0]))) || a[1] - b[1]; } catch { return a[1] - b[1]; } }).map(x => x[0]); // gleiche Reihenfolge wie die Bücher in der Bibliothek
    ord.forEach(r => { const b = bk(r); if (b !== cur) { if (cur) h += '</optgroup>'; h += `<optgroup label="${esc(b)}">`; cur = b; } h += `<option value="${esc(r.id)}">${esc(mapRouteTitle(r))}</option>`; });
    sel.innerHTML = h + '</optgroup>'; sel.value = keep;
  }
  function mapRouteSet(id) {
    if (MP.rul && MP.rul.fromRoute) mapRulToggle(false);
    MP.route = BR.find(r => r.id === id) || null; $('#mapRoute').value = MP.route ? MP.route.id : ''; MP.sel = -1;
    if (MP.route) { const pts = MP.route.lines.flat().map(c => mapXY(c[0], c[1])), { w, h } = mapSize(); const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1])), pad = 60; MP.s = Math.min(Math.max(Math.min(w / (x1 - x0 + 2 * pad), h / (y1 - y0 + 2 * pad)), Math.min(w / BM.w, h / BM.h)), 3); MP.tx = w / 2 - (x0 + x1) / 2 * MP.s; MP.ty = h / 2 - (y0 + y1) / 2 * MP.s; }
    mapDraw(); mapInfo();
  }
  function mapRouteDraw(g, r) {
    const R = MP.route; if (!R) return; g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    R.lines.forEach(ln => { const P = ln.map(c => { const [x, y] = mapXY(c[0], c[1]); return [x * MP.s + MP.tx, y * MP.s + MP.ty]; });
      const path = () => { g.beginPath(); P.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); };
      path(); g.lineWidth = 6 * r; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke(); path(); g.lineWidth = 3 * r; g.strokeStyle = '#a4161a'; g.stroke();
      let acc = 0; for (let k = 1; k < P.length; k++) { const dx = P[k][0] - P[k - 1][0], dy = P[k][1] - P[k - 1][1], L = Math.hypot(dx, dy); acc += L; if (acc > 90 * r && L > 0) { acc = 0; const a = Math.atan2(dy, dx), cx = P[k][0], cy = P[k][1]; g.beginPath(); g.moveTo(cx + Math.cos(a) * 5 * r, cy + Math.sin(a) * 5 * r); g.lineTo(cx + Math.cos(a + 2.5) * 5 * r, cy + Math.sin(a + 2.5) * 5 * r); g.lineTo(cx + Math.cos(a - 2.5) * 5 * r, cy + Math.sin(a - 2.5) * 5 * r); g.closePath(); g.fillStyle = '#a4161a'; g.fill(); g.lineWidth = 1 * r; g.strokeStyle = '#fff'; g.stroke(); } }
      const s = P[0], e = P[P.length - 1]; g.beginPath(); g.arc(s[0], s[1], 5 * r, 0, 7); g.fillStyle = '#2e7d32'; g.fill(); g.lineWidth = 2 * r; g.strokeStyle = '#fff'; g.stroke(); g.beginPath(); g.arc(e[0], e[1], 5 * r, 0, 7); g.fillStyle = '#222'; g.fill(); g.stroke(); });
    g.restore();
  }
  function mapRoutesHere() { // Routen, deren Anfangsstelle im gerade gelesenen Kapitel liegt
    if (!view || !view.group) return []; const ch = auChapter(); if (ch == null) return [];
    return BR.filter(r => { const m = r.ref.match(/^(.*) (\d+):/); return m && m[1] === view.group.title && +m[2] === ch; });
  }
  function mapRouteBox() {
    const R = MP.route, t = I18N.t.bind(I18N); let h = '';
    if (R) { const tot = R.lines.map(mapLen); h += `<div class="rt"><h4>${esc(mapRouteTitle(R))}${I18N.lang === 'de' ? '' : ''} <span class="chip" data-rt="">✕ ${esc(t('Route ausblenden'))}</span></h4><div class="sub">${mapRefLinkTxt(R.ref)} · ${R.lines.length} ${esc(t(R.lines.length > 1 ? 'Linien' : 'Linie'))} · ≈ ${Math.round(tot.reduce((a, b) => a + b, 0))} km (${esc(t('Luftlinie'))})<br>${R.lines.map((l, k) => `<span class="chip" data-rl="${k}" title="${esc(t('Als Messung übernehmen (Länge, Höhenprofil)'))}">📏 ${k + 1} · ${Math.round(tot[k])} km</span>`).join(' ')}</div><div class="sub rcred">${esc(t('Routen: UBS MARBLE / Leen Ritmeyer (CC BY-SA 4.0). Bibelstelle von Safran zugeordnet, ungefähr.'))}</div></div>`; }
    const here = mapRoutesHere().filter(r => !R || r.id !== R.id);
    if (here.length) h += `<div class="sub">${esc(t('Routen in diesem Kapitel'))}: ${here.map(r => `<span class="chip" data-rt="${esc(r.id)}">🧭 ${esc(mapRouteTitle(r))}</span>`).join(' ')}</div>`;
    return h;
  }
  const mapRefLinkTxt = ref => `<a data-ref="${esc(ref)}">${esc(ref)}</a>`;
  function mapInfo() { mapInfo0(); if (MP.sel < 0) $('#mapInfo').insertAdjacentHTML('afterbegin', mapRouteBox()); }
  function mapInfo0() {
    const el = $('#mapInfo'), here = view && view.group ? view.group.title : '';
    if (MP.sel < 0) {
      el.innerHTML = MP.cur.length ? `<div class="sub">${MP.over ? esc(I18N.t('Orte dieses Abschnitts')) + ': ' + esc(MP.over.label) + ' · <span class="chip" data-i="-2">← ' + esc(I18N.t('Kapitel')) + '</span>' : esc(I18N.t('Orte in diesem Kapitel')) + ' (' + MP.cur.length + ')'}</div><div class="chips">${MP.cur.map(c => `<span class="chip" data-i="${c.i}">${mapName(c.i)}</span>`).join('')}</div>` : `<div class="sub">${esc(I18N.t('Zu diesem Kapitel sind keine Orte verzeichnet. „Alle Orte“ zeigt die ganze Karte.'))}</div>`;
      return;
    }
    const p = BM.places[MP.sel], by = new Map(); p[4].forEach(([b, c, v]) => { if (!by.has(b)) by.set(b, []); by.get(b).push([c, v]); });
    const me = MP.lay.find(o => o.i === MP.sel), nb = me ? MP.lay.filter(o => o.i !== MP.sel && Math.hypot(o.x - me.x, o.y - me.y) < 26 * (window.devicePixelRatio || 1)).slice(0, 8) : [];
    el.innerHTML = `<h4>${mapName(MP.sel)}</h4><div class="sub">${esc(p[1])} · ${p[4].length} ${esc(I18N.t('Stellen'))}${ELV ? ' · ' + esc(I18N.t('Höhe')) + ' ≈ ' + mapM(mapElev(...mapLL(...mapPx(p)))) : ''} · <span class="chip" data-i="-1">← ${esc(I18N.t('Liste'))}</span></div>` +
      (nb.length ? `<div class="sub">${esc(I18N.t('Daneben'))}: ${nb.map(o => `<span class="chip" data-i="${o.i}">${mapName(o.i)}</span>`).join(' ')}</div>` : '') +
      mapAlts(p) + mapOutRows(MP.sel) + mapNoteRows(p) +
      [...by].sort((a, b) => (BM.books[a[0]] === here ? -1 : 0) - (BM.books[b[0]] === here ? -1 : 0) || a[0] - b[0]).map(([b, l]) => `<div class="vs"><b>${esc(BM.books[b])}</b> ${l.slice(0, 40).map(([c, v]) => mapRefLink(b, c, v)).join(' ')}${l.length > 40 ? '…' : ''}</div>`).join('');
  }
  // Notizen zu Orten: freie Notizen mit Feld „place“ (= Ortsname), erscheinen auch im Reiter Notizen
  const mapNotesOf = p => { try { return notesAll.filter(n => n.place === p[0]); } catch { return []; } };
  function mapNoteRows(p) {
    const ns = mapNotesOf(p); return `<div class="pn"><div class="sub"><b>${esc(I18N.t('Notizen'))}</b> <span class="chip pnadd">＋ ${esc(I18N.t('Notiz zu diesem Ort'))}</span></div>` + ns.map(n => `<div class="pnote" data-id="${esc(n.id)}">${n.title && n.title !== p[0] ? '<b>' + esc(n.title) + '</b> ' : ''}${esc((n.note || '').slice(0, 200))}</div>`).join('') + '</div>';
  }
  function mapOutRows(i) { // Punkte der Gliederung dieses Buches, in denen der Ort vorkommt
    const g = view && view.group; if (!g || !BM.books.includes(g.title) || typeof olOwnCache === 'undefined') return '';
    const ol = olOwnCache.get(g.title); if (ol === undefined) { olOwn(g.title).then(() => { if (MP.sel === i) mapInfo(); }).catch(() => {}); return ''; } if (!ol) return '';
    const L = I18N.lang, T = (o, k) => (L !== 'he' && o[k + '_' + L]) || o[k], rows = [];
    ol.sections.forEach(sec => sec.items.forEach(it => { if (mapForRef(g.title, it.ref).some(c => c.i === i)) rows.push(`<div class="olr" data-ref="${esc(g.title + ' ' + String(it.ref).split(/[-–,]/)[0])}"><span class="rf">${esc(String(it.ref).replace('-', '–'))}</span> ${esc(T(it, 'text') || '')}</div>`); }));
    return rows.length ? `<div class="sub">${esc(I18N.t('In der Gliederung'))}</div><div class="olrs">${rows.slice(0, 12).join('')}</div>` : '';
  }
  function mapAlts(p) {
    if (p[8]) return `<div class="sub">${esc(I18N.t('Lage vermutet'))}</div><div class="alts"><div class="muted" style="font-size:12px">${esc(I18N.t('Die Quelle kennt hier nur den Stadtmittelpunkt von Jerusalem. Die Lage ist nach Nehemia 3 und der Forschung gesetzt und teils umstritten.'))}</div></div>`;
    const al = p[6] || []; if (!al.length) return '';
    const rows = al.map((a, k) => `<div class="alt${k === MP.alt ? ' on' : ''}" data-a="${k}"><span class="nm">${esc(a[0] || '?')}${k === 0 && al.length > 1 ? ' ★' : ''}</span><span class="bar"><i style="width:${Math.min(100, Math.round(a[3] / 10))}%"></i></span><span class="pc">${Math.round(a[3] / 10)} %</span></div>`).join('');
    return `<div class="sub" title="${esc(I18N.t('Sicherheit der Zuordnung nach der Forschung des neuesten Jahrzehnts (OpenBible.info)'))}">${esc(I18N.t('Mögliche Lage'))}${mapConf(p) < 500 ? ' · ' + esc(I18N.t('Zuordnung unsicher')) : ''}</div><div class="alts">${rows}</div>`;
  }
  function mapSelect(i, center) {
    MP.sel = i; MP.alt = -1;
    if (i >= 0 && center) { // auf den Ort und seine möglichen Lagen einpassen
      const pl = BM.places[i], { w, h } = mapSize(), pts = [mapPx(pl), ...(pl[6] || []).slice(1).map(a => mapXY(a[1], a[2]))];
      const x0 = Math.min(...pts.map(q => q[0])), x1 = Math.max(...pts.map(q => q[0])), y0 = Math.min(...pts.map(q => q[1])), y1 = Math.max(...pts.map(q => q[1]));
      const pad = 110, sx = w / (x1 - x0 + 2 * pad / Math.max(MP.s, 0.5)), sy = h / (y1 - y0 + 2 * pad / Math.max(MP.s, 0.5));
      MP.s = pts.length > 1 ? Math.min(300, Math.max(Math.min(sx, sy), 1.5)) : Math.max(MP.s, 1.5); if (Math.abs(pl[2] - 35.234) < 0.03 && Math.abs(pl[3] - 31.774) < 0.03 && MP.s < 60) MP.s = 60; /* Jerusalem: so weit hinein, dass Gelände und Wilson-Karte erscheinen */ MP.tx = w / 2 - (x0 + x1) / 2 * MP.s; MP.ty = h / 2 - (y0 + y1) / 2 * MP.s;
    }
    mapDraw(); mapInfo();
  }
  // ===== Jerusalem-Detailkarte: Gelände (Copernicus), Wilson 1865, heutiges OSM, Namen =====
  const JER = { st: 0, rel: null, osm: null, wil: null, meta: null, opt: { wil: 1, osm: 1, rel: 1, lab: 1, op: 80 } };
  try { Object.assign(JER.opt, JSON.parse(localStorage.getItem('jerOpt') || '{}')); } catch { /* egal */ }
  const JER_T = 22, JER_BOX = [35.19, 31.74, 35.28, 31.81]; // ab diesem Zoom setzen die Detailebenen ein; Ausschnitt des Höhenrasters
  const jerInfl = async z => { const bin = Uint8Array.from(atob(z), c => c.charCodeAt(0)); return new Uint8Array(await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()); };
  const jerScript = src => new Promise(ok => { const s = document.createElement('script'); s.src = src; s.onload = () => ok(true); s.onerror = () => ok(false); document.head.appendChild(s); });
  async function jerLoad() {
    if (JER.st) return; JER.st = 1;
    try {
      await Promise.all([jerScript('map/jer/dem.js'), jerScript('map/jer/osm.js'), jerScript('map/jer/meta.js')]);
      if (window.BJERDEM) JER.rel = await jerRelief(window.BJERDEM);
      if (window.BJEROSM) JER.osm = await jerOsm(window.BJEROSM);
      JER.meta = window.BJERMETA || null;
      if (JER.meta && JER.meta.wil) { const im = new Image(); im.onload = () => { JER.wil = im; mapDraw(); }; im.src = 'map/jer/' + JER.meta.wil.file; }
    } catch { /* ohne Detailebenen weiter */ }
    JER.st = 2; mapDraw();
  }
  // Schummerung + Höhenlinien aus dem 30-m-Raster (geglättet, bikubisch auf das Sechsfache vergrößert)
  async function jerRelief(D) {
    const by = await jerInfl(D.z), u = new Uint16Array(by.buffer, by.byteOffset, by.length >> 1), w = D.w, h = D.h, F = 6, cw = w * F, ch = h * F;
    let e = new Float32Array(w * h); for (let i = 0; i < e.length; i++) e[i] = D.off + u[i] * D.step;
    const K = [0.054, 0.244, 0.403, 0.244, 0.054], blur = (src, dx, dy) => { const o = new Float32Array(src.length); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let t = 0; for (let k = -2; k <= 2; k++) { const xx = Math.min(w - 1, Math.max(0, x + k * dx)), yy = Math.min(h - 1, Math.max(0, y + k * dy)); t += K[k + 2] * src[yy * w + xx]; } o[y * w + x] = t; } return o; };
    e = blur(blur(e, 1, 0), 0, 1);
    const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
    const g = (x, y) => e[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
    const Z = new Float32Array(cw * ch);
    for (let Y = 0; Y < ch; Y++) { const sy = (Y + 0.5) / F - 0.5, y0 = Math.floor(sy), ty = sy - y0; for (let X = 0; X < cw; X++) { const sx = (X + 0.5) / F - 0.5, x0 = Math.floor(sx), tx = sx - x0; const r = [-1, 0, 1, 2].map(j => cr(g(x0 - 1, y0 + j), g(x0, y0 + j), g(x0 + 1, y0 + j), g(x0 + 2, y0 + j), tx)); Z[Y * cw + X] = cr(r[0], r[1], r[2], r[3], ty); } }
    const mx = (D.E - D.W) / cw * 111320 * Math.cos(31.77 * Math.PI / 180), my = (D.N - D.S) / ch * 110574, zen = 50 * Math.PI / 180, az = 315 * Math.PI / 180, zf = 2.2;
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const c = cv.getContext('2d'), im = c.createImageData(cw, ch), P = im.data, f = Math.round(Math.min(cw, ch) * 0.05);
    for (let Y = 0; Y < ch; Y++) for (let X = 0; X < cw; X++) {
      const x1 = Math.max(0, X - 1), x2 = Math.min(cw - 1, X + 1), y1 = Math.max(0, Y - 1), y2 = Math.min(ch - 1, Y + 1), q = (xx, yy) => Z[yy * cw + xx];
      const dzx = ((q(x2, y1) + 2 * q(x2, Y) + q(x2, y2)) - (q(x1, y1) + 2 * q(x1, Y) + q(x1, y2))) / (8 * mx) * zf, dzy = ((q(x1, y2) + 2 * q(X, y2) + q(x2, y2)) - (q(x1, y1) + 2 * q(X, y1) + q(x2, y1))) / (8 * my) * zf;
      const sl = Math.atan(Math.hypot(dzx, dzy)), as = Math.atan2(dzy, -dzx), hs = Math.max(0, Math.cos(zen) * Math.cos(sl) + Math.sin(zen) * Math.sin(sl) * Math.cos(az - as));
      const z = Z[Y * cw + X], t = Math.min(1, Math.max(0, (z - 420) / 400)), sh = 0.38 + 0.9 * hs;
      let R = (226 + 24 * t) * sh, Gc = (222 + 24 * t) * sh, B = (190 + 36 * t) * sh;
      const zr = Z[Y * cw + Math.min(cw - 1, X + 1)], zb = Z[Math.min(ch - 1, Y + 1) * cw + X]; // Höhenlinien alle 10 m (alle 50 m kräftiger)
      const c10 = Math.floor(z / 10), a10 = c10 !== Math.floor(zr / 10) || c10 !== Math.floor(zb / 10);
      if (a10) { const k = (Math.floor(z / 50) !== Math.floor(Math.min(z, Math.max(zr, zb)) / 50) || Math.floor(Math.max(z, zr, zb) / 50) !== Math.floor(Math.min(z, zr, zb) / 50)) ? 0.34 : 0.14; R = R * (1 - k) + 120 * k; Gc = Gc * (1 - k) + 85 * k; B = B * (1 - k) + 45 * k; }
      const o = (Y * cw + X) * 4, ed = Math.min(1, Math.min(X, Y, cw - 1 - X, ch - 1 - Y) / f); P[o] = R; P[o + 1] = Gc; P[o + 2] = B; P[o + 3] = 255 * ed * ed * (3 - 2 * ed);
    }
    c.putImageData(im, 0, 0); return cv;
  }
  async function jerOsm(D) {
    const j = JSON.parse(new TextDecoder().decode(await jerInfl(D.z))), O = j.o, out = {};
    const dec = (a, c0) => { const n = (a.length - c0) >> 1, x = new Int32Array(n), y = new Int32Array(n); let px = 0, py = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < n; i++) { px += a[c0 + 2 * i]; py += a[c0 + 2 * i + 1]; x[i] = px; y[i] = py; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; } return { x, y, b: [x0, y0, x1, y1] }; };
    out.o = O; ['bld', 'wall', 'water', 'cem', 'park'].forEach(k => { out[k] = j[k].map(a => dec(a, 0)); }); out.hw = j.hw.map(a => Object.assign(dec(a, 1), { c: a[0] }));
    return out;
  }
  const jerOn = () => MP.s >= JER_T * 0.6 && JER.st !== 3;
  function jerVisible() { const { w, h } = mapSize(), [x0, y0] = mapXY(JER_BOX[0], JER_BOX[3]), [x1, y1] = mapXY(JER_BOX[2], JER_BOX[1]); return MP.s >= JER_T * 0.6 && x1 * MP.s + MP.tx > 0 && x0 * MP.s + MP.tx < w && y1 * MP.s + MP.ty > 0 && y0 * MP.s + MP.ty < h; }
  function mapJerDraw(g, r) {
    const box = $('#mapJer'); const vis = jerVisible(); if (box) box.hidden = !vis; if (!vis) return; if (!JER.st) jerLoad();
    const a = Math.min(1, Math.max(0, (MP.s - JER_T * 0.6) / (JER_T * 0.8))), kx = BM.ppd * BM.k * MP.s, ky = BM.ppd * MP.s, X = lon => (lon - BM.W0) * kx + MP.tx, Y = lat => (BM.N0 - lat) * ky + MP.ty, ppm = ky / 110574, { w, h } = mapSize(), o = JER.opt;
    g.save(); g.globalAlpha = a;
    if (JER.rel && o.rel) { const [W, S, E, N] = JER_BOX; g.imageSmoothingEnabled = true; g.drawImage(JER.rel, X(W), Y(N), X(E) - X(W), Y(S) - Y(N)); }
    const M = JER.meta && JER.meta.wil;
    if (JER.wil && M && o.wil) { const A = M.A, B = M.B; g.save(); g.globalAlpha = a * o.op / 100; g.setTransform(kx * A[1], -ky * B[1], kx * A[2], -ky * B[2], kx * (A[0] - BM.W0) + MP.tx, ky * (BM.N0 - B[0]) + MP.ty); g.imageSmoothingQuality = 'high'; g.drawImage(JER.wil, 0, 0); g.restore(); }
    const S = JER.osm; if (S && o.osm) {
      const ax = kx / S.o[2], bx = (S.o[0] - BM.W0) * kx + MP.tx, ay = -ky / S.o[2], by = (BM.N0 - S.o[1]) * ky + MP.ty, vis = f => { const x0 = ax * f.b[0] + bx, x1 = ax * f.b[2] + bx, y1 = ay * f.b[1] + by, y0 = ay * f.b[3] + by; return x1 > 0 && x0 < w && y1 > 0 && y0 < h; };
      const path = (f, close) => { g.beginPath(); for (let i = 0; i < f.x.length; i++) { const px = ax * f.x[i] + bx, py = ay * f.y[i] + by; if (i) g.lineTo(px, py); else g.moveTo(px, py); } if (close) g.closePath(); };
      g.lineJoin = 'round'; g.lineCap = 'round';
      if (ppm > 0.05) { g.fillStyle = 'rgba(120,160,90,.22)'; S.park.forEach(f => { if (vis(f)) { path(f, true); g.fill(); } }); g.fillStyle = 'rgba(110,110,110,.2)'; S.cem.forEach(f => { if (vis(f)) { path(f, true); g.fill(); } }); }
      const ov = !!(JER.wil && M && o.wil && o.op > 25); // über der Wilson-Karte nur die heutigen Hauptstraßen in Blau (Gebäude und Gassen stehen schon auf Wilsons Karte)
      if (ppm > 0.45 && !ov) { g.fillStyle = 'rgba(176,150,118,.5)'; g.strokeStyle = 'rgba(110,85,55,.7)'; g.lineWidth = 0.8 * r; S.bld.forEach(f => { if (vis(f)) { path(f, true); g.fill(); g.stroke(); } }); }
      const minC = ov ? 3 : ppm > 0.25 ? 1 : ppm > 0.08 ? 3 : 4; g.strokeStyle = ov ? 'rgba(30,80,170,.6)' : 'rgba(95,80,65,.75)';
      S.hw.forEach(f => { if (f.c < minC || !vis(f)) return; g.lineWidth = (f.c >= 4 ? 2.6 : f.c === 3 ? 1.8 : 1) * r * Math.min(2.2, Math.max(0.8, ppm * 2)); path(f, false); g.stroke(); });
      g.strokeStyle = 'rgba(75,25,20,.9)'; g.lineWidth = 3 * r; S.wall.forEach(f => { if (vis(f)) { path(f, false); g.stroke(); } });
      g.strokeStyle = 'rgba(40,110,190,.8)'; g.lineWidth = 2 * r; S.water.forEach(f => { if (vis(f)) { path(f, false); g.stroke(); } });
    }
    if (o.lab && JER.meta && JER.meta.labels) { const ll = I18N.lang; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      JER.meta.labels.forEach(L => { if (L.z && MP.s < L.z) return; const t = (ll === 'de' ? L.n[1] : ll === 'he' && L.n[2] ? L.n[2] : L.n[0]) || L.n[0], px = X(L.p[0]), py = Y(L.p[1]); if (px < -80 || py < -30 || px > w + 80 || py > h + 30) return;
        const big = L.t === 'hill' || L.t === 'val', sz = (big ? 13 : 11) * r; g.font = `${big ? 'italic ' : ''}600 ${sz}px -apple-system, system-ui, sans-serif`; g.save(); g.translate(px, py); if (L.a) g.rotate(L.a * Math.PI / 180);
        const tx = big ? t.toUpperCase() : L.t === 'gate' ? t + (ll === 'de' ? ' (heute)' : ll === 'he' ? ' (כיום)' : ' (today)') : t; if (big && g.letterSpacing !== undefined) g.letterSpacing = (3 * r) + 'px'; g.lineWidth = 3.5 * r; g.strokeStyle = 'rgba(255,255,255,.85)'; g.strokeText(tx, 0, 0); g.fillStyle = L.t === 'val' ? '#2d5f8f' : L.t === 'hill' ? '#5a4524' : L.t === 'wall' ? '#6b1f18' : '#222'; g.fillText(tx, 0, 0); g.restore(); });
      g.textAlign = 'start'; }
    g.restore();
  }
  function mapJerGo() { const { w, h } = mapSize(), s = Math.min(w, h) / 2.44, [x, y] = mapXY(35.2345, 31.7770); MP.s = Math.min(900, s); MP.tx = w / 2 - x * MP.s; MP.ty = h / 2 - y * MP.s; mapDraw(); }
  function mapZoom(f, mx, my) { const ns = Math.min(900, Math.max(0.12, MP.s * f)); MP.tx = mx - (mx - MP.tx) * ns / MP.s; MP.ty = my - (my - MP.ty) * ns / MP.s; MP.s = ns; mapDraw(); }
  function mapOpenFor(title, ref, label) { // aus der Gliederung: nur die Orte dieses Punktes
    if (!BM) return; const list = mapForRef(title, ref); if (!list.length) return;
    MP.over = { label, list }; mapOpen(); MP.over = { label, list }; MP.cur = list; MP.sel = -1; $('#mapOl').hidden = false;
    requestAnimationFrame(() => { mapFit(); mapInfo(); mapDraw(); });
  }
  window.__mapOpenFor = mapOpenFor; window.__mapCount = (t, r) => mapForRef(t, r).length;
  function mapOpen() {
    if (!BM) return; $('#topicPanel').hidden = true; $('#outlinePanel').hidden = true; $('#mapPanel').hidden = false; $('#mapOl').hidden = true; mapElevLoad();
    if (!MP.img) { MP.img = new Image(); MP.img.onload = () => { MP.ok = true; mapFit(); mapDraw(); }; MP.img.src = 'map/relief.jpg'; }
    MP.cur = mapChapPlaces(); MP.sel = -1; mapRouteFill(); requestAnimationFrame(() => { mapFit(); mapDraw(); mapInfo(); });
  }
  if (BM) {
    if (!BB) $('#mapBordL').hidden = true;
    try { $('#mapBord').checked = localStorage.getItem('mapBord') === '1'; } catch { /* egal */ }
    $('#mapBtn').onclick = () => { if (!$('#mapPanel').hidden) { $('#mapPanel').hidden = true; return; } mapOpen(); };
    $('#mapClose').onclick = () => { $('#mapPanel').hidden = true; };
    $('#mapAll').onchange = mapDraw;
    $('#mapBord').onchange = () => { try { localStorage.setItem('mapBord', $('#mapBord').checked ? '1' : '0'); } catch { /* egal */ } mapDraw(); };
    document.addEventListener('mousedown', e => { const p = $('#mapPanel'); if (p.hidden || p.classList.contains('docked') || !e.target.closest || e.target.closest('#mapPanel, #mapBtn, #suggest, #audioBar, #ctxMenu, #lkHover, #tip, #undoBar, dialog')) return; p.hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#mapPanel').hidden && !document.querySelector('dialog[open]')) { if (MP.rul) { mapRulToggle(false); e.stopPropagation(); return; } $('#mapPanel').hidden = true; e.stopPropagation(); } }, true);
    window.addEventListener('resize', () => { if (!$('#mapPanel').hidden) mapDraw(); });
    const cv = $('#mapCv'), mc = (e) => { const b = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; return [(e.clientX - b.left) * d, (e.clientY - b.top) * d]; };
    cv.addEventListener('wheel', e => { e.preventDefault(); const [mx, my] = mc(e);
      if (!(e.ctrlKey || e.metaKey || e.altKey || e.deltaMode === 1)) { const d = window.devicePixelRatio || 1; MP.tx -= e.deltaX * d; MP.ty -= e.deltaY * d; mapDraw(); return; } // Zwei-Finger-Wischen auf dem Trackpad = Verschieben; Pinch (Strg) bzw. Cmd/Alt + Rad = Zoomen
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1); mapZoom(Math.exp(-Math.max(-300, Math.min(300, dy)) * (e.ctrlKey ? 0.012 : 0.0055)), mx, my); }, { passive: false });
    $('#mapZin').onclick = () => { const { w, h } = mapSize(); mapZoom(1.8, w / 2, h / 2); };
    $('#mapZout').onclick = () => { const { w, h } = mapSize(); mapZoom(1 / 1.8, w / 2, h / 2); };
    $('#mapZfit').onclick = () => { mapFit(); mapDraw(); };
    $('#mapRulB').onclick = () => mapRulToggle();
    $('#mapJerB').onclick = mapJerGo;
    { const sv = () => { try { localStorage.setItem('jerOpt', JSON.stringify(JER.opt)); } catch { /* egal */ } }, bind = (id, k) => { const el = $(id); el.checked = !!JER.opt[k]; el.onchange = () => { JER.opt[k] = el.checked ? 1 : 0; sv(); mapDraw(); }; };
      bind('#jerWil', 'wil'); bind('#jerOsm', 'osm'); bind('#jerRel', 'rel'); bind('#jerLab', 'lab'); $('#jerOp').value = JER.opt.op; $('#jerOp').oninput = () => { JER.opt.op = +$('#jerOp').value; sv(); mapDraw(); }; }
    $('#mapRoute').onchange = () => mapRouteSet($('#mapRoute').value);
    if (BM.nOrig && BM.nOrig < BM.books.length) $('#mapCredit').textContent += ' · Orte bei Josephus und in den Makkabäerbüchern: ToposText (topostext.org, ODC-BY)';
    $('#mapCredit').textContent += ' · Jerusalem: Ordnance Survey of Jerusalem (Wilson 1865, gemeinfrei, Wikimedia Commons) · heutige Stadt: © OpenStreetMap-Mitwirkende (ODbL)';
    // Vorschau der Verse beim Überfahren: Verslinks in der Info und Orte auf der Karte
    $('#mapInfo').addEventListener('mouseover', e => { const a = e.target.closest('a[data-ref], .olr[data-ref]'); if (!a || !hovApi || a.dataset.ref === hovApi.current()) return; hovApi.start(a, a.dataset.ref, false, false); });
    $('#mapInfo').addEventListener('mouseout', e => { if (hovApi && e.target.closest('a[data-ref], .olr[data-ref]')) hovApi.hide(); });
    $('#mapPanel').addEventListener('mouseleave', () => { if (hovApi) hovApi.hide(); });
    // Größe: Breite am linken Rand, Höhe der Karte an der Trennleiste (wird gemerkt)
    { const P = $('#mapPanel'), W = $('#mapWrap'); let mw = 0, mh = 0; try { mw = +localStorage.getItem('mapW') || 0; mh = +localStorage.getItem('mapH') || 0; } catch { /* egal */ }
      const setW = w => { if (!w) { P.style.width = ''; return; } P.style.width = Math.max(360, Math.min(window.innerWidth - 120, w)) + 'px'; };
      const setH = h => { if (!h) { W.style.flex = ''; return; } W.style.flex = `0 0 ${Math.max(140, Math.min(P.clientHeight - 160, h))}px`; };
      setW(mw); setH(mh);
      const drag = (el, move, done) => el.addEventListener('mousedown', ev => { ev.preventDefault(); const rt = document.documentElement; rt.classList.add('cmt-dragging'); const mv = e2 => move(e2), up = () => { rt.classList.remove('cmt-dragging'); document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); done(); }; document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); });
      drag($('#mapResize'), e2 => { const r = P.getBoundingClientRect(); setW(r.right - e2.clientX); mapDraw(); }, () => { try { localStorage.setItem('mapW', String(parseInt(P.style.width) || 0)); } catch { /* egal */ } });
      drag($('#mapSplit'), e2 => { setH(e2.clientY - W.getBoundingClientRect().top); mapDraw(); }, () => { try { localStorage.setItem('mapH', String(parseInt(W.style.flex.split(' ')[2]) || 0)); } catch { /* egal */ } });
      $('#mapResize').addEventListener('dblclick', () => { setW(0); try { localStorage.removeItem('mapW'); } catch { /* egal */ } mapDraw(); });
      $('#mapSplit').addEventListener('dblclick', () => { setH(0); try { localStorage.removeItem('mapH'); } catch { /* egal */ } mapDraw(); });
      if (window.ResizeObserver) new ResizeObserver(() => { if (!P.hidden) mapDraw(); }).observe(W); }
    if (!BR.length) $('#mapRoute').hidden = true;
    $('#mapRuler').addEventListener('mousemove', e => { const c = e.target.closest && e.target.closest('#mapRulProf'), R = MP.rul; if (!c || !R || !R.prof || !R.profX) return; const bx = c.getBoundingClientRect(), x = e.clientX - bx.left, tot = R.prof[R.prof.length - 1].km || 1, km = Math.max(0, Math.min(tot, (x - 34) / (bx.width - 38) * tot)); let k = R.prof.findIndex(p => p.km >= km); if (k < 0) k = R.prof.length - 1; mapProfDraw(k); mapDraw(); });
    $('#mapRuler').addEventListener('mouseleave', () => { const R = MP.rul; if (R && R.hov) { R.hov = null; mapProfDraw(null); mapDraw(); } });
    $('#mapRuler').addEventListener('click', e => { const x = e.target.dataset && e.target.dataset.x; if (x === 'undo' && MP.rul) MP.rul.pts.pop(); else if (x === 'clr' && MP.rul) MP.rul.pts = []; else return; MP.rul.cur = null; mapRulInfo(); mapDraw(); });
    cv.addEventListener('mousedown', e => { MP.drag = { x: e.clientX, y: e.clientY, tx: MP.tx, ty: MP.ty, moved: false }; cv.classList.add('drag'); });
    window.addEventListener('mousemove', e => { if (!MP.drag) return; const d = window.devicePixelRatio || 1; if (Math.abs(e.clientX - MP.drag.x) + Math.abs(e.clientY - MP.drag.y) > 3) MP.drag.moved = true; MP.tx = MP.drag.tx + (e.clientX - MP.drag.x) * d; MP.ty = MP.drag.ty + (e.clientY - MP.drag.y) * d; mapDraw(); });
    window.addEventListener('mouseup', e => { if (!MP.drag) return; const mv = MP.drag.moved; MP.drag = null; cv.classList.remove('drag'); if (!mv && e.target === cv) { if (MP.rul && MP.rul.on) { const i = mapPick(e), [mx, my] = mc(e); let pt; if (i >= 0) { const [x, y] = mapPx(BM.places[i]); pt = [...mapLL(x, y), BM.places[i][0]]; } else pt = [...mapLL((mx - MP.tx) / MP.s, (my - MP.ty) / MP.s), null]; MP.rul.pts.push(pt); mapRulInfo(); mapDraw(); } else mapSelect(mapPick(e), false); } });
    cv.addEventListener('mousemove', e => { if (MP.drag) return;
      if (MP.rul && MP.rul.on && MP.rul.pts.length) { MP.rul.cur = mc(e); mapDraw(); } const l = mapPick(e, true), h = $('#mapHint'); if (l.length) { h.textContent = l.slice(0, 4).map(i => BM.places[i][0] + (mapHe(BM.places[i]) ? ' ' + mapHe(BM.places[i]) : '')).join(' · '); h.style.display = 'block'; } else h.style.display = 'none'; });
    cv.addEventListener('mouseleave', () => { $('#mapHint').style.display = 'none'; });
    cv.addEventListener('dblclick', e => { const [mx, my] = mc(e); mapZoom(2, mx, my); });
    $('#mapInfo').addEventListener('click', e => {
      const rt = e.target.closest('[data-rt]'); if (rt) { mapRouteSet(rt.dataset.rt); return; }
      const rl = e.target.closest('[data-rl]'); if (rl && MP.route) { const ln = MP.route.lines[+rl.dataset.rl]; mapElevLoad(); MP.rul = { on: true, pts: ln.map(c => [c[0], c[1], null]), cur: null, fromRoute: true }; $('#mapRulB').classList.add('on'); $('#mapCv').style.cursor = 'crosshair'; mapRulInfo(); mapDraw(); return; }
      if (e.target.closest('.pnadd') && MP.sel >= 0) { const p = BM.places[MP.sel]; openNoteDlg({ id: newId('free'), kind: 'free', title: p[0], place: p[0], note: '', order: topOrder() }, {}); return; }
      const pn = e.target.closest('.pnote'); if (pn) { const n = notesAll.find(x => x.id === pn.dataset.id); if (n) openNoteDlg(n, { canDelete: true }); return; }
      const c = e.target.closest('.chip'); if (c) { if (+c.dataset.i === -2) { MP.over = null; MP.cur = mapChapPlaces(); MP.sel = -1; mapFit(); mapDraw(); mapInfo(); return; } mapSelect(+c.dataset.i, +c.dataset.i >= 0); return; }
      const orow = e.target.closest('.olr'); if (orow) { jumpTo(orow.dataset.ref, e.metaKey || e.ctrlKey); return; }
      const al = e.target.closest('.alt'); if (al && MP.sel >= 0) { const k = +al.dataset.a, a = (BM.places[MP.sel][6] || [])[k]; if (a) { MP.alt = k; const [x, y] = mapXY(a[1], a[2]), { w, h } = mapSize(); MP.tx = w / 2 - x * MP.s; MP.ty = h / 2 - y * MP.s; mapDraw(); mapInfo(); } return; }
      const a = e.target.closest('a[data-ref]'); if (a) jumpTo(a.dataset.ref, e.metaKey || e.ctrlKey);
    });
  }

  // Klick außerhalb oder Esc schließt das Themen-Fenster
  document.addEventListener('mousedown', e => { const p = $('#topicPanel'); if (p.hidden || p.classList.contains('docked') || !e.target.closest || e.target.closest('#topicPanel, #tpBtn, #tpResize, #suggest, #audioBar, #ctxMenu, #lkHover, #tip, #undoBar, dialog')) return; p.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#topicPanel').hidden && !document.querySelector('dialog[open]')) { $('#topicPanel').hidden = true; e.stopPropagation(); } }, true);
  $('#tpFilter').oninput = e => { tpS.q = e.target.value.trim(); renderTopicPanel(); };
  $('#tpBody').addEventListener('input', async e => { if (e.target.id !== 'tpSq') return; const p = e.target.selectionStart; tpS.sq = e.target.value.trim(); tpS.n = 60; await renderTopicPanel(); const n = $('#tpSq'); if (n) { n.focus(); n.setSelectionRange(p, p); } });
  $('#tpBody').addEventListener('click', e => {
    const t = e.target.closest('button, a'); if (!t) return;
    if (t.dataset.slug) return openTopic(t.dataset.slug);
    if (t.dataset.ref) { hovApi && hovApi.hide(); return jumpTo(t.dataset.ref.replace(/-.*$/, ''), e.metaKey || e.ctrlKey); }
    if (t.dataset.tab) { tpS.tab = t.dataset.tab; tpS.n = 60; return renderTopicPanel(); }
    if (t.dataset.act === 'allbooks') { tpS.books = new Set(); tpS.n = 60; return renderTopicPanel(); }
    if (t.dataset.act === 'more') { tpS.n += 100; return renderTopicPanel(); }
    if (t.dataset.act === 'back') { tpS.slug = tpS.stack.pop() || null; tpS.data = null; return renderTopicPanel(); }
  });
  // Vorschau beim Überfahren einer Quelle (nur wenn der Text lokal vorliegt), Rechtsklick wie bei den Kommentaren
  $('#tpBody').addEventListener('mouseover', e => {
    const a = e.target.closest('a[data-ref]');
    if (!a || !hovApi || a.dataset.ref === hovApi.current()) return;
    hovApi.start(a, a.dataset.ref, true, false);
  });
  $('#tpBody').addEventListener('mouseout', e => { const a = e.target.closest('a[data-ref]'); if (a && hovApi && !a.contains(e.relatedTarget)) hovApi.hide(); });
  $('#topicPanel').addEventListener('scroll', () => hovApi && hovApi.hide(), { passive: true });
  $('#tpBody').addEventListener('contextmenu', e => {
    const a = e.target.closest('a[data-ref]');
    if (!a || (window.getSelection() + '')) return;
    const ref = a.dataset.ref.replace(/-.*$/, '');
    hovApi && hovApi.hide();
    const items = [{ label: 'Öffnen', fn: () => jumpTo(ref, false) }, { label: 'Im neuen Tab öffnen', fn: () => jumpTo(ref, true) }];
    if (!IS_PANE2) items.push({ label: 'Im zweiten Fenster öffnen', fn: () => openInPane2(null, { jump: ref }) });
    ctxShow(e, items);
  });
  $('#tpBody').addEventListener('toggle', e => { if (e.target.id === 'tpBooks') tpS.booksOpen = e.target.open; }, true);
  $('#tpBody').addEventListener('change', e => {
    if (e.target.dataset.bk != null) { const b = tpS.bookList[+e.target.dataset.bk]; if (e.target.checked) tpS.books.add(b); else tpS.books.delete(b); tpS.n = 60; return renderTopicPanel(); }
    if (e.target.dataset.act === 'sort') { tpS.sort = e.target.value; renderTopicPanel(); } });
  refreshTopicStatus().then(() => { if (view) loadTopics(view.sections[view.idx]); });

  // Höhe der festen Leiste messen, damit die Spaltenköpfe direkt darunter haften
  const fixStick = () => {
    const st = $('#stick'), hd = $('header');
    if (!st || !hd) return;
    const hh = hd.offsetHeight;
    $('#rOut').style.setProperty('--stick-top', (hh + st.offsetHeight - 4) + 'px');
    st.style.top = hh + 'px';
  };
  new ResizeObserver(fixStick).observe($('#stick'));
  new ResizeObserver(fixStick).observe($('header'));

  // Suche im angezeigten Text (Cmd/Ctrl+F)
  // Suche im angezeigten Text (eigene Umsetzung: findet auch geschlossene Fußnoten und springt zuverlässig von Treffer zu Treffer)
  const fb = $('#findBar'), fin = $('#findIn');
  let fTerm = '', fRanges = [], fIdx = -1;
  const stripF = ch => /[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4-\u05C7]/.test(ch) ? '' : ch; // hebräische Zeichen ohne Vokale/Betonung vergleichen
  const normF = str => { let o = ''; for (const ch of str.toLowerCase()) o += stripF(ch); return o.replace(/\u05BE/g, ' '); };
  const hl = (name, ranges) => { try { if (!ranges.length) CSS.highlights.delete(name); else CSS.highlights.set(name, new Highlight(...ranges)); } catch { /* ältere Engine */ } };
  function clearFind(keepTerm) {
    fRanges = []; fIdx = -1;
    hl('find', []); hl('find-active', []);
    $$('#rOut .note.fnd').forEach(n => n.classList.remove('fnd'));
    $('#findCount').textContent = '';
    if (!keepTerm) fTerm = '';
  }
  function runFind(term, keepIdx) {
    const prevIdx = fIdx;
    clearFind(true);
    fTerm = term;
    const q = normF(term).trim();
    if (!q) return;
    // geschlossene Fußnoten, die den Begriff enthalten, aufklappen, damit sie sichtbar und markierbar sind
    $$('#rOut .note').forEach(n => { if (normF(n.textContent).includes(q)) n.classList.add('fnd'); });
    const roots = [$('#rOut')];
    if (!$('#cmtPanel').hidden) roots.push($('#cmtBody')); // auch der Kommentar-Bereich wird durchsucht
    if (!$('#dictPanel').hidden) roots.push($('#dictOut')); // ebenso die Wörterbuch-Treffer
    const ranges = [];
    // Textknoten je Absatz/Zelle sammeln und zusammenhängend durchsuchen, damit auch Wortfolgen über mehrere
    // Wort-Elemente hinweg gefunden werden (Westminster-Text: jedes Wort steckt in einem eigenen <span class="w">)
    for (const root of roots) {
      const groups = new Map();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        if (!el || el.offsetParent === null && getComputedStyle(el).display === 'none') continue;
        if (el.closest('.note') && !el.closest('.note').offsetParent) continue;
        const key = el.closest('.note, .txt, .dbody, .dhead, p, li, td, div') || root;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(node);
      }
      for (const nodes of groups.values()) {
        let n = ''; const map = []; // map[i] = [Textknoten, Position] zu jedem Zeichen von n
        let prevW = null, first = true;
        for (const node of nodes) {
          const w = node.parentElement.closest('.w');
          if (!first && w !== prevW && (w || prevW) && n && !/\s$/.test(n) && !/^\s/.test(node.nodeValue)) { n += ' '; map.push(null); } // Wörter ohne Leerzeichen dazwischen trennen
          first = false; prevW = w;
          const txt = node.nodeValue;
          for (let i = 0; i < txt.length; i++) {
            const c = stripF(txt[i].toLowerCase());
            if (!c) continue;
            n += c === '־' ? ' ' : c; map.push([node, i]);
          }
        }
        let pos = 0;
        while ((pos = n.indexOf(q, pos)) >= 0) {
          let s0 = pos, e0 = pos + q.length - 1;
          while (s0 <= e0 && !map[s0]) s0++;
          while (e0 >= s0 && !map[e0]) e0--;
          if (s0 <= e0) {
            const r = document.createRange();
            r.setStart(map[s0][0], map[s0][1]);
            r.setEnd(map[e0][0], map[e0][1] + 1);
            ranges.push(r);
          }
          pos += q.length;
        }
      }
    }
    fRanges = ranges;
    hl('find', ranges);
    if (ranges.length) goFind(keepIdx && prevIdx >= 0 ? Math.min(prevIdx, ranges.length - 1) : 0, !keepIdx); else $('#findCount').textContent = 'keine Treffer';
  }
  function goFind(i, scroll = true) {
    if (!fRanges.length) return;
    fIdx = (i + fRanges.length) % fRanges.length;
    const r = fRanges[fIdx];
    hl('find-active', [r]);
    const el = r.startContainer.parentElement;
    if (el && scroll) el.scrollIntoView({ block: 'center', inline: 'nearest' });
    $('#findCount').textContent = `${fIdx + 1} / ${fRanges.length}`;
  }
  const stepFind = fwd => {
    const t = fin.value.trim();
    if (!t) return;
    if (t !== fTerm || !fRanges.length) runFind(t); else goFind(fIdx + (fwd ? 1 : -1));
  };
  const openFind = () => { if (document.documentElement.dataset.tab === 'notes') { const f = $('#nFilter'); f.focus(); f.select(); return; } fb.hidden = false; fin.focus(); fin.select(); }; // im Notizen-Reiter: Cmd+F = Notizen filtern
  const closeFind = () => { fb.hidden = true; clearFind(false); };
  O.onFindOpen(() => {
    const p2 = $('#pane2');
    if (p2 && !p2.hidden && document.activeElement === p2 && p2.contentWindow) p2.contentWindow.postMessage({ type: 'find' }, '*'); // Cmd+F gilt für das Fenster, in dem man gerade arbeitet
    else openFind();
  });
  // Zweites Lesefenster (Rahmen) und Hauptfenster verständigen sich per Nachricht
  { // Tastenkürzel- und Dateimanager-Hinweise je nach System anzeigen (Cmd/Strg, Finder/Explorer)
    const P = window.platform || {};
    if (!P.isMac) {
      document.querySelectorAll('[title*="Cmd"]').forEach(el => { el.title = el.title.replace(/Cmd/g, P.mod || 'Strg'); });
      document.querySelectorAll('#reveal').forEach(el => { el.textContent = el.textContent.replace('Finder', P.files || 'Explorer'); });
    }
  }
  const IS_PANE2 = document.documentElement.classList.contains('pane2');
  const p2Frame = $('#pane2');
  let p2Ready = false;
  const p2Post = m => { if (p2Frame.contentWindow) p2Frame.contentWindow.postMessage(m, '*'); };
  window.addEventListener('message', e => {
    const m = e.data || {};
    if (IS_PANE2) {
      if (e.source !== window.parent) return;
      if (m.type === 'find') openFind();
      else if (m.type === 'closeTab') { if (tabIdx >= 0) closeTab(tabIdx); }
      else if (m.type === 'syncState') p2SyncOn = !!m.on;
      else if (m.type === 'syncScroll') applySyncScroll(m);
      else if (m.type === 'sync') { if (view && view.group && relatedTitles(view.group.title, m.title) && m.idx < view.sections.length && m.idx !== view.idx) { view.idx = m.idx; renderSection(); } }
      else if (m.type === 'dict' && typeof m.q === 'string') openDict(m.q.slice(0, 100)); // Nachschlagen aus dem ersten Fenster
      else if (m.type === 'jump' && typeof m.ref === 'string') jumpTo(m.ref, tabs.some(t => t.group)); // Kommentar aus dem ersten Fenster
      else if (m.type === 'open' && typeof m.key === 'string') { const g = groupsByKey.get(m.key); if (g) openGroup(g, { rel: typeof m.rel === 'string' ? m.rel : undefined, sectionPath: m.sectionPath, rowLabel: m.rowLabel }, tabs.some(t => t.group)); } // schon ein Buch offen: neuer Tab
    } else if (e.source === p2Frame.contentWindow) {
      if (m.type === 'ready') { p2Ready = true; p2Post({ type: 'syncState', on: syncPane }); }
      else if (m.type === 'syncScroll') { if (syncPane) applySyncScroll(m); }
      else if (m.type === 'close') setSplit(false);
    }
  });
  if (IS_PANE2) { window.parent.postMessage({ type: 'ready' }, '*'); $('#closePane').onclick = () => window.parent.postMessage({ type: 'close' }, '*'); }
  let p2w = 50;
  try { p2w = Math.min(75, Math.max(25, +localStorage.getItem('p2w') || 50)); } catch { /* egal */ }
  const root = document.documentElement;
  root.style.setProperty('--p2w', p2w + 'vw');
  function setSplit(on) {
    if (IS_PANE2) return;
    root.classList.toggle('split', on);
    p2Frame.hidden = !on; $('#splitter').hidden = !on;
    $('#splitBtn').setAttribute('aria-pressed', String(on));
    if (on && !p2Frame.getAttribute('src')) { p2Ready = false; p2Frame.src = 'library.html?pane=2'; }
    try { localStorage.setItem('p2open', on ? '1' : '0'); } catch { /* egal */ }
  }
  if (!IS_PANE2) {
    $('#splitBtn').onclick = () => setSplit(p2Frame.hidden);
    $('#syncBtn').onclick = () => { syncPane = !syncPane; $('#syncBtn').setAttribute('aria-pressed', String(syncPane)); p2Post({ type: 'syncState', on: syncPane }); if (syncPane) renderSection(); };
    $('#splitter').addEventListener('mousedown', ev => {
      ev.preventDefault(); root.classList.add('dragging');
      const mv = e2 => { p2w = Math.min(75, Math.max(25, ((window.innerWidth - e2.clientX) / window.innerWidth) * 100)); root.style.setProperty('--p2w', p2w + 'vw'); };
      const up = () => { root.classList.remove('dragging'); document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); try { localStorage.setItem('p2w', String(Math.round(p2w))); } catch { /* egal */ } };
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
    });
    try { if (localStorage.getItem('p2open') === '1') setSplit(true); } catch { /* egal */ }
    // Alt-Klick auf ein Buch in der Liste öffnet es im zweiten Fenster
    $('#tree').addEventListener('click', e => {
      const a = e.target.closest('.lib-item');
      if (!a || !e.altKey) return;
      e.stopImmediatePropagation(); e.preventDefault();
      openInPane2(a.dataset.key);
    }, true);
  }
  // Gleichlauf beim Scrollen (in beide Richtungen): die oberste sichtbare Zeile wird im anderen Fenster an dieselbe Stelle gebracht
  let p2SyncOn = false, syncQuiet = 0, syncTimer = null;
  const syncTop = () => (parseFloat(getComputedStyle($('#rOut')).getPropertyValue('--stick-top')) || 100) + 6;
  // Gleichlauf nur bei Texten, die sich auf dieselbe Stelle beziehen: gleiches Buch oder ein Titel enthält den anderen (z. B. „Rashi on Genesis“ und „Genesis“)
  function applySyncScroll(m) {
    if (!view || !view.group || !relatedTitles(view.group.title, m.title)) return;
    syncQuiet = Date.now() + 500;
    if (view.sections.length) {
      let j = view.sections.findIndex(x => x.label === m.slabel);
      if (j < 0 && m.idx < view.sections.length) j = m.idx;
      if (j >= 0 && j !== view.idx) { view.idx = j; renderSection(); }
    }
    const rows = $$('#rOut .row[data-l]'), v = rowVerse(m.label);
    const r = rows.find(x => x.dataset.l === m.label) || (v != null ? (rows.find(x => rowVerse(x.dataset.l) === v) || rows.find(x => (rowVerse(x.dataset.l) || 0) > v)) : null);
    if (!r) return;
    window.scrollBy(0, r.getBoundingClientRect().top - syncTop() - m.off);
  }
  window.addEventListener('scroll', () => {
    if (!(IS_PANE2 ? p2SyncOn : syncPane) || Date.now() < syncQuiet || !view || !view.group) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      const top = syncTop();
      const r = $$('#rOut .row[data-l]').find(x => x.getBoundingClientRect().bottom > top + 4);
      if (!r) return;
      const s = view.sections[view.idx];
      const msg = { type: 'syncScroll', title: view.group.title, label: r.dataset.l, off: r.getBoundingClientRect().top - top, idx: view.idx, slabel: s ? s.label : '' };
      if (IS_PANE2) window.parent.postMessage(msg, '*'); else p2Post(msg);
    }, 80);
  }, { passive: true });
  fin.addEventListener('input', () => { if (!fin.value) clearFind(false); });
  fin.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); stepFind(!e.shiftKey); }
    if (e.key === 'Escape') closeFind();
  });
  $('#findNext').onclick = () => stepFind(true);
  $('#findPrev').onclick = () => stepFind(false);
  $('#findClose').onclick = closeFind;
  // Abschnitt gewechselt: Treffer neu berechnen, wenn die Suchleiste offen ist
  window.__refind = () => { clearFind(true); if (!fb.hidden && fTerm) runFind(fTerm); };

  let fs = 16;
  try { fs = +localStorage.getItem('fs') || 16; } catch { /* egal */ }
  const applyFs = () => { $('#rOut').style.setProperty('--fs', fs + 'px'); try { localStorage.setItem('fs', String(fs)); } catch { /* egal */ } };
  $('#fsMinus').onclick = () => { fs = Math.max(11, fs - 1); applyFs(); };
  $('#fsPlus').onclick = () => { fs = Math.min(30, fs + 1); applyFs(); };
  applyFs();


  // ---------- Eigene Texte einbinden (mehrere Dateien) ----------
  const dlg = $('#ownDlg');
  let ownItems = []; // { id, name, segments, chapters, warnings, meta, error, title, kind, ver, on }
  const baseName = n => n.replace(/\.[^.]+$/, '');
  function openOwnDialog() {
    $('#ownTitles').innerHTML = groups.map(g => `<option value="${esc(g.title)}">`).join('');
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  }
  // Titel eines Eintrags: Text = frei wählbar, Kommentar = „<Kommentator> on <Buch>“ (so findet ihn die Kommentarleiste)
  const ownTitleOf = it => it.type === 'comm' ? `${(it.cmtr || '').trim()} on ${(it.base || '').trim()}`.replace(/^ on | on $/g, '') : (it.title || '').trim();
  const ownBookOk = it => groups.some(g => g.title === (it.base || '').trim());
  const ownHint = it => it.type !== 'comm' ? '' : !(it.cmtr || '').trim() || !(it.base || '').trim() ? 'Bitte Kommentator und Buch angeben.'
    : ownBookOk(it) ? `Wird als „${ownTitleOf(it)}“ gespeichert und erscheint in der Kommentarleiste von ${it.base.trim()}.` : `⚠ „${it.base.trim()}“ ist nicht in deiner Bibliothek – der Kommentar erscheint erst, wenn dieses Buch geladen ist (Schreibweise wie bei Sefaria).`;
  function renderOwnList() {
    $('#ownList').innerHTML = ownItems.map((it, i) => it.error
      ? `<div class="orow err"><div class="oh"><b>${esc(it.name)}</b></div><span class="muted">⚠ ${esc(it.error)}</span></div>`
      : `<div class="orow" data-i="${i}"><div class="oh"><input type="checkbox" data-f="on" ${it.on ? 'checked' : ''}><b title="${esc(it.name)}">${esc(it.name)}</b><span class="muted">${it.chapters} Abschnitt(e) · ${it.segments} Segmente${it.warnings.length ? ` · ⚠ ${it.warnings.length} Hinweis(e)` : ''}</span></div>
        <div class="of"><label>Art<select data-f="type"><option value="text" ${it.type === 'text' ? 'selected' : ''}>Text</option><option value="comm" ${it.type === 'comm' ? 'selected' : ''}>Kommentar</option></select></label>
        ${it.type === 'comm'
          ? `<label>Kommentator<input type="text" data-f="cmtr" value="${esc(it.cmtr)}" placeholder="z. B. Hertz"></label><label>Zu Buch<input type="text" list="ownTitles" data-f="base" value="${esc(it.base)}" placeholder="z. B. Deuteronomy"></label>`
          : `<label>Titel<input type="text" list="ownTitles" data-f="title" value="${esc(it.title)}"></label>`}
        <label>Sprache<select data-f="kind">${[['de', 'Deutsch'], ['en', 'Englisch'], ['he', 'Hebräisch'], ['other', 'Andere']].map(([k, n]) => `<option value="${k}" ${it.kind === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>Name der Version<input type="text" data-f="ver" value="${esc(it.ver)}"></label></div>
        <div class="muted ohint">${esc(ownHint(it))}</div>
        ${it.warnings.length ? `<div class="muted">${esc(it.warnings.slice(0, 2).join(' · '))}</div>` : ''}</div>`).join('');
    const n = ownItems.filter(i => !i.error && i.on).length;
    $('#ownSave').disabled = !n;
    $('#ownSave').textContent = n > 1 ? `${n} Texte einbinden` : 'Einbinden';
    $('#ownInfo').textContent = ownItems.length ? `${ownItems.length} Datei(en)` : '';
  }
  function addOwnFiles(r) {
    if (!r || !r.files) return;
    for (const f of r.files) {
      if (f.error) { ownItems.push(f); continue; }
      const m = f.meta || {};
      const title = m.title || m.titleGuess || baseName(f.name);
      const cm = /^(.+?) on (.+)$/.exec(title); // „Hertz on Deuteronomy“ → Kommentar erkannt
      ownItems.push({ ...f, title, type: cm ? 'comm' : 'text', cmtr: cm ? cm[1] : '', base: cm ? cm[2] : '', kind: m.kindGuess || 'de', ver: m.versionTitle || baseName(f.name), on: true });
    }
    openOwnDialog();
    renderOwnList();
  }
  $('#addOwn').onclick = () => { ownItems = []; O.ownClear(); $('#ownWarn').textContent = ''; renderOwnList(); openOwnDialog(); };
  $('#ownClose').onclick = () => { O.ownClear(); (dlg.close ? dlg.close() : dlg.removeAttribute('open')); };
  $('#ownPick').onclick = async () => addOwnFiles(await O.ownPick());
  $('#ownList').addEventListener('input', e => {
    const row = e.target.closest('.orow[data-i]');
    if (!row) return;
    const it = ownItems[+row.dataset.i], f = e.target.dataset.f;
    if (f === 'on') { it.on = e.target.checked; renderOwnList(); return; }
    if (f === 'type') { it.type = e.target.value; renderOwnList(); return; }
    if (f) it[f] = e.target.value;
    const h = row.querySelector('.ohint'); if (h) h.textContent = ownHint(it);
  });
  // Dateien ins Fenster ziehen
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => e.preventDefault());
  O.onOwnDrop(r => addOwnFiles(r));
  try { if (localStorage.getItem('sefTest') === '1') window.__sefTest = { addOwnFiles }; } catch { /* nur für Tests */ }
  $('#ownSave').onclick = async () => {
    const todo = ownItems.filter(i => !i.error && i.on && (i.type === 'comm' ? (i.cmtr || '').trim() && (i.base || '').trim() : (i.title || '').trim()));
    const items = todo.map(i => {
      const title = ownTitleOf(i);
      const g = groups.find(x => x.title === title);
      return { id: i.id, title, heTitle: (g && g.heTitle) || '', kind: i.kind, versionTitle: i.ver.trim(), categories: g ? g.cats : i.type === 'comm' ? ['Eigene Texte', 'Kommentare'] : ['Eigene Texte'] };
    });
    if (!items.length) { $('#ownWarn').textContent = '⚠ Bitte bei jedem Eintrag Titel (bei Kommentaren Kommentator und Buch) angeben.'; return; }
    $('#ownSave').disabled = true;
    let r = await O.ownSave(items);
    if (r.exists && r.exists.length) { // gleicher Titel und Versionsname: nur nach Rückfrage ersetzen
      const names = r.exists.map(x => `„${x.title}“ (${x.versionTitle})`).join(', ');
      if (confirm(`Diese eigenen Texte gibt es schon: ${names}.\n\nErsetzen?`)) {
        const again = await O.ownSave(items.filter(i => r.exists.some(x => x.id === i.id)).map(i => ({ ...i, replace: true })));
        r = { entries: [...r.entries, ...again.entries], errors: [...r.errors, ...again.errors], exists: [] };
      } else r.errors = [...r.errors, ...r.exists.map(x => `${x.title}: nicht ersetzt`)];
    }
    if (r.errors && r.errors.length) $('#ownWarn').textContent = '⚠ ' + r.errors.join(' · ');
    const done = new Set(r.entries.map(e => e.rel));
    ownItems = ownItems.filter(i => !todo.some(t => t.id === i.id) || r.errors.some(er => er.startsWith(ownTitleOf(i))));
    await loadLibrary();
    refreshState();
    if (!r.errors.length) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); ownItems = []; }
    else renderOwnList();
    if (r.entries.length) {
      const first = r.entries[0];
      const ng = groupsByKey.get(keyOf(first));
      if (ng) openGroup(ng, { rel: first.rel, showCompare: true });
    }
  };

  // ---------- Suche ----------
  let sResults = [];
  let fullCache = null; // Ergebnis der letzten Suche über alle Bücher
  let lastSearch = null; // Parameter der letzten Suche (für „Als Lesetext“ im eigenen Tab)
  O.onSearchProgress(p => { $('#sInfo').textContent = `Durchsuche … ${p.scanned} von ${p.total} Dateien · ${p.found} Treffer`; });

  // Kategorien und einzelne Bücher für die Suche: ohne Häkchen wird überall gesucht
  const sCats = new Set(), sTitles = new Set();
  function renderSCats() {
    const f = $('#sCatFilter').value.trim().toLowerCase();
    const root = { name: '', path: '', children: new Map(), count: 0, titles: [] };
    for (const g of groups) {
      let n = root, p = '';
      n.count++;
      for (const c of g.cats.slice(0, 3)) {
        p = p ? p + '/' + c : c;
        if (!n.children.has(c)) n.children.set(c, { name: c, path: p, children: new Map(), count: 0, titles: [] });
        n = n.children.get(c); n.count++;
      }
      if (!n.titles.includes(g.title)) n.titles.push(g.title);
    }
    const covered = p => [...sCats].some(c => c !== p && (p === c || p.startsWith(c + '/')));
    const anySel = n => n.titles.some(t => sTitles.has(t)) || [...sCats].some(c => c.startsWith(n.path + '/')) || [...n.children.values()].some(anySel);
    const hit = (t) => t.toLowerCase().includes(f);
    const show = (n, anc) => !f || anc || hit(n.name) || n.titles.some(hit) || [...n.children.values()].some(c => show(c, false));
    const node = (n, parentMatch) => {
      const m = !f || parentMatch || hit(n.name);
      if (!show(n, parentMatch)) return '';
      const kids = SefOrder.sortCats([...n.children.keys()], n.name).map(k => node(n.children.get(k), m && !!f)).join('');
      const cov = covered(n.path);
      const books = SefOrder.sortTitles(n.titles.filter(t => !f || m || hit(t)), t => t).map(t =>
        `<label class="t book"><input type="checkbox" data-st="${esc(t)}" ${cov || sCats.has(n.path) || sTitles.has(t) ? 'checked' : ''} ${cov || sCats.has(n.path) ? 'disabled' : ''}> ${esc(t)}</label>`).join('');
      const part = !cov && !sCats.has(n.path) && anySel(n); // nur ein Teil darunter gewählt: Teilmarkierung (Strich) statt Häkchen, sonst würde alles darunter durchsucht
      const cb = `<input type="checkbox" data-sc="${esc(n.path)}" ${cov || sCats.has(n.path) ? 'checked' : ''} ${cov ? 'disabled' : ''} ${part ? 'data-part="1"' : ''}> `;
      return `<details data-p="${esc(n.path)}" ${f || sOpen.has(n.path) ? 'open' : ''}><summary>${cb}<span class="catname">${esc(n.name)}</span> <small>(${n.count})</small></summary>${kids}${books}</details>`;
    };
    $('#sCatTree').innerHTML = SefOrder.sortCats([...root.children.keys()], '').map(k => node(root.children.get(k), false)).join('') || '<p class="muted">Nichts gefunden.</p>';
    $$('#sCatTree input[data-part]').forEach(i => { i.indeterminate = true; });
    const parts = [sCats.size ? `${sCats.size} Kategorie${sCats.size === 1 ? '' : 'n'}` : '', sTitles.size ? (sTitles.size === 1 ? '1 Buch' : `${sTitles.size} Bücher`) : ''].filter(Boolean);
    $('#sCatBtn').textContent = parts.length ? `Auswahl: ${parts.join(', ')}` : 'Kategorien: alle';
  }
  const sOpen = new Set(); // vom Nutzer aufgeklappte Kategorien in der Suchliste
  $('#sCatTree').addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.p != null && !$('#sCatFilter').value.trim()) { if (d.open) sOpen.add(d.dataset.p); else sOpen.delete(d.dataset.p); } }, true);
  { let sct = null; $('#sCatFilter').addEventListener('input', () => { clearTimeout(sct); sct = setTimeout(renderSCats, 80); }); }
  $('#sCatAll').onclick = () => { sCats.clear(); sTitles.clear(); renderSCats(); };
  $('#sCatTree').addEventListener('change', e => {
    const d = e.target.dataset || {};
    if (d.sc !== undefined) {
      const p = d.sc;
      if (e.target.checked) { sCats.add(p); for (const c of [...sCats]) if (c !== p && c.startsWith(p + '/')) sCats.delete(c); } else sCats.delete(p);
    } else if (d.st !== undefined) {
      if (e.target.checked) sTitles.add(d.st); else sTitles.delete(d.st);
    } else return;
    renderSCats();
  });

  // „Nur in diesem Buch suchen“: Suchmaske mit genau diesem Buch vorbelegen
  $('#bookSearch').onclick = () => {
    if (!view || !view.group) return;
    if (dictOpen) toggleDict(false); // Seitenleisten würden den Kategorienbaum rechts verdecken
    if (cmtOpen) toggleCmt(false);
    $('#linkPanel').hidden = true;
    showTab('search');
    sCats.clear(); sTitles.clear(); sTitles.add(view.group.title);
    { let p = ''; for (const c of view.group.cats.slice(0, 3)) { p = p ? p + '/' + c : c; sOpen.add(p); } } // Pfad bis zum Buch aufklappen (Tanach › Tora › Genesis)
    renderSCats();
    { const b = $('#sCatTree input[data-st]:checked'); if (b) b.scrollIntoView({ block: 'center' }); }
    $('#sq').focus(); $('#sq').select();
    if ($('#sq').value.trim()) runSearch();
  };

  // Kontextmenü (Rechtsklick): kleine Liste von Aktionen an der Mausposition
  let ctxEl = null;
  function ctxShow(e, items) {
    if (!ctxEl) {
      ctxEl = document.createElement('div'); ctxEl.id = 'ctxMenu'; ctxEl.hidden = true; document.body.appendChild(ctxEl);
      const hide = () => { ctxEl.hidden = true; };
      document.addEventListener('click', hide); window.addEventListener('blur', hide); document.addEventListener('keydown', ev => { if (ev.key === 'Escape') hide(); });
      ctxEl.addEventListener('click', ev => { const b = ev.target.closest('button[data-n]'); hide(); if (b && ctxEl._items[+b.dataset.n]) ctxEl._items[+b.dataset.n].fn(); });
    }
    e.preventDefault();
    ctxEl._items = items;
    ctxEl.innerHTML = items.map((it, i) => it.sep ? '<hr>' : `<button data-n="${i}">${esc(it.label)}</button>`).join('');
    ctxEl.hidden = false;
    ctxEl.style.left = '0px'; ctxEl.style.top = '0px';
    const mw = ctxEl.offsetWidth, mh = ctxEl.offsetHeight; // erst messen, dann so setzen, dass das Menü ganz im Fenster bleibt
    ctxEl.style.left = Math.max(4, Math.min(e.clientX, window.innerWidth - mw - 8)) + 'px';
    ctxEl.style.top = Math.max(4, Math.min(e.clientY, window.innerHeight - mh - 8)) + 'px';
  }
  // Menü für ein Buch (Bücherliste, Verlauf): hier öffnen, neuer Tab, zweites Fenster
  function bookMenu(e, key, target = {}) {
    const g = groupsByKey.get(key);
    if (!g) return;
    const items = [
      { label: 'Öffnen', fn: () => openGroup(g, target, false) },
      { label: 'Im neuen Tab öffnen', fn: () => openGroup(g, target, true) },
    ];
    if (!IS_PANE2) items.push({ label: 'Im zweiten Fenster öffnen', fn: () => openInPane2(key, target) });
    const nOwn = g.versions.filter(v => v.own).length;
    if (nOwn) items.push({ label: nOwn > 1 ? I18N.t('Eigene Texte ({#}) entfernen …', nOwn) : I18N.t('Eigenen Text entfernen …'), fn: () => removeOwnGroup(g) });
    ctxShow(e, items);
  }
  // im zweiten Fenster öffnen: Fenster bei Bedarf einblenden; ist dort schon ein Buch offen, entsteht ein neuer Tab
  function openInPane2(key, target = {}) {
    setSplit(true);
    const msg = target.jump ? { type: 'jump', ref: target.jump } : { type: 'open', key, rel: target.rel, sectionPath: target.sectionPath, rowLabel: target.rowLabel };
    toPane2(msg);
  }
  function toPane2(msg) {
    setSplit(true);
    if (p2Ready) p2Post(msg);
    else { const t = setInterval(() => { if (p2Ready) { clearInterval(t); setTimeout(() => p2Post(msg), 400); } }, 100); setTimeout(() => clearInterval(t), 8000); }
  }
  $('#tree').addEventListener('contextmenu', e => { const a = e.target.closest('.lib-item'); if (a) bookMenu(e, a.dataset.key); });
  $('#recent').addEventListener('contextmenu', e => {
    const a = e.target.closest('a[data-i]'); const h = a && history[+a.dataset.i];
    if (h) bookMenu(e, h.key, { sectionPath: JSON.parse(h.sk), rowLabel: h.row || undefined });
  });
  // Rechtsklick auf einen Vers: Referenz kopieren / auf sefaria.org öffnen
  $('#rOut').addEventListener('contextmenu', e => {
    const row = e.target.closest('.row[data-l]');
    const selTxt = (window.getSelection() + '').trim();
    const word = selTxt && selTxt.length <= 60 && !/\n/.test(selTxt) ? selTxt : (selTxt ? '' : wordAt(e));
    if (selTxt) { // markierter Text: Nachschlagen und Kopieren anbieten
      const items = [];
      if (word) items.push({ label: `Im Wörterbuch nachschlagen: „${word}“`, fn: () => openDict(word) });
      items.push({ label: I18N.t('Kopieren'), fn: () => navigator.clipboard.writeText(selTxt).catch(() => {}) });
      ctxShow(e, items); return;
    }
    if (!row || !view || !view.group) return;
    const sec = view.sections[view.idx];
    if (!sec) return;
    const ref = `${view.group.title} ${String(sec.label).replace(/^\D+/, '') || sec.label}:${row.dataset.l}`.replace(/\s+/g, ' ');
    const url = sefariaUrl(ref);
    ctxShow(e, [
      ...(word ? [{ label: `Im Wörterbuch nachschlagen: „${word}“`, fn: () => openDict(word) }] : []),
      { label: I18N.t('Referenz kopieren: {}', ref), fn: () => navigator.clipboard.writeText(ref).catch(() => {}) },
      { label: 'Auf sefaria.org öffnen', fn: () => window.api.openExternal(url) },
    ]);
  });

  // ---------- Wörterbuch (DSL) ----------
  // Wort unter dem Mauszeiger (für Rechtsklick ohne Markierung)
  function wordAt(e) {
    try {
      const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
      if (!r || r.startContainer.nodeType !== 3) return '';
      const t = r.startContainer.textContent, i = r.startOffset, ok = c => /[\p{L}\p{M}]/u.test(c);
      let a = i, b = i;
      while (a > 0 && ok(t[a - 1])) a--;
      while (b < t.length && ok(t[b])) b++;
      const w = t.slice(a, b);
      return w.length >= 2 ? w : '';
    } catch { return ''; }
  }
  let dictOpen = false;
  const syncDock = () => { // Wörterbuch und Kommentare teilen sich die rechte Spalte
    document.body.classList.toggle('dict-open', dictOpen);
    $('#cmtResize').hidden = !(cmtOpen || dictOpen);
  };
  // Seitenleisten ändern die Breite des Lesebereichs: die Stelle, an der man gerade liest (markierter Vers, sonst oberster sichtbarer), bleibt dabei auf dem Bildschirm stehen
  function withAnchor(fn) {
    const vis = x => { const r = x.getBoundingClientRect(); return r.bottom > 110 && r.top < window.innerHeight; };
    const rows = $$('#rOut .row[data-l], #rOut .row[data-sp]'); // auch die Trefferzeilen im Suchtab
    const a = rows.find(x => (x.classList.contains('hit') || x.classList.contains('cmtrow')) && vis(x)) || rows.find(vis);
    const t0 = a ? a.getBoundingClientRect().top : 0;
    fn();
    if (a && a.isConnected) { const d = a.getBoundingClientRect().top - t0; if (Math.abs(d) > 1) window.scrollBy(0, d); }
  }
  function toggleDict(force) {
    withAnchor(() => toggleDict0(force));
  }
  function toggleDict0(force) {
    dictOpen = force == null ? !dictOpen : force;
    $('#dictPanel').hidden = !dictOpen;
    syncDock();
    $('#dictTabBtn').classList.toggle('sideopen', dictOpen);
    if (dictOpen) { renderDictList(); $('#dictQ').focus({ preventScroll: true }); }
  }
  // Doppelklick auf ein Wort im Text oder in den Kommentaren schlägt es nach
  const dblWord = e => {
    if (e.target.closest('a, button, select, input, textarea, .lab, .bm')) return;
    const w = (window.getSelection() + '').trim().replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '');
    if (w.length >= 2 && w.length <= 40 && !/\s/.test(w)) {
      // erneuter Doppelklick auf dasselbe Wort an derselben Stelle schließt das Wörterbuch wieder
      let pos = null;
      try { const r = window.getSelection().getRangeAt(0); pos = { node: r.startContainer, off: r.startOffset, w }; } catch { /* egal */ }
      const same = pos && lastDictDbl && lastDictDbl.node === pos.node && lastDictDbl.off === pos.off && lastDictDbl.w === pos.w;
      if (same && dictOpen && document.documentElement.dataset.tab !== 'dict') { toggleDict(false); lastDictDbl = null; return; }
      lastDictDbl = pos;
      openDict(w);
    }
  };
  let lastDictDbl = null;
  // Einfacher Klick auf ein Wort (nicht hebräisch-morphologisch) markiert es wie bei den hebräischen Wörtern
  const clickMark = e => {
    if (!window.Highlight || !CSS.highlights) return;
    CSS.highlights.delete('wsel');
    if (e.target.closest('a, button, select, input, textarea, .lab, .bm, .w[data-m], .wt[data-m], .wg, #wpop, .head')) return;
    if (String(window.getSelection())) return;
    try {
      const r = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (!r || r.startContainer.nodeType !== 3) return;
      const t = r.startContainer.textContent, ok = c => /[\p{L}\p{M}\p{N}]/u.test(c || '');
      let a = r.startOffset, b = a;
      if (!ok(t[a]) && !ok(t[a - 1])) return;
      while (a > 0 && ok(t[a - 1])) a--;
      while (b < t.length && ok(t[b])) b++;
      if (b - a < 1) return;
      const rg = document.createRange(); rg.setStart(r.startContainer, a); rg.setEnd(r.startContainer, b);
      CSS.highlights.set('wsel', new Highlight(rg));
    } catch { /* egal */ }
  };
  $('#rOut').addEventListener('click', clickMark);
  $('#cmtBody').addEventListener('click', clickMark);
  $('#rOut').addEventListener('dblclick', dblWord);
  $('#cmtBody').addEventListener('dblclick', dblWord);
  let dictOnly = null; // { id, name }: Suche nur in diesem Wörterbuch (wird nicht mehr über das Menü gesetzt)
  let dictHist = [], dictPos = -1, dictShown = [];
  function dictNavButtons() { $('#dictBack').disabled = dictPos <= 0; $('#dictFwd').disabled = dictPos >= dictHist.length - 1; }
  async function dictLookup(q, only = null, fromHist = false) {
    q = String(q || '').trim();
    if (!q) return;
    dictOnly = only;
    dtabs[dcur].title = q;
    renderDtabs();
    if (!fromHist) {
      if (!(dictPos >= 0 && dictHist[dictPos].q === q)) { dictHist = dictHist.slice(0, dictPos + 1); dictHist.push({ q, only }); dictPos = dictHist.length - 1; }
    }
    dictNavButtons();
    $('#dictQ').value = q;
    if (typeof renderSaved === 'function') renderSaved();
    $('#dictOut').innerHTML = '<p class="muted">Suche …</p>';
    const r = await O.dictLookup(q, only && only.id);
    if (r.error) { $('#dictOut').innerHTML = `<p class="muted">⚠ ${esc(r.error)}</p>`; return; }
    dictShown = r.results;
    if (!r.results.length) {
      const n = (await O.dictList()).list.length;
      $('#dictOut').innerHTML = n ? `<p class="muted">Kein Eintrag für „${esc(q)}“ gefunden.</p>` : '<p class="muted">Es ist noch kein Wörterbuch eingebunden. Öffne unten „Wörterbücher verwalten“ und füge eine DSL-Datei hinzu.</p>';
      return;
    }
    const onlyBar = dictOnly ? `<div class="donly muted">Nur in: <b>${esc(dictOnly.name)}</b> · <a class="dall">alle Wörterbücher</a></div>` : '';
    // pro Wörterbuch ein eigener Abschnitt mit Titelleiste und Farbe; jeder Treffer als eigene Karte
    const hue = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
    const cnt = {}; r.results.forEach(x => { cnt[x.dictId] = (cnt[x.dictId] || 0) + 1; });
    let last = null;
    $('#dictOut').innerHTML = onlyBar + r.results.map((x, i) => {
      let sec = '';
      if (x.dictId !== last) { last = x.dictId; sec = `<div class="dsec" style="--dh:${hue(x.dictId)}"><span>${esc(x.dict)}</span><small>${cnt[x.dictId]} Treffer</small></div>`; }
      return `${sec}<div class="dentry" id="dentry${i}" style="--dh:${hue(x.dictId)}"><div class="dhead"><b dir="auto">${esc(x.head)}</b>${x.note ? ` <span class="muted">${esc(x.note)}</span>` : ''}</div><div class="dbody" dir="ltr">${/Gesenius/.test(x.dict || '') && window.GAbk ? window.GAbk.mark(x.html) : x.html}</div></div>`;
    }).join('');
    $('#dictPanel').scrollTop = 0;
  }
  const dictGoHist = d => { const k = dictPos + d; if (k < 0 || k >= dictHist.length) return; dictPos = k; dictLookup(dictHist[k].q, dictHist[k].only, true); };
  // Mehrere Wörterbuch-Tabs – nur im Reiter „Wörterbuch“ sichtbar (die Seitenleiste beim Lesen hat immer nur eine Suche)
  const dtabs = [{ title: 'Neu' }];
  let dcur = 0;
  const dtabSave = () => {
    const t = dtabs[dcur];
    Object.assign(t, { q: $('#dictQ').value, only: dictOnly, hist: dictHist, pos: dictPos, shown: dictShown, html: $('#dictOut').innerHTML, scroll: $('#dictPanel').scrollTop });
  };
  const dtabLoad = () => {
    const t = dtabs[dcur];
    dictOnly = t.only || null; dictHist = t.hist || []; dictPos = t.pos == null ? -1 : t.pos; dictShown = t.shown || [];
    $('#dictQ').value = t.q || '';
    $('#dictOut').innerHTML = t.html || '<p class="muted">Gib ein hebräisches oder deutsches Wort ein.</p>';
    $('#dictPanel').scrollTop = t.scroll || 0;
    dictNavButtons();
    renderDtabs();
  };
  function renderDtabs() {
    $('#dictTabs').innerHTML = dtabs.map((t, i) => `<span class="dtab${i === dcur ? ' active' : ''}" data-i="${i}" title="${esc(t.title)}"><span class="dtt">${esc(t.title)}</span>${dtabs.length > 1 ? '<button class="dtx" title="Tab schließen">✕</button>' : ''}</span>`).join('') + '<button id="dtabNew" title="Neuer Wörterbuch-Tab">+</button>';
  }
  const dtabGo = i => { if (i === dcur || !dtabs[i]) return; dtabSave(); dcur = i; dtabLoad(); };
  const dtabAdd = () => { dtabSave(); dtabs.push({ title: 'Neu' }); dcur = dtabs.length - 1; dtabLoad(); $('#dictQ').focus(); };
  const dtabClose = i => { if (dtabs.length < 2) return; if (i === dcur) { dtabs.splice(i, 1); dcur = Math.min(i, dtabs.length - 1); dtabLoad(); } else { dtabSave(); dtabs.splice(i, 1); if (i < dcur) dcur--; renderDtabs(); } };
  $('#dictTabs').addEventListener('click', e => {
    if (e.target.closest('#dtabNew')) return dtabAdd();
    const t = e.target.closest('.dtab'); if (!t) return;
    if (e.target.closest('.dtx')) return dtabClose(+t.dataset.i);
    dtabGo(+t.dataset.i);
  });
  $('#dictTabs').addEventListener('auxclick', e => { const t = e.target.closest('.dtab'); if (t && e.button === 1) dtabClose(+t.dataset.i); });
  // Im Wörterbuch-Reiter öffnet Cmd/Strg/Umschalt + Klick auf einen Verweis (oder Cmd+Enter beim Suchen) einen neuen Tab
  $('#dictOut').addEventListener('click', e => {
    const a = e.target.closest('a.dref[data-q]');
    if (a && document.documentElement.dataset.tab === 'dict' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.stopImmediatePropagation(); const q = a.dataset.q; dtabAdd(); dictLookup(q); }
  }, true);
  renderDtabs();
  // Wortvorschläge beim Tippen
  { let sugTimer = 0, sugSeq = 0, sugItems = [], sugSel = -1;
    const box = $('#dictSug');
    const hideSug = () => { box.hidden = true; sugItems = []; sugSel = -1; };
    const paint = () => { box.innerHTML = sugItems.map((x, i) => `<div class="sg${i === sugSel ? ' on' : ''}" data-i="${i}"><b dir="auto">${esc(x.head)}</b><small>${esc(x.dict)}</small></div>`).join(''); box.hidden = !sugItems.length; };
    const pick = i => { const x = sugItems[i]; if (!x) return; hideSug(); $('#dictQ').value = x.head; manualSearch(x.head); };
    $('#dictQ').addEventListener('input', () => {
      clearTimeout(sugTimer);
      const v = $('#dictQ').value.trim();
      if (!v) { hideSug(); return; }
      sugTimer = setTimeout(async () => {
        const my = ++sugSeq;
        const r = await O.dictSuggest(v);
        if (my !== sugSeq || $('#dictQ').value.trim() !== v) return; // veraltete Antwort
        sugItems = r.list || []; sugSel = -1; paint();
      }, 80);
    });
    $('#dictQ').addEventListener('keydown', e => {
      if (box.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sugSel = (sugSel + (e.key === 'ArrowDown' ? 1 : -1) + sugItems.length + 1) % (sugItems.length + 1); if (sugSel === sugItems.length) sugSel = -1; paint(); }
      else if (e.key === 'Enter' && sugSel >= 0) { e.preventDefault(); e.stopImmediatePropagation(); pick(sugSel); }
      else if (e.key === 'Escape') { hideSug(); }
    }, true);
    box.addEventListener('mousedown', e => { const r = e.target.closest('.sg'); if (r) { e.preventDefault(); pick(+r.dataset.i); } });
    $('#dictQ').addEventListener('blur', () => setTimeout(hideSug, 120));
    $('#dictGo').addEventListener('click', hideSug);
  }
  // „Erster Buchstabe weg“: Präfix (בְּ, וְ, הַ …) abschneiden und neu nachschlagen, beliebig oft
  $('#dictCut').onclick = () => {
    const q = $('#dictQ').value.trim().replace(/^[^\p{L}]*\p{L}\p{M}*/u, '');
    if (q) dictLookup(q); 
  };
  // Reiter „Wörterbuch“: das Wörterbuch füllt die ganze Seite
  { let dictBefore = false;
    onTabChange = (t, prev) => {
      if (t === 'dict' && prev !== 'dict') { dictBefore = dictOpen; toggleDict(true); }
      else if (t !== 'dict' && prev === 'dict') toggleDict(dictBefore);
    };
  }
  $('#dictBack').onclick = () => dictGoHist(-1);
  $('#dictFwd').onclick = () => dictGoHist(1);
  // Schriftgröße des Wörterbuchs (wird gemerkt)
  let dfs = 15;
  try { dfs = Math.min(26, Math.max(10, +localStorage.getItem('dictFs') || 15)); } catch { /* egal */ }
  const applyDfs = () => { $('#dictPanel').style.setProperty('--dict-fs', dfs + 'px'); try { localStorage.setItem('dictFs', String(dfs)); } catch { /* egal */ } };
  applyDfs();
  $('#dictFsMinus').onclick = () => { dfs = Math.max(10, dfs - 1); applyDfs(); };
  $('#dictFsPlus').onclick = () => { dfs = Math.min(26, dfs + 1); applyDfs(); };
  // Scrollt nur den umgebenden Panel-Container (nicht das Dokument), damit das Fenster nicht springt
  function panelScrollTo(el, block) {
    let p = el.parentElement;
    while (p && p !== document.body && !(p.scrollHeight > p.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    if (!p || p === document.body) return;
    const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
    const top = r.top - pr.top + p.scrollTop - (block === 'center' ? (p.clientHeight - r.height) / 2 : 0);
    p.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
  // zu einem Artikel der aktuellen Trefferliste springen
  function dictJump(i) {
    const el = $('#dentry' + i);
    if (!el) return;
    panelScrollTo(el, 'start');
    el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200);
  }
  async function renderDictList() {
    const r = await O.dictList();
    $('#dictList').innerHTML = r.list.length ? r.list.map((d, i) => `<div class="dli"><span>${esc(d.name)} <span class="muted">· ${d.count.toLocaleString(I18N.loc)} Einträge</span></span><span class="dbtns"><button data-mv="-1" data-id="${esc(d.id)}" title="Nach oben (wird zuerst angezeigt)"${i === 0 ? ' disabled' : ''}>▲</button><button data-mv="1" data-id="${esc(d.id)}" title="Nach unten"${i === r.list.length - 1 ? ' disabled' : ''}>▼</button><button data-id="${esc(d.id)}" title="Wörterbuch entfernen">✕</button></span></div>`).join('') : '<p class="muted">Noch keine Wörterbücher.</p>';
  }
  async function openDict(q) {
    if (!dictOpen) toggleDict(true); else renderDictList();
    if (q) dictLookup(q); else $('#dictQ').focus({ preventScroll: true });
  }
  $('#openDict').onclick = () => { $('#moreMenu').open = false; toggleDict(); };
  $('#dictClose').onclick = () => { if (document.documentElement.dataset.tab === 'dict') showTab('read'); else toggleDict(false); };
  // Letzte Suchen (nur selbst eingegebene/ausgewählte, nicht Doppelklick oder Links) und Favoriten
  const lsGet = k => { try { const a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
  const lsSet = (k, a) => { try { localStorage.setItem(k, JSON.stringify(a)); } catch { /* egal */ } };
  let dRecent = lsGet('dictRecent'), dFavs = lsGet('dictFavs');
  const chips = (a, fav) => a.length ? a.map((w, i) => `<span class="dchip"><a data-w="${esc(w)}" dir="auto">${esc(w)}</a><button data-rm="${i}" title="Entfernen">✕</button></span>`).join('') : `<span class="muted">${fav ? 'Noch keine Favoriten' : 'Noch keine Suchen'}</span>`;
  const syncSaved = () => { dRecent = lsGet('dictRecent'); dFavs = lsGet('dictFavs'); }; // beide Fenster teilen den Speicher: vor jeder Änderung frisch lesen
  function renderSaved() {
    syncSaved();
    $('#dictRecentL').innerHTML = chips(dRecent, false);
    $('#dictFavL').innerHTML = chips(dFavs, true);
    const q = $('#dictQ').value.trim(), on = !!q && dFavs.includes(q);
    $('#dictStar').textContent = on ? '★' : '☆'; $('#dictStar').classList.toggle('on', on);
  }
  const manualSearch = q => {
    q = String(q || '').trim();
    syncSaved();
    if (q) { dRecent = [q, ...dRecent.filter(x => x !== q)].slice(0, 30); lsSet('dictRecent', dRecent); }
    dictLookup(q); renderSaved();
  };
  $('#dictStar').onclick = () => {
    const q = $('#dictQ').value.trim(); if (!q) return;
    syncSaved();
    dFavs = dFavs.includes(q) ? dFavs.filter(x => x !== q) : [q, ...dFavs];
    lsSet('dictFavs', dFavs); renderSaved();
  };
  $('#dictRecentClear').onclick = () => { syncSaved(); dRecent = []; lsSet('dictRecent', dRecent); renderSaved(); };
  $('#dictSaved').addEventListener('click', e => {
    const rm = e.target.closest('button[data-rm]');
    if (rm) { syncSaved(); const fav = !!rm.closest('#dictFavL'); const a = fav ? dFavs : dRecent; a.splice(+rm.dataset.rm, 1); lsSet(fav ? 'dictFavs' : 'dictRecent', a); renderSaved(); return; }
    const a = e.target.closest('a[data-w]'); if (a) dictLookup(a.dataset.w);
  });
  $('#dictQ').addEventListener('input', renderSaved);
  renderSaved();
  $('#dictGo').onclick = () => manualSearch($('#dictQ').value);
  $('#dictQ').addEventListener('keydown', e => { if (e.key === 'Enter') manualSearch($('#dictQ').value); });
  // Stellenangaben im Lesetext und in den Kommentaren (Klasse „aref“): im Reader öffnen; Cmd/Strg + Klick = neuer Tab, Umschalt + Klick = im zweiten Fenster rechts
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a.aref[data-sref]');
    if (!a || !a.closest('#rOut, #cmtBody, #linkPanel')) return;
    e.preventDefault(); e.stopPropagation();
    if (e.shiftKey && !IS_PANE2) { toPane2({ type: 'jump', ref: a.dataset.sref.replace(/-.*$/, '') }); return; }
    jumpTo(a.dataset.sref, e.metaKey || e.ctrlKey).then(ok => {
      a.classList.toggle('dmiss', !ok);
      a.title = ok ? a.dataset.sref : I18N.t('Dieser Text ist nicht in deiner Bibliothek (Reiter „Herunterladen“).');
    });
  }, true);
  $('#dictOut').addEventListener('click', e => {
    const s = e.target.closest('.dsrc[data-sref]');
    if (s) {   // Quellenangabe im Artikel (z. B. „Rosh Hashanah 18b“): im Reader öffnen; Cmd/Strg + Klick = neuer Tab, Umschalt + Klick = im zweiten Fenster rechts
      e.preventDefault();
      if (e.shiftKey && !IS_PANE2) { toPane2({ type: 'jump', ref: s.dataset.sref.replace(/-.*$/, '') }); return; }
      jumpTo(s.dataset.sref, e.metaKey || e.ctrlKey).then(ok => {
        s.classList.toggle('dmiss', !ok);
        s.title = ok ? '' : 'Dieser Text ist nicht in deiner Bibliothek (Reiter „Herunterladen“).';
      });
      return;
    }
    const a = e.target.closest('.dref[data-q]');
    if (a) dictLookup(a.dataset.q);
    else if (e.target.closest('.dall')) dictLookup($('#dictQ').value);
  });
  // Rechtsklick in der Wörterbuch-Leiste (wie GoldenDict): Artikel/alles markieren und zu einem der gefundenen Artikel springen
  $('#dictOut').addEventListener('contextmenu', e => {
    e.preventDefault();
    const selTxt = (window.getSelection() + '').trim();
    const art = e.target.closest('.dentry');
    const items = [];
    // Quellenlink (z. B. „Ned. 41ᵃ“): öffnen, im neuen Tab oder im zweiten Fenster rechts
    const src = e.target.closest('.dsrc[data-sref]');
    if (src) {
      const ref = src.dataset.sref.replace(/-.*$/, '');
      items.push({ label: `Öffnen: ${src.textContent.trim()}`, fn: () => jumpTo(ref, false) });
      items.push({ label: 'Im neuen Tab öffnen', fn: () => jumpTo(ref, true) });
      if (!IS_PANE2) items.push({ label: 'Im zweiten Fenster (rechts) öffnen', fn: () => toPane2({ type: 'jump', ref }) });
      items.push({ sep: true });
    }
    // Wort unter dem Zeiger (Verweis, Markierung oder Wort) nachschlagen
    if (!src) { const ref = e.target.closest('a.dref[data-q]');
      const word = ref ? ref.dataset.q : (selTxt && selTxt.length <= 60 && !/\n/.test(selTxt) ? selTxt : (selTxt ? '' : wordAt(e)));
      if (word) {
        if (!IS_PANE2) {
          items.push({ label: `Im neuen Tab nachschlagen: „${word}“`, fn: () => { if (document.documentElement.dataset.tab !== 'dict') showTab('dict'); dtabAdd(); dictLookup(word); } });
        }
        items.push({ label: `Hier nachschlagen: „${word}“`, fn: () => dictLookup(word) });
        items.push({ sep: true });
      } }
    if (selTxt) items.push({ label: I18N.t('Kopieren'), fn: () => navigator.clipboard.writeText(selTxt).catch(() => {}) });
    if (art) items.push({ label: 'Aktuellen Artikel auswählen', fn: () => { const r = document.createRange(); r.selectNodeContents(art); const s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(r); } });
    items.push({ label: 'Alles auswählen', fn: () => { const r = document.createRange(); r.selectNodeContents($('#dictOut')); const s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(r); } });
    // eine Zeile pro Wörterbuch (springt zum ersten Artikel dieses Wörterbuchs)
    const byDict = [];
    dictShown.forEach((x, i) => { let g = byDict.find(b => b.dictId === x.dictId); if (!g) byDict.push(g = { dictId: x.dictId, name: x.dict, first: i, n: 0 }); g.n++; });
    if (byDict.length > 1 || (byDict.length === 1 && byDict[0].n > 1)) {
      items.push({ sep: true });
      byDict.forEach(g => items.push({ label: g.n > 1 ? I18N.t('{} ({#} Artikel)', g.name, g.n) : g.name, fn: () => dictJump(g.first) }));
    }
    ctxShow(e, items);
  });
  $('#dictAdd').onclick = async () => {
    const r = await O.dictAdd();
    if (r.cancelled) return;
    await renderDictList();
    $('#dictMan').open = true;
    if (r.errors && r.errors.length) alert(r.errors.join('\n'));
    else if (r.added && r.added.length) $('#dictOut').innerHTML = `<p class="muted">Eingebunden: ${r.added.map(a => `${esc(a.name)} (${a.count.toLocaleString(I18N.loc)} Einträge)`).join(', ')}.</p>`;
  };
  $('#dictList').addEventListener('click', async e => {
    const mv = e.target.closest('button[data-mv]');
    if (mv) {   // Reihenfolge ändern
      const ids = (await O.dictList()).list.map(d => d.id), i = ids.indexOf(mv.dataset.id), k = i + +mv.dataset.mv;
      if (i < 0 || k < 0 || k >= ids.length) return;
      [ids[i], ids[k]] = [ids[k], ids[i]];
      await O.dictOrder(ids);
      await renderDictList();
      if (dictHist[dictPos]) dictLookup(dictHist[dictPos].q, dictHist[dictPos].only, true);
      return;
    }
    const b = e.target.closest('button[data-id]');
    if (!b || !confirm('Dieses Wörterbuch aus Safran entfernen? Deine DSL-Datei bleibt unberührt.')) return;
    const r = await O.dictRemove(b.dataset.id);
    if (r.error) alert(r.error);
    await renderDictList();
  });

  const plainSnip = r => (r.parts ? r.parts.map(x => x.t).join('') : `${r.snippet.before}${r.snippet.hit}${r.snippet.after}`);
  // Grammatik-Auswahl der Suche -> { pos, stem, … } oder null, wenn nichts gewählt ist
  const GRAM_IDS = { pos: 'gPos', stem: 'gStem', tense: 'gTense', person: 'gPerson', gender: 'gGender', number: 'gNumber', state: 'gState', suffix: 'gSuffix', article: 'gArticle' };
  function gramParams() {
    const g = {}; let any = false;
    for (const [k, id] of Object.entries(GRAM_IDS)) { const el = $('#' + id); const v = el ? el.value : ''; g[k] = v; if (v) any = true; }
    return any ? g : null;
  }
  $('#gClear').onclick = () => { for (const id of Object.values(GRAM_IDS)) $('#' + id).value = ''; $('#gramBox').open = false; };
  $('#gramBox').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'SELECT') { e.preventDefault(); $('#sGo').click(); } });
  // Verteilung des Suchworts auf die Bücher (Balkendiagramm, je Fassung eine Farbe)
  const DIST_COLORS = ['#4c78db', '#e8863a', '#e0b84a', '#5fb3a8', '#8a93a6', '#b86bc4', '#d9534f', '#6aa84f'];
  let distZoom = 1, distMode = 'o', distScale = null, distSel = null, distOpen = false; // distSel: gewählte Fassungen (null = die häufigsten)
  // distScale: null = automatisch (logarithmisch, wenn einzelne Bücher alles überragen)
  function renderDist(res) {
    const box = $('#sChart');
    const rows = (res.dist || []);
    const books = res.stats.map(x => x.title);
    if (!rows.length || books.length < 2) { box.hidden = true; return; }
    const val = r => (distMode === 'o' ? r.o : r.h);
    const serKey = r => (r.v || '') + '\u0000' + r.k;
    const tot = new Map(); rows.forEach(r => tot.set(serKey(r), (tot.get(serKey(r)) || 0) + val(r)));
    const allSers = [...tot.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
    let sers = distSel ? allSers.filter(k => distSel.has(k)) : allSers.slice(); // von Anfang an alle Fassungen
    const colOf = i => DIST_COLORS[i % DIST_COLORS.length];
    const label = k => { const [v, kind] = k.split('\u0000'); return (v ? shortVer(v) : KIND_LABEL[kind] || kind) + (v ? '' : ''); };
    const cell = new Map(rows.map(r => [r.t + '\u0001' + serKey(r), val(r)]));
    const vals = rows.map(val).filter(v => v > 0).sort((a, b) => a - b), max = Math.max(1, ...vals);
    const log = distScale ? distScale === 'log' : max > 30 * Math.max(1, vals[Math.floor(vals.length / 2)] || 1);
    const nice = m => { const p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
    const step = nice(max / 5), top = log ? Math.ceil(Math.log10(max)) + 1 : Math.ceil(max / step) * step;
    const shown = b => (b.length > 30 ? b.slice(0, 29) + '…' : b), maxLen = Math.max(...books.map(b => shown(b).length)), PB = Math.min(170, Math.max(60, Math.round(20 + 4.3 * maxLen)));
    const L = Math.max(46, Math.round(3.5 * shown(books[0]).length)), bw = Math.round((sers.length > 12 ? 4 : sers.length > 6 ? 6 : 9) * distZoom);
    const present = b => sers.map((k, si) => ({ k, si })).filter(x => (cell.get(b + '\u0001' + x.k) || 0) > 0); // pro Buch nur Fassungen mit Treffern, ohne Lücken
    const gws = books.map(b => Math.max(1, present(b).length) * bw + Math.round(10 * Math.max(1, distZoom))), gx = []; gws.reduce((a, w, i) => (gx[i] = a, a + w), L);
    const W = L + gws.reduce((a, w) => a + w, 0) + 14, H = 150 + PB, PT = 10, ih = H - PT - PB;
    const y = v => PT + ih - ((log ? (v > 0 ? Math.log10(v) + 1 : 0) : v) / top) * ih;
    let svg = `<svg width="${W}" height="${H}" role="img" aria-label="${esc(I18N.t('Verteilung auf die Bücher'))}">`;
    const tickVals = log ? Array.from({ length: top }, (_, k) => Math.pow(10, k)) : Array.from({ length: Math.round(top / step) + 1 }, (_, k) => k * step);
    if (log) tickVals.unshift(0);
    tickVals.forEach(v => { svg += `<line class="ax" x1="${L - 4}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" opacity=".5"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`; });
    books.forEach((b, bi) => {
      const x0 = gx[bi], gw = gws[bi];
      present(b).forEach(({ k, si }, pi) => {
        const v = cell.get(b + '\u0001' + k) || 0;
        svg += `<rect class="bar" data-t="${esc(b)}" x="${x0 + pi * bw}" y="${y(v)}" width="${bw - 1}" height="${Math.max(1, y(0) - y(v))}" fill="${colOf(si)}" data-tip="${esc(b)} · ${esc(label(k))}: ${v}"></rect>`;
      });
      svg += `<text transform="translate(${x0 + (gw - 6) / 2},${H - PB + 8}) rotate(-50)" text-anchor="end"><title>${esc(b)}</title>${esc(shown(b))}</text>`;
    });
    svg += '</svg>';
    box.innerHTML = `<div class="chead"><b>${esc(I18N.t('Verteilung auf die Bücher'))}</b>
      <select id="distScale" title="${esc(I18N.t('Skala'))}"><option value="lin"${!log ? ' selected' : ''}>${esc(I18N.t('Linear'))}</option><option value="log"${log ? ' selected' : ''}>${esc(I18N.t('Logarithmisch'))}</option></select>
      <select id="distMode"><option value="o"${distMode === 'o' ? ' selected' : ''}>${esc(I18N.t('Vorkommen'))}</option><option value="h"${distMode === 'h' ? ' selected' : ''}>${esc(I18N.t('Verse mit Treffer'))}</option></select>
      <span class="dzoom"><button data-act="zout" title="${esc(I18N.t('Verkleinern'))}">−</button><span class="muted">${Math.round(distZoom * 100)}%</span><button data-act="zin" title="${esc(I18N.t('Vergrößern'))}">+</button></span>
      <details id="distVer"${distOpen ? ' open' : ''}><summary>${esc(I18N.t('Fassungen'))} (${sers.length}/${allSers.length})</summary><div class="verlist"><button data-act="serall">${esc(I18N.t('Alle Fassungen'))}</button> <button data-act="sernone">${esc(I18N.t('Keine'))}</button>${allSers.map((k, ai) => { const i = sers.indexOf(k), nm = label(k); return `<label class="cleg" title="${esc(nm)}"><input type="checkbox" data-ser="${ai}"${i >= 0 ? ' checked' : ''}><i style="background:${i >= 0 ? colOf(i) : 'transparent'};border:1px solid ${i >= 0 ? colOf(i) : 'var(--line)'}"></i>${esc(nm.length > 48 ? nm.slice(0, 47) + '…' : nm)}</label>`; }).join('')}</div></details>
      ${(sers.length > 12 ? [] : sers).map((k, i) => `<span class="cleg" title="${esc(label(k))}"><i style="background:${colOf(i)}"></i>${esc(label(k).length > 38 ? label(k).slice(0, 37) + '…' : label(k))}</span>`).join('')}</div><div class="cwrap">${svg}</div>`;
    box.hidden = false;
    box._res = res; box._allSers = allSers;
  }
  $('#sChart').addEventListener('toggle', e => { if (e.target.id === 'distVer') distOpen = e.target.open; }, true);
  $('#sChart').addEventListener('change', e => {
    const cb = e.target.closest && e.target.closest('input[data-ser]');
    if (cb) { // Fassungen ein-/ausblenden
      const all = $('#sChart')._allSers, cur = new Set([...$$('#sChart input[data-ser]')].filter(x => x.checked).map(x => all[+x.dataset.ser]));
      distSel = cur; renderDist($('#sChart')._res);
      return;
    }
    if (e.target.id === 'distMode') distMode = e.target.value; else if (e.target.id === 'distScale') distScale = e.target.value; else return; renderDist($('#sChart')._res); });
  // Die Zahl beim Überfahren zeigt die allgemeine Hilfeblase der App (data-tip am Balken)
  function distSetZoom(nz, ax) { // ax: Mausposition im sichtbaren Ausschnitt (Zoom um diesen Punkt)
    nz = Math.max(0.5, Math.min(6, nz)); if (nz === distZoom) return;
    const w = $('#sChart .cwrap'), old = distZoom, x = ax == null ? (w ? w.clientWidth / 2 : 0) : ax, c = w ? (w.scrollLeft + x) / old : 0;
    distZoom = nz; renderDist($('#sChart')._res);
    const w2 = $('#sChart .cwrap'); if (w2) w2.scrollLeft = Math.max(0, c * nz - x);
  }
  $('#sChart').addEventListener('wheel', e => { const w = e.target.closest && e.target.closest('.cwrap'); if (!w || !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); distSetZoom(distZoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX - w.getBoundingClientRect().left); }, { passive: false });
  $('#sChart').addEventListener('click', e => { const z = e.target.dataset && e.target.dataset.act; if (z === 'zin') return distSetZoom(distZoom * 1.4); if (z === 'zout') return distSetZoom(distZoom / 1.4); });
  $('#sChart').addEventListener('click', e => { if (e.target.dataset && e.target.dataset.act === 'serall') { distSel = null; return renderDist($('#sChart')._res); } if (e.target.dataset && e.target.dataset.act === 'sernone') { distSel = new Set(); return renderDist($('#sChart')._res); } const b = e.target.closest('.bar'); if (b) runSearch(b.dataset.t); });
  let sSumState = null; // zuletzt gezeigte Buchliste (für „… weitere anzeigen“)
  function renderSum() {
    const { res, onlyTitle, n } = sSumState;
    $('#sSum').innerHTML = res.stats.length > 1 || onlyTitle
      ? (onlyTitle ? `<button class="chip" data-t="">← alle Bücher</button> ` : '') + res.stats.slice(0, n).map(x => `<button class="chip${x.title === onlyTitle ? ' on' : ''}" data-t="${esc(x.title)}" title="Nur in diesem Buch, alle Treffer">${esc(x.title)} (${x.n})</button>`).join(' ') + (res.stats.length > n ? ` <button class="chip more" data-more="1" title="${esc(I18N.t('Weitere Bücher anzeigen'))}">${esc(I18N.t('… und {#} weitere', res.stats.length - n))}</button>` : '')
      : '';
    $('#sSumPanel').hidden = !$('#sSum').innerHTML.trim();
  }
  async function runSearch(only) {
    const onlyTitle = typeof only === 'string' && only !== 'restore' ? only : null; // Klick auf einen Buchnamen: nur dieses Buch, mit allen Treffern
    const q = $('#sq').value.trim();
    const gram = gramParams();
    if (!q && !gram) return;
    const kinds = gram ? ['he'] : $$('.sk').filter(c => c.checked).map(c => c.dataset.k); // Grammatik-Suche: nur hebräischer Westminster-Text
    if (!kinds.length) { $('#sInfo').textContent = 'Bitte mindestens eine Sprache wählen.'; return; }
    $('#sGo').disabled = true; $('#sCancel').disabled = false;
    $('#sInfo').textContent = 'Suche läuft …';
    $('#sOut').innerHTML = ''; $('#sSum').innerHTML = ''; $('#sSumPanel').hidden = true; $('#sExport').hidden = true; if (!only || typeof only !== 'string' || only === 'restore') $('#sChart').hidden = true;
    const sp = {
      query: q, extra: [$('#sq2').value.trim(), $('#sq3').value.trim()].filter(Boolean), distance: +$('#sDist').value, ordered: $('#sOrd').checked, fuzzy: $('#sFuzzy').checked, kinds,
      categories: onlyTitle ? [] : [...sCats], titles: onlyTitle ? [onlyTitle] : [...sTitles], prefix: $('#sPre').checked, exact: $('#sExact').checked, wlc: $('#sWlc').checked, lemma: $('#sLem').checked, gram,
      limit: 1000, perFile: onlyTitle ? 1000 : 25, countAll: !onlyTitle,
    };
    lastSearch = { ...sp };
    const fkey = JSON.stringify({ ...sp, titles: 0, perFile: 0, limit: 0, countAll: 0 });
    let res;
    if (only === 'restore' && fullCache && fullCache.key === fkey) res = fullCache.res; // Rückkehr zu „alle Bücher“: gespeichertes Ergebnis, keine neue Suche
    else res = await O.search(sp);
    if (!onlyTitle && !res.cancelled) fullCache = { key: fkey, res };
    $('#sGo').disabled = false; $('#sCancel').disabled = true;
    sResults = res.results;
    const totalHits = res.stats.reduce((a, x) => a + x.n, 0);
    $('#sInfo').textContent = I18N.t('{#} Treffer in {#} {} ({#} von {#} Dateien durchsucht)', totalHits + (res.truncated ? '+' : ''), res.stats.length, res.stats.length === 1 ? 'Buch' : 'Büchern', res.scanned, res.total) + (res.cancelled ? ' ' + I18N.t('– abgebrochen') : '') + (res.truncated ? ' ' + I18N.t('– bei 1000 angezeigten Treffern gestoppt, bitte genauer suchen') : '') + (res.capped && !onlyTitle ? ' ' + I18N.t('– je Buch werden die ersten 25 gezeigt; ein Klick auf den Buchnamen oben zeigt alle') : '') + '.';
    sSumState = { res, onlyTitle, n: 40 };
    renderSum();
    if (!onlyTitle) renderDist(res);
    $('#sExport').hidden = !sResults.length;
    $('#sReadBtn').hidden = !sResults.length;
    showSearchResults();
  }
  function renderSearchList() {
    $('#sOut').classList.remove('sread');
    $('#sOut').innerHTML = sResults.map((r, i) => {
      const sn = r.snippet;
      return `<div class="sres" data-i="${i}"><span class="t">${esc(r.title)}</span> <span class="muted">${esc(r.where)} · <span class="badge ${r.kind}">${KIND_LABEL[r.kind]}</span>${esc(shortVer(r.versionTitle))}</span><div class="snip" dir="${r.kind === 'he' ? 'rtl' : 'ltr'}">${r.parts ? r.parts.map(x => x.m ? `<mark>${esc(x.t)}</mark>` : esc(x.t)).join('') : `${esc(sn.before)}<mark>${esc(sn.hit)}</mark>${esc(sn.after)}`}</div></div>`;
    }).join('');
  }
  // Treffer als Lesetext: wie beim Lesen, jede Fundstelle als Zeile mit den gewählten Versionen nebeneinander, geordnet nach Buch und Kapitel
  let sRead = false; try { sRead = localStorage.getItem('searchRead') === '1'; } catch { /* egal */ }
  let sReadTok = 0;
  function showSearchResults() { renderSearchList(); }
  // Gefundene Wörter im Vers markieren: Westminster-Wörter (span.w) exakt, übrige Texte als Textstelle
  function markHits(html, h) {
    if (html == null || !h || !h.words.size) return html;
    const norm = x => R.normalize(x).replace(/[^\p{L}]/gu, '');
    const ws = [...h.words];
    if (/<span class="w"/.test(html)) {
      return html.replace(/<span class="w"( data-l="[^"]*" data-m="[^"]*")>(.*?)<\/span>/g, (m, at, inner) => {
        const f = norm(inner);
        return ws.some(x => f === norm(x) || (h.sub && f.includes(norm(x)))) ? `<span class="w hl"${at}>${inner}</span>` : m;
      });
    }
    const re = new RegExp('(' + ws.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'giu');
    return html.replace(/(<[^>]+>)|([^<]+)/g, (m, tag, txt) => tag ? tag : txt.replace(re, '<mark>$1</mark>'));
  }
  // Fundstellen als Lesetext-HTML: nach Buch und Kapitel geordnet, je Zeile die gewählten Versionen nebeneinander
  async function buildReadHtml(res, stillWanted, heAlso) {
    const books = new Map();
    for (const r of res) {
      if (!r.loc) continue;
      const b = books.get(r.title) || books.set(r.title, { rel: r.rel, secs: new Map(), rels: new Set() }).get(r.title);
      b.rels.add(r.rel);
      const k = JSON.stringify(r.loc.path);
      const sc = b.secs.get(k) || b.secs.set(k, { path: r.loc.path, labels: new Set(), hl: new Map() }).get(k);
      sc.labels.add(r.loc.label);
      if (r.words) {
        const hk = r.loc.label + '|' + r.rel;
        const h = sc.hl.get(hk) || sc.hl.set(hk, { words: new Set(), sub: false }).get(hk);
        r.words.forEach(w => h.words.add(w)); h.sub = h.sub || !!r.sub;
      }
    }
    let html = '';
    for (const [title, b] of books) {
      const entry = entries.find(x => x.rel === b.rel), g = entry && groupsByKey.get(keyOf(entry));
      if (!g) continue;
      const rels = [...new Set([...(heAlso ? [...pickVersions(g)].filter(r => { const v = g.versions.find(x => x.rel === r); return v && v.kind === 'he'; }) : pickVersions(g)), ...b.rels])].filter(r => g.versions.some(v => v.rel === r));
      const ds = [];
      for (const rel of rels) { try { const d = cache.get(rel) || await O.read(rel); if (d) ds.push(d); } catch { /* Version überspringen */ } if (!stillWanted()) return null; }
      ds.sort((a, c) => KIND_RANK[a.entry.kind] - KIND_RANK[c.entry.kind]);
      if (!ds.length) continue;
      const nc = ds.length;
      html += `<h3 class="sbook" data-t="${esc(title)}">${esc(title)}${g.heTitle ? ` <small dir="rtl">${esc(g.heTitle)}</small>` : ''} <span class="sup" title="${esc(I18N.t('Zur Übersicht'))}">↑</span></h3><div class="row head" style="--n:${nc}"><div class="lab"></div>${ds.map(d => `<div>${esc(KIND_LABEL[d.entry.kind])} · ${esc(shortVer(d.versionTitle))}</div>`).join('')}</div>`;
      const secs = [...b.secs.values()].sort((x, y) => { for (let i = 0; i < Math.max(x.path.length, y.path.length); i++) { const a = x.path[i], c = y.path[i]; if (a === c) continue; return typeof a === 'number' && typeof c === 'number' ? a - c : String(a).localeCompare(String(c)); } return 0; });
      for (const sc of secs) {
        const cols = ds.map(d => R.flattenNode(R.getByPath(d.text, sc.path)));
        const rows = R.alignRows(cols).filter(r => sc.labels.has(r.label));
        const lab = R.pathLabel(sc.path, ds[0].sectionNames);
        const chm = lab.match(/(\d+[ab]?)$/i), ch = chm ? chm[1] : '';
        const sp = esc(JSON.stringify(sc.path));
        html += `<div class="ssec" data-t="${esc(title)}" data-sp="${sp}">${esc(lab)} <span class="sgo" data-t="${esc(title)}" data-sp="${sp}" title="Dieses Kapitel am ersten Treffer im Lesen öffnen (neuer Tab)">↗</span></div>`
          + rows.map(r => `<div class="row sh" data-t="${esc(title)}" data-sp="${sp}" data-sl="${esc(r.label)}" data-sec="${esc(lab)}" data-ch="${esc(ch)}" style="--n:${nc}"><div class="lab" title="Im Lesen öffnen">${esc(r.label)}${ch && /^\d+$/.test(r.label) ? '<br><span class="scm" title="Kommentare zu diesem Vers">💬</span> <span class="slk" title="Verknüpfungen zu diesem Vers">🔗</span>' : ''}</div>${ds.map((d, i) => cellHtml(r.cells[i], d, sc.hl.get(r.label + '|' + d.entry.rel))).join('')}</div>`).join('');
      }
    }
    return html;
  }
  async function renderSearchRead() {
    const tok = ++sReadTok, out = $('#sOut');
    out.classList.add('sread');
    ['he', 'en', 'de'].forEach(k => out.style.setProperty('--' + k + 'f', disp[k]));
    out.innerHTML = '<p class="muted">Lade Lesetext …</p>';
    const html = await buildReadHtml(sResults, () => tok === sReadTok);
    if (html == null || tok !== sReadTok) return;
    out.innerHTML = html || '<p class="muted">Keine Fundstellen mit Kapitelangabe.</p>';
  }
  $('#sReadBtn').onclick = () => { // alle Treffer als Lesetext in einem neuen Tab im Lesen-Reiter
    if (!lastSearch) return;
    saveScroll();
    const nv = { group: null, sres: { q: lastSearch.query || I18N.t('Grammatik'), limit: 300, html: null, params: { ...lastSearch, limit: undefined, perFile: undefined } } };
    tabs.push(nv); tabIdx = tabs.length - 1; view = nv;
    showTab('read'); showView();
  };
  $('#sOut').addEventListener('click', e => {
    const row = e.target.closest('.row[data-sp]');
    if (!row || e.target.closest('.w, sup, .note, .scm, .slk') || (window.getSelection() + '')) return;
    const g = [...groupsByKey.values()].find(x => x.title === row.dataset.t);
    if (g) openGroup(g, { sectionPath: JSON.parse(row.dataset.sp), rowLabel: row.dataset.sl }, e.metaKey || e.ctrlKey);
  });
  $('#sSum').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c && c.dataset.more) { sSumState.n += 100; renderSum(); return; } if (c) runSearch(c.dataset.t || 'restore'); });
  $('#sExport').onclick = async () => {
    const csv = ['Titel;Version;Sprache;Stelle;Text'].concat(sResults.map(r => [r.title, r.versionTitle, KIND_LABEL[r.kind], r.where, plainSnip(r)].map(x => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(';')));
    const r = await window.api.saveFile(`Suche – ${$('#sq').value.trim().slice(0, 40).replace(/[\\/:*?"<>|]/g, '_')}.csv`, '\ufeff' + csv.join('\r\n'));
    if (r && r.error) alert(r.error);
  };
  // Verlauf (nur selbst abgeschickte Suchen) und Favoriten der Volltextsuche
  let sRecent = lsGet('searchRecent'), sFavs = lsGet('searchFavs');
  const syncSS = () => { sRecent = lsGet('searchRecent'); sFavs = lsGet('searchFavs'); };
  function renderSearchSaved() {
    syncSS();
    const chips2 = (a, fav) => a.length ? a.map((w, i) => `<span class="dchip"><a data-w="${esc(w)}" dir="auto">${esc(w)}</a><button data-rm="${i}" title="Entfernen">✕</button></span>`).join('') : `<span class="muted">${fav ? 'Noch keine Favoriten' : 'Noch keine Suchen'}</span>`;
    $('#sRecentL').innerHTML = chips2(sRecent, false);
    $('#sFavL').innerHTML = chips2(sFavs, true);
    const q = $('#sq').value.trim(), on = !!q && sFavs.includes(q);
    $('#sStar').textContent = on ? '★' : '☆'; $('#sStar').classList.toggle('on', on);
  }
  const manualFind = () => {
    const q = $('#sq').value.trim();
    if (q) { syncSS(); sRecent = [q, ...sRecent.filter(x => x !== q)].slice(0, 30); lsSet('searchRecent', sRecent); }
    renderSearchSaved(); runSearch();
  };
  $('#sStar').onclick = () => {
    const q = $('#sq').value.trim(); if (!q) return;
    syncSS(); sFavs = sFavs.includes(q) ? sFavs.filter(x => x !== q) : [q, ...sFavs];
    lsSet('searchFavs', sFavs); renderSearchSaved();
  };
  $('#sRecentClear').onclick = () => { syncSS(); sRecent = []; lsSet('searchRecent', sRecent); renderSearchSaved(); };
  $('#sSaved').addEventListener('click', e => {
    const rm = e.target.closest('button[data-rm]');
    if (rm) { syncSS(); const fav = !!rm.closest('#sFavL'); const a = fav ? sFavs : sRecent; a.splice(+rm.dataset.rm, 1); lsSet(fav ? 'searchFavs' : 'searchRecent', a); renderSearchSaved(); return; }
    const a = e.target.closest('a[data-w]'); if (a) { $('#sq').value = a.dataset.w; renderSearchSaved(); runSearch(); }
  });
  $('#sq').addEventListener('input', renderSearchSaved);
  // Sprachvorwahl aus der Schrift der Eingabe (nur solange der Nutzer die Haken nicht selbst geändert hat)
  let sKindsManual = false;
  $$('.sk').forEach(c => c.addEventListener('change', e => { if (e.isTrusted) sKindsManual = true; }));
  $('#sq').addEventListener('input', () => {
    if (sKindsManual) return;
    const v = $('#sq').value; if (!/\p{L}/u.test(v)) return;
    const he = /[\u0590-\u05FF]/.test(v), K = k => $(`.sk[data-k="${k}"]`);
    if (he) { K('he').checked = true; ['en', 'de', 'other'].forEach(k => K(k).checked = false); }
    else { K('he').checked = false; if (!['en', 'de', 'other'].some(k => K(k).checked)) { K('en').checked = true; K('de').checked = true; } }
  });
  renderSearchSaved();
  $('#sGo').onclick = manualFind;
  ['#sq', '#sq2', '#sq3'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') manualFind(); }));
  $('#sCancel').onclick = () => O.cancelSearch();
  // Rechtsklick auf ein Suchergebnis: hier öffnen, neuer Tab, zweites Fenster
  $('#sOut').addEventListener('contextmenu', e => {
    const el = e.target.closest('.sres');
    if (!el || (window.getSelection() + '')) return; // bei markiertem Text das normale Menü lassen
    const r = sResults[+el.dataset.i];
    const entry = r && entries.find(x => x.rel === r.rel);
    const g = entry && groupsByKey.get(keyOf(entry));
    if (!g) return;
    const target = { rel: r.rel, sectionPath: r.loc && r.loc.path, rowLabel: r.loc ? r.loc.label : undefined };
    ctxShow(e, [
      { label: 'Öffnen', fn: () => openGroup(g, target, false) },
      { label: 'Im neuen Tab öffnen', fn: () => openGroup(g, target, true) },
      { label: 'Im zweiten Fenster öffnen', fn: () => openInPane2(keyOf(entry), target) },
    ]);
  });
  $('#sOut').addEventListener('click', e => {
    const el = e.target.closest('.sres');
    if (!el) return;
    const r = sResults[+el.dataset.i];
    const entry = entries.find(x => x.rel === r.rel);
    if (!entry) return;
    openGroup(groupsByKey.get(keyOf(entry)), { rel: r.rel, sectionPath: r.loc && r.loc.path, rowLabel: r.loc ? r.loc.label : undefined }, e.metaKey || e.ctrlKey);
  });

  // ---------- Herunterladen ----------
  let summary = [];
  const selCats = new Set();
  const selIds = new Set();
  let planTimer = null;

  const covers = (c, p) => p === c || p.startsWith(c + '/');
  const sel = () => ({ cats: [...selCats], ids: [...selIds] });
  const opts = () => ({ he: $('#oHe').checked, en: $('#oEn').checked, de: $('#oDe').checked, allVersions: $('#oAll').checked });

  async function refreshCatalog() {
    const st = await O.state();
    if (st.catalog) {
      $('#catStatus').textContent = `Katalog vom ${(st.catalog.generated_at || '?').slice(0, 10)} · ${st.catalog.total} Einträge`;
      if (!summary.length) { summary = await O.summary(); renderPicker(); }
      $('#pickCard').hidden = false; $('#goCard').hidden = false;
    } else {
      $('#catStatus').textContent = 'Noch kein Katalog geladen.';
    }
    return st;
  }

  $('#catFetch').onclick = async () => {
    $('#catFetch').disabled = true;
    $('#catStatus').textContent = 'Lade Katalog (ca. 22 MB) …';
    const r = await O.catalogFetch();
    $('#catFetch').disabled = false;
    if (r && r.error) { $('#catStatus').innerHTML = `<span class="err">${esc(r.error)}</span>`; return; }
    summary = [];
    await refreshCatalog();
  };

  const titleRow = (s, showCats) => {
    const flags = [s.he ? 'H' : '', s.en ? 'E' : '', s.de ? 'D' + (s.de > 1 ? '×' + s.de : '') : ''].filter(Boolean).join(' ');
    return `<label class="t"><input type="checkbox" data-id="${s.id}" data-cp="${esc(s.cats.join('/'))}"> ${esc(s.title)}<small>${flags}${showCats ? ' · ' + esc(s.cats.join(' › ')) : ''}</small></label>`;
  };

  function renderPicker() {
    const root = { name: '', path: '', children: new Map(), titles: [], count: 0 };
    for (const s of summary) {
      let n = root, p = '';
      n.count++;
      for (const c of s.cats) {
        p = p ? p + '/' + c : c;
        if (!n.children.has(c)) n.children.set(c, { name: c, path: p, children: new Map(), titles: [], count: 0 });
        n = n.children.get(c);
        n.count++;
      }
      n.titles.push(s);
    }
    const node = n => {
      const kids = SefOrder.sortCats([...n.children.keys()], n.name).map(k => n.children.get(k)).map(node).join('');
      const ts = SefOrder.sortTitles(n.titles).map(s => titleRow(s, false)).join('');
      if (!n.name) return kids + ts;
      return `<details><summary><input type="checkbox" data-cat="${esc(n.path)}"> <span class="catname">${esc(n.name)}</span><small>${n.count} Titel</small></summary>${kids}${ts}</details>`;
    };
    $('#picker').innerHTML = node(root);
    refreshChecks();
  }

  function refreshChecks() {
    $$('#tab-get input[data-cat]').forEach(i => {
      const p = i.dataset.cat;
      const anc = [...selCats].some(c => c !== p && covers(c, p));
      i.disabled = anc;
      i.checked = anc || selCats.has(p);
    });
    $$('#tab-get input[data-id]').forEach(i => {
      const cov = [...selCats].some(c => covers(c, i.dataset.cp));
      i.disabled = cov;
      i.checked = cov || selIds.has(+i.dataset.id);
    });
  }

  function onPick(e) {
    const t = e.target;
    if (t.dataset.cat !== undefined) { if (t.checked) selCats.add(t.dataset.cat); else selCats.delete(t.dataset.cat); }
    else if (t.dataset.id !== undefined) { if (t.checked) selIds.add(+t.dataset.id); else selIds.delete(+t.dataset.id); }
    else return;
    refreshChecks();
    schedulePlan();
  }
  $('#picker').addEventListener('change', onPick);
  $('#flat').addEventListener('change', onPick);
  ['#oHe', '#oEn', '#oDe', '#oAll'].forEach(id => $(id).addEventListener('change', schedulePlan));

  $('#pickClear').onclick = () => { selCats.clear(); selIds.clear(); refreshChecks(); schedulePlan(); };

  let flatMatches = [];
  let filterTimer = null;
  $('#pickFilter').addEventListener('input', () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      const f = $('#pickFilter').value.trim().toLowerCase();
      if (!f) { $('#flat').hidden = true; $('#picker').hidden = false; $('#pickAllHits').hidden = true; return; }
      flatMatches = summary.filter(s => (s.title + ' ' + s.cats.join(' ')).toLowerCase().includes(f));
      $('#flat').innerHTML = flatMatches.slice(0, 400).map(s => titleRow(s, true)).join('') ||
        '<p class="muted">Keine Treffer.</p>';
      if (flatMatches.length > 400) $('#flat').insertAdjacentHTML('beforeend', `<p class="muted">… ${flatMatches.length - 400} weitere Treffer, bitte genauer suchen oder „Alle Treffer auswählen“.</p>`);
      $('#flat').hidden = false; $('#picker').hidden = true;
      $('#pickAllHits').hidden = !flatMatches.length;
      $('#pickAllHits').textContent = `Alle ${flatMatches.length} Treffer auswählen`;
      refreshChecks();
    }, 200);
  });
  $('#pickAllHits').onclick = () => { flatMatches.forEach(s => selIds.add(s.id)); refreshChecks(); schedulePlan(); };

  function schedulePlan() {
    clearTimeout(planTimer);
    planTimer = setTimeout(async () => {
      const p = await O.plan(sel(), opts());
      $('#planInfo').textContent = p.files
        ? `${p.titles} Titel · ${p.files} Dateien · etwa ${fmtEst(p.estimateMB)} (grobe Schätzung)`
        : 'Nichts ausgewählt.';
      $('#dGo').disabled = !p.files;
    }, 200);
  }

  O.onProgress(p => {
    if ($('#uProg') && !$('#uProg').hidden) { $('#uProg').max = p.total || 1; $('#uProg').value = p.done || 0; if (p.current) $('#uInfo').textContent = p.current; }
    const bar = $('#dProg');
    if (p.check) { bar.hidden = false; bar.max = p.total || 1; bar.value = p.done || 0; $('#dInfo').textContent = `Prüfe Dateien … ${p.done || 0} von ${p.total || 0}`; return; } // Update-Prüfung hat keine Byte-Angaben
    bar.hidden = false; bar.max = p.total; bar.value = p.done;
    $('#dInfo').textContent = `${p.done} von ${p.total} · ${fmtSize(p.bytes)}${p.failed ? ' · ' + p.failed + ' Fehler' : ''} · ${p.current}`;
  });

  $('#dGo').onclick = async () => {
    $('#dGo').disabled = true; $('#dCancel').disabled = false;
    $('#dWarn').innerHTML = '';
    $('#dInfo').textContent = 'Starte …';
    const res = await O.download(sel(), opts());
    $('#dCancel').disabled = true; $('#dGo').disabled = false;
    $('#dProg').hidden = true;
    if (res.error) { $('#dInfo').innerHTML = `<span class="err">${esc(res.error)}</span>`; return; }
    $('#dInfo').textContent = `${res.cancelled ? 'Abgebrochen' : 'Fertig'}: ${res.done} von ${res.total} Dateien · ${fmtSize(res.bytes)}.`;
    if (res.failed.length) {
      $('#dWarn').innerHTML = `<p class="err">${res.failed.length} Dateien konnten nicht geladen werden (erneut „Herunterladen“ versucht es noch einmal):</p><ul>${res.failed.slice(0, 20).map(f => `<li>${esc(f.title)} (${esc(f.versionTitle)}): ${esc(f.error)}</li>`).join('')}</ul>`;
    }
    await refreshState();
    await loadLibrary();
  };
  $('#dCancel').onclick = () => O.cancel();

  // ---------- Aktualisieren ----------
  $('#uCheck').onclick = async () => {
    $('#uCheck').disabled = true; $('#uRun').hidden = true; $('#uProg').hidden = false; $('#uProg').value = 0;
    $('#uInfo').textContent = 'Lade Katalog …';
    const r = await O.updateCheck();
    $('#uCheck').disabled = false; $('#uProg').hidden = true;
    if (r.error) { $('#uInfo').innerHTML = `<span class="err">${esc(r.error)}</span>`; return; }
    if (!r.changed && !r.added) { $('#uInfo').textContent = `Alles aktuell (${r.checked} Dateien geprüft).`; return; }
    $('#uInfo').textContent = `${r.changed} geändert, ${r.added} neu (${r.checked} Dateien geprüft).`;
    $('#uRun').hidden = false;
  };
  $('#uRun').onclick = async () => {
    $('#uRun').disabled = true; $('#uCheck').disabled = true; $('#uProg').hidden = false;
    const r = await O.updateRun();
    $('#uRun').disabled = false; $('#uCheck').disabled = false; $('#uProg').hidden = true; $('#uRun').hidden = true;
    if (r.error) { $('#uInfo').innerHTML = `<span class="err">${esc(r.error)}</span>`; return; }
    $('#uInfo').textContent = `${r.cancelled ? 'Abgebrochen' : 'Fertig'}: ${r.done} Dateien geladen${r.failed.length ? `, ${r.failed.length} Fehler` : ''}.`;
    await refreshState(); await loadLibrary();
  };


  // ---------- Anzeigeoptionen ----------
  const DISP0 = { he: 1.3, en: 1, de: 1, niq: false, can: false };
  let disp = { ...DISP0 };
  try { disp = { ...DISP0, ...JSON.parse(localStorage.getItem('disp') || '{}') }; } catch { /* egal */ }
  const stripHe = h => {
    if (disp.can) h = h.replace(/[\u0591-\u05AF\u05BD]/g, '');
    if (disp.niq) h = h.replace(/[\u05B0-\u05BC\u05BF\u05C1\u05C2\u05C7]/g, '');
    return h;
  };
  function applyDisp(rerender) {
    const o = $('#rOut').style;
    o.setProperty('--hef', disp.he); o.setProperty('--enf', disp.en); o.setProperty('--def', disp.de);
    $('#dHe').value = disp.he; $('#dEn').value = disp.en; $('#dDe').value = disp.de;
    $('#dNiq').checked = disp.niq; $('#dCan').checked = disp.can;
    try { localStorage.setItem('disp', JSON.stringify(disp)); } catch { /* egal */ }
    if (rerender && view && view.group) { // Position beim Umschalten behalten: dieselbe Zeile bleibt an derselben Stelle (ohne Vokale sind die Zeilen niedriger, die reine Pixelposition würde springen)
      const top = $('#stick') ? $('#stick').getBoundingClientRect().bottom : 0;
      const row = $$('#rOut .row[data-l]').find(r => r.getBoundingClientRect().bottom > top + 4);
      const label = row ? row.dataset.l : null, off = row ? row.getBoundingClientRect().top : 0, y = window.scrollY;
      renderSection();
      const again = label != null ? $$('#rOut .row[data-l]').find(r => r.dataset.l === label) : null;
      if (again) window.scrollTo(0, window.scrollY + again.getBoundingClientRect().top - off); else window.scrollTo(0, y);
    }
  }
  $('#dispBtn').onclick = () => { $('#dispPanel').hidden = !$('#dispPanel').hidden; };
  $('#dispPanel').addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'dHe') disp.he = +e.target.value;
    if (id === 'dEn') disp.en = +e.target.value;
    if (id === 'dDe') disp.de = +e.target.value;
    if (id === 'dNiq') disp.niq = e.target.checked;
    if (id === 'dCan') disp.can = e.target.checked;
    applyDisp(id === 'dNiq' || id === 'dCan');
  });
  $('#dReset').onclick = () => { disp = { ...DISP0 }; applyDisp(true); };
  document.addEventListener('click', e => {
    if (!$('#dispPanel').hidden && !e.target.closest('#dispPanel') && !e.target.closest('#dispBtn')) $('#dispPanel').hidden = true;
  });
  // Klick außerhalb schließt aufgeklappte Menüs (Versionen, ⋯)
  document.addEventListener('click', e => {
    for (const id of ['#verBox', '#moreMenu']) { const d = $(id); if (d && d.open && !e.target.closest(id)) d.open = false; }
  });
  // Dialoge: ✕ oben rechts; Klick auf den Hintergrund außerhalb schließt Export- und Notizfenster
  for (const dlg of document.querySelectorAll('dialog')) {
    const x = document.createElement('button');
    x.className = 'dclose'; x.type = 'button'; x.textContent = '✕'; x.title = 'Schließen (Esc)';
    x.onclick = () => { if (dlg.id === 'ownDlg') { O.ownClear(); } dlg.close ? dlg.close() : dlg.removeAttribute('open'); };
    dlg.prepend(x);
    if (dlg.id !== 'ownDlg') dlg.addEventListener('mousedown', e => { if (e.target === dlg) dlg.close(); });
  }



  // ---------- Eigenen Text mit der Vorlage vergleichen (Anzahl der Zeilen je Abschnitt) ----------
  const cmpDismissed = new Set(); // ausgeblendete Hinweise (bis zum Neustart der App)
  $('#cmpClose').addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (view && view.cmp) cmpDismissed.add(view.group.key + '|' + view.cmp.ownRel);
    $('#cmpBar').hidden = true;
    $$('#rOut .row.mismatch').forEach(r => r.classList.remove('mismatch'));
    if (view) view.cmp = null;
  });
  function renderCompare() {
    const bar = $('#cmpBar');
    bar.hidden = true;
    if (!view || !view.group) return;
    const own = view.loaded.filter(d => d.entry.own);
    const refs = view.loaded.filter(d => !d.entry.own);
    if (!own.length || !refs.length) return;
    const ref = refs.find(d => d.entry.kind === 'en') || refs.find(d => d.entry.kind === 'he') || refs[0];
    // Hinweis nur direkt nach dem Einbinden zeigen (view.cmpRel wird nur dort gesetzt)
    const o = own.find(d => d.entry.rel === view.cmpRel);
    if (!o) return;
    if (cmpDismissed.has(view.group.key + '|' + o.entry.rel)) { view.cmp = null; return; }
    const diffs = [];
    let total = 0, absent = 0;
    view.sections.forEach((s, i) => {
      const a = R.flattenNode(R.getByPath(o.text, s.path)).map(r => r.label);
      const b = R.flattenNode(R.getByPath(ref.text, s.path)).map(r => r.label);
      if (!a.length && !b.length) return;
      if (!a.length) { absent++; return; } // Abschnitt kommt im eigenen Text gar nicht vor
      total++;
      const sa = new Set(a), sb = new Set(b);
      const missing = b.filter(x => !sa.has(x)), extra = a.filter(x => !sb.has(x));
      if (missing.length || extra.length) diffs.push({ i, label: s.label, own: a.length, ref: b.length, missing, extra });
    });
    bar.hidden = false;
    bar.classList.toggle('bad', diffs.length > 0);
    const short = arr => arr.length > 12 ? arr.slice(0, 12).join(', ') + ` … (+${arr.length - 12})` : arr.join(', ');
    $('#cmpSum').textContent = diffs.length
      ? `${I18N.t('⚠ Eigener Text „{}“ vs. {} {}: {#} von {#} Abschnitten weichen ab', shortVer(o.versionTitle), KIND_LABEL[ref.entry.kind], shortVer(ref.versionTitle), diffs.length, total)}${absent ? ' · ' + I18N.t('{#} Abschnitte fehlen ganz', absent) : ''}`
      : `${I18N.t('✓ Eigener Text „{}“: alle {#} vorhandenen Abschnitte stimmen mit der Zeilenzahl der Vorlage überein', shortVer(o.versionTitle), total)}${absent ? ' · ' + I18N.t('{#} Abschnitte fehlen ganz', absent) : ''}`;
    $('#cmpList').innerHTML = diffs.map(d => `<div><a data-i="${d.i}">${esc(d.label)}</a>: ${I18N.t('eigen {#} / Vorlage {#}', d.own, d.ref)}${d.missing.length ? ` · ${I18N.t('fehlt:')} ${esc(short(d.missing))}` : ''}${d.extra.length ? ` · ${I18N.t('zusätzlich:')} ${esc(short(d.extra))}` : ''}</div>`).join('');
    view.cmp = { ownRel: o.entry.rel, diffs: new Map(diffs.map(d => [d.i, d])) };
    renderWordDiff(o);
  }
  // Wortvergleich des gerade angezeigten Abschnitts: eigener Text gegen eine vorhandene Version derselben Sprache
  function renderWordDiff(o) {
    const box = $('#cmpDiff'); box.innerHTML = '';
    const other = view.loaded.find(d => !d.entry.own && d.entry.kind === o.entry.kind);
    const s = view.sections[view.idx];
    if (!other || !s || !window.DiffLib) return;
    const A = R.flattenNode(R.getByPath(other.text, s.path)), B = new Map(R.flattenNode(R.getByPath(o.text, s.path)).map(r => [r.label, r.html]));
    const parts = [];
    for (const r of A) {
      if (!B.has(r.label)) continue;
      const a = plain(r.html), b = plain(B.get(r.label));
      if (a !== b) parts.push(`<div><b>${esc(r.label)}</b> ${DiffLib.diffHtml(a, b)}</div>`);
    }
    if (parts.length) box.innerHTML = `<p class="muted">Wortvergleich dieses Abschnitts mit „${esc(shortVer(other.versionTitle))}“ (<del class="wd">nur dort</del>, <ins class="wd">nur in deinem Text</ins>):</p>` + parts.slice(0, 60).join('');
  }
  $('#cmpList').addEventListener('click', e => {
    const a = e.target.closest('a[data-i]');
    if (a) { view.idx = +a.dataset.i; renderSection(); }
  });
  function markMismatch() {
    if (!view || !view.cmp) return;
    { const o = view.loaded.find(d => d.entry.rel === view.cmp.ownRel); if (o) renderWordDiff(o); }
    const d = view.cmp.diffs.get(view.idx);
    if (!d) return;
    const bad = new Set([...d.missing, ...d.extra]);
    $$('#rOut .row[data-l]').forEach(r => r.classList.toggle('mismatch', bad.has(r.dataset.l)));
  }

  // ---------- Lesezeichen und Notizen ----------
  const NT = window.notes;
  let notesAll = [];
  const noteTags = n => (Array.isArray(n.tags) ? n.tags : []);
  const kindOf = n => n.kind || 'row'; // 'row' = Lesezeichen an einer Zeile, 'free' = freie Notiz ('hl' = frühere Farbmarkierungen: bleiben in der Datei, werden aber nicht mehr angezeigt)
  const newId = p => p + '|' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const topOrder = () => Math.min(0, ...notesAll.map(n => (n.order == null ? 0 : n.order))) - 1;
  const plain = h => R.cleanHtml(R.splitFootnotes(h).main).replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  // Ältere Notizen ohne hebräischen Text: einmal aus der hebräischen Version nachtragen
  const heTried = new Set();
  async function backfillHe() {
    let changed = false;
    for (const n of notesAll) {
      if (kindOf(n) !== 'row' || n.he || heTried.has(n.id)) continue;
      heTried.add(n.id);
      try {
        const g = groupsByKey.get(n.key); const v = g && g.versions.find(x => x.kind === 'he');
        if (!v) continue;
        let d = cache.get(v.rel); if (!d) { d = await O.read(v.rel); d.__b = v.bytes || 2e6; cache.set(v.rel, d); }
        const row = R.flattenNode(R.getByPath(d.text, JSON.parse(n.sk))).find(r => r.label === n.row);
        const he = row ? plain(row.html).slice(0, 200) : '';
        if (/[\u0590-\u05FF]/.test(he)) { await NT.save({ ...n, he, keepTs: true }); changed = true; }
      } catch { /* egal */ }
    }
    if (changed) { notesAll = await NT.list(); renderNotes(); }
  }
  // Anzeige je Favorit: welche Versionen des Buchs gezeigt werden (Chips, ein Klick schaltet um)
  const ntTxt = new Map(); let ntTimer = null;
  const NV = ['he', 'en', 'de'];
  const noteVers = g => (g ? g.versions.filter(v => NV.includes(v.kind)) : []);
  const defaultVr = vers => { const f = k => vers.find(v => v.kind === k); return [f('he'), f('en') || f('de')].filter(Boolean).map(v => v.rel); };
  async function ensureNoteText(n, rel) {
    const key = n.id + '|' + rel;
    if (ntTxt.has(key)) return;
    ntTxt.set(key, null);
    let txt = '';
    try {
      const v = groupsByKey.get(n.key).versions.find(x => x.rel === rel);
      let d = cache.get(rel); if (!d) { d = await O.read(rel); d.__b = (v && v.bytes) || 2e6; cache.set(rel, d); }
      const all = R.flattenNode(R.getByPath(d.text, JSON.parse(n.sk)));
      if (kindOf(n) === 'block') {
        const want = new Set(n.set || []);
        txt = all.filter(r => { const v = rowVerse(r.label); return !want.size || (v != null && want.has(v)); }).map(r => `${r.label} ${plain(r.html)}`).join('\n').slice(0, 1500);
      } else { const row = all.find(r => r.label === n.row); txt = row ? plain(row.html).slice(0, 400) : ''; }
    } catch { /* egal */ }
    ntTxt.set(key, txt);
    clearTimeout(ntTimer); ntTimer = setTimeout(renderNotes, 60);
  }
  function noteBody(n) {
    const g = groupsByKey.get(n.key), vers = noteVers(g);
    if (!vers.length) return `${n.he ? `<div class="ex he" dir="rtl">${esc(n.he)}</div>` : ''}${n.excerpt ? `<div class="ex">${esc(n.excerpt)}</div>` : ''}`;
    const sel = n.vr || defaultVr(vers);
    const chips = vers.map(v => `<button class="vchip ${v.kind}${sel.includes(v.rel) ? ' on' : ''}" data-vr="${esc(v.rel)}" title="${esc(shortVer(v.versionTitle))}">${KIND_LABEL[v.kind]}<span class="ut"> ${esc(shortVer(v.versionTitle).slice(0, 22))}</span></button>`).join('');
    const body = vers.filter(v => sel.includes(v.rel)).map(v => {
      ensureNoteText(n, v.rel);
      const t = ntTxt.get(n.id + '|' + v.rel);
      if (!t) return '';
      const he = /[\u0590-\u05FF]/.test(t);
      return `<div class="ex${he ? ' he' : ''}" dir="${he ? 'rtl' : 'ltr'}" style="white-space:pre-line">${esc(t)}</div>`;
    }).join('');
    return `<div class="vchips">${chips}</div>${body}`;
  }
  // Notizen-Aufrufe absichern: bei einem Fehler (z. B. beschädigte Datei) wird gemeldet statt still nichts zu tun
  async function ntDo(fn) {
    try { return await fn(); } catch (e) {
      const m = String((e && e.message) || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, '');
      alert(I18N.t('Die Notizen konnten nicht gespeichert werden:') + '\n' + m);
      return null;
    }
  }
  // Gelöscht-Hinweis mit „Rückgängig“
  let undoT = null;
  function showUndo(n, msg) {
    let bar = $('#undoBar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'undoBar'; document.body.appendChild(bar); }
    bar.innerHTML = `<span>${esc(I18N.t(msg || 'Notiz gelöscht'))}</span> <button type="button">${esc(I18N.t('Rückgängig'))}</button>`;
    bar.classList.add('on');
    clearTimeout(undoT); undoT = setTimeout(() => bar.classList.remove('on'), 10000);
    bar.querySelector('button').onclick = async () => {
      bar.classList.remove('on'); clearTimeout(undoT);
      const r = await ntDo(() => NT.save({ ...n, keepTs: true }));
      if (r) { notesAll = r; refreshNotes(); }
    };
  }
  async function removeNote(id) {
    const n = notesAll.find(x => x.id === id);
    const r = await ntDo(() => NT.remove(id));
    if (r) { notesAll = r; refreshNotes(); if (n) showUndo(n); }
  }
  // Cmd/Strg+Z, solange die Rückgängig-Leiste zu sehen ist
  document.addEventListener('keydown', e => {
    const bar = $('#undoBar');
    if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z' || !bar || !bar.classList.contains('on')) return;
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    e.preventDefault(); bar.querySelector('button').click();
  });
  async function loadNotes() { notesAll = await NT.list(); renderNotes(); markNotes(); backfillHe(); }
  function markNotes() {
    { const bl = new Set(notesAll.filter(n => kindOf(n) === 'block').map(n => n.id)); $$('#passOut .pstar').forEach(b => { const on = bl.has(b.dataset.id); b.textContent = on ? '★' : '☆'; b.classList.toggle('on', on); }); }
    if (!view || !view.group) return;
    const s = view.sections[view.idx];
    if (!s) return;
    const blk = new Set(notesAll.filter(n => kindOf(n) === 'block').map(n => n.id));
    const vfs = $('#vfStar');
    if (vfs && view.vf) { const on = blk.has(noteId(view.group, s.k, 'blk:' + fmtVerses([...view.vf.set]))); vfs.textContent = on ? '★' : '☆'; vfs.classList.toggle('on', on); }
    const rowNotes = new Map(notesAll.filter(n => kindOf(n) === 'row').map(n => [n.id, n]));
    $$('#rOut .row[data-l]').forEach(r => {
      const nid = noteId(view.group, s.k, r.dataset.l), nn = rowNotes.get(nid);
      const on = !!nn;
      // der Notiztext steht unter der Zeile (Klick öffnet die Notiz) und als Tooltip am Stern
      let st = r.querySelector(':scope > .rnote');
      if (nn && nn.note) { if (!st) { st = document.createElement('div'); st.className = 'rnote'; r.appendChild(st); } st.textContent = nn.note; st.dataset.id = nid; st.title = I18N.t('Klicken: Notiz bearbeiten'); }
      else if (st) st.remove();
      r.classList.toggle('noted', on);
      const lab = r.querySelector('.lab');
      if (!lab.querySelector('.bm')) lab.insertAdjacentHTML('afterbegin', '<span class="bm" title="Lesezeichen / Notiz">☆</span>');
      const b = lab.querySelector('.bm');
      b.title = nn && nn.note ? nn.note : I18N.t('Lesezeichen / Notiz');
      b.classList.toggle('on', on);
      b.textContent = on ? '★' : '☆';
    });
  }

  // Notiz-Fenster für alle drei Arten
  let editing = null, editingOld = null;
  function openNoteDlg(it, o = {}) {
    editing = it;
    editingOld = notesAll.some(x => x.id === it.id) ? JSON.parse(JSON.stringify(it)) : null; // für „Rückgängig“ beim Überschreiben
    const k = kindOf(it);
    $('#ndTitle').textContent = k === 'free' ? I18N.t('Eigene Notiz') : `${it.title} · ${it.secLabel} · ${k === 'block' ? (it.vs || I18N.t('ganzes Kapitel')) : it.row}`;
    $('#ndExcerpt').textContent = k === 'free' ? '' : [it.he, it.excerpt].filter(Boolean).join('\n');
    $('#ndTitleIn').hidden = k !== 'free';
    $('#ndTitleIn').value = it.title || '';
    $('#ndText').value = it.note || '';
    $('#ndTags').value = noteTags(it).join(', ');
    $('#ndText').placeholder = I18N.t(k === 'row' ? 'Eigene Notiz (leer lassen = nur Lesezeichen)' : 'Notiz');
    $('#ndDel').hidden = !o.canDelete;
    $('#ndDel').textContent = I18N.t(k === 'free' ? 'Notiz entfernen' : 'Lesezeichen entfernen');
    $('#ndClose').textContent = I18N.t(o.optional ? 'Ohne Notiz' : 'Abbrechen');
    $('#noteDlg').showModal();
    (k === 'free' ? $('#ndTitleIn') : $('#ndText')).focus();
  }
  const refreshNotes = () => { markNotes(); renderNotes(); try { if (!$('#mapPanel').hidden) { mapInfo(); mapDraw(); } } catch { /* Karte nicht bereit */ } };
  $('#rOut').addEventListener('click', e => {
    const rn = e.target.closest('.rnote');
    if (rn && !window.getSelection().toString()) { const nn = notesAll.find(x => x.id === rn.dataset.id); if (nn) openNoteDlg(nn, { canDelete: true }); return; }
    const b = e.target.closest('.bm');
    if (!b || !view || !view.group) return;
    const row = b.closest('.row');
    const s = view.sections[view.idx];
    const label = row.dataset.l;
    const id = noteId(view.group, s.k, label);
    const old = notesAll.find(n => n.id === id);
    const cells = [...row.querySelectorAll('.cell .txt')];
    const excerpt = cells.length ? plain(cells[Math.min(1, cells.length - 1)].innerHTML.replace(/<span class="note"[\s\S]*?<\/span><\/span>/g, '')).slice(0, 200) : '';
    const clean = c => plain(c.innerHTML.replace(/<span class="note"[\s\S]*?<\/span><\/span>/g, '')).slice(0, 200);
    const heCell = cells.find(c => /[\u0590-\u05FF]/.test(c.textContent));
    const he = heCell ? clean(heCell) : '';
    if (old && !old.he && he) old.he = he;
    openNoteDlg(old || { id, key: view.group.key, title: view.group.title, sk: s.k, secLabel: s.label, row: label, excerpt, he: he && he !== excerpt ? he : '', note: '', order: topOrder() }, { canDelete: !!old });
  });
  // N im Lesetext: Notiz zur Zeile unter dem Zeiger (oder zur zuletzt gewählten Zeile)
  { let lastRow = null;
    $('#rOut').addEventListener('mouseover', e => { const r = e.target.closest('.row[data-l]'); if (r) lastRow = r; });
    document.addEventListener('keydown', e => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.isComposing) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable || document.querySelector('dialog[open]')) return;
      if (document.documentElement.dataset.tab !== 'read' || !view || !view.group) return;
      const row = lastRow && lastRow.isConnected ? lastRow : $$('#rOut .row[data-l]').find(x => x.dataset.l === cmtRow);
      const b = row && row.querySelector('.lab .bm');
      if (b) { e.preventDefault(); b.click(); }
    });
  }
  $('#ndSave').onclick = async () => {
    editing.note = $('#ndText').value.trim();
    { const tg = [...new Set($('#ndTags').value.split(/[,;]/).map(x => x.trim()).filter(Boolean))]; if (tg.length) editing.tags = tg; else delete editing.tags; }
    if (kindOf(editing) === 'free') {
      editing.title = $('#ndTitleIn').value.trim();
      if (!editing.note && !editing.title) { $('#noteDlg').close(); return; }
    }
    const old = editingOld;
    const r = await ntDo(() => NT.save(editing)); if (!r) return; notesAll = r; $('#noteDlg').close(); refreshNotes();
    if (old && old.note && old.note !== editing.note) showUndo(old, 'Notiz geändert');
  };
  $('#ndDel').onclick = async () => { const id = editing.id; $('#noteDlg').close(); await removeNote(id); };
  $('#ndClose').onclick = () => $('#noteDlg').close();
  // Enter bestätigt die Notiz (Umschalt+Enter = neue Zeile)
  $('#ndText').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#ndSave').click(); } });
  $('#ndTitleIn').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); $('#ndText').focus(); } });
  { const th = $('#uiTheme'); th.value = window.Theme.get(); th.onchange = () => window.Theme.set(th.value); }
  $('#nNew').onclick = () => openNoteDlg({ id: newId('free'), kind: 'free', title: '', note: '', order: topOrder() }, {});

  // Notizen-Reiter: Reihenfolge (manuell per Ziehen oder ▲▼, neueste, nach Farbe, nach Buch) und Farbfilter
  let nfs = 15;
  try { nfs = Math.min(28, Math.max(10, +localStorage.getItem('noteFs') || 15)); } catch { /* egal */ }
  const applyNfs = () => { $('#nOut').style.setProperty('--nfs', nfs + 'px'); try { localStorage.setItem('noteFs', String(nfs)); } catch { /* egal */ } };
  applyNfs();
  $('#nFsMinus').onclick = () => { nfs = Math.max(10, nfs - 1); applyNfs(); };

  // Sichern / Exportieren / Importieren der Notizen und Favoriten
  $('#nIO').onclick = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const items = [
      { label: 'Sicherung speichern (JSON)', fn: () => exportNotes('json') },
      { label: 'Als Markdown speichern', fn: () => exportNotes('md') },
      { label: 'Als Word-Datei speichern', fn: () => exportNotes('doc') },
      { label: 'Als PDF speichern', fn: () => exportNotes('pdf') },
      { sep: true },
      ...[['filtered', 'Nur die angezeigten (gefilterten) Notizen exportieren'], ['noNote', 'Ohne meine Notizen exportieren (Arbeitsblatt)'], ['heOnly', 'Nur Stelle und Hebräisch, ohne Übersetzung']].map(([k, t]) => ({ label: (nExp[k] ? '✓ ' : '\u2003 ') + t, fn: () => { nExp[k] = !nExp[k]; try { localStorage.setItem('nExp', JSON.stringify(nExp)); } catch { /* egal */ } } })),
      { sep: true },
      { label: 'Sicherung einlesen …', fn: importNotes },
    ];
    e.stopPropagation();
    ctxShow({ clientX: r.left, clientY: r.bottom + 2, preventDefault() {} }, items);
  };
  let nExp = {}; // Export-Optionen für Markdown/Word/PDF (nicht für die JSON-Sicherung)
  try { nExp = JSON.parse(localStorage.getItem('nExp') || '{}') || {}; } catch { nExp = {}; }
  const lsArr = k => { try { const a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a.filter(x => typeof x === 'string') : []; } catch { return []; } };
  async function exportNotes(fmt) {
    let list = notesAll.slice().sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || (b.ts || 0) - (a.ts || 0));
    const day = new Date().toISOString().slice(0, 10);
    if (fmt !== 'json') {
      if (nExp.filtered) list = filteredNotes().list;
      if (nExp.noNote) list = list.filter(n => kindOf(n) !== 'free').map(n => ({ ...n, note: '' }));
      if (nExp.heOnly) list = list.map(n => ({ ...n, excerpt: n.he ? '' : n.excerpt }));
      list = list.filter(n => kindOf(n) !== 'hl');
    }
    if (fmt === 'json') {
      await window.api.saveFile(`Safran-Notizen-${day}.json`, JSON.stringify({ app: 'Safran', kind: 'notes', version: 1, exported: new Date().toISOString(), items: list, dictFavs: lsArr('dictFavs'), dictRecent: lsArr('dictRecent'), searchFavs: lsArr('searchFavs'), searchRecent: lsArr('searchRecent') }, null, 1));
      return;
    }
    const day2 = new Date().toLocaleDateString(I18N.loc);
    const whereOf = n => { const k = kindOf(n); return k === 'free' ? '' : [n.title, n.secLabel, k === 'block' ? (n.vs || 'ganzes Kapitel') : n.row].filter(Boolean).join(' · '); };
    if (fmt === 'md') {
      const md = ['# Safran – Notizen und Favoriten', '', `Exportiert am ${day}`, ''];
      for (const n of list) {
        const where = whereOf(n), url = noteUrl(n);
        md.push('## ' + (where ? (url ? `[${where}](${url})` : where) : 'Notiz'), '');
        if (n.he) md.push('> ' + String(n.he).replace(/\n+/g, ' '), '');
        if (n.excerpt) md.push('> ' + String(n.excerpt).replace(/\n+/g, ' '), '');
        if (n.note) md.push(String(n.note), '');
        if (noteTags(n).length) md.push('Tags: ' + noteTags(n).join(', '), '');
        if (n.ts) md.push(`*${new Date(n.ts).toLocaleDateString('de-DE')}*`, '');
      }
      await window.api.saveFile(`Safran-Notizen-${day}.md`, md.join('\n'));
      return;
    }
    // Word / PDF
    const body = list.map(n => {
      const where = whereOf(n), url = noteUrl(n);
      return `<div class="n"><h2>${url ? `<a href="${esc(url)}">${esc(where)}</a>` : esc(where || 'Notiz')}</h2>${n.he ? `<p class="he" dir="rtl">${esc(n.he)}</p>` : ''}${n.excerpt ? `<p class="ex">${esc(n.excerpt)}</p>` : ''}${n.note ? `<p class="nt">${esc(n.note).replace(/\n/g, '<br>')}</p>` : ''}${noteTags(n).length ? `<p class="ex">Tags: ${esc(noteTags(n).join(', '))}</p>` : ''}</div>`;
    }).join('');
    const css = `body{font-family:"Times New Roman",serif;font-size:11pt;line-height:1.45;color:#000}h1{font-size:16pt}h2{font-size:12pt;margin:14pt 0 3pt}h2 a{color:#1a4f9c;text-decoration:none}.he{font-family:"SBL Hebrew","Times New Roman",serif;font-size:14pt;line-height:1.7;margin:2pt 0}.ex{color:#333;margin:2pt 0}.nt{background:#fff6d6;padding:3pt 6pt;margin:3pt 0}.n{page-break-inside:avoid}`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Safran – Notizen</title><style>${css}</style></head><body><h1>Safran – Notizen und Favoriten</h1><p style="font-size:9pt;color:#666">${esc(I18N.t('Exportiert am {}', day2))}</p>${body}</body></html>`;
    const r = await O.exportSave({ html, format: fmt === 'pdf' ? 'pdf' : 'doc', name: `Safran-Notizen-${day}` });
    if (r && r.error) alert(r.error);
  }
  async function importNotes() {
    const f = await window.api.openFile('json'); if (!f) return;
    let j; try { j = JSON.parse(f.text); } catch { j = null; }
    const items = j && Array.isArray(j.items) ? j.items.filter(x => x && typeof x.id === 'string') : null;
    const extra = j && typeof j === 'object' ? ['dictFavs', 'dictRecent', 'searchFavs', 'searchRecent'].filter(k => Array.isArray(j[k]) && j[k].length) : [];
    if ((!items || !items.length) && !extra.length) return alert(I18N.t('Diese Datei ist keine Notizsicherung.'));
    // Vorschau: was würde neu, aktualisiert oder bliebe gleich?
    { const have = new Map(notesAll.map(n => [n.id, n])); let nn = 0, nu = 0, ns = 0; const names = [];
      for (const it of items || []) { const c = have.get(it.id); if (!c) { nn++; if (names.length < 6) names.push([it.title, it.secLabel, it.vs || it.row].filter(Boolean).join(' · ') || I18N.t('Eigene Notiz')); } else if ((it.ts || 0) > (c.ts || 0)) nu++; else ns++; }
      const warn = j && j.app && j.app !== 'Safran' ? I18N.t('Achtung: Die Datei stammt nicht aus Safran.') + '\n\n' : '';
      const msg = warn + I18N.t('Aus der Sicherung: {#} neu, {#} aktualisiert, {#} unverändert.', nn, nu, ns) + (names.length ? '\n\n' + I18N.t('Neu zum Beispiel:') + '\n• ' + names.join('\n• ') : '') + '\n\n' + I18N.t('Zusammenführen? Vorhandene bleiben erhalten, nur ältere Fassungen werden ersetzt.');
      if (!confirm(msg)) return; }
    // gespeicherte Wörter und Suchen: Einträge der Sicherung kommen dazu (ohne Doppelte), die vorhandenen bleiben vorn
    for (const k of extra) { try { const have = lsArr(k), add = j[k].filter(x => typeof x === 'string' && !have.includes(x)); localStorage.setItem(k, JSON.stringify([...have, ...add].slice(0, 200))); } catch { /* egal */ } }
    const r = items && items.length ? await ntDo(() => NT.merge(items)) : { items: notesAll, stat: { added: 0, updated: 0, same: 0 } };
    if (!r) return;
    notesAll = r.items; refreshNotes(); if (typeof renderSaved === 'function') try { renderSaved(); } catch { /* egal */ } if (typeof renderSearchSaved === 'function') try { renderSearchSaved(); } catch { /* egal */ }
    alert(I18N.t('Eingelesen: {#} neu, {#} aktualisiert, {#} unverändert.', r.stat.added, r.stat.updated, r.stat.same));
  }
  $('#nFsPlus').onclick = () => { nfs = Math.min(28, nfs + 1); applyNfs(); };
  let nSort = 'manual';
  try { nSort = localStorage.getItem('nSort') || 'manual'; } catch { /* egal */ }
  $('#nSort').value = nSort;
  $('#nSort').onchange = () => { nSort = $('#nSort').value; try { localStorage.setItem('nSort', nSort); } catch { /* egal */ } renderNotes(); };
  const byManual = (a, b) => ((a.order == null ? Infinity : a.order) - (b.order == null ? Infinity : b.order)) || ((b.ts || 0) - (a.ts || 0));
  const manualAll = () => [...notesAll].sort(byManual);
  // Filter: Text, Art, Tag, „nur mit Notiz“
  let nKind = 'all', nOnly = false, nTag = '';
  const secNum = n => { const m = String(n.secLabel || '').match(/(\d+)([ab])?/); return m ? +m[1] * 2 + (m[2] === 'b' ? 1 : 0) : 0; };
  const noteFilterOn = () => !!($('#nFilter').value.trim() || nKind !== 'all' || nOnly || nTag);
  function filteredNotes() {
    const f = $('#nFilter').value.trim().toLowerCase();
    const shown = notesAll.filter(n => kindOf(n) !== 'hl');
    let list = shown.filter(n => (!f || [n.title, n.secLabel, n.row, n.vs, n.he, n.excerpt, n.note, noteTags(n).join(' ')].join(' ').toLowerCase().includes(f))
      && (nKind === 'all' || kindOf(n) === nKind) && (!nOnly || n.note) && (!nTag || noteTags(n).includes(nTag)));
    if (nSort === 'new') list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    else if (nSort === 'book') list.sort((a, b) => ((kindOf(a) === 'free') - (kindOf(b) === 'free')) || libCmpGroups(groupsByKey.get(a.key) || null, groupsByKey.get(b.key) || null) || String(a.title || '~').localeCompare(String(b.title || '~')) || secNum(a) - secNum(b) || ((rowVerse(a.row) || 0) - (rowVerse(b.row) || 0)) || byManual(a, b));
    else list.sort(byManual);
    return { f, shown, list };
  }
  const escRe = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Text mit hervorgehobenem Suchwort
  const hlTxt = (t, f) => { t = String(t ?? ''); if (!f) return esc(t); return t.split(new RegExp('(' + escRe(f) + ')', 'gi')).map((p, i) => i % 2 ? `<mark>${esc(p)}</mark>` : esc(p)).join(''); };
  // Notiztext: **fett**, *kursiv*, Aufzählungen („- …“) und Stellenangaben („Gen 3:5“, „Psalms 23“) als Link
  const REF_RE = /\b((?:[1-3]\s?)?[A-Z][a-z]+(?:\sof\s[A-Z][a-z]+)?)\.?\s(\d+[ab]?)(?::(\d+(?:\s?[-–]\s?\d+)?(?:,\s?\d+)*))?/;
  const noteRefOk = book => { const b = normT(book); if (b.length < 2) return false; const g = groups.find(x => normT(x.title).startsWith(b) && !/ on /.test(x.title)); return !!g; };
  function ntHtml(text, f) {
    const tok = /(\*\*[^*\n]+\*\*)|(\*[^*\s][^*\n]*\*)|((?:[1-3]\s?)?[A-Z][a-z]+(?:\sof\s[A-Z][a-z]+)?\.?\s\d+[ab]?(?::\d+(?:\s?[-–]\s?\d+)?(?:,\s?\d+)*)?)/g;
    return String(text ?? '').split('\n').map(line => {
      let bullet = '';
      const m = line.match(/^\s*[-•]\s+(.*)$/); if (m) { bullet = '• '; line = m[1]; }
      let out = '', last = 0, x;
      tok.lastIndex = 0;
      while ((x = tok.exec(line))) {
        out += hlTxt(line.slice(last, x.index), f); last = tok.lastIndex;
        if (x[1]) out += `<b>${hlTxt(x[1].slice(2, -2), f)}</b>`;
        else if (x[2]) out += `<i>${hlTxt(x[2].slice(1, -1), f)}</i>`;
        else { const r = x[3].match(REF_RE); out += r && noteRefOk(r[1]) ? `<a class="nref" data-q="${esc(x[3].replace(/\.\s/, ' '))}">${hlTxt(x[3], f)}</a>` : hlTxt(x[3], f); }
      }
      return bullet + out + hlTxt(line.slice(last), f);
    }).join('\n');
  }
  function renderNotes() {
    const { f, shown, list } = filteredNotes();
    const book = nSort === 'book';
    { const nb = new Set(list.filter(n => kindOf(n) !== 'free').map(n => n.title)).size;
      $('#nCount').textContent = book && nb ? I18N.t('{#} von {#} · {#} Bücher', list.length, shown.length, nb) : I18N.t('{#} von {#}', list.length, shown.length); }
    // Tags: Auswahlleiste und Vorschläge im Dialog
    { const cnt = new Map(); shown.forEach(n => noteTags(n).forEach(t => cnt.set(t, (cnt.get(t) || 0) + 1)));
      if (nTag && !cnt.has(nTag)) nTag = '';
      $('#nTags').hidden = !cnt.size;
      $('#nTags').innerHTML = [...cnt.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([t, c]) => `<button class="ntag${t === nTag ? ' on' : ''}" data-tag="${esc(t)}">${esc(t)} <small>${c}</small></button>`).join('');
      $('#ndTagList').innerHTML = [...cnt.keys()].map(t => `<option value="${esc(t)}">`).join(''); }
    const man = nSort === 'manual';
    const dFmt = ts => ts ? new Date(ts).toLocaleDateString(I18N.loc, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const item = n => {
      const k = kindOf(n);
      const head = k === 'free' ? hlTxt(n.title || I18N.t('Eigene Notiz'), f) : `${hlTxt(n.title, f)} · ${hlTxt(n.secLabel, f)} · ${hlTxt(k === 'block' ? (n.vs || I18N.t('ganzes Kapitel')) : n.row, f)}`;
      const g = groupsByKey.get(n.key);
      const tags = noteTags(n);
      const orphan = (k === 'row' || k === 'block') && !noteVers(g).length;
      return `<div class="nitem" data-id="${esc(n.id)}"${man ? ' draggable="true"' : ''}><span class="nbtns">${man ? `<button data-mv="-1" title="Nach oben schieben">▲</button><button data-mv="1" title="Nach unten schieben">▼</button>` : ''}${g && (k === 'row' || k === 'block') ? `<button data-cmt="${esc(n.id)}" title="Kommentare zu dieser Stelle">💬</button>` : ''}<button data-edit="${esc(n.id)}" title="Notiz bearbeiten">✎</button><button data-del="${esc(n.id)}" title="Entfernen">✕</button></span><div class="t">${k === 'row' || k === 'block' ? '☆ ' : k === 'free' ? '✎ ' : ''}<span class="ut">${head}</span>${n.ts ? ` <span class="nts" title="${esc(I18N.t('zuletzt geändert'))}">${esc(dFmt(n.ts))}</span>` : ''}</div>${tags.length ? `<div class="ntags">${tags.map(t => `<button class="ntag${t === nTag ? ' on' : ''}" data-tag="${esc(t)}">${hlTxt(t, f)}</button>`).join('')}</div>` : ''}${k === 'row' || k === 'block' ? noteBody(n) : ''}${orphan ? `<div class="orph muted">${esc(I18N.t('Text nicht geladen – im Reiter „Herunterladen“ laden.'))} <a data-dl="1">${esc(I18N.t('Zum Herunterladen'))}</a></div>` : ''}${n.note ? `<div class="nt">${ntHtml(n.note, f)}</div>` : ''}</div>`;
    };
    let html = '', lastHead = null;
    for (const n of list) {
      if (book) { const h = kindOf(n) === 'free' ? '\u0000free' : `${n.title} · ${n.secLabel}`; if (h !== lastHead) { lastHead = h; html += `<div class="nhead">${h === '\u0000free' ? esc(I18N.t('Eigene Notizen')) : esc(h)}</div>`; } }
      html += item(n);
    }
    $('#nOut').innerHTML = html || (shown.length && noteFilterOn()
      ? `<p class="muted">${esc(I18N.t('Keine Treffer.'))} <button id="nClear">${esc(I18N.t('Filter löschen'))}</button></p>`
      : `<p class="muted">${I18N.t('Noch keine Lesezeichen. Im Lesen-Reiter erscheint beim Überfahren einer Zeile links ein ☆.')}</p>`);
  }
  $('#nKind').onchange = () => { nKind = $('#nKind').value; renderNotes(); };
  $('#nOnly').onchange = () => { nOnly = $('#nOnly').checked; renderNotes(); };
  $('#nTags').addEventListener('click', e => { const b = e.target.closest('button[data-tag]'); if (b) { nTag = nTag === b.dataset.tag ? '' : b.dataset.tag; renderNotes(); } });
  $('#nFilter').addEventListener('input', renderNotes);
  async function moveNote(id, dir, beforeId) {
    const ids = manualAll().map(n => n.id);
    const i = ids.indexOf(id); if (i < 0) return;
    ids.splice(i, 1);
    if (beforeId !== undefined) { const j = beforeId ? ids.indexOf(beforeId) : ids.length; ids.splice(j < 0 ? ids.length : j, 0, id); }
    else ids.splice(Math.max(0, Math.min(ids.length, i + dir)), 0, id);
    { const r = await ntDo(() => NT.reorder(ids)); if (r) notesAll = r; } renderNotes();
  }
  $('#nOut').addEventListener('click', async e => {
    const it = e.target.closest('.nitem');
    const n = it && notesAll.find(x => x.id === it.dataset.id);
    if (e.target.id === 'nClear') { $('#nFilter').value = ''; nKind = 'all'; $('#nKind').value = 'all'; nOnly = false; $('#nOnly').checked = false; nTag = ''; renderNotes(); return; }
    const tg = e.target.closest('button[data-tag]');
    if (tg) { nTag = nTag === tg.dataset.tag ? '' : tg.dataset.tag; renderNotes(); return; }
    const rf = e.target.closest('a.nref');
    if (rf) { e.preventDefault(); showTab('read'); await jumpTo(rf.dataset.q, e.metaKey || e.ctrlKey); return; }
    if (e.target.closest('a[data-dl]')) { showTab('get'); return; }
    const cm = e.target.closest('button[data-cmt]');
    if (cm) {
      const nn = notesAll.find(x => x.id === cm.dataset.cmt), gg = nn && groupsByKey.get(nn.key);
      if (gg) { await openGroup(gg, { sectionPath: JSON.parse(nn.sk), rowLabel: nn.row }); setCmtRow(nn.row); toggleCmt(true); }
      return;
    }
    const d = e.target.closest('button[data-del]');
    if (d) { await removeNote(d.dataset.del); return; }
    const mv = e.target.closest('button[data-mv]');
    if (mv && n) { await moveNote(n.id, +mv.dataset.mv); return; }
    const vb = e.target.closest('button[data-vr]');
    if (vb && n) {
      const vers = noteVers(groupsByKey.get(n.key));
      const cur = new Set(n.vr || defaultVr(vers)); const rel = vb.dataset.vr;
      if (cur.has(rel)) cur.delete(rel); else cur.add(rel);
      n.vr = vers.filter(v => cur.has(v.rel)).map(v => v.rel);
      { const r = await ntDo(() => NT.save({ ...n, keepTs: true })); if (r) notesAll = r; } renderNotes(); return;
    }
    if (e.target.closest('button[data-edit]') && n) { openNoteDlg(n, { canDelete: true }); return; }
    if (!n) return;
    if (e.target.closest('.ex, .nt')) return; // Text anklicken/markieren springt nicht; nur Titel und Rand öffnen die Stelle
    if (kindOf(n) === 'free') { openNoteDlg(n, { canDelete: true }); return; }
    const g = groupsByKey.get(n.key);
    if (g) {
      await openGroup(g, { sectionPath: JSON.parse(n.sk), rowLabel: n.row }, e.metaKey || e.ctrlKey);
      if (kindOf(n) === 'block' && n.set && n.set.length && view && view.group === g) { view.vf = { k: view.sections[view.idx].k, set: new Set(n.set), text: String(view.sections[view.idx].label || '').replace(/^\D+/, '') + ':' + n.vs }; renderSection(n.row); }
    }
  });
  let dragId = null;
  $('#nOut').addEventListener('mousedown', e => { const it = e.target.closest('.nitem[draggable]'); if (it) it.draggable = !e.target.closest('.ex, .nt'); }); // Text lässt sich markieren, ohne dass die Karte gezogen wird
  $('#nOut').addEventListener('dragstart', e => { const it = e.target.closest('.nitem'); if (!it) return; dragId = it.dataset.id; it.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch { /* egal */ } });
  $('#nOut').addEventListener('dragend', () => { dragId = null; $$('#nOut .dragging, #nOut .dragover').forEach(x => x.classList.remove('dragging', 'dragover')); });
  $('#nOut').addEventListener('dragover', e => { if (!dragId) return; e.preventDefault(); $$('#nOut .dragover').forEach(x => x.classList.remove('dragover')); const it = e.target.closest('.nitem'); if (it && it.dataset.id !== dragId) it.classList.add('dragover'); });
  $('#nOut').addEventListener('drop', async e => {
    if (!dragId) return; e.preventDefault();
    const it = e.target.closest('.nitem'); const id = dragId; dragId = null;
    await moveNote(id, 0, it ? it.dataset.id : null);
  });
  window.addEventListener('focus', () => { loadNotes().catch(() => {}); }); // Änderungen aus dem anderen Fenster übernehmen

  // ---------- Export (PDF / Word) ----------
  $('#expBtn').onclick = () => {
    if (!view || !view.group) return;
    const s = view.sections[view.idx];
    $('#expWhat').textContent = `${view.group.title} · ${s ? s.label : ''} – ${view.loaded.length} Spalte(n)`;
    $('#expMsg').textContent = '';
    $('#expDlg').showModal();
  };
  $('#expClose').onclick = () => $('#expDlg').close();
  $('#expGo').onclick = async () => {
    const html = buildExportHtml({
      from: $('#expFrom').value.trim(), to: $('#expTo').value.trim(),
      fn: $('#expFn').checked, notes: $('#expNotes').checked, links: $('#expLinks').checked,
    });
    const s = view.sections[view.idx];
    const name = `${view.group.title} ${s ? s.label : ''}`.replace(/[\\/:*?"<>|]+/g, '_').trim();
    const r = await O.exportSave({ html, format: $('#expFmt').value, name, landscape: view.loaded.length >= 3 });
    if (r && r.error) { $('#expMsg').textContent = '⚠ ' + r.error; return; }
    if (r && r.path) $('#expDlg').close();
  };
  function buildExportHtml(o) {
    const s = view.sections[view.idx];
    const cols = view.loaded.map(d => R.flattenNode(R.getByPath(d.text, s.path)));
    let rows = R.alignRows(cols);
    if (o.from || o.to) {
      const a = o.from ? rows.findIndex(r => r.label === o.from) : 0;
      let b = o.to ? rows.findIndex(r => r.label === o.to) : rows.length - 1;
      if (b < 0) b = rows.length - 1;
      rows = rows.slice(Math.max(0, a), b + 1);
    }
    const notesById = new Map(notesAll.map(n => [n.id, n]));
    const endnotes = [];
    const cell = (h, d) => {
      if (h == null) return '<td></td>';
      if (d.entry.kind === 'he') h = stripHe(h);
      const sp = R.splitFootnotes(h);
      let main = R.cleanHtml(sp.main);
      main = main.replace(/<sup data-fn="(\d{1,4})">.*?<\/sup>/g, (m, i) => {
        if (!o.fn || !sp.notes[+i]) return '';
        endnotes.push(R.cleanHtml(sp.notes[+i].html));
        return `<sup>${endnotes.length}</sup>`;
      });
      return `<td dir="${d.entry.language === 'Hebrew' || d.entry.language === 'Aramaic' ? 'rtl' : 'ltr'}" class="k-${d.entry.kind}">${main}</td>`;
    };
    const body = rows.map(r => {
      let extra = '';
      const v = verseOf(r.label);
      if (o.notes) { const n = notesById.get(noteId(view.group, s.k, r.label)); if (n && n.note) extra += `<div class="nt">${I18N.t('Notiz:')} ${esc(n.note)}</div>`; }
      if (o.links && v != null) {
        const ls = secLinks.filter(x => x.v1 > 0 && v >= x.v1 && v <= x.v2).map(x => x.other);
        if (ls.length) extra += `<div class="lk">${I18N.t('Verknüpfungen:')} ${esc(ls.slice(0, 30).join('; '))}${ls.length > 30 ? ` … (+${ls.length - 30})` : ''}</div>`;
      }
      return `<tr><td class="lab">${esc(r.label)}</td>${r.cells.map((c, i) => cell(c, view.loaded[i])).join('')}</tr>${extra ? `<tr><td></td><td colspan="${view.loaded.length}">${extra}</td></tr>` : ''}`;
    }).join('');
    const head = `<tr><th></th>${view.loaded.map(d => `<th>${esc(I18N.tr(KIND_LABEL[d.entry.kind]))} · ${esc(shortVer(d.versionTitle))}</th>`).join('')}</tr>`;
    const src = view.loaded.map(d => `<li>${esc(I18N.tr(KIND_LABEL[d.entry.kind]))}: ${esc(d.versionTitle === 'merged' ? I18N.tr('zusammengeführte Fassung') : d.versionTitle)}${d.versionSource ? ' – ' + esc(d.versionSource) : ''}</li>`).join('');
    const css = `body{font-family:"SBL Hebrew","Times New Roman",serif;font-size:11pt;line-height:1.5;color:#000}
h1{font-size:16pt;margin:0 0 4pt}h1 small{font-size:12pt;color:#555}
table{border-collapse:collapse;width:100%;table-layout:fixed}th{font-size:9pt;text-align:left;color:#555;border-bottom:1px solid #999;padding:3pt}
td{vertical-align:top;padding:4pt;border-bottom:1px solid #ddd}td.lab{width:28pt;font-size:8pt;color:#777}
td.k-he{font-size:14pt;line-height:1.8}.nt{background:#fff6d6;padding:2pt 5pt;font-size:9pt}.lk{font-size:8pt;color:#555}
ol.fn{font-size:9pt}ul.src{font-size:8pt;color:#555}tr{page-break-inside:avoid}`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(view.group.title)}</title><style>${css}</style></head><body>
<h1>${esc(view.group.title)}${view.group.heTitle ? ` <small dir="rtl">${esc(view.group.heTitle)}</small>` : ''} · ${esc(s.label)}</h1>
<table><thead>${head}</thead><tbody>${body}</tbody></table>
${endnotes.length ? `<h3>${I18N.t('Fußnoten')}</h3><ol class="fn">${endnotes.map(n => `<li>${n}</li>`).join('')}</ol>` : ''}
<ul class="src">${src}</ul><p class="src" style="font-size:8pt;color:#777">${I18N.t('Quelle: Sefaria (sefaria.org), Export vom {}', new Date().toLocaleDateString(I18N.loc))}</p></body></html>`;
  }


  let cmtTimer = null, lastCmtKey = '';
  function applyCmtRowSoon() { clearTimeout(cmtTimer); cmtTimer = setTimeout(() => { if (cmtOpen) applyCmtRow(); }, 0); }
  // ---------- Kommentar-Bereich: Kommentare zum gewählten Vers direkt untereinander ----------
  // Kommentarleiste: Breite (Strich am linken Rand ziehen) und Textgröße (A−/A+) werden gemerkt
  {
    const rt = document.documentElement;
    let cw = 400, cfs = 14;
    try { cw = +localStorage.getItem('cmtW') || 400; cfs = +localStorage.getItem('cmtFs') || 14; } catch { /* egal */ }
    const clampW = w => Math.round(Math.min(Math.max(280, w), window.innerWidth * 0.8));
    const applyCw = () => { rt.style.setProperty('--cmt-w', clampW(cw) + 'px'); };
    const applyCfs = () => { rt.style.setProperty('--cmt-fs', cfs + 'px'); try { localStorage.setItem('cmtFs', String(cfs)); } catch { /* egal */ } };
    applyCw(); applyCfs();
    $('#cmtFsMinus').onclick = () => { cfs = Math.max(10, cfs - 1); applyCfs(); };
    $('#cmtFsPlus').onclick = () => { cfs = Math.min(28, cfs + 1); applyCfs(); };
    $('#cmtResize').addEventListener('mousedown', ev => {
      ev.preventDefault(); rt.classList.add('cmt-dragging');
      const off = IS_PANE2 ? 0 : (rt.classList.contains('split') ? window.innerWidth * (parseFloat(getComputedStyle(rt).getPropertyValue('--p2w')) / 100) : 0);
      const mv = e2 => { cw = clampW(window.innerWidth - off - e2.clientX); applyCw(); };
      const up = () => { rt.classList.remove('cmt-dragging'); document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); try { localStorage.setItem('cmtW', String(cw)); } catch { /* egal */ } };
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
    });
    $('#cmtResize').addEventListener('dblclick', () => { cw = 400; applyCw(); try { localStorage.setItem('cmtW', '400'); } catch { /* egal */ } });
    window.setPanelW = w => { cw = clampW(w); applyCw(); try { localStorage.setItem('cmtW', String(cw)); } catch { /* egal */ } };
    window.addEventListener('resize', applyCw);
  }
  let cmtOpen = false, cmtRow = null, cmtToken = 0;
  let cmtTouched = false, cmtLastChosen = [];
  try { cmtTouched = localStorage.getItem('cmtTouched') === '1'; } catch { /* egal */ }
  let cmtChipsOpen = false;
  try { cmtChipsOpen = localStorage.getItem('cmtChipsOpen') === '1'; } catch { /* egal */ }
  let cmtSel = new Set();
  let cmtLang = 'en';
  try { cmtSel = new Set(JSON.parse(localStorage.getItem('cmtSel') || '[]')); cmtLang = localStorage.getItem('cmtLang') || 'en'; } catch { /* egal */ }
  if (!['en', 'de', 'he'].includes(cmtLang)) cmtLang = 'en';
  $('#cmtLang').value = cmtLang;
  // „Alle“ ist jetzt ein eigener Zustand (früher bedeutete eine leere Auswahl „alle“); ältere Einstellungen werden übernommen
  let cmtAll = false;
  try { const a = localStorage.getItem('cmtAll'); cmtAll = a === '1' || (a == null && cmtTouched && cmtSel.size === 0); } catch { /* egal */ }
  let cmtFilterV = '', cmtAvailNames = [];
  const cmtClosed = new Set(); // eingeklappte Kommentare (nur in dieser Sitzung)
  const dispName = n => String(n).replace(/, [^,]+$/, ''); // „Bekhor Shor, Genesis“ → „Bekhor Shor“
  const CMT_PRIO = ['Rashi', 'Ibn Ezra', 'Ramban', 'Rashbam', 'Sforno', 'Or HaChaim', 'Chizkuni', 'Radak', 'Kli Yakar', 'Bekhor Shor', 'Onkelos'];
  // Die Kommentar-Auswahl wird pro Sprache gemerkt (z. B. Deutsch: Hirsch, Englisch: etwas anderes) und beim Umschalten der Sprache wiederhergestellt
  let cmtByLang = {};
  try { cmtByLang = JSON.parse(localStorage.getItem('cmtByLang') || '{}') || {}; } catch { cmtByLang = {}; }
  if (!cmtByLang[cmtLang]) cmtByLang[cmtLang] = { sel: [...cmtSel], all: cmtAll, touched: cmtTouched }; // bisherige Einstellung gilt für die zuletzt benutzte Sprache
  else { const s0 = cmtByLang[cmtLang]; cmtSel = new Set(s0.sel || []); cmtAll = !!s0.all; cmtTouched = !!s0.touched; }
  const saveCmt = () => { try {
    cmtByLang[cmtLang] = { sel: [...cmtSel], all: cmtAll, touched: cmtTouched };
    localStorage.setItem('cmtByLang', JSON.stringify(cmtByLang));
    localStorage.setItem('cmtSel', JSON.stringify([...cmtSel])); localStorage.setItem('cmtLang', cmtLang); localStorage.setItem('cmtAll', cmtAll ? '1' : '0');
  } catch { /* egal */ } };
  function setCmtRow(label) {
    cmtRow = label;
    $$('#rOut .row.cmtrow').forEach(r => r.classList.remove('cmtrow'));
    const r = $$('#rOut .row[data-l]').find(x => x.dataset.l === label);
    if (r) r.classList.add('cmtrow');
    if (cmtOpen) renderCmt();
  }
  function applyCmtRow() {
    const rows = $$('#rOut .row[data-l]');
    let r = rows.find(x => x.dataset.l === cmtRow) || $('#rOut .row.hit') || rows.find(x => rowVerse(x.dataset.l) != null);
    if (r) setCmtRow(r.dataset.l); else if (cmtOpen) renderCmt();
  }
  function toggleCmt(force) {
    withAnchor(() => toggleCmt0(force));
  }
  function toggleCmt0(force) {
    cmtOpen = force == null ? !cmtOpen : force;
    $('#cmtPanel').hidden = !cmtOpen;
    document.body.classList.toggle('cmt-open', cmtOpen);
    $('#cmtResize').hidden = !(cmtOpen || (typeof dictOpen !== 'undefined' && dictOpen));
    $('#cmtBtn').classList.toggle('active', cmtOpen);
    if (cmtOpen) applyCmtRow();
  }
  $('#cmtBtn').onclick = () => toggleCmt();
  $('#cmtClose').onclick = () => toggleCmt(false);
  // ---------- Fenster anpinnen: neben dem Text festhalten statt darüber zu schweben ----------
  // Je Fenster wird gemerkt, ob es angepinnt ist. Ein angepinntes Fenster steht rechts neben dem Haupttext; öffnet ein zweites angepinntes Fenster, tritt es an die Stelle des ersten
  // (Ausnahme: Kommentare und Wörterbuch dürfen untereinander stehen). Nicht angepinnte Fenster schweben wie bisher über dem Text.
  const PINS = { link: ['#linkPanel', '#lkClose'], topic: ['#topicPanel', '#tpClose'], outline: ['#outlinePanel', '#olClose'], map: ['#mapPanel', '#mapClose'], cmt: ['#cmtPanel', '#cmtClose'], dict: ['#dictPanel', '#dictClose'] };
  const pins = { link: false, topic: false, outline: false, map: false, cmt: true, dict: true };
  try { const o = JSON.parse(localStorage.getItem('pins') || '{}'); for (const k in pins) if (typeof o[k] === 'boolean') pins[k] = o[k]; } catch { /* egal */ }
  const pinPair = (a, b) => (a === 'cmt' || a === 'dict') && (b === 'cmt' || b === 'dict');
  let pinBusy = false;
  function pinSync(anchor) {
    if (pinBusy) return; pinBusy = true;
    try {
      const was = {}, now = {};
      for (const k in PINS) { const el = $(PINS[k][0]); was[k] = el.classList.contains('docked'); now[k] = !el.hidden && pins[k]; }
      const fresh = Object.keys(PINS).filter(k => now[k] && !was[k]);
      for (const k of fresh) for (const o in PINS) if (o !== k && now[o] && !pinPair(k, o) && !fresh.includes(o)) { now[o] = false; $(PINS[o][1]).click(); } // das bisherige angepinnte Fenster schließen
      const apply = () => {
        for (const k in PINS) { const el = $(PINS[k][0]); el.classList.toggle('docked', now[k] && !el.hidden); const b = el.querySelector('.pinB'); if (b) { b.classList.toggle('on', pins[k]); b.title = I18N.t(pins[k] ? 'Lösen: über dem Text schweben' : 'Anpinnen: neben dem Text festhalten'); } }
        const any = Object.keys(PINS).some(k => $(PINS[k][0]).classList.contains('docked'));
        document.body.classList.toggle('dock-open', any);
        let w = 0; for (const k in PINS) { const el = $(PINS[k][0]); if (el.classList.contains('docked')) w = Math.max(w, el.getBoundingClientRect().width); }
        document.documentElement.style.setProperty('--dock-w', w ? w + 'px' : '');
      };
      const changed = Object.keys(PINS).some(k => (now[k] && !$(PINS[k][0]).hidden) !== was[k]);
      if (changed && anchor !== false) withAnchor(apply); else apply();
      window.dispatchEvent(new Event('resize'));
    } finally { pinBusy = false; }
  }
  for (const k in PINS) {
    const el = $(PINS[k][0]), cl = $(PINS[k][1]); if (!el || !cl) continue;
    const b = document.createElement('button'); b.className = 'pinB'; b.type = 'button'; b.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16v6" fill="none"/><path d="M9 3h6l-1 6.5 3.2 3.2V15H6.8v-2.3L10 9.5z"/></svg>';
    b.onclick = e => { e.stopPropagation(); pins[k] = !pins[k]; try { localStorage.setItem('pins', JSON.stringify(pins)); } catch { /* egal */ } pinSync(); };
    cl.before(b);
    el.classList.add('pinp');
    new MutationObserver(() => pinSync()).observe(el, { attributes: true, attributeFilter: ['hidden'] });
    if (window.ResizeObserver) new ResizeObserver(() => { if (el.classList.contains('docked')) { let w = 0; for (const o in PINS) { const e2 = $(PINS[o][0]); if (e2.classList.contains('docked')) w = Math.max(w, e2.getBoundingClientRect().width); } document.documentElement.style.setProperty('--dock-w', w ? w + 'px' : ''); } }).observe(el);
  }
  pinSync(false);
  // nicht angepinnte Kommentare/Wörterbuch schließen beim Klick außerhalb (wie die anderen schwebenden Fenster)
  document.addEventListener('mousedown', e => {
    if (!e.target.closest || document.documentElement.dataset.tab === 'dict') return;
    if (e.target.closest('#cmtPanel, #dictPanel, #cmtBtn, #cmtResize, #rOut .lab, #suggest, #audioBar, #ctxMenu, #lkHover, #tip, #undoBar, dialog')) return;
    for (const k of ['cmt', 'dict']) { const el = $(PINS[k][0]); if (!el.hidden && !el.classList.contains('docked')) $(PINS[k][1]).click(); }
  });
  $('#cmtLang').onchange = () => {
    saveCmt(); // Auswahl der bisherigen Sprache sichern
    cmtLang = $('#cmtLang').value;
    const s0 = cmtByLang[cmtLang] || { sel: [], all: false, touched: false };
    cmtSel = new Set(s0.sel || []); cmtAll = !!s0.all; cmtTouched = !!s0.touched; cmtLastChosen = [];
    saveCmt(); renderCmt();
  };
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); toggleCmt(); } });
  function stepCmt(d) {
    const rows = $$('#rOut .row[data-l]').filter(x => rowVerse(x.dataset.l) != null);
    const i = rows.findIndex(x => x.dataset.l === cmtRow);
    const n = rows[Math.min(rows.length - 1, Math.max(0, (i < 0 ? 0 : i) + d))];
    if (n) { setCmtRow(n.dataset.l); panelScrollTo(n, 'center'); }
  }
  // j / k: nächster / vorheriger Vers im Kommentar-Bereich (nur wenn kein Eingabefeld den Fokus hat)
  document.addEventListener('keydown', e => {
    if (!cmtOpen || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
    const tg = (e.target.tagName || '').toLowerCase();
    if (tg === 'input' || tg === 'textarea' || tg === 'select' || e.target.isContentEditable) return;
    if (e.key === 'j') stepCmt(1); else if (e.key === 'k') stepCmt(-1);
  });
  $('#cmtPrev').onclick = () => stepCmt(-1);
  $('#cmtNext').onclick = () => stepCmt(1);
  // Klick auf die Versnummer wählt den Vers für den Kommentar-Bereich
  $('#rOut').addEventListener('click', e => {
    const lab = e.target.closest('.lab');
    if (!lab || e.target.closest('.bm') || e.target.closest('.lk')) return;
    const row = lab.closest('.row[data-l]');
    if (row) { setCmtRow(row.dataset.l); if (!cmtOpen) toggleCmt(true); } // ein Klick auf den Vers öffnet die Kommentare
  });
  // Doppelklick auf die Versnummer öffnet den Kommentar-Bereich, derselbe Vers noch einmal schließt ihn
  let lastCmtDbl = null;
  $('#rOut').addEventListener('dblclick', e => {
    const lab = e.target.closest('.lab');
    if (!lab || e.target.closest('.bm') || e.target.closest('.lk')) return;
    const row = lab.closest('.row[data-l]');
    if (!row) return;
    const key = (view && view.group ? view.group.key : '') + '|' + (view ? view.key : '') + '|' + row.dataset.l;
    if (cmtOpen && lastCmtDbl === key) { toggleCmt(false); lastCmtDbl = null; return; }
    lastCmtDbl = key;
    setCmtRow(row.dataset.l);
    if (!cmtOpen) toggleCmt(true);
  });
  $('#rOut').addEventListener('click', e => {
    if (!view) return;
    if (e.target.id === 'vfClear') { view.vf = null; renderSection(); }
    else if (e.target.id === 'vfStar' && view.vf) {
      const sc = view.sections[view.idx];
      toggleBlock({ key: view.group.key, title: view.group.title, sk: sc.k, secLabel: sc.label, set: [...view.vf.set].sort((a, b) => a - b), vs: fmtVerses([...view.vf.set]) });
    }
  });
  $('#cmtSum').onclick = () => {
    cmtChipsOpen = !cmtChipsOpen;
    try { localStorage.setItem('cmtChipsOpen', cmtChipsOpen ? '1' : '0'); } catch { /* egal */ }
    renderCmt();
  };
  $('#cmtChips').addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (!c || c.classList.contains('off')) return;
    const n = c.dataset.n;
    cmtTouch();
    if (cmtAll) { cmtAll = false; cmtSel = new Set(cmtAvailNames); }
    if (cmtSel.has(n)) cmtSel.delete(n); else cmtSel.add(n);
    saveCmt(); renderCmt();
  });
  function cmtTouch() { if (!cmtTouched) { cmtTouched = true; cmtSel = new Set(cmtLastChosen); try { localStorage.setItem('cmtTouched', '1'); } catch { /* egal */ } } }
  // Schnellauswahl: Alle / Keine / Klassische; Filterfeld für die Namen
  $('#cmtChips').addEventListener('click', e => {
    const q = e.target.closest('button[data-q]');
    if (!q) return;
    cmtTouch();
    if (q.dataset.q === 'all') { cmtAll = true; cmtSel = new Set(); }
    else if (q.dataset.q === 'none') { cmtAll = false; cmtSel = new Set(); }
    else { cmtAll = false; cmtSel = new Set(cmtAvailNames.filter(n => CMT_PRIO.includes(n))); }
    saveCmt(); renderCmt();
  });
  const applyCmtFilter = () => {
    const f = cmtFilterV.trim().toLowerCase();
    $$('#cmtChips .chip').forEach(c => { c.hidden = !!f && !c.dataset.n.toLowerCase().includes(f); });
  };
  $('#cmtChips').addEventListener('input', e => { if (e.target.id === 'cmtFilter') { cmtFilterV = e.target.value; applyCmtFilter(); } });
  // Höhe des festen Kopfes merken, damit die Kommentatornamen darunter hängen bleiben
  try { new ResizeObserver(() => $('#cmtPanel').style.setProperty('--cmt-head-h', $('#cmtHead').offsetHeight + 'px')).observe($('#cmtHead')); } catch { /* egal */ }
  // Rechtsklick auf einen Kommentatornamen: im Tab, neuen Tab oder zweiten Fenster öffnen
  $('#cmtBody').addEventListener('contextmenu', e => {
    const h = e.target.closest('h4[data-ref]');
    const items = [];
    const selTxt = (window.getSelection() + '').trim();
    if (h) {
      const ref = h.dataset.ref.replace(/-.*$/, '');
      items.push({ label: 'Öffnen', fn: () => jumpTo(ref, false) }, { label: 'Im neuen Tab öffnen', fn: () => jumpTo(ref, true) });
      if (!IS_PANE2) items.push({ label: 'Im zweiten Fenster öffnen', fn: () => openInPane2(null, { jump: ref }) });
    }
    if (selTxt) items.push({ label: I18N.t('Kopieren'), fn: () => navigator.clipboard.writeText(selTxt).catch(() => {}) });
    // eine Zeile pro angezeigtem Kommentar: springt dorthin (klappt ihn bei Bedarf auf)
    const cs = [...$$('#cmtBody .cmt')];
    if (cs.length) {
      if (items.length) items.push({ sep: true });
      cs.forEach(c => items.push({ label: (c.classList.contains('closed') ? '▸ ' : '') + c.querySelector('h4').textContent.replace(/[▾▸↗]/g, '').trim(), fn: () => { c.classList.remove('closed'); cmtClosed.delete(c.dataset.n); const t = c.querySelector('.tg'); if (t) t.textContent = '▾'; panelScrollTo(c, 'start'); } }));
    }
    if (!items.length) return;
    ctxShow(e, items);
  });
  $('#cmtBody').addEventListener('click', e => {
    const jl = e.target.closest('a.jl');
    if (jl) { const t = [...$$('#cmtBody .cmt')].find(x => x.dataset.n === jl.dataset.n); if (t) { t.classList.remove('closed'); cmtClosed.delete(jl.dataset.n); panelScrollTo(t, 'start'); } return; }
    const h = e.target.closest('h4[data-ref]');
    if (!h) return;
    if (e.target.closest('.go')) return jumpTo(h.dataset.ref.replace(/-.*$/, ''), true);
    const c = h.closest('.cmt'); if (!c) return; // Klick auf den Namen klappt diesen Kommentar ein/aus
    const closed = c.classList.toggle('closed');
    if (closed) cmtClosed.add(c.dataset.n); else cmtClosed.delete(c.dataset.n);
    h.querySelector('.tg').textContent = closed ? '▸' : '▾';
  });
  async function renderCmt() {
    if (!cmtOpen) return;
    const token = ++cmtToken;
    const virt = view && view.sres ? cmtVirt : null; // Suchtab: Stelle kommt aus der angeklickten Trefferzeile
    const s = virt ? { label: virt.label } : (view && view.group && view.sections[view.idx]);
    const v = rowVerse(cmtRow);
    $('#cmtTitle').textContent = s && v != null ? `Kommentare zu ${virt ? virt.title : view.group.title} ${s.label.replace(/^\D+/, '')}:${cmtRow}` : 'Kommentare';
    if (!s) { $('#cmtChips').innerHTML = ''; $('#cmtSum').innerHTML = ''; $('#cmtBody').innerHTML = '<p class="muted">Öffne ein Buch.</p>'; return; }
    if (!linksReady) { $('#cmtChips').innerHTML = ''; $('#cmtSum').innerHTML = ''; $('#cmtBody').innerHTML = '<p class="muted">Dafür werden die Verknüpfungen gebraucht: Reiter „Herunterladen“ → Karte „4 · Verknüpfungen“.</p>'; return; }
    if (v == null) { $('#cmtChips').innerHTML = ''; $('#cmtSum').innerHTML = ''; $('#cmtBody').innerHTML = '<p class="muted">Klicke links bei einer Zeile auf die Versnummer.</p>'; return; }
    // Kommentare zu diesem Vers, nach Kommentator gruppiert
    const groupsC = new Map();
    for (const x of secLinks) {
      if (x.type !== 'commentary' || !(x.v1 > 0 && v >= x.v1 && v <= x.v2)) continue;
      const book = splitOther(x.other);
      const name = book.replace(/ on .*$/i, '');
      if (!groupsC.has(name)) groupsC.set(name, { name, book, refs: [] });
      groupsC.get(name).refs.push(x.other);
    }
    const local0 = localTitles(); const local = { has: b => local0.has(b) || local0.has(String(b).split(', ')[0]) };
    const listPrio = [...groupsC.values()].sort((a, b) => {
      const ia = CMT_PRIO.indexOf(a.name), ib = CMT_PRIO.indexOf(b.name);
      return (local.has(b.book) - local.has(a.book)) || ((ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)) || (b.refs.length - a.refs.length);
    });
    // Anzeige in der Reihenfolge der Bibliotheksliste links; die Rangfolge oben gilt nur für die Vorauswahl
    const byT = new Map(groups.map(g => [g.title, g]));
    const titleToGroup = t => byT.get(t) || byT.get(String(t).split(', ')[0]) || null;
    const list = [...listPrio].sort((a, b) => libCmpGroups(titleToGroup(a.book), titleToGroup(b.book)) || titleCmp(a.book, b.book) || String(a.name).localeCompare(String(b.name)));
    if (!list.length) { $('#cmtChips').innerHTML = ''; $('#cmtSum').innerHTML = ''; $('#cmtBody').innerHTML = '<p class="muted">Zu diesem Vers gibt es keine Kommentare in den Verknüpfungen.</p>'; return; }
    // Nur Kommentatoren zählen als „vorhanden“, die lokal in der gewählten Sprache vorliegen (sonst wirkt die Liste vollständiger, als sie ist)
    const byTitle = byT;
    const LNm = { en: 'Englisch', de: 'Deutsch', he: 'Hebräisch' }[cmtLang];
    const hasLang = b => { const g = byTitle.get(b) || byTitle.get(String(b).split(', ')[0]); return !!g && g.versions.some(v => v.kind === cmtLang); };
    const avail = { has: b => local.has(b) && hasLang(b) };
    // Auswahl: gemerkte Kommentatoren; beim ersten Mal die bekanntesten vorhandenen
    cmtAvailNames = list.filter(g => avail.has(g.book)).map(g => g.name);
    let chosen = cmtAll ? list.filter(g => avail.has(g.book)) : list.filter(g => cmtSel.has(g.name) && avail.has(g.book));
    if (!cmtTouched) { const pre = new Set(listPrio.filter(g => avail.has(g.book)).slice(0, 2)); chosen = list.filter(g => pre.has(g)); }
    cmtLastChosen = chosen.map(g => g.name);
    const showAll = (cmtTouched && cmtAll) || (!cmtTouched && !chosen.length); // „Alle“ (oder nichts Vorausgewähltes): alle in dieser Sprache vorhandenen Kommentare zeigen
    if (showAll) chosen = list.filter(g => avail.has(g.book));
    const ok0 = g => avail.has(g.book);
    const chip = g => {
      const on = chosen.includes(g) && ok0(g), ok = avail.has(g.book);
      const why = ok ? g.book : local.has(g.book) ? I18N.t('{} – lokal vorhanden, aber nicht auf {}', g.book, LNm) : I18N.t('{} – nicht in deiner Bibliothek', g.book);
      return `<button class="chip ${on ? 'on' : ''} ${ok ? '' : 'off'}" data-n="${esc(g.name)}" title="${esc(why)}${g.refs.length > 1 ? ' · ' + I18N.t('{#} Stellen zu diesem Vers', g.refs.length) : ''}">${esc(dispName(g.name))}${g.refs.length > 1 ? ` <small class="cx">×${g.refs.length}</small>` : ''}</button>`;
    };
    const localL = list.filter(g => avail.has(g.book)), noLangL = list.filter(g => local.has(g.book) && !hasLang(g.book)), remoteL = list.filter(g => !local.has(g.book));
    const sumTxt = !localL.length ? I18N.t('keiner auf {} vorhanden', LNm)
      : showAll ? I18N.t('Alle {#} ({})', localL.length, LNm)
      : chosen.length ? I18N.t('{#} von {#} gewählt', chosen.length, localL.length) + ': ' + esc(chosen.slice(0, 4).map(g => dispName(g.name)).join(', ')) + (chosen.length > 4 ? ' …' : '')
      : I18N.t('keiner gewählt');
    $('#cmtSum').innerHTML = `${cmtChipsOpen ? '▾' : '▸'} <b>Kommentatoren</b> <span class="muted">${sumTxt}</span>`;
    $('#cmtChips').hidden = !cmtChipsOpen;
    $('#cmtChips').innerHTML = `<div class="cq"><button data-q="all">Alle</button><button data-q="none">Keine</button><button data-q="classic" title="Rashi, Ibn Ezra, Ramban …">Klassische</button><input id="cmtFilter" type="search" placeholder="Name filtern …" value="${esc(cmtFilterV)}" autocomplete="off"></div>`
      + localL.map(chip).join('')
      + (noLangL.length ? `<details><summary>${noLangL.length} lokal, aber nicht auf ${LNm}</summary><div>${noLangL.map(chip).join('')}</div></details>` : '')
      + (remoteL.length ? `<details><summary>${remoteL.length} nicht in deiner Bibliothek</summary><div>${remoteL.map(chip).join('')}</div></details>` : '');
    applyCmtFilter();
    if (!chosen.length) { $('#cmtBody').innerHTML = '<p class="muted">Wähle oben einen Kommentator. Grau dargestellte Kommentatoren musst du erst im Reiter „Herunterladen“ laden.</p>'; return; }
    $('#cmtBody').innerHTML = '<p class="muted">Lade …</p>';
    const refs = chosen.flatMap(g => g.refs);
    const res = await LK.texts(refs, cmtLang, true);
    if (token !== cmtToken) return; // inzwischen anderer Vers
    const LN = { en: 'Englisch', de: 'Deutsch', he: 'Hebräisch' }[cmtLang];
    const hasTxt = g => g.refs.some(r => res[r] && res[r].items);
    const gaps = showAll ? chosen.filter(g => !hasTxt(g)) : []; // ohne Auswahl: Kommentatoren ohne Text in dieser Sprache nur als Hinweis
    if (showAll) chosen = chosen.filter(hasTxt);
    const gapNote = gaps.length ? `<p class="muted">${I18N.t('Kein ' + { en: 'Englischer', de: 'Deutscher', he: 'Hebräischer' }[cmtLang] + ' Text zu diesem Vers:')} ${gaps.map(g => esc(g.name) + ' ' + (g.refs.every(r => res[r] && res[r].missing) ? I18N.t('(keine Fassung in dieser Sprache geladen)') : I18N.t('(Vers fehlt in der Fassung)'))).join(', ')}</p>` : '';
    if (!chosen.length) { $('#cmtBody').innerHTML = gapNote || `<p class="muted">${I18N.t('Keine lokalen Kommentare in der Sprache {} zu diesem Vers.', LN)}</p>`; return; }
    const jumpBar = chosen.length >= 3 ? `<div class="jbar">${chosen.map(g => `<a class="jl" data-n="${esc(g.name)}">${esc(dispName(g.name))}</a>`).join('')}</div>` : '';
    $('#cmtBody').innerHTML = jumpBar + chosen.map(g => {
      const seenTxt = new Set();
      const parts = g.refs.map(r => {
        const t = res[r];
        if (!t || !t.items) return `<div class="none">${esc(r)} – ${t && t.missing ? I18N.t('keine Fassung auf {} geladen', LN) : I18N.t('Vers fehlt in der ' + { en: 'Englischen', de: 'Deutschen', he: 'Hebräischen' }[cmtLang] + ' Fassung')}</div>`;
        const he = t.kind === 'he';
        const sig = t.items.join('\u0001'); if (seenTxt.has(sig)) return ''; seenTxt.add(sig); // gleiche Stelle mehrfach verknüpft: nur einmal zeigen
        return t.items.map(x => `<div class="ct" dir="${he ? 'rtl' : 'ltr'}">${window.AutoRef.link(R.cleanHtml(R.splitFootnotes(he ? stripHe(x) : x).main).replace(/<sup[^>]*>.*?<\/sup>/g, ''))}</div>`).join('');
      }).join('');
      const cl = cmtClosed.has(g.name);
      return `<div class="cmt${cl ? ' closed' : ''}" data-n="${esc(g.name)}"><h4 data-ref="${esc(g.refs[0])}" title="Klick: Kommentar ein-/ausklappen · ↗: öffnet ${esc(g.book)} in einem neuen Tab · Rechtsklick: weitere Möglichkeiten"><span class="tg">${cl ? '▸' : '▾'}</span> ${esc(dispName(g.name))}${g.refs.length > 1 ? ` <small class="cx">×${g.refs.length}</small>` : ''}<span class="go" title="Buch im neuen Tab öffnen">↗</span></h4>${parts}</div>`;
    }).join('') + gapNote;
    if (!fb.hidden && fTerm) runFind(fTerm, true); // Suche im Kommentar-Bereich nach dem Neuaufbau erneuern
  }

  // ---------- Sitzung merken und beim Start wiederherstellen ----------
  let saveTimer = null;
  function saveSession() {
    if (document.documentElement.classList.contains('pane2')) return; // das zweite Fenster darf die Sitzung des Hauptfensters nicht überschreiben
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem('session', JSON.stringify({
          idx: tabIdx,
          tabs: tabs.map(t => t.group ? { key: t.group.key, rels: [...t.selected], sk: t.key, label: t.label || '', scroll: t.scroll || 0, hit: t.hit || null } : t.sres ? { sres: { q: t.sres.q, he: !!t.sres.he, limit: t.sres.limit || 300, params: t.sres.params } } : { empty: true }),
        }));
      } catch { /* egal */ }
    }, 300);
  }
  async function restoreSession() {
    if (document.documentElement.classList.contains('pane2')) return;
    let ses = null;
    try { ses = JSON.parse(localStorage.getItem('session') || 'null'); } catch { ses = null; }
    if (!ses || !Array.isArray(ses.tabs) || !ses.tabs.length) return;
    for (const t of ses.tabs) {
      if (t.sres && typeof t.sres.q === 'string' && t.sres.params && typeof t.sres.params === 'object') { tabs.push({ group: null, sres: { q: t.sres.q.slice(0, 200), he: !!t.sres.he, limit: Math.min(3000, t.sres.limit | 0 || 300), html: null, params: t.sres.params } }); continue; }
      if (t.empty) { tabs.push({ group: null }); continue; }
      const g = groupsByKey.get(t.key);
      if (!g) continue;
      const sel = new Set((t.rels || []).filter(r => g.versions.some(v => v.rel === r)));
      if (!sel.size && g.versions[0]) sel.add(g.versions[0].rel);
      tabs.push({ group: g, selected: sel, loaded: [], sections: [], idx: 0, key: t.sk || null, label: t.label || '', scroll: t.scroll || 0, hit: t.hit && typeof t.hit.k === 'string' ? t.hit : null, lazy: true });
    }
    if (!tabs.length) return;
    tabIdx = Math.min(Math.max(0, ses.idx | 0), tabs.length - 1);
    view = tabs[tabIdx];
    showView();
    if (view.group) { const sc = view.scroll || 0; await loadView({ noKeep: true }); window.scrollTo(0, sc); }
  }

  // ---------- Tastatur ----------
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && /^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const i = e.key === '9' ? tabs.length - 1 : +e.key - 1;
      if (tabs[i]) switchTab(i);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { // Tab links/rechts
      e.preventDefault();
      switchTab(Math.min(tabs.length - 1, Math.max(0, tabIdx + (e.key === 'ArrowRight' ? 1 : -1))));
      return;
    }
    if (e.ctrlKey && e.key === 'Tab') { // Strg+Tab / Strg+Umschalt+Tab (Windows-Gewohnheit)
      e.preventDefault();
      switchTab((tabIdx + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length);
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || !view || !view.group) return;
    if (e.key === 'ArrowRight') { $('#nextSec').click(); e.preventDefault(); }       // nächster Abschnitt
    if (e.key === 'ArrowLeft') { $('#prevSec').click(); e.preventDefault(); }        // voriger Abschnitt
  });
  window.__closeCurrentTab = () => {
    const p2 = $('#pane2');
    if (p2 && !p2.hidden && document.activeElement === p2) { p2.contentWindow.postMessage({ type: 'closeTab' }, '*'); return; } // Cmd+W gilt für das Fenster, in dem man gerade arbeitet
    if (tabIdx >= 0) closeTab(tabIdx); else window.close();
  };

  // ---------- Kopfzeile ----------
  document.addEventListener('click', e => { const m = $('#moreMenu'); if (m && m.open && !e.target.closest('#moreMenu')) m.open = false; });
  $('#moreMenu').addEventListener('click', e => { if (e.target.closest('#moreList button')) $('#moreMenu').open = false; });
  $('#chooseDir').onclick = async () => { await O.chooseDir(); await refreshState(); await loadLibrary(); };
  $('#reveal').onclick = () => O.reveal();
  $('#ownExport').onclick = async () => {
    $('#moreMenu').open = false;
    const r = await O.ownExportBundle();
    if (r.cancelled) return;
    alert(r.error ? 'Export fehlgeschlagen: ' + r.error : r.count ? `${r.count} eigene Version(en) exportiert nach:\n${r.dir}\n\nDiesen Ordnerinhalt als „bundled“ ins Projekt legen und zu GitHub hochladen.` : 'Es gibt noch keine eigenen Texte zum Exportieren.');
  };

  // ---------- Update-Hinweis ----------
  { const banner = $('#updBanner'), msg = $('#updMsg');
    let rel = null;
    const get = k => { try { return localStorage.getItem(k); } catch { return null; } };
    const set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* egal */ } };
    $('#updAuto').checked = get('updCheck') !== '0';
    $('#updAuto').onchange = () => set('updCheck', $('#updAuto').checked ? '1' : '0');
    async function check(manual) {
      const r = await O.checkUpdate();
      if (r.error) { if (manual) { msg.textContent = 'Update-Suche fehlgeschlagen: ' + r.error; $('#updOpen').hidden = true; banner.hidden = false; } return; }
      if (r.latest && window.Update.newer(r.latest, r.current)) {
        if (!manual && get('updSkip') === r.latest) return; // „Später“ wurde für diese Version schon gewählt
        rel = r; msg.textContent = `Safran ${r.latest} ist verfügbar (installiert: ${r.current}).`; $('#updOpen').hidden = false; banner.hidden = false;
      } else if (manual) { msg.textContent = `Du hast die neueste Version (${r.current}).`; $('#updOpen').hidden = true; banner.hidden = false; setTimeout(() => { banner.hidden = true; }, 4000); }
    }
    $('#updOpen').onclick = () => { if (rel) O.openRelease(rel.url); banner.hidden = true; };
    $('#updLater').onclick = () => { if (rel) set('updSkip', rel.latest); banner.hidden = true; };
    $('#updNow').onclick = () => { $('#moreMenu').open = false; check(true); };
    if (!document.documentElement.classList.contains('pane2') && get('updCheck') !== '0') setTimeout(() => check(false), 4000);
  }

  // Erster Start: ohne heruntergeladene Sefaria-Texte fragen, ob die Bibliothek ausgewählt werden soll
  function maybeWelcome() {
    if (document.documentElement.classList.contains('pane2')) return;
    if (entries.some(e => !e.own)) return; // Sefaria-Texte sind schon da
    let never = false; try { never = localStorage.getItem('welcomeNever') === '1'; } catch { /* egal */ }
    if (never) { if (!groups.length) showTab('get'); return; }
    const dlg = $('#welcomeDlg');
    $('#welcomeNever').checked = false;
    const done = () => { try { if ($('#welcomeNever').checked) localStorage.setItem('welcomeNever', '1'); } catch { /* egal */ } dlg.close(); };
    $('#welcomeLater').onclick = done;
    $('#welcomeGo').onclick = () => { done(); showTab('get'); if ($('#pickCard').hidden) $('#catFetch').click(); };
    dlg.showModal();
  }

  // Sofort-Hinweise: der Titel eines Symbols erscheint ohne Verzögerung (statt des trägen Standard-Tooltips)
  { const tip = document.createElement('div'); tip.id = 'tip'; tip.hidden = true; document.body.appendChild(tip);
    let cur = null;
    const restore = () => { if (cur) { if (cur.dataset.tip != null && !cur.hasAttribute('title')) cur.setAttribute('title', cur.dataset.tip); delete cur.dataset.tip; cur = null; } tip.hidden = true; };
    document.addEventListener('mouseover', e => {
      const el = e.target.closest ? e.target.closest('[title],[data-tip]') : null;
      if (el === cur) return;
      restore();
      if (!el) return;
      const text = el.getAttribute('title') || el.dataset.tip;
      if (!text) return;
      el.dataset.tip = text; el.removeAttribute('title'); cur = el;
      tip.textContent = text; tip.hidden = false;
      const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      let top = r.bottom + 6; if (top + h > window.innerHeight - 4) top = r.top - h - 6;
      tip.style.top = Math.max(4, top) + 'px';
      tip.style.left = Math.max(4, Math.min(window.innerWidth - w - 4, r.left)) + 'px';
    }, true);
    document.addEventListener('mouseout', e => { if (cur && !cur.contains(e.relatedTarget)) restore(); }, true);
    ['mousedown', 'keydown', 'wheel'].forEach(ev => document.addEventListener(ev, () => { tip.hidden = true; }, true));
  }

  // Esc schließt die zuletzt geöffnete Seitenleiste (Wörterbuch, Kommentare, Verknüpfungen), jedes weitere Esc die davor
  { const panels = [['#dictPanel', () => toggleDict(false)], ['#cmtPanel', () => toggleCmt(false)], ['#linkPanel', () => { $('#linkPanel').hidden = true; }]];
    const since = new Map();
    panels.forEach(([sel]) => { const el = $(sel); new MutationObserver(() => { if (!el.hidden) since.set(sel, Date.now()); }).observe(el, { attributes: true, attributeFilter: ['hidden'] }); });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
      if (document.querySelector('dialog[open]') || !$('#findBar').hidden || !$('#dispPanel').hidden || !$('#dictSug').hidden || document.querySelector('#wpop')) return;
      const open = panels.filter(([sel]) => !$(sel).hidden && !(sel === '#dictPanel' && document.documentElement.dataset.tab === 'dict'));
      if (!open.length) return;
      open.sort((a, b) => (since.get(b[0]) || 0) - (since.get(a[0]) || 0));
      e.preventDefault(); open[0][1]();
    });
  }

  // Größe der ganzen Oberfläche (Menü ⋯), wird gemerkt; das rechte Fenster folgt dem Hauptfenster
  { const R = $('#zoomRange');
    let p = 100; try { p = +localStorage.getItem('uiZoomPct') || 100; } catch { /* egal */ }
    R.value = p;
    const show = () => { $('#zoomVal').textContent = R.value + '%'; };
    const apply = () => { const v = +R.value; try { if (!IS_PANE2 && window.uiZoom) window.uiZoom.set(v / 100); localStorage.setItem('uiZoomPct', String(v)); } catch { /* egal */ } show(); };
    R.oninput = show; R.onchange = apply; R.ondblclick = () => { R.value = 100; apply(); }; // skaliert erst beim Loslassen
    apply();
  }

  // Oberflächensprache (Menü ⋯): Wahl merken, dem Hauptprozess für Menüleiste und Dialoge mitteilen, Seite neu laden
  { const sel = $('#uiLang'); sel.value = I18N.lang;
    try { O.setLang(I18N.lang); } catch { /* ältere Vorschau ohne Schnittstelle */ }
    sel.onchange = async () => { try { await O.setLang(sel.value); } catch { /* egal */ } I18N.set(sel.value); };
  }

  // Hebräischer Fettdruck: Wörter ohne Vokalzeichen bekommen die Klasse „nn“ (etwas kräftiger, siehe library.css)
  { const NIQ = /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/;
    const mark = root => root.querySelectorAll('b:not([data-nn]), strong:not([data-nn])').forEach(b => {
      b.dataset.nn = '1';
      if (/[\u0590-\u05FF]/.test(b.textContent) && !NIQ.test(b.textContent)) b.classList.add('nn');
    });
    const obs = new MutationObserver(() => { obs.disconnect(); mark(document.body); watch(); });
    const watch = () => ['#rOut', '#cmtBody'].forEach(s => { const el = $(s); if (el) obs.observe(el, { childList: true, subtree: true }); });
    watch();
  }

  // ---------- Start ----------
  (async () => {
    try {
      await refreshState();
      await loadLibrary();
      applyDisp(false);
      await loadNotes();
      await restoreSession();
      await refreshCatalog();
      maybeWelcome();
    } catch (err) {
      const o = $('#rOut'); // sichtbar statt leerer Oberfläche
      if (o) o.innerHTML = '<p class="muted">' + esc(I18N.t('Die Bibliothek konnte nicht geladen werden: {}', String(err && err.message || err))) + '</p>';
    }
  })();
})();
