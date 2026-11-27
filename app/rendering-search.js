// Reverse lookup of grouped German renderings in the checked interlinear index.
(function(root){
  'use strict';
  const key=value=>String(value||'').normalize('NFC').trim().toLocaleLowerCase('de');
  function find(index,source,rendering){
    const wanted=key(rendering),found=[];
    if(!wanted||wanted==='*')return found;
    for(const [lemma,[labels,cells]] of Object.entries(index?.tr?.[source]||{})){
      const groups=new Set(labels.flatMap((label,i)=>key(label[0])===wanted?[i]:[]));
      if(!groups.size)continue;
      let count=0;const refs=[],forms=new Map(),languages=new Set();
      for(const group of groups)for(const [form,n] of labels[group].slice(1))forms.set(form,(forms.get(form)||0)+n);
      for(const [group,code,n,encoded] of cells){
        if(!groups.has(group))continue;count+=n;languages.add(String(code).startsWith('A')?'arc':'he');
        let ref=0;for(const delta of String(encoded||'').split('.').filter(Boolean)){
          ref+=parseInt(delta,36);if(Number.isSafeInteger(ref))refs.push(ref);
        }
      }
      if(count)found.push({lemma,count,refs:refs.sort((a,b)=>a-b),forms:[...forms],languages:[...languages]});
    }
    return found.sort((a,b)=>b.count-a.count||a.lemma.localeCompare(b.lemma));
  }
  // Keep witness lexeme IDs distinct from unresolved forms and phrases.
  function findAncient(indices, source, selected) {
    if (!selected || selected.other || selected.forms[0] === '*') return [];
    const witness = source === 'Peshitta' || source === 'Samaritan';
    const entries = source === 'LXX' ? indices.LXX : source === 'O' ? indices.targum
      : witness ? (indices.witness?.groups?.[source] || indices.witness?.[source]) : null;
    const exact = value => String(value || '').normalize('NFC');
    const matches = label => source === 'LXX' ? exact(label) === exact(selected.forms[0])
      : source === 'O' ? (selected.targumLex != null ? label[2] === selected.targumLex : label[2] == null && exact(label[0]) === exact(selected.forms[0]))
      : typeof label === 'string' ? !selected.key && exact(label) === exact(selected.forms[0])
      : selected.key ? label.key === selected.key && label.type === selected.type
      : !label.key && exact(label.forms[0]) === exact(selected.forms[0]);
    const adapted = {};
    for (const [lemma, [labels, cells]] of Object.entries(entries || {})) {
      const groups = new Set(labels.flatMap((label, i) => matches(label) ? [i] : []));
      if (!groups.size) continue;
      const forms = new Map(), rows = [];
      for (const cell of cells) {
        const [g, code] = cell;
        if (!groups.has(g)) continue;
        const n = cell[2], refs = source === 'O' ? cell[5] : cell[3];
        if (!n) continue;
        rows.push([0, code, n, refs]);
        if (witness && cell[4]) forms.set(cell[4], (forms.get(cell[4]) || 0) + n);
        else for (const target of (source === 'O' ? cell[8] : cell[4]) || []) {
          const form = source === 'O' ? target[1] : target;
          if (form) forms.set(form, (forms.get(form) || 0) + 1);
        }
      }
      adapted[lemma] = [[['match', ...forms]], rows];
    }
    return find({tr:{[source]:adapted}}, source, 'match');
  }
  function familySources(members) {
    const sources = {};
    for (const [lemma, details] of members) {
      for (const [source, entry] of Object.entries(details.src)) {
        const merged = sources[source] ||= {
          lang: entry.lang, grouped:entry.grouped, labels: [], cells: [], total: 0, byLemma: {},
          groups: new Map(),
        };
        merged.byLemma[lemma] = entry;
        merged.total += entry.total;
        const indices = entry.labels.map(label => {
          // Preserve distinct labels for different kinds of variants or lexemes.
          const group = JSON.stringify([key(label.forms[0]), label.key, label.type, label.targumLex, label.gl, !!label.same, !!label.other]);
          if (!merged.groups.has(group)) {
            merged.groups.set(group, merged.labels.length);
            merged.labels.push({ ...label, forms: [label.forms[0]], variants: new Map() });
          }
          const index = merged.groups.get(group), variants = merged.labels[index].variants;
          for (const [form, n] of label.forms.slice(1)) variants.set(form, (variants.get(form) || 0) + n);
          return index;
        });
        merged.cells.push(...entry.cells.map(cell => ({ ...cell, g: indices[cell.g], lemma })));
      }
    }
    for (const entry of Object.values(sources)) {
      entry.labels = entry.labels.map(({ variants, ...label }) => ({
        ...label, forms: [...label.forms, ...[...variants].sort((a, b) => b[1] - a[1])],
      }));
      delete entry.groups;
    }
    return sources;
  }
  // Surface forms are occurrence metadata; dictionary labels must never substitute for them.
  function surfaceIndex(cells) {
    const rows = [];
    for (const cell of cells) {
      let ref = 0;
      String(cell.refs || '').split('.').filter(Boolean).forEach((delta, i) => {
        ref += parseInt(delta, 36);
        const text = cell.targets?.[i]?.[1] || cell.form;
        if (text) rows.push({ ref, code: cell.code, g: cell.g, t: text });
      });
    }
    return (codes, refs) => {
      const cores = new Map(), groups = new Map();
      for (const row of rows) {
        if (!codes.has(row.code) || (refs && !refs.has(row.ref))) continue;
        const id = JSON.stringify([row.g, row.t]);
        const core = cores.get(id) || { t: row.t, g: row.g, c: 0, cj: '', cjn: 0 };
        core.c++; cores.set(id, core);
        groups.set(row.g, (groups.get(row.g) || 0) + 1);
      }
      if (!cores.size) return null;
      const sorted = [...cores.values()].sort((a, b) => b.c - a.c || a.t.localeCompare(b.t));
      return { n: sorted.reduce((n, x) => n + x.c, 0), k: sorted.length,
        cores: sorted, groups: [...groups].sort((a, b) => b[1] - a[1]), col: null, de: false };
    };
  }
  const api={find,findAncient,familySources,surfaceIndex};if(typeof module==='object'&&module.exports)module.exports=api;
  else root.RenderingSearch=api;
})(typeof window==='object'?window:globalThis);
