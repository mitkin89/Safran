'use strict';
// Candidate morphology adapter only. Never import pointing, donors, or source groups.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),cp=require('node:child_process'),zlib=require('node:zlib');
const M=require('../../mishnah-morph'),shared=require('./complete-moed-nashim.cjs'),grammar=require('./build.cjs');
const ROOT=path.resolve(__dirname,'../..'),BASELINE_COMMIT='9968f08',RULE='kodashim-draft-morphology';
const TITLES=['Zevachim','Menachot','Chullin','Bekhorot','Arakhin','Temurah','Keritot','Meilah','Tamid','Middot','Kinnim'].map(x=>'Mishnah '+x);
const DICTS=new Set(['d895bc1c727b','e8d290b744f6','d701423861c6']);
const clone=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const sourceCore=shared.sourceCore,load=bytes=>{const c={window:{}};vm.runInNewContext(String(bytes),c);return Object.values(c.window)[0];};
function sourceInventory(data){return sha({base:data.base,wordCardMapping:data.wordCardMapping,cards:data.sourceWordCards.map(({analyses,status,analysisProvenance,dictionaryEvidence,hints,...identity})=>identity)});}
function validateBindings(d){
 if(!TITLES.includes(d.title)||d.coordinate?.[0]!==5)throw Error('Outside exact Kodashim scope');
 if(d.source?.vocalized!==false||d.source.pointingDonor!==null||d.source.referenceSha256!==null)throw Error('Pointing donor or reference is forbidden');
 if(JSON.stringify(d.base)!==JSON.stringify(d.units))throw Error('Base differs from diplomatic units');
 const cards=new Map(),maps=new Map(),seenForms=new Set(),bindings=[];
 for(const x of d.sourceWordCards||[]){if(cards.has(x.sourceWordId))throw Error('Duplicate source card');cards.set(x.sourceWordId,x);}
 for(const x of d.wordCardMapping||[]){if(maps.has(x.sourceWordId))throw Error('Duplicate word mapping');maps.set(x.sourceWordId,x);}
 let sourceWords=0;
 for(const [ref,u]of Object.entries(d.units)){
  const [c,m]=ref.split(':').map(Number),ids=d.sources?.[d.title]?.chapters?.[c-1]?.[m-1],tokens=M.tokens(u.offsetText);
  if(!ids||ids.length!==tokens.length)throw Error('Lexical token count mismatch '+ref);
  for(let ti=0;ti<tokens.length;ti++){
   const t=tokens[ti],id=ids[ti],f=d.forms[id],owners=u.words.map((w,i)=>({w,i})).filter(({w})=>w.start<=t.start&&w.end>=t.end);
   if(seenForms.has(id)||owners.length!==1||!f)throw Error('Missing or multiply owned lexical form');seenForms.add(id);
   const {w,i}=owners[0],sid=u.id+'/word/'+i;
   if(f.word!==t.word||f.key!==M.normalize(t.word)||f.sourceWordId!==sid||f.sourceRef!==ref||f.sourceWordIndex!==i||f.sourceTokenOffsets?.start!==t.start||f.sourceTokenOffsets?.end!==t.end||u.offsetText.slice(t.start,t.end)!==f.word)throw Error('Exact form identity/offset mismatch '+ref+'/'+ti);
   if(!Array.isArray(f.analyses))throw Error('Missing form analyses array');bindings.push({ref,tokenIndex:ti,id,f,w,sourceWordIndex:i,sourceWordId:sid});
  }
  for(let i=0;i<u.words.length;i++){
   sourceWords++;const w=u.words[i],sid=u.id+'/word/'+i,card=cards.get(sid),mapping=maps.get(sid),owned=ids.filter(id=>d.forms[id].sourceWordId===sid),kind=owned.length===0?'no-lexical-token':owned.length===1?'one-to-one':'one-source-word-multiple-lexical-tokens';
   if(!card||!mapping||card.ref!==ref||mapping.ref!==ref||card.sourceWordIndex!==i||mapping.sourceWordIndex!==i||card.word!==w.text||card.key!==w.key||card.sourceOffsets?.start!==w.start||card.sourceOffsets?.end!==w.end||u.offsetText.slice(w.start,w.end)!==w.text||JSON.stringify(card.flags)!==JSON.stringify(w.flags||[])||JSON.stringify(card.formIds)!==JSON.stringify(owned)||JSON.stringify(mapping.formIds)!==JSON.stringify(owned)||mapping.kind!==kind||!Array.isArray(card.analyses))throw Error('Exact source-card mapping mismatch '+sid);
  }
 }
 if(sourceWords!==cards.size||sourceWords!==maps.size||seenForms.size!==d.forms.length)throw Error('Unmapped source card or form');
 return {bindings,cards,maps,sourceWords};
}
const dictionaryCache=new Map();
function verifyEvidence(e){
 if(!DICTS.has(e.dictId)||!Number.isInteger(e.entry)||e.entry<0)throw Error('Non-rabbinic or invalid dictionary evidence');
 if(!dictionaryCache.has(e.dictId)){const bytes=fs.readFileSync(path.join(ROOT,'bundled/dict',e.dictId+'.json.gz'));dictionaryCache.set(e.dictId,{...JSON.parse(zlib.gunzipSync(bytes)),compressedSha256:sha(bytes)});}
 const d=dictionaryCache.get(e.dictId);if(!d.html[e.entry]||sha(d.html[e.entry])!==e.entrySha256||d.compressedSha256!==e.dictionarySha256||!d.heads[e.entry]?.includes(e.head))throw Error('Dictionary article/hash mismatch');
}
function cleanCandidates(rows,verify=verifyEvidence){
 const evidence=new Map(),out=new Map();
 for(const a of rows){
  for(const e of a.dictionaryEvidence||[]){verify(e);evidence.set(e.dictId+'/'+e.entry,clone(e));}
  const {_sourceWord,_scopeTitles,_priority,_genderOnly,dictionaryEvidence,...v}=clone(a);
  if(!v.lemma||typeof v.morph!=='string'||!/^H.+/.test(v.morph))throw Error('Invalid lexical candidate');
  v.lemma=v.lemma.normalize('NFD').replace(/[\u0591-\u05c7]/g,'');v.reviewed=false;
  v.rules=[...new Set([...(v.rules||[]).map(x=>x==='moed-nashim-draft-morphology'?RULE:x),RULE])];
  for(const id of v.rules)if(id!==RULE&&!grammar.rules[id])throw Error('Undefined candidate grammar rule '+id);
  if(_genderOnly){const code=a.morph.slice(1).split('/').find(x=>/^Nc/.test(x));if(!code)throw Error('Gender-only candidate lacks nominal features');v.partialFeatures={kind:'nominal-gender-only',gender:code[2]||null,number:code[3]||null,state:code[4]||null,prefixes:a.morph.slice(1).split('/').filter(x=>!/^N/.test(x)&&!/^Sp/.test(x)),suffix:a.morph.match(/Sp([123][mfc][spd])/)?.[1]||null};v.morph='H';v.note=(v.note||'')+' Wörterbuchgenus allein bestimmt keine Wortart; ausschließlich Teilmerkmale, noch ungeprüft.';}
  if(v.morph==='H'&&!v.partialFeatures)throw Error('Dummy H cannot represent full morphology');
  out.set(v.lemma+'|'+v.morph+'|'+JSON.stringify(v.partialFeatures||null)+'|'+JSON.stringify(v.gloss||null),v);
 }
 return {analyses:[...out.values()],evidence:[...evidence.values()]};
}
function countSummary(data,changes,remaining){
 const partialOnly=f=>f.analyses.length>0&&f.analyses.every(a=>!!a.partialFeatures);
 return {lexicalForms:data.forms.length,diplomaticSourcePositions:data.sourceWordCards.length,supplementedLexicalForms:changes.length,supplementedUniqueSourcePositions:new Set(changes.map(x=>x.sourceWordId)).size,remainingRecords:remaining.length,uniqueRemainingSourceIDs:new Set(remaining.map(x=>x.sourceWordId)).size,remainingLexicalForms:new Set(remaining.filter(x=>x.formId!==undefined).map(x=>x.formId)).size,sourcePositionsWithoutLexicalToken:data.sourceWordCards.filter(x=>x.formIds.length===0).length,sourcePositionsWithMultipleLexicalTokens:data.sourceWordCards.filter(x=>x.formIds.length>1).length,partialOnlyLexicalForms:data.forms.filter(partialOnly).length,partialOnlySourceCards:data.sourceWordCards.filter(partialOnly).length,unresolvedLexicalForms:data.forms.filter(x=>!x.analyses.length).length,unresolvedSourceCards:data.sourceWordCards.filter(x=>!x.analyses.length).length};
}
function supplementData(data,engine,options={}){
 // Validate the entire book before asking the engine or changing a single card.
 const checked=validateBindings(data),core=sourceCore(data),inventory=sourceInventory(data),plans=[],remaining=[];
 const remain=(b,reason)=>remaining.push({title:data.title,ref:b.ref,tokenIndex:b.tokenIndex,formId:b.id,sourceWordId:b.sourceWordId,word:b.f.word,reason});
 for(const b of checked.bindings){
  const card=checked.cards.get(b.sourceWordId);if(b.f.analyses.length||card.analyses.length||b.f.provenance?.analysis?.reviewed===true||card.analysisProvenance?.reviewed===true)continue;
  if(card.formIds.length!==1){remain(b,'source-word-multiple-lexical-tokens-no-group-inference');continue;}
  if((b.w.flags||[]).some(x=>['unclear','choice','gap'].includes(x))||b.w.text.includes('□')){remain(b,'critical-diplomatic-source-status');continue;}
  if(b.f.word.replace(/[^א-ת]/g,'').length<2){remain(b,'diplomatic-fragment-or-single-letter');continue;}
  const rows=engine.analyze(b.f.word,data.title);if(rows.some(a=>a._scopeTitles?.length&&!a._scopeTitles.includes(data.title)))throw Error('Out-of-scope lexical candidate');const clean=cleanCandidates(rows,options.verifyEvidence);
  if(!clean.analyses.length){remain(b,'no-safe-rabbinic-candidate');continue;}plans.push({...b,card,...clean});
 }
 for(const card of data.sourceWordCards)if(card.formIds.length===0)remaining.push({title:data.title,ref:card.ref,sourceWordId:card.sourceWordId,word:card.word,reason:'source-word-without-lexical-token'});
 // All candidate/evidence validation above is transactional: invalid input leaves data intact.
 const changes=[];
 for(const b of plans){
  const status=b.analyses.every(a=>a.partialFeatures)?'partial':b.analyses.length>1?'ambiguous':'candidate';
  const provenance={kind:'kodashim-rabbinic-form-candidate',reviewed:false,sourceTextHash:data.source.textHash,sourceRef:b.ref,sourceWordId:b.sourceWordId,sourceWordIndex:b.sourceWordIndex,sourceTokenIndex:b.tokenIndex,sourceTokenOffsets:clone(b.f.sourceTokenOffsets),sourceFlags:clone(b.w.flags||[]),pointingMatch:null};
  b.f.analyses=clone(b.analyses);b.f.status=status;b.f.dictionaryEvidence=clone(b.evidence);b.f.provenance.analysis=clone(provenance);b.f.provenance.translation={source:'Redaktionelle Bedeutung zum Formkandidaten, falls vorhanden',reviewed:false,conditionalOnAnalysis:true};b.f.hints=['Rabbinischer Lexikon-/Grammatikkandidat; noch keine Accordance- oder Manuskriptprüfung.'];
  // Only the exact one-to-one source card receives the same provisional analysis.
  b.card.analyses=clone(b.analyses);b.card.status=status;b.card.dictionaryEvidence=clone(b.evidence);b.card.analysisProvenance=clone(provenance);
  changes.push({title:data.title,ref:b.ref,tokenIndex:b.tokenIndex,formId:b.id,sourceWordId:b.sourceWordId,word:b.f.word,status,analyses:clone(b.analyses),dictionaryEvidence:clone(b.evidence)});
 }
 if(sourceCore(data)!==core||sourceInventory(data)!==inventory)throw Error('Adapter changed source identity, pointing or word boundaries');
 const ruleIds=new Set(plans.flatMap(x=>x.analyses.flatMap(a=>a.rules)));for(const id of ruleIds)if(id!==RULE)data.rules[id]=clone(grammar.rules[id]);if(plans.length)data.rules[RULE]={label:'Kodaschim: ungeprüfter rabbinischer Formkandidat',refs:['Jastrow, Levy, Krauss: Artikel- und Wörterbuchhash am einzelnen Beleg. Keine biblischen Wörterbücher.','Keine Vokalisierungs-, Kontext-, Gruppen- oder Accordance-Bestätigung.']};
 data.coverage.statuses=data.forms.reduce((a,f)=>(a[f.status]=(a[f.status]||0)+1,a),{});data.coverage.sourceCardStatuses=data.sourceWordCards.reduce((a,f)=>(a[f.status]=(a[f.status]||0)+1,a),{});
 if(plans.length)data.provenance.analysis='Provisional rabbinic form candidates only; source cards synchronized solely for exact one-to-one mappings. No Accordance or manuscript review.';
 const counts=countSummary(data,changes,remaining);
 data.morphologyCompletion={counts,remainingCountUnit:'records; source-zero and source-one-to-many cases are not lexical word counts',scope:'Kodashim only',method:'Exact one-to-one source-bound rabbinic form candidates',reviewed:false,allMorphologyValidated:false,allSourcePositionsInventoried:true,fullScopeProcessed:true,pointingImported:false,donorMorphologyImported:false,groupsInferred:false,sourceCoreSha256:core,sourceInventorySha256:inventory,changed:changes.length,remaining:remaining.length,inputs:clone(engine.inputs||[]),engine:clone(engine.stats||{})};
 return {changed:changes,remaining,counts,sourceCoreSha256:core,sourceInventorySha256:inventory};
}
function prepareBaseline(app=ROOT){
 const catalog=load(fs.readFileSync(path.join(app,'mishnah-kaufmann-kodashim-catalog.js'))),titles=Object.keys(catalog);if(titles.length!==11||TITLES.some(t=>!catalog[t]))throw Error('Incomplete Kodashim catalog');
 const commit=cp.execFileSync('git',['rev-parse',BASELINE_COMMIT+'^{commit}'],{cwd:app,encoding:'utf8'}).trim();
 const books=TITLES.map(title=>{const item=catalog[title];if(item.integrated!==false)throw Error('Scaffold unexpectedly integrated');const bytes=fs.readFileSync(path.join(app,item.file)),git=cp.execFileSync('git',['show',commit+':app/'+item.file],{cwd:app,maxBuffer:100e6});if(!bytes.equals(git))throw Error('Scaffold bytes differ from frozen baseline '+title);const d=load(bytes);validateBindings(d);if(d.forms.some(f=>f.analyses.length)||d.sourceWordCards.some(f=>f.analyses.length))throw Error('Baseline cards not empty');return {title,file:item.file,global:item.global,fileSha256:sha(bytes),sourceTextHash:d.source.textHash,sourceCoreSha256:sourceCore(d),sourceInventorySha256:sourceInventory(d),forms:d.forms.length,sourceWords:d.sourceWordCards.length};});
 return {version:1,scope:'All eleven Kodashim scaffolds',commit,humanValidated:false,books};
}
function main({baselineFile,write=false,app=ROOT,outputDir=__dirname}={}){
 if(!baselineFile)throw Error('An explicit frozen Kodashim baseline file is required');const baselineBytes=fs.readFileSync(baselineFile),baseline=JSON.parse(baselineBytes),fresh=prepareBaseline(app);
 if(JSON.stringify(baseline)!==JSON.stringify(fresh))throw Error('Frozen baseline no longer matches all eleven scaffolds');
 const engine=shared.buildEngine(),books=[],changes=[],remaining=[],outputs=[];
 for(const b of baseline.books){const d=load(fs.readFileSync(path.join(app,b.file))),r=supplementData(d,engine);if(r.sourceCoreSha256!==b.sourceCoreSha256||r.sourceInventorySha256!==b.sourceInventorySha256)throw Error('Baseline identity mismatch');d.morphologyCompletion.baselineCommit=baseline.commit;d.morphologyCompletion.baselineFileSha256=b.fileSha256;const bytes=Buffer.from('// Unpointed Kaufmann source; provisional rabbinic morphology only.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.'+b.global+'=D;})('+JSON.stringify(d)+');\n');outputs.push({file:path.join(app,b.file),bytes});books.push({...b,afterFileSha256:sha(bytes),changed:r.changed.length,remaining:r.remaining.length,counts:r.counts,statuses:d.coverage.statuses,sourceCardStatuses:d.coverage.sourceCardStatuses});changes.push(...r.changed);remaining.push(...r.remaining);}
 const audit={version:1,scope:'Kodashim only: all eleven books',baselineCommit:baseline.commit,baselineSha256:sha(baselineBytes),adapterSha256:sha(fs.readFileSync(__filename)),sharedEngineSha256:sha(fs.readFileSync(path.join(__dirname,'complete-moed-nashim.cjs'))),humanValidated:false,reviewed:false,written:write,pointingImported:false,donorMorphologyImported:false,groupsInferred:false,inputs:engine.inputs,books,summary:{...Object.fromEntries(Object.keys(books[0].counts).map(k=>[k,books.reduce((n,b)=>n+b.counts[k],0)])),forms:books.reduce((n,b)=>n+b.forms,0),sourceWords:books.reduce((n,b)=>n+b.sourceWords,0),supplemented:changes.length,remaining:remaining.length,remainingCountUnit:'records, not unique source words'},changes};
 if(write)for(const o of outputs)fs.writeFileSync(o.file,o.bytes);fs.mkdirSync(outputDir,{recursive:true});fs.writeFileSync(path.join(outputDir,'kodashim-morphology-completion-audit.json'),JSON.stringify(audit,null,2)+'\n');fs.writeFileSync(path.join(outputDir,'kodashim-morphology-remaining.json'),JSON.stringify(remaining,null,2)+'\n');return audit.summary;
}
module.exports={TITLES,RULE,BASELINE_COMMIT,sourceCore,sourceInventory,countSummary,validateBindings,verifyEvidence,cleanCandidates,supplementData,prepareBaseline,main};
if(require.main===module){const args=process.argv.slice(2),arg=n=>args.find(x=>x.startsWith(n+'='))?.slice(n.length+1);if(args.includes('--prepare-baseline')){if(!arg('--baseline'))throw Error('Supply --baseline=/path/to/kodashim-morphology-baseline.json');fs.writeFileSync(arg('--baseline'),JSON.stringify(prepareBaseline(),null,2)+'\n');}else console.log(JSON.stringify(main({baselineFile:arg('--baseline'),write:args.includes('--write'),outputDir:arg('--output-dir')||__dirname})));}
