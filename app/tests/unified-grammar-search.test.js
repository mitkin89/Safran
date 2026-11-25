'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(require.resolve('../library-search.js'),'utf8');
async function params(syntax,book='',scope=[]){
 const nodes=new Map();const $=key=>{if(!nodes.has(key))nodes.set(key,{value:'',checked:false,hidden:false,options:[],textContent:'',innerHTML:'',classList:{toggle(){}},removeAttribute(){}});return nodes.get(key);};
 $('#sq').value='normal text';$('#gQuery').value='ברא';$('#gPos').value='V';$('#gStem').value='q';$('#gBook').value=book;
 $('#gBook').options=[{value:''},{value:'Genesis'},{value:'Exodus'}];
 const ctx={window:{LibraryWorks:require('../library-works')},$,syntax,Set,I18N:{t:x=>x},searchId:0,searchPending:false,sSetBusy(){},isConcordance:()=>false,sKinds:()=>['de'],sTitles:new Set(scope),sCats:new Set(),sMatchParams:()=>({}),fullCache:null,O:{search:async p=>{ctx.sent=p;return null;}},KIND_LABEL:{},JSON};
 const gram=src.slice(src.indexOf('    const GRAM_IDS ='),src.indexOf('    for (const id of Object.values(GRAM_IDS))'))+src.slice(src.indexOf('    function gramParams('),src.indexOf("    $('#gClear').onclick"));
 const run=src.slice(src.indexOf('    async function runSearch('),src.indexOf('    // Treffer pro Vers zusammenfassen:'));
 vm.createContext(ctx);vm.runInContext(gram+run,ctx);await ctx.runSearch(null,syntax);return JSON.parse(JSON.stringify(ctx.sent));
}
test('Grammar controls live in the word-feature panel and not in text search',()=>{
 const html=fs.readFileSync(require.resolve('../library.html'),'utf8');
 const text=html.slice(html.indexOf('<div id="sText"'),html.indexOf('<div id="sSyntax"'));
 assert(!text.includes('id="gramBox"'));assert(!text.includes('id="gPos"'));
 assert(html.indexOf('id="gramBox"')>html.indexOf('id="sSyntax"'));assert.match(html, /<button\b[^>]*id="sSyntaxTab"[^>]*aria-controls="sSyntax"[^>]*>Wortmerkmale<\/button>/);
});
test('Text queries ignore morphology selections in the other tab',async()=>{
 const p=await params(null);assert.equal(p.query,'normal text');assert.equal(p.gram,null);assert.equal(p.syntax,null);
});
test('Word-feature queries use their own input, morphology and Tanakh book scope',async()=>{
 const p=await params({word:true});assert.equal(p.query,'ברא');assert.equal(p.gram.pos,'V');assert.equal(p.gram.stem,'q');assert.equal(p.syntax,null);assert(p.lemma);assert.deepEqual(p.titles,['Genesis','Exodus']);
 assert.deepEqual((await params({word:true},'Exodus')).titles,['Exodus']);
});

test('A Maccabees work scope includes its native edition titles',async()=>{
 const p=await params(null,'',['Makkabäer I']);
 assert(p.titles.includes('The Book of Maccabees I'));
 assert(p.titles.includes('The Book of Maccabees I (Kahana Translation)'));
 assert(p.titles.includes('Makkabäer I (Septuaginta)'));
 assert(!p.titles.includes('The Book of Maccabees II'));
});
