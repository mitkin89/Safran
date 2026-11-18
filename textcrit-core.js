// Text-critical witnesses: source references and apparatus, independent of the UI.
(function(){
'use strict';
function resolve(data, ref, numbering) {
  const refs=numbering==='tal'?(data.verses[ref]?[ref]:[]):(data.mtIndex[ref]||[]);
  return {ref,numbering,refs,unresolved:!refs.length,baseRefs:numbering==='tal'?[...new Set(refs.flatMap(r=>data.verses[r].mtRefs))]:[ref]};
}
function remarks(data, notes, ref, spelling) {
  const verse=data.verses[ref];if(!verse)return [];
  const groups=verse.groups.map(g=>({...g,notes:g.notes.map(i=>notes.talNotes[i])}));
  const covered=new Set(groups.flatMap(g=>g.indices));
  let pending=[];
  const flush=()=>{if(pending.length)groups.push({indices:pending,notes:[]});pending=[];};
  verse.words.forEach((w,i)=>{if(w[1]&&!covered.has(i))pending.push(i);else flush();});flush();
  return groups.map(g=>{
    // Only the source's explicit approximation sign marks a spelling-only note.
    // Do not infer agreement or textual importance from absent annotations.
    const neutral=g.notes.length>0&&g.notes.every(n=>{const text=n.html.replace(/<[^>]*>/g,'');return text.includes('≈')&&!text.includes(']')&&!n.html.includes('class="mt-diff"');});
    return {...g,spelling:neutral,words:g.indices.map(i=>verse.words[i])};
  }).filter(g=>spelling||!g.spelling).sort((a,b)=>(a.indices[0]??Infinity)-(b.indices[0]??Infinity));
}

const consonants=s=>String(s).replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'})[c]);
const words=s=>String(s).match(/[א-ת][א-ת\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7]*/g)||[];
// Retain only source positions shared by every minimum-edit alignment. A
// repeated spelling alone is insufficient to choose a particular occurrence.
function alignPositions(source,target){
  const a=source.map(consonants),b=target.map(consonants),n=a.length,m=b.length;
  const f=Array.from({length:n+1},()=>Array(m+1).fill(Infinity));
  const back=Array.from({length:n+1},()=>Array(m+1).fill(Infinity));f[0][0]=0;back[n][m]=0;
  for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
    const d=f[i][j];if(i<n)f[i+1][j]=Math.min(f[i+1][j],d+1);
    if(j<m)f[i][j+1]=Math.min(f[i][j+1],d+1);
    if(i<n&&j<m)f[i+1][j+1]=Math.min(f[i+1][j+1],d+(a[i]===b[j]?0:1));
  }
  for(let i=n;i>=0;i--)for(let j=m;j>=0;j--){
    if(i<n)back[i][j]=Math.min(back[i][j],1+back[i+1][j]);
    if(j<m)back[i][j]=Math.min(back[i][j],1+back[i][j+1]);
    if(i<n&&j<m)back[i][j]=Math.min(back[i][j],(a[i]===b[j]?0:1)+back[i+1][j+1]);
  }
  const mapped=a.map((_,i)=>{
    const possible=new Set();
    for(let j=0;j<=m;j++){
      if(f[i][j]+1+back[i+1][j]===f[n][m])possible.add(null);
      if(j<m&&f[i][j]+(a[i]===b[j]?0:1)+back[i+1][j+1]===f[n][m])possible.add(j);
    }
    return possible.size===1?[...possible][0]:undefined;
  });
  const exact=mapped.filter((j,i)=>Number.isInteger(j)&&a[i]&&a[i]===b[j]).length;
  if(!n||!m||exact/Math.max(n,m)<.55)return source.map(()=>undefined);
  return mapped;
}
function locate(mapped,indices,targetLength,boundary=null){
  if(!targetLength||(!indices.length&&boundary===null))return null;
  const positions=indices.map(i=>mapped[i]);
  if(positions.some(p=>p===undefined))return null;
  if(positions.length&&positions.every(Number.isInteger)){
    const unique=[...new Set(positions)].sort((a,b)=>a-b);
    if(unique.some((p,i)=>i&&p!==unique[i-1]+1))return null;
    return {kind:'word',start:unique[0],end:unique.at(-1)};
  }
  if(positions.some(Number.isInteger))return null;
  const lo=indices.length?Math.min(...indices):boundary,hi=indices.length?Math.max(...indices)+1:boundary;
  let left=lo-1,right=hi;
  while(left>=0&&mapped[left]===null)left--;
  while(right<mapped.length&&mapped[right]===null)right++;
  const before=left<0?-1:mapped[left],after=right===mapped.length?targetLength:mapped[right];
  if(!Number.isInteger(before)||!Number.isInteger(after)||after!==before+1)return null;
  return {kind:'gap',start:before,end:before};
}
function groupLoci(entries){
  const groups=[],gaps=new Map();
  const ordered=entries.filter(e=>e.anchor?.kind==='word').sort((a,b)=>a.anchor.start-b.anchor.start);
  for(const entry of ordered){
    const a=entry.anchor,last=groups.at(-1);
    if(last&&a.start<=last.end){last.end=Math.max(last.end,a.end);last.entries.push(entry);}
    else groups.push({...a,entries:[entry]});
  }
  for(const entry of entries.filter(e=>e.anchor?.kind==='gap')){
    const a=entry.anchor;if(!gaps.has(a.start))gaps.set(a.start,{...a,entries:[]});gaps.get(a.start).entries.push(entry);
  }
  groups.push(...gaps.values());groups.sort((a,b)=>(a.start*2+(a.kind==='word'?1:2))-(b.start*2+(b.kind==='word'?1:2)));
  const unresolved=entries.filter(e=>!e.anchor);if(unresolved.length)groups.push({kind:'unresolved',entries:unresolved});
  return groups;
}
const api={resolve,remarks,words,alignPositions,locate,groupLoci};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.TextCrit=api;
})();
