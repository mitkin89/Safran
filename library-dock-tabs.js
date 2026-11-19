// Permanent study-tool tabs and a shared return history; controllers retain their content.
window.LibraryDockTabs=(()=>{
'use strict';
// Keep every label that fits; collapse unavailable/rightmost tools first,
// and preserve the selected tool's label as long as possible.
function fitLabels(bar,selector,fits=()=>bar.scrollWidth<=bar.clientWidth+1){
 const buttons=[...bar.querySelectorAll(selector)].map(label=>label.closest('button')).filter(Boolean);
 buttons.forEach(b=>b.classList.remove('icon-only'));
 const candidates=buttons.filter(b=>b.getClientRects().length).reverse().sort((a,b)=>{
  const priority=x=>x.getAttribute('aria-selected')==='true'?2:x.disabled?0:1;
  return priority(a)-priority(b);
 });
 for(const b of candidates){if(fits())break;b.classList.add('icon-only');}
}
function create({$,panels,pins,open,automatic,activePair,afterOpen,available=()=>true,paired=()=>false}){
 const labels={cmt:'Kommentare',dict:'Wörterbuch',all:'Überblick',outline:'Gliederung',topic:'Themen',link:'Verknüpfungen',textcrit:'Apparatus',map:'Karte',forms:'Wortkarte'};
 const icons={forms:'א',cmt:'💬',textcrit:'≠',all:'✦',outline:'≡',link:'🔗',topic:'🏷',map:'🗺',dict:'📖'};
 const order=Object.keys(labels),history=[],scrolls=new Map();let preferred=null,switching=false,frame=0;
 let docked=true;try{docked=localStorage.getItem('studyPinned')!=='0';}catch{}
 const bar=document.createElement('nav');bar.id='dockTabs';bar.setAttribute('role','tablist');bar.setAttribute('aria-label',I18N.t('Studienwerkzeuge'));bar.hidden=true;document.body.appendChild(bar);
 // Floating tools must stay open until the chosen toolbar action runs.
 bar.addEventListener('mousedown',e=>e.stopPropagation());
 const back=document.createElement('button');back.type='button';back.className='dock-back';back.textContent='←';bar.appendChild(back);
 const layoutToggle=$('#dictStack');layoutToggle.classList.add('dock-layout');bar.appendChild(layoutToggle);
 const pin=document.createElement('button');pin.type='button';pin.className='dock-pin';pin.innerHTML='<span class="dock-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 3h6l-1 6.5 3.2 3.2V15H13v7h-2v-7H6.8v-2.3L10 9.5z"/></svg></span><span class="dock-tab-label"></span>';
 pin.onclick=()=>{if(preferred)$(panels[preferred][0]).querySelector('.pinB')?.click();};
 const header=document.querySelector('header');
 const visible=()=>order.filter(k=>!$(panels[k][0]).hidden);
 function remember(k){const el=$(panels[k][0]);if(el.hidden)return;scrolls.set(k,[el,...el.querySelectorAll('*')].filter(e=>e.scrollTop||e.scrollLeft).map(e=>[e,e.scrollTop,e.scrollLeft]));}
 function layout(){frame=0;const shown=visible();if(!shown.length)return;const head=Math.max(0,header?.getBoundingClientRect().bottom||0);document.documentElement.style.setProperty('--study-top',head+'px');
  const pinned=shown.some(k=>$(panels[k][0]).classList.contains('docked'));bar.classList.toggle('floating',!pinned);
  if(!pinned){const el=shown.map(k=>$(panels[k][0])).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)[0];let r=el.getBoundingClientRect();const minTop=head+bar.offsetHeight;
   if(el.classList.contains('panel-sized')&&r.top<minTop){el.style.setProperty('--panel-y',minTop+'px');el.style.setProperty('--panel-h',Math.min(r.height,innerHeight-minTop-4)+'px');r=el.getBoundingClientRect();}
   bar.style.width=r.width+'px';bar.style.right=(innerWidth-r.right)+'px';bar.style.top=Math.max(head,r.top-bar.offsetHeight)+'px';}
  else{bar.style.width='';bar.style.right='';bar.style.top='';}
  fitLabels(bar,'.dock-tab-label');
  document.documentElement.style.setProperty('--dock-tabs-h',bar.getBoundingClientRect().height+'px');
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(layout);};
 function sync(fresh){
  const shown=visible(),current=fresh&&shown.includes(fresh)?fresh:activePair(shown)||(shown.includes(preferred)?preferred:shown.at(-1));
  if(current&&preferred&&current!==preferred&&!switching){remember(preferred);if(history.at(-1)!==preferred)history.push(preferred);}
  if(current)preferred=current;
  bar.hidden=!shown.length;document.body.classList.toggle('has-dock-tabs',!bar.hidden);
  if(current){docked=!!pins[current];try{localStorage.setItem('studyPinned',docked?'1':'0');}catch{}}
  for(const k of order){let b=bar.querySelector('[data-panel="'+k+'"]');if(!b){b=document.createElement('button');b.type='button';b.id='dock-tab-'+k;b.dataset.panel=k;$(panels[k][0]).setAttribute('role','tabpanel');$(panels[k][0]).setAttribute('aria-labelledby',b.id);b.setAttribute('role','tab');b.setAttribute('aria-controls',panels[k][0].slice(1));const icon=document.createElement('span');icon.className='dock-tab-icon';icon.setAttribute('aria-hidden','true');icon.textContent=icons[k];const label=document.createElement('span');label.className='dock-tab-label';label.textContent=I18N.t(labels[k]);b.append(icon,label);b.onclick=()=>activate(k);bar.appendChild(b);}
   b.disabled=!available(k);b.title=I18N.t(labels[k])+(b.disabled?' · '+I18N.t(k==='forms'?'Zuerst ein Wort im Text auswählen':'Für diesen Text nicht verfügbar'):'');b.setAttribute('aria-label',I18N.t(labels[k]));b.setAttribute('aria-selected',String(k===current));b.tabIndex=k===current?0:-1;}
  bar.append(layoutToggle,pin);
  pin.setAttribute('aria-pressed',String(docked));pin.title=I18N.t(docked?'Gesamte Seitenleiste lösen':'Gesamte Seitenleiste anpinnen');pin.setAttribute('aria-label',pin.title);pin.querySelector('.dock-tab-label').textContent=I18N.t(docked?'Lösen':'Anpinnen');
  while(history.length&&(!available(history.at(-1))||history.at(-1)===current))history.pop();
  back.disabled=!history.length;back.title=history.length?I18N.t('Zurück zu {}',I18N.t(labels[history.at(-1)])):I18N.t('Zurück');back.setAttribute('aria-label',back.title);
  const trigger=$('#studyBtn');if(trigger){trigger.setAttribute('aria-expanded',String(!bar.hidden));trigger.classList.toggle('active',!bar.hidden);}
  schedule();
 }
 function activate(key,goingBack=false){
  if(!panels[key]||!available(key))return false;
  const before=preferred,shown=visible();shown.forEach(remember);
  switching=true;
  try{
   if(before&&before!==key&&!goingBack&&history.at(-1)!==before)history.push(before);
   pins[key]=docked;try{localStorage.setItem('pins',JSON.stringify(pins));}catch{}
   if(open[key]()===false)return false;
   preferred=key;
   for(const k of shown)if(k!==key&&!paired(key,k))$(panels[k][1]).click();
   afterOpen(key);sync(key);
  }finally{switching=false;}
  requestAnimationFrame(()=>{for(const [el,t,l]of scrolls.get(key)||[])if(el.isConnected){el.scrollTop=t;el.scrollLeft=l;}schedule();});return true;
 }
 function goBack(){while(history.length){const k=history.pop();if(k!==preferred&&available(k)){activate(k,true);return;}}sync();}
 back.onclick=goBack;
 function close(){const shown=visible(),before=preferred;switching=true;try{shown.forEach(k=>{remember(k);const b=$(panels[k][1]);if(b.onclick)b.onclick.call(b,new MouseEvent('click'));else b.click();});}finally{switching=false;preferred=before;}sync();}
 function toggle(){if(visible().length)close();else activate(preferred&&available(preferred)?preferred:'all');}
 function remove(){sync();}
 for(const k in panels)$(panels[k][1]).addEventListener('click',e=>{remember(k);if(!switching&&!automatic()){e.stopImmediatePropagation();close();}},true);
 // Handle pane dismissal before the individual controllers' Escape handlers.
 window.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.defaultPrevented||e.isComposing||!visible().length||document.documentElement.dataset.tab==='dict')return;
  if(document.querySelector('dialog[open],#wpop,#tcHover,#kenWitness,#tcSettings[open]'))return;
  if(['#findBar','#dispPanel','#dictSug','#fmFind','#suggest','#ctxMenu','#dictSelP'].some(s=>{const el=$(s);return el&&!el.hidden&&el.getClientRects().length;}))return;
  e.preventDefault();e.stopImmediatePropagation();
  // Consume Escape for pinned tools so individual panel handlers cannot close them.
  if(!docked)close();
 },true);
 bar.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const list=[...bar.querySelectorAll('[data-panel]:not(:disabled)')],i=list.indexOf(e.target);if(i<0)return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;activate(list[next].dataset.panel);list[next].focus({preventScroll:true});});
 // Follow both size changes and position-only updates while a floating pane is dragged.
 for(const [selector]of Object.values(panels)){const el=$(selector);new ResizeObserver(schedule).observe(el);new MutationObserver(schedule).observe(el,{attributes:true,attributeFilter:['style','class','hidden']});}
 new ResizeObserver(schedule).observe(bar);if(header){new ResizeObserver(schedule).observe(header);header.addEventListener('transitionend',schedule);}
 addEventListener('resize',schedule);addEventListener('scroll',schedule,{passive:true});
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
 return {sync,remove,toggle,close,activate,back:goBack,get pinMode(){return docked;}};
}
return {create,fitLabels};
})();
