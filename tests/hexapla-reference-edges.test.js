'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function fixture(){const window={},box={window};vm.runInNewContext(fs.readFileSync(path.join(root,'library-textcrit-hexapla.js'),'utf8'),box);return{window,box,hx:window.LibraryHexaplaTC.create({esc:String,load:async()=>null})};}
function rows(text){const f=fixture();return f.hx.entries({book:'Hosea',vol:2,notes:{},verses:{'1:1':[{t:text,fn:[],pg:1,leaf:1}]}},[{ref:'Hosea 1:1',row:0}])[0];}
test('A conjunction between Theodotion and LXX belongs to their joint heading',()=>{
 const e=rows('Ο΄. οὐκ ἀπέστη ἀπ᾿ ἐμοῦ. Θ. καὶ Ο΄. οὐκ ἄπεστιν ἀπ᾿ ἐμοῦ.^4');
 assert.equal(e.hexaplaRows.length,2);const r=e.hexaplaRows[1];
 assert.equal(r.siglum,'Θ. καὶ Ο΄.');assert.equal(r.reading,'οὐκ ἄπεστιν ἀπ᾿ ἐμοῦ.^4');
 assert.equal(r.type,'wiedergabe');assert(e.html.includes('καὶ'));
});
test('Likewise with a genuinely matching example confirms rather than differing on the editorial formula',()=>{
 for(const [base,reading]of [['πρὸς τὴν γῆν.','ὁμοίως· πρός.'],['τὴν δικαιοσύνην σου (alia exempl. μου^43).','ὁμοίως (σου).^44'],['εἰς Ῥεμμὼθ Γαλαάδ.','εἰς Ῥεμμὼθ Γαλαὰδ, ὡς οἱ Ο΄.^3']]){
  const e=rows('Ο΄. '+base+' Ἀ. '+reading),r=e.hexaplaRows[1];
  assert.equal(r.type,'gleich',reading);assert.equal(r.lxxReference,true,reading);assert.equal(r.reading,reading);
 }
});
test('Pure similarly and conjunction-prefixed LXX formulas remain visible references',()=>{
 for(const reading of ['ὡσαύτως.','δὲ ὡς οἱ Ο΄.^6']){
  const e=rows('Ο΄. ἡ ἀρά. Ἀ. '+reading),r=e.hexaplaRows[1];
  assert.equal(r.type,'gleich');assert.equal(r.lxxReference,true);assert(e.html.includes('ὡ'));
 }
});
test('Actual words citing an alternate LXX are still compared and may genuinely differ',()=>{
 for(const reading of ['ὁμοίως (μου).^3','ὡς οἱ Ο΄, τὸ νεζέρ.^30','νέβελ, ὡς οἱ Ο΄.^4']){
  const e=rows('Ο΄. σου νεζέρ. Ἀ. '+reading),r=e.hexaplaRows[1];
  assert.equal(r.type,'wiedergabe',reading);assert.equal(r.lxxReference,false,reading);assert(e.html.includes('ὡ')||e.html.includes('ὁμοίως'));
 }
});
test('Isaiah’s truncated conjunction supply is not converted into a joint witness heading',()=>{
 const f=fixture();vm.runInNewContext(fs.readFileSync(path.join(root,'hexapla-data/Isaiah.js'),'utf8'),f.box);
 const es=f.hx.entries(f.window.HEXAPLA_DATA.Isaiah,[{ref:'Isaiah 58:5',row:0}]),e=es.find(e=>e.hexaplaSource.unit===3);
 assert.equal(e.hexaplaRows[1].siglum,'Σ. Θ.');assert.equal(e.hexaplaRows[1].reading,'καὶ');
 assert(!e.hexaplaRows[1].siglum.includes('Ο΄'));
});

