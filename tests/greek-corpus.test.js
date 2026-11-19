'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const C=require('../greek-corpus'),G=require('../gmorph'),R=require('../reader'),manifest=require('../bundled/manifest.json');
const items=manifest.items.filter(x=>x.rel.startsWith('own/GreekCorpus-'));
const report=require('../tools/greek-corpus/coverage.json');
const box={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../greek-corpus-manual'),'utf8'),box);const manual=box.window.GREEK_CORPUS_MANUAL;
const hash=text=>crypto.createHash('sha256').update(JSON.stringify(text)).digest('hex');
test('all 35 Greek editions preserve every displayed token and verify their exact source',()=>{
 assert.equal(items.length,35);let preferred=0;
 for(const item of items){
  const raw=fs.readFileSync(path.join(__dirname,'../bundled',item.rel),'utf8'),doc=JSON.parse(raw);doc.textHash=hash(doc.text);
  assert.equal(crypto.createHash('sha1').update(raw).digest('hex'),item.hash);
  const expected=report.works.find(x=>x.id===doc.greekMorphology.work);let words=0,annotated=0;
  for(const section of R.sectionsOf(doc.text,doc.sectionNames))for(const row of R.flattenNode(R.getByPath(doc.text,section.path))){
   const ws=G.words(row.html),at=C.at(doc,section.path,row.label,ws,manual);assert(at,item.title+' '+JSON.stringify(section.path)+' '+row.label);
   words+=ws.length;annotated+=at.records.filter(x=>x.lemma&&x.tag&&x.source==='oga').length;
   preferred+=at.records.filter(x=>x.source==='gorman').length;
   // Baseline coverage is checked independently of the optional manual layer.
   const base=C.at(doc,section.path,row.label,ws);assert.equal(base.records.length,ws.length);
   annotated+=base.records.filter((x,i)=>at.records[i].source==='gorman'&&x.lemma&&x.tag).length;
  }
  assert.equal(words,expected.words);assert.equal(annotated,expected.annotated);
 }
 assert.equal(preferred,report.manual.preferred);
});
test('Greek morphology rejects changed editions, reordered words, wrong numbering and incompatible manual passages',()=>{
 const item=items.find(x=>x.rel.includes('tlg0018.tlg001/')),doc=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',item.rel)));doc.textHash=hash(doc.text);const ws=G.words(doc.text[0]);
 assert(C.at(doc,[],'1',ws));assert.equal(C.at({...doc,textHash:'changed'},[],'1',ws),null);
 assert.equal(C.at(doc,[],'1',[...ws].reverse()),null);assert.equal(C.at(doc,[],'99999',ws),null);
 const bad={work:doc.greekMorphology.work,F:['ἄλλος'],L:['ἄλλος'],T:['a-s---mn-'],E:[[0,0,0]],P:{1:'0'}};
 assert(C.at(doc,[],'1',ws,bad).records.every(x=>x.source==='oga'));
});
test('native Greek tags describe finite verbs, participles, infinitives and nominal cases',()=>{
 assert.equal(C.key('v3saim---'),'V aor ind mid 3rd sg');
 assert.match(C.describe('v-sapamn-').info,/Partizip.*Aorist.*Aktiv/);
 assert.match(C.describe('v--pna---').info,/Infinitiv.*Präsens.*Aktiv/);
 assert.match(C.describe('n-p---mg-').info,/Genitiv Pl\. m\./);
 assert.equal(C.key('broken'),'');
});
test('Josephus cross-references preserve known Whiston numbers without clamping gaps',()=>{
 const map=require('../tools/josephus/niese_whiston.json');let count=0;
 for(const id of ['tlg0526.tlg001','tlg0526.tlg004']){
  const entry=items.find(x=>x.rel.includes(id+'/')),doc=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',entry.rel)));
  const key=id.endsWith('001')?'ant':'bell';
  for(const [locus,ref]of Object.entries(doc.greekMorphology.references)){
   const pair=map.niese[key][locus];assert(pair&&pair.every(Boolean));
   if(pair[0]==='pr.')assert(ref.endsWith('Preface '+pair[1]));
   else assert(ref.endsWith(locus.split('.')[0]+':'+pair.join(':')));
   count++;
  }
 }
 assert(count>10000);
});

test('Josephus translations and Greek editions form four works with explicit original loci',()=>{
 const OFF=require('../offline'),groups=OFF.buildGroups({books:manifest.items.filter(e=>e.categories?.includes('Josephus'))});
 assert.equal(groups.length,4);
 for(const title of ['The Antiquities of the Jews','The War of the Jews','Against Apion']){
  const g=groups.find(g=>g.title===title);assert(g);assert(g.entries.some(e=>e.kind==='de'));assert(g.entries.some(e=>e.language==='Greek'));
  const entry=g.entries.find(e=>e.language==='Greek'),d=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',entry.rel)));d.textHash=hash(d.text);
  const source=d.greekMorphology.layoutSource;assert(source);assert.equal(source.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../bundled',source.rel))).digest('hex'));
  const all=Object.values(d.greekMorphology.locator).flat();assert.equal(new Set(all).size,all.length);assert.equal(all.length,report.works.find(w=>w.id===d.greekMorphology.work).passages);
  assert(Object.values(d.greekMorphology.locator).some(l=>Array.isArray(l)&&l.length>1));
 }
});
test('bundled Josephus update replaces old separate titles at the same paths',async t=>{
 const fsp=require('node:fs/promises'),os=require('node:os'),{Library,buildGroups}=require('../offline');
 const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'safran-josephus-group-'));t.after(()=>fsp.rm(dir,{recursive:true,force:true}));
 const lib=await new Library(path.join(dir,'library')).load(),pack=path.join(dir,'bundle'),works=items.filter(e=>e.categories.includes('Josephus'));
 await fsp.mkdir(pack,{recursive:true});await fsp.writeFile(path.join(pack,'manifest.json'),JSON.stringify({items:works}));
 for(const e of works){
  const source=fs.readFileSync(path.join(__dirname,'../bundled',e.rel));await fsp.mkdir(path.dirname(path.join(pack,e.rel)),{recursive:true});await fsp.writeFile(path.join(pack,e.rel),source);
  const old={...JSON.parse(source),title:'Josephus: old '+e.title},bytes=Buffer.from(JSON.stringify(old)),dest=path.join(lib.dir,e.rel);await fsp.mkdir(path.dirname(dest),{recursive:true});await fsp.writeFile(dest,bytes);
  lib.index.entries[e.rel]={...e,title:old.title,own:true,bundled:true,bundledHash:crypto.createHash('sha1').update(bytes).digest('hex'),bytes:bytes.length};
 }
 assert.equal(await lib.importBundled(pack),4);
 assert.equal(Object.keys(lib.index.entries).length,4);assert(lib.list().every(e=>!e.title.startsWith('Josephus: old')));
 assert.equal(buildGroups({books:lib.list()}).length,4);
});

test('Josephus morphology resolves flattened whole-book rows, including Antiquities book 8',()=>{
 for(const item of items.filter(e=>e.categories.includes('Josephus'))){
  const d=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',item.rel)));d.textHash=hash(d.text);
  const seen=new Set();
  for(const section of R.sectionsOf(d.text,d.sectionNames)){
   const fi=section.path.findIndex(p=>typeof p==='number'),book=fi<0?section.path:section.path.slice(0,fi+1),key=JSON.stringify(book);
   if(seen.has(key))continue;seen.add(key);
   for(const row of R.flattenNode(R.getByPath(d.text,book))){
    const at=C.at(d,book,row.label,G.words(row.html),manual);assert(at,item.title+' '+key+' '+row.label);
    if(d.greekMorphology.work==='tlg0526.tlg001'&&book.at(-1)===7&&row.label==='1:1'){
     assert(at.records.some(r=>r.locus==='8.2'&&r.form==='αὐτοῦ'&&r.lemma&&r.tag));
     assert.equal(C.at(d,book,'99999:'+row.label,G.words(row.html)),null);
    }
   }
  }
 }
});
