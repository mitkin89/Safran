'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),G=require('../gmorph'),C=require('../greek-corpus'),R=require('../reader'),O=require('../offline');
const manifest=require('../bundled/manifest.json'),coverage=require('../tools/pseudepigrapha/coverage.json');
const box={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'greek-pseudepigrapha-auto.js'),'utf8'),box);const auto=box.window.GREEK_PSEUDEPIGRAPHA_AUTO;
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function load(key){const e=coverage.editions.find(e=>e.key===key),d=JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel)));d.textHash=hash(d.text);return d;}

test('all 11 editions preserve every reader position, source locus, source layer and open fragment',()=>{
 assert.equal(coverage.editions.length,11);let passages=0,words=0,stanza=0,oga=0,unresolved=0;
 for(const e of coverage.editions){
  const d=load(e.key),item=manifest.items.find(i=>i.rel===e.rel),raw=fs.readFileSync(path.join(root,'bundled',e.rel));
  assert.equal(item.hash,crypto.createHash('sha1').update(raw).digest('hex'));assert.equal(d.greekMorphology.textHash,d.textHash);
  const seen=new Set();let n=0,s=0,o=0,u=0;
  for(const section of R.sectionsOf(d.text,d.sectionNames))for(const row of R.flattenNode(R.getByPath(d.text,section.path))){
   const ws=G.words(row.html),at=C.at(d,section.path,row.label,ws,null,auto);assert(at,e.key+' '+JSON.stringify(section.path)+' '+row.label);
   for(const locus of at.loci){assert(!seen.has(locus),e.key+' duplicate '+locus);seen.add(locus);}
   for(const r of at.records){assert.equal(r.analysis,'auto');if(r.tag){assert.match(r.tag,/^[a-z0-9-]{9}$/);assert(C.key(r.tag));}
    if(r.lemma&&r.tag){assert(['stanza','oga'].includes(r.source));if(r.source==='stanza')s++;else o++;}else u++;}
   n+=ws.length;
  }
  assert.equal(seen.size,e.passages);assert.equal(n,e.words);assert.equal(s,e.stanza);assert.equal(o,e.oga);assert.equal(u,e.unresolved);
  assert.equal(n,s+o+u);passages+=seen.size;words+=n;stanza+=s;oga+=o;unresolved+=u;
 }
 assert.equal(passages,1752);assert.equal(oga,1615);assert.equal(words,stanza+oga+unresolved);assert(unresolved>200);
});

test('twelve testaments share Kautzsch branches and disclose their provisional text basis',()=>{
 const d=load('T12P-Wikisource'),german=manifest.items.find(e=>e.title===d.title&&e.kind==='de'),de=JSON.parse(fs.readFileSync(path.join(root,'bundled',german.rel)));
 assert.deepEqual(Object.keys(d.text),Object.keys(de.text));assert.equal(Object.keys(d.text).length,12);
 assert.equal(d.greekMorphology.provisional,true);assert.equal(Object.keys(d.greekMorphology.sourceTitles).length,12);
 for(const branch of Object.keys(d.text)){
  const first=C.at(d,[branch,0],'1',G.words(d.text[branch][0][0]),null,auto).records[0];assert.equal(first.lemma,null);assert.equal(first.tag,null);
 }
 assert.equal(C.at(d,[Object.keys(d.text)[0],0],'1',G.words(d.text[Object.keys(d.text)[0]][0][0]),null,auto).records[1].lemma,'διαθήκη');
 assert.equal(coverage.editions.find(e=>e.key==='T12P-Wikisource').passages,993);
 const items=manifest.items.filter(e=>e.title===d.title);assert.equal(O.buildGroups({books:items}).length,1);
 assert.equal(german.hash,'b92b7d9bc526a692fa407407702e6f6b682d77c0');
 assert.equal(crypto.createHash('sha1').update(fs.readFileSync(path.join(root,'bundled',german.rel))).digest('hex'),german.hash);
});

test('Pseudo-Phocylides has 230 lines; 3 Baruch preserves its prologue and own 17 chapters',()=>{
 const p=load('PsPhoc-Bergk');assert.equal(p.text.length,1);assert.equal(p.text[0].length,230);
 assert(p.text[0][0].startsWith('Ταῦτα'));assert(p.text[0][229]);assert.equal(p.greekMorphology.work,'tlg1605.tlg001');
 const b=load('3Bar-Picard');assert.equal(b.title,'3 Baruch');assert.equal(b.text[''].length,17);assert.equal(b.text.Prologue.length,2);
 const at=C.at(b,['Prologue'],'1',G.words(b.text.Prologue[0]),null,auto);assert.equal(at.locus,'Prologue.1');
 assert.equal(C.at(b,['',0],'1',G.words(b.text[''][0][0]),null,auto).locus,'1.1');
});

test('Henoch keeps eight witnesses, Greek gaps, native 106:17b and alternate source readings',()=>{
 const es=coverage.editions.filter(e=>e.key.startsWith('1En-'));assert.equal(es.length,8);
 const items=manifest.items.filter(e=>e.title==='Das Buch Henoch');assert.equal(O.buildGroups({books:items}).length,1);
 for(const e of es){const d=load(e.key);assert.equal(d.text.length,108);assert.equal(d.greekMorphology.witness,e.witness);}
 const g=load('1En-Gizeh');assert.equal(g.text[107].length,0);
 assert.equal(Object.values(g.greekMorphology.sourceAlternatives).flat().length,2);
 const c=load('1En-CB185');assert(Object.values(c.greekMorphology.locator).flat().includes('106.17b'));
 const verse=c.text[105][16];assert(verse.includes('[106.17b]'));
 const at=C.at(c,[105],'17',G.words(verse),null,auto);assert(at.loci.includes('106.17b'));
});

test('external automatic data requires its exact work and text hash; edited text never borrows analyses',()=>{
 const d=load('PsPhoc-Bergk'),ws=G.words(d.text[0][0]);
 assert.equal(C.at(d,[0],'1',ws),null);assert.equal(C.at({...d,textHash:'edited'},[0],'1',ws,null,auto),null);
 assert.equal(C.at(d,[0],'1',ws.slice().reverse(),null,auto),null);
 const ref=d.greekMorphology.annotationRef;
 assert.equal(C.at(d,[0],'1',ws,null,{[ref]:{...auto[ref],work:'another'}}),null);
 assert.equal(C.at(d,[0],'1',ws,null,{[ref]:{...auto[ref],textHash:'another'}}),null);
});

test('concordance reads the separate analysis layer and retains automatic provenance',async()=>{
 const e=manifest.items.find(e=>e.rel===coverage.editions.find(e=>e.key==='PsPhoc-Bergk').rel),d=load('PsPhoc-Bergk');
 const r=C.at(d,[0],'1',G.words(d.text[0][0]),null,auto).records.find(r=>r.lemma),out=await require('../concordance').search({dir:path.join(root,'bundled'),entries:[e],params:{query:r.lemma,lemma:true}});
 assert(out.results.some(r=>r.basis==='lemma'&&r.analysisSource==='Stanza (automatic)'));
 assert.equal(out.lemmaCoverage.words,1565);assert.equal(out.lemmaCoverage.withLemma,1559);
});
