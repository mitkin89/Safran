// Wörterbuchoberfläche: Artikel, Wortkarten-Knöpfe, Verlauf, Tabs, Vorschläge,
// Favoriten und Verwaltung. Andocken und Navigation bleiben beim Leser.
window.LibraryDictionary = (() => {
  'use strict';
  function create({ $, esc, heFix, lemIdsFor, portraitOf, loadGM, loadTForms, loadForms,
    openTForms, openGForms, openSForms, openForms, panelScrollTo, lsGet, lsSet,
    getSelection, setSelection, getSource, setDictSrc }) {
    const O = window.offline;
    let dictScheme='',previewToken=0;
    const schemeInput=$('#dictInputScheme'),previewBox=$('#dictInputPreview');
    const validScheme=s=>['sedra4','calcode','leiden'].includes(s)?s:'';
    const readSavedSchemes=()=>new Map(lsGet('dictInputSchemes').filter(x=>Array.isArray(x)&&x.length===2&&typeof x[0]==='string').map(([q,s])=>[q,validScheme(s)]));
    let savedSchemes=readSavedSchemes();
    const saveScheme=(q,s)=>{savedSchemes=readSavedSchemes();savedSchemes.delete(q);savedSchemes.set(q,s);while(savedSchemes.size>200)savedSchemes.delete(savedSchemes.keys().next().value);lsSet('dictInputSchemes',[...savedSchemes]);};
    async function prepare(q,scheme){
      if(!scheme||/[\u0590-\u05ff\u0370-\u03ff\u1f00-\u1fff\u0700-\u074f]/u.test(q))return {queries:[q]};
      const result=(await window.SyriacTransliteration.load()).convert(q,scheme);
      if(result.error)return {error:result.error==='character'?I18N.t('Zeichen „{}“ gehört nicht zu dieser Umschrift.',result.character):I18N.t('Diese Umschrift ist nicht eindeutig umsetzbar.')};
      return result;
    }
    function paintInput(q,scheme,result){
      previewBox.hidden=!scheme||!q;
      previewBox.innerHTML=result.error?esc(result.error):`${esc(I18N.t('Nachschlagen als:'))} ${(result.queries||[]).map(v=>`<bdi lang="syr" dir="rtl">${esc(v)}</bdi>`).join(' / ')}`;
    }
    async function previewInput(){const seq=++previewToken,q=$('#dictQ').value.trim(),scheme=validScheme(schemeInput.value);try{const result=await prepare(q,scheme);if(seq===previewToken)paintInput(q,scheme,result);}catch{if(seq===previewToken){previewBox.hidden=false;previewBox.textContent=I18N.t('Umschrift konnte nicht geladen werden.');}}}
    let dictOnly = null; // { id, name }: Suche nur in diesem Wörterbuch (wird nicht mehr über das Menü gesetzt)
    let dictHist = [], dictPos = -1, dictShown = [];
    function dictNavButtons() { $('#dictBack').disabled = dictPos <= 0; $('#dictFwd').disabled = dictPos >= dictHist.length - 1; }
    function dictCardButtons(head, greekIndex, targumIndex, dictId, html) {
      if(/[\u0710-\u072f]/.test(head)){
        const id=dictId==='7fab63c14df2'?String(html||'').match(/data-sedra-id="(\d+)"/)?.[1]:'';
        return ` <button type="button" class="dwk" data-sy-q="${esc(head)}"${id?` data-sy-id="${id}"`:''}>${esc(I18N.t('Wortkarte'))}</button>`;
      }
      if (dictId === '9ce7ea6c00f1') {
        const ids = targumIndex ? window.TargumForms.dictionaryLemmas(targumIndex, head) : [];
        return ids.map(id => { const lex = targumIndex.L[id][0]; return ` <button type="button" class="dwk" data-tl="${esc(id)}" title="${esc(lex[0] + ' – ' + lex[2])}">${esc(I18N.t('Aramäische Wortkarte'))}${ids.length > 1 ? ': ' + esc(lex[0] + ' – ' + lex[2]) : ''}</button>`; }).join('');
      }
      const ids = lemIdsFor(head);
      if (ids) return ` <button type="button" class="dwk" data-ids="${esc(ids.join(','))}" title="${esc(I18N.t('Wortkarte: Wörterbücher, Verteilung, häufigste Formen, Septuaginta'))}">${esc(I18N.t('Wortkarte'))}</button>`;
      const lemmas = greekIndex ? window.GMorph.dictionaryLemmas(greekIndex, head) : [];
      return lemmas.map(lemma => ` <button type="button" class="dwk" data-gl="${esc(lemma)}" title="${esc(I18N.t('Griechische Wortkarte öffnen'))}">${esc(I18N.t('Wortkarte'))}${lemmas.length > 1 ? ': ' + esc(lemma) : ''}</button>`).join('');
    }
    let dictLookupToken = 0;
    async function dictLookup(q, only = null, fromHist = false, scheme = '') {
      q = String(q || '').trim();
      if (!q) return;
      const token = ++dictLookupToken;
      ++previewToken;dictScheme=validScheme(scheme);schemeInput.value=dictScheme;
      const dictSel = getSelection();
      dictOnly = only;
      dtabs[dcur].title = q;
      renderDtabs();
      if (!fromHist) {
        if (!(dictPos >= 0 && dictHist[dictPos].q === q && (dictHist[dictPos].scheme||'') === dictScheme)) { dictHist = dictHist.slice(0, dictPos + 1); dictHist.push({ q, only, scheme:dictScheme }); dictPos = dictHist.length - 1; }
      }
      dictNavButtons();
      $('#dictQ').value = q;
      if (typeof renderSaved === 'function') renderSaved();
      $('#dictOut').innerHTML = '<p class="muted">Suche …</p>';
      let prepared;
      try{prepared=await prepare(q,dictScheme);}catch{prepared={error:I18N.t('Umschrift konnte nicht geladen werden.')};}
      if(token!==dictLookupToken)return;
      paintInput(q,dictScheme,prepared);
      if(prepared.error){$('#dictOut').innerHTML=`<p class="muted">${esc(prepared.error)}</p>`;return;}
      const results=await Promise.all(prepared.queries.map(query=>O.dictLookup(query,only?only.id:(dictSel&&dictSel.length?dictSel:null),$('#dictFull')&&$('#dictFull').checked)));
      const seen=new Map();for(const answer of results)for(const hit of answer.results||[]){const key=hit.dictId+'\0'+hit.k;if(!seen.has(key)||hit.kind==='exact')seen.set(key,hit);}
      const rank=new Map();for(const hit of seen.values())if(!rank.has(hit.dictId))rank.set(hit.dictId,rank.size);
      const r={results:[...seen.values()].sort((a,b)=>rank.get(a.dictId)-rank.get(b.dictId)||(a.kind===b.kind?0:a.kind==='exact'?-1:1)),error:results.find(x=>x.error)?.error};
      if (token !== dictLookupToken) return;
      if (r.error) { $('#dictOut').innerHTML = `<p class="muted">⚠ ${esc(r.error)}</p>`; return; }
      dictShown = r.results;
      if (!r.results.length) {
        const n = (await O.dictList()).list.length;
        if (token !== dictLookupToken) return;
        $('#dictOut').innerHTML = n ? `<p class="muted">Kein Eintrag für „${esc(q)}“ gefunden.</p>` : '<p class="muted">Es ist noch kein Wörterbuch eingebunden. Öffne unten „Wörterbücher verwalten“ und füge eine DSL-Datei hinzu.</p>';
        return;
      }
      let greekIndex = null;
      if (window.GMorph && r.results.some(x => window.GMorph.GREEK.test(x.head))) {
        try { greekIndex = await loadGM(); } catch { /* Artikel bleiben auch ohne Formenindex lesbar */ }
        if (token !== dictLookupToken) return;
      }
      let targumIndex = null;
      if (window.TargumForms && r.results.some(x => x.dictId === '9ce7ea6c00f1')) {
        try { targumIndex = await loadTForms(); } catch { /* Artikel bleiben auch ohne Formenindex lesbar */ }
        if (token !== dictLookupToken) return;
      }
      const dictSrc = getSource();
      const onlyBar = (dictSrc && dictSrc.q === q && document.documentElement.dataset.tab !== 'dict' ? `<div class="dsrc muted">aus <a href="#" title="Zur Stelle im Text">${esc(dictSrc.ref)}</a></div>` : '')
        + (dictOnly ? `<div class="donly muted">Nur in: <b>${esc(dictOnly.name)}</b> · <a class="dall">alle Wörterbücher</a></div>` : '');
      // pro Wörterbuch ein eigener Abschnitt mit Titelleiste und Farbe; jeder Treffer als eigene Karte
      const hue = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
      const cnt = {}; r.results.forEach(x => { cnt[x.dictId] = (cnt[x.dictId] || 0) + 1; });
      let last = null;
      $('#dictOut').innerHTML = onlyBar + r.results.map((x, i) => {
        let sec = '';
        if (x.dictId !== last) { last = x.dictId; sec = `<div class="dsec" style="--dh:${hue(x.dictId)}"><span>${(p => p ? `<img class="vpic" src="portraits/${encodeURIComponent(p.img)}" alt="" data-title="${esc(p.name || '')}" loading="lazy">` : '')(portraitOf(x.dict))}${esc(x.dict)}</span><span class="dsr"><button type="button" class="dlist" data-id="${esc(x.dictId)}" data-name="${esc(x.dict)}" title="Alle Stichwörter dieses Wörterbuchs als Liste">☰ Stichwörter</button><small>${cnt[x.dictId]} Treffer</small></span></div>`; }
        return `${sec}<div class="dentry" id="dentry${i}" style="--dh:${hue(x.dictId)}"><div class="dhead"><b dir="auto"${/[\u0710-\u072f]/.test(x.head)?' lang="syr"':''}>${esc(x.head)}</b>${dictCardButtons(x.head, greekIndex, targumIndex, x.dictId, x.html)}${x.note ? ` <span class="muted">${esc(x.note)}</span>` : ''}</div><div class="dbody" dir="ltr">${heFix(/Gesenius/.test(x.dict || '') && window.GAbk ? window.GAbk.mark(x.html) : x.html)}</div></div>`;
      }).join('');
      $('#dictOut').scrollTop = 0;
    }
    $('#dictOut').addEventListener('click', async e => {
      const b = e.target.closest('.dwk'); if (!b) return;
      if(b.dataset.syQ){openSForms(b.dataset.syQ,{id:b.dataset.syId},'card');return;}
      if (b.dataset.tl) { openTForms(b.dataset.tl, null, 'card'); return; }
      if (b.dataset.gl) { openGForms(b.dataset.gl, null, 'card'); return; }
      let ids = b.dataset.ids.split(',');
      if (ids.length > 1) { // mehrere gleich geschriebene Lemmata: das häufigste nehmen
        try { const D = await loadForms(); let best = -1; for (const id of ids) { const m = window.Forms.model(D, id), n = m ? m.total : 0; if (n > best) { best = n; ids = [id]; } } } catch { ids = [ids[0]]; }
      }
      openForms(ids[0], null, 'card');
    });
    const dictGoHist = d => { const k = dictPos + d; if (k < 0 || k >= dictHist.length) return; dictPos = k; dictLookup(dictHist[k].q, dictHist[k].only, true, dictHist[k].scheme); };
    // Mehrere Wörterbuch-Tabs – nur im Reiter „Wörterbuch“ sichtbar (die Seitenleiste beim Lesen hat immer nur eine Suche)
    const dtabs = [{ title: 'Neu' }];
    let dcur = 0;
    const dtabSave = () => {
      const t = dtabs[dcur];
      Object.assign(t, { q: $('#dictQ').value, scheme:validScheme(schemeInput.value), only: dictOnly, hist: dictHist, pos: dictPos, shown: dictShown, html: $('#dictOut').innerHTML, scroll: $('#dictOut').scrollTop });
    };
    const dtabLoad = () => {
      ++dictLookupToken;
      const t = dtabs[dcur];
      dictOnly = t.only || null; dictHist = t.hist || []; dictPos = t.pos == null ? -1 : t.pos; dictShown = t.shown || [];
      $('#dictQ').value = t.q || '';dictScheme=validScheme(t.scheme);schemeInput.value=dictScheme;previewInput();
      $('#dictOut').innerHTML = t.html || '<p class="muted">Gib ein Wort ein.</p>';
      $('#dictOut').scrollTop = t.scroll || 0;
      dictNavButtons();
      renderDtabs();
    };
    function renderDtabs() {
      $('#dictTabs').innerHTML = dtabs.map((t, i) => `<span class="dtab${i === dcur ? ' active' : ''}" data-i="${i}" title="${esc(t.title)}"><span class="dtt">${esc(t.title)}</span>${dtabs.length > 1 ? '<button class="dtx" title="Tab schließen">✕</button>' : ''}</span>`).join('') + '<button id="dtabNew" title="Neuer Wörterbuch-Tab">+</button>';
    }
    const dtabGo = i => { if (i === dcur || !dtabs[i]) return; dtabSave(); dcur = i; dtabLoad(); };
    const dtabAdd = () => { dtabSave(); dcur = Math.min(dcur + 1, dtabs.length); dtabs.splice(dcur, 0, { title: 'Neu' }); dtabLoad(); $('#dictQ').focus(); };
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
      const hideSug = () => { clearTimeout(sugTimer);++sugSeq;box.hidden = true; sugItems = []; sugSel = -1; };
      const paint = () => { box.innerHTML = sugItems.map((x, i) => `<div class="sg${i === sugSel ? ' on' : ''}" data-i="${i}"><b dir="auto">${esc(x.head)}</b><small>${esc(x.dict)}</small></div>`).join(''); box.hidden = !sugItems.length; };
      const pick = i => { const x = sugItems[i]; if (!x) return; hideSug(); $('#dictQ').value = x.head; manualSearch(x.head); };
      $('#dictQ').addEventListener('input', () => {
        clearTimeout(sugTimer);++sugSeq;previewInput();
        const v = $('#dictQ').value.trim();
        if (!v) { hideSug(); return; }
        sugTimer = setTimeout(async () => {
          const my = ++sugSeq;
          const scheme=validScheme(schemeInput.value);
          let prepared;try{prepared=await prepare(v,scheme);}catch{prepared={error:true};}
          if(my!==sugSeq||$('#dictQ').value.trim()!==v||scheme!==schemeInput.value)return;
          if(prepared.error){hideSug();return;}
          const answers=await Promise.all(prepared.queries.map(q=>O.dictSuggest(q))),seen=new Map();
          for(const answer of answers)for(const hit of answer.list||[])seen.set(hit.dict+'\0'+hit.head,hit);
          const r={list:[...seen.values()]};
          if (my !== sugSeq || $('#dictQ').value.trim() !== v || schemeInput.value!==scheme) return; // veraltete Antwort
          sugItems = r.list || []; sugSel = -1; paint();
        }, 80);
      });
      $('#dictQ').addEventListener('keydown', e => {
        if (box.hidden) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sugSel = (sugSel + (e.key === 'ArrowDown' ? 1 : -1) + sugItems.length + 1) % (sugItems.length + 1); if (sugSel === sugItems.length) sugSel = -1; paint(); }
        else if (e.key === 'Enter' && sugSel >= 0) { e.preventDefault(); e.stopImmediatePropagation(); pick(sugSel); }
        else if (e.key === 'Enter') { hideSug(); } // Enter ohne gewählten Vorschlag: nachschlagen (siehe unten), Vorschläge schließen
        else if (e.key === 'Escape') { e.preventDefault();e.stopImmediatePropagation();hideSug(); }
      }, true);
      box.addEventListener('mousedown', e => { const r = e.target.closest('.sg'); if (r) { e.preventDefault(); pick(+r.dataset.i); } });
      $('#dictQ').addEventListener('blur', () => setTimeout(hideSug, 120));
      $('#dictGo').addEventListener('click', hideSug);
    }
    // „Erster Buchstabe weg“: Präfix (בְּ, וְ, הַ …) abschneiden und neu nachschlagen, beliebig oft
    $('#dictCut').onclick = () => {
      const q = $('#dictQ').value.trim().replace(/^[^\p{L}]*\p{L}\p{M}*/u, '');
      if (q) manualSearch(q);
    };
    $('#dictBack').onclick = () => dictGoHist(-1);
    $('#dictFwd').onclick = () => dictGoHist(1);
    // Schriftgröße des Wörterbuchs (wird gemerkt)
    let dfs = 15;
    try { dfs = Math.min(26, Math.max(10, +localStorage.getItem('dictFs') || 15)); } catch { /* egal */ }
    const applyDfs = () => { $('#dictPanel').style.setProperty('--dict-fs', dfs + 'px'); try { localStorage.setItem('dictFs', String(dfs)); } catch { /* egal */ } };
    applyDfs();
    $('#dictFsMinus').onclick = () => { dfs = Math.max(10, dfs - 1); applyDfs(); };
    $('#dictFsPlus').onclick = () => { dfs = Math.min(26, dfs + 1); applyDfs(); };
    // zu einem Artikel der aktuellen Trefferliste springen
    function dictJump(i) {
      const el = $('#dentry' + i);
      if (!el) return;
      panelScrollTo(el, 'start');
      el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200);
    }
    async function renderDictList() {
      const r = await O.dictList(), list = r.list || [];
      let dictSel = getSelection();
      if (dictSel) { dictSel = dictSel.filter(id => list.some(d => d.id === id)); if (!dictSel.length) dictSel = null; }
      setSelection(dictSel);
      $('#dictList').innerHTML = list.length ? list.map((d, i) => `<div class="dli"><label class="dsl"><input type="checkbox" data-id="${esc(d.id)}"${!dictSel || dictSel.includes(d.id) ? ' checked' : ''}>${(p => p ? `<img class="vpic" src="portraits/${encodeURIComponent(p.img)}" alt="" data-title="${esc(p.name || '')}" loading="lazy">` : '')(portraitOf(d.name))}<span class="dsn">${esc(d.name)}</span><small>${d.count.toLocaleString(I18N.loc)}</small></label><span class="dbtns"><button data-mv="-1" data-id="${esc(d.id)}" title="Nach oben (wird zuerst angezeigt)"${i === 0 ? ' disabled' : ''}>▲</button><button data-mv="1" data-id="${esc(d.id)}" title="Nach unten"${i === list.length - 1 ? ' disabled' : ''}>▼</button><button data-rm="1" data-id="${esc(d.id)}" title="Wörterbuch entfernen">✕</button></span></div>`).join('') : '<p class="muted">Noch keine Wörterbücher.</p>';
      const B = $('#dictSelB'); if (B) B.innerHTML = `📚<span class="cl"> ${dictSel ? esc(dictSel.length + ' von ' + list.length) : esc(I18N.t('Alle Wörterbücher'))}</span> ▾`;
    }
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
    const manualSearch = (q, only = null) => {
      q = String(q || '').trim();
      const dictSrc = getSource();
      if (!dictSrc || dictSrc.q !== q) setDictSrc(null);
      syncSaved();
      if (q) { dRecent = [q, ...dRecent.filter(x => x !== q)].slice(0, 30); lsSet('dictRecent', dRecent); }
      const scheme=validScheme(schemeInput.value);saveScheme(q,scheme);dictLookup(q, only, false, scheme); renderSaved();
    };
    schemeInput.addEventListener('change',()=>{++previewToken;$('#dictSug').hidden=true;const q=$('#dictQ').value.trim();if(q)manualSearch(q,dictOnly);else previewInput();});
    $('#dictStar').onclick = () => {
      const q = $('#dictQ').value.trim(); if (!q) return;
      syncSaved();saveScheme(q,dictScheme);
      dFavs = dFavs.includes(q) ? dFavs.filter(x => x !== q) : [q, ...dFavs];
      lsSet('dictFavs', dFavs); renderSaved();
    };
    $('#dictRecentClear').onclick = () => { syncSaved(); dRecent = []; lsSet('dictRecent', dRecent); renderSaved(); };
    $('#dictSaved').addEventListener('click', e => {
      const rm = e.target.closest('button[data-rm]');
      if (rm) { syncSaved(); const fav = !!rm.closest('#dictFavL'); const a = fav ? dFavs : dRecent; a.splice(+rm.dataset.rm, 1); lsSet(fav ? 'dictFavs' : 'dictRecent', a); renderSaved(); return; }
      const a = e.target.closest('a[data-w]'); if (a) dictLookup(a.dataset.w,null,false,readSavedSchemes().get(a.dataset.w)||'');
    });
    $('#dictQ').addEventListener('input', renderSaved);
    renderSaved();
    { const fb = $('#dictFull'); // Volltextsuche (Artikeltext) ein/aus, wird gemerkt
      try { fb.checked = localStorage.getItem('dictFull') === '1'; } catch { /* egal */ }
      fb.addEventListener('change', () => { try { localStorage.setItem('dictFull', fb.checked ? '1' : '0'); } catch { /* egal */ } const q = $('#dictQ').value.trim(); if (q) dictLookup(q, dictOnly, false, dictScheme); }); }
    { // Auswahl der Wörterbücher: Häkchen je Wörterbuch, wird gemerkt
      const B = $('#dictSelB'), Pn = $('#dictSelP');
      const paint = renderDictList;
      const save = () => { try { localStorage.setItem('dictSel', JSON.stringify(getSelection() || null)); } catch { /* egal */ } };
      const place=()=>{if(Pn.hidden)return;const r=B.getBoundingClientRect(),width=Math.min(520,innerWidth-16);Object.assign(Pn.style,{position:'fixed',minWidth:'0',width:width+'px',maxWidth:'none',left:Math.max(8,Math.min(r.left,innerWidth-width-8))+'px',top:(r.bottom+2)+'px',maxHeight:Math.max(100,Math.min(340,innerHeight-r.bottom-14))+'px',boxSizing:'border-box'});};
      B.onclick = async e => { e.stopPropagation(); if (Pn.hidden) { await paint(); Pn.hidden = false;place(); } else Pn.hidden = true; };
      window.addEventListener('resize',place);

      document.addEventListener('click', e => { if (!Pn.hidden && !Pn.contains(e.target) && e.target !== B && document.body.contains(e.target)) Pn.hidden = true; });
      Pn.addEventListener('click', async e => {
        const a = e.target.closest('a[data-a]');
        if (a) { setSelection(null); if (a.dataset.a === 'none') { Pn.querySelectorAll('input').forEach(i => { i.checked = false; }); return; } save(); await paint(); const q = $('#dictQ').value.trim(); if (q) dictLookup(q, dictOnly, false, dictScheme); }
      });
      Pn.addEventListener('change', async e => {
        const ids = [...Pn.querySelectorAll('input')].filter(i => i.checked).map(i => i.dataset.id), all = Pn.querySelectorAll('input').length;
        setSelection(ids.length && ids.length < all ? ids : null); save(); renderDictList();
        const q = $('#dictQ').value.trim(); if (q) dictLookup(q, dictOnly, false, dictScheme);
      });
      paint();
    }

    { // Stichwortliste eines Wörterbuchs (Knopf in der farbigen Titelleiste): filtern, Klick = nur in diesem Wörterbuch nachschlagen
      let pop = null, cur = null, all = [], shown = [], pos = 0;
      const CH = 300;
      const close = () => { if (pop) pop.hidden = true; };
      const more = () => { const box = pop.querySelector('.dhl'); const end = Math.min(shown.length, pos + CH); let h = ''; for (let i = pos; i < end; i++) h += `<div class="dhi" dir="auto" data-w="${esc(shown[i])}">${esc(shown[i])}</div>`; box.insertAdjacentHTML('beforeend', h); pos = end; pop.querySelector('.dhc').textContent = `${shown.length.toLocaleString(I18N.loc)} von ${all.length.toLocaleString(I18N.loc)}`; };
      const refilter = () => {
        const q = pop.querySelector('input').value.trim().normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f]/g, '').replace(/[ךםןףץ]/g, c => ({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }[c])).toLowerCase();
        shown = q ? all.filter(h => h.normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f]/g, '').replace(/[ךםןףץ]/g, c => ({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }[c])).toLowerCase().includes(q)) : all;
        pos = 0; pop.querySelector('.dhl').innerHTML = ''; pop.querySelector('.dhl').scrollTop = 0; more();
      };
      $('#dictOut').addEventListener('click', async e => {
        const b = e.target.closest('.dlist'); if (!b) return;
        e.stopPropagation();
        if (!pop) {
          pop = document.createElement('div'); pop.id = 'dheadPop'; pop.hidden = true;
          pop.innerHTML = '<div class="dht"><b></b><button type="button" class="dhx" title="Schließen">✕</button></div><input type="search" placeholder="Stichwörter filtern …" autocomplete="off"><div class="dhc muted"></div><div class="dhl"></div>';
          document.body.appendChild(pop);
          pop.querySelector('.dhx').onclick = close;
          pop.querySelector('input').addEventListener('input', refilter);
          pop.querySelector('.dhl').addEventListener('scroll', ev => { const l = ev.target; if (pos < shown.length && l.scrollTop + l.clientHeight > l.scrollHeight - 200) more(); });
          pop.querySelector('.dhl').addEventListener('click', ev => { const it = ev.target.closest('.dhi'); if (!it || !cur) return; const w = it.dataset.w; close(); manualSearch(w); });
          document.addEventListener('click', ev => { if (pop && !pop.hidden && !pop.contains(ev.target) && !ev.target.closest('.dlist')) close(); });
          document.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); });
        }
        if (!pop.hidden && cur && cur.id === b.dataset.id) { close(); return; }
        cur = { id: b.dataset.id, name: b.dataset.name };
        pop.querySelector('.dht b').textContent = cur.name; pop.querySelector('input').value = '';
        pop.querySelector('.dhl').innerHTML = '<p class="muted">Lade …</p>'; pop.hidden = false;
        /* feste Größe und Lage (unabhängig vom Knopf) – siehe CSS */
        all = (await O.dictHeads(cur.id)).list || []; refilter(); pop.querySelector('input').focus();
      }, true);
    }
    $('#dictGo').onclick = () => manualSearch($('#dictQ').value);
    $('#dictQ').addEventListener('keydown', e => { if (e.key === 'Enter') manualSearch($('#dictQ').value); });
    $('#dictAdd').onclick = async () => {
      const r = await O.dictAdd();
      if (r.cancelled) return;
      await renderDictList();
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
        if (dictHist[dictPos]) dictLookup(dictHist[dictPos].q, dictHist[dictPos].only, true, dictHist[dictPos].scheme);
        return;
      }
      const b = e.target.closest('button[data-rm]');
      if (!b || !confirm('Dieses Wörterbuch aus Safran entfernen? Deine DSL-Datei bleibt unberührt.')) return;
      const r = await O.dictRemove(b.dataset.id);
      if (r.error) alert(r.error);
      await renderDictList();
    });


    return {
      lookup: dictLookup,
      renderList: renderDictList,
      renderSaved,
      addTab: dtabAdd,
      jump: dictJump,
      getShown: () => dictShown,
    };
  }
  return { create };
})();
