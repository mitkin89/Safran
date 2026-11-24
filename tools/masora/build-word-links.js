'use strict';
// Reproducible, offline word-reference audit against every bundled Westminster chapter.
// This adds browsing links only; source transcriptions and publisher anchors stay unchanged.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'../..'),D=require(path.join(root,'library-masora-data')),index=require(path.join(root,'masora-index'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const fold=D.matchTokens;
function build(){
 const chapters=new Map(),sources=[];
 for(const e of require(path.join(root,'bundled/manifest.json')).items.filter(e=>e.kind==='he'&&/^Westminster/.test(e.versionTitle))){
  const raw=fs.readFileSync(path.join(root,'bundled',e.rel)),doc=JSON.parse(raw);sources.push({book:e.title,file:e.rel,sha256:sha(raw)});
  doc.text.forEach((chapter,c)=>{if(!Array.isArray(chapter))return;chapters.set(e.title+' '+(c+1),chapter.map((html,v)=>({book:e.title,chapter:c+1,verse:v+1,words:fold(String(html||'').replace(/<[^>]*>/g,''))})));});
 }
 const citationRows=[],mtCache=new Map(),notes={},citations={},rows=[],counts={total:0,sourceUnique:0,sourceAmbiguous:0,mtUnique:0,mtAmbiguous:0,noMtMatch:0,unparsedLabel:0},sourceChecks={confirmed:0,notConfirmed:0};
 function candidates(page,target){
  const coverage=page.bibleRefs.join('|'),key=coverage+'\n'+target.needle.join(' ')+'|'+target.phrase+'|'+target.offset+'|'+JSON.stringify(target.reference);if(mtCache.has(key))return mtCache.get(key);
  const keys=new Set();for(const label of page.bibleRefs){const r=D.bibleRef(label);if(r)for(let c=r.chapter;c<=r.endChapter;c++)keys.add(r.book+' '+c);}
  const needle=fold(target.needle.join(' ')),out=[];
  for(const key of keys)for(const verse of chapters.get(key)||[])for(let i=0;i<=verse.words.length-needle.length;i++)if(needle.every((w,j)=>verse.words[i+j]===w)){
   // Chapter scan is bounded by the explicit BibleText coverage, never note citations.
   if(D.covers(page,verse)&&D.targetMatches(target,verse))out.push({book:verse.book,chapter:verse.chapter,verse:verse.verse,endChapter:verse.chapter,endVerse:verse.verse,label:verse.book+' '+verse.chapter+':'+verse.verse,phrase:target.phrase,wordIndex:i+target.offset,method:'westminster-page-coverage'});
  }
  mtCache.set(key,out);return out;
 }
 function citationTargets(entry,target){
  if(target){
   // Repeated form headings list individual spellings, not necessarily adjacent words.
   const bases=target.head.map(w=>w.replace(/^[ול]/u,''));
   if(target.head.length>1&&target.needle.join(' ')===target.head.join(' ')&&new Set(bases).size===1)return [...new Set(target.head)].map(phrase=>({...D.labelTarget(phrase),listed:true}));
   return [target];
  }
  const label=String(entry.label||''),boundary=/[ _,]+(?:(?:Part of|cf\.) )?(?:Gins(?:burg|\.)?|OH\d*|OP|Okhla\w*|Weil|Ognibeni)\b/iu.exec(label);
  const heading=boundary?label.slice(0,boundary.index):label,suffix=boundary?label.slice(boundary.index):'';
  const alternatives=heading.split(/\s+(?:\/|\\|or)\s+/u);
  if(alternatives.length<2)return [];
  const targets=alternatives.map(part=>D.labelTarget(part+suffix));
  return targets.every(Boolean)?targets.map(t=>({...t,listed:true})):[];
 }
 function citationCandidates(entry,target){
  const targets=citationTargets(entry,target),out=new Map();
  const qualifier=entry.readings.find(r=>D.wordTokens(D.text(r)).some(w=>['חס','חסר','מל','מלא'].includes(w)));
  const skeleton=w=>w.replace(/[וי]/g,'');
  for(const reading of entry.readings)for(const reference of reading.references||[]){
   const ref=D.bibleRef(reference.label),verse=ref&&ref.chapter===ref.endChapter&&ref.verse===ref.endVerse?chapters.get(ref.book+' '+ref.chapter)?.[ref.verse-1]:null;
   const record={entry:entry.uuid,reading:reading.uuid,reference:reference.label,status:!ref||ref.chapter!==ref.endChapter||ref.verse!==ref.endVerse?'unsupported-reference':!verse?'missing-mt':!targets.length?'unsupported-label':'no-word-match',targets:[]};
   citationRows.push(record);if(!verse||!targets.length)continue;
   const quote=fold(D.text(reading));
   for(const candidate of targets){
    const head=fold(candidate.head.join(' ')),needle=fold(candidate.needle.join(' '));
    for(let i=0;i<verse.words.length;i++){
     let phrase=candidate.phrase,at=i+candidate.offset,method=candidate.listed?'westminster-cited-listed-form':'westminster-cited-word';
     const exact=needle.every((w,j)=>verse.words[i+j]===w);
     if(!exact){
      if(!qualifier||head.length!==1||head[0]===verse.words[i]||skeleton(head[0])!==skeleton(verse.words[i]))continue;
      // A spelling difference requires a cited, matching quotation of at least
      // two adjacent MT words including the target, plus a spelling marker.
      let context=false;
      for(let q=0;q<quote.length-1;q++)for(let v=Math.max(0,i-quote.length);v<=i;v++){
       let len=0;while(q+len<quote.length&&v+len<verse.words.length&&quote[q+len]===verse.words[v+len])len++;
       if(len>=2&&v<=i&&i<v+len)context=true;
      }
      if(!context)continue;
      phrase=verse.words[i];at=i;method='westminster-cited-quote-spelling';
     }
     const loc={...ref,label:ref.book+' '+ref.chapter+':'+ref.verse,phrase,wordIndex:at,method,sourceReading:reading.uuid,sourceQuote:D.text(reading),sourceReference:reference.label,...(!exact?{qualifierReading:qualifier.uuid,qualifierText:D.text(qualifier)}:{})};
     out.set(loc.label+'|'+at+'|'+phrase,loc);record.targets.push({phrase,wordIndex:at,method});record.status='matched';
    }
   }
  }
  return [...out.values()];
 }
 for(const ms of index.manuscripts)for(const page of require(path.join(root,ms.file)).pages)for(const entry of page.contexts){
  if(!['mp','mm','mf'].includes(entry.type)||!entry.readings.some(r=>D.text(r)))continue;
  const source=D.sourceLocations(page,entry),target=D.labelTarget(entry.label),cited=citationCandidates(entry,target);let mt=target?candidates(page,target):[],reason;
  if(!mt.length&&target)mt=cited.filter(loc=>D.covers(page,loc)&&D.targetMatches(target,loc));
  if(source.length===1){reason='sourceUnique';sourceChecks[mt.some(x=>x.label===source[0].label)?'confirmed':'notConfirmed']++;}
  else if(source.length>1)reason='sourceAmbiguous';
  else if(!target)reason='unparsedLabel';
  else if(mt.length){reason=mt.length===1?'mtUnique':'mtAmbiguous';notes[entry.uuid]={page:page.id,label:entry.label,coverage:page.bibleRefs.join('|'),sourceSnapshot:D.sourceSnapshot(page),locations:mt};}
  else reason='noMtMatch';
  if(cited.length)citations[entry.uuid]={page:page.id,label:entry.label,locations:cited};
  counts.total++;counts[reason]++;
  rows.push({manuscript:ms.label,page:page.id,uuid:entry.uuid,label:entry.label,type:entry.type,reason,...(target?.reference?{labelReference:target.reference}:{}),...(target?.numberTag!==undefined?{numberTag:target.numberTag}:{}),source:source.map(x=>x.label),mt:mt.map(x=>x.label),citations:cited.map(x=>({label:x.label,phrase:x.phrase,method:x.method}))});
 }
 const citationCounts={references:citationRows.length};for(const r of citationRows)citationCounts[r.status]=(citationCounts[r.status]||0)+1;
 return {citationAudit:{schema:1,counts:citationCounts,references:citationRows},links:{schema:1,source:{masoraIndexSha256:sha(fs.readFileSync(path.join(root,'masora-index.js'))),manuscripts:index.manuscripts.map(m=>({file:m.file,sha256:m.sha256})),westminster:sources},notes,citations},report:{schema:1,counts,sourceChecks,unique:counts.sourceUnique+counts.mtUnique,multiple:counts.sourceAmbiguous+counts.mtAmbiguous,linked:counts.sourceUnique+counts.sourceAmbiguous+counts.mtUnique+counts.mtAmbiguous,open:counts.noMtMatch+counts.unparsedLabel,citationCounts,citedNotes:Object.keys(citations).length,openWithCitedWords:rows.filter(r=>['noMtMatch','unparsedLabel'].includes(r.reason)&&r.citations.length).length,notice:'Automatic exact word references, not verified publisher anchors. MT fallback uses only explicit page BibleText coverage, not citations. Every exact occurrence supplies a browsing link, including multiple verses. Unknown labels and absent matches remain unresolved.',rows}};
}
if(require.main===module){const {links,report,citationAudit}=build();fs.writeFileSync(path.join(root,'masora-word-links.js'),'// Derived offline MT word references; rebuild with tools/masora/build-word-links.js.\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.MASORA_WORD_LINKS=d;})('+JSON.stringify(links)+');\n');fs.writeFileSync(path.join(__dirname,'word-links-audit.json'),JSON.stringify(report)+'\n');fs.writeFileSync(path.join(__dirname,'citation-audit.json'),JSON.stringify(citationAudit)+'\n');console.log(JSON.stringify({citationCounts:report.citationCounts,counts:report.counts,sourceChecks:report.sourceChecks,unique:report.unique,multiple:report.multiple,linked:report.linked,open:report.open,citedNotes:report.citedNotes,openWithCitedWords:report.openWithCitedWords},null,2));}
module.exports={build};
