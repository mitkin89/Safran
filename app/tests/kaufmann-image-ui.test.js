'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),D=require('../mishnah-kaufmann-berakhot-data'),E=require('../mishnah-kaufmann-image-data'),M=require('../mishnah-morph');
const sandbox={window:{},URL};vm.runInNewContext(fs.readFileSync(require.resolve('../library-mishnah-morph'),'utf8'),sandbox);const UI=sandbox.window.LibraryMishnahMorph;
test('all 2171 lexical cards resolve exactly 2170 diplomatic image positions including split abbreviation',()=>{
 const ids=[];for(const u of Object.values(D.units))for(const token of M.tokens(u.offsetText)){const bound=UI.sourceWord(u,token);assert(bound);assert(E.words[bound.id]);ids.push(bound.id);}
 assert.equal(ids.length,2171);assert.equal(new Set(ids).size,2170);
 const u=D.units['8:6'],ts=M.tokens(u.offsetText),a=UI.sourceWord(u,ts[9]),b=UI.sourceWord(u,ts[10]),next=UI.sourceWord(u,ts[11]);assert.equal(a.id,b.id);assert.equal(next.index,a.index+1);
});
test('image evidence requires the exact derived source and manuscript fingerprint',()=>{
 const id=Object.keys(E.words)[0];assert(UI.boundImageEvidence(D,E,id));
 for(const e of [{...E,targetTextHash:'wrong'},{...E,diplomaticSha256:'wrong'},{...E,title:'other'}])assert.equal(UI.boundImageEvidence(D,e,id),null);
 assert.equal(UI.boundImageEvidence({...D,source:{...D.source,versionTitle:'other'}},E,id),null);
});
test('image links permit only direct images in the bound Archive item',()=>{
 for(const im of Object.values(E.images))assert.equal(UI.imageURL(im.url),im.url);
 for(const url of ['https://archive.org/download/other/folio.jpg','https://archive.org.evil.test/download/Mishnah_Kaufman_ms/a.jpg','http://archive.org/download/Mishnah_Kaufman_ms/a.jpg','https://archive.org/download/Mishnah_Kaufman_ms/../a.jpg','https://archive.org/download/Mishnah_Kaufman_ms/%2e%2e%2fa.jpg','https://archive.org/download/Mishnah_Kaufman_ms/a.jpg?redirect=evil','javascript:alert(1)'])assert.equal(UI.imageURL(url),null,url);
});
