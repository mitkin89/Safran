'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../taamim');
test('MT display boundaries distinguish separating accents, servants and meteg',()=>{
 assert.deepEqual(T.boundaries(['בְּרֵאשִׁ֖ית','בָּרָ֣א','אֱלֹהִ֑ים','אֵ֥ת','הַשָּׁמַ֖יִם','וְאֵ֥ת','הָאָֽרֶץ'],'Genesis'),['Trennender Taam','','Atnach','','Trennender Taam','','']);
 assert.equal(T.boundaries(['לֹ֣א ׀','אָמַ֨ר','בְּ֘קוֹל'],'Genesis')[0],'Legarmeh');
 assert.deepEqual(T.boundaries(['וַיֵּצֵ֖א־','נֹ֑חַ'],'Genesis'),['','Atnach']);
 assert.deepEqual(T.boundaries(['כִּ֖י','בָּ֑א'],'Genesis','major'),['','Atnach']);
});
test('Poetic accents and prose sections in Job use their own system',()=>{
 assert.deepEqual(T.boundaries(['דָּ֖בָר','דָּ֭בָר','דָּ֫בָר','דָּ֥בָר','דָּ֓בָר','דָּ֓בָר ׀'],'Psalms'),['','Trennender Taam','','Ole we-Jored','','Legarmeh']);
 assert.deepEqual(T.boundaries(['דָּ֫בָר','דָּ֥בָר','דָּ֭בָר'],'Psalms','major'),['','Ole we-Jored','']);
 assert.equal(T.boundaries(['דָּ֖בָר'],'Job','all',1,1)[0],'Trennender Taam');
 assert.equal(T.boundaries(['דָּ֖בָר'],'Job','all',3,3)[0],'');
 assert.equal(T.boundaries(['דָּ֖בָר'],'Job','all',42,7)[0],'Trennender Taam');
});
