'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {selectNotes}=require('../tools/masora/build-translations'),{createReview}=require('../tools/masora/reviews');
const Q=require('../tools/masora/reviews/round-2-targets.json'),M=require('../masora-translations/index');
test('round two freezes every one of the 7612 remaining source-bound contexts',()=>{
 const sources=new Map(selectNotes().map(e=>[e.uuid,e]));assert.equal(Q.targets.length,7612);assert.equal(new Set(Q.targets.map(t=>t.uuid)).size,7612);let previous=0;
 for(const t of Q.targets){const source=sources.get(t.uuid);assert(source);assert.equal(t.sourceHash,source.sourceHash);assert.equal(t.ordinal,source.ordinal);assert(t.ordinal>previous);previous=t.ordinal;assert(['a','b','c'].includes(t.shard));}
 assert.equal(Q.baseline.partialReadings,28645);
});
test('round two reports actual gains separately from remaining uncertainty',()=>{
 const report=require('../tools/masora/reviews/round-2-report.json');assert.deepEqual(M.reviews.find(r=>r.round===2),report);
 assert.equal(report.selectedNotes,7612);assert.equal(report.changedNotes+report.unchangedNotes,7612);
 assert.equal(report.resolvedNotes+report.improvedPartialNotes,report.changedNotes);
 assert.equal(report.resolvedNotes+report.remainingPartialNotes,7612);
 assert.equal(report.baselinePartialReadings,28645);assert.equal(report.resolvedReadings+report.remainingPartialReadings,28645);
 assert.equal(M.counts.notesWithUnresolvedReadings,report.remainingPartialNotes);assert.equal(M.counts.partialReadings,report.remainingPartialReadings);
});
test('round two preserves previously completed translations except its documented correction',()=>{
 const corrections=new Map(require('../tools/masora/reviews/round-2-corrections.json').corrections.map(c=>[c.reading,c]));
 const rows=M.batches.flatMap(b=>Object.values(require('../'+b.file).notes).flatMap(e=>e.readings.filter(r=>r.status==='draft'&&(r.reviewRound!==2||corrections.has(r.uuid))).map(r=>corrections.get(r.uuid)?.before||r).map(r=>[r.uuid,r.de,r.status,r.uncertain,r.edition||null,r.reference||r.ref||null,r.attribution||null]))).sort((a,b)=>a[0].localeCompare(b[0]));
 assert.equal(rows.length,Q.baseline.completedReadings);assert.equal(crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'),Q.baseline.completedReadingsSha256);
});
test('fragment translations require an actual source token and never certify an old parse',()=>{
 const F=require('../tools/masora/reviews/fragments'),prior={uuid:'r',de:'Viermal, [Unklar: וסימני].',status:'partial',uncertain:['וסימני']};
 const next=F.improve({text:'דׄ וסימניׄ'},prior);assert.match(next.de,/Erkennungsstellen/);assert.equal(next.status,'partial');assert.deepEqual(next.uncertain,['דׄ וסימניׄ']);
 assert.equal(F.improve({text:'דׄ'},prior),prior);
 assert.match(F.improve({text:'דׄ וסימניׄ:'},prior).de,/Erkennungsstellen/);
 const complete={...prior,status:'draft',uncertain:[]};assert.equal(F.improve({text:'דׄ וסימניׄ'},complete),complete);
 const ambiguous={...prior,de:'[Unklar: קריא]'};assert.equal(F.improve({text:'קריא'},ambiguous),ambiguous);
});
test('review coverage cannot silently omit a frozen target',()=>{assert.throws(()=>createReview(2).finish(),/Incomplete review target coverage/);});
test('name fragments require a proper-name witness in the explicitly cited verse',()=>{
 const N=require('../tools/masora/reviews/names'),prior={uuid:'r',de:'[Unklar: דוד]',status:'partial',uncertain:['דוד']};
 const next=N.improve({text:'דוד',references:['1 Sam 19:10']},prior);assert.equal(next.de,'David');assert.equal(next.status,'partial');
 assert.equal(N.improve({text:'דוד',references:['Song 1:13']},prior),prior);
 assert.equal(N.improve({text:'דוד',references:[]},prior),prior);
 assert.equal(N.improve({text:'דוד',references:['Gen 1:1']},prior),prior);
 assert.equal(N.improve({text:'דויד',references:['1 Sam 19:10']},prior),prior);
});
test('round two manual translations remain tied to exact sources and preserve completed readings',()=>{
 const rows=selectNotes(),sources=new Set(rows.flatMap(e=>e.readings.map(r=>r.text)));
 for(const shard of ['a','b','c']){
  const manual=require('../tools/masora/reviews/round-2-'+shard+'-manual.json'),module=require('../tools/masora/reviews/round-2-'+shard);
  assert.equal(new Set(manual.map(r=>r.source)).size,manual.length);
  for(const item of manual){assert(sources.has(item.source),'translation without source: '+item.source);assert(item.de.trim());}
  const ids=new Set(Q.targets.filter(t=>t.shard===shard).map(t=>t.uuid)),source=rows.find(e=>ids.has(e.uuid)&&e.readings.some(r=>module.manualFor(r,e)));assert(source);
  const prior={...source,readings:source.readings.map(r=>({uuid:r.uuid,de:'Vorhandene vollständige Übersetzung.',status:'draft',uncertain:[],edition:'Vorhandene Ausgabe'}))};
  assert.deepEqual(module.review(source,structuredClone(prior)),prior);
  const reading=source.readings.find(r=>module.manualFor(r,source)),revised=module.manualFor(reading,source);
  for(const field of ['edition','attribution','ref','reference'])assert.equal(revised[field],undefined);
  assert.equal(module.manualFor({...reading,text:reading.text+'#changed'},source),null);
 }
});
test('translation reuse preserves exact-source and context restrictions',()=>{
 const R=require('../tools/masora/reviews/reuse'),rows=selectNotes(),ids=new Set(Q.targets.map(t=>t.uuid));let checked=false;
 for(const e of rows){if(!ids.has(e.uuid))continue;for(const r of e.readings){const prior={uuid:r.uuid,de:'[Unklar: '+r.text+']',status:'partial',uncertain:[r.text]},next=R.improve(e,r,prior);
  if(next===prior)continue;assert.equal(next.status,'draft');assert(next.reusedFromReview);assert.equal(next.uuid,r.uuid);
  const complete={...prior,status:'draft',uncertain:[]};assert.equal(R.improve(e,r,complete),complete);
  assert.equal(R.improve(e,{...r,text:'no-such-source-fragment-8127'},prior),prior);checked=true;break;
 }if(checked)break;}assert(checked);
});
test('baseline quotation reuse rejects different citations and conflicting German versions',()=>{
 const R=require('../tools/masora/reviews/reuse'),source={uuid:'source-reading',text:'unique.fixture.quotation.871',references:['Gen 1:1']},entry={uuid:'source-context',label:'original label',readings:[source]},translation={uuid:source.uuid,de:'Eine geprüfte Wiedergabe.',status:'draft',uncertain:[],method:'aligned-quotation',edition:'Ausgabe A'},prior={uuid:'new-reading',de:'[Unklar: Zitat]',status:'partial',uncertain:['Zitat']},target={...source,uuid:prior.uuid};
 R.prepareBaseline([entry],new Map([[entry.uuid,{readings:[translation]}]]));
 const next=R.improve({...entry,uuid:'new-context',label:'other label'},target,prior);assert.equal(next.de,translation.de);assert.deepEqual(next.reusedFromSource,{context:entry.uuid,reading:source.uuid});
 assert.equal(R.improve(entry,{...target,references:['Gen 1:2']},prior),prior);
 const other={...entry,uuid:'conflicting-context'};
 R.prepareBaseline([entry,other],new Map([[entry.uuid,{readings:[translation]}],[other.uuid,{readings:[{...translation,de:'Eine andere Wiedergabe.'}]}]]));
 assert.equal(R.improve(entry,target,prior),prior);
 R.prepareBaseline([],new Map());
});
test('interrupted quote aids preserve unmatched negation, damage and source order',()=>{
 const S=require('../tools/masora/reviews/round-2-a-quoted-spans'),prior={uuid:'fixture',de:'[Unklar: Quelle]',status:'partial',uncertain:['Quelle']},source='לא בראשית ברא אלהים את השמים ואת הארץ #';
 const next=S.improve({uuid:'fixture',text:source,references:['Gen 1:1']},prior,{});assert(next);assert.equal(next.status,'partial');assert(next.uncertain.includes('לא'));assert(next.uncertain.includes('#'));
 assert(next.de.indexOf('[Unklar: לא]')<next.de.indexOf('„'));assert(next.de.lastIndexOf('[Unklar: #]')>next.de.lastIndexOf('“'));
 assert(next.quotationSources.every(q=>q.ref==='Genesis 1:1'&&q.source==='בראשית ברא אלהים את השמים ואת הארץ'));
 assert.equal(S.improve({uuid:'fixture',text:source,references:['Ex 1:1']},prior,{}),null);
 assert.equal(S.improve({uuid:'fixture',text:source,references:[]},prior,{}),null);
 const complete={...prior,status:'draft',uncertain:[]};assert.equal(S.improve({uuid:'fixture',text:source,references:['Gen 1:1']},complete,{}),null);
});
test('root translations bind their exact source, reading identity and explicit reference',()=>{
 const R=require('../tools/masora/reviews/round-2-root'),manual=require('../tools/masora/reviews/round-2-root-manual.json'),rows=selectNotes(),byId=new Map(rows.map(e=>[e.uuid,e]));assert.equal(manual.length,240);
 for(const item of manual){const e=byId.get(item.entryUUIDs[0]),r=e.readings.find(r=>r.uuid===item.readingUUIDs[0]);assert(r);assert.equal(r.text,item.source);const translated=R.manualFor(r,e);assert(translated);assert.equal(translated.de,item.de);assert.equal(R.manualFor({...r,uuid:'other'},e),null);assert.equal(R.manualFor({...r,references:[]},e),null);}
});
test('the documented register correction separates entry 31 from its count of 32',()=>{
 const C=require('../tools/masora/reviews/corrections'),source=selectNotes().find(e=>e.ordinal===10405),c=C.corrections[0],reading=source.readings.find(r=>r.uuid===c.reading);
 const corrected=C.apply(source,reading,c.before);assert.equal(corrected.de,'Listeneintrag 31: „לָאיש“ zweiunddreißigmal.');assert.equal(corrected.attribution,undefined);
 assert.throws(()=>C.apply(source,{...reading,text:'changed'},c.before),/baseline mismatch/);
 assert.throws(()=>C.apply(source,reading,{...c.before,de:'newer translation'}),/baseline mismatch/);
 const record=M.batches.flatMap(b=>Object.values(require('../'+b.file).notes)).find(r=>r.uuid===c.context).readings.find(r=>r.uuid===c.reading);
 assert.equal(record.de,corrected.de);assert.equal(record.correctionId,c.reading);
});
test('manual reviews retain the Aramaic meaning of heart in Daniel',()=>{
 const C=require('../tools/masora/reviews/round-2-c-manual.json');
 const heart=C.find(m=>m.source==='בל באדין מלכא כדי מילתא');assert(heart);assert.match(heart.de,/Herz|Sinn|Gedanken/);assert.doesNotMatch(heart.de,/^Nicht/);
});
test('fully covered repeated quotation spans remain partial without duplicating the entire source',()=>{
 const S=require('../tools/masora/reviews/round-2-a-quoted-spans'),phrase='בראשית ברא אלהים את השמים ואת הארץ',source=phrase+' '+phrase,prior={uuid:'fixture',de:'[Unklar: Quelle]',status:'partial',uncertain:['Quelle']};
 const next=S.improve({uuid:'fixture',text:source,references:['Gen 1:1']},prior,{});assert(next);assert.equal(next.status,'partial');assert.equal(next.quotationSources.length,2);assert.deepEqual(next.uncertain,[source]);assert(!next.de.includes(source));
});
test('round-two short rubrics reject ordinary words as numbers and numbered registers',()=>{
 const C=require('../tools/masora/reviews/round-2-c');
 for(const number of ['נח','נָח','לֹא','טל','טׄלׄ'])assert.equal(C.manualFor({uuid:'fixture',text:'מלה '+number+' מלאין',references:[]},{label:'מלה'}),null);
 assert.equal(C.manualFor({uuid:'fixture',text:'לאׄ לָאיש לׄבׄ',references:[]},{label:''}),null);
 const good=C.manualFor({uuid:'fixture',text:'מלה נׄחׄ מלאין',references:[]},{label:'מלה'});assert.equal(good.status,'draft');assert.match(good.de,/58/);
});
test('proper-name fragments use the verified Aramaic Westminster identities too',()=>{
 const N=require('../tools/masora/reviews/names');
 for(const [word,ref,de]of [['נבוכדנצר','Dan 3:1','Nebukadnezar'],['משה','Ezra 6:18','Mose']]){const prior={uuid:'fixture',de:'[Unklar: '+word+']',status:'partial',uncertain:[word]},next=N.improve({text:word,references:[ref]},prior);assert.equal(next.de,de);assert.equal(next.status,'partial');}
});
test('unlabelled manual baselines cannot leak to another unlabelled context without references',()=>{
 const R=require('../tools/masora/reviews/reuse'),source={uuid:'original',text:'unique.fixture.manual.417',references:[]},entry={uuid:'original-context',readings:[source]},tr={uuid:'original',de:'Eintrag 31: richtige Wiedergabe.',status:'draft',uncertain:[],method:'manual-source-review'},prior={uuid:'new',de:'[Unklar: Quelle]',status:'partial',uncertain:['Quelle']};
 R.prepareBaseline([entry],new Map([[entry.uuid,{readings:[tr]}]]));assert.equal(R.improve({...entry,uuid:'unrelated-context'},{...source,uuid:'new'},prior),prior);
 assert.equal(R.improve(entry,{...source,uuid:'new'},prior).de,tr.de);R.prepareBaseline([],new Map());
});
test('numbered-register translations require their inspected source context',()=>{
 const C=require('../tools/masora/reviews/round-2-c'),B=require('../tools/masora/reviews/round-2-b'),reading={uuid:'fixture',text:'קׄנׄזׄ כי עתה',references:[]};
 const right=C.manualFor(reading,{uuid:'439bf275-d33e-4364-97e6-5fa2391589ec',ordinal:10407});assert(right);assert.match(right.de,/157/);
 assert.equal(C.manualFor(reading,{uuid:'wrong',ordinal:123}),null);
 const bReading={uuid:'fixture',text:'לאׄ לָאיש לׄבׄ',references:[]};assert(B.manualFor(bReading,{ordinal:10405,uuid:'2643f8cf-035a-41c8-957a-d49462539617'}));assert.equal(B.manualFor(bReading,{uuid:'wrong'}),null);
});
