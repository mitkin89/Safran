'use strict';
// Compare visual observations, never the Be'eri candidate as a proxy for an image reading.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('./compare-kaufmann-pointing.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const letters=s=>String(s||'').normalize('NFD').replace(/[^א-ת]/gu,'');
const point=/[\u05b0-\u05bd\u05bf\u05c1\u05c2\u05c7]/u;
const abbreviation=s=>/[׳״'’"]/u.test(String(s||''));
const category=c=>/[\u05b0-\u05bb\u05c7]/u.test(c)?'vowel':c==='ּ'?'dagesh-shuruk':/[ׁׂ]/u.test(c)?'shin-sin':c==='ֿ'?'rafe':c==='ֽ'?'meteg':'other';
function differences(a,b,positiveOnly=false){
 const out=[];
 a.clusters.forEach((c,i)=>{
  const cats=new Set((positiveOnly?c.marks:[...c.marks,...b.clusters[i].marks]).map(category));
  for(const kind of cats){const x=c.marks.filter(m=>category(m)===kind),y=b.clusters[i].marks.filter(m=>category(m)===kind);if(JSON.stringify(x)!==JSON.stringify(y))out.push({letterIndex:i,category:kind,image:x,accordance:y});}
 });return out;
}
function compare(D,I,raw,options={}){
 if(!D?.source||!I?.words||I.targetTextHash!==D.source.textHash||I.diplomaticSha256!==D.source.diplomaticSha256)throw Error('Image observations do not bind this source edition.');
 const parsed=C.parseReference(raw),refs=new Map(parsed.units.map(u=>[u.ref,u]));
 const full={},partial={},features={},split={word:{},abbreviation:{}},details=[],featureDetails=[],positions=[],examples=[];let clear=0,uncertain=0,wordCount=0;
 const inc=(o,k)=>o[k]=(o[k]||0)+1;
 for(const[ref,u]of Object.entries(D.units)){
  const ru=refs.get(ref),anchors=ru?new Map(C.uniqueConsonantAnchors(u.words.map(w=>w.originalWord),ru.tokens).anchors.map(a=>[a.targetIndex,a.referenceIndex])):new Map();
  for(const[index,w]of u.words.entries()){
   const id=u.id+'/word/'+index,o=I.words[id];wordCount++;
   if(!o||o.ref!==ref||o.wordIndex!==index||o.originalWord!==w.originalWord)throw Error('Stale or missing image word '+id);
   const r=ru?.tokens[anchors.get(index)],obs=o.reviews.length===1?o.reviews[0]:null;
   const own=obs?.reading,kind=abbreviation(w.originalWord)||abbreviation(own)||abbreviation(r?.raw)?'abbreviation':'word';
   let gate=null,refSignature;
   if(!r)gate='alignment-open';
   else if(r.annotationTouched)gate='annotation-open';
   else if(r.pointingSuspect||(refSignature=C.pointingSignature(r.raw)).status!=='valid')gate='reference-suspect';
   let status,diff=[],imageSignature;
   const isClear=o.reviewStatus==='clear';
   if(isClear){
    clear++;
    if(!obs||obs.status!=='clear'||!own||own.includes('□')||letters(own)!==letters(w.originalWord))status='image-reading-open';
    else if(gate)status=gate;
    else if((imageSignature=C.pointingSignature(own)).status!=='valid')status='image-pointing-open';
    else{diff=differences(imageSignature,refSignature);status=diff.length?'different':'match';}
    inc(full,status);inc(split[kind],status);
    if(status==='different'){
     positions.push({ref,wordIndex:index,kind,folio:obs.folio,line:obs.line,categories:[...new Set(diff.map(d=>d.category))]});
     // At most seven individual non-abbreviation words; never whole reference lines.
     if(kind==='word'&&examples.length<7)examples.push({ref,wordIndex:index,image:own,accordance:r.raw,folio:obs.folio,imageLine:obs.line,differences:diff});
    }
   }else{
    uncertain++;
    if(!obs||!own)status='no-single-reading';
    else if(own.includes('□')||letters(own)!==letters(w.originalWord))status='partial-letters-or-unreadable';
    else if(!point.test(own))status='no-observed-pointing';
    else if(gate)status=gate;
    else if((imageSignature=C.pointingSignature(own)).status!=='valid')status='image-pointing-open';
    else{diff=differences(imageSignature,refSignature,true);status=diff.length?'observed-marks-different':'observed-marks-compatible';}
    inc(partial,status);
   }
   details.push({id,ref,wordIndex:index,imageStatus:o.reviewStatus,comparisonScope:isClear?'full-first-pass-reading':'exploratory-positive-marks-only',status,kind,imageReading:own||null,reference:r?{raw:r.raw,start:r.start,end:r.end}:null,differences:diff,folio:obs?.folio,line:obs?.line});
   // Explicitly secure features on an otherwise uncertain word are separate evidence.
   for(const f of obs?.observedFeatures||[]){
    let s,fd=[];
    if(f.certainty!=='clear')s='feature-uncertain';
    else if(!Number.isInteger(f.letterIndex)||!letters(w.originalWord)[f.letterIndex]||!f.marks?.length||f.marks.some(m=>typeof m!=='string'||[...m].length!==1||!point.test(m)))s='feature-invalid';
    else if(gate)s=gate;
    else{
     const cats=new Set(f.marks.map(category)),rm=refSignature.clusters[f.letterIndex].marks;
     fd=[...cats].map(cat=>({category:cat,image:[...new Set(f.marks.filter(m=>category(m)===cat))].sort(),accordance:rm.filter(m=>category(m)===cat)})).filter(x=>JSON.stringify(x.image)!==JSON.stringify(x.accordance));
     s=fd.length?'different':'match';
    }
    inc(features,s);featureDetails.push({id,ref,wordIndex:index,letterIndex:f.letterIndex,status:s,marks:f.marks,differences:fd});
   }
  }
 }
 if(Object.keys(I.words).length!==wordCount)throw Error('Extra image words outside this source edition.');
 const aggregate={kind:'visual-image-reading-versus-independent-accordance',version:1,reference:{sha256:options.referenceSha256||sha(Buffer.from(raw)),units:parsed.units.length,source:'User-pasted vocalized Accordance text; module version not embedded',usedAsDonor:false},imageEvidence:{datasetSha256:options.imageSha256||sha(JSON.stringify(I)),targetTextHash:I.targetTextHash,diplomaticSha256:I.diplomaticSha256},sourcePositions:wordCount,clearFirstPassReadings:clear,clearComparison:full,clearByWordKind:split,uncertainImageReadings:uncertain,uncertainExploratoryComparison:partial,explicitSecureFeatures:features,differencePositions:positions,nonAbbreviationExamples:examples,meaning:['Clear means recorded as clear in the first AI image pass, not expert-certified.','A difference compares the recorded AI reading with the pasted Accordance text; it proves neither side wrong.','Abbreviation point inventories may be incomplete despite clear consonants and are reported separately.','Uncertain readings remain uncertain even if observed positive marks are compatible with Accordance.','Only mark categories explicitly present in a partial reading are checked; unrecorded marks are never treated as confirmed absent.','Secure individual features are reported separately and do not certify whole words.'],alignment:'Mandatory unique consonant-only LCS anchors within each ref; vowels never choose an anchor; annotated or malformed reference tokens stay open.'};
 return{aggregate,privateDetails:{referenceSha256:aggregate.reference.sha256,imageSha256:aggregate.imageEvidence.datasetSha256,details,featureDetails}};
}
function main(args){
 if(args.length!==3)throw Error('Usage: node compare-image-accordance.cjs REFERENCE.txt PUBLIC.json PRIVATE_OUTSIDE_REPO.json');
 const root=path.resolve(__dirname,'../..'),repo=path.resolve(root,'..'),[ref,pub,priv]=args.map(a=>path.resolve(a));
 if(priv===repo||priv.startsWith(repo+path.sep)||new Set([ref,pub,priv]).size!==3)throw Error('Private details must stay outside the repository and inputs must not be overwritten.');
 const sourcePath=path.join(root,'mishnah-kaufmann-berakhot-data.js'),imagePath=path.join(root,'mishnah-kaufmann-image-data.js');
 if([pub,priv].some(p=>p===sourcePath||p===imagePath))throw Error('Source files cannot be comparison outputs.');
 const rb=fs.readFileSync(ref),ib=fs.readFileSync(imagePath),result=compare(require(sourcePath),require(imagePath),rb.toString('utf8'),{referenceSha256:sha(rb),imageSha256:sha(ib)});
 fs.writeFileSync(pub,JSON.stringify(result.aggregate,null,2)+'\n');fs.writeFileSync(priv,JSON.stringify(result.privateDetails,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({clear:result.aggregate.clearComparison,byKind:result.aggregate.clearByWordKind,partial:result.aggregate.uncertainExploratoryComparison,features:result.aggregate.explicitSecureFeatures}));
}
module.exports={compare,differences,category};
if(require.main===module)try{main(process.argv.slice(2));}catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
