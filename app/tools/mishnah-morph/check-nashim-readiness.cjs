'use strict';
// Read-only source/seed preflight. Does not call completion main() or mutate modules.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const E=require('./complete-moed-nashim.cjs');
const baselineFile=path.join(__dirname,'moed-nashim-morphology-baseline.json'),baseline=JSON.parse(fs.readFileSync(baselineFile));
const expected='0374c0a8e9a47ecd82792db3c6b37c49b5b85b8a';if(baseline.commit!==expected)throw Error('Unexpected baseline commit');
const catalogContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'mishnah-accordance-catalog.js'),'utf8'),catalogContext);
const registryPath=path.join(__dirname,'moed-nashim-seed-sources.json'),registryBytes=fs.readFileSync(registryPath),registry=JSON.parse(registryBytes);
const seedSources=registry.files.map(file=>{const bytes=fs.readFileSync(path.join(__dirname,file)),doc=JSON.parse(bytes);return{file,sha256:sha(bytes),scopeTitles:doc.scopeTitles||[],entries:(doc.entries||[]).length,doc};});
const titles=['Yevamot','Ketubot','Nedarim','Nazir','Sotah','Gittin','Kiddushin'].map(t=>'Mishnah '+t);
const books=titles.map(title=>{
 const item=catalogContext.window.MISHNAH_ACCORDANCE_CATALOG[title];if(!item||!baseline.books[title])throw Error('Missing catalog/baseline book '+title);
 const relative='app/'+item.file,file=path.join(ROOT,item.file),bytes=fs.readFileSync(file),data=require(file),oldBytes=cp.execFileSync('git',['show',expected+':'+relative],{cwd:path.join(ROOT,'..'),maxBuffer:40*1024*1024}),context={window:{},module:{exports:{}}};
 vm.runInNewContext(oldBytes.toString('utf8'),context);const old=context.module.exports,sourceCoreSha256=E.sourceCore(data),gitBaselineSourceCoreSha256=E.sourceCore(old);
 let scopedSeedEntries=0,positionalSeedRows=0,positionalSeedHashMismatches=0;
 for(const s of seedSources){if(s.scopeTitles.includes(title))scopedSeedEntries+=s.entries;for(const e of s.doc.entries||[])for(const p of e.positions||[])if(p.title===title){positionalSeedRows++;if(p.sourceTextHash!==data.source.textHash)positionalSeedHashMismatches++;}}
 const result={title,file:relative,currentFileSha256:sha(bytes),baselineFileSha256:baseline.books[title].fileSha256,gitBaselineFileSha256:sha(oldBytes),sourceTextHash:data.source.textHash,sourceCoreSha256,baselineSourceCoreSha256:baseline.books[title].sourceCoreSha256,gitBaselineSourceCoreSha256,sourceCoreMatchesBaseline:sourceCoreSha256===baseline.books[title].sourceCoreSha256,sourceCoreMatchesGitBaseline:sourceCoreSha256===gitBaselineSourceCoreSha256,scopedSeedEntries,positionalSeedRows,positionalSeedHashMismatches};
 if(!result.sourceCoreMatchesBaseline||!result.sourceCoreMatchesGitBaseline||positionalSeedHashMismatches)throw Error('Source/seed preflight failed '+title);return result;
});
// Loading the engine validates each registered seed's rabbinic dictionary article hash.
const engine=E.buildEngine();
const report={version:1,method:'Read-only seven-book preflight; buildEngine only, no main or supplementData; no source/module writes.',baselineCommit:expected,baselineManifestSha256:sha(fs.readFileSync(baselineFile)),engineScriptSha256:sha(fs.readFileSync(path.join(__dirname,'complete-moed-nashim.cjs'))),seedRegistry:{file:'moed-nashim-seed-sources.json',sha256:sha(registryBytes)},seedSources:seedSources.map(({doc,...rest})=>rest),books,engine:engine.stats,passed:true,limitations:['Readiness and source preservation only; no claim that all word positions have a complete analysis.','No new Accordance comparison or manuscript-pointing validation.']};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
