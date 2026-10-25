const { app, BrowserWindow, ipcMain, dialog, shell, net, session, Menu } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const S = require('./sefaria');
const L = require('./lib');
const OFF = require('./offline');
const LK = require('./links');
const DSL = require('./dsl');

const BASE = 'https://www.sefaria.org';
const CATALOG_URL = 'https://raw.githubusercontent.com/Sefaria/Sefaria-Export/master/books.json';
let toolsWin = null;
let offlineWin = null;
let cancelFlag = false;
let dlCancel = false;
let searchCancel = false;

app.setName('Sefaria');
// Der Datenordner (Bibliothek, Notizen, Einstellungen) bleibt wie bisher, auch wenn die App jetzt „Safran“ heißt
const keepUserData = app.getPath('userData');
app.setName('Safran');
app.setPath('userData', keepUserData);

const isSefaria = url => {
  try { const h = new URL(url).hostname; return h === 'sefaria.org' || h.endsWith('.sefaria.org'); } catch { return false; }
};
// Wie ein normaler Browser auftreten: "Electron/x" und App-Name aus dem User-Agent entfernen
const cleanUA = ua => ua.replace(/\s?Electron\/[\d.]+/, '').replace(/\s?(?:sefaria-mac|talmud-de-reader|safran)\/[\d.]+/i, '');

// ---------- Werkzeug-Fenster: Buch herunterladen, Upload-Vorbereitung ----------
function openTools(tab = 'download', title = '') {
  // &t=… sorgt dafür, dass sich der Hash bei jedem Aufruf ändert, damit ein schon offenes Fenster umschaltet
  const hash = `tab=${tab}&title=${encodeURIComponent(title)}&t=${Date.now()}`;
  if (toolsWin && !toolsWin.isDestroyed()) {
    toolsWin.loadFile('index.html', { hash });
    toolsWin.focus();
    return;
  }
  toolsWin = new BrowserWindow({
    width: 1000,
    height: 800,
    title: 'Sefaria – Werkzeuge',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Preload braucht require() für lib.js / sefaria.js
    },
  });
  toolsWin.webContents.setWindowOpenHandler(({ url }) => {
    if (isSefaria(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  toolsWin.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });
  toolsWin.webContents.on('will-frame-navigate', e => { if (!e.url.startsWith('file://')) e.preventDefault(); });
  toolsWin.on('closed', () => { toolsWin = null; });
  toolsWin.loadFile('index.html', { hash });
}

// ---------- Offline-Bibliothek ----------
function openOffline() {
  if (offlineWin && !offlineWin.isDestroyed()) { offlineWin.focus(); return; }
  offlineWin = new BrowserWindow({
    width: 1250,
    height: 860,
    icon: path.join(__dirname, 'build', 'icon.png'), // Fenstersymbol unter Windows/Linux
    minWidth: 900,
    minHeight: 600,
    title: 'Safran',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: true, // das zweite Lesefenster ist ein Rahmen und braucht dasselbe Preload-Skript
      sandbox: false,
    },
  });
  offlineWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  offlineWin.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });
  offlineWin.webContents.on('will-frame-navigate', e => { if (!e.url.startsWith('file://')) e.preventDefault(); }); // auch das zweite Lesefenster (iframe) bleibt lokal
  offlineWin.on('closed', () => { offlineWin = null; dlCancel = true; searchCancel = true; if (searchWorker) searchWorker.terminate(); });
  offlineWin.loadFile('library.html');
}

