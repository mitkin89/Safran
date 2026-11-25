/* Local research workspace: source snapshots, reusable collections and linked notes. */
window.LibraryResearch = (() => {
  'use strict';
  const C=window.ResearchCitations,G=window.ResearchCommentGroups;
  const A = window.research, copy = x => structuredClone(x), uid = () => crypto.randomUUID();
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const languageLabel=value=>I18N.t(({German:'Deutsch',Hebrew:'Hebräisch',English:'Englisch'})[value]||value);
  const split = x => [...new Set(String(x || '').split(',').map(x => x.trim()).filter(Boolean))];
  function create(host) {
    const root = document.getElementById('researchRoot');
    const editingBlocks = new Set(), expandedBlocks = new Set();
    let messageError = false, editRevision = 0, sourceRequestId = 0, pagePreview = false, previewRequest = 0, pageObserver = null, outlineObserver = null, activeOutline = '';
    const history=window.ResearchHistory.create();let historyKey='';
    const lastSheetKey='researchLastSheet', lastEditionKey='researchLastEdition';
    function rememberSheet(){if(kind==='sheets'&&draft)try{localStorage.setItem(lastSheetKey,JSON.stringify({id:draft.id,projectId:draft.projectId}));}catch{}}
    function editionPreference(editions){let last;try{last=JSON.parse(localStorage.getItem(lastEditionKey));}catch{}return host.getPreferredEdition?.(editions)||window.ResearchEditions.preferred(editions,last);}
    let noteScope='project';
    let state = null, projectId = '', kind = 'sheets', draft = null, legacy = false, dirty = false, filter = '', message = '', pending = false;
    const draftKey = 'researchDraft:' + (window.frameElement ? 'pane' : 'main');
    const allNotes = () => [...state.notes, ...state.legacyNotes].filter(n=>n.kind!=='hl');
    const currentProject = () => state?.projects.find(p => p.id === projectId);
    const rows = () => kind === 'notes' ? allNotes().filter(n => noteScope==='unassigned'?!n.projectId:n.projectId===projectId) : state[kind].filter(x => x.projectId === projectId);
    function persist() { try { if (dirty && draft) localStorage.setItem(draftKey, JSON.stringify({projectId,kind,draft,legacy})); else localStorage.removeItem(draftKey); return true; } catch { message = 'Entwurf konnte nicht zwischengespeichert werden. Bitte speichern.'; status(message); return false; } }
    function ensureHistory(){const key=draft?kind+':'+draft.id:'';if(key!==historyKey){historyKey=key;history.reset(draft);}return history;}
    function historyButtons(){root.querySelectorAll('[data-a="undo"]').forEach(b=>b.disabled=!history.canUndo);root.querySelectorAll('[data-a="redo"]').forEach(b=>b.disabled=!history.canRedo);}
    function restoreHistory(direction){
      if(!draft)return;const active=document.activeElement,f=active?.dataset.f,index=active?.closest('[data-block]')?.dataset.block,blockId=index===undefined?null:draft[kind==='sheets'?'blocks':'items']?.[+index]?.id,selection=f&&typeof active.selectionStart==='number'?[active.selectionStart,active.selectionEnd]:null,scroll=document.scrollingElement?.scrollTop;
      const restored=history[direction]();if(!restored)return;for(const key of ['version','ts','createdAt','updatedAt'])if(key in draft)restored[key]=draft[key];draft=restored;changed('',false);render();if(scroll!==undefined)document.scrollingElement.scrollTop=scroll;
      const blocks=draft[kind==='sheets'?'blocks':'items']||[],at=blockId?blocks.findIndex(b=>b.id===blockId):-1,scope=blockId?root.querySelector(`[data-block="${at}"]`):root.querySelector('.rw-editorfields'),target=f?scope?.querySelector(`[data-f="${CSS.escape(f)}"]`):root.querySelector(`[data-a="${direction}"]`);
      if(target){let p=target.parentElement;while(p&&p!==root){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}target.focus({preventScroll:true});if(selection&&typeof target.setSelectionRange==='function')target.setSelectionRange(...selection);}
    }
    function changed(key='',record=true) {
      if(record)ensureHistory().record(draft,key);historyButtons();
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
    function slider(label,id,value,min,max,step=1,attrs='',unit='pt'){
      return `<label class="rw-slider" for="${id}"><span class="rw-slider-heading"><span>${esc(label)}</span><output class="nt" for="${id}">${esc(value)} ${unit}</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${esc(value)}" data-unit="${unit}" aria-label="${esc(label)}" ${attrs}></label>`;
    }
    function bindSliders(scope){scope.querySelectorAll('.rw-slider input[type=range]').forEach(el=>el.oninput=()=>{el.closest('.rw-slider').querySelector('output').textContent=el.value+' '+el.dataset.unit;});}
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
        if(draft&&!dirty){const previousVersion=draft.version,rec=(legacy?state.legacyNotes:state[kind]).find(x=>x.id===draft.id);draft=rec?copy(rec):null;if(draft?.version!==previousVersion)historyKey='';if(draft&&kind==='notes')draft.refs=copy(noteRefs(draft));}
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
      kind = type; draft = rec ? copy(rec) : null;historyKey='';
      if (draft && kind === 'notes') draft.refs = copy(noteRefs(draft));
      legacy = kind === 'notes' && !!draft && state.legacyNotes.some(x => x.id === draft.id);
      dirty = false; editingBlocks.clear(); expandedBlocks.clear(); persist(); rememberSheet();
    }
    function itemMeta(x) {
      if (kind === 'notes') return (x.topics?.length ? x.topics : x.tags || []).join(' · ') || (!x.projectId ? 'Ohne Notizbuch' : 'Im Notizbuch '+(currentProject()?.title||''));
      const n = (x.blocks || x.items || []).length;
      return n === 1 ? '1 Abschnitt' : n + ' Abschnitte';
    }
    function render() {
      if (!state) return;
      ensureHistory().accept(draft);
      pageObserver?.disconnect();pageObserver=null;outlineObserver?.disconnect();outlineObserver=null;
      root.classList.toggle('rw-page-preview',pagePreview&&kind==='sheets');
      root.classList.toggle('rw-spatial-editor',!pagePreview&&kind==='sheets'&&draft?.layout?.template==='classic');
      const p = currentProject(), matches = rows().filter(x => JSON.stringify(x).toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
      const projectMenu = `<button data-a="projectNew">Neues Projekt</button>${p ? '<button data-a="projectEdit">Projekt bearbeiten</button>' : ''}<button data-a="import">Projektpaket importieren …</button>${p ? '<div class="rw-menu-divider"></div><button data-export="json">Projekt teilen …</button><div class="rw-menu-caption">Weitere Datenexporte</div><button data-export="csv">Forschungsdaten CSV …</button><button data-export="jsonld">Annotationen JSON-LD …</button>' : ''}`;
      root.innerHTML = `<div class="rw-projectbar"><label for="rwProject">Projekt / Notizbuch</label><select id="rwProject"><option value="">Projekt wählen</option>${state.projects.map(x => `<option class="nt" value="${esc(x.id)}" ${x.id === projectId ? 'selected' : ''}>${esc(x.title)}${x.archived ? ' (archiviert)' : ''}</option>`).join('')}</select>${menu('Projekt verwalten', projectMenu, 'project')}<span class="spacer"></span><details class="rw-help"><summary>Hilfe</summary><p>Öffne einen Text im Reiter Lesen und übernimm ihn mit „＋ Quellenblatt“. Eigene Texte und Notizen kannst du hier hinzufügen.</p><p>Über „Projekt verwalten“ kannst du das gesamte Projekt als Datei teilen oder importieren.</p></details></div>
      <p id="rwStatus" class="rw-status" role="status" aria-live="polite" hidden></p>
      ${p ? `<div class="rw-kinds" aria-label="Projektinhalte">${[['sheets', 'Quellenblätter'], ['collections', 'Sammlungen'], ['notes', 'Notizen']].map(([k, t]) => `<button data-kind="${k}" aria-pressed="${kind === k}">${t}<span class="rw-count">${k === 'notes' ? allNotes().filter(n => n.projectId === projectId).length : state[k].filter(x => x.projectId === projectId).length}</span></button>`).join('')}</div>
      <div class="rw-notebook-context"><div><b>Notizbuch „${esc(p.title)}“</b><p>Dieses Projekt und das gleichnamige Notizbuch gehören zusammen. Unter „Notizen“ findest du die gespeicherten Notizen dieses Notizbuchs.</p></div><button data-a="openNotebook">Notizbuch öffnen →</button></div>
      ${kind==='notes'?`<div class="rw-note-scopes" aria-label="Notizen nach Zuordnung"><button data-note-scope="project" aria-pressed="${noteScope==='project'}">In „${esc(p.title)}“ <span>${allNotes().filter(n=>n.projectId===projectId).length}</span></button><button data-note-scope="unassigned" aria-pressed="${noteScope==='unassigned'}">Ohne Notizbuch <span>${allNotes().filter(n=>!n.projectId).length}</span></button></div>`:''}
      <div class="rw-layout"><aside class="rw-sidebar"><div class="rw-sidebar-head"><h2>${kindLabel()}</h2><span class="muted">${matches.length}</span></div><label class="rw-search"><span class="rw-sr">Nach Text, Quelle, Thema oder Schlagwort filtern</span><input id="rwFilter" value="${esc(filter)}" type="search" placeholder="Suchen …"></label><button class="rw-new" data-a="new"><span aria-hidden="true">＋</span> <span>${newLabel()}</span></button><div id="rwList">${matches.map(x => `<button data-edit="${esc(x.id)}" class="rw-listitem ${draft?.id === x.id ? 'active' : ''}" ${draft?.id === x.id ? 'aria-current="true"' : ''}><b class="nt">${esc(kind==='notes'?window.NotesWorkspaceData.title(x):x.title||'Notiz')}</b>${kind==='notes'?'<span class="rw-note-list-preview">'+esc(window.NotesWorkspaceData.excerpt(x).slice(0,180))+'</span>':''}<small class="${kind === 'notes' && (x.topics?.length || x.tags?.length) ? 'nt' : ''}">${esc(itemMeta(x))}</small></button>`).join('') || `<p class="rw-list-empty">${filter ? 'Keine passenden Einträge.' : 'Noch keine Einträge.'}</p>`}</div>${noteShelf()}${outline()}</aside><div id="rwEditor">${draft ? editor() : `<div class="rw-empty"><span class="rw-empty-icon" aria-hidden="true">▤</span><h2>${rows().length ? 'Eintrag auswählen' : kind === 'sheets' ? 'Dein erstes Quellenblatt' : kind === 'collections' ? 'Quellen für deine Recherche sammeln' : 'Gedanken und Belege festhalten'}</h2><p>${kind === 'sheets' ? 'Verbinde Textstellen, Kommentare und eigene Gedanken zu einem Arbeitsblatt.' : kind === 'collections' ? 'Bewahre Fundstellen und Suchtreffer zusammen auf und verwende sie in deinen Quellenblättern.' : 'Verknüpfe eine Notiz mit mehreren Textstellen und ordne sie nach Themen.'}</p><button class="primary" data-a="new">${newLabel()}</button></div>`}</div></div>` : '<div class="rw-empty rw-welcome"><span class="rw-empty-icon" aria-hidden="true">▤</span><h1>Platz für deine Recherche</h1><p>Lege ein Projekt an und sammle darin Quellen, Arbeitsblätter und Notizen.</p><button class="primary" data-a="projectNew">Erstes Projekt anlegen</button><button class="rw-quiet" data-a="import">Vorhandenes Projekt importieren …</button></div>'}`;
      status(message, messageError);
      root.querySelector('#rwProject').onchange = e => {
        if (!leave()) return render();
        projectId = e.target.value;noteScope='project'; pickRecord(rows()[0]); render();
      };
      const f = root.querySelector('#rwFilter');
      if (f) f.oninput = e => { filter = e.target.value; const pos = e.target.selectionStart; render(); const n = root.querySelector('#rwFilter'); n.focus(); n.setSelectionRange(pos, pos); };
      root.querySelectorAll('[data-kind]').forEach(el => el.onclick = () => { if (!leave()) return; kind = el.dataset.kind;noteScope='project'; filter = ''; pickRecord(rows()[0]); render(); });
      root.querySelectorAll('[data-note-scope]').forEach(el=>el.onclick=()=>{if(!leave())return;noteScope=el.dataset.noteScope;filter='';pickRecord(rows()[0]);render();});
      root.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => { if (!leave()) return; pickRecord(rows().find(x => x.id === el.dataset.edit)); render(); });
      root.querySelectorAll('[data-a]').forEach(el => el.onclick = () => { closeMenus(); void run(() => action(el.dataset.a)); });
      root.querySelectorAll('[data-insert-note]').forEach(el=>el.onclick=()=>appendNote(notebookNotes()[+el.dataset.insertNote]));
      root.querySelectorAll('[data-export]').forEach(el => el.onclick = () => { closeMenus(); void run(() => exportRecord(el.dataset.export, 'project')); });
      root.querySelectorAll('.rw-menu').forEach(d => d.addEventListener('toggle', () => { if (d.isConnected && d.open) root.querySelectorAll('.rw-menu[open]').forEach(other => { if (other !== d) other.open = false; }); }));
      if (draft) bindEditor();bindOutline();
    }
    function notebookNotes(){return allNotes().filter(n=>n.projectId===projectId);}
    function noteShelf(){
      if(kind==='notes')return '';
      const notes=notebookNotes(),blocks=draft?.[kind==='sheets'?'blocks':'items']||[],D=window.NotesWorkspaceData;
      return '<section class="rw-notebook-notes" aria-label="Notizen zum Einfügen"><div class="rw-sidebar-head"><h2>Notizen aus „'+esc(currentProject()?.title)+'“</h2><span>'+notes.length+'</span></div><p class="muted">'+(draft?'Anklicken, um die Notiz einzufügen.':'Öffne zuerst ein Quellenblatt oder eine Sammlung.')+'</p><div class="rw-notebook-note-list">'+notes.map((n,i)=>{const used=blocks.some(b=>b.type==='note'&&b.noteId===n.id);return '<button type="button" data-insert-note="'+i+'" class="rw-note-shelf-item" '+(!draft||used?'disabled':'')+'><b>'+esc(D.title(n))+'</b><span>'+esc(D.excerpt(n).slice(0,140)||'Lesezeichen ohne eigenen Notiztext')+'</span><small>'+(used?'✓ Bereits eingefügt':'＋ Einfügen')+'</small></button>';}).join('')+(notes.length?'':'<p class="muted">Noch keine gespeicherten Notizen in diesem Notizbuch.</p>')+'</div></section>';
    }
    function appendNote(n){
      if(!draft||kind==='notes'||!n)return;
      draft[kind==='sheets'?'blocks':'items'].push({...blank('note'),noteId:n.id,noteSnapshot:{...copy(n),refs:noteRefs(n),projectId},title:window.NotesWorkspaceData.title(n),text:n.note||''});changed();render();
    }
    function outline(){
      if(!draft||kind==='notes')return '';
      const blocks=draft[kind==='sheets'?'blocks':'items']||[],regions={main:'Haupttext',left:'Linker Rand',right:'Rechter Rand',bottom:'Unten'};
      const entries=G.runs(blocks).map(g=>{const b=g.blocks[0],title=b.type==='source'?C.location(b.citation)||b.title:b.title||b.text?.split('\n')[0]||'Text',detail=[b.type==='source'?C.edition(b.citation):I18N.t(b.type==='note'?'Notiz':b.type==='heading'?'Überschrift':'Eigener Text'),I18N.t(regions[b.region||'main']),g.blocks.length>1?I18N.t('{} Abschnitte',g.blocks.length):''].filter(Boolean).join(' · ');return `<button class="rw-outline-item" data-outline-id="${esc(b.id)}" data-outline-search="${esc((title+' '+detail).toLocaleLowerCase())}" ${activeOutline===b.id?'aria-current="true"':''}><span class="rw-block-number">${blocks.indexOf(b)+1}</span><span><b class="nt">${esc(title.slice(0,200))}</b><small class="nt">${esc(detail)}</small></span></button>`;});
      return `<nav class="rw-outline" aria-label="Quellen im Blatt"><div class="rw-sidebar-head"><h2>Quellen im Blatt</h2><span>${entries.length}</span></div><label class="rw-search"><span class="rw-sr">Quelle im Blatt finden</span><input id="rwOutlineFilter" type="search" placeholder="Quelle im Blatt finden"></label><div class="rw-outline-list">${entries.join('')||'<p class="muted">Noch keine Quellen.</p>'}</div><p class="rw-outline-empty muted" hidden>Keine passenden Quellen.</p></nav>`;
    }
    function bindOutline(){
      const nav=root.querySelector('.rw-outline');if(!nav)return;
      const buttons=[...nav.querySelectorAll('[data-outline-id]')],targets=[...root.querySelectorAll('[data-nav-block]')].filter(el=>!el.parentElement.closest('[data-nav-block]'));
      const mark=id=>{activeOutline=id;buttons.forEach(b=>{if(b.dataset.outlineId===id)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});};
      nav.querySelector('#rwOutlineFilter').oninput=e=>{const q=e.target.value.trim().toLocaleLowerCase();buttons.forEach(b=>b.hidden=!b.dataset.outlineSearch.includes(q));nav.querySelector('.rw-outline-empty').hidden=buttons.some(b=>!b.hidden);};
      buttons.forEach(button=>button.onclick=()=>{const el=targets.find(el=>el.dataset.navBlock===button.dataset.outlineId);if(!el)return;mark(button.dataset.outlineId);el.tabIndex=-1;el.focus({preventScroll:true});el.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
      if(targets.length){outlineObserver=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible.length)mark(visible[0].target.dataset.navBlock);},{rootMargin:'-85px 0px -45% 0px',threshold:0});targets.forEach(el=>outlineObserver.observe(el));}
    }
    function editor() {
      const blocks = draft[kind === 'sheets' ? 'blocks' : 'items'] || [];
      let body = `<label class="rw-title"><span class="rw-sr">Titel</span><input data-f="title" value="${esc(draft.title)}" placeholder="Titel eingeben"></label>`;
      if (kind === 'notes') body += field('Notiz', 'note', draft.note, true);
      body += `<details class="rw-document-meta"><summary>${kind === 'notes' ? 'Themen und Schlagwörter' : 'Beschreibung und Schlagwörter'}</summary>${kind === 'notes' ? field('Themen (Komma getrennt)', 'topics', (draft.topics || []).join(', ')) : field('Beschreibung', 'description', draft.description, true)}${field('Schlagwörter (Komma getrennt)', 'tags', (draft.tags || []).join(', '))}${kind === 'notes' ? `<label>Notizbuch<select id="rwNoteProject">${legacy ? '<option value="">Ohne Notizbuch</option>' : ''}${state.projects.map(p => `<option class="nt" value="${esc(p.id)}" ${draft.projectId === p.id ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select></label>` : ''}</details>`;
      if (kind === 'notes') {
        body += `<section class="rw-note-refs"><h3>Verknüpfte Textstellen <span class="rw-count">${draft.refs?.length || 0}</span></h3>${(draft.refs || []).map((r, i) => `<div class="rw-reference"><div><button class="rw-ref-link nt" data-open-ref="${i}">${esc(r.label)}</button><small class="nt">${esc(r.citation?.edition || '')}</small></div><button data-remove-ref="${i}" title="Fundstelle entfernen" aria-label="Fundstelle entfernen">✕</button></div>`).join('') || '<p class="muted">Welche Textstellen gehören zu dieser Notiz?</p>'}<div class="rw-toolbar"><button data-a="reference">Quelle verknüpfen</button><button class="rw-quiet" data-a="manualRef">Weitere Fundstelle …</button></div></section>`;
      } else {
        const add=`<div class="rw-composebar" aria-label="Inhalte hinzufügen"><span>Hinzufügen:</span><button data-a="addSource">＋ Quelle</button><button data-a="addText">Eigener Text</button><button data-a="addHeading">Überschrift</button><button data-a="addNote">Notiz verknüpfen</button>${kind==='sheets'?'<button data-a="fromCollection">Aus Sammlung</button>':''}</div>`;
        body += add;

        body += `<div id="rwBlocks">${kind==='sheets'?arrangement(blocks):G.runs(blocks).map(g=>g.blocks.length>1?commentBundle(g.blocks,blocks):blockEditor(g.blocks[0],blocks.indexOf(g.blocks[0]))).join('')}</div>`;
        if(blocks.length)body+=add;

      }
      const layout=draft.layout||{template:'linear',orientation:'portrait',mainWidth:44,mainSize:18,sideSize:10,bottomSize:10};
      const layouts=kind==='sheets'?menu('Layout',`<label><input type="checkbox" data-layout="showTitle" ${layout.showTitle!==false?'checked':''}> Blatttitel anzeigen</label><label>Anordnung<select data-layout="template"><option value="linear" ${layout.template!=='classic'?'selected':''}>Untereinander</option><option value="classic" ${layout.template==='classic'?'selected':''}>Haupttext mit Randkommentaren</option></select></label><label>Seite<select data-layout="orientation"><option value="portrait" ${layout.orientation!=='landscape'?'selected':''}>A4 Hochformat</option><option value="landscape" ${layout.orientation==='landscape'?'selected':''}>A4 Querformat</option></select></label>${slider('Seitenrand (mm)','rwLayout-pageMargin',layout.pageMargin??10,6,25,1,'data-layout="pageMargin"','mm')}${layout.template==='classic'?'<p class="rw-field-hint">Wähle den Bereich direkt auf der Karte oder ziehe sie am Griff in die gewünschte Spalte.</p><p class="rw-field-hint">Leere Randspalten vergrößern den Haupttext automatisch.</p>'+[['mainWidth','Breite des Haupttexts (%)',30,60,44],['mainSize','Haupttext (pt)',10,30,18],['sideSize','Randkommentare (pt)',8,20,10],['bottomSize','Unterer Bereich (pt)',8,20,10]].map(([k,t,min,max,def])=>slider(t,'rwLayout-'+k,layout[k]??def,min,max,1,`data-layout="${k}"`,k==='mainWidth'?'%':'pt')).join('')+(blocks.some(b=>b.presentation)?'<p class="rw-field-hint">Einzelschriftgrößen unter „Übersetzung / Interlinear“ haben Vorrang vor den Layout-Schriftgrößen.</p>':''):''}`,'layout'):'';
      if(pagePreview&&kind==='sheets')body='<div class="rw-page-hint">Die Vorschau zeigt die Anordnung mit den aktuellen, auch ungespeicherten Inhalten.</div><iframe id="rwPagePreview" title="Seitenvorschau" sandbox="allow-same-origin"></iframe>';
      const exports = kind === 'sheets' ? menu('Exportieren', ['pdf', 'docx', 'html'].map((f, i) => `<button data-sheet-export="${f}">${['PDF', 'Word (.docx)', 'HTML'][i]} exportieren …</button>`).join(''), 'sheet-export') : '';
      return `<div class="rw-editorbar"><span id="rwSaveState" class="rw-save-state ${dirty ? 'is-dirty' : ''}">${dirty ? 'Ungespeichert' : 'Gespeichert'}</span><span class="spacer"></span><div class="rw-history" role="group" aria-label="Überarbeitungen"><button data-a="undo" aria-label="Rückgängig" title="Rückgängig (⌘/Strg+Z)" ${history.canUndo?'':'disabled'}>↶</button><button data-a="redo" aria-label="Wiederholen" title="Wiederholen (⌘/Strg+Umschalt+Z)" ${history.canRedo?'':'disabled'}>↷</button></div>${layouts}${kind==='sheets'?`<button data-a="pagePreview" aria-pressed="${pagePreview}">${pagePreview?'Bearbeiten':'Vorschau'}</button>`:''}${exports}<button data-a="save" class="primary" ${!dirty ? 'disabled' : ''} title="Speichern (⌘/Strg+S)">Speichern</button>${menu('⋯', '<button data-a="reload">Neu laden / Entwurf verwerfen</button><div class="rw-menu-divider"></div><button class="rw-danger" data-a="delete">Entfernen</button>', 'entry', 'rw-entry-menu')}</div><div class="rw-editorfields">${body}</div>`;
    }
    function blockEditor(b, i, spatial=false) {
      const n = b.type === 'note' ? allNotes().find(n => n.id === b.noteId) || b.noteSnapshot : null;
      const text = n?.note ?? b.text, title = n ? window.NotesWorkspaceData.title(n) : b.title;
      const editing = editingBlocks.has(b.id), expanded = expandedBlocks.has(b.id), long = text.length > 750 || text.split('\n').length > 8 || b.presentation?.rows?.length>4;
      const type = {source: 'Quelle', text: 'Eigener Text', heading: 'Überschrift', note: 'Notiz'}[b.type];
      const blockTitle = b.type === 'source' ? (title&&title!==b.citation?.work?[title,C.locator(b.citation?.locator)].filter(Boolean).join(' · '):C.location(b.citation)) : title || type;
      const regions=[['main','Haupttext'],['left','Linker Rand'],['right','Rechter Rand'],['bottom','Unten']];
      const placement=kind==='sheets'&&draft.layout?.template==='classic'?`<label class="rw-placement">Bereich im Layout<select data-region>${regions.map(([k,t])=>`<option value="${k}" ${(b.region||'main')===k?'selected':''}>${t}</option>`).join('')}</select></label>`:'';
      const peers=kind==='sheets'&&draft.layout?.template==='classic'?draft.blocks.filter(x=>(x.region||'main')===(b.region||'main')):draft[kind==='sheets'?'blocks':'items'],position=peers.indexOf(b);
      const move=`<div class="rw-reorder" aria-label="Reihenfolge"><button data-move="-1" ${!position?'disabled':''} title="Nach oben" aria-label="Nach oben">↑</button><button data-move="1" ${position===peers.length-1?'disabled':''} title="Nach unten" aria-label="Nach unten">↓</button></div>`;
      const controls='<button class="rw-danger" data-drop="1">Entfernen</button>';

      const sourceActions=b.type==='source'&&b.reference?'<div class="rw-source-actions"><button data-related-comments>Kommentare hinzufügen</button><button data-explain>Erläuterung hinzufügen</button><button data-source-range>Stelle / Verse ändern</button><button data-source-edition>Ausgabe wechseln</button><button data-translation>Übersetzung / Interlinear</button>'+(b.presentation?'<button data-source-size>Schriftgröße</button>':'')+'<button class="rw-quiet" data-source-open="1">Im Lesetext öffnen ↗</button></div>':'';
      const shownPresentation=b.presentation&&!editing?'<div class="rw-block-preview rw-presentation-preview '+(long&&!expanded?'is-collapsed':'')+'">'+presentationHtml(b)+'</div>'+(long?'<button class="rw-expand" data-expand="1" aria-expanded="'+expanded+'">'+(expanded?'Weniger anzeigen':'Mehr anzeigen')+'</button>':''):'';
      const content = editing && !n ? `<div class="rw-block-fields">${b.type !== 'heading' ? field('Überschrift (optional)', 'title', b.title) : ''}${field(b.type === 'source' ? 'Quellenauszug' : b.type === 'heading' ? 'Überschrift' : 'Text', 'text', b.text, true)}${b.type === 'source' ? '<p class="rw-field-hint">Änderungen am Wortlaut werden im Export als bearbeiteter Auszug gekennzeichnet.</p>' : ''}</div>` : `<div class="rw-block-preview ${long && !expanded ? 'is-collapsed' : ''} ${b.type === 'source' ? 'rw-quote' : ''}"><p class="rw-pre nt" dir="auto">${esc(text) || '<span class="rw-placeholder">Noch kein Text.</span>'}</p></div>${long && !editing ? `<button class="rw-expand" data-expand="1" aria-expanded="${expanded}">${expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}</button>` : ''}`;
      return `<article class="rw-block ${b.type}" data-block="${i}" data-nav-block="${esc(b.id)}" ${spatial?`data-arrange-id="${esc(b.id)}"`:""}><div class="rw-block-head"><button class="rw-drag" draggable="true" data-drag-id="${esc(b.id)}" title="Zum Anordnen ziehen" aria-label="Abschnitt ziehen">⠿</button><span class="rw-block-number">${i + 1}</span><h3 class="${title || b.type === 'source' ? 'nt' : ''}">${esc(blockTitle)}</h3><div class="rw-block-actions">${!n ? `<button data-block-edit="1" aria-expanded="${editing}">${editing ? 'Fertig' : 'Bearbeiten'}</button>` : '<button data-note-edit>Notiz bearbeiten</button>'}${move}${menu('Mehr', controls, 'block-' + i)}</div></div>${placement}${b.type === 'source' && b.citation?.edition ? `<div class="rw-edition nt" title="${esc(b.citation.edition)}">${esc(C.heading(b.citation))}</div>` : ''}${sourceActions}${b.presentation&&!editing?shownPresentation:content}${b.type === 'source' && b.text !== b.originalText ? '<span class="rw-edited">Bearbeiteter Auszug</span>' : ''}${n ? '<small class="rw-field-hint">Verknüpfte Notiz · aktueller Stand</small>' : ''}
      ${b.type === 'source' ? `<div class="rw-source-footer">${sourceActions}<details class="rw-citation"><summary>Quellenangabe</summary><div><p class="rw-field-hint">Ergänze hier fehlende Angaben zur verwendeten Ausgabe.</p>${[['work','Werk'],['edition','Edition'],['translator','Übersetzer'],['editor','Herausgeber'],['publisher','Verlag / Ort'],['year','Jahr'],['locator','Fundstelle'],['url','Quellen-URL']].map(([k,t]) => field(t, 'cite.' + k, b.citation?.[k])).join('')}<details class="rw-provenance"><summary>Übernahmeinformationen</summary><small class="nt">${esc(b.capturedAt)}<br>SHA256: ${esc(b.sourceHash)}</small></details></div></details></div>` : ''}
      ${b.search ? `<details class="rw-search-info"><summary>Aus Suchtreffern übernommen</summary><p class="nt">${esc(b.search.query)}</p><p class="rw-field-hint">Gespeicherter Ausschnitt der Trefferliste · ${esc(b.search.capturedAt)}</p></details>` : ''}</article>`;
    }
    function commentBundle(items,blocks){
      const first=items[0],start=blocks.indexOf(first),last=blocks.indexOf(items.at(-1)),c=first.citation||{},ids=items.map(b=>b.id),peers=kind==='sheets'&&draft.layout?.template==='classic'?blocks.filter(b=>(b.region||'main')===(first.region||'main')):blocks;
      const region=kind==='sheets'&&draft.layout?.template==='classic'?`<label class="rw-placement">Bereich im Layout<select data-bundle-region>${[['main','Haupttext'],['left','Linker Rand'],['right','Rechter Rand'],['bottom','Unten']].map(([k,t])=>`<option value="${k}" ${(first.region||'main')===k?'selected':''}>${t}</option>`).join('')}</select></label>`:'';
      return `<section class="rw-block rw-comment-bundle" data-bundle="${start}" data-nav-block="${esc(first.id)}" data-arrange-id="${esc(first.id)}" data-bundle-last-id="${esc(items.at(-1).id)}"><div class="rw-block-head"><button class="rw-drag" draggable="true" data-drag-id="${esc(first.id)}" data-drag-ids="${esc(JSON.stringify(ids))}" aria-label="Kommentargruppe ziehen">⠿</button><h3 class="nt">${esc(c.work)} ${esc(C.section(c))}</h3><div class="rw-reorder"><button data-bundle-move="-1" ${peers[0]===first?'disabled':''} aria-label="Nach oben">↑</button><button data-bundle-move="1" ${peers.at(-1)===items.at(-1)?'disabled':''} aria-label="Nach unten">↓</button></div></div>${region}<p class="rw-edition nt" title="${esc(C.full(c))}">${esc(C.edition(c))} · ${items.length} Abschnitte</p><div class="rw-bundle-text">${items.map(b=>`<div class="rw-comment-fragment"><small class="nt">${esc(C.locator(b.citation?.locator))}</small><p class="rw-pre nt" dir="auto">${esc(b.text)}</p>${b.text!==b.originalText?'<small>Bearbeiteter Auszug</small>':''}</div>`).join('')}</div><details class="rw-bundle-details"><summary>Einzelne Abschnitte bearbeiten</summary>${items.map(b=>blockEditor(b,blocks.indexOf(b))).join('')}</details><div class="rw-toolbar"><button class="rw-danger" data-remove-ids="${esc(JSON.stringify(ids))}">Kommentargruppe entfernen</button></div></section>`;
    }
    async function sourceSizes(source){
      const pr=source.presentation,sheetId=draft.id;if(!pr)return;const region=source.region||'main',l=draft.layout||{},size=region==='main'?(l.mainSize||18):region==='bottom'?(l.bottomSize||10):(l.sideSize||10);
      const d=await modal('Schriftgröße',slider('Dieser Text (pt)','rwSizeSource',pr.sourceSize||size,8,36,.5)+slider('Gewählte Ausgaben (pt)','rwSizeTranslation',pr.translationSize||Math.min(size,12),8,36,.5),'Übernehmen',bindSliders);if(!d)return;
      if(draft?.id!==sheetId||!draft[kind==='sheets'?'blocks':'items'].includes(source)||source.presentation!==pr){closeModal(d);throw Error('Der Text wurde inzwischen geändert. Bitte erneut öffnen.');}
      const sizes={sourceSize:d.querySelector('#rwSizeSource').valueAsNumber,translationSize:d.querySelector('#rwSizeTranslation').valueAsNumber};source.presentation={...pr,...sizes,...(pr.additional?.length?{additional:pr.additional.map(pair=>({...pair,...sizes}))}:{})};closeModal(d);changed();render();
    }
    function presentationHtml(b){return window.ResearchPresentation.html(b,esc);}
    function arrangement(blocks){
      const classic=draft.layout?.template==='classic',regions=classic?[['left','Linker Rand'],['main','Haupttext'],['right','Rechter Rand'],['bottom','Unten']]:[['main','Reihenfolge']],width=draft.layout?.mainWidth||44;
      const groups=G.runs(blocks);
      return '<p class="rw-field-hint">'+(classic?'Bearbeite die Texte direkt in ihren Spalten. Ziehe Karten am Griff ⠿ in einen anderen Bereich oder ändere ihre Reihenfolge mit den Pfeilen.':'Bearbeite die Texte direkt auf ihren Karten. Ziehe am Griff ⠿, um ihre Reihenfolge zu ändern.')+'</p><div class="rw-arrangement '+(classic?'classic':'')+'" style="--rw-main-col:'+width+'fr;--rw-side-col:'+((100-width)/2)+'fr">'+regions.map(([r,t])=>`<section class="rw-drop-region ${r}" data-drop-region="${r}" aria-label="${t}">${classic?`<h3 class="rw-region-title">${t}</h3>`:''}${groups.filter(g=>!classic||(g.blocks[0].region||'main')===r).map(g=>g.blocks.length>1?commentBundle(g.blocks,blocks):blockEditor(g.blocks[0],blocks.indexOf(g.blocks[0]),true)).join('')}<p class="rw-drop-hint">${blocks.length?'Hier ablegen':'Hier eine Quelle, einen Text oder eine Notiz hinzufügen oder ablegen.'}</p></section>`).join('')+'</div>';
    }
    function moveBlocks(ids,step){
      const blocks=draft[kind==='sheets'?'blocks':'items'],first=blocks.find(b=>b.id===ids[0]);if(!first)return false;
      const peers=kind==='sheets'&&draft.layout?.template==='classic'?blocks.filter(b=>(b.region||'main')===(first.region||'main')):blocks;
      const groups=ids.length>1?G.runs(blocks).filter(g=>peers.includes(g.blocks[0])).map(g=>g.blocks):peers.map(b=>[b]),at=groups.findIndex(g=>g.some(b=>b.id===ids[0])),neighbor=at+step;
      if(at<0||neighbor<0||neighbor>=groups.length)return false;
      const before=step<0?groups[neighbor][0].id:groups[neighbor+1]?.[0]?.id||null;
      return window.ResearchArrange.moveMany(blocks,ids,first.region||'main',before);
    }
    let dragging=null;
    function bindDragging(){
      const clear=()=>root.querySelectorAll('.rw-drop-before,.rw-drop-after,.rw-drop-active').forEach(e=>e.classList.remove('rw-drop-before','rw-drop-after','rw-drop-active'));
      root.querySelectorAll('[data-drag-id]').forEach(e=>{e.ondragstart=ev=>{dragging={id:e.dataset.dragId,ids:e.dataset.dragIds?JSON.parse(e.dataset.dragIds):[e.dataset.dragId],sheet:draft.id};ev.dataTransfer.setData('application/x-safran-block',dragging.id);ev.dataTransfer.effectAllowed='move';};e.ondragend=()=>{dragging=null;clear();};});
      const target=ev=>ev.target.closest('[data-arrange-id]')||ev.target.closest('[data-block],.rw-drop-region');
      root.ondragover=ev=>{if(!dragging||dragging.sheet!==draft?.id)return;const t=target(ev);if(!t)return;ev.preventDefault();ev.dataTransfer.dropEffect='move';clear();t.classList.add(t.matches('.rw-drop-region')?'rw-drop-active':ev.clientY<t.getBoundingClientRect().top+t.getBoundingClientRect().height/2?'rw-drop-before':'rw-drop-after');};
      root.ondrop=ev=>{if(!dragging||dragging.sheet!==draft?.id)return;const t=target(ev);if(!t)return;ev.preventDefault();const blocks=draft[kind==='sheets'?'blocks':'items'],id=dragging.id,source=blocks.find(b=>b.id===id),zone=t.closest('.rw-drop-region'),region=zone&&draft.layout?.template==='classic'?zone.dataset.dropRegion:source?.region||'main';let before=null;
        const targetId=t.dataset.arrangeId||blocks[+t.dataset.block]?.id;
        if(dragging.ids.includes(targetId)){dragging=null;clear();return;}
        if(targetId){const after=ev.clientY>=t.getBoundingClientRect().top+t.getBoundingClientRect().height/2;before=targetId;if(after){const candidates=zone?[...zone.querySelectorAll('[data-arrange-id]')].map(e=>e.dataset.arrangeId):blocks.map(b=>b.id);before=candidates[candidates.indexOf(zone?targetId:t.dataset.bundleLastId||targetId)+1]||null;}}
        if(window.ResearchArrange.moveMany(blocks,dragging.ids,region,before)){changed();render();}dragging=null;clear();};
    }
    function editionChoices(editions,selected,name,multiple=false){
      const labels={he:'Hebräisch',en:'Englisch',de:'Deutsch',other:'Andere'};
      const kind=e=>['he','en','de'].includes(e.kind)?e.kind:({he:'he',Hebrew:'he',en:'en',English:'en',de:'de',German:'de'})[e.language]||'other';
      return '<div class="rw-edition-choices">'+['he','en','de','other'].map(k=>{const entries=editions.filter(e=>kind(e)===k);if(!entries.length)return '';return `<section><h3>${labels[k]}</h3>${entries.map(e=>{const p=host.portraitOf?.(e.versionTitle);return `<label class="rw-edition-choice"><input type="${multiple?'checkbox':'radio'}" name="${name}" value="${esc(e.rel)}" ${(multiple?selected.includes(e.rel):e.rel===selected)?'checked':''}>${p?`<img class="vpic" src="portraits/${encodeURIComponent(p.img)}" alt="" loading="lazy">`:'<span class="rw-edition-icon" aria-hidden="true">▤</span>'}<span><b class="nt" dir="auto">${esc(e.versionTitle==='merged'?I18N.t('Standardtext')+' (merged)':e.versionTitle)}</b><small>${e.own?'<span class="badge own">eigen</span>':''}${e.morphology?'<span class="vmorph">✓ Morphologie</span>':''}${e.interlinear?'<span class="vil" title="Zuordnungsdaten vorhanden; Textstand wird bei Verwendung geprüft">↔ Interlinear</span>':''}</small></span></label>`;}).join('')}</section>`;}).join('')+'</div>';
    }
    async function sourceRangePicker(source){
      const sheetId=draft.id,savedKind=kind,data=await A.sections(source.reference.rel),d=document.createElement('dialog');d.className='rw-dialog rw-range-dialog';
      d.innerHTML=`<form><h2>Stelle / Verse ändern</h2><p class="nt">${esc(C.heading(source.citation))}</p><label>Abschnitt<select id="rwRangeSection">${data.sections.map(s=>`<option value="${esc(JSON.stringify(s.path))}" ${JSON.stringify(s.path)===JSON.stringify(source.reference.sectionPath)?'selected':''}>${esc(s.label)}</option>`).join('')}</select></label><label>Verse / Zeilen<input id="rwRangeLabels" value="${esc(C.ranges(source.reference.labels))}" placeholder="z. B. 1–10 oder 2,5,10"></label><p class="rw-field-hint">Leer übernimmt den ganzen Abschnitt. Bereiche und einzelne Verse können kombiniert werden, etwa 2,5–7,10. Übersetzungen und Interlinear bleiben zugeordnet. Eigene Änderungen am Quellentext werden ersetzt.</p><button type="button" id="rwRangeFind">Vorschau anzeigen</button><p class="rw-error" role="alert"></p><div id="rwRangePreview" class="rw-source-preview"></div><div class="rw-toolbar"><button type="submit" class="primary" disabled>Übernehmen</button><button type="button" data-range-cancel>Abbrechen</button></div></form>`;
      document.body.append(d);
      await new Promise(resolve=>{let closed=false,generation=0,loaded=null;const section=d.querySelector('#rwRangeSection'),labels=d.querySelector('#rwRangeLabels'),preview=d.querySelector('#rwRangePreview'),error=d.querySelector('.rw-error'),submit=d.querySelector('[type=submit]'),find=d.querySelector('#rwRangeFind');
        const finish=()=>{if(closed)return;closed=true;generation++;d.close();d.remove();resolve();};
        function invalidate(){generation++;loaded=null;submit.disabled=true;error.textContent='';preview.innerHTML='';}
        async function load(){invalidate();const g=generation;find.disabled=true;try{const result=await A.sourceRangePreview({source:copy(source),sectionPath:JSON.parse(section.value),labels:labels.value});if(closed||g!==generation)return;loaded=result;preview.innerHTML=`<h3 class="nt">${esc(C.location(result.citation))}</h3>`+(result.presentation?presentationHtml(result):`<p class="rw-pre nt" dir="auto">${esc(result.text)}</p>`);submit.disabled=false;}catch(err){if(!closed&&g===generation)error.textContent=String(err.message||err).replace(/^Error invoking remote method '[^']*': (Error: )?/,'');}finally{if(!closed&&g===generation)find.disabled=false;}}
        labels.oninput=()=>{invalidate();find.disabled=false;};section.onchange=()=>{labels.value='';void load();};find.onclick=()=>void load();d.onclose=finish;d.querySelector('[data-range-cancel]').onclick=finish;
        d.querySelector('form').onsubmit=e=>{e.preventDefault();if(!loaded||submit.disabled)return;try{if(draft?.id!==sheetId||kind!==savedKind)throw Error('Das Quellenblatt wurde gewechselt. Bitte erneut auswählen.');const blocks=draft[kind==='sheets'?'blocks':'items'],at=blocks.findIndex(b=>b.id===source.id);if(at<0||blocks[at].sourceHash!==source.sourceHash||blocks[at].text!==source.text)throw Error('Die Quellenkarte wurde inzwischen geändert. Bitte erneut öffnen.');blocks.splice(at,1,copy(loaded));changed();render();finish();}catch(err){error.textContent=String(err.message||err);}};
        d.showModal();void load();
      });
    }
    async function sourceEditionPicker(source){
      const sheetId=draft.id,savedKind=kind,editions=await A.workEditions(copy(source.reference)),d=document.createElement('dialog');d.className='rw-dialog rw-edition-dialog';
      d.innerHTML='<form><h2>Ausgabe des Haupttextes wählen</h2><p class="nt">'+esc(source.reference.label)+'</p><p class="rw-field-hint">Der Wechsel übernimmt den Originaltext der gewählten Ausgabe. Bearbeitungen am Auszug und eine vorhandene Übersetzungsanzeige werden ersetzt. Verknüpfte Notizen behalten ihre bisherigen Quellenangaben.</p>'+editionChoices(editions,source.reference.rel,'rwMainEdition')+'<p class="rw-error" role="alert"></p><div class="rw-source-preview" id="rwMainEditionPreview"></div><div class="rw-toolbar"><button type="submit" class="primary" disabled>Diese Ausgabe übernehmen</button><button type="button" data-cancel>Abbrechen</button></div></form>';
      document.body.append(d);
      await new Promise(resolve=>{let closed=false,generation=0,items=[];const submit=d.querySelector('[type=submit]'),error=d.querySelector('.rw-error'),preview=d.querySelector('#rwMainEditionPreview');
        const finish=()=>{if(closed)return;closed=true;generation++;d.close();d.remove();resolve();};d.onclose=finish;d.querySelector('[data-cancel]').onclick=finish;
        async function load(){const g=++generation,rel=d.querySelector('[name=rwMainEdition]:checked')?.value;submit.disabled=true;items=[];error.textContent='';preview.innerHTML='';
          try{const result=await A.sourceEditionPreview({source:copy(source),rel});if(closed||g!==generation)return;items=result;preview.innerHTML=items.map(b=>`<article><h3 class="nt">${esc(b.citation.edition)} · ${esc(b.citation.locator)}</h3><p class="nt" dir="auto">${esc(b.text)}</p></article>`).join('');submit.disabled=!items.length;}catch(e){if(!closed&&g===generation)error.textContent=String(e.message||e).replace(/^Error invoking remote method '[^']*': (Error: )?/,'');}}
        d.querySelectorAll('[name=rwMainEdition]').forEach(e=>e.onchange=()=>void load());
        d.querySelector('form').onsubmit=e=>{e.preventDefault();if(submit.disabled)return;if(draft?.id!==sheetId||kind!==savedKind){error.textContent='Das Quellenblatt wurde gewechselt. Bitte erneut auswählen.';return;}const blocks=draft[kind==='sheets'?'blocks':'items'],at=blocks.findIndex(b=>b.id===source.id);if(at<0){error.textContent='Die Quellenkarte wurde entfernt.';return;}
          try{localStorage.setItem(lastEditionKey,JSON.stringify(editions.find(e=>e.rel===d.querySelector('[name=rwMainEdition]:checked')?.value)));}catch{}
          items.forEach((b,i)=>{b.region=source.region||'main';if(!i)b.id=source.id;});blocks.splice(at,1,...items);editingBlocks.delete(source.id);changed();render();finish();};
        d.showModal();void load();
      });
    }
    async function translationPicker(source){
      const sheetId=draft.id,savedKind=kind,editions=await A.translationEditions(copy(source.reference));
      const configuredSize=Number(draft.layout?.template==='classic'?draft.layout[(source.region||'main')==='main'?'mainSize':source.region==='bottom'?'bottomSize':'sideSize']:12);
      const regionSize=Number.isFinite(configuredSize)&&configuredSize>=8&&configuredSize<=36?configuredSize:18;
      const sourceSize=source.presentation?.sourceSize||regionSize,translationSize=source.presentation?.translationSize||Math.min(sourceSize,12);
      const d=document.createElement('dialog');d.className='rw-dialog rw-edition-dialog rw-pair-dialog';
      d.innerHTML='<form><h2>Übersetzung anzeigen</h2>'+`<p class="nt">${esc(source.reference.label)}</p><select id="rwTranslationEdition" hidden aria-hidden="true" tabindex="-1">${editions.map(e=>`<option value="${esc(e.rel)}" class="nt" ${source.presentation?.companion.reference.rel===e.rel?'selected':''}>${esc(e.versionTitle)} · ${esc(e.language)}</option>`).join('')}</select><p class="rw-field-hint">Bis zu 8 Ausgaben auswählen: Nebeneinander erscheinen sie als zusätzliche Spalten. Interlinear wird je Ausgabe untereinander angezeigt.</p>${editionChoices(editions,source.presentation?[source.presentation,...(source.presentation.additional||[])].map(p=>p.companion.reference.rel):[window.ResearchEditions.preferred(editions)?.rel],'rwPairedEdition',true)}<div class="rw-pair-tuning"><div class="rw-pair-settings"><label>Anzeige<select id="rwTranslationMode"><option value="parallel">Nebeneinander</option><option value="interlinear" ${source.presentation?.mode==='interlinear'?'selected':''}>Interlinear (vorhandene Wortzuordnung)</option><option value="none">Nur dieser Text</option></select></label><div class="rw-pair-fonts">${slider('Dieser Text (pt)','rwPairSourceSize',sourceSize,8,36,.5)}${slider('Gewählte Ausgaben (pt)','rwPairTranslationSize',translationSize,8,36,.5)}</div><p class="rw-field-hint">Interlinear erfordert passende Original- und Übersetzungsausgaben. Zusätze erscheinen mit +. Änderungen am Auszug müssen vorher zurückgenommen werden.</p></div><section class="rw-pair-live" aria-label="Live-Vorschau"><h3>Live-Vorschau</h3><p class="rw-pair-context nt">${esc(source.reference.label)}</p><p id="rwPairPreviewStatus" role="status" aria-live="polite"></p><div id="rwPairPreview" class="rw-pair-sample" aria-busy="true"></div></section></div>`+'<p class="rw-error" role="alert"></p><div class="rw-toolbar"><button type="submit" class="primary" disabled>Übernehmen</button><button type="button" data-translation-cancel>Abbrechen</button></div></form>';
      document.body.append(d);
      await new Promise(resolve=>{
        let closed=false,generation=0,loaded=null,loadedKey='';const cache=new Map();
        const submit=d.querySelector('[type=submit]'),error=d.querySelector('.rw-error'),sample=d.querySelector('#rwPairPreview'),info=d.querySelector('#rwPairPreviewStatus');
        const mode=d.querySelector('#rwTranslationMode'),edition=d.querySelector('#rwTranslationEdition'),first=d.querySelector('#rwPairSourceSize'),second=d.querySelector('#rwPairTranslationSize');
        const selectedRels=()=>[...d.querySelectorAll('[name=rwPairedEdition]:checked')].map(e=>e.value);
        const key=()=>JSON.stringify([mode.value,selectedRels()]);
        const sizes=()=>({sourceSize:first.valueAsNumber,translationSize:second.valueAsNumber});
        const finish=()=>{if(closed)return;closed=true;generation++;d.close();d.remove();resolve();};
        function renderSample(){
          if(closed||loadedKey!==key())return;
          first.disabled=second.disabled=mode.value==='none';
          if(mode.value==='none'){
            sample.innerHTML=`<p class="nt rw-pre" dir="auto" style="font-size:${regionSize}pt">${esc(source.text.split('\n').slice(0,3).join('\n'))}</p>`;
            const lines=source.text.split('\n').length;info.textContent=I18N.t('Nur dieser Text · Schriftgröße aus dem Layout.')+(lines>3?' '+I18N.t('Erste {} von {} Zeilen.',3,lines):'');
          }else{
            const samplePair=p=>({...p,...sizes(),rows:p.rows.slice(0,3)}),preview={...samplePair(loaded),...(loaded.additional?.length?{additional:loaded.additional.map(samplePair)}:{}),...(loaded.originalInterlinear?.length?{originalInterlinear:loaded.originalInterlinear.map(samplePair)}:{})};
            sample.innerHTML=presentationHtml({...source,presentation:preview});
            info.textContent=loaded.rows.length>3?I18N.t('Erste {} von {} Zeilen · Schriftgrößen wie im Export.',3,loaded.rows.length):I18N.t('Schriftgrößen wie im Export.');
          }
          sample.setAttribute('aria-busy','false');
        }
        async function load(){
          const g=++generation,wanted=key(),selectedMode=mode.value;loaded=null;loadedKey='';submit.disabled=true;sample.innerHTML='';sample.setAttribute('aria-busy','true');error.textContent='';info.textContent='Vorschau wird geladen …';
          first.disabled=second.disabled=selectedMode==='none';
          try{
            const rels=selectedRels();if(selectedMode!=='none'&&(!rels.length||rels.length>8))throw Error('Bitte 1 bis 8 Übersetzungen auswählen.');
            const pairs=[];if(selectedMode!=='none')for(const selected of rels){const k=JSON.stringify([selectedMode,selected]);let pair=cache.get(k);if(!pair){pair=await A.translationPreview({source:copy(source),rel:selected,mode:selectedMode});cache.set(k,pair);}pairs.push(pair);}
            const result=pairs.length?{...pairs[0],...(pairs.length>1?{additional:pairs.slice(1)}:{}),...(selectedMode==='parallel'&&source.presentation?.originalInterlinear?{originalInterlinear:copy(source.presentation.originalInterlinear)}:{}),...(source.presentation?.readerHeadings?{readerHeadings:copy(source.presentation.readerHeadings)}:{})}:null;
            if(closed||g!==generation||wanted!==key())return false;
            loaded=result;loadedKey=wanted;renderSample();submit.disabled=false;return true;
          }catch(err){if(!closed&&g===generation&&wanted===key()){error.textContent=String(err.message||err).replace(/^Error invoking remote method '[^']*': (Error: )?/,'');info.textContent='';sample.setAttribute('aria-busy','false');}return false;}
        }
        d.onclose=finish;d.querySelector('[data-translation-cancel]').onclick=finish;
        bindSliders(d);
        for(const control of [first,second]){const readout=control.oninput;control.oninput=()=>{readout();renderSample();};}
        mode.onchange=()=>void load();
        edition.onchange=()=>{d.querySelectorAll('[name=rwPairedEdition]').forEach(e=>e.checked=e.value===edition.value);void load();};
        d.querySelectorAll('[name=rwPairedEdition]').forEach(e=>e.onchange=()=>{edition.value=e.value;void load();});
        d.querySelector('form').onsubmit=async e=>{
          e.preventDefault();if(submit.disabled)return;const wanted=key();
          if(loadedKey!==wanted&&!(await load()))return;
          if(closed||wanted!==key()||loadedKey!==wanted)return;
          try{
            if(draft?.id!==sheetId||kind!==savedKind)throw Error('Das Quellenblatt wurde gewechselt. Bitte erneut auswählen.');
            const current=draft[kind==='sheets'?'blocks':'items'].find(b=>b.id===source.id);if(!current)throw Error('Die Quellenkarte wurde entfernt.');
            if(current.sourceHash!==source.sourceHash||current.text!==source.text||current.reference?.rel!==source.reference.rel)throw Error('Die Quellenkarte wurde inzwischen geändert. Bitte erneut öffnen.');
            const tuned=p=>({...copy(p),...sizes()});current.presentation=mode.value==='none'?null:{...tuned(loaded),...(loaded.additional?.length?{additional:loaded.additional.map(tuned)}:{})};changed();render();finish();
          }catch(err){error.textContent=String(err.message||err);}
        };
        d.showModal();void load();
      });
    }
    function updatePagePreview(frame){const request=++previewRequest;void A.sheetPreview(copy(draft)).then(html=>{if(frame.isConnected&&request===previewRequest)frame.srcdoc=html;}).catch(e=>{if(frame.isConnected&&request===previewRequest)status(e.message,true);});}
    function bindEditor() {
      bindSliders(root);
      root.querySelectorAll('#rwEditor > .rw-editorfields > label [data-f], #rwEditor .rw-document-meta [data-f]').forEach(el => el.oninput = () => { draft[el.dataset.f] = ['tags','topics'].includes(el.dataset.f) ? split(el.value) : el.value; changed('field:'+el.dataset.f); });
      root.querySelectorAll('[data-layout]').forEach(el=>el.onchange=()=>{
        const numeric=['range','number'].includes(el.type),key=el.dataset.layout,value=el.type==='checkbox'?el.checked:numeric?Number(el.value):el.value;
        if(numeric&&(!Number.isFinite(value)||value<Number(el.min)||value>Number(el.max))){el.reportValidity();return;}
        draft.layout={template:'linear',orientation:'portrait',mainWidth:44,mainSize:18,sideSize:10,bottomSize:10,...draft.layout,[key]:value};
        if(key==='template'&&value==='classic')draft.layout.orientation='landscape';
        changed();if(numeric){el.oninput?.();const frame=root.querySelector('#rwPagePreview');if(frame)updatePagePreview(frame);const board=root.querySelector('.rw-arrangement');if(board&&key==='mainWidth'){board.style.setProperty('--rw-main-col',value+'fr');board.style.setProperty('--rw-side-col',((100-value)/2)+'fr');}return;}render();const d=root.querySelector('[data-menu=layout]');if(d)d.open=true;
      });
      root.querySelectorAll('[data-bundle]').forEach(el=>{const blocks=draft[kind==='sheets'?'blocks':'items'],g=G.runs(blocks).find(g=>blocks.indexOf(g.blocks[0])===+el.dataset.bundle);if(!g)return;
        const region=el.querySelector('[data-bundle-region]');if(region)region.onchange=()=>{g.blocks.forEach(b=>b.region=region.value);changed();render();};
        el.querySelectorAll('[data-bundle-move]').forEach(b=>b.onclick=()=>{if(moveBlocks(g.blocks.map(b=>b.id),+b.dataset.bundleMove)){changed();render();}});
      });
      root.querySelectorAll('[data-remove-ids]').forEach(el=>el.onclick=()=>{const ids=new Set(JSON.parse(el.dataset.removeIds)),blocks=draft[kind==='sheets'?'blocks':'items'];blocks.splice(0,blocks.length,...blocks.filter(b=>!ids.has(b.id)));ids.forEach(id=>{editingBlocks.delete(id);expandedBlocks.delete(id);});changed();render();});
      bindDragging();
      const frame=root.querySelector('#rwPagePreview');
      if(frame){const fit=()=>{const body=frame.contentDocument?.body;if(body?.offsetWidth)frame.contentDocument.documentElement.style.zoom=String((frame.clientWidth-2)/body.offsetWidth);};frame.onload=()=>{fit();window.ResearchFlow.watch(frame.contentDocument);};pageObserver=new ResizeObserver(fit);pageObserver.observe(frame);updatePagePreview(frame);}
      const np = root.querySelector('#rwNoteProject'); if (np) np.onchange = () => { draft.projectId = np.value; changed(); };
      root.querySelectorAll('[data-block]').forEach(article => {
        const i = +article.dataset.block, blocks = draft[kind === 'sheets' ? 'blocks' : 'items'], b = blocks[i];
        article.querySelectorAll('[data-f]').forEach(el => el.oninput = () => { if (el.dataset.f.startsWith('cite.')) { b.citation ||= {}; b.citation[el.dataset.f.slice(5)] = el.value; } else {b[el.dataset.f] = el.value;if(el.dataset.f==='text')b.presentation=null;} changed(b.id+':'+el.dataset.f); });
        article.querySelectorAll('[data-related-comments]').forEach(button=>button.onclick=()=>run(()=>relatedComments(b)));
        article.querySelectorAll('[data-source-range]').forEach(button=>button.onclick=()=>run(()=>sourceRangePicker(b)));
        article.querySelectorAll('[data-source-edition]').forEach(button=>button.onclick=()=>run(()=>sourceEditionPicker(b)));
        article.querySelectorAll('[data-translation]').forEach(button=>button.onclick=()=>run(()=>translationPicker(b)));
        article.querySelectorAll('[data-explain]').forEach(button=>button.onclick=()=>run(()=>editExplanation(b)));
        const editNote=article.querySelector('[data-note-edit]');if(editNote)editNote.onclick=()=>run(()=>editExplanation(b,true));
        const region=article.querySelector('[data-region]');if(region)region.onchange=()=>{b.region=region.value;changed();render();};
        const edit = article.querySelector('[data-block-edit]');
        if (edit) edit.onclick = () => { editingBlocks.has(b.id) ? editingBlocks.delete(b.id) : editingBlocks.add(b.id); render(); const target = root.querySelector(`[data-block="${i}"] ${editingBlocks.has(b.id) ? 'textarea' : '[data-block-edit]'}`); target?.focus({preventScroll:true}); };
        const expand = article.querySelector('[data-expand]'); if (expand) expand.onclick = () => { expandedBlocks.has(b.id) ? expandedBlocks.delete(b.id) : expandedBlocks.add(b.id); render(); root.querySelector(`[data-block="${i}"] [data-expand]`)?.focus({preventScroll:true}); };
        article.querySelectorAll('[data-move]').forEach(el=>el.onclick=()=>{if(moveBlocks([b.id],+el.dataset.move)){changed();render();root.querySelector(`[data-nav-block="${CSS.escape(b.id)}"] [data-block-edit]`)?.focus({preventScroll:true});}});
        article.querySelector('[data-drop]').onclick = () => { blocks.splice(i,1); editingBlocks.delete(b.id); changed(); render(); };
        article.querySelectorAll('[data-source-open]').forEach(button=>button.onclick=()=>run(()=>host.openRef(b.reference)));
        article.querySelectorAll('[data-source-size]').forEach(button=>button.onclick=()=>run(()=>sourceSizes(b)));
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
    async function chooseNote(){
      await refresh();
      const D=window.NotesWorkspaceData,items=allNotes();
      let selected=-1;
      const count=id=>items.filter(n=>(n.projectId||'')===id).length;
      const books=[...state.projects.filter(p=>!p.archived||p.id===projectId).map(p=>({id:p.id,title:p.title})),{id:'',title:'Ohne Notizbuch'}];
      const d=await modal('Notiz verknüpfen','<div class="rw-note-picker-filters"><label>Notizbuch<select id="rwNoteBook">'+books.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===projectId?'selected':'')+'>'+esc(p.title)+' ('+count(p.id)+')</option>').join('')+'</select></label><label>Suche<input id="rwNoteSearch" type="search" placeholder="Titel, Fundstelle oder Notiztext …"></label></div><p id="rwNoteCount" role="status"></p><div id="rwNoteChoices" class="rw-note-choices" role="radiogroup" aria-label="Notiz auswählen"></div>','Verknüpfen',dlg=>{
        const search=dlg.querySelector('#rwNoteSearch'),book=dlg.querySelector('#rwNoteBook'),list=dlg.querySelector('#rwNoteChoices'),submit=dlg.querySelector('[type=submit]');
        function render(){
          const found=D.filter(items.filter(n=>(n.projectId||'')===book.value),{query:search.value},state.projects);if(!found.includes(items[selected]))selected=found.length?items.indexOf(found[0]):-1;
          dlg.querySelector('#rwNoteCount').textContent=found.length+' '+(found.length===1?'Notiz':'Notizen');submit.disabled=selected<0;
          list.innerHTML=found.map(n=>{const i=items.indexOf(n),title=D.title(n),refs=D.refs(n).map(D.referenceLabel).join(' · ');return '<label class="rw-note-choice"><input type="radio" name="rwLinkedNote" value="'+i+'" '+(i===selected?'checked':'')+'><span><b>'+esc(title)+'</b>'+(refs&&refs!==title?'<small>'+esc(refs)+'</small>':'')+'<span class="rw-note-snippet">'+esc(D.excerpt(n).slice(0,240)||'Lesezeichen ohne eigenen Notiztext')+'</span></span></label>';}).join('')||'<p class="muted">'+(search.value?'Keine passenden Notizen. Ändere die Suche.':'Dieses Notizbuch enthält noch keine gespeicherten Notizen.')+'</p>';
        }
        search.oninput=render;book.onchange=()=>{selected=-1;render();};list.onchange=e=>{if(e.target.matches('[name=rwLinkedNote]'))selected=+e.target.value;};render();
      });
      if(!d)return null;const note=items[selected];closeModal(d);return note||null;
    }
    function projectSources(){return [...state.sheets.filter(s=>s.projectId===projectId).flatMap(s=>s.blocks),...state.collections.filter(c=>c.projectId===projectId).flatMap(c=>c.items)].filter(b=>b.reference);}
    async function action(a) {
      if(a==='undo'||a==='redo'){restoreHistory(a);return;}
      if(a==='pagePreview'){pagePreview=!pagePreview;render();return;}
      if(a==='projectNew'||a==='projectEdit') {
        if(!leave())return;const old=a==='projectEdit'?currentProject():null;
        const d=await modal(old?'Projekt bearbeiten':'Neues Rechercheprojekt',field('Titel','title',old?.title)+field('Beschreibung','description',old?.description,true)+field('Schlagwörter (Komma getrennt)','tags',old?.tags?.join(', '))+(old?`<label><input type="checkbox" id="rwArchived" ${old.archived?'checked':''}> Archiviert</label>`:''),'Speichern');if(!d)return;
        const val=k=>d.querySelector(`[data-f="${k}"]`).value,rec={...old,id:old?.id||uid(),title:val('title'),description:val('description'),tags:split(val('tags')),archived:!!d.querySelector('#rwArchived')?.checked};
        if(!rec.title.trim()){d.querySelector('.rw-error').textContent='Bitte einen Titel eingeben.';throw Error('Projekt braucht einen Titel.');}
        closeModal(d);state=await A.put('projects',rec,old?.version||0);projectId=rec.id;draft=null;dirty=false;persist();render();return;
      }
      if(a==='import'){if(!leave())return;const r=await A.import();if(r.cancelled)return;state=r.state;projectId=state.projects.at(-1)?.id||projectId;draft=null;dirty=false;persist();message='Projekt als neue Kopie importiert.';render();return;}
      if(a==='openNotebook'){if(!leave())return;draft=null;dirty=false;persist();await host.openNotebook(projectId);return;}
      if(a==='new'){if(!leave())return;if(kind==='notes')noteScope='project';editingBlocks.clear();expandedBlocks.clear();draft={id:uid(),projectId,title:kind==='sheets'?'Neues Quellenblatt':kind==='collections'?'Neue Sammlung':'Neue Notiz',description:'',tags:[],topics:[],refs:[],note:'',blocks:[],items:[],version:0};legacy=false;dirty=true;persist();render();return;}
      if(a==='save'){
        history.breakGroup();
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
      if(a==='reload'){if(!leave())return;historyKey='';const id=draft?.id;await refresh();draft=copy((legacy?state.legacyNotes:state[kind]).find(x=>x.id===id)||null);dirty=false;persist();messageError=false;message='Aktueller Stand geladen.';render();return;}
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
        const n=await chooseNote();if(!n)return;
        appendNote(n);
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
      const sheetId=draft.id;let data=await A.relatedComments(copy(source.reference));status('');const remoteFilter=data.limited;
      const dlg=document.createElement('dialog');dlg.className='rw-dialog rw-comments-dialog';
      dlg.innerHTML=`<h2>Kommentare hinzufügen</h2><p class="nt">${esc(source.reference.label)}</p><div class="rw-comment-filters"><label>Filtern<input id="rwCommentFilter" type="search" placeholder="Kommentator oder Ausgabe"></label><label>Sprache<select id="rwCommentLanguage"><option value="">Alle Sprachen</option>${(data.languages||[...new Set(data.items.map(x=>x.language))]).map(l=>`<option value="${esc(l)}">${esc(languageLabel(l))}</option>`).join('')}</select></label></div><p class="rw-field-hint">Wähle die Kommentare und die Ausgabe, die du übernehmen möchtest.</p><div class="rw-toolbar"><button id="rwCommentsAll">Alle angezeigten auswählen</button><button id="rwCommentsNone">Angezeigte abwählen</button></div><p class="rw-comment-status" role="status"></p><div class="rw-comment-list"></div><div class="rw-source-footer"><button id="rwCommentsAdd" class="primary" disabled>Auswahl hinzufügen</button><button id="rwCommentsCancel">Abbrechen</button></div>`;
      document.body.append(dlg);const list=dlg.querySelector('.rw-comment-list'),selected=new Map(),itemKey=item=>JSON.stringify([item.rel,item.ref]),info=dlg.querySelector('.rw-comment-status'),add=dlg.querySelector('#rwCommentsAdd');
      const warnings=()=>[...(data.warnings||[]),...(data.limited?[I18N.t('Es werden höchstens {} Treffer angezeigt. Filtere nach Kommentator oder Sprache, um weitere Kommentare zu finden.',data.limit||200)]:[]),...(data.unavailable?[data.unavailable+' verknüpfte Kommentare sind nicht lokal verfügbar.']:[])];
      let visible=[],groups=[],filterTimer,filterRequest=0,filterLoading=false,filterClosed=false;
      function renderList(){const q=dlg.querySelector('#rwCommentFilter').value.toLowerCase(),lang=dlg.querySelector('#rwCommentLanguage').value;
        visible=data.items.map((item,i)=>({item,i})).filter(({item})=>(!lang||item.language===lang)&&[item.title,item.edition,item.ref].join(' ').toLowerCase().includes(q));
        groups=G.selections(visible.map(x=>x.item)).map(g=>({...g,items:g.items.map(x=>visible[x.i])}));
        list.innerHTML=groups.map((g,n)=>{const good=g.items.filter(x=>!x.item.error),bad=g.items.length-good.length;return `<section class="rw-comment-set"><label class="rw-comment-choice rw-comment-set-head"><input type="checkbox" data-comment-group="${n}" ${good.length?'':'disabled'}><span><b class="nt">${esc(g.title)}</b><small class="nt">${esc(g.edition)} · ${esc(languageLabel(g.language))}</small><small>${good.length} verfügbar${bad?' · '+bad+' nicht verfügbar':''} · alle Abschnitte auswählen</small></span></label><details><summary>Einzelne Abschnitte (${g.items.length})</summary>${g.items.map(({item,i})=>`<article><label class="rw-comment-choice"><input type="checkbox" data-comment="${i}" ${selected.has(itemKey(item))?'checked':''} ${item.error?'disabled':''}><span><b class="nt">${esc(item.ref)}</b></span></label>${item.error?`<p class="rw-error">${esc(item.error)}</p>`:`<details><summary>Text ansehen</summary><p class="nt" dir="auto">${esc(item.block.text)}</p></details>`}</article>`).join('')}</details></section>`;}).join('')||'<p>Keine passenden lokalen Kommentare vorhanden.</p>';
        list.querySelectorAll('[data-comment]').forEach(c=>c.onchange=()=>{const item=data.items[+c.dataset.comment];c.checked?selected.set(itemKey(item),item.block):selected.delete(itemKey(item));update();});
        list.querySelectorAll('[data-comment-group]').forEach(c=>c.onchange=()=>{for(const x of groups[+c.dataset.commentGroup].items)if(!x.item.error)c.checked?selected.set(itemKey(x.item),x.item.block):selected.delete(itemKey(x.item));update();});update();
      }
      function update(){
        add.disabled=!selected.size||filterLoading;info.textContent=(filterLoading?I18N.t('Kommentare werden geladen …')+' ':'')+(selected.size?selected.size+' ausgewählt. ':'')+warnings().join(' ');
        list.querySelectorAll('[data-comment]').forEach(c=>c.checked=selected.has(itemKey(data.items[+c.dataset.comment])));
        list.querySelectorAll('[data-comment-group]').forEach(c=>{const xs=groups[+c.dataset.commentGroup].items.filter(x=>!x.item.error),n=xs.filter(x=>selected.has(itemKey(x.item))).length;c.checked=!!xs.length&&n===xs.length;c.indeterminate=n>0&&n<xs.length;});
      }
      dlg.querySelector('#rwCommentsAll').onclick=()=>{visible.filter(x=>!x.item.error).forEach(x=>selected.set(itemKey(x.item),x.item.block));update();};
      dlg.querySelector('#rwCommentsNone').onclick=()=>{visible.forEach(x=>selected.delete(itemKey(x.item)));update();};
      async function filtered(){renderList();if(!remoteFilter)return;clearTimeout(filterTimer);const g=++filterRequest;filterLoading=true;update();filterTimer=setTimeout(async()=>{try{const result=await A.relatedComments(copy(source.reference),{query:dlg.querySelector('#rwCommentFilter').value,language:dlg.querySelector('#rwCommentLanguage').value});if(filterClosed||g!==filterRequest)return;data=result;filterLoading=false;renderList();}catch(err){if(!filterClosed&&g===filterRequest){filterLoading=false;update();info.textContent=String(err.message||err);}}},200);}
      dlg.querySelector('#rwCommentFilter').oninput=filtered;dlg.querySelector('#rwCommentLanguage').onchange=filtered;
      const chosen=await new Promise(resolve=>{dlg.onclose=()=>resolve(null);dlg.querySelector('#rwCommentsCancel').onclick=()=>dlg.close();add.onclick=()=>{if(selected.size>200){info.textContent='Bitte höchstens 200 Kommentare auf einmal übernehmen.';return;}resolve(G.sort([...selected.values()].map(copy)));dlg.close();};renderList();dlg.showModal();});filterClosed=true;filterRequest++;clearTimeout(filterTimer);dlg.remove();
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
      if(options.accept)await refresh();else await ensureProject();
      const view=host.getView(),loaded=view?.loaded||[],section=view?.sections?.[view.idx],readerDisplay=host.getReaderDisplay?.();
      const selection=options.selection||host.getReaderSelection?.()||{};
      const fixed=!!options.accept||(draft&&['sheets','collections'].includes(kind)&&draft.projectId===projectId);
      let last;try{last=JSON.parse(localStorage.getItem(lastSheetKey));}catch{}
      const targets=state.sheets.filter(s=>s.projectId===projectId),preferred=targets.find(s=>s.id===last?.id)||targets.at(-1);
      const dlg=document.createElement('dialog');dlg.className='rw-dialog rw-source-dialog';
      dlg.innerHTML=`<form><h2>Quelle hinzufügen</h2><div class="rw-source-tabs"><button type="button" data-source-mode="reference">Stellenangabe</button><button type="button" data-source-mode="text">Textsuche</button>${loaded.length&&section?'<button type="button" data-source-mode="reader">Geöffneter Text</button>':''}</div><div id="rwSourceQueryPanel"><label>Stelle oder Suchtext<input id="rwSourceQuery" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="rwWorkSuggestions" placeholder="z. B. Hiob 7,1–3"></label><div id="rwWorkSuggestions" role="listbox" aria-label="Werkvorschläge" hidden></div><div id="rwSourceFilters" hidden><label>Sprache<select id="rwSourceLanguage"><option value="">Alle Sprachen</option><option value="German">Deutsch</option><option value="Hebrew">Hebräisch</option><option value="English">Englisch</option><option value="Greek">Griechisch</option><option value="Aramaic">Aramäisch</option></select></label><label><input id="rwSourceComments" type="checkbox"> Nur Kommentare</label></div></div><div id="rwSourceReader" hidden>${readerDisplay?'<label class="rw-capture-display-choice"><input type="checkbox" id="rwCaptureDisplay"> Darstellung aus dem Lesefenster übernehmen</label><p class="rw-field-hint">Sichtbare Ausgaben, Interlinear, Schriftgrößen und Abschnittsüberschriften übernehmen.</p>':''}<label>Edition<select id="rwCaptureEdition">${loaded.map(d=>`<option class="nt" value="${esc(d.entry.rel)}">${esc(d.entry.versionTitle||d.versionTitle||d.entry.title)}</option>`).join('')}</select></label><label>Abschnitt<select id="rwCaptureSection"></select></label>${field('Zeilen / Verse (leer = ganzer Abschnitt)','labels',(selection.labels||[...(view?.vf?.set||[])].map(String)).join(', ')||host.getRow()||'')}<p class="rw-field-hint">Markierte Zeilen werden vollständig übernommen.</p></div><div class="rw-toolbar"><button type="submit" id="rwSourceFind">Anzeigen</button></div><p id="rwSourceStatus" role="status" aria-live="polite"></p><div id="rwSourceResults"></div><label id="rwSourceEditionLabel" hidden>Edition<select id="rwSourceEdition"></select></label><div id="rwSourcePreview" class="rw-source-preview"></div><p class="rw-error" role="alert"></p>${fixed?`<p class="rw-source-target">Ziel: <b class="nt">${esc(options.accept?'Fundstelle zur Notiz':draft.title)}</b></p>`:`<label>Zielblatt<select id="rwSourceTarget">${targets.map(s=>`<option class="nt" value="${esc(s.id)}" ${s.id===preferred?.id?'selected':''}>${esc(s.title)}</option>`).join('')}<option value="">Neues Quellenblatt</option></select></label><label id="rwSourceNewTitleLabel" ${preferred?'hidden':''}>Titel<input id="rwSourceNewTitle" value="Neues Quellenblatt"></label>`}<div class="rw-source-footer"><button type="button" id="rwSourceAdd" class="primary" disabled>Hinzufügen</button><button type="button" id="rwSourceCancel">Abbrechen</button></div></form>`;
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
      function showPreview(items){blocks=items;add.disabled=!items.length;preview.innerHTML=items.map(b=>`<article><h3 class="nt">${esc(b.title)} · ${esc(b.citation.locator)}</h3><small class="nt">${esc(b.citation.edition)}</small>${b.presentation?presentationHtml(b):`<p class="nt" dir="auto">${esc(b.text)}</p>`}</article>`).join('');}
      function fail(e){error.textContent=String(e.message||e).replace(/^Error invoking remote method '[^']*': (Error: )?/,'');}
      async function previewReference(g){try{selectedEdition=edition.selectedOptions[0]?.dataset;const items=await A.sourcePreview({query:referenceQuery,rel:edition.value});if(!closed&&g===generation)showPreview(items);}catch(e){if(!closed&&g===generation)fail(e);}}
      async function readerSections(){const g=++generation;add.disabled=true;find.disabled=true;try{const data=await A.sections($('#rwCaptureEdition').value);if(closed||g!==generation)return;const matches=data.sections.some(s=>JSON.stringify(s.path)===JSON.stringify(section.path));$('#rwCaptureSection').innerHTML=(!matches?'<option value="" selected disabled>Dieser Abschnitt fehlt in dieser Edition.</option>':'')+data.sections.map(s=>`<option value="${esc(JSON.stringify(s.path))}" ${JSON.stringify(s.path)===JSON.stringify(section.path)?'selected':''}>${esc(s.label)}</option>`).join('');find.disabled=!data.sections.length||!matches;}catch(e){if(!closed&&g===generation)fail(e);}}
      async function search(){
        if(mode==='reference'&&!/\d+[ab]?(?:\s*[:,].*)?$/i.test(query.value.trim())){const items=await showWorks();if(items.length){info.textContent='Wähle ein Werk und ergänze die Stelle.';query.focus();return;}}
        hideWorks();invalidate();const g=generation;find.disabled=true;info.textContent=mode==='text'?'Suche läuft …':'Vorschau wird geladen …';
        try{
          if(mode==='reader'){
            if($('#rwCaptureDisplay')?.checked&&readerDisplay.unsupported.length)throw Error('Diese Interlinear-Ausgaben können noch nicht ins Quellenblatt übernommen werden: '+readerDisplay.unsupported.join(', '));const request={rel:$('#rwCaptureEdition').value,sectionPath:JSON.parse($('#rwCaptureSection').value),labels:$('[data-f="labels"]').value},b=$('#rwCaptureDisplay')?.checked?await A.captureReaderView({...readerDisplay,...request}):await A.capture(request);if(closed||g!==generation)return;selectedEdition={rel:b.reference.rel,versionTitle:b.citation.edition};showPreview([b]);
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
      const displayChoice=$('#rwCaptureDisplay');if(displayChoice)displayChoice.onchange=()=>{invalidate();$('#rwCaptureEdition').disabled=displayChoice.checked;if(displayChoice.checked){$('#rwCaptureEdition').value=readerDisplay.rel;const labels=$('[data-f="labels"]');if(!selection.labels?.length&&!view.vf?.set?.size&&labels.value===(host.getRow()||''))labels.value='';}void readerSections();};
      const target=$('#rwSourceTarget');if(target)target.onchange=()=>$('#rwSourceNewTitleLabel').hidden=!!target.value;
      dlg.querySelector('form').onsubmit=e=>{e.preventDefault();void search();};
      const chosen=await new Promise(resolve=>{dlg.onclose=()=>{closed=true;hideWorks();generation++;cancelSearch();resolve(null);};$('#rwSourceCancel').onclick=()=>dlg.close();add.onclick=()=>{if(!blocks.length)return;const title=$('#rwSourceNewTitle')?.value.trim();if(target&&!target.value&&!title){error.textContent='Bitte einen Titel eingeben.';return;}resolve({items:copy(blocks),target:target?.value,title,edition:selectedEdition?{rel:selectedEdition.rel||edition.value,versionTitle:selectedEdition.versionTitle}:null});dlg.close();};dlg.showModal();setMode(mode);});
      dlg.remove();if(!chosen)return;
      if(chosen.edition)try{localStorage.setItem(lastEditionKey,JSON.stringify(chosen.edition));}catch{}
      if(options.accept){await options.accept(chosen.items);return;}
      if(fixed){draft[kind==='sheets'?'blocks':'items'].push(...chosen.items);changed();}
      else{
        if(!leave())return;
        const existing=state.sheets.find(s=>s.id===chosen.target&&s.projectId===projectId);kind='sheets';legacy=false;
        draft=existing?copy(existing):{id:uid(),projectId,title:chosen.title,description:'',tags:[],version:0,blocks:[]};ensureHistory();draft.blocks.push(...chosen.items);changed();
      }
      rememberSheet();host.showTab('research');render();
    }
    const captureDialog=()=>sourcePicker({reader:true});
    document.addEventListener('click', e => { if (!e.target.closest('.rw-menu')) closeMenus(); });
    document.addEventListener('keydown', e => {
      if (document.documentElement.dataset.tab !== 'research' || document.querySelector('dialog[open]')) return;
      if((e.metaKey||e.ctrlKey)&&!e.altKey&&draft&&['z','y'].includes(e.key.toLowerCase())){
        const input=e.target.closest('input,textarea,[contenteditable=true]');if(input&&!input.matches('[data-f],[data-layout],[data-region]'))return;
        e.preventDefault();void run(()=>action(e.key.toLowerCase()==='y'||e.shiftKey?'redo':'undo'));return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 's' && draft) {
        e.preventDefault(); if (dirty) void run(() => action('save'));
      } else if (e.key === 'Escape') {
        const open = root.querySelector('.rw-menu[open]');
        if(dragging){dragging=null;root.querySelectorAll('.rw-drop-before,.rw-drop-after,.rw-drop-active').forEach(el=>el.classList.remove('rw-drop-before','rw-drop-after','rw-drop-active'));}
        if (open) { e.preventDefault(); closeMenus(); open.querySelector('summary')?.focus(); }
      }
    });
    const readerButton=document.getElementById('rResearchBtn');let buttonSelection=null;readerButton.onpointerdown=()=>buttonSelection=host.getReaderSelection?.();readerButton.onclick=()=>{const selection=buttonSelection;buttonSelection=null;void run(()=>sourcePicker({reader:true,selection}));};
    document.addEventListener('click',e=>{const b=e.target.closest('.cmtResearch');if(!b)return;e.preventDefault();e.stopPropagation();void run(async()=>{const source=await A.captureCommentary({ref:b.dataset.ref,rel:b.dataset.rel,...(b.dataset.itemIndex!==undefined?{itemIndex:Number(b.dataset.itemIndex)}:{})});await acceptSources([source]);});});
    document.getElementById('sResearchBtn').onclick=()=>run(async()=>{
      const s=host.getSearch();if(!s.hits?.length)throw Error('Bitte zuerst eine Textsuche mit Fundstellen ausführen.');
      // Save only the explicitly available result subset; no claim that pagination is complete.
      const d=await modal('Suchergebnisse sichern',`<p>${s.hits.length} verfügbare Treffer werden mit Edition, Fundstelle und Suchanfrage gespeichert (höchstens 200). Weitere Treffer und Parallelfassungen sind nicht automatisch enthalten.</p>`);if(!d)return;closeModal(d);
      const items=await A.captureHits({hits:s.hits.map(h=>({rel:h.rel,path:h.path})),query:s.params?.q||s.params?.query||'',complete:false});await acceptSources(items,true);
    });
    A.onChanged(()=>{if(document.documentElement.dataset.tab==='research'){if(dirty)status('Es gibt einen neueren Speicherstand. Dein Entwurf bleibt erhalten; Speichern prüft auf Konflikte.');else void open();}});
    window.addEventListener('focus',()=>{if(document.documentElement.dataset.tab==='research'&&!dirty)void open();});
    return {open,captureDialog,showNotebook:async id=>{if(!leave())return;await refresh();if(!state.projects.some(p=>p.id===id))throw Error('Notizbuch nicht gefunden.');projectId=id;kind='notes';noteScope='project';filter='';pickRecord(rows()[0]);host.showTab('research');render();},showSheet:async id=>{if(!leave())return;await refresh();const sheet=state.sheets.find(s=>s.id===id);if(!sheet)throw Error('Quellenblatt nicht gefunden.');projectId=sheet.projectId;kind='sheets';pickRecord(sheet);host.showTab('research');render();},pickNoteSources:accept=>sourcePicker({accept}),openReference:ref=>host.openRef(ref),attachNote:async note=>{await ensureProject();await acceptSources([{...blank('note'),noteId:note.id,noteSnapshot:{...copy(note),title:note.noteTitle||note.title,projectId},title:note.noteTitle||note.title||'Notiz',text:note.note||''}]);},getReaderSelection:()=>host.getReaderSelection?.(),captureSelection:selection=>run(()=>sourcePicker({reader:true,selection}))};
  }
  return {create};
})();
