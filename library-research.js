/* Local research workspace: source snapshots, reusable collections and linked notes. */
window.LibraryResearch = (() => {
  'use strict';
  const A = window.research, copy = x => structuredClone(x), uid = () => crypto.randomUUID();
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const split = x => [...new Set(String(x || '').split(',').map(x => x.trim()).filter(Boolean))];
  function create(host) {
    const root = document.getElementById('researchRoot');
    const editingBlocks = new Set(), expandedBlocks = new Set();
    let messageError = false, editRevision = 0, sourceRequestId = 0, pagePreview = false, arrangeMode = false;
    const lastSheetKey='researchLastSheet', lastEditionKey='researchLastEdition';
    function rememberSheet(){if(kind==='sheets'&&draft)try{localStorage.setItem(lastSheetKey,JSON.stringify({id:draft.id,projectId:draft.projectId}));}catch{}}
    function editionPreference(editions){let last;try{last=JSON.parse(localStorage.getItem(lastEditionKey));}catch{}return editions.find(e=>e.rel===last?.rel)||editions.find(e=>e.versionTitle===last?.versionTitle)||editions.find(e=>e.language==='German')||editions[0];}
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
      dirty = false; editingBlocks.clear(); expandedBlocks.clear(); persist(); rememberSheet();
    }
    function itemMeta(x) {
      if (kind === 'notes') return (x.topics?.length ? x.topics : x.tags || []).join(' · ') || (!x.projectId ? 'Ohne Projekt' : 'Notiz');
      const n = (x.blocks || x.items || []).length;
      return n === 1 ? '1 Abschnitt' : n + ' Abschnitte';
    }
    function render() {
      if (!state) return;
      root.classList.toggle('rw-page-preview',(pagePreview||arrangeMode)&&kind==='sheets');
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
        const add=`<div class="rw-composebar" aria-label="Inhalte hinzufügen"><span>Hinzufügen:</span><button data-a="addSource">＋ Quelle</button><button data-a="addText">Eigener Text</button><button data-a="addHeading">Überschrift</button><button data-a="addNote">Notiz verknüpfen</button>${kind==='sheets'?'<button data-a="fromCollection">Aus Sammlung</button>':''}</div>`;
        body += add;
        if(kind==='sheets'&&draft.layout?.template==='classic')body+='<p class="rw-field-hint">Wähle den Bereich direkt auf jeder Karte. In „Anordnen“ kannst du Texte mit der Maus verschieben.</p>';
        body += `<div id="rwBlocks">${blocks.map((b,i)=>blockEditor(b,i)).join('')||'<div class="rw-sheet-empty"><h3>Womit möchtest du beginnen?</h3><p>Über die Leiste oben kannst du eine Quelle, eigenen Text oder eine Notiz hinzufügen.</p></div>'}</div>`;
        if(blocks.length)body+=add;

      }
      const layout=draft.layout||{template:'linear',orientation:'portrait',mainWidth:44,mainSize:18,sideSize:10,bottomSize:10};
      const layouts=kind==='sheets'?menu('Layout',`<label><input type="checkbox" data-layout="showTitle" ${layout.showTitle!==false?'checked':''}> Blatttitel anzeigen</label><label>Anordnung<select data-layout="template"><option value="linear" ${layout.template!=='classic'?'selected':''}>Untereinander</option><option value="classic" ${layout.template==='classic'?'selected':''}>Haupttext mit Randkommentaren</option></select></label><label>Seite<select data-layout="orientation"><option value="portrait" ${layout.orientation!=='landscape'?'selected':''}>A4 Hochformat</option><option value="landscape" ${layout.orientation==='landscape'?'selected':''}>A4 Querformat</option></select></label>${layout.template==='classic'?'<p class="rw-field-hint">Wähle den Bereich direkt auf der Karte oder ziehe Texte in „Anordnen“.</p>'+[['mainWidth','Breite des Haupttexts (%)',30,60,44],['mainSize','Haupttext (pt)',10,30,18],['sideSize','Randkommentare (pt)',8,20,10],['bottomSize','Unterer Bereich (pt)',8,20,10]].map(([k,t,min,max,def])=>`<label>${t}<input type="number" data-layout="${k}" min="${min}" max="${max}" value="${layout[k]??def}"></label>`).join(''):''}`,'layout'):'';
      if(arrangeMode&&kind==='sheets')body=arrangement(blocks);
      if(pagePreview&&kind==='sheets')body='<div class="rw-page-hint">Die Vorschau zeigt die Anordnung mit den aktuellen, auch ungespeicherten Inhalten.</div><iframe id="rwPagePreview" title="Seitenvorschau" sandbox="allow-same-origin"></iframe>';
      const exports = kind === 'sheets' ? menu('Exportieren', ['pdf', 'docx', 'html'].map((f, i) => `<button data-sheet-export="${f}">${['PDF', 'Word (.docx)', 'HTML'][i]} exportieren …</button>`).join(''), 'sheet-export') : '';
      return `<div class="rw-editorbar"><span id="rwSaveState" class="rw-save-state ${dirty ? 'is-dirty' : ''}">${dirty ? 'Ungespeichert' : 'Gespeichert'}</span><span class="spacer"></span>${layouts}${kind==='sheets'?`<button data-a="arrange" aria-pressed="${arrangeMode}">${arrangeMode?'Zurück zum Text':'Anordnen'}</button>`:''}${kind==='sheets'?`<button data-a="pagePreview" aria-pressed="${pagePreview}">${pagePreview?'Bearbeiten':'Vorschau'}</button>`:''}${exports}<button data-a="save" class="primary" ${!dirty ? 'disabled' : ''} title="Speichern (⌘/Strg+S)">Speichern</button>${menu('⋯', '<button data-a="reload">Neu laden / Entwurf verwerfen</button><div class="rw-menu-divider"></div><button class="rw-danger" data-a="delete">Entfernen</button>', 'entry', 'rw-entry-menu')}</div><div class="rw-editorfields">${body}</div>`;
    }
    function blockEditor(b, i) {
      const n = b.type === 'note' ? allNotes().find(n => n.id === b.noteId) || b.noteSnapshot : null;
      const text = n?.note ?? b.text, title = n?.title || b.title;
      const editing = editingBlocks.has(b.id), expanded = expandedBlocks.has(b.id), long = text.length > 750 || text.split('\n').length > 8;
      const type = {source: 'Quelle', text: 'Eigener Text', heading: 'Überschrift', note: 'Notiz'}[b.type];
      const blockTitle = b.type === 'source' ? [title || b.citation?.work, b.citation?.locator].filter(Boolean).join(' · ') : title || type;
      const regions=[['main','Haupttext'],['left','Linker Rand'],['right','Rechter Rand'],['bottom','Unten']];
      const placement=kind==='sheets'&&draft.layout?.template==='classic'?`<label class="rw-placement">Bereich im Layout<select data-region>${regions.map(([k,t])=>`<option value="${k}" ${(b.region||'main')===k?'selected':''}>${t}</option>`).join('')}</select></label>`:'';
      const move=`<div class="rw-reorder" aria-label="Reihenfolge"><button data-move="-1" ${!i?'disabled':''} title="Nach oben" aria-label="Nach oben">↑</button><button data-move="1" ${i===(draft[kind==='sheets'?'blocks':'items'].length-1)?'disabled':''} title="Nach unten" aria-label="Nach unten">↓</button></div>`;
      const controls='<button class="rw-danger" data-drop="1">Entfernen</button>';

      const content = editing && !n ? `<div class="rw-block-fields">${b.type !== 'heading' ? field('Überschrift (optional)', 'title', b.title) : ''}${field(b.type === 'source' ? 'Quellenauszug' : b.type === 'heading' ? 'Überschrift' : 'Text', 'text', b.text, true)}${b.type === 'source' ? '<p class="rw-field-hint">Änderungen am Wortlaut werden im Export als bearbeiteter Auszug gekennzeichnet.</p>' : ''}</div>` : `<div class="rw-block-preview ${long && !expanded ? 'is-collapsed' : ''} ${b.type === 'source' ? 'rw-quote' : ''}"><p class="rw-pre nt" dir="auto">${esc(text) || '<span class="rw-placeholder">Noch kein Text.</span>'}</p></div>${long && !editing ? `<button class="rw-expand" data-expand="1" aria-expanded="${expanded}">${expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}</button>` : ''}`;
      return `<article class="rw-block ${b.type}" data-block="${i}"><div class="rw-block-head"><button class="rw-drag" draggable="true" data-drag-id="${esc(b.id)}" title="Zum Anordnen ziehen" aria-label="Abschnitt ziehen">⠿</button><span class="rw-block-number">${i + 1}</span><h3 class="${title || b.type === 'source' ? 'nt' : ''}">${esc(blockTitle)}</h3><div class="rw-block-actions">${!n ? `<button data-block-edit="1" aria-expanded="${editing}">${editing ? 'Fertig' : 'Bearbeiten'}</button>` : '<button data-note-edit>Notiz bearbeiten</button>'}${move}${menu('Mehr', controls, 'block-' + i)}</div></div>${placement}${b.type === 'source' && b.citation?.edition ? `<div class="rw-edition nt" title="${esc(b.citation.edition)}">${esc(b.citation.edition)}</div>` : ''}${b.presentation&&!editing?presentationHtml(b):content}${b.type === 'source' && b.text !== b.originalText ? '<span class="rw-edited">Bearbeiteter Auszug</span>' : ''}${n ? '<small class="rw-field-hint">Verknüpfte Notiz · aktueller Stand</small>' : ''}
      ${b.type === 'source' ? `<div class="rw-source-footer">${b.reference ? '<button data-related-comments>Kommentare hinzufügen</button><button data-explain>Erläuterung hinzufügen</button><button data-translation>Übersetzung / Interlinear</button>' : ''}${b.reference ? '<button class="rw-quiet" data-source-open="1">Im Lesetext öffnen ↗</button>' : ''}<details class="rw-citation"><summary>Quellenangabe</summary><div><p class="rw-field-hint">Ergänze hier fehlende Angaben zur verwendeten Ausgabe.</p>${[['work','Werk'],['edition','Edition'],['translator','Übersetzer'],['editor','Herausgeber'],['publisher','Verlag / Ort'],['year','Jahr'],['locator','Fundstelle'],['url','Quellen-URL']].map(([k,t]) => field(t, 'cite.' + k, b.citation?.[k])).join('')}<details class="rw-provenance"><summary>Übernahmeinformationen</summary><small class="nt">${esc(b.capturedAt)}<br>SHA256: ${esc(b.sourceHash)}</small></details></div></details></div>` : ''}
      ${b.search ? `<details class="rw-search-info"><summary>Aus Suchtreffern übernommen</summary><p class="nt">${esc(b.search.query)}</p><p class="rw-field-hint">Gespeicherter Ausschnitt der Trefferliste · ${esc(b.search.capturedAt)}</p></details>` : ''}</article>`;
    }
    function presentationHtml(b){return window.ResearchPresentation.html(b,esc);}
    function arrangement(blocks){
      const classic=draft.layout?.template==='classic',regions=classic?[['left','Linker Rand'],['main','Haupttext'],['right','Rechter Rand'],['bottom','Unten']]:[['main','Reihenfolge']];
      return '<p class="rw-field-hint">Ziehe am Griff ⠿. Leere Bereiche nehmen ebenfalls Texte auf. Alternativ stehen im Editor Pfeile und Bereichsauswahl bereit.</p>'+(!classic?'<button data-a="classicArrange">Mit Randspalten anordnen</button>':'')+'<div class="rw-arrangement '+(classic?'classic':'')+'">'+regions.map(([r,t])=>`<section class="rw-drop-region ${r}" data-drop-region="${r}"><h3>${t}</h3>${blocks.filter(b=>!classic||(b.region||'main')===r).map(b=>`<article class="rw-arrange-card" data-arrange-id="${esc(b.id)}"><button draggable="true" class="rw-drag" data-drag-id="${esc(b.id)}" aria-label="Abschnitt ziehen">⠿</button><b class="nt">${esc(b.title||b.citation?.work||'Text')}</b><p class="nt" dir="auto">${esc((b.type==='note'?(allNotes().find(n=>n.id===b.noteId)?.note||b.text):b.text).slice(0,180))}</p></article>`).join('')}<p class="rw-drop-hint">Hier ablegen</p></section>`).join('')+'</div>';
    }
    let dragging=null;
    function bindDragging(){
      const clear=()=>root.querySelectorAll('.rw-drop-before,.rw-drop-after,.rw-drop-active').forEach(e=>e.classList.remove('rw-drop-before','rw-drop-after','rw-drop-active'));
      root.querySelectorAll('[data-drag-id]').forEach(e=>{e.ondragstart=ev=>{dragging={id:e.dataset.dragId,sheet:draft.id};ev.dataTransfer.setData('application/x-safran-block',dragging.id);ev.dataTransfer.effectAllowed='move';};e.ondragend=()=>{dragging=null;clear();};});
      const target=ev=>ev.target.closest('[data-arrange-id],[data-block],.rw-drop-region');
      root.ondragover=ev=>{if(!dragging||dragging.sheet!==draft?.id)return;const t=target(ev);if(!t)return;ev.preventDefault();ev.dataTransfer.dropEffect='move';clear();t.classList.add(t.matches('.rw-drop-region')?'rw-drop-active':ev.clientY<t.getBoundingClientRect().top+t.getBoundingClientRect().height/2?'rw-drop-before':'rw-drop-after');};
      root.ondrop=ev=>{if(!dragging||dragging.sheet!==draft?.id)return;const t=target(ev);if(!t)return;ev.preventDefault();const blocks=draft[kind==='sheets'?'blocks':'items'],id=dragging.id,source=blocks.find(b=>b.id===id),zone=t.closest('.rw-drop-region'),region=zone&&draft.layout?.template==='classic'?zone.dataset.dropRegion:source?.region||'main';let before=null;
        const targetId=t.dataset.arrangeId||blocks[+t.dataset.block]?.id;
        if(targetId===id){dragging=null;clear();return;}
        if(targetId){const after=ev.clientY>=t.getBoundingClientRect().top+t.getBoundingClientRect().height/2;before=targetId;if(after){const candidates=zone?[...zone.querySelectorAll('[data-arrange-id]')].map(e=>e.dataset.arrangeId):blocks.map(b=>b.id);before=candidates[candidates.indexOf(targetId)+1]||null;}}
        if(window.ResearchArrange.move(blocks,id,region,before)){changed();render();}dragging=null;clear();};
    }
    async function translationPicker(source){
      const sheetId=draft.id,editions=await A.translationEditions(copy(source.reference));
      const d=await modal('Übersetzung anzeigen',`<p class="nt">${esc(source.reference.label)}</p><label>Ausgabe<select id="rwTranslationEdition">${editions.map(e=>`<option value="${esc(e.rel)}" class="nt" ${source.presentation?.companion.reference.rel===e.rel?'selected':''}>${esc(e.versionTitle)} · ${esc(e.language)}</option>`).join('')}</select></label><label>Anzeige<select id="rwTranslationMode"><option value="parallel">Nebeneinander</option><option value="interlinear" ${source.presentation?.mode==='interlinear'?'selected':''}>Interlinear (vorhandene Wortzuordnung)</option><option value="none">Nur dieser Text</option></select></label><p class="rw-field-hint">Interlinear erfordert passende Original- und Übersetzungsausgaben. Zusätze erscheinen mit +. Änderungen am Auszug müssen vorher zurückgenommen werden.</p>`,'Anzeigen');if(!d)return;
      const mode=d.querySelector('#rwTranslationMode').value,rel=d.querySelector('#rwTranslationEdition').value;closeModal(d);
      const presentation=mode==='none'?null:await A.translationPreview({source:copy(source),rel,mode});
      if(draft?.id!==sheetId)throw Error('Das Quellenblatt wurde gewechselt. Bitte erneut auswählen.');source.presentation=presentation;changed();render();
    }
    function bindEditor() {
      root.querySelectorAll('#rwEditor > .rw-editorfields > label [data-f], #rwEditor .rw-document-meta [data-f]').forEach(el => el.oninput = () => { draft[el.dataset.f] = ['tags','topics'].includes(el.dataset.f) ? split(el.value) : el.value; changed(); });
      root.querySelectorAll('[data-layout]').forEach(el=>el.onchange=()=>{
        const key=el.dataset.layout,value=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;
        if(el.type==='number'&&(!Number.isFinite(value)||value<Number(el.min)||value>Number(el.max))){el.reportValidity();return;}
        draft.layout={template:'linear',orientation:'portrait',mainWidth:44,mainSize:18,sideSize:10,bottomSize:10,...draft.layout,[key]:value};
        if(key==='template'&&value==='classic')draft.layout.orientation='landscape';
        changed();render();const d=root.querySelector('[data-menu=layout]');if(d)d.open=true;
      });
      bindDragging();
      root.querySelectorAll('[data-a="classicArrange"]').forEach(e=>e.onclick=()=>{draft.layout={...draft.layout,template:"classic",orientation:"landscape"};changed();render();});
      const frame=root.querySelector('#rwPagePreview');
      if(frame){void A.sheetPreview(copy(draft)).then(html=>{if(frame.isConnected)frame.srcdoc=html;}).catch(e=>status(e.message,true));}
      const np = root.querySelector('#rwNoteProject'); if (np) np.onchange = () => { draft.projectId = np.value; changed(); };
      root.querySelectorAll('[data-block]').forEach(article => {
        const i = +article.dataset.block, blocks = draft[kind === 'sheets' ? 'blocks' : 'items'], b = blocks[i];
        article.querySelectorAll('[data-f]').forEach(el => el.oninput = () => { if (el.dataset.f.startsWith('cite.')) { b.citation ||= {}; b.citation[el.dataset.f.slice(5)] = el.value; } else {b[el.dataset.f] = el.value;if(el.dataset.f==='text')b.presentation=null;} changed(); });
        const comments=article.querySelector('[data-related-comments]');if(comments)comments.onclick=()=>run(()=>relatedComments(b));
        const translation=article.querySelector('[data-translation]');if(translation)translation.onclick=()=>run(()=>translationPicker(b));
        const explain=article.querySelector('[data-explain]');if(explain)explain.onclick=()=>run(()=>editExplanation(b));
        const editNote=article.querySelector('[data-note-edit]');if(editNote)editNote.onclick=()=>run(()=>editExplanation(b,true));
        const region=article.querySelector('[data-region]');if(region)region.onchange=()=>{b.region=region.value;changed();render();};
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
      if(a==='arrange'){arrangeMode=!arrangeMode;pagePreview=false;render();if(arrangeMode)root.querySelector('.rw-arrangement')?.scrollIntoView({block:'start'});return;}
      if(a==='pagePreview'){pagePreview=!pagePreview;arrangeMode=false;render();return;}
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
          persist();rememberSheet();
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
      if(a==='addSource')await sourcePicker();
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
    async function relatedComments(source){
      status('Kommentare werden geladen …');
      const sheetId=draft.id,data=await A.relatedComments(copy(source.reference));status('');
      const dlg=document.createElement('dialog');dlg.className='rw-dialog rw-comments-dialog';
      dlg.innerHTML=`<h2>Kommentare hinzufügen</h2><p class="nt">${esc(source.reference.label)}</p><div class="rw-comment-filters"><label>Filtern<input id="rwCommentFilter" type="search" placeholder="Kommentator oder Ausgabe"></label><label>Sprache<select id="rwCommentLanguage"><option value="">Alle Sprachen</option>${[...new Set(data.items.map(x=>x.language))].map(l=>`<option value="${esc(l)}">${esc(l)}</option>`).join('')}</select></label></div><p class="rw-field-hint">Wähle die Kommentare und die Ausgabe, die du übernehmen möchtest.</p><p class="rw-comment-status" role="status"></p><div class="rw-comment-list"></div><div class="rw-source-footer"><button id="rwCommentsAdd" class="primary" disabled>Auswahl hinzufügen</button><button id="rwCommentsCancel">Abbrechen</button></div>`;
      document.body.append(dlg);const list=dlg.querySelector('.rw-comment-list'),selected=new Set(),info=dlg.querySelector('.rw-comment-status'),add=dlg.querySelector('#rwCommentsAdd');
      const warnings=[...(data.warnings||[]),...(data.limited?['Die Auswahl ist auf 200 Kommentare begrenzt. Bitte gegebenenfalls eine kleinere Stelle wählen.']:[]),...(data.unavailable?[data.unavailable+' verknüpfte Kommentare sind nicht lokal verfügbar.']:[])];
      function renderList(){const q=dlg.querySelector('#rwCommentFilter').value.toLowerCase(),lang=dlg.querySelector('#rwCommentLanguage').value;
       list.innerHTML=data.items.map((item,i)=>({item,i})).filter(({item})=>(!lang||item.language===lang)&&[item.title,item.edition,item.ref].join(' ').toLowerCase().includes(q)).map(({item,i})=>`<article><label class="rw-comment-choice"><input type="checkbox" data-comment="${i}" ${selected.has(i)?'checked':''} ${item.error?'disabled':''}><span><b class="nt">${esc(item.ref)}</b><small class="nt">${esc(item.edition)} · ${esc(item.language)}</small></span></label>${item.error?`<p class="rw-error">${esc(item.error)}</p>`:`<details><summary>Text ansehen</summary><p class="nt" dir="auto">${esc(item.block.text)}</p></details>`}</article>`).join('')||'<p>Keine passenden lokalen Kommentare vorhanden.</p>';
       list.querySelectorAll('[data-comment]').forEach(c=>c.onchange=()=>{c.checked?selected.add(+c.dataset.comment):selected.delete(+c.dataset.comment);update();});update();}
      function update(){add.disabled=!selected.size;info.textContent=(selected.size?selected.size+' ausgewählt. ':'')+warnings.join(' ');}
      dlg.querySelector('#rwCommentFilter').oninput=renderList;dlg.querySelector('#rwCommentLanguage').onchange=renderList;
      const chosen=await new Promise(resolve=>{dlg.onclose=()=>resolve(null);dlg.querySelector('#rwCommentsCancel').onclick=()=>dlg.close();add.onclick=()=>{if(selected.size>50){info.textContent='Bitte höchstens 50 Kommentare auf einmal übernehmen.';return;}resolve([...selected].sort((a,b)=>a-b).map(i=>copy(data.items[i].block)));dlg.close();};renderList();dlg.showModal();});dlg.remove();
      if(!chosen?.length)return;if(draft?.id!==sheetId)throw Error('Das Quellenblatt wurde gewechselt. Bitte die Auswahl erneut öffnen.');
      const blocks=draft[kind==='sheets'?'blocks':'items'],at=blocks.findIndex(b=>b.id===source.id);chosen.forEach(b=>b.region=draft.layout?.template==='classic'?'right':source.region||'main');blocks.splice(at+1,0,...chosen);changed();render();
    }
    async function editExplanation(source,existing=false){
      const sheetId=draft.id,savedKind=kind,old=existing?(allNotes().find(n=>n.id===source.noteId)||source.noteSnapshot):null;
      const d=await modal(existing?'Notiz bearbeiten':'Eigene Erläuterung',`<p class="rw-field-hint nt">${esc(source.reference?.label||old?.refs?.[0]?.label||source.title)}</p>`+field('Titel','title',old?.title||'Eigene Erläuterung')+field('Deine Erläuterung','explanation',old?.note||'',true),'Übernehmen');if(!d)return;
      const text=d.querySelector('[data-f=explanation]').value,title=d.querySelector('[data-f=title]').value.trim();
      if(!text.trim()){closeModal(d);throw Error('Bitte einen eigenen Text eingeben.');}closeModal(d);
      const n={...old,id:old?.id||uid(),projectId:old?.projectId||projectId,title,note:text,tags:old?.tags||[],topics:old?.topics||[],refs:old?.refs||(source.reference?[copy(source.reference)]:[])};
      const isLegacy=existing&&state.legacyNotes.some(x=>x.id===n.id);
      state=isLegacy?await A.legacyNote(n,old.ts||0):await A.put('notes',n,old?.version||0);if(isLegacy)await host.notesChanged();
      if(draft?.id!==sheetId||kind!==savedKind){status('Die Erläuterung wurde unter Notizen gespeichert.');return;}
      const saved=allNotes().find(x=>x.id===n.id),blocks=draft[kind==='sheets'?'blocks':'items'];
      if(existing){const current=blocks.find(b=>b.id===source.id);if(!current)throw Error('Die Notizkarte wurde entfernt.');current.noteSnapshot={...copy(saved),projectId};current.text=saved.note;current.title=saved.title;}
      else{const i=blocks.findIndex(b=>b.id===source.id);blocks.splice(i+1,0,{...blank('note'),region:draft.layout?.template==='classic'?'right':source.region||'main',noteId:n.id,noteSnapshot:{...copy(saved),projectId},title:saved.title,text:saved.note,reference:copy(source.reference)});}
      changed();render();
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
    async function sourcePicker(options={}){
      await ensureProject();
      const view=host.getView(),loaded=view?.loaded||[],section=view?.sections?.[view.idx];
      const selection=options.selection||host.getReaderSelection?.()||{};
      const fixed=draft&&['sheets','collections'].includes(kind)&&draft.projectId===projectId;
      let last;try{last=JSON.parse(localStorage.getItem(lastSheetKey));}catch{}
      const targets=state.sheets.filter(s=>s.projectId===projectId),preferred=targets.find(s=>s.id===last?.id)||targets.at(-1);
      const dlg=document.createElement('dialog');dlg.className='rw-dialog rw-source-dialog';
      dlg.innerHTML=`<form><h2>Quelle hinzufügen</h2><div class="rw-source-tabs"><button type="button" data-source-mode="reference">Stellenangabe</button><button type="button" data-source-mode="text">Textsuche</button>${loaded.length&&section?'<button type="button" data-source-mode="reader">Geöffneter Text</button>':''}</div><div id="rwSourceQueryPanel"><label>Stelle oder Suchtext<input id="rwSourceQuery" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="rwWorkSuggestions" placeholder="z. B. Hiob 7,1–3"></label><div id="rwWorkSuggestions" role="listbox" aria-label="Werkvorschläge" hidden></div><div id="rwSourceFilters" hidden><label>Sprache<select id="rwSourceLanguage"><option value="">Alle Sprachen</option><option value="German">Deutsch</option><option value="Hebrew">Hebräisch</option><option value="English">Englisch</option><option value="Greek">Griechisch</option><option value="Aramaic">Aramäisch</option></select></label><label><input id="rwSourceComments" type="checkbox"> Nur Kommentare</label></div></div><div id="rwSourceReader" hidden><label>Edition<select id="rwCaptureEdition">${loaded.map(d=>`<option class="nt" value="${esc(d.entry.rel)}">${esc(d.entry.versionTitle||d.versionTitle||d.entry.title)}</option>`).join('')}</select></label><label>Abschnitt<select id="rwCaptureSection"></select></label>${field('Zeilen / Verse (leer = ganzer Abschnitt)','labels',(selection.labels||[...(view?.vf?.set||[])].map(String)).join(', ')||host.getRow()||'')}<p class="rw-field-hint">Markierte Zeilen werden vollständig übernommen.</p></div><div class="rw-toolbar"><button type="submit" id="rwSourceFind">Anzeigen</button></div><p id="rwSourceStatus" role="status" aria-live="polite"></p><div id="rwSourceResults"></div><label id="rwSourceEditionLabel" hidden>Edition<select id="rwSourceEdition"></select></label><div id="rwSourcePreview" class="rw-source-preview"></div><p class="rw-error" role="alert"></p>${fixed?`<p class="rw-source-target">Ziel: <b class="nt">${esc(draft.title)}</b></p>`:`<label>Zielblatt<select id="rwSourceTarget">${targets.map(s=>`<option class="nt" value="${esc(s.id)}" ${s.id===preferred?.id?'selected':''}>${esc(s.title)}</option>`).join('')}<option value="">Neues Quellenblatt</option></select></label><label id="rwSourceNewTitleLabel" ${preferred?'hidden':''}>Titel<input id="rwSourceNewTitle" value="Neues Quellenblatt"></label>`}<div class="rw-source-footer"><button type="button" id="rwSourceAdd" class="primary" disabled>Hinzufügen</button><button type="button" id="rwSourceCancel">Abbrechen</button></div></form>`;
      document.body.append(dlg);
      const $=s=>dlg.querySelector(s),query=$('#rwSourceQuery'),result=$('#rwSourceResults'),preview=$('#rwSourcePreview'),edition=$('#rwSourceEdition'),add=$('#rwSourceAdd'),find=$('#rwSourceFind'),info=$('#rwSourceStatus'),error=$('.rw-error');
      let mode=options.reader&&loaded.length&&section?'reader':'reference',blocks=[],generation=0,closed=false,activeSearch=null,referenceQuery='',selectedEdition=null;
      const workList=$('#rwWorkSuggestions');let workItems=[],workIndex=-1,workRevision=0,workTimer=null;
      function hideWorks(){clearTimeout(workTimer);workRevision++;workList.hidden=true;query.setAttribute('aria-expanded','false');query.removeAttribute('aria-activedescendant');workIndex=-1;}
      function activateWork(i){workIndex=i;workList.querySelectorAll('[role=option]').forEach((el,n)=>el.setAttribute('aria-selected',String(n===i)));const el=workList.querySelectorAll('[role=option]')[i];if(el){query.setAttribute('aria-activedescendant',el.id);el.scrollIntoView({block:'nearest'});}}
      function chooseWork(i){const item=workItems[i];if(!item)return;hideWorks();query.value=item.completion;invalidate();result.innerHTML='';$('#rwSourceEditionLabel').hidden=true;info.textContent='Ergänze Kapitel oder Blatt und gegebenenfalls Verse, dann zeige die Vorschau an.';query.focus();query.setSelectionRange(query.value.length,query.value.length);}
      async function showWorks(){
        clearTimeout(workTimer);const g=++workRevision,value=query.value;
        if(mode!=='reference'||!value.trim()){hideWorks();workItems=[];return [];}
        try{const items=await A.suggestWorks(value);if(closed||g!==workRevision||mode!=='reference'||query.value!==value)return [];
          workItems=items;workIndex=-1;query.removeAttribute('aria-activedescendant');workList.hidden=!items.length;query.setAttribute('aria-expanded',String(!!items.length));
          workList.innerHTML=items.map((w,i)=>`<button type="button" id="rwWorkOption${i}" role="option" aria-selected="false" tabindex="-1" data-work="${i}"><b class="nt">${esc(w.title)}</b>${w.heTitle?`<bdi class="nt" dir="rtl">${esc(w.heTitle)}</bdi>`:''}<small>${w.german?`<span class="nt">${esc(w.german)}</span> · `:''}${esc(I18N.t(w.editions===1?'1 Ausgabe':'{} Ausgaben',w.editions))}</small></button>`).join('');
          workList.querySelectorAll('[data-work]').forEach(b=>{b.onpointerdown=e=>e.preventDefault();b.onclick=()=>chooseWork(+b.dataset.work);});return items;
        }catch{if(!closed&&g===workRevision)hideWorks();return [];}
      }
      function scheduleWorks(){hideWorks();if(mode==='reference'&&query.value.trim())workTimer=setTimeout(()=>void showWorks(),120);}
      query.onkeydown=e=>{
        if(e.isComposing||workList.hidden)return;
        if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();activateWork(e.key==='ArrowDown'?(workIndex+1)%workItems.length:workIndex<=0?workItems.length-1:workIndex-1);}
        else if(e.key==='Enter'&&workIndex>=0){e.preventDefault();chooseWork(workIndex);}
        else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();hideWorks();}
      };
      query.onblur=hideWorks;
      query.onfocus=()=>{if(workList.hidden)scheduleWorks();};
      const cancelSearch=()=>{if(activeSearch!==null){void A.cancelSourceSearch(activeSearch);activeSearch=null;}};
      function invalidate(){generation++;cancelSearch();blocks=[];add.disabled=true;find.disabled=false;error.textContent='';preview.innerHTML='';info.textContent='';}
      function showPreview(items){blocks=items;add.disabled=!items.length;preview.innerHTML=items.map(b=>`<article><h3 class="nt">${esc(b.title)} · ${esc(b.citation.locator)}</h3><small class="nt">${esc(b.citation.edition)}</small><p class="nt" dir="auto">${esc(b.text)}</p></article>`).join('');}
      function fail(e){error.textContent=String(e.message||e).replace(/^Error invoking remote method '[^']*': (Error: )?/,'');}
      async function previewReference(g){try{selectedEdition=edition.selectedOptions[0]?.dataset;const items=await A.sourcePreview({query:referenceQuery,rel:edition.value});if(!closed&&g===generation)showPreview(items);}catch(e){if(!closed&&g===generation)fail(e);}}
      async function readerSections(){const g=++generation;add.disabled=true;find.disabled=true;try{const data=await A.sections($('#rwCaptureEdition').value);if(closed||g!==generation)return;const matches=data.sections.some(s=>JSON.stringify(s.path)===JSON.stringify(section.path));$('#rwCaptureSection').innerHTML=(!matches?'<option value="" selected disabled>Dieser Abschnitt fehlt in dieser Edition.</option>':'')+data.sections.map(s=>`<option value="${esc(JSON.stringify(s.path))}" ${JSON.stringify(s.path)===JSON.stringify(section.path)?'selected':''}>${esc(s.label)}</option>`).join('');find.disabled=!data.sections.length||!matches;}catch(e){if(!closed&&g===generation)fail(e);}}
      async function search(){
        if(mode==='reference'&&!/\d+[ab]?(?:\s*[:,].*)?$/i.test(query.value.trim())){const items=await showWorks();if(items.length){info.textContent='Wähle ein Werk und ergänze die Stelle.';query.focus();return;}}
        hideWorks();invalidate();const g=generation;find.disabled=true;info.textContent=mode==='text'?'Suche läuft …':'Vorschau wird geladen …';
        try{
          if(mode==='reader'){
            const b=await A.capture({rel:$('#rwCaptureEdition').value,sectionPath:JSON.parse($('#rwCaptureSection').value),labels:$('[data-f="labels"]').value});if(closed||g!==generation)return;selectedEdition={rel:b.reference.rel,versionTitle:b.citation.edition};showPreview([b]);
          }else if(mode==='reference'){
            referenceQuery=query.value;const data=await A.sourceEditions(referenceQuery);if(closed||g!==generation)return;
            const preferred=editionPreference(data.editions);edition.innerHTML=data.editions.map(e=>`<option class="nt" value="${esc(e.rel)}" data-rel="${esc(e.rel)}" data-version-title="${esc(e.versionTitle)}" ${e.rel===preferred?.rel?'selected':''}>${esc(e.versionTitle)} · ${esc(e.language)}</option>`).join('');$('#rwSourceEditionLabel').hidden=false;await previewReference(g);
          }else{
            const id=++sourceRequestId;activeSearch=id;const data=await A.searchSources({query:query.value,language:$('#rwSourceLanguage').value,comments:$('#rwSourceComments').checked,requestId:id});if(closed||g!==generation)return;activeSearch=null;
            info.textContent=data.cancelled?'Suche abgebrochen.':data.results.length?'Treffer auswählen; jede Edition wird einzeln angezeigt.':'Keine Treffer in den durchsuchten lokalen Quellen.';
            if(data.limited)info.textContent+=' Anzeige begrenzt: höchstens 40 Treffer, 5 je Edition.';
            result.innerHTML=data.results.map((h,i)=>`<button type="button" data-source-hit="${i}"><b class="nt">${esc(h.title)} · ${esc(h.where)}</b><small class="nt">${esc(h.versionTitle)}</small><span class="nt" dir="auto">${esc(h.snippet)}</span></button>`).join('');
            result.querySelectorAll('[data-source-hit]').forEach(b=>b.onclick=async()=>{const h=data.results[+b.dataset.sourceHit],next=++generation;add.disabled=true;error.textContent='';preview.innerHTML='';try{const items=await A.captureHits({hits:[h],query:query.value,complete:false});if(!closed&&next===generation){selectedEdition={rel:h.rel,versionTitle:h.versionTitle};showPreview(items);result.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}}catch(e){if(!closed&&next===generation)fail(e);}});
          }
          if(mode!=='text'&&g===generation)info.textContent=blocks.length?'Prüfe den Auszug und füge ihn anschließend hinzu.':'';
        }catch(e){if(!closed&&g===generation){info.textContent='';fail(e);}}finally{if(!closed&&g===generation)find.disabled=false;}
      }
      function setMode(next){hideWorks();invalidate();mode=next;query.setAttribute('role',mode==='reference'?'combobox':'textbox');result.innerHTML='';$('#rwSourceEditionLabel').hidden=true;$('#rwSourceQueryPanel').hidden=mode==='reader';$('#rwSourceReader').hidden=mode!=='reader';$('#rwSourceFilters').hidden=mode!=='text';query.placeholder=mode==='text'?'Wort oder Textausschnitt suchen …':'z. B. Hiob 7,1–3';find.textContent=mode==='text'?'Suchen':'Vorschau anzeigen';dlg.querySelectorAll('[data-source-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sourceMode===mode)));if(mode==='reader')void readerSections();else{find.disabled=false;query.focus();}}
      dlg.querySelectorAll('[data-source-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.sourceMode));
      query.oninput=()=>{invalidate();result.innerHTML='';$('#rwSourceEditionLabel').hidden=true;scheduleWorks();};
      edition.onchange=()=>{invalidate();void previewReference(generation);};
      $('#rwSourceLanguage').onchange=invalidate;$('#rwSourceComments').onchange=invalidate;
      if(loaded.length){const selected=loaded.find(d=>d.entry.rel===selection.rel)?.entry||editionPreference(loaded.map(d=>d.entry));if(selected)$('#rwCaptureEdition').value=selected.rel;$('#rwCaptureEdition').onchange=()=>{invalidate();void readerSections();};$('#rwCaptureSection').onchange=()=>{invalidate();find.disabled=!$('#rwCaptureSection').value;};$('[data-f="labels"]').oninput=invalidate;}
      const target=$('#rwSourceTarget');if(target)target.onchange=()=>$('#rwSourceNewTitleLabel').hidden=!!target.value;
      dlg.querySelector('form').onsubmit=e=>{e.preventDefault();void search();};
      const chosen=await new Promise(resolve=>{dlg.onclose=()=>{closed=true;hideWorks();generation++;cancelSearch();resolve(null);};$('#rwSourceCancel').onclick=()=>dlg.close();add.onclick=()=>{if(!blocks.length)return;const title=$('#rwSourceNewTitle')?.value.trim();if(target&&!target.value&&!title){error.textContent='Bitte einen Titel eingeben.';return;}resolve({items:copy(blocks),target:target?.value,title,edition:selectedEdition?{rel:selectedEdition.rel||edition.value,versionTitle:selectedEdition.versionTitle}:null});dlg.close();};dlg.showModal();setMode(mode);});
      dlg.remove();if(!chosen)return;
      if(chosen.edition)try{localStorage.setItem(lastEditionKey,JSON.stringify(chosen.edition));}catch{}
      if(fixed){draft[kind==='sheets'?'blocks':'items'].push(...chosen.items);changed();}
      else{
        if(!leave())return;
        const existing=state.sheets.find(s=>s.id===chosen.target&&s.projectId===projectId);kind='sheets';legacy=false;
        draft=existing?copy(existing):{id:uid(),projectId,title:chosen.title,description:'',tags:[],version:0,blocks:[]};draft.blocks.push(...chosen.items);changed();
      }
      rememberSheet();host.showTab('research');render();
    }
    const captureDialog=()=>sourcePicker({reader:true});
    document.addEventListener('click', e => { if (!e.target.closest('.rw-menu')) closeMenus(); });
    document.addEventListener('keydown', e => {
      if (document.documentElement.dataset.tab !== 'research' || document.querySelector('dialog[open]')) return;
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 's' && draft) {
        e.preventDefault(); if (dirty) void run(() => action('save'));
      } else if (e.key === 'Escape') {
        const open = root.querySelector('.rw-menu[open]');
        if(dragging){dragging=null;root.querySelectorAll('.rw-drop-before,.rw-drop-after,.rw-drop-active').forEach(el=>el.classList.remove('rw-drop-before','rw-drop-after','rw-drop-active'));}
        if (open) { e.preventDefault(); closeMenus(); open.querySelector('summary')?.focus(); }
      }
    });
    const readerButton=document.getElementById('rResearchBtn');let buttonSelection=null;readerButton.onpointerdown=()=>buttonSelection=host.getReaderSelection?.();readerButton.onclick=()=>{const selection=buttonSelection;buttonSelection=null;void run(()=>sourcePicker({reader:true,selection}));};
    document.addEventListener('click',e=>{const b=e.target.closest('.cmtResearch');if(!b)return;e.preventDefault();e.stopPropagation();void run(async()=>{const source=await A.captureCommentary({ref:b.dataset.ref,rel:b.dataset.rel});await acceptSources([source]);});});
    document.getElementById('sResearchBtn').onclick=()=>run(async()=>{
      const s=host.getSearch();if(!s.hits?.length)throw Error('Bitte zuerst eine Textsuche mit Fundstellen ausführen.');
      // Save only the explicitly available result subset; no claim that pagination is complete.
      const d=await modal('Suchergebnisse sichern',`<p>${s.hits.length} verfügbare Treffer werden mit Edition, Fundstelle und Suchanfrage gespeichert (höchstens 200). Weitere Treffer und Parallelfassungen sind nicht automatisch enthalten.</p>`);if(!d)return;closeModal(d);
      const items=await A.captureHits({hits:s.hits.map(h=>({rel:h.rel,path:h.path})),query:s.params?.q||s.params?.query||'',complete:false});await acceptSources(items,true);
    });
    A.onChanged(()=>{if(document.documentElement.dataset.tab==='research'){if(dirty)status('Es gibt einen neueren Speicherstand. Dein Entwurf bleibt erhalten; Speichern prüft auf Konflikte.');else void open();}});
    window.addEventListener('focus',()=>{if(document.documentElement.dataset.tab==='research'&&!dirty)void open();});
    return {open,captureDialog,getReaderSelection:()=>host.getReaderSelection?.(),captureSelection:selection=>run(()=>sourcePicker({reader:true,selection}))};
  }
  return {create};
})();
