// Suchoberfläche: Maske, Kategorien, Aufträge, Ergebnisliste, Diagramm und Verlauf.
// Jede Leseansicht erzeugt eine eigene Instanz. Navigation und Textdarstellung
// bleiben beim Leser; aktuelle Buch-/Versionslisten werden über Getter bezogen.
window.LibrarySearch = (() => {
  'use strict';
  function create({ $, $$, esc, KIND_LABEL, shortVer, plainSnip, lsGet, lsSet, getGroups, getPreferredVersions, outlineSearch, concordanceCoverageHtml, loadRootFamilies }) {
    const O = window.offline;
    // ---------- Suche ----------
    let sResults = [];
    let fullCache = null; // Ergebnis der letzten Suche über alle Bücher
    let lastSearch = null; // Parameter der letzten Suche (für „Als Lesetext“ im eigenen Tab)
    // ----- Suchmaske: Sprache und Treffer-Art (zwei Auswahlfelder statt vieler Häkchen) -----
    let searchMode = 'text', searchId = 0, searchPending = false;
    const sBusy = () => searchPending;
    const sSetBusy = () => {
      const g = $('#sGo');
      g.textContent = I18N.t(sBusy() ? 'Abbrechen' : 'Suchen');
      g.classList.toggle('primary', !sBusy());
      $('#gGo').textContent = g.textContent;
      $('#sxGo').textContent = g.textContent;
      $('#sxGo').classList.toggle('primary', !sBusy());
      $('#sxAdvancedGo').textContent=g.textContent;
    };
    function setSearchMode(mode) {
      if (searchMode === mode) return;
      if (sBusy()) void O.cancelSearch();
      if (searchMode === 'outline') outlineSearch.cancel();
      searchId++;
      searchPending = false;
      searchMode = mode;
      $('#sCatPanel').hidden = mode !== 'text';
      for (const tab of $$('#sModes [role="tab"]')) {
        const active = tab.dataset.mode === mode;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;

      }
      $('#sText').hidden=mode!=='text';$('#sSyntax').hidden=!['syntax','clauses'].includes(mode);$('#sOutline').hidden=true;
      if(mode!=='text')$('#sSyntax').setAttribute('aria-labelledby',mode==='clauses'?'sClauseTab':'sSyntaxTab');
      sResults = [];
      fullCache = lastSearch = null;
      $('#sOut').replaceChildren();
      $('#sLemmaCoverage').replaceChildren();
      for (const id of ['sSumPanel', 'sChart', 'sGroupBtn', 'sReadBtn', 'sExport', 'sProgress']) $('#' + id).hidden = true;
      $('#sInfo').textContent = mode === 'text' ? I18N.t('Durchsucht alle heruntergeladenen Texte der gewählten Sprachen (auch Fußnoten).') : '';
      sSetBusy();
      if (['syntax','clauses'].includes(mode)){loadBhsaStatus();$('#sxKinds [data-syntax-kind="'+(mode==='clauses'?'clause':'word')+'"]').click();}
      updateExamples();
    }
    const modeTabs = [...$$('#sModes [role="tab"]')];
    for (const tab of modeTabs) tab.onclick = () => setSearchMode(tab.dataset.mode);
    $('#sModes').addEventListener('keydown', event => {
      const index = modeTabs.indexOf(event.target);
      const steps = { ArrowLeft: -1, ArrowRight: 1 };
      if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const direction = getComputedStyle($('#sModes')).direction === 'rtl' ? -1 : 1;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? modeTabs.length - 1
        : (index + steps[event.key] * direction + modeTabs.length) % modeTabs.length;
      modeTabs[next].click();
      modeTabs[next].focus();
    });
    const S_KINDS = ['he', 'en', 'de', 'other'], S_LANGS = ['auto', 'he', 'de', 'en', 'other', 'all'], S_MODES = ['exact', 'lemma', 'root'];
    // gewählte Sprache -> Textarten; „Automatisch“ richtet sich nach der Schrift der Eingabe
    function sKinds() {
      const l = $('#sLang').value, v = $('#sq').value;
      if (l === 'all') return S_KINDS.slice();
      if (l !== 'auto') return [l];
      if (/[\u0590-\u05FF]/.test(v)) return ['he'];
      if (S_GREEK.test(v) || /[\u0710-\u072f]/u.test(v)) return ['other']; // griechische Eingabe: Septuaginta und andere griechische Texte
      return /\p{L}/u.test(v) ? ['en', 'de'] : S_KINDS.slice();
    }
    let concordanceRoot = '', concordanceLemma = '';
    const isConcordance = () => ['lemma', 'root'].includes($('#sMode').value) || $('#sConcordanceCross').checked;
    const S_GREEK = /[\u0370-\u03FF\u1F00-\u1FFF]/;
    // Für welche Texte gilt die Treffer-Art? 'he' = hebräisch, 'gr' = griechische Eingabe in „Andere“/„Alle“ (Lemma-Suche in der Septuaginta), 'ot' = alles Übrige
    const sSlot = () => { const k = sKinds(); return k.includes('he') ? 'he' : k.includes('other') && S_GREEK.test($('#sq').value) ? 'gr' : 'ot'; };
    // Treffer-Art, getrennt gemerkt für hebräische, griechische und andere Suche („Alle Formen“ gibt es hebräisch und griechisch, „Wort mit Vorsilben“ nur hebräisch)
    const sModeSel = { he: 'lemma', gr: 'lemma', ot: 'exact' };
    const sModeOk = (m, slot) => S_MODES.includes(m) && (m !== 'root' || slot === 'he');
    const sMatchParams = () => {
      const m = $('#sWordMode').value;
      return { prefix: m === 'prefix', exact: m === 'exact', lemma: false, partial: m === 'part', parse: true };
    };
    function sRefresh() {
      const slot = sSlot();
      for (const o of $('#sMode').options) { const off = !sModeOk(o.value, slot); o.hidden = off; o.disabled = off; }
      if (!sModeOk(sModeSel[slot], slot)) sModeSel[slot] = slot === 'he' || slot === 'gr' ? 'lemma' : 'exact';
      $('#sMode').value = sModeSel[slot];
      const m = $('#sMode').value, cc = isConcordance();
      $('#sMode').disabled = false; $('#sMode').closest('label').hidden = false;
      $('#sAdv').hidden = cc;
      $('#sWordMode option[value="prefix"]').disabled = slot !== 'he';
      $('#sWordMode option[value="prefix"]').hidden = slot !== 'he';
      if (slot !== 'he' && $('#sWordMode').value === 'prefix') $('#sWordMode').value = 'exact';
      const exactLemma = m === 'lemma' && concordanceLemma;
      $('#sHint').textContent = m === 'root'
        ? I18N.t('Wortfamilie nach ausdrücklichen Wurzelverweisen im Open-Scriptures-Lexikon (Westminster).')
        : exactLemma ? I18N.t('Belege für das ausgewählte Lemma (Strong {}).', exactLemma)
        : m === 'lemma' ? I18N.t('Lemma-Suche: nur Fassungen mit nutzbaren Lemma-Zuordnungen und nur belegte Lemmata. Für andere Werke die Wortformsuche verwenden.')
        : I18N.t('Wortformsuche in den rechts ausgewählten Werken. Erweiterte Optionen erlauben Vorsilben, Wortteile und Wortfolgen.');
      const act = +$('#sOrd').checked + +$('#sFuzzy').checked + +!$('#sWlc').checked + +(+$('#sDist').value !== 10) + +($('#sWordMode').value !== 'exact');
      $('#sAdvN').textContent = act ? ' ' + I18N.t('({#} aktiv)', act) : '';
    }
    O.onSearchProgress(p => {
      if (!sBusy()) return;
      const total = Math.max(0, Number(p.total) || 0), scanned = Math.min(total, Math.max(0, Number(p.scanned) || 0));
      const bar = $('#sProgressBar');
      if (total) { bar.max = total; bar.value = scanned; }
      else bar.removeAttribute('value');
      $('#sProgressLabel').textContent = total ? `${Math.floor(scanned / total * 100)} % · ${scanned} / ${total} Dateien` : I18N.t('Suche läuft …');
      $('#sInfo').textContent = `Durchsuche … ${scanned} von ${total} Dateien · ${p.found} Treffer`;
    });

    // Kategorien und einzelne Bücher für die Suche: ohne Häkchen wird überall gesucht
    const sCats = new Set(), sTitles = new Set();
    function renderSCats() {
      renderSyntaxBooks();
      const f = $('#sCatFilter').value.trim().toLowerCase();
      const root = { name: '', path: '', children: new Map(), count: 0, titles: [] };
      for (const g of getGroups()) {
        let n = root, p = '';
        n.count++;
        for (const c of window.SearchCategories.path(g.cats).slice(0, 3)) {
          p = p ? p + '/' + c : c;
          if (!n.children.has(c)) n.children.set(c, { name: c, path: p, children: new Map(), count: 0, titles: [] });
          n = n.children.get(c); n.count++;
        }
        if (!n.titles.includes(g.title)) n.titles.push(g.title);
      }
      const covered = p => [...sCats].some(c => c !== p && (p === c || p.startsWith(c + '/')));
      const anySel = n => n.titles.some(t => sTitles.has(t)) || [...sCats].some(c => c.startsWith(n.path + '/')) || [...n.children.values()].some(anySel);
      const hit = (t) => (t+' '+I18N.t(t)).toLowerCase().includes(f);
      const show = (n, anc) => !f || anc || hit(n.name) || n.titles.some(hit) || [...n.children.values()].some(c => show(c, false));
      const node = (n, parentMatch) => {
        const m = !f || parentMatch || hit(n.name);
        if (!show(n, parentMatch)) return '';
        const kids = SefOrder.sortCats([...n.children.keys()], n.name).map(k => node(n.children.get(k), m && !!f)).join('');
        const cov = covered(n.path);
        const books = SefOrder.sortTitles(n.titles.filter(t => !f || m || hit(t)), t => t).map(t =>
          `<label class="t book"><input type="checkbox" data-st="${esc(t)}" ${cov || sCats.has(n.path) || sTitles.has(t) ? 'checked' : ''} > ${esc(t)}</label>`).join('');
        const part = !cov && !sCats.has(n.path) && anySel(n); // nur ein Teil darunter gewählt: Teilmarkierung (Strich) statt Häkchen, sonst würde alles darunter durchsucht
        const cb = `<input type="checkbox" data-sc="${esc(n.path)}" ${cov || sCats.has(n.path) ? 'checked' : ''} ${part ? 'data-part="1"' : ''}> `;
        return `<details data-p="${esc(n.path)}" ${f || sOpen.has(n.path) ? 'open' : ''}><summary>${cb}<span class="catname">${esc(I18N.t(n.name))}</span> <small>(${n.count})</small></summary>${kids}${books}</details>`;
      };
      $('#sCatTree').innerHTML = SefOrder.sortCats([...root.children.keys()], '').map(k => node(root.children.get(k), false)).join('') || '<p class="muted">Nichts gefunden.</p>';
      $$('#sCatTree input[data-part]').forEach(i => { i.indeterminate = true; });
      const parts = [sCats.size ? `${sCats.size} Kategorie${sCats.size === 1 ? '' : 'n'}` : '', sTitles.size ? (sTitles.size === 1 ? '1 Buch' : `${sTitles.size} Bücher`) : ''].filter(Boolean);
      $('#sCatBtn').textContent = parts.length ? `Auswahl: ${parts.join(', ')}` : 'Kategorien: alle';
    }
    const sOpen = new Set(); // vom Nutzer aufgeklappte Kategorien in der Suchliste
    $('#sCatTree').addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.p != null && !$('#sCatFilter').value.trim()) { if (d.open) sOpen.add(d.dataset.p); else sOpen.delete(d.dataset.p); } }, true);
    { let sct = null; $('#sCatFilter').addEventListener('input', () => { clearTimeout(sct); sct = setTimeout(renderSCats, 80); }); }
    $('#sCatAll').onclick = () => { sTitles.clear(); sCats.clear(); getGroups().forEach(g => { const cats=window.SearchCategories.path(g.cats);if(cats[0])sCats.add(cats[0]); }); renderSCats(); }; // alle Hauptkategorien anhaken; danach z. B. ein Buch anklicken = nur dieses
    $('#sCatTree').addEventListener('change', e => {
      const d = e.target.dataset || {};
      // Ist eine übergeordnete Kategorie gewählt und man klickt etwas darunter, gilt nur dieser Eintrag (statt „alles darunter minus eins“)
      const own = d.sc !== undefined ? d.sc : (e.target.closest('details') || {}).dataset && e.target.closest('details').dataset.p;
      if (own != null && (d.sc !== undefined || d.st !== undefined) && [...sCats].some(c => c !== (d.sc !== undefined ? own : null) && (own === c || own.startsWith(c + '/')) && (d.sc === undefined || own !== c))) {
        sCats.clear(); sTitles.clear(); if (d.sc !== undefined) sCats.add(d.sc); else sTitles.add(d.st); renderSCats(); return;
      }
      if (d.sc !== undefined) {
        const p = d.sc;
        if (e.target.checked) { sCats.add(p); for (const c of [...sCats]) if (c !== p && c.startsWith(p + '/')) sCats.delete(c); } else sCats.delete(p);
      } else if (d.st !== undefined) {
        if (e.target.checked) sTitles.add(d.st); else sTitles.delete(d.st);
      } else return;
      renderSCats();
    });

    // Grammatik-Auswahl der Suche -> { pos, stem, … } oder null, wenn nichts gewählt ist
    const GRAM_IDS = { pos: 'gPos', stem: 'gStem', tense: 'gTense', person: 'gPerson', gender: 'gGender', number: 'gNumber', state: 'gState', suffix: 'gSuffix', article: 'gArticle' };
    for (const id of Object.values(GRAM_IDS)) {
      const label = $('#' + id).closest('label').cloneNode(true);
      label.querySelector('select').id = 'sx' + id;
      $('#sxGrammar').append(label);
    }
    function gramParams(prefix = '') {
      const g = {}; let any = false;
      for (const [k, id] of Object.entries(GRAM_IDS)) { const el = $('#' + prefix + id); const v = el ? el.value : ''; g[k] = v; if (v) any = true; }
      return any ? g : null;
    }
    $('#gClear').onclick = () => { for (const id of Object.values(GRAM_IDS)) $('#' + id).value = ''; $('#gError').hidden=true; };
    $('#gramBox').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'SELECT') { e.preventDefault(); $('#gForm').requestSubmit(); } });
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
    $('#sChart').addEventListener('click', e => { if (e.target.dataset && e.target.dataset.act === 'serall') { distSel = null; return renderDist($('#sChart')._res); } if (e.target.dataset && e.target.dataset.act === 'sernone') { distSel = new Set(); return renderDist($('#sChart')._res); } const b = e.target.closest('.bar'); if (b) runSearch(b.dataset.t, lastSearch?.wordMode?{word:true}:lastSearch?.syntax); });
    let sSumState = null; // zuletzt gezeigte Buchliste (für „… weitere anzeigen“)
    function renderSum() {
      const { res, onlyTitle, n } = sSumState;
      $('#sSum').innerHTML = res.stats.length > 1 || onlyTitle
        ? (onlyTitle ? `<button class="chip" data-t="">← alle Bücher</button> ` : '') + res.stats.slice(0, n).map(x => `<button class="chip${x.title === onlyTitle ? ' on' : ''}" data-t="${esc(x.title)}" title="Nur in diesem Buch, alle Treffer">${esc(x.title)} (${x.n})</button>`).join(' ') + (res.stats.length > n ? ` <button class="chip more" data-more="1" title="${esc(I18N.t('Weitere Bücher anzeigen'))}">${esc(I18N.t('… und {#} weitere', res.stats.length - n))}</button>` : '')
        : '';
      $('#sSumPanel').hidden = !$('#sSum').innerHTML.trim();
    }
    function renderSyntaxBooks() {
      const select = $('#sxBook'), book = select.value;
      const titles = new Set(getGroups().filter(g => g.versions.some(v => v.kind === 'he' &&
        v.versionTitle === 'Westminster Leningrad Codex (OSHB, mit Morphologie)')).map(g => g.title));
      select.replaceChildren(select.options[0], ...SefOrder.sortTitles([...titles], title => title).map(title => new Option(title, title)));
      select.value = titles.has(book) ? book : '';
      const word=$('#gBook'),wordBook=word.value;word.replaceChildren(...[...select.options].map(o=>o.cloneNode(true)));word.value=titles.has(wordBook)?wordBook:'';
      const advanced=$('#sxAdvancedBook'),saved=advanced.value;advanced.replaceChildren(...[...select.options].map(o=>o.cloneNode(true)));advanced.value=titles.has(saved)?saved:'';
    }
    let bhsaStatusRequested = false,bhsaStatusPromise;
    function loadBhsaStatus() {
      if (bhsaStatusRequested || !O.bhsaStatus) return bhsaStatusPromise;
      bhsaStatusRequested = true;
      const bhsaStatus = $('#sxBhsaStatus');
      const show = status => {
        $('#sxBhsa').hidden = !status.ready;
        bhsaStatus.hidden = false;
        bhsaStatus.textContent = status.ready ? I18N.t('ETCBC BHSA · {} von {} Versen zugeordnet',
          status.aligned.toLocaleString(I18N.loc), status.total.toLocaleString(I18N.loc))
          : I18N.t('Die mitgelieferten BHSA-Daten konnten nicht gelesen werden.');
        $('#sxAdvancedStatus').textContent=bhsaStatus.textContent;
      };
      return bhsaStatusPromise=O.bhsaStatus().then(show, () => show({ ready: false }));
    }
    $('#sxKinds').addEventListener('click',event=>{
      const button=event.target.closest('[data-syntax-kind]');if(!button)return;
      const word=button.dataset.syntaxKind==='word';
      setSearchMode(word?'syntax':'clauses');
      $('#gForm').hidden=!word;$('#sxClausePanel').hidden=word;
      for(const b of $$('#sxKinds button')){const active=b===button;b.classList.toggle('primary',active);b.setAttribute('aria-pressed',String(active));}
      updateExamples();
    });
    $('#gForm').addEventListener('submit',event=>{
      event.preventDefault();if(sBusy())return O.cancelSearch();
      const valid=!!gramParams()||!!$('#gQuery').value.trim();$('#gError').hidden=valid;
      if(!valid){$('#gError').textContent=I18N.t('Wähle Wortmerkmale oder gib ein Wort bzw. Lemma ein.');return;}
      runSearch(null,{word:true});
    });
    const syntaxBuilder=window.LibrarySyntaxBuilder.create({root:$('#sxBuilder'),esc,t:key=>I18N.t(key),loadRoots:loadRootFamilies});
    $('#sxPatternExample').onclick=()=>examplesUI.load('attributive-hifil');
    $('#sxAdvanced').onchange=()=>{
      $('#sxSimple').hidden=$('#sxAdvanced').checked;
      $('#sxBuilderPanel').hidden=!$('#sxAdvanced').checked;
      $('#sxError').hidden=true;
      updateExamples();
    };
    const syntaxParams = () => $('#sxAdvanced').checked ? {pattern:syntaxBuilder.query()} : ({
      verb: $('#sxVerb').value.trim(), subject: $('#sxSubject').value.trim(),
      object: $('#sxObject').value.trim(), referents: $('#sxReferents').checked,
      ...(!$('#sxBhsa').hidden ? { domain: $('#sxDomain').value, relation: $('#sxResumption').checked ? 'Resu' : '' } : {}),
    });
    async function applySyntaxRecord(record){
        const selector=record.type==='word'?'#gBook':record.type==='advanced'?'#sxAdvancedBook':'#sxBook';
        if(record.book&&![...$(selector).options].some(o=>o.value===record.book))throw Error('Das Buch dieses Suchmusters ist nicht lokal vorhanden.');
        if(record.type==='advanced'){
          const pattern=window.SyntaxPattern.clean(record.pattern);
          const roots=[];const walk=n=>{if(n.mode==='root')roots.push(n.family);n.children?.forEach(walk);if(n.child)walk(n.child);};walk(pattern);
          if(roots.length){const data=await loadRootFamilies(),keys=new Set(Object.values(data.roots).map(f=>f.lang+':'+f.id));if(roots.some(id=>!keys.has(id)))throw Error('Eine Wortfamilie dieses Suchmusters ist nicht verfügbar.');}
        }
        if(record.type==='clause'&&(record.syntax.domain||record.syntax.relation)){
          await loadBhsaStatus();if($('#sxBhsa').hidden)throw Error('Die mitgelieferten BHSA-Daten konnten nicht gelesen werden.');
        }
        if(sBusy()){void O.cancelSearch();searchId++;searchPending=false;sSetBusy();$('#sProgress').hidden=true;}
        $('#sxKinds [data-syntax-kind="'+(record.type==='word'?'word':'clause')+'"]').click();
        $(selector).value=record.book;
        const setGram=(gram,prefix='')=>{for(const [key,id]of Object.entries(GRAM_IDS))$('#'+prefix+id).value=gram?.[key]||'';};
        if(record.type==='word'){$('#gQuery').value=record.query;setGram(record.gram);$('#gError').hidden=true;return;}
        $('#sxAdvanced').checked=record.type==='advanced';$('#sxAdvanced').onchange();
        if(record.type==='advanced'){if(!syntaxBuilder.set(record.pattern))throw Error('Ungültiges Suchmuster.');return;}
        const s=record.syntax;$('#sxVerb').value=s.verb;$('#sxSubject').value=s.subject;$('#sxObject').value=s.object;
        $('#sxReferents').checked=s.referents;$('#sxDomain').value=s.domain;$('#sxResumption').checked=s.relation==='Resu';setGram(record.gram,'sx');
        $('#sxFilters').dispatchEvent(new Event('change',{bubbles:true}));
    }
    window.LibrarySyntaxPatterns.create({
      root:$('#sxSavedPatterns'),esc,t:(...args)=>I18N.t(...args),storage:localStorage,files:window.api,
      capture:()=>{
        if(!$('#gForm').hidden)return {type:'word',book:$('#gBook').value,query:$('#gQuery').value,gram:gramParams()||{}};
        if($('#sxAdvanced').checked){
          if(!syntaxBuilder.valid())throw Error(syntaxBuilder.error()||'Ungültiges Suchmuster.');
          return {type:'advanced',book:$('#sxAdvancedBook').value,pattern:syntaxBuilder.query()};
        }
        return {type:'clause',book:$('#sxBook').value,syntax:syntaxParams(),gram:gramParams('sx')||{}};
      },
      apply:applySyntaxRecord,
    });
    const examplesUI=window.LibrarySyntaxExamples.create({root:$('#sxExamples'),apply:async record=>{await applySyntaxRecord(record);$('#sxSavedPatterns [data-act=new]').click();},esc,t:(...args)=>I18N.t(...args)});
    function updateExamples(){examplesUI.show(['syntax','clauses'].includes(searchMode)&&$('#gForm').hidden?($('#sxAdvanced').checked?'advanced':'clause'):null);}
    updateExamples();
    function runSyntaxSearch() {
      if (sBusy()) return O.cancelSearch();
      const syntax = syntaxParams();
      if(syntax.pattern){
        if(!syntaxBuilder.valid()){$('#sxError').hidden=false;$('#sxError').textContent=syntaxBuilder.error()||I18N.t('Prüfe die Bedingungen: hebräische Lemmata, höchstens 40 Elemente und 6 Ebenen.');return;}
        return runSearch(null,syntax);
      }
      const split = value => value.split(/[\s,]+/u).filter(Boolean);
      const subjects = split(syntax.subject), objects = split(syntax.object);
      const terms = [syntax.verb, ...subjects, ...objects].filter(Boolean);
      const valid = (terms.length || syntax.domain || syntax.relation) && subjects.length <= 12 && objects.length <= 12
        && terms.every(term => /^[\u0591-\u05C7א-ת]+$/u.test(term) && /[א-ת]/u.test(term));
      const error = $('#sxError');
      error.hidden = !!valid;
      if (!valid) {
        error.textContent = I18N.t('Gib ein hebräisches Lemma ein oder wähle einen BHSA-Filter.');
        return;
      }
      return runSearch(null, syntax);
    }
    $('#sxForm').addEventListener('submit', event => {
      event.preventDefault();
      runSyntaxSearch();
    });
    $('#sxForm').addEventListener('input', () => { $('#sxError').hidden = true; });
    $('#sxFilters').addEventListener('change', () => {
      const active = [...$$('#sxFilters select, #sxFilters input')].filter(input =>
        input.type === 'checkbox' ? input.checked : input.value).length;
      $('#sxFilterCount').textContent = active ? ' ' + I18N.t('({#} aktiv)', active) : '';
    });
    $('#sxExample').onclick = () => examplesUI.load('god-speaks');
    const searchCount = n => Number(n || 0).toLocaleString(I18N.loc);
    async function runSearch(only, syntax = null) {
      const onlyTitle = typeof only === 'string' && only !== 'restore' ? only : null; // Klick auf einen Buchnamen: nur dieses Buch, mit allen Treffern
      const wordMode=syntax?.word===true;
      const q = wordMode ? $('#gQuery').value.trim() : syntax ? '' : $('#sq').value.trim();
      const cc = !syntax && isConcordance(), gram = !syntax || cc || syntax?.pattern ? null : gramParams(wordMode ? '' : 'sx');
      if (cc && (!/^[\p{L}\p{M}\p{N}]+$/u.test(q))) { $('#sInfo').textContent = I18N.t('Bitte ein einzelnes Wort ohne Platzhalter eingeben.'); return; }
      if (!q && !gram && !syntax) return;
      const kinds = gram || syntax ? ['he'] : cc && $('#sConcordanceCross').checked && /[\u05d0-\u05ea\u0710-\u072f\u0370-\u03ff\u1f00-\u1fff]/u.test(q) ? ['he','other'] : sKinds(); // Grammatik-Suche: nur hebräischer Westminster-Text
      const id = ++searchId;
      searchPending = true;
      sSetBusy();
      $('#sProgress').hidden = false; $('#sProgressBar').removeAttribute('value'); $('#sProgressLabel').textContent = I18N.t('Suche läuft …');
      $('#sInfo').textContent = 'Suche läuft …';
      $('#sOut').innerHTML = ''; $('#sSum').innerHTML = ''; $('#sSumPanel').hidden = true; $('#sExport').hidden = true; if (!only || typeof only !== 'string' || only === 'restore') $('#sChart').hidden = true;
      $('#sLemmaCoverage').innerHTML = '';
      $('#sSyntaxCoverage').innerHTML = '';
      const book = syntax ? $(wordMode?'#gBook':syntax.pattern?'#sxAdvancedBook':'#sxBook').value : '';
      const titles = syntax ? (book ? [book] : wordMode ? [...$('#gBook').options].map(o=>o.value).filter(Boolean) : []) : [...sTitles];
      const sp = {
        query: q, kinds, gram, syntax:wordMode?null:syntax,
        ...(wordMode?{lemma:true,wlc:true}:{}),
        categories: onlyTitle || syntax ? [] : [...sCats], titles: [...new Set((onlyTitle ? [onlyTitle] : titles).flatMap(t => window.LibraryWorks.titlesFor(t)))],
        ...(!syntax ? { distance: +$('#sDist').value, ordered: $('#sOrd').checked, fuzzy: $('#sFuzzy').checked,
          ...sMatchParams(), wlc: $('#sWlc').checked } : {}),
        limit: 1000, perFile: onlyTitle ? 1000 : 25, countAll: !onlyTitle,
        ...(cc ? { concordance: true, concordanceRoot: $('#sMode').value === 'root' ? concordanceRoot : '', concordanceFamily: $('#sMode').value === 'root', concordanceLemma: $('#sMode').value === 'lemma' ? concordanceLemma : '', crossLanguage: $('#sConcordanceCross').checked, lemma: ['lemma', 'root'].includes($('#sMode').value), gram: null, fuzzy: false, prefix: false, exact: false, partial: false, wlc: false, countAll: true } : {}),
      };
      lastSearch = { ...sp, wordMode };
      const fkey = JSON.stringify({ ...sp, titles, perFile: 0, limit: 0, countAll: 0 });
      let res;
      if (only === 'restore' && fullCache && fullCache.key === fkey) res = fullCache.res; // Rückkehr zu „alle Bücher“: gespeichertes Ergebnis, keine neue Suche
      else { try { res = await O.search(sp); } catch { res = null; } }
      if (id !== searchId) return;
      searchPending = false;
      sSetBusy();
      $('#sProgress').hidden = true;
      if (res?.error) { $('#sInfo').textContent = I18N.t(res.error); return; }
      if (!res) { $('#sInfo').textContent = I18N.t('Die Suche ist fehlgeschlagen.'); return; }
      if (!onlyTitle && !res.cancelled) fullCache = { key: fkey, res };
      sResults = res.results;
      $('#sOut').classList.toggle('concordance', !!res.concordance);
      $('#sSyntaxCoverage').innerHTML=window.SyntaxCoverage.render(res.syntaxCoverage,{esc,t:(...args)=>I18N.t(...args)});
      const wordCount = (res.dist || []).reduce((n, x) => n + x.o, 0);
      const passageCount = (res.dist || []).reduce((n, x) => n + x.h, 0);
      const summary = I18N.t('{} Wortvorkommen in {} Versen/Absätzen · {} Werke', searchCount(wordCount), searchCount(passageCount), searchCount(res.stats.length));
      $('#sInfo').textContent = summary + ' · ' + I18N.t('{} von {} Dateien durchsucht', res.scanned, res.total)
        + (res.capped && !onlyTitle ? ' · ' + I18N.t('– je Buch werden die ersten 25 gezeigt; ein Klick auf den Buchnamen oben zeigt alle') : '');
      if (res.concordance) $('#sInfo').textContent = summary + ' · ' + I18N.t('{} Belege angezeigt · {} von {} Dateien durchsucht', sResults.length, res.scanned, res.total)
        + (res.cancelled ? ' · ' + I18N.t('– abgebrochen') : '')
        + (res.truncated || res.capped ? ' · ' + I18N.t('Anzeige begrenzt; Häufigkeiten zählen alle durchsuchten Stellen. Werk auswählen, um weitere Belege zu sehen.') : '')
        + (res.lemmaCoverage && !res.hitsByBasis.root && !sp.concordanceRoot && !sp.concordanceFamily
          ? ' · ' + I18N.t('{} Lemmatreffer', res.hitsByBasis.lemma.toLocaleString(I18N.loc))
          : '')
        + (res.excludedWithoutLemma ? ' · ' + I18N.t('{} Fassungen ohne nutzbare Lemma-Zuordnungen ausgeschlossen.', res.excludedWithoutLemma) : '')
        + (res.crossLanguage ? ' · ' + I18N.t('Entsprechungen aus Wortzuordnungen; getrennt von den Vorkommenszahlen.') : '')
        + (res.errors ? ' · ' + I18N.t('{} Dateien konnten nicht gelesen werden', res.errors) : '');
      if (res.concordance) $('#sLemmaCoverage').innerHTML = concordanceCoverageHtml(res);
      sSumState = { res, onlyTitle, n: 40 };
      renderSum();
      if (!onlyTitle) renderDist(res);
      $('#sExport').hidden = !sResults.length;
      $('#sReadBtn').hidden = !sResults.length;
      $('#sGroupBtn').hidden = !sResults.length || !!res.concordance;
      showSearchResults();
    }
    // Treffer pro Vers zusammenfassen: derselbe Vers in mehreren Fassungen erscheint einmal; die übrigen Fassungen klappen darunter auf
    let sGroupOn = true; try { sGroupOn = localStorage.getItem('searchGroup') !== '0'; } catch { /* egal */ }
    const sresHtml = (r, i, extra) => {
      const sn = r.snippet;
      if (r.concordance) return `<div class="sres ccRow" tabindex="0" data-i="${i}"><div><b>${esc(r.title)}</b> <span class="muted">${esc(r.where)} · ${esc(shortVer(r.versionTitle))}</span></div><div class="ccContext" lang="${/[\u0710-\u072f]/u.test(sn.hit) ? 'syr' : /[\u05d0-\u05ea]/u.test(sn.hit) ? 'he' : ''}" dir="auto"><span>${esc(sn.before)}</span><mark>${esc(sn.hit)}</mark><span>${esc(sn.after)}</span></div><small class="muted">${esc(I18N.t(r.basis === 'root' ? 'Wortfamilie' : r.basis === 'lemma' ? 'Grundform' : 'Wortform'))}${r.matchedLemma ? ' · <bdi lang="he">' + esc(r.matchedLemma) + '</bdi>' : ''}${r.analysisSource ? ' · ' + esc([I18N.t(r.analysisSource), r.analysisReference].filter(Boolean).join(' · ')) : ''}</small>${r.parallels ? `<div class="ccParallels"><small>${esc(I18N.t('Zugeordnete Entsprechungen'))}</small>${r.parallels.length ? r.parallels.map((p,j)=>`<div class="sres ccPeer" tabindex="0" data-i="${i}" data-cp="${j}"><bdi lang="${p.language==='Syriac'?'syr':p.kind==='he'?'he':'grc'}" dir="auto">${esc(p.snippet.hit)}</bdi> <span>${esc(p.title)} · ${esc(p.where)}</span><small class="muted">${esc(p.analysisSource)} · ${esc(p.mtRef)}</small></div>`).join('') : `<span class="muted">${esc(I18N.t('Keine passende Wortzuordnung in den lokalen Quellen.'))}</span>`}</div>` : ''}</div>`;
      const roles = (r.syntax || []).map(pair => {
        const parts = [[I18N.t('Verb'), pair.verb ? [{ text: pair.verb }] : []], [I18N.t('Subjekt'), pair.subjects],
          [I18N.t('Direktes Objekt'), pair.objects], [I18N.t('Gemeintes Subjekt'), pair.referents]];
        const labels = parts.filter(([, refs]) => refs?.length).map(([name, refs]) =>
          `${esc(name)} ${refs.map(ref => `<bdi lang="he">${esc(ref.text)}</bdi>${ref.ref ? ` (${esc(ref.ref)})` : ''}`).join(', ')}`);
        if(pair.clauseRef)labels.push(esc(I18N.t('Klausel {}',pair.clauseRef)));
        if (pair.bhsa) {
          const domains = { N: 'Erzählung', D: 'Erläuterung des Erzählers', Q: 'Direkte Rede' };
          labels.push(['BHSA', domains[pair.bhsa.domain], pair.bhsa.resumes && 'Wiederaufnahme',pair.bhsa.relation,pair.bhsa.kind,pair.bhsa.type]
            .filter(Boolean).map(name => esc(I18N.t(name))).join(' · '));
        }
        return `<div class="muted">${labels.join(' · ')}</div>`;
      }).join('');
      return `<div class="sres${extra || ''}" data-i="${i}"><span class="t">${esc(r.title)}</span> <span class="muted">${esc(r.where)} · <span class="badge ${r.kind}">${KIND_LABEL[r.kind]}</span>${esc(shortVer(r.versionTitle))}</span><div class="snip" dir="${r.kind === 'he' ? 'rtl' : 'ltr'}">${r.parts ? r.parts.map(x => x.m ? `<mark>${esc(x.t)}</mark>` : esc(x.t)).join('') : `${esc(sn.before)}<mark>${esc(sn.hit)}</mark>${esc(sn.after)}`}</div>${roles}${window.SyntaxExplanation.render(r.explanation,{esc,t:(...args)=>I18N.t(...args)})}${window.SyntaxTree.render(r.sentenceTree,{esc,t:(...args)=>I18N.t(...args)})}</div>`;
    };
    const sKindOrder = () => (I18N.lang === 'de' ? ['de', 'en', 'he', 'other'] : I18N.lang === 'he' ? ['he', 'de', 'en', 'other'] : ['en', 'de', 'he', 'other']);
    function searchGroups() {
      const order = sKindOrder(), map = new Map();
      sResults.forEach((r, i) => {
        const key = [r.title, r.loc && r.loc.path ? JSON.stringify(r.loc.path) : '', r.loc && r.loc.label != null ? r.loc.label : r.where].join('\u0001');
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(i);
      });
      const rank = i => { const r = sResults[i], k = ['he', 'en', 'de'].includes(r.kind) ? r.kind : 'other'; return ((getPreferredVersions()[k] || []).includes(r.versionTitle) ? 0 : 10) + order.indexOf(k); };
      return [...map.values()].map(ix => ix.slice().sort((x, y) => rank(x) - rank(y) || x - y)); // die zuletzt gewählte Fassung (sonst die der Oberflächensprache) steht oben
    }
    function renderSearchList() {
      $('#sOut').classList.remove('sread');
      const gb = $('#sGroupBtn'); if (gb) { gb.setAttribute('aria-pressed', sGroupOn ? 'true' : 'false'); gb.classList.toggle('on', sGroupOn); }
      if (sResults[0]?.concordance || !sGroupOn) { $('#sOut').innerHTML = sResults.map((r, i) => sresHtml(r, i)).join(''); return; }
      const groups = searchGroups();
      const head = groups.length < sResults.length ? `<p class="muted sgsum">${esc(I18N.t('{#} Verse · {#} Fundstellen in verschiedenen Fassungen', groups.length, sResults.length))}</p>` : '';
      $('#sOut').innerHTML = head + groups.map(ix => {
        const [first, ...rest] = ix;
        if (!rest.length) return sresHtml(sResults[first], first);
        const names = rest.map(i => `${KIND_LABEL[sResults[i].kind] || ''} ${shortVer(sResults[i].versionTitle)}`.trim());
        return `<div class="sgrp">${sresHtml(sResults[first], first)}<details><summary>${esc(I18N.t('+{#} weitere Fassungen', rest.length))} <span class="muted">${esc(names.slice(0, 3).join(' · '))}${names.length > 3 ? ' …' : ''}</span></summary>${rest.map(i => sresHtml(sResults[i], i, ' alt')).join('')}</details></div>`;
      }).join('');
    }
    document.addEventListener('click', e => {
      if (!e.target.closest('#sGroupBtn')) return;
      sGroupOn = !sGroupOn;
      try { localStorage.setItem('searchGroup', sGroupOn ? '1' : '0'); } catch { /* egal */ }
      if (typeof showSearchResults === 'function' && !sRead) showSearchResults(); else renderSearchList();
    });
    // Treffer als Lesetext: wie beim Lesen, jede Fundstelle als Zeile mit den gewählten Versionen nebeneinander, geordnet nach Buch und Kapitel
    let sRead = false; try { sRead = localStorage.getItem('searchRead') === '1'; } catch { /* egal */ }
    function showSearchResults() { renderSearchList(); }
    $('#sSum').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c && c.dataset.more) { sSumState.n += 100; renderSum(); return; } if (c) runSearch(c.dataset.t || 'restore', lastSearch?.wordMode?{word:true}:lastSearch?.syntax); });
    $('#sExport').onclick = async () => {
      const cc = !!sResults[0]?.concordance;
      const csv = [cc ? 'Titel;Version;Sprache;Stelle;Kontext;Wortform;Trefferart;Quelle;Wortposition;Zugeordnete Entsprechungen' : 'Titel;Version;Sprache;Stelle;Text'].concat(sResults.map(r => [r.title, r.versionTitle, KIND_LABEL[r.kind], r.where, plainSnip(r), ...(cc ? [r.snippet.hit, r.basis, [r.analysisSource, r.analysisReference].filter(Boolean).join(' · '), r.position, (r.parallels || []).map(p => [p.snippet.hit, p.title, p.where, p.analysisSource].join(' | ')).join(' / ')] : [])].map(x => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(';')));
      const r = await window.api.saveFile(`Suche – ${$('#sq').value.trim().slice(0, 40).replace(/[\\/:*?"<>|]/g, '_')}.csv`, '\ufeff' + csv.join('\r\n'));
      if (r && r.error) alert(r.error);
    };
    // Verlauf (nur selbst abgeschickte Suchen) und Favoriten der Volltextsuche
    let sRecent = lsGet('searchRecent'), sFavs = lsGet('searchFavs');
    const syncSS = () => { sRecent = lsGet('searchRecent'); sFavs = lsGet('searchFavs'); };
    function renderSearchSaved() {
      syncSS();
      const chips2 = (a, fav) => a.length ? a.map((w, i) => `<span class="dchip"><a data-i="${i}" dir="auto"${sEntTitle(w) ? ` title="${esc(sEntTitle(w))}"` : ''}>${esc(sEntQ(w))}</a><button data-rm="${i}" title="Entfernen">✕</button></span>`).join('') : `<span class="muted">${fav ? 'Noch keine Favoriten' : 'Noch keine Suchen'}</span>`;
      $('#sRecentL').innerHTML = chips2(sRecent, false);
      $('#sFavL').innerHTML = chips2(sFavs, true);
      const q = $('#sq').value.trim(), on = !!q && sFavs.some(x => sEntQ(x) === q);
      $('#sStar').textContent = on ? '★' : '☆'; $('#sStar').classList.toggle('on', on);
    }
    // Ein Eintrag ist entweder nur der Suchtext (frühere Fassungen; heute: Sprache „Automatisch“ und die übliche Treffer-Art)
    // oder { q, l: Sprache, m: Treffer-Art }, wenn etwas anderes eingestellt war.
    const sEntQ = e => (typeof e === 'string' ? e : e && typeof e.q === 'string' ? e.q : '');
    const sLabel = (sel, v) => { const o = [...$(sel).options].find(x => x.value === v); return o ? o.textContent.trim() : ''; };
    const sEntTitle = e => (e && typeof e === 'object' ? [sLabel('#sLang', e.l), sLabel('#sMode', e.cc ? e.cm === 'root' ? 'root' : e.cm === 'lemma' ? 'lemma' : 'exact' : e.m)].filter(Boolean).join(' · ') : '');
    const sEntNow = () => ({ q: $('#sq').value.trim(), l: $('#sLang').value, m: $('#sMode').value,
      wm: $('#sWordMode').value, cx: $('#sConcordanceCross').checked, cr: concordanceRoot, cl: concordanceLemma, unified: true });
    function sRootScope(id) { concordanceRoot = id || ''; }
    function sEntApply(e) {
      setSearchMode('text');
      sRootScope(e?.cr || ''); concordanceLemma = e?.cl || '';
      $('#sq').value = sEntQ(e);
      $('#sLang').value = e && typeof e === 'object' && S_LANGS.includes(e.l) ? e.l : 'auto';
      const slot = sSlot();
      // Existing favorites and history keep their search semantics in the unified menu.
      const previous = typeof e === 'object' && e ? e : {};
      const m = previous.cc ? previous.cm === 'root' ? 'root' : previous.cm === 'lemma' ? 'lemma' : 'exact'
        : ['part', 'prefix'].includes(previous.m) ? 'exact' : previous.m;
      sModeSel[slot] = sModeOk(m, slot) ? m : slot === 'he' || slot === 'gr' ? 'lemma' : 'exact';
      $('#sWordMode').value = ['part', 'prefix'].includes(previous.m) ? previous.m : ['exact', 'prefix', 'part'].includes(previous.wm) ? previous.wm : 'exact';
      $('#sConcordanceCross').checked = previous.unified ? !!previous.cx : previous.cc ? previous.cx !== false : false;
      sRefresh();
    }
    const manualFind = () => {
      const q = $('#sq').value.trim();
      if (q) { syncSS(); sRecent = [sEntNow(), ...sRecent.filter(x => sEntQ(x) !== q)].slice(0, 30); lsSet('searchRecent', sRecent); }
      renderSearchSaved(); runSearch();
    };
    $('#sStar').onclick = () => {
      const q = $('#sq').value.trim(); if (!q) return;
      syncSS(); sFavs = sFavs.some(x => sEntQ(x) === q) ? sFavs.filter(x => sEntQ(x) !== q) : [sEntNow(), ...sFavs];
      lsSet('searchFavs', sFavs); renderSearchSaved();
    };
    $('#sRecentClear').onclick = () => { syncSS(); sRecent = []; lsSet('searchRecent', sRecent); renderSearchSaved(); };
    $('#sSaved').addEventListener('click', e => {
      const rm = e.target.closest('button[data-rm]');
      if (rm) { syncSS(); const fav = !!rm.closest('#sFavL'); const a = fav ? sFavs : sRecent; a.splice(+rm.dataset.rm, 1); lsSet(fav ? 'searchFavs' : 'searchRecent', a); renderSearchSaved(); return; }
      const a = e.target.closest('a[data-i]');
      if (a) { syncSS(); const ent = (a.closest('#sFavL') ? sFavs : sRecent)[+a.dataset.i]; if (!sEntQ(ent)) return; sEntApply(ent); renderSearchSaved(); runSearch(); }
    });
    $('#sq').addEventListener('input', () => { sRootScope(''); concordanceLemma = ''; sRefresh(); renderSearchSaved(); }); // „Automatisch“: Sprache und Treffer-Art folgen der Schrift der Eingabe
    $('#sConcordanceCross').addEventListener('change', sRefresh);
    $('#sLang').addEventListener('change', () => { sRefresh(); renderSearchSaved(); });
    $('#sMode').addEventListener('change', () => {
      sModeSel[sSlot()] = $('#sMode').value;
      sRefresh(); renderSearchSaved();
    });
    $('#sAdv').addEventListener('change', sRefresh);
    // „Erweitert“: auf-/zugeklappt merken
    try { $('#sAdv').open = localStorage.getItem('searchAdvOpen') === '1'; } catch { /* egal */ }
    $('#sAdv').addEventListener('toggle', e => { if (e.target.id === 'sAdv') try { localStorage.setItem('searchAdvOpen', e.target.open ? '1' : '0'); } catch { /* egal */ } });
    sRefresh();
    renderSearchSaved();
    $('#sGo').onclick = () => (sBusy() ? O.cancelSearch() : manualFind()); // derselbe Knopf: während der Suche „Abbrechen“
    $('#sq').addEventListener('keydown', e => { if (e.key === 'Enter' && !sBusy()) manualFind(); });

    return {
      run: runSearch,
      concordance(query, root, lemma) {
        sCats.clear(); sTitles.clear(); renderSCats();
        sEntApply({ q: query, l: 'auto', cc: true, cm: root ? 'root' : 'lemma', cr: root, cl: lemma });
        return runSearch();
      },
      renderCategories: renderSCats,
      renderSaved: renderSearchSaved,
      apply: sEntApply,
      resultAt: (i, cp) => cp == null ? sResults[i] : sResults[i]?.parallels?.[+cp],
      getLastSearch: () => lastSearch,
      researchSnapshot: () => ({ params: lastSearch, hits: sResults.slice(0, 200), complete: !sBusy() && !sSumState?.res?.cancelled && sResults.length <= 200 && !(sSumState?.res?.truncated), total: sResults.length }),
      selectBook(g) {
        setSearchMode('text');
        sCats.clear(); sTitles.clear(); sTitles.add(g.title);
        let p = ''; for (const c of window.SearchCategories.path(g.cats).slice(0, 3)) { p = p ? p + '/' + c : c; sOpen.add(p); }
        renderSCats();
        const b = $('#sCatTree input[data-st]:checked'); if (b) b.scrollIntoView({ block: 'center' });
        $('#sq').focus(); $('#sq').select();
        if ($('#sq').value.trim()) runSearch();
      },
    };
  }
  return { create };
})();
