/* Local research workspace: source snapshots, reusable collections and linked notes. */
window.LibraryResearch = (() => {
  'use strict';
  const A = window.research, copy = x => structuredClone(x), uid = () => crypto.randomUUID();
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const split = x => [...new Set(String(x || '').split(',').map(x => x.trim()).filter(Boolean))];
  function create(host) {
    const root = document.getElementById('researchRoot');
    let state = null, projectId = '', kind = 'sheets', draft = null, legacy = false, dirty = false, filter = '', message = '', pending = false;
    const draftKey = 'researchDraft:' + (window.frameElement ? 'pane' : 'main');
    const allNotes = () => [...state.notes, ...state.legacyNotes];
    const currentProject = () => state?.projects.find(p => p.id === projectId);
    const rows = () => kind === 'notes' ? allNotes().filter(n => n.projectId === projectId || !n.projectId) : state[kind].filter(x => x.projectId === projectId);
    function persist() { try { if (dirty && draft) localStorage.setItem(draftKey, JSON.stringify({projectId,kind,draft,legacy})); else localStorage.removeItem(draftKey); return true; } catch { message = 'Entwurf konnte nicht zwischengespeichert werden. Bitte speichern.'; status(message); return false; } }
    function changed() { dirty = true; if(persist())status('Ungespeicherter Entwurf'); }
    function status(s) { message = s; const el = root.querySelector('#rwStatus'); if (el) el.textContent = s; }
    async function run(fn) { if (pending) return; pending = true; try { await fn(); } catch (e) { status(e.message || String(e)); if(document.documentElement.dataset.tab!=='research') window.alert(e.message || String(e)); } finally { pending = false; } }
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
    function render() {
      if (!state) return;
      const p = currentProject(), matches = rows().filter(x => JSON.stringify(x).toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
      root.innerHTML = `<div class="rw-toolbar"><label>Projekt<select id="rwProject"><option value="">Projekt wählen</option>${state.projects.map(x => `<option class="nt" value="${esc(x.id)}" ${x.id===projectId?'selected':''}>${esc(x.title)}${x.archived?' (archiviert)':''}</option>`).join('')}</select></label><button data-a="projectNew">Neues Projekt</button>${p ? '<button data-a="projectEdit">Projekt bearbeiten</button>' : ''}<button data-a="import">Projektpaket importieren …</button></div>
        <p id="rwStatus" role="status" aria-live="polite">${esc(message)}</p>
        ${p ? `<p class="muted nt">${esc(p.description)} ${p.tags.map(t=>'#'+esc(t)).join(' ')}</p>
        <div class="rw-toolbar rw-kinds">${[['sheets','Quellenblätter'],['collections','Sammlungen'],['notes','Notizen']].map(([k,t])=>`<button data-kind="${k}" aria-pressed="${kind===k}">${t}</button>`).join('')}<span class="spacer"></span><button data-export="json">Projekt teilen …</button><button data-export="csv">Forschungsdaten CSV …</button><button data-export="jsonld">Annotationen JSON-LD …</button></div>
        <div class="rw-layout"><aside><label>Nach Text, Quelle, Thema oder Schlagwort filtern<input id="rwFilter" value="${esc(filter)}" type="search"></label><button data-a="new">${kind==='sheets'?'Neues Quellenblatt':kind==='collections'?'Neue Sammlung':'Neue Notiz'}</button><div id="rwList">${matches.map(x=>`<button data-edit="${esc(x.id)}" class="rw-listitem ${draft?.id===x.id?'active':''}"><b class="nt">${esc(x.title || 'Notiz')}</b><small class="nt">${esc((x.topics||[]).join(' · '))} ${esc((x.tags||[]).map(t=>'#'+t).join(' '))}${!x.projectId?' · ohne Projekt':''}</small></button>`).join('') || '<p class="muted">Noch keine Einträge.</p>'}</div></aside><div id="rwEditor">${draft ? editor() : '<p>Öffne einen Eintrag oder lege ein Quellenblatt an. Im Lesefenster übernimmt „＋ Quellenblatt“ die gewählte Edition. Über „Treffer sammeln“ kannst du Suchergebnisse sichern.</p>'}</div></div>
        <p class="muted rw-sharing">Projektpakete enthalten Quellenkopien, Sammlungen und die zugehörigen Notizen. Teile die JSON-Datei und importiere sie auf einem anderen Gerät. Beim Import entstehen neue Einträge.</p>` : '<p>Lege ein Projekt an, um Quellenblätter, Sammlungen und Notizen zusammenzuführen.</p>'}`;
      root.querySelector('#rwProject').onchange = e => { if (!leave()) return render(); projectId=e.target.value;draft=null;dirty=false;persist();render(); };
      const f=root.querySelector('#rwFilter');if(f)f.oninput=e=>{filter=e.target.value;const pos=e.target.selectionStart;render();const n=root.querySelector('#rwFilter');n.focus();n.setSelectionRange(pos,pos);};
      root.querySelectorAll('[data-kind]').forEach(el=>el.onclick=()=>{if(!leave())return;kind=el.dataset.kind;draft=null;dirty=false;persist();render();});
      root.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>{if(!leave())return;const rec=rows().find(x=>x.id===el.dataset.edit);draft=copy(rec);if(kind==='notes')draft.refs=copy(noteRefs(draft));legacy=kind==='notes'&&state.legacyNotes.some(x=>x.id===rec.id);dirty=false;persist();render();});
      root.querySelectorAll('[data-a]').forEach(el=>el.onclick=()=>run(()=>action(el.dataset.a)));
      root.querySelectorAll('[data-export]').forEach(el=>el.onclick=()=>run(async()=>{if(dirty)throw Error('Bitte den Entwurf zuerst speichern.');const r=await A.export({kind:'project',projectId,format:el.dataset.export});status(r.cancelled?'Export abgebrochen.':'Gespeichert: '+r.path);}));
      if (draft) bindEditor();
    }
    function editor() {
      let body = field('Titel','title',draft.title) + field(kind==='notes'?'Notiz':'Beschreibung',''+(kind==='notes'?'note':'description'),kind==='notes'?draft.note:draft.description,true) + field('Schlagwörter (Komma getrennt)','tags',(draft.tags||[]).join(', '));
      if(kind==='notes') {
        body += field('Themen (Komma getrennt)','topics',(draft.topics||[]).join(', ')) + `<label>Projekt<select id="rwNoteProject">${legacy?'<option value="">Ohne Projekt</option>':''}${state.projects.map(p=>`<option value="${esc(p.id)}" ${draft.projectId===p.id?'selected':''}>${esc(p.title)}</option>`).join('')}</select></label>`;
        body += '<h3>Verknüpfte Textstellen</h3><p class="muted">Mehrere Fundstellen können dieselbe Notiz belegen. Quellen aus diesem Projekt übernehmen Edition und Zitat.</p>';
        body += (draft.refs||[]).map((r,i)=>`<div class="rw-reference"><button class="nt" data-open-ref="${i}">${esc(r.label)}</button><small class="nt">${esc(r.citation?.edition||'')}</small><button data-remove-ref="${i}" aria-label="Fundstelle entfernen">✕</button></div>`).join('');
        body += '<div class="rw-toolbar"><button data-a="reference">Textstelle aus Projekt verknüpfen</button><button data-a="manualRef">Weitere Fundstelle …</button></div>';
      } else {
        const blocks=draft[kind==='sheets'?'blocks':'items']||[];
        body += `<div class="rw-toolbar"><button data-a="addText">Eigener Text</button><button data-a="addHeading">Überschrift</button><button data-a="addSource">Quelle aus Bibliothek</button><button data-a="addNote">Notiz verknüpfen</button>${kind==='sheets'?'<button data-a="fromCollection">Aus Sammlung übernehmen</button>':''}</div><div id="rwBlocks">${blocks.map((b,i)=>blockEditor(b,i)).join('')}</div>`;
      }
      return `<div class="rw-toolbar"><button data-a="save" class="primary">Speichern</button></div><div class="rw-editorfields">${body}</div><div class="rw-toolbar rw-save"><button data-a="save" class="primary">Speichern</button><button data-a="reload">Neu laden / Entwurf verwerfen</button><button data-a="delete">Entfernen</button>${kind==='sheets'?['pdf','docx','html'].map(f=>`<button data-sheet-export="${f}">${f.toUpperCase()} exportieren …</button>`).join(''):''}</div>`;
    }
    function blockEditor(b,i) {
      const n=b.type==='note' ? allNotes().find(n=>n.id===b.noteId)||b.noteSnapshot : null;
      return `<article class="rw-block" data-block="${i}"><div class="rw-toolbar"><b>${{source:'Quelle',text:'Eigener Text',heading:'Überschrift',note:'Verknüpfte Notiz'}[b.type]} ${i+1}</b><span class="spacer"></span><button data-move="-1" ${!i?'disabled':''} aria-label="Nach oben">↑</button><button data-move="1" aria-label="Nach unten">↓</button><button data-drop="1" aria-label="Baustein entfernen">✕</button></div>${n ? `<h3 class="nt">${esc(n.title||'Notiz')}</h3><p class="rw-pre nt" dir="auto">${esc(n.note)}</p><small>Verknüpfte Notiz: Änderungen werden beim Export übernommen.</small>` : `${field('Bausteintitel','title',b.title)}${field(b.type==='source'?'Quellenauszug (Änderungen werden als bearbeiteter Auszug gekennzeichnet)':'Text','text',b.text,true)}`}
        ${b.type==='source'?`<details><summary>Wissenschaftliche Quellenangabe</summary><p class="muted">Angaben stammen aus der gewählten Edition. Fehlende Angaben bitte anhand der Ausgabe ergänzen.</p>${[['work','Werk'],['edition','Edition'],['translator','Übersetzer'],['editor','Herausgeber'],['publisher','Verlag / Ort'],['year','Jahr'],['locator','Fundstelle'],['url','Quellen-URL']].map(([k,t])=>field(t,'cite.'+k,b.citation?.[k])).join('')}<small>Übernommen: ${esc(b.capturedAt)} · SHA256: ${esc(b.sourceHash)}</small></details>${b.reference?'<button data-source-open="1">In dieser Edition öffnen</button>':''}`:''}
        ${b.search?`<p class="muted">Suche: ${esc(b.search.query)} · ${b.search.complete?'gespeicherter Treffer':'Auszug aus der Trefferliste; keine Vollständigkeitsangabe'} · ${esc(b.search.capturedAt)}</p>`:''}</article>`;
    }
    function bindEditor() {
      root.querySelectorAll('#rwEditor > .rw-editorfields > label [data-f]').forEach(el=>el.oninput=()=>{draft[el.dataset.f]=el.dataset.f==='tags'||el.dataset.f==='topics'?split(el.value):el.value;changed();});
      const np=root.querySelector('#rwNoteProject');if(np)np.onchange=()=>{draft.projectId=np.value;changed();};
      root.querySelectorAll('[data-block]').forEach(article=>{
        const i=+article.dataset.block,blocks=draft[kind==='sheets'?'blocks':'items'],b=blocks[i];
        article.querySelectorAll('[data-f]').forEach(el=>el.oninput=()=>{if(el.dataset.f.startsWith('cite.')){b.citation ||= {};b.citation[el.dataset.f.slice(5)]=el.value;}else b[el.dataset.f]=el.value;changed();});
        article.querySelectorAll('[data-move]').forEach(el=>el.onclick=()=>{const j=i+Number(el.dataset.move);if(j<0||j>=blocks.length)return;[blocks[i],blocks[j]]=[blocks[j],blocks[i]];changed();render();});
        article.querySelector('[data-drop]').onclick=()=>{blocks.splice(i,1);changed();render();};
        const open=article.querySelector('[data-source-open]');if(open)open.onclick=()=>run(()=>host.openRef(b.reference));
      });
      root.querySelectorAll('[data-open-ref]').forEach(el=>el.onclick=()=>run(()=>host.openRef(draft.refs[+el.dataset.openRef])));
      root.querySelectorAll('[data-remove-ref]').forEach(el=>el.onclick=()=>{draft.refs.splice(+el.dataset.removeRef,1);changed();render();});
      root.querySelectorAll('[data-sheet-export]').forEach(el=>el.onclick=()=>run(async()=>{if(dirty||!draft.version)throw Error('Bitte das Quellenblatt zuerst speichern.');const r=await A.export({kind:'sheet',id:draft.id,projectId:draft.projectId,format:el.dataset.sheetExport});status(r.cancelled?'Export abgebrochen.':'Gespeichert: '+r.path);}));
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
      if(a==='new'){if(!leave())return;draft={id:uid(),projectId,title:kind==='sheets'?'Neues Quellenblatt':kind==='collections'?'Neue Sammlung':'Neue Notiz',description:'',tags:[],topics:[],refs:[],note:'',blocks:[],items:[],version:0};legacy=false;dirty=true;persist();render();return;}
      if(a==='save'){
        const id=draft.id;
        if(legacy){state=await A.legacyNote(draft,draft.ts||0);await host.notesChanged();}
        else state=await A.put(kind,draft,draft.version||0);
        draft=copy((legacy?state.legacyNotes:state[kind]).find(x=>x.id===id));dirty=false;persist();message='Gespeichert.';render();return;
      }
      if(a==='reload'){if(!leave())return;const id=draft?.id;await refresh();draft=copy((legacy?state.legacyNotes:state[kind]).find(x=>x.id===id)||null);dirty=false;persist();message='Aktueller Stand geladen.';render();return;}
      if(a==='delete'){
        if(legacy)throw Error('Vorhandene Bibliotheksnotizen bitte im Reiter „Notizen“ entfernen.');
        if(!window.confirm('Diesen Eintrag entfernen? Verknüpfte Notizen im Quellenblatt behalten ihre beim Einfügen übernommene Kopie.'))return;
        if(draft.version)state=await A.remove(kind,draft.id,draft.version);draft=null;dirty=false;persist();render();return;
      }
      if(!draft)throw Error('Bitte zuerst einen Eintrag öffnen.');
      const blocks=draft[kind==='sheets'?'blocks':'items'];
      if(a==='addText'||a==='addHeading'){blocks.push(blank(a==='addText'?'text':'heading'));changed();render();}
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
