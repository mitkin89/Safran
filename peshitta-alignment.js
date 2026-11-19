// PaTraCoSy Genesis pilot: positional links are automatic, never confirmed variants.
(function(global){
'use strict';
function prepare(data,he,sy){return !!(data?.version===1&&he?.textHash===data.source.he.textHash&&sy?.textHash===data.source.translation.textHash);}
function verse(data,ref,heWords,syWords){
 const r=data?.verses?.[ref];if(!r||r.he.length!==heWords.length||r.he.some((w,i)=>w!==heWords[i])||syWords&&(r.sy.length!==syWords.length||r.sy.some((w,i)=>w!==syWords[i])))return null;
 if(r.links.length!==r.sy.length||r.links.some(ix=>!Array.isArray(ix)||ix.some(i=>!Number.isInteger(i)||i<1||i>r.he.length)))return null;
 return r;
}
function segments(data,ref,cell,doc){
 const r=verse(data,ref,[...cell.querySelectorAll('.w')].map(w=>w.textContent));if(!r)return null;
 const [c,v]=ref.split(':').map(Number),html=doc.text[c-1]?.[v-1]||'',ids=[...html.matchAll(/data-si="(\d+)"/g)].map(m=>m[1]);
 if(ids.length!==r.sy.length)return null;
 return r.sy.map((w,i)=>[r.links[i],w,null,{id:ids[i],rel:doc.entry.rel}]);
}
function wordHtml(s,meta,esc){return `<span class="syw" data-si="${esc(meta.id)}" data-sy-rel="${esc(meta.rel)}" lang="syr" dir="rtl">${esc(s)}</span><small class="ps-translit" lang="he" dir="rtl">${esc(global.SyriacMorph.hebrew(s))}</small>`;}
const api={prepare,verse,segments,wordHtml};if(typeof module==='object'&&module.exports)module.exports=api;else global.PeshittaAlignment=api;
})(typeof window==='object'?window:globalThis);
