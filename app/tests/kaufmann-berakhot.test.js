'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),D=require('../mishnah-kaufmann-berakhot-data'),P=require('../kaufmann-pointing'),M=require('../mishnah-morph'),B=require('../tools/mishnah-morph/build.cjs'),old=require('../mishnah-morph-data');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'mishnah-textcrit-data.js'),'utf8'),ctx);vm.runInNewContext(fs.readFileSync(path.join(root,'mishnah-vocalized/berakhot.js'),'utf8'),ctx);
const O=JSON.parse(JSON.stringify(ctx.window.MISHNAH_TEXTCRIT)),V=JSON.parse(JSON.stringify(ctx.window.MISHNAH_VOCALIZED[D.title]));
const sha=(x,a='sha256')=>crypto.createHash(a).update(x).digest('hex');
function undo(text,edits){let delta=0;const mapped=edits.map(e=>{const out={offset:e.offset+delta,text:e.text};delta+=e.text.length;return out;});for(const e of mapped.reverse()){assert.equal(text.slice(e.offset,e.offset+e.text.length),e.text);text=text.slice(0,e.offset)+text.slice(e.offset+e.text.length);}return text;}
test('every source character, TEI reading, word ID and annotation survives the derived edition',()=>{
 assert.equal(Object.keys(D.units).length,57);assert.equal(D.sourceSummary.chapters,9);
 for(const[ref,u]of Object.entries(D.units)){
  const o=O.witnesses.K.units[ref];assert.equal(undo(u.offsetText,u.pointingInsertions),o.offsetText,ref);assert.equal(u.raw,o.raw,ref);assert.equal(u.id,o.id);assert.equal(u.words.length,o.words.length);
  u.words.forEach((w,i)=>{const ow=o.words[i];assert.equal(P.stripPointing(w.text),ow.text);assert.equal(u.offsetText.slice(w.start,w.end),w.text);assert.equal(w.originalStart,ow.start);assert.equal(w.originalEnd,ow.end);assert.equal(w.key,ow.key);assert.deepEqual(w.flags,ow.flags);});
  assert.deepEqual(u.annotations.map(({originalStart,originalEnd,...a})=>({...a,start:originalStart,end:originalEnd})),o.annotations);
 }
 assert.ok(D.units['7:5'].words.every(w=>w.pointingStatus==='open'));
});
test('applied pointing and candidate morphology have exact unique source anchors',()=>{
 const links=Object.values(V.interlinear.chapters).flatMap(ch=>ch.D.links),count=new Map();for(const l of links)for(const[r,i]of l.base)count.set(r+'/'+i,(count.get(r+'/'+i)||0)+1);
 for(const t of D.transfers.filter(t=>t.status==='transferred')){
  const matches=links.filter(l=>l.reading.some(([r,i])=>r===t.targetRef&&i===t.targetWordIndex));assert.equal(matches.length,1);const l=matches[0];assert.equal(l.base.length,1);assert.equal(l.reading.length,1);assert.ok(!l.uncertain);assert.equal(count.get(l.base[0].join('/')),1);assert.deepEqual(t.targetFlags,[]);assert.equal(P.stripPointing(t.donorWord),t.originalWord);assert.equal(P.transferWord(t.originalWord,t.donorWord).text,t.pointedWord);
  const[c,m]=t.targetRef.split(':').map(Number),f=D.forms[D.sources[D.title].chapters[c-1][m-1][t.lexicalToken-1]], [dc,dm]=t.sourceRef.split(':').map(Number),donor=old.forms[old.sources[D.title].chapters[dc-1][dm-1][t.sourceToken-1]];
  assert.equal(f.word,t.pointedWord);assert.notEqual(f.status,'reviewed');assert.deepEqual(f.analyses.map(a=>[a.lemma,a.morph]),donor.analyses.map(a=>[a.lemma,a.morph]));assert.ok(f.analyses.every(a=>a.method==='kaufmann-pointing-transfer-candidate'));
 }
 assert.equal(D.transfers.filter(t=>t.status==='transferred').length,1621);assert.equal(D.transfers.filter(t=>t.status==='open').length,549);
});
test('original inputs remain hash-bound and the separate bundled edition matches its manifest',()=>{
 assert.equal(sha(fs.readFileSync(path.join(root,'mishnah-textcrit-data.js'))),D.originalFiles.diplomatic);assert.equal(sha(fs.readFileSync(path.join(root,'mishnah-vocalized/berakhot.js'))),D.originalFiles.alignment);assert.equal(sha(fs.readFileSync(path.join(root,'bundled',D.source.donorRel))),D.originalFiles.donor);
 const bytes=fs.readFileSync(path.join(root,'bundled',D.source.rel)),doc=JSON.parse(bytes);assert.equal(B.hash(doc.text),D.source.textHash);assert.equal(doc.isPrimary,false);assert.equal(doc.versionTitle,D.edition);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'bundled/manifest.json')));assert.equal(manifest.items.find(e=>e.rel===D.source.rel).hash,sha(bytes,'sha1'));assert.ok(manifest.items.some(e=>e.rel===D.source.donorRel));
 doc.text.forEach((ch,c)=>ch.forEach((html,m)=>{const words=M.tokens(B.main(html)),ids=D.sources[D.title].chapters[c][m];assert.deepEqual(words.map(t=>t.word),ids.map(id=>D.forms[id].word));}));
 // One diplomatic abbreviation is intentionally two lexical-reader tokens.
 assert.equal(D.coverage.words,2171);assert.equal(D.units['8:6'].words[9].text,"ע'ע'ז'");assert.equal(M.tokens(D.units['8:6'].words[9].text).length,2);
});
test('existing manuscript links retain their original indices and D links are identities',()=>{
 for(const[ch,v]of Object.entries(O.interlinear.chapters)){
  for(const w of ['P','C'])assert.deepEqual(D.interlinear.chapters[ch][w],v[w]);
  for(const l of D.interlinear.chapters[ch].D.links){assert.deepEqual(l.base,l.reading);const[r,i]=l.base[0];assert.ok(O.witnesses.K.units[r].words[i]);}
 }
});
test('published comparisons bind the exact derived file and account for every diplomatic position',()=>{
 const report=JSON.parse(fs.readFileSync(path.join(root,'tools/mishnah-morph/kaufmann-berakhot-accordance-pointing.json')));
 assert.equal(report.target.datasetSha256,sha(fs.readFileSync(path.join(root,'mishnah-kaufmann-berakhot-data.js'))));assert.equal(report.target.textHash,D.source.textHash);assert.equal(report.reference.units,57);assert.equal(report.reference.usedAsDonor,false);
 assert.equal(Object.values(report.counts).reduce((a,b)=>a+b,0),2170);assert.equal(report.counts['target-open'],549);assert.equal(report.counts.match,1468);assert.equal(report.counts.different,115);assert.equal(report.differencePositions.length,115);
});
