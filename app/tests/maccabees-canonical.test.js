'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const A=require('../maccabees-alignment'),data=require('../maccabees-alignment-data'),R=require('../reader');
const hash=d=>crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex');
function docs(title){return data.books[title].sources.filter(s=>s.rel||s.fixture||s.license==='Public Domain').map(s=>{
 const doc=s.fixture?require('./fixtures/'+s.fixture):s.rel?require('../bundled/'+s.rel):require('./fixtures/maccabees-'+(title==='Makkabäer I'?'i':'ii')+'-he.json');
 return {...doc,entry:{title:s.title},textHash:hash(doc)};
});}
function coverage(title,documents){
 const book=data.books[title],used=documents.map(()=>new Map());
 for(let c=0;c<book.chapters.length;c++){
  const cols=documents.map(d=>R.flattenNode(d.text[c])),rows=A.verseRows({title},documents,cols,[c]);assert(rows,title+' '+(c+1));
  assert.deepEqual(rows.map(r=>r.label),Array.from({length:book.sources.find(s=>s.family===1).chapters[c].slots},(_,v)=>String(v+1)));
  rows.forEach(r=>r.cells.forEach((cell,i)=>{for(const p of cell?.parts||[]){
   const key=p.chapter+':'+p.slot,intervals=used[i].get(key)||[];intervals.push([p.start,p.end]);used[i].set(key,intervals);
   assert.equal(p.html,String(documents[i].text[p.chapter-1][p.slot-1]));
   assert(!/<[^>]*$/.test(p.html.slice(0,p.start)),'start outside HTML tag');
   assert(!/<[^>]*$/.test(p.html.slice(0,p.end)),'end outside HTML tag');
  }}));
 }
 documents.forEach((d,i)=>d.text.forEach((ch,c)=>ch.forEach((html,v)=>{
  if(!html)return;const intervals=(used[i].get((c+1)+':'+(v+1))||[]).sort((a,b)=>a[0]-b[0]);let at=0;
  for(const [start,end]of intervals){assert.equal(start,at,title+' source '+i+' '+(c+1)+':'+(v+1)+' gap or duplicate');at=end;}
  assert.equal(at,html.length,title+' source '+i+' '+(c+1)+':'+(v+1)+' fully retained');
 })));
}
test('all available editions use one canonical verse axis and retain every source character once',()=>{
 for(const title of Object.keys(data.books))coverage(title,docs(title));
});
test('checked Kahana source retains every character across canonical verses', {skip:!process.env.SAFRAN_KAHANA_SOURCE},()=>{
 const raw=JSON.parse(fs.readFileSync(process.env.SAFRAN_KAHANA_SOURCE,'utf8')),s=data.books['Makkabäer I'].sources.find(s=>s.family===2),doc={text:raw.he,entry:{title:s.title}};doc.textHash=hash(doc);coverage('Makkabäer I',[doc]);
});
test('the reported English-German-Greek selection uses verses 1,2,3 instead of native 1–2,3,4–5',()=>{
 const title='Makkabäer I',all=docs(title),selected=[all.find(d=>d.versionTitle==='merged'&&d.title==='The Book of Maccabees I'),all.find(d=>/Kautzsch/.test(d.versionTitle)),all.find(d=>d.language==='Greek')];
 const rows=A.verseRows({title},selected,selected.map(d=>R.flattenNode(d.text[0])),[0]);
 assert.deepEqual(rows.slice(0,3).map(r=>r.label),['1','2','3']);
 assert.deepEqual(rows[0].cells[0].parts.map(p=>p.slot),[1,2]);
 assert.deepEqual(rows[0].cells[1].parts.map(p=>p.slot),[1,2]);
 assert.deepEqual(rows[0].cells[2].parts.map(p=>p.slot),[1]);
 assert(rows[1].cells[0].html.includes('fought'));assert(rows[1].cells[1].html.includes('Kriege'));
});
test('sliced HTML carries formatting but keeps footnote markup in exactly one fragment',()=>{
 const html='<b>first second<sup>1</sup></b>',at=html.indexOf('second');
 assert.equal(A.fragmentHtml(html,0,at),'<b>first </b>');
 assert.equal(A.fragmentHtml(html,at),'<b>second<sup>1</sup></b>');
 assert.throws(()=>A.fragmentHtml(html,1),/inside HTML tag/);
});
test('changed canonical source text is rejected rather than silently misaligned',()=>{
 const title='Makkabäer I',d=docs(title),cols=d.map(x=>R.flattenNode(x.text[0]));cols[0][0].html+='edited';assert.equal(A.verseRows({title},d,cols,[0]),null);
});
