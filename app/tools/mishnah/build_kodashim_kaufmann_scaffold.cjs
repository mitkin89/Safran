'use strict';
// Diplomatic scaffold only. No pointing donor, morphology donor or UI integration.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const M=require('../../mishnah-morph');
const ROOT=path.resolve(__dirname,'../..');
const NAMES=['Zevachim','Menachot','Chullin','Bekhorot','Arakhin','Temurah','Keritot','Meilah','Tamid','Middot','Kinnim'];
const VERSION='Kaufmann A50 (Digital Mishnah), diplomatic scaffold';
const clone=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(x).digest('hex'),hash=x=>sha(JSON.stringify(x));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const refsSort=(a,b)=>{const x=a.split(':').map(Number),y=b.split(':').map(Number);return x[0]-y[0]||x[1]-y[1];};
function readBook(bytes,title){const ctx={window:{}};vm.runInNewContext(bytes.toString('utf8'),ctx);const b=ctx.window.MISHNAH_TEXTCRIT_BOOKS?.[title];if(!b)throw Error('Missing diplomatic book '+title);return clone(b);}
function sourceCore(data){return hash({source:data.source,units:data.units,transfers:data.transfers,interlinear:data.interlinear,sources:data.sources,words:data.forms.map(f=>[f.word,f.key,f.provenance?.pointing])});}
function buildBook(original,{file,sha256}={}){
 if(!NAMES.some(n=>original.title==='Mishnah '+n)||original.coordinate?.[0]!==5)throw Error('Book outside Kodashim');
 const title=original.title,name=title.slice(8),slug=name.toLowerCase(),K=original.witnesses?.K;
 if(!K?.units||!K.sha256||!file||!sha256)throw Error('Missing bound diplomatic source');
 const units=clone(K.units),refs=Object.keys(units).sort(refsSort),forms=[],chapters=[],text=[],sourceWordCards=[],wordCardMapping=[],transfers=[];
 const interlinear=clone(original.interlinear);for(const ch of Object.values(interlinear.chapters))ch.D={links:[],open:[],notes:[]};
 for(const ref of refs){
  const u=units[ref],[c,m]=ref.split(':').map(Number);if(!u.id||!Array.isArray(u.words)||typeof u.offsetText!=='string')throw Error('Invalid source unit '+ref);
  const ids=[],tokens=M.tokens(u.offsetText),byWord=u.words.map(()=>[]);
  for(const t of tokens){
   const owners=u.words.map((w,i)=>({w,i})).filter(({w})=>w.start<=t.start&&w.end>=t.end);if(owners.length!==1)throw Error('Lexical token has no unique source owner '+ref+':'+t.start);
   const {w,i}=owners[0],sourceWordId=u.id+'/word/'+i,id=forms.length;ids.push(id);byWord[i].push(id);
   forms.push({word:t.word,key:t.key,count:1,status:'unresolved',analyses:[],sourceWordId,sourceRef:ref,sourceWordIndex:i,sourceTokenOffsets:{start:t.start,end:t.end},hints:['Noch keine positionsgebundene morphologische Analyse zugeordnet.'],provenance:{pointing:{source:'Digital Mishnah, diplomatische Kaufmann-Transkription',status:'open',donor:null,referenceSha256:null},analysis:{source:'Keine zugeordnete Analyse',reviewed:false,sourceWord:w.text,sourceWordId,sourceRef:ref},translation:{source:null,reviewed:false,conditionalOnAnalysis:true}}});
  }
  let html='',at=0;u.words.forEach((w,i)=>{
   if(!Number.isInteger(w.start)||!Number.isInteger(w.end)||w.start<at||u.offsetText.slice(w.start,w.end)!==w.text)throw Error('Source offset drift '+ref+'/'+i);
   const sourceWordId=u.id+'/word/'+i,formIds=byWord[i],kind=formIds.length===0?'no-lexical-token':formIds.length===1?'one-to-one':'one-source-word-multiple-lexical-tokens';
   sourceWordCards.push({sourceWordId,ref,sourceWordIndex:i,word:w.text,key:w.key,sourceOffsets:{start:w.start,end:w.end},flags:clone(w.flags||[]),formIds,status:'unresolved',analyses:[]});
   wordCardMapping.push({sourceWordId,ref,sourceWordIndex:i,formIds,kind});
   transfers.push({id:sourceWordId,targetRef:ref,targetWordIndex:i,originalWord:w.text,pointedWord:w.text,status:'open',reasons:['no-pointing-evidence-imported'],source:null});
   interlinear.chapters[String(c)]||={};interlinear.chapters[String(c)].D||={links:[],open:[],notes:[]};interlinear.chapters[String(c)].D.links.push({ref,base:[[ref,i]],reading:[[ref,i]],after:i?[ref,i-1]:null,kind:'exact',uncertain:false,checked:false,method:'Identity to unchanged Digital Mishnah Kaufmann word index'});
   html+=esc(u.offsetText.slice(at,w.start))+'<span class="kpt-word kpt-open" data-kaufmann-word="'+esc(ref+'|'+i)+'">'+esc(w.text)+'</span>';at=w.end;
  });html+=esc(u.offsetText.slice(at));
  text[c-1]||=[];text[c-1][m-1]='<div class="kpt-text" dir="rtl" lang="he">'+html+'</div>';chapters[c-1]||=[];chapters[c-1][m-1]=ids;
 }
 const rel='own/'+title+'/he/'+VERSION+'.json',source={rel,versionTitle:VERSION,textHash:hash(text),diplomaticSha256:K.sha256,witnessSha256:Object.fromEntries(['D','P','C'].map(s=>[s,original.witnesses[s==='D'?'K':s]?.sha256||null])),vocalized:false,transferred:false,provisional:true,pointingDonor:null,referenceSha256:null,diplomaticModule:{file,sha256},project:clone(original.source)};
 const data={version:1,format:'kaufmann-diplomatic-scaffold-v1',title,edition:VERSION,coordinate:clone(original.coordinate),source,sources:{[title]:{rel,textHash:source.textHash,chapters}},units,base:units,forms,rules:{},sourceWordCards,wordCardMapping,witnessSha256:source.witnessSha256,interlinear,transfers,sourceSummary:{chapters:text.length,mishnayot:refs.length,totalWords:sourceWordCards.length,transferredWords:0,openWords:sourceWordCards.length},coverage:{chapters:text.length,mishnayot:refs.length,words:forms.length,sourceWords:sourceWordCards.length,statuses:{unresolved:forms.length}},provenance:{pointing:'No added pointing. Exact Digital Mishnah witnesses.K source text only; no Beeri fallback and no synthetic Accordance reference.',analysis:'All lexical forms and all diplomatic source cards unresolved; no donor morphology imported.',manuscript:'Digital Mishnah Kaufmann transcription; not a fresh visual manuscript verification.'}};
 const audit=validate(data,original),global='MISHNAH_KAUFMANN_KODASHIM_'+name.toUpperCase()+'_DATA',item={file:'mishnah-kaufmann-kodashim-'+slug+'-data.js',global,versionTitle:VERSION,rel,textHash:source.textHash,chapters:text.length,words:forms.length,sourceWords:sourceWordCards.length,integrated:false};
 return {data,item,audit};
}
function validate(data,original){
 const K=original.witnesses.K;if(JSON.stringify(data.units)!==JSON.stringify(K.units)||JSON.stringify(data.base)!==JSON.stringify(K.units))throw Error('Diplomatic source core changed');
 const seen=new Set(),lexicalIds=new Set();let words=0;const anomalies=[];
 for(const [ref,u]of Object.entries(K.units)){words+=u.words.length;const[c,m]=ref.split(':').map(Number),ids=data.sources[data.title].chapters[c-1][m-1],tt=M.tokens(u.offsetText);if(ids.length!==tt.length)throw Error('Lexical token count changed');
  ids.forEach((id,i)=>{const f=data.forms[id],t=tt[i];if(lexicalIds.has(id)||!f||f.word!==t.word||f.key!==t.key||f.analyses.length||f.status!=='unresolved')throw Error('Invalid lexical form');lexicalIds.add(id);});
  u.words.forEach((w,i)=>{const sid=u.id+'/word/'+i,card=data.sourceWordCards.find(x=>x.sourceWordId===sid),mapping=data.wordCardMapping.find(x=>x.sourceWordId===sid);if(seen.has(sid)||!card||!mapping||card.ref!==ref||card.sourceWordIndex!==i||mapping.ref!==ref||mapping.sourceWordIndex!==i||card.word!==w.text||card.key!==w.key||card.sourceOffsets.start!==w.start||card.sourceOffsets.end!==w.end||JSON.stringify(card.flags)!==JSON.stringify(w.flags||[])||card.analyses.length||card.status!=='unresolved')throw Error('Invalid diplomatic source card '+sid);seen.add(sid);for(const id of card.formIds){const f=data.forms[id];if(!ids.includes(id)||f.sourceWordId!==sid||f.sourceRef!==ref||f.sourceWordIndex!==i||f.sourceTokenOffsets.start<w.start||f.sourceTokenOffsets.end>w.end||u.offsetText.slice(f.sourceTokenOffsets.start,f.sourceTokenOffsets.end)!==f.word)throw Error('Invalid word-card owner '+sid);}if(JSON.stringify(mapping.formIds)!==JSON.stringify(card.formIds))throw Error('Mapping mismatch');if(card.formIds.length!==1)anomalies.push(clone(mapping));});
 }
 if(data.forms.length!==lexicalIds.size||data.sourceWordCards.length!==words||data.wordCardMapping.length!==words||seen.size!==words)throw Error('Source or lexical coverage differs');
 return {title:data.title,diplomaticSourceModule:clone(data.source.diplomaticModule),diplomaticWitnessSha256:K.sha256,diplomaticUnitCount:Object.keys(K.units).length,diplomaticWordCount:words,lexicalFormCount:data.forms.length,sourceUnitsSha256:hash(K.units),scaffoldUnitsSha256:hash(data.units),sourceCoreSha256:sourceCore(data),wordCardMappingSha256:hash(data.wordCardMapping),allSourceWordsMapped:true,allLexicalFormsUnresolved:true,allSourceCardsUnresolved:true,pointingDonor:null,morphologyDonor:null,mappingAnomalies:anomalies};
}
function buildAll({app=ROOT}={}){
 const results=NAMES.map(n=>{const file='mishnah-textcrit/mishnah-'+n.toLowerCase()+'.js',bytes=fs.readFileSync(path.join(app,file));return buildBook(readBook(bytes,'Mishnah '+n),{file,sha256:sha(bytes)});});
 const audit={version:1,builder:{file:'tools/mishnah/build_kodashim_kaufmann_scaffold.cjs',sha256:sha(fs.readFileSync(__filename))},tokenizer:{file:'mishnah-morph.js',sha256:sha(fs.readFileSync(path.resolve(__dirname,'../../mishnah-morph.js')))},scope:'All eleven Seder Kodashim books; diplomatic scaffold, no UI integration',humanValidated:false,books:results.map(r=>r.audit),summary:{books:results.length,units:results.reduce((s,r)=>s+r.audit.diplomaticUnitCount,0),sourceWords:results.reduce((s,r)=>s+r.audit.diplomaticWordCount,0),lexicalForms:results.reduce((s,r)=>s+r.audit.lexicalFormCount,0)},policy:['No Beeri pointing read or copied','No Accordance reference synthesized','No morphology donor or dictionary loaded','Exact witnesses.K.units preserved, including whitespace, annotations, flags, and word boundaries','No manifest or existing catalog changed']};
 return {results,audit,catalog:Object.fromEntries(results.map(r=>[r.data.title,r.item]))};
}
function writeAll(built,{app=ROOT}={}){
 const emit=(global,d)=>'// Diplomatic Kaufmann scaffold; no added pointing or morphology.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.'+global+'=D;})('+JSON.stringify(d)+');\n';
 for(const r of built.results)fs.writeFileSync(path.join(app,r.item.file),emit(r.item.global,r.data));
 fs.writeFileSync(path.join(app,'mishnah-kaufmann-kodashim-catalog.js'),emit('MISHNAH_KAUFMANN_KODASHIM_CATALOG',built.catalog));
 fs.mkdirSync(path.join(app,'tools/mishnah'),{recursive:true});fs.writeFileSync(path.join(app,'tools/mishnah/kodashim-kaufmann-scaffold-audit.json'),JSON.stringify(built.audit,null,2)+'\n');
 return built.audit.summary;
}
module.exports={NAMES,VERSION,readBook,buildBook,buildAll,writeAll,validate,sourceCore};
if(require.main===module)console.log(JSON.stringify(writeAll(buildAll()),null,2));
