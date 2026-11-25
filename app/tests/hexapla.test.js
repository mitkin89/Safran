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
  assert.match(html,/data-hx-fn="9"[^>]*>9<\/sup><span class="tc-hx-note" data-hx-fn="9" role="note" hidden><span class="tc-hx-note-n">9<\/span> <span lang="la">Philop/,'inline note right after its number; Latin when there is no translation');
  assert.doesNotMatch(html,/tc-hx-notes/,'no footnote block at the end');
  // Synopsis: one row per translator, words as in the LXX row folded
  const g26=hx.entries(d,[{ref:'Genesis 1:26',row:'26'}]).map(x=>x.html).join('');
  assert.match(g26,/<div class="tc-hx-syn">/);
  assert.equal((g26.match(/class="tc-hx-row-sig"/g)||[]).length>=4,true,'Ο΄, Ἀ., Σ., Θ. rows');
  assert.match(g26,/class="tc-hx-same"/);
  assert.match(g26,/class="tc-hx-syn-toggle"/);
  // row types against the LXX row
  assert.match(g26,/data-hx-type="wiedergabe"/);
  const g9=hx.entries(d,[{ref:'Genesis 1:9',row:'9'}]).map(x=>x.html).join('');
  assert.match(g9,/συστήτω.*data-hx-type="wiedergabe"/s,'short readings also get a row and a type');
  // a bracketed reading inside the LXX text is a row of its own: Gen 2:14 Ο΄. κατέναντι (Ἀ. ἐξ ἀνατολῆς) Ἀσσυρίων.
  const g214=hx.entries(d,[{ref:'Genesis 2:14',row:'14'}]).map(x=>x.html).join('');
  assert.doesNotMatch(g214,/κατέναντι<\/span>\s*\(/,'no dangling bracket in the LXX row');
  assert.match(g214,/tc-hx-row-sig">.{0,200}(’Α|Ἀ)\..{0,1200}ἀνατολῆς/s);
  assert.match(g214,/tc-hx-for"[^>]*>für <span lang="grc">κατέναντι<\/span>:<\/span>/,'the bracket row names the LXX word it stands for');
  // reviewed rows: Hos 11:7 ζυγόν = עֹל (other reading of the same consonants), Isa 19:18 Σ. ἡλίου = החרס
  const hos=await hx.load('Hosea'),h=hx.entries(hos,[{ref:'Hosea 11:7',row:'7'}]).map(x=>x.html).join('');
  assert.match(h,/ζυγὸν.*data-hx-type="deutung".*עֹל/s);
  const isa=await hx.load('Isaiah'),j=hx.entries(isa,[{ref:'Isaiah 19:18',row:'18'}]).map(x=>x.html).join('');
  assert.match(j,/ἡλίου.*data-hx-type="vorlage".*החרס/s);
  assert.match(html,/data-hx-an="\[\[&quot;γίνομαι&quot;/,'analysis for the word card');
  const g1=hx.entries(d,[{ref:'Genesis 1:1',row:'1'}]).map(x=>x.html).join('');
  assert.match(g1,/<span class="tc-hx-note-n">1<\/span> <span lang="en">CAP\. I\. Hieron[^<]*For both/,'English first');
  assert.match(g1,/<button type="button" class="tc-hx-la-toggle" aria-expanded="false">Latein<\/button><span class="tc-hx-la" lang="la" hidden> CAP\. I\. Hieron[^<]*Nam et LXX/,'Latin folded');
  for(const m of html.matchAll(/title="([^"]*)"/g))assert(!m[1].includes('<'),'markup inside title');
});

test('automatic MT overlap indications are possible alignments, not asserted agreements',async()=>{
 const hx=HX.create(host),d=await hx.load('Genesis'),rows=hx.entries(d,[{ref:'Genesis 3:15',row:'15'}]);
 rows.push({anchor:{kind:'word',start:10,end:10,ref:'Genesis 3:15'},html:'<article class="tc-lxx-reading" data-lxx-type="deutung"></article>'});hx.agree(rows);
 const html=rows.map(r=>r.html).join('');assert(html.includes('mögliche MT-Angleichung'));assert(!html.includes('>folgt dem MT<'));assert(html.includes('Eine Übereinstimmung mit dem MT ist damit nicht nachgewiesen.'));
});
