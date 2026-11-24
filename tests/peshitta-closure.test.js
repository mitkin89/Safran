'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const Audit=require('../tools/peshitta/closure-audit.cjs'),R=require('../tools/peshitta/remaining-evidence.cjs'),Status=require('../peshitta-concordance-status'),Preview=require('../concordance-preview'),C=require('../concordance');
const report=require('../peshitta-concordance-status.json'),frozen=require('../tools/peshitta/closure-summary.json');
const root=path.resolve(__dirname,'..'),esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),t=(s,...a)=>s.replace(/\{\}/g,()=>a.shift());
test('closure reconciles every source and supplemental lemma and classifies all 70960 pending positions',async()=>{
 const actual=await Audit.build();assert.deepEqual(actual.status,report);assert.deepEqual(actual.audit,frozen);assert.equal(R.digest(JSON.stringify(report)+'\n'),frozen.statusSha256);
 const raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'tools/peshitta/documented-gaps.jsonl.gz')));assert.equal(R.digest(raw),frozen.gapsSha256);assert.equal(raw.toString(),actual.raw);
 const gaps=raw.toString().trim().split('\n').map(JSON.parse);assert.equal(gaps.length,70960);assert.equal(new Set(gaps.map(r=>r.id)).size,70960);assert(gaps.every(r=>Audit.categoryByReason[r.reason]===r.category));
 assert.deepEqual(report.totals,{words:308727,withLemma:237767,unassigned:70960});assert.equal(frozen.quality.supplementaryPositions,60423);assert.equal(report.books.length,39);assert.equal(report.independentScholarlyVerification,false);
 assert.equal(report.categories.reduce((n,c)=>n+c.count,0),70960);assert.equal(Object.values(report.sources).reduce((n,c)=>n+c,0),237767);
 assert.equal(frozen.quality.overlappingAssignments,0);assert.equal(frozen.quality.overwrittenSourceAnnotations,0);assert.equal(frozen.quality.runtimeLemmaMismatches,0);assert.equal(frozen.quality.unclassifiedGaps,0);
 assert(frozen.controls.some(c=>c.disagreements>0),'preserve observed control disagreements');
});
test('data status is bound to the exact audited edition bytes and matching live lemma counts',()=>{
 const b=report.books.find(b=>b.book==='Ruth'),e=require('../bundled/manifest.json').items.find(e=>e.title===b.book&&e.versionTitle.startsWith('ETCBC Peshitta'));
 assert.equal(Status.edition(e,b.sourceSha256,b.words,b.withLemma).unassigned,b.unassigned);
 assert.equal(Status.edition(e,'edited',b.words,b.withLemma),null);
 assert.equal(Status.edition(e,b.sourceSha256,b.words,b.withLemma-1),null);
 assert.equal(Status.edition({...e,title:'Different work'},b.sourceSha256,b.words,b.withLemma),null);
 assert.equal(Status.edition({...e,versionTitle:'Different edition'},b.sourceSha256,b.words,b.withLemma),null);
});
test('coverage notice is scoped to scanned Peshitta editions, labels limitations, and escapes gap labels',()=>{
 const b=report.books.find(b=>b.book==='Ruth'),e=require('../bundled/manifest.json').items.find(e=>e.title==='Ruth'&&e.versionTitle.startsWith('ETCBC Peshitta'));
 const row={words:b.words,withLemma:b.withLemma,peshittaStatus:Status.edition(e,b.sourceSha256,b.words,b.withLemma)};
 const html=Preview.statusHtml({editions:[row,{words:999999,withLemma:999999}]},{esc,t,loc:'de-DE'});
 assert(html.includes(b.unassigned.toLocaleString('de-DE')));assert(html.includes(b.withLemma.toLocaleString('de-DE')));assert(!html.includes('70.960'));assert(!html.includes('999.999'));assert(html.includes('keine vollständige Wortanalyse oder unabhängige fachliche Prüfung'));assert(html.includes('Wortform auffindbar'));
 assert.equal(Preview.statusHtml({editions:[{words:1,withLemma:0}]},{esc,t,loc:'de-DE'}),'');
 const unsafe=structuredClone(row);unsafe.peshittaStatus.gaps=[{id:'unsafe',label:'<img src=x onerror=alert(1)>',count:1}];assert(!Preview.statusHtml({editions:[unsafe]},{esc,t,loc:'de-DE'}).includes('<img'));
});
test('live concordance coverage exposes the report for precisely the 39 audited Peshitta editions',async()=>{
 const result=await C.search({dir:path.join(root,'bundled'),entries:require('../bundled/manifest.json').items.filter(e=>e.versionTitle.startsWith('ETCBC Peshitta')),params:{query:'ܡܪܝܐ',lemma:true,limit:1}});
 assert.equal(result.lemmaCoverage.editions.length,39);assert(result.lemmaCoverage.editions.every(e=>e.peshittaStatus));
 assert.equal(result.lemmaCoverage.editions.reduce((n,e)=>n+e.peshittaStatus.unassigned,0),70960);
 const html=Preview.statusHtml(result.lemmaCoverage,{esc,t,loc:'de-DE'});assert(html.includes('237.767'));assert(html.includes('70.960'));for(const c of report.categories)assert(html.includes(c.count.toLocaleString('de-DE')));
});
