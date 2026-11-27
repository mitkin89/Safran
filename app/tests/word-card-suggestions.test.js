const {test}=require('node:test'),assert=require('node:assert/strict'),{group}=require('../word-card-suggestions'),{hebrew}=require('../syriac-morph');
test('Aramaic search groups corresponding spelling and meaning without merging source IDs',()=>{
 const items=[{key:'tg:1',kind:'targum',label:'אמר',gloss:'to say, command, speak',language:'Aramäisch',count:10},{key:'ps:>MR',kind:'peshitta',label:'ܐܡܪ',gloss:'to say',language:'Aramäisch',count:5},{key:'ps:>MR/',kind:'peshitta',label:'ܐܡܪ',gloss:'lamb',language:'Aramäisch',count:2},{key:'559',label:'אמר',gloss:'utter',language:'Hebräisch',count:30}];
 const result=group(items,hebrew);assert.equal(result.length,3);assert.equal(result[0].count,15);assert.deepEqual(result[0].members.map(m=>m.key),['tg:1','ps:>MR']);assert.equal(result[1].key,'ps:>MR/');assert.equal(result[2].key,'559');
});
