(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const R = window.Reader;
  const O = window.offline;

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KIND_LABEL = { he: 'Hebr.', en: 'Engl.', de: 'Deutsch', other: 'Andere' };
  const KIND_RANK = { he: 0, en: 1, de: 2, other: 3 };
  // Abschnitte mehrerer Versionen in die Reihenfolge des Werks bringen: Schlüssel komplexer Texte nach dem Schema
  // (z. B. „Preface“ vor den Büchern), Zahlen aufsteigend – sonst stünden Teile, die nur eine Version hat, am Ende
  function orderSecs(secs, loaded) {
    const rank = new Map();
    const walk = (nodes, depth) => (nodes || []).forEach(n => { const k = depth + '\u0000' + (n.enTitle ?? n.key ?? ''); if (!rank.has(k)) rank.set(k, rank.size); walk(n.nodes, depth + 1); });
    for (const d of loaded) if (d.schema && d.schema.nodes) walk(d.schema.nodes, 0);
    const first = new Map(); secs.forEach((s, i) => s.path.forEach((p, j) => { const k = j + '\u0000' + p; if (typeof p === 'string' && !first.has(k)) first.set(k, i); }));
    const keyOf = (p, j) => { const k = j + '\u0000' + p; return rank.has(k) ? rank.get(k) : 1e6 + (first.get(k) || 0); };
    return secs.map((s, i) => [s, i]).sort(([a, ia], [b, ib]) => {
      for (let j = 0; j < Math.min(a.path.length, b.path.length); j++) {
        const x = a.path[j], y = b.path[j];
        if (x === y) continue;
        if (typeof x === 'number' && typeof y === 'number') return x - y;
        if (typeof x === 'string' && typeof y === 'string') return keyOf(x, j) - keyOf(y, j) || ia - ib;
        return ia - ib;
      }
      return a.path.length - b.path.length || ia - ib;
    }).map(([s]) => s);
  }
  const fmtSize = b => (b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : (b / 1048576).toFixed(1) + ' MB');
  const shortVer = v => {
    if (v === 'merged') return 'zusammengeführt';
    const s = String(v || '').replace(/\s*\[[a-z]{2,3}\]\s*$/i, '');
    return s.length > 90 ? s.slice(0, 90) + '…' : s;
  };
  // Vorschau-Blasen und -Zeilen: jede Fassung mit ihrem Namen kennzeichnen, damit klar ist, woher der Text kommt
  const pvVer = vt => vt ? `<span class="pvVer">${esc(vt === 'merged' ? I18N.tr('zusammengeführte Fassung') : shortVer(vt))}</span>` : '';
  // Kennung eines Buchs; steht in HTML-Attributen, darf daher kein Steuerzeichen enthalten
  const keyOf = e => e.categories.join('/') + '¦' + e.title;

  // ---------- Reiter ----------
  let onTabChange = null; // wird weiter unten für den Reiter „Wörterbuch“ gesetzt
  const tabScroll = {}; // Scrollposition von Notizen/Suche, damit man nach einem Sprung ins Lesen an derselben Stelle zurückkommt
  // Wörterbuch-Reiter: Fläche beginnt direkt unter der Kopfzeile (Höhe hängt vom Fenster ab), in der Seitenleiste bleibt es beim festen Wert
  function dictPlace() {
    const p = document.getElementById('dictPanel'), h = document.querySelector('header');
    const v = document.documentElement.dataset.tab === 'dict' && h ? (document.body.classList.contains('hd-hidden') ? 0 : Math.round(Math.max(0, h.offsetTop - window.scrollY) + h.offsetHeight)) + 'px' : ''; // ohne die Verschiebung beim Aus-/Einblenden; ausgeblendet = 0
    if (p) p.style.top = v;
    document.documentElement.style.setProperty('--dict-top', v || '57px');
  }
  window.addEventListener('resize', dictPlace);
  try { const hh = document.querySelector('header'); if (hh && window.ResizeObserver) new ResizeObserver(()=>requestAnimationFrame(dictPlace)).observe(hh); } catch { /* egal */ }
  function showTab(t) {
    const prevTab = document.documentElement.dataset.tab || 'read'; // vor dem ersten Wechsel steht noch kein data-tab, die Seite zeigt aber „Lesen“
    if (prevTab === 'notes' || prevTab === 'search') tabScroll[prevTab] = window.scrollY;
    $$('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    $$('main > section').forEach(s => (s.hidden = s.id !== 'tab-' + t));
    document.documentElement.dataset.tab = t;
    if (prevTab !== t && typeof window.hdShow === 'function') window.hdShow(); // beim Reiterwechsel ist die Tableiste immer zu sehen (Kapitelwechsel im selben Reiter lässt sie, wie sie ist)
    dictPlace();
    try { renderTabs(); } catch { /* beim ersten Aufruf sind die Tabs noch nicht angelegt */ } // Fenstertitel neu setzen
    $('#togglePanel').hidden = t !== 'read'; // die Bücherliste gibt es nur im Reiter „Lesen“
    if (prevTab && prevTab !== t && (prevTab === 'read' || t === 'read') && panelOpen) { panelOpen = false; applyPanel(); } // beim Verlassen und Zurückkehren ist die Bücherliste zu
    if (onTabChange) onTabChange(t, prevTab);
    if (prevTab !== t && typeof window.__refind === 'function') window.__refind(); // offene Suchleiste: im neuen Reiter neu suchen
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
    { // eigene Fassungen (z. B. deutsche Übersetzung) in einer anderen Kategorie als das Sefaria-Buch: zum Buch gleichen Titels stellen
      const base = new Map(); groups.forEach(g => { if (g.versions.some(v => !v.own) && !base.has(g.title)) base.set(g.title, g); });
      groups = groups.filter(g => { const b = base.get(g.title); if (b && b !== g && g.versions.every(v => v.own)) { b.versions.push(...g.versions); return false; } return true; });
    }
    for(const g of groups)g.versions.push(...window.LibraryMishnahReader.entries(g));
    // Eigene Fassung mit demselben Versionsnamen wie eine Sefaria-Version (z. B. korrigierte eigene Übersetzung, die auch auf Sefaria liegt): nur die eigene zeigen, nicht beide nebeneinander
    groups.forEach(g => { const vn = t => String(t || '').replace(/\s*\[[a-z]{2,3}\]\s*$/i, ''), ownNames = new Set(g.versions.filter(v => v.own).map(v => vn(v.versionTitle))); if (ownNames.size) g.versions = g.versions.filter(v => v.own || !ownNames.has(vn(v.versionTitle))); }); // gleicher Titel (auch mit Sprachkürzel „ [de]“ am Ende): die eigene Fassung hat Vorrang
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

  // ---------- Neuer Tab: Wochenabschnitt, Haftara, Daf Yomi (Daten von hebcal.com, siehe main.js) ----------
  let calData = null, calDay = '', calDate = null; // calDate: gewähltes Datum (null = heute)
  const ymdL = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (ds, n) => { const [y, m, d] = ds.split('-').map(Number); return ymdL(new Date(y, m - 1, d + n)); };
  // Sefaria-Link von hebcal → Stelle für Safran: „Bekhorot.53a“ → „Bekhorot 53a“, „Jerusalem_Talmud_Sanhedrin.4.5.2-7.1“ → „Jerusalem Talmud Sanhedrin 4:5:2“
  const calRef = link => { try { const u = new URL(link); if (!/sefaria\.org$/.test(u.hostname)) return null; const m = decodeURIComponent(u.pathname.slice(1)).match(/^(.+?)\.([\w.]+?)(?:-[\w.]+)?$/); return m ? m[1].replace(/_/g, ' ') + ' ' + m[2].replace(/\./g, ':') : null; } catch { return null; } };
  const refStart = r => String(r || '').trim().replace(/-\d+(?::\d+)?$/, ''); // „Genesis 25:19-28:9“ → „Genesis 25:19“
  const fmtD = (d, wd = true) => { try { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString(I18N.loc, { ...(wd ? { weekday: 'long' } : {}), day: 'numeric', month: 'long' }); } catch { return d; } };
  async function renderNtCal() {
    const box = $('#ntCal'); if (!box) return;
    const real = ymdL(new Date());
    if (calDate === real) calDate = null;
    const key = (calDate || real);
    if (!calData || calDay !== key) { try { calData = await O.calendar(calDate || undefined); calDay = key; } catch { calData = null; } }
    if (!box.isConnected) return;
    const nav = d => `<div class="calNav"><button type="button" data-cal="-7" title="${esc(I18N.t('Eine Woche zurück'))}">«</button><button type="button" data-cal="-1" title="${esc(I18N.t('Einen Tag zurück'))}">‹</button><input type="date" id="calPick" value="${esc(d)}"><button type="button" data-cal="1" title="${esc(I18N.t('Einen Tag vor'))}">›</button><button type="button" data-cal="7" title="${esc(I18N.t('Eine Woche vor'))}">»</button>${calDate ? `<button type="button" data-cal="0">${esc(I18N.t('Heute'))}</button>` : ''}</div>`;
    if (!calData || !calData.items || !calData.items.length) { box.innerHTML = calData && calData.error ? `<div class="calBox">${nav(key)}<p class="muted small">${esc(I18N.t('Kalender (hebcal.com) nicht erreichbar.'))}</p></div>` : ''; return; }
    const it = calData.items, t = calData.today;
    const par = it.find(x => x.category === 'parashat' && x.date >= t);
    const bav = it.find(x => x.category === 'dafyomi' && x.date === t);
    const yer = it.find(x => x.category === 'yerushalmi' && x.date === t);
    const lnk = (ref, txt) => ref ? `<a class="calLink" data-ref="${esc(ref)}" title="${esc(I18N.t('In Safran öffnen'))}: ${esc(ref)}">${esc(txt)}</a>` : esc(txt);
    const rows = [];
    if (par) {
      const name = par.title.replace(/^Parashat /, '');
      rows.push(`<div class="calRow"><span class="calK">${esc(I18N.t('Wochenabschnitt'))}</span><span class="calV">${lnk(refStart(par.torah), name)} <span class="he" dir="rtl">${esc((par.hebrew || '').replace(/^פרשת /, ''))}</span><small class="muted">${par.torah ? esc(par.torah) + ' · ' : ''}${esc(I18N.t('Schabbat'))}, ${esc(fmtD(par.date, false))}</small></span></div>`);
      if (par.haftarah) rows.push(`<div class="calRow"><span class="calK">${esc(I18N.t('Haftara'))}</span><span class="calV">${par.haftarah.split(/\s*[;,]\s*(?=[A-Z1-9I])/).map(h => lnk(refStart(h), h)).join(' · ')}</span></div>`);
    }
    if (bav) rows.push(`<div class="calRow"><span class="calK">${esc(I18N.t('Daf Yomi (Bavli)'))}</span><span class="calV">${lnk(calRef(bav.link), bav.title)} <span class="he" dir="rtl">${esc(bav.hebrew || '')}</span></span></div>`);
    if (yer) rows.push(`<div class="calRow"><span class="calK">${esc(I18N.t('Jeruschalmi Yomi'))}</span><span class="calV">${lnk(calRef(yer.link), yer.title)} <span class="he" dir="rtl">${esc(yer.hebrew || '')}</span></span></div>`);
    const hd = (bav || yer || {}).hdate;
    box.innerHTML = rows.length ? `<div class="calBox">${nav(t)}<div class="calHead">${esc(fmtD(t))}${hd ? ` · <span>${esc(hd)}</span>` : ''}${calDate ? ` <small class="muted">(${esc(I18N.t(t < real ? 'vergangen' : 'kommend'))})</small>` : ''}</div>${rows.join('')}<div class="calSrc muted">${esc(I18N.t('Quelle'))}: hebcal.com (${esc(I18N.t('Diaspora'))})</div></div>` : '';
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('#ntCal a.calLink'); if (a) { e.preventDefault(); jumpTo(a.dataset.ref, false); return; }
    const b = e.target.closest('#ntCal [data-cal]'); if (!b) return;
    const n = +b.dataset.cal, base = calDate || ymdL(new Date());
    calDate = n === 0 ? null : addDays(base, n); renderNtCal();
  });
  document.addEventListener('change', e => { if (e.target.id === 'calPick' && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) { calDate = e.target.value; renderNtCal(); } });

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
    if (a) openGroup(groupsByKey.get(a.dataset.key), {}, BG(e));
  });

  // ---------- Lesen: Buch öffnen und anzeigen ----------
  // ---------- Tabs ----------
  const tabs = [];
  let tabIdx = -1;
  const tabsUI = window.LibraryTabs.create({
    $, esc, isPane2: () => IS_PANE2,
    state: {
      tabs,
      get tabIdx() { return tabIdx; }, set tabIdx(i) { tabIdx = i; },
      get view() { return view; }, set view(v) { view = v; },
    },
    showTab, showView, saveSession: () => navigationUI.saveSession(), resetCalendar: () => { calDate = null; },
    loadView, jumpTo,
  });
  function renderTabs() { return tabsUI.render(); }
  // Shared welcome area for new tabs and empty inline search results.
  function newTabHtml() {
    return `<div class="newtab"><img class="logo" src="logo.png" alt="talmud.de" width="130"><p class="muted">Neuer Tab – Stelle oder Buch eingeben (z. B. <b>Gen. 1</b>, <b>Berakhot 2a</b>, <b>Mishnah Peah 6:6</b>) und Enter drücken, oder links ein Buch wählen.</p>
        <input id="ntIn" placeholder="Gen. 1:1" autocomplete="off"><p id="ntMsg" class="muted"></p><div id="ntCal"></div></div>`;
  }
  function mountNewTab() {
    const area=$('#rOut .newtab');if(!area)return;
    renderNtCal();
    const sg=$('#startGuide');
    if(sg&&!entries.some(e=>!e.own)&&!area.querySelector('.startGuide')){
      const c=sg.cloneNode(true);c.removeAttribute('id');c.hidden=false;c.classList.add('startGuide');area.appendChild(c);
    }
    const input=area.querySelector('#ntIn');
    setTimeout(()=>{if(input?.isConnected){attachSuggest(input);input.focus();}},0);
  }
  function showView() {
    navigationUI.saveSession();
    navigationUI.updateNav();
    const none = !tabs.length;
    $('#rEmpty').hidden = !none;
    $('#rMain').hidden = none;
    $('#stick').classList.toggle('emptytab', !none && !view.group);
    if (!none && view.sres) { if (view.sres.html) { $('#rOut').innerHTML = view.sres.html; mountNewTab(); } else if (!view.sres.running) runSres(view); }
    else if (!none && !view.group) {
      $('#rOut').innerHTML = newTabHtml();
      mountNewTab();
    }
    outlineUI.olBtnRefresh(); if (!none && !view.group) $('#mapBtn').hidden = true;
    renderTabs();
  }
  function addTab(nv, bg = false) { return tabsUI.add(nv, bg); }
  function newTab() { return tabsUI.newTab(); }
  function saveScroll() { return tabsUI.saveScroll(); }
  function switchTab(i) { return tabsUI.switchTab(i); }
  function closeTab(i) { return tabsUI.closeTab(i); }
  function reopenTab() { return tabsUI.reopenTab(); }

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
      // in der Reihenfolge der Spalten (view.selected), damit Ersetzen/Tauschen im Spaltenmenü auch im nächsten Buch gilt
      const titles = [...new Set([...view.selected].map(rel => view.group.versions.find(v => v.rel === rel)).filter(v => v && kindKey(v) === k).map(v => v.versionTitle))];
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
  // Reihenfolge der hebräischen Fassungen als Vorgabe: Westminster, vokalisierte Ausgabe, andere, zuletzt „zusammengeführt“
  function heRank(t) { return /^Kaufmann A50 · Digital Mishnah$/.test(t)?0:/Safran-Morphologie/.test(t) ? 3 : /westminster/i.test(t) ? 0 : /vocalized|vokalisiert/i.test(t) ? 1 : t === 'merged' ? 9 : 2; }
  function pickVersions(g) {
    const sel = new Set();
    // Hebräisch: der Westminster-Text (OSHB) hat Vorrang, dann eine echte Ausgabe (z. B. William Davidson, vokalisiert);
    // Sefarias zusammengeführte Fassung nur, wenn es keine andere gibt
    const first = k => k === 'he' ? [...g.versions.filter(v => v.kind === 'he')].sort((a, b) => heRank(a.versionTitle) - heRank(b.versionTitle))[0]
      : (g.versions.find(v => v.kind === k && v.versionTitle !== 'merged') || g.versions.find(v => v.kind === k));
    // Voreinstellung nach Oberflächensprache: Hebräisch immer, dazu Englisch bzw. Deutsch (Hebräisch-Oberfläche: nur Hebräisch); fehlt Deutsch, hilft Englisch aus
    const want = new Set(['he']);
    if (I18N.lang === 'en') want.add('en'); else if (I18N.lang === 'de') { want.add('de'); if (!first('de')) want.add('en'); }
    // Zuletzt gewählte Versionen gelten in jedem Buch weiter, das sie hat; sonst die Voreinstellung der Sprache
    for (const k of ['he', 'en', 'de', 'other']) {
      const titles = (Array.isArray(prefVer[k]) ? prefVer[k] : []).filter(t => !(k === 'he' && t === 'merged')); // zusammengeführt wird nie als Vorgabe übernommen
      const mine = g.versions.filter(v => kindKey(v) === k && titles.includes(v.versionTitle) && (v.versionTitle !== 'merged' || !g.versions.some(x=>x.kind===v.kind&&x.versionTitle!=='merged'))).sort((a, b) => titles.indexOf(a.versionTitle) - titles.indexOf(b.versionTitle)); // gemerkte Spaltenreihenfolge
      if (mine.length) mine.forEach(v => sel.add(v.rel));
      else if (want.has(k)) { const v = first(k); if (v) sel.add(v.rel); }
    }
    if (!sel.size) ['he', 'en', 'de'].forEach(k => { const v = first(k); if (v) sel.add(v.rel); });
    if (!sel.size && g.versions[0]) sel.add(g.versions[0].rel);
    return sel;
  }
  async function openGroup(g, target = {}, inNewTab = false) {
    if (!g) return;
    if (inNewTab === 'bg') return openGroupBg(g, target);
    saveScroll();
    const nv = { group: g, selected: new Set(), loaded: [], sections: [], idx: 0, key: null };
    if (!tabs.length || (tabs[tabIdx] && tabs[tabIdx].sres) || (inNewTab && tabs[tabIdx] && tabs[tabIdx].group)) addTab(nv);
    else { nv.nav = tabs[tabIdx] && tabs[tabIdx].nav; tabs[tabIdx] = nv; } // Verlauf des Tabs bleibt beim Buchwechsel erhalten
    view = nv;
    if (target.showCompare) nv.cmpRel = target.rel;
    pickVersions(g).forEach(r => view.selected.add(r));
    if (target.rel) view.selected.add(target.rel);
    showTab('read');
    showView();
    await loadView(target);
  }

  // Cmd/Strg-Klick (überall): Ziel als neuen Tab im Hintergrund öffnen; ‚bg‘ wird an openGroup/jumpTo weitergereicht
  function BG(e) { return (e.metaKey || e.ctrlKey) ? 'bg' : false; }
  // Cmd/Strg-Klick: Treffer als neuen Tab im Hintergrund anlegen, der Suchreiter bleibt offen (geladen wird beim ersten Öffnen des Tabs)
  function openGroupBg(g, target = {}) {
    if (!g) return;
    if (!tabs.length) return openGroup(g, target, false); // noch kein Tab: normal öffnen
    const nv = { group: g, selected: new Set(), loaded: [], sections: [], idx: 0, key: null, target };
    if (target.showCompare) nv.cmpRel = target.rel;
    pickVersions(g).forEach(r => nv.selected.add(r));
    if (target.rel) nv.selected.add(target.rel);
    addTab(nv, true); renderTabs(); navigationUI.saveSession();
  }
  function loadTabView() { return tabsUI.load(); }

  async function loadView(target = {}) {
    const V = view; // Tab, für den geladen wird (der Nutzer kann inzwischen woanders sein)
    const tok = V.loadTok = (V.loadTok || 0) + 1;
    for(const rel of [...V.selected]){const old=V.group.versions.find(v=>v.rel===rel);if(old?.versionTitle!=='merged')continue;const replacement=V.group.versions.filter(v=>v.kind===old.kind&&v.versionTitle!=='merged').sort((a,b)=>heRank(a.versionTitle)-heRank(b.versionTitle))[0];if(replacement){V.selected.delete(rel);V.selected.add(replacement.rel);}}
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
        try { const entry=V.group.versions.find(e=>e.rel===rel);d=entry?.mishnahWitness?await mishnahReaderUI.read(entry):await O.read(rel); } catch { continue; }
        await versReady; applyVers(d);
        const ver = V.group.versions.find(x => x.rel === rel);
        d.__b = (ver && ver.bytes) || 2e6;
        cache.set(rel, d);
        let tot = 0; for (const x of cache.values()) tot += x.__b || 0;
        for (const k of cache.keys()) { if (tot <= 80e6 || cache.size <= 1) break; if (k === rel) continue; tot -= cache.get(k).__b || 0; cache.delete(k); } // nach Datenmenge begrenzen (große Talmud-Dateien)
      }
      loaded.push(d);
    }
    if (V.loadTok !== tok) return; // ein neuerer Ladevorgang für diesen Tab läuft
    // An imported edition can also be shipped under another filename. Hide
    // only exact copies of the same named edition; keep both files intact.
    const unique=[];
    for(const d of loaded){
      const twin=unique.find(x=>d.textHash&&x.textHash===d.textHash&&x.entry.kind===d.entry.kind&&x.versionTitle===d.versionTitle);
      if(twin){
        V.selected.delete(d.entry.rel);
        V.group.versions=V.group.versions.filter(e=>e.rel!==d.entry.rel);
      }else unique.push(d);
    }
    loaded.splice(0,loaded.length,...unique);
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
        const label = V.group.title==='Ben Sira'&&d.entry.language==='Greek'&&path.length===1&&path[0]===51 ? I18N.t('Prolog (griechisch)') : fi >= 0 && fi + 1 < s0.path.length ? R.pathLabel(path, d.sectionNames) : s0.label;
        const k = JSON.stringify(path);
        if (!seen.has(k)) { seen.add(k); secs.push({ path, label, k }); }
        else if(d.greekMorphology?.work?.startsWith('tlg0526.'))secs.find(s=>s.k===k).label=label;
      }
    }
    const prevKey = V.key;
    V.sections = orderSecs(secs, loaded);
    let idx = 0;
    const wanted = target.sectionPath ? JSON.stringify(target.sectionPath) : prevKey;
    secs.splice(0, secs.length, ...V.sections);
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

  // Kleine Bilder zu Versionen (Übersetzer, Ausgabe) – nur in der Versionsliste, nicht im Lesetext; Liste in portraits/index.js
  // Porträt beim Darüberfahren groß zeigen (eigene Ebene über allem, damit nichts abgeschnitten wird)
  { let pop = null;
    const hideP = () => { if (pop) { if(pop.matches(':popover-open'))pop.hidePopover();pop.hidden=true; } };
    document.addEventListener('mouseover', e => {
      const im = e.target.closest && e.target.closest('img.vpic'); if (!im) return;
      if (!pop) { pop = document.createElement('div'); pop.id = 'vpicPop'; pop.setAttribute('popover','manual'); document.body.appendChild(pop); }
      pop.innerHTML = `<img src="${im.getAttribute('src')}" alt="">${im.dataset.title ? `<div>${esc(im.dataset.title)}</div>` : ''}`; pop.hidden = false;
      if(!pop.matches(':popover-open'))pop.showPopover();
      const r = im.getBoundingClientRect(), W = pop.offsetWidth, H = pop.offsetHeight;
      let x = r.right + 12, y = r.top + r.height / 2 - H / 2;
      if (x + W > innerWidth - 8) x = r.left - W - 12;
      if (x < 8) x = Math.max(8, Math.min(innerWidth - W - 8, r.left));
      y = Math.max(8, Math.min(innerHeight - H - 8, y));
      pop.style.left = x + 'px'; pop.style.top = y + 'px';
    });
    document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('img.vpic')) hideP(); });
    document.addEventListener('scroll', hideP, true); document.addEventListener('mousedown', hideP, true);
    window.addEventListener('keydown',e=>{if(e.key==='Escape')hideP();},true);
  }
  // Spaltenkopf: beim Darüberfahren voller Versionstitel und – falls vorhanden – das Porträt
  { let hp = null, cur = null;
    const hideH = () => { if (hp) hp.hidden = true; cur = null; };
    document.addEventListener('mouseover', e => {
      const c = e.target.closest && e.target.closest('.row.head > div[data-hv]');
      if (!c) { if (cur && !(e.target.closest && e.target.closest('#headPop'))) hideH(); return; }
      if (c === cur) return; cur = c;
      let vs = []; try { vs = JSON.parse(c.dataset.hv); } catch { /* egal */ }
      if (!hp) { hp = document.createElement('div'); hp.id = 'headPop'; document.body.appendChild(hp); }
      const k = c.dataset.hk || '';
      hp.innerHTML = vs.map(v => { const p = portraitOf(v); return `<div class="hpv">${p ? `<img src="portraits/${encodeURIComponent(p.img)}" alt="">` : ''}<div><div class="hpt">${esc(k)} · ${esc(v)}</div>${p && p.name ? `<div class="hpn">${esc(p.name)}</div>` : ''}</div></div>`; }).join('')
        + `<div class="hph">${esc(I18N.t('Klicken: verfügbare Texte dieser Sprache auswählen'))}</div>`;
      hp.hidden = false;
      const r = c.getBoundingClientRect(), W = Math.min(420, innerWidth - 16);
      hp.style.width = W + 'px';
      hp.style.left = Math.max(8, Math.min(innerWidth - W - 8, r.left)) + 'px';
      const H = hp.offsetHeight;
      hp.style.top = (r.bottom + 6 + H > innerHeight - 8 ? Math.max(8, r.top - H - 6) : r.bottom + 6) + 'px';
    });
    document.addEventListener('scroll', hideH, true); document.addEventListener('mousedown', hideH, true);
  }
  const portraitOf = t => { const s = String(t || '').toLowerCase(); return (window.PORTRAITS || []).find(p => p.match && p.img && s.includes(String(p.match).toLowerCase())) || null; };
  function versionInterlinear(v){
    const available=interlinearUI.availableSources,t=v.versionTitle||'',name=ilName(t);
    return !!(name&&available.includes(name)||/^Westminster/.test(t)&&available.length||v.rel===ilLxxVer(view.group)?.rel&&available.includes('LXX')||t==='Qumran-Rollen (ETCBC DSS)'&&available.includes('Qumran')||v.kind==='he'&&/^Samaritanischer Pentateuch/.test(t)&&available.includes('Samaritan')||v.language==='Syriac'&&/^ETCBC Peshitta/.test(t)&&available.includes('Peshitta'));
  }
  function updateVersionInterlinear(){
    if(!view?.group)return;
    for(const row of $$('#verList .voption')){const v=view.group.versions.find(v=>v.rel===row.querySelector('input').dataset.rel),badge=row.querySelector('.vil');if(v&&versionInterlinear(v)){if(!badge)row.querySelector('.vmeta').insertAdjacentHTML('beforeend',`<span class="vil" title="${esc(I18N.t('Wortweise Zuordnung zum Westminster-Text verfügbar'))}">↔ ${esc(I18N.t('Interlinear'))}</span>`);}else badge?.remove();}
  }
  const westminsterFirst = (a,b) => Number(/^Westminster/.test(b.versionTitle||''))-Number(/^Westminster/.test(a.versionTitle||''));
  function renderVersions() {
    const g = view.group,versions=g.versions.filter(v=>v.versionTitle!=='merged'||!g.versions.some(x=>x.kind===v.kind&&x.versionTitle!=='merged'));
    $('#verSummary').innerHTML = `<span class="vi">📚</span> Versionen ${versions.filter(v=>view.selected.has(v.rel)).length}/${versions.length}`;
    const KN = { he: 'Hebräisch', en: 'Englisch', de: 'Deutsch', other: 'Andere' };
    const pic = v => { const p = portraitOf(v.versionTitle); return p ? `<img class="vpic" src="portraits/${encodeURIComponent(p.img)}" alt="" data-title="${esc(p.name || '')}" loading="lazy">` : ''; };
    const hasMorph = v => {
      const t=v.versionTitle||'',doc=view.loaded.find(d=>d.entry.rel===v.rel)||cache.get(v.rel);
      if(doc?.greekMorphology||doc?.syriacMorphology)return true;
      if(v.kind==='he'&&/Westminster.*OSHB|ETCBC-CACCHT|ETCBC DSS|Samaritanischer Pentateuch|Safran-Morphologie/.test(t))return true;
      if(v.language==='Greek'&&/^(Septuaginta|Open Greek Corpus)/.test(t)||v.language==='Syriac'&&/^ETCBC Peshitta/.test(t)||/^Targum .*ETCBC/.test(t))return true;
      const annotated=node=>typeof node==='string'?/data-m=["']/.test(node):Array.isArray(node)?node.some(annotated):!!node&&typeof node==='object'&&Object.values(node).some(annotated);
      return !!doc&&annotated(doc.text);
    };
    const versionName=v=>/^The Samaritan Pentateuch/.test(v.versionTitle||'')?I18N.t('Samaritanischer Pentateuch — englische Übersetzung (Florentin und Tal, 2024)'):v.versionTitle==='merged'?I18N.t('Standardtext'):String(v.versionTitle||'').replace(/\s*\[[a-z]{2,3}\]\s*$/i,'');
    const itemH = v => `<label class="voption${portraitOf(v.versionTitle)?' haspic':''}"><input type="checkbox" data-rel="${esc(v.rel)}" ${view.selected.has(v.rel)?'checked':''}>${pic(v)||'<span class="vpic-gap" aria-hidden="true"></span>'}<span class="vtext"><span class="vname" dir="auto">${esc(versionName(v))}</span><span class="vmeta">${v.own?'<span class="badge own">eigen</span>':''}${hasMorph(v)?`<span class="vmorph" title="${esc(I18N.t('Wortformen und grammatische Bestimmungen verfügbar'))}">✓ ${esc(I18N.t('Morphologie'))}</span>`:''}</span></span></label>`;
    // Group these textual witnesses with the Septuagint in the menu only.
    // Their actual language/kind still controls text rendering and morphology.
    const menuKind = v => /^The Samaritan Pentateuch/.test(v.versionTitle||'')?'en':/^(?:Qumran-Rollen\b|Samaritanischer Pentateuch\b|The Samaritan Pentateuch\b)/.test(v.versionTitle || '') ? 'other' : (KN[v.kind] ? v.kind : 'other');
    $('#verList').innerHTML = ['he', 'en', 'de', 'other'].map(k => {
      const vs = versions.filter(v => menuKind(v) === k).sort(westminsterFirst);
      return vs.length ? `<div class="vgrp ${k}">${esc(I18N.t(k==='other'?'Textzeugen & weitere Sprachen':KN[k]))}</div>` + vs.map(itemH).join('') : '';
    }).join('');
    updateVersionInterlinear();
  }
  function placeVersions(){
    const box=$('#verList');
    if(!$('#verBox').open){if(box.matches(':popover-open'))box.hidePopover();return;}
    if(!box.matches(':popover-open'))box.showPopover();
    const r=$('#verSummary').getBoundingClientRect(),width=box.getBoundingClientRect().width,top=Math.max(8,r.bottom+6);
    box.style.left=Math.max(16,Math.min(r.left,innerWidth-width-16))+'px';box.style.top=top+'px';box.style.maxHeight=Math.max(120,innerHeight-top-12)+'px';
  }
  $('#verBox').addEventListener('toggle',placeVersions);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#verBox').open){e.preventDefault();e.stopImmediatePropagation();$('#verBox').open=false;placeVersions();$('#verSummary').focus();}},true);
  window.addEventListener('resize',placeVersions);window.addEventListener('scroll',placeVersions,{passive:true});
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
    const vl = e.target.closest('.vlab[data-rel]'); // Versionsname über einem Text („je Sprache“)
    const h = vl ? null : e.target.closest('.row.head > div:not(.lab)');
    if ((!h && !vl) || !view || (h || vl).closest('#passDlg')) return;
    const g = view.group, kn = v => (['he', 'en', 'de'].includes(v.kind) ? v.kind : 'other');
    let d, multi = false;
    if (vl) d = view.loaded.find(x => x.entry.rel === vl.dataset.rel);
    else {
      const ci = h.dataset.ci != null ? +h.dataset.ci : [...h.parentNode.children].indexOf(h) - 1; // erste Kindzelle ist das Label (bei „je Sprache“ steht der Index im Kopf)
      d = view.loaded[ci]; multi = h.dataset.multi === '1';
    }
    if (!d) return;
    const k = kn(d.entry);
    const apply = async rels => {
      if (!rels.size) return;
      // Leseposition halten: dieselbe Zeile bleibt an derselben Stelle (sonst springt die Ansicht zum markierten Vers oder an den Anfang)
      const top = $('#stick') ? $('#stick').getBoundingClientRect().bottom : 0;
      const row = $$('#rOut .row[data-l]').find(r => r.getBoundingClientRect().bottom > top + 4);
      const label = row ? row.dataset.l : null, off = row ? row.getBoundingClientRect().top : 0;
      view.selected = rels; rememberKinds();
      view.key = view.sections[view.idx] ? view.sections[view.idx].k : null;
      await loadView();
      const again = label != null ? $$('#rOut .row[data-l]').find(r => r.dataset.l === label) : null;
      if (again) window.scrollTo(0, window.scrollY + again.getBoundingClientRect().top - off);
    };
    const items = [];
    if (!multi && view.selected.size > 1) {
      items.push({label:I18N.t('Diese Version aus der Anzeige entfernen'),mark:'−',fn:()=>{const n=new Set(view.selected);n.delete(d.entry.rel);apply(n);}});
      const sameLanguage=v=>kn(v)===k&&(k!=='other'||v.language===d.entry.language);
      const currentLanguage=[...view.selected].filter(rel=>{const v=g.versions.find(x=>x.rel===rel);return v&&sameLanguage(v);});
      if(currentLanguage.length>1){
        const label=k==='he'?'Nur diese hebräische Version anzeigen':k==='de'?'Nur diese deutsche Version anzeigen':k==='en'?'Nur diese englische Version anzeigen':d.entry.language==='Greek'?'Nur diese griechische Version anzeigen':d.entry.language==='Syriac'?'Nur diese syrische Version anzeigen':'Nur diese Version dieser Sprache anzeigen';
        items.push({label:I18N.t(label),mark:'≡',fn:()=>apply(new Set([...view.selected].filter(rel=>{const v=g.versions.find(x=>x.rel===rel);return !v||!sameLanguage(v)||rel===d.entry.rel;})))});
      }
      items.push({label:I18N.t('Alle anderen Versionen schließen'),mark:'▣',fn:()=>apply(new Set([d.entry.rel]))});
      items.push({sep:true});
    }
    const here = d.entry.rel, same = g.versions.filter(v => kn(v) === k && (v.versionTitle!=='merged'||!g.versions.some(x=>x.kind===v.kind&&x.versionTitle!=='merged'))).sort(westminsterFirst);
    if (multi) { // Kopf einer Sprachspalte mit mehreren Versionen („je Sprache“): ✓ = wird gezeigt (Klick nimmt sie heraus), sonst Klick fügt sie hinzu
      for (const v of same) {
        const on = view.selected.has(v.rel);
        items.push({ label: shortVer(v.versionTitle), mark: on ? '✓' : '', pic: portraitOf(v.versionTitle), ph: true, fn: () => { const n = new Set(view.selected); if (on) n.delete(v.rel); else n.add(v.rel); apply(n); } });
      }
    } else if (same.length > 1) {
      // Spalte einer Version: Klick ersetzt die Version dieser Spalte (steht die gewählte schon in einer anderen Spalte, tauschen beide den Platz);
      // Cmd/Strg-Klick oder das „+“ am Zeilenende setzt sie als weitere Spalte rechts daneben. ● = diese Spalte, ✓ = in einer anderen Spalte sichtbar.
      // Die Reihenfolge der Spalten ist die Reihenfolge in view.selected (innerhalb einer Sprache; loadView sortiert stabil nach Sprache).
      const swapTo = rel => { const a = [...view.selected], i = a.indexOf(here), j = a.indexOf(rel); if (i < 0 || rel === here) return; if (j >= 0) a[j] = here; a[i] = rel; apply(new Set(a)); };
      const addAfter = rel => { if (view.selected.has(rel)) return; const a = [...view.selected]; a.splice(a.indexOf(here) + 1, 0, rel); apply(new Set(a)); };
      items.push({ head: 'Spalte ersetzen durch' });
      for (const v of same) {
        const cur = v.rel === here, on = view.selected.has(v.rel);
        items.push({ label: shortVer(v.versionTitle), mark: cur ? '●' : on ? '✓' : '', cur, pic: portraitOf(v.versionTitle), ph: true,
          title: cur ? 'Version dieser Spalte' : on ? 'Mit dieser Spalte tauschen' : '',
          fn: ev => { if (ev && (ev.metaKey || ev.ctrlKey) && !on) addAfter(v.rel); else swapTo(v.rel); },
          add: on ? null : () => addAfter(v.rel) });
      }
    }
    const r = (vl || h).getBoundingClientRect();
    if (!multi) { // Zählung dieser Fassung: eigene Verszählung (nur biblische Bücher) und Zählung ihrer Stellenangaben
      const pick = what => () => setTimeout(() => ctxShow({ clientX: r.left, clientY: r.bottom + 2, preventDefault() {} }, VMAP.TRAD.map(t => ({ label: (versOf(d, what) === t ? '✓ ' : '\u2003 ') + I18N.t(VERS_NAME[t]), fn: () => versSet(d, what, t) }))), 0);
      const tanakhHe = d.entry.kind === 'he' && /Tanakh/.test((d.entry.categories || []).join());
      const its = [];
      if (VMAP.known(d.entry.title) && Array.isArray(d.text)) its.push({ label: I18N.t('Verszählung dieser Fassung: {} …', I18N.t(VERS_NAME[versOf(d, 'text')])), fn: pick('text') });
      if (!tanakhHe) its.push({ label: I18N.t('Stellenangaben in dieser Fassung zählen: {} …', I18N.t(VERS_NAME[versOf(d, 'cites')])), fn: pick('cites') });
      if (its.length) { if (items.length) items.push({ sep: true }); items.push(...its); }
    }
    setTimeout(() => ctxShow({ clientX: r.left, clientY: r.bottom + 2, preventDefault() {} }, items), 0); // erst nach dem Klick, sonst schließt ihn der Dokument-Klick sofort wieder
  });

  // ---------- Zähltraditionen (versemap.js; Tabelle aus TVTMS, STEPBible.org / Tyndale House, CC BY 4.0) ----------
  // Safran zählt wie Sefaria (hebräisch). Je Fassung gibt es zwei Angaben: 'text' = wie sie selbst zählt (Rahlfs: griechisch) und
  // 'cites' = nach welcher Zählung ihre Stellenangaben gemeint sind. Quelle: eigene Wahl (Rechtsklick auf den Spaltenkopf, localStorage),
  // sonst das Feld „versification“ der Datei, sonst bundled/versification.json, sonst hebräisch.
  const VMAP = window.VerseMap;
  let VCFG = { rules: [] };
  const versReady = (async () => { try { const c = window.links && window.links.versification ? await window.links.versification() : null; if (c && Array.isArray(c.rules)) VCFG = c; } catch { /* ohne Tabelle: alles hebräisch */ } })();
  let versUser = {};
  try { const j = JSON.parse(localStorage.getItem('versTrad') || '{}'); if (j && typeof j === 'object') versUser = j; } catch { /* egal */ }
  const VERS_NAME = { heb: 'hebräisch (Sefaria)', eng: 'englisch (KJV)', lat: 'lateinisch (Vulgata)', grk: 'griechisch (Septuaginta)' };
  function versOf(d, what) {
    const e = (d && d.entry) || d || {};
    const u = versUser[e.rel]; if (u && VMAP.TRAD.includes(u[what])) return u[what];
    const f = d && d.versification; if (f && VMAP.TRAD.includes(f[what])) return f[what];
    return VMAP.tradOf(VCFG, e, what);
  }
  // Fassung eines biblischen Buches, die anders zählt: Verse an ihre hebräische Stelle setzen (die eigene Nummer steht klein davor)
  function applyVers(d) {
    if (!d || d.vdone) return d;
    if(d.syriacMorphology)return d; // preserve the explicitly labelled source numbering
    d.vdone = true;
    const t = versOf(d, 'text');
    if (t === 'heb' || !VMAP.known(d.entry.title)) return d;
    d.vtrad = t;
    const r = VMAP.remap(d.text, d.entry.title, t);
    if (r.moved) { d.text = r.text; d.vsrc = r.src; d.vmoved = r.moved; }
    return d;
  }
  function versSet(d, what, val) {
    const rel = d.entry.rel, u = { ...(versUser[rel] || {}) };
    if (val === VMAP.tradOf(VCFG, d.entry, what) && !(d.versification && d.versification[what])) delete u[what]; else u[what] = val;
    if (Object.keys(u).length) versUser[rel] = u; else delete versUser[rel];
    try { localStorage.setItem('versTrad', JSON.stringify(versUser)); } catch { /* egal */ }
    cache.delete(rel); // neu lesen: die Verse werden neu eingeordnet
    if (view && view.selected && view.selected.has(rel)) loadView();
  }
  // Hinweis zu einer umgerechneten Stellenangabe: „englische Zählung Joel 3:11 = hebr. 4:11“ (Angabe im Text, hebräische Stelle, Tradition)
  function versNoteText(orig, mapped, from) { const q = VMAP.parse(mapped), p = VMAP.parse(orig); return I18N.t('{} {} = hebr. {}', I18N.t(VMAP.LABEL[from] || ''), orig, q && p && q.book === p.book ? mapped.slice(q.book.length + 1) : mapped); }
  // Kleines Zeichen im Spaltenkopf, wenn die Fassung umgestellt wurde
  const versBadge = d => d?.syriacMorphology?` <small class="vtrad">${esc(I18N.t('Peschitta-Zählung'))}</small>`:d?.mishnahWitness&&d.mishnahWitness!=='K'?` <small class="vtrad">${esc(window.I18N.textCrit('Eigene Handschriftenzählung'))}</small>`:(d && d.vmoved ? ` <small class="vtrad" title="${esc(I18N.t('Diese Fassung zählt anders ({}). Ihre Verse stehen hier neben dem hebräischen Vers; die eigene Nummer steht klein davor.', I18N.t(VERS_NAME[d.vtrad])))}">⇄ ${esc(I18N.t(VMAP.SHORT[d.vtrad] + ' Zählung'))}</small>` : '');

  // Schlüssel einer Fußnote im Lesetext: Abschnitt | Zeile | Spalte | Nummer (für „bleibt offen“)
  const fnKey = n => { const row = n.closest('.row[data-l]'), cell = n.closest('.cell'); return [view ? view.idx : '', row ? row.dataset.l : '', row ? [...row.querySelectorAll('.cell')].indexOf(cell) : -1, n.dataset.fn].join('|'); };
  // Fußnoten werden immer mitgerendert; ob sie sichtbar sind, steuert der Modus (data-notes) per CSS
  function cellHtml(html, d, hit, verse) {
    if (html == null) return '<div class="cell empty"></div>';
    const rtl = ['Hebrew','Aramaic','Syriac'].includes(d.entry.language);
    const isMt=d.entry.kind==='he'&&/^Westminster/.test(d.entry.versionTitle||'');
    if (d.entry.kind === 'he'&&!isMt) html = stripHe(html);
    const { main, notes } = R.splitFootnotes(html);
    // Fußnote steht direkt hinter ihrem Zeichen im Text (nicht darunter)
    const inline = R.cleanHtml(d.talWordNotes ? main.replace(/<sup data-fn="\d{1,4}">.*?<\/sup>/g,'') : main).replace(/<sup data-fn="(\d{1,4})">(.*?)<\/sup>/g, (m, i, mk) => {
      const n = notes[+i];
      return n ? `${m}<span class="note" data-fn="${i}"><span class="nm">${esc(n.marker)}</span> ${R.cleanHtml(n.html)}</span>` : m;
    });
    const linked = d.entry.kind === 'he' && /Tanakh/.test((d.entry.categories || []).join()) ? inline : window.AutoRef.link(inline, { last: '', trad: versOf(d, 'cites'), note: versNoteText }); // Stellenangaben im Text anklickbar (nicht im Bibeltext selbst); andere Zählung wird umgerechnet
    const processed=isMt?stripHe(displayUI.mtHtml(linked,d.entry.title,verse)):linked;
    const gm = d.entry.language === 'Greek' ? ` data-gt="${esc(d.entry.title)}" data-gv="${esc(d.entry.versionTitle || d.versionTitle || '')}"` : ''; // Septuaginta: Titel und Fassung für die Wort-Bestimmung (lxx-morph.js)
    const vt = (d.entry.kind === 'de' || /^Targum .*\(ETCBC/.test(d.entry.versionTitle || '')) && /^own\//.test(d.entry.rel || '') ? ` data-vt="${esc(d.entry.versionTitle || '')}"` : ''; // eigene Übersetzung: für die Wort-Zuordnung (interlin.js)
    const bv = d.entry.title === 'Berakhot' && d.entry.kind === 'he' ? ' data-bavli="1"' : '';
    return `<div class="cell" data-k="${d.entry.kind}"${isMt?' data-mt="1"':''}${d.entry.language==='Syriac'?' data-syriac="1" lang="syr"':''} data-rel="${esc(d.entry.rel || '')}"${gm}${vt}${bv} dir="${rtl ? 'rtl' : 'ltr'}"><div class="txt">${hit ? markHits(processed, hit) : processed}</div></div>`;
  }

  // Gleichlauf: 'off' | 'both' (beide führen) | 'left' (links führt, rechts folgt) | 'right' (rechts führt, links folgt)
  let syncMode = 'off', p2Mode = 'off'; // Zustand im Hauptfenster / Kopie im zweiten Fenster
  try { const sm = localStorage.getItem('syncMode'); if (['off', 'both', 'left', 'right'].includes(sm)) syncMode = sm; } catch { /* egal */ }
  const SYNC_MODES = ['off', 'both', 'left', 'right'];
  document.addEventListener('change', e => {
    if (e.target.id !== 'layMode') return;
    layoutMode = e.target.value === 'lang' ? 'lang' : 'cols';
    try { localStorage.setItem('layoutMode', layoutMode); } catch { /* egal */ }
    if (view && view.sections && view.sections[view.idx]) renderSection(null, true);
  });
  document.addEventListener('DOMContentLoaded', layBtnRefresh);
  const myMode = () => (document.documentElement.classList.contains('pane2') ? p2Mode : syncMode);
  const canSend = () => { const m = myMode(), p = document.documentElement.classList.contains('pane2'); return m === 'both' || (m === 'left' && !p) || (m === 'right' && p); };
  const canRecv = () => { const m = myMode(), p = document.documentElement.classList.contains('pane2'); return m === 'both' || (m === 'left' && p) || (m === 'right' && !p); };
  // Anordnung der Spalten: 'cols' = jede Version eine Spalte; 'lang' = eine Spalte je Sprache, die Versionen darin untereinander
  let layoutMode = 'cols';
  try { if (localStorage.getItem('layoutMode') === 'lang') layoutMode = 'lang'; } catch { /* egal */ }
  const LANG_ORDER = ['he', 'en', 'de', 'other'];
  const langKind = d => (['he', 'en', 'de'].includes(d.entry.kind) ? d.entry.kind : 'other');
  function layBtnRefresh() { const s = $('#layMode'); if (s) s.value = layoutMode; }
  layBtnRefresh();
  function renderSection(rowLabel, quiet) {
    $('#rOut').classList.remove('syntax-jump');
    if (!IS_PANE2 && canSend() && view && p2Frame && !p2Frame.hidden && p2Frame.contentWindow) p2Frame.contentWindow.postMessage({ type: 'sync', idx: view.idx, title: view.group ? view.group.title : '' }, '*');
    const s = view.sections[view.idx];
    $('#rSection').value = String(view.idx);
    fitSection();
    outlineUI.olBtnRefresh();
    $('#prevSec').disabled = view.idx <= 0;
    $('#nextSec').disabled = view.idx >= view.sections.length - 1;
    if (!s) { $('#rOut').innerHTML = '<p class="muted">In den gewählten Versionen ist kein Text vorhanden.</p>'; return; }
    if(AP&&AP.sectionKey!==view.group.key+'|'+s.k){apRemember();AP.sectionKey=view.group.key+'|'+s.k;AP.whole=true;}
    view.key = s.k;
    const cols = view.loaded.map(d => R.flattenNode(R.getByPath(d.text, s.path)));
    const rows = R.alignRows(cols);
    const vis = view.loaded.map((_, i) => i); // alle gewählten Versionen bleiben als Spalten stehen, auch wenn eine im Abschnitt leer ist
    // Anordnung „je Sprache“: Gruppen nach Sprache (Hebräisch, Englisch, Deutsch, Andere), die Versionen einer Sprache stehen in einer Spalte untereinander
    const byLang = layoutMode === 'lang';
    const groupsL = byLang ? LANG_ORDER.map(k => ({ k, idx: vis.filter(i => langKind(view.loaded[i]) === k) })).filter(g => g.idx.length) : null;
    const n = byLang ? groupsL.length : vis.length;
    document.body.classList.toggle('multicol', n >= 2); // schmaler Rand: ab zwei Spalten volle Fensterbreite
    const head = byLang
      ? `<div class="row head" style="--n:${n}"><div class="lab"></div>${groupsL.map(g => `<div data-ci="${g.idx[0]}"${g.idx.length > 1 ? ' data-multi="1"' : ''} data-hv="${esc(JSON.stringify(g.idx.map(i => view.loaded[i].versionTitle || '')))}" data-hk="${esc(KIND_LABEL[g.k])}">${esc(g.idx.length === 1 ? KIND_LABEL[g.k] + ' · ' + shortVer(view.loaded[g.idx[0]].versionTitle) : KIND_LABEL[g.k] + ' (' + g.idx.length + ')')}${g.idx.length === 1 ? versBadge(view.loaded[g.idx[0]]) : ''}</div>`).join('')}</div>`
      : `<div class="row head" style="--n:${n}"><div class="lab"></div>${vis.map(i => view.loaded[i]).map(d =>
      `<div data-hv="${esc(JSON.stringify([d.versionTitle || '']))}" data-hk="${esc(d.entry.language==='Syriac'?'Syr.':KIND_LABEL[d.entry.kind])}">${esc(d.entry.language==='Syriac'?'Syr.':KIND_LABEL[d.entry.kind])} · ${esc(shortVer(d.versionTitle))}${versBadge(d)}</div>`).join('')}</div>`;
    const langCells = r => groupsL.map(g => {
      const full = g.idx.filter(i => r.cells[i] != null);
      if (!full.length) return '<div class="cell empty"></div>';
      return `<div class="gcell" data-g="${g.k}">${full.map(i => (g.idx.length > 1 ? `<div class="vlab" data-rel="${esc(view.loaded[i].entry.rel)}" title="${esc(I18N.t('Klicken: Version entfernen, nur diese zeigen oder weitere hinzufügen'))}">${esc(shortVer(view.loaded[i].versionTitle))}</div>` : '') + cellHtml(r.cells[i], view.loaded[i],undefined,r.label)).join('')}</div>`;
    }).join('');
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
      `<div class="row${rowLabel != null && !quiet && r.label === rowLabel ? ' hit' : ''}" data-l="${esc(r.label)}" style="--n:${n}"><div class="lab">${esc(r.label)}</div>${byLang ? langCells(r) : vis.map(i => cellHtml(r.cells[i], view.loaded[i],undefined,r.label)).join('')}</div>`).join('');
    $('#rOut').innerHTML = vfBar + head + body;
    if ($('#rOut .cell[data-gt]')) setTimeout(() => loadGM().catch(() => {}), 300); // Septuaginta-Morphologie schon laden, damit das Wort-Popup sofort da ist
    if (view.fnOpen && view.fnOpen.size) $$('#rOut .note[data-fn]').forEach(n => { if (view.fnOpen.has(fnKey(n))) n.classList.add('open'); }); // geöffnete Fußnoten bleiben offen (Tabwechsel, neu aufgebaut)
    navigationUI.recordNav(s, rowLabel);
    navigationUI.pushHistory(s, rowLabel);
    renderTabs();
    navigationUI.saveSession();
    notesUI.markNotes();
    markAudio();
    if (!$('#outlinePanel').hidden) outlineUI.renderOutline();
    outlineUI.olInline();
    markMismatch();
    displayUI.taamLayout();
    ilRefresh();
    decorateBavliReader();
    linksUI.loadLinks(s).then(apSoon, apSoon); // „Alles zu dieser Stelle“ folgt in den neuen Abschnitt
    if (window.__refind) setTimeout(window.__refind, 0);
    { const ck = view.group.key + '|' + s.k; if (ck !== lastCmtKey) { cmtRow = null; lastCmtKey = ck; } }
    applyCmtRowSoon();
    textcritUI.refresh();
    const hit = $('#rOut .row.hit') || (quiet && rowLabel != null ? [...$$('#rOut .row[data-l]')].find(x => x.dataset.l === rowLabel) : null);
    if (hit) hit.scrollIntoView({ block: quiet ? 'start' : 'center' }); else window.scrollTo(0, 0);
  }

  // Gemeinsame Interlinear-Quellen für Anzeige, Wortkarten und Vorschauen.
  // Die eigentliche Anzeige liegt in library-interlinear.js.
  // Die mitgelieferte Zuordnung liegt je Buch in interlin/<Buch>.js (tools/interlinear/build.py) und wird erst geladen, wenn ein Buch gebraucht wird.
  // loadIL(books) lädt die genannten Bücher (ohne Argument: alle); window.INTERLIN behält die Form {Übersetzung: {Buch: {"1:1": Segmente}}}.
  let ilP = null, ilRevision = 0, ilNotice = '';
  let ilPrivateRen = null;
  const ilBookP = new Map();
  const ilFile = title => 'interlin/' + String(title).replace(/ /g, '_') + '.js';
  const ilBooksOf = refs => (refs || []).map(r => /^(.*) \d+:\d+$/.exec(r)?.[1]).filter(Boolean);
  function ilMerge(all, book, part) { for (const [tr, verses] of Object.entries(part || {})) if (tr !== 'BuberRosenzweig') (all[tr] || (all[tr] = {}))[book] = verses; }
  const ilBase = () => ilP || (ilP = (async () => {
    const revision = ilRevision;
    await Promise.all([wordCardsUI.lazyScript('interlin/index.js', () => window.INTERLIN_BOOKS), wordCardsUI.lazyScript('interlin-sources.js', () => window.INTERLIN_SOURCES)]);
    let local;
    try { local = await O.interlinearRead(); } catch (err) { local = { error: err.message }; }
    if (revision !== ilRevision) return ilBase();
    const message = local.error || (local.skipped || []).join('\n');
    if (message && message !== ilNotice) { ilNotice = message; alert(I18N.t('Private Interlinear-Zuordnung nicht geladen: {}', message)); }
    const all = {};
    (window.INTERLIN_ORDER || []).forEach(tr => { all[tr] = {}; });
    for (const [book, part] of Object.entries(window.INTERLIN_PARTS || {})) ilMerge(all, book, part);
    if (local.data && local.data.BuberRosenzweig) all.BuberRosenzweig = local.data.BuberRosenzweig;
    ilPrivateRen = local.renderings || null;
    window.INTERLIN = all;
    return all;
  })().catch(err => { ilP = null; throw err; }));
  const loadIL = async books => {
    await ilBase();
    const avail = window.INTERLIN_BOOKS || [], want = books === undefined ? avail : [...new Set(books)].filter(b => avail.includes(b));
    await Promise.all(want.map(b => ilBookP.get(b) || ilBookP.set(b, wordCardsUI.lazyScript(ilFile(b), () => window.INTERLIN_PARTS?.[b]).catch(err => { ilBookP.delete(b); throw err; })).get(b)));
    const all = await ilBase();
    want.forEach(b => ilMerge(all, b, window.INTERLIN_PARTS[b]));
    return all;
  };
  // Sind die Zuordnungen für diese Stellen schon geladen? (Wortkarten zeichnen erst dann den Kontext)
  const ilHas = refs => !!window.INTERLIN && ilBooksOf(refs).every(b => !(window.INTERLIN_BOOKS || []).includes(b) || !!window.INTERLIN_PARTS?.[b]);
  function resetPrivateIL() {
    ilRevision++; ilP = null; ilNotice = '';
    wordCardsUI.ilRenP = null; wordCardsUI.wcTrState = null; ilPrivateRen = null;
    $$('#rOut .ilx').forEach(n => n.replaceWith(...n.childNodes));
    $$('#rOut .txt[data-ilx]').forEach(n => { delete n.dataset.ilx; });
    return ilRefresh();
  }
  O.onInterlinearChanged(() => { resetPrivateIL().catch(err => alert(err.message)); });
  const IL_VT = { Mendelssohn: /Moses Mendelssohn/, Wolf: /^Wolf, Das Buch Samuel/, BuberRosenzweig: /Martin Buber.*Franz Rosenzweig/, Zunz: /Zunz/, Breuer: /^(?:(?:(?:Raphael|Joseph) )?Breuer|Das Buch Jecheskel, übersetzt und erläutert von Dr\. Joseph Breuer,)/, Philippson: /Philippson/, Herxheimer: /ebräischen Texte/, Goldschmidt: /Übersetzung von Lazarus Goldschmidt, Berlin 1921/, Hirsch: /^(?:Die Psalmen|Der Pentateuch), übersetzt und erläutert von Samson Raphael Hirsch/, JuliusHirsch: /^Julius Hirsch, /, Onkelos: /^Targum Onkelos \(ETCBC/, 'Pseudo-Jonathan': /^Targum Pseudo-Jonathan \(ETCBC/, Neofiti: /^Targum Neofiti 1 \(ETCBC/, Umschrift: /^Umschrift \(ETCBC phono\)/ };
  // Targumim: Zuordnung aramäisches Wort -> Westminster-Wörter (maschinell, tools/targum/align.py), je Vers ein String: „1 2 - 4,5 …“ (ein Eintrag je Wort des Lesetextes)
  const IL_TG = { Onkelos: 'Targum Onkelos (ETCBC', 'Pseudo-Jonathan': 'Targum Pseudo-Jonathan (ETCBC', Neofiti: 'Targum Neofiti 1 (ETCBC' };
  // Biblische Qumran-Rollen: je Vers und Rolle die Wörter mit Zuordnung und Art der Abweichung (maschinell, tools/dss/il.py)
  const IL_QK = ['gleich wie im masoretischen Text', 'möglicher Schreibunterschied (maschineller Vergleich)', 'abweichender Wortlaut (maschineller Vergleich)', 'von den Herausgebern ergänzt', 'Plus: ohne Gegenstück im masoretischen Text'];
  let qIlP = null;
  const loadQIL = () => qIlP || (qIlP = wordCardsUI.lazyScript('qumran-il.js', () => window.QUMRAN_IL).catch(() => { qIlP = null; return null; }));
  let psIlP = null;
  const psBookP = new Map();
  const loadPsIL = title => {
    const P = window.PeshittaAlignment;
    if (!title || P.PENTATEUCH.includes(title)) return psIlP || (psIlP = wordCardsUI.lazyScript('peshitta-alignment-data.js', () => window.PESHITTA_ALIGNMENT_DATA).catch(e => { psIlP = null; throw e; }));
    if (!psBookP.has(title)) psBookP.set(title, wordCardsUI.lazyScript(P.file(title), () => window.PESHITTA_ALIGNMENT_BOOKS?.[title]).then(d => ({ version: 2, books: { [title]: d } })).catch(e => { psBookP.delete(title); throw e; }));
    return psBookP.get(title);
  };
  const alIlP = new Map();
  // Aleppo-Text (MAM) Wort für Wort unter dem Westminster-Text (tools/aleppo/interlinear.py)
  const loadAlIL = title => { if (!alIlP.has(title)) alIlP.set(title, wordCardsUI.lazyScript('aleppo-il/' + title.replace(/ /g, '_') + '.js', () => window.ALEPPO_IL?.[title]).catch(e => { alIlP.delete(title); throw e; })); return alIlP.get(title); };
  let smrIlP = null;
  const loadSmrIL = () => smrIlP || (smrIlP = wordCardsUI.lazyScript('samaritan-il.js', () => window.SAMARITAN_IL).catch(e => { smrIlP = null; throw e; }));
  const qVer = g => (g && g.versions || []).some(x => x.versionTitle === 'Qumran-Rollen (ETCBC DSS)');
  let tgIlP = null;
  const loadTgIL = () => tgIlP || (tgIlP = wordCardsUI.lazyScript('targum-il.js', () => window.TARGUM_IL).catch(() => { tgIlP = null; return null; }));
  // Wörter eines Targum-Verses (Lesetext, durch Leerraum getrennt) mit ihrer Zuordnung -> Segmente wie in interlin.js
  function tgSegs(T, name, book, chap, v, text) {
    const ch = T && T[name] && T[name][book] && T[name][book][+chap - 1], m = ch && ch[v - 1]; if (!m) return null;
    const ws = String(text || '').trim().split(/\s+/), ks = m.split(' '); if (ws.length !== ks.length) return null;
    return ws.map((w, k) => [ks[k] === '-' ? [] : ks[k].split(',').map(Number), w]);
  }
  const tgVer = (g, name) => (g && g.versions || []).find(x => String(x.versionTitle || '').startsWith(IL_TG[name])) || null;
  async function tgDoc(g, name) {
    const ver = tgVer(g, name); if (!ver) return null;
    let d = cache.get(ver.rel);
    if (!d) { try { d = await O.read(ver.rel); } catch { return null; } await versReady; applyVers(d); d.__b = ver.bytes || 2e6; cache.set(ver.rel, d); }
    return d;
  }
  const tgPlain = html => { ilTpl.innerHTML = html || ''; return ilTpl.content.textContent; };
  const ilName = vt => Object.keys(IL_VT).find(n => IL_VT[n].test(vt || ''));
  // Septuaginta: CATSS-Fassung des Buches (Richter: Codex B zuerst nicht nötig – die erste Fassung „Septuaginta (CATSS)“ gilt)
  const ilLxxVer = g => { const vs = (g && g.versions || []).filter(x => /CATSS/.test(x.versionTitle || '')); return vs.find(x => x.versionTitle === 'Septuaginta (CATSS)') || vs[0] || null; };
  async function ilLxxDoc(g) {
    const ver = ilLxxVer(g); if (!ver) return null;
    let d = cache.get(ver.rel);
    if (!d) { try { d = await O.read(ver.rel); } catch { return null; } await versReady; applyVers(d); d.__b = ver.bytes || 2e6; cache.set(ver.rel, d); }
    return d;
  }
  // Griechische Wortgruppen eines Verses den Westminster-Wörtern zuordnen (nach Konsonanten, der Reihe nach) -> [[Wortnummern], Griechisch]
  const ilTpl = document.createElement('template');
  function ilLxxIndices(words, groups, withEmpty = false) {
    const cons = words.map(consOf), out = new Map(); let p = 0;
    for (const g of groups) {
      if (!withEmpty && g.classList.contains('wm')) continue;
      const want = consOf(g.dataset.h || ''); if (!want || (!withEmpty && !g.textContent.trim())) continue;
      let hit = null;
      for (let i = p; i < Math.min(cons.length, p + 8) && !hit; i++) {
        let acc = '';
        for (let k = i; k < Math.min(cons.length, i + 5); k++) { acc += cons[k]; if (acc === want) { hit = [i, k]; break; } if (!want.startsWith(acc)) break; }
      }
      if (!hit) continue;
      const idx = []; for (let k = hit[0]; k <= hit[1]; k++) idx.push(k + 1);
      out.set(g, idx); p = hit[1] + 1;
    }
    return out;
  }
  // Tov/CATSS: griechische Gruppen ohne hebräisches Gegenstück sind Zusätze, hebräische Gruppen ohne Griechisch fehlen in der LXX.
  function ilLxxSegs(cell, html) {
    ilTpl.innerHTML = html || '';
    const groups = [...ilTpl.content.querySelectorAll('.wg')], hit = ilLxxIndices([...cell.querySelectorAll('.w')].map(w => w.textContent), groups, true), out = [];
    for (const g of groups) {
      const t = g.textContent.trim(), idx = hit.get(g);
      if (idx) { if (t) out.push([idx, t]); else idx.forEach(i => out.push([[i], '—', null, { kind: 'missing' }])); }
      else if (t && !consOf(g.dataset.h || '')) out.push([[], t, null, { kind: 'addition' }]);
    }
    return out;
  }
  const mishnahReaderUI=window.LibraryMishnahReader.create({
    $,esc,getView:()=>view,load:(...args)=>wordCardsUI.lazyScript(...args),
    remember:()=>rememberKinds(),reload:async expected=>{if(view===expected)await loadView();},
  });
  const interlinearUI = window.LibraryInterlinear.create({
    $, $$, esc, cache, getView: () => view, portraitOf, mishnah: mishnahReaderUI,
    afterRefresh:()=>{displayUI.taamLayout();updateVersionInterlinear();},
    openSamaritan: w => wordPopupUI.openSamaritanWord(w),
    consOf: s => consOf(s), apChap: s => apChap(s), verseOf: s => linksUI.verseOf(s),
    sources: { loadIL, resetPrivateIL, IL_TG, IL_QK, ilName,
      loadTgIL, tgVer, tgSegs, tgDoc, tgPlain, loadQIL, qVer,
      ilLxxVer, ilLxxDoc, ilLxxSegs, loadSmrIL, loadPsIL, loadAlIL },
    stripHe: t => { try { return displayUI.stripHe(t); } catch { return t; } },
  });
  function ilRefresh() { return interlinearUI.refresh(); }
  function ilTagCell(cell, segments) { return interlinearUI.tagCell(cell, segments); }
  $('#bavliIlBtn').onclick = async () => {
    const current = view && view.sections && view.sections[view.idx];
    const page = current && apChap(current);
    try {
      const data = await wordCardsUI.lazyScript('bavli-il-data.js', () => window.BAVLI_IL);
      window.BavliInterlinear.open(data, page, { onWord: openBavliAnchor });
    } catch (err) { alert(I18N.t('Wortzuordnung nicht geladen: {}', err.message)); }
  };
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
      if (note) { const o = note.classList.toggle('open'); if (view) { const k = fnKey(note); (view.fnOpen || (view.fnOpen = new Set()))[o ? 'add' : 'delete'](k); } }
      return;
    }
    // Klick in den Fußnotentext schließt nichts – so lässt sich der Text markieren und kopieren
  });

  // Kommentar-Bereich: Klick auf das Fußnotenzeichen öffnet/schließt die Fußnote
  $('#cmtBody').addEventListener('click', e => {
    const sup = e.target.closest('sup[data-fn]');
    if (!sup) return;
    const note = sup.nextElementSibling && sup.nextElementSibling.classList.contains('note') ? sup.nextElementSibling : null;
    if (note) note.classList.toggle('open');
  });

  // Wörterbuch-Fußnoten: Klick auf das Zeichen öffnet/schließt die Fußnote
  $('#dictOut').addEventListener('click', e => {
    const sup = e.target.closest('sup.dfn');
    if (!sup) return;
    const note = sup.nextElementSibling && sup.nextElementSibling.classList.contains('dnote') ? sup.nextElementSibling : null;
    if (note) note.classList.toggle('open');
  });

  const wordPopupUI = window.LibraryWordPopup.create({
    $, $$, esc, O,
    reader: { cache, get view() { return view; }, get dictSel() { return dictSel; } },
    lazyScript: (...args) => wordCardsUI.lazyScript(...args),
    apChap: (...args) => apChap(...args), verseOf: (...args) => linksUI.verseOf(...args),
    loadIL: (...args) => loadIL(...args), openDict, lemIdsFor, matchSyriacAnalysis:(...args)=>wordCardsUI.matchSyriacAnalysis(...args), canOpenCard:(...args)=>wordCardsUI.canOpenCard(...args),
    loadForms: (...args) => wordCardsUI.loadForms(...args), openSForms: (...args) => wordCardsUI.openSForms(...args), openForms: (...args) => wordCardsUI.openForms(...args), openGForms: (...args) => wordCardsUI.openGForms(...args), openTForms: (...args) => wordCardsUI.openTForms(...args),
    gSearchAll: (...args) => wordCardsUI.gSearchAll(...args), jumpTo,
    getHover: () => linksUI.hovApi, jumpSyntax,
  });
  const closeWpop = () => wordPopupUI.close();
  const loadGM = () => wordPopupUI.loadGM();
  const greekWordAt = (...args) => wordPopupUI.greekWordAt(...args);
  const decorateBavliReader = () => wordPopupUI.decorateBavliReader();
  const openBavliAnchor = (...args) => wordPopupUI.openBavliAnchor(...args);

  // reader-module:word-cards
  const wordCardsUI = window.LibraryWordCards.create({
    concordanceCoverageHtml,
    syntaxSection: context => wordPopupUI.syntaxSection(context),
    get $() { return $; },
    get $$() { return $$; },
    get BG() { return BG; },
    get closeWpop() { return closeWpop; },
    get deNames() { return deNames; },
    get dictLookup() { return dictLookup; },
    get dictSel() { return dictSel; }, set dictSel(value) { dictSel = value; },
    get esc() { return esc; },
    get heFix() { return heFix; },
    get hovApi() { return linksUI.hovApi; }, set hovApi(value) { linksUI.hovApi = value; },
    get IL_VT() { return IL_VT; },
    get ilPrivateRen() { return ilPrivateRen; }, set ilPrivateRen(value) { ilPrivateRen = value; },
    get ilRevision() { return ilRevision; }, set ilRevision(value) { ilRevision = value; },
    get ilHas() { return ilHas; }, get ilBooksOf() { return ilBooksOf; },
    get jumpTo() { return jumpTo; },
    get lemIdsFor() { return lemIdsFor; },
    get LK() { return linksUI.LK; },
    get loadGM() { return loadGM; },
    get loadIL() { return loadIL; },
    get O() { return O; },
    get openDict() { return openDict; },
    get pins() { return pins; },
    get portraitOf() { return portraitOf; },
    get renderSearchSaved() { return renderSearchSaved; },
    get runSearch() { return runSearch; },
    get sEntApply() { return sEntApply; },
    get loadPassageStats() { return loadPassageStats; },
    get openConcordance() { return (q, root, lemma) => { showTab('search'); return searchUI.concordance(q, root, lemma); }; },
    openConcordanceHit(hit, mode) {
      const entry = entries.find(e => e.rel === hit.rel);
      if (!entry || !hit.loc) return;
      return openGroup(groupsByKey.get(keyOf(entry)), {
        rel: hit.rel, sectionPath: hit.loc.path, rowLabel: hit.loc.label,
      }, mode);
    },
    get showTab() { return showTab; },
  });
  // end-reader-module:word-cards

  const textcritUI = window.LibraryTextCrit.create({
    $, esc, getView: () => view, getRow: () => cmtRow, withAnchor,
    goVerse: async (book, ch, v) => { await jumpTo(book + ' ' + ch + ':' + v); setCmtRow(String(v)); },
    readingRow: () => readingRow($$('#rOut .row[data-l]').filter(r => /^\d+$/.test(r.dataset.l))),
    refreshFind: () => { if (!fb.hidden && fTerm) runFind(fTerm, true); },
    load: (...args) => wordCardsUI.lazyScript(...args), clean: html => R.cleanHtml(html),
    openWord: w => wordPopupUI.openSamaritanWord(w),
    openQumran: w => wordPopupUI.openQumranWord(w),
    openGreek: (w, source) => wordPopupUI.openGreekApparatus(w, source),
    openGreekCard: (lemma, info, mode) => mode === 'all' ? wordCardsUI.gSearchAll(lemma) : wordCardsUI.openGForms(lemma, info, mode),
    markMt: (ref, start, end, expected) => {
      const match = /^(.*) (\d+):(\d+)$/.exec(ref);
      if (!match || view?.group?.title !== match[1] || !expected.length) return;
      const row = $$('#rOut .row[data-l]').find(r => r.dataset.l === match[3]);
      if (!row) return;
      // Only Westminster's actual word spans: never mark a translation or another witness by index.
      const cell = [...row.querySelectorAll('.cell[data-rel]')].find(c => /Westminster/.test(c.dataset.rel));
      if (!cell) return;
      const words = [...cell.querySelectorAll('.w[data-l]')];
      const norm = s => s.normalize('NFD').replace(/[^\u05d0-\u05ea]/g, '');
      if (words.length !== expected.length || words.some((w, i) => norm(w.textContent) !== norm(expected[i]))) return;
      if (start < 0 || end < start || end >= words.length) return;
      $$('#rOut .tc-mt-selected').forEach(w => w.classList.remove('tc-mt-selected'));
      const targets = words.slice(start, end + 1);
      targets.forEach(w => w.classList.add('tc-mt-selected'));
      setCmtRow(match[3]);
      const first = targets[0], last = targets[targets.length - 1];
      let sc = first.parentElement;
      while (sc && sc !== document.body && !(sc.scrollHeight > sc.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      const viewport = sc && sc !== document.body ? sc.getBoundingClientRect() : {top: $('#stick')?.getBoundingClientRect().bottom || 0, bottom: window.innerHeight};
      const a = first.getBoundingClientRect(), b = last.getBoundingClientRect();
      if (Math.min(a.top, b.top) < viewport.top + 8 || Math.max(a.bottom, b.bottom) > viewport.bottom - 8) {
        if (sc && sc !== document.body) panelScrollTo(first, 'center');
        else first.scrollIntoView({block: 'center', inline: 'nearest', behavior: 'smooth'});
      }
    },
    selectRow: label => { setCmtRow(label); const row = $$('#rOut .row[data-l]').find(r => r.dataset.l === label); if (row) panelScrollTo(row, 'center'); },
  });

  // Fußnoten-Modus (per Klick / immer / aus), wird gemerkt
  let noteMode = 'click';
  try { noteMode = localStorage.getItem('noteMode') || 'click'; } catch { /* egal */ }
  if (!['click', 'all', 'off'].includes(noteMode)) noteMode = 'click';
  const applyNoteMode = () => { $('#rOut').dataset.notes = noteMode; $('#dictOut').dataset.notes = noteMode; $('#cmtBody').dataset.notes = noteMode; if ($('#dictNoteMode')) $('#dictNoteMode').value = noteMode; $('#noteMode').value = noteMode; try { localStorage.setItem('noteMode', noteMode); } catch { /* egal */ } };
  $('#noteMode').onchange = () => { noteMode = $('#noteMode').value; applyNoteMode(); };
  if ($('#dictNoteMode')) $('#dictNoteMode').onchange = () => { noteMode = $('#dictNoteMode').value; applyNoteMode(); };
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
    if (e.target.closest('aside:not(#dictPanel):not(#cmtPanel):not(#linkPanel), nav, #togglePanel, #suggest, #ctxMenu, #tip, #dheadPop, #dictSelP, dialog')) return;
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
      for (const g of groups) { if (!g.title.includes(',')) continue; const t = g.title.toLowerCase(), i = lo.indexOf(t); if (i >= 0) q0 = q0.slice(0, i) + g.title.replace(/,/g, '\u0001') + q0.slice(i + t.length); }
      // Teil eines komplexen Werks: „Rav Hirsch on Torah, Genesis 27:45“, „Midrash Tanchuma, Vaera 16“ – Werktitel ohne Zahl, danach Komma und der Teil: keine zwei Stellen
      const lo2 = q0.toLowerCase();
      const w = groups.filter(g => !g.title.includes(',') && lo2.startsWith(g.title.toLowerCase() + ',')).sort((a, b) => b.title.length - a.title.length)[0];
      if (w) q0 = q0.slice(0, w.title.length) + '\u0001' + q0.slice(w.title.length + 1); }
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
    const old = notesUI.notesAll.find(n => n.id === id);
    notesUI.openNoteDlg(old || { id, kind: 'block', key: b.key, title: b.title, sk: b.sk, secLabel: b.secLabel, row: String(b.set.length ? Math.min(...b.set) : ''), vs: b.vs, set: b.set, excerpt: '', note: '', order: notesUI.topOrder() }, { canDelete: !!old });
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
          const label = g.title==='Ben Sira'&&d.entry.language==='Greek'&&path.length===1&&path[0]===51 ? I18N.t('Prolog (griechisch)') : fi >= 0 && fi + 1 < s0.path.length ? R.pathLabel(path, d.sectionNames) : s0.label;
          const k = JSON.stringify(path);
          if (!seen.has(k)) { seen.add(k); secs.push({ path, label, k }); }
        }
        G = { g, loaded, secs: orderSecs(secs, loaded) }; gcache.set(g.key, G);
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
      const head = `<div class="row head" style="--n:${n}"><div class="lab"></div>${G.loaded.map(d => `<div>${esc(d.entry.language==='Syriac'?'Syr.':KIND_LABEL[d.entry.kind])} · ${esc(shortVer(d.versionTitle))}</div>`).join('')}</div>`;
      const body = rows.map(r => `<div class="row" data-l="${esc(r.label)}" style="--n:${n}"><div class="lab">${esc(r.label)}</div>${G.loaded.map((d, k) => cellHtml(r.cells[k], d)).join('')}</div>`).join('');
      const vset = u.pred ? rows.map(r => rowVerse(r.label)).filter(v => v != null) : [], vtxt = vset.length ? fmtVerses(vset) : '';
      blocks.push(`<section class="pgb"><h3 class="pgh" data-key="${esc(g.key)}" data-sk="${esc(sec.k)}" data-row="${esc(rows[0].label)}" data-set="${esc(JSON.stringify(vset))}" data-vs="${esc(vtxt)}" data-title="${esc(g.title)}" data-sec="${esc(sec.label)}" title="Zum Lesen öffnen"><button class="pstar" type="button" title="Als Favorit speichern / entfernen" data-id="${esc(noteId(g, sec.k, 'blk:' + vtxt))}">☆</button> ${esc(g.title)} · ${esc(sec.label)}${vtxt ? ' · ' + esc(vtxt) : ''}</h3>${head}${body}</section>`);
      }
    }
    if (!blocks.length) return false;
    $('#passOut').innerHTML = blocks.join('') + (missing.length ? `<p class="muted">${esc(I18N.t('Nicht gefunden: {}', missing.join(', ')))}</p>` : '');
    notesUI.markNotes();
    if (!$('#passDlg').open) $('#passDlg').showModal();
    $('#passOut').scrollTop = 0; $('#passOut').focus(); // Fokus nicht auf den ✕-Knopf, sonst schließt das Enter-Loslassen das Fenster sofort
    return true;
  }
  $('#passOut').addEventListener('click', e => {
    const h = e.target.closest('.pgh'); if (!h) return;
    if (e.target.closest('.pstar')) { toggleBlock({ key: h.dataset.key, title: h.dataset.title, sk: h.dataset.sk, secLabel: h.dataset.sec, set: JSON.parse(h.dataset.set || '[]'), vs: h.dataset.vs }); return; }
    const g = groupsByKey.get(h.dataset.key); if (!g) return;
    $('#passDlg').close();
    openGroup(g, { sectionPath: JSON.parse(h.dataset.sk), rowLabel: h.dataset.row }, BG(e));
  });
  // Eine Stelle in einem anderen Buch öffnet erst dessen Anfang und dann die Stelle: der Zwischenschritt kommt nicht in den Verlauf,
  // damit „Zurück“ direkt zur vorigen Stelle führt (z. B. ↗ bei Ähnliche Kapitel: Jes 53 → Ps 51 → zurück zu Jes 53).
  async function jumpTo(q, inNewTab = false) {
    const nav0 = view && view.nav, pos0 = nav0 ? nav0.pos : -1;
    const ok = await jumpToRef(q, inNewTab);
    const nav = view && view.nav;
    if (nav && inNewTab !== 'bg') {
      const base = nav === nav0 ? pos0 : -1, a = nav.stack[base + 1], b = nav.stack[base + 2];
      if (nav.pos === base + 2 && a && b && a.key === b.key && a.sk !== b.sk) { nav.stack.splice(base + 1, 1); nav.pos--; navigationUI.updateNav(); }
    }
    return ok;
  }
  async function jumpSyntax(book, ref, rel) {
    const [chapter, verse] = ref.split(':').map(Number);
    const group = groups.find(g => g.title === book && g.versions.some(version => version.rel === rel));
    if (!group) return;
    const rowLabel = String(verse);
    const ix = view?.group === group && view.loaded.some(doc => doc.entry.rel === rel)
      ? view.sections.findIndex(s => s.path.length === 1 && s.path[0] === chapter - 1) : -1;
    if (ix < 0) await openGroup(group, { rel, sectionPath: [chapter - 1], rowLabel });
    else {
      view.idx = ix;
      view.vf = null;
      renderSection(rowLabel);
    }
    const out = $('#rOut'), row = $$('.row[data-l]', out).find(node => node.dataset.l === rowLabel);
    if (!row || view.group !== group || apChap(view.sections[view.idx]) !== String(chapter)) return;
    // Add scrolling space after the chapter, so even its last verse can be centred.
    out.classList.add('syntax-jump');
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (!row.isConnected) return;
    const bounds = row.getBoundingClientRect();
    const top = Math.max(0, ($('body > header')?.getBoundingClientRect().bottom || 0));
    window.scrollBy(0, (bounds.top + bounds.bottom - top - window.innerHeight) / 2);
  }
  async function jumpToRef(q, inNewTab = false) {
    const q0 = q;
    // dreistufige Stelle „Titel 1:2:5“ (Band:Kapitel:Absatz, Buch:Kapitel:Abschnitt): Abschnitt [1, 2] öffnen, Zeile 5
    let tri = null;
    { const m3 = String(q).trim().match(/^(.*?\D)\s*(\d+):(\d+):(\d+)(?:\s*[-–]\s*\d+)?$/); if (m3) { tri = [+m3[2], +m3[3], m3[4]]; q = m3[1].trim() + ' ' + m3[2] + ':' + m3[3]; } }
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
      return true; // (bei ‚bg‘: Tab liegt im Hintergrund)
    }
    // Komplexe Werke mit Teilen („Guide for the Perplexed, Part 2 › 5“, „… Part 1 › Introduction 3“): Teil abspalten
    let partSel = '';
    { const nm = String(m[1]).match(/^(.*?)[\s,]*\b(part\s*\d+|teil\s*\d+)\s*[›>,]?\s*(introduction|einleitung)?\s*[›>,]?\s*$/i);
      if (nm) { m[1] = nm[1]; partSel = nm[2].toLowerCase().replace(/^teil/, 'part').replace(/\s+/g, ' ') + (nm[3] ? ' › introduction' : ' ›'); } }
    let book = normT(m[1]); const num = m[2].toLowerCase(), verse = m[3];
    // Teil eines komplexen Werks hinter dem letzten Komma („Midrash Tanchuma, Vaera 16“, „On the Life of Moses, Book I 5“), wenn der volle Name kein Buch trifft
    let nodeSel = '';
    if (book && !partSel && !groups.some(x => titleHit(x.title, book))) {
      const k = String(m[1]).lastIndexOf(',');
      if (k > 0) { const base = normT(m[1].slice(0, k)); if (base && groups.some(x => normT(x.title) === base)) { nodeSel = m[1].slice(k + 1).trim().toLowerCase(); book = base; } }
    }
    let g = view && view.group;
    if (book) {
      const cands = nodeSel ? groups.filter(x => normT(x.title) === book) : groups.filter(x => titleHit(x.title, book));
      cands.sort((a, b) => (normT(a.title) === book ? 0 : 1) - (normT(b.title) === book ? 0 : 1) || (normT(a.title).startsWith(book) ? 0 : 1) - (normT(b.title).startsWith(book) ? 0 : 1) || a.title.length - b.title.length);
      // Kein Treffer auf den Buchnamen selbst, nur Kommentare „X on <Buch>“: nicht den falschen Kommentar öffnen
      if (cands.length && normT(cands[0].title) !== book && !/\bon\b/.test(book) && cands.every(x => /\bon\b/.test(normT(x.title)))) return false;
      if (!cands.length) return false;
      if (inNewTab === 'bg') { if (!/\d/.test(String(q0))) return false; openGroupBg(cands[0], { jumpRef: q0 }); return true; }
      if (!g || cands[0] !== g || inNewTab) { g = cands[0]; await openGroup(g, {}, inNewTab); }
    } else if (inNewTab === 'bg' && g) { openGroupBg(g, { jumpRef: q0 }); return true; }
    if (!g || !view) return false;
    if (tri) {
      const i3 = view.sections.findIndex(s => s.path && s.path.length === 2 && s.path[0] === tri[0] - 1 && s.path[1] === tri[1] - 1);
      if (i3 >= 0) { view.idx = i3; view.vf = null; renderSection(tri[2]); return true; }
      // Abschnitt = erste Stufe, Zeilen „Kapitel:Absatz“ (z. B. Josephus): Abschnitt [1] öffnen, Zeile „2:5“
      const i1 = view.sections.findIndex(s => s.path && s.path.length === 1 && s.path[0] === tri[0] - 1);
      if (i1 >= 0) { view.idx = i1; view.vf = null; renderSection(tri[1] + ':' + tri[2]); return true; }
    }
    if (nodeSel) { // Teil eines komplexen Werks: Abschnitt „Teil“ (Zeile n) oder „Teil › n“ (Zeile verse)
      const lo = s => s.label.toLowerCase();
      let ix = view.sections.findIndex(s => lo(s) === nodeSel + ' › ' + num || lo(s).startsWith(nodeSel + ' › ') && lo(s).endsWith(' ' + num));
      if (ix >= 0) { view.idx = ix; view.vf = null; renderSection(tri && verse ? verse + ':' + tri[2] : verse); return true; } // Kommentar „Teil 27:45:1“: Zeile „45:1“
      ix = view.sections.findIndex(s => lo(s) === nodeSel);
      if (ix >= 0) { view.idx = ix; view.vf = null; renderSection(num); return true; }
    }
    const find = n => view.sections.findIndex(s => { const l = s.label.toLowerCase(); if (partSel) return partSel.endsWith('introduction') ? l === partSel : l.startsWith(partSel) && l.endsWith(' ' + n); return l.endsWith(' ' + n) || l === n; });
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
    const nv = { group: null, sres: { q, he, limit: 300, html: null, params: { query: q, extra: [], distance: -1, ordered: false, fuzzy: false, prefix: false, kinds: he ? ['he'] : ['de', 'en'], categories: [], titles: [...linksUI.TANAKH_BOOKS], wlc: true, lemma: he } } };
    if (view && !view.group && tabs[tabIdx] === view) tabs[tabIdx] = nv; // „Neuer Tab“ oder alte Suche wird ersetzt
    else addTab(nv);
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
    S.html = `<div class="sread sresv"><div class="sresHead" id="sresTop"><b>${esc(I18N.t('Suche'))}: <span dir="auto">${esc(S.q)}</span></b> · ${esc(I18N.t('{#} Verse in {#} Büchern', hits + (res.truncated ? '+' : ''), books))}${S.params.lemma ? ' · ' + esc(I18N.t('alle Formen des Wortes')) : ''} ${verSel}${res.truncated ? ` <button id="sresMore">${esc(I18N.t('Weitere laden'))}</button>` : ''}</div>${books > 1 ? `<div class="sresBooks">${chips}</div>` : ''}${body || `<p class="muted">${esc(I18N.t('Nichts gefunden.'))}</p>${newTabHtml()}`}</div>`;
    if (view === V) { $('#rOut').innerHTML = S.html; mountNewTab(); ['he', 'en', 'de'].forEach(k => $('#rOut').style.setProperty('--' + k + 'f', disp[k])); }
  }
  // Klicks im Suchtab: Vers wählen (Kommentare, Verknüpfungen), Kapitel öffnen, weitere laden
  let cmtVirt = null; // Fundstelle, zu der das Kommentar-Panel im Suchtab gerade Kommentare zeigt
  async function sresSelect(row, what) {
    const v = /^\d+$/.test(row.dataset.sl) ? +row.dataset.sl : null;
    if (v == null || !view || !view.sres) return;
    cmtVirt = { title: row.dataset.t, ch: row.dataset.ch, label: row.dataset.sec };
    cmtRow = String(v);
    linksUI.secLinks = [];
    if (linksUI.linksReady) { try { linksUI.secLinks = await linksUI.LK.section(cmtVirt.title, cmtVirt.ch); } catch { linksUI.secLinks = []; } }
    linksUI.secLinks = linksUI.secLinks.concat(linksUI.parRows(cmtVirt.title, cmtVirt.ch));
    $$('#rOut .row.cmtrow').forEach(r => r.classList.remove('cmtrow'));
    row.classList.add('cmtrow');
    if (what === 'lk') { linksUI.lkVerse = v; linksUI.renderLinkPanel(); }
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



  // reader-module:navigation
  const navigationUI = window.LibraryNavigation.create({
    get $() { return $; },
    get $$() { return $$; },
    get BG() { return BG; },
    get cmtOpen() { return cmtOpen; }, set cmtOpen(value) { cmtOpen = value; },
    get cmtRow() { return cmtRow; }, set cmtRow(value) { cmtRow = value; },
    get cmtTopName() { return cmtTopName; },
    get commentaryUI() { return commentaryUI; },
    get dictLookup() { return dictLookup; },
    get dictOpen() { return dictOpen; }, set dictOpen(value) { dictOpen = value; },
    get esc() { return esc; },
    get groupsByKey() { return groupsByKey; },
    get loadView() { return loadView; },
    get openGroup() { return openGroup; },
    get renderSection() { return renderSection; },
    get setStackActive() { return setStackActive; },
    get showTab() { return showTab; },
    get showView() { return showView; },
    get stackActive() { return stackActive; }, set stackActive(value) { stackActive = value; },
    get syncTop() { return syncTop; },
    get tabIdx() { return tabIdx; }, set tabIdx(value) { tabIdx = value; },
    get tabs() { return tabs; },
    get toggleCmt() { return toggleCmt; },
    get toggleDict() { return toggleDict; },
    get view() { return view; }, set view(value) { view = value; },
  });
  // end-reader-module:navigation

  // reader-module:links
  const linksUI = window.LibraryLinks.create({
    get $() { return $; },
    get $$() { return $$; },
    get apSoon() { return apSoon; },
    get BG() { return BG; },
    get btnLbl() { return outlineUI.btnLbl; },
    get captureDictSrc() { return captureDictSrc; },
    get cmtOpen() { return cmtOpen; }, set cmtOpen(value) { cmtOpen = value; },
    get cmtVirt() { return cmtVirt; }, set cmtVirt(value) { cmtVirt = value; },
    get consOf() { return consOf; },
    get dictLookup() { return dictLookup; },
    get dictOpen() { return dictOpen; }, set dictOpen(value) { dictOpen = value; },
    get disp() { return disp; },
    get esc() { return esc; },
    get greekWordAt() { return greekWordAt; },
    get groups() { return groups; }, set groups(value) { groups = value; },
    get IL_TG() { return IL_TG; },
    get ilLxxIndices() { return ilLxxIndices; },
    get ilName() { return ilName; },
    get ilTagCell() { return ilTagCell; },
    get ilBooksOf() { return ilBooksOf; },
    get jumpTo() { return jumpTo; },
    get loadGM() { return loadGM; },
    get loadIL() { return loadIL; },
    get loadTgIL() { return loadTgIL; },
    get loadTopics() { return outlineUI.loadTopics; },
    get mapRefresh() { return mapUI.mapRefresh; },
    get O() { return O; },
    get olOwn() { return outlineUI.olOwn; },
    get pvVer() { return pvVer; },
    get R() { return R; },
    get renderCmt() { return renderCmt; },
    get renderDictList() { return renderDictList; },
    get renderSection() { return renderSection; },
    get sefariaUrl() { return sefariaUrl; },
    get setDictSrc() { return setDictSrc; },
    get setStackActive() { return setStackActive; },
    get stripHe() { return stripHe; },
    get tgSegs() { return tgSegs; },
    get toggleDict() { return toggleDict; },
    get versNoteText() { return versNoteText; },
    get view() { return view; }, set view(value) { view = value; },
    get wcTrCtxLoad() { return wordCardsUI.wcTrCtxLoad; },
    get wcVerseWords() { return wordCardsUI.wcVerseWords; },
  });
  // end-reader-module:links

  // ---------- Audio: eigener Ordner mit Versdateien (Buch_Kapitel_Vers.mp3), ▶ in der Zeilenbeschriftung, fortlaufendes Abspielen ----------
  const AU = { dir: '', map: new Map(), chap: new Map(), chapRel: '', pendingSeek: null, el: new Audio(), cur: null, speed: 1, paused: false };
  const auKey = (book, ch, v) => `${String(book).replace(/ /g, '_')}_${String(ch).padStart(3, '0')}_${String(v).padStart(3, '0')}`;
  // file-URL aus Ordner + Datei; Windows-Pfade („C:\\Users\\…“) haben Rückwärtsstriche und ein Laufwerk, das nicht kodiert werden darf
  const auSrc = rel => {
    const d = AU.dir.replace(/\\/g, '/'), unc = d.startsWith('//');
    const segs = d.replace(/^\/\//, '').split('/').filter((s, i) => s !== '' || (i === 0 && !unc)).map((s, i) => (i === 0 && /^[A-Za-z]:$/.test(s)) ? s : encodeURIComponent(s));
    const head = unc ? 'file://' + segs.join('/') : 'file://' + (/^[A-Za-z]:$/.test(segs[0] || '') ? '/' : '') + segs.join('/');
    return head + '/' + String(rel).split('/').map(encodeURIComponent).join('/');
  };
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
    AU.std = st.std || AU.std || '';
    const el = $('#auInfo'); if (el) el.textContent = st.error ? I18N.t('Ordner nicht lesbar.') + ' ' + AU.dir : !AU.dir ? I18N.t('Noch keine Audiodateien. Speicherort:') + ' ' + AU.std : AU.dir + ' · ' + I18N.t('{#} Audiodateien gefunden', total);
    const cl = $('#auClear'); if (cl) cl.hidden = !AU.dir || AU.dir === AU.std; // „Entfernen“ nur für einen früher gewählten eigenen Ordner
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
    outlineUI.olMark();
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

  // reader-module:outline
  const outlineUI = window.LibraryOutline.create({
    get $() { return $; },
    get $$() { return $$; },
    get apSoon() { return apSoon; },
    get AU() { return AU; },
    get auChapter() { return auChapter; },
    get BG() { return BG; },
    get ctxShow() { return ctxShow; },
    get esc() { return esc; },
    getGroups: () => groups,
    get hovApi() { return linksUI.hovApi; }, set hovApi(value) { linksUI.hovApi = value; },
    get IS_PANE2() { return IS_PANE2; },
    get jumpTo() { return jumpTo; },
    get openInPane2() { return openInPane2; },
    get renderSection() { return renderSection; },
    get syncTop() { return syncTop; },
    get view() { return view; }, set view(value) { view = value; },
    get withAnchor() { return withAnchor; },
  });
  // end-reader-module:outline

  // reader-module:map
  const mapUI = window.LibraryMap.create({
    get $() { return $; },
    get $$() { return $$; },
    get auChapter() { return auChapter; },
    get BG() { return BG; },
    get btnLbl() { return outlineUI.btnLbl; },
    get esc() { return esc; },
    get groups() { return groups; }, set groups(value) { groups = value; },
    get hovApi() { return linksUI.hovApi; }, set hovApi(value) { linksUI.hovApi = value; },
    get jumpTo() { return jumpTo; },
    get libCmpGroups() { return linksUI.libCmpGroups; },
    get newId() { return notesUI.newId; },
    get notesAll() { return notesUI.notesAll; }, set notesAll(value) { notesUI.notesAll = value; },
    get olOwn() { return outlineUI.olOwn; },
    get olOwnCache() { return outlineUI.olOwnCache; },
    get openNoteDlg() { return notesUI.openNoteDlg; },
    get topOrder() { return notesUI.topOrder; },
    get view() { return view; }, set view(value) { view = value; },
  });
  // end-reader-module:map

  // Höhe der festen Leiste messen, damit die Spaltenköpfe direkt darunter haften
  const fixStick = () => {
    const st = $('#stick'), hd = $('header');
    if (!st || !hd) return;
    const bar=st.querySelector('.bar.compact');
    if(bar)window.LibraryDockTabs.fitLabels(bar,'.bl',()=>{
      const children=[...bar.children].filter(e=>!e.classList.contains('spacer')&&e.getClientRects().length);
      const gap=parseFloat(getComputedStyle(bar).columnGap)||0;
      return children.reduce((w,e)=>w+e.getBoundingClientRect().width,0)+gap*Math.max(0,children.length-1)<=bar.clientWidth+1;
    });
    const hh = document.body.classList.contains('hd-hidden') ? 0 : hd.offsetHeight;
    document.documentElement.style.setProperty('--hdh', hd.offsetHeight + 'px');
    // Abstand zwischen Kopf und Leiste im Fluss (Innenabstand von <main>): ausgeblendet ebenfalls einsparen, sonst steht die Leiste
    // am Kapitelanfang tiefer als beim Scrollen und springt
    try { const m = document.querySelector('main'); const g = Math.max(0, parseFloat(getComputedStyle(m).paddingTop) + parseFloat(getComputedStyle(st).marginTop)); document.documentElement.style.setProperty('--hdgap', g + 'px'); } catch { /* egal */ }
    // Spaltenköpfe haften genau dort, wo sie am Kapitelanfang ohnehin stehen (unmittelbar unter der Leiste, auf den Bruchteil genau) –
    // sonst rücken sie bei jedem Kapitelwechsel um ein paar Pixel (früher: gerundete Höhe − 4)
    $('#rOut').style.setProperty('--stick-top', (hh + st.getBoundingClientRect().height) + 'px');
    st.style.top = hh + 'px';
  };
  // Tableiste beim Lesen ausblenden (Anzeige → „Tabs beim Scrollen ausblenden“): nach unten scrollen blendet sie aus,
  // nach oben scrollen, Maus an den oberen Rand, Seitenanfang oder ein anderer Reiter als „Lesen“ holen sie zurück
  let hdLastY = window.scrollY;
  // Layout und Bewegung sind getrennt, damit der Lesetext beim Aus-/Einblenden nie springt:
  //  • Aus-/Einblenden beim Scrollen ändert nur transform (Tableiste) und top (Werkzeugleiste, Spaltenköpfe) – gleich lang, gleiche Kurve,
  //    kein Layout-Wechsel und kein Nachführen der Scrollposition mitten im Scrollen
  //  • „hd-flat“ (Leiste nimmt keinen Platz ein, sonst bliebe nach einem Kapitelwechsel oben eine leere Fläche) wird nur gesetzt,
  //    wenn die Lücke sichtbar würde, und erst in einer Scrollpause (oder kurz vor dem Seitenanfang) wieder aufgehoben
  const hdH = () => { const hd = $('header'); return hd ? hd.offsetHeight + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdgap')) || 0) : 0; };
  let hdAnimT = 0, hdIdle = 0, hdAnchT = 0;
  const hdFlat = on => {
    const b = document.body.classList;
    if (b.contains('hd-flat') === on) return;
    // Verschiebung am Text messen und genau diese ausgleichen; die Scroll-Verankerung des Browsers bleibt so lange aus (sonst wird doppelt ausgeglichen)
    const de = document.documentElement, ref = $('#rOut');
    de.style.overflowAnchor = 'none';
    const t0 = ref ? ref.getBoundingClientRect().top : 0;
    b.toggle('hd-flat', on);
    const d = ref ? ref.getBoundingClientRect().top - t0 : 0;
    if (Math.abs(d) > 0.01) window.scrollBy(0, d);
    hdLastY = window.scrollY;
    clearTimeout(hdAnchT); hdAnchT = setTimeout(() => { de.style.overflowAnchor = ''; }, 120);
  };
  const hdSettle = () => {
    clearTimeout(hdIdle);
    const b = document.body.classList, hid = b.contains('hd-hidden'), read = hdTab() === 'read';
    if (!b.contains('hd-flat')) { if (hid && read && window.scrollY < hdH()) hdFlat(true); return; } // ausgeblendet am Seitenanfang (Kapitelwechsel): keine Lücke
    if (hid && read) return;
    if (!read || window.scrollY < 2 * hdH()) hdFlat(false); // kurz vor dem Seitenanfang braucht die Leiste ihren Platz wieder
    else hdIdle = setTimeout(() => { if (!document.body.classList.contains('hd-hidden')) hdFlat(false); }, 200); // sonst in der nächsten Scrollpause
  };
  const hdSet = hide => {
    if (document.body.classList.contains('hd-hidden') === hide) return;
    document.body.classList.add('hd-anim'); clearTimeout(hdAnimT); hdAnimT = setTimeout(() => document.body.classList.remove('hd-anim'), 260);
    document.body.classList.toggle('hd-hidden', hide); fixStick(); dictPlace();
    hdSettle();
  };
  const hdTab = () => document.documentElement.dataset.tab || 'read';
  const hdAllowed = () => disp.hideTabs && (hdTab() === 'read' || hdTab() === 'dict');
  // nur vom Nutzer ausgelöstes Scrollen zählt (Mausrad, Trackpad, Tasten, Scrollleiste) – Sprünge beim Tab-Wechsel oder Navigieren blenden nicht aus
  let hdUser = 0;
  const hdMark = () => { hdUser = Date.now(); };
  window.addEventListener('wheel', hdMark, { passive: true });
  window.addEventListener('touchmove', hdMark, { passive: true });
  document.addEventListener('keydown', e => { if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key) && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''))) hdMark(); });
  let hdDrag = false; // Scrollleiste gezogen
  document.addEventListener('mousedown', e => { if (e.clientX > document.documentElement.clientWidth - 2 || (e.target.id === 'dictOut' && e.offsetX > e.target.clientWidth)) hdDrag = true; });
  document.addEventListener('mouseup', () => { hdDrag = false; });
  const hdScroll = (y, dy) => {
    if (!hdAllowed()) { hdSet(false); return; }
    if (!hdDrag && Date.now() - hdUser > 400) return; // programmatischer Sprung (z. B. Kapitelwechsel): Leiste bleibt, wie sie ist
    if (!hdDrag && Math.abs(dy) > window.innerHeight * 0.5) return; // so weit springt kein Mausrad – Kapitelwechsel, während das Trackpad noch nachläuft
    // ausgeblendet am Kapitelanfang (nach ▶/◀) und dann nach unten gescrollt: Leiste bleibt weg – früher holte „y < 60“ sie kurz zurück (Flackern)
    if (dy < -6 || (y < 60 && dy < 0)) hdSet(false); else if (dy > 6 && y >= 60) hdSet(true);
  };
  window.addEventListener('scroll', () => {
    const y = window.scrollY, dy = y - hdLastY; hdLastY = y;
    if (hdTab() === 'read') { hdScroll(y, dy); hdSettle(); }
  }, { passive: true });
  // Reiter „Wörterbuch“: dort scrollt die Ergebnisliste selbst, nicht die Seite
  let hdDictY = 0;
  document.addEventListener('scroll', e => {
    if (e.target.id !== 'dictOut' || hdTab() !== 'dict') return;
    const y = e.target.scrollTop, dy = y - hdDictY; hdDictY = y;
    hdScroll(y, dy);
  }, { capture: true, passive: true });
  // kein Einblenden beim Darüberfahren mit der Maus: die Leiste würde plötzlich unter dem Mauszeiger erscheinen und Fehlklicks auslösen – nur beim Hochscrollen
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && /^(t|w|[1-9]|Tab)$/.test(e.key)) hdSet(false); });
  window.hdShow = () => hdSet(false);
  // ganz oben gibt es kein Scroll-Ereignis mehr: Hochscrollen mit Mausrad/Trackpad holt die Leiste dort trotzdem zurück
  window.addEventListener('wheel', e => { if (e.deltaY < 0 && hdTab() === 'read' && window.scrollY < 60) hdSet(false); }, { passive: true });
  let stickFrame=0;const queueStick=()=>{if(!stickFrame)stickFrame=requestAnimationFrame(()=>{stickFrame=0;fixStick();});};
  new ResizeObserver(queueStick).observe($('#stick'));
  new ResizeObserver(queueStick).observe($('header'));
  new MutationObserver(queueStick).observe($('#stick'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
  document.fonts.ready.then(()=>{queueStick();window.dispatchEvent(new Event('resize'));});

  // Suche im angezeigten Text (Cmd/Ctrl+F)
  // Suche im angezeigten Text (eigene Umsetzung: findet auch geschlossene Fußnoten und springt zuverlässig von Treffer zu Treffer)
  const fb = $('#findBar'), fin = $('#findIn');
  let fTerm = '', fRanges = [], fIdx = -1;
  // „ganzes Wort“: Treffer nur, wenn davor und danach kein Buchstabe/keine Ziffer steht (Einstellung bleibt gespeichert)
  let fWhole = false;
  try { fWhole = localStorage.getItem('findWhole') === '1'; } catch { /* egal */ }
  const WCH = /[\p{L}\p{N}]/u;
  const wholeAt = (n, pos, len) => !fWhole || (!(pos > 0 && WCH.test(n[pos - 1])) && !(pos + len < n.length && WCH.test(n[pos + len])));
  const hasQ = (txt, q) => { const n = normF(txt); if (!fWhole) return n.includes(q); for (let p = n.indexOf(q); p >= 0; p = n.indexOf(q, p + 1)) if (wholeAt(n, p, q.length)) return true; return false; };
  const stripF = ch => /[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4-\u05C7]/.test(ch) ? '' : ch; // hebräische Zeichen ohne Vokale/Betonung vergleichen
  const normF = str => { let o = ''; for (const ch of str.toLowerCase()) o += stripF(ch); return o.replace(/\u05BE/g, ' '); };
  const hl = (name, ranges) => { try { if (!ranges.length) CSS.highlights.delete(name); else CSS.highlights.set(name, new Highlight(...ranges)); } catch { /* ältere Engine */ } };
  function clearFind(keepTerm) {
    fRanges = []; fIdx = -1;
    hl('find', []); hl('find-active', []);
    $$('#rOut .note.fnd').forEach(n => n.classList.remove('fnd'));
    $$('#sOut details[data-how="find"]').forEach(d => { d.open = false; delete d.dataset.how; });
    $$('#olBody .olsubs').forEach(w => { if (w.dataset.how === 'find') outlineUI.olToggle(w, false, true, ''); }); outlineUI.olChips(); // durch die Suche geöffnete Unterpunkte wieder schließen
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
    const curTab = document.documentElement.dataset.tab || 'read', onSearch = curTab === 'search', onDict = curTab === 'dict';
    if (onSearch) $$('#sOut details:not([open])').forEach(d => { if (hasQ(d.textContent, q)) { d.open = true; d.dataset.how = 'find'; } }); // zugeklappte „weitere Fassungen“ mit Treffer aufklappen
    else if (!onDict) $$('#rOut .note').forEach(n => { if (hasQ(n.textContent, q)) n.classList.add('fnd'); });
    // nur durchsuchen, was im aktuellen Reiter zu sehen ist (der Lesetext eines anderen Reiters ist bloß versteckt)
    const roots = onSearch ? [$('#sOutline').hidden ? $('#sOut') : $('#sOutline [data-so=out]')] : onDict ? [$('#dictOut')] : [$('#rOut')];
    if (!onSearch && !onDict) {
    if (!$('#cmtPanel').hidden) roots.push($('#cmtBody')); // auch der Kommentar-Bereich wird durchsucht
    if (!$('#dictPanel').hidden) roots.push($('#dictOut')); // ebenso die Wörterbuch-Treffer
    if (!$('#outlinePanel').hidden) roots.push($('#olBody').hidden ? $('#olSearch [data-so=out]') : $('#olBody'));
    if (!$('#allPanel').hidden) roots.push($('#apBody')); // und die Seitenleiste „Alles zu dieser Stelle“
    if (!$('#outlinePanel').hidden && !$('#olBody').hidden) $$('#olBody .olsubs[hidden]').forEach(w => { if (hasQ(w.textContent, q)) outlineUI.olToggle(w, true, true, 'find'); }); outlineUI.olChips(); // zugeklappte Unterpunkte mit Treffer aufklappen
    }
    const ranges = [];
    // Textknoten je Absatz/Zelle sammeln und zusammenhängend durchsuchen, damit auch Wortfolgen über mehrere
    // Wort-Elemente hinweg gefunden werden (Westminster-Text: jedes Wort steckt in einem eigenen <span class="w">)
    for (const root of roots) {
      const groups = new Map(), strict = root.id === 'dictOut' || root.id === 'sOut';
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        if (!el || el.offsetParent === null && getComputedStyle(el).display === 'none') continue;
        if (el.closest('.note') && !el.closest('.note').offsetParent) continue;
        if (strict && el.checkVisibility && !el.checkVisibility()) continue; // Wörterbuch/Trefferliste: ausgeblendete Einträge (z. B. die anderen „N von 8“) nicht mitzählen
        const key = el.closest('.note, .txt, .dbody, .dhead, summary, p, li, td, button, div') || root;
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
          if (!wholeAt(n, pos, q.length)) { pos += 1; continue; }
          let s0 = pos, e0 = pos + q.length - 1;
          while (s0 <= e0 && !map[s0]) s0++;
          while (e0 >= s0 && !map[e0]) e0--;
          if (s0 <= e0) {
            const r = document.createRange();
            r.setStart(map[s0][0], map[s0][1]);
            r.setEnd(map[e0][0], map[e0][1] + 1);
            ranges.push(r);
            for (let od = map[s0][0].parentElement && map[s0][0].parentElement.closest('#olBody details:not([open])'); od; od = od.parentElement.closest('#olBody details:not([open])')) od.open = true; // eingeklappte Gliederungsabschnitte mit Treffer aufklappen
          }
          pos += q.length;
        }
      }
    }
    fRanges = ranges;
    hl('find', ranges);
    if (ranges.length) goFind(keepIdx && prevIdx >= 0 ? Math.min(prevIdx, ranges.length - 1) : 0, !keepIdx); else $('#findCount').textContent = I18N.t('keine Treffer');
  }
  // Treffer in der Gliederung: der größte markierte Hauptpunkt steht oben, solange der Treffer darunter noch sichtbar ist
  function olScrollHit(el) {
    const hit = el.closest('.olp') || el; let sc = hit.parentElement;
    while (sc && !(sc.scrollHeight > sc.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    if (!sc) { hit.scrollIntoView({ block: 'center' }); return; }
    const top = n => n.getBoundingClientRect().top, st = top(sc);
    const owner = hit.classList.contains('olsub') ? (hit.closest('.olsubs') || {}).previousElementSibling || hit : hit;
    let anchor = $('#olBody .olp.cur:not(.olsub)'); if (!anchor || !(anchor === owner || (anchor.nextElementSibling && anchor.nextElementSibling.contains(hit)))) anchor = owner; // nur der Hauptpunkt, der den Treffer enthält
    const dy = top(hit) - top(anchor);
    if (dy < 0 || dy > sc.clientHeight - 100) anchor = owner; // Treffer läge sonst außerhalb: Hauptpunkt des Treffers nach oben
    const hd = sc.querySelector('.lhead'); sc.scrollTop += top(anchor) - st - (hd ? hd.offsetHeight + 12 : 8); // unter die feste Kopfzeile
  }
  // Treffer selbst (nicht sein Eltern-Element) in die Mitte holen: ein langer Wörterbuch-Artikel ist ein einziges Element –
  // scrollIntoView darauf zentriert immer den ganzen Artikel, der Treffer bleibt außerhalb des Bildes
  function rangeScroll(r, el) {
    const rc = () => r.getClientRects()[0] || r.getBoundingClientRect();
    let b = rc();
    if (!b || (!b.width && !b.height)) { el.scrollIntoView({ block: 'center', inline: 'nearest' }); return; }
    for (let sc = el; sc && sc !== document.body && sc !== document.documentElement; sc = sc.parentElement) { // jeder scrollende Bereich um den Treffer (Wörterbuch, Kommentar, Trefferliste)
      if (!(sc.scrollHeight > sc.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) continue;
      const sr = sc.getBoundingClientRect();
      let head = 0; // feste Kopfzeilen (Wörterbuch-Titel, Stichwort) verdecken den oberen Rand
      sc.querySelectorAll('.dsec, .dhead, .lhead').forEach(h => { if (getComputedStyle(h).position === 'sticky') { const hb = h.getBoundingClientRect(); if (hb.top < sr.top + 120) head = Math.max(head, Math.min(hb.bottom, sr.bottom) - sr.top); } });
      head = Math.min(Math.max(0, head), sc.clientHeight / 2);
      sc.scrollTop += b.top - sr.top - head - (sc.clientHeight - head - b.height) / 2;
      b = rc();
    }
    const st = $('#stick'), top = st && st.offsetParent ? Math.max(0, st.getBoundingClientRect().bottom) : 0; // Seite nur bewegen, wenn der Treffer danach noch nicht zu sehen ist (unten liegt die Suchleiste darüber)
    if (b.top < top + 8 || b.bottom > window.innerHeight - 80) window.scrollBy(0, b.top - (window.innerHeight - b.height) / 2);
  }
  function goFind(i, scroll = true) {
    if (!fRanges.length) return;
    fIdx = (i + fRanges.length) % fRanges.length;
    const r = fRanges[fIdx];
    hl('find-active', [r]);
    const el = r.startContainer.parentElement;
    if (el && scroll && el.closest('#olBody')) olScrollHit(el);
    else if (el && scroll) rangeScroll(r, el);
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
    if (wordCardsUI.wcFindWanted()) { wordCardsUI.wcFindOpen(); return; } // Wortkarte aktiv (Fokus oder Maus darüber): Suche im Fenster der Wortkarte
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
      else if (m.type === 'reopenTab') reopenTab();
      else if (m.type === 'syncState') p2Mode = SYNC_MODES.includes(m.mode) ? m.mode : 'off';
      else if (m.type === 'syncScroll') { if (canRecv()) applySyncScroll(m); }
      else if (m.type === 'sync') { if (canRecv() && view && view.group && relatedTitles(view.group.title, m.title) && m.idx < view.sections.length && m.idx !== view.idx) { view.idx = m.idx; renderSection(); } }
      else if (m.type === 'dict' && typeof m.q === 'string') openDict(m.q.slice(0, 100)); // Nachschlagen aus dem ersten Fenster
      else if (m.type === 'jump' && typeof m.ref === 'string') jumpTo(m.ref, tabs.some(t => t.group)); // Kommentar aus dem ersten Fenster
      else if (m.type === 'open' && typeof m.key === 'string') { const g = groupsByKey.get(m.key); if (g) openGroup(g, { rel: typeof m.rel === 'string' ? m.rel : undefined, sectionPath: m.sectionPath, rowLabel: m.rowLabel }, tabs.some(t => t.group)); } // schon ein Buch offen: neuer Tab
    } else if (e.source === p2Frame.contentWindow) {
      if (m.type === 'ready') { p2Ready = true; p2Post({ type: 'syncState', mode: syncMode }); }
      else if (m.type === 'syncScroll') { if (canRecv()) applySyncScroll(m); }
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
    const SYNC_UI = {
      off: ['⇅', 'Gleichlauf', 'Gleichlauf: aus. Klick: beide Fenster führen sich gegenseitig'],
      both: ['⇅', 'Gleichlauf', 'Gleichlauf: beide Fenster führen sich gegenseitig. Klick: nur das linke führt'],
      left: ['⇉', 'Links führt', 'Gleichlauf: das linke Fenster führt, das rechte folgt. Klick: nur das rechte führt'],
      right: ['⇇', 'Rechts führt', 'Gleichlauf: das rechte Fenster führt, das linke folgt. Klick: Gleichlauf aus'],
    };
    const applySyncUi = () => {
      const b = $('#syncBtn'), u = SYNC_UI[syncMode];
      b.firstChild.nodeValue = u[0]; const T = s => (window.I18N && window.I18N.tr ? window.I18N.tr(s) : s);
      b.querySelector('.bl').textContent = T(u[1]);
      b.title = T(u[2]); b.setAttribute('aria-pressed', String(syncMode !== 'off')); b.dataset.mode = syncMode;
    };
    applySyncUi();
    $('#syncBtn').onclick = () => {
      syncMode = SYNC_MODES[(SYNC_MODES.indexOf(syncMode) + 1) % SYNC_MODES.length];
      try { localStorage.setItem('syncMode', syncMode); } catch { /* egal */ }
      applySyncUi(); p2Post({ type: 'syncState', mode: syncMode });
      if (canSend()) renderSection();
    };
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
  let syncQuiet = 0, syncTimer = null;
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
    const exact = rows.find(x => x.dataset.l === m.label) || (v != null ? rows.find(x => rowVerse(x.dataset.l) === v) : null);
    const r = exact || (v != null ? rows.find(x => (rowVerse(x.dataset.l) || 0) > v) : null); // ohne den Vers: zur nächsten Zeile scrollen, aber nicht markieren
    if (!r) return;
    window.scrollBy(0, r.getBoundingClientRect().top - syncTop() - m.off);
    if (m.flash && exact) { r.classList.remove('syncflash'); void r.offsetWidth; r.classList.add('syncflash'); setTimeout(() => r.classList.remove('syncflash'), 1400); } // angeklickten Vers kurz markieren
  }
  // Gleichlauf auch per Klick: ein Klick auf einen Vers (auch auf freie Fläche oder in den deutschen Text) bringt das andere Fenster zu diesem Vers
  document.addEventListener('click', e => {
    if (!canSend() || !view || !view.group) return;
    if (e.target.closest('a, button, input, textarea, select, summary, label, [data-ref], [data-rel], .wordpop')) return; // eigene Funktion
    const sel = window.getSelection && window.getSelection(); if (sel && String(sel).length) return; // Text wird markiert
    const r = e.target.closest('#rOut .row[data-l]'); if (!r) return;
    const s = view.sections[view.idx];
    const msg = { type: 'syncScroll', title: view.group.title, label: r.dataset.l, off: r.getBoundingClientRect().top - syncTop(), idx: view.idx, slabel: s ? s.label : '', flash: true };
    if (IS_PANE2) window.parent.postMessage(msg, '*'); else p2Post(msg);
  });
  window.addEventListener('scroll', () => {
    if (!canSend() || Date.now() < syncQuiet || !view || !view.group) return;
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
  const fwPaint = () => $('#findWord').classList.toggle('on', fWhole);
  fwPaint();
  $('#findWord').onclick = () => {
    fWhole = !fWhole; fwPaint();
    try { localStorage.setItem('findWhole', fWhole ? '1' : '0'); } catch { /* egal */ }
    const t = fin.value.trim() || fTerm; clearFind(true); if (t) runFind(t);
    fin.focus();
  };
  $('#findPrev').onclick = () => stepFind(false);
  $('#findClose').onclick = closeFind;
  // Abschnitt gewechselt: Treffer neu berechnen, wenn die Suchleiste offen ist
  window.__refind = () => { clearFind(true); if (!fb.hidden && fTerm) runFind(fTerm); };
  { // Trefferliste der Suche neu aufgebaut (neue Suche, Fassungen zusammenfassen …): Markierungen nachziehen, ohne zu springen
    let t = null;
    const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { if (!fb.hidden && fTerm && ['search', 'dict'].includes(document.documentElement.dataset.tab)) runFind(fTerm, true); }, 200); });
    mo.observe($('#sOut'), { childList: true }); mo.observe($('#dictOut'), { childList: true }); // ebenso im Reiter „Wörterbuch“ nach neuem Nachschlagen
  }

  let fs = 16;
  try { fs = +localStorage.getItem('fs') || 16; } catch { /* egal */ }
  const applyFs = () => { $('#rOut').style.setProperty('--fs', fs + 'px'); if ($('#fsV')) $('#fsV').textContent = fs + ' px'; try { localStorage.setItem('fs', String(fs)); } catch { /* egal */ } };
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
    ilRevision++; ilP = null;
    refreshState();
    if (!r.errors.length) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); ownItems = []; }
    else renderOwnList();
    if (r.entries.length) {
      const first = r.entries[0];
      const ng = groupsByKey.get(keyOf(first));
      if (ng) openGroup(ng, { rel: first.rel, showCompare: true });
    }
  };

  // Suche: eigene Instanz je Lesefenster; Navigation bleibt hier beim Leser.
  function runSearch(only) { return searchUI.run(only); }
  function renderSCats() { return searchUI.renderCategories(); }
  function renderSearchSaved() { return searchUI.renderSaved(); }
  function sEntApply(entry) { return searchUI.apply(entry); }

  // „Nur in diesem Buch suchen“: Suchmaske mit genau diesem Buch vorbelegen
  $('#bookSearch').onclick = () => {
    if (!view || !view.group) return;
    if (dictOpen) toggleDict(false); // Seitenleisten würden den Kategorienbaum rechts verdecken
    if (cmtOpen) toggleCmt(false);
    $('#linkPanel').hidden = true;
    showTab('search');
    searchUI.selectBook(view.group);
  };

  // Kontextmenü (Rechtsklick): kleine Liste von Aktionen an der Mausposition
  // Einträge: { label, fn(ev) } · { sep: true } · { head: 'Überschrift' }; dazu wahlweise mark (Zeichen in fester Spalte davor: ●/✓), pic (Porträt),
  // ph (gleich breiter Platzhalter, wenn das Porträt fehlt), cur (hervorgehoben), title, add (Funktion für das „+“ am Zeilenende)
  let ctxEl = null;
  function ctxShow(e, items) {
    if (!ctxEl) {
      ctxEl = document.createElement('div'); ctxEl.id = 'ctxMenu'; ctxEl.hidden = true; document.body.appendChild(ctxEl);
      const hide = () => { ctxEl.hidden = true; };
      document.addEventListener('click', hide); window.addEventListener('blur', hide);
      // Tastatur: Escape schließt; Pfeile/Pos1/Ende wandern durch die Einträge, Enter/Leertaste löst aus (Cmd/Strg+Enter wie Cmd/Strg-Klick)
      document.addEventListener('keydown', ev => {
        if (ctxEl.hidden) return;
        if (ev.key === 'Escape') { hide(); return; }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(ev.key)) return;
        const bs = [...ctxEl.querySelectorAll('button[data-n]')]; if (!bs.length) return;
        ev.preventDefault(); ev.stopPropagation();
        const i = bs.indexOf(document.activeElement);
        const j = ev.key === 'Home' ? 0 : ev.key === 'End' ? bs.length - 1 : ev.key === 'ArrowDown' ? (i + 1) % bs.length : (i < 0 ? bs.length - 1 : (i - 1 + bs.length) % bs.length);
        bs[j].focus();
      }, true);
      ctxEl.addEventListener('click', ev => {
        const b = ev.target.closest('button[data-n]'), it = b && ctxEl._items[+b.dataset.n];
        hide();
        if (!it) return;
        if (ev.target.closest('.cm-add') && it.add) it.add(ev); else it.fn(ev);
      });
    }
    e.preventDefault();
    ctxEl._items = items;
    const rich = items.some(it => it.mark != null); // Liste mit Markierungsspalte: alle Zeilen bündig setzen
    ctxEl.innerHTML = items.map((it, i) => {
      if (it.sep) return '<hr>';
      if (it.head) return `<div class="cm-head">${esc(it.head)}</div>`;
      const pic = it.pic ? `<img class="vpic" src="portraits/${encodeURIComponent(it.pic.img)}" alt="" data-title="${esc(it.pic.name || '')}">` : it.ph ? '<span class="vpic ph"></span>' : '';
      if (it.mark == null) return `<button data-n="${i}">${pic}${esc(it.label)}</button>`;
      return `<button data-n="${i}" class="cm-row${it.cur ? ' cur' : ''}"${it.cur ? ' aria-current="true"' : ''}${it.title ? ` title="${esc(it.title)}"` : ''}><span class="cm-mark" aria-hidden="true">${esc(it.mark)}</span>${pic}<span class="cm-lab" dir="auto">${esc(it.label)}</span>${it.add ? `<span class="cm-add" role="button" title="${esc(I18N.t('Als weitere Spalte daneben anzeigen ({}-Klick)', (window.platform && window.platform.mod) || 'Strg'))}">+</span>` : rich ? '<span class="cm-add none"></span>' : ''}</button>`;
    }).join('');
    ctxEl.hidden = false;
    ctxEl.style.left = '0px'; ctxEl.style.top = '0px';
    const mw = ctxEl.offsetWidth, mh = ctxEl.offsetHeight; // erst messen, dann so setzen, dass das Menü ganz im Fenster bleibt
    ctxEl.style.left = Math.max(4, Math.min(e.clientX, window.innerWidth - mw - 8)) + 'px';
    ctxEl.style.top = Math.max(4, Math.min(e.clientY, window.innerHeight - mh - 8)) + 'px';
    ctxEl.scrollTop = 0;
    if (rich) { const c = ctxEl.querySelector('button.cur'); if (c) c.scrollIntoView({ block: 'nearest' }); }
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
    const a = e.target.closest('a[data-i]'); const h = a && navigationUI.history[+a.dataset.i];
    if (h) bookMenu(e, h.key, { sectionPath: JSON.parse(h.sk), rowLabel: h.row || undefined });
  });
  // Rechtsklick auf einen Vers: Referenz kopieren / auf sefaria.org öffnen
  $('#rOut').addEventListener('contextmenu', e => {
    const row = e.target.closest('.row[data-l]');
    dictCtxRow = row;
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
      { label: I18N.t('Alles zu dieser Stelle'), fn: () => apToggle(true, row.dataset.l) },
      { label: I18N.t('Referenz kopieren: {}', ref), fn: () => navigator.clipboard.writeText(ref).catch(() => {}) },
      { label: 'Auf sefaria.org öffnen', fn: () => window.api.openExternal(url) },
      ...((() => { try { const v = +String(row.dataset.l).split(':').pop(), n = mapUI.mapVerseN(v); return n ? [{ label: I18N.t('Orte dieses Verses auf der Karte ({#})', n), fn: () => mapUI.mapVerseShow(v) }] : []; } catch { return []; } })()),
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
    syncStack();
  };
  // Full-height tool views by default; retain the optional paired comments/dictionary layout.
  let stackMode = 'tabs', stackActive = 'cmt', dockController=null;
  try { if(localStorage.getItem('stackMode')==='split')stackMode='split'; const h=+localStorage.getItem('stackDictH');if(h>=15&&h<=85)document.documentElement.style.setProperty('--dict-h',h+'%'); } catch {}
  function syncStack() {
    let co = false; try { co = cmtOpen; } catch { /* beim Start noch nicht angelegt */ }
    const both = !!(co && dictOpen) && document.documentElement.dataset.tab !== 'dict';
    const b = document.body.classList;
    const cw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cmt-w')) || 400;
    const wide = window.innerWidth - 2 * cw >= 900; // nur wenn dem Text daneben noch genug Breite bleibt: nebeneinander statt untereinander
    b.toggle('stack-tabs', both && stackMode === 'tabs'); b.toggle('stack-split', both && stackMode === 'split' && !wide); b.toggle('stack-side', both && stackMode === 'split' && wide);
    b.toggle('stk-cmt', stackActive === 'cmt'); b.toggle('stk-dict', stackActive === 'dict');
    $('#stackBar').hidden = !(both && stackMode === 'tabs'); $('#stackSplit').hidden = !(both && stackMode === 'split' && !wide); $('#dictStack').hidden = !both; $('#stkMode').hidden = false;
    $('#stkMode').innerHTML = (wide ? '⇆' : '⇅') + `<span class="cl"> ${esc(I18N.t(wide ? 'Nebeneinander' : 'Untereinander'))}</span>`; $('#stkCmt').classList.toggle('on', stackActive === 'cmt'); $('#stkDict').classList.toggle('on', stackActive === 'dict');
    $('#dictStack').title=I18N.t('Kommentar und Wörterbuch: Volle Höhe / Geteilt');
    $('#dictStack').innerHTML=(stackMode==='tabs'?'⇅':'▣')+`<span class="dock-tab-label">${esc(I18N.t(stackMode==='tabs'?'Geteilt':'Volle Höhe'))}</span>`;
  }
  function setStackActive(w) { stackActive = w; syncStack(); dockController?.sync(w); }
  function setStackMode(m) { stackMode=m;try{localStorage.setItem('stackMode',m);}catch{}syncStack(); }
  $('#stkCmt').onclick = () => setStackActive('cmt');
  $('#stkDict').onclick = () => setStackActive('dict');
  $('#stkMode').onclick = () => setStackMode('split');
  $('#dictStack').onclick = () => setStackMode(stackMode === 'tabs' ? 'split' : 'tabs');
  $('#dictMore').onclick = () => $('#dictPanel').classList.toggle('more');
  window.addEventListener('resize', () => syncStack());
  new MutationObserver(() => syncStack()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tab'] });
  { // Trenner zwischen Kommentar und Wörterbuch ziehen; Doppelklick: Standard
    const sp = $('#stackSplit');
    sp.addEventListener('mousedown', e => {
      e.preventDefault();
      const mv = ev => { const h = Math.min(85, Math.max(15, (window.innerHeight - ev.clientY) / window.innerHeight * 100)); document.documentElement.style.setProperty('--dict-h', h.toFixed(1) + '%'); };
      const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); try { localStorage.setItem('stackDictH', parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dict-h')) || 42); } catch { /* egal */ } };
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
    });
    sp.addEventListener('dblclick', () => { document.documentElement.style.removeProperty('--dict-h'); try { localStorage.removeItem('stackDictH'); } catch { /* egal */ } });
  }
  // Esc bei Kommentar und Wörterbuch als Reiter: das Wörterbuch schließen, der Kommentar bleibt
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !document.body.classList.contains('stack-tabs') || stackActive !== 'dict' || document.querySelector('dialog[open]')) return;
    if (document.activeElement === $('#dictQ') && !$('#dictSug').hidden) return; // erst die Vorschläge schließen
    e.preventDefault(); e.stopPropagation(); toggleDict(false); // Wörterbuch schließen (auch angepinnt), der Kommentar bleibt
  }, true);
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
    if (!dictOpen) setDictSrc(null);
    if (dictOpen) stackActive = 'dict';
    syncDock();
    $('#dictTabBtn').classList.toggle('sideopen', dictOpen);
    if (dictOpen) { renderDictList(); $('#dictQ').focus({ preventScroll: true }); }
  }
  // Double-click opens an available word card; otherwise look up the source lemma/word.
  let fnClickT = 0,wordOpenToken=0;
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('sup, .nm, .footnote-marker, sup.dfn')) fnClickT = Date.now(); }, true);
  document.addEventListener('pointerdown',()=>{wordOpenToken++;},true);
  window.addEventListener('keydown',e=>{if(e.key==='Escape')wordOpenToken++;},true);
  const dblWord = async e => {
    if(e.target.closest('a,button,select,input,textarea,.lab,.bm,sup,.nm,.footnote-marker')||Date.now()-fnClickT<700)return;
    const marked=e.target.closest('.w[data-m],.wa[data-m],.wt[data-m],.wq[data-m],.syw[data-si],.smr-word');
    const w=(String(window.getSelection()).trim()||marked?.textContent||'').replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu,'');
    if(!w||w.length>80||/\s/.test(w))return;
    const token=++wordOpenToken;
    const current=()=>token===wordOpenToken&&e.target.isConnected;
    const result=await wordPopupUI.openPreferred(e,current);
    if(token!==wordOpenToken||result.opened||result.cancelled)return;
    if(!result.context&&await wordCardsUI.openTextCard(w,current))return;
    if(token===wordOpenToken)openDict(result.query||w);
  };
  // Einfacher Klick auf ein Wort (nicht hebräisch-morphologisch) markiert es wie bei den hebräischen Wörtern
  const clickMark = e => {
    if (!window.Highlight || !CSS.highlights) return;
    CSS.highlights.delete('wsel');
    if (e.target.closest('a, button, select, input, textarea, .lab, .bm, .w[data-m], .wa[data-m], .wt[data-m], .wq[data-m], .wg, #wpop, .head')) return;
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
  let dictSel = null; // Auswahl der durchsuchten Wörterbücher (Liste von Kennungen) oder null = alle
  try { const a = JSON.parse(localStorage.getItem('dictSel') || 'null'); if (Array.isArray(a) && a.length) dictSel = a; } catch { /* egal */ }
  // Hebräischer Satz mit eingeschobenem „l.“ (lies): in einem LTR-Absatz würde das lateinische l. den Satz in zwei Teile zerreißen, deren Reihenfolge dann nicht stimmt – als eigener RTL-Block ordnen
  const HEBC = '[\\u0590-\\u05FF\\uFB1D-\\uFB4F]', HEBN = '[\\s.,;:!?()\\[\\]\'"„“”—–*-]';
  const HEBRUN = new RegExp(`${HEBC}(?:${HEBC}|${HEBN})*?(?<![A-Za-z])l\\.(?:${HEBC}|${HEBN})*${HEBC}`, 'g');
  const heFix = html => String(html).split(/(<[^>]+>)/).map((t, i) => i % 2 ? t : t.replace(HEBRUN, m => `<bdi dir="rtl">${m}</bdi>`)).join('');
  // Wortkarte aus dem Wörterbuch: Stichwort (Konsonanten) -> Westminster-Lemma, falls es eines gibt
  let lemByCons = null;
  const consOf = s => String(s).replace(/[^\u05D0-\u05EA]/g, '').replace(/[ךםןףץ]/g, c => 'כמנפצ'['ךםןףץ'.indexOf(c)]);
  function lemIdsFor(head) {
    if (!lemByCons) { lemByCons = new Map(); for (const [id, v] of Object.entries(window.OSHB_LEMMAS || {})) { const k = consOf(v[0]); if (k) { if (!lemByCons.has(k)) lemByCons.set(k, []); lemByCons.get(k).push(id); } } }
    for (const tok of String(head).split(/[·,;/\s]+/)) { if (!/[\u05D0-\u05EA]/.test(tok)) continue; const ids = lemByCons.get(consOf(tok)); if (ids) return ids; }
    return null;
  }
  // Eigene Wörterbuchinstanz je Lesefenster, mit schmalen Anschlüssen zum Leser.
  const lsGet = k => { try { const a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
  const lsSet = (k, a) => { try { localStorage.setItem(k, JSON.stringify(a)); } catch { /* egal */ } };
  const dictionaryUI = window.LibraryDictionary.create({
    $, esc, heFix, lemIdsFor, portraitOf, loadGM, loadTForms: wordCardsUI.loadTForms, loadForms: wordCardsUI.loadForms,
    openTForms: wordCardsUI.openTForms, openGForms: wordCardsUI.openGForms, openSForms: wordCardsUI.openSForms, openForms: wordCardsUI.openForms, panelScrollTo, lsGet, lsSet,
    getSelection: () => dictSel, setSelection: ids => { dictSel = ids; },
    getSource: () => dictSrc, setDictSrc,
  });
  function dictLookup(q, only, fromHist, sedraId) { return dictionaryUI.lookup(q, only, fromHist, sedraId); }
  function renderDictList() { return dictionaryUI.renderList(); }
  function renderSaved() { return dictionaryUI.renderSaved(); }
  function dtabAdd() { return dictionaryUI.addTab(); }
  function dictJump(i) { return dictionaryUI.jump(i); }
  // Reiter „Wörterbuch“: das Wörterbuch füllt die ganze Seite
  { let dictBefore = false;
    onTabChange = (t, prev) => {
      if (t === 'dict' && prev !== 'dict') { dictBefore = dictOpen; toggleDict(true); }
      else if (t !== 'dict' && prev === 'dict') toggleDict(dictBefore);
    };
  }
  // Scrollt nur den umgebenden Panel-Container (nicht das Dokument), damit das Fenster nicht springt
  function panelScrollTo(el, block) {
    let p = el.parentElement;
    while (p && p !== document.body && !(p.scrollHeight > p.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    if (!p || p === document.body) return;
    const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
    const top = r.top - pr.top + p.scrollTop - (block === 'center' ? (p.clientHeight - r.height) / 2 : 0);
    p.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
  // Herkunft des nachgeschlagenen Worts (Stelle im Text): als Feld „aus Genesis 25:8“ im Wörterbuch, das Wort bleibt im Text markiert
  let dictSrc = null, dictLastWord = null, dictLastAt = 0, dictCtxRow = null;
  const dictHL = r => { try { if (!window.CSS || !CSS.highlights) return; if (r) CSS.highlights.set('dictsrc', new Highlight(r)); else CSS.highlights.delete('dictsrc'); } catch { /* egal */ } };
  function captureDictSrc(q) {
    let range = null, row = null;
    try {
      const s = window.getSelection();
      if (s.rangeCount && !s.isCollapsed) {
        const r = s.getRangeAt(0), el = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
        if (el && el.closest('#rOut')) { range = r.cloneRange(); row = el.closest('.row[data-l]'); }
      }
    } catch { /* egal */ }
    if (!range && dictLastWord && Date.now() - dictLastAt < 120000 && dictLastWord.isConnected && dictLastWord.closest('#rOut')) { range = document.createRange(); range.selectNodeContents(dictLastWord); row = dictLastWord.closest('.row[data-l]'); }
    if (!row && dictCtxRow && dictCtxRow.isConnected) row = dictCtxRow;
    dictLastWord = null; dictCtxRow = null;
    if (!row || !view || !view.group || view.sres) return null;
    const sec = view.sections[view.idx];
    if (!sec) return null;
    const ref = `${view.group.title} ${String(sec.label).replace(/^\D+/, '') || sec.label}:${row.dataset.l}`.replace(/\s+/g, ' ');
    return { q: String(q).trim(), ref, range, row };
  }
  function setDictSrc(src) { dictSrc = src; dictHL(src && src.range); }
  $('#rOut').addEventListener('click', e => { const w = e.target.closest('.w, .wt, .wq, .wg'); if (w) { dictLastWord = w; dictLastAt = Date.now(); } }, true);
  $('#dictOut').addEventListener('click', e => {
    const a = e.target.closest('.dsrc a'); if (!a || !dictSrc) return;
    e.preventDefault();
    if (dictSrc.row && dictSrc.row.isConnected) { dictSrc.row.scrollIntoView({ block: 'center', behavior: 'smooth' }); dictSrc.row.classList.add('flash'); setTimeout(() => dictSrc && dictSrc.row && dictSrc.row.classList.remove('flash'), 900); }
    else jumpTo(dictSrc.ref, false);
  });
  async function openDict(q, only = null, sedraId = null) {
    if (q) setDictSrc(captureDictSrc(q));
    if (!dictOpen) toggleDict(true); else renderDictList();
    setStackActive('dict'); // als Reiter: zum Wörterbuch wechseln, der Kommentar bleibt an seiner Stelle
    if (q) dictLookup(q, only, false, sedraId); else $('#dictQ').focus({ preventScroll: true });
  }
  $('#openDict').onclick = () => { $('#moreMenu').open = false; toggleDict(); };
  $('#dictClose').onclick = () => { if (document.documentElement.dataset.tab === 'dict') showTab('read'); else toggleDict(false); };
  // Letzte Suchen (nur selbst eingegebene/ausgewählte, nicht Doppelklick oder Links) und Favoriten
  // Stellenangaben im Lesetext und in den Kommentaren (Klasse „aref“): im Reader öffnen; Cmd/Strg + Klick = neuer Tab, Umschalt + Klick = im zweiten Fenster rechts
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a.aref[data-sref]');
    if (!a || !a.closest('#rOut, #cmtBody, #linkPanel')) return;
    e.preventDefault(); e.stopPropagation();
    if (e.shiftKey && !IS_PANE2) { toPane2({ type: 'jump', ref: a.dataset.sref.replace(/-.*$/, '') }); return; }
    if (!BG(e)) navigationUI.navRemember(a); // „Zurück“ führt wieder an diese Stelle
    jumpTo(a.dataset.sref, BG(e)).then(ok => {
      a.classList.toggle('dmiss', !ok);
      a.title = ok ? (a.dataset.oref ? linksUI.versNote(a) : a.dataset.sref) : I18N.t('Dieser Text ist nicht in deiner Bibliothek (Reiter „Herunterladen“).');
    });
  }, true);
  $('#dictOut').addEventListener('click', e => {
    const s = e.target.closest('.dsrc[data-sref]');
    if (s) {   // Quellenangabe im Artikel (z. B. „Rosh Hashanah 18b“): im Reader öffnen; Cmd/Strg + Klick = neuer Tab, Umschalt + Klick = im zweiten Fenster rechts
      e.preventDefault();
      if (e.shiftKey && !IS_PANE2) { toPane2({ type: 'jump', ref: s.dataset.sref.replace(/-.*$/, '') }); return; }
      jumpTo(s.dataset.sref, BG(e)).then(ok => {
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
    dictionaryUI.getShown().forEach((x, i) => { let g = byDict.find(b => b.dictId === x.dictId); if (!g) byDict.push(g = { dictId: x.dictId, name: x.dict, first: i, n: 0 }); g.n++; });
    if (byDict.length > 1 || (byDict.length === 1 && byDict[0].n > 1)) {
      items.push({ sep: true });
      byDict.forEach(g => items.push({ label: g.n > 1 ? I18N.t('{} ({#} Artikel)', g.name, g.n) : g.name, fn: () => dictJump(g.first) }));
    }
    ctxShow(e, items);
  });
  const plainSnip = r => (r.parts ? r.parts.map(x => x.t).join('') : `${r.snippet.before}${r.snippet.hit}${r.snippet.after}`);
  const outlineSearch = window.LibraryOutline.createSearch($('#sOutline'), {
    esc, getGroups: () => groups, openOutlineRef: (ref, event) => jumpTo(ref, BG(event)),
  });
  const searchUI = window.LibrarySearch.create({
    $, $$, esc, KIND_LABEL, shortVer, plainSnip, lsGet, lsSet, outlineSearch, concordanceCoverageHtml,
    getGroups: () => groups, getPreferredVersions: () => prefVer,
  });
  function concordanceCoverageHtml(result, preview = false) {
    const coverage = result.lemmaCoverage;
    if (!coverage?.editions.length) return '';
    const count = n => n.toLocaleString(I18N.loc);
    const percent = new Intl.NumberFormat(I18N.loc, { style: 'percent', maximumFractionDigits: 1 });
    const fraction = (part, whole) => {
      if (!whole) return '';
      const ratio = part / whole;
      if (ratio > 0 && ratio < 0.001) return '< ' + percent.format(0.001);
      if (ratio < 1 && ratio > 0.999) return '> ' + percent.format(0.999);
      return percent.format(ratio);
    };
    const wording = row => I18N.t('{} von {} Wortstellen mit Lemma', count(row.withLemma), count(row.words))
      + (row.words ? ' (' + fraction(row.withLemma, row.words) + ')' : '');
    const rows = coverage.editions.map(row => `<tr><td>${esc(row.title)}</td><td>${esc(row.versionTitle || '–')}</td>
      <td>${esc(wording(row))}</td><td>${count(row.hits)}</td></tr>`).join('');
    const scope = preview
      ? I18N.t('Vorschau: {} von {} Fassungen geprüft', count(coverage.editions.length), count(result.total))
      : '';
    return `<details class="ccCoverage"><summary>${esc(wording(coverage))}${scope ? ' · ' + esc(scope) : ''}</summary>
      <div class="ccCoverageTable"><table><thead><tr><th scope="col">${esc(I18N.t('Werk'))}</th>
      <th scope="col">${esc(I18N.t('Fassung'))}</th><th scope="col">${esc(I18N.t('Lemma-Abdeckung'))}</th>
      <th scope="col">${esc(I18N.t('Treffer'))}</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }
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
      html += `<h3 class="sbook" data-t="${esc(title)}">${esc(title)}${g.heTitle ? ` <small dir="rtl">${esc(g.heTitle)}</small>` : ''} <span class="sup" title="${esc(I18N.t('Zur Übersicht'))}">↑</span></h3><div class="row head" style="--n:${nc}"><div class="lab"></div>${ds.map(d => `<div>${esc(d.entry.language==='Syriac'?'Syr.':KIND_LABEL[d.entry.kind])} · ${esc(shortVer(d.versionTitle))}</div>`).join('')}</div>`;
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
  $('#sReadBtn').onclick = () => { // alle Treffer als Lesetext in einem neuen Tab im Lesen-Reiter
    const lastSearch = searchUI.getLastSearch();
    if (!lastSearch) return;
    saveScroll();
    const nv = { group: null, sres: { q: lastSearch.query || I18N.t(lastSearch.syntax ? 'Klauselsuche (Tanach)' : 'Grammatik'), limit: 300, html: null, params: { ...lastSearch, limit: undefined, perFile: undefined } } };
    addTab(nv); view = nv;
    showTab('read'); showView();
  };
  $('#sOut').addEventListener('click', e => {
    const row = e.target.closest('.row[data-sp]');
    if (!row || e.target.closest('.w, sup, .note, .scm, .slk') || (window.getSelection() + '')) return;
    const g = [...groupsByKey.values()].find(x => x.title === row.dataset.t);
    if (g) { const tg = { sectionPath: JSON.parse(row.dataset.sp), rowLabel: row.dataset.sl }; if (e.metaKey || e.ctrlKey) openGroupBg(g, tg); else openGroup(g, tg, false); }
  });
  // Rechtsklick auf ein Suchergebnis: hier öffnen, neuer Tab, zweites Fenster
  $('#sOut').addEventListener('contextmenu', e => {
    const el = e.target.closest('.sres');
    if (!el || (window.getSelection() + '')) return; // bei markiertem Text das normale Menü lassen
    const r = searchUI.resultAt(+el.dataset.i, el.dataset.cp);
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
    const r = searchUI.resultAt(+el.dataset.i, el.dataset.cp);
    const entry = entries.find(x => x.rel === r.rel);
    if (!entry) return;
    { const tg = { rel: r.rel, sectionPath: r.loc && r.loc.path, rowLabel: r.loc ? r.loc.label : undefined }, gg = groupsByKey.get(keyOf(entry)); if (e.metaKey || e.ctrlKey) openGroupBg(gg, tg); else openGroup(gg, tg, false); }
  });

  const downloadsUI = window.LibraryDownloads.create({ $, $$, esc, fmtSize, refreshState, loadLibrary });
  function refreshCatalog() { return downloadsUI.refreshCatalog(); }

  const displayUI = window.LibraryDisplay.create({
    $, $$, esc, shortVer, getView: () => view, getGroups: () => groups,
    renderSection, olInlineOn: outlineUI.olInlineOn, olInline: outlineUI.olInline, withAnchor,
  });
  const disp = displayUI.state;
  const stripHe = h => displayUI.stripHe(h);
  function applyDisp(rerender) { return displayUI.apply(rerender); }
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
      const a = notesUI.plain(r.html), b = notesUI.plain(B.get(r.label));
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

  // reader-module:notes
  const notesUI = window.LibraryNotes.create({
    get $() { return $; },
    get $$() { return $$; },
    get apSoon() { return apSoon; },
    get BG() { return BG; },
    get cache() { return cache; },
    get cmtRow() { return cmtRow; }, set cmtRow(value) { cmtRow = value; },
    get ctxShow() { return ctxShow; },
    get esc() { return esc; },
    get fmtVerses() { return fmtVerses; },
    get groups() { return groups; }, set groups(value) { groups = value; },
    get groupsByKey() { return groupsByKey; },
    get jumpTo() { return jumpTo; },
    get KIND_LABEL() { return KIND_LABEL; },
    get libCmpGroups() { return linksUI.libCmpGroups; },
    get mapDraw() { return mapUI.mapDraw; },
    get mapInfo() { return mapUI.mapInfo; },
    get normT() { return normT; },
    get noteId() { return noteId; },
    get noteUrl() { return noteUrl; },
    get O() { return O; },
    get openGroup() { return openGroup; },
    get R() { return R; },
    get renderSaved() { return renderSaved; },
    get renderSearchSaved() { return renderSearchSaved; },
    get renderSection() { return renderSection; },
    get rowVerse() { return rowVerse; },
    get setCmtRow() { return setCmtRow; },
    get shortVer() { return shortVer; },
    get showTab() { return showTab; },
    get toggleCmt() { return toggleCmt; },
    get view() { return view; }, set view(value) { view = value; },
  });
  // end-reader-module:notes

  window.LibraryExport.create({
    $, getView: () => view, getNotes: () => notesUI.notesAll, stripHe, noteId,
    labels: KIND_LABEL, shortVer,
    getInterlinear: v => interlinearUI.exportRenderer(v),
    getTypography: v => {
      const root = $('#rOut'), basePx = parseFloat(getComputedStyle(root).fontSize) || fs;
      const cells = $$('.cell[data-rel]', root);
      return { basePx, columnsPx: v.loaded.map(d => {
        const text = cells.find(c => c.dataset.rel === d.entry.rel)?.querySelector('.txt');
        if (text) return parseFloat(getComputedStyle(text).fontSize);
        const key = ['de', 'en'].includes(d.entry.kind) ? d.entry.kind : d.entry.language === 'Greek' ? 'gr' : ['Hebrew', 'Aramaic'].includes(d.entry.language) ? 'he' : null;
        return basePx * (key ? disp[key] || 1 : 1);
      }) };
    },
    getLinks: (v, section) => { const chap = linksUI.secChapOf(section); return chap == null ? [] : linksUI.LK.section(linksUI.secBook(v.group, section), chap); },
  });

  let cmtTimer = null, lastCmtKey = '';
  function applyCmtRowSoon() { clearTimeout(cmtTimer); cmtTimer = setTimeout(() => { if (cmtOpen) applyCmtRow(); }, 0); }
  // ---------- Kommentar-Bereich: Kommentare zum gewählten Vers direkt untereinander ----------
  // Kommentarleiste: Breite (Strich am linken Rand ziehen) und Textgröße (A−/A+) werden gemerkt
  {
    const rt = document.documentElement;
    let cw = 400, cfs = 14;
    try { cw = +localStorage.getItem('cmtW') || 400; cfs = +localStorage.getItem('cmtFs') || 14; } catch { /* egal */ }
    const clampW = w => Math.round(Math.min(Math.max(280, w), window.innerWidth * 0.9));
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
  let cmtOpen = false, cmtRow = null;
  var cmtWhole = false; // Kommentare zum ganzen Kapitel bzw. zur ganzen Seite (über den Knopf), sonst zum gewählten Vers
  const dispName = n => String(n).replace(/, [^,]+$/, ''); // „Bekhor Shor, Genesis“ → „Bekhor Shor“
  const CMT_PRIO = ['Rashi', 'Ibn Ezra', 'Ramban', 'Rashbam', 'Sforno', 'Or HaChaim', 'Chizkuni', 'Radak', 'Kli Yakar', 'Bekhor Shor', 'Onkelos'];
  const commentSelection = window.LibraryCommentSelection.create({ $, $$, CMT_PRIO, renderCmt });
  const commentaryUI = window.LibraryCommentary.create({
    $, $$, esc, R, selection: commentSelection,
    reader: { get view() { return view; }, get open() { return cmtOpen; },
      get row() { return cmtRow; }, get whole() { return cmtWhole; },
      get virtual() { return cmtVirt; }, get linksReady() { return linksUI.linksReady; },
      get links() { return linksUI.secLinks; }, get groups() { return groups; }, localTitles: linksUI.localTitles },
    format: { CMT_PRIO, dispName, splitOther: linksUI.splitOther, libCmpGroups: linksUI.libCmpGroups, titleCmp: linksUI.titleCmp, secChapOf: linksUI.secChapOf,
      rowVerse, stripHe, versOf, versNoteText, portraitOf },
    navigation: { jumpTo, openInPane2, ctxShow, panelScrollTo, IS_PANE2 },
    refreshFind: () => { if (!fb.hidden && fTerm) runFind(fTerm, true); },
  });
  function renderCmt() { return commentaryUI.render(); }
  function cmtTopName() { return commentaryUI.topName(); }
  function setCmtRow(label) {
    cmtRow = label;
    $$('#rOut .row.cmtrow').forEach(r => r.classList.remove('cmtrow'));
    const r = $$('#rOut .row[data-l]').find(x => x.dataset.l === label);
    if (r) r.classList.add('cmtrow');
    if (cmtOpen && !cmtWhole) renderCmt(); // ganzes Kapitel: die Markierung wechselt, der Inhalt bleibt
    apSoon();
    textcritUI.select(label);
  }
  function applyCmtRow() {
    const rows = $$('#rOut .row[data-l]');
    let r = rows.find(x => x.dataset.l === cmtRow) || $('#rOut .row.hit') || rows.find(x => rowVerse(x.dataset.l) != null);
    if (r) setCmtRow(r.dataset.l);
    if (cmtOpen && (cmtWhole || !r)) renderCmt();
  }
  function toggleCmt(force) {
    withAnchor(() => toggleCmt0(force));
  }
  function toggleCmt0(force) {
    cmtOpen = force == null ? !cmtOpen : force;
    $('#cmtPanel').hidden = !cmtOpen;
    document.body.classList.toggle('cmt-open', cmtOpen);
    $('#cmtResize').hidden = !(cmtOpen || (typeof dictOpen !== 'undefined' && dictOpen));
    if (cmtOpen) stackActive = 'cmt';
    syncStack();
    $('#cmtBtn').classList.toggle('active', cmtOpen);
    if (cmtOpen) applyCmtRow();
  }
  const cmtFromBtn = () => { if (!cmtOpen) cmtWhole = true; toggleCmt(); }; // Knopf / Cmd+K: das ganze Kapitel; ein Klick auf eine Versnummer: nur dieser Vers
  $('#cmtBtn').onclick = cmtFromBtn;
  $('#cmtWhole').onclick = () => { cmtWhole = true; renderCmt(); };
  $('#cmtBody').addEventListener('click', e => { const h = e.target.closest('.cvn[data-l]'); if (!h) return; const r = $$('#rOut .row[data-l]').find(x => rowVerse(x.dataset.l) === +h.dataset.l); if (r) { r.scrollIntoView({ block: 'center', behavior: 'smooth' }); r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 1200); } });
  $('#cmtClose').onclick = () => toggleCmt(false);
  // ---------- Fenster anpinnen: neben dem Text festhalten statt darüber zu schweben ----------
  // Je Fenster wird gemerkt, ob es angepinnt ist. Ein angepinntes Fenster steht rechts neben dem Haupttext; öffnet ein zweites angepinntes Fenster, tritt es an die Stelle des ersten
  // Nicht angepinnte Fenster schweben wie bisher über dem Text.
  const PINS = { textcrit: ['#textcritPanel', '#tcClose'], forms: ['#formsPanel', '#fmClose'], all: ['#allPanel', '#apClose'], link: ['#linkPanel', '#lkClose'], topic: ['#topicPanel', '#tpClose'], outline: ['#outlinePanel', '#olClose'], map: ['#mapPanel', '#mapClose'], cmt: ['#cmtPanel', '#cmtClose'], dict: ['#dictPanel', '#dictClose'] };
  const pins = { textcrit: true, forms: false, all: true, link: false, topic: false, outline: false, map: false, cmt: true, dict: true };
  try { const o = JSON.parse(localStorage.getItem('pins') || '{}'); for (const k in pins) if (typeof o[k] === 'boolean') pins[k] = o[k]; } catch { /* egal */ }
  const pinPair = (a,b) => ['cmt','dict'].includes(a)&&['cmt','dict'].includes(b);
  let pinBusy = false;
  const pinVis = { cmt: false, dict: false }; // zuletzt gesehene Sichtbarkeit von Kommentaren/Wörterbuch
  const dockTabs = window.LibraryDockTabs.create({
    $,panels:PINS,pins,automatic:()=>pinBusy,afterOpen:key=>pinSync(undefined,key),
    activePair: visible => visible.includes('cmt')&&visible.includes('dict')?stackActive:null,
    paired:(a,b)=>pinPair(a,b),
    available:key=>key==='forms'?wordCardsUI.canReopen:key==='dict'?true:!!view?.group&&!({textcrit:'#tcBtn',link:'#lkBtn',topic:'#tpBtn',map:'#mapBtn'}[key]&&$({textcrit:'#tcBtn',link:'#lkBtn',topic:'#tpBtn',map:'#mapBtn'}[key]).hidden),
    open:{textcrit:()=>textcritUI.open(),forms:()=>wordCardsUI.reopen(),all:()=>apToggle(true,undefined,true),
      cmt:()=>{toggleCmt(true);setStackActive('cmt');},dict:()=>{toggleDict(true);setStackActive('dict');},
      link:()=>{if($('#linkPanel').hidden)$('#lkBtn').click();},topic:()=>{if($('#topicPanel').hidden)$('#tpBtn').click();},
      outline:()=>{if($('#outlinePanel').hidden)$('#olBtn').click();},map:()=>{if($('#mapPanel').hidden)$('#mapBtn').click();}}
  });
  dockController=dockTabs;
  const panelVisible={};
  for(const id of ['tcBtn','lkBtn','tpBtn','mapBtn'])new MutationObserver(()=>dockTabs.sync()).observe($('#'+id),{attributes:true,attributeFilter:['hidden','disabled']});
  $('#studyBtn').onclick=()=>dockTabs.toggle();
  function pinSync(anchor, preferredKey) {
    if (pinBusy) return; pinBusy = true;
    try {
      for(const k in PINS){const shown=!$(PINS[k][0]).hidden;if(shown&&!panelVisible[k]&&k!==preferredKey)pins[k]=dockTabs.pinMode;panelVisible[k]=shown;}
      { // beide nicht angepinnt: öffnet man das eine, schließt sich das andere (schwebend nie untereinander)
        const vis = {}; for (const k of ['cmt', 'dict']) vis[k] = !$(PINS[k][0]).hidden;
        if (anchor !== false) for (const k of ['cmt', 'dict']) { const o = k === 'cmt' ? 'dict' : 'cmt'; if (vis[k] && !pinVis[k] && !pins[k] && vis[o] && !pins[o]) { vis[o] = false; $(PINS[o][1]).click(); } }
        Object.assign(pinVis, vis);
      }
      const was = {}, now = {};
      for (const k in PINS) { const el = $(PINS[k][0]); was[k] = el.classList.contains('docked'); now[k] = !el.hidden && pins[k]; }
      const candidates=Object.keys(PINS).filter(k=>now[k]&&!was[k]);
      const fresh = preferredKey&&now[preferredKey]?[preferredKey]:candidates.slice(-1);
      for (const k of fresh) for (const o in PINS) if (o !== k && now[o] && !pinPair(k, o) && !fresh.includes(o)) { now[o] = false; $(PINS[o][1]).click(); } // das bisherige angepinnte Fenster schließen
      const apply = () => {
        for (const k in PINS) { const el = $(PINS[k][0]); el.classList.toggle('docked', now[k] && !el.hidden); const b = el.querySelector('.pinB'); if (b) { b.classList.toggle('on', pins[k]); b.title = I18N.t(pins[k] ? 'Lösen: über dem Text schweben' : 'Anpinnen: neben dem Text festhalten'); } }
        const any = Object.keys(PINS).some(k => $(PINS[k][0]).classList.contains('docked'));
        document.body.classList.toggle('dock-open', any);
        let w = 0; for (const k in PINS) { const el = $(PINS[k][0]); if (el.classList.contains('docked')) w = Math.max(w, el.getBoundingClientRect().width); }
        document.documentElement.style.setProperty('--dock-w', w ? w + 'px' : '');
        dockTabs.sync(fresh.at(-1));
      };
      const changed = Object.keys(PINS).some(k => (now[k] && !$(PINS[k][0]).hidden) !== was[k]);
      if (changed && anchor !== false) withAnchor(apply); else apply();
      window.dispatchEvent(new Event('resize'));
    } finally { pinBusy = false; }
  }
  for (const k in PINS) {
    const el = $(PINS[k][0]), cl = $(PINS[k][1]); if (!el || !cl) continue;
    const b = document.createElement('button'); b.className = 'pinB'; b.type = 'button'; b.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16v6" fill="none"/><path d="M9 3h6l-1 6.5 3.2 3.2V15H6.8v-2.3L10 9.5z"/></svg>';
    b.onclick = e => { e.stopPropagation(); pins[k] = !pins[k];for(const o in PINS)pins[o]=pins[k]; if(!pins[k])dockTabs.remove(k); try { localStorage.setItem('pins', JSON.stringify(pins)); } catch { /* egal */ } pinSync(undefined,k); };
    cl.before(b);
    el.classList.add('pinp');
    new MutationObserver(() => pinSync()).observe(el, { attributes: true, attributeFilter: ['hidden'] });
    if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(()=>{ if (el.classList.contains('docked')) { let w = 0; for (const o in PINS) { const e2 = $(PINS[o][0]); if (e2.classList.contains('docked')) w = Math.max(w, e2.getBoundingClientRect().width); } document.documentElement.style.setProperty('--dock-w', w ? w + 'px' : ''); } })).observe(el);
  }
  pinSync(false);
  window.LibraryPanelResize.create({panels:Object.values(PINS).map(p=>p[0]),setDockWidth:w=>window.setPanelW(w)});
  // nicht angepinnte Kommentare/Wörterbuch schließen beim Klick außerhalb (wie die anderen schwebenden Fenster)
  document.addEventListener('mousedown', e => {
    if (!e.target.closest || document.documentElement.dataset.tab === 'dict') return;
    if (e.target.closest('#cmtPanel, #dictPanel, #cmtBtn, #cmtResize, #rOut .lab, #suggest, #audioBar, #ctxMenu, #lkHover, #tip, #undoBar, #dheadPop, #dictSelP, dialog')) return;
    for (const k of ['cmt', 'dict']) { const el = $(PINS[k][0]); if (!el.hidden && !el.classList.contains('docked')) $(PINS[k][1]).click(); }
  });
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); cmtFromBtn(); } });
  // Vers, den man gerade liest: Zeile im oberen Viertel des Textes
  function readingRow(rows) {
    const top = $('#stick') ? $('#stick').getBoundingClientRect().bottom : 0;
    const y = top + (window.innerHeight - top) * 0.25;
    let pick = null;
    for (const r of rows) { const b = r.getBoundingClientRect(); if (b.bottom < top + 4) continue; pick = r; if (b.bottom >= y) break; }
    return pick;
  }
  let cmtStepY = null;
  function stepCmt(d) {
    const rows = $$('#rOut .row[data-l]').filter(x => rowVerse(x.dataset.l) != null);
    let i = rows.findIndex(x => x.dataset.l === cmtRow);
    // Liegt der Kommentar-Vers nicht (mehr) auf dem Bildschirm, weil man weitergescrollt hat: vom gerade gelesenen Vers aus weiterschalten, nicht vom Kapitelanfang
    const vis = r => { const b = r.getBoundingClientRect(), top = $('#stick') ? $('#stick').getBoundingClientRect().bottom : 0; return b.bottom > top + 4 && b.top < window.innerHeight; };
    // … aber nur, wenn seit dem letzten ▲/▼ wirklich gescrollt wurde – wer mehrmals ▲ drückt, geht Vers für Vers weiter, auch wenn der Vers dabei aus dem Bild wandert
    const stepping = cmtStepY !== null && Math.abs(window.scrollY - cmtStepY) < 3;
    if (i < 0 || (!vis(rows[i]) && !stepping)) { const r = readingRow(rows); if (r) i = rows.indexOf(r); }
    const at = k => rows[Math.min(rows.length - 1, Math.max(0, k))];
    let k = (i < 0 ? 0 : i) + d, n = at(k);
    if (n && n.dataset.l === cmtRow) n = at(k + d); // vom gelesenen Vers aus landete man wieder beim angezeigten Vers (z. B. ▲, während dieser knapp über dem Bildschirm liegt): einen weiter
    if (n) { AP.whole = false; cmtWhole = false; setCmtRow(n.dataset.l); panelScrollTo(n, 'center'); }
    cmtStepY = window.scrollY;
  }
  // j / k: nächster / vorheriger Vers im Kommentar-Bereich (nur wenn kein Eingabefeld den Fokus hat)
  document.addEventListener('keydown', e => {
    if (!(cmtOpen || AP.open) || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
    const tg = (e.target.tagName || '').toLowerCase();
    if (tg === 'input' || tg === 'textarea' || tg === 'select' || e.target.isContentEditable) return;
    if (e.key === 'j') stepCmt(1); else if (e.key === 'k') stepCmt(-1);
  });
  // „Folgen“: der Kommentar zeigt beim Scrollen immer den Vers, den man gerade liest (Zeile im oberen Viertel des Textes)
  let cmtFollow = false;
  try { cmtFollow = localStorage.getItem('cmtFollow') === '1'; } catch { /* egal */ }
  const syncFollowBtn = () => { $('#cmtFollow').classList.toggle('on', cmtFollow); $('#cmtFollow').setAttribute('aria-pressed', cmtFollow ? 'true' : 'false'); };
  syncFollowBtn();
  $('#cmtFollow').onclick = () => { cmtFollow = !cmtFollow; try { localStorage.setItem('cmtFollow', cmtFollow ? '1' : '0'); } catch { /* egal */ } syncFollowBtn(); if (cmtFollow) followNow(); };
  function followNow() {
    if (!cmtFollow || !cmtOpen || !view || !view.group || view.sres || (document.documentElement.dataset.tab || 'read') !== 'read') return; // vor dem ersten Reiterwechsel ist data-tab noch leer, gezeigt wird aber „Lesen“
    const rows = $$('#rOut .row[data-l]').filter(x => rowVerse(x.dataset.l) != null);
    const pick = readingRow(rows);
    if (pick && pick.dataset.l !== cmtRow) setCmtRow(pick.dataset.l);
  }
  let followT = null;
  document.addEventListener('scroll', e => { if (!cmtFollow) return; const t = e.target; if (t && t.nodeType === 1 && t.closest('#cmtPanel, #dictPanel, #linkPanel, #topicPanel, #outlinePanel, aside')) return; clearTimeout(followT); followT = setTimeout(followNow, 200); }, { passive: true, capture: true });
  // Kommentator mit mehreren Stellen (×3): im festen Kopf anzeigen, in welcher man gerade liest („2/3“)
  $('#cmtPanel').addEventListener('scroll', () => {
    for (const c of $$('#cmtBody .cmt')) {
      const parts = c.querySelectorAll('.cpart'); if (parts.length < 2) continue;
      const h = c.querySelector('h4'), cx = h && h.querySelector('.cx'); if (!cx) continue;
      const hb = h.getBoundingClientRect().bottom;
      let k = 0; parts.forEach((p, i) => { if (p.getBoundingClientRect().top <= hb + 8) k = i; });
      cx.textContent = (k + 1) + '/' + parts.length;
    }
  }, { passive: true });
  $('#cmtPrev').onclick = () => stepCmt(-1);
  $('#cmtNext').onclick = () => stepCmt(1);
  // Klick auf die Versnummer wählt den Vers für den Kommentar-Bereich
  $('#rOut').addEventListener('click', e => {
    const lab = e.target.closest('.lab');
    if (!lab || e.target.closest('.bm') || e.target.closest('.lk, .mtj')) return;
    const row = lab.closest('.row[data-l]');
    if (row) { AP.whole = false; cmtWhole = false; setCmtRow(row.dataset.l); if (!cmtOpen && !AP.open && $('#textcritPanel').hidden) toggleCmt(true); } // ein Klick auf den Vers öffnet die Kommentare (ist „Alles zu dieser Stelle“ offen, folgt dieses Fenster)
  });
  // Doppelklick auf die Versnummer öffnet den Kommentar-Bereich, derselbe Vers noch einmal schließt ihn
  let lastCmtDbl = null;
  $('#rOut').addEventListener('dblclick', e => {
    const lab = e.target.closest('.lab');
    if (!lab || e.target.closest('.bm') || e.target.closest('.lk, .mtj')) return;
    const row = lab.closest('.row[data-l]');
    if (!row || AP.open) return;
    const key = (view && view.group ? view.group.key : '') + '|' + (view ? view.key : '') + '|' + row.dataset.l;
    if (cmtOpen && lastCmtDbl === key) { toggleCmt(false); lastCmtDbl = null; return; }
    lastCmtDbl = key;
    cmtWhole = false;
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
  // ---------- Alles zu dieser Stelle: ein Fenster mit festen Fächern zum gewählten Vers / Segment ----------
  // Zusammengestellt wird nur, was die anderen Fenster ohnehin schon geladen haben (Verknüpfungen des Abschnitts, Themen, Orte, Gliederung, Notizen);
  // die Verteilung auf die Fächer macht passage.js. Das Fenster folgt dem gewählten Vers (Klick auf die Versnummer, j/k, ▲▼).
  var AP = { open: false, token: 0, t: null, key: '', whole: false }; // whole: ganzes Kapitel bzw. ganze Seite statt eines Verses
  const AP_CAP = 6;
  const AP_META = {
    commentary: ['💬', 'Kommentare'], parallels: ['⇄', 'Parallelstellen'], legends: ['❧', 'Legenden (Ginzberg)'], krauss: ['🏺', 'Talmudische Archäologie (Krauss)'], rabbinic: ['📜', 'Talmud & Midrasch'], halakhah: ['⚖', 'Halacha'],
    words: ['א', 'Wörter'], stats: ['∑', 'Statistik'], dicts: ['📖', 'In Wörterbüchern'], places: ['🗺', 'Orte'], topics: ['🏷', 'Themen'], mishtal: ['↔', 'Mischna ↔ Talmud'], outline: ['☰', 'Gliederung / Mizwa'], notes: ['★', 'Notizen'], other: ['🔗', 'Weitere Verknüpfungen'],
  };
  const apName = b => { const t = I18N.t(AP_META[b][1]); return t.charAt(0).toUpperCase() + t.slice(1); }; // „Orte“ ist englisch sonst klein („places“)
  const AP_ALL = { commentary: 1, parallels: 1, legends: 1, krauss: 1, rabbinic: 1, halakhah: 1, places: 1, topics: 1, outline: 1, notes: 1, other: 1 }; // Fächer mit „alle anzeigen“
  let krOl, krIdx = null; // Gliederung von Krauss (wird beim ersten Bedarf geladen)
  function krLabel(ref) { // „Talmudische Archäologie 12:3“ -> { t: '12. Bett (S. 64)', head: 'I. Wohnung und Hausgerät', par: 3 }
    if (!krOl) return null;
    if (!krIdx) { krIdx = []; for (const s of krOl.sections || []) for (const it of s.items || []) { const m = String(it.ref).match(/^(\d+):(\d+)/); if (m) krIdx.push([+m[1] * 100000 + +m[2], it.text, s.head]); } krIdx.sort((a, b) => a[0] - b[0]); }
    const m = String(ref).slice(window.Passage.KRAUSS.length + 1).match(/^(\d+):?(\d+)?/); if (!m) return null;
    const k = +m[1] * 100000 + +(m[2] || 1); let hit = null;
    for (const e of krIdx) { if (e[0] <= k) hit = e; else break; }
    return hit ? { t: hit[1], head: hit[2], par: m[2] || '1' } : null;
  }
  const AP_LKCATS = { parallels: ['tanakh', 'parallelstellen', 'second temple', 'targum'], rabbinic: ['talmud', 'midrash', 'mishnah', 'tosefta'], halakhah: ['halakhah', 'responsa'] };
  const apChap = s => { // Abschnitt als „3“, „2a“ oder „1:2“ (wie loadLinks)
    if (!s) return null; const first = s.label.split(' › ')[0];
    let m = s.path.length === 1 && !s.label.includes('›') && first.match(/(\d+[ab]?)$/i);
    if (!m && s.path.length === 2 && s.path.every(x => typeof x === 'number')) m = [null, (s.path[0] + 1) + ':' + (s.path[1] + 1)];
    if (!m && linksUI.secNode(s)) m = [null, String(s.path[1] + 1)];
    return m ? m[1] : null;
  };
  const apRefLabel = ref => { const bk = linksUI.splitOther(ref), de = I18N.lang === 'de' ? deNames(bk).split(' / ')[0] : ''; return (de || bk) + String(ref).slice(bk.length).replace(/-/g, '–'); };
  function apSoon() { if (!AP || !AP.open) return; clearTimeout(AP.t); AP.t = setTimeout(apRender, 40); }
  function apPickRow() { // gewählter Vers, sonst der markierte, sonst der gerade gelesene
    const rows = $$('#rOut .row[data-l]'); if (!rows.length) return null;
    const onScreen = r => { const b = r.getBoundingClientRect(); return b.bottom > 0 && b.top < window.innerHeight; };
    const cur = rows.find(x => x.dataset.l === cmtRow);
    if (cur) return cur;
    const hit = $('#rOut .row.hit[data-l]'); if (hit && onScreen(hit)) return hit;
    const top = $('#stick') ? $('#stick').getBoundingClientRect().bottom : 0; // sonst die erste Zeile, die ganz zu sehen ist
    return rows.find(r => rowVerse(r.dataset.l) != null && r.getBoundingClientRect().top >= top - 4 && onScreen(r)) || readingRow(rows.filter(x => rowVerse(x.dataset.l) != null)) || rows[0];
  }
  const apStates=new Map();
  function apRemember(){
    if(!AP.key||!$('#apBody .apScope')||!$('#allPanel').getClientRects().length)return;
    const scopes={};for(const pane of $$('#apBody .apScope'))scopes[pane.dataset.scope]={tab:pane.querySelector('.apSeg button.on')?.dataset.seg,more:[...pane.querySelectorAll('.apMore')].map(x=>!x.hidden),details:[...pane.querySelectorAll('details')].map(x=>x.open),profile:pane.querySelector('.apProfile')?.scrollLeft||0};
    apStates.delete(AP.key);apStates.set(AP.key,{scopes,scope:$('#apBody .apScopeSw button.on')?.dataset.scope,scroll:$('#allPanel').scrollTop});
    while(apStates.size>24)apStates.delete(apStates.keys().next().value);
  }
  function apRestore(){
    const state=apStates.get(AP.key);if(!state)return;
    for(const pane of $$('#apBody .apScope')){const s=state.scopes[pane.dataset.scope];if(!s)continue;
      pane.querySelector('.apSeg button[data-seg="'+s.tab+'"]')?.click();
      [...pane.querySelectorAll('.apMore')].forEach((x,i)=>{if(s.more[i]!==undefined&&x.hidden===s.more[i])x.nextElementSibling?.click();});
      [...pane.querySelectorAll('details')].forEach((x,i)=>{if(s.details[i]!==undefined)x.open=s.details[i];});
      const profile=pane.querySelector('.apProfile');if(profile)profile.scrollLeft=s.profile;
    }
    if(state.scope)$('#apBody .apScopeSw button[data-scope="'+state.scope+'"]')?.click();
    const key=AP.key,token=AP.token;requestAnimationFrame(()=>{if(key===AP.key&&token===AP.token)$('#allPanel').scrollTop=state.scroll;});
  }
  function apToggle(force, label, restore) {
    apRemember();const wasOpen=AP.open;
    AP.open = force == null ? !AP.open : !!force;
    if (AP.open&&!restore&&(!wasOpen||label!=null)) AP.whole = label == null; // über den Knopf: ganzes Kapitel; über eine Zeile (Kontextmenü): dieser Vers
    $('#allPanel').hidden = !AP.open;
    $('#apBtn').classList.toggle('active', AP.open);
    if (!AP.open) { linksUI.hovApi && linksUI.hovApi.hide(); return; }
    if (label != null && label !== cmtRow) setCmtRow(label); // die Markierung der Zeile ist dieselbe wie beim Kommentar-Bereich
    apRender();
  }
  let apCur=null,apComparison='book',apStatsDataPromise=null;
  const apMarkKey=()=>view?.group&&view?.sections?.[view.idx]?view.group.key+'|'+view.sections[view.idx].k:'';
  const apMarks=window.LibraryPassageMarks.create({root:$('#rOut'),getKey:apMarkKey});
  function apMarkApply(mode,scope){
    const st=apCur?.[scope];if(!st){apMarks.clear();return;}
    const xs=mode==='names'?st.names:mode==='rare'?st.rareByCorpus[apComparison]:st.comparisons[apComparison];
    const corpus=apComparison==='book'?I18N.t('Buch: {}',st.book):I18N.t('Gesamter Tanach');
    apMarks.set({key:apMarkKey(),mode,scope,ids:xs.map(r=>r.w.lemma),verses:st.evidence.map(x=>String(x.verse)),label:I18N.t(mode==='names'?'Namen':mode==='rare'?'Seltene Wörter':'Auffällig häufig')+' · '+corpus});
  }
  function apMarkRefresh(){if(!AP.open){apMarks.sync();return;}const pane=$$('#apBody .apScope').find(p=>!p.hidden),mode=pane?.querySelector('.apSeg button.on')?.dataset.seg;if(pane&&['lead','rare','names'].includes(mode))apMarkApply(mode,pane.dataset.scope);else{const mark=apMarks.snapshot();if(pane&&mark?.key===apMarkKey()&&mark.scope===pane.dataset.scope&&mark.mode===mode)apMarks.sync();else apMarks.clear();}}

  function apSelectEntry(button){
    const scope=button.closest('.apScope')?.dataset.scope,st=apCur?.[scope];if(!st)return;
    const kind=button.dataset.apSelect,value=button.dataset.value,base={key:apMarkKey(),scope,selection:kind+':'+value,mode:kind,verses:st.evidence.map(e=>String(e.verse)),ids:[]};
    const lem=window.OSHB_LEMMAS||{};
    if(kind==='roots'){const f=st.families[+value];if(!f)return;base.ids=f.items.map(r=>r.w.lemma);base.label=I18N.t('Wurzeln')+' · '+f.root;}
    if(kind==='names'){base.ids=[value];base.label=I18N.t('Namen')+' · '+(lem[value]?.[0]||button.textContent);}
    if(kind==='verbs'){const f=st.forms[+value];if(!f)return;base.code=f.code;base.label=I18N.t('Verbformen')+' · '+[f.stem,I18N.t(f.tense),f.info].filter(Boolean).join(' · ');}
    if(kind==='stem'||kind==='tense'){base[kind]=value;base.label=I18N.t('Verbformen')+' · '+I18N.t(value);base.mode='verbs';}
    if(kind==='phrases'){const p=st.phrases[+value];if(!p)return;base.sequence=p.tokens.map(t=>({lang:t.lang,lemma:t.lemma}));base.label=I18N.t('Wortverbindungen')+' · '+p.tokens.map(t=>lem[t.lemma]?.[0]||t.word).join(' ');}
    apMarks.set(base);
  }

  try{if(localStorage.getItem('passageComparison')==='tanakh')apComparison='tanakh';}catch{}
  const loadPassageStats=()=>apStatsDataPromise||(apStatsDataPromise=wordCardsUI.lazyScript('passage-stats-data.js',()=>window.PASSAGE_STATS_DATA).catch(e=>{apStatsDataPromise=null;throw e;}));
  function apStats(rows,index,book,chapter){const st=window.PassageStatistics.analyze(rows,index,book,chapter);if(st){st.chapter=Number(chapter);st.profile=window.PassageStatistics.profile(rows,index,book,chapter,linksUI.secLinks);}return st;}
  const chapterCompareDocs=new Map();
  const chapterCompare=window.LibraryChapterComparison.create({root:$('#apBody'),esc,index:loadPassageStats,
    books:()=>[...new Set(groups.filter(g=>linksUI.TANAKH_BOOKS.has(g.title)&&g.versions.some(v=>v.kind==='he'&&/^Westminster/.test(v.versionTitle||''))).map(g=>g.title))],
    load:async book=>{const entry=groups.find(g=>g.title===book&&g.versions.some(v=>v.kind==='he'&&/^Westminster/.test(v.versionTitle||'')))?.versions.find(v=>v.kind==='he'&&/^Westminster/.test(v.versionTitle||''));if(!entry)throw Error('MT missing');if(!chapterCompareDocs.has(entry.rel))chapterCompareDocs.set(entry.rel,Promise.resolve(cache.get(entry.rel)||O.read(entry.rel)).catch(e=>{chapterCompareDocs.delete(entry.rel);throw e;}));return chapterCompareDocs.get(entry.rel);}
  });
  // ----- Ähnliche Kapitel (similar-chapters.js, tools/oshb/similar_chapters.py): Wortschatz oder gleiche Wendungen -----
  const apSim={mode:'w',hideNear:true};
  async function apSimilarMount(pane){
    const box=pane.querySelector('.apSimilar');if(!box||!apCur?.c)return;
    box.innerHTML='<p class="muted">'+esc(I18N.t('Lädt …'))+'</p>';
    let D;try{D=await wordCardsUI.lazyScript('similar-chapters.js',()=>window.SIMILAR_CHAPTERS);}catch{D=null;}
    const key=apCur.c.book+' '+apCur.c.chapter,rec=D?.c?.[key];
    if(!box.isConnected)return;
    if(!rec){box.innerHTML='<p class="muted">'+esc(I18N.t('Für dieses Kapitel liegen keine Vergleichsdaten vor (nur Tanach, Westminster-Text).'))+'</p>';return;}
    const book=apComparison==='book',list=(rec[apSim.mode+(book?'b':'')]||[]).filter(([k])=>{if(!apSim.hideNear)return true;const [b,c]=[k.replace(/ \d+$/,''),+k.split(' ').at(-1)];return !(b===apCur.c.book&&Math.abs(c-apCur.c.chapter)===1);});
    const LEM=window.OSHB_LEMMAS||{},max=Math.max(...list.map(x=>x[1]),1e-9);
    const name=k=>{const b=k.replace(/ \d+$/,''),c=k.split(' ').at(-1);return (I18N.lang==='de'?(deNames(b).split(' / ')[0]||b):b)+' '+c;};
    const rows=list.map(([k,score,what])=>{
      const detail=apSim.mode==='r'?what.map(id=>'<span class="apSimWord" lang="he" dir="rtl">'+esc(D.roots[id]||'')+'</span>').join(''):apSim.mode==='w'?what.map(l=>{const x=LEM[l];return x?'<span class="apSimWord"><span lang="he" dir="rtl">'+esc(x[0])+'</span> <small>'+esc(I18N.lang==='de'&&x[2]?x[2]:x[1])+'</small></span>':'';}).join(''):what.map(p=>'<span class="apSimPhrase" lang="he" dir="rtl">'+esc(p)+'</span>').join('');
      return '<div class="apSimRow"><button type="button" class="apSimCompare" data-sim="'+esc(k)+'" title="'+esc(I18N.t('Mit diesem Kapitel vergleichen'))+'"><b>'+esc(name(k))+'</b><i class="apBar"><b style="width:'+Math.max(3,Math.round(100*score/max))+'%"></b></i></button><button type="button" class="apSimOpen" data-sim-open="'+esc(k)+'" title="'+esc(I18N.t('Kapitel öffnen'))+'">↗</button><div class="apSimWhat">'+detail+'</div></div>';
    }).join('');
    box.innerHTML='<div class="apSimModes">'+[['r','Wurzeln','Gemeinsame Lexikonwurzeln; seltene zählen mehr. Nur ausdrücklich zugeordnete Wurzeln werden berücksichtigt.'],['w','Wortschatz','Gleiche typische Wörter (seltene zählen mehr, Funktionswörter nicht)'],['p','Wendungen','Gleiche Folgen von drei Wörtern, seltene Folgen zählen mehr']].map(([m,l,t])=>'<button type="button" data-sim-mode="'+m+'" aria-pressed="'+(apSim.mode===m)+'" class="'+(apSim.mode===m?'on':'')+'" title="'+esc(I18N.t(t))+'">'+esc(I18N.t(l))+'</button>').join('')+'<label><input type="checkbox" class="apSimNear"'+(apSim.hideNear?' checked':'')+'> '+esc(I18N.t('Nachbarkapitel ausblenden'))+'</label></div>'
      +'<p class="muted apHow">'+esc(I18N.t(book?'Ähnlichste Kapitel im Buch {}.':'Ähnlichste Kapitel im gesamten Tanach.',apCur.c.book))+' '+esc(I18N.t('Klick: beide Kapitel vergleichen; ↗ öffnet das Kapitel.'))+'</p>'
      +(apSim.mode==='r'?'<p class="muted apHow">'+esc(I18N.t('Verglichen werden zugeordnete Lexikonwurzeln, keine Themen. Wörter ohne Wurzelzuordnung bleiben unberücksichtigt.'))+'</p>':'')
      +(rows||'<p class="muted">'+esc(I18N.t('Keine ähnlichen Kapitel gefunden.'))+'</p>');
  }
  function apChapterCompareMount(pane){const box=pane.querySelector('.apChapterCompare');if(box&&apCur?.c)chapterCompare.mount(box,{book:apCur.c.book,chapter:apCur.c.chapter,scope:pane.dataset.scope});}
  function apVerseProfile(st){
    const metrics=[['words','Wörter',p=>p.words],['rare','Seltene Wörter',p=>p.rare[apComparison]],['comments','Erfasste Kommentare',p=>p.comments],['sources','Quellenarten',p=>p.sourceKinds]],ps=st.profile||[];
    return `<p class="muted apHow">${esc(I18N.t('Ein Balken pro Vers. Klick führt zum Lesetext; die Balkenhöhe ist je Zeile auf den höchsten Kapitelwert skaliert.'))} ${esc(I18N.t('Bei langen Kapiteln seitlich scrollen.'))}</p><div class="apProfile" role="group" aria-label="${esc(I18N.t('Versprofil'))}"><div class="apProfileGrid" style="--profile-verses:${ps.length}"><span class="apProfileLabel">${esc(I18N.t('Vers'))}</span>${ps.map(p=>`<button type="button" data-stat-verse="${esc(p.verse)}" class="apProfileVerse" aria-label="${esc(I18N.t('Vers {}',p.verse))}">${esc(p.verse)}</button>`).join('')}${metrics.map(([key,label,value])=>{const max=Math.max(1,...ps.map(value));return `<span class="apProfileLabel">${esc(I18N.t(label))}</span>`+ps.map(p=>{const n=value(p),description=I18N.t('Vers {}',p.verse)+' · '+I18N.t(label)+': '+n;return `<button type="button" class="apProfileBar" data-metric="${key}" data-stat-verse="${esc(p.verse)}" data-count="${n}" style="--bar-height:${35*n/max}px" title="${esc(description)}" aria-label="${esc(description)}"><span>${n}</span><i aria-hidden="true"></i></button>`;}).join('');}).join('')}</div></div><p class="muted apNote">${esc(I18N.t('Seltene Wörter: Belege mit 1–19 Vorkommen im gewählten Buch oder Tanach. Kommentare: erfasste versbezogene Verknüpfungen. Quellenarten: Samaritanus, Septuaginta, Qumran und Kennicott, höchstens vier.'))}</p>`;
  }
  function apStatsHtml(stC, stV, v) {
    const scopeHtml = (st, scope) => apStatsScope(st, scope, scope === 'v' ? v : 0);
    if(stV)stV.profile=stC.profile;
    apCur = { c: stC, v: stV };
    return `${stV ? `<div class="apSeg apScopeSw">${[['v', I18N.t('Vers {}', v)], ['c', I18N.t('Kapitel')]].map(([k, t], i) => `<button type="button" data-scope="${k}"${i ? '' : ' class="on"'}>${esc(t)}</button>`).join('')}</div>` : ''}${stV ? `<div class="apScope" data-scope="v">${scopeHtml(stV, 'v')}</div><div class="apScope" data-scope="c" hidden>${scopeHtml(stC, 'c')}</div>` : `<div class="apScope" data-scope="c">${scopeHtml(stC, 'c')}</div>`}`;
  }
  function apStatsScope(st, scope, v) {
    const LEM = window.OSHB_LEMMAS || {}, L = I18N.lang, n = x => x.toLocaleString(I18N.loc);
    const gl = r => { const lem = LEM[r.w.lemma]; return lem ? (L === 'de' && lem[2] ? lem[2] : lem[1]) : ''; };
    const rateLabel=value=>value==null?'—':value>0&&value<0.1?'< '+(0.1).toLocaleString(I18N.loc):value.toLocaleString(I18N.loc,{maximumFractionDigits:1});
    const rateScales={ratio:Math.max(1,...st.comparisons[apComparison].flatMap(x=>[x.rateHere,x.rateRest])),rare:Math.max(1,...st.rareByCorpus[apComparison].flatMap(x=>[x.rateHere,x.rateRest??0]))};
    const row = (r, mode, select = false) => {
      const lem=LEM[r.w.lemma],total=apComparison==='book'?r.B:r.T;
      const txt=mode==='corpus'?`${n(total||0)}× ${esc(I18N.t(apComparison==='book'?'im Buch':'im Tanach'))}`:mode==='here'?`${r.n}× ${esc(I18N.t('hier'))}`:mode==='rare'?`${r.n}× ${esc(I18N.t('hier'))} · ${n(r.B)}× ${esc(I18N.t('im Buch'))} · ${n(r.T)}× ${esc(I18N.t('im Tanach'))}`:`${r.n}× ${esc(I18N.t('hier'))} · ${n(total||0)}× ${esc(I18N.t(apComparison==='book'?'im Buch':'im Tanach'))}`;
      const share=window.PassageStatistics.concentration(r.n,total),only=['ratio','rare'].includes(mode)&&share!==null?` <em class="apOnly" data-corpus="${apComparison}" data-share="${share}" title="${esc(I18N.t('{} % der Belege in {} stehen in dieser Auswahl.',share,apComparison==='book'?st.book:I18N.t('Gesamter Tanach')))} ${esc(I18N.t('Markiert ab 50 % bei mindestens zwei Belegen im Vergleichskorpus.'))}">${esc(I18N.t('fast nur hier'))}</em>`:'';
      const rates=['ratio','rare'].includes(mode)&&Number.isFinite(r.rateHere),scale=rateScales[mode]||1;
      const graph=rates?`<span class="apRateGraph" role="img" aria-label="${esc(I18N.t('Je 1.000: {} hier · {} sonst',rateLabel(r.rateHere),rateLabel(r.rateRest)))}">${[[r.rateHere,'hier','here'],[r.rateRest,'im Rest','rest']].map(([value,label,kind])=>`<span class="apRateLine ${kind}"><span>${esc(I18N.t(label))}</span><i><b style="width:${100*(value??0)/scale}%"></b></i><small>${esc(rateLabel(value))}</small></span>`).join('')}</span>`:'';
      return `<div class="apRow${rates?' apRateRow':''}"><button type="button" class="apW"${select?` data-ap-select="names" data-value="${esc(r.w.lemma)}" title="${esc(I18N.t('Im Lesetext markieren'))}"`:""} data-lemma="${esc(r.w.lemma)}" data-word="${esc(r.w.raw)}" data-l="${esc(r.w.l)}" data-m="${esc(r.w.m)}"><span class="f" lang="he" dir="rtl">${esc(lem?lem[0]:r.w.word)}</span></button><span class="apRg" dir="auto">${esc(gl(r))}</span><span class="apRn">${txt}${only}${graph}</span>${select?`<button type="button" class="apW apCardOpen" data-lemma="${esc(r.w.lemma)}" data-word="${esc(r.w.raw)}" data-l="${esc(r.w.l)}" data-m="${esc(r.w.m)}" title="${esc(I18N.t('Wortkarte'))}" aria-label="${esc(I18N.t('Wortkarte'))}">א↗</button>`:""}</div>`;
    };
    const list = (xs, mode, cap = 10, select = false) => apList(xs.map(r => row(r, mode, select)), cap);
    const bar = (label, v, pct, kind, value) => `<button type="button" class="apBarRow apBarChoice" data-ap-select="${kind}" data-value="${esc(value)}" title="${esc(I18N.t('Im Lesetext markieren'))}"><span class="apBl">${esc(label)}</span><i class="apBar"><b style="width:${Math.max(2, Math.min(100, pct))}%"></b></i><span class="apBn">${v}</span></button>`;
    const verseButton=verse=>`<button type="button" class="apStatVerse" data-stat-verse="${esc(verse)}">${esc(I18N.t('Vers {}',verse))}</button>`;
    const lead=st.comparisons[apComparison],rare=st.rareByCorpus[apComparison],vocabulary=st.vocabularyByCorpus[apComparison],sourceLabels=[[1,'Samaritanus','Tal','Anmerkungen von Tal–Florentin zum samaritanischen Text; auch sprachliche Hinweise.'],[2,'Septuaginta','Tov / CATSS','Hinweise von Tov/CATSS zur griechisch-hebräischen Zuordnung und Übersetzung.'],[4,'Qumran','Transkription','Transkriptionsmaterial zu diesem Vers; es kann rekonstruierte Teile enthalten.'],[8,'Kennicott','Anmerkungen','Erfasste Editionsanmerkungen; darunter auch Schreibweisen und Buchstabengestaltung.']];
    const panes = {
      chaptercompare:'<div class="apChapterCompare"></div>',
      similar:'<div class="apSimilar"></div>',
      profile:apVerseProfile(st),
      lead:`<p class="muted apHow">${esc(I18N.t('Nach relativer Häufigkeit gegenüber dem übrigen Vergleichskorpus sortiert. Das ist ein statistischer Hinweis, keine Themenbestimmung.'))}</p><p class="apRateLegend muted">${esc(I18N.t('Balken: Vorkommen je 1.000 Wörter, für alle Zeilen gleich skaliert. Blau: Auswahl. Gold: übriges Vergleichskorpus.'))}</p>${!st.comparisonAvailable[apComparison]?`<p class="muted">${esc(I18N.t('Die Auswahl umfasst das gesamte Vergleichskorpus.'))}</p>`:lead.length?list(lead,'ratio'):`<p class="muted">${esc(I18N.t('Keine auffällig häufigen Wörter.'))}</p>`}`,
      rare:`<p class="muted apHow">${esc(apComparison==='book'?I18N.t('Selten: 1–19 Belege des Lemmas im Buch {}. Nach Buchhäufigkeit sortiert; Tanachzahlen bleiben sichtbar.',st.book):I18N.t('Selten: 1–19 Belege des Lemmas im gesamten Tanach. Nach Tanachhäufigkeit sortiert; Buchzahlen bleiben sichtbar.'))}</p><p class="apRateLegend muted">${esc(I18N.t('Balken: Vorkommen je 1.000 Wörter, für alle Zeilen gleich skaliert. Blau: Auswahl. Gold: übriges Vergleichskorpus.'))}</p>${!st.comparisonAvailable[apComparison]?`<p class="muted">${esc(I18N.t('Die Auswahl umfasst das gesamte Vergleichskorpus.'))}</p>`:''}${rare.length?list(rare,'rare',15):`<p class="muted">${esc(I18N.t('Keine seltenen Wörter in dieser Auswahl.'))}</p>`}`,
      roots:`<p class="muted apHow">${esc(I18N.t('Wortfamilien nach ausdrücklichen Wurzelverweisen im Open-Scriptures-Lexikon; gleich geschriebene Wurzeln werden nicht automatisch zusammengeführt.'))}</p>${st.families.length?apList(st.families.map((f,i)=>`<details class="apFamily" open><summary data-ap-select="roots" data-value="${i}" title="${esc(I18N.t('Wortfamilie im Lesetext markieren'))}"><bdi lang="he" dir="rtl">${esc(f.root)}</bdi> · ${f.n}× · ${f.items.length} ${esc(I18N.t('Lemmata'))}</summary>${list(f.items,'here')}</details>`),8):`<p class="muted">${esc(I18N.t('Keine ausdrücklich erfassten Wurzelbezüge in dieser Auswahl.'))}</p>`}<p class="muted apNote">${esc(I18N.t('{} von {} Wörtern mit erfasstem Wurzelbezug.',st.rootWords,st.words))} Open Scriptures HebrewLexicon · CC BY 4.0.</p>`,
      vocab:`<p class="muted apHow">${esc(apComparison==='book'?I18N.t('Vokabular nach der Häufigkeit im Buch {}.',st.book):I18N.t('Vokabular nach der Häufigkeit im gesamten Tanach.'))}</p>${vocabulary.tiers.map(t=>`<details class="apTier"${t.items.length<=12&&t.key!=='>500'?' open':''}><summary><b>${esc(t.key==='1'?I18N.t(apComparison==='book'?'nur einmal im Buch':'nur einmal im Tanach'):I18N.t(apComparison==='book'?'{}× im Buch':'{}× im Tanach',t.key))}</b> <small>${n(t.items.length)}</small></summary>${list(t.items,'corpus',12)}</details>`).join('')}${st.only.length?`<h6>${esc(I18N.t('Nur in diesem Buch'))}</h6>${list(st.only,'ratio',8)}`:''}<button type="button" class="apCopy" data-act="copyvocab">${esc(I18N.t('Vokabelliste kopieren'))} <small>${n(vocabulary.vocab.length)}</small></button>`,
      verbs:st.stems.length?`<h6>${esc(I18N.t('Verbstämme'))}</h6>${st.stems.map(x=>bar(x.stem,n(x.n),x.pct,'stem',x.stem)).join('')}<h6>${esc(I18N.t('Verbformen'))}</h6>${st.tenses.map(x=>bar(I18N.t(x.tense),n(x.n),x.pct,'tense',x.tense)).join('')}${apList(st.forms.map((f,i)=>`<div class="apRow apMorphRow"><small>${esc(I18N.t('z. B.'))}</small><button type="button" title="${esc(I18N.t('Im Lesetext markieren'))} · ${esc(I18N.t('Beispielform; die Anzahl gilt für diesen Morphologietyp.'))}" class="apW" data-ap-select="verbs" data-value="${i}" data-lemma="${esc(f.lemma)}" data-word="${esc(f.raw)}" data-l="${esc(f.l)}" data-m="${esc(f.m)}"><bdi lang="he" dir="rtl">${esc(f.word)}</bdi></button><span>${esc(f.stem)} · ${esc(I18N.t(f.tense))} · ${esc(L==='de'?f.info:f.info.replace(/Pers\./g,'pers.').replace(/Sg\./g,'sg.').replace(/Pl\./g,'pl.').replace(/Du\./g,'du.'))}</span><b>${f.n}×</b><button type="button" class="apW apCardOpen" data-lemma="${esc(f.lemma)}" data-word="${esc(f.raw)}" data-l="${esc(f.l)}" data-m="${esc(f.m)}" title="${esc(I18N.t('Wortkarte'))}" aria-label="${esc(I18N.t('Wortkarte'))}">א↗</button></div>`),12)}`:`<p class="muted">${esc(I18N.t('Keine Verben.'))}</p>`,
      phrases:`<p class="muted apHow">${esc(I18N.t('Wiederkehrende Folgen von 2–3 Lemmata innerhalb eines Verses; Flexionsformen können abweichen.'))}</p>${st.phrases.length?apList(st.phrases.map((p,i)=>`<div class="apPhrase"><button type="button" class="apPhraseChoice" data-ap-select="phrases" data-value="${i}" title="${esc(I18N.t('Wortverbindung im Lesetext markieren'))}"><bdi dir="rtl" lang="he">${p.tokens.map(t=>esc(LEM[t.lemma]?.[0]||t.word)).join(' ')}</bdi> <b>${p.n}×</b></button><div>${p.refs.map(verseButton).join(' ')}</div></div>`),12):`<p class="muted">${esc(I18N.t('Keine wiederkehrenden Wortverbindungen in dieser Auswahl.'))}</p>`}`,
      names:st.names.length?list(st.names,'ratio',12,true):`<p class="muted">${esc(I18N.t('Keine Eigennamen.'))}</p>`,
      evidence:`<p class="muted apHow">${esc(I18N.t('Welche Quellen bieten Material zu diesem Vers? Die Häkchen zeigen erfasste Anmerkungen oder Transkriptionen, nicht automatisch abweichende Lesarten.'))}</p><table class="apEvidenceTable"><caption>${esc(I18N.t('✓ Material erfasst · — nicht erfasst'))}</caption><thead><tr><th scope="col">${esc(I18N.t('Vers'))}</th>${sourceLabels.map(([bit,label,edition,description])=>`<th scope="col" title="${esc(I18N.t(description))}">${esc(I18N.t(label))}<small>${esc(I18N.t(edition))}</small><small>${st.evidence.filter(e=>e.sources&bit).length}/${st.evidence.length} ${esc(I18N.t('Verse'))}</small></th>`).join('')}</tr></thead><tbody>${st.evidence.map(e=>`<tr class="apEvidence"><th scope="row"><button type="button" class="apStatVerse" data-stat-verse="${esc(e.verse)}" aria-label="${esc(I18N.t('Vers {}',e.verse))}">${esc(e.verse)}</button></th>${sourceLabels.map(([bit,label,edition,description])=>`<td>${e.sources&bit?`<span class="apEvidenceMark" title="${esc(I18N.t(description))}" aria-label="${esc(I18N.t(description))}">✓</span>`:`<span class="muted" aria-label="${esc(I18N.t('Nicht erfasst'))}">—</span>`}</td>`).join('')}</tr>`).join('')}</tbody></table><details class="apEvidenceLegend"><summary>${esc(I18N.t('Was wird hier gezählt?'))}</summary>${sourceLabels.map(([,label,,description])=>`<p><b>${esc(I18N.t(label))}:</b> ${esc(I18N.t(description))}</p>`).join('')}</details>`,
    };
    const segs=[
      ['lead','Auffällig häufig','▥','Hier stärker vertreten als im übrigen Text'],
      ['rare','Seltene Wörter','◇','Im Buch oder Tanach nur selten belegt'],
      ['vocab','Vokabeln','א','Alle Wörter nach ihrer Häufigkeit'],
      ['roots','Wurzeln','⌘','Verwandte Wörter gemeinsam erkunden'],
      ['verbs','Verbformen','↗','Verbstämme und grammatische Formen'],
      ['phrases','Wortverbindungen','⋈','Wiederkehrende Wortfolgen entdecken'],
      ['names','Namen','♙','Personen und Orte im Text'],
      ['evidence','Quellen pro Vers','▤','Material der Textzeugen im Überblick'],
      ['profile','Versprofil','▥','Verteilung über die Verse sichtbar machen'],
      ['similar','Ähnliche Kapitel','≈','Kapitel mit gemeinsamen Wurzeln, ähnlichem Wortschatz oder gleichen Wendungen'],
      ['chaptercompare','Kapitel vergleichen','⇄','Gemeinsamkeiten zweier Kapitel erkunden']
    ];
    const groups=[['Wörter entdecken',['lead','rare','vocab']],['Sprache untersuchen',['roots','verbs','phrases','names']],['Text vergleichen',['similar','evidence','profile','chaptercompare']]];
    const choice=([k,label,icon,description])=>`<button type="button" data-seg="${k}" title="${esc(I18N.t(description))}" aria-pressed="${k==='lead'}"${k==='lead'?' class="on"':''}><span class="apChoiceIcon" aria-hidden="true">${icon}</span><span>${esc(I18N.t(label))}</span></button>`;
    return `<p class="apSum">${esc(scope === 'v' ? I18N.t('{} Wörter, {} verschiedene Wörter (Lemmata). {} % der Wörter kommen im Tanach mindestens 100-mal vor.', n(st.words), n(st.lemmas), st.common) : I18N.t('{} Wörter in {} Versen, {} verschiedene Wörter (Lemmata). {} % der Wörter kommen im Tanach mindestens 100-mal vor.', n(st.words), n(st.verses), n(st.lemmas), st.common))}</p>
      <div class="apSeg apExplorer" role="group" aria-label="${esc(I18N.t('Statistik'))}">${groups.map(([label,keys],i)=>`<div class="apChoiceGroup apChoiceGroup-${i}"><h5>${esc(I18N.t(label))}</h5><div class="apChoices">${keys.map(k=>choice(segs.find(s=>s[0]===k))).join('')}</div></div>`).join('')}</div>
      <div class="apCompare"><span>${esc(I18N.t('Vergleichen mit'))}</span> ${[['book',I18N.t('Buch: {}',st.book)],['tanakh',I18N.t('Gesamter Tanach')]].map(([key,label])=>`<button type="button" data-compare="${key}" aria-pressed="${apComparison===key}" class="${apComparison===key?'on':''}">${esc(label)}</button>`).join(' ')}</div>
      ${segs.map(([k], i) => `<div class="apPane" data-seg="${k}"${i ? ' hidden' : ''}>${panes[k]}</div>`).join('')}
      <p class="muted apNote">${esc(I18N.t('OSHB: Gesamtwortzahl einschließlich Funktionswörtern; Wortlisten ohne Präpositionen, Partikeln und Pronomen. Vergleich nach Textlänge normalisiert.'))}</p>`;
  }
  function apSet(b, n, html) { // ein Fach füllen (oder ausblenden) und seinen Zähler in der Leiste setzen
    const box = $(`#apBody .apBox[data-b="${b}"]`), chip = $(`#apNav button[data-b="${b}"]`);
    if (chip) { chip.classList.toggle('off', !n); chip.disabled = !n; chip.classList.remove('wait'); chip.querySelector('small').textContent = n ? n.toLocaleString(I18N.loc) : '–'; }
    if (!box) return;
    box.hidden = !n; box.classList.remove('wait');
    box.querySelector('.apN').textContent = n ? n.toLocaleString(I18N.loc) : '';
    box.querySelector('.apC').innerHTML = html || '';
    const any = $$('#apBody .apBox').some(x => !x.hidden); $('#apNone').hidden = any;
  }
  const apList = (items, cap = AP_CAP) => { // die ersten Einträge, der Rest klappt auf
    if (items.length <= cap) return items.join('');
    const rest = items.slice(cap, 200);
    return items.slice(0, cap).join('') + `<div class="apMore" hidden>${rest.join('')}${items.length > 200 ? `<div class="muted ent">… ${esc(I18N.t('{} weitere (alle anzeigen)', (items.length - 200).toLocaleString(I18N.loc)))}</div>` : ''}</div><button type="button" class="apMoreB" data-n="${items.length - cap}">${esc(I18N.t('+ {} weitere', (items.length - cap).toLocaleString(I18N.loc)))}</button>`;
  };
  // Fach mit Werkgruppen: je Gruppe eine Überschrift mit Zähler, die ersten zwei Einträge sichtbar, der Rest klappt mit „weitere“ auf
  const apGrouped = items => window.Passage.RGROUPS.map(g => { const xs = items.filter((_, i) => items.grp[i] === g); return xs.length ? `<h5 class="apGrp">${esc(I18N.t(g))} <small>${xs.length.toLocaleString(I18N.loc)}</small></h5>${apList(xs, 2)}` : ''; }).join('');
  function apRender() {
    if (!AP.open) return;
    apRemember();
    const P = window.Passage, token = ++AP.token, body = $('#apBody'), nav = $('#apNav');
    const blank = msg => { $('#apTitle').textContent = I18N.t('Alles zu dieser Stelle'); nav.innerHTML = ''; body.innerHTML = `<p class="muted">${esc(I18N.t(msg))}</p>`; AP.key = ''; };
    if (!view || !view.group || view.sres || !view.sections) return blank('Öffne ein Buch und klicke links auf eine Versnummer.');
    const s = view.sections[view.idx];
    if (AP.whole && !apChap(s)) AP.whole = false; // Abschnitt ohne Kapitel-/Blattzählung: weiter Vers für Vers
    const whole = AP.whole, row = s && !whole && apPickRow();
    if (!s || (!whole && !row)) return blank('Öffne ein Buch und klicke links auf eine Versnummer.');
    const label = whole ? '' : row.dataset.l;
    if (!whole && label !== cmtRow) { setCmtRow(label); clearTimeout(AP.t); } // setzt die Markierung der Zeile (dieselbe wie beim Kommentar-Bereich)
    const g = view.group, title = g.title, chap = apChap(s), v = whole ? null : linksUI.verseOf(label), L = I18N.lang;
    const page = /[ab]$/i.test(chap || ''); // Talmud: Seite statt Kapitel
    const key = g.key + '|' + s.k + '|' + (whole ? '*' : label), keep = key === AP.key ? $('#allPanel').scrollTop : 0;
    AP.key = key;
    const bookName = I18N.lang === 'de' ? (deNames(title).split(' / ')[0] || title) : title, secName = String(s.label).replace(/^\D+/, '');
    $('#apTitle').textContent = whole ? `${bookName} ${secName} · ${I18N.t(page ? 'ganze Seite' : 'ganzes Kapitel')}` : `${bookName} ${secName}${I18N.lang === 'de' ? ',' : ':'}${label}`;
    $('#apTitle').title = I18N.t('Alles zu dieser Stelle');
    { const wb = $('#apWhole'); wb.hidden = whole || !chap; wb.textContent = I18N.t(page ? 'Ganze Seite' : 'Ganzes Kapitel'); wb.title = I18N.t('Wieder das ganze Kapitel bzw. die ganze Seite zeigen'); }
    // Verse des Abschnitts (für das ganze Kapitel: Mischna ↔ Talmud, Gliederung)
    const secVs = whole ? [...new Set($$('#rOut .row[data-l]').map(r => linksUI.verseOf(r.dataset.l)).filter(x => x != null))] : [];
    const vTag = x => (whole && x.v1 > 0 ? (x.v2 > x.v1 && x.v2 < 99999 ? `${x.v1}–${x.v2}` : String(x.v1)) : ''); // im ganzen Kapitel: von welchem Vers aus
    // ----- was schon da ist -----
    const cl = P.classify((v != null || whole) && chap ? linksUI.secLinks : [], v, whole);
    const byT = new Map(groups.map(x => [x.title, x])), tg = t => byT.get(t) || byT.get(String(t).split(', ')[0]) || null;
    const isLocal = bk => !!tg(bk);
    const sortL = a => a.slice().sort((x, y) => { const bx = linksUI.splitOther(x.other), by = linksUI.splitOther(y.other); return linksUI.libCmpGroups(tg(bx), tg(by)) || linksUI.titleCmp(bx, by); });
    const apPic = t => { const p = portraitOf(t); return p ? `<img class="vpic" src="portraits/${encodeURIComponent(p.img)}" alt="" data-title="${esc(p.name || '')}" loading="lazy">` : ''; }; // Porträt, wo es eins gibt (portraits/index.js)
    const ent = (x, text, tag, pic = true) => { const loc = isLocal(linksUI.splitOther(x.other)); return `<div class="ent${loc ? '' : ' off'}">${pic ? apPic(linksUI.splitOther(x.other)) : ''}<a data-ref="${esc(x.other)}"${loc ? '' : ` title="${esc(I18N.t('nicht in deiner Bibliothek'))}"`}>${text || esc(apRefLabel(x.other))}</a>${loc ? ` <button type="button" data-pv="${esc(x.other)}" title="Vorschau">▸</button>` : ''}${tag ? ` <small class="muted">${esc(tag)}</small>` : ''}</div>`; };
    const boxes = {};
    { // Kommentare: je Kommentator eine Zeile (vorhandene zuerst, dann die bekanntesten)
      const cs = P.commentators(cl.commentary).sort((a, b) => { const ia = CMT_PRIO.indexOf(a.name), ib = CMT_PRIO.indexOf(b.name); return (isLocal(b.book) - isLocal(a.book)) || ((ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)) || linksUI.titleCmp(a.book, b.book); });
      boxes.commentary = cs.map(c => ent({ other: c.refs[0] }, esc(dispName(c.name)), c.refs.length > 1 ? '×' + c.refs.length : '', false).replace('<div class="ent">', '<div class="ent">' + apPic(c.book)).replace('<div class="ent off">', '<div class="ent off">' + apPic(c.book)));
    }
    { const TAG = x => { const q = P.sourceOf(x); return q.k === 'etcbc' ? 'ETCBC ' + q.sim : q.k === 'josephus' ? 'Josephus' : q.k === 'second' ? I18N.t('2. Tempel') : q.k === 'targum' ? 'Targum' : ''; };
      boxes.parallels = sortL(cl.parallels).map(x => ent(x, '', [vTag(x), TAG(x)].filter(Boolean).join(' · '))); }
    { // Legenden: Band, Kapitelüberschrift und Absatz wie im Verknüpfungs-Fenster
      if (cl.legends.length && linksUI.legOl === undefined) { linksUI.legOl = null; outlineUI.olOwn(linksUI.LEG).then(o => { linksUI.legOl = o || null; linksUI.legIdx = null; if (o) apSoon(); }).catch(() => {}); }
      boxes.legends = cl.legends.map(x => ({ x, e: linksUI.legLabel(x.other) })).sort((a, b) => a.e.vol - b.e.vol || a.e.chap - b.e.chap || a.e.par - b.e.par)
        .map(({ x, e }) => ent(x, esc([I18N.t('Band {}', e.vol), e.chapTitle, e.sub, I18N.t('Abs. {}', e.parText)].filter(Boolean).join(' · ')), e.short));
    }
    { // Krauss, Talmudische Archäologie: Paragraph (aus der Gliederung) und Absatz
      if (cl.krauss.length && krOl === undefined) { krOl = null; outlineUI.olOwn(P.KRAUSS).then(o => { krOl = o || null; krIdx = null; if (o) apSoon(); }).catch(() => {}); }
      const pos = r => { const m = String(r).slice(P.KRAUSS.length + 1).match(/^(\d+):?(\d+)?/); return m ? [+m[1], +(m[2] || 1)] : [0, 0]; };
      boxes.krauss = cl.krauss.slice().sort((a, b) => { const p = pos(a.other), q = pos(b.other); return p[0] - q[0] || p[1] - q[1]; })
        .map(x => { const k = krLabel(x.other); return ent(x, k ? esc(k.t) + ' · ' + esc(I18N.t('Abs. {}', k.par)) : '', [vTag(x), k && k.head].filter(Boolean).join(' · '), false); }); // das Porträt steht im Kopf des Fachs
    }
    { const rs = sortL(cl.rabbinic); boxes.rabbinic = rs.map(x => ent(x, '', vTag(x))); boxes.rabbinic.grp = rs.map(x => P.rabbinicGroup(x)); } // mit Werkgruppe je Eintrag (Überschriften)
    boxes.halakhah = sortL(cl.halakhah).map(x => ent(x, '', vTag(x)));
    linksUI.lkDictsLoad();
    boxes.other = sortL(cl.other).map(x => { // Sefarias Wörterbuch-Verknüpfungen: ins eingebundene Wörterbuch, sonst nach sefaria.org
      const d = linksUI.dictRefOf(x);
      if (d) { const loc = linksUI.localDictFor(d.src); return loc ? `<div class="ent">${apPic(loc.name)}<a class="lkDict" data-did="${esc(loc.id)}" data-dn="${esc(loc.name)}" data-q="${esc(d.head)}" dir="auto">${esc(d.head)}</a> <small class="muted">${esc(loc.name)}</small></div>` : `<div class="ent"><a class="lkSef" data-url="${esc(sefariaUrl(String(x.other).replace(/-.*$/, '')))}" dir="auto">${esc(d.head)} ↗</a> <small class="muted">${esc(d.src)} · ${esc(I18N.t('nur auf sefaria.org'))}</small></div>`; }
      return ent(x, '', [vTag(x), x.cat && x.cat !== 'Andere' ? x.cat : ''].filter(Boolean).join(' · '));
    });
    { // Mischna ↔ Talmud: mitgelieferte Zuordnung und Sefarias „mishnah in talmud“
      const isM = /^Mishnah /.test(title), refs = [];
      const add = r => { if (r && !refs.some(q => q.replace(/-.*$/, '') === r.replace(/-.*$/, ''))) refs.push(r); };
      if (linksUI.MT && linksUI.MT.has(title) && chap) for (const vv of whole ? secVs : v != null ? [v] : []) { try { (isM ? (/^\d+$/.test(chap) ? linksUI.MT.toTalmud(title, chap, vv) : []) : linksUI.MT.toMishnah(title, chap, vv)).forEach(add); } catch { /* ohne Tabelle */ } }
      cl.mishtal.filter(x => (isM ? !/^Mishnah /.test(x.other) : /^Mishnah /.test(x.other))).forEach(x => add(x.other));
      boxes.mishtal = refs.map(r => ent({ other: r }, '', I18N.t(isM ? 'im Talmud' : 'in der Mischna')));
    }
    { let ids = []; try { ids = mapUI.BM && !mapUI.MP.over ? (whole ? (mapUI.MP.cur || []).map(c => c.i) : v != null ? P.placesAt(mapUI.MP.cur, v) : []) : []; } catch { ids = []; }
      boxes.places = ids.map(i => `<button type="button" class="apChip" data-place="${i}">${mapUI.mapName(i)}</button>`); }
    { const ts = chap && (v != null || whole) && outlineUI.tpSecKey === title + ' ' + chap ? (whole ? outlineUI.tpSec : P.topicsAt(outlineUI.tpSec, v)) : [];
      boxes.topics = ts.map(r => `<button type="button" class="apChip" data-slug="${esc(r.slug)}">${esc(outlineUI.tpName(r))}${r.he && L !== 'he' ? ` <span class="he muted" lang="he" dir="rtl">${esc(r.he)}</span>` : ''}</button>`); }
    { const ns = whole ? (notesUI.notesAll || []).filter(n => n.key === g.key && n.sk === s.k) : P.notesAt(notesUI.notesAll, g.key, s.k, label, v);
      boxes.notes = ns.map(n => `<div class="apNote" data-id="${esc(n.id)}" title="${esc(I18N.t('Klicken: Notiz bearbeiten'))}"><span class="st">★</span> ${n.note ? esc(n.note) : `<span class="muted">${esc(I18N.t(notesUI.kindOf(n) === 'block' ? 'Favorit (Versauswahl)' : 'Lesezeichen'))}</span>`}${notesUI.noteTags(n).length ? ` <small class="muted">${notesUI.noteTags(n).map(t => '#' + esc(t)).join(' ')}</small>` : ''}</div>`); }
    // ----- Gerüst: alle Fächer in fester Reihenfolge; Wörter und Gliederung kommen nach -----
    const wait = { stats: linksUI.TANAKH_BOOKS.has(title) && /^\d+$/.test(chap || '') && (v != null || whole), dicts: (v != null || whole) && !!chap, outline: v != null || /:/.test(label) || (whole && secVs.length > 0) };
    nav.hidden = true; nav.replaceChildren();
    const overviewSections = P.BOXES.filter(b => b !== 'words' && b !== 'dicts');
    overviewSections.splice(overviewSections.indexOf('krauss') + 1, 0, 'dicts');
    body.innerHTML = overviewSections.map(b => {
      const items = boxes[b], n = items ? items.length : 0, w = !items && wait[b];
      return `<section class="apBox${w ? ' wait' : ''}" data-b="${b}"${n || w ? '' : ' hidden'}><h4>${b === 'krauss' && apPic('Krauss') ? apPic('Krauss') : `<span class="ic">${AP_META[b][0]}</span>`}<span class="nm">${esc(apName(b))}</span> <small class="apN">${n ? n.toLocaleString(I18N.loc) : ''}</small>${AP_ALL[b] ? `<button type="button" class="apAll" data-b="${b}" title="${esc(I18N.t(b === 'commentary' ? 'Kommentar-Bereich zu diesem Vers öffnen' : b === 'places' ? 'Orte dieses Verses auf der Karte zeigen' : b === 'topics' ? 'Themen-Fenster öffnen' : b === 'outline' ? 'Gliederung des Buches öffnen' : b === 'notes' ? 'Reiter „Notizen“ öffnen' : 'Im Verknüpfungs-Fenster zeigen'))}">${esc(I18N.t('alle anzeigen'))}</button>` : ''}</h4><div class="apC">${items ? (items.grp ? apGrouped(items) : apList(items)) : w ? `<p class="muted">${esc(I18N.t('Lädt …'))}</p>` : ''}</div></section>`;
    }).join('') + (whole ? `<p class="muted apMode">${esc(I18N.t(page ? 'Ganze Seite – ein Klick auf eine Segmentnummer zeigt nur dieses Segment.' : 'Ganzes Kapitel – ein Klick auf eine Versnummer zeigt nur diesen Vers.'))}</p>` : '') + `<p id="apNone" class="muted" hidden>${esc(I18N.t('Zu dieser Stelle ist nichts verzeichnet.'))}</p>`
      + (linksUI.linksReady ? '' : `<p class="muted apHint">${esc(I18N.t('Sefarias Verknüpfungen sind noch nicht heruntergeladen (Reiter „Herunterladen“ → Karte „4 · Verknüpfungen“); gezeigt wird, was Safran mitliefert.'))}</p>`);
    $('#apNone').hidden = $$('#apBody .apBox').some(x => !x.hidden);
    $('#allPanel').scrollTop = keep;
    // ----- Statistik des Kapitels (und, bei angeklicktem Vers, des Verses): Leitwörter, Vokabeln, Verben, Namen -----
    if (wait.stats) {
      const d = view.loaded.find(x => x.entry.kind === 'he' && /westminster/i.test(x.versionTitle || ''));
      const ref = `${title} ${chap}`;
      const pc = d ? Promise.resolve(R.flattenNode(R.getByPath(d.text, s.path)).map(r => ({ label: r.label, html: r.html || '' })))
        : linksUI.LK.texts([ref], 'he', true).then(res => { const t = res && res[ref]; return t && t.items && /westminster/i.test(t.versionTitle || '') ? t.items.map((h, i) => ({ label: String(i + 1), html: h })) : []; });
      Promise.all([pc, loadPassageStats(),wordCardsUI.lazyScript('oshb-lemmas.js',()=>window.OSHB_LEMMAS)]).then(([rows, index]) => {
        if (token !== AP.token) return;
        const st = rows.length && index ? apStats(rows,index,title,chap) : null;
        let sv = null;
        if(st&&!whole&&v!=null){const vr=rows.find(r=>r.label===label)||rows[v-1];if(vr)sv=apStats([vr],index,title,chap);}
        apSet('stats', st ? st.words : 0, st ? apStatsHtml(st, sv, v) : '');apRestore();apMarkRefresh();
      }).catch(() => { if (token === AP.token) apSet('stats', 0, ''); });
    }
    // ----- In Wörterbüchern: Artikel, die diese Stelle zitieren (Rückwärtsindex der Wörterbuch-Zitate) -----
    if (wait.dicts) {
      O.dictCites(title, chap, whole ? 0 : v).then(res => {
        if (token !== AP.token) return;
        const list = (res && res.list) || [], by = new Map();
        for (const x of list) { if (!by.has(x.dictId)) by.set(x.dictId, { name: x.dict, xs: [] }); by.get(x.dictId).xs.push(x); }
        const CAP = 24;
        const html = [...by.values()].map(d => `<div class="apDic"><div class="apDicH">${apPic(d.name)}${esc(d.name)} <small>${d.xs.length.toLocaleString(I18N.loc)}</small></div><div class="apDicL" dir="auto">${d.xs.slice(0, CAP).map(x => `<button type="button" class="apChip apDE${x.exact ? '' : ' wide'}" data-q="${esc(x.head)}" title="${esc(I18N.t(x.exact ? 'zitiert genau diese Stelle' : 'zitiert das ganze Kapitel oder Blatt'))}">${esc(x.head)}</button>`).join(' ')}${d.xs.length > CAP ? ` <span class="muted">… ${esc(I18N.t('{} weitere', (d.xs.length - CAP).toLocaleString(I18N.loc)))}</span>` : ''}</div></div>`);
        apSet('dicts', list.length, html.join(''));
      }).catch(() => { if (token === AP.token) apSet('dicts', 0, ''); });
    }
    // ----- Gliederung / Mizwa -----
    if (wait.outline) {
      outlineUI.olOwnFor(g).then(ol => {
        if (token !== AP.token) return;
        const lv2 = !!(ol && ol.levels === 2);
        let list = [];
        if (ol && whole) { // ganzes Kapitel: alle Punkte, die einen seiner Verse berühren, ohne Doppelte
          const seen = new Set();
          for (const vv of secVs) for (const e of (lv2 ? [] : P.outlineAt(ol, chap, vv))) { const k = e.depth + '|' + e.mz + '|' + e.ref; if (!seen.has(k)) { seen.add(k); list.push(e); } }
        } else list = !ol ? [] : lv2 ? P.outlineAt(ol, outlineUI.olBookNo(s), +String(label).split(':')[0]) : (v != null && chap ? P.outlineAt(ol, chap, v) : []);
        const T = (o, k) => (L !== 'he' && (o[k + '_' + L] || o[k + '_en'])) || o[k] || '';
        const html = list.map(e => { const tx = T(e.it, 'text'), he = /[֐-׿]/.test(tx), hd = !e.depth && !e.mz ? T(e.sec, 'head') : '';
          return `<div class="apOl${e.depth ? ' sub' : ''}${e.mz ? ' mz' : ''}"><a data-ref="${esc(title + ' ' + String(e.ref).split(/[;,]/)[0].replace(/[-–].*$/, '').trim())}" data-r="${esc(e.ref)}">${e.mz ? `<span class="mzn" title="${esc(I18N.t('613 Mizwot'))}">${esc(e.mz)}</span>` : ''}<span class="r">${esc(String(e.ref).replace(/-/g, '–'))}</span> <span${he ? ' lang="he" dir="rtl" class="he"' : ''}>${esc(tx)}</span></a>${hd ? ` <small class="muted" dir="auto">${esc(hd)}</small>` : ''}</div>`; });
        apSet('outline', html.length, html.join(''));
      }).catch(() => { if (token === AP.token) apSet('outline', 0, ''); });
    }
  }
  function apShowAll(b) {
    const v = AP.whole ? null : linksUI.verseOf(cmtRow);
    if (b === 'commentary') { if (!cmtOpen) toggleCmt(true); else renderCmt(); return; }
    if (b === 'places') { if (v != null) mapUI.mapVerseShow(v); else if ($('#mapPanel').hidden) mapUI.mapOpen(); return; }
    if (b === 'topics') { $('#tpBtn').click(); return; }
    if (b === 'outline') { if ($('#outlinePanel').hidden) $('#olBtn').click(); return; }
    if (b === 'notes') { showTab('notes'); return; }
    if (b === 'krauss') { linksUI.lkVerse = v; $('#lkFilter').value = window.Passage.KRAUSS; linksUI.renderLinkPanel(); return; } // Krauss: Verknüpfungs-Fenster nach dem Titel gefiltert
    linksUI.lkVerse = v; $('#lkFilter').value = ''; linksUI.renderLinkPanel(); // Verknüpfungs-Fenster zum Vers, an der passenden Gruppe
    const want = AP_LKCATS[b];
    const d = b === 'legends' ? $('#lkBody > details.lkLeg') : want ? $$('#lkBody > details[data-c]').find(x => want.includes(x.dataset.c)) : $$('#lkBody > details[data-c]').find(x => ![].concat(...Object.values(AP_LKCATS), 'commentary').includes(x.dataset.c));
    if (d) { d.open = true; requestAnimationFrame(() => d.scrollIntoView({ block: 'start' })); }
  }
  function apPlace(i) { // Karte öffnen, die Orte des Verses hervorheben und den angeklickten wählen
    const v = AP.whole ? null : linksUI.verseOf(cmtRow); if (!mapUI.BM) return;
    if ($('#mapPanel').hidden) mapUI.mapOpen();
    requestAnimationFrame(() => requestAnimationFrame(() => { if (v != null) mapUI.mapVerseSet(v); mapUI.mapSelect(i, true); }));
  }
  $('#apBtn').onclick = () => apToggle();
  $('#apClose').onclick = () => apToggle(false);
  // Independent overview size, including Hebrew examples and nested controls.
  {
    let size=16;
    try { const saved=Number(localStorage.getItem('apFs')); if(saved>0&&Number.isFinite(saved))size=saved; } catch {}
    const apply=()=>{
      size=Math.max(12,Math.min(28,size));
      $('#allPanel').style.setProperty('--ap-scale',String(size/13));
      $('#apFsMinus').disabled=size<=12;$('#apFsPlus').disabled=size>=28;
    };
    const change=step=>{size+=step;apply();try{localStorage.setItem('apFs',String(size));}catch{}};
    $('#apFsMinus').onclick=()=>change(-1);$('#apFsPlus').onclick=()=>change(1);apply();
  }

  $('#apWhole').onclick = () => { AP.whole = true; apRender(); };
  $('#apNav').addEventListener('click', e => { const b = e.target.closest('button[data-b]'); const box = b && $(`#apBody .apBox[data-b="${b.dataset.b}"]`); if (box && !box.hidden) box.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  $('#apBody').addEventListener('click', async e => {
    const dl = e.target.closest('a.lkDict'); if (dl) { e.preventDefault(); linksUI.openDictIn(dl.dataset.q, { id: dl.dataset.did, name: dl.dataset.dn }); return; }
    const sf = e.target.closest('a.lkSef'); if (sf) { e.preventDefault(); window.api.openExternal(sf.dataset.url); return; }
    const all = e.target.closest('.apAll'); if (all) { linksUI.hovApi && linksUI.hovApi.hide(); apShowAll(all.dataset.b); return; }
    const mb = e.target.closest('.apMoreB'); if (mb) { const m = mb.previousElementSibling; m.hidden = !m.hidden; mb.textContent = m.hidden ? I18N.t('+ {} weitere', (+mb.dataset.n).toLocaleString(I18N.loc)) : I18N.t('weniger'); return; }
    const simMode=e.target.closest('[data-sim-mode]');if(simMode){apSim.mode=simMode.dataset.simMode;apSimilarMount(simMode.closest('.apScope'));return;}
    const simNear=e.target.closest('.apSimNear');if(simNear){apSim.hideNear=simNear.checked;apSimilarMount(simNear.closest('.apScope'));return;}
    const simOpen=e.target.closest('[data-sim-open]');if(simOpen){jumpTo(simOpen.dataset.simOpen.replace(/ (\d+)$/,' $1:1'));return;}
    const sim=e.target.closest('[data-sim]');if(sim){const pane=sim.closest('.apScope'),k=sim.dataset.sim;pane.querySelector('.apSeg button[data-seg="chaptercompare"]').click();const box=pane.querySelector('.apChapterCompare');setTimeout(()=>chapterCompare.compareWith(box,{book:k.replace(/ \d+$/,''),chapter:+k.split(' ').at(-1)}),0);return;}
    const cmp=e.target.closest('button[data-compare]');if(cmp&&apCur){
      const scope=cmp.closest('.apScope'),key=scope.dataset.scope,tab=scope.querySelector('.apSeg button.on')?.dataset.seg;
      apComparison=cmp.dataset.compare;try{localStorage.setItem('passageComparison',apComparison);}catch{}
      for(const pane of $$('#apBody .apScope')){const k=pane.dataset.scope,old=pane.querySelector('.apSeg button.on')?.dataset.seg||tab;pane.innerHTML=apStatsScope(apCur[k],k,linksUI.verseOf(cmtRow));pane.querySelector('.apSeg button[data-seg="'+old+'"]')?.click();}apMarkRefresh();return;
    }
    const selection=e.target.closest('[data-ap-select]');if(selection){apSelectEntry(selection);return;}
    const statVerse=e.target.closest('[data-stat-verse]');if(statVerse){const profile=statVerse.closest('.apProfile');if(profile)profile.querySelectorAll('[data-stat-verse]').forEach(b=>b.classList.toggle('selected',b.dataset.statVerse===statVerse.dataset.statVerse));const row=$$('#rOut .row[data-l]').find(r=>r.dataset.l===statVerse.dataset.statVerse);if(row){setCmtRow(row.dataset.l);row.scrollIntoView({block:'center',behavior:'smooth'});row.classList.add('flash');setTimeout(()=>row.classList.remove('flash'),1200);}return;}
    { const sc = e.target.closest('.apScopeSw button'); if (sc) { const box = sc.closest('.apBox'); box.querySelectorAll('.apScopeSw button').forEach(b => b.classList.toggle('on', b === sc)); box.querySelectorAll('.apScope').forEach(p => { p.hidden = p.dataset.scope !== sc.dataset.scope; }); apMarkRefresh(); return; }
      const sg = e.target.closest('.apScope .apSeg button'); if (sg) { const box = sg.closest('.apScope'); box.querySelectorAll('.apSeg button').forEach(b => { b.classList.toggle('on', b === sg); b.setAttribute('aria-pressed',String(b === sg)); }); box.querySelectorAll('.apPane').forEach(p => { p.hidden = p.dataset.seg !== sg.dataset.seg; }); box.querySelector('.apCompare').hidden=!['lead','rare','vocab','names','profile','similar'].includes(sg.dataset.seg);apMarkRefresh();if(sg.dataset.seg==='chaptercompare')apChapterCompareMount(box);if(sg.dataset.seg==='similar')apSimilarMount(box);return; }
      const cp = e.target.closest('.apCopy'); if (cp && apCur && apCur[cp.closest('.apScope').dataset.scope]) { const LEM = window.OSHB_LEMMAS || {}, L = I18N.lang; const txt = apCur[cp.closest('.apScope').dataset.scope].vocabularyByCorpus[apComparison].vocab.map(r => { const lem = LEM[r.w.lemma]; return [lem ? lem[0] : r.w.word, lem ? (L === 'de' && lem[2] ? lem[2] : lem[1]) : '', (apComparison==='book'?r.B:r.T) + '×'].join('\t'); }).join('\n'); try { navigator.clipboard.writeText(txt); cp.classList.add('ok'); setTimeout(() => cp.classList.remove('ok'), 1200); } catch { /* egal */ } return; } }
    const w = e.target.closest('.apW'); if (w) { apRemember();wordCardsUI.openForms(w.dataset.lemma, { lemma: w.dataset.lemma, word: w.dataset.word, m: w.dataset.m, l: w.dataset.l }, 'card'); return; }
    const de = e.target.closest('.apDE'); if (de) { openDict(de.dataset.q); return; }
    const pl = e.target.closest('[data-place]'); if (pl) { apPlace(+pl.dataset.place); return; }
    const tp = e.target.closest('[data-slug]'); if (tp) { outlineUI.openTopic(tp.dataset.slug, false); return; }
    const nt = e.target.closest('.apNote'); if (nt) { const n = notesUI.notesAll.find(x => x.id === nt.dataset.id); if (n) notesUI.openNoteDlg(n, { canDelete: true }); return; }
    const a = e.target.closest('a[data-ref]');
    if (a) { linksUI.hovApi && linksUI.hovApi.hide(); if (a.parentElement.classList.contains('off')) return; await jumpTo(a.dataset.ref.replace(/-.*$/, ''), BG(e)); return; }
    const b = e.target.closest('button[data-pv]');
    if (b) { // Vorschau unter dem Eintrag, wie im Verknüpfungs-Fenster
      const nxt = b.parentElement.nextElementSibling;
      if (nxt && nxt.classList.contains('pv')) { nxt.remove(); b.textContent = '▸'; return; }
      b.textContent = '▾';
      const r = await linksUI.LK.preview(b.dataset.pv);
      const html = r.items ? pvVer(r.versionTitle) + r.items.map(t => `<div dir="${r.he ? 'rtl' : 'ltr'}">${R.cleanHtml(R.splitFootnotes(r.he ? stripHe(t) : t).main.replace(/<sup[^>]*>.*?<\/sup>/g, ''))}</div>`).join('') : `<i>${esc(I18N.t('Keine Vorschau möglich.'))}</i>`;
      if (b.isConnected && b.textContent === '▾') b.parentElement.insertAdjacentHTML('afterend', `<div class="pv">${html}</div>`);
    }
  });
  $('#apBody').addEventListener('mouseover', e => { const a = e.target.closest('a[data-ref]'); if (!a || !linksUI.hovApi || a.parentElement.classList.contains('off') || a.dataset.ref === linksUI.hovApi.current()) return; linksUI.hovApi.start(a, a.dataset.ref.replace(/-.*$/, ''), true, false); });
  $('#apBody').addEventListener('mouseout', e => { const a = e.target.closest('a[data-ref]'); if (a && linksUI.hovApi && !a.contains(e.relatedTarget)) linksUI.hovApi.hide(); });
  $('#allPanel').addEventListener('scroll', () => linksUI.hovApi && linksUI.hovApi.hide(), { passive: true });
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'i') { e.preventDefault(); apToggle(); return; }
    if (e.key === 'Escape' && AP.open && $('#formsPanel').hidden && !document.querySelector('dialog[open]') && !$('#allPanel').classList.contains('docked')) apToggle(false);
  });
  window.__apState = () => ({ open: AP.open, key: AP.key }); // Prüfhilfe

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

  window.__reopenTab = () => {
    const p2 = $('#pane2');
    if (p2 && !p2.hidden && document.activeElement === p2) { p2.contentWindow.postMessage({ type: 'reopenTab' }, '*'); return; }
    reopenTab();
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
    const titles = new Map();
    const restore = () => { for(const [el,title] of titles)if(!el.hasAttribute('title'))el.setAttribute('title',title);titles.clear();cur=null;tip.hidden=true; };
    const targetTip = target => { for(let el=target;el instanceof Element;el=el.parentElement)if(el.matches('[title],[data-tip]')||titles.has(el))return el;return null; };
    document.addEventListener('mouseover', e => {
      const el = targetTip(e.target);
      if (el === cur) return;
      restore();
      if (!el) return;
      const text = el.getAttribute('title') || el.dataset.tip;
      if (!text) return;
      // Native tooltips inherit ancestor titles, so suppress the entire hovered chain.
      for(let node=el;node;node=node.parentElement)if(node.hasAttribute('title')){titles.set(node,node.getAttribute('title'));node.removeAttribute('title');}
      cur = el;
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
  { const panels = [['#dictPanel', () => toggleDict(false)], ['#cmtPanel', () => toggleCmt(false)], ['#linkPanel', () => { $('#linkPanel').hidden = true; }], ['#textcritPanel', () => textcritUI.close()]];
    const since = new Map();
    panels.forEach(([sel]) => { const el = $(sel); new MutationObserver(() => { if (!el.hidden) since.set(sel, Date.now()); }).observe(el, { attributes: true, attributeFilter: ['hidden'] }); });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
      if (document.querySelector('dialog[open]') || !$('#findBar').hidden || !$('#dispPanel').hidden || !$('#dictSug').hidden || document.querySelector('#wpop')) return;
      const open = panels.filter(([sel]) => !$(sel).hidden && !(sel === '#dictPanel' && document.documentElement.dataset.tab === 'dict'));
      if (!open.length) return;
      open.sort((a, b) => (b[0] === '#dictPanel') - (a[0] === '#dictPanel') || (since.get(b[0]) || 0) - (since.get(a[0]) || 0)); // das Wörterbuch zuerst (auch angepinnt), dann das zuletzt geöffnete
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
    // Startzeiten messen (Millisekunden seit Beginn des Seitenladens); landen in startup.log im Benutzerordner
    const tm = [['Skripte geladen', performance.now()]], mk = n => tm.push([n, performance.now()]);
    try {
      await refreshState(); mk('refreshState');
      await loadLibrary(); mk('loadLibrary');
      applyDisp(false);
      await notesUI.loadNotes(); mk('loadNotes');
      await navigationUI.restoreSession(); mk('restoreSession');
      if (!tabs.length) newTab(); // Safran startet nie leer – auch das zweite Fenster öffnet gleich in einem Tab
      await refreshCatalog(); mk('refreshCatalog');
      maybeWelcome();
      if (!IS_PANE2) try { O.startupLog && O.startupLog(tm.map(([n, t]) => [n, Math.round(t)])); } catch { /* nur Diagnose */ }
    } catch (err) {
      const o = $('#rOut'); // sichtbar statt leerer Oberfläche
      if (o) o.innerHTML = '<p class="muted">' + esc(I18N.t('Die Bibliothek konnte nicht geladen werden: {}', String(err && err.message || err))) + '</p>';
    } finally {
      // Große Nachschlagetabellen erst nach dem Start nachladen (nur bei Bedarf gebraucht: Targum-/Lemma-Hover, Parallelstellen, Höhen der Karte)
      for (const src of ['oshb-lemmas.js', 'oshb-lemma-pos.js', 'targum-lex.js', 'parallels.js', 'map/elev.js']) { const el = document.createElement('script'); el.src = src; el.async = false; document.body.appendChild(el); }
    }
  })();
})();

