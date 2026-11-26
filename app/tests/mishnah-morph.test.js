'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('../mishnah-morph'),D=require('../mishnah-morph-data'),Morph=require('../morph'),R=require('../reader'),AutoRef=require('../autoref'),{stripHtml}=require('../lib'),{compare}=require('../tools/mishnah-morph/compare.cjs');
const source=D.sources['Mishnah Berakhot'],doc=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',source.rel)));
const plain=html=>stripHtml(AutoRef.link(R.splitFootnotes(html).main,{last:''}).replace(/<a\b[^>]*class="aref"[^>]*>[\s\S]*?<\/a>/gi,' ').replace(/<small\b[^>]*>[\s\S]*?<\/small>/gi,' ').replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n'));
test('pilot binds all 57 Berakhot units to the exact pointed source without changing its text',()=>{
 assert.deepEqual(Object.keys(D.sources),['Mishnah Berakhot']);assert.equal(D.coverage.chapters,9);assert.equal(D.coverage.mishnayot,57);
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex'),source.textHash);
 const counts=D.forms.map(()=>0);let units=0,words=0;
 doc.text.forEach((ch,c)=>ch.forEach((html,m)=>{const tokens=M.tokens(plain(html)),ids=M.match(D,D.title,c+1,m+1,tokens.map(t=>t.word));assert(ids,`${c+1}:${m+1}`);assert.equal(ids.length,tokens.length);ids.forEach(id=>counts[id]++);units++;words+=ids.length;}));
 assert.equal(units,57);assert.equal(words,2159);assert.equal(words,D.coverage.words);assert.deepEqual(counts,D.forms.map(f=>f.count));
 assert.equal(M.match(D,'Mishnah Peah',1,1,[]),null);
});
test('source matching rejects changed spelling, vocalization, token order, insertions and omissions',()=>{
 const words=M.tokens(plain(doc.text[0][0])).map(t=>t.word);
 assert(M.match(D,D.title,1,1,words));
 for(const changed of [[...words.slice(1)],['וְ',...words],[...words.slice().reverse()],words.map((w,i)=>i===1?'קָרִין':w),words.map((w,i)=>i===1?'קורין':w)])assert.equal(M.match(D,D.title,1,1,changed),null);
 assert.equal(M.normalize('קוֹרִין'),M.normalize('קוֹרִין'.normalize('NFC')));assert.notEqual(M.normalize('קָרִין'),M.normalize('קוֹרִין'));
});
test('editorial small labels and pointed biblical citations are not running words',()=>{
 const html='<small>א</small> קוֹרִין (דְּבָרִים ו, ז) <sup>2</sup> שְׁמַע';
 assert.deepEqual(M.tokens(plain(html)).map(t=>t.word),['קוֹרִין','שְׁמַע']);
 const text='קוֹרִין (תְּהִלִּים סח, כז) שְׁמַע';for(const t of M.tokens(text))assert.equal(text.slice(t.start,t.end),t.word);
});
test('candidates carry grammatical sources and valid codes, never a false reviewed label',()=>{
 const positions=new Set(['Verb','Nomen','Eigenname','Gentilizium','Adjektiv','Kardinalzahl','Ordinalzahl','Personalpronomen','Demonstrativpronomen','Interrogativpronomen','Indefinitpronomen','Relativpronomen','Präposition','Konjunktion','Adverb','Negation','Artikel','Pronominalsuffix','Akkusativzeichen (את)','Relativpartikel (אשר)','Bejahungspartikel','Fragepartikel (הֲ)','Fragepartikel','Partikel','Richtungs-He','He paragogicum','Nun paragogicum','Interjektion','Demonstrativpartikel','Aufforderungspartikel']);
 for(const f of D.forms){assert(['candidate','ambiguous','partial','unresolved'].includes(f.status));for(const a of f.analyses){
  assert(a.lemma);assert(/^H/.test(a.morph));assert(a.rules.length);a.rules.forEach(id=>assert(D.rules[id]?.refs.length));
  const d=Morph.decode(a.morph,a.lemma);assert(d?.segs.length);for(const s of d.segs)assert(positions.has(s.pos),a.morph+' '+s.pos);
 }}
});
test('known Mishnaic forms retain participles, weak-root infinitives and real ambiguity',()=>{
 const at=w=>D.forms.find(f=>f.key===M.normalize(w));
 assert(at('קוֹרִין').analyses.some(a=>a.lemma==='קרא'&&a.morph==='HVqrmpa'));
 assert(at('נִכְנָסִים').analyses.some(a=>a.lemma==='כנס'&&a.morph==='HVNrmpa'));
 assert(at('לִקְרוֹת').analyses.some(a=>M.headLemma(a)==='קרא'&&a.morph.endsWith('Vqc')));
 assert(at('שְׁמַע').analyses.some(a=>a.morph==='HNcmsa'));assert(D.forms.some(f=>f.status==='ambiguous'));
 const context=D.forms[source.chapters[0][0][3]];assert.equal(context.status,'candidate');assert.deepEqual(context.analyses.map(a=>a.morph),['HNcmsa']);
 const forms=M.forms(D,'קרא');assert(forms.length>1);assert(forms.every(f=>f.count>0));assert(!forms.some(f=>f.word==='קָרְאִנְתֶּן'));
 assert.equal(M.form(D,-1),null);
});
test('local reference comparisons require explicit text alignment and do not guess missing tags',()=>{
 const ref={module:'MISH-T',version:'4.3',title:D.title,rows:[
  {ref:'1:1',word:'קוֹרִין',lemma:'קרא',morph:'HVqrmp'},
  {ref:'1:1',word:'קוֹרִין',lemma:'קרא',morph:'HVqp3ms'},
  {ref:'1:1',word:'קָרִין',lemma:'קרא',morph:'HVqrmp'},
  {ref:'1:1',word:'קוֹרִין',lemma:'קרא'},
  {ref:'1:1',word:'אֶת',lemma:'את',morph:'HTo'}
 ]};
 const result=compare(D,ref);assert.deepEqual(result.map(r=>r.status),['candidate-compatible','different-or-unresolved','text-not-aligned','reference-incomplete','alignment-required']);
 assert.throws(()=>compare(D,{...ref,version:'unknown'}),/explicitly identified/);
});

test('comparison-driven contextual corrections preserve source words and do not leak to other occurrences',()=>{
 const at=(c,m,t)=>D.forms[source.chapters[c-1][m-1][t-1]];
 assert.deepEqual(at(1,1,22).analyses.map(a=>[a.lemma,a.morph]),[['רבן','HNcmsa']]);
 assert(at(1,1,47).analyses.some(a=>a.lemma==='נתר'&&a.root==='נתר'));assert(!at(1,1,47).analyses.some(a=>a.lemma==='יתר'));
 assert.deepEqual(at(1,1,64).analyses.map(a=>a.morph),['HNcmsc']);
 assert.deepEqual(at(1,1,21).analyses.map(a=>a.morph),['HNcfsa']);
 assert(at(1,2,40).analyses.some(a=>a.morph==='HRd/Ncfsa'));
 assert(at(1,2,9).analyses.some(a=>a.morph.endsWith('Aamsa')));assert(at(1,2,9).analyses.some(a=>a.morph.endsWith('Ncmsa')));
 for(const t of [1,14])assert.deepEqual(at(1,3,t).analyses.map(a=>a.morph),['HNcmsc']);
 assert.deepEqual(at(1,3,9).analyses.map(a=>a.morph),['HC/Rd/Ncmsa']);
 for(const t of [23,47])assert.deepEqual(at(1,3,t).analyses.map(a=>a.morph),['HRd/Ncbsa']);
 assert.deepEqual(at(1,3,46).analyses.map(a=>[a.lemma,a.morph]),[['בוא','HVqrmsa']],'הייתי בא requires the participle in this context');
 const forms=M.forms(D,'שמע');assert.equal(new Set(forms.map(f=>M.normalize(f.word))).size,forms.length,'context records do not duplicate a written form in the table');
});
test('feature comparison distinguishes segmentation, specified grammar and omitted suffix tags',()=>{
 const {featureCompatible}=require('../tools/mishnah-morph/compare.cjs');
 assert(featureCompatible({lemma:'ב/ה/ערב',morph:'HR/Td/Ncmpa'},[{type:'R',lemma:'ב',article:true},{type:'N',lemma:'ערב',gender:'m',number:'p'}]));
 assert(!featureCompatible({lemma:'ב/תורה',morph:'HR/Ncfsa'},[{type:'R',lemma:'ב',article:true},{type:'N',lemma:'תורה'}]));
 assert(featureCompatible({lemma:'ב/תרומה',morph:'HR/Ncfsc/Sp3mp'},[{type:'R',lemma:'ב'},{type:'N',lemma:'תרומה',state:'c'},{unreadable:true}]));
 assert(!featureCompatible({lemma:'ב/תרומה',morph:'HR/Ncfsc/Sp3mp'},[{type:'S',person:'3',gender:'f',number:'p'}]));
});

test('Berakhot 1:4–5 retains fused articles, complete adverb segments and dependent construct nouns',()=>{
 const at=(m,t)=>D.forms[source.chapters[0][m-1][t-1]].analyses;
 assert.deepEqual(at(4,7).map(a=>a.morph),['HC/Rd/Ncmsa']);
 for(const t of [6,11])assert.deepEqual(at(4,t).map(a=>[a.lemma,a.morph]),[['ל/אחר','HR/D/Sp3fs']]);
 for(const t of [4,20])assert.deepEqual(at(5,t).map(a=>a.morph),['HRd/Ncmpa']);
 assert.deepEqual(at(5,29).map(a=>a.morph),['HNcmsc']);
 assert.deepEqual(at(5,31).map(a=>a.morph),['HR/Ncbsc']);
 assert.deepEqual(at(5,47).map(a=>a.morph),['HTd/Ncmsa'],'a different reference wording does not insert a preposition into העולם');
});

test('chapter 2 refinements retain Pilpel, contextual titles, narrative perfect and article fusion',()=>{
 const at=(m,t)=>D.forms[source.chapters[1][m-1][t-1]].analyses;
 const pilpel=at(3,15);assert.equal(pilpel.length,1);assert.equal(pilpel[0].morph,'HVlp3ms');assert.equal(pilpel[0].root,'דקק');assert.equal(pilpel[0].lemma,'דקדק');
 assert.equal(Morph.decode(pilpel[0].morph,pilpel[0].lemma).segs[0].stem,'Pilpel');
 for(const [m,t,code] of [[1,3,'HRd/Ncfsa'],[2,8,'HRd/Aofsa'],[2,74,'HRd/Ncmsa'],[2,75,'HC/Rd/Ncmsa'],[2,80,'HRd/Ncmsa'],[4,13,'HRd/Ncfsa'],[1,10,'HNcmsc/Sp3ms'],[2,58,'HC/D'],[2,63,'HNcfpa'],[7,1,'HC/R/Tr/Vqp3ms'],[8,20,'HTd/Ncmsa']])assert.deepEqual(at(m,t).map(a=>a.morph),[code],`${m}:${t}`);
 assert.deepEqual(at(5,15).map(a=>[a.lemma,a.morph]),[['ב/רבן','HR/Ncmsa']]);
 assert.deepEqual(at(8,10).map(a=>[a.lemma,a.morph]),[['רבן','HNcmsa']]);
 for(const t of [13,14])assert.deepEqual(at(5,t).map(a=>a.morph),['HNcmsa']);
});

test('chapters 3 and 4 refinements distinguish nouns, Qal, Pilpel and nominal water lemmas',()=>{
 const at=(c,m,t)=>D.forms[source.chapters[c-1][m-1][t-1]].analyses;
 for(const [m,t,code] of [[1,22,'HTr/Rd/Ncfsa'],[1,28,'HRd/Ncfsa'],[3,10,'HRd/Ncfsa'],[4,1,'HNcmsc'],[4,4,'HR/Ncmsc/Sp3ms'],[4,3,'HVlrmsa'],[4,10,'HR/D/Sp3fs'],[4,14,'HR/D/Sp3ms'],[4,23,'HC/R/D/Sp3mp'],[5,3,'HRd/Ncfsa'],[5,6,'HNcmsc'],[5,21,'HVhi3fs'],[5,29,'HRd/Ncmpa'],[6,5,'HTr/Vqp3fs']])assert.deepEqual(at(3,m,t).map(a=>a.morph),[code],`3:${m} token ${t}`);
 for(const t of [29,35,43])assert.equal(M.headLemma(at(3,5,t)[0]),'מים');
 assert(at(3,1,1).some(a=>a.lemma==='מי'&&a.morph==='HPi'),'water correction does not affect מי');
 assert.deepEqual(at(4,1,4).map(a=>a.morph),['HNcfsa']);
 assert.equal(Morph.decode(at(3,4,3)[0].morph,'הרהר').segs[0].stem,'Pilpel');
});

test('later comparisons distinguish כהן, number gender, complete segments and pointed נהיה',()=>{
 const at=(c,m,t)=>D.forms[source.chapters[c-1][m-1][t-1]].analyses;
 for(const [m,t] of [[3,8],[3,14],[3,24],[3,29],[4,20]])assert.deepEqual(at(4,m,t).map(a=>a.morph),['HAcfsa']);
 assert.deepEqual(at(5,4,14).map(a=>[a.lemma,a.morph]),[['כהן','HNcmsa']]);
 assert.deepEqual(at(5,1,19).map(a=>a.morph),['HRd/Ncmsa']);
 assert.deepEqual(at(5,2,12).map(a=>a.morph),['HTd/Ncfsa']);
 assert.deepEqual(at(5,5,43).map(a=>a.morph),['HR/Ncmsc/Sp1cs']);
 for(const [m,t] of [[2,22],[3,9],[3,20],[8,33]])assert.deepEqual(at(6,m,t).map(a=>a.morph),['HVNp3ms']);
 for(const [m,t] of [[2,21],[3,8],[3,19],[8,32]])assert.deepEqual(at(6,m,t).map(a=>a.morph),['HTr/Td/Ncmsa']);
 assert.deepEqual(at(6,5,33).map(a=>a.morph),['HNcmsc']);
 assert.deepEqual(at(6,8,10).map(a=>a.lemma),['רבן']);
 assert.deepEqual(at(6,1,4).map(a=>a.morph),['HTd/Ncmpa']);
 assert.deepEqual(at(6,7,4).map(a=>a.morph),['HR/Td/Ncfsa']);
});

test('chapters 7–9 retain demonstratives, periphrastic verbs and reduplicated stems',()=>{
 const at=(c,m,t)=>D.forms[source.chapters[c-1][m-1][t-1]].analyses;
 assert.deepEqual(at(7,3,78).map(a=>[a.lemma,a.morph]),[['לפי','HR']]);
 assert.deepEqual(at(8,8,9).map(a=>[a.lemma,a.morph]),[['אותו','HPdxms']]);
 assert.deepEqual(at(5,3,26).map(a=>[a.lemma,a.morph]),[['ב/אותה','HR/Pdxfs']]);
 assert.deepEqual(at(9,3,44).map(a=>a.morph),['HVqrmsa']);
 assert.deepEqual(at(9,5,95).map(a=>[a.lemma,a.morph]),[['מן/ש/קלקל','HR/Tr/Vlp3cp']]);
 const six=D.forms.find(f=>f.analyses.some(a=>a.lemma==='שש'));
 assert(six);assert.deepEqual(six.analyses.map(a=>[a.lemma,a.morph]),[['שש','HAcmsa']]);
});

test('rabbinic dictionary gender is not inferred from the plural ending',()=>{
 for(const [c,m,t]of [[3,1,9],[3,3,8]]){
  const f=D.forms[source.chapters[c-1][m-1][t-1]];
  assert.deepEqual(f.analyses.map(a=>[a.lemma,a.morph]),[['ה/תפילין','HTd/Ncfpa']]);
  assert(f.analyses[0].rules.includes('lexical-gender'));
  assert.match(f.analyses[0].note,/Jastrow/);
 }
 for(const t of [5,7]){
  const f=D.forms[source.chapters[3][5][t-1]];
  assert.deepEqual(f.analyses.map(a=>a.morph),['HR/Ncfsa']);
  assert.match(f.analyses[0].note,/Krauss/);
 }
});

test('rabbinic citation lemmas preserve plural forms and masculine bread',()=>{
 const at=(c,m,t)=>D.forms[source.chapters[c-1][m-1][t-1]].analyses;
 for(const t of [6,14])assert.deepEqual(at(2,7,t).map(a=>[a.lemma,a.morph]),[['תנחום','HNcmpa']]);
 assert.deepEqual(at(4,4,9).map(a=>[a.lemma,a.morph]),[['תחנון','HNcmpa']]);
 for(const [c,m,t]of [[6,1,39],[9,5,122]])assert.deepEqual(at(c,m,t).map(a=>[a.lemma,a.morph]),[['לחם','HNcmsa']]);
 const summary=require('../tools/mishnah-morph/comparison-summary.json');
 assert.equal(summary.remainingDifferences.reduce((n,g)=>n+g.tokens.length,0),summary.remainingFeatureOrConventionDifferences);
 assert.equal(summary.perMishnah.reduce((n,m)=>n+m.compatible,0),summary.readableFeatureCompatible);
});

test('convention assessment keeps strict results and all other supplied features intact',()=>{
 const {assess}=require('../tools/mishnah-morph/adjudicate-conventions.cjs');
 const ref={module:'MISH-T',version:'4.3',title:D.title,rows:[
  {ref:'1:4',token:19,word:'אֵינוּ',parts:[{type:'D',lemma:'אין'},{unreadable:true}]},
  {ref:'5:1',token:8,word:'חֲסִידִים',parts:[{type:'N',subtype:'c',lemma:'חסיד',gender:'m',number:'p'}]}
 ]};
 const before=JSON.stringify(ref),out=assess(D,ref);
 assert.equal(out.conventionAccounted,2);assert.equal(out.items[0].unreadableReferenceFeatures,true);
 assert(compare(D,ref).every(r=>r.status==='different-or-unresolved'));assert.equal(JSON.stringify(ref),before);
 const wrong=structuredClone(ref);wrong.rows[0].parts[1]={type:'S',subtype:'p',person:'1',gender:'c',number:'s'};wrong.rows[1].parts[0].gender='f';
 assert.equal(assess(D,wrong).conventionAccounted,0);
 const spelling={module:'MISH-T',version:'4.3',title:D.title,rows:[{ref:'6:7',token:4,word:'כַּתְּחִלָּה',parts:[{type:'R',lemma:'כ',article:true},{type:'N',subtype:'c',lemma:'תחלה',gender:'f',number:'s'}]}]};
 assert.equal(assess(D,spelling).items[0].rule,'citation-lemma-variant');
 spelling.rows[0].parts[1].lemma='unrelated';assert.equal(assess(D,spelling).conventionAccounted,0);
});

test('all 226 residual positions have explicit source-bound review decisions',()=>{
 const review=require('../tools/mishnah-morph/full-review-226.json'),keys=new Set(),counts={};
 assert.equal(review.sourceTextHash,source.textHash);assert.equal(review.baseline.positions,226);
 assert.equal(review.decisions.length,135);
 for(const d of review.decisions){
  assert(['convention','retain-supported','corrected','unresolved'].includes(d.decision));
  assert(d.note.length>40);assert(d.sources.length);assert(d.sources.every(s=>s.length>20));
  for(const p of d.positions){
   const key=`${p.ref}:${p.token}`;assert(!keys.has(key));keys.add(key);
   const[c,m]=p.ref.split(':').map(Number),f=D.forms[source.chapters[c-1][m-1][p.token-1]];
   assert.equal(p.word,f.word,key);assert.deepEqual(p.analysesAfter,f.analyses.map(({lemma,morph})=>({lemma,morph})),key);
   counts[d.decision]=(counts[d.decision]||0)+1;
  }
 }
 assert.equal(keys.size,226);assert.deepEqual(counts,review.counts);assert.equal(counts.unresolved,10);
 const conventions=require('../tools/mishnah-morph/convention-assessment.json');
 for(const p of conventions.items)assert(!keys.has(`${p.ref}:${p.token}`),'previous convention positions must not be double-counted');
 assert.equal(keys.size+conventions.items.length,review.baseline.strictDifferences);
 const at=(c,m,t)=>D.forms[source.chapters[c-1][m-1][t-1]].analyses;
 for(const t of [35,37,41,46,51])assert.deepEqual(at(1,5,t).map(a=>[a.lemma,a.morph]),[['חיים','HNcmpc/Sp2ms']]);
 assert.deepEqual(at(9,2,31).map(a=>[a.lemma,a.morph]),[['בראשית','HNcxsa']]);
 assert.deepEqual(at(9,5,134).map(a=>a.morph),['HNcmsc','HAamsc']);
});

test('short meanings retain editorial glosses and reject biblical dictionary fallback',()=>{
 const G=require('../mishnah-meanings');
 assert.match(G.lookup({lemma:'קרא',morph:'HVqrmpa'}).text,/lesen/);
 assert.equal(G.lookup({lemma:'שמע',morph:'HNcmsa'}).text,'Schema-Gebet');
 assert.match(G.lookup({lemma:'שמע',morph:'HVqv2ms'}).text,/hören/);
 assert.match(G.lookup({lemma:'תנחום',morph:'HNcmpa'}).text,/Trost/);
 assert.match(G.lookup({lemma:'תחנון',morph:'HNcmpa'}).text,/Bittgebet/);
 assert.match(G.lookup({lemma:'חיים',morph:'HNcmpc/Sp2ms'}).text,/Leben/);
 assert.match(G.lookup({lemma:'בראשית',morph:'HNcxsa'}).text,/Schöpfung/);
 const dictionary={a:['עֵין','spring','Quelle'],b:['עַיִן','eye','Auge']};
 assert.equal(G.lookup({lemma:'מן/עין',morph:'HR/Ncbsc'},dictionary),null,'tempting biblical homonyms must not become Mishnah glosses');
 const forbidden=new Proxy(dictionary,{ownKeys(){throw Error('biblical dictionary accessed');}});
 assert.equal(G.lookup({lemma:'עין',morph:'HNcbsa'},forbidden,'en'),null);
 assert.equal(G.lookup({lemma:'עין',morph:'HNcbsa',gloss:{de:'redaktioneller Kontext',en:'editorial context'}},forbidden,'en').text,'editorial context');
 assert.equal(G.lookup({lemma:'קרא',morph:'HVqrmpa'},'en').text,'read; recite; call');
 assert.equal(G.lookup({lemma:'unmatched',morph:'HNcmsa'},dictionary),null);
 assert.equal(G.lookup({lemma:'קרא',morph:'HVqrmpa'},dictionary,'en').text,'read; recite; call');
});

test('a reference containing only absent or unreadable tags cannot count as agreement',()=>{
 for(const parts of [[],[{unreadable:true}],[{note:'not visible'}]]){
  const r=compare(D,{module:'MISH-T',version:'4.3',title:D.title,rows:[{ref:'1:1',word:'קוֹרִין',parts}]});
  assert.equal(r[0].status,'reference-incomplete');
 }
});
