'use strict';
// Negative file filter only: actual matches, positions and counts still come from the source.
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
async function open(dir, entry, cacheDir) {
  if (!cacheDir) return null;
  try {
    const source = path.resolve(dir, entry.rel), stat = await fs.stat(source);
    const identity = `${source}\0${stat.size}\0${stat.mtimeMs}\0${stat.ctimeMs}`;
    const file = path.join(cacheDir, 'concordance-surface-v1', crypto.createHash('sha256').update(identity).digest('hex') + '.json');
    let words = null;
    try {
      const saved = JSON.parse(await fs.readFile(file, 'utf8'));
      if (Array.isArray(saved) && saved.every(word => typeof word === 'string')) words = new Set(saved);
    } catch { /* Missing or damaged cache: search the original text. */ }
    return { words, async save(vocabulary) {
      let temporary;
      try {
        const current = await fs.stat(source);
        if (current.size !== stat.size || current.mtimeMs !== stat.mtimeMs || current.ctimeMs !== stat.ctimeMs) return;
        await fs.mkdir(path.dirname(file), {recursive: true});
        temporary = file + '.' + process.pid + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
        await fs.writeFile(temporary, JSON.stringify([...vocabulary]));
        await fs.rename(temporary, file);
      } catch { /* An unwritable cache must never prevent a search. */ }
      finally { if (temporary) await fs.unlink(temporary).catch(() => {}); }
    }};
  } catch { return null; }
}
module.exports = {open};
