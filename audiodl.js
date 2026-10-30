// Audio-Download: Zip-Dateien pro Buch aus einem GitHub-Release laden und in den Audio-Ordner der App entpacken.
// Release-Tag „audio“, Dateien „Audio_<Buch>.zip“ (Buch mit Unterstrichen, z. B. Audio_I_Samuel.zip); im Zip liegen die Versdateien („Genesis_001_001.mp3“) direkt oder in einem Unterordner.
const fs = require('fs/promises');
const fss = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const REPO = 'mitkin89/Safran', TAG = 'audio';
const bookOf = name => name.replace(/^Audio_/, '').replace(/\.zip$/i, '').replace(/_/g, ' ');

async function listAssets(fetchFn) {
  const r = await fetchFn(`https://api.github.com/repos/${REPO}/releases/tags/${TAG}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Safran' } });
  if (r.status === 404) return { items: [], none: true };
  if (!r.ok) throw new Error('GitHub antwortet mit ' + r.status);
  const j = await r.json();
  const items = (j.assets || []).filter(a => /^Audio_.+\.zip$/i.test(a.name)).map(a => ({ name: a.name, book: bookOf(a.name), size: a.size, url: a.browser_download_url }));
  return { items, none: false };
}

// Zip entpacken (nur „gespeichert“ und „deflate“, kein Zip64): liest das Inhaltsverzeichnis am Dateiende
async function unzip(zipPath, destDir, onFile, isCancelled) {
  const fh = await fs.open(zipPath, 'r');
  try {
    const { size } = await fh.stat();
    const tailLen = Math.min(size, 65557), tail = Buffer.alloc(tailLen);
    await fh.read(tail, 0, tailLen, size - tailLen);
    let e = -1; for (let i = tailLen - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('Keine gültige Zip-Datei');
    const n = tail.readUInt16LE(e + 10), cdSize = tail.readUInt32LE(e + 12), cdOff = tail.readUInt32LE(e + 16);
    if (cdOff === 0xffffffff || n === 0xffff) throw new Error('Zip64 wird nicht unterstützt');
    const cd = Buffer.alloc(cdSize); await fh.read(cd, 0, cdSize, cdOff);
    let p = 0, done = 0;
    for (let k = 0; k < n; k++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) throw new Error('Zip beschädigt');
      const flags = cd.readUInt16LE(p + 8), method = cd.readUInt16LE(p + 10), csize = cd.readUInt32LE(p + 20), usize = cd.readUInt32LE(p + 24);
      const nl = cd.readUInt16LE(p + 28), xl = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32), off = cd.readUInt32LE(p + 42);
      const name = cd.slice(p + 46, p + 46 + nl).toString((flags & 0x800) ? 'utf8' : 'utf8');
      p += 46 + nl + xl + cl;
      if (name.endsWith('/') || /(^|\/)(__MACOSX|\.)/.test(name) || /(^|\/)\._/.test(name)) continue;
      const base = path.basename(name); if (!/\.(mp3|m4a|wav|ogg|aac|csv)$/i.test(base)) continue;
      if (isCancelled && isCancelled()) throw new Error('abgebrochen');
      const lh = Buffer.alloc(30); await fh.read(lh, 0, 30, off);
      if (lh.readUInt32LE(0) !== 0x04034b50) throw new Error('Zip beschädigt');
      const start = off + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28);
      const out = path.join(destDir, base), tmp = out + '.part';
      const src = fss.createReadStream(zipPath, { start, end: start + csize - 1 });
      if (method === 0) await pipeline(src, fss.createWriteStream(tmp));
      else if (method === 8) await pipeline(src, zlib.createInflateRaw(), fss.createWriteStream(tmp));
      else throw new Error('Zip-Methode ' + method + ' wird nicht unterstützt');
      await fs.rename(tmp, out); done++; if (onFile) onFile(done, n, base);
    }
    return done;
  } finally { await fh.close(); }
}

async function downloadFile(fetchFn, url, dest, onBytes, isCancelled) {
  const r = await fetchFn(url, { headers: { 'User-Agent': 'Safran' }, redirect: 'follow' });
  if (!r.ok) throw new Error('Download: HTTP ' + r.status);
  let got = 0; const total = +r.headers.get('content-length') || 0;
  const src = Readable.fromWeb(r.body);
  src.on('data', c => { got += c.length; if (onBytes) onBytes(got, total); if (isCancelled && isCancelled()) src.destroy(new Error('abgebrochen')); });
  await pipeline(src, fss.createWriteStream(dest));
}

async function fetchBooks({ fetchFn, items, dir, onProgress, isCancelled }) {
  await fs.mkdir(dir, { recursive: true });
  let files = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i], tmp = path.join(dir, '.dl-' + it.name);
    const prog = (phase, extra) => onProgress && onProgress({ i, n: items.length, book: it.book, phase, ...extra });
    try {
      prog('Lade', { got: 0, total: it.size });
      await downloadFile(fetchFn, it.url, tmp, (got, total) => prog('Lade', { got, total: total || it.size }), isCancelled);
      prog('Entpacke', {});
      files += await unzip(tmp, dir, (d, n) => prog('Entpacke', { d, nf: n }), isCancelled);
    } finally { await fs.unlink(tmp).catch(() => {}); }
  }
  return files;
}

module.exports = { listAssets, unzip, fetchBooks, bookOf, TAG, REPO };
