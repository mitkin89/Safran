'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const B=require('../tools/mishnah/build_kodashim_kaufmann_scaffold.cjs');
function fixture(){const offsetText="\n  כל □ ע'ע'ז'  \n",words=[{start:3,end:5,text:'כל',key:'כל',flags:[]},{start:6,end:7,text:'□',key:'',flags:['gap']},{start:8,end:14,text:"ע'ע'ז'",key:'עעז',flags:['add']}];return {title:'Mishnah Zevachim',coordinate:[5,1],source:{project:'Digital Mishnah'},witnesses:{K:{id:'S07326',sha256:'xml-proof',units:{'1:1':{id:'S07326.5.1.1.1',text:"כל □ ע'ע'ז'",offsetText,words,annotations:[{tag:'add',start:8,end:14,text:"ע'ע'ז'",attrs:{hand:'#h2'}}],raw:'<ab>exact source XML</ab>'}}},P:{sha256:'parma'},C:{sha256:'cambridge'}},interlinear:{chapters:{'1':{P:{links:[]},C:{links:[]}}},baseNotes:{'1':[]}}};}
const binding={file:'mishnah-textcrit/mishnah-zevachim.js',sha256:'module-proof'};
test('preserves exact diplomatic whitespace, raw, annotations, boundaries and flags without mutating input',()=>{
 const original=fixture(),before=JSON.stringify(original),r=B.buildBook(original,binding);
 assert.equal(JSON.stringify(original),before);assert.deepEqual(r.data.units,original.witnesses.K.units);assert.deepEqual(r.data.base,original.witnesses.K.units);assert.equal(r.audit.sourceUnitsSha256,r.audit.scaffoldUnitsSha256);assert.equal(r.data.source.vocalized,false);assert.equal(r.data.source.pointingDonor,null);assert.equal(r.data.transfers.every(t=>t.originalWord===t.pointedWord&&t.source===null),true);
 assert.deepEqual(r.data.interlinear.chapters['1'].P,original.interlinear.chapters['1'].P);assert.equal(r.data.interlinear.chapters['1'].D.links.length,3);
});
test('maps gaps and multi-token editorial source words explicitly without inventing word boundaries',()=>{
 const {data,audit}=B.buildBook(fixture(),binding);assert.equal(data.sourceWordCards.length,3);assert.equal(data.forms.length,3);assert.deepEqual(data.wordCardMapping.map(m=>m.formIds.length),[1,0,2]);assert.deepEqual(audit.mappingAnomalies.map(m=>m.kind),['no-lexical-token','one-source-word-multiple-lexical-tokens']);
 assert.equal(data.forms.every(f=>f.analyses.length===0&&f.status==='unresolved'),true);assert.equal(data.sourceWordCards.every(f=>f.analyses.length===0&&f.status==='unresolved'),true);assert.equal(data.forms[1].sourceWordId,data.forms[2].sourceWordId);assert.equal(data.units['1:1'].words[2].text,"ע'ע'ז'");
});
test('rejects changed offsets, foreign scope, source mutations and broken card owner mappings',()=>{
 let f=fixture();f.witnesses.K.units['1:1'].words[0].end++;assert.throws(()=>B.buildBook(f,binding),/offset drift/);
 f=fixture();f.coordinate[0]=3;assert.throws(()=>B.buildBook(f,binding),/outside Kodashim/);
 f=fixture();let r=B.buildBook(f,binding);r.data.units['1:1'].words[0].flags.push('del');assert.throws(()=>B.validate(r.data,f),/source core changed/);
 r=B.buildBook(f,binding);r.data.sourceWordCards[0].formIds=[2];assert.throws(()=>B.validate(r.data,f),/word-card owner/);
});
test('full eleven-book build has 582 unchanged units and 31065 source cards, all morphology unresolved',()=>{
 const built=B.buildAll();assert.equal(built.audit.summary.books,11);assert.equal(built.audit.summary.units,582);assert.equal(built.audit.summary.sourceWords,31065);assert.equal(built.audit.summary.lexicalForms,31042);
 for(const r of built.results){assert.equal(r.audit.sourceUnitsSha256,r.audit.scaffoldUnitsSha256);assert.equal(r.data.forms.every(f=>f.status==='unresolved'&&!f.analyses.length),true);assert.equal(r.item.integrated,false);assert.equal(B.sourceCore(r.data),r.audit.sourceCoreSha256);}
});
test('writes only own scaffold modules/catalog/audit, leaving integration files untouched',t=>{
 const app=fs.mkdtempSync(path.join(os.tmpdir(),'kodashim-scaffold-'));t.after(()=>fs.rmSync(app,{recursive:true,force:true}));for(const file of ['mishnah-accordance-catalog.js','manifest.json','main.js'])fs.writeFileSync(path.join(app,file),'sentinel');
 const r=B.buildBook(fixture(),binding),built={results:[r],catalog:{[r.data.title]:r.item},audit:{summary:{books:1}}};B.writeAll(built,{app});for(const file of ['mishnah-accordance-catalog.js','manifest.json','main.js'])assert.equal(fs.readFileSync(path.join(app,file),'utf8'),'sentinel');const loaded=require(path.join(app,r.item.file));assert.deepEqual(loaded.units,r.data.units);assert.equal(fs.existsSync(path.join(app,'mishnah-kaufmann-kodashim-catalog.js')),true);assert.equal(fs.existsSync(path.join(app,'bundled')),false);
});
