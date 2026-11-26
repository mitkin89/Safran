'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'mishnah-textcrit-catalog.js'),'utf8'),ctx);const catalog=ctx.window.MISHNAH_TEXTCRIT_CATALOG;
module.exports=async({js,waitFor,book})=>{
 let n=0,total=0;
 for(const [title,item]of Object.entries(catalog).filter(([title])=>process.env.SAFRAN_SMOKE_MISHNAH_GAPS!=='1'||['Mishnah Keritot','Mishnah Demai'].includes(title))){
  await book(title);const rel='digital-mishnah/'+item.slug+'/K';
  await waitFor(`[...document.querySelectorAll('#verList input')].some(e=>e.dataset.rel===${JSON.stringify(rel)})`,'digital source '+title);
  await js(`{const all=[...document.querySelectorAll('#verList input')];const k=all.find(e=>e.dataset.rel===${JSON.stringify(rel)});if(!k.checked)k.click();}`);
  await waitFor(`document.querySelector('#rOut .cell[data-rel="${rel}"] .mci-word')`,'main interlinear '+title);
  const result=await js(`(()=>{const d=${title==='Mishnah Berakhot'?'window.MISHNAH_TEXTCRIT':`window.MISHNAH_TEXTCRIT_BOOKS[${JSON.stringify(title)}]`},ch=Number(document.querySelector('#rSection').value)+1;return {title:document.querySelector('#rTitle').textContent,versions:[...document.querySelectorAll('#verList input[data-rel^="digital-mishnah/"]')].length,counts:Object.fromEntries(['K','P','C'].map(sig=>{const found=[...document.querySelectorAll('#rOut .cell[data-rel="${rel}"] .mci-word')].filter(w=>w.dataset.tcMishnah.startsWith(sig+'|'));return [sig,{actual:found.length,unique:new Set(found.map(w=>w.dataset.tcMishnahWord)).size,expected:Object.entries(d.witnesses[sig].units).filter(([r])=>r.startsWith(ch+':')).reduce((n,[r,u])=>n+u.words.length,0)}]}))};})()`);
  assert(result.title.includes(title));assert.equal(result.versions,Object.values(item.witnesses).filter(n=>n>0).length);
  for(const [sig,c]of Object.entries(result.counts)){assert.equal(c.actual,c.expected,title+' '+sig);assert.equal(c.unique,c.expected);total+=c.actual;}
  n++;if(n%10===0)console.log('Electron manuscripts: '+n+'/63 tractates');
 }
 await book('Mishnah Keritot');await waitFor("document.querySelector('#rOut .mci-word')",'Keritot loaded');
 await js("document.querySelector('#rSection').value='3';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut').textContent.includes('Kein Kaufmann-Referenztext')&&document.querySelector('#rOut .mci-word[data-tc-mishnah^=\"P|4:\"]')",'source-only chapter visible');
 assert(await js("!document.querySelector('#rOut .mci-word[data-tc-mishnah^=\"K|4:\"]')"),'no fabricated Kaufmann words');
 await book('Mishnah Demai');await waitFor("document.querySelector('#rOut .mci-word')",'Demai loaded');
 assert(await js("!document.querySelector('#verList input[data-rel$=\"/C\"]')"),'unavailable witness not offered as a manuscript version');
 await js("if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click()");
 await waitFor("document.querySelector('#tcBody .mci-word')",'apparatus beyond Berakhot');
 assert(await js("document.querySelector('#tcBody').textContent.includes('Mishnah Demai')&&!document.querySelector('#tcBody').textContent.includes('Mishnah Berakhot')"),'apparatus uses current tractate');
 console.log(`Electron: all ${n} manuscript tractates opened; ${total} first-chapter source tokens conserved; missing witness and missing-base chapter verified.`);
};
