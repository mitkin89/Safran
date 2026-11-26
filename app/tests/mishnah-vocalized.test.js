'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),B=require('../tools/mishnah-morph/build.cjs'),M=require('../mishnah-morph'),manifest=require('../bundled/manifest.json');
const ctx={window:{}};const run=f=>vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);run('mishnah-textcrit-catalog.js');run('mishnah-vocalized-catalog.js');run('library-mishnah-textcrit.js');
test('all 63 vocalized editions retain their exact word positions and conserve both directly aligned manuscripts',async()=>{
 const catalog=ctx.window.MISHNAH_VOCALIZED_CATALOG;assert.equal(Object.keys(catalog).length,63);
 const ui=ctx.window.LibraryMishnahTextCrit.create({esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'),load:async(file,get)=>{run(file);return get();}});
 let count=0;
 for(const [title,item]of Object.entries(catalog)){
  const entry=manifest.items.find(e=>e.title===title&&e.versionTitle===B.version),doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel)));
  assert.equal(item.rel,entry.rel);assert.equal(item.textHash,B.hash(doc.text));
  const original=await ui.load(title),v=await ui.loadVocalized(title);for(const sig of ['P','C'])assert.equal(v.witnessSha256[sig],original.witnesses[sig].sha256);let words=0;
  doc.text.forEach((ch,c)=>ch.forEach((html,m)=>{const ref=`${c+1}:${m+1}`,unit=v.base[ref],tokens=M.tokens(B.main(html));assert.equal(unit.text,B.main(html));assert.deepEqual(Array.from(unit.words,w=>w.text),tokens.map(t=>t.word));words+=tokens.length;}));
  assert.equal(words,item.words);count+=words;
  for(let ch=1;ch<=doc.text.length;ch++){
   const refs=Object.keys(v.base).filter(r=>r.startsWith(ch+':')),html=ui.renderVocalized(ch,refs,['K','P','C']);
   assert.equal([...html.matchAll(/data-vocalized-word="/g)].length,refs.reduce((n,r)=>n+v.base[r].words.length,0),title+' base '+ch);
   for(const sig of ['P','C']){
    const expected=Object.entries(original.witnesses[sig].units).filter(([r])=>r.startsWith(ch+':')).flatMap(([r,u])=>u.words.map((_,i)=>r+'|'+i)).sort();
    const actual=[...html.matchAll(new RegExp('data-tc-mishnah="'+sig+'\\|[^" ]+" data-tc-mishnah-word="([^" ]+)"','g'))].map(m=>m[1]).sort();
    assert.deepEqual(actual,expected,title+' '+sig+' chapter '+ch);assert.equal(new Set(actual).size,actual.length);
   }
  }
 }
 assert(count>180000);
});
