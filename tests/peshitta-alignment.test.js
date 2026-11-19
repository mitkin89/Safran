'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),P=require('../peshitta-alignment');
const box={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../peshitta-alignment-data'),'utf8'),box);const data=box.window.PESHITTA_ALIGNMENT_DATA;
const manifest=require('../bundled/manifest.json'),load=e=>{const d=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',e.rel)));return {...d,entry:e,textHash:crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex')};};
const he=load(manifest.items.find(e=>e.title==='Genesis'&&e.versionTitle.startsWith('Westminster'))),sy=load(manifest.items.find(e=>e.title==='Genesis'&&e.language==='Syriac'));
const words=(html,cls)=>[...html.matchAll(new RegExp('<span class="'+cls+'"[^>]*>(.*?)</span>','g'))].map(m=>m[1]);
test('Genesis positional links only apply to their exact MT and Peshitta editions',()=>{
 assert(P.prepare(data,he,sy));assert(!P.prepare(data,{...he,textHash:'changed'},sy));assert(!P.prepare(data,he,{...sy,textHash:'changed'}));
 const report=require('../tools/peshitta/alignment/coverage.json');assert.equal(Object.keys(data.verses).length,report.accepted);assert.equal(report.accepted+report.rejected.length,1533);
 for(const [ref,r]of Object.entries(data.verses)){
  const [c,v]=ref.split(':').map(Number),hw=words(he.text[c-1][v-1],'w'),sw=words(sy.text[c-1][v-1],'syw');assert(P.verse(data,ref,hw,sw),ref);
  assert.equal(P.verse(data,ref,['changed',...hw.slice(1)],sw),null);assert.equal(P.verse(data,ref,hw,['changed',...sw.slice(1)]),null);
  assert(r.links.every(ix=>ix.every(i=>i>=1&&i<=hw.length)));
 }
 assert.equal(P.verse(data,'99:1',[],[]),null);
 for(const r of report.rejected)assert.equal(data.verses[r.ref],undefined);
});
test('Genesis keeps maqqef word groups and unaligned Syriac words without invented links',()=>{
 const r=data.verses['1:2'];assert(r);assert(r.links.some(ix=>ix.length>1));
 assert(Object.values(data.verses).some(r=>r.links.some(ix=>!ix.length)));
 assert.equal(data.verses['1:1'].sy[0],'ܒܪܫܝܬ');assert.deepEqual([...data.verses['1:1'].links[0]],[1]);
});
