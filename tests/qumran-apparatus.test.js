'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),vm=require('node:vm');
const D=require('../qumran-apparatus'),Q=require('../qumran-apparatus-core'),C=require('../textcrit-core');
const source=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'../tools/dss/genesis-source.json.gz'))));
test('Genesis source retains original word/morpheme text, physical references and character-level annotations',()=>{
  const raw=fs.readFileSync(path.join(__dirname,'../tools/dss/genesis-source.json.gz'));
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),D.source.extractSha256);
  const nodes=new Map(source.words.map(w=>[w.node,w])),seen=new Set();let rec=0,unc=0,missing=0;
  for(const [ref,segments] of Object.entries(D.verses))for(const s of segments)for(const t of s.tokens){
    assert.equal(t.text,t.parts.map(p=>p.text).join(''));
    for(const p of t.parts){
      const original=nodes.get(p.node);assert(original);assert.equal(original.ref,ref);
      const f=original.features;assert.equal(Q.cons(original.signs.map(s=>s.glyph||'').join('')),Q.cons(f.glyph||''),'Character indexing must agree with the original word glyph');assert.equal(p.text,f.full+(f.punc&&!f.full.endsWith(f.punc)?f.punc:''));
      assert(!seen.has(p.node));seen.add(p.node);
      assert(original.locations.some(l=>l.scroll[1]===s.scroll&&l.fragment[1]===s.fragment));
    }
    rec+=!!t.flags.rec;unc+=!!t.flags.unc;missing+=!!t.flags.missing;
  }
  assert.equal(seen.size,7902);assert.equal(seen.size,nodes.size);
  assert.equal(Object.keys(D.verses).length,338);assert(rec>4000&&unc>800&&missing>50);
  assert.match(D.source.license,/BY-NC 4.0/);
  const mt=fs.readFileSync(path.join(__dirname,'../bundled',D.source.mt.rel));
  assert.equal(crypto.createHash('sha256').update(mt).digest('hex'),D.source.mt.sha256);
});
test('Damaged, reconstructed and ambiguous fragments never manufacture MT omissions or definite variants',()=>{
  const token=(text,flags={})=>({text,flags,parts:[],letters:Q.cons(text).length,reconstructedLetters:flags.rec?Q.cons(text).length:0});
  const recon=[token('[אב]',{rec:['1']}),token('[גד]',{rec:['1']})];
  assert.deepEqual(Q.align(recon,['אב','גד']),[undefined,undefined]);
  assert.equal(Q.remarks({tokens:recon},['אב','גד']).length,0);
  assert.deepEqual(Q.align([token('כי')],['כי','אמר','כי']),[undefined]);
  const partial=[token('ברא'),token('אלהים')];
  assert.deepEqual(Q.align(partial,['בראשית','ברא','אלהים','את','השמים']),[1,2]);
  assert.equal(Q.remarks({tokens:partial},['בראשית','ברא','אלהים','את','השמים']).length,0);
  const gap=Q.remarks({tokens:[token('ε',{missing:['1']})]},['אמר']);
  assert.equal(gap[0].status,'Lücke');assert.equal(gap[0].different,false);assert.equal(gap[0].anchor,null);
});
test('Attested Genesis 1:5 reading and conservative spelling filter have stable MT positions',()=>{
  const ref='Genesis 1:5',s=D.verses[ref].find(s=>s.scroll==='4Q7');
  const r=Q.remarks(s,D.mt[ref]).find(r=>r.token.text==='יומם');assert(r);assert(r.anchor);
  assert.equal(Q.cons(D.mt[ref][r.anchor.start]),'יומ');assert(r.different);assert(Q.certain(r.token));
  const spellingRef='Genesis 1:21',segment=D.verses[spellingRef].find(s=>s.scroll==='4Q4');
  const spelling=Q.remarks(segment,D.mt[spellingRef]).find(r=>r.token.text==='התנינים');
  assert(spelling);assert(Q.spelling(spelling.token,D.mt[spellingRef][spelling.anchor.start],D.mtMeta[spellingRef][spelling.anchor.start]));
  assert(!Q.spelling(r.token,D.mt[ref][r.anchor.start],D.mtMeta[ref][r.anchor.start]));
});
test('Genesis adapter keeps witnesses, source nodes, uncertainty and raw context; filters only supported spelling candidates',async()=>{
  const sandbox={window:{QumranApparatus:Q,TextCrit:C}};vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../library-qumran.js'),'utf8'),sandbox);
  const esc=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const ui=sandbox.window.LibraryQumran.create({esc,load:async()=>D});await ui.load();
  const queries=[{ref:'Genesis 1:5',row:'5'}],entries=ui.entries(queries,true),reading=entries.find(e=>e.html.includes('יומם'));
  assert(reading);assert.match(reading.html,/4Q7/);assert.match(reading.html,/Quellknoten/);
  assert.equal(reading.anchor.ref,'Genesis 1:5');
  const ref='Genesis 1:21';assert(ui.entries([{ref,row:'21'}],true).length>ui.entries([{ref,row:'21'}],false).length);
  const key='Genesis 1:5|'+D.verses['Genesis 1:5'].findIndex(s=>s.scroll==='4Q7');
  const preview=ui.preview({dataset:{tcDss:key}});
  assert(preview.includes('moderne Rekonstruktion'));assert(preview.includes('4Q7'));
  assert(preview.includes('['));assert(!preview.includes('LXX'));
});
