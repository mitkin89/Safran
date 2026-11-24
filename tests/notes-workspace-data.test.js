'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),D=require('../notes-workspace-data');
test('Hebrew search ignores pointing and keeps work/chapter filters on the same reference',()=>{
 const n={id:'n',projectId:'p',title:'Gedanke',note:'בְּרֵאשִׁית',tags:['Test'],refs:[{sectionPath:[0],citation:{work:'Genesis',edition:'Ausgabe A'}},{sectionPath:[1],citation:{work:'Exodus'}}]};
 assert.equal(D.filter([n],{query:'בראשית Ausgabe',project:'p',work:'Genesis',chapter:'1',tag:'Test'}).length,1);
 assert.equal(D.filter([n],{work:'Genesis',chapter:'2'}).length,0);
 assert.equal(D.filter([n],{project:'none'}).length,0);
});
test('same ids in independent stores remain distinct and legacy references keep their anchor',()=>{
 const all=D.records([{id:'n',title:'Genesis',key:'Tanakh¦Genesis',sk:'[2]',row:'4',note:'Notiz'},{id:'h',kind:'hl'}],{notes:[{id:'n',title:'Recherche',refs:[]}]});
 assert.equal(all.length,2);assert.notEqual(D.owner(all[0]),D.owner(all[1]));assert.deepEqual(D.locations(all[0]),[{work:'Genesis',chapter:'3'}]);assert.deepEqual(all[0].refs[0].labels,['4']);assert.equal(D.kind(all[1]),'free');
});
test('bookmark titles show the locator once while custom titles and source snapshots remain intact',()=>{
 const n={title:'Genesis',key:'Tanakh/Torah¦Genesis',sk:'[0]',secLabel:'Kapitel 1',row:'2',note:'',excerpt:'Die Erde war …'};
 assert.equal(D.title(n),'Genesis 1,2');assert.equal(D.title({...n,noteTitle:'Mein Titel'}),'Mein Titel');assert.equal(D.excerpt(n),'Die Erde war …');assert.equal(n.title,'Genesis');
 assert.equal(D.referenceLabel({label:'Berakhot · Blatt 2a · 4'}),'Berakhot 2a:4');
});
