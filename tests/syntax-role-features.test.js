'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../syntax-pattern'),{create}=require('../syntax-pattern-matcher');
const term=(role,lemma='',gram={},position)=>({op:'term',role,lemma,gram,...(position?{position}:{})});
function fixture({repeat=false,subjectRef='1:1'}={}){
 const words=[{form:'בת',normalized:'בת',lemma:'בת',gender:'f',number:'s',pos:'Nc'},{form:'פרעה',normalized:'פרעה',lemma:'פרעה',gender:'m',number:'s',pos:'Np'},{form:'ירד',normalized:'ירד',lemma:'ירד',gender:'f',number:'s',pos:'V'}];
 if(repeat)words[1]={...words[1],form:'בת',normalized:'בת',lemma:'בת'};
 const signature=words.map(w=>w.normalized).join(' ');
 const index={text:{'1:1':signature},pairs:{'1:1':[[2,'ירד',['בת'],[[subjectRef,[0,1]]],[],[],[],[]]]}};
 const book={'1:1':[signature,[[1,'?N',false,null,[0,1,2],'NA',null]]]};
 const grammar=(w,g)=>Object.entries(g).every(([k,v])=>w[k]===v);
 return query=>create(index,book,[['verse']],P.clean(query),()=>words,grammar,w=>w.lemma)([0,0]);
}
test('Subject morphology uses the constituent head rather than Pharaoh inside its phrase',()=>{
 const run=fixture();assert(run(term('subject','בת',{gender:'f'})));
 assert.equal(run(term('subject','בת',{gender:'m'})),null);
 assert.equal(run(term('subject','פרעה',{gender:'m'})),null);
});
test('Order and maximum intervening words are checked on exact role heads',()=>{
 const run=fixture();assert(run(term('subject','בת',{gender:'f'},{relative:'verb',order:'before',maxGap:1})));
 assert.equal(run(term('subject','בת',{}, {relative:'verb',order:'after',maxGap:1})),null);
 assert.equal(run(term('subject','בת',{}, {relative:'verb',order:'before',maxGap:0})),null);
 assert(run(term('verb','ירד',{}, {relative:'subject',order:'after',maxGap:1})));
});
test('Ambiguous head positions stay unknown under NOT; positional bounds are validated',()=>{
 const query=term('subject','בת',{gender:'m'});
 assert.equal(fixture({repeat:true})({op:'not',children:[query]}),null);
 assert.equal(P.clean(term('subject','',{}, {relative:'subject',order:'before',maxGap:1})),null);
 assert.equal(P.clean(term('subject','',{}, {relative:'verb',order:'before',maxGap:-1})),null);
 assert.equal(P.clean(term('referent','',{}, {relative:'verb',order:'before',maxGap:1})),null);
 assert(P.clean(term('object','', {pos:'Nc',gender:'f',number:'p',state:'c',suffix:'0',article:'1'})));
});

test('Real Exodus identifies Pharaoh’s daughter by feminine head features and verb-relative position',async()=>{
 const {searchFiles}=require('../searchcore'),path=require('node:path');
 const entries=require('../bundled/manifest.json').items.filter(e=>e.title==='Exodus'&&e.versionTitle.startsWith('Westminster'));
 const run=gender=>searchFiles({dir:path.join(__dirname,'../bundled'),entries,params:{syntax:{pattern:{op:'all',children:[term('verb','ירד'),term('subject','בת',{gender}, {relative:'verb',order:'after',maxGap:0})]}},perFile:1000}});
 const feminine=await run('f'),masculine=await run('m');
 const isDaughter=x=>x.path[0]===1&&x.path[1]===4;
 assert(feminine.results.some(isDaughter));assert(!masculine.results.some(isDaughter));
});
