'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const index=require('../masora-index.js'),report=require('../tools/masora/import-report.json'),D=require('../library-masora-data.js');
D.setWordLinks(require('../masora-word-links.js'));
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
  assert.equal(split.primary.length,2);assert(split.primary.some(h=>h.entry===phrase));assert(split.primary.some(h=>h.entry===note));
  assert.equal(split.related.length,0);
  for(const verse of [1,2]){const chapter=verse===1?1:2,v=verse===1?1:12;assert.equal(D.forVerse([{page:p,entry:note}],{book:'Psalms',chapter,verse:v}).primary.length,1);}
  const title=p.contexts.find(c=>c.label==='מזמור לדוד');assert(title);for(const chapter of [3,4])assert.equal(D.forVerse([{page:p,entry:title}],{book:'Psalms',chapter,verse:1}).primary.length,1);
  assert.deepEqual(D.locations(p,{uuid:'made-up',label:'שרי'}),[],'no substring matching');
  assert.deepEqual(D.locations(p,{uuid:'editorial',label:'אשרי I'}),[],'do not reinterpret editorial labels');
});
test('Job 2:13 Masorah heads resolve through explicit Hebrew context and source suffixes',()=>{
  const ms=index.manuscripts.find(m=>m.label==='Vat.Urb.ebr.1'),p=datasets[ms.id].pages.find(p=>p.id==='195fe2dd-53c5-4411-8887-31c1e6281f35');
  const notes=p.contexts.filter(c=>c.label?.startsWith('גדל (כי גדל)'));
  assert.equal(notes.length,2);
  for(const entry of notes){
    const before=JSON.stringify(entry),matches=D.locations(p,entry);
    assert.equal(matches.length,1);assert.equal(matches[0].label,'Job 2:13');assert.equal(matches[0].phrase,'גדל');
    assert.equal(D.wordTokens(D.text(p.contexts.find(c=>c.type==='BibleText').readings.find(r=>r.uuid===matches[0].sourceReading)))[matches[0].wordIndex],'גדל');
    assert.equal(D.forVerse([{page:p,entry}],{book:'Job',chapter:2,verse:13}).primary.length,1);
    assert.equal(JSON.stringify(entry),before,'keep the complete source label and reading unchanged');
  }
  for(const label of ['גדל (כי קטן) (M1)','גדל (גדל גדל) (M1)','גדל (כי גדל) uncertain','גדל (written as כי גדל)'])assert.deepEqual(D.locations(p,{uuid:label,label}),[]);
  const ambiguous={contexts:[{type:'BibleText',readings:[{uuid:'r',text:'כִּֽי־גָדַ֥ל כי גדל',references:[{label:'Job 2:13'}]}]}]};
  assert.equal(D.locations(ambiguous,{uuid:'repeated-context',label:'גדל (כי גדל) (M1)'}).length,2,'context matches still preserve ambiguity');
});

