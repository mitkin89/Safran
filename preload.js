const { contextBridge, ipcRenderer, webUtils, webFrame } = require('electron');
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

let searchSeq = 0, activeSearch = null, activeSearchScope;
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
  bhsaStatus: () => ipcRenderer.invoke('off:bhsaStatus'),
  wordSyntax: (book, verse, position) => ipcRenderer.invoke('off:wordSyntax', book, verse, position),
  search: (o, scope) => { const requestId = ++searchSeq; activeSearch = requestId; activeSearchScope = scope; return ipcRenderer.invoke('off:search', { ...o, requestId }).finally(() => { if (activeSearch === requestId) activeSearch = null; }); },
  cancelSearch: scope => { if (activeSearch != null && scope === activeSearchScope) ipcRenderer.send('off:cancelSearch', activeSearch); },
  ownPick: () => ipcRenderer.invoke('off:ownPick'),
  interlinearRead: () => ipcRenderer.invoke('interlinear:read'),
  interlinearImport: () => ipcRenderer.invoke('interlinear:import'),
  onInterlinearChanged: cb => ipcRenderer.on('interlinear:changed', () => cb()),
  ownSave: o => ipcRenderer.invoke('off:ownSave', o),
  ownClear: () => ipcRenderer.invoke('off:ownClear'),
  onOwnDrop: cb => { ownDropCb = cb; },
  ownExportBundle: () => ipcRenderer.invoke('off:ownExportBundle'),
  dictList: () => ipcRenderer.invoke('dict:list'),
  dictAdd: () => ipcRenderer.invoke('dict:add'),
  dictOrder: ids => ipcRenderer.invoke('dict:order', ids),
  dictRemove: id => ipcRenderer.invoke('dict:remove', id),
  checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
  setLang: l => ipcRenderer.invoke('app:setLang', l),
  setTheme: t => ipcRenderer.invoke('app:setTheme', t),
  startupLog: marks => ipcRenderer.invoke('app:startupLog', marks),
  calendar: date => ipcRenderer.invoke('app:calendar', date),
  openRelease: u => ipcRenderer.invoke('app:openRelease', u),
  dictCites: (book, chap, v) => ipcRenderer.invoke('dict:cites', book, chap, v),
  dictHeads: id => ipcRenderer.invoke('dict:heads', id),
  dictSuggest: q => ipcRenderer.invoke('dict:suggest', q),
  dictLookup: (q, only, full) => ipcRenderer.invoke('dict:lookup', q, only, full),
  dictSyriacMentions: (queries, only) => ipcRenderer.invoke('dict:syriacMentions', queries, only),
  ownRemove: rel => ipcRenderer.invoke('off:ownRemove', rel),
  ownReload: rel => ipcRenderer.invoke('off:ownReload', rel),
  onFindOpen: cb => ipcRenderer.on('find:open', () => cb()),
  chooseDir: () => ipcRenderer.invoke('off:chooseDir'),
  reveal: () => ipcRenderer.invoke('off:reveal'),
  onProgress: cb => ipcRenderer.on('off:progress', (_e, d) => cb(d)),
  onSearchProgress: cb => ipcRenderer.on('off:searchProgress', (_e, d) => { if (d.requestId === activeSearch) cb(d); }),
});

contextBridge.exposeInMainWorld('uiZoom', { set: f => { const z = Math.min(2, Math.max(0.6, +f || 1)); webFrame.setZoomFactor(z); return z; } });
contextBridge.exposeInMainWorld('notes', {
  list: () => ipcRenderer.invoke('notes:list'),
  save: i => ipcRenderer.invoke('notes:save', i),
  remove: id => ipcRenderer.invoke('notes:delete', id),
  reorder: ids => ipcRenderer.invoke('notes:reorder', ids),
  merge: items => ipcRenderer.invoke('notes:merge', items),
});

