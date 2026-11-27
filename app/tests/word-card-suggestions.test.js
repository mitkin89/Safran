const {test}=require('node:test'),assert=require('node:assert/strict'),{group}=require('../word-card-suggestions'),{hebrew}=require('../syriac-morph');
test('Aramaic search groups corresponding spelling and meaning without merging source IDs',()=>{
 const items=[{key:'tg:1',kind:'targum',label:'אמר',gloss:'to say, command, speak',language:'Aramäisch',count:10},{key:'ps:>MR',kind:'peshitta',label:'ܐܡܪ',gloss:'to say',language:'Aramäisch',count:5},{key:'ps:>MR/',kind:'peshitta',label:'ܐܡܪ',gloss:'lamb',language:'Aramäisch',count:2},{key:'559',label:'אמר',gloss:'utter',language:'Hebräisch',count:30}];
 const result=group(items,hebrew);assert.equal(result.length,2);assert.equal(result[0].count,17);assert.deepEqual(result[0].members.map(m=>m.key),['tg:1','ps:>MR','ps:>MR/']);assert.equal(result[1].key,'559');
});
test('One Aramaic root retains noun and verb lexemes across witnesses',()=>{
 const items=[{key:'tg:shame',label:'חסד',gloss:'shame',language:'Aramäisch',count:2},{key:'ps:shame',label:'ܚܣܕ',gloss:'shameful thing, shame, reproach',language:'Aramäisch',count:30},{key:'ps:revile',label:'ܚܣܕ',gloss:'to revile, to scorn, PA same',language:'Aramäisch',count:7}];
 for(const list of [items,[...items].reverse()]){const result=group(list,hebrew),combined=result.find(x=>x.members?.length===3);assert.equal(result.length,1);assert.equal(combined.count,39);assert.deepEqual(new Set(combined.members.map(m=>m.key)),new Set(['tg:shame','ps:shame','ps:revile']));}
});
