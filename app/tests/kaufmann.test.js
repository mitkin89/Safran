'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Library}=require('../offline'),R=require('../reader'),W=require('../library-works');
const root=path.resolve(__dirname,'..'),report=require('../tools/kaufmann/provenance.json'),tractates=require('../tools/kaufmann/tractates.json'),manifest=require('../bundled/manifest.json');
const edition=report.edition,items=manifest.items.filter(e=>e.versionTitle===edition),digest=(algorithm,b)=>crypto.createHash(algorithm).update(b).digest('hex');
test('the named Kaufmann edition covers every tractate and all six orders',()=>{
 assert.equal(items.length,63);assert.equal(new Set(items.map(e=>e.title)).size,63);
 assert.deepEqual(items.map(e=>e.title).sort(),tractates.map(e=>e.title).sort());
 assert.equal(new Set(items.map(e=>e.categories[1])).size,6);
 assert.equal(report.chapters,525);assert.equal(report.segments,4192);assert.equal(report.pointedSegments,4192);
});
test('all bundled Kaufmann texts preserve their source words, vowels, notes and exact positions',()=>{
 let chapters=0,segments=0;
 for(const e of items){
  const raw=fs.readFileSync(path.join(root,'bundled',e.rel)),d=JSON.parse(raw),s=report.sources.find(s=>s.rel===e.rel);
  assert.equal(d.versionTitle,edition);assert.equal(d.title,e.title);assert.equal(e.kind,'he');assert.equal(e.language,'Hebrew');
  assert.equal(digest('sha1',raw),e.hash);assert.equal(digest('sha256',raw),s.bundledSha256);
  assert.equal(digest('sha256',JSON.stringify(d.text)),s.textSha256);
  assert.deepEqual(d.text.map(c=>c.length),s.chapterLengths);assert.equal(d.text.length,s.chapters);
  assert.equal(d.license,'CC BY-SA 3.0');assert.equal(d.versionSource,report.versionSource);assert(d.attribution.includes('Dan Be’eri')||d.attribution.includes("Dan Be'eri"));
  assert(['PD','unknown'].includes(d.sefariaExportLicense));assert.deepEqual(s.emptyRefs,[]);assert.deepEqual(s.unpointedRefs,[]);
  d.text.forEach(ch=>{
   const rows=R.flattenNode(ch);assert.equal(rows.length,ch.length);
   rows.forEach((r,i)=>{assert.equal(r.label,String(i+1));assert.equal(r.html,ch[i]);assert(/[\u05b0-\u05bb\u05c7]/u.test(r.html));});
   segments+=rows.length;
  });chapters+=d.text.length;
  const groups=W.groupEntries([e,{...e,rel:'other/'+e.rel,versionTitle:'Other edition',kind:'de'}]);assert.equal(groups.length,1);assert.equal(groups[0].versions.length,2);
 }
 assert.equal(chapters,525);assert.equal(segments,4192);
});
test('the Kaufmann edition is imported offline and updated without duplicate entries',async t=>{
 const fsp=require('node:fs/promises'),os=require('node:os'),tmp=await fsp.mkdtemp(path.join(os.tmpdir(),'safran-kaufmann-'));
 t.after(()=>fsp.rm(tmp,{recursive:true,force:true}));
 const bundle=path.join(tmp,'bundle');await fsp.mkdir(bundle);
 const selected=items.filter(e=>['Mishnah Berakhot',"Mishnah Ta'anit",'Pirkei Avot','Mishnah Oktzin'].includes(e.title));
 assert.equal(selected.length,4);
 for(const e of selected){const dest=path.join(bundle,e.rel);await fsp.mkdir(path.dirname(dest),{recursive:true});await fsp.copyFile(path.join(root,'bundled',e.rel),dest);}
 await fsp.writeFile(path.join(bundle,'manifest.json'),JSON.stringify({version:1,items:selected}));
 const lib=await new Library(path.join(tmp,'library')).load();await lib.importBundled(bundle);
 assert.equal(lib.list().length,4);
 for(const e of selected){const d=await lib.read(e.rel);assert.equal(d.versionTitle,edition);assert(/[\u05b0-\u05bb]/u.test(d.text[0][0]));}
 await lib.importBundled(bundle);assert.equal(lib.list().length,4);
});
