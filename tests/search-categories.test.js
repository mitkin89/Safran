'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../search-categories'),{Library}=require('../offline');
const entries=[
 {title:'Genesis',kind:'he',categories:['Tanakh','Torah']},
 {title:'Onkelos Genesis',kind:'other',categories:['Tanakh','Targum','Onkelos']},
 ...['Rishonim on Tanakh','Acharonim on Tanakh','Modern Commentary on Tanakh','Commentary'].map((c,i)=>({title:'Comment '+i,kind:'he',categories:['Tanakh',c,'Torah']})),
 {title:'Rashi Berakhot',kind:'he',categories:['Talmud','Bavli','Commentary']},
];
const find=opts=>Library.prototype.entriesFor.call({list:()=>entries},{kinds:['he','other'],...opts}).map(x=>x.title);
test('Search separates all four Tanakh commentary branches while retaining Targum under Tanakh',()=>{
 assert.deepEqual(find({categories:['Tanakh']}),['Genesis','Onkelos Genesis']);
 assert.deepEqual(find({categories:[C.ROOT]}),['Comment 0','Comment 1','Comment 2','Comment 3']);
 assert.deepEqual(find({categories:['Talmud']}),['Rashi Berakhot']);
 assert.equal(C.path(entries[2].categories)[0],C.ROOT);assert.equal(entries[2].categories[0],'Tanakh','source catalog is unchanged');
});
test('Subcategory compatibility, all-category selection and explicit title overrides still work',()=>{
 assert.deepEqual(find({categories:['Tanakh/Rishonim on Tanakh']}),['Comment 0']);
 assert.deepEqual(find({categories:[C.ROOT+'/Commentary']}),['Comment 3']);
 assert.equal(find({categories:[]}).length,entries.length);
 assert.equal(find({categories:['Tanakh',C.ROOT,'Talmud']}).length,entries.length);
 assert(find({categories:['Tanakh'],titles:['Comment 0']}).includes('Comment 0'));
});
