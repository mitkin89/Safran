'use strict';
// Apparatus witness „Hex“: Field, Hexapla (1875) – data integrity and rendering.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),box={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'library-textcrit-hexapla.js'),'utf8'),box);
const HX=box.window.LibraryHexaplaTC;
const host={esc:s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]),load:async(src,get)=>{if(!get())vm.runInNewContext(fs.readFileSync(path.join(root,src),'utf8'),box);return get();}};
const manifest=require('../bundled/manifest.json');
test('every lemma lies inside its MT verse and every footnote exists',async()=>{
  for(const book of HX.BOOKS){
    const d=await HX.create(host).load(book),he=JSON.parse(fs.readFileSync(path.join(root,'bundled',manifest.items.find(e=>e.title===book&&(e.versionTitle||'').startsWith('Westminster')).rel))).text;
    for(const [ref,list] of Object.entries(d.verses)){
      const [c,v]=ref.split(':').map(Number),n=(he[c-1][v-1].match(/<span class="w"/g)||[]).length;
      for(const u of list){assert(u.s>=-1&&u.e<n&&u.s<=u.e,book+' '+ref);for(const k of u.fn)assert(d.notes[k],book+' '+ref+' '+k);}
    }
  }
});
test('readings render sigla, hexaplaric signs and footnote tooltips without breaking markup',async()=>{
  const hx=HX.create(host),d=await hx.load('Genesis');
  const e=hx.entries(d,[{ref:'Genesis 4:8',row:'8'}]);assert(e.length);
  const html=e.map(x=>x.html).join('');assert.match(html,/class="tc-hx-sign"/);assert.match(html,/class="tc-hx-fn"/);
  for(const m of html.matchAll(/title="([^"]*)"/g))assert(!m[1].includes('<'),'markup inside title');
  const f=hx.entries(d,[{ref:'Genesis 1:9',row:'9'}]);assert(f.some(x=>x.anchor.kind==='gap'));assert(f.some(x=>/Οἱ Γ΄/.test(x.html)));
});
test('Greek words of the readings carry a morphology tooltip (hexapla-morph.js)',async()=>{
  vm.runInNewContext(fs.readFileSync(path.join(root,'gmorph.js'),'utf8'),box);
  const hx=HX.create(host),d=await hx.load('Genesis');
  assert(box.window.HEXAPLA_MORPH&&box.window.HEXAPLA_MORPH.F['ἐγένετο'],'morphology loaded');
  const html=hx.entries(d,[{ref:'Genesis 1:3',row:'3'}]).map(x=>x.html).join('');
  assert.match(html,/<span class="tc-hx-w" tabindex="0" role="button" data-tc-hx="γίνομαι – Verb, Aorist/);
  assert.doesNotMatch(html,/class="tc-hx-w" title=/,'morphology only on click');
  assert.match(html,/class="tc-hx-sig" tabindex="0" title="Ο΄ = die Septuaginta/);
  assert.match(html,/title="Ἀ\. = Aquila/);
  assert.match(html,/<details class="tc-hx-note" data-hx-fn="9"><summary>Fußnote 9<\/summary><p lang="la">Philop/,'note without translation shows the Latin');
  const g1=hx.entries(d,[{ref:'Genesis 1:1',row:'1'}]).map(x=>x.html).join('');
  assert.match(g1,/<summary>Fußnote 1<\/summary><p lang="en">CAP\. I\. Hieron[^<]*For both/,'English first');
  assert.match(g1,/<details class="tc-hx-la"><summary>Lateinischer Text \(Field\)<\/summary><p lang="la">CAP\. I\. Hieron[^<]*Nam et LXX/,'Latin folded');
  for(const m of html.matchAll(/title="([^"]*)"/g))assert(!m[1].includes('<'),'markup inside title');
});
