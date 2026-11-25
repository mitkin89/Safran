// Echte Bibliotheksdateien in temporären Ordnern; keine privaten Übersetzungstexte.
const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { createHash } = require('crypto');
const { Library } = require('../../offline');
const { confirmTextUpdates } = require('../../text-updates');
const sha = b => createHash('sha1').update(b).digest('hex');

(async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'safran-text-updates-'));
  let next = 0;
  async function fixture(own = true) {
    const root = path.join(tmp, String(next++)), dir = path.join(root, 'library'), pack = path.join(root, 'bundled');
    const lib = await new Library(dir).load();
    const rel = 'own/Genesis/de/Prüftext.json';
    if (own) await lib.addOwn({ title: 'Genesis', kind: 'de', versionTitle: 'Prüftext', text: [['bisherig']], sectionNames: ['Kapitel', 'Vers'] });
    async function publish(text = 'neu') {
      const buf = Buffer.from(JSON.stringify({ title: 'Genesis', language: 'English', versionTitle: 'Prüftext', text: [[text]] }));
      await fs.mkdir(path.dirname(path.join(pack, rel)), { recursive: true });
      await fs.writeFile(path.join(pack, rel), buf);
      const item = { rel, title: 'Genesis', language: 'English', versionTitle: 'Prüftext', categories: ['Tanakh', 'Torah'], kind: 'de', hash: sha(buf) };
      await fs.writeFile(path.join(pack, 'manifest.json'), JSON.stringify({ version: 1, items: [item] }));
      return { buf, item };
    }
    const incoming = await publish();
    return { root, dir, pack, lib, rel, publish, incoming, file: path.join(dir, rel) };
  }
  try {
    // Zustimmung: erst unveränderte Sicherung, danach neue Fassung und dauerhafte Zuordnung zum Paket.
    {
      const f = await fixture(), old = await fs.readFile(f.file);
      let asked = 0;
      assert.strictEqual(await f.lib.importBundled(f.pack, undefined, async candidates => {
        asked++; assert.strictEqual(candidates.length, 1); assert.strictEqual(candidates[0].title, 'Genesis');
        assert.deepStrictEqual(await fs.readFile(f.file), old, 'vor der Entscheidung unangetastet');
        return candidates.map(x => x.rel);
      }), 1);
      assert.strictEqual(asked, 1);
      assert.deepStrictEqual(await fs.readFile(f.file), f.incoming.buf);
      assert.strictEqual(f.lib.lastImport.backups.length, 1);
      assert.deepStrictEqual(await fs.readFile(f.lib.lastImport.backups[0]), old);
      const reopened = await new Library(f.dir).load();
      assert.strictEqual(reopened.index.entries[f.rel].bundledHash, f.incoming.item.hash);
      assert.strictEqual(await reopened.importBundled(f.pack, undefined, () => { throw Error('unverändert nicht fragen'); }), 0);
    }
    // Ablehnung über Neustarts merken; bei geändertem Angebot oder geändertem lokalen Text neu fragen.
    {
      const f = await fixture(), old = await fs.readFile(f.file);
      assert.strictEqual(await f.lib.importBundled(f.pack, undefined, async () => []), 0);
      assert.deepStrictEqual(await fs.readFile(f.file), old);
      const reopened = await new Library(f.dir).load();
      assert.strictEqual(await reopened.importBundled(f.pack, undefined, () => { throw Error('nicht erneut fragen'); }), 0);
      await fs.writeFile(f.file, JSON.stringify({ text: [['lokal bearbeitet']] }));
      let asked = 0;
      await reopened.importBundled(f.pack, undefined, async () => { asked++; return []; });
      assert.strictEqual(asked, 1);
      await f.publish('neue Ausgabe');
      await reopened.importBundled(f.pack, undefined, async candidates => { asked++; return candidates.map(x => x.rel); });
      assert.strictEqual(asked, 2);
      assert.strictEqual(JSON.parse(await fs.readFile(f.file)).text[0][0], 'neue Ausgabe');
    }
    // Auch reguläre mitgelieferte Fassungen fragen im App-Dialog bei einer neuen Ausgabe.
    {
      const f = await fixture(false);
      await f.lib.importBundled(f.pack);
      await f.publish('neue Ausgabe');
      let asked = 0;
      assert.strictEqual(await f.lib.importBundled(f.pack, undefined, async () => { asked++; return []; }), 0);
      assert.strictEqual(asked, 1);
      assert.deepStrictEqual(await fs.readFile(f.file), f.incoming.buf);
    }
    // Ohne Dialog eigene und lokal bearbeitete Paketfassungen schützen; reguläre API-Updates bleiben möglich.
    {
      const f = await fixture();
      const old = await fs.readFile(f.file);
      assert.strictEqual(await f.lib.importBundled(f.pack), 0);
      assert.deepStrictEqual(await fs.readFile(f.file), old);
      const b = await fixture(false);
      await b.lib.importBundled(b.pack);
      await b.publish('zweite Ausgabe');
      assert.strictEqual(await b.lib.importBundled(b.pack), 1);
      await fs.writeFile(b.file, 'persönliche Bearbeitung');
      await b.publish('dritte Ausgabe');
      assert.strictEqual(await b.lib.importBundled(b.pack), 0);
      assert.strictEqual(await fs.readFile(b.file, 'utf8'), 'persönliche Bearbeitung');
    }
    // Identische alte Eigenimporte erkennen, ohne eine unnötige Rückfrage.
    {
      const f = await fixture();
      await fs.writeFile(f.file, f.incoming.buf);
      assert.strictEqual(await f.lib.importBundled(f.pack, undefined, () => { throw Error('identisch'); }), 1);
      assert(f.lib.index.entries[f.rel].bundled);
    }
    // Fehlende Sicherungsmöglichkeit oder Änderung während des Dialogs darf den alten Text nicht kosten.
    {
      const f = await fixture(), old = await fs.readFile(f.file);
      await fs.writeFile(path.join(f.dir, 'backups'), 'blockiert');
      assert.strictEqual(await f.lib.importBundled(f.pack, undefined, async c => c.map(x => x.rel)), 0);
      assert.deepStrictEqual(await fs.readFile(f.file), old);
      assert(f.lib.lastImport.updateErrors.length);
      const b = await fixture();
      assert.strictEqual(await b.lib.importBundled(b.pack, undefined, async c => {
        await fs.writeFile(b.file, 'während der Rückfrage bearbeitet'); return c.map(x => x.rel);
      }), 0);
      assert.strictEqual(await fs.readFile(b.file, 'utf8'), 'während der Rückfrage bearbeitet');
      assert(b.lib.lastImport.updateErrors.length);
    }
    // Private eigene Fassungen und bewusst entfernte Pakettexte bleiben außerhalb der Rückfrage.
    {
      const f = await fixture(); f.lib.index.entries[f.rel].private = true;
      assert.strictEqual(await f.lib.importBundled(f.pack, undefined, () => { throw Error('privat'); }), 0);
      const b = await fixture(false); await b.lib.importBundled(b.pack); await b.lib.removeOwn(b.rel);
      await b.publish('aktualisiert');
      assert.strictEqual(await b.lib.importBundled(b.pack, undefined, () => { throw Error('entfernt'); }), 0);
    }
    // Ungültiges Paket nicht anbieten, beschädigte oder andere Dateien nicht übernehmen.
    {
      const f = await fixture(), old = await fs.readFile(f.file);
      await fs.writeFile(path.join(f.pack, f.rel), 'falscher Inhalt');
      assert.strictEqual(await f.lib.importBundled(f.pack, undefined, () => { throw Error('Prüfsumme'); }), 0);
      assert.deepStrictEqual(await fs.readFile(f.file), old);
      assert(f.lib.lastImport.updateErrors.length);
    }
    // Unicode-Normalisierung des Pfades erzeugt keine zweite Bibliotheksfassung.
    {
      const f = await fixture(), nfd = f.rel.normalize('NFD');
      const e = f.lib.index.entries[f.rel];
      if (nfd !== f.rel) {
        const bytes = await fs.readFile(f.file); await fs.unlink(f.file);
        await fs.writeFile(path.join(f.dir, nfd), bytes);
        delete f.lib.index.entries[f.rel]; f.lib.index.entries[nfd] = { ...e, rel: nfd };
      }
      assert.strictEqual(await f.lib.importBundled(f.pack, undefined, async c => c.map(x => x.rel)), 1);
      assert.deepStrictEqual(Object.keys(f.lib.index.entries), [nfd]);
      assert.deepStrictEqual(await fs.readFile(path.join(f.dir, nfd)), f.incoming.buf);
    }
    // Ein Dialog je Übersetzung statt je Kapitel/Buch; Schließen und Standardauswahl behalten.
    {
      const rows = [{ rel: 'a', title: 'Genesis', versionTitle: 'Version A' }, { rel: 'b', title: 'Exodus', versionTitle: 'Version A' }, { rel: 'c', title: 'Ruth', versionTitle: 'Version B' }];
      const dialogs = [];
      const accepted = await confirmTextUpdates(rows, async options => {
        dialogs.push(options); return { response: dialogs.length === 1 ? 1 : 0 };
      });
      assert.deepStrictEqual(accepted, ['a', 'b']);
      assert.strictEqual(dialogs.length, 2);
      assert(dialogs[0].detail.includes('Genesis, Exodus'));
      assert.strictEqual(dialogs[0].defaultId, 0); assert.strictEqual(dialogs[0].cancelId, 0);
      assert.deepStrictEqual(await confirmTextUpdates(rows, async () => ({})), []);
      // Ein Klick übernimmt alle angebotenen Fassungen und beendet die Dialogfolge.
      let allDialogs = 0;
      assert.deepStrictEqual(await confirmTextUpdates(rows, async options => {
        allDialogs++;
        assert.strictEqual(options.buttons[2], 'Alle neuen Fassungen übernehmen');
        assert(options.detail.includes('alle 3 angebotenen Texte aus 2 Fassungen'));
        return { response: 2 };
      }), ['a', 'b', 'c']);
      assert.strictEqual(allDialogs, 1);
      // Eine spätere ausdrückliche Wahl „alle“ umfasst auch zuvor einzeln behaltene Angebote.
      let laterDialogs = 0;
      assert.deepStrictEqual(await confirmTextUpdates(rows, async () => ({ response: ++laterDialogs === 1 ? 0 : 2 })), ['a', 'b', 'c']);
      assert.strictEqual(laterDialogs, 2);
    }
    console.log('Textupdates: Zustimmung, Sicherung, Behalten, Neustart, neue Ausgabe, lokale Änderungen, Fehler und Unicode geprüft.');
  } finally { await fs.rm(tmp, { recursive: true, force: true }); }
})().catch(err => { console.error(err); process.exit(1); });
