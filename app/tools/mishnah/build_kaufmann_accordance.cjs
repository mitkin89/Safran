'use strict';
// Local working edition: only Accordance-supplied points, never a hidden Be'eri fallback.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const P=require('../../kaufmann-pointing'),M=require('../../mishnah-morph'),B=require('../mishnah-morph/build.cjs'),C=require('../mishnah-morph/compare-kaufmann-pointing.cjs');
const root=path.resolve(__dirname,'../..'),TITLE='Mishnah Berakhot',VERSION='Kaufmann A50 (Digital Mishnah), provisional Accordance pointing',REL='own/'+TITLE+'/he/'+VERSION+'.json';
const sha=(b,alg='sha256')=>crypto.createHash(alg).update(b).digest('hex'),hash=o=>sha(JSON.stringify(o)),clone=o=>JSON.parse(JSON.stringify(o)),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function undo(text,edits){let delta=0;const out=edits.map(e=>{const o={offset:e.offset+delta,text:e.text};delta+=e.text.length;return o;});for(const e of out.reverse()){if(text.slice(e.offset,e.offset+e.text.length)!==e.text)throw Error('Point insertion lost');text=text.slice(0,e.offset)+text.slice(e.offset+e.text.length);}return text;}
const shift=(p,edits)=>p+edits.filter(e=>e.offset<=p).reduce((n,e)=>n+e.text.length,0);
function samePointing(a,b){const x=C.pointingSignature(a),y=C.pointingSignature(b);return x.status==='valid'&&y.status==='valid'&&JSON.stringify(x.clusters)===JSON.stringify(y.clusters);}
function imageCautions(word,evidence){
 const out=[],signature=C.pointingSignature(word);if(signature.status!=='valid')return out;
 const category=c=>/[\u05b0-\u05bb\u05c7]/u.test(c)?'vowel':c==='ּ'?'dot':/[ׁׂ]/u.test(c)?'shin-sin':c;
 for(const review of evidence?.reviews||[])for(const f of review.observedFeatures||[]){
  if(f.certainty!=='clear'||!f.marks?.length||!signature.clusters[f.letterIndex])continue;
  const cluster=signature.clusters[f.letterIndex],cats=new Set(f.marks.map(category)),reference=cluster.marks.filter(m=>cats.has(category(m))).sort(),observed=[...new Set(f.marks)].sort();
  if(JSON.stringify(reference)!==JSON.stringify(observed))out.push({letterIndex:f.letterIndex,imageMarks:observed,accordanceMarks:reference,note:'Offener Bildkonflikt: KI-Bildablesung '+cluster.base+observed.join('')+' gegenüber Accordance '+cluster.base+reference.join('')+'. Der einzelne Zeichenbefund bleibt zur Nachprüfung offen.'});
 }return out;
}
function build(raw,original,previous,images){
 const source=original.witnesses.K;
 if(previous.source.diplomaticSha256!==source.sha256||images.diplomaticSha256!==source.sha256||images.targetTextHash!==previous.source.textHash)throw Error('Existing source or image evidence changed');
 const referenceSha256=sha(Buffer.from(raw)),parsed=C.parseReference(raw),references=new Map(parsed.units.map(u=>[u.ref,u]));
 const refs=Object.keys(source.units).sort((a,b)=>{const x=a.split(':').map(Number),y=b.split(':').map(Number);return x[0]-y[0]||x[1]-y[1];});
 if(references.size!==refs.length||refs.some(r=>!references.has(r)))throw Error('Accordance reference must cover all 57 Berakhot units exactly');
 const units={},transfers=[],text=[],forms=[],chapters=[],reasons={};
 for(const ref of refs){
  const u=source.units[ref],ru=references.get(ref),anchors=new Map(C.uniqueConsonantAnchors(u.words.map(w=>w.text),ru.tokens).anchors.map(a=>[a.targetIndex,a.referenceIndex])),edits=[],records=[];
  u.words.forEach((w,i)=>{
   if(u.offsetText.slice(w.start,w.end)!==w.text)throw Error('Source offset drift '+ref);
   const r=ru.tokens[anchors.get(i)],record={id:u.id+'/word/'+i,targetRef:ref,targetWordIndex:i,originalWord:w.text,pointedWord:w.text,status:'open',reasons:[],source:null};
   if(!r)record.reasons.push('no-unique-reference-anchor');
   if(r){record.source={kind:'user-supplied Accordance surface text',sha256:referenceSha256,ref,tokenIndex:r.index,rawStart:r.start,rawEnd:r.end};if(r.annotationTouched)record.reasons.push('reference-editorial-annotation');if(r.pointingSuspect||C.pointingSignature(r.raw).status!=='valid')record.reasons.push('reference-pointing-suspect');}
   if(w.flags.length)record.reasons.push('source-word-annotation');
   if(w.text.includes('□'))record.reasons.push('source-gap');
   if(!record.reasons.length){
    const result=P.transferWord(w.text,r.raw);
    if(result.status==='transferred'){record.status='transferred';record.pointedWord=result.text;record.insertions=result.insertions;edits.push({start:w.start,end:w.end,target:w.text,donor:r.raw});}
    else record.reasons.push(result.reason||'reference-has-no-pointing');
   }
   record.pointingCautions=record.status==='transferred'?imageCautions(record.pointedWord,images.words[record.id]):[];
   for(const reason of record.reasons)reasons[reason]=(reasons[reason]||0)+1;
   records.push(record);transfers.push(record);
  });
  const applied=P.applyWordTransfers(u.offsetText,edits);if(undo(applied.text,applied.insertions)!==u.offsetText)throw Error('Source characters changed '+ref);
  const words=u.words.map((w,i)=>({...w,start:shift(w.start,applied.insertions),end:shift(w.end,applied.insertions),text:records[i].pointedWord,originalWord:w.text,originalStart:w.start,originalEnd:w.end,pointingStatus:records[i].status,pointingReasons:records[i].reasons,pointingCautions:records[i].pointingCautions,transferId:records[i].id}));
  for(const w of words)if(applied.text.slice(w.start,w.end)!==w.text)throw Error('New source offset drift '+ref);
  const unit={...u,text:applied.text.replace(/\s+/g,' ').trim(),offsetText:applied.text,originalOffsetText:u.offsetText,words,annotations:u.annotations.map(a=>({...a,originalStart:a.start,originalEnd:a.end,start:shift(a.start,applied.insertions),end:shift(a.end,applied.insertions)})),pointingInsertions:applied.insertions};units[ref]=unit;
  let html='',at=0;for(const w of words){html+=esc(unit.offsetText.slice(at,w.start));html+='<span class="kpt-word'+(w.pointingStatus==='open'?' kpt-open':'')+'" title="'+esc(w.pointingStatus==='open'?'Punktierung offen; ursprüngliche Zeichen erhalten':'Vorläufige Accordance-Punktierung; nicht abschließend am Manuskript geprüft')+'">'+esc(w.text)+'</span>';at=w.end;}html+=esc(unit.offsetText.slice(at));
  const[c,m]=ref.split(':').map(Number);text[c-1]||=[];text[c-1][m-1]='<div class="kpt-text" dir="rtl" lang="he">'+html+'</div>';
  const tokens=M.tokens(unit.offsetText),oldTokens=M.tokens(previous.units[ref].offsetText),oldIds=previous.sources[TITLE].chapters[c-1][m-1],ids=[];
  if(tokens.length!==oldTokens.length||tokens.length!==oldIds.length)throw Error('Lexical positions changed '+ref);
  tokens.forEach((t,j)=>{
   const old=previous.forms[oldIds[j]],wordIndex=words.findIndex(w=>w.start<=t.start&&w.end>=t.end);
   if(wordIndex<0||P.stripPointing(t.word)!==P.stripPointing(old.word))throw Error('Analysis position changed '+ref+'/'+j);
   const record=records[wordIndex],pointingMatch=record.status==='transferred'?samePointing(t.word,old.word):null;
   const analyses=old.analyses.map(a=>({...clone(a),method:'retained-source-position-candidate',note:(a.note?a.note+' ':'')+'Analyse positionsgebunden aus der Be’eri-Arbeitsfassung erhalten; '+(pointingMatch===true?'Punktierung unverändert.':'Accordance-Punktierung abweichend oder offen; Analyse und Kurzbedeutung dafür nicht bestätigt.')}));
   const status=!analyses.length?'unresolved':pointingMatch!==true?'partial':analyses.length>1?'ambiguous':'candidate';
   const provenance={pointing:{source:'Vom Nutzer kopierter Accordance-Text',status:record.status,referenceSha256,ref,tokenIndex:record.source?.tokenIndex??null,cautions:record.pointingCautions.map(c=>c.note)},analysis:{source:analyses.length?'Positionsgebundener Analysevorschlag aus der Be’eri-Arbeitsfassung':'Keine zugeordnete Analyse',sourceWord:old.word,pointingMatch,reviewed:false},translation:{source:'Redaktionelle Kurzbedeutung zur vorgeschlagenen Analyse',reviewed:false,conditionalOnAnalysis:true}};
   ids.push(forms.length);forms.push({word:t.word,key:t.key,count:1,status,analyses,hints:analyses.length?pointingMatch===true?[]:['Analyse und Kurzbedeutung sind Vorschläge; die aktuelle Punktierung ist dafür nicht bestätigt.']:['Noch keine positionsgebundene Analyse zugeordnet.'],provenance});
  });chapters[c-1]||=[];chapters[c-1][m-1]=ids;
 }
 const meta={rel:REL,versionTitle:VERSION,textHash:hash(text),diplomaticSha256:source.sha256,witnessSha256:{D:source.sha256,P:original.witnesses.P.sha256,C:original.witnesses.C.sha256},vocalized:true,transferred:true,provisional:true,pointingDonor:'Accordance',referenceSha256,analysisSourceTextHash:previous.source.textHash};
 const summary={chapters:9,mishnayot:refs.length,totalWords:transfers.length,transferredWords:transfers.filter(t=>t.status==='transferred').length,openWords:transfers.filter(t=>t.status==='open').length,meaning:'Provisional exact-character transfer from user-supplied Accordance pointing; no complete manuscript validation.'};
 const rules=clone(previous.rules);rules['kaufmann-pointing-transfer']={label:'Analysekandidat positionsgebunden aus der Be’eri-Vorarbeit erhalten',refs:['Diese Regel belegt nur die Herkunft des Analysevorschlags.','Die Punktierung dieser Arbeitsfassung stammt ausschließlich aus der Accordance-Abschrift; Abweichungen bleiben ungeprüft.']};
 const interlinear=clone(previous.interlinear),D={version:1,title:TITLE,edition:VERSION,source:meta,sources:{[TITLE]:{rel:REL,textHash:meta.textHash,chapters}},sourceSummary:summary,witnessSha256:meta.witnessSha256,units,base:units,interlinear,forms,rules,transfers,provenance:{pointing:'Only the user-supplied Accordance text supplies pointing; open positions retain original unpointed Digital Mishnah text.',analysis:'Existing Be’eri-position candidates retained with explicit mismatch status; no new morphology inferred from pointing.',translation:'Existing editorial glosses remain conditional on unverified analyses; rabbinic dictionary links only.',manuscript:'Original source characters, corrections, raw TEI and image observations remain unchanged.'},coverage:{chapters:9,mishnayot:refs.length,sourceWords:transfers.length,words:forms.length,statuses:forms.reduce((o,f)=>(o[f.status]=(o[f.status]||0)+1,o),{})}};
 const imageData={...clone(images),targetTextHash:meta.textHash,reboundFrom:{targetTextHash:images.targetTextHash,method:'Every diplomatic ID and original word checked; image observations preserved without change.'}};
 for(const[ref,u]of Object.entries(units))u.words.forEach((w,i)=>{if(imageData.words[u.id+'/word/'+i]?.originalWord!==w.originalWord)throw Error('Image word identity changed '+ref);});
 const doc={title:TITLE,heTitle:'משנה ברכות',language:'he',actualLanguage:'he',versionTitle:VERSION,versionSource:source.url,categories:['Mishnah','Seder Zeraim'],sectionNames:['Chapter','Mishnah'],direction:'rtl',isSource:true,isPrimary:false,license:'Unknown',attribution:'Consonantal transcription: Digital Mishnah, CC BY 4.0. Pointing: user-supplied Accordance text; provisional local working edition. Redistribution rights for the pointing are not asserted.',rights:{consonants:'Digital Mishnah CC BY 4.0',pointing:'User-supplied Accordance text; source version and redistribution license not embedded'},pointingStatus:'Provisional Accordance transfer, with explicitly open positions; not a manuscript-certified edition',text};
 const report={edition:VERSION,source:meta,summary,coverage:D.coverage,openReasons:reasons,open:transfers.filter(t=>t.status==='open').map(t=>({id:t.id,ref:t.targetRef,wordIndex:t.targetWordIndex,originalWord:t.originalWord,reasons:t.reasons})),imageFeatureConflicts:transfers.filter(t=>t.pointingCautions.length).map(t=>({id:t.id,ref:t.targetRef,wordIndex:t.targetWordIndex,cautions:t.pointingCautions})),policy:D.provenance};
 return{data:D,imageData,doc,report};
}
function main(args){
 if(args.length!==1)throw Error('Usage: node build_kaufmann_accordance.cjs PRIVATE_REFERENCE.txt');
 const raw=fs.readFileSync(path.resolve(args[0]),'utf8'),ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'mishnah-textcrit-data.js'),'utf8'),ctx);
 const result=build(raw,ctx.window.MISHNAH_TEXTCRIT,require('../../mishnah-kaufmann-berakhot-data'),require('../../mishnah-kaufmann-image-data'));
 const emit=(name,global,data)=>fs.writeFileSync(path.join(root,name),'// Provisional source-bound local working data; original editions remain unchanged.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.'+global+'=D;})('+JSON.stringify(data)+');\n');
 emit('mishnah-kaufmann-accordance-data.js','MISHNAH_KAUFMANN_ACCORDANCE_DATA',result.data);emit('mishnah-kaufmann-accordance-image-data.js','MISHNAH_KAUFMANN_ACCORDANCE_IMAGE_DATA',result.imageData);
 const file=path.join(root,'bundled',REL),bytes=JSON.stringify(result.doc,null,2)+'\n';fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);
 const manifestPath=path.join(root,'bundled/manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath)),entry={rel:REL,title:TITLE,heTitle:result.doc.heTitle,language:'Hebrew',versionTitle:VERSION,categories:result.doc.categories,kind:'he',hash:sha(bytes,'sha1')},at=manifest.items.findIndex(x=>x.rel===REL);if(at<0)manifest.items.push(entry);else manifest.items[at]=entry;fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,1)+'\n');
 fs.writeFileSync(path.join(__dirname,'kaufmann-accordance-working-audit.json'),JSON.stringify(result.report,null,2)+'\n');console.log(JSON.stringify({summary:result.data.sourceSummary,coverage:result.data.coverage,openReasons:result.report.openReasons}));
}
module.exports={build,undo,samePointing,imageCautions,VERSION};if(require.main===module)try{main(process.argv.slice(2));}catch(e){process.stderr.write(e.stack+'\n');process.exitCode=1;}
