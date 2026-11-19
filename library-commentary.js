// Laden und Darstellung der Kommentartexte, ein Zustand je Lesefenster.
// Navigation, aktuelle Leserposition und Auswahl werden ausdrücklich übergeben.
window.LibraryCommentary = (() => {
  'use strict';
  function create({ $, $$, esc, R, selection, reader, format, navigation, refreshFind }) {
    const LK = window.links;
    const { CMT_PRIO, dispName, splitOther, libCmpGroups, titleCmp, secChapOf,
      rowVerse, stripHe, versOf, versNoteText, portraitOf } = format;
    const { jumpTo, openInPane2, ctxShow, panelScrollTo, IS_PANE2 } = navigation;
    const cmtClosed = new Set();
    let cmtToken = 0;
    // Höhe des festen Kopfes merken, damit die Kommentatornamen darunter hängen bleiben
    try { let frame=0;new ResizeObserver(()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;$('#cmtPanel').style.setProperty('--cmt-head-h',$('#cmtHead').offsetHeight+'px');});}).observe($('#cmtHead')); } catch { /* egal */ }
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
        cs.forEach(c => items.push({ label: (c.classList.contains('closed') ? '▸ ' : '') + dispName(c.dataset.n) + (c.querySelectorAll('.cpart').length > 1 ? ` ×${c.querySelectorAll('.cpart').length}` : ''), fn: () => { c.classList.remove('closed'); cmtClosed.delete(c.dataset.n); const t = c.querySelector('.tg'); if (t) t.textContent = '▾'; panelScrollTo(c, 'start'); } }));
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
    // Beim Wechsel zu einem anderen Vers: an demselben Kommentator weiterlesen, an dem man gerade war (falls es ihn dort auch gibt)
    let cmtKeepName = null;
    function cmtTopName() {
      const P = $('#cmtPanel'), cs = $$('#cmtBody .cmt');
      if (!cs.length) return undefined; // gerade nichts angezeigt (z. B. „Lade …“): bisherigen Stand behalten
      if (P.scrollTop < 8) return null;
      const hb = $('#cmtHead').getBoundingClientRect().bottom;
      const c = cs.find(x => x.getBoundingClientRect().bottom > hb + 24);
      return c ? c.dataset.n : null;
    }
    function cmtRestoreTop() {
      const P = $('#cmtPanel');
      const c = cmtKeepName ? $$('#cmtBody .cmt').find(x => x.dataset.n === cmtKeepName) : null;
      if (!c) { P.scrollTop = 0; return; }
      const top = c.getBoundingClientRect().top - P.getBoundingClientRect().top + P.scrollTop - $('#cmtHead').offsetHeight - 8;
      P.scrollTop = Math.max(0, top);
    }
    async function renderCmt() {
      if (!reader.open) return;
      { const n = cmtTopName(); if (n !== undefined) cmtKeepName = n; }
      const token = ++cmtToken;
      const virt = reader.view && reader.view.sres ? reader.virtual : null; // Suchtab: Stelle kommt aus der angeklickten Trefferzeile
      const s = virt ? { label: virt.label } : (reader.view && reader.view.group && reader.view.sections[reader.view.idx]);
      const whole = reader.whole && !virt && !!s && secChapOf(s) != null; // ganzes Kapitel / ganze Seite
      const v = whole ? 0 : rowVerse(reader.row), page = whole && /[ab]$/i.test(secChapOf(s));
      $('#cmtTitle').textContent = whole ? `${reader.view.group.title} ${s.label.replace(/^\D+/, '')} · ${I18N.t(page ? 'Seite' : 'Kapitel')}`
        : s && v != null ? `${virt ? virt.title : reader.view.group.title} ${s.label.replace(/^\D+/, '')}:${reader.row}` : 'Kommentare';
      { const wb = $('#cmtWhole'); wb.hidden = whole || virt || !s || secChapOf(s) == null; wb.textContent = I18N.t(s && /[ab]$/i.test(secChapOf(s) || '') ? 'Ganze Seite' : 'Ganzes Kapitel'); wb.title = I18N.t('Kommentare zum ganzen Kapitel bzw. zur ganzen Seite'); }
      if (!s) { $('#cmtChips').innerHTML = ''; $('#cmtSum').innerHTML = ''; $('#cmtBody').innerHTML = '<p class="muted">Öffne ein Buch.</p>'; return; }
      if (!reader.linksReady) { $('#cmtChips').innerHTML = ''; $('#cmtSum').innerHTML = ''; $('#cmtBody').innerHTML = '<p class="muted">Dafür werden die Verknüpfungen gebraucht: Reiter „Herunterladen“ → Karte „4 · Verknüpfungen“.</p>'; return; }
      if (v == null) { $('#cmtChips').innerHTML = ''; $('#cmtSum').innerHTML = ''; $('#cmtBody').innerHTML = '<p class="muted">Klicke links bei einer Zeile auf die Versnummer.</p>'; return; }
      // Kommentare zu diesem Vers, nach Kommentator gruppiert
      const groupsC = new Map();
      for (const x of reader.links) {
        if (x.type !== 'commentary' || !(x.v1 > 0 && (whole || (v >= x.v1 && v <= x.v2)))) continue;
        const book = splitOther(x.other);
        const name = book.replace(/ on .*$/i, '');
        if (!groupsC.has(name)) groupsC.set(name, { name, book, refs: [], vOf: new Map() });
        const g0 = groupsC.get(name); if (!g0.vOf.has(x.other)) { g0.refs.push(x.other); g0.vOf.set(x.other, x.v1); }
      }
      if (whole) for (const g0 of groupsC.values()) g0.refs.sort((a, b) => g0.vOf.get(a) - g0.vOf.get(b)); // im ganzen Kapitel nach Versen
      const local0 = reader.localTitles(); const local = { has: b => local0.has(b) || local0.has(String(b).split(', ')[0]) };
      const listPrio = [...groupsC.values()].sort((a, b) => {
        const ia = CMT_PRIO.indexOf(a.name), ib = CMT_PRIO.indexOf(b.name);
        return (local.has(b.book) - local.has(a.book)) || ((ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)) || (b.refs.length - a.refs.length);
      });
      // Anzeige in der Reihenfolge der Bibliotheksliste links; die Rangfolge oben gilt nur für die Vorauswahl
      const byT = new Map(reader.groups.map(g => [g.title, g]));
      const titleToGroup = t => byT.get(t) || byT.get(String(t).split(', ')[0]) || null;
      const list = [...listPrio].sort((a, b) => libCmpGroups(titleToGroup(a.book), titleToGroup(b.book)) || titleCmp(a.book, b.book) || String(a.name).localeCompare(String(b.name)));
      if (!list.length) { $('#cmtChips').innerHTML = ''; $('#cmtSum').innerHTML = ''; $('#cmtBody').innerHTML = '<p class="muted">Zu diesem Vers gibt es keine Kommentare in den Verknüpfungen.</p>'; return; }
      // Nur Kommentatoren zählen als „vorhanden“, die lokal in der gewählten Sprache vorliegen (sonst wirkt die Liste vollständiger, als sie ist)
      const byTitle = byT;
      const LNm = { en: 'Englisch', de: 'Deutsch', he: 'Hebräisch' }[selection.lang];
      const hasLang = b => { const g = byTitle.get(b) || byTitle.get(String(b).split(', ')[0]); return !!g && g.versions.some(v => v.kind === selection.lang); };
      const avail = { has: b => local.has(b) && hasLang(b) };
      // Auswahl: gemerkte Kommentatoren; beim ersten Mal die bekanntesten vorhandenen
      selection.availableNames = list.filter(g => avail.has(g.book)).map(g => g.name);
      let chosen = selection.all ? list.filter(g => avail.has(g.book)) : list.filter(g => selection.selected.has(g.name) && avail.has(g.book));
      if (!selection.touched) { const pre = new Set(listPrio.filter(g => avail.has(g.book)).slice(0, 2)); chosen = list.filter(g => pre.has(g)); }
      selection.lastChosen = chosen.map(g => g.name);
      const showAll = (selection.touched && selection.all) || (!selection.touched && !chosen.length); // „Alle“ (oder nichts Vorausgewähltes): alle in dieser Sprache vorhandenen Kommentare zeigen
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
      $('#cmtSum').textContent = `${I18N.t('Kommentatoren')}: ${chosen.length} ${selection.chipsOpen ? '▴' : '▾'}`;
      $('#cmtSum').setAttribute('aria-expanded', String(selection.chipsOpen));
      { const detail = document.createElement('span'); detail.innerHTML = sumTxt; $('#cmtSum').title = detail.textContent; }
      $('#cmtChips').hidden = !selection.chipsOpen;
      $('#cmtChips').innerHTML = `<div class="cq"><button data-q="all">Alle</button><button data-q="none">Keine</button><button data-q="classic" title="Rashi, Ibn Ezra, Ramban …">Klassische</button><input id="cmtFilter" type="search" placeholder="Name filtern …" value="${esc(selection.filter)}" autocomplete="off"></div>`
        + localL.map(chip).join('')
        + (noLangL.length ? `<details><summary>${noLangL.length} lokal, aber nicht auf ${LNm}</summary><div>${noLangL.map(chip).join('')}</div></details>` : '')
        + (remoteL.length ? `<details><summary>${remoteL.length} nicht in deiner Bibliothek</summary><div>${remoteL.map(chip).join('')}</div></details>` : '');
      selection.applyFilter();
      if (!chosen.length) { $('#cmtBody').innerHTML = '<p class="muted">Wähle oben einen Kommentator. Grau dargestellte Kommentatoren musst du erst im Reiter „Herunterladen“ laden.</p>'; return; }
      $('#cmtBody').innerHTML = '<p class="muted">Lade …</p>';
      const refs = chosen.flatMap(g => g.refs);
      const res = await LK.texts(refs, selection.lang, true);
      if (token !== cmtToken) return; // inzwischen anderer Vers
      const LN = { en: 'Englisch', de: 'Deutsch', he: 'Hebräisch' }[selection.lang];
      const hasTxt = g => g.refs.some(r => res[r] && res[r].items);
      const gaps = showAll ? chosen.filter(g => !hasTxt(g)) : []; // ohne Auswahl: Kommentatoren ohne Text in dieser Sprache nur als Hinweis
      if (showAll) chosen = chosen.filter(hasTxt);
      const gapNote = gaps.length ? `<p class="muted">${I18N.t('Kein ' + { en: 'Englischer', de: 'Deutscher', he: 'Hebräischer' }[selection.lang] + ' Text zu diesem Vers:')} ${gaps.map(g => esc(g.name) + ' ' + (g.refs.every(r => res[r] && res[r].missing) ? I18N.t('(keine Fassung in dieser Sprache geladen)') : I18N.t('(Vers fehlt in der Fassung)'))).join(', ')}</p>` : '';
      if (!chosen.length) { $('#cmtBody').innerHTML = gapNote || `<p class="muted">${I18N.t('Keine lokalen Kommentare in der Sprache {} zu diesem Vers.', LN)}</p>`; return; }
      // Sprungliste zu den einzelnen Kommentatoren: per Rechtsklick im Kommentarbereich
      $('#cmtBody').innerHTML = chosen.map(g => {
        const seenTxt = new Set();
        let partNo = 0;
        const parts = g.refs.map(r => {
          const t = res[r];
          if (!t || !t.items) return `<div class="none">${esc(r)} – ${t && t.missing ? I18N.t('keine Fassung auf {} geladen', LN) : I18N.t('Vers fehlt in der ' + { en: 'Englischen', de: 'Deutschen', he: 'Hebräischen' }[selection.lang] + ' Fassung')}</div>`;
          const he = t.kind === 'he';
          const sig = t.items.join('\u0001'); if (seenTxt.has(sig)) return ''; seenTxt.add(sig); // gleiche Stelle mehrfach verknüpft: nur einmal zeigen
          const vh = whole ? (vn => vn !== g.lastV ? (g.lastV = vn, `<div class="cvn" data-l="${vn}">${esc(I18N.t(page ? 'Segment' : 'Vers'))} ${vn}</div>`) : '')(g.vOf.get(r)) : '';
          return vh + (g.refs.length > 1 && !vh ? `<div class="cpart" data-k="${++partNo}"></div>` : '') + t.items.map(x => {
            // Fußnoten im Kommentar-Bereich: Zeichen im Text, Fußnotentext direkt dahinter (Einstellung „Fußnoten“ wie im Lesetext)
            const sp = R.splitFootnotes(he ? stripHe(x) : x);
            const inl = R.cleanHtml(sp.main).replace(/<sup>.*?<\/sup>/g, '').replace(/<sup data-fn="(\d{1,4})">(.*?)<\/sup>/g, (m, i) => { const n = sp.notes[+i]; return n ? `${m}<span class="note" data-fn="${i}"><span class="nm">${esc(n.marker)}</span> ${R.cleanHtml(n.html)}</span>` : m; });
            return `<div class="ct" dir="${he ? 'rtl' : 'ltr'}">${window.AutoRef.link(inl, { last: '', trad: versOf({ entry: { rel: t.rel, title: g.book, versionTitle: t.versionTitle } }, 'cites'), note: versNoteText })}</div>`;
          }).join('');
        }).join('');
        const cl = cmtClosed.has(g.name);
        return `<div class="cmt${cl ? ' closed' : ''}" data-n="${esc(g.name)}"><h4 data-ref="${esc(g.refs[0])}" title="Klick: Kommentar ein-/ausklappen · ↗: öffnet ${esc(g.book)} in einem neuen Tab · Rechtsklick: weitere Möglichkeiten"><span class="tg">${cl ? '▸' : '▾'}</span> ${(p => p ? `<img class="vpic" src="portraits/${encodeURIComponent(p.img)}" alt="" data-title="${esc(p.name || '')}" loading="lazy">` : '')(portraitOf(g.name) || g.refs.map(r => res[r] && res[r].versionTitle && portraitOf(res[r].versionTitle)).find(Boolean) || portraitOf(g.book))}${esc(dispName(g.name))}${g.refs.length > 1 ? ` <small class="cx" title="Stellen zu diesem Vers">×${g.refs.length}</small>` : ''}<span class="go" title="Buch im neuen Tab öffnen">↗</span></h4>${parts}</div>`;
      }).join('') + gapNote;
      cmtRestoreTop();
      refreshFind(); // Suche im Kommentar-Bereich nach dem Neuaufbau erneuern
    }

    return {
      render: renderCmt,
      topName: cmtTopName,
      get keepName() { return cmtKeepName; },
      set keepName(name) { cmtKeepName = name; },
    };
  }
  return { create };
})();
