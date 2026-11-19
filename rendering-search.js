// Reverse lookup of grouped German renderings in the checked interlinear index.
(function(root){
  'use strict';
  const key=value=>String(value||'').normalize('NFC').trim().toLocaleLowerCase('de');
  function find(index,source,rendering){
    const wanted=key(rendering),found=[];
    if(!wanted||wanted==='*')return found;
    for(const [lemma,[labels,cells]] of Object.entries(index?.tr?.[source]||{})){
      const groups=new Set(labels.flatMap((label,i)=>key(label[0])===wanted?[i]:[]));
      if(!groups.size)continue;
      let count=0;const refs=[],forms=new Map(),languages=new Set();
      for(const group of groups)for(const [form,n] of labels[group].slice(1))forms.set(form,(forms.get(form)||0)+n);
      for(const [group,code,n,encoded] of cells){
        if(!groups.has(group))continue;count+=n;languages.add(String(code).startsWith('A')?'arc':'he');
        let ref=0;for(const delta of String(encoded||'').split('.').filter(Boolean)){
          ref+=parseInt(delta,36);if(Number.isSafeInteger(ref))refs.push(ref);
        }
      }
      if(count)found.push({lemma,count,refs:refs.sort((a,b)=>a-b),forms:[...forms],languages:[...languages]});
    }
    return found.sort((a,b)=>b.count-a.count||a.lemma.localeCompare(b.lemma));
  }
  const api={find};if(typeof module==='object'&&module.exports)module.exports=api;
  else root.RenderingSearch=api;
})(typeof window==='object'?window:globalThis);
