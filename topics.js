// Themen (Topics) von Sefaria: Beschreibung, „Notable Sources“ und „Sources“ je Thema sowie Verknüpfung Vers -> Themen.
// Wie bei den Verknüpfungen wird alles beim Einrichten aus Sefarias öffentlicher Schnittstelle geladen (nichts davon liegt im Repository).
// Aufteilung wie auf sefaria.org: Nur Stellen vom Typ „about“; „Notable Sources“ = Stellen mit eigener Beschreibung (Titel oder Text),
// „Sources“ = alle übrigen. Erwähnungen („mention“) und Blätter („sheets“) werden nicht übernommen.
const fs = require('fs/promises');
const path = require('path');

const API = 'https://www.sefaria.org/api/';
const MAX_PER_VERSE = 12;
const safe = s => String(s || '_').replace(/[\\:*?"<>|\u0000-\u001f\/]/g, '_').replace(/^\.+$/, '_').slice(0, 150) || '_';
const LINK_KEEP = ['is-a', 'related-to', 'parent-of', 'child-of', 'member-of', 'has-role', 'participates-in', 'person-participates-in-event', 'spouse-of', 'sibling-of', 'opposed', 'has-relationship'];

// Reihenfolge wie bei Sefaria (TopicPage.jsx, refSort). a/b: { o: {cp:[en,he], al:[..], pr, s, d, id} }
function refSort(mode, lang, a, b) {
  const A = a.o, B = b.o;
  if (!A && !B) return 0;
  if (!A !== !B) return A ? -1 : 1;
  if (mode === 'chrono') {
    if (A.d === B.d) return A.id < B.id ? -1 : A.id > B.id ? 1 : 0;
    return A.d - B.d;
  }
  const i = lang === 'he' ? 1 : 0;
  if (A.cp[i] > 0 || B.cp[i] > 0) return B.cp[i] - A.cp[i];
  if (lang === 'en' && A.al.length !== B.al.length) return A.al.includes('en') ? -1 : B.al.includes('en') ? 1 : 0;
  if (A.pr !== B.pr) return B.pr - A.pr;
  return B.s - A.s;
}
function trimOrder(o) {
  if (!o) return null;
  const cp = o.curatedPrimacy || {};
  return { cp: [cp.en || 0, cp.he || 0], al: o.availableLangs || [], pr: o.pr || 0, s: (o.numDatasource || 1) * (o.tfidf || 0), d: o.comp_date === undefined ? 9999 : o.comp_date, id: o.order_id || '' };
}
function desc(d) {
  const out = {};
  for (const l of ['en', 'he']) { const x = d && d[l]; if (x && (x.title || x.prompt) && x.published !== false) out[l] = { t: x.title || '', p: x.prompt || '' }; }
  return Object.keys(out).length ? out : null;
}
// Ergebnis der Schnittstelle -> kleine Datei je Thema
function trimTopic(d) {
  const notable = [], sources = [], verses = [];
  const about = (d.refs && d.refs.about && d.refs.about.refs) || [];
  for (const r of about) {
    if (r.is_sheet) continue;
    const de = desc(r.descriptions);
    const item = { r: r.ref, o: trimOrder(r.order) };
    if (de) { item.d = de; notable.push(item); } else sources.push(item);
    verses.push({ ex: r.expandedRefs || [r.ref], o: item.o });
  }
  const links = {};
  for (const k of LINK_KEEP) {
    const L = d.links && d.links[k]; if (!L || !L.links) continue;
    const list = L.links.filter(x => x.topic).sort((a, b) => ((b.order && b.order.linksInCommon) || 0) - ((a.order && a.order.linksInCommon) || 0)).slice(0, 40).map(x => ({ t: x.topic, inv: !!x.isInverse }));
    if (list.length) links[k] = list;
  }
  return { slug: d.slug, en: d.primaryTitle && d.primaryTitle.en || d.en || d.slug, he: d.primaryTitle && d.primaryTitle.he || d.he || '', kind: d.subclass || '', desc: d.description || null, links, notable, sources, n: [notable.length, sources.length] , _v: verses };
}
function parseVerse(ref) {
  const m = /^(.+?) (\d+[ab]?):(\d+)$/.exec(ref);
  return m ? [m[1], m[2], +m[3]] : null;
}

class TopicStore {
  constructor(libDir, fetchBuffer) { this.dir = path.join(libDir, 'topics'); this.fetchBuffer = fetchBuffer; this.cache = new Map(); }
  get stateFile() { return path.join(this.dir, 'state.json'); }
  async status() {
    try { const j = JSON.parse(await fs.readFile(this.stateFile, 'utf8')); return { complete: !!j.complete, count: j.count || 0, total: j.total || 0, approxMB: 60 }; }
    catch { return { complete: false, count: 0, total: 0, approxMB: 60 }; }
  }
  async getJson(url) {
    for (let a = 1; ; a++) {
      try { return JSON.parse((await this.fetchBuffer(url)).toString('utf8')); }
      catch (e) { if (a >= 4) throw e; await new Promise(r => setTimeout(r, 700 * a)); }
    }
  }
  async build({ onProgress = () => {}, isCancelled = () => false } = {}) {
    await fs.mkdir(path.join(this.dir, 't'), { recursive: true });
    onProgress({ file: 0, total: 1, phase: 'Lade Themenliste' });
    const list = (await this.getJson(API + 'topics?limit=0')).filter(t => t.slug);
    const have = new Set((await fs.readdir(path.join(this.dir, 't')).catch(() => [])).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)));
    const todo = list.filter(t => !have.has(safe(t.slug)));
    let done = list.length - todo.length, failed = 0, idx = 0;
    const total = list.length;
    await fs.writeFile(this.stateFile, JSON.stringify({ complete: false, count: done, total }));
    const worker = async () => {
      while (!isCancelled()) {
        const t = todo[idx++]; if (!t) return;
        try {
          const d = await this.getJson(API + 'v2/topics/' + encodeURIComponent(t.slug) + '?with_refs=1&with_links=1&annotate_time_period=0');
          const x = trimTopic(d);
          await fs.writeFile(path.join(this.dir, 't', safe(t.slug) + '.json'), JSON.stringify(x));
        } catch { failed++; }
        done++;
        if (done % 25 === 0 || done === total) onProgress({ file: done, total, phase: 'Lade Themen' });
      }
    };
    await Promise.all(Array.from({ length: 5 }, worker));
    if (isCancelled()) { await fs.writeFile(this.stateFile, JSON.stringify({ complete: false, count: done - failed, total })); return { cancelled: true }; }
    onProgress({ file: total, total, phase: 'Ordne Verse zu' });
    const r = await this.index(list);
    await fs.writeFile(this.stateFile, JSON.stringify({ complete: failed === 0, count: total - failed, total }));
    this.cache.clear();
    return { topics: total - failed, failed, verses: r.verses };
  }
  // Verzeichnis (Name, Art, Kurzbeschreibung) und „Vers -> Themen“ je Buch
  async index(list) {
    const books = new Map(), idxOut = [];
    const files = (await fs.readdir(path.join(this.dir, 't'))).filter(f => f.endsWith('.json'));
    for (const f of files) {
      let t; try { t = JSON.parse(await fs.readFile(path.join(this.dir, 't', f), 'utf8')); } catch { continue; }
      const meta = list.find ? null : null; void meta;
      idxOut.push({ s: t.slug, en: t.en, he: t.he, k: t.kind, n: t.n[0] + t.n[1], nn: t.n[0] });
      const seen = new Map();
      for (const v of t._v || []) for (const ref of v.ex) {
        const p = parseVerse(ref); if (!p) continue;
        const key = p[0] + '\u0000' + p[1] + ':' + p[2];
        const sc = v.o ? (v.o.cp[0] * 1e6 + v.o.pr * 1e3 + v.o.s) : 0;
        if (!seen.has(key) || seen.get(key) < sc) seen.set(key, sc);
      }
      for (const [key, sc] of seen) {
        const [book, cv] = key.split('\u0000');
        if (!books.has(book)) books.set(book, new Map());
        const m = books.get(book); if (!m.has(cv)) m.set(cv, []);
        m.get(cv).push([t.slug, sc, t.n[0]]);
      }
      if (t._v) { delete t._v; await fs.writeFile(path.join(this.dir, 't', f), JSON.stringify(t)); }
    }
    await fs.writeFile(path.join(this.dir, 'index.json'), JSON.stringify(idxOut));
    await fs.mkdir(path.join(this.dir, 'by_book'), { recursive: true });
    let verses = 0;
    for (const [book, m] of books) {
      const o = {};
      for (const [cv, arr] of m) { arr.sort((a, b) => b[2] - a[2] || b[1] - a[1]); o[cv] = arr.slice(0, MAX_PER_VERSE).map(x => x[0]); verses++; }
      await fs.writeFile(path.join(this.dir, 'by_book', safe(book) + '.json'), JSON.stringify(o));
    }
    return { verses };
  }
  async _read(rel) { if (this.cache.has(rel)) return this.cache.get(rel); const v = JSON.parse(await fs.readFile(path.join(this.dir, rel), 'utf8')); this.cache.set(rel, v); if (this.cache.size > 60) this.cache.delete(this.cache.keys().next().value); return v; }
  async list() { try { return await this._read('index.json'); } catch { return []; } }
  async topic(slug) {
    const t = await this._read('t/' + safe(slug) + '.json');
    const idx = await this.list(), by = new Map(idx.map(x => [x.s, x]));
    const links = {};
    for (const [k, arr] of Object.entries(t.links || {})) { const l = arr.filter(x => by.has(x.t)).map(x => ({ ...x, en: by.get(x.t).en || x.t, he: by.get(x.t).he || '' })); if (l.length) links[k] = l; }
    return { ...t, links };
  }
  // Themen eines Abschnitts: Kapitel (und optional Verse) -> [{slug,en,he,verse}]
  async forSection(book, chap, verse) {
    let m; try { m = await this._read('by_book/' + safe(book) + '.json'); } catch { return []; }
    const idx = await this.list(), by = new Map(idx.map(x => [x.s, x]));
    const out = new Map();
    for (const [cv, slugs] of Object.entries(m)) {
      const [c, v] = cv.split(':');
      if (c !== String(chap) || (verse && +v !== +verse)) continue;
      for (const s of slugs) { const e = out.get(s) || { slug: s, en: (by.get(s) || {}).en || s, he: (by.get(s) || {}).he || '', verses: [] }; e.verses.push(+v); out.set(s, e); }
    }
    return [...out.values()].sort((a, b) => b.verses.length - a.verses.length);
  }
}
module.exports = { TopicStore, refSort, trimTopic, parseVerse };
