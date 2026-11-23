// Editorial metadata for classifications independent of the wording of the apparatus notes.
window.TextCritTraditions = (() => {
  'use strict';
  const categories = {
    halacha: 'Halacha',
    aggada: 'Aggada / Midrasch',
    targum: 'Gemeinsam mit den Targumim',
    tiqqun: 'Tiqqun soferim',
  };
  const index = new Map();
  for (const [key, tag] of window.TEXTCRIT_TRADITIONS || []) {
    const id = JSON.stringify(key);
    if (!index.has(id)) index.set(id, []);
    index.get(id).push(tag);
  }
  function tags(witness, edition, ref, reading) {
    const key = witness === 'Hex'
      ? [witness, ref]
      : [witness, edition, ref, reading.type, reading.he || [], reading.sy || [], reading.a || 0];
    return index.get(JSON.stringify(key)) || [];
  }
  const translate = s => window.I18N?.textCrit?.(s) ?? s;
  function badge(list, escape) {
    return list.map(tag => {
      const check = tag.check === 'source-checked' ? translate('Am Quelltext geprüft') + ' · ' : '';
      const detail = window.I18N?.lang === 'en' ? tag.en : tag.de;
      const label = translate('Jüdische Auslegung') + ' · ' + translate(categories[tag.category]);
      const title = [check + tag.author, tag.source, detail].filter(Boolean).join(' · ');
      return ' <span class="tc-tradition" data-tradition="' + escape(tag.category) + '" title="' +
        escape(title) + '">' + escape(label) + '</span>';
    }).join('');
  }
  function note(original, list) {
    if (!list.some(tag => tag.category === 'targum' && tag.check === 'source-checked')) return original;
    return original.replace(/,?\s*\b(?:ungeprüft|unchecked|unverified|not checked)\b(?=\s*\))/gi, '');
  }
  return { categories, tags, badge, note };
})();
