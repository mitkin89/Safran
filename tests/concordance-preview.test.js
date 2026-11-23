'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const Preview=require('../concordance-preview'),{searchFiles}=require('../searchcore');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
test('Preview marks the exact occurrence in a full verse, including repeated words',()=>{
 const hit={context:'λόγος καὶ λόγος',positions:[3],words:['λόγος'],language:'Greek'};
 const html=Preview.render(hit,esc);assert(html.includes('λόγος καὶ <span class="pvhl">λόγος</span>'));
 assert.equal(Preview.render({...hit,positions:[9]},esc),null);
 assert.equal(Preview.render({...hit,words:['θεός']},esc),null);
 assert(Preview.render({...hit,context:'<script> λόγος',positions:[2]},esc).includes('&lt;script&gt;'));
});
test('Real Hebrew, Greek and Syriac alignments provide preview positions in their own editions',async()=>{
 const entries=require('../bundled/manifest.json').items.filter(e=>e.title==='Genesis'&&(/^(Westminster|ETCBC Peshitta)/.test(e.versionTitle)||e.versionTitle==='Septuaginta (CATSS)'));
 for(const query of ['ברא','ἐποίησεν','ܒܪܐ']){
  const r=await searchFiles({dir:path.join(__dirname,'../bundled'),entries,params:{query,concordance:true,crossLanguage:true,limit:1,perFile:1}});
  const hit=r.results[0];assert(Preview.render(hit,esc),query);
  for(const peer of hit.parallels)assert(Preview.render(peer,esc),query+' → '+peer.language);
 }
});
