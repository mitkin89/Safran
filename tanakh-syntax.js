'use strict';

const { filters } = require('./bhsa-index');
const VERSION = 'Westminster Leningrad Codex (OSHB, mit Morphologie)';
const BOOKS = new Set(require('./bundled/manifest.json').items
  .filter(entry => entry.kind === 'he' && entry.versionTitle === VERSION)
  .map(entry => entry.title));

function supports(entry) {
  return entry.kind === 'he' && entry.versionTitle === VERSION && BOOKS.has(entry.title);
}

function load(book) {
  return BOOKS.has(book) ? require('./bundled/syntax/' + book + '.json') : null;
}

function cleanQuery(query) {
  const verb = String(query?.verb ?? '').trim();
  const split = value => String(value ?? '').trim().split(/[\s,]+/).filter(Boolean);
  const subjects = split(query?.subject), objects = split(query?.object);
  const words = [verb, ...subjects, ...objects].filter(Boolean);
  const bhsa = filters(query);
  if ((!words.length && !bhsa.domain && !bhsa.relation) || subjects.length > 12 || objects.length > 12
      || words.some(w => !/^[\u0591-\u05C7א-ת]+$/u.test(w) || !/[א-ת]/u.test(w))) return null;
  const unpointed = w => w.replace(/[^א-ת]/g, '');
  return { verb: unpointed(verb), subjects: new Set(subjects.map(unpointed)),
    objects: new Set(objects.map(unpointed)), bhsa, referents: query.referents === true };
}

function wordRoles(book, key, position) {
  if (typeof key !== 'string' || !/^[1-9]\d{0,2}:[1-9]\d{0,2}$/.test(key) || !Number.isInteger(position) || position < 0 || position > 200) return null;
  const index = load(book), roles = index?.roles[key]?.filter(([, positions]) => positions.includes(position));
  if (!roles?.length) return null;
  const locations = refs => refs.map(([ref, indices]) => ({
    ref, indices, signature: index.text[ref], label: indices.map(i => index.text[ref].split(' ')[i]).join(' '),
  }));
  const byRole = new Map();
  for (const [role, , group, referents] of roles) {
    const current = byRole.get(role) || { role, group: [], referents: [] };
    for (const [name, entries] of [['group', group], ['referents', referents]]) {
      for (const item of locations(entries)) {
        if (!current[name].some(existing => existing.ref === item.ref && existing.indices.join() === item.indices.join())) {
          current[name].push(item);
        }
      }
    }
    byRole.set(role, current);
  }
  return { signature: index.text[key], roles: [...byRole.values()] };
}

function createMatcher(index, query, text, readWords, predicateMatches, clauseMatch = null) {
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
    const groups = refs => refs.map(([ref, indices]) => {
      const tokens = verse(ref);
      return { ref, indices, signature: index.text[ref], forms: tokens && indices.map(i => tokens[i]?.form) };
    });
    const label = group => ({ text: group.forms.join(' '), ref: group.ref === key ? '' : group.ref });
    const valid = group => group.forms?.every(Boolean);
    for (const [verbAt, lemma, heads, subjectRefs, objectHeads, objectRefs, resolved, resolvedRefs] of pairs) {
      if (query.verb && lemma !== query.verb) continue;
      const explicitMatch = heads.some(head => query.subjects.has(head));
      const referentMatch = query.referents && resolved.some(head => query.subjects.has(head));
      if (query.subjects.size && !explicitMatch && !referentMatch) continue;
      if (query.objects.size && (!objectRefs.length || !objectHeads.some(head => query.objects.has(head)))) continue;
      if (!subjectRefs.length && !query.objects.size && !(query.referents && resolvedRefs.length)) continue;
      const verb = words[verbAt];
      if (!verb || !predicateMatches(verb)) continue;
      const subjects = groups(subjectRefs), objects = query.objects.size ? groups(objectRefs) : [];
      const referents = groups(query.referents && (!query.subjects.size || referentMatch) ? resolvedRefs : []);
      if (!subjects.every(valid) || (query.objects.size && !objects.every(valid))
          || (referentMatch && !explicitMatch && !referents.every(valid))) continue;
      const bhsa = clauseMatch?.(key, words, verbAt, [...subjects, ...objects]);
      if (clauseMatch && !bhsa) continue;
      positions.add(verbAt);
      for (const group of [...subjects, ...objects.filter(valid), ...referents.filter(valid)]) {
        if (group.ref === key) group.indices.forEach(i => positions.add(i));
      }
      evidence.push({ verb: verb.form, subjects: subjects.map(label),
        objects: objects.filter(valid).map(label), referents: referents.filter(valid).map(label), ...(bhsa ? { bhsa } : {}) });
    }
    return positions.size ? { words, positions, evidence } : null;
  };
}

module.exports = { supports, load, cleanQuery, createMatcher, wordRoles };
