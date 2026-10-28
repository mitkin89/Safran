'use strict';
// Baut den Such-Cache im Hintergrund vor (damit auch die erste Suche schnell ist)
const { parentPort, workerData } = require('worker_threads');
let cancelled = false;
parentPort.on('message', m => { if (m === 'cancel') cancelled = true; });
require('./searchcore').buildCache({ dir: workerData.dir, entries: workerData.entries, cacheDir: workerData.cacheDir, isCancelled: () => cancelled })
  .then(n => parentPort.postMessage({ type: 'done', n }), () => parentPort.postMessage({ type: 'done', n: 0 }));
