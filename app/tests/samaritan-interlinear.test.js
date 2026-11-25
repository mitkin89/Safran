'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const D=require('../samaritan-il'),T=require('../textcrit-data'),S=require('../samaritan-core'),SM=require('../samaritan-data'),IL=require('../samaritan-interlinear'),A=require('../tools/samaritan/align.cjs');
const root=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
test('All Samaritan source words, red masks and original word identifiers survive the MT alignment exactly',()=>{
 let n=0;assert.equal(sha(fs.readFileSync(path.join(root,'textcrit-data.js'))),D.source.textcritSha256);
 for(const [ref,source]of Object.entries(T.verses)){
  const v=D.verses[ref];assert(v,ref);assert.deepEqual(v.words.map(w=>w.slice(0,3)),source.words,ref);
  v.words.forEach(w=>{n++;assert(S.own(w[2]));assert(S.word(SM,w[2]));if(w[3]){assert(D.mt[w[3]]);assert(w[4].every(i=>Number.isInteger(i)&&i>=1&&i<=D.mt[w[3]].length));}else assert.equal(w[5],'unresolved');});
 }
 assert.equal(n,82446);
 for(const sources of Object.values(D.source.books))for(const m of [sources.he,sources.translation]){const raw=fs.readFileSync(path.join(root,'bundled',m.rel));assert.equal(sha(raw),m.sha256);assert.equal(sha(JSON.stringify(JSON.parse(raw).text)),m.textHash);}
});
test('Uncertain repeated words, splits, transpositions, additions and missing counterparts remain distinct',()=>{
 assert.equal(A.align(['כי'],['כי','כי']).mapped[0],null);
 assert.deepEqual(A.align(['אבגד'],['אב','גד']).mapped[0].indices,[0,1]);
 assert.deepEqual(A.align(['אב','גד'],['אבגד']).mapped.map(x=>x.indices),[[0],[0]]);
 const swap=A.align(['אב','גד','הו'],['גד','אב','הו']);assert.equal(swap.mapped[0].kind,'transposed');
 const add=A.align(['אב','חדש','גד'],['אב','גד']);assert.equal(add.mapped[1].kind,'addition');assert.equal(add.mapped[1].boundary,1);
 assert.deepEqual(A.align(['אב','גד'],['אב','חדש','גד']).missing,[1]);
});
test('Numbering and documented displaced passages use the source reference instead of a guessed coordinate',()=>{
 assert(D.index['Exodus 20:12'].includes('Exodus 20:11'));
 const first=D.verses['Exodus 20:11'].words.find(w=>w[0]==='כבד');assert.equal(first[3],'Exodus 20:12');assert.deepEqual(first[4],[1]);
 assert(D.index['Exodus 30:1'].includes('Exodus 26:35'));
 assert(D.index['Exodus 29:21'].includes('Exodus 29:28'));
 const seventh=D.verses['Genesis 2:2'].words.find(w=>w[0]==='הששי');assert.equal(seventh[3],'Genesis 2:2');assert.deepEqual(seventh[4],[4]);assert(seventh[1]);
});
test('Every source word is reachable once in a mapped row or an explicitly open-position block',()=>{
 const seen=new Set();
 for(const ref of Object.keys(D.index))for(const source of D.index[ref])D.verses[source].words.forEach((w,i)=>{if(w[3]!==ref)return;const key=source+'|'+i;assert(!seen.has(key));seen.add(key);});
 for(const [host,groups]of Object.entries(D.open)){assert(D.mt[host]);for(const g of groups)for(const i of g.words){assert.equal(D.verses[g.ref].words[i][5],'unresolved');const key=g.ref+'|'+i;assert(!seen.has(key));seen.add(key);}}
 assert.equal(seen.size,82446);
 for(const [ref,indices]of Object.entries(D.missing)){const covered=new Set((D.index[ref]||[]).flatMap(s=>D.verses[s].words.filter(w=>w[3]===ref).flatMap(w=>w[4])));assert(indices.every(i=>!covered.has(i)));}
});
test('Interlinear markup preserves source red letters and invokes Samaritan cards without polluting OSHB word indices',()=>{
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const row=IL.rows(D,'Genesis 2:2').find(r=>r.ref==='Genesis 2:2'),seg=row.segs.find(s=>s[1]==='הששי'),h=IL.wordHtml(seg[1],seg[3],esc);
 assert(h.includes('class="smr-word'));assert(h.includes('class="mt-diff"'));assert(!h.includes('class="w"'));
 const changed=IL.rows(D,'Genesis 1:12').flatMap(r=>r.segs).find(s=>s[1]==='ותוציא');assert(changed);assert.equal(S.word(SM,changed[3].id).parts.length,0);
 assert(IL.matches(D,'Genesis 1:1',D.mt['Genesis 1:1']));assert(!IL.matches(D,'Genesis 1:1',['שונה']));
});

test('Source-marked Ketiv and Qere share one segment; repeated conjunctions do not invent transpositions',()=>{
 const q=require('../tools/samaritan/mt-qere.json');assert.deepEqual(q.groups['Deuteronomy 33:2'],[[15,16,17]]);assert.deepEqual(D.qere,q.groups);
 const ash=D.verses['Deuteronomy 33:2'].words.find(w=>w[0]==='אשדת');assert.deepEqual(ash[4],[15,16,17]);
 const v=D.verses['Leviticus 19:26'];assert.deepEqual(v.words[4][4],[5]);assert.deepEqual(v.words[6][4],[7]);assert(!v.words.some(w=>w[5]==='transposed'));
 const old={kind:'word',ref:'Deuteronomy 33:2',start:14,end:14},updated={kind:'word',ref:'Deuteronomy 33:2',start:14,end:16};assert(IL.qereExpansion(D,old,updated));
 const source=T.verses['Genesis 10:23'],indices=source.words.map((w,i)=>w[0]==='ומש'?i:-1).filter(i=>i>=0);
 if(indices.length)assert(IL.noteAnchor(D,T,'Genesis 10:23',indices));
 const changed=structuredClone(T);changed.verses['Genesis 1:1'].words[0][0]='שונה';assert.equal(IL.noteAnchor(D,changed,'Genesis 1:1',[0]),null);
});

test('Reused apparatus anchors remain reproducible and preserve every source note',()=>{
 const audit=require('../tools/samaritan/apparatus-alignment-audit.json');
 assert.equal(audit.counts.groups,6000);assert.equal(audit.counts.newlyLocated,358);assert.equal(audit.counts.conflicts,0);
 for(const e of audit.newlyLocated){assert.deepEqual(IL.noteAnchor(D,T,e.ref,e.indices),e.anchor,e.ref);assert.deepEqual(e.indices.map(i=>T.verses[e.ref].words[i][0]),e.words,e.ref);}
});
