'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { url, hashes, format } = require('./bhsa-source');
const { readIndex } = require('./bhsa-index');
const { renameRetry } = require('./offline');

class BhsaStore {
  constructor(dir, fetchBuffer) {
    this.dir = dir;
    this.fetchBuffer = fetchBuffer;
    this.file = path.join(dir, 'bhsa-index-v' + format + '.json');
  }

  get() {
    return this.reading ||= readIndex(this.file).catch(() => null);
  }

  async status() {
    const index = await this.get();
    return index ? { ready: true, aligned: index.aligned, total: index.total } : { ready: false };
  }

  install() {
    if (this.installing) return this.installing;
    this.installing = this.downloadAndBuild().finally(() => { this.installing = null; });
    return this.installing;
  }

  async downloadAndBuild() {
    await fs.mkdir(this.dir, { recursive: true });
    const dir = await fs.mkdtemp(path.join(this.dir, '.bhsa-'));
    try {
      const downloads = await Promise.allSettled(Object.keys(hashes).map(async name => {
        const file = name + '.tf';
        await fs.writeFile(path.join(dir, file), await this.fetchBuffer(url + file));
      }));
      const failure = downloads.find(result => result.status === 'rejected');
      if (failure) throw failure.reason;
      const output = path.join(dir, 'index.json');
      await new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'bhsa-build.js'), { workerData: { bhsaBuild: true, dir, output } });
        let done = false;
        worker.once('message', () => { done = true; });
        worker.once('error', reject);
        worker.once('exit', code => {
          if (code === 0 && done) resolve();
          else reject(new Error('BHSA-Index konnte nicht erstellt werden'));
        });
      });
      await renameRetry(output, this.file);
      this.reading = null;
      return this.status();
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

module.exports = { BhsaStore };
