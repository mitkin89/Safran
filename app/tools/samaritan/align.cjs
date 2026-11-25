'use strict';
// Source-preserving sequence alignment. Only positions shared by every optimal
// path survive; an ambiguous match is never promoted to a word assignment.
const cons=s=>String(s).normalize('NFKD').replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'})[c]);
function align(source,target){
 const a=source.map(cons),b=target.map(cons),n=a.length,m=b.length;
 const f=Array.from({length:n+1},()=>new Float64Array(m+1).fill(Infinity)),r=Array.from({length:n+1},()=>new Float64Array(m+1).fill(Infinity));
 const ca=new Map(),cb=new Map();for(const x of a)ca.set(x,(ca.get(x)||0)+1);for(const x of b)cb.set(x,(cb.get(x)||0)+1);
 const edges=(i,j)=>{
  const out=[];
  if(i<n)out.push({di:1,dj:0,c:10,maps:[[]],kind:'addition'});
  if(j<m)out.push({di:0,dj:1,c:10,maps:[],kind:'omission'});
  if(i<n&&j<m){
   const same=a[i]===b[j],spell=!same&&a[i].length>=3&&b[j].length>=3&&a[i][0]===b[j][0]&&a[i].at(-1)===b[j].at(-1)&&a[i].replace(/[וי]/g,'')===b[j].replace(/[וי]/g,'');
   out.push({di:1,dj:1,c:same?0:spell?4:8,maps:[[j]],kind:same?'exact':spell?'spelling':'context'});
   for(let k=2;k<=3;k++){
    if(j+k<=m&&a[i]===b.slice(j,j+k).join(''))out.push({di:1,dj:k,c:2,maps:[Array.from({length:k},(_,q)=>j+q)],kind:'division'});
    if(i+k<=n&&a.slice(i,i+k).join('')===b[j])out.push({di:k,dj:1,c:2,maps:Array.from({length:k},()=>[j]),kind:'division'});
   }
   if(i+1<n&&j+1<m&&a[i]!==a[i+1]&&ca.get(a[i])===1&&ca.get(a[i+1])===1&&cb.get(b[j])===1&&cb.get(b[j+1])===1&&a[i]===b[j+1]&&a[i+1]===b[j])out.push({di:2,dj:2,c:3,maps:[[j+1],[j]],kind:'transposed'});
  }
  return out;
 };
 f[0][0]=0;r[n][m]=0;
 for(let i=0;i<=n;i++)for(let j=0;j<=m;j++)for(const e of edges(i,j))f[i+e.di][j+e.dj]=Math.min(f[i+e.di][j+e.dj],f[i][j]+e.c);
 for(let i=n;i>=0;i--)for(let j=m;j>=0;j--)for(const e of edges(i,j))r[i][j]=Math.min(r[i][j],e.c+r[i+e.di][j+e.dj]);
 const candidates=Array.from({length:n},()=>new Map()),targets=Array.from({length:m},()=>new Set());
 for(let i=0;i<=n;i++)for(let j=0;j<=m;j++)for(const e of edges(i,j)){
  if(f[i][j]+e.c+r[i+e.di][j+e.dj]!==f[n][m])continue;
  e.maps.forEach((indices,k)=>{const key=indices.length?indices.join(','):'gap:'+j;const old=candidates[i+k].get(key);candidates[i+k].set(key,{indices,kind:old?.kind===e.kind?e.kind:old?'context':e.kind,boundary:j});});
  if(!e.di)targets[j].add('missing');
  else for(let q=j;q<j+e.dj;q++)targets[q].add(i);
 }
 const mapped=candidates.map(c=>c.size===1?[...c.values()][0]:null);
 const exact=mapped.filter((x,i)=>x&&(x.kind==='division'||x.indices.length===1&&a[i]===b[x.indices[0]])).length;
 const confident=n>0&&m>0&&exact>=Math.min(2,n,m)&&exact/Math.min(n,m)>=.35;
 return {mapped:confident?mapped:source.map(()=>null),missing:confident?targets.map((s,i)=>s.size===1&&s.has('missing')?i:-1).filter(i=>i>=0):[],confident,exact,cost:f[n][m]};
}
module.exports={cons,align};
