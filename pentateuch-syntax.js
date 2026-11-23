'use strict';

const VERSION = 'Westminster Leningrad Codex (OSHB, mit Morphologie)';
const BOOKS = new Set(['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']);

function supports(entry) {
  return entry.kind === 'he' && entry.versionTitle === VERSION && BOOKS.has(entry.title);
}

function cleanQuery(query) {
  const verb = String(query?.verb ?? '').trim();
  const subjects = String(query?.subject ?? '').trim().split(/[\s,]+/).filter(Boolean);
  const words = [verb, ...subjects].filter(Boolean);
  if (!words.length || subjects.length > 12 || words.some(w => !/^[\u0591-\u05C7א-ת]+$/u.test(w) || !/[א-ת]/u.test(w))) return null;
  const unpointed = w => w.replace(/[^א-ת]/g, '');
  return { verb: unpointed(verb), subjects: new Set(subjects.map(unpointed)) };
}

function createMatcher(index, query, text, readWords, predicateMatches) {
  const verified = new Map();
  function verse(key) {
    if (!verified.has(key)) {
      const [chapter, number] = key.split(':').map(Number);
      const source = text[chapter - 1]?.[number - 1];
      const words = typeof source === 'string' ? readWords(source) : [];
      verified.set(key, words.length && words.map(w => w.normalized).join(' ') === index.text[key] ? words : null);
    }
    return verified.get(key);
  }

  return ([chapter, number]) => {
    const key = (chapter + 1) + ':' + (number + 1);
    const pairs = index.pairs[key];
    if (!pairs) return null;
    const words = verse(key);
    if (!words) return null;
    const positions = new Set();
    const evidence = [];
    for (const [verbAt, lemma, heads, subjectRefs] of pairs) {
      if (query.verb && lemma !== query.verb) continue;
      if (query.subjects.size && !heads.some(head => query.subjects.has(head))) continue;
      const verb = words[verbAt];
      if (!verb || !predicateMatches(verb)) continue;
      const groups = subjectRefs.map(([ref, indices]) => {
        const tokens = verse(ref);
        return { ref, indices, forms: tokens && indices.map(i => tokens[i]?.form) };
      });
      if (groups.some(group => !group.forms || group.forms.some(form => !form))) continue;
      positions.add(verbAt);
      for (const group of groups) {
        if (group.ref === key) group.indices.forEach(i => positions.add(i));
      }
      evidence.push({ verb: verb.form, subjects: groups.map(group => ({
        text: group.forms.join(' '), ref: group.ref === key ? '' : group.ref,
      })) });
    }
    return positions.size ? { words, positions, evidence } : null;
  };
}

module.exports = { supports, cleanQuery, createMatcher };
