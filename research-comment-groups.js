(function(root){
 'use strict';
 function key(b){
  const c=b.citation||{},work=c.work||b.title||'';if(b.type!=='source'||b.presentation||!b.reference?.rel||!/(?:\bon\b| על )/i.test(work))return '';
  const p=b.reference.sectionPath||[],n=p.findIndex(x=>typeof x==='number'),unit=n<0?p:p.slice(0,n+1);
  return JSON.stringify([b.reference.rel,b.sourceHash||'',work,c.edition||'',c.language||'',b.region||'main',unit]);
 }
 function runs(blocks){
  const out=[];for(const b of blocks){const k=key(b),last=out.at(-1);if(k&&last?.key===k)last.blocks.push(b);else out.push({key:k,blocks:[b]});}return out;
 }
 function selections(items){
  const groups=new Map();items.forEach((item,i)=>{const k=JSON.stringify([item.title,item.rel,item.edition,item.language]);if(!groups.has(k))groups.set(k,{title:item.title,rel:item.rel,edition:item.edition,language:item.language,items:[]});groups.get(k).items.push({item,i});});return [...groups.values()];
 }
 function sort(blocks){
  const cmp=(a,b)=>{const pa=a.reference?.sectionPath||[],pb=b.reference?.sectionPath||[];for(let i=0;i<Math.max(pa.length,pb.length);i++){if(pa[i]===pb[i])continue;if(pa[i]===undefined)return -1;if(pb[i]===undefined)return 1;const d=typeof pa[i]==='number'&&typeof pb[i]==='number'?pa[i]-pb[i]:String(pa[i]).localeCompare(String(pb[i]),undefined,{numeric:true});if(d)return d;}return String(a.reference?.labels?.[0]||'').localeCompare(String(b.reference?.labels?.[0]||''),undefined,{numeric:true});};
  const groups=new Map();for(const b of blocks){const k=JSON.stringify([b.reference?.rel,b.sourceHash,b.citation?.work,b.citation?.edition,b.citation?.language]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(b);}return [...groups.values()].flatMap(xs=>xs.sort(cmp));
 }
 const api={key,runs,selections,sort};if(typeof module!=='undefined')module.exports=api;else root.ResearchCommentGroups=api;
})(typeof window==='undefined'?globalThis:window);
