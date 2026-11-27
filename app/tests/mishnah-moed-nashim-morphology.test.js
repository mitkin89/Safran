'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const C=require('../tools/mishnah-morph/complete-moed-nashim.cjs'),M=require('../mishnah-morph'),Meanings=require('../mishnah-meanings');
let engine;const E=()=>engine||(engine=C.buildEngine());
const root=path.resolve(__dirname,'..');
function baseline(file,global){const ctx={window:{}};vm.runInNewContext(cp.execFileSync('git',['show','0374c0a:app/'+file],{cwd:root,maxBuffer:128*1024*1024}).toString(),ctx);return JSON.parse(JSON.stringify(ctx.window[global]));}
function mk(){return baseline('mishnah-kaufmann-accordance-moed-katan-data.js','MISHNAH_KAUFMANN_ACCORDANCE_MOED_KATAN_DATA');}
test('Moed Katan irrigation field receives actual noun morphology and contextual rabbinic evidence',()=>{
 const d=mk(),source=JSON.stringify([d.source,d.units,d.base,d.transfers,d.interlinear,d.sources,d.forms.map(f=>[f.word,f.key,f.provenance.pointing])]);
 C.supplementData(d,E());const ids=d.sources[d.title].chapters[0][0],f=d.forms[ids[2]];
 assert.equal(f.word,'הַשְּׁלָחִים');assert.equal(f.status,'candidate');assert.deepEqual(f.analyses.map(a=>[a.lemma,a.morph]),[['ה/שלח','HTd/Ncmpa']]);assert(f.dictionaryEvidence.some(e=>e.dictId==='d895bc1c727b'&&e.entry===3263));assert.match(Meanings.lookup(f.analyses[0],'de').text,/Bewässer/);
 for(const i of [0,16])assert(d.forms[ids[i]].analyses.some(a=>a.lemma==='שקה'&&a.morph==='HVhrmpa'));
 assert.equal(JSON.stringify([d.source,d.units,d.base,d.transfers,d.interlinear,d.sources,d.forms.map(f=>[f.word,f.key,f.provenance.pointing])]),source,'source, pointing and annotation identities are immutable');
});
test('inflection avoids possessive-noun false positives for fully vocalized plural verbs',()=>{
 for(const w of ['גָּדְרוּ','עָמְדוּ','לָמְדוּ','כָּתְבוּ']){const aa=E().analyze(w,'Mishnah Shabbat');assert(aa.some(a=>a.morph==='HVqp3cp'),w);assert(!aa.some(a=>/N.*Sp3ms/.test(a.morph)),w+' must not become his noun');}
 assert(E().analyze('בָּנוּ','Mishnah Shabbat').every(a=>!/Sp3ms/.test(a.morph)));
 assert(E().analyze('דַּבְּרִי','Mishnah Shabbat').some(a=>a.morph==='HVpv2fs'));
 for(const a of E().analyze('דְּבָרַי','Mishnah Shabbat'))assert(!/N.*sc\/Sp1cs|Ncmpc$/.test(a.morph));
});
test('explicit shin/sin and shuruq/holam cannot be normalized into homonym matches',()=>{
 for(const w of ['שָׁר','שָׁפָה','עָשָׁר'])assert(!E().analyze(w,'Mishnah Shabbat').some(a=>(a._sourceWord||'').includes('ׂ')),w);
 assert(!E().analyze('מוֹתָּר','Mishnah Moed Katan').some(a=>a.lemma==='נתר'));
 assert(!E().analyze('קוּר','Mishnah Shabbat').some(a=>(a._sourceWord||'').includes('ֹ')));
 assert(!E().analyze('הֶקְדֵּשׁ','Mishnah Shabbat').some(a=>a.lemma.startsWith('ה/')));
});
test('draft morphology is repeatable and does not replace an existing source-bound analysis',()=>{
 const d=mk(),old=d.forms.map(f=>f.analyses.length?JSON.stringify(f):null);C.supplementData(d,E());old.forEach((x,i)=>{if(x)assert.equal(JSON.stringify(d.forms[i]),x);});const forms=JSON.stringify(d.forms),core=C.sourceCore(d);C.supplementData(d,E());assert.equal(JSON.stringify(d.forms),forms);assert.equal(C.sourceCore(d),core);
 const p=d.forms.find(f=>f.status==='partial');assert(p);assert(p.analyses.every(a=>a.partialFeatures&&a.morph==='H'),'gender-only dictionary header is explicitly partial, never a forced noun');
});
test('contextual seed requires the exact current token and source word identity',()=>{
 const d=mk(),engine=E(),key=d.title+'|1:1|2',saved=engine.positionIndex.get(key),bad={word:'אחר',scopeTitles:[d.title],positions:[{title:d.title,ref:'1:1',tokenIndex:2,sourceTextHash:d.source.textHash,sourceWordId:'wrong'}],analyses:[{lemma:'sentinel',morph:'HVqp3ms',rules:['verb']}]};
 try{engine.positionIndex.set(key,[bad]);C.supplementData(d,engine);assert(!d.forms[d.sources[d.title].chapters[0][0][2]].analyses.some(a=>a.lemma==='sentinel'));}finally{engine.positionIndex.set(key,saved);}
 const broken=mk();broken.forms[0].word='changed';assert.throws(()=>C.supplementData(broken,E()),/source token identity/);
});
test('split word cards retain exact original source parts and mark their common analysis',()=>{
 const d=baseline('mishnah-kaufmann-accordance-eruvin-data.js','MISHNAH_KAUFMANN_ACCORDANCE_ERUVIN_DATA'),before=C.sourceCore(d);C.supplementData(d,E());const grouped=d.forms.filter(f=>f.morphologyWordGroup?.type==='split-word');assert(grouped.length>0);for(const f of grouped){const g=f.morphologyWordGroup,u=d.units[g.ref];assert.deepEqual(g.parts,g.wordIndices.map(i=>u.words[i].text));assert(g.sourceWordIds.includes(f.provenance.analysis.sourceWordId));assert.equal(g.sourceWordIds.length,g.wordIndices.length);}assert.equal(C.sourceCore(d),before);
});
