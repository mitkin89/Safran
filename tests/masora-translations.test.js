'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),D=require('../library-masora-data'),T=require('../library-masora-translations'),M=require('../masora-translations/index'),{selectNotes}=require('../tools/masora/build-translations');
const rows=selectNotes(),records=new Map(M.batches.flatMap(b=>Object.entries(require('../'+b.file).notes)));
test('all transcribed Masorah contexts have source-bound working translation overlays',()=>{
 assert.equal(rows.length,require('../masora-index').counts.transcribedMasoraContexts);assert.equal(T.index(M).size,rows.length);assert.equal(records.size,rows.length);
 let readings=0,draft=0,partial=0,partialNotes=0;
 for(const b of M.batches)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,b.file))).digest('hex'),b.sha256);
 for(const src of rows){
  const tr=records.get(src.uuid);assert(tr);assert.equal(tr.ordinal,src.ordinal);assert.equal(tr.sourceHash,src.sourceHash);assert.equal(tr.readings.length,src.readings.length);assert.equal(tr.label,src.label);assert.equal(tr.type,src.type);
  if(tr.readings.some(r=>r.status==='partial'))partialNotes++;
  tr.readings.forEach((r,i)=>{readings++;assert.equal(r.uuid,src.readings[i].uuid);assert.equal(r.source,src.readings[i].text);assert.deepEqual(r.sourceReferences,src.readings[i].references);assert(r.de.trim());assert(Array.isArray(r.uncertain));assert(['draft','partial'].includes(r.status));if(/[#\[\]…�]/.test(r.source))assert.equal(r.status,'partial','source loss must remain marked: '+r.uuid);if(r.status==='draft'){draft++;assert.equal(r.uncertain.length,0);assert(!/\[(?:Unklar|unübersetzt):/i.test(r.de));}else partial++;});
 }
 assert.deepEqual(M.counts,{notes:rows.length,notesWithUnresolvedReadings:partialNotes,readings,draftReadings:draft,partialReadings:partial});
});
test('translation overlays reject changed source text, source labels and source references',()=>{
 const src=rows[0],record=records.get(src.uuid),entry={uuid:src.uuid,label:src.label,type:src.type,readings:src.readings.map(r=>({uuid:r.uuid,text:r.text,references:r.references.map(label=>({label}))}))};
 assert.equal(T.match(entry,record,D),record);
 assert.equal(T.match({...entry,label:'different'},record,D),null);
 const changed=structuredClone(entry);changed.readings[0].text+=' changed';assert.equal(T.match(changed,record,D),null);
 const cited=structuredClone(entry);cited.readings[0].references.push({label:'Gen 1:1'});assert.equal(T.match(cited,record,D),null);
});
test('German translations stay visible, escape source-derived content and identify partial drafts',()=>{
 const safe=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const html=T.html({readings:[{de:'<img src=x> [Unklar: א]',status:'partial',sourceReferences:[],edition:'<script>'}]},safe);
 assert(html.startsWith('<section '));assert(html.includes('role="note"'));assert(!/<details|<summary/.test(html));assert(html.includes('teilweise offen'));assert(html.includes('lang="de"'));assert(!html.includes('<img'));assert(!html.includes('<script>'));assert.equal(T.html(null,safe),'');
});
test('source formulas are actual translations and arbitrary Hebrew words are not treated as counts',()=>{
 const P=require('../tools/masora/translations/part-0');assert.equal(P.formula('לׄ').de,'Einmalig.');assert.equal(P.formula('בׄ').de,'Zweimal.');assert.equal(P.formula('לׄ חסׄ').status,'draft');assert.equal(P.formula('נח'),null);assert.equal(P.formula('שם'),null);assert.equal(P.formula('נח מל'),null);assert.equal(P.formula('לׄי'),null);assert.equal(P.formula('קׄר'),null);assert.equal(P.translateReading({uuid:'gap',text:'ומי ##',references:[]}).status,'partial');assert.equal(P.formula('מלא').de,'Voll geschrieben.');assert.equal(P.formula('בׄ דסׄ').status,'partial');
});


test('verified short formulas distinguish adjoining words, verse beginnings and Rafe',()=>{
 const R=require('../tools/masora/translations/refinements');
 assert.equal(R.boundedFormula({text:'בׄ דסׄ'}).de,'Zweimal in dieser Wortverbindung.');
 assert.equal(R.boundedFormula({text:'לׄ רׄפׄ'}).de,'Einmal am Versanfang.');
 assert.equal(R.boundedFormula({text:'גׄ ר״פ'}).de,'Dreimal am Versanfang.');
 assert.equal(R.boundedFormula({text:'לׄ רפי'}),null);
 assert.equal(R.boundedFormula({text:'לׄי דסׄ'}),null);
 const tr=R.protectSource({text:'ומי ##'},{de:'Und wer?',status:'draft',uncertain:[]});assert.equal(tr.status,'partial');assert(tr.uncertain.includes('ומי ##'));
});

test('broken word spacing can yield an explicitly partial reading without changing consonants',()=>{
 const R=require('../tools/masora/translations/refinements');
 const q=R.canonicalSpacing({text:'ברא שית',references:['Gen 1:1']});assert(q);assert.equal(q.status,'partial');assert.match(q.de,/Anfang/);assert.deepEqual(q.uncertain,['ברא שית']);
 assert.equal(R.canonicalSpacing({text:'בראשית',references:['Gen 1:1']}),null);
 assert.equal(R.canonicalSpacing({text:'ברא ##שית',references:['Gen 1:1']}),null);
 assert.equal(R.canonicalSpacing({text:'ברא שית',references:['Gen 1:2']}),null);
 assert.equal(R.canonicalSpacing({text:'ברא שית',references:[]}),null);
});


test('Genesis 1:2 list keeps its Masorah rule but omits translated verse quotations',()=>{
 const record=records.get('4ff77d42-d7f9-4444-9649-3427268811c1');assert(record);
 const visible=record.readings.map(T.explanation).filter(Boolean);
 assert.deepEqual(visible,[record.readings[0].de,'Und einmal.']);
 const html=T.html(record,s=>String(s));
 assert(html.includes('8-mal'));
 assert(!html.includes('Aber die Erde war wüst'));
 assert(!html.includes('Und das Land'));
 assert(!html.includes('Philippson'));
 assert.equal(T.html({readings:[record.readings[1]]},String),'');
 assert.equal(T.explanation({method:'aligned-quotation-and-formula',de:'„Ein übersetztes Zitat“ — Defektiv geschrieben.'}),'Defektiv geschrieben.');
 const quote=record.readings[2];assert.equal(T.explanation({...quote,source:'Andere Notiz',de:'Eine geänderte Erklärung.'}),'Eine geänderte Erklärung.');
});
