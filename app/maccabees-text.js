(function(root){
 'use strict';
 // A fast rendering checksum supplements the backend's SHA-256 of the whole
 // source book. It catches a changed column without shipping copies of texts.
 function signature(rows){
  const s=JSON.stringify(rows.map(r=>[String(r.label),String(r.html).replace(/\s+/g,' ').trim()]));
  let a=2166136261,b=2246822519;
  for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489917);}
  return s.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);
 }
 const api={signature};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaccabeesText=api;
})(typeof window==='undefined'?globalThis:window);
