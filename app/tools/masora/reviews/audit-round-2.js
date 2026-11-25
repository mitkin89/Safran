'use strict';
const fs=require('node:fs'),path=require('node:path');
const queue=require('./round-2-targets.json'),index=require('../../../masora-translations/index');
const corrections=new Set(require('./round-2-corrections.json').corrections.filter(c=>c.before.status==='draft').map(c=>c.reading));
function audit(){
 const targets=new Map(queue.targets.map(t=>[t.uuid,t])),assigned={a:new Map(),b:new Map(),c:new Map()};
 for(const batch of index.batches)for(const context of Object.values(require('../../../'+batch.file).notes)){
  const target=targets.get(context.uuid);if(!target)continue;
  if(context.sourceHash!==target.sourceHash||context.ordinal!==target.ordinal)throw Error('Audit source mismatch: '+context.uuid);
  for(const reading of context.readings)if(reading.status==='partial'||reading.reviewRound===2&&!corrections.has(reading.uuid))assigned[target.shard].set(reading.uuid,{context:context.uuid,reading});
 }
 if(Object.values(assigned).reduce((n,m)=>n+m.size,0)!==queue.baseline.partialReadings)throw Error('Audit baseline reading mismatch');
 const root=require('./round-2-root-audit.json'),rootSeen=new Set(root.reviewedReadingUUIDs),reports=[],missingReports=[];
 for(const shard of ['a','b','c']){
  const file=path.join(__dirname,'round-2-'+shard+'-audit.json');let source={};
  if(fs.existsSync(file))source=JSON.parse(fs.readFileSync(file,'utf8'));else missingReports.push(shard);
  let seen=new Set(source.inspectedReadingUUIDs||source.reviewedReadingUUIDs||[]);
  if(!seen.size&&Array.isArray(source.unreadReadings)&&Number.isInteger(source.readingOccurrencesWithReadSource)){
   const unread=new Set(source.unreadReadings.map(r=>r.readingUUID));
   if(unread.size+source.readingOccurrencesWithReadSource!==assigned[shard].size)throw Error('Audit source-inspection partition mismatch: '+shard);
   for(const id of unread)if(!assigned[shard].has(id))throw Error('Unread UUID outside assigned shard: '+id);
   seen=new Set([...assigned[shard].keys()].filter(id=>!unread.has(id)));
  }
  const explicit=new Set(source.explicitContextCandidateUUIDs||[]),identical=new Set(source.readingsWithInspectedIdenticalSourceUUIDs||[]);
  for(const id of [...seen,...explicit,...identical])if(!assigned[shard].has(id))throw Error('Audit UUID outside assigned partial readings: '+shard+' '+id);
  const completed=[],delegated=[],untranscribed=[],outstanding=[];
  let inspected=0,sourceInspected=0,explicitlyInspected=0;
  for(const [id,{reading}]of assigned[shard]){
   if(seen.has(id))inspected++;if(explicit.has(id))explicitlyInspected++;if(identical.has(id))sourceInspected++;
   if(reading.status==='draft')completed.push(id);
   if(rootSeen.has(id))delegated.push(id);
   if(/^[\s#*\[\]…∅⌀�.\-]*$/.test(reading.source||''))untranscribed.push(id);
   if(!seen.has(id)&&!explicit.has(id)&&!identical.has(id)&&reading.status!=='draft'&&!rootSeen.has(id)&&!untranscribed.includes(id))outstanding.push(id);
  }
  reports.push({shard,assignedContexts:queue.targets.filter(t=>t.shard===shard).length,assignedPartialReadings:assigned[shard].size,readingsWithInspectedSource:inspected,explicitContextCandidates:explicitlyInspected,readingsWithInspectedIdenticalSource:sourceInspected,currentCompleteWorkingTranslations:completed.length,reviewedByRoot:delegated.length,noTranscribedText:untranscribed.length,outstandingReviewReadings:outstanding.length,outstandingReadingUUIDs:outstanding,sourceReportState:source.status||source.state||(fs.existsSync(file)?'source-inspection-partition':'missing')});
 }
 const outstanding=reports.reduce((n,r)=>n+r.outstandingReviewReadings,0);
 return {schema:1,round:2,state:outstanding||missingReports.length?'in-progress':'covered',selectedNotes:queue.targets.length,baselinePartialReadings:queue.baseline.partialReadings,remainingPartialNotes:index.counts.notesWithUnresolvedReadings,remainingPartialReadings:index.counts.partialReadings,outstandingReviewReadings:outstanding,missingReports,coverageSemantics:'Coverage means an explicitly inspected source/context, an exact source-bound complete working translation, delegated Root review, or absence of transcribed text. It does not mean that every occurrence was separately reviewed in context or that all source uncertainties are resolved.',shards:reports};
}
module.exports={audit};
if(require.main===module){const report=audit();if(process.argv.includes('--write'))fs.writeFileSync(path.join(__dirname,'round-2-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,shards:report.shards.map(({outstandingReadingUUIDs,...s})=>s)},null,2));}
