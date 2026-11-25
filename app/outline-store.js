'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { sortTitles } = require('./order');
const { compileTerm } = require('./search');

const fileKey = book => book.replace(/[^\p{L}\p{N} .'’-]/gu, '_').replace(/\.{2,}/g, '_');
const PAGE_SIZE = 60;

async function readOutline(dir, name, filter) {
  try {
    const text = await fs.readFile(path.join(dir, name), 'utf8');
    if (filter && !text.includes('\\u')) {
      if (filter.mitzvotOnly && !text.includes('"mz"')) return null;
      if (filter.needle && !text.toLowerCase().includes(filter.needle) && !fold(text).includes(filter.needle)) return null;
    }
    const outline = JSON.parse(text);
    return Array.isArray(outline?.sections) ? outline : null;
  } catch { return null; }
}

async function getOutline(dirs, book) {
  const exact = String(book ?? '').replace(/[^\p{L}\p{N} ,.'’-]/gu, '_').replace(/\.{2,}/g, '_');
  if (!exact) return null;
  for (const dir of dirs) {
    for (const name of new Set([fileKey(exact), exact])) {
      const outline = await readOutline(dir, name + '.json');
      if (outline) return outline;
    }
  }
  return null;
}

async function outlineFiles(dirs) {
  const files = new Map();
  for (const dir of dirs) {
    const names = await fs.readdir(dir, { withFileTypes: true }).catch(error => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const entry of names) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const name = entry.name.slice(0, -5);
      const key = fileKey(name);
      if (!files.has(key)) files.set(key, []);
      files.get(key).push({ dir, name: entry.name, title: name });
    }
  }
  return sortTitles([...files.values()], candidates => candidates[0].title);
}

const MARKS = /[\u0300-\u036f\u0591-\u05bd\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05c7]/g;
const fold = text => text.normalize('NFD').toLowerCase().replace(MARKS, '').replace(/ß/g, 'ss')
  .replace(/[‐‑‒–—־]/g, '-');

function localized(record, key, lang) {
  const base = record[key] || '';
  return lang === 'he' ? base || record[key + '_en'] || record[key + '_de'] || ''
    : record[key + '_' + lang] || record[key + '_en'] || base;
}

function firstRef(ref, levels) {
  const start = String(ref ?? '').split(/[;,]/, 1)[0].trim().replace(/\s*[-–]\s*\d.*$/, '');
  if (levels === 2 && /^\d+:\d+$/.test(start)) return start + ':1';
  return /^\d+$/.test(start) && levels !== 2 ? start + ':1' : start;
}

function* outlineEntries(sections) {
  function* items(rows, section) {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      yield { row, section, heading: false, ref: row.ref };
      yield* items(row.sub, section);
    }
  }
  for (const section of sections) {
    if (!section || !Array.isArray(section.items)) continue;
    yield { row: section, section, heading: true, ref: section.items.find(row => row && !row.mz && row.ref)?.ref };
    yield* items(section.items, section);
  }
}

async function searchOutlines(dirs, options, isCancelled = () => false) {
  const query = String(options.query ?? '').trim().slice(0, 256);
  const kind = options.kind, lang = ['he', 'de', 'en'].includes(options.lang) ? options.lang : 'de';
  const offset = Number.isSafeInteger(options.offset) ? Math.max(0, options.offset) : 0;
  const mitzvah = kind !== 'outlines' && /^#?\s*\d{1,3}$/.test(query) ? Number(query.replace(/^#/, '')) : null;
  const terms = fold(query).split(/\s+/u).filter(Boolean);
  const plainTerms = [];
  const wildcardTerms = [];
  for (const term of terms) {
    if (/^[\p{L}\p{N}*?]+$/u.test(term) && /[*?]/.test(term) && /[\p{L}\p{N}]/u.test(term)) {
      wildcardTerms.push(compileTerm(term));
    } else plainTerms.push(term);
  }
  const needles = [...plainTerms, ...wildcardTerms.map(term => term.literal)];
  const prefilter = {
    mitzvotOnly: kind === 'mitzvot' || mitzvah !== null,
    needle: mitzvah === null && needles.find(term => /^[\p{L}\p{N}-]{3,}$/u.test(term)),
  };
  const languages = [...new Set([lang, 'de', 'en', 'he'])];
  const results = [];
  let total = 0;
  if (!terms.length && kind !== 'mitzvot') return { results, total, previous: null, next: null };
  for (const candidates of await outlineFiles(dirs)) {
    if (isCancelled()) break;
    let outline, selected;
    for (const [index, candidate] of candidates.entries()) {
      // A valid local file overrides the bundled one, even if it has no matches.
      outline = await readOutline(candidate.dir, candidate.name, index === candidates.length - 1 ? prefilter : null);
      if (outline) { selected = candidate; break; }
    }
    if (!outline) continue;
    const book = typeof outline.book === 'string' && outline.book.trim() ? outline.book : selected.title;
    for (const { row, section, heading, ref } of outlineEntries(outline.sections)) {
      const number = Number(row.mz) || null;
      if ((kind === 'mitzvot' && !number) || (kind === 'outlines' && number)) continue;
      if (mitzvah !== null && number !== mitzvah) continue;
      const key = heading ? 'head' : 'text';
      let matchedLang = lang;
      if (mitzvah === null && terms.length) {
        let previous;
        matchedLang = languages.find(language => {
          const text = [localized(row, key, language), localized(row, 'desc', language), ref].join(' ');
          if (text === previous) return false;
          previous = text;
          const searchable = fold(text);
          if (!needles.every(term => searchable.includes(term))) return false;
          if (!wildcardTerms.length) return true;
          const words = searchable.match(/[\p{L}\p{N}]+/gu) || [];
          return wildcardTerms.every(term => words.some(term.test));
        });
        if (!matchedLang) continue;
      }
      if (total++ < offset || results.length >= PAGE_SIZE) continue;
      const text = localized(row, key, matchedLang);
      const description = localized(row, 'desc', matchedLang);
      const start = firstRef(ref, outline.levels);
      results.push({ book, ref: String(ref ?? ''), target: start ? book + ' ' + start : book,
        text, description, section: heading ? '' : localized(section, 'head', lang), number });
    }
  }
  return { results, total, previous: offset ? Math.max(0, offset - PAGE_SIZE) : null,
    next: offset + PAGE_SIZE < total ? offset + PAGE_SIZE : null };
}

module.exports = { getOutline, searchOutlines };
