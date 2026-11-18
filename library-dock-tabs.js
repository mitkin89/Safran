// Shared tabs for panels opened in this reading frame. Panel controllers retain their state.
window.LibraryDockTabs=(()=>{
'use strict';
function create({$,panels,pins,open,automatic,activePair,afterOpen}){
  const labels={forms:'Wortkarte',cmt:'Kommentare',textcrit:'Textkritik',all:'Überblick',outline:'Gliederung',link:'Verknüpfungen',topic:'Themen',map:'Karte',dict:'Wörterbuch'};
  const icons={forms:'א',cmt:'💬',textcrit:'≠',all:'✦',outline:'≡',link:'🔗',topic:'🏷',map:'🗺',dict:'📖'};
  const members=new Set(),scrolls=new Map();let preferred=null;
  const bar=document.createElement('nav');bar.id='dockTabs';bar.setAttribute('role','tablist');bar.setAttribute('aria-label','Angepinnte Panels');bar.hidden=true;document.body.appendChild(bar);
  function activate(key){
    if(!members.has(key)||!pins[key])return;
    for(const k of members)if(!$(panels[k][0]).hidden)scrolls.set(k,$(panels[k][0]).scrollTop);
    preferred=key;
    if(open[key]()===false){members.delete(key);sync();return;}
    afterOpen(key);
    requestAnimationFrame(()=>{const el=$(panels[key][0]);if(!el.hidden&&scrolls.has(key))el.scrollTop=scrolls.get(key);sync();bar.querySelector('[data-panel="'+key+'"]')?.focus({preventScroll:true});});
  }
  function sync(fresh){
    for(const k of Object.keys(panels)){
      const el=$(panels[k][0]);if(!pins[k])members.delete(k);else if(!el.hidden)members.add(k);
    }
    const visible=[...members].filter(k=>$(panels[k][0]).classList.contains('docked')&&!$(panels[k][0]).hidden);
    const current=fresh&&visible.includes(fresh)?fresh:activePair(visible)|| (visible.includes(preferred)?preferred:visible.at(-1));
    if(current)preferred=current;
    bar.hidden=!visible.length;document.body.classList.toggle('has-dock-tabs',!bar.hidden);
    // Stable buttons preserve keyboard focus and avoid spurious scroll changes.
    for(const b of [...bar.children])if(!members.has(b.dataset.panel))b.remove();
    for(const k of members){let b=bar.querySelector('[data-panel="'+k+'"]');if(!b){b=document.createElement('button');b.type='button';b.id='dock-tab-'+k;b.dataset.panel=k;$(panels[k][0]).setAttribute('role','tabpanel');$(panels[k][0]).setAttribute('aria-labelledby',b.id);b.setAttribute('role','tab');b.setAttribute('aria-controls',panels[k][0].slice(1));const icon=document.createElement('span');icon.className='dock-tab-icon';icon.setAttribute('aria-hidden','true');icon.textContent=icons[k];const label=document.createElement('span');label.textContent=I18N.t(labels[k]);b.append(icon,label);b.onclick=()=>activate(k);bar.appendChild(b);}b.setAttribute('aria-selected',String(k===current));b.tabIndex=k===current?0:-1;}
  }
  function remove(key){members.delete(key);scrolls.delete(key);sync();}
  for(const k in panels)$(panels[k][1]).addEventListener('click',()=>{if(!automatic()){members.delete(k);scrolls.delete(k);}},true);
  bar.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    const list=[...bar.querySelectorAll('button')],i=list.indexOf(e.target);if(i<0)return;
    e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;activate(list[next].dataset.panel);
  });
  return {sync,remove};
}
return {create};
})();
