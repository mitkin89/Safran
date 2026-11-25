// Library identities only. Native titles, files and edition references stay intact.
(function (root) {
  'use strict';
  const works = [
    ['Makkabäer I', 'The Book of Maccabees I', 'The Book of Maccabees I (Kahana Translation)', 'Makkabäer I (Septuaginta)'],
    ['Makkabäer II', 'The Book of Maccabees II', 'Makkabäer II (Septuaginta)'],
    ['Makkabäer III', 'Das dritte Buch der Makkabäer', 'Makkabäer III (Septuaginta)'],
    ['Makkabäer IV', 'Das vierte Buch der Makkabäer', 'Makkabäer IV (Septuaginta)'],
  ];
  const aliases = new Map(works.flatMap(titles => titles.map(title => [title, titles])));
  const canonicalTitle = title => aliases.get(title)?.[0] || title;
  const titlesFor = title => [...(aliases.get(title) || [title])];
  const rawKey = e => e.categories.join('/') + '¦' + e.title;
  const keyOf = e => e.categories.join('/') + '¦' + canonicalTitle(e.title);
  function groupEntries(entries) {
    const map = new Map();
    for (const e of entries) {
      const key = keyOf(e);
      if (!map.has(key)) map.set(key, { key, title: canonicalTitle(e.title), heTitle: e.heTitle, cats: e.categories, versions: [], aliases: [] });
      const g = map.get(key);
      g.versions.push(e);
      if (!g.aliases.includes(rawKey(e))) g.aliases.push(rawKey(e));
    }
    return [...map.values()];
  }
  // A Kahana base text is not superseded by an edition of the other work alias.
  const sameSource = (a, b) => a.title === b.title;
  const visibleVersion = (v, versions) => v.versionTitle !== 'merged' || !versions.some(x => x.kind === v.kind && x.versionTitle !== 'merged' && sameSource(x, v));
  function versionLabel(v) {
    const name = v.versionTitle === 'merged' ? 'Standardtext' : String(v.versionTitle || '').replace(/\s*\[[a-z]{2,3}\]\s*$/i, '');
    return /\(Kahana Translation\)$/.test(v.title || '') ? name + ' · Kahana' : name;
  }
  function independentNumbering(group, docs, columns) {
    if (!aliases.has(group.title) || docs.length < 2) return false;
    const sources = new Set(docs.map(d => /Kautzsch/.test(d.versionTitle || '') ? 'Kautzsch' : 'other'));
    // Kautzsch I/II contain split verse fragments, including chapters with equal lengths.
    if (['Makkabäer I', 'Makkabäer II'].includes(canonicalTitle(group.title)) && sources.size > 1) return true;
    return columns.some(c => JSON.stringify(c.map(r => r.label)) !== JSON.stringify(columns[0].map(r => r.label)));
  }
  function independentRows(columns) {
    return columns.flatMap((col, i) => col.map(r => ({ label: r.label, cells: columns.map((_, j) => i === j ? r.html : null) })));
  }
  const api = { canonicalTitle, titlesFor, rawKey, keyOf, groupEntries, sameSource, visibleVersion, versionLabel, independentNumbering, independentRows };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LibraryWorks = api;
})(typeof window === 'undefined' ? globalThis : window);
