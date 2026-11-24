'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const index=require('../masora-index.js'),report=require('../tools/masora/import-report.json'),D=require('../library-masora-data.js');
const root=path.join(__dirname,'..'),datasets=Object.fromEntries(index.manuscripts.map(m=>[m.id,require('../'+m.file)]));
test('published BIMA projection retains every selected context and reading with source provenance',()=>{
  if(!process.env.SAFRAN_MASORA_PARTIAL)assert.equal(index.complete,true,'A production import must account for all selected public pages');
  assert.equal(index.source.license,'CC BY-SA 4.0');
  assert.match(index.source.catalogueSha256,/^[a-f0-9]{64}$/);
  const pages=index.manuscripts.flatMap(m=>datasets[m.id].pages);
  assert.equal(pages.length,index.counts.pages);
  assert.equal(new Set(pages.map(p=>p.id)).size,pages.length);
  let contexts=0,readings=0,masora=0;
  for(const ms of index.manuscripts){
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,ms.file))).digest('hex'),ms.sha256);
    for(const p of datasets[ms.id].pages){
      assert.equal(p.published,1);assert.match(p.url,/^https:\/\/bima2\.corpusmasoreticum\.de\/manuscript\//);
      const source=report.pages.find(a=>a.page===p.id);assert(source);
      const values=p.contexts.map(c=>[c.uuid??null,c.type??null,c.label??null,c.readings.map(r=>[r.uuid??null,r.text??null,(r.references||[]).map(x=>x.label),r.notes||[]]),c.notes||[]]);
      assert.equal(crypto.createHash('sha256').update(JSON.stringify(values)).digest('hex'),source.textSha256,'source text/notes/references preserved');
      assert.match(source.sourceSha256,/^[a-f0-9]{64}$/);assert.equal(p.contexts.length,source.contexts);
      assert.equal(p.contexts.reduce((n,c)=>n+c.readings.length,0),source.readings);
      assert.equal(new Set(p.contexts.map(c=>c.uuid)).size,p.contexts.length);
      for(const c of p.contexts){contexts++;readings+=c.readings.length;if(['mp','mm','mf'].includes(c.type))masora++;}
    }
  }
  assert.equal(contexts,index.counts.contexts);assert.equal(readings,index.counts.readings);assert.equal(masora,index.counts.masoraContexts);
});
test('the Psalms source page has real Masorah text and an explicit page-level Bible link',()=>{
  const meta=index.manuscripts.find(m=>m.label==='B32inf.');assert(meta);
  const page=datasets[meta.id].pages.find(p=>p.id==='7f51c986-fc48-4540-891e-77349906660a');assert(page);
  assert(page.bibleRefs.includes('Ps 1:1'));assert(page.chapters.includes('Psalms 1'));
  const note=page.contexts.find(c=>c.type==='mp'&&c.label==='אשרי');assert(note);
  assert.equal(note.readings[0].text,'דׄ בִׄטִע֙');
  const hits=D.query(index,datasets,{book:'Psalms',chapter:1},{manuscript:meta.id,q:'אשרי'});
  assert(hits.some(h=>h.page.id===page.id&&h.entry.uuid===note.uuid));
  assert(hits.every(h=>h.entry.type!=='BibleText'));
});
test('citations in a Masorah list never become a note target or expand chapter scope',()=>{
  const page={id:'p',chapters:['Psalms 1'],bibleRefs:['Ps 1:1'],contexts:[{uuid:'c',type:'mm',label:'אשרי',readings:[{text:'ג',references:[{label:'Gen 2:3'}]}]}]};
  const i={manuscripts:[{id:'m',label:'fixture'}],chapters:{'Psalms 1':[['m','p']]},pages:{p:{manuscript:'m'}}},ds={m:{pages:[page]}};
  i.citations={'Genesis 2':[['m','p','c']]};
  assert.equal(D.query(i,ds,{book:'Genesis',chapter:2}).length,0);
  assert.equal(D.query(i,ds,{book:'Genesis',chapter:2},{scope:'citations'}).length,1);
  assert.equal(D.query(i,ds,{book:'Genesis',chapter:3},{scope:'citations'}).length,0);
  assert.equal(D.query(i,ds,{book:'Psalms',chapter:1}).length,1);
  assert.equal(D.query(i,ds,{book:'Genesis',chapter:2},{scope:'all',q:'Gen 2:3'}).length,1);
  assert.equal(D.query(i,ds,{book:'Psalms',chapter:1},{type:'mp'}).length,0);
});
test('hidden canonical placeholders are not manufactured into a transcription',()=>{
  assert.equal(D.text({text:'',features:[{status:-1,text:'not transcribed'},{status:1,pathText:'מׄ'}]}),'מׄ');
  assert.equal(D.text({text:'source text',features:[{text:'different path'}]}),'source text');
});

