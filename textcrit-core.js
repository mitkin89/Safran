// Text-critical witnesses: source references and apparatus, independent of the UI.
(function(){
'use strict';
function resolve(data, ref, numbering) {
  const refs=numbering==='tal'?(data.verses[ref]?[ref]:[]):(data.mtIndex[ref]||[]);
  return {ref,numbering,refs,unresolved:!refs.length,baseRefs:numbering==='tal'?[...new Set(refs.flatMap(r=>data.verses[r].mtRefs))]:[ref]};
}
function remarks(data, notes, ref, spelling) {
  const verse=data.verses[ref];if(!verse)return [];
  const groups=verse.groups.map(g=>({...g,notes:g.notes.map(i=>notes.talNotes[i])}));
  const covered=new Set(groups.flatMap(g=>g.indices));
  let pending=[];
  const flush=()=>{if(pending.length)groups.push({indices:pending,notes:[]});pending=[];};
  verse.words.forEach((w,i)=>{if(w[1]&&!covered.has(i))pending.push(i);else flush();});flush();
  return groups.map(g=>{
    // Only the source's explicit approximation sign marks a spelling-only note.
    // Do not infer agreement or textual importance from absent annotations.
    const neutral=g.notes.length>0&&g.notes.every(n=>{const text=n.html.replace(/<[^>]*>/g,'');return text.includes('≈')&&!text.includes(']')&&!n.html.includes('class="mt-diff"');});
    return {...g,spelling:neutral,words:g.indices.map(i=>verse.words[i])};
  }).filter(g=>spelling||!g.spelling).sort((a,b)=>(a.indices[0]??Infinity)-(b.indices[0]??Infinity));
}
const api={resolve,remarks};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.TextCrit=api;
})();
