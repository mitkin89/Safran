'use strict';
// Real Chromium PDF regression; run with electron --no-sandbox --ozone-platform=headless.
const {app,BrowserWindow}=require('electron'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.join(__dirname,'../..'),S=require(path.join(root,'research-store')),T=require(path.join(root,'research-translations')),E=require(path.join(root,'research-export'));
const output=process.env.SAFRAN_PDF_TEST_DIR||'/tmp/safran-verse-export';
app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
 await fs.mkdir(output,{recursive:true});const entries=require(path.join(root,'bundled/manifest.json')).items;
 const read=async e=>({entry:e,doc:JSON.parse(await fs.readFile(path.join(root,'bundled',e.rel),'utf8'))});
 const he=await read(entries.find(e=>e.title==='Deuteronomy'&&e.kind==='he'&&/^Westminster/.test(e.versionTitle)));
 const de=await read(entries.find(e=>e.title==='Deuteronomy'&&e.kind==='de'&&/Zunz/.test(e.versionTitle)));
 const main=S.capture(he.doc,he.entry,{sectionPath:[0],labels:'1-10'});main.presentation=await T.prepare({source:main,rel:de.entry.rel,mode:'parallel'},async rel=>rel===de.entry.rel?de:he);
 const comments=[];
 for(const [work,region]of [['David Zvi Hoffmann on Deuteronomy','left'],['Philippson on Deuteronomy','right']]){
  const a=await read(entries.find(e=>e.title===work&&e.kind==='de'));
  for(let i=0;i<10;i++)if(a.doc.text[0][i]?.trim()){const b=S.capture(a.doc,a.entry,{sectionPath:[0],labels:[String(i+1)]});b.region=region;comments.push(b);}
 }
 const sheet={title:'Deuteronomium 1 – versweise Kommentare',layout:{template:'classic',orientation:'landscape',mainSize:18,sideSize:10},blocks:[main,...comments]};
 for(const variant of ['normal','stress','compact']){
  const stress=variant==='stress';
  const fixture=structuredClone(sheet);
  if(stress){const b=fixture.blocks.find(b=>b.region==='right'&&b.reference.labels[0]==='4');assert(b);b.text='Langkommentar_start4 '+Array.from({length:300},(_,i)=>'Langabsatz'+i+' Ein langer Kommentar zu Vers vier mit mehreren Absätzen.\n').join('')+' Langkommentar_ende4';}
  if(variant==='compact'){
   fixture.layout={...fixture.layout,showTitle:false,mainSize:14,sideSize:11};
   fixture.blocks=fixture.blocks.filter(b=>b.region!=='right');
   const a=await read(entries.find(e=>e.title==='Hertz on Deuteronomy'&&e.kind==='de'));
   for(let i=0;i<10;i++)if(a.doc.text[0][i]?.trim()){const b=S.capture(a.doc,a.entry,{sectionPath:[0],labels:[String(i+1)]});b.region='right';fixture.blocks.push(b);}
  }
  const file=path.join(output,stress?'long-comment':variant==='compact'?'compact-hertz':'deuteronomy-1');await fs.writeFile(file+'.html',E.html(fixture));
  const win=new BrowserWindow({show:false,webPreferences:{sandbox:true}});
  try{await win.loadFile(file+'.html');await win.webContents.executeJavaScript('document.fonts.ready.then(()=>true)');const measured=await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.verse-aligned>tbody>.verse-row')).map(r=>({verse:r.dataset.verse,cells:Array.from(r.children).filter(c=>c.getClientRects().length).map(c=>({region:c.className,top:c.getBoundingClientRect().top,text:c.textContent}))}))`);assert.equal(measured.length,10);assert(await win.webContents.executeJavaScript("document.querySelectorAll('.verse-row.flowing').length>0"),'verse rows allow text flow');for(const row of measured)assert(row.cells.every(c=>Math.abs(c.top-row.cells[0].top)<1));assert(measured.find(r=>r.verse==='1:4').cells.some(c=>c.region.includes('right')&&c.text.includes('1:4')));await fs.writeFile(file+'.json',JSON.stringify(measured,null,2));const printer=new BrowserWindow({show:false,webPreferences:{sandbox:true,javascript:true}});try{await printer.loadFile(file+'.html');await printer.webContents.executeJavaScript('document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))');await printer.webContents.executeJavaScript(`window.addEventListener('beforeprint',()=>{
 const rows=[...document.querySelectorAll('.verse-row.print-split')];
 function textLines(el){const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),range=document.createRange(),lines=[];let node;while(node=walk.nextNode()){if(!node.textContent.trim())continue;range.selectNodeContents(node);for(const r of range.getClientRects())if(r.height>0)lines.push({top:r.top,bottom:r.bottom});}return lines;}
 window.transitionProof=rows.map(row=>{const tail=row.nextElementSibling,table=tail.querySelector('.classic-continuation');return {
  gap:tail.getBoundingClientRect().top-row.getBoundingClientRect().bottom,
  lineSteps:[...row.querySelectorAll(':scope>.left,:scope>.right')].map(head=>{const next=table.querySelector(head.classList.contains('left')?'.left':'.right'),a=textLines(head),b=next?textLines(next):[];return a.length&&b.length?{step:b[0].top-a.at(-1).top,lineHeight:parseFloat(getComputedStyle(head).lineHeight)}:null;}).filter(Boolean),
  headPadding:[...row.children].map(c=>getComputedStyle(c).paddingBottom),
  tailPadding:[...table.querySelectorAll('.region')].map(c=>getComputedStyle(c).paddingTop),
  internalPadding:[...table.querySelectorAll('tr:not(:last-child)>.region')].map(c=>getComputedStyle(c).paddingBottom)
 };});
},{once:true});`);
 await fs.writeFile(file+'.pdf',await printer.webContents.printToPDF({pageSize:'A4',landscape:true,preferCSSPageSize:true,printBackground:true}));
 const transitions=await printer.webContents.executeJavaScript('window.transitionProof');assert(transitions.length>0,'real commentaries have expanded continuations');
 for(const t of transitions){assert(Math.abs(t.gap)<1,'no spacer between narrow and expanded comments');assert([...t.headPadding,...t.tailPadding,...t.internalPadding].every(p=>parseFloat(p)===0),'continuation has no doubled vertical padding');}
 if(variant==='compact')for(const step of transitions[0].lineSteps)assert(step.step<=step.lineHeight*1.2,'compact bilingual comments continue at the normal line spacing, without a blank line');
 assert(await printer.webContents.executeJavaScript("!document.querySelector('.print-split,.classic-continuation')"),'afterprint restores the preview');}finally{printer.destroy();}}finally{win.destroy();}
 }
 if(process.env.SAFRAN_PDF_CHECK_TEXT==='1'){
  const {execFileSync}=require('node:child_process'),words=file=>{const xml=execFileSync('pdftotext',['-bbox',path.join(output,file+'.pdf'),'-'],{encoding:'utf8',maxBuffer:10*1024*1024});return [...xml.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/g)].flatMap((p,page)=>[...p[1].matchAll(/<word\b([^>]*)>([^<]*)<\/word>/g)].map(w=>({page,text:w[2],x:+/xMin="([^"]+)"/.exec(w[1])[1],right:+/xMax="([^"]+)"/.exec(w[1])[1],y:+/yMin="([^"]+)"/.exec(w[1])[1]})));};
  const compact=words('compact-hertz'),expanded=compact.find(w=>w.text==='siegreichen'&&w.x<50);assert(expanded,'expanded Hoffmann text is present');
  const previous=Math.max(...compact.filter(w=>w.page===expanded.page&&w.x<50&&w.y<expanded.y-1).map(w=>w.y));
  assert(expanded.y-previous<=11*1.55*1.2,'actual PDF glyphs continue without an extra blank line');
  const actual=words('deuteronomy-1'),four=actual.filter(w=>w.text==='1:4');assert.equal(four.length,3);assert(four.every(w=>w.page===four[0].page));assert(Math.max(...four.map(w=>w.y))-Math.min(...four.map(w=>w.y))<20);
  // The long first-verse commentary must reach through the centre, then use
  // the entire page once the shorter opposite commentary has finished.
  assert(actual.some(w=>w.text==='Die'&&w.x<50&&actual.some(v=>v.page===w.page&&Math.abs(v.y-w.y)<1&&v.right>790)),'longer commentary fills the full page width');
  const stress=words('long-comment'),end=stress.find(w=>w.text==='Langkommentar_ende4'),five=stress.filter(w=>w.text==='1:5');assert(end);assert(five.length>=2);assert(five.every(w=>w.page>end.page||w.page===end.page&&w.y>end.y));for(let i=0;i<300;i++)assert(stress.some(w=>w.text==='Langabsatz'+i),'Missing paragraph '+i);
 }
 console.log('Aligned real Deuteronomy 1:1–10 and oversized comment PDFs verified:',output);app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
