'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {load}=require('../tools/oshb/forms'),{tokens}=require('../passage-statistics');
const roots=require('../tools/oshb/statistics-roots.json');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../similar-chapters.js'),'utf8'),ctx);
const D=ctx.window.SIMILAR_CHAPTERS;
test('Root rankings cover all 929 chapters and retain explicit family identities',()=>{
 assert.equal(Object.keys(D.c).length,929);assert.equal(D.rootSource.commit,roots.source.commit);
 for(const [key,rec]of Object.entries(D.c))for(const mode of ['r','rb']){
  assert(rec[mode].length<=6);
  let previous=Infinity;
  for(const [other,score,shared]of rec[mode]){
   assert.notEqual(other,key);assert(D.c[other]);assert(score>0&&score<=1);assert(score<=previous);previous=score;
   if(mode==='rb')assert.equal(other.replace(/ \d+$/,''),key.replace(/ \d+$/,''));
   assert(shared.length>0&&shared.length<=4);for(const id of shared)assert(D.roots[id]);
  }
 }
});
test('Jeremiah 8 root ranking agrees with corpus counts, merging related lemmas before weighting',()=>{
 const counts=new Map(),df=new Map();let merged=false;
 for(const b of load())b.text.forEach((ch,i)=>{
  const c=new Map(),members=new Map();
  for(const verse of ch)for(const t of tokens(verse)){
   if(!/^[HA][NVA]/.test(t.code))continue;
   const f=roots.roots[t.lemma];if(!f)continue;
   const id=f.lang+'|'+f.id;c.set(id,(c.get(id)||0)+1);
   if(!members.has(id))members.set(id,new Set());members.get(id).add(t.lemma);
  }
  if(b.title==='Jeremiah'&&i===7)merged=[...members.values()].some(s=>s.size>1);
  counts.set(b.title+' '+(i+1),c);for(const id of c.keys())df.set(id,(df.get(id)||0)+1);
 });
 assert(merged,'related lemmas actually contribute to the chapter');
 const vectors=new Map([...counts].map(([key,c])=>{
  const v=new Map([...c].map(([id,n])=>[id,(1+Math.log(n))*Math.log(counts.size/df.get(id))]));
  const norm=Math.hypot(...v.values())||1;return [key,new Map([...v].map(([id,n])=>[id,n/norm]))];
 }));
 const current=vectors.get('Jeremiah 8');
 const hits=[...vectors].filter(([k])=>k!=='Jeremiah 8').map(([k,v])=>[k,[...current].reduce((n,[id,x])=>n+x*(v.get(id)||0),0)]).sort((a,b)=>b[1]-a[1]).slice(0,6);
 assert.deepEqual(Array.from(D.c['Jeremiah 8'].r,h=>h[0]),hits.map(h=>h[0]));
 for(const [key,score]of D.c['Jeremiah 8'].r)assert(Math.abs(score-hits.find(h=>h[0]===key)[1])<=0.000501);
});
