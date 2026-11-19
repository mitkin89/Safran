'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),zlib=require('node:zlib');
const S=require('../passage-statistics'),D=require('../passage-stats-data'),{load}=require('../tools/oshb/forms');
const word=(l,m,t)=>`<span class="w" data-l="${l}" data-m="${m}">${t}</span>`;
test('Statistics index counts every recognized OSHB token and all 39 book denominators',()=>{
 let N=0;const totals={};for(const book of load()){
  let n=0;for(const ch of book.text)for(const html of ch)for(const t of S.tokens(html))if(t.lemma){n++;totals[t.lemma]=(totals[t.lemma]||0)+1;}
  assert.equal(n,D.books[book.title].N);assert.equal(crypto.createHash('sha256').update(JSON.stringify(book.text)).digest('hex'),D.source.books[book.title]);N+=n;
 }
 assert.equal(N,D.N);assert.deepEqual(totals,D.lemmas);assert.equal(Object.keys(D.books).length,39);
 for(const [name,sha]of Object.entries(D.source.roots.files)){const raw=zlib.gunzipSync(fs.readFileSync(require.resolve('../tools/oshb/statistics-sources/'+name+'.xml.gz')));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),sha);}
});
test('Book and Tanakh comparisons use separate frequencies, retain rare lemmas and do not infer topics',()=>{
 const genesis=load()[0],rows=genesis.text[0].map((html,i)=>({html,label:i+1})),s=S.analyze(rows,D,'Genesis',1);
 assert.equal(s.words,427);for(const r of s.comparisons.book){assert.equal(r.rateHere,1000*r.n/427);assert.equal(r.rateRest,1000*(r.B-r.n)/(D.books.Genesis.N-427));}assert(s.comparisons.book.length);assert(s.comparisons.tanakh.length);assert.notDeepEqual(s.comparisons.book.map(x=>x.w.lemma),s.comparisons.tanakh.map(x=>x.w.lemma));
 assert(s.rare.length);for(const r of s.rare){assert(r.T>=1&&r.T<=19);assert.equal(r.B,D.books.Genesis.lemmas[r.w.lemma]);}
 assert(s.forms.some(x=>x.tense==='Imperfekt consecutivum (wajjiqtol)'));assert.equal(s.forms.reduce((n,x)=>n+x.n,0),s.stems.reduce((n,x)=>n+x.n,0));
 assert(s.phrases.length);assert(s.evidence.some(x=>x.sources&2));assert(s.families.every(f=>f.items.every(r=>D.roots[r.w.lemma].id===f.id)));
 const obadiah=load().find(b=>b.title==='Obadiah'),one=S.analyze(obadiah.text[0].map((html,i)=>({html,label:i+1})),D,'Obadiah',1);assert.equal(one.comparisonAvailable.book,false);assert.deepEqual(one.comparisons.book,[]);assert(one.comparisonAvailable.tanakh);
});
test('Phrase boundaries, morphological variants and homonymous roots stay distinct',()=>{
 const index={N:1000,lemmas:{'1':100,'2':3,'3':5},books:{B:{N:100,lemmas:{'1':10,'2':2,'3':2}}},roots:{'1':{id:'a',root:'אב',lang:'heb'},'2':{id:'b',root:'אב',lang:'heb'}},coverage:{B:{'1:1':4}}};
 const a=word('1','HVqp3ms','אָב'),b=word('2','HNcmsa','אב'),c=word('1','HVqw3ms','אב');
 const s=S.analyze([{label:1,html:a+b},{label:2,html:c+b}],index,'B',1);
 assert.equal(s.phrases.length,1);assert.equal(s.phrases[0].n,2);assert.equal(s.families.length,2);assert.equal(s.forms.length,2);assert.equal(s.evidence[0].sources,4);
 assert(!s.phrases.some(p=>p.tokens[0].lemma==='2')); // no bigram spanning verse boundary
 const broken=S.analyze([{label:1,html:a+word('','HX','?')+b},{label:2,html:a+b}],index,'B',1);assert.equal(broken.phrases.length,0);
 const absent={...index,roots:{}};assert.equal(S.analyze([{html:a+b}],absent,'B',1).families.length,0); // spelling alone never invents a root
});

test('Rarity and vocabulary tiers follow the selected corpus, not a fixed Tanakh list',()=>{
 const s=S.analyze(load()[0].text[0].map((html,i)=>({html,label:i+1})),D,'Genesis',1);
 assert(s.rareByCorpus.book.some(r=>r.w.lemma==='8414')); // tohu: once in Genesis, 20 times in Tanakh
 assert(!s.rareByCorpus.tanakh.some(r=>r.w.lemma==='8414'));
 assert(s.rareByCorpus.book.length>s.rareByCorpus.tanakh.length);
 for(const [key,field]of [['book','B'],['tanakh','T']]){
  const rare=s.rareByCorpus[key];assert(rare.every(r=>r[field]>0&&r[field]<=19));for(let i=1;i<rare.length;i++)assert(rare[i-1][field]<=rare[i][field]);
  assert(s.vocabularyByCorpus[key].vocab.every(r=>r[field]>0&&r[field]<100));
  const tier=s.vocabularyByCorpus[key].tiers.find(t=>t.key==='1');assert((tier?.items||[]).every(r=>r[field]===1));if(!tier)assert(!s.all.some(r=>r[field]===1&&!/^Eigenname$/.test(r.w.pos)&&!require('../passage').isFunction(r.w.pos)));
 }
 assert.notDeepEqual(s.vocabularyByCorpus.book.vocab.map(r=>r.w.lemma),s.vocabularyByCorpus.tanakh.vocab.map(r=>r.w.lemma));
});

test('Concentration badges retain the old half-of-corpus threshold and show the exact rounded share',()=>{
 assert.equal(S.concentration(7,13),54);assert.equal(S.concentration(6,8),75);assert.equal(S.concentration(6,6),100);
 assert.equal(S.concentration(1,2),50);assert.equal(S.concentration(1,1),null);assert.equal(S.concentration(2,5),null);assert.equal(S.concentration(1,0),null);assert.equal(S.concentration(9,6),null);
 const s=S.analyze(load()[0].text[0].map((html,i)=>({html,label:i+1})),D,'Genesis',1),word=s.all.find(r=>r.w.lemma==='7549');
 assert.notEqual(S.concentration(word.n,word.B),S.concentration(word.n,word.T)); // different corpus shares, not a fixed Tanakh badge
});
