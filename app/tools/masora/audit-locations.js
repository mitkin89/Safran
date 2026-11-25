'use strict';
// Reproducible audit of candidate word references; never edits source transcriptions.
const path=require('node:path'),root=path.join(__dirname,'../..');
const index=require(path.join(root,'masora-index.js')),D=require(path.join(root,'library-masora-data.js'));
function audit(){
  const counts={notes:0,unique:0,ambiguous:0,unmatched:0,newUnique:0,newAmbiguous:0};
  const unresolved={noVerseText:0,unsupportedLabel:0,noExactMatch:0},examples=[];
  for(const ms of index.manuscripts)for(const page of require(path.join(root,ms.file)).pages)for(const entry of page.contexts){
    if(!['mp','mm','mf'].includes(entry.type)||!entry.readings.some(r=>D.text(r))&&!D.prose(entry.notes))continue;
    counts.notes++;
    const matches=D.locations(page,entry),old=String(entry.label||'').trim().replace(/\s+\(M[1-9]\d*\)$/, '').trim();
    const newlySupported=!/^[\u0590-\u05ff\s]+$/.test(old);
    if(matches.length===1){counts.unique++;if(newlySupported){counts.newUnique++;if(examples.length<15)examples.push({manuscript:ms.label,page:page.id,entry:entry.uuid,sourceLabel:entry.label,phrase:matches[0].phrase,verse:matches[0].label});}}
    else if(matches.length){counts.ambiguous++;if(newlySupported)counts.newAmbiguous++;}
    else{counts.unmatched++;if(!page.contexts.some(c=>c.type==='BibleText'&&c.readings.some(r=>r.references?.length===1&&D.bibleRef(r.references[0].label))))unresolved.noVerseText++;else if(!D.matchingLabel(entry.label))unresolved.unsupportedLabel++;else unresolved.noExactMatch++;}
  }
  return {counts,unresolved,notice:'Unique spelling matches are automatic candidate references, not verified manuscript anchors. Occurrence numbers never select among repeated words. New counts compare with hand-suffix-only matching.',examples};
}
if(require.main===module)process.stdout.write(JSON.stringify(audit(),null,2)+'\n');
module.exports={audit};
