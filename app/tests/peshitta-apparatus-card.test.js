'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
function fixture(options={}){
 const window={PeshittaAlignment:require('../peshitta-alignment'),SyriacMorph:require('../syriac-morph')},ctx={window};
 vm.runInNewContext(fs.readFileSync(path.join(root,'library-textcrit-peshitta.js'),'utf8'),ctx);
 const opened=[],docs=new Map();
 const host={esc,load:async(src,get)=>{if(!get())vm.runInNewContext(fs.readFileSync(path.join(root,src),'utf8'),ctx);return get();},readPeshitta:async(book,source)=>{
  if(options.read)return options.read(book,source);
  if(!docs.has(book)){const d=JSON.parse(fs.readFileSync(path.join(root,'bundled',source.rel),'utf8'));d.textHash=crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex');docs.set(book,d);}
  return docs.get(book);
 },openSyriacPopup:async(...args)=>opened.push(args)};
 const ps=window.LibraryPeshittaTC.create(host);return {ps,opened,docs};
}
test('Ezekiel apparatus plus opens the exact source occurrence without loading a Peshitta reading column',async()=>{
 const f=fixture(),d=await f.ps.load('Ezekiel'),rows=f.ps.entries(d,[{ref:'Ezekiel 1:1',row:'1'}]);
 const row=rows.find(r=>r.html.includes('data-tc-ps-at="9"'));assert(row);assert.match(row.html,/class="tc-ps-word"/);
 const result=await f.ps.openWord({dataset:{tcPsWord:'Ezekiel 1:1',tcPsAt:'9'},isConnected:true});assert(result);
 assert.equal(f.opened.length,1);assert.equal(f.opened[0][1].source.id,'242118');assert.equal(f.opened[0][1].source.form,'ܗܘܝܬ');assert.equal(f.opened[0][1].source.ref,'1:1');
 assert.equal(f.opened[0][1].record.id,'242118');assert(f.opened[0][1].record.parts.length,'verified source morphology is supplied to the popup');
});
test('Repeated surface forms retain separate token IDs and shifted references use native Peshitta numbering',async()=>{
 const f=fixture();for(const book of ['Genesis','Daniel']){
  const d=await f.ps.load(book);
  if(book==='Genesis'){
   const [ref,v]=Object.entries(d.verses).find(([,v])=>v.sy.some((w,i)=>v.sy.indexOf(w)!==i)),form=v.sy.find((w,i)=>v.sy.indexOf(w)!==i),ids=v.sy.map((w,i)=>w===form?i:-1).filter(i=>i>=0);
   f.ps.entries(d,[{ref:book+' '+ref,row:'1'}]);
   const a=await f.ps.wordSource(book+' '+ref,ids[0]),b=await f.ps.wordSource(book+' '+ref,ids[1]);assert(a&&b);assert.notEqual(a.source.id,b.source.id);assert.equal(a.source.form,b.source.form);
  }else{
   const [ref,v]=Object.entries(d.verses).find(([ref,v])=>v.refs?.some(r=>r!==ref));assert(v);
   const at=v.refs.findIndex(r=>r!==ref);f.ps.entries(d,[{ref:book+' '+ref,row:'1'}]);const src=await f.ps.wordSource(book+' '+ref,at);assert(src);assert.equal(src.source.ref,v.refs[at]);assert.equal(src.source.mtRef,ref);
  }
 }
});
test('Changed source text, wrong IDs, invalid indexes and stale requests never open a card',async()=>{
 const f=fixture();const d=await f.ps.load('Ezekiel');f.ps.entries(d,[{ref:'Ezekiel 1:1',row:'1'}]);
 assert.equal(await f.ps.wordSource('Ezekiel 1:1',-1),null);assert.equal(await f.ps.wordSource('Ezekiel 1:1',999),null);
 await f.ps.wordSource('Ezekiel 1:1',9);const doc=f.docs.get('Ezekiel');doc.text[0][0]=doc.text[0][0].replace('ܗܘܝܬ','ܐܚܪܢܐ');
 assert.equal(await f.ps.wordSource('Ezekiel 1:1',9),null);assert.equal(f.opened.length,0);
 const g=fixture();const data=await g.ps.load('Ezekiel');g.ps.entries(data,[{ref:'Ezekiel 1:1',row:'1'}]);
 assert.equal(await g.ps.openWord({dataset:{tcPsWord:'Ezekiel 1:1',tcPsAt:'9'},isConnected:true},()=>false),false);assert.equal(g.opened.length,0);
 data.verses['1:1'].ids[9]='242109';assert.equal(await g.ps.wordSource('Ezekiel 1:1',9),null);
});
