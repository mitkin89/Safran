// Direct manuscript alignment against the existing vocalized Kaufmann reading edition.
window.LibraryMishnahReader=(()=>{
'use strict';
const prefix=title=>'digital-mishnah/'+(window.MISHNAH_TEXTCRIT_CATALOG?.[title]?.slug||'berakhot')+'/';
const available=title=>['K','P','C'].filter(sig=>!window.MISHNAH_TEXTCRIT_CATALOG?.[title]||window.MISHNAH_TEXTCRIT_CATALOG[title].witnesses[sig]>0);
function entries(group){
 if(!window.LibraryMishnahTextCrit.supports(group.title))return [];
 return [['K','Kaufmann A50'],['P','Parma, de Rossi 138'],['C','Cambridge Add. 470.1']].filter(([sig])=>available(group.title).includes(sig)).map(([sig,name])=>({title:group.title,categories:group.cats,heTitle:group.heTitle,kind:'he',language:'Hebrew',rel:prefix(group.title)+sig,versionTitle:name+' · Digital Mishnah',mishnahWitness:sig,bytes:100000}));
}
function create(host){
 const {$,esc,getView}=host,adapter=window.LibraryMishnahTextCrit.create(host),tr=s=>window.I18N?.textCrit?.(s)??s;
 let picks=['D','P','C'],generation=0,hover=null,anchor=null,timer=null;
 try{const saved=localStorage.getItem('mishnahReaderWitnessesV2'),p=JSON.parse(saved||localStorage.getItem('mishnahReaderWitnesses')||'null');if(Array.isArray(p))picks=['D','P','C'].filter(s=>p.includes(s)||s==='D'&&!saved);}catch{}
 const comparisonAvailable=title=>[...(available(title).includes('K')?['D']:[]),...available(title).filter(s=>s!=='K')];
 const active=()=>window.LibraryMishnahTextCrit.supports(getView()?.group?.title);
 const DERIVED_VERSION="Kaufmann A50 (Digital Mishnah), vocalized after Be'eri",DERIVED_LABEL="Digital Mishnah · Punktierung nach Be’eri · teilweise/offen";
 const ACCORDANCE_VERSION='Kaufmann A50 (Digital Mishnah), provisional Accordance pointing',ACCORDANCE_LABEL='Digital Mishnah · vorläufige Accordance-Punktierung · nicht am Manuskript geprüft';
 const derivedVersion=v=>v===DERIVED_VERSION||v===ACCORDANCE_VERSION;
 const readingLabel=v=>v===ACCORDANCE_VERSION?ACCORDANCE_LABEL:v===DERIVED_VERSION?DERIVED_LABEL:'Kaufmann · vokalisierte Lesefassung';
 const preferredViews=new WeakSet();
 const VERSION="Mishnah based on the Kaufmann manuscript, edited by Dan Be'eri";
 const isReadingEntry=e=>e?.versionTitle===VERSION||e?.title==='Mishnah Berakhot'&&derivedVersion(e?.versionTitle);
 const readings=()=>getView()?.group?.versions.filter(isReadingEntry)||[];
 const reading=()=>readings().find(e=>e.versionTitle===ACCORDANCE_VERSION&&getView()?.selected.has(e.rel))||readings().find(e=>getView()?.selected.has(e.rel))||readings().find(e=>e.versionTitle===ACCORDANCE_VERSION)||readings().find(e=>e.versionTitle===VERSION)||readings()[0];
 const hasReading=()=>readings().some(e=>getView()?.selected.has(e.rel));
 const hasK=()=>getView()?.selected.has(prefix(getView()?.group?.title)+'K');
 const name=s=>s==='K'?'Kaufmann':s==='D'?'Kaufmann · Digital Mishnah':s==='P'?'Parma':'Cambridge';
 async function read(entry){
  if(!entry?.mishnahWitness)return null;
  const data=await adapter.load(entry.title),sig=entry.mishnahWitness,w=data.witnesses[sig],text=Array.from({length:window.MISHNAH_TEXTCRIT_CATALOG?.[entry.title]?.chapters||9},()=>[]);
  for(const [ref,u]of Object.entries(w.units)){const [ch,m]=ref.split(':').map(Number);text[ch-1][m-1]=esc(u.text);}
  if(sig==='K')for(const [ref,v]of Object.entries(data.verses))if(v.missingBase){const[ch,m]=ref.split(':').map(Number);text[ch-1][m-1]=esc('Kein Kaufmann-Referenztext für dieses Kapitel.');}
  return {entry,versionTitle:entry.versionTitle,language:'he',sectionNames:['Chapter','Mishnah'],text,mishnahWitness:sig,license:w.license,versionSource:w.url};
 }
 function hide(){clearTimeout(timer);if(anchor)anchor.removeAttribute('aria-describedby');hover?.remove();hover=null;anchor=null;}
 function show(word){
  hide();if(!word.isConnected)return;const html=adapter.metadataPreview(word);if(!html)return;
  hover=document.createElement('div');hover.id='mishnahReaderHover';hover.className='mishnah-reader-hover';hover.setAttribute('role','tooltip');hover.innerHTML=html;document.body.append(hover);anchor=word;word.setAttribute('aria-describedby',hover.id);
  const r=word.getBoundingClientRect(),h=hover.getBoundingClientRect();hover.style.left=Math.max(8,Math.min(innerWidth-h.width-8,r.left))+'px';hover.style.top=(r.bottom+h.height+8<innerHeight?r.bottom+8:Math.max(8,r.top-h.height-8))+'px';
  hover.onpointerenter=()=>clearTimeout(timer);hover.onpointerleave=()=>timer=setTimeout(hide,150);
 }
 let layoutFrame=null;
 // The flex columns wrap as complete alignment groups. Repeat the source labels
 // at each measured visual line without duplicating a single source word.
 function labelLines(){
  layoutFrame=null;
  for(const grid of $('#rOut').querySelectorAll('.mci-grid')){
   const labels=grid.querySelector('.mci-labels'),columns=grid.querySelector('.mci-columns');if(!labels||!columns||!grid.getBoundingClientRect().width)continue;
   let base=labels.querySelector('.mci-label-set');
   if(!base){base=document.createElement('div');base.className='mci-label-set';base.append(...labels.children);labels.append(base);}
   for(const copy of labels.querySelectorAll('.mci-label-repeat'))copy.remove();
   labels.style.width=base.getBoundingClientRect().width+'px';
   const top=columns.getBoundingClientRect().top,starts=[];
   for(const column of columns.children){const y=column.getBoundingClientRect().top-top;if(!starts.some(n=>Math.abs(n-y)<1))starts.push(y);}
   base.style.top=(starts[0]||0)+'px';
   for(const y of starts.slice(1)){const copy=base.cloneNode(true);copy.classList.add('mci-label-repeat');copy.style.top=y+'px';labels.append(copy);}
   labels.style.height=columns.getBoundingClientRect().height+'px';
  }
 }
 const scheduleLabels=()=>{if(layoutFrame===null)layoutFrame=requestAnimationFrame(labelLines);};
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(scheduleLabels):null;
 addEventListener('resize',scheduleLabels);
 async function refresh(){
  const token=++generation;hide();observer?.disconnect();if(!active())return;
  const view=getView(),chapter=view.sections[view.idx]?.path?.[0];if(!Number.isInteger(chapter))return;
  if(!preferredViews.has(view)){preferredViews.add(view);const work=readings().find(e=>e.versionTitle===ACCORDANCE_VERSION);if(work&&!view.selected.has(work.rel)){view.selected.add(work.rel);host.remember();await host.reload(view);return;}}
  const preferred=reading();if(preferred&&hasK()&&preferred.versionTitle!==ACCORDANCE_VERSION){view.selected.delete(prefix(view.group.title)+'K');view.selected.add(preferred.rel);host.remember();await host.reload(view);return;}
  $('#ilBtn').hidden=false;$('#ilBtn').classList.toggle('on',(hasReading()||hasK())&&picks.length>0);$('#bavliIlBtn').hidden=true;
  const data=await adapter.load(view.group.title),vocalized=new Map();
  for(const doc of view.loaded.filter(d=>isReadingEntry(d.entry))){const v=await adapter.loadVocalized(view.group.title,doc.entry.versionTitle);if(v)vocalized.set(doc.entry.rel,v);}
  if(token!==generation||getView()!==view||view.sections[view.idx]?.path?.[0]!==chapter)return;
  for(const cell of $('#rOut').querySelectorAll('.cell[data-rel]')){
   const doc=view.loaded.find(d=>d.entry.rel===cell.dataset.rel),v=vocalized.get(doc?.entry.rel),isReading=!!v&&isReadingEntry(doc?.entry)&&doc.textHash===v.source.textHash&&doc.entry.rel===v.source.rel,sig=isReading?'K':doc?.mishnahWitness;if(!sig)continue;
   const row=cell.closest('.row'),ref=(chapter+1)+':'+row.dataset.l,u=isReading?v.base[ref]:data.witnesses[sig].units[ref],txt=cell.querySelector('.txt');if(!txt||!u&&!(sig==='K'&&data.verses[ref]?.missingBase))continue;
   if(isReading&&!picks.length)continue;
   txt.classList.add('mishnah-reader-text');
   if(sig==='K'){
    const template=document.createElement('template');template.innerHTML=(isReading?adapter.renderVocalized:adapter.render)(chapter+1,[ref],['K',...picks.filter(s=>(isReading?comparisonAvailable(view.group.title):available(view.group.title).filter(s=>s!=='K')).includes(s))],isReading?doc?.entry.versionTitle:undefined);
    const source=template.content.querySelector('.tc-reader-verse');if(isReading){delete cell.dataset.mishnahMorphReady;cell.dataset.mishnahMorphState='pending';cell.dataset.mciVocalized='1';cell.dataset.mciEdition=derivedVersion(doc.entry.versionTitle)?doc.entry.versionTitle:'original';}
    txt.replaceChildren(...template.content.querySelectorAll('.mci-coverage-notice'),...(source?.querySelectorAll('.mci-grid,.mci-note,.mci-open,.mci-unbased-notice')||[]));
   }else{
    txt.innerHTML=adapter.sourceUnit(sig,ref);
   }
  }
  for(const word of $('#rOut').querySelectorAll('[data-tc-mishnah]')){word.removeAttribute('title');word.setAttribute('aria-label',tr('Wortdetails und Quelle anzeigen'));}
  await host.refreshMorph?.();if(token!==generation)return;
  labelLines();for(const grid of $('#rOut').querySelectorAll('.mci-grid'))observer?.observe(grid);
 }
 function menu(){
  return '<div class="ilpH">'+esc(tr('Handschriften'))+'</div><label class="ilpR"><input type="checkbox" value="K" '+((hasReading()||hasK())?'checked':'')+'> '+esc(readingLabel(reading()?.versionTitle))+'</label>'+comparisonAvailable(getView()?.group?.title).map(s=>'<label class="ilpR"><input type="checkbox" value="'+s+'" '+(picks.includes(s)?'checked':'')+'> '+name(s)+'</label>').join('')+'<div class="ilpB"><button type="button" data-a="all">'+esc(tr('Alle'))+'</button> <button type="button" data-a="none">'+esc(tr('Keine'))+'</button></div><p class="muted">'+esc(tr(derivedVersion(reading()?.versionTitle)?readingLabel(reading()?.versionTitle)+' · Die Handschriften stehen wortweise darunter. Abweichungen sind rot; offene Zuordnungen bleiben getrennt.':'Die verfügbaren Handschriften stehen wortweise unter der vokalisierten Kaufmann-Lesefassung. Abweichungen sind rot; offene Zuordnungen bleiben getrennt.'))+'</p>';
 }
 async function choose(value,on){
  if(!active())return;const view=getView();
  if(value==='K'){const e=reading(),rel=e?.rel||prefix(view.group.title)+'K';if(on){view.selected.add(rel);if(e&&e.versionTitle!==ACCORDANCE_VERSION)view.selected.delete(prefix(view.group.title)+'K');}else if(view.selected.size>1)view.selected.delete(rel);}
  else{if(value==='all')picks=comparisonAvailable(view.group.title);else if(value==='none')picks=[];else picks=on?[...new Set([...picks,value])]:picks.filter(s=>s!==value);if(picks.length){const e=reading();view.selected.add(e?.rel||prefix(view.group.title)+'K');if(e&&e.versionTitle!==ACCORDANCE_VERSION)view.selected.delete(prefix(view.group.title)+'K');}}
  try{localStorage.setItem('mishnahReaderWitnessesV2',JSON.stringify(picks));}catch{}
  host.remember();await host.reload(view);
  if(getView()===view&&!$('#ilPop').hidden)$('#ilPop').innerHTML=menu();
 }
 $('#rOut').addEventListener('click',e=>{const w=e.target.closest('[data-tc-mishnah]');if(w)show(w);});
 $('#rOut').addEventListener('pointerout',e=>{if(e.target.closest('[data-tc-mishnah]')){clearTimeout(timer);timer=setTimeout(hide,180);}});
 $('#rOut').addEventListener('focusin',e=>{const w=e.target.closest('[data-tc-mishnah]');if(w)show(w);});
 $('#rOut').addEventListener('focusout',e=>{if(e.target.closest('[data-tc-mishnah]'))timer=setTimeout(hide,180);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 document.addEventListener('pointerdown',e=>{if(hover&&!e.target.closest('#mishnahReaderHover,[data-tc-mishnah]'))hide();},true);
 return {active,read,refresh,menu,choose,invalidate:()=>{generation++;hide();observer?.disconnect();}};
}
return {entries,create};
})();
