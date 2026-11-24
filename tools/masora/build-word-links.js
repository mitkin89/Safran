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
 const mtCache=new Map(),notes={},rows=[],counts={total:0,sourceUnique:0,sourceAmbiguous:0,mtUnique:0,mtAmbiguous:0,noMtMatch:0,unparsedLabel:0},sourceChecks={confirmed:0,notConfirmed:0};
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
 for(const ms of index.manuscripts)for(const page of require(path.join(root,ms.file)).pages)for(const entry of page.contexts){
  if(!['mp','mm','mf'].includes(entry.type)||!entry.readings.some(r=>D.text(r)))continue;
  const source=D.sourceLocations(page,entry),target=D.labelTarget(entry.label),mt=target?candidates(page,target):[];let reason;
  if(source.length===1){reason='sourceUnique';sourceChecks[mt.some(x=>x.label===source[0].label)?'confirmed':'notConfirmed']++;}
  else if(source.length>1)reason='sourceAmbiguous';
  else if(!target)reason='unparsedLabel';
  else if(mt.length){reason=mt.length===1?'mtUnique':'mtAmbiguous';notes[entry.uuid]={page:page.id,label:entry.label,coverage:page.bibleRefs.join('|'),sourceSnapshot:D.sourceSnapshot(page),locations:mt};}
  else reason='noMtMatch';
  counts.total++;counts[reason]++;
  rows.push({manuscript:ms.label,page:page.id,uuid:entry.uuid,label:entry.label,type:entry.type,reason,...(target?.reference?{labelReference:target.reference}:{}),...(target?.numberTag!==undefined?{numberTag:target.numberTag}:{}),source:source.map(x=>x.label),mt:mt.map(x=>x.label)});
 }
 return {links:{schema:1,source:{masoraIndexSha256:sha(fs.readFileSync(path.join(root,'masora-index.js'))),manuscripts:index.manuscripts.map(m=>({file:m.file,sha256:m.sha256})),westminster:sources},notes},report:{schema:1,counts,sourceChecks,unique:counts.sourceUnique+counts.mtUnique,multiple:counts.sourceAmbiguous+counts.mtAmbiguous,linked:counts.sourceUnique+counts.sourceAmbiguous+counts.mtUnique+counts.mtAmbiguous,open:counts.noMtMatch+counts.unparsedLabel,notice:'Automatic exact word references, not verified publisher anchors. MT fallback uses only explicit page BibleText coverage, not citations. Every exact occurrence supplies a browsing link, including multiple verses. Unknown labels and absent matches remain unresolved.',rows}};
}
if(require.main===module){const {links,report}=build();fs.writeFileSync(path.join(root,'masora-word-links.js'),'// Derived offline MT word references; rebuild with tools/masora/build-word-links.js.\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.MASORA_WORD_LINKS=d;})('+JSON.stringify(links)+');\n');fs.writeFileSync(path.join(__dirname,'word-links-audit.json'),JSON.stringify(report)+'\n');console.log(JSON.stringify({counts:report.counts,sourceChecks:report.sourceChecks,unique:report.unique,multiple:report.multiple,linked:report.linked,open:report.open},null,2));}
module.exports={build};
