'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
function fixture(){const s={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../mishnah-textcrit-data.js'),'utf8'),s);return s.window.MISHNAH_TEXTCRIT;}
test('Berakhot preserves three independently licensed TEI witnesses and their source corrections',()=>{
 const d=fixture();for(const [sig,n]of [['K',57],['P',57],['C',59]]){const w=d.witnesses[sig],raw=zlib.gunzipSync(fs.readFileSync(require.resolve('../tools/mishnah/sources/'+w.id+'.xml.gz')));assert.equal(Object.keys(w.units).length,n);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),w.sha256);assert.equal(w.license,'CC BY 4.0');for(const [ref,u]of Object.entries(w.units)){assert(u.raw.includes(w.id+'.1.1.'+ref.replace(':','.')));assert(raw.includes(Buffer.from(u.id)));assert(u.words.length);}}
 const u=d.witnesses.K.units['1:1'];assert(u.annotations.some(a=>a.tag==='del'&&a.text.includes('פסחים')));assert(!u.text.includes('ואכילת פסחים'));assert(u.raw.includes('strikeThrough'));assert(u.annotations.some(a=>a.tag==='add'&&a.attrs.place==='implied'));
 const c=Object.values(d.witnesses.C.units);assert(c.some(u=>u.annotations.some(a=>a.tag==='gap')));
 for(const r of d.records){assert(d.witnesses.K.units[r.ref]);for(const [ref,i]of r.base)assert(d.witnesses.K.units[ref].words[i]);for(const [ref,i]of r.reading)assert(d.witnesses[r.witness].units[ref].words[i]);if(r.reading.some(([ref,i])=>d.witnesses[r.witness].units[ref].words[i].text.includes('□')))assert(r.uncertain);}
});
test('Pilot adapter shows original corrections, all chapter references and uncertainty separately',async()=>{
 const d=fixture(),s={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../library-mishnah-textcrit.js'),'utf8'),s);const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const ui=s.window.LibraryMishnahTextCrit.create({esc,load:async()=>d});await ui.load();assert.equal(ui.refs(1).length,5);const html=ui.render(1,['1:1'],['K','P','C'],'apparatus');assert(html.includes('Parma'));assert(html.includes('Cambridge'));assert(html.includes('Keine vollständig geprüfte kritische Edition'));assert(!html.includes('tc-mt-jump'));const pv=ui.preview({dataset:{tcMishnah:'K|1:1'}});assert(pv.includes('Streichung'));assert(pv.includes('ואכילת'));assert(pv.includes('Original-TEI'));assert(!ui.render(1,['1:1'],['K'],'apparatus').includes('tc-mishnah-entry'));
});

test('All manuscript words occur exactly once as linked groups or unresolved source words',()=>{
 const d=fixture();for(const sig of ['P','C']){
  const seen=new Set();let open=0,linked=0;
  for(const chapter of Object.values(d.interlinear.chapters)){
   for(const l of chapter[sig].links){
    assert(d.witnesses.K.units[l.ref]);assert(new Set(l.base.map(x=>x[0])).size<=1);
    for(const [r,i]of l.base)assert(d.witnesses.K.units[r].words[i]);
    for(const [r,i]of l.reading){const key=r+'|'+i;assert(!seen.has(key),key);seen.add(key);linked++;const w=d.witnesses[sig].units[r].words[i];assert(!w.flags.some(f=>['damage','unclear','gap'].includes(f)));}
   }
   for(const o of chapter[sig].open){const key=o.reading.join('|');assert(!seen.has(key),key);seen.add(key);open++;}
  }
  assert.equal(seen.size,Object.values(d.witnesses[sig].units).reduce((n,u)=>n+u.words.length,0));assert.equal(open,d.interlinear.counts[sig].open);
 }
 assert.equal(d.interlinear.counts.P.reviewed,2);
 for(const w of Object.values(d.witnesses))for(const u of Object.values(w.units))for(const token of u.words)assert.equal(u.offsetText.slice(token.start,token.end),token.text);
 const t=d.tosefta;assert.equal(t.records.length,53);assert.equal(t.records.reduce((n,r)=>n+r.unresolvedIds.length,0),758);assert.equal(t.records.filter(r=>r.checkedPassage).length,1);assert.equal(t.reading.source.heLicense,'Public Domain');assert(!('en' in t.reading));assert.equal(t.reading.text.length,7);
 for(const r of t.records)if(!r.checkedPassage)assert.equal(r.pdRefs.length,0);
});
test('Interlinear renders every source word once, marks differences red and retains original annotations on hover',async()=>{
 const d=fixture(),s={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../library-mishnah-textcrit.js'),'utf8'),s);const ui=s.window.LibraryMishnahTextCrit.create({esc:t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),load:async()=>d});await ui.load();
 const seen={K:new Set(),P:new Set(),C:new Set()};for(let ch=1;ch<=9;ch++){
  const html=ui.render(ch,ui.refs(ch),['K','P','C']);assert(html.includes('mci-column'));assert(html.includes('mt-diff'));
  for(const m of html.matchAll(/data-tc-mishnah="([KPC])\|([^"]+)" data-tc-mishnah-word="([^"]+)"/g)){assert(!seen[m[1]].has(m[3]),m[1]+' '+m[3]);seen[m[1]].add(m[3]);}
 }
 for(const sig of ['K','P','C'])assert.equal(seen[sig].size,Object.values(d.witnesses[sig].units).reduce((n,u)=>n+u.words.length,0));
 const preview=ui.preview({dataset:{tcMishnah:'P|1:1',tcMishnahWord:'1:1|17'}});assert(preview.includes('<mark>וחכמין</mark>'));assert(preview.includes('Original-TEI'));
 const t=ui.render(1,['1:1'],['K'],'tosefta');assert(t.includes('מאימתי קורין'));assert(t.includes('Projektzählung'));assert(t.includes('Public Domain'));assert(!t.includes('mt-diff'));
});
