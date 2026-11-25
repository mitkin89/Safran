'use strict';
// Compose independently checked passage maps via their shared Greek numbering.
// Overlapping passage boundaries merge; no ordinal interpolation is performed.
function compose(counts,pairs){
 const parent=new Map(),all=[];
 for(let f=0;f<counts.length;f++)for(let v=1;v<=counts[f];v++){const id=f+':'+v;parent.set(id,id);all.push([id,f,v]);}
 const root=id=>{let p=parent.get(id);if(p!==id){p=root(p);parent.set(id,p);}return p;};
 const join=(a,b)=>{a=root(a);b=root(b);if(a!==b)parent.set(b,a);};
 const range=([a,b])=>a===0&&b===0?[]:Array.from({length:b-a+1},(_,i)=>a+i);
 for(const {families,groups}of pairs){
  for(let i=0;i<2;i++){const values=groups.flatMap(g=>range(g[i]));if(JSON.stringify(values)!==JSON.stringify(Array.from({length:counts[families[i]]},(_,j)=>j+1)))throw Error('Incomplete or non-monotonic mapping family '+families[i]);}
  for(const group of groups){const ids=group.flatMap((r,i)=>range(r).map(v=>families[i]+':'+v));for(const id of ids.slice(1))join(ids[0],id);}
 }
 // A connected passage must be contiguous in every source. Chaining two
 // independently reviewed broad passages can therefore require a broader one.
 for(let changed=true;changed;){changed=false;const spans=new Map();for(const[id,f,v]of all){const idRoot=root(id),row=spans.get(idRoot)||counts.map(()=>null);row[f]=row[f]?[Math.min(row[f][0],v),Math.max(row[f][1],v)]:[v,v];spans.set(idRoot,row);}
  for(const[id,sp]of spans)for(let f=0;f<sp.length;f++)if(sp[f])for(let v=sp[f][0];v<=sp[f][1];v++)if(root(id)!==root(f+':'+v)){join(id,f+':'+v);changed=true;}
 }
 const nodes=new Map();for(const[id,f,v]of all){const p=root(id),g=nodes.get(p)||{id:p,ranges:counts.map(()=>[0,0]),next:new Set(),incoming:0};const r=g.ranges[f];g.ranges[f]=r[0]?[Math.min(r[0],v),Math.max(r[1],v)]:[v,v];nodes.set(p,g);}
 for(let f=0;f<counts.length;f++)for(let v=1;v<counts[f];v++){const a=nodes.get(root(f+':'+v)),b=nodes.get(root(f+':'+(v+1)));if(a!==b&&!a.next.has(b.id)){a.next.add(b.id);b.incoming++;}}
 const ready=[...nodes.values()].filter(g=>!g.incoming),out=[];
 while(ready.length){const g=ready.shift();out.push(g.ranges);for(const id of g.next){const n=nodes.get(id);if(--n.incoming===0)ready.push(n);}}
 if(out.length!==nodes.size)throw Error('Crossing source order requires a reviewed larger passage');
 return out;
}
module.exports={compose};
