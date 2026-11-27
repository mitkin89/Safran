'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),P=require('../kaufmann-pointing'),M=require('../mishnah-morph'),B=require('../tools/mishnah/build_kaufmann_accordance.cjs'),textTools=require('../tools/mishnah-morph/build.cjs'),C=require('../tools/mishnah-morph/compare-kaufmann-pointing.cjs'),T=require('../tools/mishnah/transfer_interlinear_analyses.cjs');
function load(file,select){const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);return select(ctx.window);}
const catalog=load('mishnah-accordance-catalog.js',w=>w.MISHNAH_ACCORDANCE_CATALOG),sourceCatalog=load('mishnah-textcrit-catalog.js',w=>w.MISHNAH_TEXTCRIT_CATALOG),donors={1:require('../mishnah-zeraim-data'),2:require('../mishnah-moed-data')};
test('all 22 new working editions preserve all 1279 source units and 49104 diplomatic words',()=>{
 let units=0,words=0;
 assert.equal(Object.keys(catalog).length,22);
 for(const[title,item]of Object.entries(catalog)){
  const d=require(path.join(root,item.file)),original=JSON.parse(JSON.stringify(load(sourceCatalog[title].file,w=>w.MISHNAH_TEXTCRIT_BOOKS[title])));
  assert.equal(d.title,title);assert.equal(d.source.provisional,true);assert.equal(d.source.pointingDonor,'Accordance');
  assert.deepEqual(Object.keys(d.units),Object.keys(original.witnesses.K.units));
  for(const[ref,u]of Object.entries(d.units)){
   const o=original.witnesses.K.units[ref];units++;words+=u.words.length;
   assert.equal(B.undo(u.offsetText,u.pointingInsertions),o.offsetText);assert.equal(u.raw,o.raw);assert.equal(u.id,o.id);assert.equal(u.words.length,o.words.length);
   for(let i=0;i<u.words.length;i++){const w=u.words[i],a=o.words[i];assert.equal(w.originalWord,a.text);assert.equal(P.stripPointing(w.text),a.text);assert.deepEqual(w.flags,a.flags);assert.equal(w.key,a.key);assert.equal(w.originalStart,a.start);assert.equal(w.originalEnd,a.end);assert.equal(u.offsetText.slice(w.start,w.end),w.text);if(w.pointingStatus==='open')assert.equal(w.text,a.text);}
   assert.deepEqual(u.annotations.map(({originalStart,originalEnd,...a})=>({...a,start:originalStart,end:originalEnd})),o.annotations);
  }
  for(const s of ['P','C']){assert.equal(d.witnessSha256[s],original.witnesses[s].sha256);for(const ch of Object.keys(original.interlinear.chapters))assert.deepEqual(d.interlinear.chapters[ch][s],original.interlinear.chapters[ch][s]);}
  assert.equal(d.witnessSha256.D,original.witnesses.K.sha256);
 }
 assert.equal(units,1279);assert.equal(words,49104);
});
test('new word cards bind exact words and inherit analyses only through guarded interlinear positions',()=>{
 for(const[title,item]of Object.entries(catalog)){
  const d=require(path.join(root,item.file)),donor=donors[sourceCatalog[title].coordinate[0]];assert.equal(d.interlinearAnalysisTransfer.spellingReview,null,'Berakhot decisions cannot leak into another tractate');
  for(const[ref,u]of Object.entries(d.units)){
   const[c,m]=ref.split(':').map(Number),tokens=M.tokens(u.offsetText),ids=d.sources[title].chapters[c-1][m-1];assert.equal(tokens.length,ids.length);
   ids.forEach((id,i)=>{const f=d.forms[id];assert.equal(f.word,tokens[i].word);assert.equal(f.key,tokens[i].key);assert.equal(f.provenance.pointing.source,'Vom Nutzer kopierter Accordance-Text');assert.equal(f.provenance.analysis.reviewed,false);
    if(f.analyses.length){const p=f.provenance.analysis,[sc,sm]=p.sourceRef.split(':').map(Number),source=donor.forms[donor.sources[title].chapters[sc-1][sm-1][p.sourceTokenIndex]];assert.equal(p.sourceTextHash,donor.sources[title].textHash);assert.equal(p.sourceWord,source.word);assert.deepEqual(f.analyses.map(a=>[a.lemma,a.morph]),source.analyses.map(a=>[a.lemma,a.morph]));assert.ok(['same-consonants','aligned-abbreviation'].includes(p.compatibility));}
   });
  }
 }
 assert.equal(T.compatible('בירך','בֵרַךְ','6:5/0','Mishnah Peah'),null);
});
test('bundled texts, catalogs and manifest all bind the exact working text without manuscript-certification claims',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'bundled/manifest.json'))),sha=(b,a='sha256')=>crypto.createHash(a).update(b).digest('hex');
 for(const[title,item]of Object.entries(catalog)){
  const d=require(path.join(root,item.file)),bytes=fs.readFileSync(path.join(root,'bundled',item.rel)),doc=JSON.parse(bytes),entry=manifest.items.find(e=>e.rel===item.rel);
  assert.equal(sha(JSON.stringify(doc.text)),item.textHash);assert.equal(d.source.textHash,item.textHash);assert.equal(entry.hash,sha(bytes,'sha1'));doc.text.forEach((ch,c)=>ch.forEach((html,m)=>assert.deepEqual(M.tokens(textTools.main(html)).map(t=>t.word),d.sources[title].chapters[c][m].map(id=>d.forms[id].word))));assert.equal(doc.title,title);assert.equal(doc.license,'Unknown');assert.equal(doc.isPrimary,false);assert.match(d.provenance.manuscript,/No complete manuscript-pointing review/);
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
 assert.equal(words,49104);assert.ok(featureWords>0);
});

test('Pesachim plain view keeps nine commentary words labelled and supplied 10:7 division explicit',()=>{
 const item=catalog['Mishnah Pesachim'],d=require(path.join(root,item.file)),doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',item.rel)));
 assert.match(doc.text[7][5],/mci-note kpt-source-note/);assert.equal((doc.text[7][5].match(/data-vocalized-word=/g)||[]).length,9);assert.match(doc.text[7][5],/Randkommentar/);
 for(const ref of ['10:8','10:9']){const[c,m]=ref.split(':').map(Number);for(const id of d.sources[d.title].chapters[c-1][m-1]){const p=d.forms[id].provenance.pointing;assert.equal(p.originalRef,'10:7');assert.match(p.divisionNote,/Abweichende Einteilung, kein fehlender Text/);}}
});