contextBridge.exposeInMainWorld('links', {
  status: () => ipcRenderer.invoke('links:status'),
  build: () => ipcRenderer.invoke('links:build'),
  cancel: () => ipcRenderer.send('links:cancel'),
  section: (book, chap) => ipcRenderer.invoke('links:section', book, chap),
  texts: (refs, prefer, strict) => ipcRenderer.invoke('links:texts', refs, prefer, !!strict),
  preview: (ref, langs, pick, pref) => ipcRenderer.invoke('links:preview', ref, langs, pick, pref),
  mishnahTalmud: () => ipcRenderer.invoke('links:mishnahTalmud'),
  versification: () => ipcRenderer.invoke('links:versification'),
  onProgress: cb => ipcRenderer.on('links:progress', (_e, d) => cb(d)),
});

contextBridge.exposeInMainWorld('topics', {
  status: () => ipcRenderer.invoke('topics:status'),
  build: () => ipcRenderer.invoke('topics:build'),
  cancel: () => ipcRenderer.send('topics:cancel'),
  list: () => ipcRenderer.invoke('topics:list'),
  get: slug => ipcRenderer.invoke('topics:get', slug),
  section: (book, chap, verse) => ipcRenderer.invoke('topics:section', book, chap, verse),
  onProgress: cb => ipcRenderer.on('topics:progress', (_e, d) => cb(d)),
});

contextBridge.exposeInMainWorld('outline', { get: book => ipcRenderer.invoke('outline:get', book) });
contextBridge.exposeInMainWorld('audio', {
  index: () => ipcRenderer.invoke('audio:index'),
  pick: () => ipcRenderer.invoke('audio:pick'),
  clear: () => ipcRenderer.invoke('audio:clear'),
  list: () => ipcRenderer.invoke('audio:list'),
  get: items => ipcRenderer.invoke('audio:get', items),
  stop: () => ipcRenderer.invoke('audio:stop'),
  onProgress: cb => ipcRenderer.on('audio:progress', (_e, d) => cb(d)),
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
  openKennicott: u => ipcRenderer.invoke('open:kennicott', u),
});


contextBridge.exposeInMainWorld('research', {
  state: () => ipcRenderer.invoke('research:state'),
  sheetPreview: sheet => ipcRenderer.invoke('research:sheetPreview', sheet),
  put: (kind, record, version) => ipcRenderer.invoke('research:put', kind, record, version),
  remove: (kind, id, version) => ipcRenderer.invoke('research:remove', kind, id, version),
  legacyNote: (record, ts) => ipcRenderer.invoke('research:legacyNote', record, ts),
  sections: rel => ipcRenderer.invoke('research:sections', rel),
  capture: request => ipcRenderer.invoke('research:capture', request),
  workEditions: reference => ipcRenderer.invoke('research:workEditions', reference),
  sourceEditionPreview: request => ipcRenderer.invoke('research:sourceEditionPreview', request),
  translationEditions: reference => ipcRenderer.invoke('research:translationEditions', reference),
  translationPreview: request => ipcRenderer.invoke('research:translationPreview', request),
  relatedComments: (reference,options) => ipcRenderer.invoke('research:relatedComments', reference,options),
  suggestWorks: query => ipcRenderer.invoke('research:suggestWorks', query),
  sourceEditions: query => ipcRenderer.invoke('research:sourceEditions', query),
  sourcePreview: request => ipcRenderer.invoke('research:sourcePreview', request),
  searchSources: request => ipcRenderer.invoke('research:searchSources', request),
  cancelSourceSearch: id => ipcRenderer.invoke('research:cancelSourceSearch', id),
  captureCommentary: request => ipcRenderer.invoke('research:captureCommentary', request),
  captureHits: request => ipcRenderer.invoke('research:captureHits', request),
  import: () => ipcRenderer.invoke('research:import'),
  export: request => ipcRenderer.invoke('research:export', request),
  onChanged: cb => ipcRenderer.on('research:changed', () => cb()),
});
