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
 assert(D.forms.some(f=>f.status==='unresolved'));assert(!D.forms.some(f=>f.analyses.some(a=>a.method==='biblical-form'||a.rules.includes('biblical-form'))));assert(!D.rules['biblical-form']);
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


test('Peah screenshot decisions are occurrence-bound and distinguish visible tags from editorial suffix features',()=>{
 const rows=require('../tools/mishnah-morph/accordance-peah-1.json'),inventory=require('../tools/mishnah-morph/accordance-peah-inventory.json'),meanings=require('../mishnah-meanings');
 assert.equal(rows.length,19);assert.equal(rows.filter(r=>r.before.status==='unresolved').length,16);assert.equal(inventory.length,50);
 const used=new Set();for(const r of rows){const source=D.sources[r.title],[c,m]=r.ref.split(':').map(Number),f=D.forms[source.chapters[c-1][m-1][r.token-1]],a=f.analyses[0],e=a.comparison;
  assert.equal(source.textHash,r.sourceHash);assert.equal(f.key,M.normalize(r.word));assert.deepEqual(f.analyses,r.analyses);assert.equal(f.status,'candidate');
  assert.equal(e.status,'visually-checked');assert.equal(e.ref,'Pea '+r.ref);const image=inventory.find(i=>i.id===e.driveId);assert(image&&image.usedForDecisions);assert.equal(e.sha256,image.sha256);assert.equal(e.file,image.name);assert(e.lex&&e.tags);assert(meanings.lookup(a,{},'de').text);used.add(e.driveId);
 }
 assert.equal(used.size,4);
 const at=(ref,t)=>rows.find(r=>r.ref===ref&&r.token===t).analyses[0];
 assert.equal(at('1:6',40).lemma,'כהן');assert.equal(at('1:6',40).morph,'HNcmsa');assert.equal(at('1:4',7).morph,'HC/VNrmsa');
 assert.equal(at('1:6',48).morph,'HTr/Vpi3mp');assert.equal(at('1:3',5).morph,'HC/R/Ncmsc/Sp3fs');assert(at('1:3',5).comparison.suffixFeatures);
 assert.equal(at('1:3',17).comparison.lex,'שאר');assert.equal(at('1:3',17).lemma,'שייר');
 const sibling=D.forms[D.sources['Mishnah Peah'].chapters[0][0][7]];assert.equal(sibling.status,'unresolved','unseen Peah 1:1 is not silently filled');
});


test('Peah chapter two fills only supported positions and retains source-tag disagreements and open tokens',()=>{
 const rows=require('../tools/mishnah-morph/accordance-peah-2.json'),open=require('../tools/mishnah-morph/accordance-peah-2-open.json');assert.equal(rows.length,51);assert.equal(open.length,3);
 const at=(ref,t)=>rows.find(r=>r.ref===ref&&r.token===t).analyses[0];
 for(const r of rows){const src=D.sources[r.title],[c,m]=r.ref.split(':').map(Number),f=D.forms[src.chapters[c-1][m-1][r.token-1]];assert.equal(src.textHash,r.sourceHash);assert.equal(f.key,M.normalize(r.word));assert.deepEqual(f.analyses,r.analyses);assert.equal(r.before.status,'unresolved');assert(f.analyses[0].comparison.tags);assert.equal(f.analyses[0].comparison.status,'visually-checked');assert.equal(f.status,'candidate');}
 for(const r of open){const [c,m]=r.ref.split(':').map(Number),f=D.forms[D.sources['Mishnah Peah'].chapters[c-1][m-1][r.token-1]];assert.equal(f.status,'unresolved');assert.equal(f.word,r.word);}
 assert.equal(at('2:6',20).lemma,'מיישא');assert.equal(at('2:6',20).morph,'HNp');
 assert.equal(at('2:5',12).morph,'HNcfpa');assert(at('2:5',12).comparison.tags.includes('ms pl'));assert(at('2:5',12).note.includes('Kongruenz'));
 assert.equal(at('2:7',8).morph,'HVpp3fs/Sp3fs');assert(at('2:7',8).comparison.tags.includes('imprf'));assert(at('2:7',8).note.includes('Imperfekt'));
 assert.equal(at('2:7',6).morph,'HVpp3cp/Sp3fs');assert(at('2:7',6).comparison.tags.includes('qal'));
});


