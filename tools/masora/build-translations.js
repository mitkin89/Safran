'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'../..'),D=require(path.join(root,'library-masora-data')),index=require(path.join(root,'masora-index')),R=require('./translations/refinements');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function selectNotes(limit=Infinity){const rows=[];for(const m of index.manuscripts)for(const p of require(path.join(root,m.file)).pages)for(const e of p.contexts){if(rows.length===limit)return rows;if(!['mp','mm','mf'].includes(e.type)||!e.readings.some(r=>D.text(r)))continue;const readings=e.readings.map(r=>({uuid:r.uuid,text:D.text(r),references:(r.references||[]).map(x=>x.label)})),projection={label:e.label,type:e.type,readings};rows.push({ordinal:rows.length+1,uuid:e.uuid,label:e.label,type:e.type,manuscript:m.id,page:p.id,sourceHash:hash(projection),readings});}return rows;}
function wrap(key,data){return "// German Masorah working translations; original BIMA source is unchanged.\n(function(root){'use strict';const data="+JSON.stringify(data)+";if(typeof module!=='undefined'&&module.exports)module.exports=data;else {"+key+"}})(typeof window!=='undefined'?window:globalThis);\n";}
function build({regenerate=true}={}){
 const rows=selectNotes(),outDir=path.join(root,'masora-translations'),review=require('./reviews').createReview();fs.mkdirSync(outDir,{recursive:true});
 const manifest={schema:1,language:'de',status:'working-draft',count:rows.length,license:index.source.license,licenseUrl:index.source.licenseUrl,attribution:'Corpus Masoreticum / BIMA; German working translations with attributed quotation editions.',selection:'All transcribed mp/mm/mf contexts in masora-index manuscript/page/context order; original first10000 ordinals preserved.',sourceCatalogueSha256:index.source.catalogueSha256,batches:[],counts:{notes:0,notesWithUnresolvedReadings:0,readings:0,draftReadings:0,partialReadings:0}};
 const bounds=[[0,2500],[2500,5000],[5000,7500],[7500,10000],[10000,15750],[15750,21500],[21500,rows.length]],translations=new Map();
 for(let shard=0;shard<bounds.length;shard++){
  const input=rows.slice(...bounds[shard]),json=path.join(outDir,'part-'+shard+'.json');
  const translated=!regenerate&&fs.existsSync(json)?JSON.parse(fs.readFileSync(json,'utf8')):require('./translations/part-'+shard).build(input);
  if(translated.length!==input.length)throw Error('Wrong shard count '+shard);
  for(let j=0;j<input.length;j++){
   const src=input[j],tr=translated[j];if(tr.uuid!==src.uuid||tr.sourceHash!==src.sourceHash||tr.ordinal!==src.ordinal||tr.readings.length!==src.readings.length)throw Error('Source mismatch '+src.uuid);
   tr.readings=tr.readings.map((r,k)=>{const sr=src.readings[k];if(r.uuid!==sr.uuid)throw Error('Wrong source reading '+sr.uuid);let next=src.ordinal<=10000?R.improve(sr,src,r):R.boundedFormula(sr)||r;next=R.refineSpacing(sr,next);next=R.protectSource(sr,{...next,uuid:sr.uuid});if(next.uuid!==sr.uuid||typeof next.de!=='string'||!next.de.trim()||!['draft','partial'].includes(next.status)||!Array.isArray(next.uncertain))throw Error('Invalid reading '+sr.uuid);if(next.status==='draft'&&next.uncertain.length)throw Error('Unmarked uncertainty '+sr.uuid);return next;});
   translations.set(src.uuid,review.apply(src,tr));
  }
 }
 for(let part=0;part<Math.ceil(rows.length/2500);part++){
  const notes={};for(const src of rows.slice(part*2500,(part+1)*2500)){
   const tr=translations.get(src.uuid),enriched={ordinal:src.ordinal,uuid:src.uuid,sourceHash:src.sourceHash,label:src.label,type:src.type,readings:tr.readings.map((r,k)=>({...r,source:src.readings[k].text,sourceReferences:src.readings[k].references}))};
   notes[src.uuid]=enriched;manifest.counts.notes++;if(tr.readings.some(r=>r.status==='partial'))manifest.counts.notesWithUnresolvedReadings++;
   for(const r of tr.readings){manifest.counts.readings++;manifest.counts[r.status==='draft'?'draftReadings':'partialReadings']++;}
  }
  const data={schema:1,part,notes},file='masora-translations/batch-'+part+'.js',script=wrap('root.MASORA_TRANSLATION_PARTS=root.MASORA_TRANSLATION_PARTS||{};root.MASORA_TRANSLATION_PARTS['+part+']=data;',data);fs.writeFileSync(path.join(root,file),script);
  manifest.batches.push({part,file,sha256:crypto.createHash('sha256').update(script).digest('hex'),ids:Object.keys(notes)});
 }
 manifest.reviews=[review.counts];
 fs.writeFileSync(path.join(__dirname,'reviews/round-1-report.json'),JSON.stringify(review.counts,null,2)+'\n');
 fs.writeFileSync(path.join(outDir,'index.js'),wrap('root.MASORA_TRANSLATION_INDEX=data;',manifest));return manifest;
}
module.exports={selectNotes,build,hash};
if(require.main===module)console.log(JSON.stringify(build({regenerate:!process.argv.includes('--from-staged-json')}).counts,null,2));
