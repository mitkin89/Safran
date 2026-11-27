'use strict';
// Bind source locations and actual AI observations without certifying unread words.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),M=require('../../mishnah-morph'),B=require('./build_kaufmann_accordance.cjs');
const ROOT=path.resolve(__dirname,'../..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),clone=x=>JSON.parse(JSON.stringify(x));
function catalog(){const x={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'mishnah-accordance-catalog.js'),'utf8'),x);return x.window.MISHNAH_ACCORDANCE_CATALOG;}
function build(locationFile,inventoryFile,reviewFiles){
 const storedLocationBytes=fs.readFileSync(locationFile),locBytes=locationFile.endsWith('.gz')?require('node:zlib').gunzipSync(storedLocationBytes):storedLocationBytes,locations=JSON.parse(locBytes),inventory=JSON.parse(fs.readFileSync(inventoryFile)),items=catalog(),reviews=reviewFiles.map(file=>{const bytes=fs.readFileSync(file);return{file,sha256:sha(bytes),data:JSON.parse(bytes)};}),observations=new Map(),pages=new Map(),unbound=[];
 if(sha(locBytes)!==inventory.wordLocationSha256||locations.manuscriptSha256!==inventory.diplomaticXmlSha256)throw Error('Source-location fingerprint changed');
 const images=new Map(inventory.images.map(i=>[i.folio,i])),counterchecks=[];
 for(const report of reviews){
  for(const p of report.data.pages||[]){const image=images.get(p.folio);if(!image||p.imageSha256&&p.imageSha256!==image.sha256)throw Error('Review image fingerprint mismatch '+p.folio);const list=pages.get(p.folio)||[];list.push(p);pages.set(p.folio,list);}
  for(const o of report.data.observations||[]){
   const location=locations.words[o.sourceWordId];if(!location){unbound.push(o.sourceWordId||null);continue;}
   const image=images.get(o.folio);if(!image||!location.locations.some(l=>l.folio===o.folio)||o.imageSha256&&o.imageSha256!==image.sha256)throw Error('Review belongs to different source image '+o.sourceWordId);
   if(report.data.method==='independent blind AI image countercheck')counterchecks.push(o);
   if(!Array.isArray(o.bbox)||o.bbox.length!==4||o.bbox.some(n=>!Number.isFinite(n))||o.bbox[0]<0||o.bbox[1]<0||o.bbox[2]>image.width||o.bbox[3]>image.height||o.bbox[0]>=o.bbox[2]||o.bbox[1]>=o.bbox[3])throw Error('Review bbox outside original '+o.sourceWordId);
   const normalized={...clone(o),line:o.imageLine??o.line??null},letters=Array.from(location.originalWord).filter(c=>/[א-ת]/u.test(c));normalized.observedFeatures=(o.observedFeatures||[]).map(f=>({...clone(f),marks:typeof f.marks==='string'?Array.from(f.marks):f.marks})).filter(f=>Number.isInteger(f.letterIndex)&&f.letterIndex>=0&&f.letterIndex<letters.length&&['clear','uncertain'].includes(f.certainty)&&Array.isArray(f.marks)&&f.marks.length&&f.marks.every(m=>typeof m==='string'&&/^[\u05b0-\u05bd\u05bf\u05c1\u05c2\u05c7]$/u.test(m)));
   const list=observations.get(o.sourceWordId)||[];list.push({...normalized,status:o.fullPointingVerified===true&&o.status==='clear'&&typeof o.reading==='string'&&o.reading.trim()?'clear':'uncertain',method:'AI visual manuscript observation; not human confirmation'});observations.set(o.sourceWordId,list);
  }
 }
 const pointCategory=m=>/[\u05b0-\u05bb\u05c7]/u.test(m)?'vowel':m==='ּ'?'dot':/[ׁׂ]/u.test(m)?'shin-sin':m;
 for(const c of counterchecks)for(const feature of c.observedFeatures||[]){
  const marks=typeof feature.marks==='string'?[...feature.marks]:feature.marks||[],uncertain=feature.certainty==='uncertain'&&!marks.length;
  if(!uncertain&&!(feature.certainty==='clear'&&marks.length))continue;
  for(const review of observations.get(c.sourceWordId)||[])for(const f of review.observedFeatures||[]){
   if(f.letterIndex!==feature.letterIndex||f.certainty!=='clear')continue;
   const cats=new Set(marks.map(pointCategory)),previous=(f.marks||[]).filter(m=>cats.has(pointCategory(m))).sort(),contrary=!uncertain&&previous.length&&JSON.stringify(previous)!==JSON.stringify([...marks].sort());
   if(!uncertain&&!contrary)continue;
   f.initialCertainty='clear';f.certainty='uncertain';f.adjudication=uncertain?'A blind second image reading could not isolate this positive mark. It remains uncertain; absence is not asserted.':'A blind second image reading identifies a different positive mark. This earlier interpretation remains unconfirmed; the independent reading is retained separately.';
   review.notes=[...(review.notes||[]),uncertain?'Blinde zweite Bildlesung bestätigt dieses Einzelzeichen nicht sicher; Befund bleibt offen. Keine Aussage über das Fehlen eines Zeichens.':'Blinde zweite Bildlesung liest ein anderes Einzelzeichen; diese frühere Interpretation bleibt unsicher. Der Gegenbefund ist separat dokumentiert.'];
  }
 }
 const summary={books:[],pagesWithOverview:pages.size,unboundObservations:unbound,completeWordPointingReview:false};
 for(const[title,item]of Object.entries(items)){
  const data=require(path.join(ROOT,item.file));if(!inventory.tractates[title])continue;if(data.source.diplomaticSha256!==inventory.diplomaticXmlSha256)throw Error('Image manuscript fingerprint changed');
  const words={},used=new Set();let observed=0,clear=0,featureWords=0,features=0,conflicts=0;
  for(const[ref,u]of Object.entries(data.units))u.words.forEach((w,i)=>{
   const id=u.id+'/word/'+i,l=locations.words[id];if(!l||l.title!==title||l.originalWord!==w.originalWord)throw Error('Image source word identity changed '+id);
   const rs=observations.get(id)||[],state=rs.length?(rs.some(r=>r.status==='clear')?'clear':'uncertain'):'not-reviewed';
   words[id]={ref,wordIndex:i,originalWord:w.originalWord,locations:clone(l.locations),reviewStatus:state,reviews:rs};for(const location of l.locations)used.add(location.folio);
   if(rs.length)observed++;if(state==='clear')clear++;const fs=rs.flatMap(r=>r.observedFeatures||[]);if(fs.length)featureWords++;features+=fs.length;
   const cautions=w.pointingStatus==='transferred'?B.imageCautions(w.text,words[id]):[];w.pointingCautions=cautions;if(cautions.length)conflicts++;
   const record=data.transfers.find(t=>t.id===id);if(record)record.pointingCautions=cautions;
   const[c,m]=ref.split(':').map(Number),tokens=M.tokens(u.offsetText),ids=data.sources[title].chapters[c-1][m-1];tokens.forEach((t,j)=>{if(w.start<=t.start&&w.end>=t.end)data.forms[ids[j]].provenance.pointing.cautions=cautions.map(x=>x.note);});
  });
  const imageData={version:1,title,reviewSources:reviews.map(r=>({file:path.basename(r.file),sha256:r.sha256})),targetTextHash:data.source.textHash,diplomaticSha256:data.source.diplomaticSha256,words,images:Object.fromEntries([...used].map(f=>{const{localPath,...image}=images.get(f);return[f,image];})),pages:[...used].map(f=>({folio:f,inspection:pages.get(f)||[],completeWordPointingReview:false})),policy:'Source locations and AI visual observations are separate. Page overview is not per-word validation; partial features never certify full pointing.'};
  item.imageFile=item.file.replace(/-data\.js$/,'-image-data.js');item.imageGlobal=item.global.replace(/_DATA$/,'_IMAGE_DATA');
  const emit=(file,global,d)=>fs.writeFileSync(path.join(ROOT,file),'// Source-bound image evidence; no automatic text correction.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.'+global+'=D;})('+JSON.stringify(d)+');\n');
  data.base=data.units;emit(item.imageFile,item.imageGlobal,imageData);emit(item.file,item.global,data);
  summary.books.push({title,sourceWords:Object.keys(words).length,wordsWithIndividualObservation:observed,wordsWithoutIndividualObservation:Object.keys(words).length-observed,wordsWithCompletePointing:clear,wordsWithObservedFeatures:featureWords,observedFeatures:features,featureConflictWords:conflicts,pages:used.size});
 }
 fs.writeFileSync(path.join(ROOT,'mishnah-accordance-catalog.js'),'// Source-bound provisional editions with separate image evidence.\nwindow.MISHNAH_ACCORDANCE_CATALOG='+JSON.stringify(items)+';\n');
 fs.writeFileSync(path.join(__dirname,inventoryFile.includes('nashim')?'accordance-nashim-manuscript-review-summary.json':inventoryFile.includes('moed')?'accordance-moed-manuscript-review-summary.json':'accordance-zeraim-manuscript-review-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));return summary;
}
module.exports={build};if(require.main===module)try{build(process.argv[2],process.argv[3],process.argv.slice(4));}catch(e){console.error(e.stack);process.exitCode=1;}