test('Peah chapter three preserves bulb and dill senses and does not fill unaligned editorial duplicates',()=>{
 const rows=require('../tools/mishnah-morph/accordance-peah-3.json'),open=require('../tools/mishnah-morph/accordance-peah-3-open.json');assert.equal(rows.length,51);assert.equal(open.length,10);
 for(const r of rows){const src=D.sources[r.title],[c,m]=r.ref.split(':').map(Number),f=D.forms[src.chapters[c-1][m-1][r.token-1]];assert.equal(src.textHash,r.sourceHash);assert.equal(f.key,M.normalize(r.word));assert.deepEqual(f.analyses,r.analyses);assert.equal(r.before.status,'unresolved');assert.equal(f.status,'candidate');assert.equal(f.analyses[0].comparison.ref,'Pea '+r.ref);}
 for(const r of open){const[c,m]=r.ref.split(':').map(Number),f=D.forms[D.sources['Mishnah Peah'].chapters[c-1][m-1][r.token-1]];assert.equal(f.status,'unresolved');assert.equal(f.word,r.word);}
 const at=(ref,t)=>rows.find(r=>r.ref===ref&&r.token===t).analyses[0];assert.equal(at('3:2',25).gloss.de,'Dill');assert.equal(at('3:2',25).morph,'HNcmsa');assert.equal(at('3:5',7).morph,'HC/VDp3cp');assert.equal(at('3:8',26).morph,'HNcmpc/Sp1cs');
});

test('full Seraim image inventory retains pending review status and binds every selected decision to the original image',()=>{
 const state=require('../tools/mishnah-morph/accordance-zeraim-state.json'),images=require('../tools/mishnah-morph/accordance-zeraim-image-inventory.json');
 const rows=require('../tools/mishnah-morph/accordance-reviews.json').flatMap(file=>require('../tools/mishnah-morph/'+file));
 assert.equal(state.status,'in-progress');assert.equal(state.imageCount,1080);assert.equal(images.length,1080);assert.equal(new Set(images.map(i=>i.id)).size,1080);assert.equal(state.bytes,446422879);assert.equal(state.selectedDecisions,rows.length);assert.equal(state.newlyFilled,rows.filter(r=>r.before.status==='unresolved').length);
 assert.equal(state.books.length,11);assert.equal(state.books.reduce((n,b)=>n+b.units.length,0),655);
 for(const b of state.books){assert.equal(b.sourceHash,D.sources[b.title].textHash);for(const u of b.units){const[c,m]=u.ref.split(':').map(Number),ids=D.sources[b.title].chapters[c-1][m-1];assert.equal(u.words,ids.length);assert.equal(u.unresolved,ids.filter(id=>D.forms[id].status==='unresolved').length);assert(u.status!=='complete');}}
 for(const r of rows){const e=r.analyses[0].comparison,i=images.find(i=>i.id===e.driveId);assert(i&&i.usedForDecisions);assert.equal(i.sha256,e.sha256);assert.equal(i.name,e.file);}
 assert(state.books.find(b=>b.title==='Mishnah Bikkurim').units.every(u=>u.status!=='complete'));
});

