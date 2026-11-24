(function(root){
 'use strict';
 function move(blocks,id,region,before=null){
  if(!['main','left','right','bottom'].includes(region))return false;
  const at=blocks.findIndex(b=>b.id===id);if(at<0||id===before||before&&!blocks.some(b=>b.id===before))return false;
  const previous=blocks.map(b=>b.id).join('|'),old=blocks[at].region||'main',b=blocks.splice(at,1)[0];b.region=region;
  blocks.splice(before?blocks.findIndex(b=>b.id===before):blocks.length,0,b);
  return old!==region||previous!==blocks.map(b=>b.id).join('|');
 }
 const api={move};if(typeof module!=='undefined')module.exports=api;else root.ResearchArrange=api;
})(typeof window==='undefined'?globalThis:window);
