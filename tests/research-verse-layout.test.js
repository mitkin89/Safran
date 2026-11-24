'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../research-store'),A=require('../research-verse-layout'),E=require('../research-export');
const main=(book='Deuteronomy',chapter=0)=>S.capture({title:book,versionTitle:'Westminster Leningrad Codex',language:'Hebrew',sectionNames:['Chapter','Verse'],text:Array.from({length:chapter+1},()=>Array.from({length:10},(_,i)=>'פסוק '+(i+1)))},{title:book,rel:'main'}, {sectionPath:[chapter],labels:'1-10'});
const comment=(v,extra={})=>({id:'c'+v,type:'source',region:'right',title:'Hoffmann on Deuteronomy',text:'Kommentar zu Vers '+v,originalText:'Kommentar zu Vers '+v,reference:{rel:'comment',sectionPath:[0,v-1],labels:['1']},citation:{work:'Hoffmann on Deuteronomy',locator:'1:'+v+':1',edition:'Kommentar'},...extra});
test('each verse and both margins share a row, independent of commentary order and length',()=>{
 const b=main(),blocks=[b,comment(10),comment(4,{text:'Langer Kommentar\n'.repeat(800)}),comment(1,{region:'left'})],before=JSON.stringify(blocks),rows=A.aligned(blocks);
 assert.equal(rows.length,10);assert.match(rows[3].main[0].text,/^4  /);assert.equal(rows[3].right[0].id,'c4');assert.equal(rows[9].right[0].id,'c10');assert.equal(rows[0].left[0].id,'c1');assert.equal(rows[9].right.some(b=>b.id==='c4'),false);assert.equal(rows[3].right[0].text,blocks[2].text);assert.equal(JSON.stringify(blocks),before);
 const html=E.html({title:'Blatt',layout:{template:'classic'},blocks});assert.match(html,/class="classic-upper verse-aligned"/);assert.match(html,/<tr class="verse-row" data-verse="1:4">[^]*?Langer Kommentar[^]*?<tr class="verse-row" data-verse="1:5">/);assert.match(html,/break-inside:avoid-page/);
});
test('bilingual snapshots split only at actual rows and retain missing translations and bibliography',()=>{
 const b=main();b.presentation={mode:'parallel',companion:{citation:{work:'Deuteronomy',edition:'Übersetzung',language:'German'}},rows:Array.from({length:10},(_,i)=>({label:String(i+1),targetLabel:'1:'+(i+1),original:'Original'+i,translation:'Deutsch'+i,...(i===3?{missing:true}:{})})),references:[]};
 const blocks=[b,comment(4)],rows=A.aligned(blocks);assert.equal(rows[3].main[0].presentation.rows.length,1);assert.equal(rows[3].main[0].presentation.rows[0].missing,true);const html=E.html({title:'Blatt',layout:{template:'classic'},blocks});assert.match(html,/Keine Übersetzung für diese Zeile/);assert.equal(E.documentModel({title:'Blatt',blocks}).bibliography.length,3);assert.equal(b.presentation.rows.length,10);
});
test('unknown locations, other books, absent verses and edited main excerpts never get a guessed anchor',()=>{
 const b=main(),unknown=comment(20),other=comment(4,{citation:{work:'Hoffmann on Genesis',locator:'1:4:1'}}),rows=A.aligned([b,comment(4),unknown,other]);assert.deepEqual(rows.at(-1).right.map(b=>b.id),['c20','c4']);assert.equal(rows.at(-1).keys.length,0);assert.equal(A.aligned([{...b,text:'Freie Bearbeitung'},comment(4)]),null);assert.equal(A.aligned([b,other]),null);
 const broken={...b,text:b.text.replace('4  ','4 ')},missing={...b,reference:{...b.reference,labels:['1','2','4']}};assert.equal(A.aligned([broken,comment(4)]),null);assert.equal(A.aligned([missing,comment(4)]),null);
});
test('verse numbering maps Greek Psalms to Hebrew commentary without confusing chapters',()=>{
 const b=main('Psalms',21);b.citation.edition='Septuaginta (Rahlfs)' ;b.citation.language='Greek';const c=comment(1,{reference:{rel:'comment',sectionPath:[22,0],labels:['1']},citation:{work:'Rashi on Psalms',locator:'23:1:1'}});const rows=A.aligned([b,c]);assert(rows);assert.equal(rows[0].right[0].verseLabel,'23:1');
});
test('multiple comments, explicit legacy references and own linked notes retain their identity',()=>{
 const b=main(),a=comment(4),c=comment(4,{id:'c4b'}),old=comment(5,{id:'old',reference:null}),note={id:'n',type:'note',region:'left',text:'Eigene Notiz',noteSnapshot:{refs:[{citation:{work:'Deuteronomy',locator:'1:4'}}]}};const rows=A.aligned([b,a,c,old,note]);assert.equal(rows[3].right.length,2);assert.equal(rows[4].right[0].id,'old');assert.equal(rows[3].left[0].id,'n');
});
test('flat chapter/verse commentary snapshots split by native verse just like the real German commentaries',()=>{
 const doc={title:'Hoffmann on Deuteronomy',versionTitle:'Deutsch',sectionNames:['Chapter','Verse'],text:[['Erklärung eins\nweiterer Absatz','Erklärung zwei','','Erklärung vier']]};const c=S.capture(doc,{title:doc.title,rel:'hoffmann'},{sectionPath:[0],labels:['1','2','4']});c.region='right';const rows=A.aligned([main(),c]);assert.equal(rows[0].right.length,1);assert.equal(rows[1].right.length,1);assert.equal(rows[3].right.length,1);assert.match(rows[3].right[0].text,/Erklärung vier/);assert(!rows[3].right[0].text.includes('Erklärung eins'));assert.deepEqual(c.reference.labels,['1','2','4']);
});
test('all translation and interlinear columns are sliced together and retain reader headings',()=>{
 const b=main(),rows=Array.from({length:10},(_,i)=>({label:String(i+1),targetLabel:'1:'+(i+1),original:'Original'+i,translation:'Deutsch'+i,groups:[{original:'א'+i,translation:'Wort'+i}]}));
 const pair={mode:'parallel',companion:{citation:{work:'Deuteronomy',edition:'Deutsch',language:'German'}},rows,references:[]};
 b.presentation={...pair,readerHeadings:[{before:'4',text:'Abschnitt vier'}],additional:[{...pair,companion:{citation:{work:'Deuteronomy',edition:'English',language:'English'}},rows:rows.map(r=>({...r,translation:'English'+r.label}))}],originalInterlinear:[{...pair,mode:'interlinear'}]};
 const parts=A.aligned([b,comment(4)]),four=parts[3].main[0].presentation;
 assert.equal(four.additional[0].rows.length,1);assert.equal(four.additional[0].rows[0].translation,'English4');assert.equal(four.originalInterlinear[0].rows.length,1);assert.equal(four.originalInterlinear[0].rows[0].groups[0].translation,'Wort3');assert.equal(four.readerHeadings[0].text,'Abschnitt vier');assert.equal(parts[4].main[0].presentation.readerHeadings.length,0);
 const html=E.html({title:'Blatt',layout:{template:'classic'},blocks:[b,comment(4)]});assert.equal((html.match(/English4/g)||[]).length,1);assert.equal((html.match(/Wort3/g)||[]).length,1);assert(!html.includes('<script>'));assert.equal(b.presentation.additional[0].rows.length,10);
});
test('the free-flow layout never rearranges already aligned verse rows',()=>{
 const Flow=require('../research-flow'),table={classList:{contains:x=>x==='verse-aligned'}};const doc={querySelector:()=>table,defaultView:{}};assert.equal(Flow.apply(doc),false);assert.equal(Flow.preparePrint(doc),false);assert.equal(typeof Flow.watch(doc),'function');
});
