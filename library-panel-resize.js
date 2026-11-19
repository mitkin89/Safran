// Shared edge/corner resizing for the reader's auxiliary panels.
window.LibraryPanelResize=(()=>{
'use strict';
function create({panels,setDockWidth}){
  const entries=[],root=document.documentElement;let frame=0,drag=null,sharedFloat=null;
  const save=(_id,size)=>{sharedFloat=size;try{localStorage.setItem('studyPanelSize',JSON.stringify(size));}catch{}};
  try{const size=JSON.parse(localStorage.getItem('studyPanelSize')||'null');if(size&&['left','top','width','height'].every(k=>Number.isFinite(size[k])))sharedFloat=size;}catch{}
  const bound=(v,min,max)=>Math.min(Math.max(v,Math.min(min,max)),max);
  function floating(el,r){
    const toolbar=document.querySelector('#dockTabs');
    const minY=toolbar&&!toolbar.hidden?Math.max(4,(document.querySelector('header')?.getBoundingClientRect().bottom||0)+toolbar.offsetHeight):4;
    const w=bound(r.width,280,window.innerWidth-8),h=bound(r.height,180,window.innerHeight-minY-4);
    const x=bound(r.left,4,window.innerWidth-w-4),y=bound(r.top,minY,window.innerHeight-h-4);
    if(!el.classList.contains('panel-sized'))el.classList.add('panel-sized');
    for(const [k,v] of Object.entries({x,y,w,h}))if(el.style.getPropertyValue('--panel-'+k)!==v+'px')el.style.setProperty('--panel-'+k,v+'px');
    return {left:x,top:y,width:w,height:h};
  }
  function share(el,size){sharedFloat=floating(el,size);for(const entry of entries)if(entry.el!==el&&!entry.el.classList.contains('docked'))floating(entry.el,sharedFloat);return sharedFloat;}
  function sync(){frame=0;for(const {el,handles} of entries){
    let r=el.getBoundingClientRect();const docked=el.classList.contains('docked');
    const visible=!el.hidden&&r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';
    if(visible&&!docked&&document.documentElement.dataset.tab!=='dict'){const w=parseFloat(getComputedStyle(root).getPropertyValue('--cmt-w'))||400;r=share(el,sharedFloat||{left:r.right-w,top:r.top,width:w,height:r.height});}
    for(const [edge,h] of handles){
      h.hidden=!visible||(docked&&edge!=='w')||document.documentElement.dataset.tab==='dict'&&el.id==='dictPanel';
      if(h.hidden)continue;
      const corner=edge.length===2,z=(+getComputedStyle(el).zIndex||30)+3;
      const left=edge.includes('w')?r.left-4:edge.includes('e')?r.right-4:r.left+8;
      const top=edge.includes('n')?r.top-4:edge.includes('s')?r.bottom-4:r.top+8;
      Object.assign(h.style,{left:left+'px',top:top+'px',width:(corner||edge==='w'||edge==='e'?8:Math.max(0,r.width-16))+'px',height:(corner||edge==='n'||edge==='s'?8:Math.max(0,r.height-16))+'px',zIndex:z});
      if(docked){h.setAttribute('aria-valuenow',Math.round(r.width));h.setAttribute('aria-valuemin','280');h.setAttribute('aria-valuemax',Math.round(window.innerWidth*.9));}
    }
  }}
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
  function dock(width){try{localStorage.setItem('panelDockSized','1');}catch{}document.body.classList.add('panel-width-chosen');setDockWidth(width);window.dispatchEvent(new Event('resize'));schedule();}
  function reset(){sharedFloat=null;for(const {el}of entries){el.classList.remove('panel-sized');for(const k of ['x','y','w','h'])el.style.removeProperty('--panel-'+k);}try{localStorage.removeItem('studyPanelSize');}catch{}schedule();}
  for(const selector of panels){const el=document.querySelector(selector);if(!el)continue;
    const handles=new Map();entries.push({el,handles});
    for(const edge of ['n','s','e','w','nw','ne','sw','se']){
      const h=document.createElement('div');h.className='panel-resize-handle edge-'+edge;h.dataset.panel=el.id;h.dataset.edge=edge;h.hidden=true;h.tabIndex=0;
      h.setAttribute('role',edge==='w'?'separator':'button');if(edge==='w')h.setAttribute('aria-orientation','vertical');
      h.setAttribute('aria-label',I18N.t('Fenstergröße ändern'));h.title=I18N.t('Ziehen: Fenstergröße ändern. Pfeiltasten: Größe ändern. Doppelklick: Standard.');
      document.body.appendChild(h);handles.set(edge,h);
      h.addEventListener('mousedown',e=>e.stopPropagation());
      h.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const r=el.getBoundingClientRect();drag={el,h,edge,r,x:e.clientX,y:e.clientY,docked:el.classList.contains('docked')};try{h.setPointerCapture?.(e.pointerId);}catch{}root.classList.add('panel-dragging');});
      h.addEventListener('pointermove',e=>{if(!drag||drag.h!==h)return;const d=drag,dx=e.clientX-d.x,dy=e.clientY-d.y;
        if(d.docked){dock(d.r.width-dx);return;}
        let {left,top,width,height}=d.r;
        if(edge.includes('w')){width=bound(d.r.width-dx,280,d.r.right-4);left=d.r.right-width;}
        if(edge.includes('e'))width=bound(d.r.width+dx,280,window.innerWidth-left-4);
        if(edge.includes('n')){height=bound(d.r.height-dy,180,d.r.bottom-4);top=d.r.bottom-height;}
        if(edge.includes('s'))height=bound(d.r.height+dy,180,window.innerHeight-top-4);
        share(el,{left,top,width,height});schedule();
      });
      const finish=()=>{if(drag?.h!==h)return;if(!drag.docked)save(el.id,el.getBoundingClientRect().toJSON());drag=null;root.classList.remove('panel-dragging');schedule();};
      h.addEventListener('pointerup',finish);h.addEventListener('pointercancel',finish);h.addEventListener('lostpointercapture',finish);
      h.addEventListener('dblclick',()=>{if(el.classList.contains('docked'))dock(400);else reset(el);});
      h.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();const r=el.getBoundingClientRect(),step=e.shiftKey?40:10;
        if(e.key==='Home'){if(el.classList.contains('docked'))dock(400);else reset(el);return;}
        if(el.classList.contains('docked')){if(e.key==='ArrowLeft'||e.key==='ArrowRight')dock(r.width+(e.key==='ArrowLeft'?step:-step));return;}
        const size=share(el,{left:r.left,top:r.top,width:r.width+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),height:r.height+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)});save(el.id,size);schedule();
      });
    }
    new ResizeObserver(schedule).observe(el);new MutationObserver(schedule).observe(el,{attributes:true,attributeFilter:['class','hidden','style']});
  }
  try{if(localStorage.getItem('panelDockSized')==='1')document.body.classList.add('panel-width-chosen');}catch{}
  document.body.classList.add('panel-resize-ready','panel-width-chosen');
  window.addEventListener('resize',()=>{const active=entries.find(({el})=>!el.hidden&&!el.classList.contains('docked'));if(active&&sharedFloat)share(active.el,sharedFloat);schedule();});
  window.addEventListener('study-panel-width',e=>{const active=entries.find(({el})=>!el.hidden&&getComputedStyle(el).visibility!=='hidden');if(!active)return;const el=active.el;if(el.classList.contains('docked'))dock(e.detail);else{const r=el.getBoundingClientRect();save(el.id,share(el,{left:r.right-e.detail,top:r.top,width:e.detail,height:r.height}));schedule();}});
  window.addEventListener('scroll',schedule,true);new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});schedule();
  return {sync:schedule};
}
return {create};
})();
