'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function fixture(text){
 const window={},box={window};vm.runInNewContext(fs.readFileSync(path.join(root,'library-textcrit-hexapla.js'),'utf8'),box);
 const hx=window.LibraryHexaplaTC.create({esc:String,load:async()=>null});
 return hx.entries({book:'Isaiah',vol:2,notes:{},verses:{'1:1':[{t:text,fn:[],pg:1,leaf:1}]}},[{ref:'Isaiah 1:1',row:0}])[0];
}
test('Alternative witness attribution stays visibly uncertain without creating a pseudo reading',()=>{
 for(const qualifier of ['(s. Θ.)','(fort. Ἀ.)','(potius Ἀ.)']){
  const out=fixture('Ο΄. ἀγαθός. Σ. '+qualifier+' καλός.^1');
  assert.equal(out.hexaplaRows.length,2,qualifier);
  assert.equal(out.hexaplaRows[1].siglum,'Σ.');
  assert.equal(out.hexaplaRows[1].reading,'καλός.^1');
  assert.equal(out.hexaplaRows[1].type,'wiedergabe');
  assert.equal(out.hexaplaRows[1].attribution,'Σ. '+qualifier);
  assert(out.html.includes(qualifier.slice(0,-3)),qualifier+' displayed in heading');
 }
});
test('Uncertain attribution works inside a genuine bracketed word reading',()=>{
 const out=fixture('Ο΄. ἀγαθός (Σ. (fort. Ἀ.) καλός.^2) ἀνήρ.');
 assert.equal(out.hexaplaRows.length,2);
 assert.equal(out.hexaplaRows[0].reading,'ἀγαθός ἀνήρ.');
 assert.equal(out.hexaplaRows[1].siglum,'Σ.');
 assert.equal(out.hexaplaRows[1].forWord,'ἀγαθός');
 assert.equal(out.hexaplaRows[1].reading,'καλός.^2');
 assert(out.html.includes('(fort. '));assert(out.html.includes('καλός.'));
});
test('Edition labels stay with their witness heading and preserve separate genuine readings',()=>{
 const out=fixture('Ο΄. ἀγαθός. Ἀ. (juxta ed. 1mam) Θ. καλός. Ἀ. (juxta ed. 2dam) βέλτιστος.^3');
 assert.equal(out.hexaplaRows.length,3);
 assert.equal(out.hexaplaRows[1].siglum,'Ἀ. Θ.');
 assert.equal(out.hexaplaRows[1].reading,'καλός.');
 assert.equal(out.hexaplaRows[2].siglum,'Ἀ.');
 assert.equal(out.hexaplaRows[2].reading,'βέλτιστος.^3');
 assert(out.html.includes('(juxta ed. 1mam)'));assert(out.html.includes('(juxta ed. 2dam)'));
});
test('Alternative collective attribution retains the supplied text rather than a fragmentary s. row',()=>{
 const out=fixture('Ο΄. Vacat. ※Ἀ. (s. Οἱ λοιποί·) παύσασθε ὑμῖν ↙;^19');
 assert.equal(out.hexaplaRows.length,2);
 assert.equal(out.hexaplaRows[1].siglum,'Ἀ.');
 assert.equal(out.hexaplaRows[1].reading,'παύσασθε ὑμῖν ↙;^19');
 assert(out.html.includes('(s. '));assert(out.html.includes('παύσασθε'));
});
test('Ordinary alternative wording remains part of the actual reading',()=>{
 const out=fixture('Ο΄. ἀγαθός. Σ. καλός (s. βέλτιστος).^4');
 assert.equal(out.hexaplaRows[1].reading,'καλός (s. βέλτιστος).^4');
 assert.equal(out.hexaplaRows[1].type,'wiedergabe');
});
