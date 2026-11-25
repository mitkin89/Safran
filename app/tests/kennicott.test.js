'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto'),vm=require('node:vm');
const D=require('../kennicott-data'),K=require('../kennicott-core');
const entries=ref=>D.index[ref].map(id=>D.entries[id]);
test('Kennicott archive, license and complete original apparatus are retained',()=>{
  const raw=zlib.gunzipSync(fs.readFileSync(require.resolve('../tools/kennicott/001_gen.xml.gz')));
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),D.source.sha256);
  assert(raw.toString().includes(D.source.licenseUrl));assert.equal(D.source.license,'CC BY-NC-SA 4.0');
  assert.equal(Object.keys(D.entries).length,9129);assert.equal(Object.values(D.entries).reduce((n,e)=>n+e.readings.length,0),13016);
  assert.equal(Object.keys(D.base).length,1533);assert.equal(Object.keys(D.witnesses).length,721);
  for(const e of Object.values(D.entries)) {assert(e.refs.length);assert(e.raw.includes('app'));for(const r of e.readings){assert(r.nodes);assert.equal(r.nodes.attrs.wit||'',r.witnesses.join(' '));}}
  assert.match(D.glossary.frt,/cannot be recovered with any certainty/);
  const mt=fs.readFileSync(require.resolve('../bundled/'+D.source.mt.rel));assert.equal(crypto.createHash('sha256').update(mt).digest('hex'),D.source.mt.sha256);
});
test('Kennicott locates edition lemmas first, preserving ordinals and ranges',()=>{
  const ref='Genesis 1:2',e=entries(ref).find(e=>e.lemma.join(' ')==='על'&&e.ordinal[0]==='2°');assert(e);
  const at=K.locate(e,D.base[ref],D.mt[ref]);assert(at.anchor);assert.equal(K.cons(D.mt[ref][at.anchor.start]),'על');
  const first=D.mt[ref].findIndex(w=>K.cons(w)==='על');assert(at.anchor.start>first);
  const range=Object.values(D.entries).find(e=>e.refs.length>1);assert.equal(K.locate(range,D.base[range.refs[0]],D.mt[range.refs[0]]).anchor,null);
  const repeated={refs:['Genesis 1:1'],lemma:['כי'],ordinal:[],readings:[]};assert.equal(K.locate(repeated,['כי','אמר','כי'],['כי','אמר','כי']).anchor,null);
  const plene=entries(ref).find(e=>e.readings.some(r=>r.words[0]==='תוהו'));
  const located=K.locate(plene,D.base[ref],D.mt[ref]);assert.equal(located.method,'Wortvergleich (maschinell)');assert.equal(K.cons(D.mt[ref][located.anchor.start]),'תהו');
});
test('Graphical partial words are never promoted to complete lexical variants',()=>{
  const r=entries('Genesis 1:1')[0].readings.find(r=>r.words[0]==='בראש');assert(r);assert(K.graphic(r));
  assert.equal(r.words.join(' '),'בראש');assert(!r.words.includes('בראשית'));
});
test('Kennicott adapter preserves individual witnesses, uncertainty, source order and reference text',async()=>{
  const sandbox={window:{Kennicott:K}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../library-kennicott.js'),'utf8'),sandbox);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ui=sandbox.window.LibraryKennicott.create({esc,load:async()=>D});await ui.load();
  const out=ui.entries([{ref:'Genesis 1:2',row:'2'}]);assert(out.length);assert(out.some(e=>e.html.includes('תוהו')&&e.html.includes('K 9')));
  const omission=out.find(e=>e.html.includes('K 665'));assert(omission.html.includes('Auslassung'));
  const conjecture=Object.values(D.entries).find(e=>e.readings.some(r=>r.terms.some(t=>t.ref==='#frt')));
  assert(ui.entries([{ref:conjecture.refs[0],row:'x'}]).some(e=>e.html.includes('Vermutete frühere Lesung (unsicher)')));
  const preview=ui.preview({dataset:{tcKen:'gen-app-1'}});assert(preview.includes('kein vollständiger Handschriftentext'));assert(preview.includes('בראשית'));
  assert(!preview.includes('data-m='));assert(preview.includes('Handschrift:'));
  const all=ui.entries([{ref:'Genesis 1:2',row:'2'},{ref:'Genesis 1:2',row:'3'}]);assert.equal(all.length,out.length);assert(all.every(e=>e.rows.length===2));
});
test('Manuscript cards retain separate catalogue records and original facsimile links',async()=>{
  const sandbox={window:{Kennicott:K}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../library-kennicott.js'),'utf8'),sandbox);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ui=sandbox.window.LibraryKennicott.create({esc,load:async()=>D});await ui.load();
  const card=ui.witnessCard('K2');assert.match(card,/Bodleian Library/);assert.match(card,/Ms\. Arch\. Selden A\. 47/);assert.match(card,/Digitalisat öffnen/);assert.match(card,/Katalogeintrag öffnen · Ktiv/);
  for(const link of D.witnesses.K2[0].links)assert(card.includes('data-ken-url="'+esc(link.url)+'"'));
  const one=ui.witnessCard('K1');assert.equal((one.match(/data-ken-url=/g)||[]).length,D.witnesses.K1.reduce((n,d)=>n+new Set(d.links.map(l=>l.url)).size,0));
  assert.equal((ui.witnessCard('K3').match(/class="ken-witness-record"/g)||[]).length,D.witnesses.K3.length);
  assert(!ui.witnessCard('unknown').includes('data-ken-url'));assert.match(ui.witnessCard('unknown'),/Kein zugehöriger Katalogeintrag/);
});
test('External manuscript links accept only exact catalogue source URLs',()=>{
  const {approved}=require('../kennicott-external.cjs'),urls=require('../kennicott-links.json');assert(urls.length>100);
  for(const url of urls)assert.equal(approved(url),new URL(url).href);
  for(const url of [null,{},'javascript:alert(1)','file:///tmp/a','https://example.com/','https://digital.bodleian.ox.ac.uk/objects/forged/','https://digital.bodleian.ox.ac.uk.evil.example/','https://user:pass@digital.bodleian.ox.ac.uk/'])assert.equal(approved(url),null);
  assert.equal(approved(urls[0]+'forged'),null);
});
