'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const D=require('../mishnah-kaufmann-berakhot-data'),I=require('../mishnah-kaufmann-image-data');
const root=path.resolve(__dirname,'..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
test('all diplomatic source positions have source-bound image locations, separately from visual review',()=>{
 assert.equal(I.targetTextHash,D.source.textHash);assert.equal(I.diplomaticSha256,D.source.diplomaticSha256);assert.equal(Object.keys(I.images).length,8);assert.equal(Object.keys(I.words).length,2170);
 for(const[ref,u]of Object.entries(D.units))u.words.forEach((w,i)=>{const a=I.words[u.id+'/word/'+i];assert.ok(a);assert.equal(a.ref,ref);assert.equal(a.wordIndex,i);assert.equal(a.originalWord,w.originalWord);assert.ok(a.locations.length);for(const p of a.locations){assert.ok(I.images[p.folio]);assert.ok(['right','left'].includes(p.column));assert.match(p.sourceLine,/^\d+$/);}assert.ok(['not-reviewed','clear','uncertain','not-visible','conflicting'].includes(a.reviewStatus));if(a.reviewStatus==='not-reviewed')assert.equal(a.reviews.length,0);});
 assert.match(I.locationMethod,/not image verification/);
 assert.equal(I.summary.reviewPages,8);assert.equal(Object.values(I.summary.statuses).reduce((a,b)=>a+b,0),2170);assert.ok(!I.summary.statuses['not-reviewed']);
});
test('independent spotchecks retain initial readings and do not certify disputed or incomplete pointing',()=>{
 for(const[ref,index]of [['4:2',2],['4:2',14],['4:4',23],['6:3',26],['6:5',33],['7:3',17],['7:3',38],['7:3',96]]){
  const w=I.words[D.units[ref].id+'/word/'+index];assert.equal(w.reviewStatus,'uncertain');assert.ok(w.reviews.some(r=>r.initialStatus==='clear'&&r.initialReading&&r.secondaryObservation));
 }
 const w=I.words[D.units['7:3'].id+'/word/17'].reviews[0];assert.equal(w.initialReading,'אַחַד');assert.equal(w.reading,'אֶחָד');
});
test('visual observations resolve unchanged source words, physical line bboxes and immutable image hashes',()=>{
 const folder=path.join(root,'tools/mishnah/kaufmann-image-review');
 for(const file of fs.readdirSync(folder).filter(f=>/^\d{3}[rv]\.json$/.test(f))){
  const p=JSON.parse(fs.readFileSync(path.join(folder,file))),image=I.images[p.folio],lines=new Map(p.lines.map(l=>[l.column+'/'+l.line,l])),seen=new Set();assert.equal(p.imageSha256,image.sha256);assert.equal(p.imageName,image.name);
  for(const line of p.lines){const[x1,y1,x2,y2]=line.bbox;assert.ok(x1>=0&&x2<=image.width&&x1<x2&&y1>=0&&y2<=image.height&&y1<y2);}
  for(const w of p.words){const u=D.units[w.ref],id=u.id+'/word/'+w.wordIndex;assert.ok(!seen.has(id));seen.add(id);assert.equal(w.originalWord,u.words[w.wordIndex].originalWord);assert.ok(lines.has(w.column+'/'+w.line));assert.ok(I.words[id].locations.some(l=>l.folio===p.folio));assert.ok(I.words[id].reviews.some(r=>r.sourceFile===file&&r.reading===w.reading&&r.status===w.status));if(w.status==='clear'){assert.ok(w.reading&&!w.reading.includes('□'));}if(w.status==='uncertain')assert.ok(w.notes.length);}
 }
});
test('the image pass does not replace the pointing edition or its grammatical candidates',()=>{
 const previous=JSON.parse(fs.readFileSync(path.join(root,'tools/mishnah-morph/kaufmann-berakhot-accordance-pointing.json')));
 assert.equal(sha(fs.readFileSync(path.join(root,'mishnah-kaufmann-berakhot-data.js'))),previous.target.datasetSha256);assert.equal(D.sourceSummary.transferredWords,1621);assert.equal(D.sourceSummary.openWords,549);
 const w=I.words[D.units['1:2'].id+'/word/17'];assert.equal(w.reviewStatus,'uncertain');assert.ok(w.reviews.some(r=>r.observedFeatures?.some(f=>f.letterIndex===0&&f.marks.includes('ֶ'))));
 // Split abbreviation: two lexical cards must share one diplomatic evidence ID.
 const u=D.units['8:6'],abbr=u.words[9];assert.equal(abbr.originalWord,"ע'ע'ז'");assert.ok(I.words[u.id+'/word/9']);
});
