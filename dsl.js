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
    let line = raw.replace(/\{\{[\s\S]*?\}\}/g, '');
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
    let names = [];
    try { names = (await fs.readdir(this.dir)).filter(n => n.endsWith('.json')); } catch { return []; }
    const out = [];
    for (const n of names) {
      try {
        const d = await this.load(n.slice(0, -5));
        out.push({ id: n.slice(0, -5), name: d.name, count: d.heads.length, lang: d.indexLang, bytes: d.bytes || 0 });
      } catch { /* defekte Datei ignorieren */ }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }
  async load(id) {
    if (this.cache.has(id)) return this.cache.get(id);
    const buf = await fs.readFile(this.file(id));
    const j = JSON.parse(buf.toString('utf8'));
    j.bytes = buf.length;
    // Suchindex: sortierte Liste (normalisiertes Stichwort, Eintragsnummer)
    const idx = [];
    j.heads.forEach((hs, k) => hs.forEach(h => { const n = norm(h); if (n) idx.push([n, k]); }));
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
    return { id, name: p.name, count: data.heads.length };
  }
  async remove(id) {
    if (!/^[0-9a-f]{12}$/.test(id)) throw new Error('Ungültige Kennung.');
    await fs.unlink(this.file(id)).catch(() => {});
    this.cache.delete(id);
  }
  // Nachschlagen: genau, dann Wortanfang, dann ohne hebräische Vorsilben (ה ו ב כ ל מ ש)
  async lookup(query, { limit = 40 } = {}) {
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
    // genaue Treffer zuerst
    return res.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'exact' ? -1 : 1)).slice(0, limit * 2);
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
