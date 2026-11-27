'use strict';
// Strict additive working editions. Source locations and visual readings are separate.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const P=require('../../kaufmann-pointing'),M=require('../../mishnah-morph'),C=require('../mishnah-morph/compare-kaufmann-pointing.cjs'),A=require('./transfer_interlinear_analyses.cjs'),B=require('./build_kaufmann_accordance.cjs');
const ROOT=path.resolve(__dirname,'../..'),VERSION=B.VERSION,hash=x=>sha(JSON.stringify(x)),sha=(x,alg='sha256')=>crypto.createHash(alg).update(x).digest('hex'),clone=x=>JSON.parse(JSON.stringify(x)),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BOOKS=[['Peah','Pea',/^אלו\s+דברים/u],['Demai','Dem.',/^הקלים\s+שבדמיי/u],['Kilayim','Kil.',/^החטים\s+והזונים/u],['Sheviit','Shev.'],['Terumot','Ter.'],['Maasrot','Maas.',/^כלל\s+אמרו/u],['Maaser Sheni','Maaser2'],['Challah','Hal.'],['Orlah','Orla'],['Bikkurim','Bik.']];
BOOKS.push(['Shabbat','Shabb.',/^יציאות\s+השבת/u],['Eruvin','Eruv.',/^מבויי\s+שהוא/u],['Pesachim','Pesah.',/^אור\s+לארבעה\s+עשר/u],['Shekalim','Sheqal.'],['Yoma','Yoma',/^שבעת\s+ימים\s+קודם/u],['Sukkah','Sukk.'],['Beitzah','Betza'],['Rosh Hashanah','RoshHa.'],["Ta'anit",'Taan.'],['Megillah','Meg.'],['Moed Katan','MoedQa.'],['Chagigah','Hagig.',/^הכל\s+חייבים/u]);
const HEBREW={Peah:'פאה',Demai:'דמאי',Kilayim:'כלאים',Sheviit:'שביעית',Terumot:'תרומות',Maasrot:'מעשרות','Maaser Sheni':'מעשר שני',Challah:'חלה',Orlah:'ערלה',Bikkurim:'ביכורים'};
Object.assign(HEBREW,{Shabbat:'שבת',Eruvin:'עירובין',Pesachim:'פסחים',Shekalim:'שקלים',Yoma:'יומא',Sukkah:'סוכה',Beitzah:'ביצה','Rosh Hashanah':'ראש השנה',"Ta'anit":'תענית',Megillah:'מגילה','Moed Katan':'מועד קטן',Chagigah:'חגיגה'});
function load(file,select){const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,file),'utf8'),ctx);return select(ctx.window);}
const catalog=()=>load('mishnah-textcrit-catalog.js',w=>w.MISHNAH_TEXTCRIT_CATALOG);
function splitPesachim(raw){
 const expected='cbe3f724efe88edab06c6ac68e963ef718022752e6f39f5ef1ec117ff4783900';
 if(sha(raw)!==expected)return {raw,splits:[]};
 const spans=[{ref:'10:7',start:31764,end:32001,sha256:'bc5066a6d88337fbdbb85c5ac155c21439add444416dc3f98296ca87a1b8fd6e'},{ref:'10:8',start:32001,end:32171,sha256:'fb44880b57aa3c933c26b8eb7c6eb35d899685b613ee9b74a0e62be16fc2c0e6'},{ref:'10:9',start:32171,end:32458,sha256:'8b395ee13d7054ef5a3e93f39d7fd4e37a583b804f1dd8454f0c1b778dcf85f5'}];
 for(const span of spans)if(sha(raw.slice(span.start,span.end))!==span.sha256)throw Error('Pesachim merged-unit span changed');
 return{raw:raw.slice(0,32001)+'\nPesah. 10:8 '+raw.slice(32001,32171)+'\nPesah. 10:9 '+raw.slice(32171),splits:spans.map(s=>({...s,offsetConvention:'UTF-16 into original unchanged input',method:'Separate merged final line at independent unique unit openings; synthetic labels are metadata only'}))};
}
function splitInputs(files){
 const parts=new Map(),prefixes=new Map(BOOKS.map(b=>[b[1],b]));
 for(const file of files){const inputRaw=fs.readFileSync(file,'utf8'),inputSha=sha(inputRaw),projection=splitPesachim(inputRaw),raw=projection.raw;let current=null;
  for(const line of raw.split(/\r\n|\r|\n/)){
   if(!line.trim())continue;
   const clean=line.replace(/[\u200e\u200f]/g,'').trim();if(!clean||/^[A-Z][A-Z\s2]+$/.test(clean))continue;
   const label=/([A-Za-z][A-Za-z0-9.]+)\s*(\d+)\s*:\s*(\d+)/.exec(line);
   if(label){current=prefixes.get(label[1]);if(!current)throw Error('Unknown tractate label '+label[1]);}
   else if(!current){const letters=line.normalize('NFD').replace(/[^א-ת\s]/g,'').trim();current=BOOKS.find(b=>b[2]?.test(letters));if(!current)throw Error('Unidentified opening line');}
   const key=current[0],part=parts.get(key)||{lines:[],inputSha256:inputSha,sourceFile:path.basename(file),referenceSplits:projection.splits};
   if(part.inputSha256!==inputSha)throw Error('Duplicate tractate across input files '+key);part.lines.push(line);parts.set(key,part);
  }
 }
 return parts;
}
function build(book,raw,donor,cat){
 const [name,prefix,openingPattern]=book,title='Mishnah '+name,item=cat[title],slug=item.slug.replace(/^mishnah-/,''),global='MISHNAH_KAUFMANN_ACCORDANCE_'+name.toUpperCase().replace(/[^A-Z0-9]+/g,'_')+'_DATA',file='mishnah-kaufmann-accordance-'+slug+'-data.js',rel='own/'+title+'/he/'+VERSION+'.json';
 const original=load(item.file,w=>w.MISHNAH_TEXTCRIT_BOOKS[title]),alignment=load('mishnah-vocalized/'+item.slug+'.js',w=>w.MISHNAH_VOCALIZED[title]),source=original.witnesses.K;
 const parsed=C.parseReference(raw,{labelPattern:new RegExp(prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*(\\d+)\\s*:\\s*(\\d+)','u'),openingPattern:openingPattern||/^NEVER$/,displayNumbers:true}),reference=new Map(parsed.units.map(u=>[u.ref,u])),refs=Object.keys(source.units).sort((a,b)=>{const x=a.split(':').map(Number),y=b.split(':').map(Number);return x[0]-y[0]||x[1]-y[1];});
 if(reference.size!==refs.length||refs.some(r=>!reference.has(r)))throw Error(title+': reference coverage differs from Kaufmann ('+reference.size+'/'+refs.length+')');
 const units={},text=[],forms=[],chapters=[],transfers=[],reasons={},referenceSha256=sha(raw),shift=(n,edits)=>n+edits.filter(e=>e.offset<=n).reduce((s,e)=>s+e.text.length,0);
 for(const ref of refs){
  const u=source.units[ref],r=reference.get(ref),anchors=new Map(C.uniqueConsonantAnchors(u.words.map(w=>w.text),r.tokens).anchors.map(a=>[a.targetIndex,a.referenceIndex])),records=[],edits=[];
  u.words.forEach((w,i)=>{
   if(u.offsetText.slice(w.start,w.end)!==w.text)throw Error('Source offset drift');
   const originalRef=name==='Pesachim'&&['10:8','10:9'].includes(ref)?'10:7':ref;
   const token=r.tokens[anchors.get(i)],record={id:u.id+'/word/'+i,targetRef:ref,targetWordIndex:i,originalWord:w.text,pointedWord:w.text,status:'open',reasons:[],source:null};
   if(!token)record.reasons.push('no-unique-reference-anchor');
   else{record.source={sha256:referenceSha256,ref,originalRef,refKind:'Kaufmann-mapped comparison unit; originalRef preserves supplied division',tokenIndex:token.index,rawStart:token.start,rawEnd:token.end};if(token.annotationTouched)record.reasons.push('reference-editorial-annotation');if(token.pointingSuspect||C.pointingSignature(token.raw).status!=='valid')record.reasons.push('reference-pointing-suspect');}
   if(w.flags.length)record.reasons.push('source-word-annotation');if(w.text.includes('□'))record.reasons.push('source-gap');
   if(!record.reasons.length){const result=P.transferWord(w.text,token.raw);if(result.status==='transferred'){record.status='transferred';record.pointedWord=result.text;record.insertions=result.insertions;edits.push({start:w.start,end:w.end,target:w.text,donor:token.raw});}else record.reasons.push(result.reason||'reference-has-no-pointing');}
   for(const reason of record.reasons)reasons[reason]=(reasons[reason]||0)+1;records.push(record);transfers.push(record);
  });
  const applied=P.applyWordTransfers(u.offsetText,edits);if(B.undo(applied.text,applied.insertions)!==u.offsetText)throw Error('Original source characters changed');
  const words=u.words.map((w,i)=>({...w,start:shift(w.start,applied.insertions),end:shift(w.end,applied.insertions),text:records[i].pointedWord,originalWord:w.text,originalStart:w.start,originalEnd:w.end,pointingStatus:records[i].status,pointingReasons:records[i].reasons,pointingCautions:[],transferId:records[i].id}));
  const unit={...u,text:applied.text.replace(/\s+/g,' ').trim(),offsetText:applied.text,originalOffsetText:u.offsetText,words,annotations:u.annotations.map(a=>({...a,originalStart:a.start,originalEnd:a.end,start:shift(a.start,applied.insertions),end:shift(a.end,applied.insertions)})),pointingInsertions:applied.insertions};units[ref]=unit;
  const noteIndices=new Set((original.interlinear.baseNotes?.[ref.split(':')[0]]||[]).filter(n=>n.ref===ref).flatMap(n=>n.reading.map(p=>p[1])));
  let html='',at=0,noteOpen=false;for(let i=0;i<words.length;i++){const w=words[i],isNote=noteIndices.has(i);if(applied.text.slice(w.start,w.end)!==w.text)throw Error('Transferred word offset drift');
   if(isNote&&!noteOpen){html+='<aside class="mci-note kpt-source-note"><small class="kpt-note-label">Randkommentar (Quelle)</small> ';noteOpen=true;}else if(!isNote&&noteOpen){html+='</aside>';noteOpen=false;}
   html+=esc(applied.text.slice(at,w.start))+'<span class="kpt-word'+(w.pointingStatus==='open'?' kpt-open':'')+(isNote?' mci-base-word':'')+'"'+(isNote?' data-vocalized-word="'+esc(ref+'|'+i)+'"':'')+'>'+esc(w.text)+'</span>';at=w.end;
  }if(noteOpen)html+='</aside>';html+=esc(applied.text.slice(at));
  const[c,m]=ref.split(':').map(Number);text[c-1]||=[];text[c-1][m-1]='<div class="kpt-text" dir="rtl" lang="he">'+html+'</div>';chapters[c-1]||=[];
  chapters[c-1][m-1]=M.tokens(applied.text).map(t=>{const i=words.findIndex(w=>w.start<=t.start&&w.end>=t.end);if(i<0)throw Error('Unbound lexical token');const record=records[i],id=forms.length;forms.push({word:t.word,key:t.key,count:1,status:'unresolved',analyses:[],hints:['Keine sichere Einzelwortanalyse über das Interlinear verfügbar.'],provenance:{pointing:{source:'Vom Nutzer kopierter Accordance-Text',status:record.status,referenceSha256,ref,originalRef:name==='Pesachim'&&['10:8','10:9'].includes(ref)?'10:7':ref,divisionNote:name==='Pesachim'&&['10:8','10:9'].includes(ref)?'Vorlagenabschnitt Pesachim 10:7; Textspanne dem Kaufmann-Abschnitt '+ref+' zugeordnet. Abweichende Einteilung, kein fehlender Text.':null,tokenIndex:record.source?.tokenIndex??null,cautions:[]},analysis:{source:'Keine zugeordnete Analyse',reviewed:false,sourceWord:words[i].originalWord,pointingMatch:null},translation:{source:'Redaktionelle Kurzbedeutung zur vorgeschlagenen Analyse',reviewed:false,conditionalOnAnalysis:true}}});return id;});
 }
 const sourceMeta={rel,versionTitle:VERSION,textHash:hash(text),diplomaticSha256:source.sha256,witnessSha256:Object.fromEntries(['D','P','C'].map(s=>[s,original.witnesses[s==='D'?'K':s].sha256])),vocalized:true,transferred:true,provisional:true,pointingDonor:'Accordance',referenceSha256};
 const interlinear=clone(original.interlinear);for(const[ch,value]of Object.entries(interlinear.chapters)){value.D={links:[],open:[],notes:[]};for(const ref of refs.filter(r=>r.startsWith(ch+':')))units[ref].words.forEach((_,i)=>value.D.links.push({ref,base:[[ref,i]],reading:[[ref,i]],after:i?[ref,i-1]:null,kind:'exact',uncertain:false,checked:false,method:'Identity to unchanged Digital Mishnah word index'}));}
 const data={version:1,title,edition:VERSION,source:sourceMeta,sources:{[title]:{rel,textHash:sourceMeta.textHash,chapters}},units,base:units,forms,rules:clone(donor.rules),witnessSha256:sourceMeta.witnessSha256,interlinear,sourceSummary:{chapters:text.length,mishnayot:refs.length,totalWords:transfers.length,transferredWords:transfers.filter(t=>t.status==='transferred').length,openWords:transfers.filter(t=>t.status==='open').length},transfers,provenance:{pointing:'Strict additive Accordance transfer; original characters unchanged; no Beeri pointing fallback.',analysis:'Existing analyses transferred only through unique compatible interlinear positions; candidates, not confirmed morphology.',manuscript:'Digital Mishnah Kaufmann transcription preserved. Source locations are not visual confirmation. No complete manuscript-pointing review asserted.'}};
 A.transfer(data,alignment,donor);data.coverage={chapters:text.length,mishnayot:refs.length,words:forms.length,sourceWords:transfers.length,statuses:forms.reduce((o,f)=>(o[f.status]=(o[f.status]||0)+1,o),{})};
 const doc={title,heTitle:'משנה '+HEBREW[name],language:'he',actualLanguage:'he',versionTitle:VERSION,versionSource:source.url,categories:['Mishnah',item.coordinate[0]===1?'Seder Zeraim':'Seder Moed'],sectionNames:['Chapter','Mishnah'],direction:'rtl',isSource:true,isPrimary:false,license:'Unknown',attribution:'Consonants: Digital Mishnah CC BY 4.0. Pointing: user-supplied Accordance text; provisional, not manuscript-certified.',text};
 return{data,doc,item:{file,global,versionTitle:VERSION,rel,textHash:sourceMeta.textHash,chapters:text.length,words:forms.length},report:{title,source:sourceMeta,summary:data.sourceSummary,coverage:data.coverage,openReasons:reasons,interlinearAnalysisTransfer:data.interlinearAnalysisTransfer,policy:data.provenance}};
}
function main(files){
 if(!files.length)throw Error('At least one private reference input is required');
 const parts=splitInputs(files),cat=catalog(),donors={1:require('../../mishnah-zeraim-data'),2:require('../../mishnah-moed-data')},out=fs.existsSync(path.join(ROOT,'mishnah-accordance-catalog.js'))?load('mishnah-accordance-catalog.js',w=>w.MISHNAH_ACCORDANCE_CATALOG):{},reports=[],manifestPath=path.join(ROOT,'bundled/manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath));
 for(const book of BOOKS){const part=parts.get(book[0]);if(!part)continue;const raw=part.lines.join('\n')+'\n',result=build(book,raw,donors[cat['Mishnah '+book[0]].coordinate[0]],cat),{data,doc,item,report}=result;
  fs.writeFileSync(path.join(ROOT,item.file),'// Generated source-preserving provisional Accordance working edition.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.'+item.global+'=D;})('+JSON.stringify(data)+');\n');
  const target=path.join(ROOT,'bundled',item.rel),bytes=JSON.stringify(doc,null,2)+'\n';fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  const entry={rel:item.rel,title:data.title,heTitle:doc.heTitle,language:'Hebrew',versionTitle:VERSION,categories:doc.categories,kind:'he',hash:sha(bytes,'sha1')},i=manifest.items.findIndex(e=>e.rel===entry.rel);if(i<0)manifest.items.push(entry);else manifest.items[i]=entry;
  out[data.title]=item;report.inputSha256=part.inputSha256;report.referenceSplits=part.referenceSplits;report.referenceProjection='Original non-heading lines joined with LF; point/word offsets refer to this projection, full input bound separately by SHA256';reports.push(report);console.log(JSON.stringify({title:data.title,...data.sourceSummary,analyses:data.coverage.statuses}));
 }
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,1)+'\n');fs.writeFileSync(path.join(ROOT,'mishnah-accordance-catalog.js'),'// Source-bound provisional working editions; not manuscript-certified.\nwindow.MISHNAH_ACCORDANCE_CATALOG='+JSON.stringify(out)+';\n');
 const reportPath=path.join(__dirname,'accordance-working-audit.json'),prior=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath)).books:[],all=new Map(prior.map(r=>[r.title,r]));for(const r of reports)all.set(r.title,r);
 fs.writeFileSync(reportPath,JSON.stringify({version:1,scope:'Seder Zeraim after Berakhot and Seder Moed',method:'Strict source-preserving transfer and independent interlinear analysis; manuscript image review remains separate',books:[...all.values()]},null,2)+'\n');
}
module.exports={build,splitInputs,splitPesachim,BOOKS,main};if(require.main===module)try{main(process.argv.slice(2));}catch(e){console.error(e.stack);process.exitCode=1;}
