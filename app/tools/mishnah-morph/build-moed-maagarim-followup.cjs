'use strict';
/* Read-only source modules; creates a pending research queue, never Ma'agarim evidence. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm'),cp=require('child_process'),M=require('../../mishnah-morph.js');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const NASHIM_TITLES=new Set(['Yevamot','Ketubot','Nedarim','Nazir','Sotah','Gittin','Kiddushin'].map(t=>'Mishnah '+t));
const NASHIM_DRAFT='2cc7eaae7b94de668634b588b116422c7e8d32f0';
function parseArgs(args=[]){
 let seder='moed',imageIndex;const seen=new Set();
 for(const a of args){const k=a.split('=')[0];if(!['--seder','--image-index'].includes(k)||!a.includes('=')||seen.has(k))throw Error('Use --seder=moed|nashim and optional --image-index=/path/to/index.json');seen.add(k);if(k==='--seder')seder=a.slice(8);else imageIndex=a.slice(14);}
 if(!['moed','nashim'].includes(seder))throw Error('Unknown seder: '+seder);
 return {seder,imageIndex};
}
function buildQueue(options={}){
 const {seder='moed'}=options;if(!['moed','nashim'].includes(seder))throw Error('Unknown seder: '+seder);
 const dir=options.dir||__dirname,app=options.app||path.resolve(dir,'../..'),input=path.join(dir,seder+'-current-accordance-comparison.json'),bytes=fs.readFileSync(input),d=JSON.parse(bytes),comparisonSha256=sha(bytes);
 if(seder==='moed'?!d.draftCommit?.startsWith('7c432dc'):d.draftCommit!==NASHIM_DRAFT)throw Error('Unexpected draft commit; revise queue scope explicitly.');
 const validatedInputs=[];
 if(seder==='nashim'){
  if(!Array.isArray(d.inputs)||!d.inputs.length||!Array.isArray(d.draftFiles)||!d.draftFiles.length)throw Error('Missing frozen comparison inputs or draft files');
  if(d.inputs.filter(i=>i.imageIndexSha256).length!==1)throw Error('Exactly one frozen image index is required');
  const imageIndex=options.imageIndex||'/workspace/mishnah-nashim-drive/full-download-index.json';
  for(const i of d.inputs){
   if(i.file){if(path.basename(i.file)!==i.file)throw Error('Invalid input filename');const b=fs.readFileSync(path.join(dir,i.file));if(sha(b)!==i.sha256)throw Error('Comparison input drift: '+i.file);validatedInputs.push({file:i.file,sha256:sha(b)});}
   else if(i.imageIndexSha256){if(sha(fs.readFileSync(imageIndex))!==i.imageIndexSha256)throw Error('Image index drift');validatedInputs.push({imageIndexSha256:i.imageIndexSha256});}
   else throw Error('Unverifiable comparison input');
  }
 }
 const books=new Map(),draftFiles=[];
 for(const f of d.draftFiles){
  if(seder==='nashim'&&!NASHIM_TITLES.has(f.title))throw Error('Draft outside Nashim: '+f.title);
  if(path.basename(f.file)!==f.file)throw Error('Invalid draft filename');
  const p=path.join(app,f.file),b=seder==='nashim'?(options.readFrozenDraft?options.readFrozenDraft(f):cp.execFileSync('git',['show',NASHIM_DRAFT+':app/'+f.file],{cwd:path.resolve(app,'..'),maxBuffer:128*1024*1024})):fs.readFileSync(p),hash=sha(b);
  if(hash!==f.sha256)throw Error('Draft file drift: '+f.file);
  if(seder==='nashim'){const ctx={window:{},module:{exports:{}}};vm.runInNewContext(b.toString('utf8'),ctx);const book=Object.keys(ctx.module.exports).length?ctx.module.exports:Object.values(ctx.window)[0];if(!book||book.title!==f.title)throw Error('Draft title mismatch: '+f.title);books.set(f.title,book);}else books.set(f.title,require(p));
  draftFiles.push({...f,sha256:hash});
 }
const grouped=new Map();let skippedWithoutBinding=0;for(const r of d.rows){if(!r.sourceWordId){skippedWithoutBinding++;continue;}const cc=r.candidates||[],reasons=[];
const real=cc.filter(c=>!c.partial);for(const f of ['stem','person'])if(real.length&&real.every(c=>(c.different||[]).some(x=>x.feature===f)))reasons.push({priority:1,code:'all-complete-candidates-differ-in-'+f,meaning:'Visible conflict needs contextual verification; not a proven source error.'});
if(r.lexicalComparison?.status==='candidate-head-lexeme-differs')reasons.push({priority:2,code:'potential-lexical-head-conflict',meaning:'Exact consonantal head mismatch only; first exclude spelling, abbreviation, segmentation and citation-lemma conventions.'});
if(['surface-or-segmentation-difference','reference-needs-review'].includes(r.status))reasons.push({priority:2,code:r.status,meaning:'Resolve image/source alignment or reading before consulting Ma’agarim; do not transfer a word analysis across fragments.'});
if(['draft-unresolved','draft-partial-visible-features'].includes(r.status)&&(r.parsed?.features?.type==='N'||/\bcm\b/.test(r.reference?.tags||'')))reasons.push({priority:3,code:'unresolved-or-partial-nominal-analysis',meaning:'Nominal reference features or citation head need lexical/contextual evidence; absent features remain unspecified.'});
if(!reasons.length)continue;const k=r.title+'|'+r.sourceWordId;let g=grouped.get(k);if(!g){const b=books.get(r.title),u=b?.units[r.ref],wi=Number(r.sourceWordId.split('/word/')[1]),w=u?.words[wi];if(!u||!w||u.id+'/word/'+wi!==r.sourceWordId)throw Error('Invalid binding '+k);g={title:r.title,ref:r.ref,sourceTextHash:b.source.textHash,sourceWordId:r.sourceWordId,sourceWordIndex:wi,sourceOffsets:{start:w.start,end:w.end},sourceWord:u.offsetText.slice(w.start,w.end),sourceFlags:w.flags||[],context:M.tokens(u.offsetText).filter(t=>t.end>w.start-55&&t.start<w.end+55).map(t=>t.word).join(' '),...(seder==='nashim'?{comparisonInputSha256:comparisonSha256,frozenDraftCommit:d.draftCommit}:{}),priority:9,reasons:[],candidates:[],observations:[]};grouped.set(k,g);}
for(const z of reasons){g.priority=Math.min(g.priority,z.priority);if(!g.reasons.some(x=>x.code===z.code))g.reasons.push(z);}for(const c of cc)if(!g.candidates.some(x=>JSON.stringify(x)===JSON.stringify(c)))g.candidates.push(c);
if(seder==='nashim'&&!validatedInputs.some(i=>i.file===r.observationFile))throw Error('Unbound observation input: '+r.observationFile);
const o={observationFile:r.observationFile,...(seder==='nashim'?{observationFileSha256:validatedInputs.find(i=>i.file===r.observationFile).sha256}:{}),status:r.status,observedWord:r.reference?.word,observedRef:r.reference?.observedRef,rawLex:r.reference?.lex,rawTags:r.reference?.tags,image:r.reference?.image,observationMethod:r.reference?.method,observationStatus:r.reference?.observationStatus,notes:r.reference?.notes,lexicalComparisonStatus:r.lexicalComparison?.status};if(!g.observations.some(x=>JSON.stringify(x)===JSON.stringify(o)))g.observations.push(o);
}
const positions=[...grouped.values()].sort((a,b)=>a.priority-b.priority||a.title.localeCompare(b.title)||a.sourceWordId.localeCompare(b.sourceWordId));const counts={positions:positions.length,observations:positions.reduce((n,g)=>n+g.observations.length,0),byPriority:{},byTitle:{},byReason:{}};for(const g of positions){counts.byPriority[g.priority]=(counts.byPriority[g.priority]||0)+1;counts.byTitle[g.title]=(counts.byTitle[g.title]||0)+1;for(const r of g.reasons)counts.byReason[r.code]=(counts.byReason[r.code]||0)+1;}
const out={version:1,kind:'pending-Maagarim-followup-queue-not-a-comparison',snapshot:{generatedAt:options.generatedAt||new Date().toISOString(),runningPartialSnapshot:true,draftCommit:d.draftCommit,comparisonFile:path.basename(input),comparisonSha256,comparisonComplete:d.complete,comparisonObservationRows:d.rows.length,comparisonInputs:d.inputs,...(seder==='nashim'?{validatedInputs,frozenDraftCommit:NASHIM_DRAFT}:{}),draftFiles},maagarimQueried:false,maagarimVerified:false,humanValidated:false,complete:false,policy:['No new Ma’agarim requests, imports or verified statuses.','No source text, pointing or morphology changed.','One record per source ID; overlapping screenshot observations retained together. No consonant-only transfer across positions.','Priority 1 isolates stem/person conflicts against all complete candidates, still subject to visual alignment and convention review.','Lexical-head differences are potential conflicts, not proven lemma errors.','Only unresolved nominal positions with an existing visible nominal indication are selected. Unobserved or unclassified open forms are not silently classified as nouns.','Regenerate after the complete Accordance report; current queue is a partial running snapshot.'],skippedWithoutBinding,counts,positions};
return {out,input,bytes,dir,seder};
}
function writeQueue(result){
const {out,input,bytes,dir,seder}=result,{counts}=out,d={draftCommit:out.snapshot.draftCommit},prefix=seder+'-maagarim-followup-pending';
fs.writeFileSync(path.join(dir,prefix+'.json'),JSON.stringify(out)+'\n');
const md=['# '+(seder==='moed'?'Moed':'Naschim')+': ausstehende Ma’agarim-Folgeprüfungen','','**Laufender partieller Snapshot. Keine neue Ma’agarim-Prüfung durchgeführt.**',`Entwurf: \`${d.draftCommit}\`; Vergleichs-SHA256: \`${sha(bytes)}\`.`, '',`${counts.positions} eindeutige Quellpositionen, ${counts.observations} zugehörige Bildbeobachtungen. Überschneidende Bilder sind je Quell-ID zusammengefasst; die Queue ist keine Zahl bewiesener Fehler.`, '', '| Priorität | Positionen | Zweck |','| --- | ---: | --- |',...Object.entries(counts.byPriority).map(([p,n])=>`| ${p} | ${n} | ${p==='1'?'Stamm-/Person-Konflikte gegen sämtliche vollständigen Kandidaten':p==='2'?'Potenzielle Lemma-Konflikte sowie Lesungs-/Zuordnungsfragen':'Unbestimmte oder partielle nominale Kandidaten'} |`),'','Alle sourceIDs, Referenzen, Quell-Offsets/-Hashes, Kandidaten, Roh-Lex-/Tag-Zeilen, Bild-SHAs und Prüfgründe stehen in `'+prefix+'.json`. Zuerst echte Lesungs-/Segmentierungsprobleme klären, dann die konkrete Ma’agarim-Stelle suchen. Nicht gelieferte Flexionsmerkmale bleiben offen.','', 'Die Liste ist aus dem vorhandenen partiellen Accordance-Vergleich erzeugt. Sie zertifiziert keine Lesung und keine Morphologie. Oberflächen-/Zitierlemma-Konventionen können scheinbare Konflikte erklären. Noch nicht beobachtete oder unklassifizierte Formen wurden nicht als Nomen erraten. Kein biblisches Wörterbuch benutzt.','', 'Regenerieren nach Abschluss des Vergleichs: `node app/tools/mishnah-morph/build-moed-maagarim-followup.cjs'+(seder==='nashim'?' --seder=nashim':'')+'`. Bei anderem Entwurfscommit muss die ausdrücklich deklarierte Snapshotbasis angepasst werden.','', '| Traktat | Folgepositionen |','| --- | ---: |',...Object.entries(counts.byTitle).map(([t,n])=>`| ${t} | ${n} |`),''];fs.writeFileSync(path.join(dir,prefix+'.md'),md.join('\n'));console.log(JSON.stringify(counts,null,2));

return out;
}
if(require.main===module)writeQueue(buildQueue(parseArgs(process.argv.slice(2))));
module.exports={parseArgs,buildQueue,writeQueue,NASHIM_DRAFT};
