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
  function showTab(t) {
    $$('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    $$('main > section').forEach(s => (s.hidden = s.id !== 'tab-' + t));
    document.documentElement.dataset.tab = t;
    $('#togglePanel').hidden = t !== 'read'; // die Bücherliste gibt es nur im Reiter „Lesen“
  }
  $$('nav button').forEach(b => (b.onclick = () => showTab(b.dataset.tab)));
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
      if (ng) t.group = ng; else { tabs.splice(i, 1); if (i < tabIdx) tabIdx--; }
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
      return `<details data-p="${esc(pth)}" data-d="${depth}" ${openCats.has(pth) || auto ? 'open' : ''}><summary>${esc(n.name)}${f ? ` <span class="muted">(${count(n)})</span>` : ''}</summary>${kids}${ts}</details>`;
    };
    $('#tree').innerHTML = node(root, '') || `<p class="muted">${groups.length ? 'Keine Treffer.' : 'Noch keine Texte heruntergeladen.'}</p>`;
  }
  $('#treeFilter').addEventListener('input', renderTree);
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
    if (a) openGroup(groupsByKey.get(a.dataset.key), {}, e.metaKey || e.ctrlKey || e.shiftKey);
  });

  // ---------- Lesen: Buch öffnen und anzeigen ----------
  // ---------- Tabs ----------
  const tabs = [];
  let tabIdx = -1;
  function renderTabs() {
    $('#tabbar').innerHTML = tabs.map((t, i) => {
      const s = t.group && t.sections && t.sections[t.idx];
      if (s) t.label = s.label;
      const name = t.group ? t.group.title + (t.label ? ' · ' + t.label : '') : 'Neuer Tab';
      return `<div class="tab${i === tabIdx ? ' active' : ''}" data-i="${i}" title="${esc(name)}"><span>${esc(name)}</span><button data-x="${i}" title="Tab schließen">✕</button></div>`;
    }).join('') + '<button id="tabNew" title="Neuer Tab (Cmd+T)">＋</button>';
  }
  function showView() {
    saveSession();
    updateNav();
    const none = !tabs.length;
    $('#rEmpty').hidden = !none;
    $('#rMain').hidden = none;
    $('#stick').classList.toggle('emptytab', !none && !view.group);
    if (!none && !view.group) {
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
    if (i === tabIdx || !tabs[i]) return;
    saveScroll();
    tabIdx = i; view = tabs[i];
    showTab('read');
    showView();
    if (view.group) { const sc = view.scroll || 0; await loadView(); window.scrollTo(0, sc); }
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
      if (view.group) { const sc = view.scroll || 0; await loadView(); window.scrollTo(0, sc); }
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
  function rememberKinds() {
    if (!view || !view.group) return;
    const ks = [...new Set(view.group.versions.filter(v => view.selected.has(v.rel) && ['he', 'en', 'de'].includes(v.kind)).map(v => v.kind))];
    if (!ks.length) return;
    // eine Sprache, die dieses Buch gar nicht hat, bleibt in der Auswahl erhalten
    const have = new Set(view.group.versions.map(v => v.kind));
    prefKinds = [...new Set([...ks, ...prefKinds.filter(k => !have.has(k))])];
    try { localStorage.setItem('prefKinds', JSON.stringify(prefKinds)); } catch { /* egal */ }
  }
  async function openGroup(g, target = {}, inNewTab = false) {
    if (!g) return;
    saveScroll();
    const nv = { group: g, selected: new Set(), loaded: [], sections: [], idx: 0, key: null };
    if (!tabs.length || (inNewTab && tabs[tabIdx] && tabs[tabIdx].group)) { tabs.push(nv); tabIdx = tabs.length - 1; }
    else { nv.nav = tabs[tabIdx] && tabs[tabIdx].nav; tabs[tabIdx] = nv; } // Verlauf des Tabs bleibt beim Buchwechsel erhalten
    view = nv;
    if (target.showCompare) nv.cmpRel = target.rel;
    const first = k => g.versions.find(v => v.kind === k && v.versionTitle === 'merged') || g.versions.find(v => v.kind === k);
    // zuletzt gewählte Sprachen übernehmen (z. B. nur Hebräisch + Deutsch); fehlt Deutsch, hilft Englisch aus
    const want = new Set(prefKinds);
    if (want.has('de') && !first('de')) want.add('en');
    ['he', 'en', 'de'].forEach(k => { if (!want.has(k)) return; const v = first(k); if (v) view.selected.add(v.rel); });
    if (!view.selected.size) ['he', 'en', 'de'].forEach(k => { const v = first(k); if (v) view.selected.add(v.rel); });
    if (!view.selected.size && g.versions[0]) view.selected.add(g.versions[0].rel);
    if (target.rel) view.selected.add(target.rel);
    showTab('read');
    showView();
    await loadView(target);
  }

  async function loadView(target = {}) {
    const V = view; // Tab, für den geladen wird (der Nutzer kann inzwischen woanders sein)
    const tok = V.loadTok = (V.loadTok || 0) + 1;
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
    $('#rTitle').title = g.title;
    $('#rSection').innerHTML = secs.map((s, i) => `<option value="${i}">${esc(s.label)}</option>`).join('');
    renderVersions();
    renderCompare();
    renderSection(target.rowLabel);
  }

  function renderVersions() {
    const g = view.group;
    $('#verSummary').textContent = `Versionen ${view.selected.size}/${g.versions.length}`;
    $('#verList').innerHTML = g.versions.map(v =>
      `<label><input type="checkbox" data-rel="${esc(v.rel)}" ${view.selected.has(v.rel) ? 'checked' : ''}> <span class="badge ${v.kind}">${KIND_LABEL[v.kind]}</span>${v.own ? '<span class="badge own">eigen</span>' : ''}${esc(shortVer(v.versionTitle))}${v.own ? ` <button class="ownc" data-csv="${esc(v.rel)}" title="Als Upload-CSV für Sefaria speichern (Ref,Text)">CSV</button>` : ''}${v.own && v.source ? ` <button class="ownr" data-rl="${esc(v.rel)}" title="Quelldatei neu einlesen (${esc(v.source)})">⟳</button>` : ''}${v.own ? ` <button class="ownx" data-rm="${esc(v.rel)}" title="Diesen eigenen Text entfernen">✕</button>` : ''}</label>`).join('');
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

  // Fußnoten werden immer mitgerendert; ob sie sichtbar sind, steuert der Modus (data-notes) per CSS
  function cellHtml(html, d) {
    if (html == null) return '<div class="cell empty"></div>';
    const rtl = d.entry.language === 'Hebrew';
    if (d.entry.kind === 'he') html = stripHe(html);
    const { main, notes } = R.splitFootnotes(html);
    // Fußnote steht direkt hinter ihrem Zeichen im Text (nicht darunter)
    const inline = R.cleanHtml(main).replace(/<sup data-fn="(\d{1,4})">(.*?)<\/sup>/g, (m, i, mk) => {
      const n = notes[+i];
      return n ? `${m}<span class="note" data-fn="${i}"><span class="nm">${esc(n.marker)}</span> ${R.cleanHtml(n.html)}</span>` : m;
    });
    return `<div class="cell" data-k="${d.entry.kind}" dir="${rtl ? 'rtl' : 'ltr'}"><div class="txt">${inline}</div></div>`;
  }

  let syncPane = false; // Gleichlauf: Blättern im Hauptfenster blättert im zweiten Fenster mit
  function renderSection(rowLabel) {
    if (!IS_PANE2 && syncPane && view && p2Frame && !p2Frame.hidden && p2Frame.contentWindow) p2Frame.contentWindow.postMessage({ type: 'sync', idx: view.idx }, '*');
    const s = view.sections[view.idx];
    $('#rSection').value = String(view.idx);
    $('#prevSec').disabled = view.idx <= 0;
    $('#nextSec').disabled = view.idx >= view.sections.length - 1;
    if (!s) { $('#rOut').innerHTML = '<p class="muted">In den gewählten Versionen ist kein Text vorhanden.</p>'; return; }
    view.key = s.k;
    const cols = view.loaded.map(d => R.flattenNode(R.getByPath(d.text, s.path)));
    const rows = R.alignRows(cols);
    const n = view.loaded.length;
    const head = `<div class="row head" style="--n:${n}"><div class="lab"></div>${view.loaded.map(d =>
      `<div>${esc(KIND_LABEL[d.entry.kind])} · ${esc(shortVer(d.versionTitle))}</div>`).join('')}</div>`;
    if (rowLabel != null && !rows.some(r => r.label === rowLabel)) { // „2“ trifft bei Kommentaren die erste Zeile „2:1“
      const f = rows.find(r => r.label.startsWith(rowLabel + ':'));
      if (f) rowLabel = f.label;
    }
    const body = rows.map(r =>
      `<div class="row${rowLabel != null && r.label === rowLabel ? ' hit' : ''}" data-l="${esc(r.label)}" style="--n:${n}"><div class="lab">${esc(r.label)}</div>${r.cells.map((c, i) => cellHtml(c, view.loaded[i])).join('')}</div>`).join('');
    $('#rOut').innerHTML = head + body;
    recordNav(s, rowLabel);
    pushHistory(s, rowLabel);
    renderTabs();
    saveSession();
    markNotes();
    markMismatch();
    loadLinks(s);
    if (window.__refind) setTimeout(window.__refind, 0);
    { const ck = view.group.key + '|' + s.k; if (ck !== lastCmtKey) { cmtRow = null; lastCmtKey = ck; } }
    applyCmtRowSoon();
    const hit = $('#rOut .row.hit');
    if (hit) hit.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0);
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

  // Fußnoten-Modus (per Klick / immer / aus), wird gemerkt
  let noteMode = 'click';
  try { noteMode = localStorage.getItem('noteMode') || 'click'; } catch { /* egal */ }
  if (!['click', 'all', 'off'].includes(noteMode)) noteMode = 'click';
  const applyNoteMode = () => { $('#rOut').dataset.notes = noteMode; $('#noteMode').value = noteMode; try { localStorage.setItem('noteMode', noteMode); } catch { /* egal */ } };
  $('#noteMode').onchange = () => { noteMode = $('#noteMode').value; applyNoteMode(); };
  applyNoteMode();

  // Bücherliste links ein-/ausklappen (Knopf oder Cmd+B), wird gemerkt
  let panelOpen = true;
  try { panelOpen = localStorage.getItem('panel') !== '0'; } catch { /* egal */ }
  const applyPanel = () => {
    $('.layout').classList.toggle('collapsed', !panelOpen);
    $('#togglePanel').setAttribute('aria-pressed', String(panelOpen));
    try { localStorage.setItem('panel', panelOpen ? '1' : '0'); } catch { /* egal */ }
  };
  const togglePanel = () => { panelOpen = !panelOpen; applyPanel(); };
  $('#togglePanel').onclick = togglePanel;
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') { e.preventDefault(); togglePanel(); }
  });
  applyPanel();

  // Zu einer Stelle springen: "3", "3:7", "Daf 2a", "gen. 1:1" (Buchname optional, Anfang genügt)
  const normT = x => String(x).toLowerCase().replace(/[.\s]+/g, ' ').trim();
  async function jumpTo(q, inNewTab = false) {
    const m = String(q).trim().match(/^(.*?)\s*(?:\b(?:daf|kapitel|chapter|kap)\s*)?(\d+[ab]?)(?:\s*[:,.\s]\s*(?:(?:vers|verse|v)\.?\s*)?(\d+))?(?::\d+)*$/i);
    if (!m) {
      // nur ein Buchname ohne Zahl („genesis“ + Enter): Buch von vorn (erstes Kapitel) öffnen
      const b = normT(q);
      if (!b || /\d/.test(b)) return false;
      const c = groups.filter(g => normT(g.title).startsWith(b) || normT(g.title).split(' ').some(w => w.startsWith(b)))
        .sort((a, b2) => (normT(a.title) === b ? 0 : 1) - (normT(b2.title) === b ? 0 : 1) || (normT(a.title).startsWith(b) ? 0 : 1) - (normT(b2.title).startsWith(b) ? 0 : 1) || a.title.length - b2.title.length);
      if (!c.length) return false;
      await openGroup(c[0], {}, inNewTab);
      return true;
    }
    const book = normT(m[1]), num = m[2].toLowerCase(), verse = m[3];
    let g = view && view.group;
    if (book) {
      const cands = groups.filter(x => normT(x.title).startsWith(book) || normT(x.title).split(' ').some(w => w.startsWith(book)));
      cands.sort((a, b) => (normT(a.title) === book ? 0 : 1) - (normT(b.title) === book ? 0 : 1) || (normT(a.title).startsWith(book) ? 0 : 1) - (normT(b.title).startsWith(book) ? 0 : 1) || a.title.length - b.title.length);
      if (!cands.length) return false;
      if (!g || cands[0] !== g || inNewTab) { g = cands[0]; await openGroup(g, {}, inNewTab); }
    }
    if (!g || !view) return false;
    const find = n => view.sections.findIndex(s => s.label.toLowerCase().endsWith(' ' + n) || s.label.toLowerCase() === n);
    let idx = find(num);
    if (idx < 0 && /^\d+$/.test(num)) idx = find(num + 'a'); // Talmud: „3“ = Daf 3a
    if (idx < 0) return false;
    view.idx = idx;
    renderSection(verse);
    return true;
  }
  // Vorschläge beim Tippen (Springen-Feld und „Neuer Tab“): Buchname eintippen, z. B. „ge“ → Genesis
  let suggEl = null;
  function attachSuggest(input) {
    if (!suggEl) { suggEl = document.createElement('div'); suggEl.id = 'suggest'; suggEl.hidden = true; document.body.appendChild(suggEl); document.addEventListener('mousedown', e => { if (!e.target.closest('#suggest')) suggEl.hidden = true; }); }
    let list = [], sel = -1;
    const hide = () => { suggEl.hidden = true; sel = -1; };
    const split = v => { const m = v.match(/^(.*?)(\s*(?:\b(?:daf|kapitel|chapter|kap)\s*)?\d.*)?$/i); return { book: (m[1] || '').trim(), rest: m[2] || '' }; };
    const show = () => {
      const { book, rest } = split(input.value);
      const q = normT(book);
      if (!q || rest.trim()) { hide(); return; } // Vorschläge nur, solange noch kein Kapitel eingegeben ist
      const hits = groups.filter(g => { const t = normT(g.title); return t.startsWith(q) || t.split(' ').some(w => w.startsWith(q)) || (g.heTitle && g.heTitle.includes(book)); });
      hits.sort((a, b) => (normT(a.title).startsWith(q) ? 0 : 1) - (normT(b.title).startsWith(q) ? 0 : 1));
      const first = hits.filter(g => normT(g.title).startsWith(q)), other = hits.filter(g => !normT(g.title).startsWith(q));
      list = [...SefOrder.sortTitles(first), ...SefOrder.sortTitles(other)].slice(0, 8);
      if (!list.length) { hide(); return; }
      sel = -1;
      suggEl.innerHTML = list.map((g, i) => `<div class="si" data-i="${i}">${esc(g.title)}${g.heTitle ? ` <small dir="rtl">${esc(g.heTitle)}</small>` : ''}<span class="muted">${esc(g.cats.slice(-1)[0] || '')}</span></div>`).join('');
      const r = input.getBoundingClientRect();
      suggEl.style.left = r.left + 'px'; suggEl.style.top = (r.bottom + 2) + 'px'; suggEl.style.minWidth = Math.max(240, r.width) + 'px';
      suggEl.hidden = false;
    };
    const pick = i => {
      const g = list[i]; if (!g) return;
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
    const ok = await jumpTo($('#jump').value);
    $('#jump').classList.toggle('bad', !ok);
  });
  $('#jump').addEventListener('input', () => $('#jump').classList.remove('bad'));



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
    if (g) openGroup(g, { sectionPath: JSON.parse(h.sk), rowLabel: h.row || undefined }, e.metaKey || e.ctrlKey || e.shiftKey);
  });
  let recentOpen = false;
  try { recentOpen = localStorage.getItem('recentOpen2') === '1'; } catch { /* egal */ }
  const applyRecent = () => {
    $('#recent').hidden = !recentOpen;
    $('#recentArrow').textContent = recentOpen ? '▾' : '▸';
    try { localStorage.setItem('recentOpen2', recentOpen ? '1' : '0'); } catch { /* egal */ }
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

  const verseOf = lab => (/^\d+$/.test(lab) ? +lab : null);
  async function loadLinks(s) {
    secLinks = [];
    $('#lkBtn').hidden = true;
    if (!linksReady || !view) return;
    const first = s.label.split(' › ')[0];
    const m = s.path.length === 1 && !s.label.includes('›') && first.match(/(\d+[ab]?)$/i);
    if (!m) return;
    const token = view.idx + ':' + view.group.key;
    let rows;
    try { rows = await LK.section(view.group.title, m[1]); } catch { return; }
    if (!view || token !== view.idx + ':' + view.group.key) return; // inzwischen woanders
    secLinks = rows;
    if (!rows.length) return;
    $('#lkBtn').hidden = false;
    $('#lkBtn').textContent = `🔗 ${rows.length}`;
    $$('#rOut .row[data-l]').forEach(r => {
      const v = verseOf(r.dataset.l);
      if (v == null) return;
      const n = rows.filter(x => v >= x.v1 && v <= x.v2 && x.v1 > 0).length;
      const lab = r.querySelector('.lab');
      lab.querySelectorAll('.lk').forEach(x => { if (x.previousSibling && x.previousSibling.tagName === 'BR') x.previousSibling.remove(); x.remove(); }); // wurde der Abschnitt zweimal geladen, nicht doppelt anzeigen
      if (n) lab.insertAdjacentHTML('beforeend', `<br><span class="lk" data-v="${v}" title="${n} Verknüpfungen">🔗${n}</span>`);
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
  $('#lkFilter').addEventListener('input', () => renderLinkPanel());
  const localTitles = () => new Set(groups.map(g => g.title));
  const splitOther = ref => { const m = String(ref).match(/^(.*?)\s+\d+[ab]?(?::\d+)*(?:-.*)?$/i); return m ? m[1] : ref; };
  function renderLinkPanel() {
    if (!view) return;
    const s = view.sections[view.idx];
    const f = $('#lkFilter').value.trim().toLowerCase();
    let list = secLinks.filter(x => lkVerse == null ? true : (x.v1 === 0 || (lkVerse >= x.v1 && lkVerse <= x.v2)));
    if (f) list = list.filter(x => (x.other + ' ' + x.cat + ' ' + x.type).toLowerCase().includes(f));
    $('#lkTitle').textContent = `${view.group.title} · ${s ? s.label : ''}${lkVerse != null ? ':' + lkVerse : ''} – ${list.length} Verknüpfungen`;
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
    $('#lkBody').innerHTML = [...cats.entries()].sort((a, b) => lkRank(a[0]) - lkRank(b[0]) || b[1].size - a[1].size).map(([c, books]) => {
      const total = [...books.values()].reduce((a, v) => a + v.length, 0);
      return `<details ${open}><summary>${esc(c)} (${total})</summary>${[...books.entries()].sort((a, b) => b[1].length - a[1].length).map(([bk, xs]) =>
        `<details ${f ? 'open' : ''}><summary>${esc(bk)} (${xs.length})${local.has(bk) ? '' : ' <span class="muted">· nicht lokal</span>'}</summary>${xs.slice(0, 300).map(x =>
          `<div class="ent${local.has(bk) ? '' : ' off'}"><a data-ref="${esc(x.other)}">${esc(x.other)}</a>${local.has(bk) ? ` <button data-pv="${esc(x.other)}" title="Vorschau">▸</button>` : ''}${x.type ? ` <small class="muted">${esc(x.type)}</small>` : ''}</div>`).join('')}${xs.length > 300 ? `<div class="muted ent">… ${xs.length - 300} weitere (Filter benutzen)</div>` : ''}</details>`).join('')}</details>`;
    }).join('') || '<p class="muted">Keine Verknüpfungen.</p>';
    $('#linkPanel').hidden = false;
  }
  $('#lkBody').addEventListener('click', async e => {
    const a = e.target.closest('a[data-ref]');
    if (a) {
      if (a.parentElement.classList.contains('off')) return;
      await jumpTo(a.dataset.ref.replace(/-.*$/, ''), e.metaKey || e.ctrlKey || e.shiftKey);
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
  refreshLinkStatus().then(() => { if (view) renderSection(); });

  // Höhe der festen Leiste messen, damit die Spaltenköpfe direkt darunter haften
  const fixStick = () => {
    const st = $('#stick'), hd = $('header');
    if (!st || !hd) return;
    $('#rOut').style.setProperty('--stick-top', (hd.offsetHeight + st.offsetHeight - 4) + 'px');
    st.style.top = hd.offsetHeight + 'px';
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
    const ranges = [];
    for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!el || el.offsetParent === null && getComputedStyle(el).display === 'none') continue;
      if (el.closest('.note') && !el.closest('.note').offsetParent) continue;
      const txt = node.nodeValue;
      let n = '', map = [];
      for (let i = 0; i < txt.length; i++) {
        const lower = txt[i].toLowerCase();
        const c = stripF(lower);
        if (!c) continue;
        n += c === '\u05BE' ? ' ' : c; map.push(i);
      }
      let pos = 0;
      while ((pos = n.indexOf(q, pos)) >= 0) {
        const r = document.createRange();
        r.setStart(node, map[pos]);
        r.setEnd(node, map[pos + q.length - 1] + 1);
        ranges.push(r);
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
  const openFind = () => { fb.hidden = false; fin.focus(); fin.select(); };
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
      else if (m.type === 'sync') { if (view && view.group && m.idx < view.sections.length && m.idx !== view.idx) { view.idx = m.idx; renderSection(); } }
      else if (m.type === 'jump' && typeof m.ref === 'string') jumpTo(m.ref, tabs.some(t => t.group)); // Kommentar aus dem ersten Fenster
      else if (m.type === 'open' && typeof m.key === 'string') { const g = groupsByKey.get(m.key); if (g) openGroup(g, { rel: typeof m.rel === 'string' ? m.rel : undefined, sectionPath: m.sectionPath, rowLabel: m.rowLabel }, tabs.some(t => t.group)); } // schon ein Buch offen: neuer Tab
    } else if (e.source === p2Frame.contentWindow) {
      if (m.type === 'ready') p2Ready = true;
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
    $('#syncBtn').onclick = () => { syncPane = !syncPane; $('#syncBtn').setAttribute('aria-pressed', String(syncPane)); if (syncPane) renderSection(); };
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
    const hit = (t) => t.toLowerCase().includes(f);
    const show = (n, anc) => !f || anc || hit(n.name) || n.titles.some(hit) || [...n.children.values()].some(c => show(c, false));
    const node = (n, parentMatch) => {
      const m = !f || parentMatch || hit(n.name);
      if (!show(n, parentMatch)) return '';
      const kids = SefOrder.sortCats([...n.children.keys()], n.name).map(k => node(n.children.get(k), m && !!f)).join('');
      const cov = covered(n.path);
      const books = SefOrder.sortTitles(n.titles.filter(t => !f || m || hit(t)), t => t).map(t =>
        `<label class="t book"><input type="checkbox" data-st="${esc(t)}" ${cov || sCats.has(n.path) || sTitles.has(t) ? 'checked' : ''} ${cov || sCats.has(n.path) ? 'disabled' : ''}> ${esc(t)}</label>`).join('');
      const cb = `<input type="checkbox" data-sc="${esc(n.path)}" ${cov || sCats.has(n.path) ? 'checked' : ''} ${cov ? 'disabled' : ''}> `;
      return `<details data-p="${esc(n.path)}" ${f || sOpen.has(n.path) ? 'open' : ''}><summary>${cb}<span class="catname">${esc(n.name)}</span> <small>(${n.count})</small></summary>${kids}${books}</details>`;
    };
    $('#sCatTree').innerHTML = SefOrder.sortCats([...root.children.keys()], '').map(k => node(root.children.get(k), false)).join('') || '<p class="muted">Nichts gefunden.</p>';
    const parts = [sCats.size ? `${sCats.size} Kategorie${sCats.size === 1 ? '' : 'n'}` : '', sTitles.size ? `${sTitles.size} Buch${sTitles.size === 1 ? '' : 'er'}` : ''].filter(Boolean);
    $('#sCatBtn').textContent = parts.length ? `Auswahl: ${parts.join(', ')}` : 'Kategorien: alle';
  }
  const sOpen = new Set(); // vom Nutzer aufgeklappte Kategorien in der Suchliste
  $('#sCatTree').addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.p != null && !$('#sCatFilter').value.trim()) { if (d.open) sOpen.add(d.dataset.p); else sOpen.delete(d.dataset.p); } }, true);
  $('#sCatFilter').addEventListener('input', renderSCats);
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
    showTab('search');
    sCats.clear(); sTitles.clear(); sTitles.add(view.group.title); renderSCats();
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
    ctxEl.innerHTML = items.map((it, i) => `<button data-n="${i}">${esc(it.label)}</button>`).join('');
    ctxEl.hidden = false;
    ctxEl.style.left = Math.max(4, Math.min(e.clientX, window.innerWidth - 270)) + 'px';
    ctxEl.style.top = Math.max(4, Math.min(e.clientY, window.innerHeight - 40 * items.length - 10)) + 'px';
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
    if (nOwn) items.push({ label: `Eigene${nOwn > 1 ? ` Texte (${nOwn})` : 'n Text'} entfernen …`, fn: () => removeOwnGroup(g) });
    ctxShow(e, items);
  }
  // im zweiten Fenster öffnen: Fenster bei Bedarf einblenden; ist dort schon ein Buch offen, entsteht ein neuer Tab
  function openInPane2(key, target = {}) {
    setSplit(true);
    const msg = target.jump ? { type: 'jump', ref: target.jump } : { type: 'open', key, rel: target.rel, sectionPath: target.sectionPath, rowLabel: target.rowLabel };
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
      items.push({ label: 'Kopieren', fn: () => navigator.clipboard.writeText(selTxt).catch(() => {}) });
      ctxShow(e, items); return;
    }
    if (!row || !view || !view.group) return;
    const sec = view.sections[view.idx];
    if (!sec) return;
    const ref = `${view.group.title} ${String(sec.label).replace(/^\D+/, '') || sec.label}:${row.dataset.l}`.replace(/\s+/g, ' ');
    const url = 'https://www.sefaria.org/' + encodeURIComponent(ref.replace(/ /g, '_').replace(/:/g, '.')).replace(/%2C/g, ',').replace(/%2F/g, '/');
    ctxShow(e, [
      ...(word ? [{ label: `Im Wörterbuch nachschlagen: „${word}“`, fn: () => openDict(word) }] : []),
      { label: 'Referenz kopieren: ' + ref, fn: () => navigator.clipboard.writeText(ref).catch(() => {}) },
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
  function toggleDict(force) {
    dictOpen = force == null ? !dictOpen : force;
    $('#dictPanel').hidden = !dictOpen;
    syncDock();
    if (dictOpen) { renderDictList(); $('#dictQ').focus(); }
  }
  async function dictLookup(q) {
    q = String(q || '').trim();
    if (!q) return;
    $('#dictQ').value = q;
    $('#dictOut').innerHTML = '<p class="muted">Suche …</p>';
    const r = await O.dictLookup(q);
    if (r.error) { $('#dictOut').innerHTML = `<p class="muted">⚠ ${esc(r.error)}</p>`; return; }
    if (!r.results.length) {
      const n = (await O.dictList()).list.length;
      $('#dictOut').innerHTML = n ? `<p class="muted">Kein Eintrag für „${esc(q)}“ gefunden.</p>` : '<p class="muted">Es ist noch kein Wörterbuch eingebunden. Öffne unten „Wörterbücher verwalten“ und füge eine DSL-Datei hinzu.</p>';
      return;
    }
    $('#dictOut').innerHTML = r.results.map(x => `<div class="dentry"><div class="dhead"><b dir="auto">${esc(x.head)}</b> <span class="muted">${esc(x.dict)}${x.note ? ' · ' + esc(x.note) : ''}</span></div><div class="dbody" dir="ltr">${x.html}</div></div>`).join('');
  }
  async function renderDictList() {
    const r = await O.dictList();
    $('#dictList').innerHTML = r.list.length ? r.list.map(d => `<div class="dli"><span>${esc(d.name)} <span class="muted">· ${d.count.toLocaleString('de-DE')} Einträge</span></span><button data-id="${esc(d.id)}" title="Wörterbuch entfernen">✕</button></div>`).join('') : '<p class="muted">Noch keine Wörterbücher.</p>';
  }
  async function openDict(q) {
    if (!dictOpen) toggleDict(true); else renderDictList();
    if (q) dictLookup(q); else $('#dictQ').focus();
  }
  $('#openDict').onclick = () => { $('#moreMenu').open = false; toggleDict(); };
  $('#dictClose').onclick = () => toggleDict(false);
  $('#dictGo').onclick = () => dictLookup($('#dictQ').value);
  $('#dictQ').addEventListener('keydown', e => { if (e.key === 'Enter') dictLookup($('#dictQ').value); });
  $('#dictOut').addEventListener('click', e => { const a = e.target.closest('.dref[data-q]'); if (a) dictLookup(a.dataset.q); });
  $('#dictAdd').onclick = async () => {
    const r = await O.dictAdd();
    if (r.cancelled) return;
    await renderDictList();
    $('#dictMan').open = true;
    if (r.errors && r.errors.length) alert(r.errors.join('\n'));
    else if (r.added && r.added.length) $('#dictOut').innerHTML = `<p class="muted">Eingebunden: ${r.added.map(a => `${esc(a.name)} (${a.count.toLocaleString('de-DE')} Einträge)`).join(', ')}.</p>`;
  };
  $('#dictList').addEventListener('click', async e => {
    const b = e.target.closest('button[data-id]');
    if (!b || !confirm('Dieses Wörterbuch aus Safran entfernen? Deine DSL-Datei bleibt unberührt.')) return;
    const r = await O.dictRemove(b.dataset.id);
    if (r.error) alert(r.error);
    await renderDictList();
  });

  const plainSnip = r => (r.parts ? r.parts.map(x => x.t).join('') : `${r.snippet.before}${r.snippet.hit}${r.snippet.after}`);
  async function runSearch(only) {
    const onlyTitle = typeof only === 'string' ? only : null; // Klick auf einen Buchnamen: nur dieses Buch, mit allen Treffern
    const q = $('#sq').value.trim();
    if (!q) return;
    const kinds = $$('.sk').filter(c => c.checked).map(c => c.dataset.k);
    if (!kinds.length) { $('#sInfo').textContent = 'Bitte mindestens eine Sprache wählen.'; return; }
    $('#sGo').disabled = true; $('#sCancel').disabled = false;
    $('#sInfo').textContent = 'Suche läuft …';
    $('#sOut').innerHTML = ''; $('#sSum').innerHTML = ''; $('#sExport').hidden = true;
    const res = await O.search({
      query: q, extra: [$('#sq2').value.trim(), $('#sq3').value.trim()].filter(Boolean), distance: +$('#sDist').value, ordered: $('#sOrd').checked, fuzzy: $('#sFuzzy').checked, kinds,
      categories: onlyTitle ? [] : [...sCats], titles: onlyTitle ? [onlyTitle] : [...sTitles], prefix: $('#sPre').checked,
      limit: 1000, perFile: onlyTitle ? 1000 : 25,
    });
    $('#sGo').disabled = false; $('#sCancel').disabled = true;
    sResults = res.results;
    const totalHits = res.stats.reduce((a, x) => a + x.n, 0);
    $('#sInfo').textContent = `${totalHits}${res.truncated ? '+' : ''} Treffer in ${res.stats.length} ${res.stats.length === 1 ? 'Buch' : 'Büchern'} (${res.scanned} von ${res.total} Dateien durchsucht)${res.cancelled ? ' – abgebrochen' : ''}${res.truncated ? ' – bei 1000 angezeigten Treffern gestoppt, bitte genauer suchen' : ''}${res.capped && !onlyTitle ? ' – je Buch werden die ersten 25 gezeigt; ein Klick auf den Buchnamen oben zeigt alle' : ''}.`;
    $('#sSum').innerHTML = res.stats.length > 1 || onlyTitle
      ? (onlyTitle ? `<button class="chip" data-t="">← alle Bücher</button> ` : '') + res.stats.slice(0, 40).map(x => `<button class="chip${x.title === onlyTitle ? ' on' : ''}" data-t="${esc(x.title)}" title="Nur in diesem Buch, alle Treffer">${esc(x.title)} (${x.n})</button>`).join(' ') + (res.stats.length > 40 ? ` <span class="muted">… und ${res.stats.length - 40} weitere</span>` : '')
      : '';
    $('#sExport').hidden = !sResults.length;
    $('#sOut').innerHTML = sResults.map((r, i) => {
      const sn = r.snippet;
      return `<div class="sres" data-i="${i}"><span class="t">${esc(r.title)}</span> <span class="muted">${esc(r.where)} · <span class="badge ${r.kind}">${KIND_LABEL[r.kind]}</span>${esc(shortVer(r.versionTitle))}</span><div class="snip" dir="${r.kind === 'he' ? 'rtl' : 'ltr'}">${r.parts ? r.parts.map(x => x.m ? `<mark>${esc(x.t)}</mark>` : esc(x.t)).join('') : `${esc(sn.before)}<mark>${esc(sn.hit)}</mark>${esc(sn.after)}`}</div></div>`;
    }).join('');
  }
  $('#sSum').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) runSearch(c.dataset.t || undefined); });
  $('#sExport').onclick = async () => {
    const csv = ['Titel;Version;Sprache;Stelle;Text'].concat(sResults.map(r => [r.title, r.versionTitle, KIND_LABEL[r.kind], r.where, plainSnip(r)].map(x => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(';')));
    const r = await window.api.saveFile(`Suche – ${$('#sq').value.trim().slice(0, 40).replace(/[\\/:*?"<>|]/g, '_')}.csv`, '\ufeff' + csv.join('\r\n'));
    if (r && r.error) alert(r.error);
  };
  $('#sGo').onclick = () => runSearch();
  ['#sq', '#sq2', '#sq3'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); }));
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
    openGroup(groupsByKey.get(keyOf(entry)), { rel: r.rel, sectionPath: r.loc && r.loc.path, rowLabel: r.loc ? r.loc.label : undefined }, e.metaKey || e.ctrlKey || e.shiftKey);
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
    if (rerender && view && view.group) { const y = window.scrollY; renderSection(); window.scrollTo(0, y); } // Position beim Umschalten behalten
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
    if (!$('#dispPanel').hidden && !e.target.closest('#dispPanel') && e.target.id !== 'dispBtn') $('#dispPanel').hidden = true;
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
      ? `⚠ Eigener Text „${shortVer(o.versionTitle)}“ vs. ${KIND_LABEL[ref.entry.kind]} ${shortVer(ref.versionTitle)}: ${diffs.length} von ${total} Abschnitten weichen ab${absent ? ` · ${absent} Abschnitte fehlen ganz` : ''}`
      : `✓ Eigener Text „${shortVer(o.versionTitle)}“: alle ${total} vorhandenen Abschnitte stimmen mit der Zeilenzahl der Vorlage überein${absent ? ` · ${absent} Abschnitte fehlen ganz` : ''}`;
    $('#cmpList').innerHTML = diffs.map(d => `<div><a data-i="${d.i}">${esc(d.label)}</a>: eigen ${d.own} / Vorlage ${d.ref}${d.missing.length ? ` · fehlt: ${esc(short(d.missing))}` : ''}${d.extra.length ? ` · zusätzlich: ${esc(short(d.extra))}` : ''}</div>`).join('');
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
  const noteId = (g, sk, row) => `${g.key}|${sk}|${row}`;
  const plain = h => R.cleanHtml(R.splitFootnotes(h).main).replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  async function loadNotes() { notesAll = await NT.list(); renderNotes(); }
  function markNotes() {
    if (!view || !view.group) return;
    const s = view.sections[view.idx];
    if (!s) return;
    const ids = new Set(notesAll.map(n => n.id));
    $$('#rOut .row[data-l]').forEach(r => {
      const on = ids.has(noteId(view.group, s.k, r.dataset.l));
      r.classList.toggle('noted', on);
      const lab = r.querySelector('.lab');
      if (!lab.querySelector('.bm')) lab.insertAdjacentHTML('afterbegin', '<span class="bm" title="Lesezeichen / Notiz">☆</span>');
      const b = lab.querySelector('.bm');
      b.classList.toggle('on', on);
      b.textContent = on ? '★' : '☆';
    });
  }
  let editing = null;
  $('#rOut').addEventListener('click', e => {
    const b = e.target.closest('.bm');
    if (!b || !view || !view.group) return;
    const row = b.closest('.row');
    const s = view.sections[view.idx];
    const label = row.dataset.l;
    const id = noteId(view.group, s.k, label);
    const old = notesAll.find(n => n.id === id);
    const cells = [...row.querySelectorAll('.cell .txt')];
    const excerpt = cells.length ? plain(cells[Math.min(1, cells.length - 1)].innerHTML.replace(/<span class="note"[\s\S]*?<\/span><\/span>/g, '')).slice(0, 200) : '';
    editing = old || { id, key: view.group.key, title: view.group.title, sk: s.k, secLabel: s.label, row: label, excerpt, note: '' };
    $('#ndTitle').textContent = `${editing.title} · ${editing.secLabel} · ${editing.row}`;
    $('#ndExcerpt').textContent = editing.excerpt;
    $('#ndText').value = editing.note || '';
    $('#ndDel').hidden = !old;
    $('#noteDlg').showModal();
    $('#ndText').focus();
  });
  $('#ndSave').onclick = async () => { editing.note = $('#ndText').value.trim(); notesAll = await NT.save(editing); $('#noteDlg').close(); markNotes(); renderNotes(); };
  $('#ndDel').onclick = async () => { notesAll = await NT.remove(editing.id); $('#noteDlg').close(); markNotes(); renderNotes(); };
  $('#ndClose').onclick = () => $('#noteDlg').close();
  function renderNotes() {
    const f = $('#nFilter').value.trim().toLowerCase();
    const list = notesAll.filter(n => !f || (n.title + ' ' + n.secLabel + ' ' + n.row + ' ' + n.excerpt + ' ' + n.note).toLowerCase().includes(f)).sort((a, b) => b.ts - a.ts);
    $('#nCount').textContent = `${list.length} von ${notesAll.length}`;
    $('#nOut').innerHTML = list.map(n => `<div class="nitem" data-id="${esc(n.id)}"><button data-del="${esc(n.id)}" title="Entfernen">✕</button><div class="t">${esc(n.title)} · ${esc(n.secLabel)} · ${esc(n.row)}</div><div class="ex">${esc(n.excerpt)}</div>${n.note ? `<div class="nt">${esc(n.note)}</div>` : ''}</div>`).join('') || '<p class="muted">Noch keine Lesezeichen. Im Lesen-Reiter erscheint beim Überfahren einer Zeile links ein ☆.</p>';
  }
  $('#nFilter').addEventListener('input', renderNotes);
  $('#nOut').addEventListener('click', async e => {
    const d = e.target.closest('button[data-del]');
    if (d) { notesAll = await NT.remove(d.dataset.del); renderNotes(); markNotes(); return; }
    const it = e.target.closest('.nitem');
    const n = it && notesAll.find(x => x.id === it.dataset.id);
    const g = n && groupsByKey.get(n.key);
    if (g) openGroup(g, { sectionPath: JSON.parse(n.sk), rowLabel: n.row }, e.metaKey || e.ctrlKey || e.shiftKey);
  });


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
      return `<td dir="${d.entry.language === 'Hebrew' ? 'rtl' : 'ltr'}" class="k-${d.entry.kind}">${main}</td>`;
    };
    const body = rows.map(r => {
      let extra = '';
      const v = verseOf(r.label);
      if (o.notes) { const n = notesById.get(noteId(view.group, s.k, r.label)); if (n && n.note) extra += `<div class="nt">Notiz: ${esc(n.note)}</div>`; }
      if (o.links && v != null) {
        const ls = secLinks.filter(x => x.v1 > 0 && v >= x.v1 && v <= x.v2).map(x => x.other);
        if (ls.length) extra += `<div class="lk">Verknüpfungen: ${esc(ls.slice(0, 30).join('; '))}${ls.length > 30 ? ` … (+${ls.length - 30})` : ''}</div>`;
      }
      return `<tr><td class="lab">${esc(r.label)}</td>${r.cells.map((c, i) => cell(c, view.loaded[i])).join('')}</tr>${extra ? `<tr><td></td><td colspan="${view.loaded.length}">${extra}</td></tr>` : ''}`;
    }).join('');
    const head = `<tr><th></th>${view.loaded.map(d => `<th>${esc(KIND_LABEL[d.entry.kind])} · ${esc(shortVer(d.versionTitle))}</th>`).join('')}</tr>`;
    const src = view.loaded.map(d => `<li>${esc(KIND_LABEL[d.entry.kind])}: ${esc(d.versionTitle === 'merged' ? 'zusammengeführte Fassung' : d.versionTitle)}${d.versionSource ? ' – ' + esc(d.versionSource) : ''}</li>`).join('');
    const css = `body{font-family:"SBL Hebrew","Times New Roman",serif;font-size:11pt;line-height:1.5;color:#000}
h1{font-size:16pt;margin:0 0 4pt}h1 small{font-size:12pt;color:#555}
table{border-collapse:collapse;width:100%;table-layout:fixed}th{font-size:9pt;text-align:left;color:#555;border-bottom:1px solid #999;padding:3pt}
td{vertical-align:top;padding:4pt;border-bottom:1px solid #ddd}td.lab{width:28pt;font-size:8pt;color:#777}
td.k-he{font-size:14pt;line-height:1.8}.nt{background:#fff6d6;padding:2pt 5pt;font-size:9pt}.lk{font-size:8pt;color:#555}
ol.fn{font-size:9pt}ul.src{font-size:8pt;color:#555}tr{page-break-inside:avoid}`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(view.group.title)}</title><style>${css}</style></head><body>
<h1>${esc(view.group.title)}${view.group.heTitle ? ` <small dir="rtl">${esc(view.group.heTitle)}</small>` : ''} · ${esc(s.label)}</h1>
<table><thead>${head}</thead><tbody>${body}</tbody></table>
${endnotes.length ? `<h3>Fußnoten</h3><ol class="fn">${endnotes.map(n => `<li>${n}</li>`).join('')}</ol>` : ''}
<ul class="src">${src}</ul><p class="src" style="font-size:8pt;color:#777">Quelle: Sefaria (sefaria.org), Export vom ${new Date().toLocaleDateString('de-DE')}</p></body></html>`;
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
  const CMT_PRIO = ['Rashi', 'Ibn Ezra', 'Ramban', 'Rashbam', 'Sforno', 'Or HaChaim', 'Chizkuni', 'Radak', 'Kli Yakar', 'Bekhor Shor', 'Onkelos'];
  const saveCmt = () => { try { localStorage.setItem('cmtSel', JSON.stringify([...cmtSel])); localStorage.setItem('cmtLang', cmtLang); } catch { /* egal */ } };
  const rowVerse = lab => { const m = String(lab || '').match(/^(\d+)/); return m ? +m[1] : null; };
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
    cmtOpen = force == null ? !cmtOpen : force;
    $('#cmtPanel').hidden = !cmtOpen;
    document.body.classList.toggle('cmt-open', cmtOpen);
    $('#cmtResize').hidden = !(cmtOpen || (typeof dictOpen !== 'undefined' && dictOpen));
    $('#cmtBtn').classList.toggle('active', cmtOpen);
    if (cmtOpen) applyCmtRow();
  }
  $('#cmtBtn').onclick = () => toggleCmt();
  $('#cmtClose').onclick = () => toggleCmt(false);
  $('#cmtLang').onchange = () => { cmtLang = $('#cmtLang').value; saveCmt(); renderCmt(); };
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); toggleCmt(); } });
  function stepCmt(d) {
    const rows = $$('#rOut .row[data-l]').filter(x => rowVerse(x.dataset.l) != null);
    const i = rows.findIndex(x => x.dataset.l === cmtRow);
    const n = rows[Math.min(rows.length - 1, Math.max(0, (i < 0 ? 0 : i) + d))];
    if (n) { setCmtRow(n.dataset.l); n.scrollIntoView({ block: 'center' }); }
  }
  $('#cmtPrev').onclick = () => stepCmt(-1);
  $('#cmtNext').onclick = () => stepCmt(1);
  // Klick auf die Versnummer wählt den Vers für den Kommentar-Bereich
  $('#rOut').addEventListener('click', e => {
    const lab = e.target.closest('.lab');
    if (!lab || e.target.closest('.bm') || e.target.closest('.lk')) return;
    const row = lab.closest('.row[data-l]');
    if (row) setCmtRow(row.dataset.l);
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
    if (!cmtTouched) { cmtTouched = true; cmtSel = new Set(cmtLastChosen); try { localStorage.setItem('cmtTouched', '1'); } catch { /* egal */ } }
    if (cmtSel.has(n)) cmtSel.delete(n); else cmtSel.add(n);
    saveCmt(); renderCmt();
  });
  // Rechtsklick auf einen Kommentatornamen: im Tab, neuen Tab oder zweiten Fenster öffnen
  $('#cmtBody').addEventListener('contextmenu', e => {
    const h = e.target.closest('h4[data-ref]');
    if (!h) return;
    const ref = h.dataset.ref.replace(/-.*$/, '');
    const items = [
      { label: 'Öffnen', fn: () => jumpTo(ref, false) },
      { label: 'Im neuen Tab öffnen', fn: () => jumpTo(ref, true) },
    ];
    if (!IS_PANE2) items.push({ label: 'Im zweiten Fenster öffnen', fn: () => openInPane2(null, { jump: ref }) });
    ctxShow(e, items);
  });
  $('#cmtBody').addEventListener('click', e => {
    const h = e.target.closest('h4[data-ref]');
    if (h) jumpTo(h.dataset.ref.replace(/-.*$/, ''), true);
  });
  async function renderCmt() {
    if (!cmtOpen) return;
    const token = ++cmtToken;
    const s = view && view.group && view.sections[view.idx];
    const v = rowVerse(cmtRow);
    $('#cmtTitle').textContent = s && v != null ? `Kommentare zu ${view.group.title} ${s.label.replace(/^\D+/, '')}:${cmtRow}` : 'Kommentare';
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
    const list = [...groupsC.values()].sort((a, b) => {
      const ia = CMT_PRIO.indexOf(a.name), ib = CMT_PRIO.indexOf(b.name);
      return (local.has(b.book) - local.has(a.book)) || ((ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)) || (b.refs.length - a.refs.length);
    });
    if (!list.length) { $('#cmtChips').innerHTML = ''; $('#cmtSum').innerHTML = ''; $('#cmtBody').innerHTML = '<p class="muted">Zu diesem Vers gibt es keine Kommentare in den Verknüpfungen.</p>'; return; }
    // Nur Kommentatoren zählen als „vorhanden“, die lokal in der gewählten Sprache vorliegen (sonst wirkt die Liste vollständiger, als sie ist)
    const byTitle = new Map(groups.map(g => [g.title, g]));
    const LNm = { en: 'Englisch', de: 'Deutsch', he: 'Hebräisch' }[cmtLang];
    const hasLang = b => { const g = byTitle.get(b) || byTitle.get(String(b).split(', ')[0]); return !!g && g.versions.some(v => v.kind === cmtLang); };
    const avail = { has: b => local.has(b) && hasLang(b) };
    // Auswahl: gemerkte Kommentatoren; beim ersten Mal die bekanntesten vorhandenen
    let chosen = list.filter(g => cmtSel.has(g.name) && avail.has(g.book));
    if (!cmtTouched) { chosen = list.filter(g => avail.has(g.book)).slice(0, 2); }
    cmtLastChosen = chosen.map(g => g.name);
    const showAll = !chosen.length; // nichts gewählt -> alle in dieser Sprache vorhandenen Kommentare zeigen
    if (showAll) chosen = list.filter(g => avail.has(g.book));
    const chip = g => {
      const on = !showAll && chosen.includes(g), ok = avail.has(g.book);
      const why = ok ? g.book : local.has(g.book) ? `${g.book} – lokal vorhanden, aber nicht auf ${LNm}` : `${g.book} – nicht in deiner Bibliothek`;
      return `<button class="chip ${on ? 'on' : ''} ${ok ? '' : 'off'}" data-n="${esc(g.name)}" title="${esc(why)}">${esc(g.name)} ${g.refs.length > 1 ? g.refs.length : ''}</button>`;
    };
    const localL = list.filter(g => avail.has(g.book)), noLangL = list.filter(g => local.has(g.book) && !hasLang(g.book)), remoteL = list.filter(g => !local.has(g.book));
    $('#cmtSum').innerHTML = `${cmtChipsOpen ? '▾' : '▸'} <b>Kommentatoren</b> <span class="muted">${showAll ? (chosen.length ? `keiner gewählt – alle ${chosen.length} auf ${LNm} werden gezeigt` : `keiner auf ${LNm} vorhanden`) : esc(chosen.map(g => g.name).join(', '))} · ${localL.length} auf ${LNm}${noLangL.length ? `, ${noLangL.length} nur in anderer Sprache` : ''}${remoteL.length ? `, ${remoteL.length} nicht geladen` : ''}</span>`;
    $('#cmtChips').hidden = !cmtChipsOpen;
    $('#cmtChips').innerHTML = localL.map(chip).join('')
      + (noLangL.length ? `<details><summary>${noLangL.length} lokal, aber nicht auf ${LNm}</summary><div>${noLangL.map(chip).join('')}</div></details>` : '')
      + (remoteL.length ? `<details><summary>${remoteL.length} nicht in deiner Bibliothek</summary><div>${remoteL.map(chip).join('')}</div></details>` : '');
    if (!chosen.length) { $('#cmtBody').innerHTML = '<p class="muted">Wähle oben einen Kommentator. Grau dargestellte Kommentatoren musst du erst im Reiter „Herunterladen“ laden.</p>'; return; }
    $('#cmtBody').innerHTML = '<p class="muted">Lade …</p>';
    const refs = chosen.flatMap(g => g.refs);
    const res = await LK.texts(refs, cmtLang, true);
    if (token !== cmtToken) return; // inzwischen anderer Vers
    const LN = { en: 'Englisch', de: 'Deutsch', he: 'Hebräisch' }[cmtLang];
    const hasTxt = g => g.refs.some(r => res[r] && res[r].items);
    const gaps = showAll ? chosen.filter(g => !hasTxt(g)) : []; // ohne Auswahl: Kommentatoren ohne Text in dieser Sprache nur als Hinweis
    if (showAll) chosen = chosen.filter(hasTxt);
    const gapNote = gaps.length ? `<p class="muted">Kein ${LN}er Text zu diesem Vers: ${gaps.map(g => esc(g.name) + (g.refs.every(r => res[r] && res[r].missing) ? ' (keine Fassung in dieser Sprache geladen)' : ' (Vers fehlt in der Fassung)')).join(', ')}</p>` : '';
    if (!chosen.length) { $('#cmtBody').innerHTML = gapNote || `<p class="muted">Keine lokalen Kommentare in der Sprache ${LN} zu diesem Vers.</p>`; return; }
    $('#cmtBody').innerHTML = chosen.map(g => {
      const seenTxt = new Set();
      const parts = g.refs.map(r => {
        const t = res[r];
        if (!t || !t.items) return `<div class="none">${esc(r)} – ${t && t.missing ? `keine Fassung auf ${LN} geladen` : `Vers fehlt in der ${LN}en Fassung`}</div>`;
        const he = t.kind === 'he';
        const sig = t.items.join('\u0001'); if (seenTxt.has(sig)) return ''; seenTxt.add(sig); // gleiche Stelle mehrfach verknüpft: nur einmal zeigen
        return t.items.map(x => `<div class="ct" dir="${he ? 'rtl' : 'ltr'}">${R.cleanHtml(R.splitFootnotes(he ? stripHe(x) : x).main).replace(/<sup[^>]*>.*?<\/sup>/g, '')}</div>`).join('');
      }).join('');
      return `<div class="cmt"><h4 data-ref="${esc(g.refs[0])}" title="Klick: öffnet ${esc(g.book)} in einem neuen Tab · Rechtsklick: weitere Möglichkeiten">${esc(g.name)}${g.refs.length > 1 ? ` (${g.refs.length})` : ''}</h4>${parts}</div>`;
    }).join('') + gapNote;
    if (!fb.hidden && fTerm) runFind(fTerm, true); // Suche im Kommentar-Bereich nach dem Neuaufbau erneuern
  }

  // ---------- Sitzung merken und beim Start wiederherstellen ----------
  let saveTimer = null;
  function saveSession() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem('session', JSON.stringify({
          idx: tabIdx,
          tabs: tabs.map(t => t.group ? { key: t.group.key, rels: [...t.selected], sk: t.key, label: t.label || '', scroll: t.scroll || 0 } : { empty: true }),
        }));
      } catch { /* egal */ }
    }, 300);
  }
  async function restoreSession() {
    let ses = null;
    try { ses = JSON.parse(localStorage.getItem('session') || 'null'); } catch { ses = null; }
    if (!ses || !Array.isArray(ses.tabs) || !ses.tabs.length) return;
    for (const t of ses.tabs) {
      if (t.empty) { tabs.push({ group: null }); continue; }
      const g = groupsByKey.get(t.key);
      if (!g) continue;
      const sel = new Set((t.rels || []).filter(r => g.versions.some(v => v.rel === r)));
      if (!sel.size && g.versions[0]) sel.add(g.versions[0].rel);
      tabs.push({ group: g, selected: sel, loaded: [], sections: [], idx: 0, key: t.sk || null, label: t.label || '', scroll: t.scroll || 0, lazy: true });
    }
    if (!tabs.length) return;
    tabIdx = Math.min(Math.max(0, ses.idx | 0), tabs.length - 1);
    view = tabs[tabIdx];
    showView();
    if (view.group) { const sc = view.scroll || 0; await loadView(); window.scrollTo(0, sc); }
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

  // ---------- Start ----------
  (async () => {
    await refreshState();
    await loadLibrary();
    applyDisp(false);
    await loadNotes();
    await restoreSession();
    await refreshCatalog();
    if (!groups.length) showTab('get');
  })();
})();
