'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),P=require('../kaufmann-pointing'),M=require('../mishnah-morph'),B=require('../tools/mishnah/build_kaufmann_accordance.cjs'),textTools=require('../tools/mishnah-morph/build.cjs'),C=require('../tools/mishnah-morph/compare-kaufmann-pointing.cjs'),T=require('../tools/mishnah/transfer_interlinear_analyses.cjs');
function load(file,select){const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);return select(ctx.window);}
const catalog=load('mishnah-accordance-catalog.js',w=>w.MISHNAH_ACCORDANCE_CATALOG),sourceCatalog=load('mishnah-textcrit-catalog.js',w=>w.MISHNAH_TEXTCRIT_CATALOG),donors={1:require('../mishnah-zeraim-data'),2:require('../mishnah-moed-data'),3:require('../mishnah-nashim-data')};
test('all 29 new working editions preserve all 1852 source units and 78262 diplomatic words',()=>{
 let units=0,words=0;
 assert.equal(Object.keys(catalog).length,29);
 for(const[title,item]of Object.entries(catalog)){
  const d=require(path.join(root,item.file)),original=JSON.parse(JSON.stringify(load(sourceCatalog[title].file,w=>w.MISHNAH_TEXTCRIT_BOOKS[title])));
  assert.equal(d.title,title);assert.equal(d.source.provisional,true);assert.equal(d.source.pointingDonor,'Accordance');
  assert.deepEqual(Object.keys(d.units),Object.keys(original.witnesses.K.units));
  for(const[ref,u]of Object.entries(d.units)){
   const o=original.witnesses.K.units[ref];units++;words+=u.words.length;
   assert.equal(B.undo(u.offsetText,u.pointingInsertions),o.offsetText);assert.equal(u.raw,o.raw);assert.equal(u.id,o.id);assert.equal(u.words.length,o.words.length);
   for(let i=0;i<u.words.length;i++){const w=u.words[i],a=o.words[i];assert.equal(w.originalWord,a.text);assert.equal(P.stripPointing(w.text),P.stripPointing(a.text));assert.deepEqual(w.flags,a.flags);assert.equal(w.key,a.key);assert.equal(w.originalStart,a.start);assert.equal(w.originalEnd,a.end);assert.equal(u.offsetText.slice(w.start,w.end),w.text);if(w.pointingStatus==='open')assert.equal(w.text,a.text);}
   assert.deepEqual(u.annotations.map(({originalStart,originalEnd,...a})=>({...a,start:originalStart,end:originalEnd})),o.annotations);
  }
  for(const s of ['P','C']){assert.equal(d.witnessSha256[s],original.witnesses[s].sha256);for(const ch of Object.keys(original.interlinear.chapters))assert.deepEqual(d.interlinear.chapters[ch][s],original.interlinear.chapters[ch][s]);}
  assert.equal(d.witnessSha256.D,original.witnesses.K.sha256);
 }
 assert.equal(units,1852);assert.equal(words,78262);
});
test('word cards bind exact words and guard interlinear transfer or source-bound lexical completion',()=>{
 for(const[title,item]of Object.entries(catalog)){
  const d=require(path.join(root,item.file)),donor=donors[sourceCatalog[title].coordinate[0]];assert.equal(d.interlinearAnalysisTransfer.spellingReview,null,'Berakhot decisions cannot leak into another tractate');
  for(const[ref,u]of Object.entries(d.units)){
   const[c,m]=ref.split(':').map(Number),tokens=M.tokens(u.offsetText),ids=d.sources[title].chapters[c-1][m-1];assert.equal(tokens.length,ids.length);
   ids.forEach((id,i)=>{const f=d.forms[id];assert.equal(f.word,tokens[i].word);assert.equal(f.key,tokens[i].key);assert.equal(f.provenance.pointing.source,'Vom Nutzer kopierter Accordance-Text');assert.equal(f.provenance.analysis.reviewed,false);
    if(f.analyses.length&&f.morphologyBeforeCompletion){const p=f.provenance.analysis,wi=u.words.findIndex(w=>w.start<=tokens[i].start&&w.end>=tokens[i].end);assert.deepEqual(f.morphologyBeforeCompletion.analyses,[]);assert(['rabbinic-grammar-candidate','contextual-rabbinic-lexicon','interlinear-word-group'].includes(p.kind));assert.equal(p.sourceTextHash,d.source.textHash);assert.equal(p.sourceWordId,u.id+'/word/'+wi);assert.equal(p.sourceWord,u.words[wi].originalWord);assert.equal(p.sourceRef,ref);assert.equal(p.sourceTokenIndex,i);assert(f.analyses.every(a=>a.rules.includes('moed-nashim-draft-morphology')));if(f.status==='partial')assert(f.analyses.every(a=>a.partialFeatures&&a.morph==='H'));for(const e of f.dictionaryEvidence||[])assert(['d895bc1c727b','e8d290b744f6','d701423861c6'].includes(e.dictId));}else if(f.analyses.length){const p=f.provenance.analysis,[sc,sm]=p.sourceRef.split(':').map(Number),source=donor.forms[donor.sources[title].chapters[sc-1][sm-1][p.sourceTokenIndex]];assert.equal(p.sourceTextHash,donor.sources[title].textHash);assert.equal(p.sourceWord,source.word);assert.deepEqual(f.analyses.map(a=>[a.lemma,a.morph]),source.analyses.map(a=>[a.lemma,a.morph]));assert.ok(['same-consonants','aligned-abbreviation'].includes(p.compatibility));}
   });
  }
 }
 assert.equal(T.compatible('בירך','בֵרַךְ','6:5/0','Mishnah Peah'),null);
});
test('bundled texts, catalogs and manifest all bind the exact working text without manuscript-certification claims',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'bundled/manifest.json'))),sha=(b,a='sha256')=>crypto.createHash(a).update(b).digest('hex');
 for(const[title,item]of Object.entries(catalog)){
  const d=require(path.join(root,item.file)),bytes=fs.readFileSync(path.join(root,'bundled',item.rel)),doc=JSON.parse(bytes),entry=manifest.items.find(e=>e.rel===item.rel);
  assert.equal(sha(JSON.stringify(doc.text)),item.textHash);assert.equal(d.source.textHash,item.textHash);assert.equal(entry.hash,sha(bytes,'sha1'));doc.text.forEach((ch,c)=>ch.forEach((html,m)=>{const ids=d.sources[title].chapters[c][m];if(ids==null){assert.equal(html,null);assert.equal(d.units[(c+1)+':'+(m+1)],undefined);return;}assert.deepEqual(M.tokens(textTools.main(html)).map(t=>t.word),ids.map(id=>d.forms[id].word));}));assert.equal(doc.title,title);assert.equal(doc.license,'Unknown');assert.equal(doc.isPrimary,false);assert.match(d.provenance.manuscript,/No complete manuscript-pointing review/);
 }
});
test('reference parser handles CR, CRLF, display numbers and tractate-specific opening safely',()=>{
 for(const newline of ['\r','\n','\r\n']){
  const raw='אֵלּוּ דְבָרִים'+newline+'Pea 1:2\u200f (א2) אֵין פּוֹחֲתִין',p=C.parseReference(raw,{labelPattern:/Pea\s*(\d+):(\d+)/u,openingPattern:/^אלו דברים/u,displayNumbers:true});
  assert.deepEqual(p.units.map(u=>u.ref),['1:1','1:2']);assert.deepEqual(p.units[1].tokens.map(t=>t.consonants),['אין','פוחתין']);for(const t of p.units[1].tokens)assert.equal(raw.slice(t.start,t.end),t.raw);
 }
 assert.throws(()=>C.parseReference('Pea 1:1 אלו\rPea 1:1 אלו',{labelPattern:/Pea\s*(\d+):(\d+)/u}),/Duplicate/);
});
test('all image panels bind source identities and never promote locations or partial features to full-word verification',()=>{
 const UI=load('library-mishnah-morph.js',w=>w.LibraryMishnahMorph);let words=0,featureWords=0;
 for(const[title,item]of Object.entries(catalog)){
  const d=require(path.join(root,item.file)),images=require(path.join(root,item.imageFile));assert.equal(images.title,title);assert.equal(images.targetTextHash,d.source.textHash);assert.equal(images.diplomaticSha256,d.source.diplomaticSha256);
  for(const u of Object.values(d.units))u.words.forEach((w,i)=>{const id=u.id+'/word/'+i,e=images.words[id];words++;assert.equal(e.originalWord,w.originalWord);assert.ok(e.locations.length);assert.ok(UI.boundImageEvidence(d,images,id));assert.equal(UI.boundImageEvidence(d,{...images,title:'wrong'},id),null);
   if(!e.reviews.length)assert.equal(e.reviewStatus,'not-reviewed');else if(!e.reviews.some(r=>r.fullPointingVerified===true&&r.status==='clear'))assert.notEqual(e.reviewStatus,'clear');
   if(e.reviews.some(r=>r.observedFeatures?.length))featureWords++;
   for(const r of e.reviews){const image=images.images[r.folio];assert.ok(image);assert.ok(r.bbox[0]>=0&&r.bbox[1]>=0&&r.bbox[2]<=image.width&&r.bbox[3]<=image.height);}
  });
  const first=Object.keys(images.words)[0],bad={...images,words:{...images.words,[first]:{...images.words[first],originalWord:'wrong'}}};assert.equal(UI.boundImageEvidence(d,bad,first),null);
 }
 assert.equal(words,78262);assert.ok(featureWords>0);
});

