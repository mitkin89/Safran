(function(root){
 'use strict';
 // Keep original table markup as a no-script fallback. Only text line widths change;
 // source blocks, citations, footnotes and their reading order are never split or copied.
 function apply(doc,printing=false){
  const table=doc.querySelector('.classic-upper');if(!table)return false;
  const cells=[...table.querySelectorAll(':scope > tbody > tr > .region')],main=cells.find(c=>c.classList.contains('main')),sides=cells.filter(c=>c!==main&&c.textContent.trim());
  if(!main?.textContent.trim()||!sides.length){table.classList.remove('flowing');return false;}
  const width=parseFloat(main.style.width),left=cells.find(c=>c.classList.contains('left'));
  if(!Number.isFinite(width)||width<=0||width>=100)return false;
  table.style.setProperty('--flow-main-width',width+'%');
  table.style.setProperty('--flow-main-left',left?left.style.width:'0%');
  table.style.setProperty('--flow-side-width',100/sides.length+'%');
  table.classList.add('flowing');
  // offsetHeight uses layout pixels even when the preview is zoomed to its iframe.
  const height=Math.ceil(main.offsetHeight)+12;
  table.style.setProperty('--flow-main-height',height+'px');
  // An absolutely positioned centre cannot fragment safely across printed pages.
  // Retain the normal, page-breaking table for an overlong main text.
  const pageHeight=parseFloat(table.dataset.pageHeight||'0');
  const pagePixels=pageHeight*96/25.4,used=pagePixels?Math.max(0,table.offsetTop)%pagePixels:0;
  if(printing&&pageHeight&&height>pagePixels-used){table.classList.remove('flowing');return false;}
  return true;
 }
 function watch(doc){
  const win=doc.defaultView,table=doc.querySelector('.classic-upper');if(!win||!table)return ()=>{};
  let frame=0,stopped=false;
  const update=()=>{frame=0;if(!stopped)apply(doc,win.matchMedia('print').matches);};
  const schedule=()=>{if(!frame&&!stopped)frame=win.requestAnimationFrame(update);};
  const before=()=>apply(doc,true),after=()=>apply(doc,false);
  apply(doc);doc.fonts?.ready.then(schedule);win.addEventListener('resize',schedule);win.addEventListener('beforeprint',before);win.addEventListener('afterprint',after);
  const main=table.querySelector('.region.main'),observer=win.ResizeObserver?new win.ResizeObserver(schedule):null;
  if(main)observer?.observe(main);
  return ()=>{stopped=true;if(frame)win.cancelAnimationFrame(frame);observer?.disconnect();win.removeEventListener('resize',schedule);win.removeEventListener('beforeprint',before);win.removeEventListener('afterprint',after);};
 }
 const css=`.classic-upper.flowing{display:flow-root;position:relative;min-height:var(--flow-main-height)}
.classic-upper.flowing>tbody,.classic-upper.flowing>tbody>tr{display:contents}
.classic-upper.flowing>tbody>tr>.region{display:block;box-sizing:border-box}
.classic-upper.flowing>tbody>tr>.main{display:flow-root;position:absolute;top:0;left:var(--flow-main-left);width:var(--flow-main-width)!important;padding:0 3mm}
.classic-upper.flowing>tbody>tr>.left,.classic-upper.flowing>tbody>tr>.right{float:left;width:var(--flow-side-width)!important;padding:0}
.classic-upper.flowing>tbody>tr>.left{padding-right:3mm}
.classic-upper.flowing>tbody>tr>.right{padding-left:3mm}
.classic-upper.flowing>tbody>tr>.left::before,.classic-upper.flowing>tbody>tr>.right::before{content:"";width:calc(var(--flow-main-width) + 3mm);height:var(--flow-main-height)}
.classic-upper.flowing>tbody>tr>.left::before{float:right}
.classic-upper.flowing>tbody>tr>.right::before{float:left}
.classic-upper.flowing .region blockquote,.classic-upper.flowing .region p{orphans:3;widows:3}`;
 const scriptSource='(function(){const apply='+apply.toString()+';const watch='+watch.toString()+';watch(document);})();';
 const api={apply,watch,css,scriptSource};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ResearchFlow=api;
})(typeof window==='undefined'?globalThis:window);
