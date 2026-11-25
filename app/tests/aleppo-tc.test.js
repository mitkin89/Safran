'use strict';
// Apparatus witness „MA“: Aleppo text (MAM) against the Leningrad text (OSHB).
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),box={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'library-textcrit-aleppo.js'),'utf8'),box);
const host={esc:s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]),load:async(src,get)=>{if(!get())vm.runInNewContext(fs.readFileSync(path.join(root,src),'utf8'),box);return get();}};
const manifest=require('../bundled/manifest.json');
test('BHQ-type ML/MA differences in Hosea are found and anchored to the right MT word',async()=>{
  const ma=box.window.LibraryAleppoTC.create(host),d=await ma.load('Hosea');
  const he=JSON.parse(fs.readFileSync(path.join(root,'bundled',manifest.items.find(e=>e.title==='Hosea'&&(e.versionTitle||'').startsWith('Westminster')).rel))).text;
  const word=(c,v,i)=>[...he[c-1][v-1].matchAll(/<span class="w"[^>]*>(.*?)<\/span>/g)][i][1].replace(/<[^>]*>/g,'');
  // 13:15 בֵּן (ML) / בֵּין (MA), 8:11 מִזְבְּחֹת / מִזְבְּחוֹת
  const N=x=>x.normalize('NFC'),e=ma.entries(d,[{ref:'Hosea 13:15',row:'15'}],false),hit=e.find(x=>N(x.html).includes(N('בֵּ֥ין')));
  assert(hit&&hit.anchor.kind==='word'&&N(word(13,15,hit.anchor.start))===N('בֵּ֥ן'),'13:15 anchored to בֵּן');
  assert.equal(hit.lz.op,'orth','only י more: plene/defective');
  assert(ma.entries(d,[{ref:'Hosea 8:11',row:'11'}],false).some(x=>N(x.html).includes(N('מִזְבְּח֖וֹת'))));
  // accents only when asked for
  const all=Object.keys(d.verses).flatMap(v=>ma.entries(d,[{ref:'Hosea '+v,row:'1'}],true)),plain=Object.keys(d.verses).flatMap(v=>ma.entries(d,[{ref:'Hosea '+v,row:'1'}],false));
  assert(all.length>plain.length&&plain.every(x=>!/data-ma-kind="a"/.test(x.html)));
});
test('every anchor lies inside its MT verse',async()=>{
  const ma=box.window.LibraryAleppoTC.create(host);
  for(const book of box.window.LibraryAleppoTC.BOOKS){
    const d=await ma.load(book),he=JSON.parse(fs.readFileSync(path.join(root,'bundled',manifest.items.find(e=>e.title===book&&(e.versionTitle||'').startsWith('Westminster')).rel))).text;
    for(const [ref,list] of Object.entries(d.verses)){const [c,v]=ref.split(':').map(Number),n=(he[c-1][v-1].match(/<span class="w"/g)||[]).length;
      for(const [s,e] of list)assert(s>=-1&&s<n&&e<n&&(e<0||e>=s),book+' '+ref);}
  }
});
