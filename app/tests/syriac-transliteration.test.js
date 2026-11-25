'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {create}=require('../syriac-transliteration');
const context={window:{}},bytes=fs.readFileSync(require.resolve('../syriac-transliteration-data.js'));vm.runInNewContext(bytes.toString(),context);const data=JSON.parse(JSON.stringify(context.window.SYRIAC_TRANSLITERATION_DATA)),T=create(data);
test('Official SEDRA transliteration tables stay pinned and input preserves scheme distinctions',()=>{
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),require('../tools/sedra/report.json').transliterationSha256);
 assert.equal(data.patterns.length,335);assert.equal(data.schemes.length,5);
 assert.deepEqual(T.convert('ktb','sedra4').queries,['ܟܬܒ']);assert.deepEqual(T.convert('))r','sedra4').queries,['ܐܐܪ']);
 assert.deepEqual(T.convert('ḥṭṣš','sedra4').queries,['ܚܛܨܫ']);assert.deepEqual(T.convert('xTc$','calcode').queries,['ܚܛܨܫ']);assert.deepEqual(T.convert('HTS$','leiden').queries,['ܚܛܨܫ']);
 assert.deepEqual(T.convert('tT','calcode').queries,['ܬܛ']);assert.equal(T.convert('T','sedra4').error,'character');
 const variants=T.convert('s','calcode').queries;assert(variants.includes('ܣ')&&variants.includes('ܤ'));
});
test('Transliteration never drops unsupported letters, invents vowels, or consumes dictionary wildcards',()=>{
 assert.equal(T.convert('ktv','sedra4').error,'character');assert.equal(T.convert('ktv','sedra4').character,'v');
 assert.equal(T.convert('sh','hugoye').error,'scheme');assert.equal(T.convert('sssssss','calcode').error,'ambiguous');
 assert.deepEqual(T.convert('ktb*','sedra4').queries,['ܟܬܒ*']);assert.deepEqual(T.convert('"ktb ktb"','sedra4').queries,['"ܟܬܒ ܟܬܒ"']);
 assert(!/[\u0730-\u074a]/u.test(T.convert('ktb','sedra4').queries[0]));
});
