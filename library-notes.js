// LibraryNotes: eigener Zustand und explizite Anbindung an den Leser.
window.LibraryNotes = (() => {
  'use strict';
  function create(host) {
  // ---------- Lesezeichen und Notizen ----------
  const NT = window.notes;
  let notesAll = [], workspace = null;
  const quickDraftKey="notesQuickDraft";
  const noteTags = n => (Array.isArray(n.tags) ? n.tags : []);
  const kindOf = n => n.kind || 'row'; // 'row' = Lesezeichen an einer Zeile, 'free' = freie Notiz ('hl' = frühere Farbmarkierungen: bleiben in der Datei, werden aber nicht mehr angezeigt)
  const newId = p => p + '|' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const topOrder = () => Math.min(0, ...notesAll.map(n => (n.order == null ? 0 : n.order))) - 1;
  const plain = h => host.R.cleanHtml(host.R.splitFootnotes(h).main).replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  // Ältere Notizen ohne hebräischen Text: einmal aus der hebräischen Version nachtragen
  const heTried = new Set();
  async function backfillHe() {
    let changed = false;
    for (const n of notesAll) {
      if (kindOf(n) !== 'row' || n.he || heTried.has(n.id)) continue;
      heTried.add(n.id);
      try {
        const g = host.groupsByKey.get(n.key); const v = g && g.versions.find(x => x.kind === 'he');
        if (!v) continue;
        let d = host.cache.get(v.rel); if (!d) { d = await host.O.read(v.rel); d.__b = v.bytes || 2e6; host.cache.set(v.rel, d); }
        const row = host.R.flattenNode(host.R.getByPath(d.text, JSON.parse(n.sk))).find(r => r.label === n.row);
        const he = row ? plain(row.html).slice(0, 200) : '';
        if (/[\u0590-\u05FF]/.test(he)) { await NT.save({ ...n, he, keepTs: true, expectedTs:n.ts||0 }); changed = true; }
      } catch { /* egal */ }
    }
    if (changed) { notesAll = await NT.list(); renderNotes(); }
  }
  // Anzeige je Favorit: welche Versionen des Buchs gezeigt werden (Chips, ein Klick schaltet um)
  const ntTxt = new Map(), ntOpen = new Set(); let ntTimer = null;
  const NV = ['he', 'en', 'de'];
  const noteVers = g => (g ? g.versions.filter(v => NV.includes(v.kind)) : []);
  const defaultVr = vers => { const f = k => vers.find(v => v.kind === k); return [f('he'), f('en') || f('de')].filter(Boolean).map(v => v.rel); };
  async function ensureNoteText(n, rel) {
    const key = n.id + '|' + rel;
    if (ntTxt.has(key)) return;
    ntTxt.set(key, null);
    let txt = '';
    try {
      const v = host.groupsByKey.get(n.key).versions.find(x => x.rel === rel);
      let d = host.cache.get(rel); if (!d) { d = await host.O.read(rel); d.__b = (v && v.bytes) || 2e6; host.cache.set(rel, d); }
      const all = host.R.flattenNode(host.R.getByPath(d.text, JSON.parse(n.sk)));
      if (kindOf(n) === 'block') {
        const want = new Set(n.set || []);
        txt = all.filter(r => { const v = host.rowVerse(r.label); return !want.size || (v != null && want.has(v)); }).map(r => `${r.label} ${plain(r.html)}`).join('\n').slice(0, 1500);
      } else { const row = all.find(r => r.label === n.row); txt = row ? plain(row.html).slice(0, 400) : ''; }
    } catch { /* egal */ }
    ntTxt.set(key, txt);
    clearTimeout(ntTimer); ntTimer = setTimeout(renderNotes, 60);
  }
  function noteBody(n) {
    const g = host.groupsByKey.get(n.key), vers = noteVers(g);
    if (!vers.length) return `${n.he ? `<div class="ex he" dir="rtl">${host.esc(n.he)}</div>` : ''}${n.excerpt ? `<div class="ex">${host.esc(n.excerpt)}</div>` : ''}`;
    const sel = n.vr || defaultVr(vers);
    const on = vers.filter(v => sel.includes(v.rel)), open = ntOpen.has(n.id);
    const chips = on.map(v => `<button class="vchip ${v.kind} on" data-vr="${host.esc(v.rel)}" title="${host.esc(host.shortVer(v.versionTitle))} – ${host.esc(I18N.t('Klicken: ausblenden'))}">${host.esc(host.shortVer(v.versionTitle).slice(0, 22))} ✕</button>`).join('')
      + `<button class="vmore" data-vopen="1" title="${host.esc(I18N.t('Versionen auswählen'))}">${host.esc(I18N.t('Versionen'))} ${on.length}/${vers.length} ${open ? '▴' : '▾'}</button>`;
    const list = open ? `<div class="vlist">${['he', 'en', 'de'].map(k => { const vs = vers.filter(v => v.kind === k); return vs.length ? `<div class="vgrp">${host.esc(host.KIND_LABEL[k])}</div>${vs.map(v => `<button class="vrow${sel.includes(v.rel) ? ' on' : ''}" data-vr="${host.esc(v.rel)}"><span class="ck">${sel.includes(v.rel) ? '☑' : '☐'}</span> ${host.esc(host.shortVer(v.versionTitle))}</button>`).join('')}` : ''; }).join('')}</div>` : '';
    const body = vers.filter(v => sel.includes(v.rel)).map(v => {
      ensureNoteText(n, v.rel);
      const t = ntTxt.get(n.id + '|' + v.rel);
      if (!t) return '';
      const he = /[\u0590-\u05FF]/.test(t);
      return `<div class="ex${he ? ' he' : ''}" dir="${he ? 'rtl' : 'ltr'}" style="white-space:pre-line">${host.esc(t)}</div>`;
    }).join('');
    return `<div class="vchips">${chips}</div>${list}${body}`;
  }
  // Notizen-Aufrufe absichern: bei einem Fehler (z. B. beschädigte Datei) wird gemeldet statt still nichts zu tun
  async function ntDo(fn) {
    try { return await fn(); } catch (e) {
      const m = String((e && e.message) || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, '');
      alert(I18N.t('Die Notizen konnten nicht gespeichert werden:') + '\n' + m);
      return null;
    }
  }
  // Gelöscht-Hinweis mit „Rückgängig“
  let undoT = null;
  function showUndo(n, msg) {
    let bar = host.$('#undoBar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'undoBar'; document.body.appendChild(bar); }
    bar.innerHTML = `<span>${host.esc(I18N.t(msg || 'Notiz gelöscht'))}</span> <button type="button">${host.esc(I18N.t('Rückgängig'))}</button>`;
    bar.classList.add('on');
    clearTimeout(undoT); undoT = setTimeout(() => bar.classList.remove('on'), 10000);
    bar.querySelector('button').onclick = async () => {
      bar.classList.remove('on'); clearTimeout(undoT);
      const r = await ntDo(() => NT.save({ ...n, keepTs: true }));
      if (r) { notesAll = r; refreshNotes(); }
    };
  }
  async function removeNote(id) {
    const n = notesAll.find(x => x.id === id);
    const r = await ntDo(() => NT.remove(id));
    if (r) { notesAll = r; refreshNotes(); if (n) showUndo(n); }
  }
  // Cmd/Strg+Z, solange die Rückgängig-Leiste zu sehen ist
  document.addEventListener('keydown', e => {
    const bar = host.$('#undoBar');
    if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z' || !bar || !bar.classList.contains('on')) return;
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    e.preventDefault(); bar.querySelector('button').click();
  });
  async function loadNotes() { try { notesAll = await NT.list(); if(workspace)await workspace.refresh();else renderNotes();markNotes();backfillHe(); }catch(e){workspace?.renderList();const el=host.$('#nwStatus')||host.$('#nCount');el.textContent='Notizen konnten nicht geladen werden: '+String(e.message||e);el.setAttribute('role','alert');} }
  function markNotes() {
    { const bl = new Set(notesAll.filter(n => kindOf(n) === 'block').map(n => n.id)); host.$$('#passOut .pstar').forEach(b => { const on = bl.has(b.dataset.id); b.textContent = on ? '★' : '☆'; b.classList.toggle('on', on); }); }
    if (!host.view || !host.view.group) return;
    const s = host.view.sections[host.view.idx];
    if (!s) return;
    const blk = new Set(notesAll.filter(n => kindOf(n) === 'block').map(n => n.id));
    const vfs = host.$('#vfStar');
    if (vfs && host.view.vf) { const on = blk.has(host.noteId(host.view.group, s.k, 'blk:' + host.fmtVerses([...host.view.vf.set]))); vfs.textContent = on ? '★' : '☆'; vfs.classList.toggle('on', on); }
    const rowNotes = new Map(notesAll.filter(n => kindOf(n) === 'row').map(n => [n.id, n]));
    host.$$('#rOut .row[data-l]').forEach(r => {
      const nid = host.noteId(host.view.group, s.k, r.dataset.l), nn = rowNotes.get(nid);
      const on = !!nn;
      // der Notiztext steht unter der Zeile (Klick öffnet die Notiz) und als Tooltip am Stern
      let st = r.querySelector(':scope > .rnote');
      if (nn && nn.note) { if (!st) { st = document.createElement('div'); st.className = 'rnote'; r.appendChild(st); } st.textContent = nn.note; st.dataset.id = nid; st.title = I18N.t('Klicken: Notiz bearbeiten'); }
      else if (st) st.remove();
      r.classList.toggle('noted', on);
      const lab = r.querySelector('.lab');
      if (!lab.querySelector('.bm')) lab.insertAdjacentHTML('afterbegin', '<span class="bm" title="Lesezeichen / Notiz">☆</span>');
      const b = lab.querySelector('.bm');
      b.title = nn && nn.note ? nn.note : I18N.t('Lesezeichen / Notiz');
      b.classList.toggle('on', on);
      b.textContent = on ? '★' : '☆';
    });
  }

  // Notiz-Fenster für alle drei Arten
  let editing = null, editingOld = null;
  function openNoteDlg(it, o = {}) {
    editing = structuredClone(it);
    editingOld = notesAll.some(x => x.id === it.id) ? JSON.parse(JSON.stringify(it)) : null; // für „Rückgängig“ beim Überschreiben
    try{const saved=JSON.parse(localStorage.getItem(quickDraftKey)||'null');if(saved?.record?.id===it.id){editing=saved.record;editingOld=saved.base;it=editing;}}catch{}
    const k = kindOf(it);
    host.$('#ndTitle').textContent = k === 'free' ? I18N.t('Eigene Notiz') : `${it.title} · ${it.secLabel} · ${k === 'block' ? (it.vs || I18N.t('ganzes Kapitel')) : it.row}`;
    host.$('#ndExcerpt').textContent = k === 'free' ? '' : [it.he, it.excerpt].filter(Boolean).join('\n');
    host.$('#ndTitleIn').hidden = k !== 'free';
    host.$('#ndTitleIn').value = it.title || '';
    host.$('#ndText').value = it.note || '';
    host.$('#ndTags').value = noteTags(it).join(', ');
    host.$('#ndText').placeholder = I18N.t(k === 'row' ? 'Eigene Notiz (leer lassen = nur Lesezeichen)' : 'Notiz');
    host.$('#ndDel').hidden = !o.canDelete;
    host.$('#ndDel').textContent = I18N.t(k === 'free' ? 'Notiz entfernen' : 'Lesezeichen entfernen');
    host.$('#ndClose').textContent = I18N.t(o.optional ? 'Ohne Notiz' : 'Abbrechen');
    host.$('#noteDlg').showModal();
    (k === 'free' ? host.$('#ndTitleIn') : host.$('#ndText')).focus();
  }
  const refreshNotes = () => { markNotes(); renderNotes(); host.apSoon(); try { if (!host.$('#mapPanel').hidden) { host.mapInfo(); host.mapDraw(); } } catch { /* Karte nicht bereit */ } };
  host.$('#rOut').addEventListener('click', e => {
    const rn = e.target.closest('.rnote');
    if (rn && !window.getSelection().toString()) { const nn = notesAll.find(x => x.id === rn.dataset.id); if (nn) openNoteDlg(nn, { canDelete: true }); return; }
    const b = e.target.closest('.bm');
    if (!b || !host.view || !host.view.group) return;
    const row = b.closest('.row');
    const s = host.view.sections[host.view.idx];
    const label = row.dataset.l;
    const id = host.noteId(host.view.group, s.k, label);
    const old = notesAll.find(n => n.id === id);
    const cells = [...row.querySelectorAll('.cell .txt')];
    const excerpt = cells.length ? plain(cells[Math.min(1, cells.length - 1)].innerHTML.replace(/<span class="note"[\s\S]*?<\/span><\/span>/g, '')).slice(0, 200) : '';
    const clean = c => plain(c.innerHTML.replace(/<span class="note"[\s\S]*?<\/span><\/span>/g, '')).slice(0, 200);
    const heCell = cells.find(c => /[\u0590-\u05FF]/.test(c.textContent));
    const he = heCell ? clean(heCell) : '';
    if (old && !old.he && he) old.he = he;
    openNoteDlg(old || { id, key: host.view.group.key, title: host.view.group.title, sk: s.k, secLabel: s.label, row: label, excerpt, he: he && he !== excerpt ? he : '', note: '', order: topOrder() }, { canDelete: !!old });
  });
  // N im Lesetext: Notiz zur Zeile unter dem Zeiger (oder zur zuletzt gewählten Zeile)
  { let lastRow = null;
    host.$('#rOut').addEventListener('mouseover', e => { const r = e.target.closest('.row[data-l]'); if (r) lastRow = r; });
    document.addEventListener('keydown', e => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.isComposing) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable || document.querySelector('dialog[open]')) return;
      if ((document.documentElement.dataset.tab || 'read') !== 'read' || !host.view || !host.view.group) return;
      const row = lastRow && lastRow.isConnected ? lastRow : host.$$('#rOut .row[data-l]').find(x => x.dataset.l === host.cmtRow);
      const b = row && row.querySelector('.lab .bm');
      if (b) { e.preventDefault(); b.click(); }
    });
  }
  host.$('#ndSave').onclick = async () => {
    editing.note = host.$('#ndText').value.trim();
    { const tg = [...new Set(host.$('#ndTags').value.split(/[,;]/).map(x => x.trim()).filter(Boolean))]; if (tg.length) editing.tags = tg; else delete editing.tags; }
    if (kindOf(editing) === 'free') {
      editing.title = host.$('#ndTitleIn').value.trim();
      if (!editing.note && !editing.title) { host.$('#noteDlg').close(); return; }
    }
    const old = editingOld;
    const r = await ntDo(() => NT.save({...editing,expectedTs:editingOld?.ts||0})); if (!r) return; notesAll = r;try{localStorage.removeItem(quickDraftKey);}catch{}host.$('#noteDlg').close();refreshNotes();if(workspace)await workspace.refresh();
    if (old && old.note && old.note !== editing.note) showUndo(old, 'Notiz geändert');
  };
  host.$('#ndDel').onclick = async () => { const id = editing.id; host.$('#noteDlg').close(); await removeNote(id); };
  host.$('#ndClose').onclick = () => host.$('#noteDlg').close();
  // Enter bleibt ein Zeilenumbruch; Cmd/Strg+S speichert.
  host.$('#ndText').addEventListener('keydown', e => { if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase() === 's' && !e.isComposing) { e.preventDefault(); host.$('#ndSave').click(); } });
  host.$('#ndTitleIn').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); host.$('#ndText').focus(); } });
  { const th = host.$('#uiTheme'); th.value = window.Theme.get(); th.onchange = () => { window.Theme.set(th.value); try { host.O.setTheme && host.O.setTheme(th.value); } catch { /* egal */ } }; try { host.O.setTheme && host.O.setTheme(th.value); } catch { /* egal */ } }
  host.$('#nNew').onclick = () => openNoteDlg({ id: newId('free'), kind: 'free', title: '', note: '', order: topOrder() }, {});

  // Notizen-Reiter: Reihenfolge (manuell per Ziehen oder ▲▼, neueste, nach Farbe, nach Buch) und Farbfilter
  let nfs = 15;
  try { nfs = Math.min(28, Math.max(10, +localStorage.getItem('noteFs') || 15)); } catch { /* egal */ }
  const applyNfs = () => { host.$('#nOut').style.setProperty('--nfs', nfs + 'px'); try { localStorage.setItem('noteFs', String(nfs)); } catch { /* egal */ } };
  applyNfs();
  host.$('#nFsMinus').onclick = () => { nfs = Math.max(10, nfs - 1); applyNfs(); };

  // Sichern / Exportieren / Importieren der Notizen und Favoriten
  host.$('#nIO').onclick = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const items = [
      { label: 'Sicherung speichern (JSON)', fn: () => exportNotes('json') },
      { label: 'Als Markdown speichern', fn: () => exportNotes('md') },
      { label: 'Als Word-Datei speichern', fn: () => exportNotes('doc') },
      { label: 'Als PDF speichern', fn: () => exportNotes('pdf') },
      { sep: true },
      ...[['filtered', 'Nur die angezeigten (gefilterten) Notizen exportieren'], ['noNote', 'Ohne meine Notizen exportieren (Arbeitsblatt)'], ['heOnly', 'Nur Stelle und Hebräisch, ohne Übersetzung']].map(([k, t]) => ({ label: (nExp[k] ? '✓ ' : '\u2003 ') + t, fn: () => { nExp[k] = !nExp[k]; try { localStorage.setItem('nExp', JSON.stringify(nExp)); } catch { /* egal */ } } })),
      { sep: true },
      { label: 'Sicherung einlesen …', fn: importNotes },
    ];
    e.stopPropagation();
    host.ctxShow({ clientX: r.left, clientY: r.bottom + 2, preventDefault() {} }, items);
  };
  let nExp = {}; // Export-Optionen für Markdown/Word/PDF (nicht für die JSON-Sicherung)
  try { nExp = JSON.parse(localStorage.getItem('nExp') || '{}') || {}; } catch { nExp = {}; }
  const lsArr = k => { try { const a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a.filter(x => typeof x === 'string' || (/^search/.test(k) && x && typeof x === 'object' && typeof x.q === 'string')) : []; } catch { return []; } }; // gespeicherte Suchen dürfen auch { q, l, m } sein
  async function exportNotes(fmt) {
    let list = (workspace?workspace.all():notesAll).slice().sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || (b.ts || 0) - (a.ts || 0));
    const day = new Date().toISOString().slice(0, 10);
    if (fmt !== 'json') {
      if (nExp.filtered) list = workspace?workspace.filtered():filteredNotes().list;
      if (nExp.noNote) list = list.filter(n => workspace?window.NotesWorkspaceData.kind(n)!=='free':kindOf(n)!=='free').map(n => ({ ...n, note: '' }));
      if (nExp.heOnly) list = list.map(n => ({ ...n, excerpt: n.he ? '' : n.excerpt }));
      list = list.filter(n => kindOf(n) !== 'hl');
    }
    if (fmt === 'json') {
      await window.api.saveFile(`Safran-Notizen-${day}.json`, JSON.stringify({ app: 'Safran', kind: 'notes', version: workspace?2:1, exported: new Date().toISOString(), items: workspace?hostLegacyBackup():list, ...(workspace?{research:workspace.backup()}:{}), dictFavs: lsArr('dictFavs'), dictRecent: lsArr('dictRecent'), searchFavs: lsArr('searchFavs'), searchRecent: lsArr('searchRecent') }, null, 1));
      return;
    }
    const day2 = new Date().toLocaleDateString(I18N.loc);
    const whereOf = n => { if(n.refs?.length)return n.refs.map(r=>[r.label,r.citation?.edition].filter(Boolean).join(' — ')).join('; ');const k = kindOf(n); return k === 'free' ? '' : [n.title, n.secLabel, k === 'block' ? (n.vs || 'ganzes Kapitel') : n.row].filter(Boolean).join(' · '); };
    if (fmt === 'md') {
      const md = ['# Safran – Notizen und Favoriten', '', `Exportiert am ${day}`, ''];
      for (const n of list) {
        const where = whereOf(n), url = host.noteUrl(n);
        md.push('## ' + (where ? (url ? `[${where}](${url})` : where) : (n.noteTitle||n.title||'Notiz')), '');
        for(const ref of n.refs||[])if(ref.quote&&ref.quote!==n.excerpt)md.push('> '+String(ref.quote).replace(/\n/g,'\n> '),'');
        if (n.he) md.push('> ' + String(n.he).replace(/\n+/g, ' '), '');
        if (n.excerpt) md.push('> ' + String(n.excerpt).replace(/\n+/g, ' '), '');
        if (n.note) md.push(String(n.note), '');
        if (noteTags(n).length) md.push('Tags: ' + noteTags(n).join(', '), '');
        if (n.ts) md.push(`*${new Date(n.ts).toLocaleDateString('de-DE')}*`, '');
      }
      await window.api.saveFile(`Safran-Notizen-${day}.md`, md.join('\n'));
      return;
    }
    // Word / PDF
    const body = list.map(n => {
      const where = whereOf(n), url = host.noteUrl(n);
      return `<div class="n"><h2>${url ? `<a href="${host.esc(url)}">${host.esc(where)}</a>` : host.esc(where || n.noteTitle || n.title || 'Notiz')}</h2>${n.he ? `<p class="he" dir="rtl">${host.esc(n.he)}</p>` : ''}${n.excerpt ? `<p class="ex">${host.esc(n.excerpt)}</p>` : ''}${(n.refs||[]).filter(r=>r.quote&&r.quote!==n.excerpt).map(r=>`<p class="ex" dir="auto">${host.esc(r.quote).replace(/\n/g,'<br>')}</p>`).join('')}${n.note ? `<div class="nt">${window.NotesFormatting.markdown(n.note,true)}</div>` : ''}${noteTags(n).length ? `<p class="ex">Tags: ${host.esc(noteTags(n).join(', '))}</p>` : ''}</div>`;
    }).join('');
    const css = `body{font-family:"Times New Roman",serif;font-size:11pt;line-height:1.45;color:#000}h1{font-size:16pt}h2{font-size:12pt;margin:14pt 0 3pt}h2 a{color:#1a4f9c;text-decoration:none}.he{font-family:"SBL Hebrew","Times New Roman",serif;font-size:14pt;line-height:1.7;margin:2pt 0}.ex{color:#333;margin:2pt 0}.nt{background:#fff6d6;padding:3pt 6pt;margin:3pt 0}.n{page-break-inside:avoid}`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Safran – Notizen</title><style>${css}</style></head><body><h1>Safran – Notizen und Favoriten</h1><p style="font-size:9pt;color:#666">${host.esc(I18N.t('Exportiert am {}', day2))}</p>${body}</body></html>`;
    const r = await host.O.exportSave({ html, format: fmt === 'pdf' ? 'pdf' : 'doc', name: `Safran-Notizen-${day}` });
    if (r && r.error) alert(r.error);
  }
  async function importNotes() {
    const f = await window.api.openFile('json'); if (!f) return;
    let j; try { j = JSON.parse(f.text); } catch { j = null; }
    const items = j && Array.isArray(j.items) ? j.items.filter(x => x && typeof x.id === 'string') : null;
    const extra = j && typeof j === 'object' ? ['dictFavs', 'dictRecent', 'searchFavs', 'searchRecent'].filter(k => Array.isArray(j[k]) && j[k].length) : [];
    if ((!items || !items.length) && !extra.length && !j?.research?.notes?.length) return alert(I18N.t('Diese Datei ist keine Notizsicherung.'));
    // Vorschau: was würde neu, aktualisiert oder bliebe gleich?
    { const have = new Map(notesAll.map(n => [n.id, n])); let nn = 0, nu = 0, ns = 0; const names = [];
      for (const it of items || []) { const c = have.get(it.id); if (!c) { nn++; if (names.length < 6) names.push([it.title, it.secLabel, it.vs || it.row].filter(Boolean).join(' · ') || I18N.t('Eigene Notiz')); } else if ((it.ts || 0) > (c.ts || 0)) nu++; else ns++; }
      const warn = j && j.app && j.app !== 'Safran' ? I18N.t('Achtung: Die Datei stammt nicht aus Safran.') + '\n\n' : '';
      const msg = warn + I18N.t('Aus der Sicherung: {#} neu, {#} aktualisiert, {#} unverändert.', nn, nu, ns) + (names.length ? '\n\n' + I18N.t('Neu zum Beispiel:') + '\n• ' + names.join('\n• ') : '') + '\n\n' + I18N.t('Zusammenführen? Vorhandene bleiben erhalten, nur ältere Fassungen werden ersetzt.');
      if (!confirm(msg+(j.research?.notes?.length?'\nProjektnotizen: '+j.research.notes.length:''))) return; }
    // gespeicherte Wörter und Suchen: Einträge der Sicherung kommen dazu (ohne Doppelte), die vorhandenen bleiben vorn
    { const qOf = x => (typeof x === 'string' ? x : x && typeof x === 'object' && typeof x.q === 'string' ? x.q : ''); // Suchen können auch { q, l, m } sein (mit Sprache und Treffer-Art)
      for (const k of extra) { try { const have = lsArr(k), hq = new Set(have.map(qOf)), obj = /^search/.test(k), add = j[k].filter(x => qOf(x) && (typeof x === 'string' || obj) && !hq.has(qOf(x))).map(x => (typeof x === 'string' ? x : { q: x.q, l: String(x.l || ''), m: String(x.m || '') })); localStorage.setItem(k, JSON.stringify([...have, ...add].slice(0, 200))); } catch { /* egal */ } } }
    if(j.research)await window.research.importNotes(j.research);
    const r = items && items.length ? await ntDo(() => NT.merge(items)) : { items: notesAll, stat: { added: 0, updated: 0, same: 0 } };
    if (!r) return;
    notesAll = r.items;refreshNotes();if(workspace)await workspace.refresh();if (typeof host.renderSaved === 'function') try { host.renderSaved(); } catch { /* egal */ } if (typeof host.renderSearchSaved === 'function') try { host.renderSearchSaved(); } catch { /* egal */ }
    alert(I18N.t('Eingelesen: {#} neu, {#} aktualisiert, {#} unverändert.', r.stat.added, r.stat.updated, r.stat.same));
  }
  host.$('#nFsPlus').onclick = () => { nfs = Math.min(28, nfs + 1); applyNfs(); };
  let nSort = 'manual';
  try { nSort = localStorage.getItem('nSort') || 'manual'; } catch { /* egal */ }
  host.$('#nSort').value = nSort;
  host.$('#nSort').onchange = () => { nSort = host.$('#nSort').value; try { localStorage.setItem('nSort', nSort); } catch { /* egal */ } renderNotes(); };
  const byManual = (a, b) => ((a.order == null ? Infinity : a.order) - (b.order == null ? Infinity : b.order)) || ((b.ts || 0) - (a.ts || 0));
  const manualAll = () => [...notesAll].sort(byManual);
  // Filter: Text, Art, Tag, „nur mit Notiz“
  let nKind = 'all', nOnly = false, nTag = '';
  const secNum = n => { const m = String(n.secLabel || '').match(/(\d+)([ab])?/); return m ? +m[1] * 2 + (m[2] === 'b' ? 1 : 0) : 0; };
  const noteFilterOn = () => !!(host.$('#nFilter').value.trim() || nKind !== 'all' || nOnly || nTag);
  function filteredNotes() {
    const f = host.$('#nFilter').value.trim().toLowerCase();
    const shown = notesAll.filter(n => kindOf(n) !== 'hl');
    let list = shown.filter(n => (!f || [n.title, n.secLabel, n.row, n.vs, n.he, n.excerpt, n.note, noteTags(n).join(' ')].join(' ').toLowerCase().includes(f))
      && (nKind === 'all' || kindOf(n) === nKind) && (!nOnly || n.note) && (!nTag || noteTags(n).includes(nTag)));
    if (nSort === 'new') list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    else if (nSort === 'book') list.sort((a, b) => ((kindOf(a) === 'free') - (kindOf(b) === 'free')) || host.libCmpGroups(host.groupsByKey.get(a.key) || null, host.groupsByKey.get(b.key) || null) || String(a.title || '~').localeCompare(String(b.title || '~')) || secNum(a) - secNum(b) || ((host.rowVerse(a.row) || 0) - (host.rowVerse(b.row) || 0)) || byManual(a, b));
    else list.sort(byManual);
    return { f, shown, list };
  }
  const escRe = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Text mit hervorgehobenem Suchwort
  const hlTxt = (t, f) => { t = String(t ?? ''); if (!f) return host.esc(t); return t.split(new RegExp('(' + escRe(f) + ')', 'gi')).map((p, i) => i % 2 ? `<mark>${host.esc(p)}</mark>` : host.esc(p)).join(''); };
  // Notiztext: **fett**, *kursiv*, Aufzählungen („- …“) und Stellenangaben („Gen 3:5“, „Psalms 23“) als Link
  const REF_RE = /\b((?:[1-3]\s?)?[A-Z][a-z]+(?:\sof\s[A-Z][a-z]+)?)\.?\s(\d+[ab]?)(?::(\d+(?:\s?[-–]\s?\d+)?(?:,\s?\d+)*))?/;
  const noteRefOk = book => { const b = host.normT(book); if (b.length < 2) return false; const g = host.groups.find(x => host.normT(x.title).startsWith(b) && !/ on /.test(x.title)); return !!g; };
  function ntHtml(text, f) {
    const tok = /(\*\*[^*\n]+\*\*)|(\*[^*\s][^*\n]*\*)|((?:[1-3]\s?)?[A-Z][a-z]+(?:\sof\s[A-Z][a-z]+)?\.?\s\d+[ab]?(?::\d+(?:\s?[-–]\s?\d+)?(?:,\s?\d+)*)?)/g;
    return String(text ?? '').split('\n').map(line => {
      let bullet = '';
      const m = line.match(/^\s*[-•]\s+(.*)$/); if (m) { bullet = '• '; line = m[1]; }
      let out = '', last = 0, x;
      tok.lastIndex = 0;
      while ((x = tok.exec(line))) {
        out += hlTxt(line.slice(last, x.index), f); last = tok.lastIndex;
        if (x[1]) out += `<b>${hlTxt(x[1].slice(2, -2), f)}</b>`;
        else if (x[2]) out += `<i>${hlTxt(x[2].slice(1, -1), f)}</i>`;
        else { const r = x[3].match(REF_RE); out += r && noteRefOk(r[1]) ? `<a class="nref" data-q="${host.esc(x[3].replace(/\.\s/, ' '))}">${hlTxt(x[3], f)}</a>` : hlTxt(x[3], f); }
      }
      return bullet + out + hlTxt(line.slice(last), f);
    }).join('\n');
  }
  function renderNotes() {
    if(workspace){workspace.renderList();return;}
    const { f, shown, list } = filteredNotes();
    const book = nSort === 'book';
    { const nb = new Set(list.filter(n => workspace?window.NotesWorkspaceData.kind(n)!=='free':kindOf(n)!=='free').map(n => n.title)).size;
      host.$('#nCount').textContent = book && nb ? I18N.t('{#} von {#} · {#} Bücher', list.length, shown.length, nb) : I18N.t('{#} von {#}', list.length, shown.length); }
    // Tags: Auswahlleiste und Vorschläge im Dialog
    { const cnt = new Map(); shown.forEach(n => noteTags(n).forEach(t => cnt.set(t, (cnt.get(t) || 0) + 1)));
      if (nTag && !cnt.has(nTag)) nTag = '';
      host.$('#nTags').hidden = !cnt.size;
      host.$('#nTags').innerHTML = [...cnt.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([t, c]) => `<button class="ntag${t === nTag ? ' on' : ''}" data-tag="${host.esc(t)}">${host.esc(t)} <small>${c}</small></button>`).join('');
      host.$('#ndTagList').innerHTML = [...cnt.keys()].map(t => `<option value="${host.esc(t)}">`).join(''); }
    const man = nSort === 'manual';
    const dFmt = ts => ts ? new Date(ts).toLocaleDateString(I18N.loc, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const item = n => {
      const k = kindOf(n);
      const head = k === 'free' ? hlTxt(n.title || I18N.t('Eigene Notiz'), f) : `${hlTxt(n.title, f)} · ${hlTxt(n.secLabel, f)} · ${hlTxt(k === 'block' ? (n.vs || I18N.t('ganzes Kapitel')) : n.row, f)}`;
      const g = host.groupsByKey.get(n.key);
      const tags = noteTags(n);
      const orphan = (k === 'row' || k === 'block') && !noteVers(g).length;
      return `<div class="nitem" data-id="${host.esc(n.id)}"${man ? ' draggable="true"' : ''}><span class="nbtns">${man ? `<button data-mv="-1" title="Nach oben schieben">▲</button><button data-mv="1" title="Nach unten schieben">▼</button>` : ''}${g && (k === 'row' || k === 'block') ? `<button data-cmt="${host.esc(n.id)}" title="Kommentare zu dieser Stelle">💬</button>` : ''}<button data-edit="${host.esc(n.id)}" title="Notiz bearbeiten">✎</button><button data-del="${host.esc(n.id)}" title="Entfernen">✕</button></span><div class="t">${k === 'row' || k === 'block' ? '☆ ' : k === 'free' ? '✎ ' : ''}<span class="ut">${head}</span>${n.ts ? ` <span class="nts" title="${host.esc(I18N.t('zuletzt geändert'))}">${host.esc(dFmt(n.ts))}</span>` : ''}</div>${tags.length ? `<div class="ntags">${tags.map(t => `<button class="ntag${t === nTag ? ' on' : ''}" data-tag="${host.esc(t)}">${hlTxt(t, f)}</button>`).join('')}</div>` : ''}${k === 'row' || k === 'block' ? noteBody(n) : ''}${orphan ? `<div class="orph muted">${host.esc(I18N.t('Text nicht geladen – im Reiter „Herunterladen“ laden.'))} <a data-dl="1">${host.esc(I18N.t('Zum Herunterladen'))}</a></div>` : ''}${n.note ? `<div class="nt">${ntHtml(n.note, f)}</div>` : ''}</div>`;
    };
    let html = '', lastHead = null;
    for (const n of list) {
      if (book) { const h = kindOf(n) === 'free' ? '\u0000free' : `${n.title} · ${n.secLabel}`; if (h !== lastHead) { lastHead = h; html += `<div class="nhead">${h === '\u0000free' ? host.esc(I18N.t('Eigene Notizen')) : host.esc(h)}</div>`; } }
      html += item(n);
    }
    host.$('#nOut').innerHTML = html || (shown.length && noteFilterOn()
      ? `<p class="muted">${host.esc(I18N.t('Keine Treffer.'))} <button id="nClear">${host.esc(I18N.t('Filter löschen'))}</button></p>`
      : `<p class="muted">${I18N.t('Noch keine Lesezeichen. Im Lesen-Reiter erscheint beim Überfahren einer Zeile links ein ☆.')}</p>`);
  }
  host.$('#nKind').onchange = () => { nKind = host.$('#nKind').value; renderNotes(); };
  host.$('#nOnly').onchange = () => { nOnly = host.$('#nOnly').checked; renderNotes(); };
  host.$('#nTags').addEventListener('click', e => { const b = e.target.closest('button[data-tag]'); if (b) { nTag = nTag === b.dataset.tag ? '' : b.dataset.tag; renderNotes(); } });
  host.$('#nFilter').addEventListener('input', renderNotes);
  async function moveNote(id, dir, beforeId) {
    const ids = manualAll().map(n => n.id);
    const i = ids.indexOf(id); if (i < 0) return;
    ids.splice(i, 1);
    if (beforeId !== undefined) { const j = beforeId ? ids.indexOf(beforeId) : ids.length; ids.splice(j < 0 ? ids.length : j, 0, id); }
    else ids.splice(Math.max(0, Math.min(ids.length, i + dir)), 0, id);
    { const r = await ntDo(() => NT.reorder(ids)); if (r) notesAll = r; } renderNotes();
  }
  host.$('#nOut').addEventListener('click', async e => {
    const it = e.target.closest('.nitem');
    const n = it && notesAll.find(x => x.id === it.dataset.id);
    if (e.target.id === 'nClear') { host.$('#nFilter').value = ''; nKind = 'all'; host.$('#nKind').value = 'all'; nOnly = false; host.$('#nOnly').checked = false; nTag = ''; renderNotes(); return; }
    const tg = e.target.closest('button[data-tag]');
    if (tg) { nTag = nTag === tg.dataset.tag ? '' : tg.dataset.tag; renderNotes(); return; }
    const rf = e.target.closest('a.nref');
    if (rf) { e.preventDefault(); if (!host.BG(e)) host.showTab('read'); await host.jumpTo(rf.dataset.q, host.BG(e)); return; }
    if (e.target.closest('a[data-dl]')) { host.showTab('get'); return; }
    const cm = e.target.closest('button[data-cmt]');
    if (cm) {
      const nn = notesAll.find(x => x.id === cm.dataset.cmt), gg = nn && host.groupsByKey.get(nn.key);
      if (gg) { await host.openGroup(gg, { sectionPath: JSON.parse(nn.sk), rowLabel: nn.row }); host.setCmtRow(nn.row); host.toggleCmt(true); }
      return;
    }
    const d = e.target.closest('button[data-del]');
    if (d) { await removeNote(d.dataset.del); return; }
    const mv = e.target.closest('button[data-mv]');
    if (mv && n) { await moveNote(n.id, +mv.dataset.mv); return; }
    if (e.target.closest('button[data-vopen]') && n) { if (ntOpen.has(n.id)) ntOpen.delete(n.id); else ntOpen.add(n.id); renderNotes(); return; }
    const vb = e.target.closest('button[data-vr]');
    if (vb && n) {
      const vers = noteVers(host.groupsByKey.get(n.key));
      const cur = new Set(n.vr || defaultVr(vers)); const rel = vb.dataset.vr;
      if (cur.has(rel)) cur.delete(rel); else cur.add(rel);
      n.vr = vers.filter(v => cur.has(v.rel)).map(v => v.rel);
      { const r = await ntDo(() => NT.save({ ...n, keepTs: true })); if (r) notesAll = r; } renderNotes(); return;
    }
    if (e.target.closest('button[data-edit]') && n) { openNoteDlg(n, { canDelete: true }); return; }
    if (!n) return;
    if (e.target.closest('.ex, .nt')) return; // Text anklicken/markieren springt nicht; nur Titel und Rand öffnen die Stelle
    if (kindOf(n) === 'free') { openNoteDlg(n, { canDelete: true }); return; }
    const g = host.groupsByKey.get(n.key);
    if (g) {
      const bgn = host.BG(e);
      await host.openGroup(g, { sectionPath: JSON.parse(n.sk), rowLabel: n.row }, bgn);
      if (!bgn && kindOf(n) === 'block' && n.set && n.set.length && host.view && host.view.group === g) { host.view.vf = { k: host.view.sections[host.view.idx].k, set: new Set(n.set), text: String(host.view.sections[host.view.idx].label || '').replace(/^\D+/, '') + ':' + n.vs }; host.renderSection(n.row); }
    }
  });
  let dragId = null;
  host.$('#nOut').addEventListener('mousedown', e => { const it = e.target.closest('.nitem[draggable]'); if (it) it.draggable = !e.target.closest('.ex, .nt'); }); // Text lässt sich markieren, ohne dass die Karte gezogen wird
  host.$('#nOut').addEventListener('dragstart', e => { const it = e.target.closest('.nitem'); if (!it) return; dragId = it.dataset.id; it.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch { /* egal */ } });
  host.$('#nOut').addEventListener('dragend', () => { dragId = null; host.$$('#nOut .dragging, #nOut .dragover').forEach(x => x.classList.remove('dragging', 'dragover')); });
  host.$('#nOut').addEventListener('dragover', e => { if (!dragId) return; e.preventDefault(); host.$$('#nOut .dragover').forEach(x => x.classList.remove('dragover')); const it = e.target.closest('.nitem'); if (it && it.dataset.id !== dragId) it.classList.add('dragover'); });
  host.$('#nOut').addEventListener('drop', async e => {
    if (!dragId) return; e.preventDefault();
    const it = e.target.closest('.nitem'); const id = dragId; dragId = null;
    await moveNote(id, 0, it ? it.dataset.id : null);
  });
  window.addEventListener('focus', () => { loadNotes().catch(() => {}); }); // Änderungen aus dem anderen Fenster übernehmen

  const hostLegacyBackup=()=>structuredClone(notesAll);
  workspace=window.LibraryNotesWorkspace.create({getLegacy:()=>notesAll,reload:loadNotes,getResearch:host.getResearch});
  function quickDraft(){if(!editing)return null;return {record:{...structuredClone(editing),note:host.$('#ndText').value,tags:[...new Set(host.$('#ndTags').value.split(/[,;]/).map(s=>s.trim()).filter(Boolean))],...(kindOf(editing)==='free'?{title:host.$('#ndTitleIn').value}:{}),_store:'legacy'},base:editingOld?{...structuredClone(editingOld),_store:'legacy'}:null};}
  for(const id of ['ndText','ndTitleIn','ndTags'])host.$('#'+id).addEventListener('input',()=>{try{localStorage.setItem(quickDraftKey,JSON.stringify(quickDraft()));}catch{}});
  host.$('#ndLarge').onclick=()=>{const saved=quickDraft();host.$('#noteDlg').close();host.showTab('notes');workspace.edit(saved.record,saved.base);};
  async function openWorkspace(){await loadNotes();try{const saved=JSON.parse(localStorage.getItem(quickDraftKey)||'null');if(saved?.record&&!document.querySelector('#noteDlg[open]')&&!(workspace.draft?._store==='legacy'&&workspace.draft.id===saved.record.id))workspace.edit(saved.record,saved.base);}catch{}}
    return {
      openWorkspace,
      get kindOf() { return kindOf; },
      get loadNotes() { return loadNotes; },
      get markNotes() { return markNotes; },
      get newId() { return newId; },
      get notesAll() { return notesAll; }, set notesAll(value) { notesAll = value; },
      get noteTags() { return noteTags; },
      get openNoteDlg() { return openNoteDlg; },
      get plain() { return plain; },
      get topOrder() { return topOrder; },
    };
  }
  return { create };
})();
