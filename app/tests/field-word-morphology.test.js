'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {group}=require('../../scripts/field-word-morphology.cjs');
const forms={'καί':[['καί','C','and']],'δέ':[['δέ','X','then']],'ὤρθρισε':[['ὀρθρίζω','V aor ind act 3rd sg','']], 'ὀρθρίσαντες':[['ὀρθρίζω','V aor ptc act masc nom/voc pl','']], 'ὁ':[['ὁ','T masc nom sg','']], 'λόγος':[['λόγος','N masc nom sg','']], 'καλός':[['καλός','A masc nom sg','']]};
const select=(text,he)=>group(text.split(' '),forms,he,x=>x);
test('Greek conjugated verb and participle map to the Hebrew head; conjunction follows its own morpheme',()=>{
 for(const text of ['καί ὤρθρισε','ὀρθρίσαντες δέ'])assert.equal(select(text,'HC/Vhw3mp').label,'ὀρθρίζω');
 assert.equal(select('καί ὤρθρισε','HC/Vhw3mp').surface,'ὤρθρισε');
 assert.equal(select('καί','HC').label,'καί');
 assert.equal(select('καί ὤρθρισε','HVhw3mp').type,'phrase');
});
test('article is separated only with Hebrew article; lexical modifiers and ambiguous heads remain',()=>{
 assert.equal(select('ὁ λόγος','HTd/Ncmsa').label,'λόγος');
 assert.equal(select('ὁ λόγος','HNcmsa').type,'phrase');
 assert.equal(select('καλός λόγος','HNcmsa').type,'phrase');
 assert.equal(select('ὤρθρισε ὀρθρίσαντες','HVhw3mp').type,'phrase');
});
