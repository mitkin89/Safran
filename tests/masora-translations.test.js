'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),D=require('../library-masora-data'),T=require('../library-masora-translations'),M=require('../masora-translations/index'),{selectNotes}=require('../tools/masora/build-translations');
const rows=selectNotes(),records=new Map(M.batches.flatMap(b=>Object.entries(require('../'+b.file).notes)));
test('first 10000 Masorah translations cover the exact stable source sequence without modifying it',()=>{
 assert.equal(rows.length,10000);assert.equal(T.index(M).size,10000);assert.equal(records.size,10000);
 let readings=0,draft=0,partial=0,partialNotes=0;
 for(const b of M.batches)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,b.file))).digest('hex'),b.sha256);
 for(const src of rows){
  const tr=records.get(src.uuid);assert(tr);assert.equal(tr.ordinal,src.ordinal);assert.equal(tr.sourceHash,src.sourceHash);assert.equal(tr.readings.length,src.readings.length);assert.equal(tr.label,src.label);assert.equal(tr.type,src.type);
  if(tr.readings.some(r=>r.status==='partial'))partialNotes++;
  tr.readings.forEach((r,i)=>{readings++;assert.equal(r.uuid,src.readings[i].uuid);assert.equal(r.source,src.readings[i].text);assert.deepEqual(r.sourceReferences,src.readings[i].references);assert(r.de.trim());assert(Array.isArray(r.uncertain));assert(['draft','partial'].includes(r.status));if(/[#\[\]…�]/.test(r.source))assert.equal(r.status,'partial','source loss must remain marked: '+r.uuid);if(r.status==='draft'){draft++;assert.equal(r.uncertain.length,0);assert(!/\[(?:Unklar|unübersetzt):/i.test(r.de));}else partial++;});
 }
 assert.deepEqual(M.counts,{notes:10000,notesWithUnresolvedReadings:partialNotes,readings,draftReadings:draft,partialReadings:partial});
});
test('translation overlays reject changed source text, source labels and source references',()=>{
 const src=rows[0],record=records.get(src.uuid),entry={uuid:src.uuid,label:src.label,type:src.type,readings:src.readings.map(r=>({uuid:r.uuid,text:r.text,references:r.references.map(label=>({label}))}))};
 assert.equal(T.match(entry,record,D),record);
 assert.equal(T.match({...entry,label:'different'},record,D),null);
 const changed=structuredClone(entry);changed.readings[0].text+=' changed';assert.equal(T.match(changed,record,D),null);
 const cited=structuredClone(entry);cited.readings[0].references.push({label:'Gen 1:1'});assert.equal(T.match(cited,record,D),null);
});
test('German translation disclosure escapes source-derived content and identifies partial drafts',()=>{
 const safe=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const html=T.html({readings:[{de:'<img src=x> [Unklar: א]',status:'partial',sourceReferences:[],edition:'<script>'}]},safe);
 assert(html.includes('teilweise offen'));assert(html.includes('lang="de"'));assert(!html.includes('<img'));assert(!html.includes('<script>'));assert.equal(T.html(null,safe),'');
});
test('source formulas are actual translations and arbitrary Hebrew words are not treated as counts',()=>{
 const P=require('../tools/masora/translations/part-0');assert.equal(P.formula('לׄ').de,'Einmalig.');assert.equal(P.formula('בׄ').de,'Zweimal.');assert.equal(P.formula('לׄ חסׄ').status,'draft');assert.equal(P.formula('נח'),null);assert.equal(P.formula('שם'),null);assert.equal(P.formula('נח מל'),null);assert.equal(P.formula('לׄי'),null);assert.equal(P.formula('קׄר'),null);assert.equal(P.translateReading({uuid:'gap',text:'ומי ##',references:[]}).status,'partial');assert.equal(P.formula('מלא').de,'Voll geschrieben.');assert.equal(P.formula('בׄ דסׄ').status,'partial');
});
