const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const L = window.lib, A = window.api;

// ---------- Hilfen ----------
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ALLOWED = ['b', 'i', 'em', 'strong', 'small', 'big', 'sup', 'sub', 'br'];
// Nur einfache Formatierungs-Tags durchlassen, alles andere (und alle Attribute) entfernen
function clean(s) {
  return String(s ?? '').replace(/<\/?([a-z0-9]+)[^>]*>/gi, (m, t) => {
    t = t.toLowerCase();
    if (!ALLOWED.includes(t)) return '';
    return m.startsWith('</') ? `</${t}>` : `<${t}>`;
  });
}
const fileSafe = s => String(s).replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');

function showTab(t) {
  $$('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  $$('main > section').forEach(s => (s.hidden = s.id !== 'tab-' + t));
  if (t === 'library' && !libLoaded) loadLibrary();
}
$$('nav button').forEach(b => (b.onclick = () => showTab(b.dataset.tab)));

function attachSuggest(input, list) {
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) return;
    timer = setTimeout(async () => {
      const r = await A.get('/api/name/' + encodeURIComponent(q) + '?limit=10');
      if (r.ok && r.data && Array.isArray(r.data.completions)) {
        list.innerHTML = r.data.completions.map(x => `<option value="${esc(x)}">`).join('');
      }
    }, 250);
  });
}
attachSuggest($('#ref'), $('#ref-list'));
attachSuggest($('#dlTitle'), $('#dl-list'));
attachSuggest($('#cmpRef'), $('#cmp-list'));

// ---------- Lesen ----------
let current = null;

async function loadRef(ref) {
  ref = (ref || '').trim();
  if (!ref) return;
  showTab('read');
  $('#ref').value = ref;
  const out = $('#readerOut');
  out.innerHTML = '<p class="muted">Lade …</p>';
  const r = await A.get(L.textUrl(ref, $('#versions').value));
  if (!r.ok || !r.data || r.data.error) {
    out.innerHTML = `<p class="err">${esc((r.data && r.data.error) || r.error || 'Unbekannter Fehler')}</p>`;
    current = null;
    return;
  }
  current = r.data;
  renderReader();
}

function renderReader() {
  const d = current;
  $('#readerTitle').textContent = d.ref + (d.heRef ? '  ·  ' + d.heRef : '');
  const vs = d.versions || [];
  $('#saveVersion').innerHTML = vs.map((v, i) => `<option value="${i}">${esc(v.versionTitle || v.language || 'Version ' + (i + 1))}</option>`).join('');
  $('#prev').disabled = !d.prev;
  $('#next').disabled = !d.next;

  if (!vs.length) {
    $('#readerOut').innerHTML = '<p class="muted">Für diese Auswahl wurde kein Text geliefert.</p>';
  } else {
    $('#readerOut').innerHTML = '<div class="cols">' + vs.map(v => {
      const segs = L.segmentsFromText(d.ref, v.text, false);
      const rtl = v.direction === 'rtl' || v.language === 'he';
      const body = segs.length
        ? segs.map(([ref, t]) => `<p class="seg"><span class="num">${esc(ref.split(':').pop())}</span> ${clean(t)}</p>`).join('')
        : '<p class="muted">(kein Text in dieser Version)</p>';
      return `<div class="col" dir="${rtl ? 'rtl' : 'ltr'}"><h4>${esc(v.versionTitle || '')} <small>${esc(v.actualLanguage || v.language || '')}</small></h4>${body}</div>`;
    }).join('') + '</div>';
  }

  const av = d.available_versions || [];
  $('#chips').innerHTML = av.map(v => {
    const lang = v.languageFamilyName || L.LANG_NAMES[v.language] || v.language;
    return `<button class="chip" data-v="${esc(lang + '|' + v.versionTitle)}" title="${esc(v.versionTitle)}">${esc(lang)} · ${esc(v.versionTitle)}</button>`;
  }).join('');
  $$('#chips .chip').forEach(b => (b.onclick = () => { $('#versions').value = b.dataset.v; loadRef($('#ref').value); }));
}