test('Peah four keeps nominal disagreements open and marks fruit suffixes as editorial',()=>{
 const rows=require('../tools/mishnah-morph/accordance-peah-4.json'),open=require('../tools/mishnah-morph/accordance-peah-4-open.json');assert.equal(rows.length,49);assert.equal(open.length,0);
 for(const r of rows){const s=D.sources[r.title],[c,m]=r.ref.split(':').map(Number),f=D.forms[s.chapters[c-1][m-1][r.token-1]];assert.equal(r.sourceHash,s.textHash);assert.equal(f.key,M.normalize(r.word));assert.deepEqual(f.analyses,r.analyses);assert.equal(r.before.status,'unresolved');assert.equal(f.status,'candidate');}
 for(const r of open){const[c,m]=r.ref.split(':').map(Number),f=D.forms[D.sources['Mishnah Peah'].chapters[c-1][m-1][r.token-1]];assert.equal(f.status,'unresolved');assert.equal(f.word,r.word);}
 const at=(ref,t)=>rows.find(r=>r.ref===ref&&r.token===t).analyses[0];assert.equal(at('4:8',21).morph,'HC/Vqp3ms/Sp3mp');assert(at('4:8',21).comparison.suffixFeatures);assert.equal(at('4:9',31).lemma,'בקר');assert.equal(at('4:4',5).morph,'HRd/Ncmpa');
});

test('all registered Accordance decisions retain source positions, image provenance and explicit editorial suffixes',()=>{
 const files=require('../tools/mishnah-morph/accordance-reviews.json'),images=require('../tools/mishnah-morph/accordance-zeraim-image-inventory.json'),seen=new Set();
 for(const file of files)for(const r of require('../tools/mishnah-morph/'+file)){
  const key=r.title+'/'+r.ref+'/'+r.token;assert(!seen.has(key),key);seen.add(key);
  for(const a of r.analyses){const first=a.lemma.split('/')[0],prefix={ו:'ו',ש:'ש',ה:'ה',ל:'ל',ב:'ב',כ:'כ',מן:'מ'}[first];if(prefix&&a.lemma.includes('/'))assert(r.word.normalize('NFD').replace(/[\u0591-\u05C7]/g,'').startsWith(prefix),key+' unexpected prefix');}
  const s=D.sources[r.title],[c,m]=r.ref.split(':').map(Number),f=D.forms[s.chapters[c-1][m-1][r.token-1]];
  assert.equal(s.textHash,r.sourceHash);assert.equal(f.key,M.normalize(r.word));assert.deepEqual(f.analyses,r.analyses);assert.notEqual(f.status,'reviewed');
  for(const a of r.analyses){const e=a.comparison,i=images.find(i=>i.id===e.driveId);assert(i,key);assert.equal(e.sha256,i.sha256);assert.equal(e.file,i.name);assert.equal(e.status,'visually-checked');assert(e.tags&&e.lex);assert(a.gloss.de&&a.gloss.en);assert(Morph.decode(a.morph,a.lemma).segs.every(s=>s.pos));assert.equal(a.lemma.split('/').length,a.morph.slice(1).split('/').filter(s=>!s.startsWith('S')).length,key);for(const code of a.morph.slice(1).split('/'))assert(/^(C|D|R[d]?|T[adeijmnor]|Np|N[cg][mfcbx][spdx][acd]?|A[acgo][mfcbx][spdx][acd]?|Pi|S[dhn]|P[dfipr][123x][mfcbx][spdx]|Sp[123x][mfcbx][spdx]|V[qNpPhHtoOrMmkKQlLfDjiucvwyz][ac]|V[qNpPhHtoOrMmkKQlLfDjiucvwyz][rs][mfcbx][spdx][acd]?|V[qNpPhHtoOrMmkKQlLfDjiucvwyz][pqiwhjv][123x][mfcbx][spdx])$/.test(code),key+' '+code);if(a.morph.includes('Sp'))assert(e.suffixFeatures,key);}
 }
 const at=(c,m,t)=>D.forms[D.sources['Mishnah Peah'].chapters[c-1][m-1][t-1]].analyses[0];
 assert.equal(at(7,4,1).comparison.ref,'Pea 7:5');assert.equal(at(7,6,19).comparison.ref,'Pea 7:7');assert.equal(at(8,6,6).morph,'HC/R/Np');
 for(const c of [5,6,7,8])for(const r of require('../tools/mishnah-morph/accordance-peah-'+c+'-open.json')){const[cc,m]=r.ref.split(':').map(Number),f=D.forms[D.sources['Mishnah Peah'].chapters[cc-1][m-1][r.token-1]];assert.equal(f.word,r.word);assert.equal(f.status,'unresolved');}
});
