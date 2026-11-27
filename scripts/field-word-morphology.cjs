'use strict';
// Separate Greek equivalents of Hebrew prefixes/suffixes from the lexical head.
// Ambiguous or genuinely multiword translations remain phrases.
function group(tokens, morphology, hebrew, normalize) {
 const segments=hebrew.slice(1).split('/'),main=segments.find(s=>!/^(?:C|R|Td|S)/.test(s))||segments[0];
 const positions={V:['V'],N:['N','E'],A:['A'],D:['D'],P:['P'],C:['C'],R:['R'],T:['T']};
 const allowed=positions[main?.[0]]||[];
 const analyses=tokens.map(t=>morphology[normalize(t)]||[]);
 const candidates=analyses.map(a=>a.filter(x=>allowed.includes(x[1].split(' ')[0])));
 const heads=candidates.flatMap((a,i)=>a.length?[i]:[]);
 let retained=tokens.map((_,i)=>i);
 if(heads.length===1){
  const head=heads[0],budget={C:segments.filter(s=>s==='C').length,R:segments.filter(s=>s[0]==='R').length,T:segments.filter(s=>s==='Td').length,P:segments.filter(s=>s[0]==='S').length};
  const separable=analyses.every((a,i)=>{
   if(i===head)return true;
   // The corpus tags postpositive δέ as X; here it can realize Hebrew ו־.
   const pos=[...new Set(a.map(x=>x[0]==='δέ'&&x[1]==='X'?'C':x[1].split(' ')[0]))];
   if(pos.length!==1||!budget[pos[0]])return false;
   budget[pos[0]]--;return true;
  });
  if(separable)retained=[head];
 }
 const lemmas=retained.map(i=>[...new Set((retained.length===1&&heads.length===1?candidates[i]:analyses[i]).map(a=>a[0]))]);
 const certain=lemmas.every(a=>a.length===1),surface=retained.map(i=>tokens[i]).join(' ');
 const type=retained.length>1?'phrase':certain?'lemma':'form',label=certain?lemmas.map(a=>a[0]).join(' '):surface;
 return {type,label,surface,key:type+':'+label.normalize('NFC')};
}
module.exports={group};
