'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),zlib=require('node:zlib'),crypto=require('node:crypto');
const M=require('../tools/peshitta/main-lemma-evidence.cjs'),R=require('../tools/peshitta/remaining-evidence.cjs'),A=require('../tools/peshitta/automatic-context.cjs'),C=require('../concordance'),{norm}=require('../syriac-cards');
const summary=require('../tools/peshitta/remaining-summary.json'),review=require('../peshitta-remaining-lemma-review.json'),pin=require('../tools/peshitta/extended-source.json');
const root=path.resolve(__dirname,'..');
function snapshot(file,hash){const bytes=zlib.gunzipSync(fs.readFileSync(path.join(root,'tools/peshitta',file)));assert.equal(R.digest(bytes),hash);return bytes.toString().trim().split('\n').map(JSON.parse);}
let state;
function load(){
 if(state)return state;
 const source=M.load(),current=R.currentReviews(),extras=snapshot('extended-corpus-forms.jsonl.gz',summary.extraSnapshotSha256),rows=snapshot('remaining-gaps.jsonl.gz',summary.auditSha256);
 const used=new Set();for(const d of source.docs.values())for(const w of Object.values(d.syriacMorphology.words))for(const id of w[4]||[])used.add(id);
 const fresh=new Set(),counts={};
 for(const r of extras){
  assert.equal(r.sourceCorpus,'ETCBC/syriac '+pin.commit);assert.equal(r.id,'TF:'+r.sourceIds[0]);assert(Number.isFinite(r.chapter)&&Number.isFinite(r.verse));
  assert(!r.book.endsWith('/ EpBarB')&&!r.book.endsWith('/ OrManB'));
  assert.equal(r.form,r.parts.map(p=>p.form).join(''));assert.deepEqual(r.main,A.mainPart(r.parts));
  for(const [i,id]of r.sourceIds.entries()){assert(!used.has(id)&&!fresh.has(id),String(id));if(i)assert.equal(id,r.sourceIds[i-1]+1);fresh.add(id);}
  const key=norm(r.form);if(!source.forms.has(key))source.forms.set(key,[]);source.forms.get(key).push(r);counts[r.book]=(counts[r.book]||0)+1;
 }
 source.cache.clear();assert.deepEqual(counts,summary.additionalCounts);assert.equal(extras.length,summary.additionalWitnesses);
 assert.deepEqual(source.sourceFiles,summary.sourceFiles);assert.deepEqual(source.provenance,summary.alignmentAndHebrewFiles);assert.deepEqual(current.files,summary.priorReviews);
 for(const f of summary.additionalCorpus.files)assert.equal(f.blob,pin.files.find(p=>p.path.endsWith('/'+f.name+'.tf')).blob);
 return state={source,current,rows};
}
test('additional original corpus groups morphemes, excludes used words and duplicate versions, and verifies source hashes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'safran-extended-'));
 try{
  const data={otype:'1-6\tword\n20-21\tbook\n30-31\tchapter\n40-41\tverse',oslots:'20\t1-4\n21\t5-6\n30\t1-4\n31\t5-6\n40\t1-4\n41\t5-6',book:'20\tSir\n21\tEpBarB',chapter:'30-31\t1',verse:'40-41\t1',g_cons_utf8:'1\tܒ\n2\tܗ\n3\tܒܝܬ\n4\tܗ\n5\tܒ\n6\tܗ',lex:'1\tB\n2\tH\n3\tBJT\n4\tH\n5\tB\n6\tH',sp:'1\tprep\n2\tpron\n3\tsubs\n4\tpron\n5\tprep\n6\tpron',trailer:'2\t \n4\t \n6\t '};
  const files=[];for(const [name,body]of Object.entries(data)){const bytes=Buffer.from('@node\n\n'+body+'\n');fs.writeFileSync(path.join(dir,name+'.tf'),bytes);files.push({path:'tf/0.92/'+name+'.tf',blob:crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')});}
  const source={docs:new Map([['Bound',{syriacMorphology:{words:{'x':['',[],1,1,[1]]}}}]]),forms:new Map(),cache:new Map()};
  const out=R.additionalCorpus(source,dir,{repo:'fixture',commit:'fixture',version:'fixture',files});assert.equal(out.extras.length,1);assert.deepEqual(out.extras[0].sourceIds,[3,4]);assert.equal(out.extras[0].form,'ܒܝܬܗ');assert.equal(out.extras[0].main.lexeme,'BJT');
  fs.appendFileSync(path.join(dir,'lex.tf'),'7\tOTHER\n');assert.throws(()=>R.additionalCorpus(source,dir,{files}),/lex/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('all 78301 open positions reproduce against pinned expanded original evidence, retaining every withheld outcome',()=>{
 const {source,current,rows}=load();assert.equal(rows.length,78301);assert.equal(new Set(rows.map(r=>r.id)).size,78301);
 const findings={};
 for(const r of rows){
  assert(!current.assigned.has(r.id),r.id);const {context,protection,...decision}=r;assert(context,r.id);
  const ch=source.docs.get(r.book).text[r.chapter-1],html=Array.isArray(ch)?ch[r.verse-1]:ch[String(r.verse)];assert.equal(C.textOf(html),context,r.id);
  assert.deepEqual(protection,current.protectedReasons.get(r.id),r.id);
  assert.deepEqual(R.assess(source,{...r,etcbc:r.etcbcCandidates},current.protectedIds),decision,r.id);findings[r.reason]=(findings[r.reason]||0)+1;
 }
 assert.deepEqual(findings,summary.findings);
 const ready=rows.filter(r=>r.accepted);assert.equal(ready.length,4257);const exported=M.exportReview(ready);exported.source=review.source;for(const b of exported.books)for(const r of b.entries){r.extendedMainLemmaSources=r.mainLemmaSources;delete r.mainLemmaSources;}assert.deepEqual(exported,review);
 assert.deepEqual(M.benchmark(source),summary.benchmark);assert.equal(summary.benchmark.disagreements.length,134);
 const bad=new Set(summary.benchmark.disagreements.map(r=>JSON.stringify([norm(r.form),r.strong])));assert(ready.every(r=>!bad.has(JSON.stringify([norm(r.form),r.tag.strong]))),'withhold known conflicting form/anchor families');
});
test('runtime checks every audited native position and preserves remaining and later grouped assignments',async()=>{
 const {source,rows}=load(),expected=new Map(),positions=new Map();
 for(const r of rows){const vk=JSON.stringify([r.book,r.chapter,r.verse]);if(!positions.has(vk)){const ch=source.docs.get(r.book).text[r.chapter-1],html=Array.isArray(ch)?ch[r.verse-1]:ch[String(r.verse)],spans=C.syriacWordSpans(html,C.tokens(C.textOf(html)));assert(spans,r.id);positions.set(vk,new Map(spans.map((w,i)=>[w.id,i+1])));}const p=positions.get(vk).get(r.id);assert(p,r.id);expected.set(JSON.stringify([r.book,r.chapter,r.verse,p]),r);}
 const grouped=require('../peshitta-group-anchor-review.json'),groupSummary=require('../tools/peshitta/group-anchor-summary.json'),groupRows=new Map(grouped.books.flatMap(b=>b.entries).map(r=>[r.id,r])),seenGrouped=new Set();
 const seen=new Set(),entries=require('../bundled/manifest.json').items.filter(e=>e.versionTitle.startsWith('ETCBC Peshitta'));
 const result=await C.search({dir:path.join(root,'bundled'),entries,params:{query:'ܡܪܝܐ',lemma:true,limit:1},onAnalysis:hit=>{
  const key=JSON.stringify([hit.title,Number(hit.path[0])+1,typeof hit.path[1]==='number'?hit.path[1]+1:Number(hit.path[1]),hit.position]),r=expected.get(key);if(!r)return;
  if(!r.accepted){const added=groupRows.get(r.id);assert(added,'pending position must remain unassigned: '+r.id);assert.equal(r.reason,'no-current-one-to-one-hebrew-alignment');assert.equal(hit.analysisSource,grouped.source);assert(hit.lemmas.includes(added.contextLemma));seenGrouped.add(r.id);return;}
  assert(r.accepted,'pending position must remain unassigned: '+r.id);assert(!seen.has(r.id));seen.add(r.id);assert.equal(hit.form,r.form);assert(hit.lemmas.includes(r.contextLemma),r.id);assert.equal(hit.analysisSource,review.source);
  const refs=[...new Set([...r.evidence.formSources,...r.evidence.translationSources].map(s=>`${s.book} ${s.chapter}:${s.verse}`))];assert.equal(hit.analysisReference,[r.tag.strong,...refs].join(' · '),r.id);
 }});
 assert.equal(seenGrouped.size,groupSummary.newAssignments);assert.equal(expected.size,78301);assert.equal(seen.size,4257);assert.equal(result.lemmaCoverage.withLemma,summary.after.assigned+groupSummary.newAssignments);assert.equal(result.lemmaCoverage.words,308727);assert.equal(result.lemmaCoverage.words-result.lemmaCoverage.withLemma,74044-groupSummary.newAssignments);
});
