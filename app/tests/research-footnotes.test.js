'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const S=require('../research-store'),T=require('../research-translations'),V=require('../research-verse-layout'),E=require('../research-export'),P=require('../research-presentation');
const note=(marker,text)=>'<sup class="footnote-marker">'+marker+'</sup><i class="footnote">'+text+'</i>';
function fixture(title='Bava Metzia'){
 const base={title,sectionNames:[title==='Genesis'?'Chapter':'Daf','Line']},docs={he:{...base,versionTitle:'Hebrew',language:'Hebrew',text:[['מקור'+note('א','מקור הערה'),'שני']]},de:{...base,versionTitle:'Sammter',language:'German',text:[['Erster Text'+note('i','Erste <i>verschachtelte</i> Anmerkung<br>zweiter Absatz')+' weiter'+note('ii','<script>kein HTML</script>'),'Zweiter Text'+note('i','Andere Anmerkung')] ]}};
 const rich=async rel=>({doc:docs[rel],entry:{rel,title,versionTitle:docs[rel].versionTitle,language:docs[rel].language}});
 const capture=rel=>S.capture(docs[rel],{rel,title},{sectionPath:[0],labels:['1','2']});return {docs,rich,capture};
}
function word(zip){let i=0;while(zip.readUInt32LE(i)===0x04034b50){const n=zip.readUInt16LE(i+26),extra=zip.readUInt16LE(i+28),size=zip.readUInt32LE(i+18),name=zip.subarray(i+30,i+30+n).toString(),start=i+30+n+extra;if(name==='word/document.xml')return zlib.inflateRawSync(zip.subarray(start,start+size)).toString();i=start+size;}throw Error('Missing document');}
test('native segments retain their own markers and notes in aligned preview, Word and portable records',()=>{
 const {capture}=fixture(),main=capture('he'),left=capture('de');left.region='left';
 assert.equal(left.text,'1  Erster Text[i] weiter[ii]\n[Fußnote i] Erste verschachtelte Anmerkung zweiter Absatz\n[Fußnote ii] kein HTML\n2  Zweiter Text[i]\n[Fußnote i] Andere Anmerkung');
 const sheet=S.entity('sheets',{id:'s',projectId:'p',title:'Footnotes',layout:{template:'classic'},blocks:[main,left]});
 const rows=V.aligned(sheet.blocks);assert.equal(rows.length,2);assert(rows[0].left[0].text.includes('Erste verschachtelte'));assert(!rows[0].left[0].text.includes('Andere Anmerkung'));assert(rows[1].left[0].text.includes('Andere Anmerkung'));
 const html=E.html(sheet,[],{interactive:false}),xml=word(E.docx(sheet));
 for(const text of ['Erste verschachtelte','Andere Anmerkung','מקור הערה']){assert(html.includes(text));assert(xml.includes(text));}
 assert.match(html,/rw-segment-footnote/);assert(!html.includes('<script>kein HTML'));
 assert(html.indexOf('Erste verschachtelte')<html.indexOf('data-verse="1:2"'));assert.equal((html.match(/Andere Anmerkung/g)||[]).length,1);
 const saved=S.validate({...S.empty(),projects:[{id:'p',title:'Project'}],sheets:[sheet]});assert.deepEqual(saved.sheets[0].blocks,sheet.blocks);
 const noNotes=S.capture(fixture().docs.de,{title:'Bava Metzia',rel:'de'},{sectionPath:[0],labels:['1'],includeFootnotes:false});assert.equal(noNotes.text,'1  Erster Text weiter');
});
test('reader, native and mapped parallel editions and range changes retain annotations per row',async()=>{
 for(const title of ['Bava Metzia','Genesis']){
  const {capture,rich}=fixture(title),source=capture('he'),pr=await T.prepare({source,rel:'de',mode:'parallel'},rich);
  assert.match(pr.rows[0].original,/Fußnote א/);assert.match(pr.rows[0].translation,/Fußnote ii/);assert.match(pr.rows[1].translation,/Andere Anmerkung/);
  const b=S.block({...source,presentation:pr}),before=JSON.stringify(b),html=P.html(b,s=>String(s));assert.equal((html.match(/Andere Anmerkung/g)||[]).length,1);assert(word(E.docx({title:'T',blocks:[b]})).includes('Andere Anmerkung'));
  const changed=await T.rangePreview({source:b,sectionPath:[0],labels:['2']},rich);assert.equal(changed.presentation.rows.length,1);assert(!changed.text.includes('מקור הערה'));assert(!changed.presentation.companion.text.includes('Erste verschachtelte'));assert(changed.presentation.companion.text.includes('Andere Anmerkung'));assert.equal(JSON.stringify(b),before);
  const reader=await T.readerView({rel:'he',visibleRels:['he','de'],sectionPath:[0],labels:['1']},rich);assert(reader.presentation.rows[0].translation.includes('Fußnote ii'));
 }
});
test('legacy excerpts still accept translations while edited and stale snapshots remain rejected',async()=>{
 const {docs,rich}=fixture(),old=S.capture(docs.he,{title:'Bava Metzia',rel:'he'},{sectionPath:[0],labels:['1','2'],includeFootnotes:false}),before=JSON.stringify(old);
 assert((await T.prepare({source:old,rel:'de',mode:'parallel'},rich)).rows[0].translation.includes('Fußnote i'));assert.equal(JSON.stringify(old),before);
 await assert.rejects(T.prepare({source:{...old,text:'edited'},rel:'de',mode:'parallel'},rich),/bearbeitet/);
 docs.he.text[0][0]+=' geändert';await assert.rejects(T.prepare({source:old,rel:'de',mode:'parallel'},rich),/stimmen nicht überein/);
});
test('interlinear annotations follow the word groups in HTML and Word instead of disappearing',async()=>{
 const {capture,rich}=fixture(),source=capture('he'),pr=await T.prepare({source,rel:'de',mode:'parallel'},rich);pr.mode='interlinear';pr.rows=pr.rows.map(r=>({...r,groups:[{original:'מקור',translation:'Text'}]}));
 const b=S.block({...source,presentation:pr}),html=P.html(b,s=>String(s)),xml=word(E.docx({title:'T',blocks:[b]}));
 assert.equal((html.match(/Andere Anmerkung/g)||[]).length,1);assert(html.indexOf('Erste verschachtelte')>html.indexOf('rw-wordgroup'));assert(xml.includes('מקור הערה'));assert(xml.includes('Andere Anmerkung'));
});