$('#go').onclick = () => loadRef($('#ref').value);
$('#ref').addEventListener('keydown', e => { if (e.key === 'Enter') loadRef($('#ref').value); });
$('#versions').addEventListener('keydown', e => { if (e.key === 'Enter') loadRef($('#ref').value); });
$('#prev').onclick = () => current && current.prev && loadRef(current.prev);
$('#next').onclick = () => current && current.next && loadRef(current.next);
$('#openWeb').onclick = () => current && A.openExternal('https://www.sefaria.org/' + L.encRef(current.ref));

$('#saveRead').onclick = async () => {
  if (!current || !(current.versions || []).length) return;
  const v = current.versions[+$('#saveVersion').value || 0];
  const fmt = $('#saveFmt').value;
  const segs = L.segmentsFromText(current.ref, v.text, $('#saveStrip').checked);
  let content;
  if (fmt === 'csv') content = L.toCSV(segs);
  else if (fmt === 'json') content = JSON.stringify(segs.map(([ref, text]) => ({ ref, text })), null, 2);
  else content = segs.map(([ref, t]) => `[${ref}] ${t}`).join('\n') + '\n';
  await A.saveFile(`${fileSafe(current.ref)}.${fmt}`, content);
};

// ---------- Suche ----------
async function runSearch() {
  const q = $('#q').value.trim();
  if (!q) return;
  $('#searchInfo').textContent = 'Suche …';
  $('#searchOut').innerHTML = '';
  const body = { query: q, type: 'text', field: $('#qfield').value, size: 30, slop: 10, sort_type: 'relevance', filters: [], filter_fields: [], aggs: [] };
  const r = await A.post('/api/search-wrapper', body);
  if (!r.ok || !r.data) { $('#searchInfo').innerHTML = `<span class="err">${esc(r.error || 'Suche fehlgeschlagen')}</span>`; return; }
  const hits = (r.data.hits && r.data.hits.hits) || [];
  const total = r.data.hits && (typeof r.data.hits.total === 'object' ? r.data.hits.total.value : r.data.hits.total);
  $('#searchInfo').textContent = `${total ?? hits.length} Treffer (die ersten ${hits.length} werden angezeigt)`;
  $('#searchOut').innerHTML = hits.map(h => {
    // Die API liefert Referenz und Version in der _id: "Genesis 1:1 (Versionstitel [en])"
    const s = h._source || {};
    const id = String(h._id || '');
    const cut = id.indexOf(' (');
    const ref = s.ref || (cut > 0 ? id.slice(0, cut) : id);
    const version = s.version || (cut > 0 ? id.slice(cut + 2).replace(/\)$/, '') : '');
    const hl = h.highlight ? Object.values(h.highlight)[0] : null;
    const snip = hl && hl[0] ? hl[0] : '';
    return `<div class="hit"><a data-ref="${esc(ref)}">${esc(ref)}</a> <span class="muted">${esc(version)}</span><div class="snip">${clean(snip)}</div></div>`;
  }).join('');
  $$('#searchOut a').forEach(a => (a.onclick = () => loadRef(a.dataset.ref)));
}
$('#doSearch').onclick = runSearch;
$('#q').addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });

// ---------- Bibliothek ----------
let libLoaded = false, libData = null;

function libNode(n, filter) {
  if (n.contents) {
    const kids = n.contents.map(c => libNode(c, filter)).filter(Boolean);
    if (!kids.length) return '';
    const name = n.category || n.title || '';
    return `<details ${filter ? 'open' : ''}><summary>${esc(name)}</summary>${kids.join('')}</details>`;
  }
  const title = n.title || '';
  if (filter && !(title.toLowerCase().includes(filter) || (n.heTitle || '').includes(filter))) return '';
  return `<a class="lib-item" data-title="${esc(title)}">${esc(title)}<small>${esc(n.heTitle || '')}</small></a>`;
}

function renderLibrary() {
  const f = $('#libFilter').value.trim().toLowerCase();
  $('#libOut').innerHTML = (libData || []).map(n => libNode(n, f)).join('') || '<p class="muted">Keine Treffer.</p>';
  $$('#libOut .lib-item').forEach(a => (a.onclick = () => { $('#dlTitle').value = a.dataset.title; $('#cmpRef').value = a.dataset.title; loadRef(a.dataset.title); }));
}

