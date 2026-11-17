// Private Wortzuordnungen bleiben im Benutzerordner; JSON wird nie als Skript ausgeführt.
const fs = require('fs/promises');
const path = require('path');
const R = require('./reader');
const L = require('./lib');

const KEY = 'BuberRosenzweig';
const VERSION = /Martin Buber.*Franz Rosenzweig/;
const BOOKS = new Set(['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles']);
const MAX_BYTES = 50 * 1024 * 1024;
const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
const space = s => String(s).replace(/\s+/g, ' ').trim();
function plain(s) {
  const main = R.splitFootnotes(s).main.replace(/<sup data-fn="\d+">[\s\S]*?<\/sup>/g, '');
  return space(L.stripHtml(main).replace(/&#(x[0-9a-f]+|\d+);/gi, (m, n) => {
    const v = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : +n;
    return v > 0 && v <= 0x10ffff && !(v >= 0xd800 && v <= 0xdfff) ? String.fromCodePoint(v) : m;
  }));
}
function validate(raw) {
  if (!object(raw) || Object.keys(raw).length !== 1 || !Object.hasOwn(raw, KEY) || !object(raw[KEY])) throw new Error('Erwartet wird eine JSON-Wortzuordnung mit dem Schlüssel BuberRosenzweig.');
  const books = {}, entries = Object.entries(raw[KEY]);
  if (!entries.length || entries.length > BOOKS.size) throw new Error('Keine gültigen Bücher in der Wortzuordnung.');
  let count = 0;
  for (const [book, verses] of entries) {
    if (!BOOKS.has(book) || !object(verses) || !Object.keys(verses).length) throw new Error('Ungültiges Buch in der Wortzuordnung.');
    books[book] = {};
    for (const [ref, segs] of Object.entries(verses)) {
      if (!/^[1-9]\d{0,2}:[1-9]\d{0,2}$/.test(ref) || !Array.isArray(segs) || !segs.length || segs.length > 1000) throw new Error(`${book} ${ref}: ungültige Verszuordnung.`);
      books[book][ref] = segs.map(s => {
        if (!Array.isArray(s) || s.length !== 2 || !Array.isArray(s[0]) || s[0].length > 500 || new Set(s[0]).size !== s[0].length || s[0].some(i => !Number.isInteger(i) || i < 1 || i > 500) || typeof s[1] !== 'string' || !s[1].trim() || s[1].length > 20000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s[1])) throw new Error(`${book} ${ref}: ungültiges Wortsegment.`);
        return [[...s[0]], s[1]];
      });
      if (++count > 25000) throw new Error('Zu viele Verse in der Wortzuordnung.');
    }
  }
  return { [KEY]: books };
}

// Auf Import und nach Neustart prüfen: keine Zuordnung auf einen anderen Textstand anwenden.
async function matchLibrary(data, lib, strict = false) {
  const books = {}, skipped = [];
  const entries = lib.list();
  for (const [book, verses] of Object.entries(data[KEY])) {
    const de = entries.find(e => e.title === book && VERSION.test(e.versionTitle || ''));
    const he = entries.find(e => e.title === book && /^Westminster/.test(e.versionTitle || ''));
    try {
      if (!de || !he) throw new Error(`${book}: zuerst Buber/Rosenzweig und Westminster in die Bibliothek aufnehmen.`);
      const [D, H] = await Promise.all([lib.read(de.rel), lib.read(he.rel)]);
      for (const [ref, segs] of Object.entries(verses)) {
        const [c, v] = ref.split(':').map(Number), dt = D.text?.[c - 1]?.[v - 1], ht = H.text?.[c - 1]?.[v - 1];
        if (typeof dt !== 'string' || typeof ht !== 'string' || !ht.includes('<span class="w"')) throw new Error(`${book} ${ref}: Vers oder Westminster-Wörter fehlen.`);
        const n = (ht.match(/<span class="w"/g) || []).length;
        if (segs.some(([ids]) => ids.some(i => i > n))) throw new Error(`${book} ${ref}: Wortnummer passt nicht zum Westminster-Text.`);
        if (space(segs.map(s => s[1]).join(' ')) !== plain(dt)) throw new Error(`${book} ${ref}: Text weicht ab. Zuerst die zur Zuordnung passende Textfassung mit denselben Versgrenzen importieren.`);
      }
      books[book] = verses;
    } catch (err) {
      if (strict) throw err;
      skipped.push(err.message);
    }
  }
  return { data: { [KEY]: books }, skipped };
}

class PrivateInterlinear {
  constructor(file, getLibrary) { this.file = file; this.getLibrary = getLibrary; this.chain = Promise.resolve(); }
  async saved() {
    try {
      if ((await fs.stat(this.file)).size > MAX_BYTES) throw new Error('Private Wortzuordnung ist zu groß.');
      return validate(JSON.parse(await fs.readFile(this.file, 'utf8')));
    } catch (err) { if (err.code === 'ENOENT') return { [KEY]: {} }; throw err; }
  }
  async read() { return matchLibrary(await this.saved(), await this.getLibrary()); }
  import(raw) {
    const job = this.chain.catch(() => {}).then(async () => {
      const incoming = validate(raw), lib = await this.getLibrary();
      await matchLibrary(incoming, lib, true);
      const current = await this.saved(), books = { ...current[KEY] };
      // Ein importiertes Buch ersetzt seinen bisherigen Stand vollständig (keine alten Verse zurücklassen).
      Object.assign(books, incoming[KEY]);
      const data = { [KEY]: books }, json = JSON.stringify(data);
      if (Buffer.byteLength(json) > MAX_BYTES) throw new Error('Private Wortzuordnung ist zu groß.');
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = this.file + '.tmp';
      try { await fs.writeFile(tmp, json, { mode: 0o600 }); await fs.rename(tmp, this.file); }
      finally { await fs.unlink(tmp).catch(() => {}); }
      return { books: Object.keys(incoming[KEY]).length, verses: Object.values(incoming[KEY]).reduce((n, vs) => n + Object.keys(vs).length, 0) };
    });
    this.chain = job; return job;
  }
}
module.exports = { KEY, VERSION, MAX_BYTES, validate, plain, matchLibrary, PrivateInterlinear };