test('BIMA hand suffixes do not prevent real Job word anchors or change source labels',()=>{
  const ms=index.manuscripts.find(m=>m.label==='Vat.Urb.ebr.1');
  const page=datasets[ms.id].pages.find(p=>p.label==='746r');
  const entry=page.contexts.find(c=>c.label==='השמימה (M1)');assert(entry);
  const original=JSON.stringify(entry);
  const matches=D.locations(page,entry);
  assert.deepEqual(matches.map(m=>[m.label,m.phrase]),[['Job 2:12','השמימה']]);
  assert.equal(D.forVerse([{page,entry}],{book:'Job',chapter:2,verse:12}).primary.length,1);
  assert.equal(JSON.stringify(entry),original,'retain the original source metadata');
  const repeated={contexts:[{type:'BibleText',readings:[{text:'השמימה השמימה',references:[{label:'Job 2:12'}]}]}]};
  assert.equal(D.locations(repeated,entry).length,2);
  assert.equal(D.forVerse([{page:repeated,entry}],{book:'Job',chapter:2,verse:12}).primary.length,1);
  for(const [i,label] of ['השמימה (אחר)','השמימה (M1) unknown','השמימה Gins.1, unknown #72 (M1)'].entries())
    assert.deepEqual(D.locations(page,{uuid:'unsafe-'+i,label}),[],'retain safeguards for editorial or alternative labels');
});
test('bibliographic suffixes and word separators allow matching without guessing an occurrence',()=>{
  for(const label of ['תבא Gins.1, beth #122 (M1)','תבא Ginsburg I, Beth, #122, 13','תבא_Ginsburg I, p.13 § 122; Weil § 15','תבא OH2 #16C; Ginsburg I Beth #122, p.13'])assert.equal(D.matchingLabel(label),'תבא');
  assert.equal(D.matchingLabel('על-ציון'),'על ציון');
  assert.equal(D.matchingLabel('על־ציון'),'על ציון');
  for(const label of ['תבא / תבוא','תבא Ginsburg I #122 ר','תבא Ginsburg I #122 partial','תבא continued from fol. 3v; Gins.1 #122'])assert.equal(D.matchingLabel(label),'');
  const page={contexts:[{type:'BibleText',readings:[{uuid:'r1',text:'תבא על־ציון תבא',references:[{label:'Job 2:2'}]}]}]};
  const entry={uuid:'numbered',label:'תבא (2)'};
  assert.equal(D.locations(page,entry).length,2,'a source occurrence number must not silently choose the second match');
  assert.equal(D.forVerse([{page,entry}],{book:'Job',chapter:2,verse:2}).primary.length,1);
  assert.deepEqual(D.locations(page,{uuid:'phrase',label:'על-ציון Ginsburg I Aleph #123'}).map(l=>D.wordTokens(l.phrase).join(' ')),['על ציון']);
  const ms=index.manuscripts.find(m=>m.label==='Vat.Urb.ebr.1'),real=datasets[ms.id].pages.find(p=>p.label==='745v');
  const note=real.contexts.find(c=>c.label==='תבא Gins.1, beth #122 (M1)');assert(note);
  assert.deepEqual(D.locations(real,note).map(l=>l.label),['Job 2:2']);
});
test('citation-only notes and repeated occurrences cannot manufacture a unique word anchor',()=>{
  const note={uuid:'m',label:'דבר',type:'mp',readings:[{text:'דבר',references:[{label:'Ps 1:1'}]}]};
  const p={bibleRefs:['Ps 1:1'],contexts:[note]};assert.deepEqual(D.locations(p,note),[]);
  const repeated={bibleRefs:['Ps 1:1'],contexts:[note,{type:'BibleText',readings:[{uuid:'r',text:'דבר דבר',references:[{label:'Ps 1:1'}]}]}]};
  assert.equal(D.locations(repeated,note).length,2);
  assert.equal(D.forVerse([{page:repeated,entry:note}],{book:'Psalms',chapter:1,verse:1}).primary.length,1);
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
  assert.equal(explain('בׄ דסׄ').partial,false);assert.match(explain('בׄ דסׄ').meaning,/Wortverbindung/);
  for(const text of ['מלא','מל','חסר','שם','קׄ','דבר'])assert.equal(explain(text).count,null,text+' is not safely a numeral');
  assert.match(explain('לׄ וחסׄ').meaning,/defektive/);
  assert.match(explain('בׄ בפתח').meaning,/Patach/);
  assert.match(explain('לׄ רפי').meaning,/ohne Dagesch/);
  assert.equal(D.explain({label:'מרחפת',readings:[{text:'מרחפת לׄ כותׄ'}]}).count,1);
});
test('the Munich Genesis note explains its count and adjacent word combination',()=>{
  const ms=index.manuscripts.find(m=>m.label==='Munich.Cod.hebr.2');
  const e=datasets[ms.id].pages.flatMap(p=>p.contexts).find(e=>e.uuid==='f2c81271-75c8-452b-a617-24a4ff0f32ea');
  const result=D.explain(e);assert.equal(result.count,2);assert.equal(result.partial,false);assert.deepEqual(result.refs,['Jer 32:27']);assert.match(result.meaning,/Vergleichsbelege/);
});

