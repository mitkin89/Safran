const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'textcrit-data')),N=require(path.join(root,'samaritan-data')),C=require(path.join(root,'textcrit-core')),D=require(path.join(root,'samaritan-il')),I=require(path.join(root,'samaritan-interlinear'));
let counts={groups:0,oldUnlocated:0,newlyLocated:0,qereExpanded:0,conflicts:0},examples=[],conflicts=[];
for(const [ref,v]of Object.entries(T.verses)){
 const targets=v.mtRefs.flatMap(r=>C.words(T.mt[r]||'').map((word,index)=>({ref:r,word,index}))),mapped=C.alignPositions(v.words.map(w=>w[0]),targets.map(t=>t.word));
 for(const g of C.remarks(T,N,ref,true)){
  counts.groups++;const p=C.locate(mapped,g.indices,targets.length);let old=null;
  if(p?.kind==='word'&&targets[p.start]?.ref===targets[p.end]?.ref)old={kind:'word',ref:targets[p.start].ref,start:targets[p.start].index,end:targets[p.end].index};
  else if(p?.kind==='gap'){const l=targets[p.start],r=targets[p.start+1];if(l&&(!r||l.ref===r.ref))old={kind:'gap',ref:l.ref,start:l.index,end:l.index};else if(!l&&r)old={kind:'gap',ref:r.ref,start:-1,end:-1};}
  const next=I.noteAnchor(D,T,ref,g.indices);if(!old){counts.oldUnlocated++;if(next){counts.newlyLocated++;examples.push({ref,indices:g.indices,words:g.words.map(w=>w[0]),anchor:next});}}
  else if(next&&JSON.stringify(old)!==JSON.stringify(next)){if(I.qereExpansion(D,old,next))counts.qereExpanded++;else{counts.conflicts++;conflicts.push({ref,indices:g.indices,old,next});}}
 }
}
fs.writeFileSync(path.join(root,'tools/samaritan/apparatus-alignment-audit.json'),JSON.stringify({counts,conflicts,newlyLocated:examples},null,2)+'\n');console.log(counts);console.log(examples.slice(0,5));
