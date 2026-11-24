'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../research-citations'),G=require('../research-comment-groups'),A=require('../research-arrange'),E=require('../research-export'),L=require('../research-layout');
const block=(id,verse=1,comment=1,extra={})=>({id,type:'source',title:'Rashi on Bava Batra',text:'טקסט '+id,originalText:'טקסט '+id,region:'right',sourceHash:'a'.repeat(64),reference:{rel:'rashi-he',sectionPath:[22,verse-1],labels:[String(comment)]},citation:{work:'Rashi on Bava Batra',edition:'merged',language:'Hebrew',locator:`12a:${verse}:${comment}`,url:'https://example.org/full'},...extra});
test('compact citations keep native gaps, nested positions and unfamiliar locators',()=>{
 assert.equal(C.locator('Daf 12a · 1, 2, 3, 7, 10, 11'),'12a, 1–3, 7, 10–11');
 assert.equal(C.locator('Kapitel 1 · 2; Kapitel 1 · 3'),'1, 2–3');
 assert.equal(C.locator('Kapitel 1 › Vers 2 · 1, 2'),'1,2:1–2');
 assert.equal(C.locator('12a:1:1; 12a:1:2; 12a:10:1'),'12a:1:1–2; 12a:10:1');
 assert.equal(C.locator('Deuteronomy · 1:1; Deuteronomy · 1:6; Deuteronomy · 1:9'),'Deuteronomy 1:1, 6, 9');assert.equal(C.section({locator:'Deuteronomy · 1:1; Deuteronomy · 1:6'}),'Deuteronomy 1');
 assert.equal(C.locator('Beilage A, Blatt iv'),'Beilage A, Blatt iv');
 const c={work:'Bava Batra',locator:'Daf 12a · 1, 2, 3',edition:'Talmud Bavli. German trans. by Lazarus Goldschmidt, 1929 [de]',url:'https://example.org/full'};
 assert.equal(C.heading(c),'Goldschmidt (1929) · Bava Batra 12a, 1–3');assert(!C.compact(c).includes('https:'));assert(C.full(c).includes(c.url));assert(C.full(c).includes(c.edition));assert.equal(C.edition({edition:'Unknown complete edition'}),'Unknown complete edition');
});
test('comment groups preserve source identity, native page, region and intervening own text',()=>{
 const xs=[block('a'),block('b',1,2),block('c',10),{id:'note',type:'text',text:'Own'},block('d')],original=JSON.stringify(xs);
 assert.deepEqual(G.runs(xs).map(g=>g.blocks.map(b=>b.id)),[['a','b','c'],['note'],['d']]);assert.equal(JSON.stringify(xs),original);
 for(const change of [{region:'left'},{sourceHash:'b'.repeat(64)},{citation:{...xs[0].citation,language:'English'}},{reference:{...xs[0].reference,sectionPath:[23,0]}},{presentation:{mode:'parallel'}}])assert.equal(G.runs([xs[0],block('other',1,1,change)]).length,2);
 assert.deepEqual(G.sort([block('ten',10),block('two',2),block('first',1)]).map(b=>b.id),['first','two','ten']);
 const items=[{title:'Rashi',edition:'merged',language:'Hebrew',rel:'he'},{title:'Rashi',edition:'merged',language:'English',rel:'en',error:'Missing'},{title:'Rashi',edition:'merged',language:'Hebrew',rel:'he'}];assert.deepEqual(G.selections(items).map(g=>g.items.map(x=>x.i)),[[0,2],[1]]);
});
test('moving a whole commentary group preserves every snapshot and validates before mutation',()=>{
 const xs=[{id:'main',region:'main'},block('a'),block('b',1,2),{id:'last',region:'left'}],a=xs[1],b=xs[2];
 assert.equal(A.moveMany(xs,['a','b'],'left','last'),true);assert.equal(xs[1],a);assert.equal(xs[2],b);assert.equal(a.region,'left');assert.equal(a.text,'טקסט a');
 const saved=JSON.stringify(xs);assert.equal(A.moveMany(xs,['a','absent'],'right'),false);assert.equal(A.moveMany(xs,['a','b'],'right','a'),false);assert.equal(JSON.stringify(xs),saved);
 assert.equal(A.moveMany(xs,['a','b'],'right',null),true);assert.deepEqual(xs.map(b=>b.id),['main','last','a','b']);
});
test('exports group headings and bibliography without altering individual stored sources',()=>{
 const blocks=[block('a'),block('b',1,2),block('c',10)],sheet={title:'Test',blocks,layout:{template:'classic',pageMargin:6,orientation:'landscape'}},before=JSON.stringify(sheet),model=E.documentModel(sheet),html=E.html(sheet);
 assert.equal(model.bibliography.length,1);assert.match(model.bibliography[0],/12a:1:1–2; 12a:10:1/);assert.equal((html.match(/<h2>Rashi on Bava Batra<\/h2>/g)||[]).length,1);assert.equal((html.match(/class="comment-fragment"/g)||[]).length,3);assert.match(html,/<h2>Rashi on Bava Batra<\/h2><p class="citation">Standardtext \(Hebräisch\)<\/p>/);assert.match(html,/@page\{size:A4 landscape;margin:6mm/);assert.match(html,/width:285mm/);assert.equal(JSON.stringify(sheet),before);
 assert.equal(E.documentModel({...sheet,blocks:[blocks[0],block('en',1,1,{citation:{...blocks[0].citation,language:'English'}})]}).bibliography.length,2);
 assert.equal(L.layout({pageMargin:100}).pageMargin,25);assert.equal(L.layout({pageMargin:0}).pageMargin,6);
});