test('bibliography parsing resolves the actual Job 4:5 magna label and rejects unknown prose',()=>{
 const m=index.manuscripts.find(m=>m.label==='Vat.Urb.ebr.1'),p=datasets[m.id].pages.find(p=>p.id==='f95506b2-3b6f-488d-8573-5ad7617288a4'),e=p.contexts.find(e=>e.uuid==='320be318-cab1-40c6-bff2-a82fbc2cffea');
 assert.equal(D.locations(p,e).length,1);assert.equal(D.locations(p,e)[0].label,'Job 4:5');assert.equal(D.locations(p,e)[0].phrase,'עדיך');
 assert.equal(D.labelTarget('על-ציון').needle.join(' '),'על ציון');
 for(const label of ['עדיך uncertain Gins.2, ain #131','עדיך Gins.2, ain #131 conjecture','עדיך (written as אליך)','עדיך II'])assert.equal(D.labelTarget(label),null);
});
test('MT fallback is bounded by source page identity and does not replace ambiguous source matches',()=>{
 const m=index.manuscripts.find(m=>m.label==='B32inf.'),p=datasets[m.id].pages.find(p=>p.id==='7f51c986-fc48-4540-891e-77349906660a'),e=p.contexts.find(e=>e.uuid==='81bf9869-2fa5-4f56-9143-b12e5ccd0ff9');
 assert.equal(D.sourceLocations(p,e).length,0);assert.equal(D.locations(p,e)[0].label,'Psalms 2:2');assert.equal(D.locations(p,e)[0].method,'westminster-page-coverage');
 assert.deepEqual(D.matchTokens('על ייי'),D.matchTokens('עַל־יְהוָה'));assert.deepEqual(D.matchTokens('ולייי'),D.matchTokens('וליהוה'));
 for(const changed of [{...p,id:'wrong'},{...p,bibleRefs:['Ps 8:1']},{...p,contexts:[]}])assert.deepEqual(D.locations(changed,e),[]);
 assert.deepEqual(D.locations({...p,contexts:[]},{...e,label:'שם אחר'}),[]);
 const ambiguous={...p,contexts:[{type:'BibleText',readings:[{uuid:'r',text:'על ייי על ייי',references:[{label:'Ps 2:2'}]}]}]};
 assert.equal(D.locations(ambiguous,e).length,2);
});
test('all transcribed Masorah notes have a reproducible MT audit with pinned source hashes',()=>{
 const {links,report:audit}=require('../tools/masora/build-word-links').build(),stored=require('../masora-word-links'),saved=require('../tools/masora/word-links-audit.json');
 const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
 assert.equal(digest(links),digest(stored));assert.equal(digest(audit),digest(saved));assert.equal(audit.rows.length,26969);assert.equal(links.source.westminster.length,39);
 assert.equal(audit.linked+audit.open,audit.counts.total);assert.equal(audit.unique+audit.multiple,audit.linked);assert.equal(Object.keys(links.notes).length,audit.counts.mtUnique+audit.counts.mtAmbiguous);
 for(const row of audit.rows){const n=row.reason==='mtUnique'?row.mt:row.source;if(['sourceUnique','mtUnique'].includes(row.reason))assert.equal(n.length,1);}
});
test('every exact source or MT occurrence is visible in its own verse, without losing the other targets',()=>{
 let multiple=0;
 for(const ms of index.manuscripts)for(const page of datasets[ms.id].pages)for(const entry of page.contexts){
  if(!['mp','mm','mf'].includes(entry.type)||!entry.readings.some(r=>D.text(r)))continue;
  const matches=D.locations(page,entry);if(matches.length<2)continue;multiple++;
  for(const target of new Map(matches.map(m=>[m.label,m])).values()){
   const split=D.forVerse([{page,entry}],target);assert.equal(split.primary.length,1);assert.equal(split.primary[0].locations.length,matches.length);
   assert(split.primary[0].verseLocations.every(m=>m.label===target.label));
   assert.equal(D.wordGroups(split.primary)[0].location.label,target.label);
  }
 }
 assert.equal(multiple,require('../tools/masora/word-links-audit.json').multiple);
});
test('explicit label references constrain matches and do not merely disappear during parsing',()=>{
 const page={id:'label-ref-fixture',bibleRefs:['Ps 37:25','Ps 37:26'],contexts:[{type:'BibleText',readings:[{uuid:'a',text:'וזרעו וזרעו',references:[{label:'Ps 37:25'}]},{uuid:'b',text:'וזרעו',references:[{label:'Ps 37:26'}]}]}]};
 for(const label of ['37,26 וזרעו','וזרעו 37,26','וזרעו (37:26)','וזרעו (Ps 37:26)']){
  const matches=D.locations(page,{uuid:label,label});assert.equal(matches.length,1);assert.equal(matches[0].label,'Psalms 37:26');assert.equal(matches[0].phrase,'וזרעו');
 }
 for(const label of ['וזרעו 37,27','וזרעו (Gen 37:26)','וזרעו (Unknown 37:26)'])assert.deepEqual(D.locations(page,{uuid:label,label}),[]);
 const wrongRef=D.labelTarget('וזרעו 37,25');assert(!D.targetMatches(wrongRef,{book:'Psalms',chapter:37,verse:26}));
});
test('actual numbered, explicitly referenced and diacritic bibliography labels retain their original text',()=>{
 const cases=[['ייי אדנינו (8:10)',['Psalms 8:10']],[' 37,25 וזרעו',['Psalms 37:25']],['וזרעו 37,26',['Psalms 37:26']],[' 37,15 תשברנה',['Psalms 37:15']],['תשברנה 37,17',['Psalms 37:17']],['אמרות (1)',['Psalms 12:7']],['אמרות (2)',['Psalms 12:7']],['ידי (1)',['Psalms 18:21','Psalms 18:25','Psalms 18:35']],['ידי (2)',['Psalms 18:21','Psalms 18:25','Psalms 18:35']],['ידי (3)',['Psalms 18:21','Psalms 18:25','Psalms 18:35']],['חגור OH #18 / OP #17 / Ginsburg I Ḥet #38, p. 478',['Psalms 45:4']]];
 const m=index.manuscripts.find(m=>m.label==='B32inf.');
 for(const [label,expected]of cases){
  const p=datasets[m.id].pages.find(p=>p.contexts.some(e=>e.label===label)),e=p.contexts.find(e=>e.label===label),before=JSON.stringify(e);
  assert.deepEqual([...new Set(D.locations(p,e).map(m=>m.label))],expected);assert.equal(JSON.stringify(e),before);
 }
 assert.equal(D.labelTarget('ידי (3)').numberTag,3);
});

