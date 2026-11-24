'use strict';
const targets=require('./round-1-targets.json');
const R=require('../translations/refinements');
const selected=new Map(targets.targets.map((target,i)=>[target.uuid,{...target,shard:i<1667?'a':i<3334?'b':'c'}]));
function sameTranslation(a,b){return a.de===b.de&&a.status===b.status&&JSON.stringify(a.uncertain)===JSON.stringify(b.uncertain);}
function createReview(){
 const counts={round:1,selectedNotes:selected.size,changedNotes:0,resolvedNotes:0,improvedPartialNotes:0,unchangedNotes:0,changedReadings:0,resolvedReadings:0,remainingPartialNotes:0,baselinePartialReadings:0,remainingPartialReadings:0};
 function apply(entry,prior){
  const target=selected.get(entry.uuid);if(!target)return prior;
  if(target.sourceHash!==entry.sourceHash||target.ordinal!==entry.ordinal)throw Error('Review source changed: '+entry.uuid);
  if(!prior.readings.some(r=>r.status==='partial'))throw Error('Review baseline is no longer partial: '+entry.uuid);
  counts.baselinePartialReadings+=prior.readings.filter(r=>r.status==='partial').length;
  const next=require('./round-1-'+target.shard).review(entry,structuredClone(prior));
  if(!next||next.uuid!==prior.uuid||next.ordinal!==prior.ordinal||next.sourceHash!==prior.sourceHash||next.label!==prior.label||next.type!==prior.type||next.readings.length!==prior.readings.length)throw Error('Invalid reviewed context: '+entry.uuid);
  let changed=false;
  next.readings=next.readings.map((reading,i)=>{
   const before=prior.readings[i],source=entry.readings[i];
   if(reading.uuid!==source.uuid)throw Error('Review reading order changed: '+source.uuid);
   if(before.status==='draft'&&!sameTranslation(before,reading))throw Error('Review altered completed reading: '+source.uuid);
   const after=R.protectSource(source,reading);
   if(typeof after.de!=='string'||!after.de.trim()||!['draft','partial'].includes(after.status)||!Array.isArray(after.uncertain)||(after.status==='draft'&&after.uncertain.length))throw Error('Invalid reviewed translation: '+source.uuid);
   if(!sameTranslation(before,after)){changed=true;counts.changedReadings++;if(before.status==='partial'&&after.status==='draft')counts.resolvedReadings++;}
   return after;
  });
  const open=next.readings.some(r=>r.status==='partial');
  counts.remainingPartialReadings+=next.readings.filter(r=>r.status==='partial').length;
  if(open)counts.remainingPartialNotes++;
  if(changed){counts.changedNotes++;if(!open)counts.resolvedNotes++;else counts.improvedPartialNotes++;}else counts.unchangedNotes++;
  return next;
 }
 return {apply,counts};
}
module.exports={createReview,targets,sameTranslation};
