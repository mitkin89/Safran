/* Local research workspace: source snapshots, reusable collections and linked notes. */
window.LibraryResearch = (() => {
  'use strict';
  const A = window.research, copy = x => structuredClone(x), uid = () => crypto.randomUUID();
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const split = x => [...new Set(String(x || '').split(',').map(x => x.trim()).filter(Boolean))];
  function create(host) {
    const root = document.getElementById('researchRoot');
    const editingBlocks = new Set(), expandedBlocks = new Set();
    let messageError = false, editRevision = 0;
    let state = null, projectId = '', kind = 'sheets', draft = null, legacy = false, dirty = false, filter = '', message = '', pending = false;
    const draftKey = 'researchDraft:' + (window.frameElement ? 'pane' : 'main');
    const allNotes = () => [...state.notes, ...state.legacyNotes];
    const currentProject = () => state?.projects.find(p => p.id === projectId);
    const rows = () => kind === 'notes' ? allNotes().filter(n => n.projectId === projectId || !n.projectId) : state[kind].filter(x => x.projectId === projectId);
    function persist() { try { if (dirty && draft) localStorage.setItem(draftKey, JSON.stringify({projectId,kind,draft,legacy})); else localStorage.removeItem(draftKey); return true; } catch { message = 'Entwurf konnte nicht zwischengespeichert werden. Bitte speichern.'; status(message); return false; } }
    function changed() {
      editRevision++;
      dirty = true;
      root.querySelectorAll('[data-a="save"]').forEach(b => b.disabled = false);
      const badge = root.querySelector('#rwSaveState');
      if (badge) { badge.textContent = 'Ungespeichert'; badge.classList.add('is-dirty'); }
      if (persist()) status('Ungespeicherter Entwurf');
    }
    function status(s, error = false) {
      message = s; messageError = error;
      const el = root.querySelector('#rwStatus');
      if (!el) return;
      el.textContent = s.startsWith('Gespeichert: ') ? 'Exportiert: ' + s.split(/[\\/]/).at(-1) : s;
      el.title = s;
      el.hidden = !s || s === 'Ungespeicherter Entwurf' || s === 'Gespeichert.';
      el.classList.toggle('is-error', error);
      el.setAttribute('role', error ? 'alert' : 'status');
    }
    function closeMenus() { root.querySelectorAll('.rw-menu[open]').forEach(d => d.open = false); }
    async function run(fn) {
      if (pending) return;
      pending = true;
      try { await fn(); }
      catch (e) {
        const msg = String(e.message || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, '');
        status(msg, true);
        if (document.documentElement.dataset.tab !== 'research') window.alert(msg);
      } finally { pending = false; }
    }
    function leave() { return !dirty || window.confirm('Ungespeicherten Entwurf verwerfen?'); }
    function field(label, name, value = '', area = false) { return `<label>${esc(label)}${area ? `<textarea data-f="${name}" rows="4">${esc(value)}</textarea>` : `<input data-f="${name}" value="${esc(value)}">`}</label>`; }
    function noteRefs(n) { return n.refs?.length ? n.refs : n.secLabel || n.excerpt ? [{label:[n.title,n.secLabel,n.row].filter(Boolean).join(' · '),quote:n.excerpt||''}] : []; }
    function blank(type, text = '') { return {id:uid(),type,title:'',text,originalText:text,citation:{},reference:null}; }
    async function refresh() {
      state = await A.state();
      if (!state.projects.some(p => p.id === projectId)) projectId = state.projects.find(p => !p.archived)?.id || state.projects[0]?.id || '';
      if (state.recovered) message = 'Recherchedatei aus einer Sicherung geladen. Die beschädigte Datei bleibt erhalten.';
      if (state.legacyError) message = 'Vorhandene Notizen konnten nicht geladen werden: ' + state.legacyError;
    }
    async function open() {
      try {
        await refresh();
        if(draft&&!dirty){const rec=(legacy?state.legacyNotes:state[kind]).find(x=>x.id===draft.id);draft=rec?copy(rec):null;if(draft&&kind==='notes')draft.refs=copy(noteRefs(draft));}
        if (!draft) { try { const saved = JSON.parse(localStorage.getItem(draftKey)); if (saved?.draft && state.projects.some(p => p.id === saved.projectId)) { ({projectId,kind,draft,legacy} = saved); dirty = true; message = 'Ungespeicherten Entwurf wiederhergestellt.'; } } catch {} }
        render();
      } catch (e) { root.innerHTML = `<p role="alert">${esc(e.message)}</p>`; }
    }
    const kindLabel = () => ({ sheets: 'Quellenblätter', collections: 'Sammlungen', notes: 'Notizen' })[kind];
    const newLabel = () => ({ sheets: 'Neues Quellenblatt', collections: 'Neue Sammlung', notes: 'Neue Notiz' })[kind];
    function menu(label, body, name, cls = '') {
      return `<details class="rw-menu ${cls}" data-menu="${name}"><summary${label === '⋯' ? ` aria-label="${name.startsWith('block-') ? 'Abschnittsaktionen' : 'Weitere Aktionen'}"` : ''}>${esc(label)}</summary><div class="rw-menu-body">${body}</div></details>`;
    }
    function pickRecord(rec, type = kind) {
      kind = type; draft = rec ? copy(rec) : null;
      if (draft && kind === 'notes') draft.refs = copy(noteRefs(draft));
      legacy = kind === 'notes' && !!draft && state.legacyNotes.some(x => x.id === draft.id);
      dirty = false; editingBlocks.clear(); expandedBlocks.clear(); persist();
    }
    function itemMeta(x) {
      if (kind === 'notes') return (x.topics?.length ? x.topics : x.tags || []).join(' · ') || (!x.projectId ? 'Ohne Projekt' : 'Notiz');
      const n = (x.blocks || x.items || []).length;
      return n === 1 ? '1 Abschnitt' : n + ' Abschnitte';
    }
    function render() {
      if (!state) return;
      const p = currentProject(), matches = rows().filter(x => JSON.stringify(x).toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
      const projectMenu = `<button data-a="projectNew">Neues Projekt</button>${p ? '<button data-a="projectEdit">Projekt bearbeiten</button>' : ''}<button data-a="import">Projektpaket importieren …</button>${p ? '<div class="rw-menu-divider"></div><button data-export="json">Projekt teilen …</button><div class="rw-menu-caption">Weitere Datenexporte</div><button data-export="csv">Forschungsdaten CSV …</button><button data-export="jsonld">Annotationen JSON-LD …</button>' : ''}`;
      root.innerHTML = `<div class="rw-projectbar"><label for="rwProject">Projekt</label><select id="rwProject"><option value="">Projekt wählen</option>${state.projects.map(x => `<option class="nt" value="${esc(x.id)}" ${x.id === projectId ? 'selected' : ''}>${esc(x.title)}${x.archived ? ' (archiviert)' : ''}</option>`).join('')}</select>${menu('Projekt verwalten', projectMenu, 'project')}<span class="spacer"></span><details class="rw-help"><summary>Hilfe</summary><p>Öffne einen Text im Reiter Lesen und übernimm ihn mit „＋ Quellenblatt“. Eigene Texte und Notizen kannst du hier hinzufügen.</p><p>Über „Projekt verwalten“ kannst du das gesamte Projekt als Datei teilen oder importieren.</p></details></div>
      <p id="rwStatus" class="rw-status" role="status" aria-live="polite" hidden></p>
      ${p ? `<div class="rw-kinds" aria-label="Projektinhalte">${[['sheets', 'Quellenblätter'], ['collections', 'Sammlungen'], ['notes', 'Notizen']].map(([k, t]) => `<button data-kind="${k}" aria-pressed="${kind === k}">${t}<span class="rw-count">${k === 'notes' ? allNotes().filter(n => n.projectId === projectId || !n.projectId).length : state[k].filter(x => x.projectId === projectId).length}</span></button>`).join('')}</div>
      <div class="rw-layout"><aside class="rw-sidebar"><div class="rw-sidebar-head"><h2>${kindLabel()}</h2><span class="muted">${matches.length}</span></div><label class="rw-search"><span class="rw-sr">Nach Text, Quelle, Thema oder Schlagwort filtern</span><input id="rwFilter" value="${esc(filter)}" type="search" placeholder="Suchen …"></label><button class="rw-new" data-a="new"><span aria-hidden="true">＋</span> <span>${newLabel()}</span></button><div id="rwList">${matches.map(x => `<button data-edit="${esc(x.id)}" class="rw-listitem ${draft?.id === x.id ? 'active' : ''}" ${draft?.id === x.id ? 'aria-current="true"' : ''}><b class="nt">${esc(x.title || 'Notiz')}</b><small class="${kind === 'notes' && (x.topics?.length || x.tags?.length) ? 'nt' : ''}">${esc(itemMeta(x))}</small></button>`).join('') || `<p class="rw-list-empty">${filter ? 'Keine passenden Einträge.' : 'Noch keine Einträge.'}</p>`}</div></aside><div id="rwEditor">${draft ? editor() : `<div class="rw-empty"><span class="rw-empty-icon" aria-hidden="true">▤</span><h2>${rows().length ? 'Eintrag auswählen' : kind === 'sheets' ? 'Dein erstes Quellenblatt' : kind === 'collections' ? 'Quellen für deine Recherche sammeln' : 'Gedanken und Belege festhalten'}</h2><p>${kind === 'sheets' ? 'Verbinde Textstellen, Kommentare und eigene Gedanken zu einem Arbeitsblatt.' : kind === 'collections' ? 'Bewahre Fundstellen und Suchtreffer zusammen auf und verwende sie in deinen Quellenblättern.' : 'Verknüpfe eine Notiz mit mehreren Textstellen und ordne sie nach Themen.'}</p><button class="primary" data-a="new">${newLabel()}</button></div>`}</div></div>` : '<div class="rw-empty rw-welcome"><span class="rw-empty-icon" aria-hidden="true">▤</span><h1>Platz für deine Recherche</h1><p>Lege ein Projekt an und sammle darin Quellen, Arbeitsblätter und Notizen.</p><button class="primary" data-a="projectNew">Erstes Projekt anlegen</button><button class="rw-quiet" data-a="import">Vorhandenes Projekt importieren …</button></div>'}`;
      status(message, messageError);
      root.querySelector('#rwProject').onchange = e => {
        if (!leave()) return render();
        projectId = e.target.value; pickRecord(rows()[0]); render();
      };
      const f = root.querySelector('#rwFilter');
      if (f) f.oninput = e => { filter = e.target.value; const pos = e.target.selectionStart; render(); const n = root.querySelector('#rwFilter'); n.focus(); n.setSelectionRange(pos, pos); };
      root.querySelectorAll('[data-kind]').forEach(el => el.onclick = () => { if (!leave()) return; kind = el.dataset.kind; filter = ''; pickRecord(rows()[0]); render(); });
      root.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => { if (!leave()) return; pickRecord(rows().find(x => x.id === el.dataset.edit)); render(); });
      root.querySelectorAll('[data-a]').forEach(el => el.onclick = () => { closeMenus(); void run(() => action(el.dataset.a)); });
      root.querySelectorAll('[data-export]').forEach(el => el.onclick = () => { closeMenus(); void run(() => exportRecord(el.dataset.export, 'project')); });
      root.querySelectorAll('.rw-menu').forEach(d => d.addEventListener('toggle', () => { if (d.open) root.querySelectorAll('.rw-menu[open]').forEach(other => { if (other !== d) other.open = false; }); }));
      if (draft) bindEditor();
    }
    function editor() {
      const blocks = draft[kind === 'sheets' ? 'blocks' : 'items'] || [];
      let body = `<label class="rw-title"><span class="rw-sr">Titel</span><input data-f="title" value="${esc(draft.title)}" placeholder="Titel eingeben"></label>`;
      if (kind === 'notes') body += field('Notiz', 'note', draft.note, true);
      body += `<details class="rw-document-meta"><summary>${kind === 'notes' ? 'Themen und Schlagwörter' : 'Beschreibung und Schlagwörter'}</summary>${kind === 'notes' ? field('Themen (Komma getrennt)', 'topics', (draft.topics || []).join(', ')) : field('Beschreibung', 'description', draft.description, true)}${field('Schlagwörter (Komma getrennt)', 'tags', (draft.tags || []).join(', '))}${kind === 'notes' ? `<label>Projekt<select id="rwNoteProject">${legacy ? '<option value="">Ohne Projekt</option>' : ''}${state.projects.map(p => `<option class="nt" value="${esc(p.id)}" ${draft.projectId === p.id ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select></label>` : ''}</details>`;
      if (kind === 'notes') {
        body += `<section class="rw-note-refs"><h3>Verknüpfte Textstellen <span class="rw-count">${draft.refs?.length || 0}</span></h3>${(draft.refs || []).map((r, i) => `<div class="rw-reference"><div><button class="rw-ref-link nt" data-open-ref="${i}">${esc(r.label)}</button><small class="nt">${esc(r.citation?.edition || '')}</small></div><button data-remove-ref="${i}" title="Fundstelle entfernen" aria-label="Fundstelle entfernen">✕</button></div>`).join('') || '<p class="muted">Welche Textstellen gehören zu dieser Notiz?</p>'}<div class="rw-toolbar"><button data-a="reference">Quelle verknüpfen</button><button class="rw-quiet" data-a="manualRef">Weitere Fundstelle …</button></div></section>`;
      } else {
        body += `<div id="rwBlocks">${blocks.map((b, i) => blockEditor(b, i)).join('') || '<div class="rw-sheet-empty"><h3>Womit möchtest du beginnen?</h3><p>Übernimm eine Stelle aus deinem geöffneten Lesetext oder schreibe einen eigenen Gedanken auf.</p><div class="rw-toolbar"><button data-a="addSource">Quelle aus Lesetext</button><button data-a="addText">Eigenen Text schreiben</button></div></div>'}</div>`;
        const add = '<button data-a="addSource">Quelle aus Lesetext</button><button data-a="addText">Eigener Text</button><button data-a="addHeading">Überschrift</button><button data-a="addNote">Notiz verknüpfen</button>' + (kind === 'sheets' ? '<button data-a="fromCollection">Aus Sammlung übernehmen</button>' : '');
        body += `<div class="rw-add-row">${menu('＋ Hinzufügen', add, 'add', 'rw-menu-start')}</div>`;
      }
      const exports = kind === 'sheets' ? menu('Exportieren', ['pdf', 'docx', 'html'].map((f, i) => `<button data-sheet-export="${f}">${['PDF', 'Word (.docx)', 'HTML'][i]} exportieren …</button>`).join(''), 'sheet-export') : '';
      return `<div class="rw-editorbar"><span id="rwSaveState" class="rw-save-state ${dirty ? 'is-dirty' : ''}">${dirty ? 'Ungespeichert' : 'Gespeichert'}</span><span class="spacer"></span>${exports}<button data-a="save" class="primary" ${!dirty ? 'disabled' : ''} title="Speichern (⌘/Strg+S)">Speichern</button>${menu('⋯', '<button data-a="reload">Neu laden / Entwurf verwerfen</button><div class="rw-menu-divider"></div><button class="rw-danger" data-a="delete">Entfernen</button>', 'entry', 'rw-entry-menu')}</div><div class="rw-editorfields">${body}</div>`;
    }
    function blockEditor(b, i) {
      const n = b.type === 'note' ? allNotes().find(n => n.id === b.noteId) || b.noteSnapshot : null;
      const text = n?.note ?? b.text, title = n?.title || b.title;
      const editing = editingBlocks.has(b.id), expanded = expandedBlocks.has(b.id), long = text.length > 750 || text.split('\n').length > 8;
      const type = {source: 'Quelle', text: 'Eigener Text', heading: 'Überschrift', note: 'Notiz'}[b.type];
      const blockTitle = b.type === 'source' ? [title || b.citation?.work, b.citation?.locator].filter(Boolean).join(' · ') : title || type;
      const controls = `<button data-move="-1" ${!i ? 'disabled' : ''}>↑ Nach oben</button><button data-move="1" ${i === (draft[kind === 'sheets' ? 'blocks' : 'items'].length - 1) ? 'disabled' : ''}>↓ Nach unten</button><div class="rw-menu-divider"></div><button class="rw-danger" data-drop="1">Entfernen</button>`;
      const content = editing && !n ? `<div class="rw-block-fields">${b.type !== 'heading' ? field('Überschrift (optional)', 'title', b.title) : ''}${field(b.type === 'source' ? 'Quellenauszug' : b.type === 'heading' ? 'Überschrift' : 'Text', 'text', b.text, true)}${b.type === 'source' ? '<p class="rw-field-hint">Änderungen am Wortlaut werden im Export als bearbeiteter Auszug gekennzeichnet.</p>' : ''}</div>` : `<div class="rw-block-preview ${long && !expanded ? 'is-collapsed' : ''} ${b.type === 'source' ? 'rw-quote' : ''}"><p class="rw-pre nt" dir="auto">${esc(text) || '<span class="rw-placeholder">Noch kein Text.</span>'}</p></div>${long && !editing ? `<button class="rw-expand" data-expand="1" aria-expanded="${expanded}">${expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}</button>` : ''}`;
      return `<article class="rw-block ${b.type}" data-block="${i}"><div class="rw-block-head"><span class="rw-block-number">${i + 1}</span><h3 class="${title || b.type === 'source' ? 'nt' : ''}">${esc(blockTitle)}</h3><div class="rw-block-actions">${!n ? `<button data-block-edit="1" aria-expanded="${editing}">${editing ? 'Fertig' : 'Bearbeiten'}</button>` : ''}${menu('⋯', controls, 'block-' + i)}</div></div>${b.type === 'source' && b.citation?.edition ? `<div class="rw-edition nt" title="${esc(b.citation.edition)}">${esc(b.citation.edition)}</div>` : ''}${content}${b.type === 'source' && b.text !== b.originalText ? '<span class="rw-edited">Bearbeiteter Auszug</span>' : ''}${n ? '<small class="rw-field-hint">Verknüpfte Notiz · aktueller Stand</small>' : ''}
      ${b.type === 'source' ? `<div class="rw-source-footer">${b.reference ? '<button class="rw-quiet" data-source-open="1">Im Lesetext öffnen ↗</button>' : ''}<details class="rw-citation"><summary>Quellenangabe</summary><div><p class="rw-field-hint">Ergänze hier fehlende Angaben zur verwendeten Ausgabe.</p>${[['work','Werk'],['edition','Edition'],['translator','Übersetzer'],['editor','Herausgeber'],['publisher','Verlag / Ort'],['year','Jahr'],['locator','Fundstelle'],['url','Quellen-URL']].map(([k,t]) => field(t, 'cite.' + k, b.citation?.[k])).join('')}<details class="rw-provenance"><summary>Übernahmeinformationen</summary><small class="nt">${esc(b.capturedAt)}<br>SHA256: ${esc(b.sourceHash)}</small></details></div></details></div>` : ''}
      ${b.search ? `<details class="rw-search-info"><summary>Aus Suchtreffern übernommen</summary><p class="nt">${esc(b.search.query)}</p><p class="rw-field-hint">Gespeicherter Ausschnitt der Trefferliste · ${esc(b.search.capturedAt)}</p></details>` : ''}</article>`;
    }
    function bindEditor() {
      root.querySelectorAll('#rwEditor > .rw-editorfields > label [data-f], #rwEditor .rw-document-meta [data-f]').forEach(el => el.oninput = () => { draft[el.dataset.f] = ['tags','topics'].includes(el.dataset.f) ? split(el.value) : el.value; changed(); });
      const np = root.querySelector('#rwNoteProject'); if (np) np.onchange = () => { draft.projectId = np.value; changed(); };
      root.querySelectorAll('[data-block]').forEach(article => {
        const i = +article.dataset.block, blocks = draft[kind === 'sheets' ? 'blocks' : 'items'], b = blocks[i];
        article.querySelectorAll('[data-f]').forEach(el => el.oninput = () => { if (el.dataset.f.startsWith('cite.')) { b.citation ||= {}; b.citation[el.dataset.f.slice(5)] = el.value; } else b[el.dataset.f] = el.value; changed(); });
        const edit = article.querySelector('[data-block-edit]');
        if (edit) edit.onclick = () => { editingBlocks.has(b.id) ? editingBlocks.delete(b.id) : editingBlocks.add(b.id); render(); const target = root.querySelector(`[data-block="${i}"] ${editingBlocks.has(b.id) ? 'textarea' : '[data-block-edit]'}`); target?.focus({preventScroll:true}); };
        const expand = article.querySelector('[data-expand]'); if (expand) expand.onclick = () => { expandedBlocks.has(b.id) ? expandedBlocks.delete(b.id) : expandedBlocks.add(b.id); render(); root.querySelector(`[data-block="${i}"] [data-expand]`)?.focus({preventScroll:true}); };
        article.querySelectorAll('[data-move]').forEach(el => el.onclick = () => { const j = i + Number(el.dataset.move); if (j < 0 || j >= blocks.length) return; [blocks[i],blocks[j]] = [blocks[j],blocks[i]]; changed(); render(); root.querySelector(`[data-block="${j}"] .rw-menu summary`)?.focus({preventScroll:true}); });
        article.querySelector('[data-drop]').onclick = () => { blocks.splice(i,1); editingBlocks.delete(b.id); changed(); render(); };
        const open = article.querySelector('[data-source-open]'); if (open) open.onclick = () => run(() => host.openRef(b.reference));
      });
      root.querySelectorAll('[data-open-ref]').forEach(el => el.onclick = () => run(() => host.openRef(draft.refs[+el.dataset.openRef])));
      root.querySelectorAll('[data-remove-ref]').forEach(el => el.onclick = () => { draft.refs.splice(+el.dataset.removeRef,1); changed(); render(); });
      root.querySelectorAll('[data-sheet-export]').forEach(el => el.onclick = () => { closeMenus(); void run(() => exportRecord(el.dataset.sheetExport, 'sheet')); });
    }
    async function exportRecord(format, scope) {
      const target = {kind:scope, id:scope === 'sheet' ? draft.id : undefined, projectId, format};
      // Export the current draft after a successful save; a revision conflict stops export.
      if (dirty) await action('save');
      if (dirty) throw Error('Während des Speicherns kamen weitere Änderungen hinzu. Bitte den Export erneut starten.');
      const r = await A.export(target);
      status(r.cancelled ? 'Export abgebrochen.' : 'Gespeichert: ' + r.path);
    }
    async function modal(title, content, accept='Übernehmen', setup=()=>{}) {
      const dlg=document.createElement('dialog');dlg.className='rw-dialog';dlg.innerHTML=`<form><h2>${esc(title)}</h2>${content}<p class="rw-error" role="alert"></p><div class="rw-toolbar"><button type="submit" class="primary">${esc(accept)}</button><button type="button" data-cancel>Abbrechen</button></div></form>`;document.body.append(dlg);setup(dlg);const required=dlg.querySelector('[data-f="title"], [data-f="label"]');if(required)required.required=true;
      return new Promise(resolve=>{dlg.querySelector('[data-cancel]').onclick=()=>dlg.close();dlg.oncancel=()=>{};dlg.onclose=()=>{dlg.remove();resolve(null);};dlg.querySelector('form').onsubmit=e=>{e.preventDefault();resolve(dlg);};dlg.showModal();});
    }
    function closeModal(dlg){dlg.close();dlg.remove();}
    async function choose(title,items,label=x=>x.title) {
      if(!items.length)throw Error('Noch keine passenden Einträge vorhanden.');
      const d=await modal(title,`<label>Eintrag<select id="rwChoice">${items.map((x,i)=>`<option class="nt" value="${i}">${esc(label(x))}</option>`).join('')}</select></label>`);if(!d)return null;const item=items[+d.querySelector('select').value];closeModal(d);return item;
    }
    function projectSources(){return [...state.sheets.filter(s=>s.projectId===projectId).flatMap(s=>s.blocks),...state.collections.filter(c=>c.projectId===projectId).flatMap(c=>c.items)].filter(b=>b.reference);}
    async function action(a) {
      if(a==='projectNew'||a==='projectEdit') {
        if(!leave())return;const old=a==='projectEdit'?currentProject():null;
        const d=await modal(old?'Projekt bearbeiten':'Neues Rechercheprojekt',field('Titel','title',old?.title)+field('Beschreibung','description',old?.description,true)+field('Schlagwörter (Komma getrennt)','tags',old?.tags?.join(', '))+(old?`<label><input type="checkbox" id="rwArchived" ${old.archived?'checked':''}> Archiviert</label>`:''),'Speichern');if(!d)return;
        const val=k=>d.querySelector(`[data-f="${k}"]`).value,rec={...old,id:old?.id||uid(),title:val('title'),description:val('description'),tags:split(val('tags')),archived:!!d.querySelector('#rwArchived')?.checked};
        if(!rec.title.trim()){d.querySelector('.rw-error').textContent='Bitte einen Titel eingeben.';throw Error('Projekt braucht einen Titel.');}
        closeModal(d);state=await A.put('projects',rec,old?.version||0);projectId=rec.id;draft=null;dirty=false;persist();render();return;
      }
      if(a==='import'){if(!leave())return;const r=await A.import();if(r.cancelled)return;state=r.state;projectId=state.projects.at(-1)?.id||projectId;draft=null;dirty=false;persist();message='Projekt als neue Kopie importiert.';render();return;}
      if(a==='new'){if(!leave())return;editingBlocks.clear();expandedBlocks.clear();draft={id:uid(),projectId,title:kind==='sheets'?'Neues Quellenblatt':kind==='collections'?'Neue Sammlung':'Neue Notiz',description:'',tags:[],topics:[],refs:[],note:'',blocks:[],items:[],version:0};legacy=false;dirty=true;persist();render();return;}
      if(a==='save'){
        const outgoing = copy(draft), savedKind = kind, wasLegacy = legacy, revision = editRevision;
        if(wasLegacy){ state = await A.legacyNote(outgoing,outgoing.ts||0); await host.notesChanged(); }
        else state = await A.put(savedKind,outgoing,outgoing.version||0);
        messageError = false;
        const saved = (wasLegacy ? state.legacyNotes : state[savedKind]).find(x => x.id === outgoing.id);
        if(draft?.id === outgoing.id && kind === savedKind && legacy === wasLegacy){
          if(editRevision === revision){ draft=copy(saved);dirty=false;editingBlocks.clear();message='Gespeichert.'; }
          else {
            // A slow save must never overwrite text typed or reordered while it was in flight.
            draft.version=saved.version;draft.ts=saved.ts;dirty=true;
            message='Weitere Änderungen noch nicht gespeichert.';
          }
          persist();
        }
        const active = root.contains(document.activeElement) ? document.activeElement : null;
        const f = active?.dataset.f, index = active?.closest('[data-block]')?.dataset.block;
        const selection = f ? [active.selectionStart,active.selectionEnd] : null;
        render();
        if(f){
          const scope = index == null ? root.querySelector('.rw-editorfields') : root.querySelector(`[data-block="${index}"]`);
          const el = scope?.querySelector(`[data-f="${CSS.escape(f)}"]`);
          if(el){let p=el.parentElement;while(p&&p!==root){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}el.focus({preventScroll:true});if(selection&&typeof el.setSelectionRange==='function')el.setSelectionRange(...selection);}
        }
        return;
      }
      if(a==='reload'){if(!leave())return;const id=draft?.id;await refresh();draft=copy((legacy?state.legacyNotes:state[kind]).find(x=>x.id===id)||null);dirty=false;persist();messageError=false;message='Aktueller Stand geladen.';render();return;}
      if(a==='delete'){
        if(legacy)throw Error('Vorhandene Bibliotheksnotizen bitte im Reiter „Notizen“ entfernen.');
        if(!window.confirm('Diesen Eintrag entfernen? Verknüpfte Notizen im Quellenblatt behalten ihre beim Einfügen übernommene Kopie.'))return;
        if(draft.version)state=await A.remove(kind,draft.id,draft.version);draft=null;dirty=false;persist();render();return;
      }
      if(!draft)throw Error('Bitte zuerst einen Eintrag öffnen.');
      const blocks=draft[kind==='sheets'?'blocks':'items'];
      if(a==='addText'||a==='addHeading'){const b=blank(a==='addText'?'text':'heading');blocks.push(b);editingBlocks.add(b.id);changed();render();root.querySelector(`[data-block="${blocks.length-1}"] textarea`)?.focus();}
      if(a==='addSource')await captureDialog();
      if(a==='addNote'){
        const n=await choose('Notiz verknüpfen',allNotes().filter(n=>n.projectId===projectId||!n.projectId));if(!n)return;
        blocks.push({...blank('note'),noteId:n.id,noteSnapshot:{...copy(n),refs:noteRefs(n),projectId},title:n.title||'Notiz',text:n.note||''});changed();render();
      }
      if(a==='fromCollection'){
        const c=await choose('Sammlung wählen',state.collections.filter(c=>c.projectId===projectId));if(!c)return;
        const b=await choose('Baustein übernehmen',c.items,x=>x.title+' · '+(x.citation?.locator||x.text.slice(0,70)));if(!b)return;blocks.push({...copy(b),id:uid()});changed();render();
      }
      if(a==='reference'){
        const b=await choose('Quelle verknüpfen',projectSources(),x=>x.reference.label+' · '+(x.citation?.edition||''));if(!b)return;draft.refs ||= [];draft.refs.push(copy(b.reference));changed();render();
      }
      if(a==='manualRef'){
        const d=await modal('Weitere Fundstelle',field('Fundstelle (z. B. Genesis 1:1)','label')+field('Edition','edition'));if(!d)return;
        const label=d.querySelector('[data-f="label"]').value.trim(),edition=d.querySelector('[data-f="edition"]').value;closeModal(d);if(!label)return;draft.refs||=[];draft.refs.push({label,citation:{edition}});changed();render();
      }
    }
    async function ensureProject(){await refresh();if(!projectId){host.showTab('research');await action('projectNew');}if(!projectId)throw Error('Bitte ein Projekt anlegen.');}
    async function acceptSources(items,toCollection=false){
      await ensureProject();
      if(draft&&kind===(toCollection?'collections':'sheets')&&draft.projectId===projectId){draft[toCollection?'items':'blocks'].push(...items);changed();host.showTab('research');render();return;}
      if(!leave())return;
      const k=toCollection?'collections':'sheets',options=state[k].filter(x=>x.projectId===projectId);
      const d=await modal(toCollection?'Suchtreffer sammeln':'In Quellenblatt übernehmen',`<label>Ziel<select id="rwTarget"><option value="">Neuer Eintrag</option>${options.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('')}</select></label>`+field('Titel für neuen Eintrag','title',toCollection?'Gesicherte Suchtreffer':'Neues Quellenblatt'));if(!d)return;
      const existing=options.find(x=>x.id===d.querySelector('#rwTarget').value),title=d.querySelector('[data-f="title"]').value;closeModal(d);
      kind=k;draft=existing?copy(existing):{id:uid(),projectId,title,description:'',tags:[],version:0,[toCollection?'items':'blocks']:[]};draft[toCollection?'items':'blocks'].push(...items);legacy=false;dirty=true;persist();message='Übernommen. Bitte den Entwurf speichern.';host.showTab('research');render();
    }
    async function captureDialog(){
      const v=host.getView(),loaded=v?.loaded||[],sec=v?.sections?.[v.idx];
      if(!loaded.length||!sec)throw Error('Bitte zuerst einen Text im Lesefenster öffnen.');
      const opts=loaded.map(d=>({rel:d.entry.rel,title:d.entry.title+' · '+(d.entry.versionTitle||d.versionTitle||d.entry.language)}));
      // Select an edition explicitly; never use a preview's unrelated fallback version.
      const d=await modal('Quelle aus Bibliothek übernehmen',`<label>Edition<select id="rwCaptureEdition">${opts.map(x=>`<option class="nt" value="${esc(x.rel)}">${esc(x.title)}</option>`).join('')}</select></label><label>Abschnitt<select id="rwCaptureSection"></select></label>`+field('Zeilen / Verse (leer = ganzer Abschnitt; z. B. 1–3, 7)','labels',[...(v.vf?.set||[])].join(', ')||host.getRow()||'')+'<p class="muted">Der Wortlaut wird als Quellenkopie mit Edition und Fundstelle gespeichert. Fußnoten werden hier nicht übernommen.</p>','Übernehmen',dlg=>{
        const ed=dlg.querySelector('#rwCaptureEdition'),ss=dlg.querySelector('#rwCaptureSection');
        let generation=0;
        const load=async()=>{const g=++generation;ss.disabled=true;dlg.querySelector('[type="submit"]').disabled=true;try{const data=await A.sections(ed.value);if(g!==generation)return;ss.innerHTML=data.sections.map(s=>`<option value="${esc(JSON.stringify(s.path))}" ${JSON.stringify(s.path)===JSON.stringify(sec.path)?'selected':''}>${esc(s.label)}</option>`).join('');ss.disabled=false;dlg.querySelector('[type="submit"]').disabled=!data.sections.length;}catch(e){dlg.querySelector('.rw-error').textContent=e.message;}};ed.onchange=load;void load();
      });if(!d)return;
      const req={rel:d.querySelector('#rwCaptureEdition').value,sectionPath:JSON.parse(d.querySelector('#rwCaptureSection').value),labels:d.querySelector('[data-f="labels"]').value};closeModal(d);
      const b=await A.capture(req);if(draft&&['sheets','collections'].includes(kind)){draft[kind==='sheets'?'blocks':'items'].push(b);changed();host.showTab('research');render();}else await acceptSources([b]);
    }
    document.addEventListener('click', e => { if (!e.target.closest('.rw-menu')) closeMenus(); });
    document.addEventListener('keydown', e => {
      if (document.documentElement.dataset.tab !== 'research' || document.querySelector('dialog[open]')) return;
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 's' && draft) {
        e.preventDefault(); if (dirty) void run(() => action('save'));
      } else if (e.key === 'Escape') {
        const open = root.querySelector('.rw-menu[open]');
        if (open) { e.preventDefault(); closeMenus(); open.querySelector('summary')?.focus(); }
      }
    });
    document.getElementById('rResearchBtn').onclick=()=>run(captureDialog);
    document.addEventListener('click',e=>{const b=e.target.closest('.cmtResearch');if(!b)return;e.preventDefault();e.stopPropagation();void run(async()=>{const source=await A.captureCommentary({ref:b.dataset.ref,rel:b.dataset.rel});await acceptSources([source]);});});
    document.getElementById('sResearchBtn').onclick=()=>run(async()=>{
      const s=host.getSearch();if(!s.hits?.length)throw Error('Bitte zuerst eine Textsuche mit Fundstellen ausführen.');
      // Save only the explicitly available result subset; no claim that pagination is complete.
      const d=await modal('Suchergebnisse sichern',`<p>${s.hits.length} verfügbare Treffer werden mit Edition, Fundstelle und Suchanfrage gespeichert (höchstens 200). Weitere Treffer und Parallelfassungen sind nicht automatisch enthalten.</p>`);if(!d)return;closeModal(d);
      const items=await A.captureHits({hits:s.hits.map(h=>({rel:h.rel,path:h.path})),query:s.params?.q||s.params?.query||'',complete:false});await acceptSources(items,true);
    });
    A.onChanged(()=>{if(document.documentElement.dataset.tab==='research'){if(dirty)status('Es gibt einen neueren Speicherstand. Dein Entwurf bleibt erhalten; Speichern prüft auf Konflikte.');else void open();}});
    window.addEventListener('focus',()=>{if(document.documentElement.dataset.tab==='research'&&!dirty)void open();});
    return {open,captureDialog};
  }
  return {create};
})();
