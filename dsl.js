// DSL-Wörterbücher (ABBYY Lingvo): einlesen, indexieren, nachschlagen.
// Eine DSL-Datei ist Text (meist UTF-16, auch als .dsl.dz = gzip): Kopfzeilen „#NAME "…"“, dann je Eintrag
// eine oder mehrere Stichwortzeilen ohne Einrückung, darunter die eingerückte Erklärung mit Tags wie [b] [i] [m1] [ref].
'use strict';
const fs = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

// ---------- Dekodieren ----------
function decode(buf) {
  if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf); // .dsl.dz (dictzip ist gzip-kompatibel)
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) { const b = Buffer.from(buf.subarray(2)); b.swap16(); return b.toString('utf16le'); }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString('utf8');
  if (buf.length >= 4 && buf[1] === 0 && buf[3] === 0) return buf.toString('utf16le'); // UTF-16LE ohne Kennung
  return buf.toString('utf8');
}

// ---------- Normalisieren (Stichwörter und Suchwort gleich behandeln) ----------
const FINAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[֑-ׇ]/g, '')            // Vokal- und Betonungszeichen
    .replace(/[̀-ͯ]/g, '')            // lateinische Akzente
    .replace(/[ךםןףץ]/g, c => FINAL[c])        // Endbuchstaben
    .replace(/[־׳״'"“”„‚‘’`´.,;:!?()\[\]{}<>*]/g, '') // Maqaf, Gershayim, Satzzeichen
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

// ---------- Stichwörter ----------
// „Wort {(optional)}“ → „Wort“; geschweifte Zusätze und Escapes entfernen; „\(“ „\)“ wieder zu Klammern
function cleanHead(h) {
  return h.replace(/\{\{[\s\S]*?\}\}/g, '').replace(/\{[^}]*\}/g, '').replace(/\\([()\[\]{}~@\\])/g, '$1').replace(/\s+/g, ' ').trim();
}

// ---------- Erklärung → HTML ----------
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function bodyToHtml(lines) {
  const out = [];
  for (const raw of lines) {
    let line = raw.replace(/\{\{ref:([^}]*)\}\}/g, (m, r) => `[sref ${r.replace(/[\[\]]/g, '')}]`).replace(/\{\{\/ref\}\}/g, '[/sref]').replace(/\{\{[\s\S]*?\}\}/g, '');
    const m = /^[ \t]*\[m(\d)\]/.exec(line);
    const indent = m ? +m[1] : 0;
    const stack = []; // { tag, el }
    let html = '', skip = 0; // skip > 0: innerhalb von [s]…[/s] (Bild/Ton) nichts ausgeben
    const re = /\\([\[\]{}()~@\\<>])|<<([^>]*)>>|\[(\/?)([a-z*]+\d?)([^\]]*)\]|([^\\\[<]+|[\\\[<])/gi;
    const OPEN = { b: ['b'], i: ['i'], u: ['u'], sub: ['sub'], sup: ['sup'], trn: ['span', 'dtrn'], ex: ['span', 'dex'], com: ['span', 'dcom'], p: ['span', 'dp'], t: ['span', 'dt'], ref: ['a', 'dref'], url: ['a', 'dref'] };
    let t;
    while ((t = re.exec(line))) {
      if (t[1] !== undefined) { if (!skip) html += esc(t[1]); continue; }
      if (t[2] !== undefined) { const q = t[2].trim(); if (!skip) html += `<a class="dref" data-q="${esc(q)}">${esc(q)}</a>`; continue; }
      if (t[4] !== undefined) {
        const close = !!t[3], tag = t[4].toLowerCase(), arg = (t[5] || '').trim();
        if (tag === 's') { skip += close ? -1 : 1; if (skip < 0) skip = 0; continue; }
        if (close) {
          const k = stack.map(x => x.tag).lastIndexOf(tag);
          if (k >= 0) while (stack.length > k) html += `</${stack.pop().el}>`;
          continue;
        }
        if (skip) continue;
        if (tag === 'sref') { html += `<a class="dsrc" data-sref="${esc(arg)}">`; stack.push({ tag, el: 'a' }); continue; }
        if (tag === 'c') { const col = /^[a-z]+$/i.test(arg) ? arg.toLowerCase() : 'x'; html += `<span class="dc dc-${col}">`; stack.push({ tag, el: 'span' }); continue; }
        const o = OPEN[tag];
        if (o) { html += `<${o[0]}${o[1] ? ` class="${o[1]}"` : ''}>`; stack.push({ tag, el: o[0] }); }
        continue; // [m1] [lang] [*] u. a. nur Auszeichnung
      }
      if (!skip) html += esc(t[6]);
    }
    while (stack.length) html += `</${stack.pop().el}>`;
    html = html.trim();
    if (html) out.push(`<div class="dl" style="margin-left:${indent ? (indent - 1) * 1.2 : 0}em">${linkRefs(html)}</div>`);
  }
  return out.join('');
}
// [ref]Wort[/ref] hat keinen Rohtext im Attribut: den sichtbaren Text als Suchwort übernehmen
function linkRefs(html) { return html.replace(/<a class="dref">([^<]*)<\/a>/g, (m, t) => `<a class="dref" data-q="${esc(t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))}">${t}</a>`); }

// ---------- Datei lesen ----------
function parseDsl(buf, filename = '') {
  const text = decode(buf).replace(/^﻿/, '');
  const lines = text.split(/\r?\n/);
  const meta = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    if (!l.startsWith('#')) break;
    const m = /^#(\w+)\s+"?(.*?)"?\s*$/.exec(l);
    if (m) meta[m[1].toUpperCase()] = m[2];
  }
  const entries = [];
  let heads = [], body = [];
  const flush = () => {
    if (heads.length) {
      const hs = heads.map(cleanHead).filter(Boolean);
      if (hs.length && body.length) entries.push({ heads: hs, html: bodyToHtml(body) });
    }
    heads = []; body = [];
  };
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    if (/^\s/.test(l)) { body.push(l); continue; }   // eingerückt = Erklärung
    if (body.length) flush();                         // neues Stichwort nach einer Erklärung
    heads.push(l.trim());
  }
  flush();
  if (!entries.length) throw new Error('In dieser Datei wurden keine Wörterbucheinträge gefunden (erwartet: DSL-Format).');
  const name = meta.NAME || path.basename(filename).replace(/\.dsl(\.dz)?$/i, '');
  return { name, indexLang: meta.INDEX_LANGUAGE || '', contentsLang: meta.CONTENTS_LANGUAGE || '', entries };
}

