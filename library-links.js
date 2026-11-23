// LibraryLinks: eigener Zustand und explizite Anbindung an den Leser.
window.LibraryLinks = (() => {
  'use strict';
  function create(host) {
  // ---------- Verknüpfungen ----------
  const LK = window.links;
  let linksReady = false;
  let secLinks = [];   // Verknüpfungen des angezeigten Abschnitts
  let lkVerse = null;  // null = ganzer Abschnitt
  async function refreshLinkStatus() {
    const st = await LK.status();
    linksReady = st.complete;
    host.$('#lkInfo').textContent = st.complete ? '✓ vollständig vorhanden' : st.done.length ? `${st.done.length} von ${st.total} Dateien verarbeitet` : 'noch nicht heruntergeladen';
    host.$('#lkGet').textContent = st.complete ? 'Erneut prüfen' : st.done.length ? 'Fortsetzen' : 'Verknüpfungen herunterladen';
    host.$('#lkGet').disabled = st.complete;
    return st;
  }
  host.$('#lkGet').onclick = async () => {
    host.$('#lkGet').disabled = true; host.$('#lkStop').disabled = false; host.$('#lkProg').hidden = false;
    const r = await LK.build();
    host.$('#lkStop').disabled = true; host.$('#lkProg').hidden = true;
    await refreshLinkStatus();
    if (r.error) host.$('#lkInfo').textContent = '⚠ ' + r.error;
    else if (r.failed && r.failed.length) host.$('#lkInfo').textContent += ` · ${r.failed.length} Fehler (erneut starten zum Fortsetzen)`;
    if (host.view) host.renderSection();
  };
  host.$('#lkStop').onclick = () => LK.cancel();
  LK.onProgress(p => { host.$('#lkProg').value = p.file - (/fertig/.test(p.phase) ? 0 : 1); host.$('#lkInfo').textContent = `${p.phase} (${p.file}/${p.total})`; });

  // Parallelstellen (ETCBC Parallels, ab 75 % Ähnlichkeit) als zusätzliche Verknüpfungen
  const parRows = (title, ch) => {
    const P = (window.PARALLELS || {})[title + ' ' + ch], rows = [];
    if (P) for (const v of Object.keys(P)) for (const s of P[v]) { const [ref, sim] = s.split('~'); rows.push({ v1: +v, v2: +v, other: ref, type: sim + ' %', cat: 'Parallelstellen' }); }
    return rows;
  };
  const verseOf = lab => (/^\d+$/.test(lab) ? +lab : null);
  // ---------- Mischna ↔ Talmud: kleiner Sprung „→ Talmud“ an jeder Mischna, „→ Mischna 1:1“ im Daf, wo eine Mischna beginnt ----------
  // Quelle: mitgelieferte Tabelle (bundled/mishnah_talmud.json) und, wenn heruntergeladen, Sefarias Verknüpfungen vom Typ „mishnah in talmud“.
  // Der Sprung geht über jumpTo – dort gilt die übliche Fassungswahl (deutsche Fassung, wenn vorhanden und eingestellt).
  let MT = null;
  const mtLoad = (async () => { let t = {}; try { if (LK.mishnahTalmud) t = await LK.mishnahTalmud(); } catch { /* ohne Tabelle */ } MT = window.MishTal ? window.MishTal.index(t || {}) : null; })();
  function markMishTal(chap, rows) {
    if (!host.view || !host.view.group || host.view.sres) return;
    const title = host.view.group.title, isM = /^Mishnah /.test(title);
    const per = new Map(); // Zeile -> Ziele (ohne Doppelte)
    const add = (v, ref) => { let a = per.get(v); if (!a) per.set(v, (a = [])); const k = ref.replace(/-.*$/, ''); if (!a.some(x => x.replace(/-.*$/, '') === k)) a.push(ref); };
    const labs = host.$$('#rOut .row[data-l]').map(r => verseOf(r.dataset.l)).filter(v => v != null);
    if (MT && MT.has(title)) {
      if (isM) { if (/^\d+$/.test(chap)) for (const v of labs) MT.toTalmud(title, chap, v).forEach(r => add(v, r)); }
      else for (const [seg, ref] of MT.startsOn(title, chap)) add(seg, ref);
    }
    for (const x of rows || []) {
      if (x.type !== 'mishnah in talmud' || !(x.v1 > 0)) continue;
      if (isM) { if (!/^Mishnah /.test(x.other)) for (const v of labs) if (v >= x.v1 && v <= x.v2) add(v, x.other); }
      else if (/^Mishnah /.test(x.other)) add(x.v1, x.other);
    }
    const have = localTitles();
    host.$$('#rOut .row[data-l]').forEach(r => {
      const lab = r.querySelector('.lab'); if (!lab) return;
      lab.querySelectorAll('.mtj').forEach(x => x.remove());
      const v = verseOf(r.dataset.l), refs = v == null ? null : per.get(v);
      if (!refs) return;
      const ok = refs.filter(ref => have.has(splitOther(ref)));
      if (!ok.length) return;
      const tail = ref => ref.slice(splitOther(ref).length).trim().replace(/-/g, '–');
      const text = isM ? I18N.t('→ Talmud') : I18N.t('→ Mischna {}', ok.map(tail).join(', '));
      const tip = (isM ? I18N.t('Diese Mischna im Talmud öffnen: {}', ok.join(' · ')) : I18N.t('Diese Mischna im Mischna-Traktat öffnen: {}', ok.join(' · ')));
      lab.insertAdjacentHTML('beforeend', `<span class="mtj" dir="auto" data-ref="${host.esc(ok[0])}" title="${host.esc(tip)}">${host.esc(text)}</span>`);
    });
  }
  async function loadLinks(s) {
    host.loadTopics(s).catch(() => {}); try { host.mapRefresh(); } catch { /* Karte noch nicht bereit */ }
    secLinks = [];
    host.$('#lkBtn').hidden = true;
    if (!host.view) return;
    const first = s.label.split(' › ')[0];
    let m = s.path.length === 1 && !s.label.includes('›') && first.match(/(\d+[ab]?)$/i);
    if (!m && s.path.length === 2 && s.path.every(x => typeof x === 'number')) m = [null, (s.path[0] + 1) + ':' + (s.path[1] + 1)]; // Band:Kapitel (z. B. Ginzbergs Legenden)
    if (!m && secNode(s)) m = [null, String(s.path[1] + 1)]; // Knoten:Kapitel (z. B. Mechiltha)
    if (!m) return;
    const token = host.view.idx + ':' + host.view.group.key;
    let rows;
    if (!MT) { try { await mtLoad; } catch { /* ohne Tabelle */ } if (!host.view || token !== host.view.idx + ':' + host.view.group.key) return; }
    markMishTal(m[1], []); // sofort aus der mitgelieferten Tabelle; Sefarias Verknüpfungen kommen unten dazu
    try { rows = await LK.section(secBook(host.view.group, s), m[1]); } catch { rows = []; } // auch ohne heruntergeladene Sefaria-Links: mitgelieferte Verknüpfungen
    rows = (Array.isArray(rows) ? rows : []).concat(parRows(secBook(host.view.group, s), m[1]));
    if (!host.view || token !== host.view.idx + ':' + host.view.group.key) return; // inzwischen woanders
    secLinks = rows;
    if (!rows.length) return;
    host.$('#lkBtn').hidden = false;
    host.btnLbl('#lkBtn', '🔗', 'Verknüpfungen', rows.length);
    host.$$('#rOut .row[data-l]').forEach(r => {
      const v = verseOf(r.dataset.l);
      if (v == null) return;
      const n = rows.filter(x => v >= x.v1 && v <= x.v2 && x.v1 > 0).length;
      const lab = r.querySelector('.lab');
      lab.querySelectorAll('.lk').forEach(x => { if (x.previousSibling && x.previousSibling.tagName === 'BR') x.previousSibling.remove(); x.remove(); }); // wurde der Abschnitt zweimal geladen, nicht doppelt anzeigen
      if (n) lab.insertAdjacentHTML('beforeend', `<br><span class="lk" data-v="${v}" title="${n} Verknüpfungen">🔗</span>`);
    });
    markMishTal(m[1], rows); // mit Sefarias Verknüpfungen „mishnah in talmud“ ergänzt; steht unter dem 🔗
    if (!host.$('#linkPanel').hidden) renderLinkPanel();
    if (host.cmtOpen) host.renderCmt();
  }
  host.$('#rOut').addEventListener('click', e => {
    const b = e.target.closest('.lk');
    if (b) { lkVerse = +b.dataset.v; renderLinkPanel(); }
    const j = e.target.closest('.mtj');
    if (j) host.jumpTo(j.dataset.ref.replace(/-.*$/, ''), host.BG(e));
  });
  host.$('#lkBtn').onclick = () => { lkVerse = null; renderLinkPanel(); };
  host.$('#lkWhole').onclick = () => { lkVerse = null; renderLinkPanel(); };
  host.$('#lkClose').onclick = () => { host.$('#linkPanel').hidden = true; };
  // Klick außerhalb des Verknüpfungen-Fensters schließt es (Klick auf die Verknüpfungs-Knöpfe, Menüs und Vorschau zählt nicht)
  document.addEventListener('mousedown', e => {
    if (host.$('#linkPanel').hidden || host.$('#linkPanel').classList.contains('docked') || !e.target.closest) return;
    if (e.target.closest('#dockTabs, #studyBtn, #linkPanel, #lkBtn, .lk, .slk, #ctxMenu, #lkHover, #suggest, #tip, #undoBar, dialog')) return;
    host.$('#linkPanel').hidden = true;
  }, true);
  host.$('#lkFilter').addEventListener('input', () => renderLinkPanel());
  const localTitles = () => new Set(host.groups.map(g => g.title));
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
  // Ginzbergs Legenden im Verknüpfungen-Fenster: „Legends of the Jews 1:2:5“ = Band 1, Kapitel II (Adam), Abschnitt der Gliederung, Absatz 5
  const LEG = 'Legends of the Jews';
  let legOl, legIdx = null; // Gliederung (outlines/Legends of the Jews.json), beim ersten Bedarf geladen
  function legLabel(ref) {
    const m = String(ref).slice(LEG.length + 1).match(/^(\d+):(\d+):(\d+)(?:-(?:\d+:\d+:)?(\d+))?/) || [0, 0, 0, 0];
    const vol = +m[1], chap = +m[2], par = +m[3];
    if (!legIdx && legOl) { // „Band:Kapitel“ -> { Titel, Abschnitte [[Absatz, Titel]] }
      legIdx = new Map();
      const T = (o, k) => (I18N.lang === 'en' && o[k + '_en']) || o[k + '_de'] || o[k] || '';
      for (const s of legOl.sections || []) for (const it of s.items || []) {
        const r = String(it.ref).match(/^(\d+):(\d+)/); if (!r) continue;
        legIdx.set(r[1] + ':' + r[2], { t: T(it, 'text'), subs: (it.sub || []).map(x => [+(String(x.ref).split(':')[2] || 1), T(x, 'text')]).sort((a, b) => a[0] - b[0]) });
      }
    }
    const c = legIdx && legIdx.get(vol + ':' + chap);
    let sub = ''; if (c) for (const [p, t] of c.subs) { if (p <= par) sub = t; else break; }
    const parText = m[4] && +m[4] !== par ? par + '–' + m[4] : String(par);
    const chapTitle = c ? c.t : '';
    return { vol, chap, par, parText, chapTitle, sub, short: `${vol}:${chap}:${par}`, full: `Band ${vol} Volume ${vol} ${chapTitle} ${sub}` };
  }
  // ----- Wörterbücher im Verknüpfungs-Fenster (Gruppe „Reference“) -----
  // Sefarias Wörterbuch-Verknüpfungen („Jastrow, אָב I 1“, „BDB Dictionary, …“, „Klein Dictionary, …“) gehen ins eingebundene Wörterbuch,
  // wenn es dasselbe gibt, sonst nach sefaria.org; dazu kommen die Zitate aus Safrans eigenen Wörterbüchern (Hamburger, Krauss, BDB, Gesenius, Jastrow …).
  const DICT_REF = /^([^,]+),\s*(.*[֐-׿].*?)(?:\s+\d+)?$/;
  function dictRefOf(x) {
    if (String(x.cat || '').toLowerCase() !== 'reference') return null;
    const m = String(x.other).replace(/-.*$/, '').match(DICT_REF); if (!m) return null;
    const head = m[2].replace(/\s+[IVX]+$/, '').replace(/\s+\d+$/, '').trim();
    return head ? { src: m[1].trim(), head } : null;
  }
  let lkDicts = null; // eingebundene Wörterbücher [{ id, name }]
  const lkDictsLoad = () => { if (lkDicts === null) { lkDicts = []; host.O.dictList().then(r => { lkDicts = (r && r.list) || []; if (!host.$('#linkPanel').hidden) renderLinkPanel(); host.apSoon(); }).catch(() => {}); } return lkDicts; };
  const localDictFor = src => { const k = String(src).toLowerCase().split(/[\s,–-]+/)[0]; return k ? (lkDicts || []).find(d => String(d.name).toLowerCase().split(/[\s,–-]+/)[0] === k) || null : null; };
  const lkCites = new Map(); // „Buch|Kapitel|Vers“ -> Liste aus dictCites (null = wird geladen)
  const secNode = s => (s && s.path && s.path.length === 2 && typeof s.path[0] === 'string' && s.path[0] && typeof s.path[1] === 'number') ? s.path[0] : ''; // Knoten komplexer Texte (z. B. „Tractate Pischa“ der Mechiltha)
  const secBook = (g, s) => g.title + (secNode(s) ? ', ' + secNode(s) : '');
  const secChapOf = s => { // wie apChap: „3“, „2a“ oder „1:2“
    if (!s || !s.label || !s.path) return null; const first = s.label.split(' › ')[0];
    let m = s.path.length === 1 && !s.label.includes('›') && first.match(/(\d+[ab]?)$/i);
    if (!m && s.path.length === 2 && s.path.every(x => typeof x === 'number')) m = [null, (s.path[0] + 1) + ':' + (s.path[1] + 1)];
    if (!m && secNode(s)) m = [null, String(s.path[1] + 1)];
    return m ? m[1] : null;
  };
  async function openDictIn(q, only) { // Stichwort in einem bestimmten Wörterbuch öffnen
    if (q) host.setDictSrc(host.captureDictSrc(q));
    if (!host.dictOpen) host.toggleDict(true); else host.renderDictList();
    host.setStackActive('dict');
    if (q) host.dictLookup(q, only || null);
  }
  function lkDictBlock(dictRows, f, open) { // -> { html, n } für die Gruppe „Reference“
    lkDictsLoad();
    const by = new Map(); // Wörterbuch -> { name, id, local, items: Map(Stichwort -> { exact, sef, url }) }
    const put = (key, o, head, info) => { if (!by.has(key)) by.set(key, Object.assign({ items: new Map() }, o)); const it = by.get(key).items; const h = it.get(head); if (h) { h.exact = h.exact || info.exact; h.sef = h.sef || info.sef; } else it.set(head, info); };
    // eigene Wörterbücher
    const s = host.view && host.view.sections && host.view.sections[host.view.idx], chap = secChapOf(s), title = host.view && host.view.group && host.view.group.title;
    if (title && chap && !host.view.sres) {
      const key = title + '|' + chap + '|' + (lkVerse == null ? 0 : lkVerse);
      if (!lkCites.has(key)) {
        lkCites.set(key, null);
        host.O.dictCites(title, chap, lkVerse == null ? 0 : lkVerse).then(r => { lkCites.set(key, (r && r.list) || []); if (lkCites.size > 60) lkCites.delete(lkCites.keys().next().value); if (!host.$('#linkPanel').hidden) renderLinkPanel(); }).catch(() => lkCites.set(key, []));
      }
      for (const x of lkCites.get(key) || []) put('d:' + x.dictId, { name: x.dict, id: x.dictId, local: true }, x.head, { exact: x.exact, sef: false });
    }
    // Sefarias Wörterbuch-Verknüpfungen
    for (const { x, d } of dictRows) {
      const loc = localDictFor(d.src);
      if (loc) put('d:' + loc.id, { name: loc.name, id: loc.id, local: true }, d.head, { exact: x.v1 > 0, sef: true });
      else put('s:' + d.src, { name: d.src, local: false }, d.head, { exact: x.v1 > 0, sef: true, url: host.sefariaUrl(String(x.other).replace(/-.*$/, '')) });
    }
    let n = 0;
    const html = [...by.values()].sort((a, b) => (b.local - a.local) || a.name.localeCompare(b.name)).map(d => {
      let items = [...d.items.entries()].sort((a, b) => (b[1].exact - a[1].exact));
      if (f) items = items.filter(([h]) => (d.name + ' ' + h + ' reference wörterbuch dictionary').toLowerCase().includes(f));
      if (!items.length) return '';
      n += items.length;
      const ents = items.slice(0, 300).map(([h, i]) => {
        const tag = [i.exact ? '' : I18N.t(/[ab]$/i.test(chap || '') ? 'ganze Seite' : 'ganzes Kapitel'), i.sef && d.local ? 'Sefaria' : ''].filter(Boolean).join(' · ');
        return d.local
          ? `<div class="ent"><a class="lkDict" data-did="${host.esc(d.id)}" data-dn="${host.esc(d.name)}" data-q="${host.esc(h)}" dir="auto" title="${host.esc(I18N.t('Im Wörterbuch öffnen'))}">${host.esc(h)}</a>${tag ? ` <small class="muted">${host.esc(tag)}</small>` : ''}</div>`
          : `<div class="ent"><a class="lkSef" data-url="${host.esc(i.url)}" dir="auto" title="${host.esc(I18N.t('Auf sefaria.org öffnen'))}">${host.esc(h)} ↗</a></div>`;
      }).join('');
      return `<details ${f ? 'open' : ''}><summary>📖 ${host.esc(d.name)} (${items.length})${d.local ? '' : ` <span class="muted">· ${host.esc(I18N.t('nur auf sefaria.org'))}</span>`}</summary>${ents}</details>`;
    }).join('');
    return { html, n };
  }
  function renderLinkPanel() {
    if (!host.view) return;
    const virt = host.view.sres ? host.cmtVirt : null;
    if (host.view.sres && !virt) return;
    const s = virt ? { label: virt.label } : host.view.sections[host.view.idx];
    const f = host.$('#lkFilter').value.trim().toLowerCase();
    let list = secLinks.filter(x => lkVerse == null ? true : (x.v1 === 0 || (lkVerse >= x.v1 && lkVerse <= x.v2)));
    if (f) list = list.filter(x => (x.other + ' ' + x.cat + ' ' + x.type + (x.other.startsWith(LEG + ' ') ? ' legenden ginzberg ' + legLabel(x.other).full : '')).toLowerCase().includes(f));
    host.$('#lkTitle').textContent = `${virt ? virt.title : host.view.group.title} · ${s ? s.label : ''}${lkVerse != null ? ':' + lkVerse : ''} – ${list.length} Verknüpfungen`;
    { const wb = host.$('#lkWhole'); wb.hidden = lkVerse == null; wb.textContent = I18N.t(/[ab]$/i.test(secChapOf(s) || '') ? 'Ganze Seite' : 'Ganzes Kapitel'); wb.title = I18N.t('Wieder das ganze Kapitel bzw. die ganze Seite zeigen'); }
    const byT = new Map(host.groups.map(g => [g.title, g]));
    const titleToGroup = t => byT.get(t) || byT.get(String(t).split(', ')[0]) || null;
    const localSet = localTitles();
    // Teile großer Werke ("Allegorical Interpretation of Genesis, Book III") gehören zum Buch vor dem Komma
    const local = { has: t => localSet.has(t) || !!titleToGroup(t) };
    const LK_FIRST = ['tanakh', 'mishnah', 'tosefta', 'talmud', 'responsa']; // feste Reihenfolge oben, danach der Rest nach Anzahl
    const lkRank = c => { const i = LK_FIRST.indexOf(String(c).toLowerCase()); return i < 0 ? 99 : i; };
    const cats = new Map();
    // Ginzbergs Legenden: eigene Gruppe ganz oben (nach dem Tanach kommt sie als Erstes), farbig abgesetzt, zugeklappt wie die übrigen Gruppen, nach Band und Kapitel, mit den Überschriften der Gliederung
    const legs = list.filter(x => x.other.startsWith(LEG + ' ') && /^\d+:\d+:\d+/.test(x.other.slice(LEG.length + 1)));
    let legHtml = '';
    if (legs.length) {
      if (legOl === undefined) { legOl = null; host.olOwn(LEG).then(o => { legOl = o || null; legIdx = null; if (o && !host.$('#linkPanel').hidden) renderLinkPanel(); }).catch(() => {}); }
      const isLocal = local.has(LEG), chaps = new Map(), seen = new Set();
      for (const x of legs) {
        const k0 = x.other.replace(/-.*$/, ''); if (seen.has(k0)) continue; seen.add(k0); // dieselbe Stelle (von mehreren Versen aus) nur einmal
        const L = legLabel(x.other), k = L.vol + ':' + L.chap;
        if (!chaps.has(k)) chaps.set(k, { L, xs: [] });
        chaps.get(k).xs.push({ x, L });
      }
      legHtml = `<details class="lkLeg"${f || lkVerse != null ? ' open' : ''}><summary>${host.esc(I18N.t('Legenden (Ginzberg)'))} (${seen.size})${isLocal ? '' : ' <span class="muted">· nicht lokal</span>'}</summary>${[...chaps.values()].sort((a, b) => a.L.vol - b.L.vol || a.L.chap - b.L.chap).map(({ L, xs }) =>
        `<details${f || chaps.size === 1 ? ' open' : ''}><summary>${host.esc(I18N.t('Band {}', L.vol))} · ${host.esc(L.chapTitle || I18N.t('Kapitel {}', L.chap))} (${xs.length})</summary>${xs.sort((a, b) => a.L.par - b.L.par).slice(0, 300).map(({ x, L: e }) =>
          `<div class="ent${isLocal ? '' : ' off'}"><a data-ref="${host.esc(x.other)}">${e.sub ? host.esc(e.sub) + ' · ' : ''}${host.esc(I18N.t('Abs. {}', e.parText))}</a>${isLocal ? ` <button data-pv="${host.esc(x.other)}" title="Vorschau">▸</button>` : ''} <small class="muted">${host.esc(e.short)}</small></div>`).join('')}</details>`).join('')}</details>`;
    }
    const dictRows = [];
    for (const x of list) {
      if (legs.length && x.other.startsWith(LEG + ' ') && legs.includes(x)) continue;
      { const d = dictRefOf(x); if (d) { dictRows.push({ x, d }); continue; } } // Wörterbücher: eigener Block in „Reference“
      const c = x.cat || 'Andere';
      if (!cats.has(c)) cats.set(c, new Map());
      const bk = splitOther(x.other);
      const m = cats.get(c);
      if (!m.has(bk)) m.set(bk, []);
      m.get(bk).push(x);
    }
    const open = f || lkVerse != null ? 'open' : '';
    const catHtml = (() => { const order = SefOrder.sortCats([...cats.keys()], ''); return [...cats.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])); })().map(([c, books]) => {
      const total = [...books.values()].reduce((a, v) => a + v.length, 0);
      return [c, `<details ${open} data-c="${host.esc(String(c).toLowerCase())}"><summary>${host.esc(c)} (${total})</summary>${[...books.entries()].sort((a, b) => { const ga = titleToGroup(a[0]), gb = titleToGroup(b[0]); return libCmpGroups(ga, gb) || titleCmp(a[0], b[0]); }).map(([bk, xs]) =>
        `<details ${f || (String(c).toLowerCase() === 'tanakh' && TANAKH_BOOKS.has(bk)) ? 'open' : ''}><summary>${host.esc(bk)} (${xs.length})${local.has(bk) ? '' : ' <span class="muted">· nicht lokal</span>'}</summary>${xs.slice(0, 300).map(x =>
          `<div class="ent${local.has(bk) ? '' : ' off'}"><a data-ref="${host.esc(x.other)}">${host.esc(x.other)}</a>${local.has(bk) ? ` <button data-pv="${host.esc(x.other)}" title="Vorschau">▸</button>` : ''}${x.type ? ` <small class="muted">${host.esc(x.type)}</small>` : ''}</div>`).join('')}${xs.length > 300 ? `<div class="muted ent">… ${xs.length - 300} weitere (Filter benutzen)</div>` : ''}</details>`).join('')}</details>`];
    });
    if (legHtml) { const ti = catHtml.findIndex(e => String(e[0]).toLowerCase() === 'tanakh'); catHtml.splice(ti + 1, 0, ['', legHtml]); } // direkt nach dem Tanach, sonst ganz oben
    { // Wörterbücher (eigene und Sefarias) oben in die Gruppe „Reference“, die es sonst neu gibt
      const db = lkDictBlock(dictRows, f, open);
      if (db.n) {
        const ri = catHtml.findIndex(e => String(e[0]).toLowerCase() === 'reference');
        if (ri >= 0) catHtml[ri][1] = catHtml[ri][1].replace(/^(<details [^>]*><summary>)Reference \((\d+)\)(<\/summary>)/, (m, a, k, b) => `${a}Reference (${+k + db.n})${b}${db.html}`);
        else {
          const item = ['Reference', `<details ${open} data-c="reference"><summary>Reference (${db.n})</summary>${db.html}</details>`];
          const order = SefOrder.sortCats(catHtml.map(e => e[0]).filter(Boolean).concat('Reference'), '');
          const at = catHtml.findIndex(e => e[0] && order.indexOf(e[0]) > order.indexOf('Reference'));
          if (at < 0) catHtml.push(item); else catHtml.splice(at, 0, item);
        }
      }
    }
    host.$('#lkBody').innerHTML = catHtml.map(e => e[1]).join('') || '<p class="muted">Keine Verknüpfungen.</p>';
    host.$('#linkPanel').hidden = false;
  }
  host.$('#lkBody').addEventListener('click', async e => {
    const dl = e.target.closest('a.lkDict'); if (dl) { e.preventDefault(); openDictIn(dl.dataset.q, { id: dl.dataset.did, name: dl.dataset.dn }); return; }
    const sf = e.target.closest('a.lkSef'); if (sf) { e.preventDefault(); window.api.openExternal(sf.dataset.url); return; }
    const a = e.target.closest('a[data-ref]');
    if (a) {
      if (a.parentElement.classList.contains('off')) return;
      await host.jumpTo(a.dataset.ref.replace(/-.*$/, ''), host.BG(e));
      return;
    }
    const b = e.target.closest('button[data-pv]');
    if (b) {
      const nxt = b.parentElement.nextElementSibling;
      if (nxt && nxt.classList.contains('pv')) { nxt.remove(); b.textContent = '▸'; return; }
      b.textContent = '▾';
      const r = await LK.preview(b.dataset.pv);
      const html = r.items ? host.pvVer(r.versionTitle) + r.items.map(t => `<div dir="${r.he ? 'rtl' : 'ltr'}">${host.R.cleanHtml(host.R.splitFootnotes(t).main.replace(/<sup[^>]*>.*?<\/sup>/g, ''))}</div>`).join('') : '<i>Keine Vorschau möglich.</i>';
      b.parentElement.insertAdjacentHTML('afterend', `<div class="pv">${html}</div>`);
    }
  });
  // Vorschau beim Überfahren eines Querverweises (nur bei lokal vorhandenen Büchern)
  let hovApi = null; // Vorschau-Blase auch für das Themenfenster
  // Hinweis zu einer umgerechneten Stellenangabe (data-oref = Angabe im Text, data-vt = ihre Zählung, data-sref = hebräische Zählung)
  const versNote = a => host.versNoteText(a.dataset.oref, a.dataset.sref, a.dataset.vt);
  { let hov = null, hovT = null, hovRef = null, hovAnchor = null, hovRequest = 0; const pvCache = new Map();
    const hideHov = () => { hovRequest++; clearTimeout(hovT); hovRef = null; hovAnchor = null; if (hov) hov.hidden = true; };
    // pick (Wortkarte): { vt, rtl } – die dort gewählte Fassung statt der üblichen zweiten Sprache (wcHovPick)
    // Wortkarte: in der Vorschau das Wort markieren – im Hebräischen (Westminster, über das Lemma) und, wo die Fassung wortgenau
    // zugeordnet ist (interlin.js), die zugehörigen deutschen Wörter
    const pvLemOk = (dl, lem) => String(dl || '').split('/').some(x => { x = x.trim(); return x === lem || (/^\d+$/.test(lem) && x.replace(/\D.*$/, '') === lem); });
    const pvMark = (box, ref, lem) => {
      const m = /^(.*) (\d+):(\d+)$/.exec(ref), parts = [...box.querySelectorAll('.pvp')];
      const he = parts.find(p => p.dataset.he && p.querySelector('.w')) || parts.find(p => p.dataset.he); if (!he) return;
      const ix = [], hc = new Set(); he.querySelectorAll('.w').forEach((w, i) => { if (pvLemOk(w.dataset.l, lem)) { w.classList.add('pvhl'); ix.push(i + 1); hc.add(host.consOf(w.textContent)); } });
      // Qumran-Rollen (und andere Fassungen mit Lemma je Wort): gleiches Lemma wie die Wortkarte
      const lc = host.consOf(((window.OSHB_LEMMAS || {})[String(lem).replace(/\D.*$/, '')] || [])[0] || '');
      if (lc) parts.forEach(p => { if (p !== he) p.querySelectorAll('.wq[data-l]').forEach(x => { if (host.consOf(x.dataset.l) === lc) x.classList.add('pvhl'); }); });
      if (!ix.length || !m) return;
      const set = new Set(ix);
      // Septuaginta (CATSS): griechische Wortgruppe, deren hebräisches Gegenstück (data-h) das markierte Wort ist
      parts.forEach(p => p.querySelectorAll('.wg[data-h]').forEach(g => { if (hc.has(host.consOf(g.dataset.h))) g.classList.add('pvhl'); }));
      // Targumim: aramäische Wörter mit maschineller Zuordnung (targum-il.js)
      const tgParts = parts.filter(p => Object.keys(host.IL_TG).some(n => String(p.dataset.vt || '').startsWith(host.IL_TG[n])));
      if (tgParts.length) host.loadTgIL().then(TG => {
        if (!TG || !box.isConnected || hovRef !== ref) return;
        tgParts.forEach(p => {
          const nm = Object.keys(host.IL_TG).find(n => String(p.dataset.vt || '').startsWith(host.IL_TG[n])), d = p.firstElementChild; if (!d || p.children.length !== 1) return;
          const segs = host.tgSegs(TG, nm, m[1], m[2], +m[3], d.textContent); if (!segs) return;
          d.textContent = ''; segs.forEach(([idx, w], k) => { if (k) d.append(' '); const sp = document.createElement('span'); sp.textContent = w; if (idx.some(i => set.has(i))) sp.className = 'pvhl'; d.append(sp); });
        });
      }, () => {});
      host.loadIL(host.ilBooksOf([ref])).then(IL => {
        if (!IL || !box.isConnected || hovRef !== ref) return;
        parts.filter(p => !p.dataset.he).forEach(p => {
          const nm = host.ilName(p.dataset.vt), segs = nm && IL[nm] && IL[nm][m[1]] && IL[nm][m[1]][m[2] + ':' + m[3]]; if (!segs) return;
          const d = p.firstElementChild; if (!d || p.children.length !== 1) return;
          d.classList.add('txt'); host.ilTagCell(p, segs);
          p.querySelectorAll('.ilx').forEach(x => { if (x.dataset.ix.split(',').some(i => set.has(+i))) x.classList.add('pvhl'); });
        });
      }, () => {});
    };
    const pvMarkGreek = async (box, ref, lemma) => {
      const m = /^(.*) (\d+):(\d+)$/.exec(ref); if (!m) return;
      let D; try { D = await host.loadGM(); } catch { return; }
      if (!D || !box.isConnected || hovRef !== ref) return;
      const GM = window.GMorph, targets = new Set();
      for (const p of box.querySelectorAll('.pvp[data-vt]')) {
        const bi = GM.bookIndex(D, m[1], p.dataset.vt); if (bi < 0) continue;
        const toks = GM.verse(D, bi, +m[2], +m[3]), at = host.greekWordAt(p, null, null, true);
        if (!toks || !at || toks.length !== at.words.length) continue;
        // Die konkrete Zielform prüfen: andere orthographische Abweichungen im Vers
        // dürfen sie nicht unterdrücken (Iota subscriptum/adscriptum ist gleichwertig).
        for (let i = toks.length - 1; i >= 0; i--) if (toks[i] && GM.info(D, toks[i].id).lemma === lemma && GM.sameForm(GM.info(D, toks[i].id).form, at.words[i].t)) {
          const rg = at.range(i), mark = document.createElement('span'); mark.className = 'pvhl';
          // Vor dem Einfügen die konkrete CATSS-Gruppe merken: gleiche Wörter können mehrfach vorkommen.
          const group = rg.startContainer && rg.startContainer.parentElement.closest('.wg[data-h]');
          if (group && p.contains(group)) targets.add(group);
          mark.append(rg.extractContents()); rg.insertNode(mark);
        }
      }
      if (!targets.size) return; // andere griechische Fassungen haben keine CATSS-Verknüpfung
      let IL;
      try { [IL] = await Promise.all([host.loadIL(host.ilBooksOf([ref])), host.wcTrCtxLoad([ref])]); } catch { return; }
      if (!IL || !box.isConnected || hovRef !== ref) return;
      const words = host.wcVerseWords.get(ref) || [], set = new Set();
      for (const p of box.querySelectorAll('.pvp[data-vt]')) {
        const groups = p.querySelectorAll('.wg[data-h]');
        for (const [g, idx] of host.ilLxxIndices(words.map(w => w.he), groups)) if (targets.has(g)) {
          // CATSS ordnet Wortgruppen zu; die ganze zugehörige deutsche Gruppe markieren.
          idx.forEach(i => set.add(i));
        }
      }
      if (!set.size) return;
      for (const p of box.querySelectorAll('.pvp[data-vt]')) {
        const nm = host.ilName(p.dataset.vt), segs = nm && IL[nm] && IL[nm][m[1]] && IL[nm][m[1]][m[2] + ':' + m[3]];
        if (!segs) continue;
        const d = p.firstElementChild; if (!d || p.children.length !== 1) continue;
        d.classList.add('txt'); host.ilTagCell(p, segs);
        p.querySelectorAll('.ilx').forEach(x => { if (x.dataset.ix.split(',').some(i => set.has(+i))) x.classList.add('pvhl'); });
      }
    };
    async function exactVerse(target) {
      const [chapter, verse] = target.ref.split(':').map(Number);
      const doc = target.document || await host.O.read(target.rel);
      const text = doc?.text?.[chapter - 1]?.[verse - 1];
      return typeof text === 'string' ? { parts: [{ items: [text], he: true, versionTitle: doc.versionTitle }] } : {};
    }
    function markExact(box, target) {
      const words = [...box.querySelectorAll('.pvp[data-he] .w[data-m]')];
      const signature = words.map(word => word.textContent.replace(/[^א-ת]/gu, '')).join(' ');
      if (target.signature !== signature || !target.indices.every(i => words[i])) return false;
      for (const i of target.indices) words[i].classList.add('pvhl');
      return true;
    }
    const startHov = (a, ref, quiet, below, pick) => {
      hideHov(); hovRef = ref; hovAnchor = a;
      const request = hovRequest;
      hovT = setTimeout(async () => {
        const pref = { he: host.disp.pvHe || '', de: host.disp.pvDe || '', x: host.disp.pvX || '' };
        const ck = (pick && pick.vt ? ref + '\u0001' + pick.vt : ref) + '\u0002' + JSON.stringify(pref) + (pick && (pick.greek || pick.targum) ? '\u0003original' : '');
        let r;
        if (pick?.exact) {
          try { r = await exactVerse(pick.exact); } catch { r = {}; }
        } else r = pvCache.get(ck);
        if (!r) { try { r = await LK.preview(ref, pick && (pick.greek || pick.targum) ? ['other'] : ['he', I18N.lang === 'de' ? 'de' : 'en'], pick && pick.vt ? { vt: pick.vt, rtl: pick.rtl } : undefined, pref); } catch { r = {}; } pvCache.set(ck, r); if (pvCache.size > 200) pvCache.delete(pvCache.keys().next().value); }
        if (request !== hovRequest || !a.isConnected) return; // Maus ist inzwischen woanders
        const none = !(r.parts && r.parts.length) && !(r.items && r.items.length);
        if (none && quiet) return; // Wörterbuch: ohne Text keine leere Blase
        if (!hov) { hov = document.createElement('div'); hov.id = 'lkHover'; document.body.appendChild(hov); }
        const partHtml = p => p.items.map(t => `<div dir="${p.he ? 'rtl' : 'ltr'}"${p.he ? ' lang="he" class="phe"' : ''}>${host.R.cleanHtml(host.R.splitFootnotes(p.he ? host.stripHe(t) : t).main.replace(/<sup[^>]*>.*?<\/sup>/g, ''))}</div>`).join('');
        const html = r.parts && r.parts.length ? r.parts.map((p, i) => (i ? '<hr>' : '') + host.pvVer(p.versionTitle) + `<div class="pvp" data-vt="${host.esc(p.versionTitle || '')}"${p.he ? ' data-he="1"' : ''}>${partHtml(p)}</div>`).join('') : r.items && r.items.length ? host.pvVer(r.versionTitle) + partHtml({ items: r.items, he: r.he }) : `<i>${host.esc(I18N.t('Keine Vorschau möglich.'))}</i>`;
        // andere Zählung im Text: Hinweis, welche Stelle gemeint ist („englische Zählung Joel 3:11 = hebr. 4:11“)
        const vn = (a && a.dataset && a.dataset.oref ? `<div class="vnote">${host.esc(versNote(a))}</div>` : '')
          // gewählte Fassung (Wortkarte) gibt es für dieses Buch nicht: sagen, statt stillschweigend eine andere zu zeigen
          + (pick && r.pickMiss ? `<div class="vnote">${host.esc(I18N.t('{} enthält dieses Buch nicht – stattdessen:', pick.label || ''))}</div>` : '');
        hov.innerHTML = `<b>${host.esc(ref)}</b>${vn}${html}`;
        if (pick?.exact && !markExact(hov, pick.exact)) return;
        hov.hidden = false;
        if (pick && pick.lem) pvMark(hov, ref, pick.lem);
        if (pick && pick.greek) pvMarkGreek(hov, ref, pick.greek);
        if (pick && pick.targum) hov.querySelectorAll('.wt[data-l]').forEach(w => { if (w.dataset.l === pick.targum) w.classList.add('pvhl'); });
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
    hovApi = { start: startHov, hide: hideHov, current: () => hovRef,
      hideWithin(node) { if (hovAnchor && node.contains(hovAnchor)) hideHov(); } };
    window.pvClear = () => pvCache.clear(); // nach Wechsel der bevorzugten Vorschau-Fassung
    host.$('#lkBody').addEventListener('mouseover', e => {
      const a = e.target.closest('a[data-ref]');
      if (!a || a.parentElement.classList.contains('off') || a.dataset.ref === hovRef) return;
      startHov(a, a.dataset.ref, false, false);
    });
    // Kommentar-Bereich: Vorschau beim Überfahren einer Stellenangabe im Kommentartext (nur wenn der Text lokal vorliegt)
    host.$('#cmtBody').addEventListener('mouseover', e => {
      const a = e.target.closest('a.aref[data-sref]');
      if (!a) return;
      const ref = a.dataset.sref.replace(/-.*$/, '');
      if (ref === hovRef) return;
      startHov(a, ref, true, false);
    });
    host.$('#cmtBody').addEventListener('mouseout', e => { const a = e.target.closest('a.aref[data-sref]'); if (a && !a.contains(e.relatedTarget)) hideHov(); });
    host.$('#cmtBody').addEventListener('click', hideHov);
    host.$('#cmtBody').addEventListener('scroll', hideHov, true); host.$('#cmtPanel').addEventListener('scroll', hideHov);
    // Lesetext: Vorschau beim Überfahren einer Stellenangabe (Klasse „aref“, z. B. in Krauss, Pinner, Ginzberg) – nur wenn der Text lokal vorliegt
    host.$('#rOut').addEventListener('mouseover', e => {
      const a = e.target.closest && e.target.closest('a.aref[data-sref]');
      if (!a) return;
      const ref = a.dataset.sref.replace(/-.*$/, '');
      if (ref === hovRef) return;
      startHov(a, ref, true, true);
    });
    host.$('#rOut').addEventListener('mouseout', e => { const a = e.target.closest && e.target.closest('a.aref[data-sref]'); if (a && !a.contains(e.relatedTarget)) hideHov(); });
    host.$('#rOut').addEventListener('click', hideHov);
    host.$('#rOut').addEventListener('scroll', hideHov, true);
    // Wörterbuch: Vorschau beim Überfahren einer Bibelstelle oder Quellenangabe (nur wenn der Text lokal vorliegt)
    host.$('#dictOut').addEventListener('mouseover', e => {
      const a = e.target.closest('.dsrc[data-sref]');
      if (!a) return;
      const ref = a.dataset.sref.replace(/-.*$/, '');
      if (ref === hovRef) return;
      startHov(a, ref, true, true);
    });
    { // Abkürzungen (Gesenius u. a.) und Kurzzitate (Krauss, Talmudische Archäologie): sofortige Erklärung beim Überfahren –
      // im Wörterbuch, in Wortkarten, im Lesetext, in geöffneten Fußnoten und im Kommentarbereich
      let tip = null;
      const hideTip = () => { if (tip) tip.hidden = true; };
      document.addEventListener('mouseover', e => {
        const a = e.target.closest && e.target.closest('.gab[data-t]'); if (!a || !a.closest('#dictOut, #wcBody, #rOut, #cmtBody, #lkHover')) return;
        if (!tip) { tip = document.createElement('div'); tip.id = 'gabTip'; tip.hidden = true; document.body.appendChild(tip); }
        tip.textContent = a.dataset.t; tip.hidden = false;
        const r = a.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
        tip.style.left = Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2)) + 'px';
        tip.style.top = (r.top - h - 6 < 4 ? r.bottom + 6 : r.top - h - 6) + 'px';
      });
      document.addEventListener('mouseout', e => { const a = e.target.closest && e.target.closest('.gab[data-t]'); if (a && !a.contains(e.relatedTarget)) hideTip(); });
      document.addEventListener('scroll', hideTip, true);
      document.addEventListener('click', hideTip, true);
    }
    host.$('#dictOut').addEventListener('mouseout', e => { const a = e.target.closest('.dsrc[data-sref]'); if (a && !a.contains(e.relatedTarget)) hideHov(); });
    host.$('#dictOut').addEventListener('click', hideHov);
    host.$('#dictPanel').addEventListener('scroll', hideHov, { passive: true }); host.$('#dictOut').addEventListener('scroll', hideHov, { passive: true });
    host.$('#lkBody').addEventListener('mouseout', e => { const a = e.target.closest('a[data-ref]'); if (a && !a.contains(e.relatedTarget)) hideHov(); });
    host.$('#linkPanel').addEventListener('scroll', hideHov, { passive: true });
    host.$('#lkBody').addEventListener('click', hideHov);
  }
  refreshLinkStatus().then(() => { if (host.view) host.renderSection(); });

  // ---------- Themen (Sefaria Topics) ----------

    return {
      get dictRefOf() { return dictRefOf; },
      get hovApi() { return hovApi; }, set hovApi(value) { hovApi = value; },
      get LEG() { return LEG; },
      get legIdx() { return legIdx; }, set legIdx(value) { legIdx = value; },
      get legLabel() { return legLabel; },
      get legOl() { return legOl; }, set legOl(value) { legOl = value; },
      get libCmpGroups() { return libCmpGroups; },
      get linksReady() { return linksReady; }, set linksReady(value) { linksReady = value; },
      get LK() { return LK; },
      get lkDictsLoad() { return lkDictsLoad; },
      get lkVerse() { return lkVerse; }, set lkVerse(value) { lkVerse = value; },
      get loadLinks() { return loadLinks; },
      get localDictFor() { return localDictFor; },
      get localTitles() { return localTitles; },
      get MT() { return MT; }, set MT(value) { MT = value; },
      get openDictIn() { return openDictIn; },
      get parRows() { return parRows; },
      get renderLinkPanel() { return renderLinkPanel; },
      get secBook() { return secBook; },
      get secChapOf() { return secChapOf; },
      get secLinks() { return secLinks; }, set secLinks(value) { secLinks = value; },
      get secNode() { return secNode; },
      get splitOther() { return splitOther; },
      get TANAKH_BOOKS() { return TANAKH_BOOKS; },
      get titleCmp() { return titleCmp; },
      get verseOf() { return verseOf; },
      get versNote() { return versNote; },
    };
  }
  return { create };
})();
