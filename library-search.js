// Suchoberfläche: Maske, Kategorien, Aufträge, Ergebnisliste, Diagramm und Verlauf.
// Jede Leseansicht erzeugt eine eigene Instanz. Navigation und Textdarstellung
// bleiben beim Leser; aktuelle Buch-/Versionslisten werden über Getter bezogen.
window.LibrarySearch = (() => {
  'use strict';
  function create({ $, $$, esc, KIND_LABEL, shortVer, plainSnip, lsGet, lsSet, getGroups, getPreferredVersions }) {
    const O = window.offline;
    // ---------- Suche ----------
    let sResults = [];
    let fullCache = null; // Ergebnis der letzten Suche über alle Bücher
    let lastSearch = null; // Parameter der letzten Suche (für „Als Lesetext“ im eigenen Tab)
    // ----- Suchmaske: Sprache und Treffer-Art (zwei Auswahlfelder statt vieler Häkchen) -----
    let sPending = 0; // laufende Suchen: solange heißt der Knopf „Abbrechen“
    const sBusy = () => sPending > 0;
    const sSetBusy = () => {
      const g = $('#sGo');
      g.textContent = I18N.t(sBusy() ? 'Abbrechen' : 'Suchen');
      g.classList.toggle('primary', !sBusy());
      $('#sxGo').textContent = I18N.t(sBusy() ? 'Abbrechen' : 'Syntax suchen');
    };
    const S_KINDS = ['he', 'en', 'de', 'other'], S_LANGS = ['auto', 'he', 'de', 'en', 'other', 'all'], S_MODES = ['lemma', 'prefix', 'exact', 'part'];
    // gewählte Sprache -> Textarten; „Automatisch“ richtet sich nach der Schrift der Eingabe
    function sKinds() {
      const l = $('#sLang').value, v = $('#sq').value;
      if (l === 'all') return S_KINDS.slice();
      if (l !== 'auto') return [l];
      if (/[\u0590-\u05FF]/.test(v)) return ['he'];
      if (S_GREEK.test(v)) return ['other']; // griechische Eingabe: Septuaginta und andere griechische Texte
      return /\p{L}/u.test(v) ? ['en', 'de'] : S_KINDS.slice();
    }
    const S_GREEK = /[\u0370-\u03FF\u1F00-\u1FFF]/;
    // Für welche Texte gilt die Treffer-Art? 'he' = hebräisch, 'gr' = griechische Eingabe in „Andere“/„Alle“ (Lemma-Suche in der Septuaginta), 'ot' = alles Übrige
    const sSlot = () => { const k = sKinds(); return k.includes('he') ? 'he' : k.includes('other') && S_GREEK.test($('#sq').value) ? 'gr' : 'ot'; };
    // Treffer-Art, getrennt gemerkt für hebräische, griechische und andere Suche („Alle Formen“ gibt es hebräisch und griechisch, „Wort mit Vorsilben“ nur hebräisch)
    const sModeSel = { he: 'lemma', gr: 'lemma', ot: 'part' };
    const sModeOk = (m, slot) => S_MODES.includes(m) && (slot === 'he' || slot === true || m === 'exact' || m === 'part' || (slot === 'gr' && m === 'lemma'));
    // Treffer-Art -> Parameter des Suchkerns (parse: Suchfeld zerlegen – mehrere Wörter in der Nähe, "…" = Wortfolge)
    const sMatchParams = () => { const m = $('#sMode').value; return { prefix: m === 'lemma' || m === 'prefix', exact: m === 'exact', lemma: m === 'lemma', partial: m === 'part', parse: true }; };
    // Suchfeld grob zerlegen (nur für die Hinweiszeile; die eigentliche Zerlegung macht der Suchkern)
    const sShape = v => { let ph = 0; const rest = v.replace(/(^|\s)["“„«»].+?["“”»«](?=\s|$)/gu, () => { ph++; return ' '; }); return { n: ph + rest.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length, ph }; };
    function sRefresh() {
      const kinds = sKinds(), he = kinds.includes('he'), l = $('#sLang').value, v = $('#sq').value.trim(), gram = gramParams();
      const slot = sSlot();
      for (const o of $('#sMode').options) { const off = !sModeOk(o.value, slot); o.hidden = off; o.disabled = off; }
      $('#sMode').value = sModeSel[slot];
      const m = $('#sMode').value, fuzzy = $('#sFuzzy').checked, d = +$('#sDist').value, sh = sShape(v), p = [];
      if (gram) p.push(I18N.t('Grammatik-Suche: Tanach (Westminster) und Berakhot 2a–10b'));
      else p.push(I18N.t(l === 'auto' && !v ? 'Sprache richtet sich nach der Schrift der Eingabe' : kinds.length > 2 ? 'Sucht in allen Sprachen' : kinds.length === 2 ? 'Sucht deutsch und englisch' : kinds[0] === 'he' ? 'Sucht hebräisch' : kinds[0] === 'de' ? 'Sucht deutsch' : kinds[0] === 'en' ? 'Sucht englisch' : 'Sucht in anderen Sprachen'));
      if (!gram) p.push(I18N.t(m === 'lemma' && slot === 'gr' ? 'alle Wortformen in der Septuaginta (Lemma), sonst ganze Wörter' : m === 'lemma' ? 'alle Wortformen im Tanach, sonst ganze Wörter (mit Vorsilben)' : m === 'prefix' ? 'ganze Wörter, hebräische Vorsilben erlaubt' : m === 'exact' ? 'nur genau dieses Wort' : fuzzy ? 'ganze Wörter' : 'auch Wortteile'));
      if (sh.n > 1 && !gram) p.push(I18N.t(d < 0 ? 'alle Wörter im selben Vers' : d === 0 ? 'alle Wörter direkt nebeneinander' : 'alle Wörter nah beieinander (höchstens {#} dazwischen)', d) + ($('#sOrd').checked ? ', ' + I18N.t('in dieser Reihenfolge') : ''));
      if (sh.ph && !gram) p.push(I18N.t('"…" = genau diese Wortfolge'));
      if (fuzzy && !gram) p.push(I18N.t('ähnliche Schreibweise (Fuzzy)'));
      $('#sHint').textContent = p.join(' · ');
      const act = +$('#sOrd').checked + +fuzzy + +!$('#sWlc').checked + +(d !== 10) + +!!gram; // was unter „Erweitert“ vom Standard abweicht
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
      const f = $('#sCatFilter').value.trim().toLowerCase();
      const root = { name: '', path: '', children: new Map(), count: 0, titles: [] };
      for (const g of getGroups()) {
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
          `<label class="t book"><input type="checkbox" data-st="${esc(t)}" ${cov || sCats.has(n.path) || sTitles.has(t) ? 'checked' : ''} > ${esc(t)}</label>`).join('');
        const part = !cov && !sCats.has(n.path) && anySel(n); // nur ein Teil darunter gewählt: Teilmarkierung (Strich) statt Häkchen, sonst würde alles darunter durchsucht
        const cb = `<input type="checkbox" data-sc="${esc(n.path)}" ${cov || sCats.has(n.path) ? 'checked' : ''} ${part ? 'data-part="1"' : ''}> `;
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
    $('#sCatAll').onclick = () => { sTitles.clear(); sCats.clear(); getGroups().forEach(g => { if (g.cats[0]) sCats.add(g.cats[0]); }); renderSCats(); }; // alle Hauptkategorien anhaken; danach z. B. ein Buch anklicken = nur dieses
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
    function gramParams() {
      const g = {}; let any = false;
      for (const [k, id] of Object.entries(GRAM_IDS)) { const el = $('#' + id); const v = el ? el.value : ''; g[k] = v; if (v) any = true; }
      return any ? g : null;
    }
    $('#gClear').onclick = () => { for (const id of Object.values(GRAM_IDS)) $('#' + id).value = ''; $('#gramBox').open = false; sRefresh(); };
    $('#gramBox').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'SELECT') { e.preventDefault(); if (!sBusy()) $('#sGo').click(); } });
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
    const syntaxParams = () => ({ verb: $('#sxVerb').value.trim(), subject: $('#sxSubject').value.trim() });
    function runSyntaxSearch() {
      if (sBusy()) return O.cancelSearch();
      const syntax = syntaxParams();
      const subjects = syntax.subject.split(/[\s,]+/u).filter(Boolean);
      const terms = [syntax.verb, ...subjects].filter(Boolean);
      const valid = terms.length && subjects.length <= 12
        && terms.every(term => /^[\u0591-\u05C7א-ת]+$/u.test(term) && /[א-ת]/u.test(term));
      const error = $('#sxError');
      error.hidden = !!valid;
      if (!valid) {
        error.textContent = I18N.t('Gib ein hebräisches Verb-Lemma oder bis zu zwölf Subjekt-Lemmata ein.');
        return;
      }
      return runSearch(null, syntax);
    }
    $('#sxGo').onclick = runSyntaxSearch;
    $('#sSyntax').addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
        event.preventDefault();
        if (!sBusy()) runSyntaxSearch();
      }
    });
    $('#sSyntax').addEventListener('input', () => { $('#sxError').hidden = true; });
    async function runSearch(only, syntax = null) {
      const onlyTitle = typeof only === 'string' && only !== 'restore' ? only : null; // Klick auf einen Buchnamen: nur dieses Buch, mit allen Treffern
      const q = syntax ? '' : $('#sq').value.trim();
      const gram = gramParams();
      if (!q && !gram && !syntax) return;
      const kinds = gram || syntax ? ['he'] : sKinds(); // Grammatik-Suche: nur hebräischer Westminster-Text
      sPending++; sSetBusy();
      $('#sProgress').hidden = false; $('#sProgressBar').removeAttribute('value'); $('#sProgressLabel').textContent = I18N.t('Suche läuft …');
      $('#sInfo').textContent = 'Suche läuft …';
      $('#sOut').innerHTML = ''; $('#sSum').innerHTML = ''; $('#sSumPanel').hidden = true; $('#sExport').hidden = true; if (!only || typeof only !== 'string' || only === 'restore') $('#sChart').hidden = true;
      const sp = {
        query: q, extra: [], distance: +$('#sDist').value, ordered: $('#sOrd').checked, fuzzy: $('#sFuzzy').checked, kinds,
        categories: onlyTitle ? [] : [...sCats], titles: onlyTitle ? [onlyTitle] : [...sTitles], ...sMatchParams(), wlc: $('#sWlc').checked, gram, syntax,
        limit: 1000, perFile: onlyTitle ? 1000 : 25, countAll: !onlyTitle,
      };
      lastSearch = { ...sp };
      const fkey = JSON.stringify({ ...sp, titles: 0, perFile: 0, limit: 0, countAll: 0 });
      let res;
      if (only === 'restore' && fullCache && fullCache.key === fkey) res = fullCache.res; // Rückkehr zu „alle Bücher“: gespeichertes Ergebnis, keine neue Suche
      else { try { res = await O.search(sp); } catch { res = null; } }
      sPending--; sSetBusy();
      if (!sBusy()) $('#sProgress').hidden = true;
      if (!res) { $('#sInfo').textContent = I18N.t('Die Suche ist fehlgeschlagen.'); return; }
      if (!onlyTitle && !res.cancelled) fullCache = { key: fkey, res };
      sResults = res.results;
      const totalHits = res.stats.reduce((a, x) => a + x.n, 0);
      $('#sInfo').textContent = I18N.t('{#} Treffer in {#} {} ({#} von {#} Dateien durchsucht)', totalHits + (res.truncated ? '+' : ''), res.stats.length, res.stats.length === 1 ? 'Buch' : 'Büchern', res.scanned, res.total) + (res.cancelled ? ' ' + I18N.t('– abgebrochen') : '') + (res.truncated ? ' ' + I18N.t('– bei 1000 angezeigten Treffern gestoppt, bitte genauer suchen') : '') + (res.capped && !onlyTitle ? ' ' + I18N.t('– je Buch werden die ersten 25 gezeigt; ein Klick auf den Buchnamen oben zeigt alle') : '') + '.';
      sSumState = { res, onlyTitle, n: 40 };
      renderSum();
      if (!onlyTitle) renderDist(res);
      $('#sExport').hidden = !sResults.length;
      $('#sReadBtn').hidden = !sResults.length;
      $('#sGroupBtn').hidden = !sResults.length;
      showSearchResults();
    }
    // Treffer pro Vers zusammenfassen: derselbe Vers in mehreren Fassungen erscheint einmal; die übrigen Fassungen klappen darunter auf
    let sGroupOn = true; try { sGroupOn = localStorage.getItem('searchGroup') !== '0'; } catch { /* egal */ }
    const sresHtml = (r, i, extra) => {
      const sn = r.snippet;
      const roles = (r.syntax || []).map(pair => {
        const subjects = pair.subjects.map(subject => `<bdi lang="he">${esc(subject.text)}</bdi>${subject.ref ? ` (${esc(subject.ref)})` : ''}`).join(' · ');
        return `<div class="muted">${esc(I18N.t('Verb'))} <bdi lang="he">${esc(pair.verb)}</bdi> · ${esc(I18N.t('Subjekt'))} ${subjects}</div>`;
      }).join('');
      return `<div class="sres${extra || ''}" data-i="${i}"><span class="t">${esc(r.title)}</span> <span class="muted">${esc(r.where)} · <span class="badge ${r.kind}">${KIND_LABEL[r.kind]}</span>${esc(shortVer(r.versionTitle))}</span><div class="snip" dir="${r.kind === 'he' ? 'rtl' : 'ltr'}">${r.parts ? r.parts.map(x => x.m ? `<mark>${esc(x.t)}</mark>` : esc(x.t)).join('') : `${esc(sn.before)}<mark>${esc(sn.hit)}</mark>${esc(sn.after)}`}</div>${roles}</div>`;
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
      if (!sGroupOn) { $('#sOut').innerHTML = sResults.map((r, i) => sresHtml(r, i)).join(''); return; }
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
    $('#sSum').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c && c.dataset.more) { sSumState.n += 100; renderSum(); return; } if (c) runSearch(c.dataset.t || 'restore', lastSearch?.syntax); });
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
    const sEntTitle = e => (e && typeof e === 'object' ? [sLabel('#sLang', e.l), sLabel('#sMode', e.m)].filter(Boolean).join(' · ') : '');
    const sEntNow = () => {
      const q = $('#sq').value.trim(), l = $('#sLang').value, m = $('#sMode').value;
      return l === 'auto' && m === (sSlot() === 'ot' ? 'part' : 'lemma') ? q : { q, l, m };
    };
    function sEntApply(e) { // gespeicherte Suche wieder einstellen (alte Einträge: Standard)
      $('#sq').value = sEntQ(e);
      $('#sLang').value = e && typeof e === 'object' && S_LANGS.includes(e.l) ? e.l : 'auto';
      const slot = sSlot(), m = e && typeof e === 'object' ? e.m : '';
      sModeSel[slot] = sModeOk(m, slot) ? m : slot === 'ot' ? 'part' : 'lemma';
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
    $('#sq').addEventListener('input', () => { sRefresh(); renderSearchSaved(); }); // „Automatisch“: Sprache und Treffer-Art folgen der Schrift der Eingabe
    $('#sLang').addEventListener('change', () => { sRefresh(); renderSearchSaved(); });
    $('#sMode').addEventListener('change', () => {
      const m = $('#sMode').value;
      if (m === 'exact') sModeSel.he = sModeSel.gr = sModeSel.ot = m; // „Genau dieses Wort“ gilt in jeder Sprache weiter
      else { sModeSel[sSlot()] = m; if (sModeSel.he === 'exact') sModeSel.he = 'lemma'; if (sModeSel.gr === 'exact') sModeSel.gr = 'lemma'; if (sModeSel.ot === 'exact') sModeSel.ot = 'part'; }
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
      renderCategories: renderSCats,
      renderSaved: renderSearchSaved,
      apply: sEntApply,
      resultAt: i => sResults[i],
      getLastSearch: () => lastSearch,
      selectBook(g) {
        sCats.clear(); sTitles.clear(); sTitles.add(g.title);
        let p = ''; for (const c of g.cats.slice(0, 3)) { p = p ? p + '/' + c : c; sOpen.add(p); }
        renderSCats();
        const b = $('#sCatTree input[data-st]:checked'); if (b) b.scrollIntoView({ block: 'center' });
        $('#sq').focus(); $('#sq').select();
        if ($('#sq').value.trim()) runSearch();
      },
    };
  }
  return { create };
})();
