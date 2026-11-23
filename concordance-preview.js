// Source-position previews for aligned translations. No substring guessing.
(function(){
'use strict';
const tokens=text=>[...String(text||'').matchAll(/[\p{L}\p{M}\p{N}]+/gu)].filter(m=>/[\p{L}\p{N}]/u.test(m[0]));
function render(hit,esc){
 if(typeof hit?.context!=='string'||!Array.isArray(hit.positions)||!hit.positions.length)return null;
 const ts=tokens(hit.context),at=[...new Set(hit.positions)].sort((a,b)=>a-b);
 if(at.some(i=>!Number.isInteger(i)||i<1||!ts[i-1]))return null;
 if(at.map(i=>ts[i-1][0]).join(' ')!==tokens((hit.words||[]).join(' ')).map(m=>m[0]).join(' '))return null;
 let end=0,html='';
 for(const i of at){const token=ts[i-1];html+=esc(hit.context.slice(end,token.index))+'<span class="pvhl">'+esc(token[0])+'</span>';end=token.index+token[0].length;}
 html+=esc(hit.context.slice(end));
 const lang=hit.language==='Syriac'?'syr':hit.kind==='he'?'he':'grc',rtl=lang!=='grc';
 return `<div class="pvp concordancePreview" lang="${lang}" dir="${rtl?'rtl':'ltr'}">${html}</div>`;
}
const api={render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.ConcordancePreview=api;
})();
