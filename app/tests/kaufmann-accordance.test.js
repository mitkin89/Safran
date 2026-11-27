'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const D=require('../mishnah-kaufmann-accordance-data'),old=require('../mishnah-kaufmann-berakhot-data'),I=require('../mishnah-kaufmann-accordance-image-data'),oldI=require('../mishnah-kaufmann-image-data'),P=require('../kaufmann-pointing'),M=require('../mishnah-morph'),B=require('../tools/mishnah/build_kaufmann_accordance.cjs'),textTools=require('../tools/mishnah-morph/build.cjs');
const root=path.resolve(__dirname,'..'),sha=(b,a='sha256')=>crypto.createHash(a).update(b).digest('hex'),ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'mishnah-textcrit-data.js'),'utf8'),ctx);const original=JSON.parse(JSON.stringify(ctx.window.MISHNAH_TEXTCRIT));
test('all 57 units preserve every source character and original annotation while adding only recorded Accordance points',()=>{
 assert.equal(D.source.pointingDonor,'Accordance');assert.equal(D.source.provisional,true);assert.equal(Object.keys(D.units).length,57);assert.equal(D.sourceSummary.chapters,9);assert.equal(D.sourceSummary.transferredWords,1844);assert.equal(D.sourceSummary.openWords,326);
 for(const[ref,u]of Object.entries(D.units)){const o=original.witnesses.K.units[ref];assert.equal(B.undo(u.offsetText,u.pointingInsertions),o.offsetText);assert.equal(u.raw,o.raw);assert.equal(u.id,o.id);assert.equal(u.words.length,o.words.length);u.words.forEach((w,i)=>{assert.equal(P.stripPointing(w.text),o.words[i].text);assert.equal(w.originalWord,o.words[i].text);assert.equal(u.offsetText.slice(w.start,w.end),w.text);assert.equal(w.originalStart,o.words[i].start);assert.equal(w.originalEnd,o.words[i].end);assert.equal(w.key,o.words[i].key);assert.deepEqual(w.flags,o.words[i].flags);});assert.deepEqual(u.annotations.map(({originalStart,originalEnd,...a})=>({...a,start:originalStart,end:originalEnd})),o.annotations);}
});
test('open words retain no hidden Beeri pointing and every transferred word has one bound reference position',()=>{
 let formerlyPointed=0;const sourcePositions=new Set();
 for(const t of D.transfers){const w=D.units[t.targetRef].words[t.targetWordIndex];assert.equal(t.id,w.transferId);if(t.status==='open'){assert.equal(w.text,t.originalWord);assert.ok(t.reasons.length);if(old.units[t.targetRef].words[t.targetWordIndex].text!==t.originalWord)formerlyPointed++;}else{assert.equal(t.reasons.length,0);assert.deepEqual(w.flags,[]);assert.equal(t.source.sha256,D.source.referenceSha256);assert.equal(t.source.ref,t.targetRef);assert.ok(Number.isInteger(t.source.tokenIndex));const key=t.source.ref+'/'+t.source.tokenIndex;assert(!sourcePositions.has(key));sourcePositions.add(key);assert.equal(P.transferWord(t.originalWord,t.pointedWord).text,t.pointedWord);}}
 assert.ok(formerlyPointed>0);assert.equal(sourcePositions.size,1844);
});
test('all lexical cards keep positional analyses with separate pointing, analysis and editorial meaning provenance',()=>{
 assert.equal(D.forms.length,2171);
 for(const[ref,u]of Object.entries(D.units)){const[c,m]=ref.split(':').map(Number),tokens=M.tokens(u.offsetText),ids=D.sources[D.title].chapters[c-1][m-1],oldIds=old.sources[D.title].chapters[c-1][m-1];assert.equal(tokens.length,ids.length);ids.forEach((id,i)=>{const f=D.forms[id],o=old.forms[oldIds[i]];assert.equal(f.word,tokens[i].word);assert.equal(f.key,tokens[i].key);assert.deepEqual(f.analyses.map(a=>[a.lemma,a.morph]),o.analyses.map(a=>[a.lemma,a.morph]));assert.equal(f.provenance.pointing.source,'Vom Nutzer kopierter Accordance-Text');assert.equal(f.provenance.analysis.sourceWord,o.word);assert.equal(f.provenance.analysis.reviewed,false);assert.equal(f.provenance.translation.reviewed,false);if(f.analyses.length&&f.provenance.analysis.pointingMatch!==true)assert.equal(f.status,'partial');assert.notEqual(f.status,'reviewed');});}
 assert.equal(D.coverage.statuses.unresolved,550);assert.equal(D.coverage.statuses.partial,153);
});
test('manuscript links and image observations retain their original identities, with a separate new hash binding',()=>{
 assert.deepEqual(D.interlinear,old.interlinear);assert.deepEqual(I.words,oldI.words);assert.deepEqual(I.images,oldI.images);assert.deepEqual(I.pages,oldI.pages);assert.equal(I.targetTextHash,D.source.textHash);assert.notEqual(I.targetTextHash,oldI.targetTextHash);assert.equal(I.reboundFrom.targetTextHash,oldI.targetTextHash);
});
test('the separate bundled working edition and manifest bind the displayed words without changing the older editions',()=>{
 const bytes=fs.readFileSync(path.join(root,'bundled',D.source.rel)),doc=JSON.parse(bytes),manifest=JSON.parse(fs.readFileSync(path.join(root,'bundled/manifest.json')));assert.equal(textTools.hash(doc.text),D.source.textHash);assert.equal(manifest.items.find(e=>e.rel===D.source.rel).hash,sha(bytes,'sha1'));assert.ok(manifest.items.some(e=>e.rel===old.source.rel));assert.equal(doc.isPrimary,false);assert.equal(doc.license,'Unknown');
 doc.text.forEach((ch,c)=>ch.forEach((html,m)=>assert.deepEqual(M.tokens(textTools.main(html)).map(t=>t.word),D.sources[D.title].chapters[c][m].map(id=>D.forms[id].word))));
 const before=require('../tools/mishnah-morph/kaufmann-berakhot-accordance-pointing.json');assert.equal(sha(fs.readFileSync(path.join(root,'mishnah-kaufmann-berakhot-data.js'))),before.target.datasetSha256);
});
test('a point-free reference never causes a Beeri fallback, even for previously analysed words',()=>{
 const raw=Object.entries(original.witnesses.K.units).map(([ref,u])=>'Ber. '+ref+' '+u.offsetText.replace(/\s+/g,' ').trim()).join('\n');const r=B.build(raw,original,old,oldI);
 assert.equal(r.data.sourceSummary.transferredWords,0);assert.equal(r.data.sourceSummary.openWords,2170);for(const[ref,u]of Object.entries(r.data.units))assert.equal(u.offsetText,original.witnesses.K.units[ref].offsetText);
});
test('the remaining image-vowel conflict is visible without overruling the provisional Accordance source',()=>{
 const w=D.units['3:1'].words[14];assert.equal(w.text,'אֵת');assert.equal(w.pointingCautions.length,1);assert.match(w.pointingCautions[0].note,/Offener Bildkonflikt/);
 const ids=D.sources[D.title].chapters[2][0],f=D.forms[ids[14]];assert.ok(f.provenance.pointing.cautions.some(n=>n.includes('Offener Bildkonflikt')));
 const evidence={reviews:[{observedFeatures:[{letterIndex:0,marks:['ֶ'],certainty:'clear'}]}]};assert.equal(B.imageCautions('אֶתּ',evidence).length,0);assert.equal(B.imageCautions('אֵת',evidence).length,1);
});
