// Rückfrage bei eigenen/geänderten Fassungen, die auch mit der App geliefert werden.
// Keine Netzwerkzugriffe; Entscheidungen gelten für genau das angebotene Dateipaar.
const fs = require('fs/promises');
const path = require('path');
const { createHash, randomUUID } = require('crypto');
const hash = buf => createHash('sha1').update(buf).digest('hex');
const key = rel => rel.normalize('NFC');
const valid = rel => /^own\/[^\\]+\/(he|en|de|other)\/[^/\\]+\.json$/.test(rel) && !rel.includes('..');

class TextUpdates {
  constructor(library) {
    this.library = library;
    this.plans = new Map();
    this.changed = false;
    this.backups = [];
    this.errors = [];
    this.backupDir = path.join(library.dir, 'backups', 'text-updates', new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID());
  }

  async review(entries, have, skip, confirm) {
    const candidates = [];
    for (const { it, src, priv } of entries) {
      const rel = String(it.rel || ''), normalized = key(rel);
      if (priv || !valid(rel) || skip.has(normalized)) continue;
      const currentKey = have.get(normalized), cur = this.library.index.entries[currentKey];
      if (!cur || cur.private || (cur.bundled && cur.bundledHash === it.hash)) continue;
      let old;
      try { old = await fs.readFile(path.join(this.library.dir, currentKey)); }
      catch { continue; } // Fehlende Dateien nicht als Konflikt behandeln.
      const localHash = hash(old);
      const plan = { currentKey, localHash, newHash: it.hash, allowed: false, backup: false };
      this.plans.set(normalized, plan);
      if (localHash === it.hash) { plan.allowed = true; continue; } // identische eigene Fassung erkennen
      if (cur.bundled && localHash === cur.bundledHash && typeof confirm !== 'function') { plan.allowed = true; continue; }
      if (typeof confirm !== 'function') continue; // ohne Dialog keine eigene Fassung überschreiben
      const declined = (this.library.index.textUpdateDeclined || {})[normalized];
      if (declined && declined.localHash === localHash && declined.newHash === it.hash) continue;
      // Nur tatsächlich vorhandene, zur Prüfsumme passende neue Fassungen anbieten.
      try {
        let incoming;
        try { incoming = await fs.readFile(path.join(src, rel)); }
        catch { incoming = await fs.readFile(path.join(src, rel.normalize('NFD'))); }
        if (hash(incoming) !== it.hash) throw new Error('Prüfsumme der neuen Fassung stimmt nicht');
      } catch (err) { this.errors.push(it.title + ': ' + err.message); continue; }
      candidates.push({ rel, title: it.title, versionTitle: it.versionTitle, localHash, newHash: it.hash });
    }
    if (!candidates.length) return;
    const accepted = new Set(await confirm(candidates));
    const declined = this.library.index.textUpdateDeclined || (this.library.index.textUpdateDeclined = {});
    for (const item of candidates) {
      const normalized = key(item.rel), plan = this.plans.get(normalized);
      if (accepted.has(item.rel)) { plan.allowed = true; plan.backup = true; }
      else {
        declined[normalized] = { localHash: item.localHash, newHash: item.newHash };
        this.changed = true;
      }
    }
  }

  plan(rel) { return this.plans.get(key(rel)); }

  async install(rel, buf) {
    const plan = this.plan(rel);
    if (!plan || !plan.allowed) throw new Error('Textupdate nicht freigegeben');
    if (hash(buf) !== plan.newHash) throw new Error('Prüfsumme der neuen Fassung stimmt nicht');
    const dest = path.join(this.library.dir, plan.currentKey);
    const old = await fs.readFile(dest);
    if (hash(old) !== plan.localHash) throw new Error('Die bisherige Fassung wurde inzwischen verändert; nicht ersetzt');
    if (plan.backup) {
      const backup = path.join(this.backupDir, plan.currentKey);
      await fs.mkdir(path.dirname(backup), { recursive: true });
      await fs.writeFile(backup, old, { flag: 'wx' }); // muss vor dem Ersetzen erfolgreich sein
      this.backups.push(backup);
    }
    const tmp = path.join(path.dirname(dest), '.safran-update-' + randomUUID() + '.tmp');
    try {
      await fs.writeFile(tmp, buf, { flag: 'wx' });
      if (hash(await fs.readFile(dest)) !== plan.localHash) throw new Error('Die bisherige Fassung wurde inzwischen verändert; nicht ersetzt');
      await fs.rename(tmp, dest);
    } finally { await fs.unlink(tmp).catch(() => {}); }
    if (this.library.index.textUpdateDeclined) delete this.library.index.textUpdateDeclined[key(rel)];
  }
}

async function confirmTextUpdates(candidates, showDialog, translate = de => de) {
  const groups = new Map();
  for (const item of candidates) {
    const k = (item.versionTitle || '').normalize('NFC');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(item);
  }
  const accepted = [];
  for (const items of groups.values()) {
    const books = items.map(x => x.title).join(', ');
    const n = items.length;
    const result = await showDialog({
      type: 'question',
      title: translate('Neue Textfassung verfügbar', 'New text version available'),
      message: n === 1 ? translate('Vorhandene Fassung durch die neue ersetzen?', 'Replace the existing text with the new version?')
        : translate(`${n} vorhandene Texte durch die neuen Fassungen ersetzen?`, `Replace ${n} existing texts with the new versions?`),
      detail: items[0].versionTitle + '\n\n' + books + '\n\n' + translate(
        'Für diese bereits gespeicherten Texte liefert die App eine andere Fassung. Vor dem Ersetzen werden die bisherigen Dateien im Bibliotheksordner unter „backups/text-updates“ gesichert. „Behalten“ gilt für diese angebotene Fassung; bei einer späteren Textänderung wird erneut gefragt.',
        'The app includes different versions of these texts already in your library. Before replacement, the existing files are backed up under “backups/text-updates” in the library folder. “Keep” applies to this offered version; a later text change will prompt again.'),
      buttons: [translate('Bisherige Fassung behalten', 'Keep existing version'), translate('Neue Fassung übernehmen', 'Use new version')],
      defaultId: 0, cancelId: 0, noLink: true,
    });
    if (result && result.response === 1) accepted.push(...items.map(x => x.rel));
  }
  return accepted;
}

module.exports = { TextUpdates, confirmTextUpdates };
