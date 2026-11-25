'use strict';
// Whole translated folio excerpts must be split on both margins, in the real PDF.
const {app,BrowserWindow}=require('electron'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),S=require('../../research-store'),E=require('../../research-export'),R=require('../../reader');
app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
 const output=process.env.SAFRAN_PDF_TEST_DIR||'/tmp/safran-folio-export';await fs.mkdir(output,{recursive:true});
 const h=require('../fixtures/bava-metzia-20a-he.json'),e=require('../../bundled/manifest.json').items.find(e=>e.title==='Bava Metzia'&&e.kind==='de'),de=require(path.join(root,'bundled',e.rel)),request={sectionPath:[38],labels:'1-8'};
 const main=S.capture(h,{title:h.title,rel:'fixture/he'},request),left=S.capture(de,e,request),right=S.capture(de,e,request);left.region='left';right.region='right';
 const sheet={title:'Bava Metzia 20a',layout:{template:'classic',orientation:'landscape',mainSize:14,sideSize:11,showTitle:false},blocks:[main,left,right]},before=JSON.stringify(sheet),file=path.join(output,'bava-metzia-20a');
 await fs.writeFile(file+'.html',E.html(sheet));
 const win=new BrowserWindow({show:false,webPreferences:{sandbox:true}});
 try{
  await win.loadFile(file+'.html');await win.webContents.executeJavaScript('document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))');
  const notes=await win.webContents.executeJavaScript("[...document.querySelectorAll('.verse-row')].map(r=>[...r.querySelectorAll(':scope>.region')].map(c=>({role:c.className,notes:[...c.querySelectorAll('.rw-segment-footnote')].map(n=>({text:n.textContent,size:parseFloat(getComputedStyle(n).fontSize),parentSize:parseFloat(getComputedStyle(n.parentElement).fontSize)}))})))");
  for(let i=0;i<8;i++)for(const side of ['left','right']){const found=notes[i].find(c=>c.role.includes(side)).notes,expected=R.splitFootnotes(de.text[38][i]).notes;assert.equal(found.length,expected.length);for(let j=0;j<found.length;j++){assert.equal(found[j].text,'[Fußnote '+S.plain(expected[j].marker)+'] '+S.plain(expected[j].html).replace(/\s*\n\s*/g,' '));assert(found[j].size<found[j].parentSize);}}
  await fs.writeFile(file+'.png',(await win.webContents.capturePage()).toPNG());
  const rows=await win.webContents.executeJavaScript("[...document.querySelectorAll('.verse-row')].map(r=>({key:r.dataset.verse,regions:[...r.querySelectorAll(':scope>.region')].map(c=>({role:c.className,text:c.textContent,top:c.getBoundingClientRect().top}))}))");
  assert.equal(rows.length,8);for(let i=0;i<8;i++){
   const row=rows[i];assert.equal(row.key,'39:'+(i+1));assert(row.regions.every(r=>Math.abs(r.top-row.regions[0].top)<1));
   for(const side of ['left','right']){const text=row.regions.find(r=>r.role.includes(side)).text;assert(text.includes('20a:'+(i+1)));assert(!text.includes('20a:'+(i+2)));}
  }
  await fs.writeFile(file+'.pdf',await win.webContents.printToPDF({pageSize:'A4',landscape:true,preferCSSPageSize:true,printBackground:true}));
  const pdfText=execFileSync('pdftotext',[file+'.pdf','-'],{encoding:'utf8'});assert(pdfText.includes('[Fußnote'),'annotations survive printing to PDF');
  const xml=execFileSync('pdftotext',['-bbox',file+'.pdf','-'],{encoding:'utf8'}),pages=[...xml.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/g)];
  const words=pages.flatMap((p,page)=>[...p[1].matchAll(/<word\b([^>]*)>([^<]*)<\/word>/g)].map(w=>({page,text:w[2],x:+/xMin="([^"]+)"/.exec(w[1])[1],y:+/yMin="([^"]+)"/.exec(w[1])[1]})));
  for(let i=1;i<=8;i++){
   const labels=words.filter(w=>w.text==='20a:'+i);assert.equal(labels.length,2,'both translated fragments have their folio locator');assert.equal(labels[0].page,labels[1].page);assert(Math.abs(labels[0].y-labels[1].y)<2,'left/right excerpts start together in actual PDF');
   const main=words.find(w=>w.page===labels[0].page&&w.x>250&&w.x<600&&w.text===String(i)&&Math.abs(w.y-labels[0].y)<45);assert(main,'Hebrew line '+i+' remains beside its translated fragment');
  }
  assert.equal(JSON.stringify(sheet),before);console.log('Real Bava Metzia 20a PDF: eight Hebrew lines and both whole-folio margin excerpts align; segment footnotes retained in smaller type; snapshots unchanged.');
 }finally{win.destroy();}
 app.exit(0);
}).catch(err=>{console.error(err);app.exit(1);});
