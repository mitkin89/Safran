'use strict';
// Bundled dictionaries: manifest hashes match the files (otherwise a fresh install skips the dictionary),
// and Syriac forms in the head of an entry (Levy: „(syr. ܫܒܺܝܠܳܐ, hbr. שְׁבִיל)“) can be looked up as headwords.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {Dictionaries}=require('../dsl');
const root=path.join(__dirname,'..'),man=require('../bundled/dict/manifest.json');
test('every bundled dictionary matches its manifest hash',()=>{
  for(const it of man.items){const buf=zlib.gunzipSync(fs.readFileSync(path.join(root,'bundled/dict',it.id+'.json.gz')));assert.equal(crypto.createHash('sha1').update(buf).digest('hex'),it.hash,it.name);}
});
test('Syriac head forms are found in Levy',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'safran-sy-'));
  try{
    const D=new Dictionaries(dir),stage=path.join(dir,'stage');fs.mkdirSync(path.join(stage,'dict'),{recursive:true});
    const ids=['9ce7ea6c00f1','e8d290b744f6'];
    for(const id of ids)fs.copyFileSync(path.join(root,'bundled/dict',id+'.json.gz'),path.join(stage,'dict',id+'.json.gz'));
    fs.writeFileSync(path.join(stage,'dict/manifest.json'),JSON.stringify({items:man.items.filter(x=>ids.includes(x.id))}));
    assert.equal(await D.importBundled(stage),2,'both Levy dictionaries are imported');
    const r=await D.lookup('ܫܒܝܠܐ');
    assert(r.some(x=>x.dictId==='9ce7ea6c00f1'&&x.head==='שבילא'&&x.kind==='syriac-head'),JSON.stringify(r.map(x=>[x.dict,x.head])));
    assert(r.every(x=>/<mark class="dhit">ܫܒܺܝܠܳܐ<\/mark>/.test(x.html)),'the Syriac form is highlighted');
    assert.equal((await D.lookup('ܐܘܒܠ')).filter(x=>x.head==='יבל').length,2,'Af. ܐܰܘܒܶܠ under יבל in both Levy dictionaries');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
