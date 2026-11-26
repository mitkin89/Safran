'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const zlib=require('node:zlib'),crypto=require('node:crypto');
const originals=new Map(['S07326','S00483','S01520'].map(id=>{const bytes=zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'../tools/mishnah/sources',id+'.xml.gz')));return [id,{hash:crypto.createHash('sha256').update(bytes).digest('hex'),ids:new Set([...bytes.toString().matchAll(/xml:id=["']([^"']+)["']/g)].map(m=>m[1]))}];}));
const root=path.resolve(__dirname,'..'),catalogContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'mishnah-textcrit-catalog.js'),'utf8'),catalogContext);const catalog=catalogContext.window.MISHNAH_TEXTCRIT_CATALOG;
test('all 63 manuscript datasets preserve each source token exactly once in the interlinear',async()=>{
 assert.equal(Object.keys(catalog).length,63);let books=0,chapters=0,words=0;
 for(const [title,item]of Object.entries(catalog)){
  const s={window:{MISHNAH_TEXTCRIT_CATALOG:catalog}};vm.runInNewContext(fs.readFileSync(path.join(root,item.file),'utf8'),s);const d=title==='Mishnah Berakhot'?s.window.MISHNAH_TEXTCRIT:s.window.MISHNAH_TEXTCRIT_BOOKS[title];
  vm.runInNewContext(fs.readFileSync(path.join(root,'library-mishnah-textcrit.js'),'utf8'),s);const ui=s.window.LibraryMishnahTextCrit.create({esc:t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),load:async()=>d});await ui.load(title);
  const seen={K:new Set(),P:new Set(),C:new Set()};
  for(let ch=1;ch<=item.chapters;ch++){
   const refs=ui.refs(ch);if(!refs.length)continue;const html=ui.render(ch,refs,['K','P','C']);assert(html.includes(title),title+' chapter label '+ch);
   for(const m of html.matchAll(/data-tc-mishnah="([KPC])\|([^"]+)" data-tc-mishnah-word="([^"]+)"/g)){assert(!seen[m[1]].has(m[3]),title+' duplicated '+m[1]+' '+m[3]);seen[m[1]].add(m[3]);}chapters++;
  }
  for(const sig of ['K','P','C']){const units=Object.values(d.witnesses[sig].units);let n=0;assert.equal(d.witnesses[sig].license,'CC BY 4.0');assert.equal(d.witnesses[sig].sha256,originals.get(d.witnesses[sig].id).hash);
   for(const u of units){assert(originals.get(d.witnesses[sig].id).ids.has(u.id),title+' original source ID');assert.equal(u.id.split('.').slice(1,3).map(Number).join('.'),item.coordinate.join('.'));}
   for(const u of units)for(const w of u.words){n++;assert.equal(u.offsetText.slice(w.start,w.end),w.text,title+' offset');}
   assert.equal(seen[sig].size,n,title+' all '+sig+' source words visible');words+=n;
  }
  if(title==='Mishnah Demai'){const h=ui.render(1,ui.refs(1),['K','C']);assert(h.includes('keine belegte Auslassung'));assert(!h.includes('data-tc-mishnah="C|'));}
  if(title==='Mishnah Keritot'){assert(d.verses['4:1'].missingBase);assert(!d.witnesses.K.units['4:1']);const h=ui.render(4,['4:1'],['K','P','C']);assert(h.includes('ohne Wortzuordnung'));assert(h.includes('data-tc-mishnah="P|'));assert(!h.includes('class="mt-diff"'));}
  if(title==='Pirkei Avot')assert(ui.render(6,['6:1'],['K','P','C']).includes('in keinem der eingebundenen Zeugen'));
  if(title!=='Mishnah Berakhot')assert(ui.render(1,ui.refs(1),['K'],'tosefta').includes('keine geprüften Mischna–Tosefta'));
  books++;
 }
 console.log(`Digital Mishnah: ${books} tractates, ${chapters} reference chapters, ${words} conserved source tokens.`);
});
