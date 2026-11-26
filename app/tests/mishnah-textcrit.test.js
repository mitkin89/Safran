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
    for(const [r,i]of l.reading){const key=r+'|'+i;assert(!seen.has(key),key);seen.add(key);linked++;const w=d.witnesses[sig].units[r].words[i];if(w.text.includes('□')||w.flags.some(f=>['damage','unclear','gap'].includes(f)))assert.equal(l.uncertain,true);}
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
  const ordered={K:[],P:[],C:[]};
  for(const m of html.matchAll(/data-tc-mishnah="([KPC])\|([^"]+)" data-tc-mishnah-word="([^"]+)"/g)){assert(!seen[m[1]].has(m[3]),m[1]+' '+m[3]);seen[m[1]].add(m[3]);ordered[m[1]].push(m[3]);}
  for(const sig of ['K','P','C'])assert.deepEqual(ordered[sig],Object.entries(d.witnesses[sig].units).filter(([r])=>r.startsWith(ch+':')).flatMap(([r,u])=>Array.from(u.words,(_,i)=>r+'|'+i)));
 }
 for(const sig of ['K','P','C'])assert.equal(seen[sig].size,Object.values(d.witnesses[sig].units).reduce((n,u)=>n+u.words.length,0));
 const preview=ui.preview({dataset:{tcMishnah:'P|1:1',tcMishnahWord:'1:1|17'}});assert(preview.includes('<mark>וחכמין</mark>'));assert(preview.includes('Original-TEI'));
 const t=ui.render(1,['1:1'],['K'],'tosefta');assert(t.includes('מאימתי קורין'));assert(t.includes('Projektzählung'));assert(t.includes('Public Domain'));assert(!t.includes('mt-diff'));
});

test('Main-reader hover describes the selected source word without repeating the passage',async()=>{
 const d=fixture(),sandbox={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../library-mishnah-textcrit.js'),'utf8'),sandbox);
 const ui=sandbox.window.LibraryMishnahTextCrit.create({esc:s=>String(s),load:async()=>d});await ui.load();
 const reviewed=ui.metadataPreview({dataset:{tcMishnah:'P|1:1',tcMishnahWord:'1:1|17'}});
 assert(reviewed.includes('Geprüfte Zuordnung'));assert(reviewed.includes('Transkriptionswort 18'));assert(reviewed.includes('S00483.1.1.1.1'));assert(!reviewed.includes(d.witnesses.P.units['1:1'].text));assert(!reviewed.includes('tc-mishnah-context'));assert(!reviewed.includes('Original-TEI'));
 const k=d.witnesses.P.units['1:1'],choice=k.annotations.find(a=>a.tag==='choice'&&a.expansion),i=k.words.findIndex(w=>w.start<choice.end&&w.end>choice.start);
 const abbreviation=ui.metadataPreview({dataset:{tcMishnah:'P|1:1',tcMishnahWord:'1:1|'+i}});assert(abbreviation.includes(choice.expansion));assert(abbreviation.includes('Abkürzung und Auflösung'));
 const gap=d.interlinear.chapters['1'].C.links.find(l=>l.kind==='source-gap'),pair=gap.reading[0];
 const positioned=ui.metadataPreview({dataset:{tcMishnah:'C|'+pair[0],tcMishnahWord:pair.join('|')}});assert(positioned.includes('Lücke zwischen belegten Nachbarwörtern'));
});

test('Source gaps are positioned between actual neighbours and the nested Cambridge name survives preprocessing',()=>{
 const d=fixture(),chapter=d.interlinear.chapters['1'].C;
 for(const i of [6,7]){
  const l=chapter.links.find(l=>l.reading.some(([r,n])=>r==='1:5'&&n===i));assert(l);assert.equal(l.kind,'project');assert.equal(l.checked,false);
 }
 const name=chapter.links.find(l=>l.reading.some(([r,n])=>r==='1:5'&&n===7));
 assert(name.projectWords.C.includes('S01520.1.1.1.5.00070'));assert.equal(d.witnesses.C.units['1:5'].words[7].text,'לַעְזַר');
 let gaps=0;for(const [ch,c]of Object.entries(d.interlinear.chapters)){
  const stream=Object.entries(d.witnesses.C.units).filter(([r])=>r.startsWith(ch+':')).flatMap(([r,u])=>u.words.map((_,i)=>r+'|'+i));
  for(const l of c.C.links.filter(l=>l.kind==='source-gap')){
   assert.equal(l.base.length,0);assert.equal(l.checked,false);assert.equal(l.uncertain,true);
   const first=stream.indexOf(l.reading[0].join('|')),last=stream.indexOf(l.reading.at(-1).join('|'));
   if(l.sourceAnchors.left)assert.equal(l.sourceAnchors.left.join('|'),stream[first-1]);
   if(l.sourceAnchors.right)assert.equal(l.sourceAnchors.right.join('|'),stream[last+1]);
   for(const [r,i]of l.reading){assert.equal(d.witnesses.C.units[r].words[i].text,'□');gaps++;}
  }
 }
 assert.equal(gaps,36);assert.equal(d.interlinear.counts.C.positionedGaps,36);assert.equal(d.interlinear.counts.C.open,0);
 for(const totals of Object.values(d.interlinear.counts))assert.equal(totals.words,totals.aligned+totals.insertions+totals.positionedGaps+totals.open);
});

test('Project CollateX links preserve Cambridge gaps and Parma spelling variants without claiming review',async()=>{
 const d=fixture();assert.equal(d.interlinear.version,2);assert(d.interlinear.method.includes('CollateX'));
 const link=(sig,i)=>d.interlinear.chapters['1'][sig].links.find(l=>l.reading.some(([r,n])=>r==='1:1'&&n===i));
 const parma=link('P',71);assert.deepEqual(Array.from(parma.base,p=>Array.from(p)),[['1:1',71]]);assert.equal(parma.checked,false);
 const cambridge=link('C',9);assert.deepEqual(Array.from(cambridge.reading,p=>Array.from(p)),[['1:1',9],['1:1',10],['1:1',11]]);
 assert.equal(cambridge.uncertain,true);assert.equal(cambridge.checked,false);assert(cambridge.projectWords.C.includes('S01520.1.1.1.1.00100'));
 const besideGap=d.interlinear.chapters['1'].C.links.find(l=>l.base.some(([r,i])=>r==='1:1'&&i===10));
 assert.equal(besideGap.reading.length,0);assert.equal(besideGap.uncertain,true);
 assert.equal(d.witnesses.C.units['1:1'].words[10].text,'□');
 const s={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../library-mishnah-textcrit.js'),'utf8'),s);
 const ui=s.window.LibraryMishnahTextCrit.create({esc:String,load:async()=>d});await ui.load();const html=ui.render(1,['1:1'],['K','C']);
 assert(html.includes('automatische Wortzuordnung nach Digital Mishnah'));
 assert(ui.metadataPreview({dataset:{tcMishnah:'C|1:1',tcMishnahWord:'1:1|9'}}).includes('beschädigt / unsicher'));
 for(const chapter of Object.values(d.interlinear.chapters))for(const sig of ['P','C'])for(const l of chapter[sig].links){
  if(l.checked)assert.equal(l.kind,'reviewed');else assert.equal(l.method,'Digital Mishnah / CollateX (automated)');
 }
});
