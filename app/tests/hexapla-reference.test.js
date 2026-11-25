'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function rows(text){
 const window={},box={window};
 vm.runInNewContext(fs.readFileSync(path.join(root,'library-textcrit-hexapla.js'),'utf8'),box);
 const hx=window.LibraryHexaplaTC.create({esc:s=>String(s),load:async()=>null});
 return hx.entries({book:'Exodus',vol:1,notes:{},verses:{'1:1':[{t:text,fn:[],pg:1,leaf:1}]}},[{ref:'Exodus 1:1',row:0}])[0];
}
test('Likewise the LXX retains its source siglum and footnote inside one reference row',()=>{
 const e=rows('Ο΄. τῆς Φυλιστιείμ. Ἀ. Θ. ὁμοίως τοῖς Ο΄. Σ. τῶν Φυλιστιαίων.^34');
 assert.equal(e.hexaplaRows.length,3);
 assert.equal(e.hexaplaRows[1].siglum,'Ἀ. Θ.');
 assert.equal(e.hexaplaRows[1].lxxReference,true);
 assert.equal(e.hexaplaRows[2].siglum,'Σ.');
 assert(e.html.includes('τῶν'));assert(e.html.includes('34'));
});
test('Parenthesized pure references are classified without creating another LXX witness',()=>{
 const e=rows('Ο΄. ἐνέχεεν (Σ. Θ. ὁμοίως τοῖς Ο΄^1) εἰς κρατῆρας. Ἀ. ἔθηκεν.');
 assert.equal(e.hexaplaRows.length,3);
 assert.equal(e.hexaplaRows[1].siglum,'Σ. Θ.');
 assert.equal(e.hexaplaRows[1].lxxReference,true);
 assert.equal(e.hexaplaRows[1].forWord,'ἐνέχεεν');
});
test('Plain likewise is a reference but likewise followed by actual wording remains a reading',()=>{
 assert.equal(rows('Ο΄. αὐτῷ. Θ. ὁμοίως.^1').hexaplaRows[1].lxxReference,true);
 const r=rows('Ο΄. αὐτῷ. Θ. ὁμοίως· ἐν αὐτῷ.^1').hexaplaRows[1];
 assert.equal(r.lxxReference,false);assert.equal(r.type,'wiedergabe');assert(r.reading.includes('ἐν αὐτῷ'));
});
