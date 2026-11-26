'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const M=require('../mishnah-morph'),D=require('../mishnah-zeraim-data'),E=require('../mishnah-dictionary-data'),A=require('../tools/mishnah-morph/zeraim-dictionary-audit.json'),Q=require('../tools/mishnah-morph/dictionary-audit.cjs'),decisions=require('../tools/mishnah-morph/zeraim-dictionary-decisions.json');
test('dictionary audit accounts for every current uncertain source position exactly once',()=>{
 const expected=[];for(const[title,s]of Object.entries(D.sources))s.chapters.forEach((ch,c)=>ch.forEach((unit,m)=>unit.forEach((id,t)=>{if(['unresolved','ambiguous','partial'].includes(D.forms[id].status))expected.push(`${title}/${c+1}:${m+1}/${t+1}`);})));const got=A.rows.flatMap(r=>{assert.equal(r.count,r.positions.length);return r.positions.map(p=>`${p.title}/${p.ref}/${p.token}`);});
 assert.equal(new Set(got).size,got.length);assert.deepEqual(got.sort(),expected.sort());assert.equal(A.summary.groups,A.rows.length);assert.equal(A.summary.positions,got.length);
 assert.equal(A.summary.withHit+A.summary.withoutHit,A.rows.length);assert(A.rows.some(r=>!r.queries.some(q=>q.matches.length)));
});
test('all three dictionary fingerprints and every linked entry resolve to real aliases',()=>{
 const dicts=new Map(E.dictionaries.map(d=>{const bytes=fs.readFileSync(path.join(__dirname,'../bundled/dict',d.id+'.json.gz'));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),d.sha256);return[d.id,JSON.parse(zlib.gunzipSync(bytes))];}));assert.equal(dicts.size,3);
 for(const list of Object.values(E.forms))for(const h of list){assert(dicts.get(h.dictId).heads[h.entry].includes(h.head));assert(['reviewed-entry','pointed-head','exact-head','consonantal-head'].includes(h.match));}
 for(const r of A.rows)for(const q of r.queries)for(const h of q.matches)assert.equal(Q.consonants(h.head),q.key);
});
test('lexical matches never invent verbal roots or erase homonyms',()=>{
 const qs=Q.queries({word:'נִגְמְרָה',analyses:[]});assert(!qs.some(q=>q.key==='גמר'));
 const hits=Q.lookup({word:'סְרָק',analyses:[]},Q.dictionaries()).flatMap(q=>q.matches);assert(hits.some(h=>h.dictId==='d701423861c6'&&h.entry===4569));assert(hits.some(h=>h.dictId==='d895bc1c727b'&&h.entry===27609));
 const adan=D.forms.filter(f=>f.key===M.normalize('אָדָן'));assert(adan.length);assert(adan.every(f=>f.analyses.every(a=>M.headLemma(a)==='אדם')),'false pedestal homograph rejected');
 assert(E.forms[M.normalize('אָדָן')].length===0,'rejected search hit is not promoted to reviewed lexical evidence');
});
test('dictionary adjudications preserve gender, vocalization and documented disagreements',()=>{
 const aa=w=>D.forms.filter(f=>f.key===M.normalize(w)).flatMap(f=>f.analyses);
 assert(aa('כַּרְשִׁנֵּי').some(a=>a.lemma==='כרשינה'&&a.morph==='HNcfpc'));
 assert(aa('אֹרֶז').some(a=>a.lemma==='אורז'));assert(!aa('אֹרֶז').some(a=>a.lemma==='ארז'));
 assert(aa('לוֹכְסָן').some(a=>a.morph==='HD'));assert(aa('לוֹכְסָן').some(a=>a.morph==='HAamsa'));
 assert(aa('הֶבְקֵר').some(a=>a.lemma==='הבקר'&&a.morph==='HNcmsa'));
 assert(decisions.every(r=>r.note&&r.meaning.length===2));
});

test('new noun meanings do not overwrite verb or differently gendered homographs',()=>{
 const meanings=require('../mishnah-meanings'),gloss=(lemma,morph)=>meanings.lookup({lemma,morph},{},'de').text;
 assert(gloss('מנה','HNcmsa').includes('Mine'));assert(gloss('מנה','HNcfsa').includes('Portion'));assert(gloss('מנה','HVqp3ms').includes('zählen'));
 assert(gloss('סרק','HNcmsa').includes('Fruchtlosigkeit'));assert(gloss('סרק','HVqrmsa').includes('kämmen'));
 assert(gloss('לוף','HVqp3ms').includes('verbinden'));assert(/pflanze/i.test(gloss('לוף','HNcmsa')));
});

test('first Krauss cards preserve concrete source senses, gender and historical etymology attribution',()=>{
 const cards=require('../tools/mishnah-morph/krauss-cards-1.json'),meanings=require('../mishnah-meanings');assert.equal(cards.length,16);assert.equal(new Set(cards.map(r=>M.headLemma(r.analyses[0]))).size,8);
 for(const r of cards){const s=D.sources[r.title],[c,m]=r.ref.split(':').map(Number),f=D.forms[s.chapters[c-1][m-1][r.token-1]];assert.equal(s.textHash,r.sourceHash);assert.equal(f.key,M.normalize(r.word));assert.deepEqual(f.analyses,r.analyses);assert.equal(f.analyses[0].loanword.source,'Krauss');assert.equal(r.evidence[0].dictId,'d701423861c6');assert(meanings.lookup(f.analyses[0],{},'de').text);}
 const get=word=>cards.find(r=>r.word===word),host=get('הָאַכְסַנְיָה');assert.equal(host.evidence[0].entry,687);assert(host.analyses[0].gloss.de.includes('Truppen'));assert(!E.forms[M.normalize(host.word)].some(h=>h.entry===686&&h.dictId==='d701423861c6'));
 assert.equal(get('אִסָּרוֹת').analyses[0].morph,'HNcmpa');assert.equal(get('בַּקָּרוֹן').analyses[0].morph,'HRd/Ncfsa');
 assert.equal(get('אַכְסָרָה').analyses[0].morph,'HD');assert.equal(get('אַכְסַדְרָה').analyses[0].morph,'HNcfsa');
});
