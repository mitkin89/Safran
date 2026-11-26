'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../library-navigation'),'utf8');
test('retired field queries restore as empty slots while ordinary search and book tabs retain their place',async()=>{
 const ses={idx:0,tabs:[{sres:{q:'Angst und Furcht',params:{semantic:{fieldId:'fear'},query:'Angst und Furcht'}}},{sres:{q:'Gott',params:{query:'Gott',semantic:null}}},{key:'Genesis',rels:['he.json'],sk:'chapter1'}]};
 const host={tabs:[],groupsByKey:new Map([['Genesis',{key:'Genesis',versions:[{rel:'he.json'}]}]]),showView(){},async loadView(){}};
 const ctx=vm.createContext({host,localStorage:{getItem:()=>JSON.stringify(ses)},document:{documentElement:{classList:{contains:()=>false}}},window:{scrollTo(){},BibleVersions:require('../bible-versions')},sesRestored:false});
 const begin=source.indexOf('  async function restoreSession()'),end=source.indexOf('\n    return {',begin);
 vm.runInContext(source.slice(begin,end)+'\nthis.restore=restoreSession;',ctx);await ctx.restore();
 assert.equal(host.tabs.length,3);assert.equal(host.tabs[0].group,null);assert.equal(host.tabs[0].sres,undefined);
 assert.equal(host.tabs[1].sres.params.query,'Gott');assert.equal(host.tabs[2].group.key,'Genesis');assert.equal(host.tabIdx,0);assert.equal(ctx.sesRestored,true);
});
