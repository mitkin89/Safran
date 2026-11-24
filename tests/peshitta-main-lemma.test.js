'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const M=require('../tools/peshitta/main-lemma-evidence.cjs'),A=require('../tools/peshitta/automatic-context.cjs'),C=require('../concordance'),{norm}=require('../syriac-cards');
const summary=require('../tools/peshitta/main-lemma-20000-summary.json'),review=require('../peshitta-main-lemma-review.json');
const raw=zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'../tools/peshitta/main-lemma-20000.jsonl.gz')));
const rows=raw.toString().trim().split('\n').map(JSON.parse);let corpus;const source=()=>corpus||=M.load();
function fixture(){
 const main={form:'ܒܝܬܐ',lexeme:'BJT',pos:'subs'},form='ܒܝܬܗ',strong='H:1004';
 const formRefs=['A','A','B'].map((book,i)=>({book,id:String(i+10),main,form,chapter:1,verse:i+1}));
 const translated=['A','B','C','D'].flatMap((book,i)=>Array.from({length:3},(_,j)=>({book,id:String(100+i*3+j),main,form:'ܒܝܬܐ',chapter:1,verse:j+1})));
 const s={forms:new Map([[norm(form),formRefs]]),pairs:new Map([[JSON.stringify([strong,A.signature(main)]),translated]]),anchors:new Map([[JSON.stringify([norm(form),strong]),[...formRefs]]]),cache:new Map(),
  tags:new Map([['Target',new Map([['2',{strong,ref:'1:1',form:'בֵּית',reviewBy:'fixture'}]])]]),docs:new Map([['Target',{syriacMorphology:{textHash:'fixture',words:{'2':[form,[],1,1]}}}]])};
 return {s,row:{book:'Target',id:'2',form,chapter:1,verse:1,etcbc:[{parts:[main,{form:'ܗ',lexeme:'H',pos:'pron'}]}]},main,strong};
}
test('main-lemma evidence can leave suffixes unresolved while retaining independent source thresholds',()=>{
 const {s,row}=fixture();assert.equal(M.assess(s,row).accepted,true);
 s.pairs.values().next().value.forEach(r=>r.book='A');s.cache.clear();assert.equal(M.assess(s,row).accepted,false,'twelve hits in one book are insufficient');
 const f=fixture();f.s.forms.get(norm(f.row.form)).push({book:'C',main:null});assert.equal(M.assess(f.s,f.row).accepted,false,'do not discard unknown compound heads');
 const g=fixture();g.s.tags.get('Target').clear();assert.equal(M.assess(g.s,g.row).reason,'no-current-one-to-one-hebrew-alignment');
});
test('semantic evidence disambiguates spelling but known conflicting source anchors block publication',()=>{
 const {s,row,strong}=fixture(),other={form:row.form,lexeme:'BWT',pos:'verb'};
 s.forms.get(norm(row.form)).push(...['C','C','D'].map(book=>({book,main:other,form:row.form})));
 assert.equal(M.assess(s,row).accepted,true,'the alternative head lacks the required Hebrew/Syriac pair witnesses');
 s.anchors.get(JSON.stringify([norm(row.form),strong])).push({book:'E',main:other});
 assert.equal(M.assess(s,row).reason,'known-source-anchor-conflict');
});
test('20000 new assignments reproduce with fresh alignment bindings and preserve known control discrepancies',()=>{
 assert.equal(rows.length,20000);assert.equal(new Set(rows.map(r=>r.id)).size,20000);
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),summary.auditSha256);
 const excluded=new Set();
 for(const f of summary.excludedFiles){const bytes=fs.readFileSync(path.join(__dirname,'..',f.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256);const d=JSON.parse(bytes);if(d.decisions)for(const r of d.decisions)excluded.add(r.id);else for(const b of d.books||[d])for(const r of b.entries)excluded.add(r.id);}
 const s=source();assert.deepEqual(s.sourceFiles,summary.sourceFiles);assert.deepEqual(s.provenance,summary.alignmentAndHebrewFiles);
 for(const r of rows){assert(!excluded.has(r.id),r.id);const {context,...decision}=r;assert(context);assert.deepEqual(M.assess(s,{...r,etcbc:r.etcbcCandidates}),decision,r.id);assert(r.accepted);assert.equal(new Set(r.evidence.formSources.map(s=>s.book)).size,2);assert.equal(new Set(r.evidence.translationSources.map(s=>s.book)).size,4);}
 assert.deepEqual(M.exportReview(rows),review);assert.deepEqual(M.benchmark(s),summary.benchmark);
 assert(summary.benchmark.disagreements.length>0,'do not hide nonzero source-annotation disagreement');
 const bad=new Set(summary.benchmark.disagreements.map(r=>JSON.stringify([norm(r.form),r.strong])));
 assert(rows.every(r=>!bad.has(JSON.stringify([norm(r.form),r.tag.strong]))),'known problematic anchor families are withheld');
});
test('all 20000 new main lemmas are visible at exact native word positions and reduce the open count by 20000',async()=>{
 const s=source(),expected=new Map(),versePositions=new Map();
 for(const r of rows){const vk=JSON.stringify([r.book,r.chapter,r.verse]);if(!versePositions.has(vk)){const ch=s.docs.get(r.book).text[r.chapter-1],html=Array.isArray(ch)?ch[r.verse-1]:ch[String(r.verse)];const spans=C.syriacWordSpans(html,C.tokens(C.textOf(html)));assert(spans,r.id);versePositions.set(vk,new Map(spans.map((w,i)=>[w.id,i+1])));}const p=versePositions.get(vk).get(r.id);assert(p,r.id);expected.set(JSON.stringify([r.book,r.chapter,r.verse,p]),r);}
 const seen=new Set(),entries=require('../bundled/manifest.json').items.filter(e=>e.versionTitle.startsWith('ETCBC Peshitta'));
 const result=await C.search({dir:path.join(__dirname,'../bundled'),entries,params:{query:'ܡܪܝܐ',lemma:true,limit:1},onAnalysis:hit=>{const key=JSON.stringify([hit.title,Number(hit.path[0])+1,typeof hit.path[1]==='number'?hit.path[1]+1:Number(hit.path[1]),hit.position]),r=expected.get(key);if(!r)return;assert(!seen.has(r.id));seen.add(r.id);assert.equal(hit.form,r.form,r.id);assert(hit.lemmas.includes(r.contextLemma),r.id);assert.equal(hit.analysisSource,review.source,r.id);const refs=[...new Set([...r.evidence.formSources,...r.evidence.translationSources].map(s=>`${s.book} ${s.chapter}:${s.verse}`))];assert.equal(hit.analysisReference,[r.tag.strong,...refs].join(' · '),r.id);}});
 assert.equal(seen.size,20000);const extended=require('../tools/peshitta/remaining-summary.json'),grouped=require('../tools/peshitta/group-anchor-summary.json');assert.equal(result.lemmaCoverage.withLemma,230426+extended.newAssignments+grouped.newAssignments);assert.equal(result.lemmaCoverage.words-result.lemmaCoverage.withLemma,78301-extended.newAssignments-grouped.newAssignments);
});
