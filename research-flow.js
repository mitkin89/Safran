(function(root){
 'use strict';
 // The screen uses floats; print uses normal-flow tables and verbatim range fragments.
 // Restore the original nodes after printing so preview and stored sources stay intact.
 function restorePrint(doc){
  const table=doc.querySelector('.classic-upper'),state=table?._researchPrintState;if(!state)return;
  for(const {cell,nodes}of state.sides)cell.replaceChildren(...nodes);
  state.continuation?.remove();state.wrapper.replaceWith(...state.wrapper.childNodes);delete table._researchPrintState;
 }
 function preparePrint(doc){
  const table=doc.querySelector('.classic-upper');if(!table)return false;
  if(table._researchPrintState)return true;
  const cells=[...table.querySelectorAll(':scope > tbody > tr > .region')],main=cells.find(c=>c.classList.contains('main')),sides=cells.filter(c=>c!==main&&c.textContent.trim());
  if(!main?.textContent.trim()||!sides.length)return false;
  // Measure at the real print width with normal, fragmentable table cells.
  table.classList.remove('flowing');
  const wrapper=doc.createElement('div');wrapper.className='classic-print-main';wrapper.style.display='flow-root';wrapper.append(...main.childNodes);main.append(wrapper);
  const bottom=wrapper.getBoundingClientRect().bottom;
  const state={wrapper,sides:sides.map(cell=>({cell,nodes:[...cell.childNodes]})),continuation:null};
  const continuation=doc.createElement('table');continuation.className='classic-continuation';continuation.setAttribute('role','presentation');
  const row=continuation.createTBody().insertRow();let hasTail=false;
  function split(cell){
   const walker=doc.createTreeWalker(cell,4),probe=doc.createRange();let node,cut=null;
   while((node=walker.nextNode())){
    if(!node.length)continue;probe.selectNodeContents(node);
    const rects=[...probe.getClientRects()].filter(r=>r.height>0);if(!rects.length){cut={node,offset:node.length};continue;}
    if(rects.every(r=>r.bottom<=bottom+.5)){cut={node,offset:node.length};continue;}
    if(rects.every(r=>r.top>=bottom-.5))break;
    let low=0,high=node.length;
    while(low<high){const mid=Math.ceil((low+high)/2);probe.setStart(node,0);probe.setEnd(node,mid);const rs=[...probe.getClientRects()];if(rs.every(r=>r.bottom<=bottom+.5))low=mid;else high=mid-1;}
    if(low>0){const space=node.data.slice(0,low).search(/\s+\S*$/u);if(space>=0)low=space+1;cut={node,offset:low};}break;
   }
   const head=doc.createRange(),tail=doc.createRange();head.selectNodeContents(cell);tail.selectNodeContents(cell);
   if(cut){head.setEnd(cut.node,cut.offset);tail.setStart(cut.node,cut.offset);}else head.collapse(true);
   return {head:head.cloneContents(),tail:tail.cloneContents()};
  }
  for(const side of sides){
   const parts=split(side),cell=row.insertCell();cell.className=side.className;cell.style.width=100/sides.length+'%';
   if(parts.tail.textContent.trim())hasTail=true;
   cell.append(parts.tail);side.replaceChildren(parts.head);
  }
  if(hasTail){table.after(continuation);state.continuation=continuation;}
  table._researchPrintState=state;return true;
 }
 function apply(doc,printing=false){
  if(printing)return preparePrint(doc);restorePrint(doc);
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
.classic-continuation{margin-top:0}.classic-continuation .region{vertical-align:top}.classic-continuation .block:first-child{margin-top:0}
.classic-upper.flowing .region blockquote,.classic-upper.flowing .region p{orphans:3;widows:3}`;
 const scriptSource='(function(){const restorePrint='+restorePrint.toString()+';const preparePrint='+preparePrint.toString()+';const apply='+apply.toString()+';const watch='+watch.toString()+';watch(document);})();';
 const api={apply,watch,preparePrint,restorePrint,css,scriptSource};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ResearchFlow=api;
})(typeof window==='undefined'?globalThis:window);
