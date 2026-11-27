'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const B=require('../tools/mishnah-morph/build-moed-maagarim-followup.cjs'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'maagarim-queue-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const book={title:'Mishnah Ketubot',source:{textHash:'source-frozen'},units:{'1:1':{id:'K.1',offsetText:'בית',words:[{text:'בית',start:0,end:3,flags:[]}]}}};
 const draft=Buffer.from('module.exports='+JSON.stringify(book)+';'),file='test-draft.js',obsFile='accordance-nashim-current-test-observations.json',obs=Buffer.from('{"observations":[]}'),imageIndex=path.join(dir,'image-index.json');
 fs.writeFileSync(path.join(dir,file),draft);fs.writeFileSync(path.join(dir,obsFile),obs);fs.writeFileSync(imageIndex,'[]');
 const row={title:book.title,ref:'1:1',sourceWordId:'K.1/word/0',status:'draft-unresolved',parsed:{features:{type:'N'}},candidates:[],observationFile:obsFile,reference:{word:'בית',lex:'בית',tags:'cm ms sg',image:{sha256:'image-proof'}}};
 const doc={draftCommit:B.NASHIM_DRAFT,inputs:[{imageIndexSha256:sha('[]')},{file:obsFile,sha256:sha(obs)}],draftFiles:[{title:book.title,file,sha256:sha(draft)}],rows:[row],complete:false};
 const save=(seder='nashim',d=doc)=>fs.writeFileSync(path.join(dir,seder+'-current-accordance-comparison.json'),JSON.stringify(d));save();save('moed',{...doc,draftCommit:'7c432dc-moed'});
 return {dir,app:dir,imageIndex,readFrozenDraft:()=>draft,generatedAt:'2026-01-01T00:00:00.000Z',draft,doc,row,obsFile,save};
}
test('CLI defaults to Moed, accepts explicit seder, rejects typos and duplicates',()=>{
 assert.deepEqual(B.parseArgs([]),{seder:'moed',imageIndex:undefined});assert.equal(B.parseArgs(['--seder=nashim']).seder,'nashim');
 for(const a of [['--seder=other'],['--seder=nashim','--seder=moed'],['--input=x'],['--seder']])assert.throws(()=>B.parseArgs(a));
});
test('default and explicit Moed build remain identical and read-only',t=>{
 const f=fixture(t),before=fs.readFileSync(path.join(f.dir,'test-draft.js'));
 const a=B.buildQueue(f),b=B.buildQueue({...f,seder:'moed'});assert.deepEqual(a.out,b.out);assert.equal(a.out.snapshot.comparisonFile,'moed-current-accordance-comparison.json');assert.deepEqual(fs.readFileSync(path.join(f.dir,'test-draft.js')),before);
 assert.equal(fs.existsSync(path.join(f.dir,'moed-maagarim-followup-pending.json')),false);
});
test('Nashim pins exact frozen draft and comparison/ledger SHA on source-bound pending records',t=>{
 const f=fixture(t),r=B.buildQueue({...f,seder:'nashim'}),p=r.out.positions[0];
 assert.equal(r.out.maagarimQueried,false);assert.equal(r.out.maagarimVerified,false);assert.equal(r.out.humanValidated,false);
 assert.equal(p.sourceWordId,'K.1/word/0');assert.equal(p.sourceTextHash,'source-frozen');assert.equal(p.frozenDraftCommit,B.NASHIM_DRAFT);assert.equal(p.comparisonInputSha256,sha(r.bytes));assert.equal(p.observations[0].observationFileSha256,sha(fs.readFileSync(path.join(f.dir,f.obsFile))));
 assert.equal(fs.existsSync(path.join(f.dir,'nashim-maagarim-followup-pending.json')),false,'building is read-only');
});
test('Nashim rejects stale ledger/index and changed frozen bytes before generating output',t=>{
 const f=fixture(t),opts={...f,seder:'nashim'};
 fs.appendFileSync(path.join(f.dir,f.obsFile),' ');assert.throws(()=>B.buildQueue(opts),/Comparison input drift/);fs.writeFileSync(path.join(f.dir,f.obsFile),'{"observations":[]}');
 fs.writeFileSync(f.imageIndex,'[1]');assert.throws(()=>B.buildQueue(opts),/Image index drift/);fs.writeFileSync(f.imageIndex,'[]');
 assert.throws(()=>B.buildQueue({...opts,readFrozenDraft:()=>Buffer.from('changed')}),/Draft file drift/);
 f.save('nashim',{...f.doc,inputs:f.doc.inputs.filter(i=>i.file)});assert.throws(()=>B.buildQueue(opts),/Exactly one frozen image index/);
 f.save('nashim',{...f.doc,draftCommit:'2cc7eaa-other'});assert.throws(()=>B.buildQueue(opts),/Unexpected draft commit/);
});
test('Nashim rejects foreign titles, unbound source IDs and observation files',t=>{
 const f=fixture(t),opts={...f,seder:'nashim'};
 f.save('nashim',{...f.doc,draftFiles:[{...f.doc.draftFiles[0],title:'Mishnah Shabbat'}]});assert.throws(()=>B.buildQueue(opts),/outside Nashim/);
 f.save('nashim',{...f.doc,rows:[{...f.row,sourceWordId:'bad/word/0'}]});assert.throws(()=>B.buildQueue(opts),/Invalid binding/);
 f.save('nashim',{...f.doc,rows:[{...f.row,observationFile:'other.json'}]});assert.throws(()=>B.buildQueue(opts),/Unbound observation input/);
});
test('writing Nashim queue uses separate filenames and never overwrites Moed outputs',t=>{
 const f=fixture(t);for(const ext of ['json','md'])fs.writeFileSync(path.join(f.dir,'moed-maagarim-followup-pending.'+ext),'moed sentinel');
 B.writeQueue(B.buildQueue({...f,seder:'nashim'}));for(const ext of ['json','md'])assert.equal(fs.readFileSync(path.join(f.dir,'moed-maagarim-followup-pending.'+ext),'utf8'),'moed sentinel');
 const q=JSON.parse(fs.readFileSync(path.join(f.dir,'nashim-maagarim-followup-pending.json')));assert.equal(q.snapshot.comparisonFile,'nashim-current-accordance-comparison.json');assert.match(fs.readFileSync(path.join(f.dir,'nashim-maagarim-followup-pending.md'),'utf8'),/--seder=nashim/);
});
