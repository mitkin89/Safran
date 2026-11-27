'use strict';
// Read-only reproducible ledger/source/image QA. No morphology inference or module writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=path.resolve(__dirname,'../..'), file=path.join(__dirname,'accordance-nashim-current-ketubot-observations.json'),L=JSON.parse(fs.readFileSync(file)),D=require(path.join(base,'mishnah-kaufmann-accordance-ketubot-data.js')),sha=b=>crypto.createHash('sha256').update(b).digest('hex'), errors=[],seen=new Set(),images=new Map();
for(const [n,o]of L.observations.entries()){
 const u=D.units[o.ref];if(!u||o.sourceTextHash!==D.source.textHash||o.humanValidated!==false)errors.push({n,error:'source/hash/human flag'});
 if(!o.actualObservedWord||!o.observed.lex||!o.observed.tag)errors.push({n,error:'empty raw cell'});
 if(o.observed.accordanceRef!==o.ref)errors.push({n,error:'unexpected reference scope'});
 for(const [j,i]of o.sourceWordIndexes.entries()){
  if(u?.words[i]?.transferId!==o.sourceWordIds[j])errors.push({n,error:'source index/id mismatch',i});
  seen.add(o.sourceWordIds[j]);
 }
 if(o.word!==o.sourceWordIndexes.map(i=>u.words[i].text).join(' '))errors.push({n,error:'source text mismatch'});
 images.set(o.image.path,o.image);
}
for(const im of images.values())if(sha(fs.readFileSync(im.path))!==im.sha256||!im.driveId)errors.push({image:im.file,error:'image evidence mismatch'});
const sourceGaps=[],unbound=[];
for(const[ref,u]of Object.entries(D.units))for(const[i,w]of u.words.entries())if(!seen.has(w.transferId)){const a={ref,index:i,word:w.text,sourceWordId:w.transferId};(w.text==='□'?sourceGaps:unbound).push(a);}
const cutRanges=[['5:1',85,91,165,166],['5:8',82,95,172,173],['8:1',80,108,191,192],['9:1',78,101,199,200],['9:5',75,75,203,204],['9:8',76,108,206,207],['9:9',83,100,207,208],['11:4',78,79,217,218]];
const screenshotCuts=cutRanges.map(([ref,start,end,lastImage,nextImage])=>({ref,start,end,lastImage,nextImage,reason:'Previous image ends before these source words; next image begins at next unit. Not reconstructed.',positions:unbound.filter(w=>w.ref===ref&&w.index>=start&&w.index<=end)}));
const cutKeys=new Set(screenshotCuts.flatMap(c=>c.positions.map(p=>p.sourceWordId))),otherUnbound=unbound.filter(w=>!cutKeys.has(w.sourceWordId)).map(p=>({...p,reason:p.ref==='10:6'?'Source trailing halakhah markers not printed as lexical cells.':p.ref==='12:3'?'Current target includes extra/reordered לה and אמרה; no separate literal cell bound automatically.':'No separate literal visible cell was identified; left open.'}));
const report={version:1,title:D.title,method:'Read-only source index/hash, image SHA/Drive ID, raw schema and coverage validation. AI transcription is not human review.',ledgerFile:path.basename(file),ledgerSha256:sha(fs.readFileSync(file)),moduleFileSha256:sha(fs.readFileSync(path.join(base,'mishnah-kaufmann-accordance-ketubot-data.js'))),sourceTextHash:D.source.textHash,counts:{images:images.size,records:L.observations.length,boundPositions:seen.size,totalPositions:Object.values(D.units).reduce((s,u)=>s+u.words.length,0),sourceGaps:sourceGaps.length,screenshotCutPositions:cutKeys.size,otherUnbound:otherUnbound.length},sourceGaps,screenshotCuts,otherUnbound,errors,passed:errors.length===0,limitations:['All 111 original images have been visually read by AI; source position gaps are explicitly retained.','Morphology/printed oddities require independent adjudication before calling them verified.','Unpointed literal screenshot surfaces do not validate vowel points.']};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
