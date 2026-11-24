'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),{BrowserWindow}=require('electron');
const E=require('../../research-export'),Flow=require('../../research-flow');
module.exports=async function(){
 const w=new BrowserWindow({show:false,width:1250,height:950,webPreferences:{sandbox:true}}),errors=[];
 w.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 const evaluate=code=>w.webContents.executeJavaScript(code,true),pause=ms=>new Promise(r=>setTimeout(r,ms));
 const note=(id,region,text)=>({id,type:'explanation',region,text});
 const main='בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃ '.repeat(4),left='LINKS: Dieser Kommentar soll nach dem Ende des Haupttextes den freien Platz nutzen. '.repeat(95),right='RECHTS: Ein zweiter Kommentar behält seine eigene Reihenfolge und nutzt die freie Mitte. '.repeat(95);
 const sheet={title:'Textfluss',layout:{template:'classic',orientation:'landscape',mainSize:18,sideSize:11},blocks:[note('l','left',left),note('m','main',main),note('r','right',right),note('b','bottom','FUSSENDE')]};
 async function load(s,interactive=true){await w.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(E.html(s,[],{interactive})));await evaluate('document.fonts.ready');await pause(80);}
 const geometry=`(()=>{
  const t=document.querySelector('.classic-upper'),m=t.querySelector('.main'),mr=m.getBoundingClientRect(),out={flow:t.classList.contains('flowing'),main:{top:mr.top,bottom:mr.bottom,left:mr.left,right:mr.right},texts:[...t.querySelectorAll('.region')].map(c=>c.textContent),sides:[]};
  for(const side of t.querySelectorAll('.left,.right')){const node=side.querySelector('p').firstChild,r=document.createRange();r.selectNodeContents(node);const rects=[...r.getClientRects()],before=rects.filter(x=>x.top<mr.bottom-12),after=rects.filter(x=>x.top>mr.bottom+20);out.sides.push({side:side.classList.contains('left')?'left':'right',before:before.map(x=>({width:x.width,left:x.left,right:x.right})),after:after.map(x=>({width:x.width,left:x.left,right:x.right})),bottom:side.getBoundingClientRect().bottom});}
  out.bottom=document.querySelector('.bottom-wrap').getBoundingClientRect().top;return out;
 })()`;
 function verify(g,count=2){assert(g.flow);assert.equal(g.sides.length,count);for(const s of g.sides){assert(s.before.length>1&&s.after.length>1,'both narrow and expanded lines are present');const top=Math.max(...s.before.map(x=>x.width)),bottom=Math.max(...s.after.map(x=>x.width));assert(bottom>top*1.45,'text widens below the centre');for(const r of s.before)if(s.side==='left')assert(r.right<=g.main.left+1,'left text never overlaps main text');else assert(r.left>=g.main.right-1,'right text never overlaps main text');assert(g.bottom>=s.bottom-1,'bottom region follows side text');}}
 try{
  await load(sheet);const g=await evaluate(geometry);verify(g);assert.equal(g.texts.join(''),left+main+right,'no duplicated, lost or reordered source text');
  await fs.writeFile('/tmp/safran-research-flow-layout.png',(await w.webContents.capturePage()).toPNG());
  // Font changes recalculate the exclusion height, not an estimated line count.
  const old=await evaluate("document.querySelector('.classic-upper').style.getPropertyValue('--flow-main-height')");await evaluate("document.querySelector('.region.main').style.fontSize='25pt'");await pause(100);assert.notEqual(await evaluate("document.querySelector('.classic-upper').style.getPropertyValue('--flow-main-height')"),old);verify(await evaluate(geometry));
  for(const side of ['left','right']){await load({...sheet,blocks:sheet.blocks.filter(b=>b.region!==side)});verify(await evaluate(geometry),1);}
  // Sandboxed preview does not run embedded scripts; trusted host supplies the same layout.
  await load(sheet,false);assert.equal(await evaluate("document.querySelector('.classic-upper').classList.contains('flowing')"),false);await evaluate(Flow.scriptSource);verify(await evaluate(geometry));
  await load({...sheet,blocks:sheet.blocks.filter(b=>b.region==='main')});assert.equal(await evaluate("document.querySelector('.classic-upper').classList.contains('flowing')"),false);
  await load({...sheet,blocks:sheet.blocks.filter(b=>b.region!=='main')});assert.equal(await evaluate("document.querySelector('.classic-upper').classList.contains('flowing')"),false);
  await load({...sheet,blocks:[...sheet.blocks.filter(b=>b.region!=='main'),note('long','main',main.repeat(14))]});assert.equal(await evaluate('('+Flow.apply.toString()+')(document,true)'),false,'overlong main text retains pageable print layout');
  assert.deepEqual(errors,[]);console.log('Electron: classic comments widen into the free centre on both sides, with no overlap or text loss; resizing and print fallback passed.');
 }finally{w.destroy();}
};
