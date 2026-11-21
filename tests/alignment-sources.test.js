'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {check}=require('../alignment-sources'),expected=require('../interlin-sources');
const manifest=require('../bundled/manifest.json');
const hash=text=>crypto.createHash('sha256').update(JSON.stringify(text)).digest('hex');
test('alle gebauten Quellstände entsprechen beiden tatsächlichen Textfassungen',()=>{
 let count=0;
 for(const [name,books]of Object.entries(expected))for(const [book,sources]of Object.entries(books)){
  const load=meta=>{const entry=manifest.items.find(e=>e.title===book&&e.versionTitle===meta.versionTitle);assert(entry,name+' '+book+' fehlt');const d=JSON.parse(fs.readFileSync(path.join(__dirname,'..','bundled',entry.rel)));return{textHash:hash(d.text)}};
  assert.equal(check(sources,load(sources.he),[load(sources.translation)]).ok,true,name+' '+book);count++;
 }
 assert(count>100);
});
test('beibehaltene alte oder lokal veränderte Ausgabe erhält keine fremde Wortzuordnung',()=>{
 const baseline=expected.Zunz.Genesis,he={textHash:baseline.he.textHash},de={textHash:baseline.translation.textHash};
 assert.equal(check(baseline,he,[de]).ok,true);
 assert.equal(check(baseline,he,[{textHash:hash([['geändert']])}]).ok,false);
 assert.equal(check(baseline,{textHash:'anderes Hebräisch'},[de]).ok,false);
 assert.equal(check(null,he,[de]).ok,false);
});
test('fehlende Übersetzung darf den gebauten Quelltext zeigen, abweichende geladene Fassung nicht',()=>{
 const baseline=expected.Zunz.Genesis,he={textHash:baseline.he.textHash};assert.equal(check(baseline,he).ok,true);assert.equal(check(baseline,he,[{}]).ok,false);
});
