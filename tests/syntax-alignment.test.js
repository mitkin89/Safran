'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../tools/bhsa/projection');
const token=(ref,at,form)=>({ref,at,form});
test('Explicit reading paths keep Ketiv and Qere at different original positions',()=>{
 const tokens=[token('1:1',0,'אב'),token('1:1',1,'הוצא'),token('1:1',2,'היצא'),token('1:2',0,'ג')];
 const proof={variants:[[1,'ketiv','k'],[2,'qere','q']],sourceVerses:{'1:1':[0,4]}};
 const rows=form=>[{ref:'1:1',words:[{key:1,form:'א'},{key:2,form:'ב'},{key:3,form},{key:4,form:'ג'}]}];
 const k=P.project(rows('הוצא'),tokens,proof,'ketiv'),q=P.project(rows('היצא'),tokens,proof,'qere');
 assert.deepEqual(k.mapping.get(3),[['1:1',1,4]]);assert.deepEqual(q.mapping.get(3),[['1:1',2,4]]);
 assert.deepEqual(k.mapping.get(4),[['1:2',0,1]],'verse renumbering preserves the exact target position');
 assert.deepEqual(k.mapping.get(1),[['1:1',0,1]]);assert.deepEqual(k.mapping.get(2),[['1:1',0,1]]);
 const bad=P.project(rows('אחר'),tokens,proof,'qere');assert.equal(bad.mapping.size,0);assert.equal(bad.rejected[0].reason,'different_consonants');
});
test('Proof loading rejects an edited reading-text token stream',()=>{
 assert.throws(()=>P.load('Genesis',[['changed']]),/Stale OSHB alignment proof/);
});
test('The audited before/after totals and ten unresolved source differences remain explicit',()=>{
 const report=require('../tools/tanakh-syntax/alignment-audit.json'),b=require('node:zlib').gunzipSync(require('node:fs').readFileSync(require('node:path').join(__dirname,'../bundled/bhsa/index.json.gz'))),index=JSON.parse(b);
 assert.equal(report.summary.auditedSourceReferences,1142);assert.equal(report.summary.beforeJointTargetVerses,22071);assert.equal(report.summary.afterJointTargetVerses,23196);assert.equal(report.summary.readingTextVerses,23206);
 assert.equal(report.summary.recoveredTargetVerses,1125);assert.equal(report.remaining.length,10);assert.equal(index.alignment.rejected.length,10);
 assert(!index.books.Isaiah['9:6']);assert(!index.books.Jeremiah['18:3']);assert.equal(index.alignment.basis,'ketiv');
});
test('Real variant words retain separate positions and Exodus source verse numbers are projected',()=>{
 const M=require('../tanakh-syntax').load('Genesis'),B=JSON.parse(require('node:zlib').gunzipSync(require('node:fs').readFileSync(require('node:path').join(__dirname,'../bundled/bhsa/index.json.gz'))));
 assert(M.pairs['8:17'].some(p=>p[0]===14),'MACULA marks the Qere verb');
 assert(B.books.Genesis['8:17'][1].some(r=>r[4].includes(13)),'BHSA marks the Ketiv');
 assert(!B.books.Genesis['8:17'][1].some(r=>r[4].includes(14)),'no clause membership is copied to Qere');
 const ex=require('../tanakh-syntax').load('Exodus');assert(ex.pairs['20:13'].some(p=>p[1]==='נאף'));assert(!ex.text['20:26']);
 assert(B.books.Exodus['20:13'][1].length>=4);assert(!B.books.Exodus['20:26']);
});
test('Word distance counts the selected reading path rather than both alternatives',()=>{
 const Pattern=require('../syntax-pattern'),{create}=require('../syntax-pattern-matcher');
 const words=['אמר','ישן','חדש','דוד'].map((form,at)=>({form,normalized:form,lemma:form,pos:at===0?'V':'Np'})),sig=words.map(w=>w.form).join(' ');
 const index={text:{'1:1':sig},pairs:{'1:1':[[0,'אמר',['דוד'],[['1:1',[3]]],[],[],[],[]]]},alignment:{variants:[['1:1',1,'ketiv'],['1:1',2,'qere']]}};
 const book={'1:1':[sig,[[1,'?N',false,null,[0,1,2,3],'NA',null]]]};
 const pattern=Pattern.clean({op:'term',role:'verb',lemma:'אמר',position:{relative:'subject',order:'before',maxGap:1}});
 const hit=create(index,book,[['x']],pattern,()=>words,(w,g)=>Object.entries(g).every(([k,v])=>w[k]===v),w=>w.lemma)([0,0]);
 assert(hit);assert.equal(hit.explanation.proofs[0].words[0].position.gap,1);
});
