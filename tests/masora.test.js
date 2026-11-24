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
