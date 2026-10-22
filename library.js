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
    $('#togglePanel').hidden = t !== 'read'; // die Bücherliste gibt es nur im Reiter „Lesen“
  }
  $$('nav button').forEach(b => (b.onclick = () => showTab(b.dataset.tab)));

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
    // Kategorien für die Suche (oberste zwei Ebenen)
    const paths = new Set();
    for (const g of groups) for (let n = 1; n <= Math.min(2, g.cats.length); n++) paths.add(g.cats.slice(0, n).join('/'));
    const cur = $('#sCat').value;
    $('#sCat').innerHTML = '<option value="">Alle Kategorien</option>' + [...paths].sort().map(p => `<option value="${esc(p)}">${esc(p.split('/').length > 1 ? '\u2003' + p.split('/').slice(1).join(' › ') + ' (' + p.split('/')[0] + ')' : p)}</option>`).join('');
    $('#sCat').value = [...paths].includes(cur) ? cur : '';
    // geöffnete Tabs auf die neu aufgebauten Buchobjekte umstellen; Bücher, die es nicht mehr gibt, schließen
    for (let i = tabs.length - 1; i >= 0; i--) {
      const t = tabs[i];
      if (!t.group) continue;
      const ng = groupsByKey.get(t.group.key);
      if (ng) t.group = ng; else { tabs.splice(i, 1); if (i < tabIdx) tabIdx--; }
    }
    if (tabs.length && !tabs[tabIdx]) { tabIdx = tabs.length - 1; view = tabs[tabIdx]; }
    if (!tabs.length) { tabIdx = -1; view = null; }
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
      const kids = [...n.children.values()].sort((a, b) => a.name.localeCompare(b.name)).map(c => node(c, pth + '/' + c.name, depth + 1)).join('');
      const ts = n.titles.filter(match).sort((a, b) => a.title.localeCompare(b.title))
        .map(g => `<a class="lib-item" data-key="${esc(g.key)}">${esc(g.title)}${g.heTitle ? `<small dir="rtl">${esc(g.heTitle)}</small>` : ''}</a>`).join('');
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
      $('#rOut').innerHTML = `<div class="newtab"><p class="muted">Neuer Tab – Stelle oder Buch eingeben (z. B. <b>Gen. 1</b>, <b>Berakhot 2a</b>, <b>Mishnah Peah 6:6</b>) und Enter drücken, oder links ein Buch wählen.</p>
        <input id="ntIn" list="ntList" placeholder="Gen. 1:1" autocomplete="off"><datalist id="ntList">${groups.map(g => `<option value="${esc(g.title)}">`).join('')}</datalist><p id="ntMsg" class="muted"></p></div>`;
      setTimeout(() => { const i = $('#ntIn'); if (i) i.focus(); }, 0);
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
    if (!ok && !/\d/.test(q)) { // nur ein Buchname: Buch von vorn öffnen
      const b = normT(q);
      const c = groups.filter(g => normT(g.title).startsWith(b) || normT(g.title).split(' ').some(w => w.startsWith(b)))
        .sort((a, b2) => (normT(a.title) === b ? 0 : 1) - (normT(b2.title) === b ? 0 : 1) || a.title.length - b2.title.length);
      if (c.length) { await openGroup(c[0]); ok = true; }
    }
    if (!ok) { const m = $('#ntMsg'); if (m) m.textContent = 'Nicht gefunden – nur Bücher aus deiner Bibliothek sind möglich.'; }
  });

  async function openGroup(g, target = {}, inNewTab = false) {
    if (!g) return;
    saveScroll();
    const nv = { group: g, selected: new Set(), loaded: [], sections: [], idx: 0, key: null };
    if (!tabs.length || (inNewTab && tabs[tabIdx] && tabs[tabIdx].group)) { tabs.push(nv); tabIdx = tabs.length - 1; }
    else { nv.nav = tabs[tabIdx] && tabs[tabIdx].nav; tabs[tabIdx] = nv; } // Verlauf des Tabs bleibt beim Buchwechsel erhalten
    view = nv;
    if (target.showCompare) nv.cmpRel = target.rel;
    const first = k => g.versions.find(v => v.kind === k && v.versionTitle === 'merged') || g.versions.find(v => v.kind === k);
    ['he', 'en', 'de'].forEach(k => { const v = first(k); if (v) view.selected.add(v.rel); });
    if (!view.selected.size && g.versions[0]) view.selected.add(g.versions[0].rel);
    if (target.rel) view.selected.add(target.rel);
    showTab('read');
    showView();
    await loadView(target);
  }

  async function loadView(target = {}) {
    $('#rOut').innerHTML = '<p class="muted">Lade …</p>';
    const loaded = [];
    for (const rel of view.selected) {
      let d = cache.get(rel);
      if (!d) {
        try { d = await O.read(rel); } catch { continue; }
        cache.set(rel, d);
        if (cache.size > 12) cache.delete(cache.keys().next().value);
      }
      loaded.push(d);
    }
    loaded.sort((a, b) => KIND_RANK[a.entry.kind] - KIND_RANK[b.entry.kind]);
    view.loaded = loaded;

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
    const prevKey = view.key;
    view.sections = secs;
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
    view.idx = idx;

    const g = view.group;
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
      `<label><input type="checkbox" data-rel="${esc(v.rel)}" ${view.selected.has(v.rel) ? 'checked' : ''}> <span class="badge ${v.kind}">${KIND_LABEL[v.kind]}</span>${v.own ? '<span class="badge own">eigen</span>' : ''}${esc(shortVer(v.versionTitle))}${v.own ? ` <button class="ownx" data-rm="${esc(v.rel)}" title="Diesen eigenen Text entfernen">✕</button>` : ''}</label>`).join('');
  }
  $('#verList').addEventListener('click', async e => {
    const rel = e.target.dataset && e.target.dataset.rm;
    if (!rel) return;
    e.preventDefault();
    if (!confirm('Diesen eigenen Text aus der Bibliothek entfernen? (Die Originaldatei bleibt unberührt.)')) return;
    const r = await O.ownRemove(rel);
    if (r.error) return alert(r.error);
    const key = view.group.key;
    await loadLibrary();
    const g = groupsByKey.get(key);
    if (g) openGroup(g); else if (tabIdx >= 0) closeTab(tabIdx);
    refreshState();
  });
  $('#verList').addEventListener('change', async e => {
    const rel = e.target.dataset.rel;
    if (!rel || !view) return;
    if (e.target.checked) view.selected.add(rel); else view.selected.delete(rel);
    if (!view.selected.size) { view.selected.add(rel); }
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

  function renderSection(rowLabel) {
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
    if (!m) return false;
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
  let recentOpen = true;
  try { recentOpen = localStorage.getItem('recentOpen') !== '0'; } catch { /* egal */ }
  const applyRecent = () => {
    $('#recent').hidden = !recentOpen;
    $('#recentArrow').textContent = recentOpen ? '▾' : '▸';
    try { localStorage.setItem('recentOpen', recentOpen ? '1' : '0'); } catch { /* egal */ }
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
      if (n) r.querySelector('.lab').insertAdjacentHTML('beforeend', `<br><span class="lk" data-v="${v}" title="${n} Verknüpfungen">🔗${n}</span>`);
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
    $('#lkBody').innerHTML = [...cats.entries()].sort((a, b) => b[1].size - a[1].size).map(([c, books]) => {
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
  O.onFindOpen(openFind);
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
  function renderOwnList() {
    $('#ownList').innerHTML = ownItems.map((it, i) => it.error
      ? `<div class="orow err"><div class="oh"><b>${esc(it.name)}</b></div><span class="muted">⚠ ${esc(it.error)}</span></div>`
      : `<div class="orow" data-i="${i}"><div class="oh"><input type="checkbox" data-f="on" ${it.on ? 'checked' : ''}><b title="${esc(it.name)}">${esc(it.name)}</b><span class="muted">${it.chapters} Abschnitt(e) · ${it.segments} Segmente${it.warnings.length ? ` · ⚠ ${it.warnings.length} Hinweis(e)` : ''}</span></div>
        <div class="of"><label>Titel<input type="text" list="ownTitles" data-f="title" value="${esc(it.title)}"></label>
        <label>Sprache<select data-f="kind">${[['de', 'Deutsch'], ['en', 'Englisch'], ['he', 'Hebräisch'], ['other', 'Andere']].map(([k, n]) => `<option value="${k}" ${it.kind === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>Name der Version<input type="text" data-f="ver" value="${esc(it.ver)}"></label></div>
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
      ownItems.push({ ...f, title: m.title || baseName(f.name), kind: m.kindGuess || 'de', ver: m.versionTitle || baseName(f.name), on: true });
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
    if (f) it[f] = e.target.value;
  });
  // Dateien ins Fenster ziehen
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => e.preventDefault());
  O.onOwnDrop(r => addOwnFiles(r));
  $('#ownSave').onclick = async () => {
    const todo = ownItems.filter(i => !i.error && i.on && i.title.trim());
    const items = todo.map(i => {
      const g = groups.find(x => x.title === i.title.trim());
      return { id: i.id, title: i.title.trim(), heTitle: (g && g.heTitle) || '', kind: i.kind, versionTitle: i.ver.trim(), categories: g ? g.cats : ['Eigene Texte'] };
    });
    if (!items.length) { $('#ownWarn').textContent = '⚠ Bitte bei jedem Text einen Titel angeben.'; return; }
    $('#ownSave').disabled = true;
    const r = await O.ownSave(items);
    if (r.errors && r.errors.length) $('#ownWarn').textContent = '⚠ ' + r.errors.join(' · ');
    const done = new Set(r.entries.map(e => e.rel));
    ownItems = ownItems.filter(i => !todo.some(t => t.id === i.id) || r.errors.some(er => er.startsWith(i.title)));
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

  async function runSearch() {
    const q = $('#sq').value.trim();
    if (!q) return;
    const kinds = $$('.sk').filter(c => c.checked).map(c => c.dataset.k);
    if (!kinds.length) { $('#sInfo').textContent = 'Bitte mindestens eine Sprache wählen.'; return; }
    $('#sGo').disabled = true; $('#sCancel').disabled = false;
    $('#sInfo').textContent = 'Suche läuft …';
    $('#sOut').innerHTML = '';
    const res = await O.search({ query: q, kinds, category: $('#sCat').value, prefix: $('#sPre').checked, limit: 300 });
    $('#sGo').disabled = false; $('#sCancel').disabled = true;
    sResults = res.results;
    $('#sInfo').textContent = `${res.results.length}${res.truncated ? '+' : ''} Treffer in ${res.scanned} von ${res.total} Dateien${res.cancelled ? ' (abgebrochen)' : ''}${res.truncated ? ' – nur die ersten 300 werden angezeigt, bitte genauer suchen' : ''}.`;
    $('#sOut').innerHTML = sResults.map((r, i) => {
      const sn = r.snippet;
      return `<div class="sres" data-i="${i}"><span class="t">${esc(r.title)}</span> <span class="muted">${esc(r.where)} · <span class="badge ${r.kind}">${KIND_LABEL[r.kind]}</span>${esc(shortVer(r.versionTitle))}</span><div class="snip" dir="${r.kind === 'he' ? 'rtl' : 'ltr'}">${esc(sn.before)}<mark>${esc(sn.hit)}</mark>${esc(sn.after)}</div></div>`;
    }).join('');
  }
  $('#sGo').onclick = runSearch;
  $('#sq').addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
  $('#sCancel').onclick = () => O.cancelSearch();
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
      const kids = [...n.children.values()].sort((a, b) => a.name.localeCompare(b.name)).map(node).join('');
      const ts = n.titles.sort((a, b) => a.title.localeCompare(b.title)).map(s => titleRow(s, false)).join('');
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
    if (rerender && view && view.group) renderSection(view.rowLabelKeep);
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
  }
  $('#cmpList').addEventListener('click', e => {
    const a = e.target.closest('a[data-i]');
    if (a) { view.idx = +a.dataset.i; renderSection(); }
  });
  function markMismatch() {
    if (!view || !view.cmp) return;
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
    // Auswahl: gemerkte Kommentatoren; beim ersten Mal die bekanntesten lokal vorhandenen
    let chosen = list.filter(g => cmtSel.has(g.name) && local.has(g.book));
    if (!cmtTouched) { chosen = list.filter(g => local.has(g.book)).slice(0, 2); }
    cmtLastChosen = chosen.map(g => g.name);
    const showAll = !chosen.length; // nichts gewählt -> alle lokal vorhandenen Kommentare zeigen
    if (showAll) chosen = list.filter(g => local.has(g.book));
    const chip = g => {
      const on = !showAll && chosen.includes(g), ok = local.has(g.book);
      return `<button class="chip ${on ? 'on' : ''} ${ok ? '' : 'off'}" data-n="${esc(g.name)}" title="${ok ? esc(g.book) : esc(g.book) + ' – nicht in deiner Bibliothek'}">${esc(g.name)} ${g.refs.length > 1 ? g.refs.length : ''}</button>`;
    };
    const localL = list.filter(g => local.has(g.book)), remoteL = list.filter(g => !local.has(g.book));
    $('#cmtSum').innerHTML = `${cmtChipsOpen ? '▾' : '▸'} <b>Kommentatoren</b> <span class="muted">${showAll ? (chosen.length ? `keiner gewählt – alle ${chosen.length} lokalen werden gezeigt` : 'keine lokal vorhanden') : esc(chosen.map(g => g.name).join(', '))} · ${localL.length} lokal${remoteL.length ? `, ${remoteL.length} weitere` : ''}</span>`;
    $('#cmtChips').hidden = !cmtChipsOpen;
    $('#cmtChips').innerHTML = localL.map(chip).join('') + (remoteL.length ? `<details><summary>${remoteL.length} nicht in deiner Bibliothek</summary><div>${remoteL.map(chip).join('')}</div></details>` : '');
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
      return `<div class="cmt"><h4 data-ref="${esc(g.refs[0])}" title="Öffnet ${esc(g.book)} in einem neuen Tab">${esc(g.name)}${g.refs.length > 1 ? ` (${g.refs.length})` : ''}</h4>${parts}</div>`;
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
    if (typing || e.metaKey || e.ctrlKey || e.altKey || !view || !view.group) return;
    if (e.key === 'ArrowRight') { $('#nextSec').click(); e.preventDefault(); }       // nächster Abschnitt
    if (e.key === 'ArrowLeft') { $('#prevSec').click(); e.preventDefault(); }        // voriger Abschnitt
  });
  window.__closeCurrentTab = () => { if (tabIdx >= 0) closeTab(tabIdx); else window.close(); };

  // ---------- Kopfzeile ----------
  $('#chooseDir').onclick = async () => { await O.chooseDir(); await refreshState(); await loadLibrary(); };
  $('#reveal').onclick = () => O.reveal();

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
