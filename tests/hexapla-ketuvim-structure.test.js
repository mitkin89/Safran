'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),root=path.join(__dirname,'..');
function fixture(book,ref,unit){const window={},box={window};vm.runInNewContext(fs.readFileSync(path.join(root,'library-textcrit-hexapla.js'),'utf8'),box);vm.runInNewContext(fs.readFileSync(path.join(root,'hexapla-data',book.replaceAll(' ','_')+'.js'),'utf8'),box);const d=window.HEXAPLA_DATA[book],h=window.LibraryHexaplaTC.create({esc:String,load:async()=>null}),entry=h.entries(d,[{ref:book+' '+ref,row:0}]).find(e=>e.hexaplaSource.unit===unit);return{entry,source:d.verses[ref][unit].t};}
test('Joint Hebrew, Latin Fifth and article-prefixed witness headings remain attributions',()=>{
 for(const [book,ref,u,heading,reading]of [['Job','3:3',0,'Ὁ Ἑβραῖος καὶ ὁ Σ.','ἐκυήθη'],['Psalms','139:8',0,'Ἀ. Σ. Ἑβρ. Ε΄.','στρώσω'],['Psalms','24:6',0,'Ἀ. Σ. Ο΄. E΄. S΄.','πρόσωπόν σου'],['Psalms','25:1',0,'Ἀ. Σ. E΄. S΄.','τοῦ Δαυίδ']]){const {entry:e}=fixture(book,ref,u),r=e.hexaplaRows.find(r=>r.siglum===heading);assert(r,heading);assert(r.reading.includes(reading));assert(!e.hexaplaRows.some(r=>['E΄.','Ἑβρ.','καὶ ὁ'].includes(r.reading)));}
});
test('Psalms113 restores the outer continuation and keeps Hebrew, Greek and Syrian bracket evidence',()=>{
 const {entry:e,source}=fixture('Psalms','113:1',0),r=e.hexaplaRows;
 assert.equal(r[0].reading,'αἰνεῖτε, παῖδες, κύριον, αἰνεῖτε τὸ ὄνομα κυρίου.');
 assert.equal(r.find(r=>r.siglum==='Ἑβρ.').reading,'ἀβδή.');assert.equal(r.find(r=>r.siglum==='Ὁ Σύρος').reading,'ὁμοίως^1');
 assert.equal(r.find(r=>r.siglum==='Ὁ Σύρος').type,'gleich');assert(!r.find(r=>r.siglum==='Ὁ Σύρος').lxxReference);assert(e.html.includes('wie zuvor'));
 assert(e.html.includes('δοῦλοι'));assert(e.html.includes('κύριον'));assert(source.includes('ὁμοίως^1)'));
});
test('Supplied attribution stays visibly parenthesized and a pure reference remains a reference',()=>{
 const {entry:e}=fixture('Psalms','149:9',0),r=e.hexaplaRows.find(r=>r.siglum==='Θ.');
 assert(r);assert.equal(r.attribution,'(Θ.)');assert.equal(r.reading,'ὁμοίως τοῖς Ο΄.^5');assert.equal(r.type,'gleich');
 assert(e.html.replace(/<[^>]*>/g,'').includes('(Θ.)'));
});
test('A previous-reading reference does not silently assert agreement with the LXX',()=>{
 const {entry:e}=fixture('Song of Songs','4:9',0),r=e.hexaplaRows.find(r=>r.siglum==='Ε΄.');
 assert.equal(r.reading,'ὁμοίως τούτοις.^23');assert.equal(r.type,'gleich');assert.equal(r.lxxReference,false);assert(e.html.includes('wie zuvor'));
});
test('Repeated LXX source sections reset comparison only in individually reviewed units',()=>{
 for(const [book,ref,u]of [['Song of Songs','6:6',0],['Esther','9:26',0],['Proverbs','17:16',0],['Proverbs','22:14',1],['II Chronicles','35:20',1],['Nehemiah','7:7',1],['Daniel','4:29',0]]){const {entry:e}=fixture(book,ref,u),bases=e.hexaplaRows.filter(r=>r.siglum==='Ο΄.');assert(bases.length>1);assert(bases.slice(1).every(r=>['','asterisk','obelus'].includes(r.type)),book+' '+ref);}
 const e=fixture('Proverbs','17:16',0).entry;assert.equal(e.hexaplaRows.find(r=>r.siglum==='Ἄλλος').type,'wiedergabe');
});
test('Lamentations source attributes its actual variant to Symmachus and an alternate LXX edition',()=>{
 const {entry:e}=fixture('Lamentations','1:17',0);assert.equal(e.hexaplaRows.length,2);const r=e.hexaplaRows[1];assert.equal(r.siglum,'Σ.');assert(r.attribution.includes('ἑτέρα ἔκδοσις τῶν Ο΄.'));assert(r.reading.includes('γενέσθαι'));assert.equal(r.type,'wiedergabe');
});
test('Book-end editorial addenda remain in full source without becoming Greek variant words',()=>{
 const {entry:e,source}=fixture('Psalms','150:6',0),r=e.hexaplaRows.find(r=>r.siglum==='Ἄλλος');assert.equal(r.reading,'· πᾶσα ἀναπνοή.^14');assert(source.includes('ADDENDA. MONITUM'));assert(e.html.includes('ADDENDA'));assert(e.html.includes('Bongiovanni'));
});
test('A cited LXX range remains a reference while its actual boundary words are checked',()=>{
 const {entry:e}=fixture('Ecclesiastes','8:9',0),r=e.hexaplaRows.find(r=>r.siglum==='Θ.');assert(r);assert.equal(r.type,'gleich');assert.equal(r.lxxReference,true);assert(r.reading.includes('ἄνθρωπος——αὐτόν'));assert(e.html.includes('15'));
});
test('Only individually confirmed Proverbs parenthesized headings are normalized',()=>{
 for(const ref of ['1:20','2:3','3:11','15:5','28:19','29:22']){const {entry:e}=fixture('Proverbs',ref,0);assert(e.hexaplaRows.some(r=>r.attribution.startsWith('(')),ref);assert(e.hexaplaRows.every(r=>!/^\)/.test(r.reading)),ref);}
 for(const ref of ['8:22','16:27']){const {entry:e}=fixture('Proverbs',ref,0);assert(e.hexaplaRows.some(r=>r.siglum==='Ἑβρ.'),ref);}
 const e=fixture('Exodus','1:14',2).entry;assert(!e.hexaplaRows.some(r=>r.siglum==='Ἑβρ.'));
});
