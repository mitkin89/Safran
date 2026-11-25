'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),F=require('../notes-formatting');
test('formatting preserves Hebrew, selected ranges, paragraphs and toggles markers',()=>{
 let r=F.format('אחד שני',0,3,'bold');assert.equal(r.text,'**אחד** שני');assert.equal(r.text.slice(r.start,r.end),'אחד');r=F.format(r.text,r.start,r.end,'bold');assert.equal(r.text,'אחד שני');
 assert.equal(F.format('eins\nzwei\ndrei',0,9,'list').text,'- eins\n- zwei\ndrei');assert.equal(F.format('a\nb',0,3,'quote').text,'> a\n> b');assert.equal(F.format('> a\n> b',0,7,'quote').text,'a\nb');
 const empty=F.format('',0,0,'italic');assert.equal(empty.text,'*Text*');assert.equal(empty.text.slice(empty.start,empty.end),'Text');
});
test('preview renders formatting without accepting executable markup or link protocols',()=>{
 const html=F.markdown('**Fett** und *kursiv*\n- Liste\n> Zitat\n[Stelle](Genesis 1:1)\n[Web](https://example.com)\n<img src=x onerror=alert(1)>\n[X](javascript:alert)');
 for(const fragment of ['<strong>Fett</strong>','<em>kursiv</em>','<ul>','<blockquote>','data-nw-reference="Genesis 1:1"','data-nw-url="https://example.com/"','&lt;img'])assert(html.includes(fragment),fragment);
 assert(!html.includes('<img'));assert(!html.includes('data-nw-url="javascript:'));assert.equal(F.target('javascript:alert(1)'),null);assert.equal(F.target('data:text/html,1'),null);assert.throws(()=>F.format('x',0,1,'link','javascript:alert'),/gültige/);
});
test('history undoes and redoes formatting; editing after undo discards only the redo branch',()=>{
 const h=new F.History('Original');h.push({text:'**Original**',start:2,end:10});h.push({text:'Neu',start:3,end:3});assert.equal(h.undo().text,'**Original**');assert.equal(h.undo().text,'Original');assert.equal(h.redo().text,'**Original**');h.push({text:'Anders',start:6,end:6});assert.equal(h.redo(),null);assert.equal(h.undo().text,'**Original**');
});
test('bold and italic combine and multiline selections retain paragraph formatting',()=>{
 const bold=F.format('שלום',0,4,'bold'),both=F.format(bold.text,bold.start,bold.end,'italic');assert.equal(both.text,'***שלום***');assert.match(F.markdown(both.text),/<em><strong>שלום<\/strong><\/em>/);const unitalic=F.format(both.text,both.start,both.end,'italic');assert.equal(unitalic.text,'**שלום**');
 assert.equal(F.format('eins\nzwei',0,9,'bold').text,'**eins**\n**zwei**');assert.equal(F.format('\nx',0,0,'list').text,'- \nx');
});
