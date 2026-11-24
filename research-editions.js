(function(root){
 'use strict';
 const hebrew=e=>e.kind==='he'||/^(he|Hebrew)$/i.test(e.language||'');
 function preferred(editions,remembered){
  const explicit=editions.find(e=>e.rel===remembered?.rel)||editions.find(e=>e.versionTitle===remembered?.versionTitle);
  return explicit||editions.find(e=>hebrew(e)&&/^Westminster\b/i.test(e.versionTitle||''))||editions.find(e=>e.kind==='de'||/^(de|German)$/i.test(e.language||''))||editions[0];
 }
 function language(entry={}){return ({de:'German',he:'Hebrew',en:'English'})[entry.kind]||({de:'German',he:'Hebrew',en:'English'})[entry.language]||entry.language||'';}
 const api={preferred,language};if(typeof module!=='undefined')module.exports=api;else root.ResearchEditions=api;
})(typeof window==='undefined'?globalThis:window);