async function loadLibrary() {
  $('#libOut').textContent = 'Lade Inhaltsverzeichnis …';
  const r = await A.get('/api/index');
  if (!r.ok || !Array.isArray(r.data)) { $('#libOut').innerHTML = `<span class="err">${esc(r.error || 'Fehler beim Laden')}</span>`; return; }
  libData = r.data; libLoaded = true;
  renderLibrary();
}
$('#libReload').onclick = loadLibrary;
$('#libFilter').addEventListener('input', () => libData && renderLibrary());

// ---------- Buch laden ----------
A.onProgress(d => {
  const p = $('#dlProg');
  if (d.done) { $('#dlCancel').disabled = true; return; }
  p.hidden = false; p.max = d.total; p.value = d.current;
  $('#dlInfo').textContent = `Kapitel ${d.chapter} (${d.current}/${d.total})`;
});

$('#dlStart').onclick = async () => {
  const title = $('#dlTitle').value.trim();
  if (!title) { $('#dlInfo').textContent = 'Bitte einen Titel angeben.'; return; }
  $('#dlWarn').innerHTML = '';
  $('#dlStart').disabled = true; $('#dlCancel').disabled = false;
  $('#dlInfo').textContent = 'Starte …';
  const res = await A.downloadBook({
    title, version: $('#dlVersion').value.trim(), from: $('#dlFrom').value, to: $('#dlTo').value,
    format: $('#dlFormat').value, strip: $('#dlStrip').checked,
  });
  $('#dlStart').disabled = false; $('#dlCancel').disabled = true; $('#dlProg').hidden = true;
  if (res.canceled) $('#dlInfo').textContent = '';
  else if (res.cancelled) $('#dlInfo').textContent = 'Abgebrochen.';
  else if (res.error) $('#dlInfo').innerHTML = `<span class="err">${esc(res.error)}</span>`;
  else {
    $('#dlInfo').textContent = `Fertig: ${res.segments} Segmente gespeichert.`;
    if (res.warnings && res.warnings.length)
      $('#dlWarn').innerHTML = `<p class="err">${res.warnings.length} Kapitel ohne Text:</p><ul>${res.warnings.slice(0, 50).map(w => `<li>${esc(w)}</li>`).join('')}</ul>`;
  }
};
$('#dlCancel').onclick = () => A.cancelDownload();

// ---------- Upload-Vorbereitung: Text -> CSV ----------
let srcText = null, t2cRows = [];

function updateT2C() {
  if (srcText == null) return;
  const title = $('#t2cTitle').value.trim() || 'Titel';
  const res = L.textToRows(srcText, title, +$('#t2cStart').value || 1);
  t2cRows = res.rows;
  $('#t2cInfo').textContent = `${t2cRows.length} Segmente · Kapitelmarken ${res.sawChapterMarker ? 'erkannt' : 'nicht gefunden (alles in einem Kapitel ab Startkapitel)'}`;
  $('#t2cPreview').innerHTML = '<table><tr><th>Referenz</th><th>Text</th></tr>' +
    t2cRows.slice(0, 12).map(([r, t]) => `<tr><td>${esc(r)}</td><td>${esc(t.length > 140 ? t.slice(0, 140) + ' …' : t)}</td></tr>`).join('') + '</table>';
  $('#t2cSave').disabled = $('#t2cUse').disabled = !t2cRows.length;
}

$('#openSrc').onclick = async () => {
  const f = await A.openFile('text');
  if (!f) return;
  srcText = f.text; $('#srcName').textContent = f.name;
  if (!$('#t2cTitle').value) $('#t2cTitle').value = f.name.replace(/\.[^.]+$/, '');
  updateT2C();
};
$('#t2cTitle').addEventListener('input', updateT2C);
$('#t2cStart').addEventListener('input', updateT2C);
$('#t2cSave').onclick = () => A.saveFile(`${fileSafe($('#t2cTitle').value || 'text')}.csv`, L.toCSV(t2cRows));
$('#t2cUse').onclick = () => { csvRows = t2cRows; $('#csvName').textContent = '(aus Text erzeugt)'; renderCheck(); };

// ---------- Upload-Vorbereitung: CSV prüfen ----------
let csvRows = null, csvResult = null;

