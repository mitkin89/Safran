'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const C=require('../tools/mishnah-morph/compare-image-accordance.cjs');
const cmp=(D,I,raw)=>C.compare(D,I,'Ber. 1:1 '+raw);
function fixture(reading,status='clear',features=[]){const D={source:{textHash:'a',diplomaticSha256:'b'},units:{'1:1':{id:'id',words:[{originalWord:'את',text:'WRONG BEERI PROXY'}]}}};const I={targetTextHash:'a',diplomaticSha256:'b',words:{'id/word/0':{ref:'1:1',wordIndex:0,originalWord:'את',reviewStatus:status,reviews:[{status,reading,folio:'001v',line:1,observedFeatures:features}]}}};return{D,I};}
test('the comparison uses actual image readings rather than the Beeri candidate and rejects stale binding',()=>{
 const{D,I}=fixture('אֶת');assert.equal(cmp(D,I,'אֶת').aggregate.clearComparison.match,1);assert.equal(cmp(D,I,'אֵת').aggregate.clearComparison.different,1);
 assert.throws(()=>C.compare(D,{...I,targetTextHash:'wrong'},'אֶת'),/bind/);I.words['id/word/0'].originalWord='אחר';assert.throws(()=>cmp(D,I,'אֶת'),/Stale/);
});
test('uncertain positive marks never imply absent dagesh or whole-word confirmation',()=>{
 const{D,I}=fixture('אֶת','uncertain');let r=cmp(D,I,'אֶתּ').aggregate;assert.equal(r.uncertainExploratoryComparison['observed-marks-compatible'],1);assert.equal(r.clearFirstPassReadings,0);
 r=cmp(D,I,'אֵתּ').aggregate;assert.equal(r.uncertainExploratoryComparison['observed-marks-different'],1);
 I.words['id/word/0'].reviews[0].reading='את';r=cmp(D,I,'אֵתּ').aggregate;assert.equal(r.uncertainExploratoryComparison['no-observed-pointing'],1);
});
test('explicit secure vowel features exclude other point categories and remain separate from uncertain words',()=>{
 const{D,I}=fixture('את','uncertain',[{letterIndex:0,marks:['ֶ'],certainty:'clear'}]);const r=cmp(D,I,'אֶתּ').aggregate;assert.equal(r.explicitSecureFeatures.match,1);assert.equal(r.clearFirstPassReadings,0);
 I.words['id/word/0'].reviews[0].observedFeatures[0].marks=['ֶgarbage'];assert.equal(cmp(D,I,'אֶתּ').aggregate.explicitSecureFeatures['feature-invalid'],1);
});
test('reference annotations, invalid point clusters and repeated ambiguous anchors do not become agreement',()=>{
 const{D,I}=fixture('אֶת');assert.equal(cmp(D,I,'{אֶת}').aggregate.clearComparison['annotation-open'],1);assert.equal(cmp(D,I,'אֵֶת').aggregate.clearComparison['reference-suspect'],1);assert.equal(cmp(D,I,'אֶת אֶת').aggregate.clearComparison['alignment-open'],1);
});
test('abbreviations stay separately visible in a comparison rather than hidden as ordinary vowel errors',()=>{
 const{D,I}=fixture('אֶת׳');const r=cmp(D,I,'אֵת׳').aggregate;assert.equal(r.clearByWordKind.abbreviation.different,1);assert.equal(r.nonAbbreviationExamples.length,0);assert.equal(r.differencePositions[0].kind,'abbreviation');
});
test('the real aggregate accounts for all image positions and binds unchanged reference and image bytes',()=>{
 const r=require('../tools/mishnah-morph/kaufmann-image-accordance-comparison.json'),I=require('../mishnah-kaufmann-image-data');
 assert.equal(r.imageEvidence.datasetSha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../mishnah-kaufmann-image-data'))).digest('hex'));assert.equal(r.imageEvidence.targetTextHash,I.targetTextHash);
 assert.equal(r.sourcePositions,2170);assert.equal(r.clearFirstPassReadings,245);assert.equal(r.uncertainImageReadings,1925);assert.equal(Object.values(r.clearComparison).reduce((a,b)=>a+b,0),245);assert.equal(Object.values(r.uncertainExploratoryComparison).reduce((a,b)=>a+b,0),1925);
 assert.deepEqual(r.clearComparison,{match:217,different:27,'alignment-open':1});assert.equal(r.clearByWordKind.abbreviation.different,27);assert.equal(r.clearByWordKind.word.different||0,0);assert.equal(r.explicitSecureFeatures.match,12);assert.equal(r.reference.sha256,'47fdd2eb361a960f1c7a42dcb6b8e6091caf1b7665bfb0ecfd90debed64e3f78');
});

test('the pre-countercheck comparison stays visible instead of silently erasing the original discrepancies',()=>{const before=require('../tools/mishnah-morph/kaufmann-image-accordance-before-countercheck.json'),qa=require('../tools/mishnah/kaufmann-image-accordance-countercheck.json'),now=require('../tools/mishnah-morph/kaufmann-image-accordance-comparison.json');assert.equal(before.clearFirstPassReadings,252);assert.equal(before.clearComparison.different,34);assert.equal(before.clearByWordKind.word.different,7);assert.equal(before.imageEvidence.datasetSha256,qa.beforeImageSha256);assert.equal(qa.items.length,7);assert.equal(now.explicitSecureFeatures.different,1);});
