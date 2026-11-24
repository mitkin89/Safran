'use strict';
// Audit all source notes without changing the published text or assigning verse anchors.
const path=require('node:path'),root=path.join(__dirname,'../..');
const index=require(path.join(root,'masora-index.js')),D=require(path.join(root,'library-masora-data.js'));
function audit(){
  const counts={notes:0,withRecognizedCountListOrFeature:0,withUnresolvedContent:0,withoutRecognizedFormula:0},examples=[];
  for(const ms of index.manuscripts)for(const page of require(path.join(root,ms.file)).pages)for(const entry of page.contexts){
    if(!['mp','mm','mf'].includes(entry.type)||!entry.readings.some(r=>D.text(r)))continue;
    const aid=D.explain(entry),recognized=aid.count!==null||aid.list||aid.features.length>0;
    counts.notes++;if(recognized)counts.withRecognizedCountListOrFeature++;else counts.withoutRecognizedFormula++;
    if(aid.partial){counts.withUnresolvedContent++;if(examples.length<10)examples.push({manuscript:ms.label,page:page.id,entry:entry.uuid});}
  }
  return {counts,notice:'Rule recognition is not a verified full translation. Unresolved content includes partly understood notes.',examples};
}
if(require.main===module)process.stdout.write(JSON.stringify(audit(),null,2)+'\n');
module.exports={audit};
