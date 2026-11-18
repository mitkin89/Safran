// Buch-/Abschnittsexport: versweise ausgerichtete Spalten für PDF und Word.
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./reader'));
  else root.LibraryExport = factory(root.Reader);
})(typeof window !== 'undefined' ? window : globalThis, function(R) {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function selectSections(view, o) {
    const sections = view.sections || [];
    if (!sections.length || !view.loaded.length) throw Error('Kein Text zum Exportieren geöffnet.');
    if (o.scope === 'book') return sections;
    if (o.scope === 'range') {
      const a = String(o.sectionFrom ?? ''), b = String(o.sectionTo ?? '');
      if (!/^\d+$/.test(a) || !/^\d+$/.test(b) || +a > +b || +b >= sections.length) throw Error('Bitte einen gültigen Abschnittsbereich wählen.');
      return sections.slice(+a, +b + 1);
    }
    if (o.scope && o.scope !== 'current') throw Error('Ungültiger Exportbereich.');
    const section = sections[view.idx];
    if (!section) throw Error('Kein Text zum Exportieren geöffnet.');
    return [section];
  }
  function buildHtml(view, o, h) {
    const sections = selectSections(view, o), { t, tr, loc, labels, shortVer, stripHe, noteId } = h;
    const notesById = new Map((h.notes || []).map(n => [n.id, n])), endnotes = [];
    const links = h.links || new Map();
    const cell = (html, d) => {
      if (html == null) return '<td></td>';
      const sp = R.splitFootnotes(d.entry.kind === 'he' ? stripHe(html) : html);
      const main = R.cleanHtml(sp.main).replace(/<sup data-fn="(\d{1,4})">.*?<\/sup>/g, (_m, i) => {
        if (!o.fn || !sp.notes[+i]) return '';
        endnotes.push(R.cleanHtml(sp.notes[+i].html));
        return `<sup>${endnotes.length}</sup>`;
      });
      return `<td dir="${d.entry.kind === 'he' || d.entry.language === 'Aramaic' ? 'rtl' : 'ltr'}" class="k-${esc(d.entry.kind)}">${main}</td>`;
    };
    const head = `<tr><th></th>${view.loaded.map(d => `<th>${esc(tr(labels[d.entry.kind]))} · ${esc(shortVer(d.versionTitle))}</th>`).join('')}</tr>`;
    const chapters = sections.map(s => {
      let rows = R.alignRows(view.loaded.map(d => R.flattenNode(R.getByPath(d.text, s.path))));
      if ((!o.scope || o.scope === 'current') && (o.from || o.to)) {
        const a = o.from ? rows.findIndex(r => r.label === o.from) : 0;
        let b = o.to ? rows.findIndex(r => r.label === o.to) : rows.length - 1;
        if (b < 0) b = rows.length - 1;
        rows = rows.slice(Math.max(0, a), b + 1);
      }
      const body = rows.map(r => {
        let extra = '';
        if (o.notes) { const n = notesById.get(noteId(view.group, s.k, r.label)); if (n && n.note) extra += `<div class="nt">${esc(t('Notiz:'))} ${esc(n.note)}</div>`; }
        if (o.links && /^\d+$/.test(r.label)) {
          const ls = (links.get(s.k) || []).filter(x => x.v1 > 0 && +r.label >= x.v1 && +r.label <= x.v2).map(x => x.other);
          if (ls.length) extra += `<div class="lk">${esc(t('Verknüpfungen:'))} ${esc(ls.slice(0, 30).join('; '))}${ls.length > 30 ? ` … (+${ls.length - 30})` : ''}</div>`;
        }
        return `<tr class="verse" data-verse="${esc(r.label)}"><td class="lab">${esc(r.label)}</td>${r.cells.map((c, i) => cell(c, view.loaded[i])).join('')}</tr>${extra ? `<tr><td></td><td colspan="${view.loaded.length}">${extra}</td></tr>` : ''}`;
      }).join('');
      return `<section class="chapter" data-section="${esc(s.k)}"><h2>${esc(s.label)}</h2><table><colgroup><col class="versecol">${view.loaded.map(() => '<col>').join('')}</colgroup><thead>${head}</thead><tbody>${body}</tbody></table></section>`;
    }).join('');
    const src = view.loaded.map(d => `<li>${esc(tr(labels[d.entry.kind]))}: ${esc(d.versionTitle === 'merged' ? tr('zusammengeführte Fassung') : d.versionTitle)}${d.versionSource ? ' – ' + esc(d.versionSource) : ''}</li>`).join('');
    const css = `body{font-family:"SBL Hebrew","Times New Roman",serif;font-size:11pt;line-height:1.5;color:#000}
h1{font-size:16pt;margin:0 0 8pt}h1 small{font-size:12pt;color:#555}h2{font-size:13pt;margin:14pt 0 4pt;break-after:avoid;page-break-after:avoid}
table{border-collapse:collapse;width:100%;table-layout:fixed}col.versecol{width:28pt}thead{display:table-header-group}th{font-size:9pt;text-align:left;color:#555;border-bottom:1px solid #999;padding:3pt}
td{vertical-align:top;padding:4pt;border-bottom:1px solid #ddd;overflow-wrap:anywhere}td.lab{font-size:8pt;color:#777}
td.k-he{font-size:14pt;line-height:1.8}.nt{background:#fff6d6;padding:2pt 5pt;font-size:9pt}.lk{font-size:8pt;color:#555}
ol.fn{font-size:9pt}ul.src{font-size:8pt;color:#555}tr{break-inside:avoid;page-break-inside:avoid}`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(view.group.title)}</title><style>${css}</style></head><body><h1>${esc(view.group.title)}${view.group.heTitle ? ` <small dir="rtl">${esc(view.group.heTitle)}</small>` : ''}</h1>${chapters}${endnotes.length ? `<h3>${esc(t('Fußnoten'))}</h3><ol class="fn">${endnotes.map(n => `<li>${n}</li>`).join('')}</ol>` : ''}<ul class="src">${src}</ul><p style="font-size:8pt;color:#777">${esc(t('Quelle: Sefaria (sefaria.org), Export vom {}', new Date().toLocaleDateString(loc)))}</p></body></html>`;
  }
  function create({ $, getView, getNotes, stripHe, noteId, labels, shortVer, getLinks }) {
    const scope = () => $('#expScope').value;
    function syncScope() {
      $('#expRows').hidden = scope() !== 'current'; $('#expSections').hidden = scope() !== 'range';
    }
    $('#expScope').onchange = syncScope;
    $('#expBtn').onclick = () => {
      const v = getView(); if (!v || !v.group || !v.loaded.length) return;
      $('#expWhat').textContent = I18N.t('{} · {#} Fassungen nebeneinander', v.group.title, v.loaded.length);
      const options = v.sections.map((s, i) => `<option value="${i}">${esc(s.label)}</option>`).join('');
      $('#expSectionFrom').innerHTML = options; $('#expSectionTo').innerHTML = options;
      $('#expSectionFrom').value = '0'; $('#expSectionTo').value = String(v.sections.length - 1);
      $('#expScope').value = 'current'; syncScope(); $('#expMsg').textContent = ''; $('#expDlg').showModal();
    };
    $('#expClose').onclick = () => $('#expDlg').close();
    $('#expGo').onclick = async () => {
      $('#expGo').disabled = true; $('#expMsg').textContent = I18N.t('Export wird vorbereitet …');
      try {
        const current = getView();
        if (!current || !current.group || !current.loaded || !current.loaded.length) throw Error('Kein Text zum Exportieren geöffnet.');
        const v = { ...current, loaded: current.loaded.slice(), sections: current.sections.slice() };
        const o = { scope: scope(), sectionFrom: $('#expSectionFrom').value, sectionTo: $('#expSectionTo').value,
          from: $('#expFrom').value.trim(), to: $('#expTo').value.trim(), fn: $('#expFn').checked, notes: $('#expNotes').checked, links: $('#expLinks').checked };
        const selected = selectSections(v, o), links = new Map(), notes = getNotes().slice();
        if (o.links) for (const section of selected) links.set(section.k, await getLinks(v, section));
        const html = buildHtml(v, o, { notes, links, stripHe, noteId, labels, shortVer, t: I18N.t, tr: I18N.tr, loc: I18N.loc });
        const suffix = o.scope === 'book' ? I18N.t('Ganzes Buch') : selected.length === 1 ? selected[0].label : selected[0].label + '–' + selected.at(-1).label;
        const name = `${v.group.title} ${suffix}`.replace(/[\\/:*?"<>|]+/g, '_').trim();
        const r = await window.offline.exportSave({ html, format: $('#expFmt').value, name, landscape: v.loaded.length >= 3 });
        if (r && r.error) { $('#expMsg').textContent = '⚠ ' + r.error; return; }
        $('#expMsg').textContent = ''; if (r && r.path) $('#expDlg').close();
      } catch (err) { $('#expMsg').textContent = '⚠ ' + I18N.t(err.message); }
      finally { $('#expGo').disabled = false; }
    };
    return { syncScope };
  }
  return { selectSections, buildHtml, create };
});
