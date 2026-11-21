'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {Dictionaries,norm}=require('../dsl');
const report=require('../tools/sedra/report.json'),source=require('../tools/sedra/source.json'),manifest=require('../bundled/dict/manifest.json');
const root=path.resolve(__dirname,'..');
async function bundle(){return JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(root,'bundled/dict',report.id+'.json.gz'))));}
test('SEDRA source hashes, permanent lexical ids and multilingual source credits are preserved',async()=>{
 const raw={};
 for(const f of source.files){const buf=await fs.readFile(path.join(root,'tools/sedra/source',f.name));const hash=crypto.createHash('sha256').update(buf).digest('hex');assert.equal(hash,report.sourceHashes[f.name]);if(f.sha256)assert.equal(hash,f.sha256);if(f.name.endsWith('.jsonl.gz')){raw[f.name]=zlib.gunzipSync(buf).toString().trim().split('\n').map(JSON.parse);assert.equal(raw[f.name].length,f.rows);}}
 const d=await bundle(),ids=raw['lexemes.jsonl.gz'].filter(l=>l.review_status==='verified'&&!l.merged_into_id).map(l=>l.id).sort((a,b)=>a-b);
 assert.equal(d.heads.length,35892);assert.deepEqual(d.sedra.ids,ids);assert.equal(d.html.length,ids.length);assert.equal(d.keys.length,ids.length);assert.equal(d.sedra.license,'CC BY-NC 4.0');
 const k=ids.indexOf(1);assert.match(d.html[k],/air/);assert.match(d.html[k],/Arabic/);assert.match(d.html[k],/French/);assert.match(d.html[k],/Brock &amp; Kiraz/);assert.match(d.html[k],/Costaz/);assert.match(d.html[k],/CC BY-NC 4\.0/);
 assert(d.html.every(h=>!/<script\b|\son(?:click|error|load)\s*=/i.test(h)));
 const bytes=zlib.gunzipSync(await fs.readFile(path.join(root,'bundled/dict',report.id+'.json.gz')));assert.equal(crypto.createHash('sha1').update(bytes).digest('hex'),manifest.items.find(x=>x.id===report.id).hash);
});
test('SEDRA dictionary imports offline and finds exact inflected spellings without collapsing homonyms',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'safran-sedra-'));
 try{
  const src=path.join(dir,'bundle/dict');await fs.mkdir(src,{recursive:true});await fs.copyFile(path.join(root,'bundled/dict',report.id+'.json.gz'),path.join(src,report.id+'.json.gz'));await fs.writeFile(path.join(src,'manifest.json'),JSON.stringify({version:1,items:manifest.items.filter(x=>x.id===report.id)}));
  const svc=new Dictionaries(path.join(dir,'dict'));assert.equal(await svc.importBundled(path.join(dir,'bundle')),1);assert.equal((await svc.list())[0].lang,'Syriac');
  const exact=async q=>(await svc.search(q,{only:report.id})).filter(x=>x.kind==='exact');
  const first=await exact('ܪܫܝܬ');assert(first.some(x=>x.html.includes('data-sedra-id="3019"')));assert(first.some(x=>/beginning/i.test(x.html)));assert(first.every(x=>!x.html.includes('data-sedra-id="32130"')),'No guessed mapping from ETCBC lexeme RJCJ');
  assert.deepEqual((await exact('ܪܺܫܺܝܬ݂')).map(x=>x.k),(await exact('ܪܫܝܬ')).map(x=>x.k));
  const ambiguous=await exact('ܒܪܐ');assert(ambiguous.length>=3);assert(ambiguous.some(x=>x.html.includes('data-sedra-id="470"')));assert(ambiguous.some(x=>x.html.includes('data-sedra-id="467"')));
  const god=await exact('ܐܠܗܐ');assert(god.some(x=>/God/i.test(x.html)&&x.html.includes('sedra-root')));
  assert.equal((await exact('ܠܠܠܠܠܠܠ')).length,0);assert.equal(norm('ܟܬܒ̈ܐ'),norm('ܟܬܒܐ'));
  assert((await svc.headList(report.id)).length>30000);assert((await svc.suggest('ܐܠܗ')).length>0);
  await svc.remove(report.id);assert.equal(await svc.importBundled(path.join(dir,'bundle')),0,'Removal is respected across restarts');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
