'use strict';
const {ipcMain,BrowserWindow}=require('electron'),assert=require('assert/strict'),fs=require('fs/promises'),path=require('path');
module.exports=async function run({profile,js,waitFor,book}){
  const requests=[],dir=process.env.SAFRAN_EXPORT_QA_DIR||path.join(profile,'exports');await fs.mkdir(dir,{recursive:true});
  ipcMain.handle('off:exportSave',async(_e,request)=>{
    requests.push(request);
    const htmlFile=path.join(dir,'export-'+requests.length+'.html');await fs.writeFile(htmlFile,request.html);
    if(request.format!=='pdf')return {path:htmlFile};
    const pdfWin=new BrowserWindow({show:false,webPreferences:{sandbox:true,javascript:false}});
    try{
      await pdfWin.loadFile(htmlFile);
      const buf=await pdfWin.webContents.printToPDF({pageSize:'A4',landscape:!!request.landscape,printBackground:true,margins:{marginType:'default'}});
      assert.equal(buf.subarray(0,4).toString(),'%PDF');const pdf=path.join(dir,'Genesis-Hebraeisch-Deutsch.pdf');await fs.writeFile(pdf,buf);
      console.log('Electron: Buch-PDF erzeugt ('+buf.length+' Bytes).');return {path:pdf};
    }finally{pdfWin.destroy();}
  });
  const inspect=async html=>js(`{const d=new DOMParser().parseFromString(${JSON.stringify(html)},'text/html');({chapters:[...d.querySelectorAll('.chapter h2')].map(n=>n.textContent),rows:d.querySelectorAll('tr.verse').length,he:d.querySelectorAll('td.k-he[dir=rtl]').length,de:d.querySelectorAll('td.k-de[dir=ltr]').length})}`);
  const scope=async value=>js(`document.querySelector('#expScope').value=${JSON.stringify(value)};document.querySelector('#expScope').dispatchEvent(new Event('change',{bubbles:true}))`);
  const open=async()=>js("document.querySelector('#moreMenu').open=true;document.querySelector('#expBtn').click()");
  const submit=async()=>{await js("document.querySelector('#expGo').click()");await waitFor("!document.querySelector('#expDlg[open]') && !document.querySelector('#expGo').disabled",'Export abgeschlossen');};
  await book('Genesis');await waitFor("document.querySelector('#rOut .cell[data-k=he] .w')",'Zweisprachiger Exporttext');
  await open();await js("document.querySelector('#expFmt').value='doc';document.querySelector('#expFrom').value='2';document.querySelector('#expTo').value='3'");
  await submit();assert.equal((await inspect(requests.at(-1).html)).rows,2);
  await open();await scope('range');
  await js("document.querySelector('#expSectionFrom').value='3';document.querySelector('#expSectionTo').value='1';document.querySelector('#expGo').click()");
  await waitFor("document.querySelector('#expMsg').textContent.includes('gültigen Abschnittsbereich') && !document.querySelector('#expGo').disabled",'Ungültiger Kapitelbereich');
  assert.equal(requests.length,1);
  await js("document.querySelector('#expSectionFrom').value='1';document.querySelector('#expSectionTo').value='2'");
  await submit();const range=await inspect(requests.at(-1).html);
  assert.deepEqual(range.chapters,['Kapitel 2','Kapitel 3']);assert.equal(range.rows,49);
  await open();await scope('book');await js("document.querySelector('#expFmt').value='pdf'");
  assert.equal(await js("document.querySelector('#expRows').hidden"),true);
  await submit();const all=await inspect(requests.at(-1).html);
  assert.equal(all.chapters.length,50);assert.equal(all.rows,1533);assert.equal(all.he,1533);assert.equal(all.de,1533);
  assert.equal(requests.at(-1).landscape,false);assert(requests.at(-1).name.includes('Ganzes Buch'));
  console.log('Electron: Einzelverse, Kapitelbereich und vollständiges zweisprachiges Genesis als echte PDF bestanden.');
};
