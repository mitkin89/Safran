'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),vm=require('node:vm');
const I=require('../qumran-apparatus-index'),Q=require('../qumran-apparatus-core'),C=require('../textcrit-core');
const root=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
test('Full biblical DSS corpus preserves every source node, sign annotation and per-book provenance',()=>{
 let verses=0,tokens=0,nodes=0;const scrolls=new Set();
 assert.equal(Object.keys(I.books).length,36);assert.deepEqual(I.unavailable,['Nehemiah','I Chronicles','Esther']);
 for(const [book,meta]of Object.entries(I.books)){
  const file=path.join(root,meta.file),D=require(file);assert.equal(sha(fs.readFileSync(file)),meta.sha256,book);
  const sf=book==='Genesis'?'genesis-source.json.gz':'apparatus-source/'+book+'.json.gz',sourceRaw=fs.readFileSync(path.join(root,'tools/dss',sf)),source=JSON.parse(zlib.gunzipSync(sourceRaw));
  assert.equal(sha(sourceRaw),D.source.extractSha256,book);assert.equal(D.source.commit,I.source.commit);assert.equal(D.source.license,'CC BY-NC 4.0');
  const original=new Map(source.words.map(w=>[w.node,w])),seen=new Set();
  const audit=require(path.join(root,'tools/dss',book==='Genesis'?'genesis-apparatus-audit.json':'apparatus-audit/'+book+'.json'));
  const excluded=new Set(audit.excluded.map(w=>w.node));
  assert.equal(sha(fs.readFileSync(path.join(root,'bundled',D.source.mt.rel))),D.source.mt.sha256);
  for(const [ref,segments]of Object.entries(D.verses)){
   assert(ref.startsWith(book+' '));assert(D.mt[ref].length,ref);verses++;
   for(const s of segments){scrolls.add(s.scroll);for(const t of s.tokens){tokens++;
    assert.equal(t.text,t.parts.map(p=>p.text).join(''));
    for(const p of t.parts){const o=original.get(p.node);assert(o,book+' '+p.node);assert.equal(o.ref,ref);assert(!seen.has(p.node));seen.add(p.node);
     assert.deepEqual(p.signs,o.signs);assert.equal(p.text,o.features.full+(o.features.punc&&!o.features.full.endsWith(o.features.punc)?o.features.punc:''));
     assert(o.locations.some(l=>l.scroll?.[1]===s.scroll&&l.fragment?.[1]===s.fragment));
    }
   }}
  }
  for(const w of source.words)assert(seen.has(w.node)||excluded.has(w.node),'No silently lost source node '+w.node);
  assert.equal(source.words.length,meta.counts.sourceWords);nodes+=source.words.length;
  delete require.cache[require.resolve(file)];
 }
 assert.equal(verses,8017);assert.equal(tokens,158867);assert.equal(nodes,212355);assert.equal(scrolls.size,262);
});
test('Isaiah 53:11 אור remains an attested word; verified interlinear supplies its insertion position',()=>{
 const D=require('../qumran-apparatus/Isaiah'),ref='Isaiah 53:11',ss=D.verses[ref],s=ss.find(s=>s.scroll==='1Qisaa');
 const a=Q.interlinearAnchors(ss,D.mt[ref],D.interlinear['53:11']);
 const r=Q.remarks(s,D.mt[ref],a).find(r=>r.token.text==='אור');assert(r);assert(Q.certain(r.token));assert.equal(r.method,'interlinear');
 assert.deepEqual(r.anchor,{kind:'gap',start:2,end:2});assert.equal(r.status,'Möglicher Zusatz');
 assert.equal(Q.cons(D.mt[ref][r.anchor.start]),'יראה');
});
test('DSS adapter loads requested books independently, including multiword titles, with empty coverage left empty',async()=>{
 const sandbox={window:{QumranApparatus:Q,TextCrit:C}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'library-qumran.js'),'utf8'),sandbox);
 const calls=[],esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const ui=sandbox.window.LibraryQumran.create({esc,load:async file=>{calls.push(file);return require(path.join(root,file));}});
 await Promise.all([ui.load('I Samuel'),ui.load('Isaiah')]);await ui.load('Isaiah');
 assert.equal(calls.filter(f=>f==='qumran-apparatus/Isaiah.js').length,1);assert(!calls.includes('qumran-apparatus.js'));
 assert(ui.entries([{ref:'I Samuel 1:24',row:'24'}],true).some(e=>e.html.includes('4Q51')));
 const ref='Isaiah 53:11',out=ui.entries([{ref,row:'11'}],true);assert(out.some(e=>e.anchor?.kind==='gap'&&e.html.includes('אור')));
 const d=require('../qumran-apparatus/Isaiah'),i=d.verses[ref].findIndex(s=>s.scroll==='1Qisaa');
 assert(ui.preview({dataset:{tcDss:ref+'|'+i}}).includes('1Qisaa'));
 await ui.load('Esther');assert.equal(ui.entries([{ref:'Esther 1:1',row:'1'}],true).length,0);assert.equal(ui.coverage([{ref:'Esther 1:1',row:'1'}]),'');
});

test('DSS preview retains parentheses around antique supralinear insertions (Isaiah 1:1)',async()=>{
 const sandbox={window:{QumranApparatus:Q,TextCrit:C}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'library-qumran.js'),'utf8'),sandbox);
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const ui=sandbox.window.LibraryQumran.create({esc,load:async file=>require(path.join(root,file))});await ui.load('Isaiah');
 const ref='Isaiah 1:1',D=require('../qumran-apparatus/Isaiah'),index=D.verses[ref].findIndex(s=>s.scroll==='1Qisaa');ui.entries([{ref,row:'1'}],true);
 const preview=ui.preview({dataset:{tcDss:ref+'|'+index}}),text=preview.replace(/<[^>]*>/g,'');
 assert(text.includes('בי(ו)מי'));assert(text.includes('יש(ע)יהו'));assert(text.includes('(י)חזקיה'));assert(preview.includes('Antiker Nachtrag über der Zeile'));
});