test('reference summaries retain gaps instead of implying unrecorded verses',()=>{
  assert.equal(D.referenceSummary(['Ps 1:1','Ps 1:2','Ps 1:4','Ps 2:1']), 'Ps 1:1–2 · Ps 1:4 · Ps 2:1');
});

test('duplicate Vatican folio labels never substitute unpublished sibling pages',()=>{
  const pub=['74d22022-9b14-434e-9087-3687b156621e','d1a1e7d9-f97c-4d7d-a2a0-a6cb801a95c2'];
  const notPublished=['89d10328-144e-4ac0-a333-fe558245cfc3','6344612c-fbf6-4e4c-bf53-d8bb27804458'];
  if(!process.env.SAFRAN_MASORA_PARTIAL)for(const id of pub)assert(index.pages[id]);
  for(const id of notPublished)assert.equal(index.pages[id],undefined);
});

test('the source type mf is Masora finalis, not a classification of figurative layout',()=>{
  const mf=Object.values(datasets).flatMap(m=>m.pages).flatMap(p=>p.contexts).filter(c=>c.type==='mf');
  assert(mf.length>0);
  for(const c of mf)assert.match(c.description,/Masora Finalis/i);
});


test('verse browsing uses BibleText coverage, never citations in the Masorah',()=>{
  const p={id:'p',bibleRefs:['Ps 1:1','Ps 1:3'],contexts:[{uuid:'bt',type:'BibleText',readings:[]},{uuid:'m',type:'mp',label:'דבר',readings:[{text:'ג',references:[{label:'Ps 1:2'}]}]}]};
  const i={manuscripts:[{id:'m'}],chapters:{'Psalms 1':[['m','p']]},pages:{p:{manuscript:'m'}}},ds={m:{pages:[p]}};
  assert.equal(D.query(i,ds,{book:'Psalms',chapter:1,verse:2},{scope:'verse'}).length,0);
  assert.equal(D.query(i,ds,{book:'Psalms',chapter:1,verse:3},{scope:'verse'}).length,1);
  assert(D.covers({bibleRefs:['Ps 1:3–5']},{book:'Psalms',chapter:1,verse:4}));
  assert(!D.covers({bibleRefs:['Ps 1:3–5']},{book:'Psalms',chapter:1,verse:6}));
});
test('word references match whole phrases and preserve ambiguity on the real Psalms page',()=>{
  const m=index.manuscripts.find(m=>m.label==='B32inf.');
  const p=datasets[m.id].pages.find(p=>p.id==='7f51c986-fc48-4540-891e-77349906660a');
  const note=p.contexts.find(c=>c.type==='mp'&&c.label==='אשרי');
  assert.deepEqual(D.locations(p,note).map(m=>m.label),['Psalms 1:1','Psalms 2:12']);
  const phrase=p.contexts.find(c=>c.type==='mp'&&c.label==='אשרי האיש');
  const hits=[note,phrase].map(entry=>({page:p,entry})),split=D.forVerse(hits,{book:'Psalms',chapter:1,verse:1});
  assert.equal(split.primary.length,1);assert.equal(split.primary[0].entry,phrase);
  assert.equal(split.related.length,1);assert.equal(split.related[0].entry,note);
  assert.deepEqual(D.locations(p,{uuid:'made-up',label:'שרי'}),[],'no substring matching');
  assert.deepEqual(D.locations(p,{uuid:'editorial',label:'אשרי I'}),[],'do not reinterpret editorial labels');
});
test('citation-only notes and repeated occurrences cannot manufacture a unique word anchor',()=>{
  const note={uuid:'m',label:'דבר',type:'mp',readings:[{text:'דבר',references:[{label:'Ps 1:1'}]}]};
  const p={bibleRefs:['Ps 1:1'],contexts:[note]};assert.deepEqual(D.locations(p,note),[]);
  const repeated={bibleRefs:['Ps 1:1'],contexts:[note,{type:'BibleText',readings:[{uuid:'r',text:'דבר דבר',references:[{label:'Ps 1:1'}]}]}]};
  assert.equal(D.locations(repeated,note).length,2);
  assert.equal(D.forVerse([{page:repeated,entry:note}],{book:'Psalms',chapter:1,verse:1}).primary.length,0);
});

