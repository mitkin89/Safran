'use strict';
const path = require('path');
const { Worker } = require('worker_threads');

const emptyResult = () => ({ results: [], stats: [], dist: [], scanned: 0, total: 0, truncated: false, capped: false, cancelled: true });
// Das zweite Lesefenster teilt webContents mit dem ersten, hat aber einen eigenen Frame.
const ownerOf = event => `${event.sender.id}:${event.senderFrame ? event.senderFrame.routingId : 0}`;

class SearchJobs {
  constructor() { this.jobs = new Map(); }
  begin(owner, requestId) {
    this.cancel(owner);
    const job = { owner, requestId, cancelled: false, stop: null };
    this.jobs.set(owner, job);
    return job;
  }
  current(job) { return this.jobs.get(job.owner) === job && !job.cancelled; }
  cancel(owner, requestId) {
    const job = this.jobs.get(owner);
    if (!job || (requestId != null && requestId !== job.requestId)) return;
    job.cancelled = true;
    if (job.stop) job.stop();
  }
  finish(job) { if (this.jobs.get(job.owner) === job) this.jobs.delete(job.owner); }
  cancelAll() { for (const owner of this.jobs.keys()) this.cancel(owner); }
}

function runSearchWorker(workerData, job, onProgress, WorkerClass = Worker) {
  return new Promise((resolve, reject) => {
    let worker;
    try { worker = new WorkerClass(path.join(__dirname, 'searchWorker.js'), { workerData }); }
    catch (cause) { const err = new Error('Suchprozess konnte nicht gestartet werden', { cause }); err.code = 'WORKER_UNAVAILABLE'; reject(err); return; }
    let settled = false, killTimer = null;
    const finish = (error, result) => {
      if (settled) return;
      settled = true; clearTimeout(killTimer); job.stop = null;
      // Auch fehlerhafte oder ältere Worker dürfen nach einem Ergebnis nicht weiterleben.
      Promise.resolve(worker.terminate()).catch(() => {});
      if (error) reject(error); else resolve(result);
    };
    job.stop = () => {
      if (settled || killTimer) return;
      try { worker.postMessage('cancel'); } catch { /* Worker beendet sich bereits */ }
      killTimer = setTimeout(() => finish(null, emptyResult()), 1000);
    };
    worker.on('message', message => {
      if (settled) return;
      if (message.type === 'progress') { if (!job.cancelled) onProgress(message.p); }
      else if (message.type === 'done') finish(null, job.cancelled ? emptyResult() : message.res);
      else if (message.type === 'error') finish(job.cancelled ? null : new Error(message.error), emptyResult());
    });
    worker.on('error', error => finish(job.cancelled ? null : error, emptyResult()));
    worker.on('exit', code => finish(job.cancelled ? null : new Error(`Such-Prozess beendet (${code})`), emptyResult()));
    if (job.cancelled) job.stop();
  });
}

module.exports = { SearchJobs, ownerOf, runSearchWorker, emptyResult };
