'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const P=require('../syntax-pattern'),{create}=require('../syntax-pattern-matcher'),{searchFiles}=require('../searchcore');
const term=(role,lemma='',more={})=>({op:'term',role,lemma,gram:{},...more}),all=(...children)=>({op:'all',children}),not=child=>({op:'not',children:[child]});
const variable=child=>({op:'bind',name:'x',role:'subject',child});
const entries=require('../bundled/manifest.json').items.filter(e=>e.title==='Genesis'&&e.versionTitle.startsWith('Westminster'));
const run=pattern=>searchFiles({dir:path.join(__dirname,'../bundled'),entries,params:{syntax:{pattern}},perFile:1000});
function fixture({identity='entity1',missing=false}={}){
 const words={a:[{form:'אמר',normalized:'אמר',lemma:'אמר',pos:'V'},{form:'מלך',normalized:'מלך',lemma:'מלך',pos:'Nc'}],b:[{form:'ראה',normalized:'ראה',lemma:'ראה',pos:'V'},{form:'מלך',normalized:'מלך',lemma:'מלך',pos:'Nc'}]};
 const index={text:{'1:1':'אמר מלך','1:2':'ראה מלך'},pairs:{'1:1':[[0,'אמר',['מלך'],[['1:1',[1]]],[],[],[],[]]],'1:2':[[0,'ראה',[],[],['מלך'],[['1:2',[1]]],[],[]]]},identities:{'1:1':[[1,'מלך','1:1',1,'entity1',true]],'1:2':missing?[]:[[1,'מלך','1:1',1,identity,true]]}};
 const book={'1:1':['אמר מלך',[[1,'?N',false,null,[0,1],'NA',null]]],'1:2':['ראה מלך',[[2,'?N',false,null,[0,1],'Objc',1]]]};
 const read=x=>words[x],grammar=(w,g)=>Object.entries(g).every(([k,v])=>w[k]===v);
 return pattern=>create(index,book,[['a','b']],P.clean(pattern),read,grammar,w=>w.lemma,{2:1})([0,0]);
}
test('Named variables compare source identities across clauses, not spelling',()=>{
 const query=variable(all(term('subject','מלך'),{op:'related',relation:'child',child:term('object','',{sameAs:'x',identity:'referent'})}));
 const hit=fixture()(query);assert(hit);assert.equal(hit.explanation.proofs[0].name,'x');
 assert.equal(fixture({identity:'anotherEntity'})(query),null);
 assert.equal(fixture({missing:true})(variable(not(query.child.children[1]))),null);
 assert.equal(fixture()(variable({op:'related',relation:'child',child:term('object','',{sameAs:'x',identity:'token'})})),null);
 assert.equal(P.clean(term('object','',{sameAs:'x'})),null);assert.equal(P.clean(variable(variable(term('subject')))),null);
 const S=require('../syntax-patterns'),saved=S.snapshot({type:'advanced',book:'Genesis',pattern:query});assert.deepEqual(S.snapshot(saved),saved);
});
test('Actual source trees retain the MACULA hierarchy and verified highlights',()=>{
 const T=require('../syntax-source-tree'),fs=require('node:fs'),doc=JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled',entries[0].rel),'utf8'));
 const read=html=>[...html.matchAll(/<span class="w" data-l="[^"]*" data-m="[^"]*">(.*?)<\/span>/g)].map(m=>({normalized:m[1].replace(/[^א-ת]/g,'')}));
 const data=T.get('Genesis','1:1',doc.text,read,new Set([1]));assert(data.trees.length);assert(data.trees[0].children[0].rule.includes('V-S-O'));
 const flat=n=>[n,...(n.children||[]).flatMap(flat)],nodes=data.trees.flatMap(flat);assert(nodes.some(n=>n.kind==='word'&&n.matched));assert(nodes.some(n=>n.role==='s'));
 doc.text[0][0]='changed';assert(T.get('Genesis','1:1',doc.text,read,new Set([1])).unavailable);
});
test('Coverage accompanies empty results; semantic annotations remain positive working assignments',async()=>{
 const result=await run(term('recipient','זרע'));assert(result.results.some(x=>x.path[0]===11&&x.path[1]===6));
 assert(result.results[0].sentenceTree.trees.length);assert(result.syntaxCoverage.advanced);assert(result.syntaxCoverage.books[0].unknownContexts>0);
 const no=await run(term('recipient','אבגד'));assert.equal(no.results.length,0);assert(no.syntaxCoverage.books[0].contexts>0);assert(no.syntaxCoverage.books[0].unknownContexts>0);
 assert.equal((await run(not(term('recipient','אבגד')))).results.length,0);
 assert((await run(term('location','רקיע'))).results.some(x=>x.path[0]===0&&x.path[1]===16));
 assert((await run(term('beneficiary','בית'))).results.some(x=>x.path[0]===29&&x.path[1]===29));
});
test('Nominal clauses expose separately aligned subjects without inventing verbs',async()=>{
 const result=await run(all({op:'term',role:'kind',value:'NC'},term('subject')));assert(result.results.length);assert(result.results.some(r=>r.syntax.some(e=>e.verb==='')));
});
test('Real Enoch reference joins an explicit subject to a later pronominal object',async()=>{
 const result=await run(variable(all(term('subject','חנוך'),{op:'related',relation:'later',child:term('object','',{sameAs:'x',identity:'referent'})})));
 assert(result.results.some(r=>r.path[0]===4&&r.path[1]===23));
});
test('Semantic working annotations are text-pinned and never inferred from a preposition',()=>{
 const S=require('../syntax-semantics');assert.equal(S.data.records.length,20);assert.equal(S.data.status,'not independently reviewed');
 const r=S.data.records[0],ws=r.signature.split(' ').map(normalized=>({form:normalized,normalized}));
 assert(S.heads(r.book,r.ref,r.anchor,r.role,ws,w=>w.normalized).items.length);
 ws[0].normalized='changed';assert.equal(S.heads(r.book,r.ref,r.anchor,r.role,ws,w=>w.normalized).items.length,0);
 assert.equal(S.heads('Genesis','1:1',1,'recipient',[],w=>w.normalized).complete,false);
});
test('Coverage reports changed text and unreadable source files instead of interpreting absence',async t=>{
 const fs=require('node:fs/promises'),os=require('node:os'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'safran-coverage-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const e=entries[0],d=JSON.parse(await fs.readFile(path.join(__dirname,'../bundled',e.rel),'utf8'));d.text[0][0]=d.text[0][0].replace('בָּרָ֣א','אָמַר');
 const local={...e,rel:'source.json'};await fs.writeFile(path.join(dir,local.rel),JSON.stringify(d));
 const params={syntax:{pattern:term('verb','ברא')}};
 const changed=await searchFiles({dir,entries:[local],params});assert(!changed.results.some(r=>r.path[0]===0&&r.path[1]===0));assert(changed.syntaxCoverage.books[0].textMismatch>=1);
 const missing=await searchFiles({dir,entries:[{...local,rel:'missing.json'}],params});assert.deepEqual(missing.syntaxCoverage.unreadable,['Genesis']);assert(missing.syntaxCoverage.incomplete);
});
