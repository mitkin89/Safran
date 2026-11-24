(function(root){
 'use strict';
 function moveMany(blocks,ids,region,before=null){
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||!['main','left','right','bottom'].includes(region))return false;
  const chosen=new Set(ids);if(ids.some(id=>!blocks.some(b=>b.id===id))||before&&(chosen.has(before)||!blocks.some(b=>b.id===before)))return false;
  const previous=JSON.stringify(blocks.map(b=>[b.id,b.region||'main'])),moving=blocks.filter(b=>chosen.has(b.id)),rest=blocks.filter(b=>!chosen.has(b.id));moving.forEach(b=>b.region=region);
  rest.splice(before?rest.findIndex(b=>b.id===before):rest.length,0,...moving);blocks.splice(0,blocks.length,...rest);return previous!==JSON.stringify(blocks.map(b=>[b.id,b.region||'main']));
 }
 function move(blocks,id,region,before=null){return moveMany(blocks,[id],region,before);}
 const api={move,moveMany};if(typeof module!=='undefined')module.exports=api;else root.ResearchArrange=api;
})(typeof window==='undefined'?globalThis:window);
