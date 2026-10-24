// Offline-Bibliothek: Katalog (books.json) auswerten, Download planen, lokal speichern, lesen, durchsuchen.
// Reines Node-Modul. Der Netzwerkzugriff wird von außen übergeben (fetchBuffer), damit es testbar bleibt.

const fs = require('fs/promises');
const path = require('path');
const R = require('./reader');
const L = require('./lib');

const BUCKET_PREFIX = '/sefaria-export/';
// Durchschnittliche Dateigröße in KB (gemessen an der öffentlichen Bucket-Auflistung, nur für die Schätzung)
const AVG_KB = { he: 441, en: 244, de: 436, other: 308 };

// 'he' | 'en' | 'de' | 'other'. Fremdsprachige Fassungen tragen ein Kürzel im Titel, z. B. "... [de]".
function kindOf(e) {
  const m = String(e.versionTitle || '').match(/\[([a-z]{2,3})\]\s*$/i);
  if (m) {
    const c = m[1].toLowerCase();
    return c === 'de' ? 'de' : c === 'he' ? 'he' : c === 'en' ? 'en' : 'other';
  }
  return e.language === 'Hebrew' ? 'he' : e.language === 'English' ? 'en' : 'other';
}

// Lokaler Pfad relativ zum Bibliotheksordner, abgeleitet aus der Download-Adresse
function relPathOf(e) {
  const p = new URL(e.json_url).pathname.replace(BUCKET_PREFIX, '');
  return p.split('/').map(seg => {
    let s;
    try { s = decodeURIComponent(seg); } catch { s = seg; }
    s = s.replace(/[\\:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+$/, '_').replace(/[. ]+$/, '');
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(s)) s = '_' + s; // unter Windows reservierte Namen
    return s.slice(0, 120) || '_'; // kurz halten: Windows-Pfade sind begrenzt (MAX_PATH)
  }).join('/');
}

function buildGroups(catalog) {
  const map = new Map();
  for (const e of catalog.books || []) {
    const catPath = e.categories.join('/');
    const key = catPath + '\u0000' + e.title;
    let g = map.get(key);
    if (!g) { g = { id: map.size, title: e.title, cats: e.categories, catPath, entries: [] }; map.set(key, g); }
    g.entries.push(e);
  }
  return [...map.values()];
}

function summarize(groups) {
  return groups.map(g => {
    let he = false, en = false, de = 0;
    for (const e of g.entries) {
      const k = kindOf(e);
      if (k === 'he') he = true; else if (k === 'en') en = true; else if (k === 'de') de++;
    }
    return { id: g.id, title: g.title, cats: g.cats, he, en, de };
  });
}

function selectedGroups(groups, sel) {
  const ids = new Set(sel.ids || []);
  const cats = sel.cats || [];
  return groups.filter(g => ids.has(g.id) || cats.some(c => g.catPath === c || g.catPath.startsWith(c + '/')));
}

// opts: { he, en, de, allVersions }
function pickEntries(group, opts) {
  const byKind = { he: [], en: [], de: [], other: [] };
  group.entries.forEach(e => { if (e.json_url) byKind[kindOf(e)].push(e); });
  const out = [];
  for (const k of ['he', 'en']) {
    if (!opts[k]) continue;
    const list = byKind[k];
    if (opts.allVersions) out.push(...list);
    else {
      const merged = list.filter(e => e.versionTitle === 'merged');
      out.push(...(merged.length ? merged : list));
    }
  }
  if (opts.de) out.push(...byKind.de);
  if (opts.allVersions && (opts.he || opts.en)) out.push(...byKind.other);
  return out;
}

function planEntries(groups, sel, opts) {
  const entries = [];
  for (const g of selectedGroups(groups, sel)) entries.push(...pickEntries(g, opts));
  const estimateMB = entries.reduce((a, e) => a + AVG_KB[kindOf(e)], 0) / 1024;
  return { entries, files: entries.length, titles: selectedGroups(groups, sel).length, estimateMB };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));


