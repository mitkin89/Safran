'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'mishnah-vocalized-catalog.js'),'utf8'),ctx);const catalog=ctx.window.MISHNAH_VOCALIZED_CATALOG;
module.exports=async({js,waitFor,book})=>{
 let n=0,total=0;
 for(const [title,item]of Object.entries(catalog).filter(([title])=>process.env.SAFRAN_SMOKE_MISHNAH_GAPS!=='1'||['Mishnah Keritot','Mishnah Demai'].includes(title))){
  await book(title);const rel=item.rel;
  await waitFor(`document.querySelector('#rOut .cell[data-mci-vocalized] .mci-base-word')`,'vocalized interlinear '+title);
  const result=await js(`(()=>{const v=window.MISHNAH_VOCALIZED[${JSON.stringify(title)}],d=${title==='Mishnah Berakhot'?'window.MISHNAH_TEXTCRIT':`window.MISHNAH_TEXTCRIT_BOOKS[${JSON.stringify(title)}]`},ch=Number(document.querySelector('#rSection').value)+1,cell=document.querySelector('#rOut .cell[data-mci-vocalized]');return {base:[...cell.parentElement.parentElement.querySelectorAll('.cell[data-mci-vocalized] .mci-base-word')].length,counts:Object.fromEntries(['D','P','C'].map(sig=>{const found=[...document.querySelectorAll('#rOut .cell[data-mci-vocalized] .mci-word')].filter(w=>w.dataset.tcMishnah.startsWith(sig+'|'));return [sig,{actual:found.length,unique:new Set(found.map(w=>w.dataset.tcMishnahWord)).size,expected:Object.entries(d.witnesses[sig==='D'?'K':sig].units).filter(([r])=>r.startsWith(ch+':')).reduce((n,[r,u])=>n+u.words.length,0)}]})),baseActual:document.querySelectorAll('#rOut .cell[data-mci-vocalized] .mci-base-word').length,baseExpected:Object.entries(v.base).filter(([r])=>r.startsWith(ch+':')).reduce((n,[r,u])=>n+u.words.length,0)};})()`);
  assert.equal(result.baseActual,result.baseExpected,title+' vocalized words');total+=result.baseActual;
  for(const [sig,c]of Object.entries(result.counts)){assert.equal(c.actual,c.expected,title+' '+sig);assert.equal(c.unique,c.expected);total+=c.actual;}
  n++;if(n%10===0)console.log('Electron vocalized interlinear: '+n+'/63 tractates');
 }
 await book('Mishnah Megillah');await waitFor("document.querySelector('#rOut .mci-base-word')",'Megillah loaded');
 await js("document.querySelector('#rSection').value='2';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .mci-note summary')",'Parma-Randkommentare unter dem Abschnitt');
 await js("document.querySelector('#rOut .mci-note summary').click()");
 assert(await js("(()=>{const note=document.querySelector('#rOut .mci-note[open]'),word=note?.querySelector('.mci-word');return !!word&&word.getBoundingClientRect().height>0&&word.dataset.tcMishnah.startsWith('P|')})()"),'Randkommentar vollständig aufklappbar');
 await book('Mishnah Keritot');await waitFor("document.querySelector('#rOut .mci-base-word')",'Keritot loaded');
 await js("document.querySelector('#rSection').value='3';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .mci-base-word[data-vocalized-word^=\"4:\"]')&&document.querySelector('#rOut .mci-word[data-tc-mishnah^=\"P|4:\"]')",'vocalized base available despite diplomatic Kaufmann gap');
 assert(await js("!document.querySelector('#rOut .mci-unbased-notice')"));
 await book('Mishnah Demai');await waitFor("document.querySelector('#rOut .mci-base-word')",'Demai loaded');
 assert(await js("!document.querySelector('#verList input[data-rel$=\"/C\"]')"));
 await book('Pirkei Avot');await waitFor("document.querySelector('#rOut .mci-base-word')",'Avot loaded');
 await js("document.querySelector('#rSection').value='5';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .mci-base-word[data-vocalized-word^=\"6:\"]')",'Avot six reading preserved');
 assert(await js("!document.querySelector('#rOut .mci-word')&&document.querySelector('#rOut .mci-coverage-notice')"));
 console.log(`Electron: ${n} vocalized tractates opened; ${total} first-chapter words conserved; Keritot 4, Demai and Avot 6 verified.`);
};
