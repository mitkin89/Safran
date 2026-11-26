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
          const group = JSON.stringify([key(label.forms[0]), label.key, label.type, label.gl, !!label.same, !!label.other]);
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
  const api={find,familySources};if(typeof module==='object'&&module.exports)module.exports=api;
  else root.RenderingSearch=api;
})(typeof window==='object'?window:globalThis);
