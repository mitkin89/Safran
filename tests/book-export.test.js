'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {buildHtml,selectSections}=require('../library-export'),R=require('../reader');
const fs=require('fs'),path=require('path');
const helpers={t:(s,...args)=>s.replace(/\{#?\}/g,()=>args.shift()),tr:s=>s,loc:'de-DE',labels:{he:'Hebr.',de:'Deutsch'},shortVer:s=>s,stripHe:s=>s,noteId:(_g,k,v)=>k+':'+v};
function fixture(){
 const loaded=[{entry:{kind:'he',language:'Hebrew'},versionTitle:'Hebräische Fassung',text:[['א','ב'],['ג']]},{entry:{kind:'de',language:'German'},versionTitle:'Deutsche Fassung',text:[['A'],['B','C']]}];
 return {group:{title:'Testbuch'},loaded,sections:[{path:[0],k:'[0]',label:'Kapitel 1'},{path:[1],k:'[1]',label:'Kapitel 2'}],idx:0};
}
const count=(s,re)=>[...s.matchAll(re)].length;
test('Export übernimmt Grundschrift und getrennte Spaltengrößen in Druckpunkten',()=>{
 const html=buildHtml(fixture(),{scope:'book'},{...helpers,typography:{basePx:20,columnsPx:[30,16]}});
 assert(html.includes('serif;font-size:15pt;'));
 assert(html.includes('class="k-he" style="font-size:22.5pt"'));
 assert(html.includes('class="k-de" style="font-size:12pt"'));
 const fallback=buildHtml(fixture(),{scope:'book'},{...helpers,typography:{basePx:NaN,columnsPx:[Infinity,-1]}});
 assert(!/font-size:(NaN|Infinity|-)/.test(fallback));
});
test('Buch und Bereich richten sämtliche Verse aus und behalten Lücken als leere Zellen',()=>{
 const view=fixture(),html=buildHtml(view,{scope:'book',from:'2',to:'2'},helpers);
 assert.equal(count(html,/class="chapter"/g),2);assert.equal(count(html,/class="verse"/g),4);assert(html.includes('<td></td>'));
 assert(html.includes('dir="rtl" class="k-he"'));assert(html.includes('dir="ltr" class="k-de"'));
 const one=buildHtml(view,{scope:'range',sectionFrom:'1',sectionTo:'1'},helpers);
 assert(!one.includes('<h2>Kapitel 1</h2>'));assert(one.includes('<h2>Kapitel 2</h2>'));assert.equal(count(one,/class="verse"/g),2);
 const current=buildHtml(view,{scope:'current',from:'2',to:'2'},helpers);assert.equal(count(current,/class="verse"/g),1);
 for(const range of [['1','0'],['0','2'],['-1','0'],['','1'],['0.5','1']])assert.throws(()=>selectSections(view,{scope:'range',sectionFrom:range[0],sectionTo:range[1]}));
});
test('Fußnoten, eigene Notizen und Verknüpfungen werden dem richtigen Kapitel zugeordnet',()=>{
 const view=fixture();view.loaded[1].text=[['A<sup class="footnote-marker">1</sup><i class="footnote">Erste Fußnote</i>'],['B<sup class="footnote-marker">1</sup><i class="footnote">Zweite Fußnote</i>']];
 const html=buildHtml(view,{scope:'book',fn:true,notes:true,links:true},{...helpers,notes:[{id:'[1]:1',note:'Kapitelzwei <Notiz>'}],links:new Map([['[1]',[{v1:1,v2:1,other:'Exodus 2:1'}]]])});
 assert(html.includes('<sup>1</sup>')&&html.includes('<sup>2</sup>'));assert(html.includes('<li>Erste Fußnote</li><li>Zweite Fußnote</li>'));
 const split=html.indexOf('<h2>Kapitel 2</h2>');assert(!html.slice(0,split).includes('Kapitelzwei'));assert(html.slice(split).includes('Kapitelzwei &lt;Notiz&gt;'));assert(html.slice(split).includes('Exodus 2:1'));
});
test('Vollständiges Genesis enthält alle 50 Kapitel und 1533 zweisprachige Verszeilen',()=>{
 const load=(lang,pattern)=>JSON.parse(fs.readFileSync(path.join(__dirname,'../bundled/own/Genesis',lang,fs.readdirSync(path.join(__dirname,'../bundled/own/Genesis',lang)).find(n=>pattern.test(n))),'utf8'));
 const he=load('he',/^Westminster/),de=load('de',/Zunz/);he.entry={kind:'he',language:'Hebrew'};de.entry={kind:'de',language:de.language};
 const sections=R.sectionsOf(he.text,he.sectionNames).map(s=>({...s,k:JSON.stringify(s.path)}));
 const html=buildHtml({group:{title:'Genesis'},loaded:[he,de],sections,idx:0},{scope:'book'},helpers);
 assert.equal(count(html,/class="chapter"/g),50);assert.equal(count(html,/class="verse"/g),1533);assert.equal(count(html,/class="k-he"/g),1533);assert.equal(count(html,/class="k-de"/g),1533);
 assert(html.includes('<h2>Kapitel 50</h2>'));
});
