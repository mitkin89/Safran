'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const G=require('../tools/interlinear/witness-groups.cjs');
const window={};vm.runInNewContext(fs.readFileSync(require.resolve('../witness-ren.js'),'utf8'),{window});
const D=JSON.parse(JSON.stringify(window.WITNESS_REN));
test('only source-attested main lexemes merge; prefixes, homonyms and phrases retain their evidence',()=>{
 const noun={lex:'MJ',sp:'subs'},prefix={lex:'W',sp:'conj'};
 assert.equal(G.describe('ܡ̈ܝܐ',[noun],'syr').key,G.describe('ܘܡܝ̈ܐ',[prefix,noun],'syr').key);
 assert.notEqual(G.describe('ܡܝܐ',[],'syr').key,G.describe('ܡܝܐ',[noun],'syr').key);
 assert.notEqual(G.describe('ܡܝܐ',[noun],'syr').key,G.describe('ܡܝܐ',[{lex:'MJ=',sp:'subs'}],'syr').key);
 assert.equal(G.describe('ܐܝܟ ܡ̈ܝܐ',[noun],'syr').type,'phrase');
 assert.equal(G.describe('ܡܝܐ',[noun,{lex:'>XR',sp:'subs'}],'syr').type,'form');
 assert.equal(G.describe('המים',[{lex:'ה',sp:'art'},{lex:'מימ/',sp:'subs'}],'he').label,'מימ');
});
function occurrences(labels,cells,grouped){
 const rows=new Map();
 for(const [g,code,count,encoded,form]of cells){let ref=0,n=0;
  for(const delta of encoded.split('.')){ref+=parseInt(delta,36);n++;const key=JSON.stringify([code,ref,grouped?form:labels[g]]);rows.set(key,(rows.get(key)||0)+1);}
  assert.equal(n,count);
 }
 return rows;
}
for(const witness of ['Samaritan','Peshitta'])test(witness+' grouping preserves every source form, morphology, reference and repeated occurrence',()=>{
 assert.deepEqual(Object.keys(D.groups[witness]).sort(),Object.keys(D[witness]).sort());
 for(const [lemma,[labels,cells]]of Object.entries(D[witness])){
  const [groups,groupCells]=D.groups[witness][lemma];
  assert.deepEqual(occurrences(groups,groupCells,true),occurrences(labels,cells,false),lemma);
  groups.forEach((g,i)=>{
   assert(['lemma','form','phrase'].includes(g.type));
   assert.equal(g.forms.slice(1).reduce((n,f)=>n+f[1],0),groupCells.filter(c=>c[0]===i).reduce((n,c)=>n+c[2],0));
  });
 }
});
test('water collapses to one Samaritan lexeme; uncertain Syriac forms and multiword renderings remain separate',()=>{
 const [sm,sc]=D.groups.Samaritan['4325'];assert.equal(sm.length,1);assert.equal(sm[0].type,'lemma');assert.equal(sm[0].forms.length-1,19);assert.equal(sc.reduce((n,c)=>n+c[2],0),204);
 const [ps,pc]=D.groups.Peshitta['4325'];assert.equal(pc.reduce((n,c)=>n+c[2],0),535);
 const water=ps.findIndex(g=>g.key==='lemma:MJ:subs');assert(water>=0);assert(pc.filter(c=>c[0]===water).reduce((n,c)=>n+c[2],0)>400);
 assert(ps[water].forms.some(f=>Array.isArray(f)&&f[0]==='ܕܡ̈ܝܐ'));
 assert(ps.some(g=>g.type==='form'));assert(ps.some(g=>g.type==='phrase'));
});
