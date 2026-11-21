// Contextual passage marks decorate existing MT words without replacing their text.
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
      for(const cell of row.querySelectorAll('.cell[data-mt="1"] .txt')){
        const words=[...cell.querySelectorAll('.w[data-l][data-m]')].filter(w=>!w.closest('.ilt')).map(node=>{
          const d=window.Morph.decode(node.dataset.m,node.dataset.l),seg=d?.segs[d.main];
          return {node,lemma:seg?.lemma,lang:d?.lang,stem:seg?.stem,tense:seg?.tense,code:d?d.lang+node.dataset.m.slice(1).split('/')[d.main]:''};
        });
        const marked=new Set();
        if(state.sequence){
          for(let i=0;i+state.sequence.length<=words.length;i++)if(state.sequence.every((t,j)=>t.lemma===words[i+j].lemma&&t.lang===words[i+j].lang))for(let j=0;j<state.sequence.length;j++)marked.add(words[i+j].node);
        }else for(const w of words)if(state.ids.has(w.lemma)||state.code&&state.code===w.code||state.stem&&state.stem===w.stem||state.tense&&state.tense===w.tense)marked.add(w.node);
        for(const w of marked){w.dataset.passageMark=state.mode;count++;}
      }
    }
    document.querySelectorAll('#apBody [data-ap-select]').forEach(b=>{
      const active=!!(state&&b.closest('.apScope')?.dataset.scope===state.scope&&b.dataset.apSelect+':'+b.dataset.value===state.selection);
      b.classList.toggle('apSelected',active);if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(active));
    });
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
