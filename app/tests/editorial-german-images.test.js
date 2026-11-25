'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function* leaves(x){if(typeof x==='string')yield x;else for(const v of Object.values(x))yield* leaves(v);}
const blocks=d=>[...leaves(d.text)].flatMap(t=>[...t.matchAll(/<img\b[^>]*>(?:\s*<br\s*\/?>)*\s*<i>.*?<\/i>(?:\s*<br\s*\/?>)*/gis)].map(m=>sha(m[0]))).sort();
const images=d=>[...leaves(d.text)].flatMap(t=>[...t.matchAll(/<img\b[^>]*>/gi)].map(m=>sha(m[0]))).sort();
test('every supplied Philippson illustration and caption survives source reconstruction',()=>{
 const report=read('tools/editorial/reports/philippson-supplied-corrections.json');let total=0;
 for(const source of report.files){
  const expected=source.illustration_blocks.map(x=>x.block_sha256).sort();
  assert.deepEqual(blocks(read(source.source_file)),expected,source.book);total+=expected.length;
 }
 assert.equal(total,27);
});
test('all 419 German files retain every original image; note and shape changes are accounted for',()=>{
 const before=read('tools/editorial/reports/german-audit-before-sweep.json');
 const restorations=read('tools/editorial/reports/philippson-restored-commentary.json').files;
 const herx=read('tools/editorial/reports/herxheimer-psalms-restoration.json').files;
 const delta=new Map();
 for(const f of [...restorations,...herx]){
  const d=delta.get(f.source_file)||{footnotes:0,footnote_markers:0};
  d.footnotes+=f.footnotes_delta;d.footnote_markers+=f.footnote_markers_delta;delta.set(f.source_file,d);
 }
 const extended={'Herxheimer on Psalms':20,'Philippson on Hosea':2,'Philippson on I Chronicles':19,'Philippson on I Kings':1,'Philippson on Proverbs':2,'Philippson on Zechariah':2};
 const manifest=read('bundled/manifest.json').items.filter(i=>i.kind==='de');assert.equal(manifest.length,419);
 let total=0;
 for(const original of before.texts){
  const d=read(original.source),texts=[...leaves(d.text)],adjust=delta.get(original.source)||{footnotes:0,footnote_markers:0};
  const tags=images(d),expected=before.images.filter(i=>i.text_id===original.id).map(i=>i.tag_sha256).sort();
  assert.deepEqual(tags,expected,original.title);total+=tags.length;
  assert.equal(texts.length,original.segments+(extended[original.title]||0),original.title);
  for(const [key,tag] of [['footnotes','class="footnote"'],['footnote_markers','class="footnote-marker"']])
   assert.equal(texts.reduce((n,t)=>n+t.split(tag).length-1,0),original[key]+adjust[key],`${original.title}: ${key}`);
  const item=manifest.find(i=>'bundled/'+i.rel===original.source);assert(item);
  assert.equal(crypto.createHash('sha1').update(fs.readFileSync(path.join(root,original.source))).digest('hex'),item.hash,original.title);
 }
 assert.equal(total,589);
});
test('source-checked comments belong to their actual chapters',()=>{
 const m=read('bundled/manifest.json').items;
 const book=title=>read('bundled/'+m.find(i=>i.title===title&&i.kind==='de').rel).text;
 const sam=book('Philippson on I Samuel');assert.match(sam[27][5],/Urim/);assert.equal(sam[27][10],'');assert.match(sam[18][17],/Najoth/);assert(sam[30][12].length<250);
 const sam2=book('Philippson on II Samuel');assert.match(sam2[3][5],/Waizen/);assert.doesNotMatch(sam2[3][5],/Amalekiten/);
 const isa=book('Philippson on Isaiah');assert.match(isa[18][10],/Pharoh/);assert.match(isa[18][15],/Aegypter/);assert.equal(isa[18][24],'');
 const herx=book('Herxheimer on Psalms');assert.match(herx[44][2],/Schönheit/);assert.match(herx[45][2],/ימיר/);assert.match(herx[46][1],/Geberde/);assert.match(herx[50][11],/Moralische Kraft/);
});
