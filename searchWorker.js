'use strict';
const { parentPort, workerData } = require('worker_threads');
const { searchFiles } = require('./searchcore');
let cancelled = false;
parentPort.on('message', m => { if (m === 'cancel') cancelled = true; });
searchFiles({
  dir: workerData.dir, entries: workerData.entries, cacheDir: workerData.cacheDir, params: workerData.params,
  onProgress: p => parentPort.postMessage({ type: 'progress', p }),
  isCancelled: () => cancelled,
}).then(res => parentPort.postMessage({ type: 'done', res }), err => parentPort.postMessage({ type: 'error', error: String((err && err.message) || err) }));
