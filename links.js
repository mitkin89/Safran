// Verknüpfungen (Links) zwischen Texten, aus den öffentlichen Sefaria-Export-Dateien links0.csv … links16.csv.
// Beim Einrichten wird daraus je Buch eine kleine Datei erzeugt (in beide Richtungen), die Rohdaten werden gelöscht.
const fs = require('fs/promises');
const path = require('path');
const L = require('./lib');

const BASE = 'https://storage.googleapis.com/sefaria-export/links/';
const FILES = Array.from({ length: 17 }, (_, i) => `links${i}.csv`);
const APPROX_MB = 680; // Download-Größe aller Dateien (nur Anzeige)
const safe = s => String(s || '_').replace(/[\\:*?"<>|\u0000-\u001f\/]/g, '_').replace(/^\.+$/, '_').replace(/[. ]+$/, '').slice(0, 150) || '_';

// "Genesis 1:5-7" -> { chap: '1', v1: 5, v2: 7 } ; "Berakhot 2a:3" -> chap '2a'; Bereich über Kapitel -> v2 = Infinity
function parseTail(tail) {
  const m = String(tail).trim().match(/^(\d+[ab]?)(?::(\d+))?(?:(-)(\d+[ab]?)?(?::(\d+))?)?/i);
  if (!m) return null;
  const chap = m[1].toLowerCase();
  if (m[2] == null) return { chap, v1: 0, v2: m[3] ? Infinity : 0 };
  const v1 = +m[2];
  let v2 = v1;
  if (m[3]) {
    if (m[5] != null) v2 = Infinity;                 // 1:1-6:1
    else if (m[4] && /^\d+$/.test(m[4])) v2 = +m[4]; // 1:3-5
  }
  return { chap, v1, v2 };
}

// "Mishnah Peah 6:6" -> { book: 'Mishnah Peah', tail: '6:6' }
function splitRef(ref) {
  const m = String(ref).trim().match(/^(.*?)\s+(\d+[ab]?(?::\d+)*(?:-\d+[ab]?(?::\d+)*)?)$/i);
  return m ? { book: m[1], tail: m[2] } : { book: String(ref).trim(), tail: '' };
}

class LinkStore {
  constructor(baseDir, fetchBuffer) {
    this.dir = path.join(baseDir, 'links');
    this.fetchBuffer = fetchBuffer;
    this.cache = new Map(); // book -> Map(chap -> rows)
  }
  get stateFile() { return path.join(this.dir, 'state.json'); }

  async status() {
    try { const j = JSON.parse(await fs.readFile(this.stateFile, 'utf8')); return { done: j.done || [], total: FILES.length, complete: (j.done || []).length === FILES.length, approxMB: APPROX_MB }; }
    catch { return { done: [], total: FILES.length, complete: false, approxMB: APPROX_MB }; }
  }

  async build({ onProgress = () => {}, isCancelled = () => false } = {}) {
    await fs.mkdir(path.join(this.dir, 'by_book'), { recursive: true });
    const st = await this.status();
    const done = new Set(st.done);
    const failed = [];
    for (let i = 0; i < FILES.length; i++) {
      if (isCancelled()) break;
      if (done.has(i)) continue;
      onProgress({ file: i + 1, total: FILES.length, phase: 'Lade ' + FILES[i] });
      let buf;
      try {
        for (let a = 1; ; a++) { try { buf = await this.fetchBuffer(BASE + FILES[i]); break; } catch (e) { if (a >= 3) throw e; await new Promise(r => setTimeout(r, 500 * a)); } }
      } catch (e) { failed.push(`${FILES[i]}: ${e.message}`); continue; }
      onProgress({ file: i + 1, total: FILES.length, phase: 'Verarbeite ' + FILES[i] });
      await new Promise(r => setImmediate(r));
      const rows = L.parseCSV(buf.toString('utf8'));
      buf = null;
      const per = new Map();
      const add = (book, line) => { let a = per.get(book); if (!a) per.set(book, (a = [])); a.push(line); };
      for (let k = 1; k < rows.length; k++) {
        if (k % 20000 === 0) await new Promise(r => setImmediate(r)); // Hauptprozess nicht blockieren
        const r = rows[k];
        if (r.length < 7 || !r[3] || !r[4]) continue;
        const t1 = r[3], t2 = r[4];
        const a = r[0].slice(t1.length).trim(), b = r[1].slice(t2.length).trim();
        add(t1, `${a}\t${r[1]}\t${r[2]}\t${r[6]}`);
        add(t2, `${b}\t${r[0]}\t${r[2]}\t${r[5]}`);
      }
      for (const [book, lines] of per) await fs.appendFile(path.join(this.dir, 'by_book', safe(book) + '.tsv'), lines.join('\n') + '\n');
      done.add(i);
      await fs.writeFile(this.stateFile, JSON.stringify({ done: [...done] }));
      onProgress({ file: i + 1, total: FILES.length, phase: FILES[i] + ' fertig' });
    }
    this.cache.clear();
    return { ...(await this.status()), failed, cancelled: isCancelled() };
  }

  async load(book) {
    if (this.cache.has(book)) return this.cache.get(book);
    const map = new Map();
    let raw = '';
    try { raw = await fs.readFile(path.join(this.dir, 'by_book', safe(book) + '.tsv'), 'utf8'); } catch { /* keine Links */ }
    for (const line of raw.split('\n')) {
      if (!line) continue;
      const [tail, other, type, cat] = line.split('\t');
      const p = parseTail(tail);
      if (!p) continue;
      let a = map.get(p.chap); if (!a) map.set(p.chap, (a = []));
      a.push([p.v1, p.v2, other, type, cat]);
    }
    if (this.xref === undefined) { try { this.xref = JSON.parse(await fs.readFile(path.join(__dirname, 'xref.json'), 'utf8')); } catch { this.xref = null; } }
    this.mergeXref(book, map);
    this.cache.set(book, map);
    if (this.cache.size > 3) this.cache.delete(this.cache.keys().next().value);
    return map;
  }

  // Bibel-Querverweise (OpenBible, CC BY 4.0; nur Tanach) unter die Sefaria-Links mischen; was Sefaria schon hat, bleibt unverändert
  mergeXref(book, map) {
    const bk = this.xref && this.xref[book];
    if (!bk) return;
    for (const chap of Object.keys(bk)) {
      let a = map.get(chap); if (!a) map.set(chap, (a = []));
      const have = new Map(); // Start der Zielstelle -> Verse, auf die Sefaria schon verweist (nur Sefaria-Links prüfen)
      for (const h of a) { const k = h[2].replace(/-.*/, ''); let l = have.get(k); if (!l) have.set(k, (l = [])); l.push(h); }
      for (const [v1, v2, other, votes] of bk[chap]) {
        const lo = v1, hi = v2 >= 99999 ? Infinity : v2;
        const hs = have.get(other.replace(/-.*/, ''));
        if (hs && hs.some(h => h[0] === 0 || (h[0] <= hi && h[1] >= lo))) continue;
        a.push([v1, v2, other, 'reference', 'Tanakh']);
      }
    }
  }

  // alle Links eines Abschnitts (Kapitel/Daf) als [{v1,v2,other,type,cat}]
  async forSection(book, chap) {
    const map = await this.load(book);
    return (map.get(String(chap).toLowerCase()) || []).map(([v1, v2, other, type, cat]) => ({ v1, v2: v2 === Infinity ? 99999 : v2, other, type, cat }));
  }
}

// Text zu einer Stelle aus geladenen Textdaten herauslösen (nur normale Kapitel/Vers-Strukturen)
function resolveText(data, tail) {
  if (data && data.text && !Array.isArray(data.text) && typeof data.text === 'object') { // Werk mit mehreren Teilen: Standardteil „“ (z. B. Ibn Ezra on Genesis)
    const def = data.text[''] !== undefined ? data.text[''] : null;
    if (def == null) return null;
    data = { ...data, text: def, sectionNames: [] };
  }
  const p = parseTail(tail);
  if (!p) return null;
  const talmud = data.sectionNames && data.sectionNames[0] === 'Daf';
  let idx;
  if (/[ab]$/.test(p.chap)) idx = (parseInt(p.chap, 10) - 1) * 2 + (p.chap.endsWith('a') ? 0 : 1);
  else idx = talmud ? (parseInt(p.chap, 10) - 1) * 2 : parseInt(p.chap, 10) - 1;
  let node = data.text && data.text[idx];
  if (node == null) return null;
  const extra = String(tail).split('-')[0].split(':').slice(1).map(Number);
  for (const n of extra) { if (!Array.isArray(node)) break; node = node[n - 1]; if (node == null) return null; }
  const flat = (x, o = []) => { if (typeof x === 'string') { if (x.trim()) o.push(x); } else if (Array.isArray(x)) x.forEach(c => flat(c, o)); return o; };
  let items = flat(node);
  if (extra.length === 1 && p.v2 > p.v1 && Array.isArray(data.text[idx]) && p.v2 !== Infinity) {
    items = flat(data.text[idx].slice(p.v1 - 1, p.v2));
  }
  return items.length ? items : null;
}

module.exports = { LinkStore, parseTail, splitRef, resolveText, FILES, APPROX_MB };