function renderCheck() {
  csvResult = L.validateRows(csvRows);
  const iss = csvResult.issues;
  const n = lvl => iss.filter(i => i.level === lvl).length;
  $('#csvSummary').innerHTML = `<b>${csvResult.valid}</b> von ${csvResult.total} Zeilen mit gültiger Referenz · ` +
    `<span class="lvl-Fehler">${n('Fehler')} Fehler</span> · <span class="lvl-Warnung">${n('Warnung')} Warnungen</span> · <span class="lvl-Hinweis">${n('Hinweis')} Hinweise</span>`;
  const shown = iss.slice(0, 300);
  $('#csvIssues').innerHTML = iss.length
    ? '<table><tr><th>Zeile</th><th>Stufe</th><th>Meldung</th></tr>' +
      shown.map(i => `<tr><td>${i.line}</td><td class="lvl-${i.level}">${i.level}</td><td>${esc(i.msg)}</td></tr>`).join('') + '</table>' +
      (iss.length > shown.length ? `<p class="muted">… und ${iss.length - shown.length} weitere.</p>` : '')
    : '<p style="color:var(--ok)">Keine Auffälligkeiten.</p>';
  const titles = Object.keys(csvResult.counts);
  $('#cmpMine').innerHTML = titles.map(t => `<option>${esc(t)}</option>`).join('');
  if (titles.length && !$('#cmpRef').value) $('#cmpRef').value = titles[0];
  $('#cmpGo').disabled = !titles.length;
  $('#saveClean').disabled = false;
  $('#cmpOut').innerHTML = ''; $('#cmpInfo').textContent = '';
}

$('#openCsv').onclick = async () => {
  const f = await A.openFile('csv');
  if (!f) return;
  csvRows = L.parseCSV(f.text);
  $('#csvName').textContent = f.name;
  renderCheck();
};

// Werkzeug-Fenster: nur „Buch laden“ und „Upload-Vorbereitung“. Lesen, Suche und Bibliothek übernimmt die Sefaria-Website.
$$('nav button').forEach(b => { if (!['download', 'check'].includes(b.dataset.tab)) b.hidden = true; });
// Das Menü ändert bei einem schon offenen Fenster nur den Teil hinter dem # – darauf reagieren wir hier.
function applyHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  showTab(params.get('tab') === 'check' ? 'check' : 'download');
  const preset = params.get('title');
  if (preset) { $('#dlTitle').value = preset; $('#cmpRef').value = preset; }
}
applyHash();
window.addEventListener('hashchange', applyHash);

// Bereinigung: Steuerzeichen raus, Zeilenumbrüche/Mehrfach-Leerzeichen glätten, trimmen
$('#saveClean').onclick = async () => {
  if (!csvRows) return;
  const rows = csvRows.map(r => r.map((c, i) => i === 1
    ? String(c).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\s*[\r\n]+\s*/g, ' ').replace(/[ \t ]{2,}/g, ' ').trim()
    : String(c).trim()));
  await A.saveFile('bereinigt.csv', L.toCSV(rows));
};

$('#cmpGo').onclick = async () => {
  const mine = $('#cmpMine').value, ref = $('#cmpRef').value.trim();
  if (!csvResult || !ref) return;
  $('#cmpInfo').textContent = 'Lade Struktur …'; $('#cmpOut').innerHTML = '';
  const r = await A.chapterLengths(ref);
  if (r.error) { $('#cmpInfo').innerHTML = `<span class="err">${esc(r.error)}</span>`; return; }
  const cmp = L.compareSegments(csvResult.counts[mine] || {}, r.lengths);
  const bad = cmp.filter(c => !c.ok);
  const sum = a => a.reduce((x, y) => x + y, 0);
  $('#cmpInfo').innerHTML = bad.length
    ? `<span class="err">${bad.length} von ${cmp.length} Kapiteln weichen ab</span> · Segmente gesamt: deine CSV ${sum(cmp.map(c => c.mine))}, Sefaria ${sum(cmp.map(c => c.reference))}`
    : `<span style="color:var(--ok)">Alle ${cmp.length} Kapitel stimmen überein.</span>`;
  $('#cmpOut').innerHTML = '<table><tr><th>Kapitel</th><th>Deine CSV</th><th>Sefaria</th><th>Differenz</th></tr>' +
    cmp.map(c => `<tr class="${c.ok ? '' : 'bad'}"><td>${c.chapter}</td><td class="num-c">${c.mine}</td><td class="num-c">${c.reference}</td><td class="num-c">${c.diff > 0 ? '+' : ''}${c.diff}</td></tr>`).join('') + '</table>';
};
