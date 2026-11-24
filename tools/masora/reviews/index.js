'use strict';
const targets=require('./round-1-targets.json');
const R=require('../translations/refinements');
function sameTranslation(a,b){return a.de===b.de&&a.status===b.status&&JSON.stringify(a.uncertain)===JSON.stringify(b.uncertain);}
function createReview(round=1){
 const queue=round===1?targets:require('./round-'+round+'-targets.json');
 const selected=new Map(queue.targets.map((target,i)=>[target.uuid,{...target,shard:target.shard||(i<1667?'a':i<3334?'b':'c')}]));
 if(selected.size!==queue.targets.length)throw Error('Duplicate review targets');
 const counts={round,selectedNotes:selected.size,changedNotes:0,resolvedNotes:0,improvedPartialNotes:0,unchangedNotes:0,changedReadings:0,resolvedReadings:0,remainingPartialNotes:0,baselinePartialReadings:0,remainingPartialReadings:0};
 if(round>1)counts.correctedCompletedReadings=0;
 const seen=new Set();
 function apply(entry,prior){
  const target=selected.get(entry.uuid);if(!target)return prior;
  if(target.sourceHash!==entry.sourceHash||target.ordinal!==entry.ordinal)throw Error('Review source changed: '+entry.uuid);
  if(seen.has(entry.uuid))throw Error('Context reviewed twice: '+entry.uuid);
  if(!prior.readings.some(r=>r.status==='partial'))throw Error('Review baseline is no longer partial: '+entry.uuid);
  seen.add(entry.uuid);
  counts.baselinePartialReadings+=prior.readings.filter(r=>r.status==='partial').length;
  if(!['a','b','c'].includes(target.shard))throw Error('Invalid review shard');
  const next=require('./round-'+round+'-'+target.shard).review(entry,structuredClone(prior));
  if(!next||next.uuid!==prior.uuid||next.ordinal!==prior.ordinal||next.sourceHash!==prior.sourceHash||next.label!==prior.label||next.type!==prior.type||next.readings.length!==prior.readings.length)throw Error('Invalid reviewed context: '+entry.uuid);
  let changed=false;
  next.readings=next.readings.map((reading,i)=>{
   const before=prior.readings[i],source=entry.readings[i];
   const correction=round===2?require('./corrections').apply(entry,source,before):null;
   if(reading.uuid!==source.uuid)throw Error('Review reading order changed: '+source.uuid);
   if(before.status==='draft'&&!correction&&!sameTranslation(before,reading))throw Error('Review altered completed reading: '+source.uuid);
   if(before.status==='draft'&&!correction)return before;
   if(correction)counts.correctedCompletedReadings++;
   let after=correction||reading;
   if(round>1&&sameTranslation(before,after))after=require('./round-2-root').manualFor(source,entry)||after;
   if(round>1&&sameTranslation(before,after))after=require('./reuse').improve(entry,source,after);
   after=R.protectSource(source,after);
   if(round>1&&before.status==='partial'&&after.status==='draft'&&source.text.includes('*'))after={...after,de:after.de+' [Nicht aufgelöstes Quellzeichen: *.]',status:'partial',uncertain:[source.text]};
   if(round>1&&sameTranslation(before,after)){
    after=require('./round-2-a-quoted-spans').improve(source,after,entry)||after;
    after=require('./fragments').improve(source,after);
    after=require('./names').improve(source,after);
   }
   if(typeof after.de!=='string'||!after.de.trim()||!['draft','partial'].includes(after.status)||!Array.isArray(after.uncertain)||(after.status==='draft'&&after.uncertain.length))throw Error('Invalid reviewed translation: '+source.uuid);
   if(sameTranslation(before,after))return round===1?after:before;
   changed=true;counts.changedReadings++;if(before.status==='partial'&&after.status==='draft')counts.resolvedReadings++;
   if(round>1)after={...after,reviewRound:round};
   return after;
  });
  const open=next.readings.some(r=>r.status==='partial');
  counts.remainingPartialReadings+=next.readings.filter(r=>r.status==='partial').length;
  if(open)counts.remainingPartialNotes++;
  if(changed){counts.changedNotes++;if(!open)counts.resolvedNotes++;else counts.improvedPartialNotes++;}else counts.unchangedNotes++;
  return next;
 }
 function finish(){if(seen.size!==selected.size)throw Error('Incomplete review target coverage: '+seen.size+'/'+selected.size);return counts;}
 return {apply,counts,finish};
}
module.exports={createReview,targets,sameTranslation};
