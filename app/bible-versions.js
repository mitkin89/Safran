(function(root){
 'use strict';
 function select(versions,selected,prefs={},lang='de'){
  const result=new Set(selected),real=k=>versions.filter(v=>v.kind===k&&v.versionTitle!=='merged');
  const replace=(k,v)=>{if(!v)return;for(const rel of result)if(versions.find(x=>x.rel===rel)?.kind===k)result.delete(rel);result.add(v.rel);};
  const he=real('he'),de=real('de');
  replace('he',he.find(v=>v.versionTitle===prefs.pvHe)||he.find(v=>/^Westminster/i.test(v.versionTitle))||he[0]);
  if(lang==='de'||prefs.pvDe||de.some(v=>result.has(v.rel)))replace('de',de.find(v=>v.versionTitle===prefs.pvDe)||(!prefs.pvDe?de.find(v=>/Zunz/.test(v.versionTitle)):null)||de[0]);
  const x=prefs.pvX;
  const extra=x?.startsWith('@')?real(x.slice(1))[0]:versions.find(v=>v.versionTitle===x&&x);
  if(extra){if(extra.kind==='he'||extra.kind==='de')result.add(extra.rel);else replace(extra.kind,extra);}
  return result;
 }
 // Remember exact ordered editions, with a stable identity if an import moves its file.
 function snapshot(versions,selected){
  return [...selected].map(rel=>versions.find(v=>v.rel===rel)).filter(Boolean)
   .map(({rel,kind,language,versionTitle})=>({rel,kind,language,versionTitle}));
 }
 function restore(versions,saved){
  const result=new Set();
  for(const item of Array.isArray(saved)?saved:[]){
   const record=typeof item==='string'?{rel:item}:item;
   if(!record||typeof record!=='object')continue;
   let match=versions.find(v=>v.rel===record.rel);
   if(!match&&typeof record.versionTitle==='string'){
    const candidates=versions.filter(v=>v.versionTitle===record.versionTitle&&v.kind===record.kind&&v.language===record.language);
    if(candidates.length===1)match=candidates[0];
   }
   if(match)result.add(match.rel);
  }
  return result;
 }
 const api={select,snapshot,restore};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BibleVersions=api;
})(typeof window==='undefined'?globalThis:window);
