// Optional frequency marks decorate existing MT words without replacing their text.
window.LibraryPassageMarks=(()=>{
'use strict';
function create({root,getKey}){
  let state=null,frame=0;
  const bar=document.createElement('div');bar.id='passageMarkStatus';bar.hidden=true;
  const text=document.createElement('span');text.setAttribute('role','status');
  const close=document.createElement('button');close.type='button';close.textContent='✕';close.setAttribute('aria-label',I18N.t('Wortmarkierungen entfernen'));close.onclick=()=>clear();bar.append(text,close);document.body.appendChild(bar);
  function sync(){frame=0;
    if(state&&state.key!==getKey())state=null;
    root.querySelectorAll('[data-passage-mark]').forEach(w=>delete w.dataset.passageMark);
    let count=0;
    if(state)for(const row of root.querySelectorAll('.row[data-l]')){
      if(!state.verses.has(row.dataset.l))continue;
      for(const w of row.querySelectorAll('.cell[data-mt="1"] .txt .w[data-l][data-m]')){
        // Interlinear witness spans have their own IDs and must never receive MT marks.
        if(w.closest('.ilt'))continue;
        const decoded=window.Morph.decode(w.dataset.m,w.dataset.l),lemma=decoded?.segs[decoded.main]?.lemma;
        if(state.ids.has(lemma)){w.dataset.passageMark=state.mode;count++;}
      }
    }
    document.querySelectorAll('[data-ap-mark]').forEach(b=>{const active=state&&b.closest('.apScope')?.dataset.scope===state.scope&&b.dataset.apMark===state.mode;b.setAttribute('aria-pressed',String(!!active));b.classList.toggle('on',!!active);b.disabled=!root.querySelector('.cell[data-mt="1"] .w');});
    document.querySelectorAll('#apBody .apW[data-lemma]').forEach(w=>{const active=state&&state.ids.has(w.dataset.lemma);if(active)w.dataset.passageMark=state.mode;else delete w.dataset.passageMark;});
    bar.hidden=!state;if(state){text.textContent=I18N.t('{} · {} markierte MT-Wörter',state.label,count);bar.dataset.mode=state.mode;bar.style.left=Math.max(8,root.getBoundingClientRect().left+8)+'px';}
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
  function clear(){state=null;sync();}
  function set(value){state={...value,ids:new Set(value.ids),verses:new Set(value.verses)};sync();}
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  window.addEventListener('resize',schedule);
  return {set,clear,sync,snapshot:()=>state&&{mode:state.mode,scope:state.scope,key:state.key}};
}
return {create};
})();
