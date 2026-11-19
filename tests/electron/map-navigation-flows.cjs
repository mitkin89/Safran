'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor})=>{
 await js(`(()=>{
  const cv=document.querySelector('#mapCv'),P=CanvasRenderingContext2D.prototype;
  window.__mapPerf={draws:0,pathDraws:0,vertices:0,heartbeat:0,maxDelay:0};
  const fill=P.fillRect,stroke=P.stroke,line=Path2D.prototype.lineTo;
  P.fillRect=function(...a){if(this.canvas===cv)window.__mapPerf.draws++;return fill.apply(this,a)};
  P.stroke=function(...a){if(this.canvas===cv&&a[0] instanceof Path2D)window.__mapPerf.pathDraws++;return stroke.apply(this,a)};
  Path2D.prototype.lineTo=function(...a){window.__mapPerf.vertices++;return line.apply(this,a)};
  let last=performance.now();window.__mapTimer=setInterval(()=>{const now=performance.now();window.__mapPerf.heartbeat++;window.__mapPerf.maxDelay=Math.max(window.__mapPerf.maxDelay,now-last);last=now;},10);
  window.__mapPerfRestore=()=>{P.fillRect=fill;P.stroke=stroke;Path2D.prototype.lineTo=line;clearInterval(window.__mapTimer)};
 })()`);
 try{
  await js("if(document.querySelector('#mapPanel').hidden)document.querySelector('#mapBtn').click()");
  await waitFor("window.__MP?.ok",'Kartenrelief');
  await js("window.__mapOpenFor('Nehemiah','3','Nehemiah 3')");
  await waitFor("window.__MP.cur.length>5",'Jerusalem mit Ortsmarkern');
  await js("document.querySelector('#mapJerB').click()");
  await waitFor("window.__mapPerf.pathDraws>0",'Jerusalem mit geladenen Vektorebenen');
  await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
  // Turn the historical overlay off as well: buildings and small streets must use the cached paths.
  await js("{const c=document.querySelector('#jerWil');c.checked=false;c.dispatchEvent(new Event('change'));}");
  await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
  const zoom=await js(`(()=>{
   const cv=document.querySelector('#mapCv'),b=cv.getBoundingClientRect(),P=window.__MP,perf=window.__mapPerf;
   const before=perf.draws,s=P.s,x=(b.left+b.right)/2,y=(b.top+b.bottom)/2;
   for(let i=0;i<40;i++)cv.dispatchEvent(new WheelEvent('wheel',{cancelable:true,deltaY:-0.25,ctrlKey:true,clientX:x,clientY:y}));
   return {before,s,afterScale:P.s,drawsImmediately:perf.draws-before,expected:s*Math.exp(40*0.25*0.012)};
  })()`);
  assert.equal(zoom.drawsImmediately,0,'Wheel burst must not draw synchronously');
  assert(Math.abs(zoom.afterScale-zoom.expected)<1e-6,'All wheel deltas must accumulate');
  await js("new Promise(r=>requestAnimationFrame(r))");
  assert.equal(await js('window.__mapPerf.draws'),zoom.before+1,'One frame paints the entire burst');
  const pan=await js(`(()=>{
   const cv=document.querySelector('#mapCv'),b=cv.getBoundingClientRect(),P=window.__MP,perf=window.__mapPerf,before=perf.draws,tx=P.tx,ty=P.ty;
   for(let i=0;i<30;i++)cv.dispatchEvent(new WheelEvent('wheel',{cancelable:true,deltaX:0.5,deltaY:0.25,clientX:b.left+50,clientY:b.top+50}));
   return {before,dx:P.tx-tx,dy:P.ty-ty,drawsImmediately:perf.draws-before,d:devicePixelRatio};
  })()`);
  assert.equal(pan.drawsImmediately,0);assert(Math.abs(pan.dx+15*pan.d)<1e-6);assert(Math.abs(pan.dy+7.5*pan.d)<1e-6);
  await js("new Promise(r=>requestAnimationFrame(r))");assert.equal(await js('window.__mapPerf.draws'),pan.before+1);
  // A new viewport reprojects native paths without rebuilding their vertices.
  const cached=await js(`(()=>{const cv=document.querySelector('#mapCv'),b=cv.getBoundingClientRect(),p=window.__mapPerf,before=p.vertices;cv.dispatchEvent(new WheelEvent('wheel',{cancelable:true,deltaX:0.1,deltaY:0.1,clientX:b.left+50,clientY:b.top+50}));return before;})()`);
  await js("new Promise(r=>requestAnimationFrame(r))");
  const warmed=await js(`(()=>{const cv=document.querySelector('#mapCv'),b=cv.getBoundingClientRect(),before=window.__mapPerf.vertices;cv.dispatchEvent(new WheelEvent('wheel',{cancelable:true,deltaX:-0.1,deltaY:-0.1,clientX:b.left+50,clientY:b.top+50}));return before;})()`);
  await js("new Promise(r=>requestAnimationFrame(r))");
  assert(warmed>=cached);assert.equal(await js('window.__mapPerf.vertices'),warmed,'Returning to a warm viewport reuses source geometry');
  await win.webContents.capturePage().then(i=>fs.writeFileSync('/tmp/safran-map-navigation.png',i.toPNG()));
  console.log('Electron: Kartenzoom und Verschieben bündeln alle Eingaben pro Frame; Jerusalem-Geometrie wird wiederverwendet.',await js('JSON.stringify(window.__mapPerf)'));
 }finally{
  await js("window.__mapPerfRestore?.();document.querySelector('#mapClose').click()");
 }
};
