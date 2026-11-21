'use strict';
const {ipcMain,BrowserWindow}=require('electron'),assert=require('assert/strict'),fs=require('fs/promises'),path=require('path');
module.exports=async function run({profile,docs,win,js,waitFor,book}){
  let interlinearPdf=false;
  const requests=[],dir=process.env.SAFRAN_EXPORT_QA_DIR||path.join(profile,'exports');await fs.mkdir(dir,{recursive:true});
  ipcMain.handle('off:exportSave',async(_e,request)=>{
    requests.push(request);
    const htmlFile=path.join(dir,'export-'+requests.length+'.html');await fs.writeFile(htmlFile,request.html);
    if(request.format!=='pdf')return {path:htmlFile};
    const pdfWin=new BrowserWindow({show:false,webPreferences:{sandbox:true,javascript:false}});
    try{
      await pdfWin.loadFile(htmlFile);
      const buf=await pdfWin.webContents.printToPDF({pageSize:'A4',landscape:!!request.landscape,printBackground:true,margins:{marginType:'default'}});
      assert.equal(buf.subarray(0,4).toString(),'%PDF');if(request.html.includes('class="ilg"'))interlinearPdf=true;const pdf=path.join(dir,'Genesis-Hebraeisch-Deutsch.pdf');await fs.writeFile(pdf,buf);
      console.log('Electron: Buch-PDF erzeugt ('+buf.length+' Bytes).');return {path:pdf};
    }finally{pdfWin.destroy();}
  });
  const inspect=async html=>js(`{const d=new DOMParser().parseFromString(${JSON.stringify(html)},'text/html');({chapters:[...d.querySelectorAll('.chapter h2')].map(n=>n.textContent),rows:d.querySelectorAll('tr.verse').length,he:d.querySelectorAll('td.k-he[dir=rtl]').length,de:d.querySelectorAll('td.k-de[dir=ltr]').length,fonts:['he','de'].map(k=>parseFloat(d.querySelector('td.k-'+k).style.fontSize))})}`);
  const readerFonts=async()=>js("['he','de'].map(k=>Math.round(parseFloat(getComputedStyle(document.querySelector('#rOut .cell[data-k='+k+'] .txt')).fontSize)*750)/1000)");
  const setFonts=async(he,de,step)=>js(`{document.querySelector('#dispBtn').click();document.querySelector(${JSON.stringify(step)}).click();for(const [id,value]of [['dHe',${he}],['dDe',${de}]]){const c=document.getElementById(id);c.value=value;c.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('#dispClose').click();}`);
  const scope=async value=>js(`document.querySelector('#expScope').value=${JSON.stringify(value)};document.querySelector('#expScope').dispatchEvent(new Event('change',{bubbles:true}))`);
  const open=async()=>js("document.querySelector('#moreMenu').open=true;document.querySelector('#expBtn').click()");
  const submit=async()=>{await js("document.querySelector('#expGo').click()");await waitFor("!document.querySelector('#expDlg[open]') && !document.querySelector('#expGo').disabled",'Export abgeschlossen');};
  await book('Genesis');await waitFor("document.querySelector('#rOut .cell[data-k=he] .w')",'Zweisprachiger Exporttext');
  await setFonts(1.5,1.1,'#fsPlus');const firstFonts=await readerFonts();
  await open();await js("document.querySelector('#expFmt').value='doc';document.querySelector('#expFrom').value='2';document.querySelector('#expTo').value='3'");
  await submit();const current=await inspect(requests.at(-1).html);assert.equal(current.rows,2);assert.deepEqual(current.fonts,firstFonts);
  await setFonts(1.2,0.9,'#fsMinus');const changedFonts=await readerFonts();assert.notDeepEqual(firstFonts,changedFonts);
  await open();await scope('range');
  await js("document.querySelector('#expSectionFrom').value='3';document.querySelector('#expSectionTo').value='1';document.querySelector('#expGo').click()");
  await waitFor("document.querySelector('#expMsg').textContent.includes('gültigen Abschnittsbereich') && !document.querySelector('#expGo').disabled",'Ungültiger Kapitelbereich');
  assert.equal(requests.length,1);
  await js("document.querySelector('#expSectionFrom').value='1';document.querySelector('#expSectionTo').value='2'");
  await submit();const range=await inspect(requests.at(-1).html);
  assert.deepEqual(range.chapters,['Kapitel 2','Kapitel 3']);assert.equal(range.rows,49);
  assert.deepEqual(range.fonts,changedFonts,'Neue Anzeigegröße wird beim nächsten Export frisch übernommen');
  await open();await scope('book');await js("document.querySelector('#expFmt').value='pdf'");
  assert.equal(await js("document.querySelector('#expRows').hidden"),true);
  await submit();const all=await inspect(requests.at(-1).html);
  assert.equal(all.chapters.length,50);assert.equal(all.rows,1533);assert.equal(all.he,1533);assert.equal(all.de,1533);
  assert.deepEqual(all.fonts,changedFonts,'PDF verwendet dieselben Schriftgrößen wie Word');
  assert.equal(requests.at(-1).landscape,false);assert(requests.at(-1).name.includes('Ganzes Buch'));
  assert(interlinearPdf,'Echte PDF enthält die aktuell gewählte Interlinearansicht');
  assert(requests.at(-1).html.includes('data-tr="Zunz"'),'Interlinear-Übersetzung wird bei ganzem Buch erhalten');
  // Real bundled CATSS and DSS sources, available as interlinear rows without extra reading columns.
  const root=path.resolve(__dirname,'../..'),manifest=require(path.join(root,'bundled/manifest.json'));
  for(const title of ['Septuaginta (CATSS)','Qumran-Rollen (ETCBC DSS)']){
    const item=manifest.items.find(e=>e.title==='Genesis'&&e.versionTitle===title);
    const doc=JSON.parse(await fs.readFile(path.join(root,'bundled',item.rel),'utf8'));
    docs.set(item.rel,{...doc,entry:{...item,own:false}});
  }
  {const loaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.reload();await loaded;}
  await book('Genesis');await waitFor("document.querySelector('#rOut .cell[data-k=he] .w')",'Interlinear-Drucktest nach Neustart');
  await js("document.querySelector('#ilBtn').click()");
  await waitFor("document.querySelector('#ilPop input[value=LXX]')&&document.querySelector('#ilPop input[value=Qumran]')",'LXX und Qumran für Druck auswählbar');
  await js("for(const n of ['LXX','Qumran','Samaritan']){const c=document.querySelector('#ilPop input[value='+n+']');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#ilBtn').click()");
  await waitFor("document.querySelector('#rOut .ilt[data-tr=LXX]')&&document.querySelector('#rOut .ilt[data-tr=Qumran]')",'LXX und DSS im Leser');
  await open();await js("document.querySelector('#expFmt').value='pdf';document.querySelector('#expFrom').value='5';document.querySelector('#expTo').value='5'");
  await submit();
  assert(requests.at(-1).html.includes('data-tr="LXX"')&&requests.at(-1).html.includes('data-tr="Qumran"'),'Echte PDF erhält beide Zeugen-Zeilen');
  assert(requests.at(-1).html.includes('data-tr="Samaritan"')&&requests.at(-1).html.includes('data-smr-ref="Genesis 1:5"'),'Samaritanus erhält eigene Wortgruppen im echten PDF');
  assert(requests.at(-1).html.includes('10.11647/OBP.0415'),'Tal–Florentin-Quelle im Druck');
  assert(requests.at(-1).html.includes('4Q7'),'Handschriftensigle bleibt im Druck');
  assert(requests.at(-1).html.includes('CC BY-NC-SA 3.0')&&requests.at(-1).html.includes('CC BY-NC 4.0'),'Interlinear-Quellen im Druck');
  await js("document.querySelector('#ilBtn').click();for(const n of ['LXX','Qumran','Samaritan']){const c=document.querySelector('#ilPop input[value='+n+']');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#ilBtn').click()");
  console.log('Electron: Einzelverse, Kapitelbereich und vollständiges zweisprachiges Genesis als echte PDF bestanden.');
};
