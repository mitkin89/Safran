'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../mishnah-morph'),D=require('../mishnah-zeraim-data'),Ber=require('../mishnah-morph-data'),B=require('../tools/mishnah-morph/build.cjs'),Morph=require('../morph');
test('all eleven Zeraim tractates bind every unit and token to its unmodified Kaufmann text',()=>{
 assert.deepEqual(Object.keys(D.sources),M.titles);const counts=D.forms.map(()=>0);
 for(const title of M.titles){const source=D.sources[title],doc=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',source.rel))),coverage=D.coverage.find(c=>c.title===title);let words=0,units=0;
 assert.equal(B.hash(doc.text),source.textHash);
 doc.text.forEach((ch,c)=>ch.forEach((html,m)=>{const tokens=M.tokens(B.main(html));const ids=M.match(D,title,c+1,m+1,tokens);assert(ids,`${title} ${c+1}:${m+1}`);ids.forEach(id=>counts[id]++);words+=ids.length;units++;if(tokens.length)assert.equal(M.match(D,title,c+1,m+1,['שגיאה',...tokens.slice(1)]),null);}));
 assert.equal(words,coverage.words);assert.equal(units,coverage.mishnayot);
 }assert.deepEqual(counts,D.forms.map(f=>f.count));assert.equal(M.match(D,'Mishnah Shabbat',1,1,[]),null);
});
test('Berakhot context analyses remain unchanged; new forms are unreviewed and sourced',()=>{
 assert.deepEqual(D.sources['Mishnah Berakhot'],Ber.sources['Mishnah Berakhot']);assert.deepEqual(D.forms.slice(0,Ber.forms.length),Ber.forms);
 for(const f of D.forms){assert(['candidate','ambiguous','partial','unresolved'].includes(f.status));for(const a of f.analyses){assert(a.lemma);assert(a.rules.every(id=>D.rules[id]?.refs.length));const result=Morph.decode(a.morph,a.lemma);assert(result?.segs.length);assert(result.segs.every(s=>s.pos),a.morph);}}
 assert(D.forms.some(f=>f.status==='unresolved'));assert(D.forms.some(f=>f.analyses.some(a=>a.method==='biblical-form')));
});
test('new agricultural cards offer editorial meanings with explicit provenance',()=>{
 const meanings=require('../mishnah-meanings');for(const lemma of ['מעשר','תרומה','כלאים','פאה','חלה','שכחה','דמאי']){const a={lemma,morph:'HNcmsa'};assert.equal(meanings.lookup(a,{},'de')?.source,'editorial');assert(meanings.lookup(a,{},'en')?.text);}
});
test('Maagarim checks retain pointed lexical distinctions and genuine alternatives',()=>{
 const forms=word=>D.forms.filter(f=>f.key===M.normalize(word)).flatMap(f=>f.analyses);
 assert(forms('שְׁבִיעִית').some(a=>M.headLemma(a)==='שביעית'&&a.morph==='HNcfsa'));
 assert(forms('שְׁבִיעִית').some(a=>a.morph==='HAofsa'));
 assert(forms('בִּכּוּרִים').some(a=>M.headLemma(a)==='ביכור'));
 assert(forms('מְבִיאִין').some(a=>M.headLemma(a)==='בוא'&&a.morph==='HVhrmpa'));
 const id=D.sources['Mishnah Challah'].chapters[0][2][18],f=D.forms[id];assert.equal(f.key,M.normalize('מוֹתַר'));assert(f.analyses.some(a=>a.lemma==='מותר'&&a.morph==='HNcmsc'));assert(!f.analyses.some(a=>a.lemma==='נתר'));
 const ctx={window:{}};require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname,'../library-mishnah-morph.js'),'utf8'),ctx);
 for(const title of M.titles)assert(ctx.window.LibraryMishnahMorph.supports(title,D.edition));assert(!ctx.window.LibraryMishnahMorph.supports('Mishnah Shabbat',D.edition));assert(!ctx.window.LibraryMishnahMorph.supports('Mishnah Peah','another edition'));
});
test('context review binds all 262 checked positions and preserves per-occurrence meanings',()=>{
 const rows=require('../tools/mishnah-morph/zeraim-context-review-1.json'),meanings=require('../mishnah-meanings');assert.equal(rows.length,262);assert.equal(new Set(rows.map(r=>r.word)).size,40);
 for(const r of rows){const s=D.sources[r.title],[c,m]=r.ref.split(':').map(Number),f=D.forms[s.chapters[c-1][m-1][r.token-1]];assert.equal(s.textHash,r.sourceHash);assert.equal(f.key,M.normalize(r.word));assert.deepEqual(f.analyses,r.analyses);assert.notEqual(f.status,'reviewed');assert(meanings.lookup(f.analyses[0],{},'de').text);}
 const at=(title,c,m,t)=>D.forms[D.sources['Mishnah '+title].chapters[c-1][m-1][t-1]];
 const noun=at('Terumot',3,8,9),verb=at('Terumot',4,7,5);assert.equal(noun.analyses[0].morph,'HNcfsa');assert.equal(verb.analyses[0].morph,'HVqrfsa');assert.equal(meanings.lookup(noun.analyses[0],{},'de').text,'Brandopfer');assert(meanings.lookup(verb.analyses[0],{},'de').text.includes('Beimischung'));
 const cultivation=at('Kilayim',4,1,55),priest=at('Terumot',8,1,83);assert.equal(cultivation.key,priest.key);assert.notDeepEqual(cultivation.analyses,priest.analyses);assert(meanings.lookup(cultivation.analyses[0],{},'de').text.includes('Bearbeitungsraum'));assert.equal(meanings.lookup(priest.analyses[0],{},'de').text,'sein Priesterdienst');
 assert.equal(at('Peah',3,3,2).analyses[0].morph,'HNcmpa','onion initial ב is not a preposition');
 const nitpael=at('Maaser Sheni',3,9,7).analyses[0];assert.equal(nitpael.morph,'HTr/VDp3ms');assert(Morph.decode(nitpael.morph,nitpael.lemma).segs.some(s=>s.stem==='Nitpa‘el'));
 const suffix=at('Terumot',1,1,7).analyses[0];assert(suffix.morph.endsWith('Sp3mp'));
});
