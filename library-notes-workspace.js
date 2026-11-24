// Shared notebook over the existing library and research stores; no migration or duplicate records.
window.LibraryNotesWorkspace=(()=>{
 'use strict';
 const F=window.NotesFormatting,D=window.NotesWorkspaceData,A=window.research,clone=x=>structuredClone(x),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const split=s=>[...new Set(String(s||'').split(/[,;]/).map(s=>s.trim()).filter(Boolean))];
 function create(host){
  const $=s=>document.querySelector(s),root=$('#nOut'),draftKey='notesWorkspaceDrafts:'+(window.frameElement?'pane':'main');
  let state={projects:[],sheets:[],notes:[]},draft=null,base=null,dirty=false,saving=false,revision=0,message='',filterTimer,refreshId=0;
  let cache={entries:{},selected:''},manual=[];try{cache=JSON.parse(localStorage.getItem(draftKey)||'null')||cache;if(!cache.entries)cache.entries={};manual=JSON.parse(localStorage.getItem('notesWorkspaceOrder')||'[]');}catch{}
  root.innerHTML='<div class="nw-layout"><aside class="nw-sidebar" aria-label="Notizenliste"><div id="nwList" role="list"></div></aside><section id="nwEditor" aria-label="Notiz bearbeiten"><p class="muted">Wähle eine Notiz oder lege eine neue an.</p></section></div><p id="nwStatus" role="status" aria-live="polite"></p><div id="nwUndo" hidden></div>';
  const records=()=>D.records(host.getLegacy(),state),key=n=>D.owner(n),all=()=>records();
  function status(text,error=false){message=text;const el=$('#nwStatus');el.textContent=text;el.classList.toggle('is-error',error);el.setAttribute('role',error?'alert':'status');}
  async function run(fn){try{return await fn();}catch(e){status(String(e.message||e).replace(/^Error invoking remote method '[^']*': (Error: )?/,''),true);return null;}}
  function persist(){try{if(draft){cache.selected=key(draft);if(dirty)cache.entries[key(draft)]={record:clone(draft),base:clone(base)};else delete cache.entries[key(draft)];}localStorage.setItem(draftKey,JSON.stringify(cache));}catch{status('Entwurf konnte nicht gesichert werden. Bitte die Notiz speichern.',true);}}
  function changed(){dirty=true;revision++;persist();badge();clearTimeout(filterTimer);filterTimer=setTimeout(renderList,80);}
  function badge(){const b=$('#nwSaveState');if(b)b.textContent=saving?'Wird gespeichert …':dirty?'Ungespeicherter Entwurf':'Gespeichert';const save=$('#nwSave');if(save)save.disabled=saving||!dirty;const discard=$('#nwDiscard');if(discard)discard.hidden=!dirty;}
  function options(){return {query:$('#nFilter').value,kind:$('#nKind').value,only:$('#nOnly').checked,project:$('#nProject').value,work:$('#nWork').value,chapter:$('#nChapter').value,tag:$('#nTagFilter').value};}
  function filtered(){let items=records().map(n=>cache.entries[key(n)]?.record||n);for(const pending of Object.values(cache.entries)){if(!items.some(n=>key(n)===key(pending.record)))items.push(pending.record);}if(draft){const at=items.findIndex(n=>key(n)===key(draft));if(at<0)items.unshift(draft);else if(dirty)items[at]=draft;}
   const list=D.filter(items,options(),state.projects),sort=$('#nSort').value;
   list.sort(sort==='new'?(a,b)=>(b.ts||0)-(a.ts||0):sort==='book'?(a,b)=>D.normalize(D.locations(a)[0]?.work).localeCompare(D.normalize(D.locations(b)[0]?.work))||String(D.locations(a)[0]?.chapter||'').localeCompare(String(D.locations(b)[0]?.chapter||''),undefined,{numeric:true}): (a,b)=>{const ai=manual.indexOf(key(a)),bi=manual.indexOf(key(b));return (ai<0?1e8:ai)-(bi<0?1e8:bi)||(a.order??1e9)-(b.order??1e9)||(b.ts||0)-(a.ts||0);});return list;
  }
  function selectOptions(id,items,label){const el=$(id),selected=el.value;el.innerHTML='<option value="">'+label+'</option>'+items.map(([v,t])=>'<option value="'+esc(v)+'">'+esc(t)+'</option>').join('');if([...el.options].some(o=>o.value===selected))el.value=selected;}
  function filters(){
   const items=records();selectOptions('#nProject',[['none','Ohne Projekt'],...state.projects.map(p=>[p.id,p.title])],'Alle Projekte');
   const works=[...new Set(items.flatMap(n=>D.locations(n).map(l=>l.work)).filter(Boolean))].sort();selectOptions('#nWork',works.map(w=>[w,w]),'Alle Werke');
   const chapters=[...new Set(items.flatMap(n=>D.locations(n).filter(l=>!$('#nWork').value||l.work===$('#nWork').value).map(l=>l.chapter)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));selectOptions('#nChapter',chapters.map(c=>[c,c]),'Alle Abschnitte');
   const tags=[...new Set(items.flatMap(n=>[...(n.tags||[]),...(n.topics||[])]))].sort();selectOptions('#nTagFilter',tags.map(t=>[t,t]),'Alle Schlagwörter');$('#ndTagList').innerHTML=tags.map(t=>'<option value="'+esc(t)+'">').join('');
  }
  function renderList(){
   const list=filtered(),labels={bookmark:'Lesezeichen',linked:'Notiz mit Fundstelle',free:'Freie Notiz'};$('#nCount').textContent=list.length+' von '+(new Set([...records().map(key),...Object.keys(cache.entries),...(draft?[key(draft)]:[])]).size);
   $('#nwList').innerHTML=list.map(n=>'<div class="nw-list-row" role="listitem"><button class="nw-item'+(draft&&key(n)===key(draft)?' active':'')+'" data-nw-note="'+esc(key(n))+'" '+(draft&&key(n)===key(draft)?'aria-current="true"':'')+'><b>'+esc(D.title(n))+'</b><small>'+esc([labels[D.kind(n)],state.projects.find(p=>p.id===n.projectId)?.title].filter(Boolean).join(' · '))+'</small><span>'+esc(D.excerpt(n).slice(0,150))+'</span>'+(D.refs(n).length&&D.title(n)!==D.referenceLabel(D.refs(n)[0])?'<small>'+esc(D.referenceLabel(D.refs(n)[0])+(D.refs(n).length>1?' · +'+(D.refs(n).length-1):''))+'</small>':'')+(cache.entries[key(n)]?'<small class="nw-draft-label">Entwurf vorhanden</small>':'')+'</button>'+($('#nSort').value==='manual'?'<div class="nw-order"><button data-nw-move="-1" data-owner="'+esc(key(n))+'" aria-label="Notiz nach oben">↑</button><button data-nw-move="1" data-owner="'+esc(key(n))+'" aria-label="Notiz nach unten">↓</button></div>':'')+'</div>').join('')||'<p class="muted">Keine passenden Notizen. Über „Neue Notiz“ kannst du beginnen oder die Filter zurücksetzen.</p>';
  }
  const histories=new Map(),editorOpen=new Set();
  const ui=()=>{cache.ui??={};const value=cache.ui[key(draft)]??={direction:'auto',preview:false};if(!['auto','rtl','ltr'].includes(value.direction))value.direction='auto';return value;};
  function history(){const owner=key(draft);let h=histories.get(owner);if(!h||h.entries[h.at].text!==(draft.note||'')){h=new F.History(draft.note||'');histories.set(owner,h);}return h;}
  function textState(){const t=$('#nwText');return {text:t.value,start:t.selectionStart,end:t.selectionEnd};}
  function updateHistory(){const h=history();$('#nwUndoText').disabled=!h.canUndo;$('#nwRedoText').disabled=!h.canRedo;}
  function showPreview(){const t=$('#nwText'),p=$('#nwPreview');if(!t||!p)return;const config=ui();t.hidden=config.preview;p.hidden=!config.preview;p.innerHTML=F.markdown(t.value)||'<p class="muted">Noch kein Notiztext.</p>';p.dir=config.direction;p.querySelectorAll('[dir]').forEach(n=>n.dir=config.direction);t.dir=config.direction;$('#nwPreviewToggle').textContent=config.preview?'Bearbeiten':'Vorschau';$('#nwPreviewToggle').setAttribute('aria-pressed',String(config.preview));}
  function applyText(next,h){if(!next)return;const t=$('#nwText');t.value=next.text;t.focus();t.setSelectionRange(next.start,next.end);draft.note=next.text;changed();updateHistory();showPreview();}
  function formatText(action){const t=$('#nwText'),h=history();if(ui().preview){ui().preview=false;showPreview();}const current=textState();h.entries[h.at]={...current};const next=F.format(current.text,current.start,current.end,action);h.push(next);applyText(next,h);}
  async function insertLink(){
   const owner=key(draft),current=textState(),dlg=document.createElement('dialog');dlg.className='nw-dialog';
   dlg.innerHTML='<form><h2>Verknüpfung einfügen</h2><label>Webadresse oder Fundstelle<input id="nwLinkTarget" required placeholder="https://… oder Genesis 1:1"></label><p class="nw-hint">Webadressen öffnen im Browser, Fundstellen in Safran.</p><p class="nw-link-error" role="alert"></p><button type="submit">Einfügen</button><button type="button">Abbrechen</button></form>';document.body.append(dlg);
   await new Promise(resolve=>{dlg.onclose=resolve;dlg.querySelector('[type=button]').onclick=()=>dlg.close();dlg.querySelector('form').onsubmit=e=>{e.preventDefault();if(!draft||key(draft)!==owner){dlg.close();return;}try{const next=F.format(current.text,current.start,current.end,'link',dlg.querySelector('input').value.trim()),h=history();h.entries[h.at]={...current};h.push(next);ui().preview=false;showPreview();applyText(next,h);dlg.close();}catch(e){dlg.querySelector('.nw-link-error').textContent=e.message;}};dlg.showModal();});dlg.remove();
  }
  function sourceMarkup(r,i){
   const original=r.quote||(!i?draft.excerpt||draft.he||'':''),extra=!i&&draft.he&&draft.he!==original?draft.he:'',text=original||'',long=text.length>550;
   return `<article class="nw-ref"><header><button data-nw-open-ref="${i}" class="nw-source-title">${esc(D.referenceLabel(r))}</button><details class="nw-ref-menu"><summary aria-label="Fundstelle verwalten">⋯</summary><div><button data-nw-edit-ref="${i}">Fundstelle bearbeiten …</button><button data-nw-remove-ref="${i}">Fundstelle entfernen</button></div></details></header>
    <p class="nw-edition">${r.citation?.edition?esc(r.citation.edition):`Ausgabe nicht erfasst · <button data-nw-edit-ref="${i}" class="nw-inline">Ausgabe ergänzen …</button>`}</p>
    ${text?`<blockquote dir="auto">${esc(long?text.slice(0,550).replace(/\s+\S*$/,'')+' …':text)}</blockquote>${long?`<details class="nw-full-quote"><summary>Vollständigen Text anzeigen</summary><blockquote dir="auto">${esc(text)}</blockquote></details>`:''}`:`<p class="muted">Kein Textauszug gespeichert.</p><button data-nw-edit-ref="${i}">Textauszug ergänzen …</button>`}
    ${extra?`<blockquote dir="auto" class="nw-hebrew">${esc(extra)}</blockquote>`:''}</article>`;
  }
  function renderEditor(){
   const el=$('#nwEditor');if(!draft){el.innerHTML='<div class="nw-empty"><h2>Deine Notizen</h2><p>Wähle links eine Notiz oder lege eine neue an.</p></div>';return;}
   const refs=D.refs(draft),used=state.sheets.filter(s=>s.blocks.some(b=>b.noteId===draft.id)),projects=state.projects,isBookmark=D.kind(draft)==='bookmark',writing=!isBookmark||editorOpen.has(key(draft)),config=ui();
   const project=projects.find(p=>p.id===draft.projectId)?.title,organised=[project,...(draft.tags||[]),...(draft.topics||[])].filter(Boolean);
   el.innerHTML=`<div class="nw-editorbar"><span id="nwSaveState" role="status"></span><button id="nwSave" class="primary">Speichern</button><button id="nwAttach">Ins Quellenblatt …</button><details class="nw-actions"><summary aria-label="Weitere Notizaktionen">⋯</summary><div><button id="nwDelete" ${!base?'disabled':''}>${isBookmark?'Lesezeichen löschen':'Notiz löschen'}</button><button id="nwDiscard" ${dirty?'':'hidden'}>Entwurf verwerfen</button></div></details></div>
    <div class="nw-notebook-head"><label class="nw-title"><span>Titel</span><input id="nwTitle" value="${esc(D.title(draft))}" placeholder="Titel deiner Notiz"></label><p class="nw-context">${isBookmark?'Lesezeichen':refs.length?'Notiz mit Fundstelle':'Freie Notiz'}${refs.length?' · '+refs.length+' Fundstelle'+(refs.length===1?'':'n'):''}</p>
     <details class="nw-organisation"><summary>Organisation <span id="nwOrganisationSummary">${esc(organised.join(' · ')||'Projekt, Schlagwörter und Themen')}</span></summary><div class="nw-meta"><label>Projekt<select id="nwProject">${draft._store==='research'?'':'<option value="">Ohne Projekt</option>'}${projects.map(p=>`<option value="${esc(p.id)}" ${draft.projectId===p.id?'selected':''}>${esc(p.title)}</option>`).join('')}</select></label><label>Schlagwörter<input id="nwTags" list="ndTagList" value="${esc((draft.tags||[]).join(', '))}" placeholder="z. B. Unterricht, offene Frage"><small>Freie Stichwörter zum Wiederfinden, mit Komma getrennt.</small></label><label>Themen<input id="nwTopics" list="ndTagList" value="${esc((draft.topics||[]).join(', '))}" placeholder="z. B. Schöpfung, Schabbat"><small>Inhaltliche Themen deiner Notiz, mit Komma getrennt.</small></label></div></details>
     ${used.length?`<div class="nw-used"><span>In Quellenblättern:</span>${used.map(s=>`<button data-nw-sheet="${esc(s.id)}">${esc(s.title)}</button>`).join('')}</div>`:''}</div>
    <div class="nw-editorbody ${refs.length?'nw-has-sources':''}">
     ${refs.length?`<section class="nw-sources" aria-label="Quellentexte"><h3>${refs.length===1?'Quelle':'Quellen'}</h3>${refs.map(sourceMarkup).join('')}</section>`:''}
     <section class="nw-writing ${writing?'':'nw-bookmark'}" aria-label="Eigene Notiz"><h3>Eigene Notiz</h3>
      <div class="nw-bookmark-start" ${writing?'hidden':''}><p>Hier ist bisher ein Lesezeichen gespeichert.</p><button id="nwStartWriting" class="primary">＋ Notiz hinzufügen</button></div>
      <div id="nwWritingTools" ${writing?'':'hidden'}><div class="nw-formatbar" role="toolbar" aria-label="Notiz formatieren"><button data-nw-format="bold" title="Fett (⌘/Strg+B)" aria-label="Fett"><b>F</b></button><button data-nw-format="italic" title="Kursiv (⌘/Strg+I)" aria-label="Kursiv"><i>K</i></button><button data-nw-format="list" title="Liste" aria-label="Liste">• Liste</button><button data-nw-format="quote" title="Zitat" aria-label="Zitat">❝ Zitat</button><button id="nwInsertLink">Verknüpfung</button><button id="nwUndoText" aria-label="Textänderung rückgängig" title="Rückgängig (⌘/Strg+Z)">↶</button><button id="nwRedoText" aria-label="Textänderung wiederholen" title="Wiederholen (⌘/Strg+Umschalt+Z)">↷</button><label class="nw-direction"><span class="sr-only">Schreibrichtung</span><select id="nwDirection" aria-label="Schreibrichtung"><option value="auto">Richtung: automatisch</option><option value="rtl">Rechts nach links</option><option value="ltr">Links nach rechts</option></select></label><button id="nwPreviewToggle" aria-pressed="false">Vorschau</button></div>
       <textarea id="nwText" aria-label="Eigene Notiz" rows="9" dir="${config.direction}" placeholder="Deine Gedanken, Erläuterungen und Vergleiche …">${esc(draft.note||'')}</textarea><div id="nwPreview" class="nw-preview" aria-label="Notizvorschau" hidden></div><p class="nw-hint">⌘/Strg+S: speichern · Entwürfe bleiben lokal erhalten.</p></div>
     </section></div>
    <div class="nw-ref-actions"><button id="nwAddRef">＋ Fundstelle hinzufügen</button><button id="nwManualRef">Manuelle Fundstelle …</button></div>`;
   $('#nwTitle').oninput=e=>{if(draft._store==='legacy'&&draft.key)draft.noteTitle=e.target.value;else draft.title=e.target.value;changed();};
   const textarea=$('#nwText');history();
   textarea.oninput=()=>{const next=textState(),h=histories.get(key(draft));h.push(next);draft.note=next.text;changed();updateHistory();};
   const undo=()=>{const h=history();applyText(h.undo(),h);},redo=()=>{const h=history();applyText(h.redo(),h);};
   textarea.addEventListener('beforeinput',e=>{const h=history();h.entries[h.at]={...textState()};if(e.inputType==='historyUndo'||e.inputType==='historyRedo'){e.preventDefault();(e.inputType==='historyUndo'?undo:redo)();}});
   textarea.onkeydown=e=>{if(e.isComposing||!(e.metaKey||e.ctrlKey))return;const k=e.key.toLowerCase();if(['b','i','z','y'].includes(k)){e.preventDefault();if(k==='b'||k==='i')formatText(k==='b'?'bold':'italic');else if(k==='y'||e.shiftKey)redo();else undo();}};
   $('#nwUndoText').onclick=undo;$('#nwRedoText').onclick=redo;
   el.querySelectorAll('[data-nw-format]').forEach(b=>{b.onmousedown=e=>e.preventDefault();b.onclick=()=>formatText(b.dataset.nwFormat);});
   $('#nwInsertLink').onmousedown=e=>e.preventDefault();$('#nwInsertLink').onclick=()=>run(insertLink);
   $('#nwDirection').value=config.direction;$('#nwDirection').onchange=e=>{ui().direction=e.target.value;persist();showPreview();};
   $('#nwPreviewToggle').onclick=()=>{ui().preview=!ui().preview;persist();showPreview();};
   $('#nwStartWriting').onclick=()=>{editorOpen.add(key(draft));renderEditor();$('#nwText').focus();};
   function organisation(){const project=state.projects.find(p=>p.id===draft.projectId)?.title;$('#nwOrganisationSummary').textContent=[project,...(draft.tags||[]),...(draft.topics||[])].filter(Boolean).join(' · ')||'Projekt, Schlagwörter und Themen';}
   $('#nwTags').oninput=e=>{draft.tags=split(e.target.value);changed();organisation();};$('#nwTopics').oninput=e=>{draft.topics=split(e.target.value);changed();organisation();};$('#nwProject').onchange=e=>{draft.projectId=e.target.value;changed();organisation();};
   $('#nwSave').onclick=()=>run(save);$('#nwDelete').onclick=()=>run(remove);$('#nwAttach').onclick=()=>run(async()=>{if(dirty&&!await save())return;await host.getResearch().attachNote({...draft,title:D.title(draft)});});
   $('#nwAddRef').onclick=()=>run(async()=>{const owner=key(draft);await host.getResearch().pickNoteSources(items=>{if(!draft||key(draft)!==owner)return;draft.refs=[...D.refs(draft),...items.map(b=>({...clone(b.reference),quote:b.text,citation:clone(b.citation)}))];changed();renderEditor();});});
   $('#nwManualRef').onclick=()=>run(()=>manualRef());
   el.querySelectorAll('[data-nw-open-ref]').forEach(b=>b.onclick=()=>run(()=>host.getResearch().openReference(refs[+b.dataset.nwOpenRef])));
   el.querySelectorAll('[data-nw-edit-ref]').forEach(b=>b.onclick=()=>run(()=>manualRef(+b.dataset.nwEditRef)));
   el.querySelectorAll('[data-nw-remove-ref]').forEach(b=>b.onclick=()=>{const index=+b.dataset.nwRemoveRef;draft.refs.splice(index,1);if(index===0){delete draft.excerpt;delete draft.he;}changed();renderEditor();});
   el.querySelectorAll('[data-nw-sheet]').forEach(b=>b.onclick=()=>run(()=>host.getResearch().showSheet(b.dataset.nwSheet)));
   $('#nwPreview').onclick=e=>{const a=e.target.closest('a');if(!a)return;e.preventDefault();if(a.dataset.nwUrl)void run(()=>window.api.openExternal(a.dataset.nwUrl));else if(a.dataset.nwReference)void run(()=>host.getResearch().openReference({label:a.dataset.nwReference}));};
   $('#nwDiscard').onclick=()=>{const owner=key(draft);delete cache.entries[owner];histories.delete(owner);try{const q=JSON.parse(localStorage.getItem('notesQuickDraft')||'null');if(q?.record?.id===draft.id)localStorage.removeItem('notesQuickDraft');}catch{}dirty=false;if(base)draft=clone(base);else draft=null;persist();renderList();renderEditor();};badge();updateHistory();showPreview();
  }
  function edit(note,unsaved=false,initialBase){persist();const cached=cache.entries[key(note)];draft=clone(cached?.record||note);base=clone(cached?cached.base:initialBase!==undefined?initialBase:(unsaved?records().find(n=>key(n)===key(note)):note)||null);dirty=!!cached||unsaved;revision++;persist();renderList();renderEditor();if(cached)status('Ungespeicherten Entwurf wiederhergestellt.');}
  async function refresh(){const generation=++refreshId;const next=await A.state();if(generation!==refreshId)return;state=next;if(state.legacyError)status('Bibliotheksnotizen konnten nicht geladen werden: '+state.legacyError,true);filters();
   if(!draft&&cache.selected){const note=records().find(n=>key(n)===cache.selected)||cache.entries[cache.selected]?.record;if(note)edit(note);}
   else if(draft&&!dirty&&!saving){const current=records().find(n=>key(n)===key(draft));if(current){draft=clone(current);base=clone(current);}renderEditor();}
   else if(draft&&base){const current=records().find(n=>key(n)===key(draft));if(current&&(current.version||current.ts)!==(base.version||base.ts))status('Es gibt einen neueren Speicherstand. Dein Entwurf bleibt erhalten; Speichern prüft auf Konflikte.',true);}
   renderList();
  }
  async function save(){
   if(!draft||saving)return false;if(draft._store==='research'&&!draft.title.trim())throw Error('Bitte einen Titel eingeben.');
   saving=true;badge();const outgoing=clone(draft),owner=key(draft),rev=revision;
   try{
    if(outgoing._store==='research')await A.put('notes',outgoing,base?.version||0);
    else{const {_store,...record}=outgoing;await window.notes.save({...record,expectedTs:base?.ts||0});}
    await host.reload();const stored=records().find(n=>key(n)===owner);if(!stored)throw Error('Gespeicherte Notiz konnte nicht geladen werden.');
    if(draft&&key(draft)===owner){base=clone(stored);if(rev===revision){draft=clone(stored);dirty=false;delete cache.entries[owner];try{const q=JSON.parse(localStorage.getItem('notesQuickDraft')||'null');if(q?.record?.id===stored.id)localStorage.removeItem('notesQuickDraft');}catch{}persist();renderEditor();status('Gespeichert.');}else{draft.ts=stored.ts;draft.version=stored.version;persist();status('Weitere Änderungen sind noch nicht gespeichert.');}}
    renderList();return true;
   }finally{saving=false;badge();}
  }
  async function remove(){if(!draft||!base)return;const old=clone(base),pending=dirty?clone(draft):null;
   if(old._store==='research')await A.remove('notes',old.id,old.version);else await window.notes.remove(old.id);
   delete cache.entries[key(old)];draft=null;base=null;dirty=false;persist();await host.reload();renderEditor();
   const bar=$('#nwUndo');bar.hidden=false;bar.innerHTML='Notiz entfernt. <button>Rückgängig</button>';bar.querySelector('button').onclick=()=>run(async()=>{if(old._store==='research')await A.put('notes',{...old,version:0},0);else{const {_store,...record}=old;await window.notes.save({...record,expectedTs:0});}bar.hidden=true;await host.reload();const restored=records().find(n=>key(n)===key(old));edit(pending||restored,!!pending);if(pending)base=clone(restored);persist();});setTimeout(()=>bar.hidden=true,10000);
  }
  async function manualRef(index=null){
   const owner=key(draft),existing=index===null?null:D.refs(draft)[index],dlg=document.createElement('dialog');dlg.className='nw-dialog';
   dlg.innerHTML=`<form><h2>${existing?'Fundstelle bearbeiten':'Manuelle Fundstelle'}</h2><label>Fundstelle<input id="nwManualLabel" required placeholder="z. B. Genesis 1:1" value="${esc(existing?.label||'')}"></label><label>Ausgabe (falls bekannt)<input id="nwManualEdition" value="${esc(existing?.citation?.edition||'')}"></label><p class="nw-hint">Trage die Ausgabe ein, aus der der gespeicherte Text stammt. Ist sie unbekannt, lasse das Feld leer.</p><label>Gespeicherter Textauszug<textarea id="nwManualQuote" rows="6" dir="auto">${esc(existing?.quote||(!index&&existing?draft.excerpt||draft.he||'':''))}</textarea></label>${existing?'<details class="nw-recapture"><summary>Neuen Auszug aus der Bibliothek übernehmen</summary><p>Ersetzt diese Fundstelle und ihren gespeicherten Text durch die ausdrücklich gewählte Ausgabe.</p><button id="nwRecapture" type="button">Ausgabe und Auszug auswählen …</button></details>':''}<div class="bar"><button type="submit" class="primary">${existing?'Übernehmen':'Hinzufügen'}</button><button type="button" id="nwManualCancel">Abbrechen</button></div></form>`;document.body.append(dlg);
   let recapture=false;
   await new Promise(resolve=>{dlg.onclose=resolve;dlg.querySelector('#nwManualCancel').onclick=()=>dlg.close();const replace=dlg.querySelector('#nwRecapture');if(replace)replace.onclick=()=>{recapture=true;dlg.close();};dlg.querySelector('form').onsubmit=e=>{e.preventDefault();if(draft&&key(draft)===owner){const ref={...clone(existing||{}),label:dlg.querySelector('#nwManualLabel').value.trim(),quote:dlg.querySelector('#nwManualQuote').value,citation:{...clone(existing?.citation||{}),edition:dlg.querySelector('#nwManualEdition').value.trim()}};if(index===null)draft.refs=[...D.refs(draft),ref];else draft.refs[index]=ref;changed();renderEditor();}dlg.close();};dlg.showModal();});dlg.remove();
   if(recapture)await host.getResearch().pickNoteSources(items=>{if(!draft||key(draft)!==owner||!items.length)return;draft.refs.splice(index,1,...items.map(b=>({...clone(b.reference),quote:b.text,citation:clone(b.citation)})));if(index===0){delete draft.excerpt;delete draft.he;}changed();renderEditor();});
  }
  $('#nNew').onclick=()=>{const note={id:crypto.randomUUID(),_store:'legacy',kind:'free',title:'Neue Notiz',note:'',tags:[],topics:[],refs:[],projectId:['','none'].includes($('#nProject').value)?'':$('#nProject').value,ts:0};edit(note,true);$('#nwTitle').focus();$('#nwTitle').select();};
  for(const id of ['nFilter','nKind','nOnly','nProject','nWork','nChapter','nTagFilter','nSort'])$('#'+id).addEventListener(id==='nFilter'?'input':'change',()=>{if(id==='nWork'){$('#nChapter').value='';filters();}renderList();});
  $('#nReset').onclick=()=>{for(const id of ['nFilter','nProject','nWork','nChapter','nTagFilter'])$('#'+id).value='';$('#nKind').value='all';$('#nOnly').checked=false;filters();renderList();};
  root.addEventListener('click',e=>{const n=e.target.closest('[data-nw-note]');if(n){const record=records().find(r=>key(r)===n.dataset.nwNote)||cache.entries[n.dataset.nwNote]?.record||draft;if(record)edit(record);return;}const b=e.target.closest('[data-nw-move]');if(b){const list=filtered(),at=list.findIndex(n=>key(n)===b.dataset.owner),next=at+Number(b.dataset.nwMove);if(next<0||next>=list.length)return;manual=records().map(key).sort((a,b)=>{const ai=manual.indexOf(a),bi=manual.indexOf(b);return (ai<0?1e8:ai)-(bi<0?1e8:bi);});const from=manual.indexOf(b.dataset.owner),target=manual.indexOf(key(list[next]));if(from<0||target<0)return;manual.splice(from,1);manual.splice(target,0,b.dataset.owner);try{localStorage.setItem('notesWorkspaceOrder',JSON.stringify(manual));}catch{}renderList();}});
  document.addEventListener('keydown',e=>{if(document.documentElement.dataset.tab==='notes'&&!document.querySelector('dialog[open]')&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();void run(save);}});
  A.onChanged(()=>{if(document.documentElement.dataset.tab==='notes')void run(refresh);});
  renderList();
  return {refresh,renderList,all,filtered,edit:(note,base)=>edit({...note,_store:note._store||'legacy'},true,base),backup:()=>({projects:clone(state.projects),notes:clone(state.notes)}),get draft(){return draft;}};
 }
 return {create};
})();