test('Pesachim plain view keeps nine commentary words labelled and supplied 10:7 division explicit',()=>{
 const item=catalog['Mishnah Pesachim'],d=require(path.join(root,item.file)),doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',item.rel)));
 assert.match(doc.text[7][5],/mci-note kpt-source-note/);assert.equal((doc.text[7][5].match(/data-vocalized-word=/g)||[]).length,9);assert.match(doc.text[7][5],/Randkommentar/);
 for(const ref of ['10:8','10:9']){const[c,m]=ref.split(':').map(Number);for(const id of d.sources[d.title].chapters[c-1][m-1]){const p=d.forms[id].provenance.pointing;assert.equal(p.originalRef,'10:7');assert.match(p.divisionNote,/Abweichende Einteilung, kein fehlender Text/);}}
});

test('Nashim source divisions retain original spans, unlabelled continuations and excluded appendices',()=>{
 const audit=JSON.parse(fs.readFileSync(path.join(root,'tools/mishnah/accordance-nashim-supplied-scope-audit.json'))),get=(title,ref)=>audit.units.find(u=>u.title===title&&u.ref===ref);
 assert.equal(audit.approvedForBuild,true);assert.equal(audit.units.length,573);assert.equal(audit.units.reduce((n,u)=>n+u.spans.length,0),580);
 assert(audit.files.every(f=>!('path'in f)),'private input paths are not published');
 assert.deepEqual(get('Mishnah Sotah','9:2').spans.map(s=>s.suppliedRef),['9:2','9:4']);assert.equal(get('Mishnah Sotah','9:4'),undefined);
 const continuation=get('Mishnah Sotah','9:3');assert.equal(continuation.spans[0].fileIndex,4);assert.equal(continuation.spans[0].suppliedRef,null);
 assert.equal(get('Mishnah Gittin','9:10').spans[0].suppliedRef,'9:9');assert(!audit.units.some(u=>/Arayot/.test(u.title)));
 const intervals=new Map();for(const u of audit.units){const d=require(path.join(root,catalog[u.title].file));assert.equal(d.units[u.ref].id,u.sourceUnitId);assert.deepEqual(d.units[u.ref].referenceSpans,u.spans);for(const s of u.spans){assert(s.endUtf16>s.startUtf16);assert.match(s.sha256Utf8,/^[0-9a-f]{64}$/);const list=intervals.get(s.fileIndex)||[];list.push(s);intervals.set(s.fileIndex,list);}}
 for(const spans of intervals.values()){spans.sort((a,b)=>a.startUtf16-b.startUtf16);for(let i=1;i<spans.length;i++)assert(spans[i-1].endUtf16<=spans[i].startUtf16,'original reference spans never overlap');}
});

