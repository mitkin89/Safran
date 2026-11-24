'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function parse(text,notes={}){
 const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'library-textcrit-hexapla.js'),'utf8'),{window});
 const hx=window.LibraryHexaplaTC.create({esc:String,load:async()=>null});
 return hx.entries({book:'Exodus',vol:1,notes,verses:{'1:11':[{t:text,fn:Object.keys(notes),pg:1,leaf:1}]}},[{ref:'Exodus 1:11',row:0}])[0];
}
test('Exodus 1:11 keeps the LXX continuation outside the Three’s supplied conjunction',()=>{
 const source=fs.readFileSync(path.join(root,'hexapla-data/Exodus.js'),'utf8');
 const window={};vm.runInNewContext(source,{window});const data=window.HEXAPLA_DATA.Exodus;
 const unit=data.verses['1:11'][4],entry=parse(unit.t,data.notes),rows=entry.hexaplaRows;
 assert.equal(rows.length,2);
 assert.equal(rows[0].siglum,'Ο΄.');assert.equal(rows[0].type,'asterisk');
 assert(rows[0].reading.includes('Ῥαμεσσῆ'));assert(rows[0].reading.includes('Ἡλιούπολις'));
 assert.equal(rows[1].siglum,'Ἀ. Σ. Θ.');
 assert.equal(rows[1].reading,'καὶ ↙^21');assert.equal(rows[1].type,'gleich');
 assert(entry.html.includes('21'));assert(entry.html.includes('22'));
});
test('An independent later witness remains independent of the initial critical annotation',()=>{
 const entry=parse('Ο΄. ※ Ἀ. καὶ ↙^1 πόλις. Σ. κώμη.');
 const rows=entry.hexaplaRows;
 assert.equal(rows.length,3);assert.equal(rows[0].reading,'※ καὶ ↙^1 πόλις.');
 assert.equal(rows[1].reading,'καὶ ↙^1');assert.equal(rows[1].type,'gleich');
 assert.equal(rows[2].siglum,'Σ.');assert.equal(rows[2].reading,'κώμη.');assert.equal(rows[2].type,'wiedergabe');
});
test('An ordinary translator comparison without a closing metobelus is unchanged',()=>{
 const rows=parse('Ο΄. ※ Ἀ. καὶ πόλις. Σ. κώμη.').hexaplaRows;
 assert.equal(rows.length,3);assert.equal(rows[0].reading,'※');assert.equal(rows[1].reading,'καὶ πόλις.');
});
