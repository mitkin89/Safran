// Digital Kennicott: locate the edition's lemma before mapping to Westminster.
(function(){
'use strict';
const C=typeof module!=='undefined'&&module.exports?require('./textcrit-core'):window.TextCrit;
const cons=s=>String(s).replace(/[^א-ת]/g,'');
const skeleton=s=>cons(s).replace(/[וי]/g,'');
const wholeVerse=lemma=>/^(?:tot(?:um|\.)? )?comm?(?:a|\.)$/i.test((lemma||[]).join(' '));
function locate(entry,base=[],mt=[]){
  if(!base.length||!mt.length)return {anchor:null,method:'Grundtext in der TEI fehlt oder ist leer'};
  if(entry.refs.length!==1)return {anchor:null,method:'Versbereich'};
  let indices=[],method='Lemma der Edition';
  const lemma=entry.lemma;
  if(wholeVerse(lemma)){
    // "Com." / "Tot. com." / "Totum comma": the edition's lemma is the whole verse.
    indices=base.map((_,i)=>i);method='Ganzer Vers (Lemma der Edition)';
  }else if(lemma.length){
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
function locateMapped(data,entry){
  if(!data.referenceMap)return locate(entry,data.base[entry.refs[0]]||[],data.mt[entry.refs[0]]||[]);
  if(entry.refs.length!==1)return {anchor:null,method:'Versbereich'};
  const source=entry.refs[0],mapping=data.referenceMap[source];
  if(!mapping)return {anchor:null,method:'Versbezug offen'};
  const targets=mapping.refs.flatMap(ref=>(data.mt[ref]||[]).map((word,index)=>({word,index,ref})));
  const result=locate(entry,data.base[source]||[],targets.map(t=>t.word));
  if(result.baseIndices?.length&&Number.isInteger(mapping.sourceStart)){
    const base=data.base[source],lo=Math.min(...result.baseIndices),hi=Math.max(...result.baseIndices);
    const start=mapping.sourceStart+base.slice(0,lo).reduce((n,w)=>n+cons(w).length,0),end=mapping.sourceStart+base.slice(0,hi+1).reduce((n,w)=>n+cons(w).length,0);
    let offset=0;const affected=targets.filter(t=>{const begin=offset;offset+=cons(t.word).length;return begin<end&&offset>start;});
    if(affected.length&&affected.every(t=>t.ref===affected[0].ref))return {...result,anchor:{kind:'word',ref:affected[0].ref,start:affected[0].index,end:affected.at(-1).index},referenceMethod:mapping.method+' · exact consonantal character span'};
    return {...result,anchor:null};
  }
  if(!result.anchor)return result;
  const a=result.anchor,left=targets[a.start],right=targets[a.end];let anchor=null;
  if(a.kind==='word'&&left&&right&&left.ref===right.ref)anchor={kind:'word',ref:left.ref,start:left.index,end:right.index};
  if(a.kind==='gap'){
    const next=targets[a.start+1];
    if(left&&(!next||next.ref===left.ref))anchor={kind:'gap',ref:left.ref,start:left.index,end:left.index};
    else if(!left&&next)anchor={kind:'gap',ref:next.ref,start:-1,end:-1};
  }
  return {...result,anchor,referenceMethod:mapping.method};
}
const graphic=r=>r.terms.some(t=>/major|ornata|majusc|fin\. lin|constip|minuscul/i.test(t.text));
const api={cons,locate,locateMapped,graphic,wholeVerse};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.Kennicott=api;
})();
