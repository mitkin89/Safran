// Katalog-, Download- und Aktualisierungsoberfläche, ein Zustand je Lesefenster.
// Der eigentliche Download/Index bleibt im Hauptprozess. Nach Änderungen wird
// der Leser ausschließlich über die übergebenen Rückrufe aktualisiert.
window.LibraryDownloads = (() => {
  'use strict';
  function create({ $, $$, esc, fmtSize, refreshState, loadLibrary }) {
    const O = window.offline;
    const fmtEst = mb => (mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : Math.round(mb) + ' MB');
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

    $('#pickAll').onclick = () => { for (const s of summary) { if (s.cats.length) selCats.add(s.cats[0]); else selIds.add(s.id); } refreshChecks(); schedulePlan(); };
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
      const stale = res.failed.filter(f => /HTTP 404/.test(f.error)), bad = res.failed.filter(f => !/HTTP 404/.test(f.error));
      $('#dWarn').innerHTML = (bad.length ? `<p class="err">${bad.length} Dateien konnten nicht geladen werden (erneut „Herunterladen“ versucht es noch einmal):</p><ul>${bad.slice(0, 20).map(f => `<li>${esc(f.title)} (${esc(f.versionTitle)}): ${esc(f.error)}</li>`).join('')}</ul>` : '') +
        (stale.length ? `<p class="muted">${stale.length} Einträge sind im Sefaria-Katalog veraltet (Datei dort nicht mehr vorhanden, vermutlich umbenannt) und wurden übersprungen:</p><ul class="muted">${stale.slice(0, 20).map(f => `<li>${esc(f.title)} (${esc(f.versionTitle)})</li>`).join('')}</ul>` : '');
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


    return { refreshCatalog };
  }
  return { create };
})();