test('Masorah explanations only infer explicit counts and preserve uncertain notes',()=>{
  const note={readings:[{text:'והנה אנכי הׄ וסימניהון'}, {text:'אנכי הולך היום',references:[{label:'Josh 23:14'}]},{text:'ודין',references:[{label:'Gen 28:15'}]}]};
  const before=JSON.stringify(note),e=D.explain(note);assert.equal(e.count,5);assert.equal(e.list,true);assert.equal(e.refs.length,2);assert.match(e.meaning,/5 Vorkommen/);assert.equal(JSON.stringify(note),before);
  assert.equal(D.explain({readings:[{text:'הׄ'}]}).count,5);
  assert.equal(D.explain({readings:[{text:'המלך'}]}).count,null);
  assert.equal(D.explain({readings:[{text:'ה מל'}]}).count,null);
  assert.match(D.explain({readings:[{text:'בלתי מובן'}]}).meaning,/nicht zuverlässig/);
  assert.equal(D.explain({readings:[{text:'מלא'}]}).features.length,1);
  assert.equal(D.explain({readings:[{text:'במלאכת'}]}).features.length,0);
});
test('Masorah word groups collect manuscript witnesses and follow source verse order',()=>{
  const make=(id,label,text)=>{const entry={uuid:id,label},page={id,contexts:[{type:'BibleText',readings:[{text,references:[{label:'Gen 28:15'}]}]}]};return {page,entry};};
  const a=make('a','אנכי','והנה אנכי עמך'),b=make('b','והנה','והנה אנכי עמך'),c=make('c','אנכי','והנה אנכי עמך');
  const groups=D.wordGroups([a,b,c]);assert.deepEqual(groups.map(g=>g.label),['והנה','אנכי']);assert.equal(groups[1].hits.length,2);
});

test('German Masorah aids distinguish uniqueness, qualified numbers and ordinary Hebrew words',()=>{
  const explain=text=>D.explain({label:'דבר',readings:[{text}]});
  for(const text of ['לׄ','ל']){assert.equal(explain(text).count,1);assert.match(explain(text).meaning,/einmalig/);}
  for(const [text,n]of [['בׄ דסׄ',2],['י״ב',12],['ט״ו',15],['ט״ז',16],['קלׄדׄ',134]])assert.equal(explain(text).count,n,text);
  assert.equal(explain('בׄ דסׄ').partial,true);assert.match(explain('בׄ דסׄ').meaning,/Einschränkung/);
  for(const text of ['מלא','מל','חסר','שם','קׄ','דבר'])assert.equal(explain(text).count,null,text+' is not safely a numeral');
  assert.match(explain('לׄ וחסׄ').meaning,/defektive/);
  assert.match(explain('בׄ בפתח').meaning,/Patach/);
  assert.match(explain('לׄ רפי').meaning,/ohne Dagesch/);
  assert.equal(D.explain({label:'מרחפת',readings:[{text:'מרחפת לׄ כותׄ'}]}).count,1);
});
test('the Munich Genesis note gives its explicit count while its unknown condition stays unresolved',()=>{
  const ms=index.manuscripts.find(m=>m.label==='Munich.Cod.hebr.2');
  const e=datasets[ms.id].pages.flatMap(p=>p.contexts).find(e=>e.uuid==='f2c81271-75c8-452b-a617-24a4ff0f32ea');
  const result=D.explain(e);assert.equal(result.count,2);assert.equal(result.partial,true);assert.deepEqual(result.refs,['Jer 32:27']);assert.match(result.meaning,/Vergleichsbelege/);
});
