'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
test('Apparatus search includes every MAM difference with both readings and lost-codex provenance',async()=>{
 const window={},box={window};const run=p=>vm.runInNewContext(fs.readFileSync(path.join(root,p),'utf8'),box);
 for(const p of ['textcrit-traditions-data.js','library-textcrit-traditions.js','library-textcrit-aleppo.js','library-textcrit-search.js'])run(p);
 const host={$:()=>({addEventListener(){}}),esc:String,load:async(p,get)=>{if(!get())run(p);return get();}};
 const search=window.LibraryTextCritSearch.create(host),rows=await search.load(),ma=rows.filter(r=>r.w==='MA');
 let expected=0;for(const data of Object.values(window.ALEPPO_DIFF))for(const rs of Object.values(data.verses))expected+=rs.length;
 assert.equal(ma.length,expected);assert.equal(Object.keys(window.ALEPPO_DIFF).length,39);
 assert.deepEqual([...new Set(ma.map(r=>r.type))].sort(),['ma_a','ma_k','ma_p','ma_v','ma_w']);
 assert(ma.every(r=>!r.both&&!r.vorlage&&r.tags.length===0),'MAM readings are neither reconstructed Vorlagen nor shared LXX/Syr deviations');
 const point=ma.find(r=>r.book==='Hosea'&&r.ch===13&&r.v===15&&r.type==='ma_p');assert(point);assert.match(point.mt,/בֵּ/);assert.match(point.ma,/בֵּ/);assert.notEqual(point.mt,point.ma);
 const genesis=ma.find(r=>r.book==='Genesis');assert(genesis.note.includes('Aleppo-Kodex verloren'));assert(genesis.en.includes('Codex is lost'));
 const surviving=ma.find(r=>r.book==='Hosea');assert(!surviving.note.includes('Aleppo-Kodex verloren'));
 assert(window.LibraryTextCritSearch.TYPES.aleppo);for(const kind of ['k','p','v','a','w'])assert(window.LibraryTextCritSearch.TYPES['ma_'+kind]);
 assert.strictEqual(await search.load(),rows,'Loaded corpus is reused');
});