// ---------- Speicher: ein Ordner mit je einer JSON-Datei pro Wörterbuch ----------
class Dictionaries {
  constructor(dir) { this.dir = dir; this.cache = new Map(); }
  file(id) { return path.join(this.dir, id + '.json'); }
  async list() {
    const meta = await this.meta();
    let names = [];
    try { names = (await fs.readdir(this.dir)).filter(n => n.endsWith('.json')); } catch { return []; }
    const out = [];
    for (const n of names) {
      try {
        const d = await this.load(n.slice(0, -5));
        out.push({ id: n.slice(0, -5), name: d.name, count: d.heads.length, lang: d.indexLang, bytes: d.bytes || 0, ship: meta.ship.includes(n.slice(0, -5)), bundled: meta.bundled.includes(n.slice(0, -5)) });
      } catch { /* defekte Datei ignorieren */ }
    }
    // eigene Reihenfolge (Datei _order.txt, eine Kennung pro Zeile); Neue ohne Platz kommen ans Ende, alphabetisch
    let order = [];
    try { order = (await fs.readFile(path.join(this.dir, '_order.txt'), 'utf8')).split(/\r?\n/).filter(Boolean); } catch { /* keine */ }
    const pos = id => { const k = order.indexOf(id); return k < 0 ? 1e9 : k; };
    return out.sort((a, b) => pos(a.id) - pos(b.id) || a.name.localeCompare(b.name));
  }
  async setOrder(ids) {
    const have = new Set((await this.list()).map(d => d.id));
    const clean = ids.filter(id => have.has(id));
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(path.join(this.dir, '_order.txt'), clean.join('\n'), 'utf8');
  }
  async load(id) {
    if (this.cache.has(id)) return this.cache.get(id);
    const buf = await fs.readFile(this.file(id));
    const j = JSON.parse(buf.toString('utf8'));
    j.bytes = buf.length;
    // Suchindex: sortierte Liste (normalisiertes Stichwort, Eintragsnummer)
    const idx = [];
    j.heads.forEach((hs, k) => (j.keys && j.keys[k] ? j.keys[k] : hs).forEach(h => { const n = norm(h); if (n) idx.push([n, k]); }));
    idx.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]);
    j.idx = idx;
    this.cache.set(id, j);
    return j;
  }
  async add(buf, filename) {
    const p = parseDsl(buf, filename);
    const id = crypto.createHash('sha1').update(p.name + '\u0000' + p.entries.length).digest('hex').slice(0, 12);
    const data = { name: p.name, indexLang: p.indexLang, contentsLang: p.contentsLang, heads: p.entries.map(e => e.heads), html: p.entries.map(e => e.html) };
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file(id), JSON.stringify(data));
    this.cache.delete(id);
    const m = await this.meta();
    if (m.removed.includes(id)) { m.removed = m.removed.filter(x => x !== id); await this.saveMeta(m); }
    return { id, name: p.name, count: data.heads.length };
  }
  // Mitgelieferte Wörterbücher: Merkdatei _bundled.txt (JSON) im Wörterbuchordner
  //   ship: Kennungen, die beim Export für GitHub mitgehen · bundled: Kennungen aus dem Programm · removed: vom Nutzer entfernte mitgelieferte · hash: Stand je Kennung
  async meta() {
    try { const j = JSON.parse(await fs.readFile(path.join(this.dir, '_bundled.txt'), 'utf8')); return { ship: j.ship || [], bundled: j.bundled || [], removed: j.removed || [], hash: j.hash || {} }; } catch { return { ship: [], bundled: [], removed: [], hash: {} }; }
  }
  async saveMeta(m) { await fs.mkdir(this.dir, { recursive: true }); await fs.writeFile(path.join(this.dir, '_bundled.txt'), JSON.stringify(m), 'utf8'); }
  async setShip(id, on) {
    if (!/^[0-9a-f]{12}$/.test(id)) throw new Error('Ungültige Kennung.');
    const m = await this.meta();
    m.ship = m.ship.filter(x => x !== id); if (on) m.ship.push(id);
    await this.saveMeta(m);
  }
  // Für GitHub: markierte Wörterbücher gzip-komprimiert nach <outDir>/dict/
  async exportBundled(outDir) {
    const m = await this.meta(), have = new Set((await this.list()).map(d => d.id));
    const dir = path.join(outDir, 'dict');
    await fs.rm(dir, { recursive: true, force: true });
    const items = [];
    for (const id of m.ship.filter(x => have.has(x))) {
      const buf = await fs.readFile(this.file(id));
      const d = await this.load(id);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, id + '.json.gz'), zlib.gzipSync(buf, { level: 9 }));
      items.push({ id, name: d.name, count: d.heads.length, hash: crypto.createHash('sha1').update(buf).digest('hex') });
    }
    if (items.length) await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify({ version: 1, items }, null, 1));
    return items.length;
  }
  // Beim Start: mitgelieferte Wörterbücher einspielen (neu oder geändert); vom Nutzer entfernte bleiben entfernt
  async importBundled(srcDir) {
    let man;
    try { man = JSON.parse(await fs.readFile(path.join(srcDir, 'dict', 'manifest.json'), 'utf8')); } catch { return 0; }
    const m = await this.meta();
    let n = 0;
    for (const it of man.items || []) {
      if (!/^[0-9a-f]{12}$/.test(String(it.id))) continue;
      if (m.removed.includes(it.id)) continue;
      const has = await fs.access(this.file(it.id)).then(() => true, () => false);
      if (has && m.hash[it.id] === it.hash) continue;
      try {
        const buf = zlib.gunzipSync(await fs.readFile(path.join(srcDir, 'dict', it.id + '.json.gz')));
        if (crypto.createHash('sha1').update(buf).digest('hex') !== it.hash) continue; // beschädigt
        await fs.mkdir(this.dir, { recursive: true });
        await fs.writeFile(this.file(it.id), buf);
        this.cache.delete(it.id);
        m.hash[it.id] = it.hash; if (!m.bundled.includes(it.id)) m.bundled.push(it.id); if (!m.ship.includes(it.id)) m.ship.push(it.id);
        n++;
      } catch { /* nächstes */ }
    }
    if (n) await this.saveMeta(m);
    return n;
  }
  async remove(id) {
    if (!/^[0-9a-f]{12}$/.test(id)) throw new Error('Ungültige Kennung.');
    await fs.unlink(this.file(id)).catch(() => {});
    this.cache.delete(id);
    const m = await this.meta();
    if (m.bundled.includes(id) && !m.removed.includes(id)) m.removed.push(id);
    m.ship = m.ship.filter(x => x !== id);
    await this.saveMeta(m);
  }
  // Wortvorschläge beim Tippen: Stichwörter, die mit der Eingabe beginnen (Vokalzeichen egal), je Wörterbuch in dessen Reihenfolge
  async suggest(query, limit = 12) {
    const q = norm(query);
    if (!q) return [];
    const out = [], seen = new Set();
    for (const d of (await this.list())) {
      const data = await this.load(d.id);
      let lo = 0, hi = data.idx.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (data.idx[m][0] < q) lo = m + 1; else hi = m; }
      let taken = 0;
      for (let i = lo; i < data.idx.length && taken < limit; i++) {
        if (!data.idx[i][0].startsWith(q)) break;
        const head = data.heads[data.idx[i][1]][0];
        const key = norm(head);
        if (!key || seen.has(key)) continue;
        seen.add(key); taken++;
        out.push({ head, key, dict: data.name });
      }
    }
    // kürzere (näher an der Eingabe liegende) Wörter zuerst, bei Gleichstand die Wörterbuch-Reihenfolge behalten
    return out.map((x, i) => [x, i]).sort((a, b) => a[0].key.length - b[0].key.length || a[1] - b[1]).map(a => a[0]).slice(0, limit);
  }
  // Nachschlagen: genau, dann Wortanfang, dann ohne hebräische Vorsilben (ה ו ב כ ל מ ש)
  async lookup(query, { limit = 40, only = '' } = {}) {
    const q = norm(query);
    if (!q) return [];
    const res = [];
    const prefixes = ['ו', 'ה', 'ב', 'כ', 'ל', 'מ', 'ש'];
    const variants = [{ q, note: '' }];
    for (let k = 1; k <= 2 && k < q.length - 1; k++) {
      const head = q.slice(0, k);
      if ([...head].every(c => prefixes.includes(c))) variants.push({ q: q.slice(k), note: `ohne Vorsilbe „${head}“` });
    }
    for (const d of (await this.list())) {
      if (only && d.id !== only) continue;
      const data = await this.load(d.id);
      const seen = new Set();
      const add = (k, kind, note) => { if (seen.has(k)) return; seen.add(k); res.push({ dict: data.name, dictId: d.id, head: data.heads[k].join(' · '), html: data.html[k], kind, note }); };
      for (const v of variants) {
        const exact = range(data.idx, v.q, true), pre = range(data.idx, v.q, false);
        for (const k of exact) add(k, 'exact', v.note);
        if (exact.length === 0 || v === variants[0]) for (const k of pre.slice(0, limit)) add(k, 'prefix', v.note);
        if (exact.length) break;
      }
    }
    // Reihenfolge der Wörterbücher bleibt maßgeblich; innerhalb eines Wörterbuchs kommen genaue Treffer zuerst
    const rank = new Map(); res.forEach(x => { if (!rank.has(x.dictId)) rank.set(x.dictId, rank.size); });
    return res.sort((a, b) => rank.get(a.dictId) - rank.get(b.dictId) || (a.kind === b.kind ? 0 : a.kind === 'exact' ? -1 : 1)).slice(0, limit * 2);
  }
}
function range(idx, q, exact) {
  let lo = 0, hi = idx.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (idx[m][0] < q) lo = m + 1; else hi = m; }
  const out = [];
  for (let k = lo; k < idx.length; k++) {
    const h = idx[k][0];
    if (exact ? h !== q : !h.startsWith(q)) break;
    out.push(idx[k][1]);
    if (out.length > 400) break;
  }
  return out;
}

module.exports = { decode, norm, cleanHead, bodyToHtml, parseDsl, Dictionaries };
