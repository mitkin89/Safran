'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const S=require('../research-store'),T=require('../research-translations'),E=require('../research-export'),P=require('../research-presentation');
function fixture(){
 const base={title:'Bava Metzia',sectionNames:['Daf','Line']},texts={he:['מקור א','מקור ב','מקור ג'],de:['Samter 1','','Samter 3'],de2:['Goldschmidt 1','Goldschmidt 2','Goldschmidt 3']},docs={};
 for(const [rel,rows]of Object.entries(texts))docs[rel]={...base,versionTitle:rel,language:rel==='he'?'Hebrew':'German',text:[rows]};
 const rich=async rel=>({doc:docs[rel],entry:{rel,title:base.title,versionTitle:docs[rel].versionTitle,language:docs[rel].language}}),source=S.capture(docs.he,{rel:'he',title:base.title},{sectionPath:[0],labels:['1','2','3']});return {source,rich};
}
function xml(zip){let i=0;while(zip.readUInt32LE(i)===0x04034b50){const n=zip.readUInt16LE(i+26),extra=zip.readUInt16LE(i+28),size=zip.readUInt32LE(i+18),name=zip.subarray(i+30,i+30+n).toString(),start=i+30+n+extra;if(name==='word/document.xml')return zlib.inflateRawSync(zip.subarray(start,start+size)).toString();i=start+size;}throw Error('No document');}
test('multiple translation snapshots preserve per-edition missing rows, citations, fonts and portable records',async()=>{
 const {source,rich}=fixture(),before=JSON.stringify(source),pr=await T.prepare({source,rels:['de','de2'],mode:'parallel',sourceSize:14,translationSize:10},rich);assert.equal(pr.additional.length,1);assert(pr.rows[1].missing);assert.equal(pr.additional[0].rows[1].translation,'Goldschmidt 2');
 const sheet=S.entity('sheets',{id:'s',projectId:'p',title:'Test',blocks:[{...source,presentation:pr}]}),saved=sheet.blocks[0].presentation;assert.deepEqual(saved,pr);assert.equal(JSON.stringify(source),before);
 const records=S.validate({...S.empty(),projects:[{id:'p',title:'Project'}],sheets:[sheet]});assert.deepEqual(records.sheets[0].blocks[0].presentation,pr);
 const html=E.html(sheet),model=E.documentModel(sheet),word=xml(E.docx(sheet));assert.equal(model.bibliography.length,3);assert.match(html,/rw-multilingual/);assert.match(html,/Samter 3/);assert.match(html,/Goldschmidt 2/);assert.match(html,/width:33\.333/);assert.match(word,/Samter 3/);assert.match(word,/Goldschmidt 2/);assert.match(word,/Keine Übersetzung/);assert.equal((word.match(/<w:tcW /g)||[]).length,12);assert.match(S.csv(sheet.blocks),/Goldschmidt 3/);
 await assert.rejects(T.prepare({source,rels:[],mode:'parallel'},rich),/1 bis 8/);await assert.rejects(T.prepare({source,rels:['de','de'],mode:'parallel'},rich),/unterschiedliche/);await assert.rejects(T.prepare({source,rels:Array.from({length:9},(_,i)=>String(i)),mode:'parallel'},rich),/1 bis 8/);
 const bad=structuredClone(sheet);bad.blocks[0].presentation.additional[0].rows.reverse();assert.throws(()=>S.entity('sheets',bad),/Originaltext/);
 const duplicate=structuredClone(sheet);duplicate.blocks[0].presentation.additional=[pr];assert.throws(()=>S.entity('sheets',duplicate),/Verschachtelung/);
});
test('single translation records stay compatible and multiple interlinear mappings render separately',async()=>{
 const {source,rich}=fixture(),p=await T.prepare({source,rel:'de2',mode:'parallel'},rich);assert(!('additional'in p));assert.deepEqual(S.block({...source,presentation:p}).presentation,p);
 const one={...p,mode:'interlinear',rows:p.rows.map(r=>({...r,groups:[{original:r.original,translation:r.translation}]}))},two={...one,companion:{...one.companion,reference:{...one.companion.reference,rel:'other'},citation:{...one.companion.citation,edition:'Other'}}},b=S.block({...source,presentation:{...one,additional:[two]}}),html=P.html(b,s=>String(s));assert.equal((html.match(/rw-interlinear"/g)||[]).length,6);assert.match(E.html({title:'T',blocks:[b]}),/Other/);assert.match(xml(E.docx({title:'T',blocks:[b]})),/Other/);
});
test('Research uses locally validated Buber/Rosenzweig alignments and rejects missing or changed verses',async()=>{
 const title='I Kings',he={title,versionTitle:'Westminster Leningrad Codex (OSHB, mit Morphologie)',language:'Hebrew',sectionNames:['Chapter','Verse'],text:[['<span class="w">מילה</span> <span class="w">שנייה</span>']]},de={title,versionTitle:'Die Schrift, verdeutscht von Martin Buber gemeinsam mit Franz Rosenzweig (1929)',language:'German',sectionNames:['Chapter','Verse'],text:[['Erstes zweites']]},docs={he,de},rich=async rel=>({doc:docs[rel],entry:{rel,title,versionTitle:docs[rel].versionTitle,language:docs[rel].language}}),source=S.capture(he,(await rich('he')).entry,{sectionPath:[0],labels:['1']}),local=async()=>({data:{BuberRosenzweig:{[title]:{'1:1':[[[1],'Erstes'],[[2],'zweites']]}}}});
 const p=await T.prepare({source,rel:'de',mode:'interlinear'},rich,local);assert.deepEqual(p.rows[0].groups,[{original:'מילה',translation:'Erstes'},{original:'שנייה',translation:'zweites'}]);assert.equal(S.block({...source,presentation:p}).presentation.companion.citation.edition,de.versionTitle);
 const reversed=S.capture(de,(await rich('de')).entry,{sectionPath:[0],labels:['1']});assert.equal((await T.prepare({source:reversed,rel:'he',mode:'interlinear'},rich,local)).rows[0].groups.length,2);
 await assert.rejects(T.prepare({source,rel:'de',mode:'interlinear'},rich),/lokal importierte/);await assert.rejects(T.prepare({source,rel:'de',mode:'interlinear'},rich,async()=>({data:{BuberRosenzweig:{[title]:{}}}})),/1:1 fehlt/);
 de.text[0][0]='Geänderter Text';await assert.rejects(T.prepare({source,rel:'de',mode:'interlinear'},rich,local),/passt.*nicht/);
});
test('new Hebrew sources default to Westminster while explicit edition choices remain authoritative',()=>{
 const {preferred}=require('../research-editions'),editions=[{rel:'a',versionTitle:'Aleppo-Kodex',kind:'he'},{rel:'m',versionTitle:'merged',language:'Hebrew'},{rel:'w',versionTitle:'Westminster Leningrad Codex (OSHB, mit Morphologie)',kind:'he'},{rel:'de',versionTitle:'German',language:'German'}];
 assert.equal(preferred(editions).rel,'w');assert.equal(preferred(editions,{rel:'a'}).rel,'a');assert.equal(preferred(editions,{rel:'old/a',versionTitle:'Aleppo-Kodex'}).rel,'a');assert.equal(preferred(editions,{rel:'missing',versionTitle:'Missing'}).rel,'w');assert.equal(preferred(editions.filter(e=>e.rel!=='w')).rel,'de');assert.equal(preferred([]),undefined);
});
