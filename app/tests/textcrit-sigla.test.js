'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const S=require('../textcrit-sigla'),L=require('../textcrit-summary');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
test('Field sigla unify display while Peshitta and source identities remain distinct',()=>{
 assert.equal(S.label('LXX','LXX'),'Tov');assert.equal(S.label('LXX','LXX?'),'Tov?');assert.equal(S.label('Hex','α′'),'Ἀ.');assert.equal(S.label('Hex','σ′'),'Σ.');assert.equal(S.label('Hex','θ′'),'Θ.');assert.equal(S.label('Hex','ζ′'),'Ζ΄');assert.equal(S.label('Hex','ὁ Σύρος'),'Ὁ Σύρος');assert.equal(S.label('Syr','Syr'),'Syr');assert.equal(S.label('LXX','LXX A'),'Tov A');
 const e=[{anchor:{kind:'word',start:0,end:0},lz:{f:'Hex',w:'σ′',op:'cite'}}];assert(L.render(e,['דבר'],e[0].anchor,esc).includes('>Σ.</span>'));assert.equal(L.build(e)[0].parts[0].ws[0].w,'σ′');
 const legend=S.legend(esc);for(const sign of ['※','÷','↙'])assert(legend.includes(sign));assert(legend.includes('nur, wo sie in der Field-Quelle stehen'));assert(legend.includes('Peschitta'));
});
test('CATSS entries use Tov while Field retains original sigla and critical signs',async()=>{
 const root=path.resolve(__dirname,'..'),box={window:{TextCritSigla:S,TextCrit:require('../textcrit-core')}};
 for(const f of ['library-tov.js','library-textcrit-hexapla.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),box);
 const host={esc,load:async(file,get)=>{if(!get())vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),box);return get();}};
 const tov=box.window.LibraryTov.create(host);await tov.load();const rows=tov.entries([{ref:'Ezekiel 1:1',row:'1'}]);assert(rows.some(r=>r.html.includes('data-witness="LXX"')&&r.html.includes('>Tov</span>')));
 const hx=box.window.LibraryHexaplaTC.create(host),d=await hx.load('Ezekiel'),html=hx.entries(d,[{ref:'Ezekiel 1:1',row:'1'}]).map(r=>r.html).join('');assert(html.includes('>Field</span>'));assert(html.includes('>÷</span>'));assert(html.includes('>↙</span>'));assert(html.includes('Metobelus:'));
});