test('Matching a cited alternate LXX must not disguise a difference from the actual base reading',()=>{
 const e=rows('Ο΄. τῷ μεμισθωμένῳ (alia exempl. τῷ μεμεθυσμένῳ^33 (הַשְּׁכִירָה); alia aliter^34). Ἀ. ὁμοίως τοῖς Ο΄ (μεμεθυσμένῳ).');
 assert.equal(e.hexaplaRows[1].type,'wiedergabe');assert.equal(e.hexaplaRows[1].lxxReference,false);
 assert(e.html.includes('μεμισθωμένῳ'));assert(e.html.includes('μεμεθυσμένῳ'));assert(e.html.includes('alia exempl.'));
});
test('Only Theodotion likewise is an attribution comment, not an unattested Greek variant',()=>{
 const e=rows('Ο΄. οἱ ἐγειρόμενοι τὸ πρωΐ. Θ. μόνος ὁμοίως.^19');assert.equal(e.hexaplaRows[1].type,'gleich');assert(e.html.includes('μόνος'));
});
test('Postposed attribution retains both place-name spellings and its Hebrew comparison',()=>{
 const e=rows('Ο΄. Δειμών. Διμὼν ὁμοίως οἱ Γ΄, καὶ τὸ Ἑβραϊκόν.^11');
 assert.equal(e.hexaplaRows.length,2);assert.equal(e.hexaplaRows[0].reading,'Δειμών.');
 assert.equal(e.hexaplaRows[1].siglum,'οἱ Γ΄');assert.equal(e.hexaplaRows[1].reading,'Διμὼν ὁμοίως^11');assert.equal(e.hexaplaRows[1].type,'wiedergabe');
 assert(e.html.includes('Ἑβραϊκόν'));assert(e.html.includes('Δειμών'));assert(e.html.includes('Διμὼν'));
});
test('The Hebrew and Theodotion are a joint heading, never a conjunction reading',()=>{
 const e=rows('Ο΄. ἄνθρακος. Ὁ Ἑβραῖος καὶ Θ. θαρσείς.^16');
 assert.equal(e.hexaplaRows.length,2);assert.equal(e.hexaplaRows[1].siglum,'Ὁ Ἑβραῖος καὶ Θ.');assert.equal(e.hexaplaRows[1].reading,'θαρσείς.^16');
});
test('Typographic Hebrew siglum is recognized in a critically marked joint witness group',()=>{
 const e=rows('Ο΄. ἀπαγάγετε ἐκεῖθεν. Aliter: Ο΄. ※ ‘Ο ‘Εβραῖος, Σ. Θ. Ε΄. ἀπαγάγετε ἐκεῖ ἕνα τῶν ἱερέων ↙.^43');
 assert(!e.hexaplaRows.some(r=>r.type==='wiedergabe'&&r.reading.includes('‘Εβραῖος')));
 const r=e.hexaplaRows.find(r=>r.siglum.includes('‘Ο ‘Εβραῖος'));assert(r);assert(r.siglum.includes('Σ. Θ. Ε΄.'));assert(r.reading.includes('ἕνα τῶν ἱερέων'));
});

function kingsUnit(ref,unit){
 const f=fixture();vm.runInNewContext(fs.readFileSync(path.join(root,'hexapla-data/II_Kings.js'),'utf8'),f.box);
 const data=f.window.HEXAPLA_DATA['II Kings'];return{f,data,source:data.verses[ref][unit].t,entry:f.hx.entries(data,[{ref:'II Kings '+ref,row:0}]).find(e=>e.hexaplaSource.unit===unit)};
}
test('II Kings 17:15 preserves the supplied Lord under the complete joint attribution',()=>{
 const {entry:e,source}=kingsUnit('17:15',1),r=e.hexaplaRows.find(r=>r.siglum.includes('Ἀ. Σ. Ε΄.'));
 assert(r);assert(r.siglum.includes('‘Ο ‘Εβραῖος'));assert.equal(r.reading,'· κύριος ↙.^28');
 assert(e.html.includes('κύριος'));assert(e.html.includes('28'));assert(source.includes('‘Ο ‘Εβραῖος'));
});
test('II Kings 18:31 keeps the bracketed eating reading with its Hebrew and translator witnesses',()=>{
 const {entry:e}=kingsUnit('18:31',1),r=e.hexaplaRows.find(r=>r.siglum.includes('Ἀ. Θ. Ε΄.'));
 assert(r);assert.equal(r.siglum,'‘Ο ‘Εβραῖος, Ἀ. Θ. Ε΄.');assert.equal(r.reading,'καὶ φάγεται^29');assert.equal(r.forWord,'πίεται');
 assert(!e.hexaplaRows.some(r=>r.reading===','));assert(e.html.includes('29'));assert(e.html.includes('30'));assert(e.html.includes('31'));
});
test('II Kings 21:7 keeps both the alternative hidden reading and the bracketed carved reading',()=>{
 const {entry:e}=kingsUnit('21:7',0),r=e.hexaplaRows.find(r=>r.siglum==='Aliter: Ο΄.'),he=e.hexaplaRows.find(r=>r.siglum==='‘Ο ‘Εβραῖος');
 assert.equal(r.reading,'καὶ ἔθηκε τὸ κρυπτὸν ÷ τοῦ');assert.equal(he.reading,'· τὸ γλυπτὸν^12');assert.equal(he.forWord,'κρυπτὸν');
 assert(e.html.includes('κρυπτὸν'));assert(e.html.includes('γλυπτὸν'));assert(e.html.includes('12'));
});
