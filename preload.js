const { contextBridge, ipcRenderer, webUtils } = require('electron');
const lib = require('./lib');
const sef = require('./sefaria');

// Dateien, die ins Fenster gezogen werden, an die Oberfläche weitergeben (Pfade gibt es nur hier im Preload)
let ownDropCb = null;
window.addEventListener('drop', async e => {
  const files = [...((e.dataTransfer && e.dataTransfer.files) || [])];
  if (!files.length || !ownDropCb) return;
  const paths = files.map(f => { try { return webUtils.getPathForFile(f); } catch { return ''; } }).filter(Boolean);
  if (paths.length) { ipcRenderer.send('off:ownDropAllow', paths); ownDropCb(await ipcRenderer.invoke('off:ownPaths', paths)); }
}, true);

contextBridge.exposeInMainWorld('platform', { isMac: process.platform === 'darwin', mod: process.platform === 'darwin' ? 'Cmd' : 'Strg', files: process.platform === 'darwin' ? 'Finder' : 'Explorer' });
contextBridge.exposeInMainWorld('lib', {
  parseCSV: lib.parseCSV,
  toCSV: lib.toCSV,
  validateRows: lib.validateRows,
  textToRows: lib.textToRows,
  compareSegments: lib.compareSegments,
  stripHtml: lib.stripHtml,
  segmentsFromText: sef.segmentsFromText,
  textUrl: sef.textUrl,
  encRef: sef.encRef,
  LANG_NAMES: sef.LANG_NAMES,
});

contextBridge.exposeInMainWorld('offline', {
  state: () => ipcRenderer.invoke('off:state'),
  catalogFetch: () => ipcRenderer.invoke('off:catalogFetch'),
  summary: () => ipcRenderer.invoke('off:summary'),
  plan: (sel, opts) => ipcRenderer.invoke('off:plan', sel, opts),
  download: (sel, opts) => ipcRenderer.invoke('off:download', sel, opts),
  cancel: () => ipcRenderer.send('off:cancel'),
  exportSave: o => ipcRenderer.invoke('off:exportSave', o),
  updateCheck: () => ipcRenderer.invoke('off:updateCheck'),
  updateRun: () => ipcRenderer.invoke('off:updateRun'),
  library: () => ipcRenderer.invoke('off:library'),
  read: rel => ipcRenderer.invoke('off:read', rel),
  search: o => ipcRenderer.invoke('off:search', o),
  cancelSearch: () => ipcRenderer.send('off:cancelSearch'),
  ownPick: () => ipcRenderer.invoke('off:ownPick'),
  ownSave: o => ipcRenderer.invoke('off:ownSave', o),
  ownClear: () => ipcRenderer.invoke('off:ownClear'),
  onOwnDrop: cb => { ownDropCb = cb; },
  ownExportBundle: () => ipcRenderer.invoke('off:ownExportBundle'),
  dictList: () => ipcRenderer.invoke('dict:list'),
  dictAdd: () => ipcRenderer.invoke('dict:add'),
  dictRemove: id => ipcRenderer.invoke('dict:remove', id),
  dictLookup: q => ipcRenderer.invoke('dict:lookup', q),
  ownRemove: rel => ipcRenderer.invoke('off:ownRemove', rel),
  ownReload: rel => ipcRenderer.invoke('off:ownReload', rel),
  onFindOpen: cb => ipcRenderer.on('find:open', () => cb()),
  chooseDir: () => ipcRenderer.invoke('off:chooseDir'),
  reveal: () => ipcRenderer.invoke('off:reveal'),
  onProgress: cb => ipcRenderer.on('off:progress', (_e, d) => cb(d)),
  onSearchProgress: cb => ipcRenderer.on('off:searchProgress', (_e, d) => cb(d)),
});

contextBridge.exposeInMainWorld('notes', {
  list: () => ipcRenderer.invoke('notes:list'),
  save: i => ipcRenderer.invoke('notes:save', i),
  remove: id => ipcRenderer.invoke('notes:delete', id),
});

contextBridge.exposeInMainWorld('links', {
  status: () => ipcRenderer.invoke('links:status'),
  build: () => ipcRenderer.invoke('links:build'),
  cancel: () => ipcRenderer.send('links:cancel'),
  section: (book, chap) => ipcRenderer.invoke('links:section', book, chap),
  texts: (refs, prefer, strict) => ipcRenderer.invoke('links:texts', refs, prefer, !!strict),
  preview: ref => ipcRenderer.invoke('links:preview', ref),
  onProgress: cb => ipcRenderer.on('links:progress', (_e, d) => cb(d)),
});

contextBridge.exposeInMainWorld('api', {
  get: p => ipcRenderer.invoke('api:get', p),
  post: (p, b) => ipcRenderer.invoke('api:post', p, b),
  saveFile: (name, content) => ipcRenderer.invoke('file:save', name, content),
  openFile: kind => ipcRenderer.invoke('file:open', kind),
  chapterLengths: t => ipcRenderer.invoke('sefaria:lengths', t),
  downloadBook: o => ipcRenderer.invoke('book:download', o),
  cancelDownload: () => ipcRenderer.send('book:cancel'),
  onProgress: cb => ipcRenderer.on('book:progress', (_e, d) => cb(d)),
  openExternal: u => ipcRenderer.invoke('open:external', u),
});