// ---------- Menü ----------
const IS_MAC = process.platform === 'darwin';
function buildMenu() {
  const template = [
    ...(IS_MAC ? [{ label: 'Safran', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] }]
      : [{ label: 'Datei', submenu: [{ label: 'Beenden', role: 'quit' }] }]),
    { label: 'Bearbeiten', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }, { type: 'separator' }, { label: 'Im Text suchen…', accelerator: 'CmdOrCtrl+F', click: (_i, w) => { if (w && !w.isDestroyed()) w.webContents.send('find:open'); } }] },
    { label: 'Ansicht', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    {
      label: 'Werkzeuge',
      submenu: [
        { label: 'Offline-Bibliothek…', accelerator: 'CmdOrCtrl+Shift+O', click: () => openOffline() },
        { type: 'separator' },
        { label: 'Buch herunterladen…', click: () => openTools('download') },
        { label: 'Upload-Vorbereitung (CSV prüfen)…', click: () => openTools('check') },
      ],
    },
    {
      label: 'Fenster',
      submenu: [
        { role: 'minimize' }, ...(IS_MAC ? [{ role: 'zoom' }] : []), { type: 'separator' },
        { label: 'Tab schließen', accelerator: 'CmdOrCtrl+W', click: (_i, w) => { if (w && !w.isDestroyed()) w.webContents.executeJavaScript('window.__closeCurrentTab ? (window.__closeCurrentTab(), true) : false').then(ok => { if (!ok && !w.isDestroyed()) w.close(); }).catch(() => {}); } },
        { label: 'Fenster schließen', accelerator: 'CmdOrCtrl+Shift+W', role: 'close' },
        ...(IS_MAC ? [{ type: 'separator' }, { role: 'front' }] : []),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- API-Zugriff für die Werkzeuge ----------
async function request(method, apiPath, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    // net.fetch nutzt den Chromium-Netzwerkstack (wie ein normaler Browser: Proxy-Einstellungen, TLS, Cookies)
    const res = await net.fetch(BASE + apiPath, {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    let data = null;
    const raw = await res.text();
    try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
    let error = null;
    if (!res.ok) {
      const snippet = !data && raw ? ' – ' + raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) : '';
      error = (data && data.error) || `HTTP ${res.status}${snippet}`;
    }
    return { ok: res.ok, status: res.status, data, error };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err.name === 'AbortError' ? 'Zeitüberschreitung (30 s)' : `Netzwerkfehler: ${err.message}` };
  } finally {
    clearTimeout(timer);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const winOf = e => BrowserWindow.fromWebContents(e.sender) || toolsWin || undefined;

ipcMain.handle('api:get', (_e, p) => request('GET', p));
ipcMain.handle('api:post', (_e, p, b) => request('POST', p, b));
ipcMain.handle('open:external', (_e, url) => {
  if (isSefaria(url)) return shell.openExternal(url);
});

ipcMain.handle('file:save', async (e, name, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog(winOf(e), { defaultPath: String(name || 'datei').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_') });
  if (canceled || !filePath) return null;
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
});

ipcMain.handle('file:open', async (e, kind) => {
  const filters = kind === 'csv'
    ? [{ name: 'CSV / Text', extensions: ['csv', 'tsv', 'txt'] }]
    : [{ name: 'Text / Word', extensions: ['txt', 'md', 'docx'] }];
  const { canceled, filePaths } = await dialog.showOpenDialog(winOf(e), { properties: ['openFile'], filters });
  if (canceled || !filePaths.length) return null;
  const file = filePaths[0];
  let text;
  if (file.toLowerCase().endsWith('.docx')) {
    const mammoth = require('mammoth');
    text = (await mammoth.extractRawText({ path: file })).value;
  } else {
    text = await fs.readFile(file, 'utf8');
  }
  return { path: file, name: path.basename(file), text };
});

async function getLengths(title) {
  const shape = await request('GET', `/api/shape/${S.encRef(title)}`);
  const fromShape = shape.ok ? S.shapeLengths(shape.data) : null;
  if (fromShape) return { lengths: fromShape };
  // Fallback: ganzen Text laden und Kapitel zählen
  const t = await request('GET', `/api/v3/texts/${S.encRef(title)}`);
  const v = t.ok && t.data && t.data.versions && t.data.versions[0];
  if (v && Array.isArray(v.text)) return { lengths: S.chapterLengths(v.text) };
  return { error: shape.error || t.error || 'Struktur nicht gefunden' };
}

ipcMain.handle('sefaria:lengths', (_e, title) => getLengths(title));

ipcMain.on('book:cancel', () => { cancelFlag = true; });

ipcMain.handle('book:download', async (e, o) => {
  const ext = o.format;
  const { canceled, filePath } = await dialog.showSaveDialog(winOf(e), { defaultPath: `${o.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, '_')}.${ext}` });
  if (canceled || !filePath) return { canceled: true };
  cancelFlag = false;
  const send = d => e.sender.send('book:progress', d);

  const info = await getLengths(o.title);
  if (info.error) return { error: `Struktur von „${o.title}" nicht ermittelbar: ${info.error}` };
  const total = info.lengths.length;
  const from = Math.max(1, +o.from || 1);
  const to = Math.min(total, +o.to || total);
  const rows = [];
  const warnings = [];

  for (let ch = from; ch <= to; ch++) {
    if (cancelFlag) { send({ done: true, cancelled: true }); return { cancelled: true }; }
    const ref = `${o.title} ${ch}`;
    const r = await request('GET', S.textUrl(ref, o.version));
    const v = r.ok && r.data && r.data.versions && r.data.versions[0];
    if (!v) warnings.push(`Kapitel ${ch}: ${r.error || 'keine Version geliefert'}`);
    else rows.push(...S.segmentsFromText(ref, v.text, o.strip));
    send({ current: ch - from + 1, total: to - from + 1, chapter: ch });
    await sleep(120);
  }

  let content;
  if (ext === 'csv') content = L.toCSV(rows);
  else if (ext === 'json') content = JSON.stringify(rows.map(([ref, text]) => ({ ref, text })), null, 2);
  else content = rows.map(([ref, text]) => `[${ref}] ${text}`).join('\n') + '\n';
  await fs.writeFile(filePath, content, 'utf8');
  send({ done: true });
  return { path: filePath, segments: rows.length, warnings };
});

// ---------- Offline-Bibliothek: Daten und Dateizugriff ----------
async function fetchBuffer(url, timeoutMs = 120000) {
  const ac = new AbortController();
  let timer = setTimeout(() => ac.abort(), timeoutMs); // hängt die Verbindung, wird nach zwei Minuten abgebrochen (und von fetchWithRetry wiederholt)
  try {
    const res = await net.fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return buf;
  } catch (err) {
    if (ac.signal.aborted) throw new Error('Zeitüberschreitung beim Laden');
    throw err;
  } finally { clearTimeout(timer); }
}

const configFile = () => path.join(app.getPath('userData'), 'offline-config.json');
const catalogFile = () => path.join(app.getPath('userData'), 'catalog.json');

async function libraryDir() {
  try {
    const c = JSON.parse(await fs.readFile(configFile(), 'utf8'));
    if (c && c.dir) return c.dir;
  } catch { /* Standardordner */ }
  return path.join(app.getPath('userData'), 'library');
}

const readCache = new Map(); // gelesene Dateien für den Kommentar-Bereich
let libraryP = null; // Promise: parallele Aufrufe beim Start teilen sich eine Bibliothek
function getLibrary() {
  if (!libraryP) libraryP = (async () => {
    const lib = await new OFF.Library(await libraryDir(), fetchBuffer).load();
    try { await lib.importBundled(path.join(__dirname, 'bundled')); } catch { /* mitgelieferte Texte sind nur ein Zusatz */ }
    return lib;
  })().catch(err => { libraryP = null; throw err; });
  return libraryP;
}
const invalidateReads = () => { readCache.clear(); }; // gelesene Dateien im Kommentar-Zwischenspeicher verwerfen (nach Änderungen an der Bibliothek)

let catCache = null; // { catalog, groups, summary }
async function loadCatalog() {
  if (catCache) return catCache;
  let raw;
  try { raw = await fs.readFile(catalogFile(), 'utf8'); } catch { return null; }
  const catalog = JSON.parse(raw);
  const groups = OFF.buildGroups(catalog);
  catCache = { catalog, groups, summary: OFF.summarize(groups) };
  return catCache;
}

async function offState() {
  const lib = await getLibrary();
  const cat = await loadCatalog();
  return {
    dir: lib.dir,
    stats: lib.stats(),
    catalog: cat ? { generated_at: cat.catalog.generated_at, total: cat.catalog.books.length } : null,
  };
}

ipcMain.handle('off:state', () => offState());

ipcMain.handle('off:catalogFetch', async () => {
  try {
    const buf = await fetchBuffer(CATALOG_URL);
    const parsed = JSON.parse(buf.toString('utf8'));
    if (!parsed || !Array.isArray(parsed.books)) throw new Error('Unerwartetes Katalogformat');
    await fs.mkdir(path.dirname(catalogFile()), { recursive: true });
    await fs.writeFile(catalogFile(), buf);
    catCache = null;
    return await offState();
  } catch (err) {
    return { error: `Katalog konnte nicht geladen werden: ${err.message}` };
  }
});

ipcMain.handle('off:summary', async () => {
  const c = await loadCatalog();
  return c ? c.summary : [];
});

ipcMain.handle('off:plan', async (_e, sel, opts) => {
  const c = await loadCatalog();
  if (!c) return { files: 0, titles: 0, estimateMB: 0 };
  const p = OFF.planEntries(c.groups, sel, opts);
  return { files: p.files, titles: p.titles, estimateMB: p.estimateMB };
});

ipcMain.handle('off:download', async (e, sel, opts) => {
  const c = await loadCatalog();
  if (!c) return { error: 'Kein Katalog geladen' };
  const lib = await getLibrary();
  const plan = OFF.planEntries(c.groups, sel, opts);
  dlCancel = false;
  return lib.downloadEntries(plan.entries, {
    concurrency: 4,
    isCancelled: () => dlCancel,
    onProgress: p => { if (!e.sender.isDestroyed()) e.sender.send('off:progress', p); },
  });
});
ipcMain.on('off:cancel', () => { dlCancel = true; });

ipcMain.handle('off:library', async () => {
  const lib = await getLibrary();
  if (!lib._pruned) { lib._pruned = true; await lib.pruneMissing(); } // fehlende Dateien nur beim Start suchen, nicht bei jedem Aufruf
  return lib.list();
});

ipcMain.handle('off:read', async (_e, rel) => (await getLibrary()).read(rel));

let searchWorker = null;
ipcMain.handle('off:search', async (e, o) => {
  searchCancel = false;
  const lib = await getLibrary();
  const str = x => String(x == null ? '' : x);
  const params = {
    query: str(o.query), extra: Array.isArray(o.extra) ? o.extra.slice(0, 2).map(str) : [], fuzzy: !!o.fuzzy,
    distance: Number.isFinite(o.distance) ? o.distance : -1, ordered: !!o.ordered, prefix: !!o.prefix,
    limit: Math.min(5000, +o.limit || 1000), perFile: Math.min(500, +o.perFile || 25),
  };
  const entries = lib.entriesFor({ kinds: Array.isArray(o.kinds) ? o.kinds : [], category: str(o.category), categories: Array.isArray(o.categories) ? o.categories.map(str) : [], titles: Array.isArray(o.titles) ? o.titles.map(str) : [] });
  const progress = p => { if (!e.sender.isDestroyed()) e.sender.send('off:searchProgress', p); };
  const inline = () => require('./searchcore').searchFiles({ dir: lib.dir, entries, params, onProgress: progress, isCancelled: () => searchCancel });
  try {
    const { Worker } = require('worker_threads');
    return await new Promise((resolve, reject) => {
      const w = new Worker(path.join(__dirname, 'searchWorker.js'), { workerData: { dir: lib.dir, entries, params } });
      searchWorker = w;
      let finished = false;
      const timer = setInterval(() => { if (searchCancel) w.postMessage('cancel'); }, 100);
      const end = fn => v => { if (finished) return; finished = true; clearInterval(timer); if (searchWorker === w) searchWorker = null; fn(v); };
      w.on('message', m => { if (m.type === 'progress') progress(m.p); else if (m.type === 'done') end(resolve)(m.res); else if (m.type === 'error') end(reject)(new Error(m.error)); });
      w.on('error', end(reject));
      w.on('exit', code => end(reject)(new Error('Such-Prozess beendet (' + code + ')')));
    });
  } catch { return inline(); } // falls der Hintergrund-Thread nicht startet: direkt suchen
});
ipcMain.on('off:cancelSearch', () => { searchCancel = true; });


// Eigene Texte: Dateien wählen (mehrere möglich) -> prüfen (Vorschau) -> speichern
const pendingOwn = new Map();
let ownSeq = 0;
async function readOwnParsed(file) {
  const isDocx = file.toLowerCase().endsWith('.docx');
  const content = isDocx ? (await require('mammoth').extractRawText({ path: file })).value : await fs.readFile(file, 'utf8');
  // Word-Dateien wie Textdateien behandeln (Zeile = Vers)
  return OFF.parseOwn(content, isDocx ? 'x.txt' : path.basename(file));
}
async function parseOwnFile(file) {
  const name = path.basename(file);
  try {
    const parsed = await readOwnParsed(file);
    const id = 'o' + (++ownSeq);
    pendingOwn.set(id, { ...parsed, source: file });
    return { id, name, segments: parsed.segments, chapters: parsed.chapters, warnings: parsed.warnings, meta: parsed.meta || {} };
  } catch (err) { return { name, error: err.message }; }
}
const OWN_EXT = ['.txt', '.md', '.docx', '.csv', '.tsv', '.json'];
async function parseOwnFiles(paths) {
  const out = [];
  for (const f of paths) {
    if (!OWN_EXT.some(x => f.toLowerCase().endsWith(x))) { out.push({ name: path.basename(f), error: 'Dateityp wird nicht unterstützt (erlaubt: TXT, MD, DOCX, CSV, TSV, JSON)' }); continue; }
    out.push(await parseOwnFile(f));
  }
  return { files: out };
}
ipcMain.handle('off:ownPick', async e => {
  const { canceled, filePaths } = await dialog.showOpenDialog(winOf(e), {
    title: 'Eigene Texte wählen (mehrere möglich)', properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Text, Word, CSV, JSON', extensions: ['txt', 'md', 'docx', 'csv', 'tsv', 'json'] }],
  });
  if (canceled || !filePaths.length) return null;
  return parseOwnFiles(filePaths); // Dialogpfade sind vertrauenswürdig
});
// Nur Pfade, die der Preload beim echten Ablegen einer Datei gemeldet hat (oder die der Öffnen-Dialog lieferte), dürfen gelesen werden
const ownAllowed = new Set();
ipcMain.on('off:ownDropAllow', (_e, paths) => { for (const f of paths || []) if (typeof f === 'string') ownAllowed.add(f); });
ipcMain.handle('off:ownPaths', (_e, paths) => {
  const ok = (paths || []).filter(f => ownAllowed.delete(f));
  return parseOwnFiles(ok);
});
ipcMain.handle('off:ownClear', () => { pendingOwn.clear(); });

ipcMain.handle('off:ownSave', async (_e, items) => {
  const lib = await getLibrary();
  const entries = [], errors = [], exists = [];
  for (const o of items || []) {
    const p = pendingOwn.get(o.id);
    if (!p) { errors.push(`${o.title || o.id}: Datei nicht mehr geladen`); continue; }
    try {
      entries.push(await lib.addOwn({ ...o, text: p.text, sectionNames: p.sectionNames, source: p.source, replace: !!o.replace }));
      pendingOwn.delete(o.id);
    } catch (err) {
      if (err.code === 'EXISTS') exists.push({ id: o.id, title: o.title, versionTitle: o.versionTitle || 'Eigener Text' }); // Rückfrage in der Oberfläche
      else errors.push(`${o.title || o.id}: ${err.message}`);
    }
  }
  invalidateReads();
  return { entries, errors, exists };
});

// Eigenen Text aus der gemerkten Quelldatei neu einlesen (Titel, Sprache, Version bleiben)
ipcMain.handle('off:ownReload', async (_e, rel) => {
  try {
    const lib = await getLibrary();
    const en = lib.index.entries[rel];
    if (!en || !en.own) return { error: 'Das ist kein eigener Text.' };
    if (!en.source) return { error: 'Zu diesem Text ist die Quelldatei nicht gemerkt – bitte erneut über „Eigener Text…“ einbinden.' };
    let parsed;
    try { parsed = await readOwnParsed(en.source); } catch { return { error: 'Die Quelldatei wurde nicht gefunden: ' + en.source }; }
    const entry = await lib.addOwn({ title: en.title, heTitle: en.heTitle, kind: en.kind, versionTitle: en.versionTitle, categories: en.categories, text: parsed.text, sectionNames: parsed.sectionNames, source: en.source, replace: true });
    invalidateReads();
    return { entry, segments: parsed.segments, warnings: parsed.warnings };
  } catch (err) { return { error: err.message }; }
});

// DSL-Wörterbücher (liegen im Unterordner dict/ der Bibliothek)
let dictsP = null;
const getDicts = () => dictsP || (dictsP = getLibrary().then(async lib => { const d = new DSL.Dictionaries(path.join(lib.dir, 'dict')); try { await d.importBundled(path.join(__dirname, 'bundled')); } catch { /* mitgelieferte Wörterbücher sind nur ein Zusatz */ } return d; }).catch(err => { dictsP = null; throw err; }));
ipcMain.handle('dict:list', async () => { try { return { list: await (await getDicts()).list() }; } catch (err) { return { list: [], error: err.message }; } });
ipcMain.handle('dict:add', async e => {
  const r = await dialog.showOpenDialog(winOf(e), { title: 'DSL-Wörterbuch wählen (mehrere möglich)', properties: ['openFile', 'multiSelections'], filters: [{ name: 'DSL-Wörterbuch', extensions: ['dsl', 'dz'] }, { name: 'Alle Dateien', extensions: ['*'] }] });
  if (r.canceled) return { cancelled: true };
  const d = await getDicts(), added = [], errors = [];
  for (const f of r.filePaths) {
    try { added.push(await d.add(await fs.readFile(f), f)); } catch (err) { errors.push(`${path.basename(f)}: ${err.message}`); }
  }
  dictsP = null; // Index neu laden
  return { added, errors };
});
ipcMain.handle('dict:order', async (_e, ids) => { try { await (await getDicts()).setOrder((Array.isArray(ids) ? ids : []).map(String).filter(x => /^[0-9a-f]{12}$/.test(x))); return {}; } catch (err) { return { error: err.message }; } });
ipcMain.handle('dict:remove', async (_e, id) => { try { await (await getDicts()).remove(String(id)); return {}; } catch (err) { return { error: err.message }; } });
ipcMain.handle('dict:lookup', async (_e, q, only) => { try { return { results: await (await getDicts()).lookup(String(q || '').slice(0, 100), { only: /^[0-9a-f]{12}$/.test(String(only || '')) ? String(only) : '' }) }; } catch (err) { return { results: [], error: err.message }; } });

ipcMain.handle('dict:suggest', async (_e, q) => { try { return { list: await (await getDicts()).suggest(String(q || '').slice(0, 60)) }; } catch { return { list: [] }; } });

ipcMain.handle('off:ownExportBundle', async e => {
  const lib = await getLibrary();
  const r = await dialog.showOpenDialog(winOf(e), { title: 'Ordner „bundled“ im Projekt wählen (oder neuen Ordner anlegen)', properties: ['openDirectory', 'createDirectory'] });
  if (r.canceled || !r.filePaths[0]) return { cancelled: true };
  try { return { count: await lib.exportBundled(r.filePaths[0]), dir: r.filePaths[0] }; } catch (err) { return { error: err.message }; }
});

ipcMain.handle('off:ownRemove', async (_e, rel) => {
  try { await (await getLibrary()).removeOwn(rel); invalidateReads(); return {}; } catch (err) { return { error: err.message }; }
});



// Lesezeichen und Notizen (liegen als notes.json im Bibliotheksordner)
let notesChain = Promise.resolve();
async function notesFile() { return path.join((await getLibrary()).dir, 'notes.json'); }
async function readNotes() {
  try { const j = JSON.parse(await fs.readFile(await notesFile(), 'utf8')); return Array.isArray(j.items) ? j.items : []; } catch { return []; }
}
function writeNotes(fn) {
  notesChain = notesChain.then(async () => {
    const items = await readNotes();
    const out = fn(items) || items;
    const f = await notesFile();
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f + '.tmp', JSON.stringify({ version: 1, items: out }));
    await fs.rename(f + '.tmp', f);
    return out;
  });
  return notesChain;
}
ipcMain.handle('notes:list', () => readNotes());
ipcMain.handle('notes:save', (_e, item) => writeNotes(items => {
  const i = items.findIndex(x => x.id === item.id);
  const rec = { ...item, ts: Date.now() };
  if (i >= 0) items[i] = rec; else items.push(rec);
  return items;
}));
ipcMain.handle('notes:delete', (_e, id) => writeNotes(items => items.filter(x => x.id !== id)));

// Verknüpfungen (Links zwischen Texten)
let linkStore = null, linkCancel = false;
async function getLinks() {
  const lib = await getLibrary();
  if (!linkStore || linkStore.dir !== path.join(lib.dir, 'links')) linkStore = new LK.LinkStore(lib.dir, fetchBuffer);
  return linkStore;
}
ipcMain.handle('links:status', async () => (await getLinks()).status());
ipcMain.handle('links:build', async e => {
  linkCancel = false;
  const st = await getLinks();
  try {
    return await st.build({
      isCancelled: () => linkCancel,
      onProgress: p => { if (!e.sender.isDestroyed()) e.sender.send('links:progress', p); },
    });
  } catch (err) { return { error: err.message }; }
});
ipcMain.on('links:cancel', () => { linkCancel = true; });
// Eigene Kommentare: ein eigener Text mit dem Titel „<Name> on <Buch>“ (Sefaria-Schreibweise) erscheint in der Kommentarleiste von <Buch>,
// ohne dass es dafür Verknüpfungen bei Sefaria geben muss. Jeder nicht leere Vers des Kommentars wird zum Vers des Buches verknüpft.
async function ownCommentaryLinks(book, chap) {
  const lib = await getLibrary();
  const seen = new Set(), out = [];
  for (const e of lib.list()) {
    if (!e.own) continue;
    const m = /^(.+?) on (.+)$/.exec(e.title);
    if (!m || m[2] !== book || seen.has(e.title)) continue;
    seen.add(e.title);
    let d = readCache.get(e.rel);
    if (!d) { try { d = await lib.read(e.rel); } catch { continue; } readCache.set(e.rel, d); if (readCache.size > 4) readCache.delete(readCache.keys().next().value); }
    if (!d || !Array.isArray(d.text)) continue;
    const talmud = d.sectionNames && d.sectionNames[0] === 'Daf';
    const c = String(chap).toLowerCase();
    const idx = /[ab]$/.test(c) ? (parseInt(c, 10) - 1) * 2 + (c.endsWith('a') ? 0 : 1) : (talmud ? (parseInt(c, 10) - 1) * 2 : parseInt(c, 10) - 1);
    const node = d.text[idx];
    if (!Array.isArray(node)) continue;
    node.forEach((v, j) => {
      const filled = Array.isArray(v) ? v.some(x => String(x || '').trim()) : String(v || '').trim();
      if (filled) out.push({ v1: j + 1, v2: j + 1, other: `${e.title} ${chap}:${j + 1}`, type: 'commentary', cat: 'Commentary' });
    });
  }
  return out;
}
ipcMain.handle('links:section', async (_e, book, chap) => {
  const base = await (await getLinks()).forSection(book, chap);
  try { return base.concat(await ownCommentaryLinks(book, chap)); } catch { return base; }
});
// Texte mehrerer Stellen auf einmal holen (Kommentar-Bereich): jede Datei wird nur einmal gelesen
ipcMain.handle('links:texts', async (_e, refs, prefer, strict) => {
  const lib = await getLibrary();
  const list = lib.list();
  const order = strict ? [prefer] : [prefer, 'en', 'de', 'he', 'other'].filter((k, i, a) => k && a.indexOf(k) === i);
  const rank = e => { const r = order.indexOf(e.kind); return (r < 0 ? 9 : r) * 10 + (e.versionTitle === 'merged' ? 0 : 1); };
  const byBook = new Map();
  for (const ref of refs) {
    const { book, tail } = LK.splitRef(ref);
    if (!byBook.has(book)) byBook.set(book, []);
    byBook.get(book).push({ ref, tail });
  }
  const out = {};
  for (const [book, items] of byBook) {
    const [baseTitle, nodeName] = String(book).split(/, (.+)/); // „Rav Hirsch on Torah, Genesis“ = Buch + Teilbereich
    const cand = list.filter(x => x.title === baseTitle && (!strict || x.kind === prefer)).sort((a, b) => rank(a) - rank(b));
    if (!cand.length) { items.forEach(i => { out[i.ref] = { missing: true }; }); continue; }
    const load = async c => {
      let d = readCache.get(c.rel);
      if (!d) {
        try { d = await lib.read(c.rel); } catch { return null; }
        readCache.set(c.rel, d);
        if (readCache.size > 4) readCache.delete(readCache.keys().next().value);
      }
      return d;
    };
    for (const i of items) {
      let found = null;
      for (const c of cand) { // alle Fassungen der Sprache durchprobieren, bis der Vers gefunden ist
        const d = await load(c);
        if (!d) continue;
        let dd = d;
        if (nodeName) { const sub = d.text && !Array.isArray(d.text) ? d.text[nodeName] : null; dd = sub ? { ...d, text: sub, sectionNames: [] } : null; }
        const t = dd ? LK.resolveText(dd, i.tail) : null;
        if (t) { found = { items: t, kind: c.kind, versionTitle: c.versionTitle }; break; }
      }
      out[i.ref] = found || { nopreview: true };
    }
  }
  return out;
});

ipcMain.handle('links:preview', async (_e, ref) => {
  const { book, tail } = LK.splitRef(ref);
  const lib = await getLibrary();
  const cand = lib.list().filter(x => x.title === book);
  if (!cand.length) return { missing: true };
  const rank = { en: 0, de: 1, he: 2, other: 3 };
  cand.sort((a, b) => (rank[a.kind] - rank[b.kind]) || ((a.versionTitle === 'merged' ? 0 : 1) - (b.versionTitle === 'merged' ? 0 : 1)));
  try {
    const d = await lib.read(cand[0].rel);
    const items = LK.resolveText(d, tail);
    return items ? { items: items.slice(0, 6), kind: cand[0].kind, he: cand[0].kind === 'he' } : { nopreview: true };
  } catch { return { nopreview: true }; }
});

// Export eines Abschnitts als PDF oder Word-Datei
ipcMain.handle('off:exportSave', async (e, { html, format, name, landscape }) => {
  try {
    const pdf = format === 'pdf';
    const { canceled, filePath } = await dialog.showSaveDialog(winOf(e), { defaultPath: `${String(name || 'Export').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')}.${pdf ? 'pdf' : 'doc'}` });
    if (canceled || !filePath) return {};
    if (!pdf) {
      // Word öffnet HTML-Dateien mit der Endung .doc
      await fs.writeFile(filePath, html.replace('<html>', '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">'), 'utf8');
      return { path: filePath };
    }
    // über eine Temp-Datei statt data:-URL (lange Texte sprengen sonst das URL-Limit)
    const tmp = path.join(app.getPath('temp'), `sefaria-export-${Date.now()}.html`);
    await fs.writeFile(tmp, html, 'utf8');
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
    let buf;
    try {
      await win.loadFile(tmp);
      buf = await win.webContents.printToPDF({ pageSize: 'A4', landscape: !!landscape, printBackground: true, margins: { marginType: 'default' } });
    } finally { win.destroy(); fs.unlink(tmp).catch(() => {}); }
    await fs.writeFile(filePath, buf);
    return { path: filePath };
  } catch (err) { return { error: err.message }; }
});

// Aktualisieren: Katalog neu laden, geänderte/neue Dateien erkennen und nachladen
let lastUpdate = null;
async function fetchSize(url) {
  const res = await net.fetch(url, { method: 'HEAD' });
  if (!res.ok) return null;
  const n = parseInt(res.headers.get('content-length') || '', 10);
  return Number.isFinite(n) ? n : null;
}
ipcMain.handle('off:updateCheck', async e => {
  try {
    const buf = await fetchBuffer(CATALOG_URL);
    const parsed = JSON.parse(buf.toString('utf8'));
    if (!parsed || !Array.isArray(parsed.books)) throw new Error('Unerwartetes Katalogformat');
    await fs.mkdir(path.dirname(catalogFile()), { recursive: true });
    await fs.writeFile(catalogFile(), buf);
    catCache = null;
    dlCancel = false;
    const lib = await getLibrary();
    const r = await lib.checkUpdates(parsed.books, fetchSize, {
      isCancelled: () => dlCancel,
      onProgress: p => { if (!e.sender.isDestroyed()) e.sender.send('off:progress', { ...p, current: 'Prüfe Dateien …', check: true }); },
    });
    lastUpdate = r;
    return { checked: r.checked, changed: r.changed.length, added: r.added.length, cancelled: r.cancelled };
  } catch (err) { return { error: err.message }; }
});
ipcMain.handle('off:updateRun', async e => {
  if (!lastUpdate) return { error: 'Zuerst prüfen.' };
  const lib = await getLibrary();
  dlCancel = false;
  const r = await lib.applyUpdates(lastUpdate.changed, lastUpdate.added, {
    concurrency: 4, isCancelled: () => dlCancel,
    onProgress: p => { if (!e.sender.isDestroyed()) e.sender.send('off:progress', p); },
  });
  invalidateReads();
  if (!r.cancelled) lastUpdate = null;
  return r;
});

ipcMain.handle('off:chooseDir', async e => {
  const r = await dialog.showOpenDialog(winOf(e), {
    title: 'Speicherort der Offline-Bibliothek',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (!r.canceled && r.filePaths[0]) {
    // Notizen und Lesezeichen in den neuen Ordner mitnehmen, falls dort noch keine liegen
    try {
      const oldNotes = await notesFile(), newNotes = path.join(r.filePaths[0], 'notes.json');
      if (oldNotes !== newNotes) { try { await fs.access(newNotes); } catch { await fs.copyFile(oldNotes, newNotes); } }
    } catch {}
    await fs.writeFile(configFile(), JSON.stringify({ dir: r.filePaths[0] }));
    libraryP = null; invalidateReads();
  }
  return offState();
});

ipcMain.handle('off:reveal', async () => {
  const lib = await getLibrary();
  await fs.mkdir(lib.dir, { recursive: true });
  return shell.openPath(lib.dir);
});

app.whenReady().then(() => { try { if (process.platform === 'darwin' && app.dock) app.dock.setIcon(path.join(__dirname, 'build', 'icon.png')); } catch { /* Symbol nur ein Zusatz */ } }).catch(() => {});
app.whenReady().then(() => {
  session.defaultSession.setUserAgent(cleanUA(session.defaultSession.getUserAgent()));
  buildMenu();
  openOffline();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) openOffline(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
