// Kommentatorenauswahl: Sprache, gemerkte Auswahl, Schnellauswahl und Namensfilter.
// Jeder Leser besitzt seine eigene Instanz; die Auswahl wird pro Sprache gespeichert.
window.LibraryCommentSelection = (() => {
  'use strict';
  function create({ $, $$, CMT_PRIO, renderCmt }) {
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
    $('#cmtLang').onchange = () => {
      saveCmt(); // Auswahl der bisherigen Sprache sichern
      cmtLang = $('#cmtLang').value;
      const s0 = cmtByLang[cmtLang] || { sel: [], all: false, touched: false };
      cmtSel = new Set(s0.sel || []); cmtAll = !!s0.all; cmtTouched = !!s0.touched; cmtLastChosen = [];
      saveCmt(); renderCmt();
    };
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

    return {
      get touched() { return cmtTouched; },
      get lang() { return cmtLang; },
      get all() { return cmtAll; },
      get selected() { return cmtSel; },
      get chipsOpen() { return cmtChipsOpen; },
      get filter() { return cmtFilterV; },
      get lastChosen() { return cmtLastChosen; },
      set lastChosen(names) { cmtLastChosen = names; },
      get availableNames() { return cmtAvailNames; },
      set availableNames(names) { cmtAvailNames = names; },
      applyFilter: applyCmtFilter,
    };
  }
  return { create };
})();
