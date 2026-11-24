'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const G=require('../tools/peshitta/group-anchor-evidence.cjs'),B=require('../tools/peshitta/group-anchor-batch.cjs'),R=require('../tools/peshitta/remaining-evidence.cjs'),A=require('../tools/peshitta/automatic-context.cjs'),C=require('../concordance'),{norm}=require('../syriac-cards');
const summary=require('../tools/peshitta/group-anchor-summary.json'),review=require('../peshitta-group-anchor-review.json');
const root=path.resolve(__dirname,'..');
function grammatical(){return {forms:new Map([[norm('ܡܢ'),['A','B','C','D'].flatMap((book,j)=>Array.from({length:3},(_,i)=>({book,id:String(j*3+i),form:'ܡܢ',main:{form:'ܡܢ',lexeme:'MN',pos:'prep'},chapter:1,verse:i+1})))]]),companionCache:new Map()};}
const heb=(form,lemma,morph)=>({form,lemma,morph});
test('group anchors recover attached Hebrew function words without discarding competing lexical heads',()=>{
 const s=grammatical(),words=[heb('אֶל','413','HR'),heb('הַבַּיִת','d/1004','HTd/Ncmsa')],row={review:{by:'fixture'},ids:['1'],sy:['ܠܒܝܬܐ'],links:[[1,2]]};
 const a=G.anchor(s,'Target','1:1',row,words,0);assert.equal(a.reason,'unique-group-anchor');assert.equal(a.strong,'H:1004');assert.deepEqual(a.indices,[1,2]);assert.equal(a.hebrew.length,1);
 assert.equal(G.anchor(s,'Target','1:1',{...row,links:[[]]},words,0).reason,'no-existing-alignment-link');
 assert.equal(G.anchor(s,'Target','1:1',row,[heb('מלך','4428','HNcmsa'),words[1]],0).reason,'multiple-hebrew-lexical-heads');
 assert.equal(G.anchor(s,'Target','1:1',{...row,review:null},words,0).reason,'unreviewed-group');
 assert.equal(G.anchor(s,'Target','1:1',row,[words[0],heb('?', '1004','HZ')],0).reason,'unsupported-hebrew-main-pos');
});
test('shared Hebrew anchors require unanimous original grammatical companions outside the target book',()=>{
 const s=grammatical(),words=[heb('מֵרָע','m/7451 a','HR/Aamsa')],row={review:{by:'fixture'},ids:['1','2'],sy:['ܡܢ','ܒܝܫܬܐ'],links:[[1],[1]]};
 const a=G.anchor(s,'Target','1:1',row,words,1);assert.equal(a.reason,'unique-group-anchor');assert.equal(a.companions.length,1);assert.equal(a.companions[0].books,4);
 assert.equal(G.anchor(s,'A','1:1',row,words,1).reason,'unresolved-or-lexical-syriac-companion','cannot use target book for peer support');
 s.forms.get(norm('ܡܢ')).push({book:'E',main:{lexeme:'MN',pos:'subs'}});s.companionCache.clear();assert.equal(G.anchor(s,'Target','1:1',row,words,1).reason,'unresolved-or-lexical-syriac-companion');
 const full={review:{by:'fixture'},ids:['1','2','3'],sy:['ܒܝܫܬܐ','ܡܢ','ܡܢ'],links:[[1],[1,2],[2,3]]};
 assert.equal(G.anchor(grammatical(),'Target','1:1',full,[words[0],heb('אל','413','HR'),heb('בית','1004','HNcmsa')],0).reason,'multiple-hebrew-lexical-heads','traverse the entire alignment component');
});
let state;
function load(){
 if(state)return state;const loaded=B.load(),raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'tools/peshitta/group-anchor-audit.jsonl.gz')));assert.equal(R.digest(raw),summary.auditSha256);
 return state={...loaded,rows:raw.toString().trim().split('\n').map(JSON.parse)};
}
test('all 32840 formerly unanchored positions replay with protected decisions and source-conflict exclusions preserved',()=>{
 const {source,groups,benchmark,rows}=load();assert.equal(rows.length,32840);assert.equal(new Set(rows.map(r=>r.id)).size,32840);assert.deepEqual(benchmark,summary.benchmark);assert.equal(benchmark.disagreements.length,10);assert.equal(benchmark.agreed,6404);assert.equal(source.controlExclusions.size,summary.controlExcludedFamilies);
 assert.deepEqual(source.sourceFiles,summary.sourceFiles);assert.deepEqual(source.provenance,summary.alignmentAndHebrewFiles);
 for(const p of summary.priorFiles)assert.equal(R.digest(fs.readFileSync(path.join(root,p.file))),p.sha256,p.file);
 const current=R.currentReviews(),already=new Set(require('../peshitta-remaining-lemma-review.json').books.flatMap(b=>b.entries.map(r=>r.id)));
 const originalBytes=zlib.gunzipSync(fs.readFileSync(path.join(root,'tools/peshitta/remaining-gaps.jsonl.gz')));assert.equal(R.digest(originalBytes),summary.inputSha256);const original=new Map(originalBytes.toString().trim().split('\n').map(JSON.parse).filter(r=>r.reason==='no-current-one-to-one-hebrew-alignment').map(r=>[r.id,r]));
 const findings={},anchors={};for(const r of rows){
  assert(original.has(r.id));assert(!already.has(r.id)&&!current.assigned.has(r.id)&&!current.protectedIds.has(r.id));
  const {context,...decision}=r;assert.equal(context,original.get(r.id).context);assert.deepEqual(G.assess(source,r,groups.get(r.book).get(r.id)),decision,r.id);
  findings[r.reason]=(findings[r.reason]||0)+1;const k=r.anchor?.reason||'no-valid-current-alignment';anchors[k]=(anchors[k]||0)+1;
  if(r.accepted){assert(!source.controlExclusions.has(JSON.stringify([norm(r.form),r.anchor.strong])));assert.equal(r.evidence.formSources.length,2);assert.equal(r.evidence.translationSources.length,4);assert(r.evidence.formCount>=3&&r.evidence.translationCount>=12);assert([...r.evidence.formSources,...r.evidence.translationSources].every(s=>s.book!==r.book));}
 }
 assert.deepEqual(findings,summary.findings);assert.deepEqual(anchors,summary.anchorFindings);assert.deepEqual(G.exportReview(rows),review);assert.equal(rows.filter(r=>r.accepted).length,3084);
});
test('runtime publishes each of the 3084 group main lemmas at exact native positions and leaves other audited positions pending',async()=>{
 const {source,rows}=load(),expected=new Map(),positions=new Map();
 for(const r of rows){const vk=JSON.stringify([r.book,r.chapter,r.verse]);if(!positions.has(vk)){const ch=source.docs.get(r.book).text[r.chapter-1],html=Array.isArray(ch)?ch[r.verse-1]:ch[String(r.verse)],spans=C.syriacWordSpans(html,C.tokens(C.textOf(html)));assert(spans,r.id);positions.set(vk,new Map(spans.map((w,i)=>[w.id,i+1])));}const p=positions.get(vk).get(r.id);assert(p,r.id);expected.set(JSON.stringify([r.book,r.chapter,r.verse,p]),r);}
 const seen=new Set();const result=await C.search({dir:path.join(root,'bundled'),entries:require('../bundled/manifest.json').items.filter(e=>e.versionTitle.startsWith('ETCBC Peshitta')),params:{query:'ܡܪܝܐ',lemma:true,limit:1},onAnalysis:hit=>{
  const r=expected.get(JSON.stringify([hit.title,Number(hit.path[0])+1,typeof hit.path[1]==='number'?hit.path[1]+1:Number(hit.path[1]),hit.position]));if(!r)return;
  assert(r.accepted,'pending native position '+r.id);assert(!seen.has(r.id));seen.add(r.id);assert.equal(hit.form,r.form);assert.equal(hit.analysisSource,review.source);assert.deepEqual(hit.lemmas,[r.contextLemma]);
  const refs=[...new Set([...r.evidence.formSources,...r.evidence.translationSources].map(s=>`${s.book} ${s.chapter}:${s.verse}`))];assert.equal(hit.analysisReference,[r.anchor.strong,...refs].join(' · '));
 }});
 assert.equal(expected.size,32840);assert.equal(seen.size,3084);assert.equal(result.lemmaCoverage.words,308727);assert.equal(result.lemmaCoverage.withLemma,237767);assert.equal(result.lemmaCoverage.words-result.lemmaCoverage.withLemma,70960);
});
