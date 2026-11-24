'use strict';
// Lesartenzeile: grouping of witnesses by reading at one MT locus.
const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../textcrit-summary.js');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const mt=['וַיְכַל','אֱלֹהִים','בַּיּוֹם','הַשְּׁבִיעִי','מְלַאכְתּוֹ'];
const at=(s,e=s,kind='word')=>({kind,start:s,end:e,ref:'Genesis 2:2'});
const text=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
test('same reading from different witnesses forms one group; partial ranges are trimmed to the differing word',()=>{
  const recs=[
    {anchor:at(3),lz:{f:'SMR',w:'SMR',op:'var',rd:'הששי'}},
    {anchor:at(2,3),lz:{f:'Syr',w:'Syr',op:'var',rd:'ביום הששי',ret:true}},
    {anchor:at(3),lz:{f:'LXX',w:'LXX',op:'note'}},
  ];
  const b=S.build(recs,mt);
  assert.equal(b.length,1);assert.deepEqual([b[0].start,b[0].end],[3,3]);
  assert.equal(b[0].parts[0].op,'var');assert.deepEqual(b[0].parts[0].ws.map(w=>w.w),['SMR','Syr']);
  assert.equal(b[0].parts[1].op,'note');
  const h=S.render(recs,mt,at(3),esc);assert.match(text(h),/^הששי SMR Syr \| ≠ Ο΄$/);assert.match(h,/tc-lz-ret/);
});
test('identical wording is dropped, ו/י-only differences become spelling, witness order is fixed',()=>{
  const recs=[
    {anchor:at(3),lz:{f:'Ken',w:'Ken',op:'var',rd:'השביעי',n:3}},
    {anchor:at(3),lz:{f:'Ken',w:'Ken',op:'var',rd:'השבעי',n:2}},
    {anchor:at(4),lz:{f:'Syr',w:'Syr',op:'om'}},
    {anchor:at(4),lz:{f:'DSS',w:'4QGenk',op:'om'}},
  ];
  const b=S.build(recs,mt);
  assert.equal(b.length,2);assert.equal(b[0].parts[0].op,'orth');
  assert.deepEqual(b[1].parts[0].ws.map(w=>w.w),['4QGenk','Syr']);
  assert.match(S.render(recs,mt,at(3,4),esc),/Ken<sup>2<\/sup>/);
});
test('pluses are placed after their MT word; records without lz or anchor are ignored',()=>{
  const recs=[{anchor:at(1,1,'gap'),lz:{f:'LXX',w:'LXX',op:'add'}},{anchor:at(1,1,'gap'),lz:{f:'Syr',w:'Syr',op:'add'}},{anchor:null,lz:{f:'SMR',w:'SMR',op:'var',rd:'x'}},{anchor:at(0)}];
  const h=text(S.render(recs,mt,at(1,1,'gap'),esc));assert.equal(h,'+ Ο΄ Syr');
  assert.equal(S.render([],mt,at(0),esc),'');
});
