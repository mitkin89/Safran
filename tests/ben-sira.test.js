'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const manifest=require('../bundled/manifest.json'),G=require('../gmorph'),{buildGroups,Library}=require('../offline');
const greek=manifest.items.find(e=>e.rel==='own/Jesus Sirach (Septuaginta)/other/Septuaginta (Rahlfs).json');
test('Ben Sira groups Greek Sirach with the existing translation and retains all morphology',()=>{
 assert.equal(greek.title,'Ben Sira');assert.equal(greek.heTitle,'בן סירא');
 const group=buildGroups({books:manifest.items}).find(g=>g.title==='Ben Sira');assert(group.entries.some(e=>e.kind==='de'));assert(group.entries.some(e=>e.language==='Greek'));
 assert(!manifest.items.some(e=>e.title==='Jesus Sirach (Septuaginta)'));
 const d=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',greek.rel)));assert.equal(d.title,'Ben Sira');assert.equal(d.text.length,52);assert.match(d.text[51][0],/Prolog/);
 const box={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../lxx-morph'),'utf8'),box);const data=box.window.LXX_MORPH,bi=G.bookIndex(data,d.title,d.versionTitle);assert(bi>=0);
 for(let c=0;c<d.text.length;c++)for(let v=0;v<d.text[c].length;v++)assert.equal(G.verse(data,bi,c+1,v+1)?.length,G.words(d.text[c][v]).length,`${c+1}:${v+1}`);
});
test('Sirach bundle update changes the title at its existing path without creating a second edition',async t=>{
 const fsp=require('node:fs/promises'),os=require('node:os'),dir=await fsp.mkdtemp(path.join(os.tmpdir(),'safran-sirach-'));t.after(()=>fsp.rm(dir,{recursive:true,force:true}));
 const lib=await new Library(path.join(dir,'library')).load(),pack=path.join(dir,'bundle'),raw=fs.readFileSync(path.join(__dirname,'../bundled',greek.rel)),old=JSON.stringify({...JSON.parse(raw),title:'Jesus Sirach (Septuaginta)'});
 for(const base of [lib.dir,pack])await fsp.mkdir(path.dirname(path.join(base,greek.rel)),{recursive:true});
 await fsp.writeFile(path.join(pack,greek.rel),raw);await fsp.writeFile(path.join(pack,'manifest.json'),JSON.stringify({items:[greek]}));await fsp.writeFile(path.join(lib.dir,greek.rel),old);
 lib.index.entries[greek.rel]={...greek,title:'Jesus Sirach (Septuaginta)',own:true,bundled:true,bundledHash:crypto.createHash('sha1').update(old).digest('hex')};
 assert.equal(await lib.importBundled(pack),1);assert.equal(lib.list().length,1);assert.equal(lib.list()[0].title,'Ben Sira');
});
