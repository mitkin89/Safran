'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {greekGroups,attach}=require('../concordance-parallels'),{searchFiles}=require('../searchcore'),Preview=require('../concordance-preview');
const words=xs=>({text:[[xs.map(w=>'<span class="w">'+w+'</span>').join(' ')]]}),greek=xs=>({text:[[xs.map(([h,g])=>'<span class="wg" data-h="'+h+'">'+g+'</span>').join(' ')]]});
test('CATSS allows omitted Hebrew words but never assigns empty or ambiguous anchors',()=>{
 const groups=greekGroups(words(['א','כי','ב']),greek([['א','α'],['','γάρ'],['ב','β']]),0,0);assert.deepEqual(groups.map(x=>x.ix),[[1],[],[3]]);assert.deepEqual(groups.map(x=>x.positions),[[1],[2],[3]]);
 assert.deepEqual(greekGroups(words(['א','א']),greek([['א','α']]),0,0)[0].ix,[],'two possible identical source anchors must remain unlinked');
 assert.deepEqual(greekGroups(words(['א','ב','א']),greek([['א','α'],['ב','β']]),0,0).map(x=>x.ix),[[1],[2]],'later anchors disambiguate repeated source forms');
 assert.deepEqual(greekGroups(words(['א','ב']),greek([['א','α'],['ג','γ']]),0,0),[],'unmatched explicit anchors are rejected');
 assert.deepEqual(greekGroups(words(['א','ב']),greek([['ב','β'],['א','α']]),0,0),[],'do not invent reordered word mappings');
 assert.deepEqual(greekGroups(words(['אב','גד','ה']),greek([['אבגד','α'],['ה','β']]),0,0).map(x=>x.ix),[[1,2],[3]]);
 const outside=greek([['א','α']]);outside.text[0][0]+=' extra';assert.deepEqual(greekGroups(words(['א']),outside,0,0),[],'ungrouped tokens must not shift native Greek positions');
});
test('Genesis 28:11 Strong 4763 shows the exact CATSS phrase in both directions while the unanchored word remains unlinked',async()=>{
 const dir=path.join(__dirname,'../bundled'),entries=require('../bundled/manifest.json').items.filter(e=>e.title==='Genesis'&&(/^(Westminster|ETCBC Peshitta)/.test(e.versionTitle)||e.versionTitle==='Septuaginta (CATSS)'));
 const result=await searchFiles({dir,entries,params:{query:'מראשתיו',concordance:true,concordanceLemma:'4763',lemma:true,crossLanguage:true,limit:100,perFile:100}}),hit=result.results.find(r=>r.path[0]===27&&r.path[1]===10);assert(hit);assert.equal(hit.position,12);
 const peer=hit.parallels.find(p=>p.language==='Greek');assert(peer);assert.deepEqual(peer.words,['πρὸς κεφαλῆς αὐτοῦ']);assert.deepEqual(peer.positions,[20,21,22]);assert.equal(peer.analysisSource,'CATSS / Tov–Kraft');const html=Preview.render(peer,s=>s);assert.match(html,/<span class="pvhl">κεφαλῆς<\/span>/);
 const reversed=await searchFiles({dir,entries,params:{query:'κεφαλῆς',concordance:true,crossLanguage:true,limit:100,perFile:100}}),gr=reversed.results.find(r=>r.language==='Greek'&&r.path[0]===27&&r.path[1]===10);assert(gr);assert.deepEqual(gr.parallels.find(p=>p.kind==='he').positions,[12]);
 const he=entries.find(e=>e.kind==='he'),missing={rel:he.rel,title:'Genesis',versionTitle:he.versionTitle,path:[27,10],position:5};await attach({dir,entries,results:[missing]});assert(!missing.parallels.some(p=>p.language==='Greek'),'Hebrew ki has no supplied CATSS anchor for Greek gar');
});
