'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const A=require('../maccabees-alignment'),data=require('../maccabees-alignment-data'),R=require('../reader'),T=require('../maccabees-text'),{compose}=require('../tools/maccabees/compose');
const hash=d=>crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex');
const manifest=require('../bundled/manifest.json').items;
function sourceDocs(book){return data.books[book].sources.filter(s=>s.rel||s.fixture||s.license==='Public Domain').map(s=>{const d=s.fixture?require('./fixtures/'+s.fixture):s.rel?require('../bundled/'+s.rel):s.fixture?require('./fixtures/'+s.fixture):require('../tests/fixtures/maccabees-'+(book==='Makkabäer I'?'i':'ii')+'-he.json');return {...d,entry:{title:s.title},textHash:hash(d)};});}
test('all four books and 56 chapters cover every native source slot once, without renumbering',()=>{
 assert.equal(Object.keys(data.books).length,4);assert.equal(data.counts.chapters,56);
 for(const book of Object.values(data.books))for(let c=0;c<book.chapters.length;c++)for(const src of book.sources){
  const numbers=book.chapters[c].groups.flatMap(g=>{const[a,b]=g[src.family];return a?Array.from({length:b-a+1},(_,i)=>a+i):[];});
  assert.deepEqual(numbers,Array.from({length:src.chapters[c].slots},(_,i)=>i+1));
 }
});
test('actual bundled and Frankel texts receive source-guarded layouts in every chapter',()=>{
 for(const title of Object.keys(data.books)){const docs=sourceDocs(title);for(let c=0;c<data.books[title].chapters.length;c++){
  const cols=docs.map(d=>R.flattenNode(d.text[c])),before=JSON.stringify(cols),p=A.passages({title},docs,cols,[c]);assert(p,title+' '+(c+1));assert.equal(JSON.stringify(cols),before);
  for(let i=0;i<cols.length;i++){const labels=p.flatMap(r=>cols[i].filter(v=>Number(v.label)>=r[i][0]&&Number(v.label)<=r[i][1]).map(v=>v.label));assert.deepEqual(labels,cols[i].map(v=>v.label));}
 }}
});
test('changed source books, columns, labels and unknown chapters are rejected',()=>{
 const title='Makkabäer II',docs=sourceDocs(title),cols=docs.map(d=>R.flattenNode(d.text[0]));
 const changed=structuredClone(cols);changed[0][0].html+=' changed';assert.equal(A.passages({title},docs,changed,[0]),null);
 const labels=structuredClone(cols);labels[0][0].label='2';assert.equal(A.passages({title},docs,labels,[0]),null);
 const edited=structuredClone(docs);edited[0].textHash='unknown';assert.equal(A.passages({title},edited,cols,[0]),null);
 assert.equal(A.passages({title},docs,cols,[99]),null);assert.equal(A.passages({title:'Genesis'},docs,cols,[0]),null);
 assert.notEqual(T.signature(cols[0]),T.signature(changed[0]));
});
test('shared-axis composition merges crossing passage boundaries without splitting or interpolation',()=>{
 const p=compose([4,3,4],[{families:[0,1],groups:[[[1,2],[1,1]],[[3,3],[2,2]],[[4,4],[3,3]]]},{families:[2,1],groups:[[[1,1],[1,1]],[[2,3],[2,3]],[[4,4],[0,0]]]}]);
 assert.deepEqual(p,[[[1,2],[1,1],[1,1]],[[3,4],[2,3],[2,3]],[[0,0],[0,0],[4,4]]]);
});
test('IV 7:24 and Greek 8:1 remain cross-chapter counterparts, never falsely paired in the same chapter',()=>{
 const title='Makkabäer IV',docs=sourceDocs(title),cols=c=>docs.map(d=>R.flattenNode(d.text[c]));
 const seven=A.passages({title},docs,cols(6),[6]),eight=A.passages({title},docs,cols(7),[7]);
 assert(seven.some(r=>r[0][0]===24&&r[1][0]===0&&r.continuations[1].chapter===8));
 assert(eight.some(r=>r[0][0]===0&&r[1][0]===1&&r.continuations[0].chapter===7));
});


test('equal row counts never align an unknown Maccabees edition automatically',()=>{
 const W=require('../library-works'),group={title:'Makkabäer III'},docs=[{title:'Das dritte Buch der Makkabäer',textHash:'unreviewed-a'},{title:'Das dritte Buch der Makkabäer',textHash:'unreviewed-b'}],cols=[[{label:'1',html:'new'}],[{label:'1',html:'other'}]];
 assert.equal(A.passages(group,docs,cols,[0]),null);assert.equal(W.independentNumbering(group,docs,cols),true);
});

test('English exports preserve sparse chapter coverage and the actual Hebrew-English-German selection',()=>{
 for(const title of ['Makkabäer I','Makkabäer II']){
  const docs=sourceDocs(title).filter(d=>d.language!=='Greek');
  assert(docs.some(d=>d.versionTitle==='merged'));
  for(let c=0;c<data.books[title].chapters.length;c++){
   const columns=docs.map(d=>R.flattenNode(d.text[c]));
   const ranges=A.passages({title},docs,columns,[c]);assert(ranges,title+' '+(c+1));
   columns.forEach((column,i)=>assert.deepEqual(ranges.flatMap(g=>column.filter(r=>+r.label>=g[i][0]&&+r.label<=g[i][1])),column));
  }
 }
 const ii=sourceDocs('Makkabäer II').find(d=>d.versionTitle==='merged');
 assert.equal(R.flattenNode(ii.text[2]).length,0);assert.equal(R.flattenNode(ii.text[14]).length,0);
});

test('unselected source divisions do not merge matching Hebrew-English-German verses',()=>{
 const title='Makkabäer I',docs=sourceDocs(title).filter(d=>d.language!=='Greek'&&d.title==='The Book of Maccabees I');
 const cols=docs.map(d=>R.flattenNode(d.text[0])),ranges=A.passages({title},docs,cols,[0]);
 assert(ranges.some(g=>g.every(r=>r[0]===4&&r[1]===4)));
 assert(ranges.some(g=>g.every(r=>r[0]===5&&r[1]===5)));
});
