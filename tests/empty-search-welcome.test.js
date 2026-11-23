'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../library.js'),'utf8');
function harness({results=[],body='',active=true}={}){
 const V={sres:{q:'ia 53',he:true,params:{lemma:false},res:{results,stats:results.length?[{title:'Genesis',n:1}]:[]}}};
 const nodes=new Map();const $=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',style:{setProperty(){}},classList:{toggle(){}}});return nodes.get(selector);};
 let mounts=0;
 const ctx={V,view:active?V:{},tabs:[V],$,esc:x=>String(x),I18N:{t:x=>x},buildReadHtml:async()=>body,disp:{},mountNewTab:()=>mounts++,navigationUI:{saveSession(){},updateNav(){}},outlineUI:{olBtnRefresh(){}},renderTabs(){},runSres(){throw Error('Cached search must not run again');}};
 const html=source.slice(source.indexOf('  function newTabHtml()'),source.indexOf('  function mountNewTab()'));
 const render=source.slice(source.indexOf('  async function renderSres(V)'),source.indexOf('  // Klicks im Suchtab:'));
 const show=source.slice(source.indexOf('  function showView()'),source.indexOf('  function addTab('));
 vm.createContext(ctx);vm.runInContext(html+render+show,ctx);
 return {ctx,V,nodes,$,mounts:()=>mounts};
}
test('An empty inline search includes the same welcome area as a new tab',async()=>{
 const h=harness();await h.ctx.renderSres(h.V);
 const html=h.$('#rOut').innerHTML;
 assert(html.includes('Nichts gefunden.'));assert(html.includes('ia 53'));
 for(const marker of ['class="logo"','id="ntIn"','id="ntMsg"','id="ntCal"'])assert(html.includes(marker));
 assert.equal(h.mounts(),1);
 h.$('#rOut').innerHTML='another tab';h.ctx.showView();
 assert.equal(h.$('#rOut').innerHTML,html);assert.equal(h.mounts(),2,'cached results reattach calendar and input suggestions');
});
test('Successful results keep their text and omit the welcome area',async()=>{
 const h=harness({results:[{title:'Genesis'}],body:'<div class="row">result</div>'});await h.ctx.renderSres(h.V);
 assert(h.V.sres.html.includes('result'));assert(!h.V.sres.html.includes('id="ntIn"'));
});
test('An inactive empty search is cached without replacing the visible tab or mounting its input',async()=>{
 const h=harness({active:false});h.$('#rOut').innerHTML='current chapter';await h.ctx.renderSres(h.V);
 assert(h.V.sres.html.includes('id="ntIn"'));assert.equal(h.$('#rOut').innerHTML,'current chapter');assert.equal(h.mounts(),0);
});
