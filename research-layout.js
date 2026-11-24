'use strict';
const regions=['main','left','right','bottom'];
function layout(value={}){
 const n=(key,min,max,fallback)=>{const x=Number(value[key]);return Number.isFinite(x)?Math.min(max,Math.max(min,x)):fallback;};
 return {showTitle:value.showTitle!==false,template:value.template==='classic'?'classic':'linear',orientation:value.orientation==='landscape'?'landscape':'portrait',mainWidth:n('mainWidth',30,60,44),mainSize:n('mainSize',10,30,18),sideSize:n('sideSize',8,20,10),bottomSize:n('bottomSize',8,20,10)};
}
function group(blocks){const out=Object.fromEntries(regions.map(k=>[k,[]]));for(const b of blocks)out[regions.includes(b.region)?b.region:'main'].push(b);return out;}
function columns(blocks){const n=Math.max(1,Math.ceil(blocks.length/3));return [blocks.slice(0,n),blocks.slice(n,n*2),blocks.slice(n*2)];}
module.exports={layout,group,columns,regions};
