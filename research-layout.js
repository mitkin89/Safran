'use strict';
const regions=['main','left','right','bottom'];
function layout(value={}){
 const n=(key,min,max,fallback)=>{const x=Number(value[key]);return Number.isFinite(x)?Math.min(max,Math.max(min,x)):fallback;};
 return {showTitle:value.showTitle!==false,template:value.template==='classic'?'classic':'linear',orientation:value.orientation==='landscape'?'landscape':'portrait',mainWidth:n('mainWidth',30,60,44),mainSize:n('mainSize',10,30,18),sideSize:n('sideSize',8,20,10),bottomSize:n('bottomSize',8,20,10)};
}
function group(blocks){const out=Object.fromEntries(regions.map(k=>[k,[]]));for(const b of blocks)out[regions.includes(b.region)?b.region:'main'].push(b);return out;}
function upper(blocks,value={}){
 const l=layout(value),g=group(blocks),side=(100-l.mainWidth)/2;
 const expanded=g.main.length>0,main=l.mainWidth+(expanded&&!g.left.length?side:0)+(expanded&&!g.right.length?side:0);
 return [['left',side],['main',main],['right',side]].filter(([r])=>!expanded||r==='main'||g[r].length).map(([region,width])=>({region,width,blocks:g[region]}));
}
function columns(blocks){const n=Math.max(1,Math.ceil(blocks.length/3));return [blocks.slice(0,n),blocks.slice(n,n*2),blocks.slice(n*2)];}
function pairSizes(value={}){
 const out={};for(const key of ['sourceSize','translationSize']){const n=value[key];if(n==null)continue;if(typeof n!=='number'||!Number.isFinite(n)||n<8||n>36)throw Error('Schriftgrößen müssen zwischen 8 und 36 pt liegen.');out[key]=n;}return out;
}
module.exports={layout,group,columns,regions,pairSizes,upper};
