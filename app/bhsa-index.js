'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { promisify } = require('node:util');
const gunzip = promisify(require('node:zlib').gunzip);
const { format, revision } = require('./bhsa-source');

const DOMAINS = new Set(['N', 'D', 'Q']);

function filters(query) {
  return {
    domain: DOMAINS.has(query?.domain) ? query.domain : '',
    relation: query?.relation === 'Resu' ? query.relation : '',
  };
}

async function readIndex(file) {
  const buffer = await fs.readFile(file);
  const contents = file.endsWith('.gz') ? await gunzip(buffer) : buffer;
  const index = JSON.parse(contents.toString('utf8'));
  if (index.version !== format || index.revision !== revision || !index.books || !index.aligned) {
    throw new Error('Ungültiger BHSA-Index');
  }
  return index;
}

let bundledPromise;
function readBundled() {
  return bundledPromise ||= readIndex(path.join(__dirname, 'bundled', 'bhsa', 'index.json.gz'));
}

const info = ([, text, resumes, parent]) => ({
  domain: DOMAINS.has(text.at(-1)) ? text.at(-1) : '',
  depth: [...text].filter(char => char === 'Q').length,
  resumes, parent,
});

function candidate(book, key, wordList) {
  const entry = book?.[key];
  return entry && wordList.map(w => w.normalized).join(' ') === entry[0] ? entry[1] : [];
}

function clauseFilter(book, query) {
  return (key, words, position, groups) => {
    const clauses = candidate(book, key, words).filter(clause => clause[4].includes(position));
    if (clauses.length !== 1) return null;
    const clause = clauses[0];
    if ((query.domain && clause[1].at(-1) !== query.domain) || (query.relation && !clause[2])) return null;
    for (const group of groups) {
      const entry = book[group.ref];
      const other = entry?.[0] === group.signature && entry[1].find(row => row[0] === clause[0]);
      if (!other || !group.indices.every(i => other[4].includes(i))) return null;
    }
    return info(clause);
  };
}

function clauseMatcher(book, query, readWords, matchesPredicate) {
  return (coords, text) => {
    const key = (coords[0] + 1) + ':' + (coords[1] + 1);
    if (!book?.[key]) return null;
    const words = readWords(text);
    const positions = new Set(), evidence = [];
    const clauses = candidate(book, key, words);
    for (const clause of clauses) {
      if ((query.domain && clause[1].at(-1) !== query.domain) || (query.relation && !clause[2])) continue;
      const hits = clause[4].filter(i => matchesPredicate(words[i]) &&
        clauses.filter(row => row[4].includes(i)).length === 1);
      if (!hits.length) continue;
      hits.forEach(i => positions.add(i));
      evidence.push({ verb: query.verb ? hits.map(i => words[i].form).join(' · ') : '', verbPositions:hits, bhsa: info(clause) });
    }
    return positions.size ? { words, positions, evidence } : null;
  };
}

function wordContext(index, book, key, position) {
  if (typeof book !== 'string' || typeof key !== 'string' || !/^[1-9]\d{0,2}:[1-9]\d{0,2}$/.test(key)
      || !Number.isInteger(position) || position < 0) return null;
  const entry = Object.hasOwn(index.books, book) && index.books[book][key];
  if (!entry) return null;
  const clauses = entry[1].filter(clause => clause[4].includes(position));
  if (clauses.length !== 1) return null;
  const data = info(clauses[0]);
  return data.domain || data.resumes ? { signature: entry[0], ...data } : null;
}

module.exports = { filters, readIndex, readBundled, clauseFilter, clauseMatcher, wordContext };
