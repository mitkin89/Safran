'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),fsp=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../semantic-context'),F=require('../semantic-fields'),{rowWords}=require('../semantic-search'),{searchFiles}=require('../searchcore');
const all=require('../bundled/manifest.json').items,root=path.join(__dirname,'..'),seeds=require('../semantic-context-genesis.json').records;
const entries=all.filter(e=>e.title==='Genesis'&&(/^Westminster/.test(e.versionTitle)||/Zunz/.test(e.versionTitle)||e.versionTitle==='Septuaginta (CATSS)'));
const he=entries.find(e=>e.kind==='he'),doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',he.rel),'utf8'));
const run=(semantic,extra={})=>searchFiles({dir:path.join(root,'bundled'),entries,params:{semantic:{fieldId:'fear',...semantic},perFile:1000,limit:1000,...extra}});
const ref=r=>r.path.map(i=>i+1).join(':');
test('every starter assignment matches its exact Hebrew verse, main lemma and occurrence',()=>{
 const keys=new Set();assert.equal(seeds.length,25);
 for(const s of seeds){assert(C.clean(s));assert(!keys.has(C.key(s)));keys.add(C.key(s));const html=doc.text[s.path[0]][s.path[1]];assert.equal(s.signature,crypto.createHash('sha256').update(html).digest('hex'));assert.equal(rowWords(he,html,s.path)[s.position-1].id,s.id);assert(F.fields[0].he.includes(s.id));}
 assert.equal(seeds.filter(s=>s.sense==='reverence').length,3);assert.equal(seeds.filter(s=>s.sense==='uncertain').length,2);assert.equal(seeds.filter(s=>s.sense==='other').length,2);
});
test('same lemma has different contextual senses; negation and divine reference are not automatic reverence rules',async()=>{
 const fear=await run({sense:'fear'}),reverence=await run({sense:'reverence'}),ambiguous=await run({sense:'uncertain'}),other=await run({sense:'other'});
 assert.deepEqual(reverence.results.map(ref),['20:11','22:12','42:18']);
 assert(fear.results.some(r=>ref(r)==='20:8'),'fear at a divine warning stays fear');assert(fear.results.some(r=>ref(r)==='15:1'),'negated fear is included');
 assert.equal(ambiguous.results.length,1);assert.equal(ambiguous.results[0].semantic.matches.length,2);assert.deepEqual(other.results.map(ref),['31:42','31:53']);
 assert.equal(reverence.semanticCoverage.editorial,25);assert(reverence.semanticCoverage.unreviewed>0,'Greek occurrences are not silently given the Hebrew sense');
 assert(reverence.results.every(r=>r.kind==='he'));assert(reverence.results.find(r=>ref(r)==='42:18').parallels.length);
});
test('local correction changes only the exact occurrence; filtered counts and German highlights follow it',async()=>{
 const seed=seeds.find(s=>ref(s)==='28:17'&&s.position===1),correction={...seed,sense:'reverence',note:'Lokale Prüfung: hier religiöse Scheu.'};
 const r=await run({sense:'reverence',corrections:[correction]});const verse=r.results.find(x=>ref(x)==='28:17');assert(verse);assert.deepEqual(verse.positions,[1]);assert.equal(verse.semantic.matches[0].context.basis,'local');assert.equal(r.semanticCoverage.local,1);
 const withdrawn=await run({sense:'unreviewed',corrections:[{...seed,sense:'unreviewed',note:'Zuordnung vorerst offen lassen.'}]});
 assert(withdrawn.results.some(x=>ref(x)==='28:17'));assert.equal(withdrawn.semanticCoverage.editorial,24);assert.equal(withdrawn.semanticCoverage.total,withdrawn.semanticCoverage.editorial+withdrawn.semanticCoverage.local+withdrawn.semanticCoverage.unreviewed);
 const reset=await run({sense:'reverence',corrections:[]});assert(!reset.results.some(x=>ref(x)==='28:17'));
 const untouched=await run({sense:'uncertain',corrections:[correction]});assert.deepEqual(untouched.results.find(x=>ref(x)==='28:17').positions,[4]);
});
test('changed source text never reuses old contextual assignments',async()=>{
 const tmp=await fsp.mkdtemp(path.join(os.tmpdir(),'safran-sense-'));
 try{const d=structuredClone(doc);d.text[19][10]+=' ';const target=path.join(tmp,he.rel);await fsp.mkdir(path.dirname(target),{recursive:true});await fsp.writeFile(target,JSON.stringify(d));
  const r=await searchFiles({dir:tmp,entries:[he],params:{semantic:{fieldId:'fear',sense:'unreviewed'},perFile:1000,limit:1000}});
  const changed=r.results.find(x=>ref(x)==='20:11');assert(changed);assert.equal(changed.semantic.matches[0].context.stale,true);assert.equal(changed.semantic.matches[0].context.sense,'unreviewed');
 }finally{await fsp.rm(tmp,{recursive:true,force:true});}
});
test('request validation bounds corrections and does not turn an unknown sense into a broad search',()=>{
 assert.deepEqual(C.request({fieldId:'fear',sense:'invalid'}),{});assert.equal(C.request(null),null);
 const r=seeds[0];assert.equal(C.clean({...r,signature:'bad'}),null);assert.equal(C.clean({...r,position:0}),null);assert.equal(C.clean({...r,note:''}),null);
 assert.equal(C.corrections([r,{...r,sense:'uncertain'}]).length,1);assert.equal(C.corrections([r,{...r,sense:'uncertain'}])[0].sense,'uncertain');
 assert.equal(C.request({fieldId:'joy',sense:'fear',corrections:[r]}).sense,'all');assert.deepEqual(C.request({fieldId:'joy',corrections:[r]}).corrections,[]);
});
