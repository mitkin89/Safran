// Digital Kennicott: locate the edition's lemma before mapping to Westminster.
(function(){
'use strict';
const C=typeof module!=='undefined'&&module.exports?require('./textcrit-core'):window.TextCrit;
const cons=s=>String(s).replace(/[^א-ת]/g,'');
const skeleton=s=>cons(s).replace(/[וי]/g,'');
function locate(entry,base=[],mt=[]){
  if(!base.length||!mt.length)return {anchor:null,method:'Grundtext in der TEI fehlt oder ist leer'};
  if(entry.refs.length!==1)return {anchor:null,method:'Versbereich'};
  let indices=[],method='Lemma der Edition';
  const lemma=entry.lemma;
  if(lemma.length){
    if(lemma.some(w=>!cons(w)||/[A-Za-z]/.test(w)))return {anchor:null,method:'Textumfang der Quelle'};
    const matches=[];
    for(let i=0;i<=base.length-lemma.length;i++)if(lemma.every((w,j)=>cons(w)===cons(base[i+j])))matches.push(i);
    const ord=entry.ordinal.length===1?parseInt(entry.ordinal[0],10):null;
    const first=ord?matches[ord-1]:matches.length===1?matches[0]:undefined;
    if(first===undefined)return {anchor:null,method:'Mehrdeutiges oder abweichendes Lemma'};
    indices=lemma.map((_,i)=>first+i);
  }else{
    // This is a positional aid only, never a judgement that a reading is merely orthographic.
    const readings=entry.readings.flatMap(r=>r.words.length===1&&cons(r.words[0]).length>=3&&!/[A-Za-z]/.test(r.words[0])?[r.words[0]]:[]);
    const positions=new Set();
    for(const w of readings){
      let candidates=base.map((b,i)=>cons(b)===cons(w)?i:-1).filter(i=>i>=0);
      if(!candidates.length&&skeleton(w).length>=2)candidates=base.map((b,i)=>skeleton(b)===skeleton(w)?i:-1).filter(i=>i>=0);
      if(candidates.length!==1)return {anchor:null,method:'Wortposition offen'};
      positions.add(candidates[0]);
    }
    if(positions.size!==1)return {anchor:null,method:'Wortposition offen'};
    indices=[...positions];method='Wortvergleich (maschinell)';
  }
  const anchor=C.locate(C.alignPositions(base,mt),indices,mt.length);
  return {anchor:anchor?{...anchor,ref:entry.refs[0]}:null,method,baseIndices:indices};
}
const graphic=r=>r.terms.some(t=>/major|ornata|majusc|fin\. lin|constip|minuscul/i.test(t.text));
const api={cons,locate,graphic};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.Kennicott=api;
})();
