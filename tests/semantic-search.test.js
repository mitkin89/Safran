'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const F=require('../semantic-fields'),{searchFiles}=require('../searchcore');
const root=path.join(__dirname,'..'),manifest=require('../bundled/manifest.json').items;
const entries=manifest.filter(e=>e.title==='Genesis'&&(/^Westminster/.test(e.versionTitle)||/Zunz/.test(e.versionTitle)||e.versionTitle==='Septuaginta (CATSS)'));
const run=(semantic,opts={})=>searchFiles({dir:path.join(root,'bundled'),entries,params:{semantic,limit:1000,perFile:1000,...opts}});
function tables(){const w={};for(const file of ['oshb-lemmas.js','lxx-morph.js'])new Function('window',require('node:fs').readFileSync(path.join(root,file),'utf8'))(w);return w;}
test('catalogue uses attested exact lemma identifiers and separates homonyms',()=>{
 const w=tables(),greek=new Set(w.LXX_MORPH.L.map(r=>F.fold(r.split('\t')[0])));
 assert.equal(F.fields.length,10);
 for(const field of F.fields){for(const id of field.he)assert(w.OSHB_LEMMAS[id],id);for(const l of field.gr)assert(greek.has(F.fold(l)),l);}
 const mercy=F.resolve({fieldId:'mercy'});assert(mercy.he.includes('7356 b'));assert(!mercy.he.includes('7356 a'));assert(!mercy.he.includes('2617 b'));
 assert.equal(F.find('Barmherzigkeit')[0].id,'mercy');assert.equal(F.find('fear')[0].id,'fear');assert.equal(F.find('unbekanntes feld').length,0);
 assert.equal(F.cleanCustom({title:'X',he:['../../x'],gr:[]}),null);assert.equal(F.resolve({fieldId:'no'}),null);
 assert.equal(F.cleanCustom({title:'X',he:['7356 b'],gr:['ἔλεος']}).he[0],'7356 b');
});
test('fear finds inflected Hebrew and Greek; exact German phrase and evidence retained',async()=>{
 const res=await run({fieldId:'fear'});assert(!res.error);assert.equal(res.total,2);
 const he=res.results.find(r=>r.kind==='he'&&r.path.join(':')==='2:9');assert(he,'Genesis 3:10');
 assert.equal(he.semantic.matches[0].id,'3372');assert.deepEqual(he.positions,[6]);assert(he.parts.some(p=>p.m&&p.t.includes('וָאִירָ')));
 const de=he.parallels.find(p=>/Zunz/.test(p.versionTitle));assert(de);assert(de.parts.some(p=>p.m&&/fürcht/i.test(p.t)),JSON.stringify(de.parts));
 assert(res.results.some(r=>r.kind==='other'&&r.semantic.matches.some(m=>m.source==='lxx-morph')));
 assert.equal(res.results.length,res.stats.reduce((sum,s)=>sum+s.n,0),'aligned translations never inflate passage counts');
});
test('custom exact homonym, unknown identifiers, empty query and independent cancellation',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'safran-semantic-'));
 try{
  const e={title:'Genesis',kind:'he',rel:'he.json',versionTitle:entries.find(e=>e.kind==='he').versionTitle};
  await fs.writeFile(path.join(tmp,e.rel),JSON.stringify({sectionNames:['Chapter','Verse'],text:[['<span class="w" data-l="7356 a" data-m="HNcmsa">רַחַם</span>','<span class="w" data-l="7356 b" data-m="HNcmpa">רַחֲמִים</span>']]}));
  const params={query:'',semantic:{custom:{title:'Erbarmen',he:['7356 b'],gr:[]}}};
  const r=await searchFiles({dir:tmp,entries:[e],params});assert.equal(r.results.length,1);assert.deepEqual(r.results[0].path,[0,1]);
  const bad=await run({custom:{title:'Ungültig',he:['9999'],gr:[]}});assert.match(bad.error,/Strong/);
  const badGreek=await run({custom:{title:'Ungültig',he:[],gr:['ἀβγδεζηθ']}});assert.match(badGreek.error,/Index/);
  const stopped=await searchFiles({dir:tmp,entries:[e],params,isCancelled:()=>true});assert.equal(stopped.cancelled,true);assert.equal(stopped.scanned,0);
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
test('retained older translation never receives current word alignment',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'safran-semantic-version-'));
 try{
  for(const e of entries){const target=path.join(tmp,e.rel);await fs.mkdir(path.dirname(target),{recursive:true});const d=JSON.parse(await fs.readFile(path.join(root,'bundled',e.rel),'utf8'));if(e.kind==='de')d.text[2][9]+=' [lokale Änderung]';await fs.writeFile(target,JSON.stringify(d));}
  const res=await searchFiles({dir:tmp,entries,params:{semantic:{fieldId:'fear'},limit:1000,perFile:1000}});
  const r=res.results.find(r=>r.kind==='he'&&r.path.join(':')==='2:9');assert.equal(r.semantic.translationSkipped,1);assert(!r.parallels?.length);
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
test('display limits retain complete counts, a real worker uses the same semantic branch',async()=>{
 const all=await run({fieldId:'fear'}),limited=await run({fieldId:'fear'},{limit:2,perFile:1});
 assert.deepEqual(limited.stats,all.stats);assert(limited.capped||limited.truncated);assert(limited.results.length<=2);
 const {Worker}=require('node:worker_threads');
 const result=await new Promise((resolve,reject)=>{const w=new Worker(path.join(root,'searchWorker.js'),{workerData:{dir:path.join(root,'bundled'),entries,params:{semantic:{fieldId:'fear'},limit:2,perFile:1}}});w.on('message',m=>{if(m.type==='done')resolve(m.res);if(m.type==='error')reject(Error(m.error));});w.on('error',reject);w.on('exit',code=>{if(code)reject(Error('worker '+code));});});
 assert.deepEqual(result.stats,all.stats);
});
