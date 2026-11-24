'use strict';
// Audit the actual remaining concordance gaps, using current source and alignment bindings.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const M=require('./main-lemma-evidence.cjs'),A=require('./automatic-context.cjs'),{norm}=require('../../syriac-cards');
const root=path.resolve(__dirname,'../..');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function currentReviews(){
 // Freeze the baseline preceding this batch; do not treat this batch's output as prior evidence.
 const assigned=new Set(),protectedIds=new Set(),protectedReasons=new Map(),files=[];
 const protect=(id,file,row)=>{id=String(id);protectedIds.add(id);if(!protectedReasons.has(id))protectedReasons.set(id,[]);protectedReasons.get(id).push({file,note:row.note||row.contextReview?.note||null,status:row.status||null,excludedFromLemma:row.excludedFromLemma||null});};
 for(const file of ['peshitta-ruth-lemma-review.json','peshitta-isaiah-lemma-review.json','peshitta-lemma-assignments.json','peshitta-nt-context-review.json','peshitta-lexical-context-review.json','peshitta-corpus-dictionary-review.json','peshitta-automatic-context-review.json','peshitta-neighbor-review.json','peshitta-main-lemma-review.json']){
  const raw=fs.readFileSync(path.join(root,file)),data=JSON.parse(raw);files.push({file,sha256:digest(raw)});
  for(const b of data.books||[data])for(const r of b.entries){if(r.parts?.length||r.sedra?.lemma||r.contextLemma)assigned.add(String(r.id));else protect(r.id,file,r);}
 }
 for(const file of ['tools/peshitta/lexical-context-decisions.json','tools/peshitta/lexical-context-batch-1000.json']){
  const raw=fs.readFileSync(path.join(root,file));files.push({file,sha256:digest(raw)});
  for(const r of JSON.parse(raw).decisions)if(!r.contextReview?.accepted&&!r.accepted)protect(r.id,file,r);
 }
 return {assigned,protectedIds,protectedReasons,files};
}
function feature(dir,name,edge=false){
 const raw=fs.readFileSync(path.join(dir,name+'.tf')),lines=raw.toString().split(/\r?\n/),values=new Map();let node=0;
 const expand=s=>s.split(',').flatMap(p=>{const [a,b=a]=p.split('-').map(Number);return Array.from({length:b-a+1},(_,i)=>a+i);});
 for(const line of lines.slice(lines.indexOf('')+1)){if(!line)continue;const t=line.indexOf('\t'),ids=t<0?[node+1]:expand(line.slice(0,t));const v=t<0?line:line.slice(t+1);for(node of ids)values.set(node,edge?expand(v):v.replace(/\\n/g,'\n').replace(/\\t/g,'\t').replace(/\\\\/g,'\\'));}
 return {raw,values};
}
function additionalCorpus(source,dir,pinned){
 const names=['otype','oslots','book','chapter','verse','g_cons_utf8','lex','sp','trailer'],D={},files=[];
 for(const name of names){const {raw,values}=feature(dir,name,name==='oslots');const pin=pinned.files.find(f=>f.path.endsWith('/'+name+'.tf'));assert(pin,name);assert.equal(crypto.createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),pin.blob,name);D[name]=values;files.push({name,blob:pin.blob,sha256:digest(raw)});}
 const bookAt=new Map(),chapterAt=new Map();
 for(const [id,type]of D.otype)if(type==='book'||type==='chapter'){const table=type==='book'?bookAt:chapterAt;for(const w of D.oslots.get(id))table.set(w,D[type].get(id));}
 const used=new Set();for(const d of source.docs.values())for(const w of Object.values(d.syriacMorphology.words))for(const id of w[4]||[])used.add(id);
 const aliases={'1_Kings':'I Kings','2_Kings':'II Kings'},skipVersions=new Set(['EpBarB','OrManB']);
 const extras=[],counts={};
 for(const [id,type]of D.otype){if(type!=='verse')continue;const ids=D.oslots.get(id),groups=[];let group=[];
  for(const n of ids){if(!D.g_cons_utf8.get(n))continue;if(group.length&&n!==group[group.length-1]+1){groups.push(group);group=[];}group.push(n);if(D.trailer.get(n)){groups.push(group);group=[];}}
  if(group.length)groups.push(group);
  for(const g of groups){if(g.some(n=>used.has(n)))continue;const rawBook=bookAt.get(g[0]);if(skipVersions.has(rawBook))continue;
   const originalBook=aliases[rawBook]||rawBook,book=source.docs.has(originalBook)?originalBook:'ETCBC Syriac / '+rawBook;
   const parts=g.map(n=>({form:D.g_cons_utf8.get(n),lexeme:D.lex.get(n)||'',pos:D.sp.get(n)||''}));
   const ref={book,id:'TF:'+g[0],sourceIds:g,chapter:Number(chapterAt.get(g[0])),verse:Number(D.verse.get(id)),form:parts.map(p=>p.form).join(''),main:A.mainPart(parts),parts,sourceCorpus:'ETCBC/syriac '+pinned.commit};
   const key=norm(ref.form);if(!source.forms.has(key))source.forms.set(key,[]);source.forms.get(key).push(ref);extras.push(ref);counts[book]=(counts[book]||0)+1;
  }
 }
 source.cache.clear();return {extras,counts,source:{repo:pinned.repo,commit:pinned.commit,version:pinned.version,files}};
}
function assess(source,row,protectedIds,extrasByForm){
 const m=source.docs.get(row.book).syriacMorphology,w=m.words[row.id];
 assert.deepEqual([w[0],w[2],w[3]],[row.form,row.chapter,row.verse]);
 assert.equal(w[1].length,0,`existing embedded annotation ${row.id}`);
 if(protectedIds.has(row.id))return {book:row.book,id:row.id,form:row.form,chapter:row.chapter,verse:row.verse,textHash:m.textHash,accepted:false,reason:'protected-individual-review-or-exclusion'};
 const extra=extrasByForm?.get(norm(row.form))||[];
 const merged={...row,etcbc:[...(row.etcbc||[]),...extra.map(r=>({parts:r.parts}))]};
 const result=M.assess(source,merged);
 if(result.accepted)result.evidence.extendedFormSources=result.evidence.formSources.some(r=>r.sourceCorpus)||false;
 return result;
}
module.exports={currentReviews,additionalCorpus,assess,digest};
