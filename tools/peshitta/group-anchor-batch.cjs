'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const M=require('./main-lemma-evidence.cjs'),R=require('./remaining-evidence.cjs'),G=require('./group-anchor-evidence.cjs'),{norm}=require('../../syriac-cards');
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file));
function load(){
 const source=M.load(),summary=require('./remaining-summary.json');
 const bytes=zlib.gunzipSync(read('tools/peshitta/extended-corpus-forms.jsonl.gz'));assert.equal(R.digest(bytes),summary.extraSnapshotSha256);
 for(const ref of bytes.toString().trim().split('\n').map(JSON.parse)){const key=norm(ref.form);if(!source.forms.has(key))source.forms.set(key,[]);source.forms.get(key).push(ref);}source.cache.clear();
 const groups=G.loadGroups(source),benchmark=G.benchmark(source,groups);
 source.controlExclusions=new Set([...benchmark.disagreements,...summary.benchmark.disagreements].map(r=>JSON.stringify([norm(r.form),r.strong])));
 return {source,groups,benchmark};
}
function run(output){
 assert(output);const {source,groups,benchmark}=load(),previous=require('./remaining-summary.json');
 const bytes=zlib.gunzipSync(read('tools/peshitta/remaining-gaps.jsonl.gz'));assert.equal(R.digest(bytes),previous.auditSha256);
 const input=bytes.toString().trim().split('\n').map(JSON.parse).filter(r=>r.reason==='no-current-one-to-one-hebrew-alignment');assert.equal(input.length,32840);
 const current=R.currentReviews(),reasons={},anchors={},rows=[];
 for(const row of input){assert(!current.assigned.has(row.id)&&!current.protectedIds.has(row.id),row.id);const group=groups.get(row.book).get(row.id);const result=G.assess(source,row,group);result.context=row.context;rows.push(result);reasons[result.reason]=(reasons[result.reason]||0)+1;const k=group?.reason||'no-valid-current-alignment';anchors[k]=(anchors[k]||0)+1;}
 const accepted=rows.filter(r=>r.accepted),raw=rows.map(r=>JSON.stringify(r)).join('\n')+'\n';
 const summary={version:1,examined:rows.length,newAssignments:accepted.length,remainingUnanchored:rows.length-accepted.length,before:previous.after,after:{words:previous.after.words,assigned:previous.after.assigned+accepted.length,open:previous.after.open-accepted.length},findings:reasons,anchorFindings:anchors,benchmark,priorFiles:[...current.files,{file:'peshitta-remaining-lemma-review.json',sha256:R.digest(read('peshitta-remaining-lemma-review.json'))}],sourceFiles:source.sourceFiles,alignmentAndHebrewFiles:source.provenance,inputSha256:previous.auditSha256,extraSnapshotSha256:previous.extraSnapshotSha256,auditSha256:R.digest(raw),controlExcludedFamilies:source.controlExclusions.size,reviewKind:'Automatic main-lemma evidence audit, not individual scholarly verification. Existing word-group alignments and complete morphology are unchanged.',license:'CC BY-NC 4.0'};
 fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'group-anchor-audit.jsonl.gz'),zlib.gzipSync(raw));fs.writeFileSync(path.join(output,'group-anchor-summary.json'),JSON.stringify(summary,null,2)+'\n');fs.writeFileSync(path.join(output,'peshitta-group-anchor-review.json'),JSON.stringify(G.exportReview(rows))+'\n');
 console.log(JSON.stringify({examined:summary.examined,accepted:summary.newAssignments,open:summary.after.open,findings:reasons,anchors,benchmark},null,2));
}
if(require.main===module)run(process.argv[2]);
module.exports={load,run};