// ---------- Eigene Texte ----------
// Liest TXT/MD (Zeile = Vers, „Kapitel N“ startet ein Kapitel), CSV (Ref,Text) oder JSON (Sefaria-Format / verschachtelte Liste)
// und liefert { text, sectionNames, segments, chapters, warnings }.
function parseOwn(content, filename = '') {
  const name = String(filename).toLowerCase();
  const warnings = [];
  const meta = {};
  let text, sectionNames = null;
  const count = n => R.flattenNode(n).length;
  if (name.endsWith('.json') || /^\s*[\[{]/.test(content)) {
    let j;
    try { j = JSON.parse(content); } catch (e) { throw new Error('JSON ist ungültig: ' + e.message); }
    if (j && !Array.isArray(j) && typeof j === 'object' && 'text' in j) { text = j.text; sectionNames = j.sectionNames || null; }
    else text = j;
    if (!R.nonEmpty(text)) throw new Error('Im JSON wurde kein Text gefunden.');
    if (typeof text === 'string') text = [text];
  } else {
    let rows;
    // Zeilen der Form „Titel Kapitel:Vers<Tab>Text“ (auch als .txt) sind Sefaria-Upload-Zeilen, keine einfachen Textzeilen
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const tabbed = lines.length > 0 && lines.filter(l => { const i = l.indexOf('\t'); return i > 0 && L.parseRef(l.slice(0, i)); }).length >= lines.length * 0.8;
    if (tabbed || name.endsWith('.csv') || name.endsWith('.tsv')) {
      rows = tabbed ? lines.map(l => { const i = l.indexOf('\t'); return i < 0 ? [l, ''] : [l.slice(0, i), l.slice(i + 1)]; }) : L.parseCSV(content);
      if (!tabbed && name.endsWith('.tsv') && rows.every(r => r.length === 1)) rows = content.split(/\r?\n/).filter(Boolean).map(l => l.split('\t'));
      // Sefaria-Upload-Format: Kopfzeilen „Index Title“, „Version Title“, „Language“ … vor den eigentlichen Zeilen
      const META = { 'index title': 'title', 'version title': 'versionTitle', 'language': 'language', 'version source': 'source', 'version notes': 'notes' };
      let k = 0;
      while (k < rows.length && META[String(rows[k][0]).trim().toLowerCase()] && !L.parseRef(rows[k][0])) {
        meta[META[String(rows[k][0]).trim().toLowerCase()]] = String(rows[k][1] ?? '').trim();
        k++;
      }
      rows = rows.slice(k);
      if (rows.length && !L.parseRef(rows[0][0]) && /^(ref|stelle|verweis|citation)/i.test(rows[0][0] || '')) rows.shift();
    } else {
      rows = L.textToRows(content, 'T').rows;
    }
    if (meta.title) {
      text = buildComplex(rows, meta.title, warnings);
    } else {
      text = [];
      const titleCount = new Map();
      rows.forEach(r => { const rf = L.parseRef(r[0]); if (rf) titleCount.set(rf.title, (titleCount.get(rf.title) || 0) + 1); });
      if (titleCount.size) meta.titleGuess = [...titleCount.entries()].sort((a, b) => b[1] - a[1])[0][0]; // Titel aus den Fundstellen, z. B. „Hertz on Deuteronomy“
      rows.forEach((r, i) => {
        const t = String(r[1] ?? '').trim();
        if (!t) return;
        const ref = L.parseRef(r[0]);
        if (!ref) { if (warnings.length < 20) warnings.push(`Zeile ${i + 1}: Fundstelle „${r[0]}“ nicht lesbar (erwartet „Titel Kapitel:Vers“)`); return; }
        const c = ref.chapter - 1, v = ref.verse - 1;
        while (text.length <= c) text.push([]);
        while (text[c].length <= v) text[c].push('');
        text[c][v] = text[c][v] ? text[c][v] + ' ' + t : t;
      });
    }
    if (!R.nonEmpty(text)) throw new Error('Es wurde kein Text erkannt.' + (warnings.length ? ' ' + warnings[0] : ''));
    sectionNames = ['Chapter', 'Verse'];
  }
  meta.kindGuess = guessKind(meta.language || '', text);
  return { text, sectionNames, segments: count(text), chapters: R.sectionsOf(text, sectionNames).length, warnings, meta };
}


// Sefaria-Upload-Zeilen („Titel, Knoten N:M“) in die verschachtelte Struktur der Export-Dateien umwandeln.
// Beispiel: „Guide, Part 1 1:1“ -> { "Part 1": { "": [[…]] } }, „Guide, Part 1, Introduction 2“ -> { "Part 1": { "Introduction": […] } }
function buildComplex(rows, title, warnings) {
  const items = [];
  rows.forEach((r, i) => {
    const t = String(r[1] ?? '').trim();
    if (!t) return;
    let ref = String(r[0]).trim();
    if (ref.startsWith(title)) ref = ref.slice(title.length).replace(/^[\s,]+/, '');
    const m = ref.match(/^(.*?)[\s,]*(\d+(?::\d+)*)$/);
    if (!m) { if (warnings.length < 20) warnings.push(`Zeile ${i + 1}: Fundstelle „${r[0]}“ nicht lesbar`); return; }
    const nodes = m[1] ? m[1].split(/\s*,\s*/).filter(Boolean) : [];
    items.push({ nodes, nums: m[2].split(':').map(Number), t });
  });
  // Knoten, unter denen es weitere Knoten gibt, legen ihren nummerierten Text unter dem Schlüssel "" ab
  const prefixes = new Set();
  items.forEach(it => { for (let k = 1; k < it.nodes.length; k++) prefixes.add(it.nodes.slice(0, k).join('\u0000')); });
  const put = (arr, nums, t) => {
    let a = arr;
    for (let k = 0; k < nums.length - 1; k++) { const i = nums[k] - 1; while (a.length <= i) a.push([]); a = a[i]; }
    const i = nums[nums.length - 1] - 1;
    while (a.length <= i) a.push('');
    a[i] = a[i] ? a[i] + ' ' + t : t;
  };
  const rootNodes = items.some(it => it.nodes.length);
  const root = rootNodes ? {} : [];
  for (const it of items) {
    if (!rootNodes) { put(root, it.nums, it.t); continue; }
    let obj = root;
    const nodes = it.nodes.length ? it.nodes : [''];
    const hasKids = it.nodes.length && prefixes.has(it.nodes.join('\u0000'));
    const path = hasKids ? [...nodes, ''] : nodes;
    for (let k = 0; k < path.length - 1; k++) { if (!obj[path[k]] || Array.isArray(obj[path[k]])) obj[path[k]] = {}; obj = obj[path[k]]; }
    const leaf = path[path.length - 1];
    if (!Array.isArray(obj[leaf])) obj[leaf] = [];
    put(obj[leaf], it.nums, it.t);
  }
  return root;
}

// Sprache aus der „Language“-Angabe und dem Text erraten (Sefaria schreibt für Übersetzungen oft „en“, auch bei deutschem Text)
function guessKind(language, text) {
  const l = String(language).toLowerCase();
  if (l.startsWith('he')) return 'he';
  const sample = R.flattenNode(text).slice(0, 40).map(r => r.html).join(' ').toLowerCase();
  const heLetters = (sample.match(/[\u05D0-\u05EA]/g) || []).length;
  if (heLetters > sample.replace(/\s/g, '').length * 0.4) return 'he';
  const de = (sample.match(/\b(und|der|die|das|nicht|ist|ein|eine|von|mit|dass|daß)\b/g) || []).length;
  const en = (sample.match(/\b(and|the|of|is|that|with|not|which)\b/g) || []).length;
  if (l.startsWith('de') || de > en * 1.5) return 'de';
  return l.startsWith('en') || !l ? 'en' : 'other';
}

const safeSeg = s => String(s || '_').replace(/[\\:*?"<>|\u0000-\u001f\/]/g, '_').replace(/^\.+$/, '_').replace(/[. ]+$/, '').slice(0, 120) || '_';

// Umbenennen mit kurzem Wiederholen: unter Windows hält manchmal ein Virenscanner die frisch geschriebene Datei fest
async function renameRetry(from, to, tries = 5) {
  for (let i = 0; ; i++) {
    try { return await fs.rename(from, to); } catch (e) {
      if (i >= tries - 1 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      await new Promise(r => setTimeout(r, 100 * (i + 1)));
    }
  }
}

class Library {
  constructor(dir, fetchBuffer) {
    this.dir = dir;
    this.fetchBuffer = fetchBuffer;
    this.index = { version: 1, entries: {} };
    this._saving = Promise.resolve();
  }

  get indexFile() { return path.join(this.dir, 'library.json'); }

  async load() {
    try {
      const j = JSON.parse(await fs.readFile(this.indexFile, 'utf8'));
      if (j && j.entries) this.index = j;
    } catch { /* noch keine Bibliothek */ }
    return this;
  }

  save() {
    // Speichern nacheinander ausführen, damit parallele Aufrufe sich nicht überschreiben
    this._saving = this._saving.then(async () => {
      await fs.mkdir(this.dir, { recursive: true });
      const tmp = this.indexFile + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(this.index));
      await renameRetry(tmp, this.indexFile);
    });
    return this._saving;
  }

  list() { return Object.values(this.index.entries); }

  stats() {
    const l = this.list();
    const titles = new Set(l.map(e => e.categories.join('/') + '\u0000' + e.title));
    return { files: l.length, titles: titles.size, bytes: l.reduce((a, e) => a + (e.bytes || 0), 0) };
  }

  // Einträge entfernen, deren Datei nicht mehr existiert (z. B. im Finder gelöscht)
  async pruneMissing() {
    let removed = 0;
    for (const [rel] of Object.entries(this.index.entries)) {
      try { await fs.access(path.join(this.dir, rel)); } catch { delete this.index.entries[rel]; removed++; }
    }
    if (removed) await this.save();
    return removed;
  }

  async fetchWithRetry(url, tries = 3) {
    let err;
    for (let a = 1; a <= tries; a++) {
      try { return await this.fetchBuffer(url); } catch (e) { err = e; await sleep(400 * a); }
    }
    throw err;
  }

  async downloadEntries(entries, { concurrency = 4, onProgress = () => {}, isCancelled = () => false, force = null } = {}) {
    const total = entries.length;
    let done = 0, bytes = 0, next = 0, sinceSave = 0;
    const failed = [];
    const worker = async () => {
      for (;;) {
        if (isCancelled()) return;
        const i = next++;
        if (i >= total) return;
        const e = entries[i];
        const rel = relPathOf(e);
        const dest = path.join(this.dir, rel);
        try {
          let size = 0, have = false;
          try { const st = await fs.stat(dest); size = st.size; have = st.size > 0 && !!this.index.entries[rel] && !(force && force.has(rel)); } catch { /* noch nicht da */ }
          if (!have) {
            const buf = await this.fetchWithRetry(e.json_url);
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fs.writeFile(dest + '.part', buf);
            await renameRetry(dest + '.part', dest);
            size = buf.length;
            let heTitle = '';
            try { heTitle = JSON.parse(buf.toString('utf8')).heTitle || ''; } catch { /* Meta optional */ }
            this.index.entries[rel] = {
              rel, title: e.title, heTitle, language: e.language, versionTitle: e.versionTitle,
              categories: e.categories, kind: kindOf(e), bytes: size,
            };
            if (++sinceSave >= 25) { sinceSave = 0; await this.save(); }
          }
          bytes += size;
        } catch (err) {
          failed.push({ rel, title: e.title, versionTitle: e.versionTitle, error: String((err && err.message) || err) });
        }
        done++;
        onProgress({ done, total, bytes, current: `${e.title} (${e.versionTitle})`, failed: failed.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, total)) }, worker));
    await this.save();
    return { done, total, bytes, failed, cancelled: isCancelled() };
  }


  // Eigenen Text in die Bibliothek aufnehmen (liegt im Unterordner own/, erscheint wie jede andere Version)
  async addOwn({ title, heTitle = '', kind = 'other', versionTitle, categories, text, sectionNames, source = '', replace = false }) {
    title = String(title || '').trim();
    versionTitle = String(versionTitle || '').trim() || 'Eigener Text';
    if (!title) throw new Error('Bitte einen Titel angeben.');
    if (!['he', 'en', 'de', 'other'].includes(kind)) kind = 'other';
    const rel = ['own', safeSeg(title), kind, safeSeg(versionTitle) + '.json'].join('/');
    const dest = path.join(this.dir, rel);
    if (this.index.entries[rel] && !replace) { const e = new Error(`„${versionTitle}“ zu „${title}“ gibt es schon`); e.code = 'EXISTS'; throw e; }
    const data = { title, heTitle, language: kind === 'he' ? 'Hebrew' : 'English', versionTitle, versionSource: 'eigener Text', sectionNames, text };
    const buf = Buffer.from(JSON.stringify(data));
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buf);
    const cats = Array.isArray(categories) && categories.length ? categories : ['Eigene Texte'];
    this.index.entries[rel] = { rel, title, heTitle, language: data.language, versionTitle, categories: cats, kind, bytes: buf.length, own: true, source: source || undefined };
    await this.save();
    return this.index.entries[rel];
  }

  // Mitgelieferte Texte (Ordner bundled/ der App): beim Start einbinden, neue oder geänderte Fassungen übernehmen.
  // Vom Nutzer entfernte Texte (skipBundled) kommen nicht wieder.
  async importBundled(dir) {
    let man;
    try { man = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8')); } catch { return 0; }
    const skip = new Set((this.index.skipBundled || []).map(x => x.normalize('NFC')));
    const have = new Map(Object.keys(this.index.entries).map(k => [k.normalize('NFC'), k])); // Umlaute: gleiche Datei, unterschiedlich geschrieben
    let n = 0;
    for (const it of (man && man.items) || []) {
      const rel = String(it.rel || '');
      if (!/^own\/[^\\]+\/(he|en|de|other)\/[^/\\]+\.json$/.test(rel) || rel.includes('..') || skip.has(rel)) continue;
      const cur = this.index.entries[have.get(rel) || rel];
      if (cur && (!cur.bundled || cur.bundledHash === it.hash)) continue; // eigene Fassung oder schon aktuell
      try {
        let buf;
        try { buf = await fs.readFile(path.join(dir, rel)); }
        catch { buf = await fs.readFile(path.join(dir, rel.normalize(rel === rel.normalize('NFC') ? 'NFD' : 'NFC'))); } // Umlaute: macOS speichert Dateinamen zerlegt (NFD), Windows/Linux nicht
        const dest = path.join(this.dir, rel);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, buf);
        this.index.entries[rel] = { rel, title: it.title, heTitle: it.heTitle || '', language: it.language, versionTitle: it.versionTitle, categories: it.categories, kind: it.kind, bytes: buf.length, own: true, bundled: true, bundledHash: it.hash };
        n++;
      } catch { /* Datei fehlt im Paket – überspringen */ }
    }
    // Mitgelieferte Texte, die es im Paket nicht mehr gibt (umbenannt oder entfernt), auch hier entfernen
    const inPack = new Set(((man && man.items) || []).map(it => String(it.rel || '').normalize('NFC')));
    let gone = 0;
    for (const [k, e] of Object.entries(this.index.entries)) {
      if (!e.bundled || inPack.has(k.normalize('NFC'))) continue;
      try { await fs.unlink(path.join(this.dir, k)); } catch { /* war schon weg */ }
      delete this.index.entries[k]; gone++;
    }
    if (n || gone) await this.save();
    return n;
  }

  // Alle eigenen Texte in einen Ordner schreiben (manifest.json + own/…), zum Ablegen als bundled/ im Projekt
  async exportBundled(outDir) {
    const crypto = require('crypto');
    await fs.rm(path.join(outDir, 'own'), { recursive: true, force: true });
    const items = [];
    for (const e of Object.values(this.index.entries)) {
      if (!e.own) continue;
      const buf = await fs.readFile(path.join(this.dir, e.rel));
      await fs.mkdir(path.dirname(path.join(outDir, e.rel.normalize('NFC'))), { recursive: true });
      await fs.writeFile(path.join(outDir, e.rel.normalize('NFC')), buf);
      items.push({ rel: e.rel.normalize('NFC'), title: e.title, heTitle: e.heTitle || '', language: e.language, versionTitle: e.versionTitle, categories: e.categories, kind: e.kind, hash: crypto.createHash('sha1').update(buf).digest('hex') });
    }
    await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify({ version: 1, items }, null, 1));
    return items.length;
  }

  async removeOwn(rel) {
    const e = this.index.entries[rel];
    if (!e || !e.own) throw new Error('Nur eigene Texte können entfernt werden.');
    if (e.bundled) this.index.skipBundled = [...new Set([...(this.index.skipBundled || []), rel])];
    try { await fs.unlink(path.join(this.dir, rel)); } catch { /* war schon weg */ }
    delete this.index.entries[rel];
    await this.save();
  }

  // Prüft, ob lokale Dateien im Sefaria-Export geändert wurden (Dateigröße) und ob es neue zusammengeführte Fassungen gibt.
  // headFn(url) -> Dateigröße in Bytes oder null (unbekannt)
  async checkUpdates(catalogBooks, headFn, { concurrency = 8, onProgress = () => {}, isCancelled = () => false } = {}) {
    const byRel = new Map();
    const byGroup = new Map();
    for (const e of catalogBooks) {
      if (!e.json_url) continue;
      byRel.set(relPathOf(e), e);
      const k = e.categories.join('/') + '\u0000' + e.title;
      if (!byGroup.has(k)) byGroup.set(k, []);
      byGroup.get(k).push(e);
    }
    const local = this.list().filter(e => !e.own);
    const changed = [];
    let next = 0, done = 0;
    const worker = async () => {
      for (;;) {
        if (isCancelled()) return;
        const i = next++;
        if (i >= local.length) return;
        const le = local[i];
        const ce = byRel.get(le.rel);
        if (ce) {
          let size = null;
          try { size = await headFn(ce.json_url); } catch { /* ignorieren */ }
          if (size != null && size !== le.bytes) changed.push(ce);
        }
        done++;
        if (done % 10 === 0 || done === local.length) onProgress({ done, total: local.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, local.length)) }, worker));
    // neu: Fassungen derselben Bücher, die es lokal noch nicht gibt (nur zusammengeführte Fassungen bzw. Deutsch, passend zu den vorhandenen Sprachen)
    const added = [];
    const groups = new Map();
    for (const le of local) {
      const k = le.categories.join('/') + '\u0000' + le.title;
      if (!groups.has(k)) groups.set(k, new Set());
      groups.get(k).add(le.kind);
    }
    for (const [k, kinds] of groups) {
      for (const ce of byGroup.get(k) || []) {
        const kd = kindOf(ce);
        if (this.index.entries[relPathOf(ce)]) continue;
        if (!kinds.has(kd)) continue;
        if ((kd === 'he' || kd === 'en') && ce.versionTitle !== 'merged') continue;
        added.push(ce);
      }
    }
    return { checked: local.length, changed, added, cancelled: isCancelled() };
  }

  // geänderte Dateien zum erneuten Laden freigeben und alles laden
  async applyUpdates(changed, added, opts) {
    // Die alte Datei bleibt liegen, bis die neue vollständig geladen ist (Download als .part, dann Umbenennen) – so geht bei einem Netzfehler nichts verloren
    const force = new Set(changed.map(relPathOf));
    return this.downloadEntries([...changed, ...added], { ...(opts || {}), force });
  }

  async read(rel) {
    const entry = this.index.entries[rel]; // nur Dateien aus dem Index sind lesbar
    if (!entry) throw new Error('Datei ist nicht in der Bibliothek');
    const d = JSON.parse(await fs.readFile(path.join(this.dir, rel), 'utf8'));
    return {
      entry, title: d.title, heTitle: d.heTitle, language: d.language, versionTitle: d.versionTitle,
      versionSource: d.versionSource, sectionNames: d.sectionNames || null, text: d.text,
    };
  }

  // Volltextsuche über alle heruntergeladenen Dateien der gewählten Sprachen (kinds: ['he','en','de',…]); die eigentliche Arbeit steht in searchcore.js
  entriesFor({ kinds, category = '', categories = [], titles = [] }) {
    const cats = [...(category ? [category] : []), ...categories];
    const tset = new Set(titles);
    const ok = e => (!cats.length && !tset.size) || tset.has(e.title) || cats.some(c => (e.categories.join('/') + '/').startsWith(c + '/'));
    return this.list().filter(e => kinds.includes(e.kind) && ok(e));
  }
  async search(opts) {
    const { onProgress = () => {}, isCancelled = () => false, kinds, category, categories, titles, ...params } = opts;
    return require('./searchcore').searchFiles({ dir: this.dir, entries: this.entriesFor({ kinds, category, categories, titles }), params, onProgress, isCancelled });
  }
}

module.exports = { renameRetry, parseOwn, AVG_KB, kindOf, relPathOf, buildGroups, summarize, selectedGroups, pickEntries, planEntries, Library };
