'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path');
const {Library,relPathOf}=require('../offline');
const {parseLibraryIndex,parseDownload}=require('../library-integrity');
const entry={title:'Example',language:'Hebrew',versionTitle:'Edition',categories:['Test'],json_url:'https://example.org/sefaria-export/Example/he/Edition.json'};
const doc=text=>({title:'Example',language:'Hebrew',versionTitle:'Edition',text});
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'safran-integrity-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
test('beschädigter Index ohne Sicherung bleibt unangetastet und blockiert Speichern',async t=>{
 const dir=await fixture(t),file=path.join(dir,'library.json');await fs.writeFile(file,'defekt');const lib=new Library(dir);
 await assert.rejects(lib.load(),{code:'LIBRARY_INDEX_DAMAGED'});await assert.rejects(lib.save(),/nicht überschrieben/);assert.equal(await fs.readFile(file,'utf8'),'defekt');
});
test('gültige Sicherung wird wiederhergestellt, beschädigtes Original bleibt erhalten',async t=>{
 const dir=await fixture(t),lib=await new Library(dir).load();await lib.addOwn({title:'Example',kind:'he',text:[['erste Fassung']],versionTitle:'Edition',categories:['Test']});await lib.save();
 const file=path.join(dir,'library.json');await fs.writeFile(file,'defekt');const loaded=await new Library(dir).load();assert.equal(loaded.list().length,1);assert(loaded.recovery);
 assert.equal(parseLibraryIndex(await fs.readFile(file,'utf8')).entries[loaded.list()[0].rel].title,'Example');
 const broken=(await fs.readdir(dir)).find(n=>n.includes('.broken-'));assert.equal(await fs.readFile(path.join(dir,broken),'utf8'),'defekt');
});
test('fehlender Primärindex mit defekter Sicherung ist keine neue leere Bibliothek',async t=>{
 const dir=await fixture(t);await fs.writeFile(path.join(dir,'library.json.bak'),'defekt');await assert.rejects(new Library(dir).load(),{code:'LIBRARY_INDEX_DAMAGED'});
});
test('ungültiges Schema wird nicht als Index akzeptiert',()=>{for(const value of [{entries:[]},{entries:{x:{}}},{entries:{'../x':{rel:'../x',title:'x',categories:[]}}}])assert.throws(()=>parseLibraryIndex(JSON.stringify(value)));});
test('Fehlerseite oder falsche Ausgabe ersetzt keinen gültigen Download',async t=>{
 const dir=await fixture(t);let response=Buffer.from(JSON.stringify(doc([['alt']])));const lib=await new Library(dir,async()=>response).load();await lib.downloadEntries([entry]);
 const rel=relPathOf(entry),file=path.join(dir,rel),old=await fs.readFile(file);const before={...lib.index.entries[rel]};
 for(const bad of ['<html>Fehler</html>',JSON.stringify({title:'Example',error:'Fehler'}),JSON.stringify(doc([42])),JSON.stringify({...doc([['falsch']]),title:'Other'}),JSON.stringify({...doc([['falsch']]),versionTitle:'Other'})]){
  response=Buffer.from(bad);const result=await lib.downloadEntries([entry],{force:new Set([rel])});assert.equal(result.failed.length,1);assert.deepEqual(await fs.readFile(file),old);assert.deepEqual(lib.index.entries[rel],before);
 }
});
test('gültige komplexe Texte und leere Felder bleiben zulässig',()=>{assert.deepEqual(parseDownload(Buffer.from(JSON.stringify(doc({Vorwort:[''],Hauptteil:[null,['Text']]}))),entry).text,{Vorwort:[''],Hauptteil:[null,['Text']]});});

test('Sefaria language names and merged-export codes identify the same edition',async t=>{
 const dir=await fixture(t);
 for(const [name,code]of [['Hebrew','he'],['English','en']]){
  for(const [expected,actual]of [[name,code],[code,name]]){
   const wanted={...entry,language:expected},source={...doc([['Text']]),language:actual};
   assert.deepEqual(parseDownload(Buffer.from(JSON.stringify(source)),wanted),source);
  }
  const wanted={...entry,language:name,json_url:'https://example.org/sefaria-export/Example/'+code+'/Edition.json'};
  const source=Buffer.from(JSON.stringify({...doc([['Text']]),language:code}));
  const lib=await new Library(dir,async()=>source).load(),result=await lib.downloadEntries([wanted]);
  assert.equal(result.failed.length,0);assert.deepEqual(await fs.readFile(path.join(dir,relPathOf(wanted))),source);
  assert.equal(lib.index.entries[relPathOf(wanted)].language,name);
 }
});
test('a different or missing language still cannot replace a valid edition',async t=>{
 const dir=await fixture(t);let response=Buffer.from(JSON.stringify(doc([['alt']])));
 const lib=await new Library(dir,async()=>response).load();await lib.downloadEntries([entry]);
 const rel=relPathOf(entry),before=await fs.readFile(path.join(dir,rel));
 for(const language of ['en','English','Greek',undefined,null,42]){
  response=Buffer.from(JSON.stringify({...doc([['wrong']]),language}));
  const result=await lib.downloadEntries([entry],{force:new Set([rel])});
  assert.equal(result.failed.length,1);assert.match(result.failed[0].error,/language/);
  assert.deepEqual(await fs.readFile(path.join(dir,rel)),before);
 }
});
