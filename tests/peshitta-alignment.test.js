'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),P=require('../peshitta-alignment');
const box={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../peshitta-alignment-data'),'utf8'),box);const all=box.window.PESHITTA_ALIGNMENT_DATA,data=P.book(all,'Genesis');
const manifest=require('../bundled/manifest.json'),load=e=>{const d=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',e.rel)));return {...d,entry:e,textHash:crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex')};};
const he=load(manifest.items.find(e=>e.title==='Genesis'&&e.versionTitle.startsWith('Westminster'))),sy=load(manifest.items.find(e=>e.title==='Genesis'&&e.language==='Syriac'));
const words=(html,cls)=>[...html.matchAll(new RegExp('<span class="'+cls+'"[^>]*>(.*?)</span>','g'))].map(m=>m[1]);
test('Genesis positional links only apply to their exact MT and Peshitta editions',()=>{
 assert(P.prepare(data,he,sy));assert(!P.prepare(data,{...he,textHash:'changed'},sy));assert(!P.prepare(data,he,{...sy,textHash:'changed'}));
 const report=require('../tools/peshitta/alignment/coverage.json');assert.equal(Object.keys(data.verses).length,1533);assert.equal(Object.values(data.verses).filter(r=>r.origin==='patracosy').length,report.accepted);assert.equal(report.accepted+report.rejected.length,1533);
 for(const [ref,r]of Object.entries(data.verses)){
  const [c,v]=ref.split(':').map(Number),hw=words(he.text[c-1][v-1],'w'),sw=words(sy.text[c-1][v-1],'syw');assert(P.verse(data,ref,hw,sw),ref);
  assert.equal(P.verse(data,ref,['changed',...hw.slice(1)],sw),null);assert.equal(P.verse(data,ref,hw,['changed',...sw.slice(1)]),null);
  assert(r.links.every(ix=>ix.every(i=>i>=1&&i<=hw.length)));
 }
 assert.equal(P.verse(data,'99:1',[],[]),null);
 for(const r of report.rejected)assert.equal(data.verses[r.ref].origin,'onkelos-assisted');
});
test('Genesis keeps maqqef word groups and unaligned Syriac words without invented links',()=>{
 const r=data.verses['1:2'];assert(r);assert(r.links.some(ix=>ix.length>1));
 assert(Object.values(data.verses).some(r=>r.links.some(ix=>!ix.length)));
 assert.equal(data.verses['1:1'].sy[0],'ܒܪܫܝܬ');assert.deepEqual([...data.verses['1:1'].links[0]],[1]);
});

test('all five books preserve every native Syriac word once and guard their exact source references',()=>{
 const report=require('../tools/peshitta/alignment/pentateuch-coverage.json');assert.equal(report.books.length,5);
 for(const stat of report.books){
  const d=P.book(all,stat.book),h=load(manifest.items.find(e=>e.title===stat.book&&e.versionTitle.startsWith('Westminster'))),s=load(manifest.items.find(e=>e.title===stat.book&&e.language==='Syriac'));
  assert(P.prepare(d,h,s));assert(!P.prepare(d,h,{...s,textHash:'changed'}));let count=0;const ids=new Set();
  assert.equal(Object.keys(d.verses).length,h.text.reduce((n,ch)=>n+ch.length,0));
  for(const [ref,r]of Object.entries(d.verses)){
   const [c,v]=ref.split(':').map(Number);assert(P.verse(d,ref,words(h.text[c-1][v-1],'w')),stat.book+' '+ref);
   assert.equal(r.ids.length,r.sy.length);assert.equal(r.refs.length,r.sy.length);
   r.ids.forEach((id,i)=>{assert(!ids.has(id));ids.add(id);const w=s.syriacMorphology.words[id];assert(w);assert.equal(w[0],r.sy[i]);assert.equal(w[2]+':'+w[3],r.refs[i]);});
   count+=r.sy.length;
  }
  assert.equal(count,Object.keys(s.syriacMorphology.words).length);assert.equal(count,stat.syWords);
 }
 assert.equal(P.book(all,'Isaiah'),null);
});
test('Decalogue groups and the Numbers chapter boundary retain explicit native references',()=>{
 const ex=P.book(all,'Exodus').verses['20:13'],dt=P.book(all,'Deuteronomy').verses['5:17'],nu=P.book(all,'Numbers').verses['26:1'];
 assert.deepEqual([...new Set(ex.refs)],['20:13','20:14','20:15','20:16']);assert.deepEqual([...new Set(dt.refs)],['5:17','5:18','5:19','5:20']);assert.deepEqual([...new Set(nu.refs)],['25:19','26:1']);
 assert(ex.review?.note);assert.deepEqual([...ex.links[1]],[2]);assert.deepEqual([...ex.links[7]],[8]);
 assert.equal(P.book(all,'Exodus').verses['20:14'].refs[0],'20:17');
 const count=P.book(all,'Deuteronomy').verses['25:2'];assert.equal(count.refs.at(-1),'25:3');assert.equal(count.sy.at(-1),'ܒܡܢܝܢܐ');assert.deepEqual([...count.links.at(-1)],[12]);assert.equal(P.book(all,'Deuteronomy').verses['25:3'].sy[0],'ܐܪ̈ܒܥܝܢ');
});
test('Codex verse edits stay distinct from automatic and unaligned proposals',()=>{
 const r=data.verses['1:8'];assert.equal(r.review.by,'Codex');assert.deepEqual([...r.links[9]],[10]);
 assert(!data.verses['1:1'].review);
 for(const ref of ['14:16','14:17'])assert(P.book(all,'Deuteronomy').verses[ref].links.every(ix=>!ix.length));
});

test('reviewed census words and numerals preserve changed word order and compound hundred',()=>{
 const r=P.book(all,'Numbers').verses['2:4'];assert.equal(r.review.by,'Codex');
 assert.deepEqual([...r.links[0]],[2]);assert.deepEqual([...r.links[1]],[1]);
 assert.deepEqual([...r.links[2]],[4]);assert.deepEqual([...r.links[3]],[3]);assert.deepEqual([...r.links[5]],[6,7]);
 const prep=P.book(all,'Exodus').verses['1:10'];assert.equal(prep.sy[2],'ܠܗܘܢ');assert.deepEqual([...prep.links[2]],[3]);assert.equal(prep.evidence[2],'onkelos-form');
});
