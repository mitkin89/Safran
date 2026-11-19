// Permanent study-tool tabs and a shared return history; controllers retain their content.
window.LibraryDockTabs=(()=>{
'use strict';
function create({$,panels,pins,open,automatic,activePair,afterOpen,available=()=>true,paired=()=>false}){
 const labels={cmt:'Kommentare',dict:'Wörterbuch',outline:'Gliederung',all:'Überblick',topic:'Themen',link:'Verknüpfungen',textcrit:'Apparatus',map:'Karte',forms:'Wortkarte'};
 const icons={forms:'א',cmt:'💬',textcrit:'≠',all:'✦',outline:'≡',link:'🔗',topic:'🏷',map:'🗺',dict:'📖'};
 const order=Object.keys(labels),history=[],scrolls=new Map();let preferred=null,switching=false,frame=0,userClosing=null;
 let docked=true;try{docked=localStorage.getItem('studyPinned')!=='0';}catch{}
 const bar=document.createElement('nav');bar.id='dockTabs';bar.setAttribute('role','tablist');bar.setAttribute('aria-label',I18N.t('Studienwerkzeuge'));bar.hidden=true;document.body.appendChild(bar);
 // Floating tools must stay open until the chosen toolbar action runs.
 bar.addEventListener('mousedown',e=>e.stopPropagation());
 const back=document.createElement('button');back.type='button';back.className='dock-back';back.textContent='←';bar.appendChild(back);
 const layoutToggle=$('#dictStack');layoutToggle.classList.add('dock-layout');bar.appendChild(layoutToggle);
 const header=document.querySelector('header');
 const visible=()=>order.filter(k=>!$(panels[k][0]).hidden);
 function remember(k){const el=$(panels[k][0]);if(el.hidden)return;scrolls.set(k,[el,...el.querySelectorAll('*')].filter(e=>e.scrollTop||e.scrollLeft).map(e=>[e,e.scrollTop,e.scrollLeft]));}
 function layout(){frame=0;const shown=visible();if(!shown.length)return;const head=Math.max(0,header?.getBoundingClientRect().bottom||0);document.documentElement.style.setProperty('--study-top',head+'px');
  const pinned=shown.some(k=>$(panels[k][0]).classList.contains('docked'));bar.classList.toggle('floating',!pinned);
  if(!pinned){const r=shown.map(k=>$(panels[k][0]).getBoundingClientRect()).sort((a,b)=>a.top-b.top)[0];bar.style.width=r.width+'px';bar.style.right=(innerWidth-r.right)+'px';bar.style.top=Math.max(head,r.top-bar.offsetHeight)+'px';}
  else{bar.style.width='';bar.style.right='';bar.style.top='';}
  document.documentElement.style.setProperty('--dock-tabs-h',bar.getBoundingClientRect().height+'px');
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(layout);};
 function sync(fresh){
  const shown=visible(),current=fresh&&shown.includes(fresh)?fresh:activePair(shown)||(shown.includes(preferred)?preferred:shown.at(-1));
  if(current&&preferred&&current!==preferred&&!switching&&!userClosing){remember(preferred);if(history.at(-1)!==preferred)history.push(preferred);}
  if(current)preferred=current;
  bar.hidden=!shown.length;document.body.classList.toggle('has-dock-tabs',!bar.hidden);
  if(current){docked=!!pins[current];try{localStorage.setItem('studyPinned',docked?'1':'0');}catch{}}
  for(const k of order){let b=bar.querySelector('[data-panel="'+k+'"]');if(!b){b=document.createElement('button');b.type='button';b.id='dock-tab-'+k;b.dataset.panel=k;$(panels[k][0]).setAttribute('role','tabpanel');$(panels[k][0]).setAttribute('aria-labelledby',b.id);b.setAttribute('role','tab');b.setAttribute('aria-controls',panels[k][0].slice(1));const icon=document.createElement('span');icon.className='dock-tab-icon';icon.setAttribute('aria-hidden','true');icon.textContent=icons[k];const label=document.createElement('span');label.className='dock-tab-label';label.textContent=I18N.t(labels[k]);b.append(icon,label);b.onclick=()=>activate(k);bar.appendChild(b);}
   b.disabled=!available(k);b.title=I18N.t(labels[k])+(b.disabled?' · '+I18N.t(k==='forms'?'Zuerst ein Wort im Text auswählen':'Für diesen Text nicht verfügbar'):'');b.setAttribute('aria-label',I18N.t(labels[k]));b.setAttribute('aria-selected',String(k===current));b.tabIndex=k===current?0:-1;}
  bar.appendChild(layoutToggle);
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
 function toggle(){const shown=visible();if(shown.length){switching=true;try{shown.forEach(k=>{remember(k);$(panels[k][1]).click();});}finally{switching=false;}sync();}else activate(preferred&&available(preferred)?preferred:'all');}
 function remove(){sync();}
 for(const k in panels)$(panels[k][1]).addEventListener('click',()=>{remember(k);if(!switching&&!automatic()&&k===preferred){remember(k);const target=[...history].reverse().find(x=>x!==k&&available(x));userClosing=k;requestAnimationFrame(()=>{if(preferred===k&&$(panels[k][0]).hidden&&target){const at=history.lastIndexOf(target);if(at>=0)history.splice(at);activate(target,true);}userClosing=null;sync();});}},true);
 bar.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const list=[...bar.querySelectorAll('[data-panel]:not(:disabled)')],i=list.indexOf(e.target);if(i<0)return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;activate(list[next].dataset.panel);list[next].focus({preventScroll:true});});
 new ResizeObserver(schedule).observe(bar);if(header){new ResizeObserver(schedule).observe(header);header.addEventListener('transitionend',schedule);}
 addEventListener('resize',schedule);addEventListener('scroll',schedule,{passive:true});
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
 return {sync,remove,toggle,activate,back:goBack,get pinMode(){return docked;}};
}
return {create};
})();
