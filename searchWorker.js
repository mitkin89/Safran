'use strict';
const { parentPort, workerData } = require('worker_threads');
let cancelled = false;
parentPort.on('message', m => { if (m === 'cancel') cancelled = true; });
const isCancelled = () => cancelled;
const search = workerData.outline
  ? require('./outline-store').searchOutlines(workerData.dirs, workerData.outline, isCancelled)
  : require('./searchcore').searchFiles({
    dir: workerData.dir, entries: workerData.entries, cacheDir: workerData.cacheDir, params: workerData.params,
    onProgress: p => parentPort.postMessage({ type: 'progress', p }),
    isCancelled,
  });
search.then(res => parentPort.postMessage({ type: 'done', res }), err => parentPort.postMessage({ type: 'error', error: String((err && err.message) || err) }))
  .finally(() => parentPort.close());
