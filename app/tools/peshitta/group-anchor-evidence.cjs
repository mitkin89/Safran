'use strict';
// Recover a lexical anchor inside an existing reviewed alignment group. Do not edit the alignment.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const M=require('./main-lemma-evidence.cjs'),A=require('./automatic-context.cjs'),AL=require('../../peshitta-alignment'),{decode}=require('../../morph'),{norm}=require('../../syriac-cards');
const root=path.resolve(__dirname,'../..');
const SOURCE='ETCBC Syriac (automatischer Wortgruppenabgleich)';
const grammatical=new Set(['conj','prep','pron']);
const hebrewFunctional=new Set(['Konjunktion','Präposition','Pronominalsuffix','Artikel','Akkusativzeichen (את)','Personalpronomen','Demonstrativpronomen','Indefinitpronomen','Interrogativpronomen','Relativpronomen','Relativpartikel (אשר)']);
const hebrewContent=new Set(['Nomen','Eigenname','Gentilizium','Adjektiv','Kardinalzahl','Ordinalzahl','Verb','Adverb','Negation']);
const content=new Set(['subs','verb','adjv','nmpr','advb','nega']);
function companion(source,book,form){
 const key=JSON.stringify([book,norm(form)]);source.companionCache||=new Map();if(source.companionCache.has(key))return source.companionCache.get(key);
 const refs=(source.forms.get(norm(form))||[]).filter(r=>r.book!==book);
 let out=null;
 if(refs.length>=12&&new Set(refs.map(r=>r.book)).size>=4&&refs.every(r=>r.main&&grammatical.has(r.main.pos))){
  const signatures=new Set(refs.map(r=>A.signature(r.main)));
  if(signatures.size===1)out={form,main:refs[0].main,count:refs.length,books:new Set(refs.map(r=>r.book)).size,sources:[...new Set(refs.map(r=>r.book))].slice(0,4).map(b=>refs.find(r=>r.book===b))};
 }
 source.companionCache.set(key,out);return out;
}
function anchor(source,book,ref,row,words,index){
 if(!row.review)return {reason:'unreviewed-group'};
 if(!row.links[index]?.length)return {reason:'no-existing-alignment-link'};
 // Full bipartite component, not just immediate neighbors of the target.
 const sy=new Set([index]),he=new Set();let changed=true;
 while(changed){changed=false;for(const i of sy)for(const j of row.links[i])if(!he.has(j)){he.add(j);changed=true;}for(const [i,links]of row.links.entries())if(links.some(j=>he.has(j))&&!sy.has(i)){sy.add(i);changed=true;}}
 if(sy.size>4||he.size>4)return {reason:'alignment-component-too-large'};
 const heads=[];
 for(const j of [...he].sort((a,b)=>a-b)){
  const word=words[j-1];if(!word)return {reason:'invalid-hebrew-word'};
  const parsed=decode(word.morph,word.lemma);if(!parsed)return {reason:'unknown-hebrew-morphology'};
  const main=parsed.segs[parsed.main];
  if(hebrewFunctional.has(main.pos))continue;
  if(!hebrewContent.has(main.pos))return {reason:'unsupported-hebrew-main-pos'};
  if(!main.lemma||!/^\d/u.test(main.lemma))return {reason:'missing-hebrew-main-lemma'};
  heads.push({index:j,form:word.form,strong:parsed.lang+':'+main.lemma});
 }
 if(!heads.length)return {reason:'no-hebrew-lexical-head'};
 if(new Set(heads.map(h=>h.strong)).size!==1)return {reason:'multiple-hebrew-lexical-heads'};
 const companions=[];
 for(const i of [...sy].sort((a,b)=>a-b))if(i!==index){
  const evidence=companion(source,book,row.sy[i]);if(!evidence)return {reason:'unresolved-or-lexical-syriac-companion'};
  companions.push({id:String(row.ids[i]),index:i,ref:row.refs?.[i]||ref,...evidence});
 }
 return {reason:'unique-group-anchor',strong:heads[0].strong,ref,reviewBy:row.review.by||'unspecified',hebrew:heads,indices:[...he].sort((a,b)=>a-b),syriac:[...sy].sort((a,b)=>a-b).map(i=>({id:String(row.ids[i]),form:row.sy[i],ref:row.refs?.[i]||ref})),companions};
}
function loadGroups(source){
 const files=new Map(),groups=new Map();
 for(const [book,doc]of source.docs){
  const f=AL.file(book);if(!files.has(f)){const w={};vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),{window:w});files.set(f,w.PESHITTA_ALIGNMENT_DATA||{version:2,books:w.PESHITTA_ALIGNMENT_BOOKS});}
  const heEntry=require('../../bundled/manifest.json').items.find(e=>e.title===book&&e.versionTitle.startsWith('Westminster'));
  const he=JSON.parse(fs.readFileSync(path.join(root,'bundled',heEntry.rel)));he.textHash=require('./remaining-evidence.cjs').digest(JSON.stringify(he.text));
  const data=AL.book(files.get(f),book);assert(AL.prepare(data,he,doc),book);const local=new Map();
  for(const [ref,row]of Object.entries(data.verses)){
   const [ch,v]=ref.split(':').map(Number),html=he.text[ch-1]?.[v-1];if(typeof html!=='string')continue;
   const words=[...html.matchAll(/<span class="w" data-l="([^"]*)" data-m="([^"]*)"[^>]*>(.*?)<\/span>/g)].map(m=>({lemma:m[1],morph:m[2],form:m[3]}));
   if(!AL.verse(data,ref,words.map(w=>w.form)))continue;
   // A malformed or stale member invalidates the entire group, including its companions.
   if(!row.ids||row.ids.length!==row.sy.length||row.refs&&row.refs.length!==row.sy.length)continue;
   if(row.ids.some((id,i)=>{const w=doc.syriacMorphology.words[id];return !w||w[0]!==row.sy[i]||w[2]+':'+w[3] !==(row.refs?.[i]||ref);} ))continue;
   for(const [i,id]of row.ids.entries()){
    if(source.tags.get(book).has(String(id)))continue;
    assert(!local.has(String(id)),'ambiguous duplicate native alignment ID '+id);
    local.set(String(id),anchor(source,book,ref,row,words,i));
   }
  }
  groups.set(book,local);
 }
 return groups;
}
function judge(source,target,group,holdout=false){
 if(!group||group.reason!=='unique-group-anchor')return {accepted:false,reason:group?.reason||'no-valid-current-alignment'};
 if(!holdout&&source.controlExclusions?.has(JSON.stringify([norm(target.form),group.strong])))return {accepted:false,reason:'held-out-control-conflict'};
 const cs=M.candidates(source,target.form,group.strong,target.book).filter(c=>content.has(c.main.pos));
 if(cs.length!==1)return {accepted:false,reason:cs.length?'competing-main-lemmas':'insufficient-form-and-translation-support'};
 const match=cs[0],known=new Set((source.anchors.get(JSON.stringify([norm(target.form),group.strong]))||[]).filter(r=>!holdout||r.book!==target.book).map(r=>A.signature(r.main)));
 if(known.size>1||known.size===1&&!known.has(A.signature(match.main)))return {accepted:false,reason:'known-source-anchor-conflict'};
 // Group inference must also respect every existing qualified non-content candidate.
 if(M.candidates(source,target.form,group.strong,target.book).length!==1)return {accepted:false,reason:'competing-main-lemmas'};
 return {accepted:true,reason:'supported-group-main-lemma',evidence:match};
}
function assess(source,row,group){
 const m=source.docs.get(row.book).syriacMorphology,w=m.words[row.id];assert.deepEqual([w[0],w[2],w[3]],[row.form,row.chapter,row.verse]);assert.equal(w[1].length,0);
 const decision=judge(source,row,group);
 return {book:row.book,id:row.id,form:row.form,chapter:row.chapter,verse:row.verse,textHash:m.textHash,anchor:group||null,...decision,...(decision.accepted?{contextLemma:require('../../syriac-morph').lemma(decision.evidence.main.lexeme)}:{})};
}
function benchmark(source,groups){
 const out={method:'Grouped-anchor original-annotation holdout: exclude the complete target book from form, translation-pair and companion evidence; never use inferred Safran lemmas. Known original anchor conflicts remain excluded.',tested:0,agreed:0,disagreements:[]};
 for(const refs of source.forms.values())for(const r of refs){
  // Only the bundled original OT annotations have edition-bound Hebrew alignment groups.
  if(!source.docs.has(r.book)||r.sourceCorpus||!r.main)continue;
  const group=groups.get(r.book).get(r.id);if(group?.reason!=='unique-group-anchor')continue;
  const finding=judge(source,r,group,true);if(!finding.accepted)continue;
  out.tested++;if(A.signature(r.main)===A.signature(finding.evidence.main))out.agreed++;else out.disagreements.push({book:r.book,id:r.id,form:r.form,strong:group.strong,expected:r.main,proposed:finding.evidence.main});
 }
 return out;
}
function exportReview(rows){
 const books=new Map(),ref=r=>({book:r.book,id:r.id,ref:`${r.chapter}:${r.verse}`});
 for(const r of rows.filter(r=>r.accepted)){
  if(!books.has(r.book))books.set(r.book,{book:r.book,textHash:r.textHash,entries:[]});
  books.get(r.book).entries.push({id:r.id,form:r.form,chapter:r.chapter,verse:r.verse,contextLemma:r.contextLemma,
   groupAnchorSources:{strong:r.anchor.strong,ref:r.anchor.ref,hebrew:r.anchor.hebrew,syriac:r.anchor.syriac,form:r.evidence.formSources.map(ref),translation:r.evidence.translationSources.map(ref)}});
 }
 return {version:1,source:SOURCE,method:'reviewed-alignment-component-one-lexical-head-original-form-and-translation-support',license:'CC BY-NC 4.0',note:'Automatic main-lemma inference inside existing reviewed word groups. Original alignments and full morphology remain unchanged. Alignment reviews include AI; no individual scholarly verification.',books:[...books.values()]};
}
module.exports={SOURCE,companion,anchor,loadGroups,judge,assess,benchmark,exportReview};
