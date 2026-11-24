'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../syntax-pattern'),{create}=require('../syntax-pattern-matcher');
const term=(role,lemma='',gram={},more={})=>({op:'term',role,lemma,gram,...more});
const all=(...children)=>({op:'all',children}),not=child=>({op:'not',children:[child]}),same=(role,child)=>({op:'same',role,child});
const grammar=(w,g)=>Object.entries(g).every(([k,v])=>w[k]===v);
function fixture({incomplete=false,invalid=false}={}){
 const ws=[{form:'אמר',normalized:'אמר',lemma:'אמר',pos:'V'},{form:'משה',normalized:'משה',lemma:'משה',pos:'Np',gender:'m'},{form:'מרים',normalized:'מרים',lemma:'מרים',pos:'Np',gender:'f'}];
 const sig=ws.map(w=>w.normalized).join(' '),groups=[1,2].map(at=>({refs:[['1:1',[at]]],heads:[['1:1',at,ws[at].lemma]],prepositions:[at===1?'ל':'אל']}));
 if(invalid)groups[0].refs=[['9:9',[1]]];
 const index={text:{'1:1':sig},pairs:{},constituents:{'1:1':[[0,{prepositional:{complete:!incomplete,groups},attribute:{complete:true,groups:[groups[0]]},adverbial:{complete:true,groups:[]},secondObject:{complete:true,groups:[]}}]]}};
 const book={'1:1':[sig,[[1,'?N',false,null,[0,1,2],'NA',null,'VC','Way0']]]};
 return query=>{const pattern=P.clean(query);assert(pattern);return create(index,book,[['verse']],pattern,()=>ws,grammar,w=>w.lemma)([0,0]);};
}
test('Same-word binding cannot satisfy lemma and morphology on two different heads',()=>{
 const run=fixture(),conditions=all(term('prepositional','משה'),term('prepositional','',{gender:'f'}));
 assert(run(conditions));assert.equal(run(same('prepositional',conditions)),null);
 const hit=run(same('prepositional',all(term('prepositional','משה'),term('prepositional','',{gender:'m'}))));
 assert(hit);assert(hit.positions.has(1));assert.equal(hit.explanation.proofs[0].words[0].text,'משה');
});
test('Preposition filters are tied to their own constituent head, not another phrase',()=>{
 const run=fixture();assert(run(term('prepositional','משה',{}, {preposition:'ל'})));
 assert.equal(run(term('prepositional','משה',{}, {preposition:'אל'})),null);
 assert(run(term('attribute','משה')));assert(run(not(term('adverbial'))));
});
test('Missing and unaligned constituents remain unknown under exclusion and same-word scopes',()=>{
 assert.equal(fixture({incomplete:true})(not(same('prepositional',term('prepositional','דוד')))),null);
 assert.equal(fixture({invalid:true})(not(term('attribute','משה'))),null);
 assert.equal(P.clean(same('subject',all(term('subject'),term('object')))),null);
 assert.equal(P.clean(same('subject',{op:'related',relation:'parent',child:term('subject')})),null);
 assert.equal(P.clean(term('subject','',{}, {preposition:'ל'})),null);
});
function chain(parents={}){
 const forms=['אמר','הלך','ראה'],index={text:{},pairs:{}},book={};
 forms.forEach((form,i)=>{const ref='1:'+(i+1);index.text[ref]=form;book[ref]=[form,[[i+1,'?N',false,null,[0],'NA',i||null,'VC','Way0']]];});
 const read=html=>[{form:html,normalized:html,lemma:html,pos:'V'}];
 return (query,verse)=>create(index,book,[forms],P.clean(query),read,grammar,w=>w.lemma,parents)([0,verse-1]);
}
test('Ancestor and descendant paths respect both depth bounds and report the actual distance',()=>{
 const run=chain(),path=(relation,minDepth,maxDepth,lemma)=>({op:'related',relation,minDepth,maxDepth,child:term('verb',lemma)});
 const hit=run(path('ancestor',2,2,'אמר'),3);assert(hit);assert.equal(hit.explanation.proofs[0].children[0].pathDepth,2);
 assert.equal(run(path('ancestor',1,1,'אמר'),3),null);assert.equal(run(path('descendant',1,1,'ראה'),1),null);
 assert(run(path('descendant',2,3,'ראה'),1));
 assert.equal(P.clean(path('ancestor',3,2,'אמר')),null);assert.equal(P.clean(path('descendant',1,13,'ראה')),null);
 assert.equal(run(not(path('descendant',1,3,'דוד')),3)?.words[0].form,'ראה');
 assert.equal(chain({4:3})(not(path('descendant',1,3,'דוד')),3),null);
});
test('Saved queries preserve same-word scopes, added roles and path bounds',()=>{
 const S=require('../syntax-patterns'),query={type:'advanced',book:'Genesis',pattern:all(same('prepositional',all(term('prepositional','משה',{}, {preposition:'ל'}),term('prepositional','',{gender:'m'}))),{op:'related',relation:'ancestor',minDepth:2,maxDepth:4,child:term('verb','אמר')})};
 const out=S.snapshot(query);assert.deepEqual(S.snapshot(out),out);assert.equal(out.pattern.children[0].child.children[0].preposition,'ל');assert.equal(out.pattern.children[1].maxDepth,4);
});
test('Attribute dependencies stay attached to the selected head',()=>{
 const ws=[{form:'אמר',normalized:'אמר',lemma:'אמר',pos:'V'},{form:'מלך',normalized:'מלך',lemma:'מלך',pos:'Nc'},{form:'עבד',normalized:'עבד',lemma:'עבד',pos:'Nc'},{form:'טוב',normalized:'טוב',lemma:'טוב',pos:'A'}],sig=ws.map(w=>w.form).join(' ');
 const index={text:{'1:1':sig},pairs:{'1:1':[[0,'אמר',['מלך','עבד'],[['1:1',[1,2]]],[],[],[],[]]]},constituents:{'1:1':[[0,{attribute:{complete:true,groups:[{refs:[['1:1',[3]]],heads:[['1:1',3,'טוב']],governors:[['1:1',2,'עבד']],governorComplete:true}]}}]]}};
 const book={'1:1':[sig,[[1,'?N',false,null,[0,1,2,3],'NA',null]]]};
 const run=lemma=>create(index,book,[['verse']],P.clean(same('subject',all(term('subject',lemma),{op:'dependent',child:term('attribute','טוב')}))),()=>ws,grammar,w=>w.lemma)([0,0]);
 assert(run('עבד'));assert.equal(run('מלך'),null);
 assert.equal(P.clean({op:'dependent',child:term('attribute','טוב')}),null);
});
test('Real Genesis supports prepositions, second objects and a genitive attached to its own subject',async()=>{
 const {searchFiles}=require('../searchcore'),path=require('node:path');
 const entries=require('../bundled/manifest.json').items.filter(e=>e.title==='Genesis'&&e.versionTitle.startsWith('Westminster'));
 const run=pattern=>searchFiles({dir:path.join(__dirname,'../bundled'),entries,params:{syntax:{pattern},perFile:1000}});
 const has=(r,c,v)=>r.results.some(x=>x.path[0]===c-1&&x.path[1]===v-1);
 assert(has(await run(term('prepositional','ראשית',{}, {preposition:'ב'})),1,1));
 assert(has(await run(term('secondObject','שת')),4,25));
 assert(has(await run(same('subject',all(term('subject','רוח'),{op:'dependent',child:term('attribute','אלהים')}))),1,2));
 const wrong=await run(same('subject',all(term('subject','רוח'),{op:'dependent',child:term('attribute','תהום')})));
 assert(!has(wrong,1,2),'the other genitive in the verse must not be attached to Spirit');
});
test('All 39 additional indexes keep heads and governors inside text-verified source ranges',()=>{
 const fs=require('node:fs'),path=require('node:path'),dir=path.join(__dirname,'../bundled/syntax'),files=fs.readdirSync(dir).filter(x=>x.endsWith('.json'));
 assert.equal(files.length,39);let groups=0;
 for(const file of files){
  const index=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
  assert(index.constituents,file);
  for(const [ref,rows]of Object.entries(index.constituents))for(const [at,roles]of rows){
   assert(index.text[ref]?.split(' ')[at],file+' '+ref);
   for(const [role,data]of Object.entries(roles)){
    assert(['secondObject','adverbial','prepositional','attribute'].includes(role));assert.equal(typeof data.complete,'boolean');
    for(const group of data.groups){groups++;
     for(const [r,ids]of group.refs)for(const i of ids)assert(index.text[r]?.split(' ')[i],file+' '+r);
     for(const [r,i,lemma]of group.heads){assert(group.refs.some(([v,ids])=>v===r&&ids.includes(i)));assert.match(lemma,/^[א-ת]+$/u);}
     for(const [r,i,lemma]of group.governors||[]){assert(index.text[r]?.split(' ')[i]);assert.match(lemma,/^[א-ת]+$/u);}
    }
   }
  }
 }
 assert(groups>90000);
});
test('Cyclic source clause links do not create negative evidence',()=>{
 const ws=[{form:'אמר',normalized:'אמר',lemma:'אמר',pos:'V'}],index={text:{'1:1':'אמר'},pairs:{}},book={'1:1':['אמר',[[1,'?N',false,null,[0],'NA',1]]]};
 const pattern=P.clean(not({op:'related',relation:'ancestor',minDepth:1,maxDepth:12,child:term('verb','הלך')}));
 assert.equal(create(index,book,[['verse']],pattern,()=>ws,grammar,w=>w.lemma,{1:1})([0,0]),null);
});
