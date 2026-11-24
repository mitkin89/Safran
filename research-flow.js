(function(root){
 'use strict';
 // The screen uses floats; print uses normal-flow tables and verbatim range fragments.
 // Restore the original nodes after printing so preview and stored sources stay intact.
 function units(doc){
  return [...doc.querySelectorAll('.classic-upper')].flatMap(table=>table.classList.contains('verse-aligned')?[...table.querySelectorAll(':scope > tbody > tr.verse-row')]:[table]);
 }
 function restorePrint(doc){
  for(const unit of units(doc)){
   const state=unit._researchPrintState;if(!state)continue;
   for(const {cell,nodes}of state.sides)cell.replaceChildren(...nodes);
   state.continuation?.remove();unit.classList.remove('print-split');state.wrapper.replaceWith(...state.wrapper.childNodes);delete unit._researchPrintState;
  }
 }
 function preparePrint(doc){
  const all=units(doc);if(all.some(unit=>unit._researchPrintState))return true;
  for(const unit of all){unit.classList.remove('flowing');(unit.closest('table')||unit).classList.remove('flowing-verses');}
  let prepared=false;
  for(const unit of all){
   const verse=unit.tagName==='TR',cells=[...unit.querySelectorAll(verse?':scope > .region':':scope > tbody > tr > .region')],main=cells.find(c=>c.classList.contains('main')),sides=cells.filter(c=>c!==main&&c.textContent.trim());
   if(!main||(!verse&&!main.textContent.trim())||!sides.length)continue;
   const wrapper=doc.createElement('div');wrapper.className='classic-print-main';wrapper.style.display='flow-root';wrapper.append(...main.childNodes);main.append(wrapper);
   const bottom=wrapper.getBoundingClientRect().bottom;
   const state={wrapper,sides:sides.map(cell=>({cell,nodes:[...cell.childNodes]})),continuation:null};
   const continuation=doc.createElement('table');continuation.className='classic-continuation';continuation.setAttribute('role','presentation');
   const row=continuation.createTBody().insertRow();let hasTail=false;
  function split(cell,cutoff=bottom){
   const walker=doc.createTreeWalker(cell,4),probe=doc.createRange();let node,cut=null;
   while((node=walker.nextNode())){
    if(!node.length)continue;probe.selectNodeContents(node);
    const rects=[...probe.getClientRects()].filter(r=>r.height>0);if(!rects.length){cut={node,offset:node.length};continue;}
    if(rects.every(r=>r.bottom<=cutoff+.5)){cut={node,offset:node.length};continue;}
    if(rects.every(r=>r.top>=cutoff-.5))break;
    let low=0,high=node.length;
    while(low<high){const mid=Math.ceil((low+high)/2);probe.setStart(node,0);probe.setEnd(node,mid);const rs=[...probe.getClientRects()];if(rs.every(r=>r.bottom<=cutoff+.5))low=mid;else high=mid-1;}
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
   if(hasTail){
    unit.classList.add('print-split');
    if(verse){const tr=doc.createElement('tr');tr.className='verse-continuation-row';tr.dataset.verse=unit.dataset.verse||'';const td=tr.insertCell();td.colSpan=cells.length;td.append(continuation);unit.after(tr);state.continuation=tr;}
    else{unit.after(continuation);state.continuation=continuation;}
   }
   if(hasTail&&row.cells.length===2){
    const active=[...row.cells].filter(c=>c.textContent.trim());
    if(active.length===1){for(const c of [...row.cells])if(c!==active[0])c.remove();active[0].style.width='100%';}
    else if(active.length===2){
     const wraps=active.map(cell=>{const w=doc.createElement('div');w.style.display='flow-root';w.append(...cell.childNodes);cell.append(w);return w;});
     const bounds=wraps.map(w=>w.getBoundingClientRect()),short=bounds[0].height<bounds[1].height?0:1,long=1-short;
     if(bounds[long].height>bounds[short].height+2){
      const pieces=split(active[long],bounds[short].bottom);
      if(pieces.tail.textContent.trim()){
       active[long].replaceChildren(pieces.head);const tr=continuation.insertRow(),td=tr.insertCell();td.colSpan=2;td.className=active[long].className;td.style.width='100%';td.append(pieces.tail);
      }
     }
    }
   }
   unit._researchPrintState=state;prepared=true;
  }
  return prepared;
 }
 function apply(doc,printing=false){
  if(printing)return preparePrint(doc);restorePrint(doc);
  let applied=false;
  for(const unit of units(doc)){
   const verse=unit.tagName==='TR',cells=[...unit.querySelectorAll(verse?':scope > .region':':scope > tbody > tr > .region')],main=cells.find(c=>c.classList.contains('main')),sides=cells.filter(c=>c!==main&&c.textContent.trim());
   if(!main||(!verse&&!main.textContent.trim())||!sides.length){unit.classList.remove('flowing');continue;}
   const width=parseFloat(main.style.width),left=cells.find(c=>c.classList.contains('left')),offset=left?parseFloat(left.style.width)||0:0;
   if(!Number.isFinite(width)||width<=0||width>=100)continue;
   unit.style.setProperty('--flow-main-width',width+'%');unit.style.setProperty('--flow-main-left',offset+'%');
   unit.style.setProperty('--flow-side-width',100/sides.length+'%');
   const exclusion=sides.length===2?width:sides[0].classList.contains('left')?100-offset:offset+width;
   unit.style.setProperty('--flow-exclusion-width',exclusion+'%');
   for(const c of cells)c.classList.toggle('flow-empty',c!==main&&!sides.includes(c));
   unit.classList.remove('flow-long-left','flow-long-right');unit.classList.add('flowing');if(verse)unit.closest('table').classList.add('flowing-verses');
   unit.style.setProperty('--flow-main-height',Math.ceil(main.offsetHeight)+(main.textContent.trim()?12:0)+'px');
   if(sides.length===2){
    const ordered=['left','right'].map(name=>sides.find(c=>c.classList.contains(name))),heights=ordered.map(c=>c.offsetHeight),long=heights[0]>heights[1]?0:1,short=1-long;
    if(heights[long]>heights[short]+2){
     const extent=long===0?100-offset:offset+width,mid=long===0?(50-offset)/extent*100:50/extent*100;
     unit.style.setProperty('--flow-shape-width',extent+'%');unit.style.setProperty('--flow-shape-mid',mid+'%');unit.style.setProperty('--flow-short-height',heights[short]+'px');
     unit.classList.add(long===0?'flow-long-left':'flow-long-right');
    }
   }
   applied=true;
  }
  return applied;
 }
 function watch(doc){
  const win=doc.defaultView;if(!win||!doc.querySelector('.classic-upper'))return ()=>{};
  let frame=0,stopped=false;
  const update=()=>{frame=0;if(!stopped)apply(doc,win.matchMedia('print').matches);};
  const schedule=()=>{if(!frame&&!stopped)frame=win.requestAnimationFrame(update);};
  const before=()=>apply(doc,true),after=()=>apply(doc,false);
  apply(doc);doc.fonts?.ready.then(schedule);win.addEventListener('resize',schedule);win.addEventListener('beforeprint',before);win.addEventListener('afterprint',after);
  const observer=win.ResizeObserver?new win.ResizeObserver(schedule):null;
  for(const main of doc.querySelectorAll('.classic-upper .region.main'))observer?.observe(main);
  return ()=>{stopped=true;if(frame)win.cancelAnimationFrame(frame);observer?.disconnect();win.removeEventListener('resize',schedule);win.removeEventListener('beforeprint',before);win.removeEventListener('afterprint',after);};
 }
 const css=`:is(.classic-upper.flowing,.verse-row.flowing){display:flow-root;position:relative;min-height:var(--flow-main-height)}
.classic-upper.flowing>tbody,.classic-upper.flowing>tbody>tr{display:contents}
:is(.classic-upper.flowing>tbody>tr,.verse-row.flowing)>.region{display:block;box-sizing:border-box}
:is(.classic-upper.flowing>tbody>tr,.verse-row.flowing)>.main{display:flow-root;position:absolute;top:0;left:var(--flow-main-left);width:var(--flow-main-width)!important;padding:0 3mm}
:is(.classic-upper.flowing>tbody>tr,.verse-row.flowing)>.left,:is(.classic-upper.flowing>tbody>tr,.verse-row.flowing)>.right{float:left;width:var(--flow-side-width)!important;padding:0}
:is(.classic-upper.flowing>tbody>tr,.verse-row.flowing)>.left{padding-right:3mm}
:is(.classic-upper.flowing>tbody>tr,.verse-row.flowing)>.right{padding-left:3mm}
:is(.classic-upper.flowing>tbody>tr,.verse-row.flowing)>.left::before,:is(.classic-upper.flowing>tbody>tr,.verse-row.flowing)>.right::before{content:"";width:calc(var(--flow-exclusion-width,var(--flow-main-width)) + 3mm);height:var(--flow-main-height)}
:is(.classic-upper.flowing>tbody>tr,.verse-row.flowing)>.left::before{float:right}
:is(.classic-upper.flowing>tbody>tr,.verse-row.flowing)>.right::before{float:left}

:is(.classic-upper.flowing.flow-long-left>tbody>tr,.verse-row.flowing.flow-long-left)>.left,
:is(.classic-upper.flowing.flow-long-right>tbody>tr,.verse-row.flowing.flow-long-right)>.right{width:100%!important}
:is(.classic-upper.flowing.flow-long-left>tbody>tr,.verse-row.flowing.flow-long-left)>.right{position:absolute;right:0;top:0;width:50%!important}
:is(.classic-upper.flowing.flow-long-right>tbody>tr,.verse-row.flowing.flow-long-right)>.left{position:absolute;left:0;top:0;width:50%!important}
:is(.classic-upper.flowing.flow-long-left>tbody>tr,.verse-row.flowing.flow-long-left)>.left::before{width:calc(var(--flow-shape-width) + 3mm);height:var(--flow-short-height);shape-outside:polygon(0 0,100% 0,100% 100%,var(--flow-shape-mid) 100%,var(--flow-shape-mid) var(--flow-main-height),0 var(--flow-main-height))}
:is(.classic-upper.flowing.flow-long-right>tbody>tr,.verse-row.flowing.flow-long-right)>.right::before{width:calc(var(--flow-shape-width) + 3mm);height:var(--flow-short-height);shape-outside:polygon(0 0,100% 0,100% var(--flow-main-height),var(--flow-shape-mid) var(--flow-main-height),var(--flow-shape-mid) 100%,0 100%)}
.classic-upper.flowing-verses{display:block}.classic-upper.flowing-verses>colgroup{display:none}.classic-upper.flowing-verses>tbody{display:block}
.classic-upper.flowing-verses>tbody>.verse-row:not(.flowing){display:table;width:100%;table-layout:fixed}
.verse-row.flowing>.flow-empty{display:none!important}.verse-row.flowing{break-inside:auto}
.verse-continuation-row>td{padding:0}.verse-continuation-row{break-inside:auto}
.verse-aligned .verse-row.print-split>.region{padding-bottom:0}
.verse-continuation-row .classic-continuation .region{padding-top:0}
.verse-continuation-row .classic-continuation tr:not(:last-child)>.region{padding-bottom:0}
.classic-print-main>:last-child,.classic-print-main .rw-parallel td>:last-child{margin-bottom:0}
.print-split>.region>.block:last-child .comment-fragment:last-child{margin-bottom:0}
.classic-continuation .region>.block:first-child>:first-child,.classic-continuation .region>.block:first-child .comment-fragment:first-child{margin-top:0}
.classic-continuation{margin-top:0}.classic-continuation .region{vertical-align:top}.classic-continuation .block:first-child{margin-top:0}
.region:is(.left,.right) blockquote,.region:is(.left,.right)>.block>p:not(.citation):not(.status):not(.verse-reference){text-align:justify;text-align-last:start}
.classic-upper.flowing .region blockquote,.classic-upper.flowing .region p{orphans:3;widows:3}`;
 const scriptSource='(function(){const units='+units.toString()+';const restorePrint='+restorePrint.toString()+';const preparePrint='+preparePrint.toString()+';const apply='+apply.toString()+';const watch='+watch.toString()+';watch(document);})();';
 const api={apply,watch,preparePrint,restorePrint,css,scriptSource};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ResearchFlow=api;
})(typeof window==='undefined'?globalThis:window);
