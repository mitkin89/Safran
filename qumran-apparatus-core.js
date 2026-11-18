// Conservative DSS fragment comparison; reconstructions never supply exact anchors.
(function(){
'use strict';
const cons=s=>String(s).replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'})[c]);
const certain=t=>!!cons(t.text)&&!Object.keys(t.flags).length;
function align(tokens,target){
  const a=tokens.map(t=>cons(t.text)),b=target.map(cons),n=a.length,m=b.length;
  const f=Array.from({length:n+1},()=>Array(m+1).fill(Infinity));
  const r=Array.from({length:n+1},()=>Array(m+1).fill(Infinity));
  for(let j=0;j<=m;j++){f[0][j]=0;r[n][j]=0;}
  const cost=(i,j)=>certain(tokens[i])&&a[i]===b[j]?0:1;
  for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
    if(i<n)f[i+1][j]=Math.min(f[i+1][j],f[i][j]+1);
    if(j<m)f[i][j+1]=Math.min(f[i][j+1],f[i][j]+1);
    if(i<n&&j<m)f[i+1][j+1]=Math.min(f[i+1][j+1],f[i][j]+cost(i,j));
  }
  for(let i=n-1;i>=0;i--)for(let j=m;j>=0;j--){
    r[i][j]=Math.min(1+r[i+1][j],j<m?1+r[i][j+1]:Infinity,j<m?cost(i,j)+r[i+1][j+1]:Infinity);
  }
  const best=Math.min(...f[n]);
  const mapped=a.map((_,i)=>{
    const possible=new Set();
    for(let j=0;j<=m;j++){
      if(f[i][j]+1+r[i+1][j]===best)possible.add(null);
      if(j<m&&f[i][j]+cost(i,j)+r[i+1][j+1]===best)possible.add(j);
    }
    return possible.size===1?[...possible][0]:undefined;
  });
  const exact=mapped.filter((j,i)=>Number.isInteger(j)&&certain(tokens[i])&&a[i]===b[j]).length;
  const available=tokens.filter(certain).length;
  // A single anchor only identifies itself; it cannot license another reading.
  if(exact<2){return mapped.map((j,i)=>Number.isInteger(j)&&certain(tokens[i])&&a[i]===b[j]?j:undefined);}
  if(exact/Math.max(1,available)<.5)return tokens.map(()=>undefined);
  return mapped;
}
// Reuse the existing interlinear only after matching the entire witness/verse
// consonant stream. Offsets preserve repeated words and morpheme boundaries.
function interlinearAnchors(segments,mt,rows){
  const out=new Map();
  for(const sig of new Set(segments.map(s=>s.scroll))){
    const legacy=(rows||[]).filter(r=>r[0]===sig);if(legacy.length!==1)continue;
    const selected=segments.filter(s=>s.scroll===sig),tokens=selected.flatMap(s=>s.tokens).filter(t=>cons(t.text));
    let cursor=0;
    const old=legacy[0][1].filter(r=>cons(r[1])).map(([indices,text])=>{
      const start=cursor;cursor+=cons(text).length;return {start,end:cursor,indices};
    });
    const text=tokens.map(t=>cons(t.text)).join('');
    if(text!==legacy[0][1].map(r=>cons(r[1])).join(''))continue;
    const candidates=new Map();cursor=0;
    for(const token of tokens){
      const start=cursor;cursor+=cons(token.text).length;
      const matches=old.filter(o=>o.start<cursor&&o.end>start);
      if(!matches.length||matches.some(o=>!o.indices.length))continue;
      const indices=[...new Set(matches.flatMap(o=>o.indices))].sort((a,b)=>a-b);
      if(indices.some((p,i)=>!Number.isInteger(p)||p<1||p>mt.length||(i&&p!==indices[i-1]+1)))continue;
      candidates.set(token,{kind:'word',start:indices[0]-1,end:indices.at(-1)-1});
    }
    let conflict=false;
    for(const segment of selected){
      const primary=align(segment.tokens,mt);
      segment.tokens.forEach((t,i)=>{
        const j=primary[i],candidate=candidates.get(t);
        if(candidate&&Number.isInteger(j)&&certain(t)&&cons(t.text)===cons(mt[j])&&(j<candidate.start||j>candidate.end))conflict=true;
      });
    }
    if(!conflict)for(const [token,anchor] of candidates)out.set(token,anchor);
  }
  return out;
}
function remarks(segment,mt,assistance=new Map()){
  const mapped=align(segment.tokens,mt),out=[];
  segment.tokens.forEach((token,index)=>{
    const at=mapped[index],f=token.flags,c=cons(token.text);
    let anchor=Number.isInteger(at)?{kind:'word',start:at,end:at}:null,method='word-anchors';
    if(!anchor&&at===null&&certain(token)){
      const left=mapped[index-1],right=mapped[index+1];
      if(certain(segment.tokens[index-1]||{text:'',flags:{}})&&certain(segment.tokens[index+1]||{text:'',flags:{}})&&Number.isInteger(left)&&right===left+1)anchor={kind:'gap',start:left,end:left};
    }
    if(!anchor&&assistance.has(token)){anchor=assistance.get(token);method='interlinear';}
    const same=anchor?.kind==='word'&&c===cons(mt.slice(anchor.start,anchor.end+1).join(''));
    // Reading uncertainty alone is not a textual variant. Its exact per-letter
    // status remains available in the manuscript context hover.
    if(same&&!f.cor&&!f.rem&&!f.alt&&!f.vac&&!f.missing)return;
    const whollyReconstructed=token.letters>0&&token.reconstructedLetters===token.letters;
    const hasStatus=!!(f.unc||f.cor||f.rem||f.alt||f.vac||f.missing);
    if(!hasStatus&&whollyReconstructed)return;
    if(!c&&!hasStatus)return;
    const unknown=!anchor;
    const status=f.missing?'Lücke':f.rem?'Gestrichener Text':f.cor?'Korrektur':f.unc?'Unsichere Lesung':f.rec?'Teilrekonstruiert':f.alt?'Alternative Lesung':f.vac?'Unbeschriebener Raum':anchor?.kind==='gap'?'Möglicher Zusatz':unknown?'Zuordnung offen':'Lesartunterschied';
    out.push({token,index,anchor,method,status,different:!same&&certain(token)&&!!anchor,uncertain:!certain(token)||unknown});
  });
  // No missing MT token becomes a minus; damage is not evidence for omission.
  return out;
}
function spelling(token,target,meta){
  if(!certain(token)||!meta)return false;
  const a=cons(token.text),b=cons(target);
  if(a===b||a.length<3||b.length<3||a[0]!==b[0]||a.at(-1)!==b.at(-1))return false;
  const skeleton=s=>s[0]+s.slice(1,-1).replace(/[וי]/g,'')+s.at(-1);
  if(skeleton(a)!==skeleton(b))return false;
  const part=token.parts.find(p=>p.morph.startsWith('subs.'));
  if(!part||!meta.lemmas.map(cons).includes(cons(part.lemma)))return false;
  const q=part.morph.split('.'),mt=/(?:^|\/)H?N[cg]([mfcb])([spd])/.exec(meta.morph);
  return !!mt&&q[4]===mt[1]&&q[5]===mt[2];
}
const api={cons,certain,align,remarks,spelling,interlinearAnchors};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.QumranApparatus=api;
})();
