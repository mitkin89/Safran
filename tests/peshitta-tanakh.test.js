'use strict';
// Prophets and Writings: per-book MT–Peshitta links (tools/peshitta/alignment/tanakh.py).
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),P=require('../peshitta-alignment');
const manifest=require('../bundled/manifest.json'),load=e=>{const d=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',e.rel)));return {...d,entry:e,textHash:crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex')};};
const words=(html,cls)=>[...String(html||'').matchAll(new RegExp('<span class="'+cls+'"[^>]*>(.*?)</span>','g'))].map(m=>m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'"));
const bookData=title=>{const box={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',P.file(title)),'utf8'),box);return P.book({version:2,books:{[title]:box.window.PESHITTA_ALIGNMENT_BOOKS[title]}},title);};
test('all 34 remaining Tanakh books are listed and loadable per book',()=>{
 assert.equal(P.BOOKS.length,34);assert(P.has('Psalms'));assert(P.has('Genesis'));assert(!P.has('Tobit'));
 assert.equal(P.file('I Samuel'),'peshitta-alignment/I_Samuel.js');assert.equal(P.file('Exodus'),'peshitta-alignment-data.js');
});
test('every book matches its exact editions, uses each native Syriac word once and is reviewed',()=>{
 for(const title of P.BOOKS){
  const d=bookData(title),h=load(manifest.items.find(e=>e.title===title&&(e.versionTitle||'').startsWith('Westminster'))),s=load(manifest.items.find(e=>e.title===title&&e.language==='Syriac'));
  assert(P.prepare(d,h,s),title);assert(!P.prepare(d,h,{...s,textHash:'x'}),title);
  const ids=new Set();let n=0;
  for(const [ref,r]of Object.entries(d.verses)){
   const [c,v]=ref.split(':').map(Number);assert(P.verse(d,ref,words(h.text[c-1][v-1],'w')),title+' '+ref);
   assert.equal(r.review?.by,'Claude');assert.equal(r.ids.length,r.sy.length);
   r.ids.forEach((id,i)=>{assert(!ids.has(id),title+' '+id);ids.add(id);const w=s.syriacMorphology.words[id];assert.equal(w[0],r.sy[i]);assert.equal(w[2]+':'+w[3],r.refs[i]);});n+=r.sy.length;
  }
  assert.equal(n,Object.keys(s.syriacMorphology.words).length,title);
  assert.equal(Object.keys(d.verses).length,h.text.reduce((a,ch)=>a+ch.length,0),title);
 }
});
test('verse shifts and pluses stay at their MT position',()=>{
 const dn=bookData('Daniel');const v=dn.verses['3:23'];assert(v.refs.some(r=>r==='3:50'||+r.split(':')[1]>33));assert(v.links.some(ix=>!ix.length));
 const ch=bookData('II Chronicles');assert(ch.verses['11:4'].refs.some(r=>r.startsWith('10:')));
});
