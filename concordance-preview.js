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
function attach(root,{getHit,getHover}){
 let anchor=null;
 const selector='.ccPeer[data-cp], .ccRow[data-i]';
 const hide=()=>{if(anchor){getHover()?.hide();anchor=null;}};
 const start=e=>{
  const a=e.target.closest(selector);if(!a||a===anchor)return;
  const hit=getHit(+a.dataset.i,a.dataset.cp),hover=getHover();
  if(!hit||!hover)return;
  anchor=a;hover.start(a,[hit.title,hit.where].filter(Boolean).join(' · '),true,false,{concordance:hit});
 };
 const stop=e=>{const a=e.target.closest(selector);if(a&&a===anchor&&!a.contains(e.relatedTarget))hide();};
 root.addEventListener('mouseover',start);root.addEventListener('focusin',start);
 root.addEventListener('mouseout',stop);root.addEventListener('focusout',stop);
 root.addEventListener('click',hide);
 root.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const a=e.target.closest(selector);if(a&&e.target===a){e.preventDefault();hide();a.click();}}});
 root.ownerDocument.addEventListener('scroll',hide,true);
 if(typeof MutationObserver!=='undefined')new MutationObserver(hide).observe(root,{childList:true});
}
const api={render,attach};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.ConcordancePreview=api;
})();