test('numbered labels stay separate in the displayed word groups',()=>{
 const m=index.manuscripts.find(m=>m.label==='B32inf.'),page=datasets[m.id].pages.find(p=>p.id==='76b8e427-05ef-48e2-8250-d8b2ee2520d0');
 const hits=page.contexts.filter(e=>/^אמרות \([12]\)$/.test(e.label)).map(entry=>({page,entry}));
 const groups=D.wordGroups(D.forVerse(hits,{book:'Psalms',chapter:12,verse:7}).primary);
 assert.equal(groups.length,2);assert.deepEqual(groups.map(g=>g.label),['אמרות (1)','אמרות (2)']);
});
test('ארוץ resolves at the three cited plene spellings and the explicitly quoted defective spelling',()=>{
 const m=index.manuscripts.find(m=>m.label==='B32inf.'),p=datasets[m.id].pages.find(p=>p.id==='03aeec02-07b2-4261-8c49-5a410dab970c'),entry=p.contexts.find(e=>e.uuid==='55bb1141-2922-40c7-b2dd-6bb46028e39b'),before=JSON.stringify(entry);
 const cited=D.citationLocations(p,entry);
 assert.deepEqual(cited.map(m=>[m.label,m.phrase]),[['II Samuel 18:23','ארוץ'],['II Samuel 22:30','ארוץ'],['Psalms 18:30','ארץ'],['Psalms 119:32','ארוץ']]);
 assert.equal(cited.find(m=>m.label==='Psalms 18:30').method,'westminster-cited-quote-spelling');
 assert.deepEqual(D.locations(p,entry).map(m=>[m.label,m.phrase]),[['Psalms 18:30','ארץ']],'only the page-covered citation can supply a local word reference');
 assert.equal(D.forVerse([{page:p,entry}],{book:'II Samuel',chapter:18,verse:23}).primary.length,0,'cross-book comparisons are not manuscript anchors');
 assert.equal(JSON.stringify(entry),before);
 const altered=structuredClone(entry);altered.readings.find(r=>r.uuid===cited[0].sourceReading).text='Anderer Text';
 assert(!D.citationLocations(p,altered).some(m=>m.label==='II Samuel 18:23'),'source quote changes invalidate checked citations');
 const noQualifier=structuredClone(entry),variant=cited.find(m=>m.method==='westminster-cited-quote-spelling');
 noQualifier.readings.find(r=>r.uuid===variant.qualifierReading).text='keine Schreibungsangabe';
 assert(!D.citationLocations(p,noQualifier).some(m=>m.method==='westminster-cited-quote-spelling'));assert.equal(D.locations(p,noQualifier).length,0);
});
test('checked citation links retain explicit source reference and quote guards',()=>{
 const links=require('../masora-word-links'),audit=require('../tools/masora/word-links-audit.json');
 assert.equal(Object.keys(links.citations).length,audit.citedNotes);
 for(const note of Object.values(links.citations))for(const loc of note.locations){
  const ref=D.bibleRef(loc.sourceReference);assert(ref);assert.equal(loc.book,ref.book);assert.equal(loc.chapter,ref.chapter);assert.equal(loc.verse,ref.verse);assert.equal(typeof loc.sourceQuote,'string');assert(loc.sourceReading);
  if(loc.method==='westminster-cited-quote-spelling')assert(loc.sourceQuote&&loc.qualifierReading&&loc.qualifierText);
 }
});
test('every cited source reference has an explicit reproducible audit result',()=>{
 const {citationAudit}=require('../tools/masora/build-word-links').build(),saved=require('../tools/masora/citation-audit.json');
 const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');assert.equal(digest(citationAudit),digest(saved));
 let refs=0;for(const ms of index.manuscripts)for(const p of datasets[ms.id].pages)for(const e of p.contexts)if(['mp','mm','mf'].includes(e.type)&&e.readings.some(r=>D.text(r)))refs+=e.readings.reduce((n,r)=>n+(r.references||[]).length,0);
 assert.equal(citationAudit.references.length,refs);assert.equal(refs,66678);
 assert.equal(Object.entries(citationAudit.counts).filter(([key])=>key!=='references').reduce((sum,[,n])=>sum+n,0),refs);
 for(const r of citationAudit.references){assert.equal(r.targets.length>0,r.status==='matched');assert(r.entry&&r.reading&&typeof r.reference==='string');}
});
test('listed spellings and cf. bibliography produce checked word evidence without fabricating adjacent phrases',()=>{
 const rows=require('../tools/masora/word-links-audit.json').rows;
 for(const [uuid,verse,word]of [['9824b4e7-35e3-422b-81da-fe5f5c51b426','Psalms 26:12','רגלי'],['82ea22c6-c590-47cb-82e3-786da23c69ac','Psalms 61:6','נתת'],['fc3db0c8-641f-4a62-8976-012f3eb64419','Psalms 51:18','ואתנה']]){
  const row=rows.find(r=>r.uuid===uuid);assert(row.mt.includes(verse));assert(row.citations.some(c=>c.label===verse&&c.phrase===word));
 }
 const alternative=rows.find(r=>r.uuid==='6c3f8c2f-3532-4d60-b363-abec5fec1a3c');
 assert.deepEqual(alternative.citations.map(c=>[c.label,D.wordTokens(c.phrase).join(' ')]),[['Exodus 3:22','משכנתה'],['Exodus 3:22','ומגרת']]);
 assert.equal(alternative.reason,'unparsedLabel','comparisons do not imply a resolved manuscript lemma');
 for(const label of ['כאלהים cf. Ginsburg I, Aleph, #666, 76','לדור ודר Ginsburg I Dalet #143b, p. 229'])assert(D.labelTarget(label));
 assert.equal(D.labelTarget('כאלהים cf. Ginsburg I #666 unknown'),null);
});