test('blind Naschim point counterchecks retain earlier readings as uncertain without changing text',()=>{
 const d=require('../mishnah-kaufmann-accordance-ketubot-data'),e=require('../mishnah-kaufmann-accordance-ketubot-image-data');
 for(const [id,index,oldMark,newMark]of [['S07326.3.2.11.1/word/9',0,'ְ','ִ'],['S07326.3.2.13.7/word/18',1,'ָ','ֵ']]){
  const record=e.words[id],features=record.reviews.flatMap(r=>r.observedFeatures||[]),old=features.find(f=>f.letterIndex===index&&f.marks.includes(oldMark)),counter=features.find(f=>f.letterIndex===index&&f.marks.includes(newMark));
  assert.equal(old.certainty,'uncertain');assert.equal(old.initialCertainty,'clear');assert.match(old.adjudication,/blind second image reading/);assert.equal(counter.certainty,'clear');assert.notEqual(record.reviewStatus,'clear');
  const unit=Object.values(d.units).find(u=>id.startsWith(u.id+'/word/')),word=unit.words[Number(id.split('/').at(-1))];assert.equal(word.pointingCautions.length,0,'unconfirmed earlier signs do not become clear image conflicts');
 }
 const comparison=JSON.parse(fs.readFileSync(path.join(root,'tools/mishnah/accordance-nashim-image-point-comparison.json')));assert.equal(comparison.summary['different-mark']||0,0);assert.equal(comparison.summary['uncertain-image-feature'],3);assert.equal(comparison.summary.agree,50);
});
