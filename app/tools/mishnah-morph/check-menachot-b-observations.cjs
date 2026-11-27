'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'../../..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function check(){
 const file='accordance-kodashim-current-menachot-b-observations.json',bytes=fs.readFileSync(path.join(__dirname,file)),d=JSON.parse(bytes),currentBytes=fs.readFileSync(path.join(ROOT,d.inputs.sourceModule)),currentCtx={module:{exports:{}}},frozenBytes=cp.execFileSync('git',['show',d.inputs.frozenScaffoldCommit+':'+d.inputs.sourceModule],{cwd:ROOT,maxBuffer:64*1024*1024}),frozenCtx={module:{exports:{}}};vm.runInNewContext(currentBytes.toString(),currentCtx);vm.runInNewContext(frozenBytes.toString(),frozenCtx);
 const D=currentCtx.module.exports,F=frozenCtx.module.exports,errors=[],counts={},seen=new Set();
 const expect=(ok,msg)=>{if(!ok)errors.push(msg);};expect(sha(frozenBytes)===d.inputs.sourceModuleSha256,'Frozen module SHA mismatch');expect(JSON.stringify(D.units)===JSON.stringify(F.units),'Current source units differ from frozen scaffold');expect(D.source.textHash===d.sourceTextHash,'Current source text hash mismatch');expect(sha(fs.readFileSync(path.join(__dirname,d.inputs.rawTranscriptionFile)))===d.inputs.rawTranscriptionSha256,'Raw transcript SHA drift');
 const imageHashes=new Map(),duplicateRows=new Set();
 for(const o of d.observations){
  const u=D.units[o.ref],ids=o.sourceWordIndexes,tag=o.observed?.tag,key=o.image.file+'|'+o.ref+'|'+ids.join(',');expect(!duplicateRows.has(key),'Duplicate same-image binding '+key);duplicateRows.add(key);
  expect(o.humanValidated===false,'Unexpected human validation');expect(o.sourceTextHash===D.source.textHash,'Observation hash mismatch');expect(u&&ids.length>0,'Missing source unit');if(!u)continue;
  expect(o.word===ids.map(i=>u.words[i]?.text).join(' '),'Source word mismatch '+key);expect(o.actualObservedWord===o.observed.word&&!!tag&&!!o.observed.lex,'Missing raw image row '+key);
  expect(o.sourceWordId===u.id+'/word/'+ids[0]&&o.sourceWordIndex===ids[0],'Main source ID/index mismatch '+key);expect(JSON.stringify(o.sourceWordIds)===JSON.stringify(ids.map(i=>u.id+'/word/'+i)),'Span IDs mismatch '+key);
  for(const i of ids){const w=u.words[i];expect(w&&u.offsetText.slice(w.start,w.end)===w.text,'Invalid source offsets '+key);expect(JSON.stringify(o.sourceFlags.find(f=>f.index===i)?.flags)===JSON.stringify(w.flags||[]),'Flags mismatch '+key);seen.add(u.id+'/word/'+i);}
  if(!imageHashes.has(o.image.file))imageHashes.set(o.image.file,sha(fs.readFileSync(o.image.path)));expect(imageHashes.get(o.image.file)===o.image.sha256,'Image SHA mismatch '+key);expect(typeof o.image.driveId==='string'&&o.image.driveId.length>0,'Missing Drive ID '+key);counts[o.ref]=(counts[o.ref]||0)+1;
 }
 expect(imageHashes.size===12&&d.imageAudit.length===12,'Wrong observed image coverage');expect(seen.size===d.coverage.observedSourcePositions,'Distinct coverage mismatch');expect(d.coverage.rawObservationRecords===d.observations.length,'Record count mismatch');
 return {title:D.title,ledgerFile:file,ledgerSha256:sha(bytes),frozenScaffoldCommit:d.inputs.frozenScaffoldCommit,currentModuleSha256:sha(currentBytes),frozenSourceUnitsSha256:sha(JSON.stringify(F.units)),currentSourceUnitsSha256:sha(JSON.stringify(D.units)),imageCount:imageHashes.size,rawObservationRecords:d.observations.length,uniqueSourcePositions:seen.size,byRef:counts,missingImageNumbers:d.missingImageNumbers,errors,humanValidated:false,scope:'Structural/image identity QA only, not independent confirmation of visual Lex/Tag readings'};
}
module.exports={check};if(require.main===module){const r=check();console.log(JSON.stringify(r,null,2));if(r.errors.length)process.exitCode=1;}
