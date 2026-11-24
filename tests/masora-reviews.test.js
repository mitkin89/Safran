'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {selectNotes}=require('../tools/masora/build-translations');
const {createReview,targets}=require('../tools/masora/reviews');
const M=require('../masora-translations/index');
test('review queue binds exactly 5000 distinct contexts to their original source',()=>{
 const rows=new Map(selectNotes().map(x=>[x.uuid,x]));assert.equal(targets.targets.length,5000);assert.equal(new Set(targets.targets.map(x=>x.uuid)).size,5000);
 let previous=0;for(const target of targets.targets){const source=rows.get(target.uuid);assert(source);assert.equal(source.sourceHash,target.sourceHash);assert.equal(source.ordinal,target.ordinal);assert(target.ordinal>previous);previous=target.ordinal;}
});
test('review refuses changed source and leaves unselected contexts untouched',()=>{
 const review=createReview(),selected=targets.targets[0];assert.throws(()=>review.apply({...selected,sourceHash:'changed'},{}),/source changed/);
 const record={uuid:'not-selected'};assert.equal(review.apply({uuid:'not-selected'},record),record);
});
test('review report distinguishes attempted, improved and completed notes',()=>{
 const report=require('../tools/masora/reviews/round-1-report.json');assert.deepEqual(M.reviews.find(r=>r.round===1),report);assert.equal(report.selectedNotes,5000);
 assert.equal(report.changedNotes+report.unchangedNotes,5000);assert.equal(report.resolvedNotes+report.improvedPartialNotes,report.changedNotes);
 assert.equal(report.remainingPartialNotes+report.resolvedNotes,5000);assert(report.resolvedReadings>=report.resolvedNotes);assert(report.changedReadings>=report.changedNotes);
 assert.equal(report.remainingPartialReadings+report.resolvedReadings,report.baselinePartialReadings);
});
test('manual reviews use exact source strings and preserve completed readings',()=>{
 const rows=selectNotes(),sources=new Set(rows.flatMap(e=>e.readings.map(r=>r.text)));
 for(const shard of ['a','b','c']){
  const manual=require('../tools/masora/reviews/round-1-'+shard+'-manual.json'),module=require('../tools/masora/reviews/round-1-'+shard);
  assert.equal(new Set(manual.map(r=>r.source)).size,manual.length);
  for(const item of manual){assert(sources.has(item.source),'translation without source: '+item.source);assert(item.de.trim());}
  const ids=new Set(targets.targets.slice(shard==='a'?0:shard==='b'?1667:3334,shard==='a'?1667:shard==='b'?3334:5000).map(x=>x.uuid));
  const source=rows.find(e=>ids.has(e.uuid)&&e.readings.some(r=>module.manualFor(r,e)));assert(source,'review must supply actual translations');
  const prior={...source,readings:source.readings.map(r=>({uuid:r.uuid,de:'Vorhandene vollständige Übersetzung.',status:'draft',uncertain:[],edition:'Vorhandene Ausgabe'}))};
  assert.deepEqual(module.review(source,structuredClone(prior)),prior);
  const reading=source.readings.find(r=>module.manualFor(r,source)),revised=module.manualFor(reading,source);
  for(const field of ['edition','attribution','ref','reference'])assert.equal(revised[field],undefined,'new own translations must not retain an old edition');
  assert.equal(module.manualFor({...reading,text:reading.text+'#changed'},source),null);
 }
});
test('new reviews retain unexplained asterisks as explicit source uncertainty',()=>{
 let found=0;
 for(const batch of M.batches)for(const record of Object.values(require('../'+batch.file).notes))for(const reading of record.readings){
  if(!/review/.test(reading.method||'')||!reading.source.includes('*'))continue;
  found++;assert.equal(reading.status,'partial');assert(reading.uncertain.some(s=>s.includes('*')));
 }
 assert(found>0);
});
test('review rubric patterns never treat ordinary vowel points as numerical marks',()=>{
 const C=require('../tools/masora/reviews/round-1-c');
 for(const number of ['נח','נָח','לֹא','טל','טׄלׄ'])assert.equal(C.manualFor({uuid:'fixture',text:'מלה '+number+' מלאין',references:[]},{label:'מלה'}),null);
 const result=C.manualFor({uuid:'fixture',text:'מלה נׄחׄ מלאין',references:[]},{label:'מלה'});assert.equal(result.status,'draft');assert.match(result.de,/58/);
});
