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

test('a reference containing only absent or unreadable tags cannot count as agreement',()=>{
 for(const parts of [[],[{unreadable:true}],[{note:'not visible'}]]){
  const r=compare(D,{module:'MISH-T',version:'4.3',title:D.title,rows:[{ref:'1:1',word:'קוֹרִין',parts}]});
  assert.equal(r[0].status,'reference-incomplete');
 }
});
