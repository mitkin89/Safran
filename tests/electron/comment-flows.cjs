'use strict';
// Isolierte Kommentar-Metadaten und lokale Textantworten für den echten Renderer.
const {ipcMain}=require('electron'),assert=require('assert/strict'),fs=require('node:fs');
module.exports=async function run({docs,win,js,waitFor,book}){
  const names=['Rashi','Ibn Ezra','UI Extra'];
  for(const name of names)for(const kind of ['en','de']){
    const title=name+' on Genesis',rel=`fixture/comments/${name}/${kind}.json`,versionTitle=`UI Kommentar ${kind}`;
    const entry={rel,title,language:kind==='en'?'English':'German',kind,versionTitle,categories:['Tanakh','Commentary'],bytes:100};
    docs.set(rel,{entry,title,language:entry.language,versionTitle,text:[[['Lokaler Testkommentar '+name+' '+kind]]],sectionNames:['Chapter','Verse','Comment']});
  }
  const replace=(channel,fn)=>{ipcMain.removeHandler(channel);ipcMain.handle(channel,fn);};
  const rows=[...names,'UI Missing'].flatMap(name=>[1,2].map(v=>({v1:v,v2:v,type:'commentary',other:name+' on Genesis 1:'+v+':1'})));
  let delayNext=false,pending=null;
  replace('links:status',()=>({complete:true,ready:true}));
  replace('links:section',(_e,title,chap)=>title==='Genesis'&&String(chap)==='1'?rows:[]);
  replace('links:texts',async(_e,refs,kind)=>{
    const result=Object.fromEntries(refs.map(ref=>{
      const name=ref.replace(/ on Genesis.*$/,''),rel=`fixture/comments/${name}/${kind}.json`,doc=docs.get(rel),v=ref.match(/ 1:(\d+):/)[1];
      return [ref,doc?{kind,rel,versionTitle:doc.versionTitle,items:[doc.text[0][0][0]+' Vers '+v]}:{missing:true}];
    }));
    if(delayNext){delayNext=false;await new Promise(resolve=>{pending=resolve;});}
    return result;
  });
  await win.reload();
  await waitFor("[...document.querySelectorAll('#tree .lib-item')].some(n=>n.textContent.includes('Rashi'))",'Kommentar-Testbibliothek');
  await book('Genesis');
  await waitFor("document.querySelector('#rOut .row[data-l=\"1\"] .lk')",'Verknüpfte Kommentare');
  await js("document.querySelector('#rOut .row[data-l=\"1\"] .verse-tool').click()");
  await waitFor("!document.querySelector('#cmtPanel').hidden && document.querySelectorAll('#cmtBody .cmt').length===2",'Vorausgewählte klassische Kommentatoren');
  assert.equal(await js("document.querySelector('#cmtTitle').textContent"),'Genesis 1:1','Kurze Stellenüberschrift');
  assert(await js("document.querySelector('#cmtSum').tagName==='BUTTON' && document.querySelector('#cmtSum').closest('.bar') && document.querySelector('#cmtLang').getBoundingClientRect().height>0"),'Sprache und Kommentatorenauswahl direkt in der Leiste');
  assert(await js("Math.abs(document.querySelector('#cmtSum').getBoundingClientRect().top-document.querySelector('#cmtLang').getBoundingClientRect().top)<3"),'Bedienung in einer gemeinsamen Zeile');
  const textSize=await js("getComputedStyle(document.querySelector('#cmtBody .ct')).fontSize");
  if(process.env.SAFRAN_CMT_COMPACT_CAPTURE){await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");fs.writeFileSync(process.env.SAFRAN_CMT_COMPACT_CAPTURE,(await win.webContents.capturePage()).toPNG());}
  await js("document.querySelector('#cmtSum').click()");
  assert(await js("document.querySelector('#cmtSum').getAttribute('aria-expanded')==='true'"),'Auswahlzustand zugänglich');
  await waitFor("document.querySelector('#cmtBody .ct')",'Kommentar nach Auswahlöffnung');
  assert.equal(await js("getComputedStyle(document.querySelector('#cmtBody .ct')).fontSize"),textSize,'Auswahl ändert keine Textgröße');
  await waitFor("!document.querySelector('#cmtChips').hidden && document.querySelector('#cmtChips button[data-q=none]')",'Kommentatorenauswahl');
  assert.equal(await js("document.querySelector('#cmtChips .chip[data-n=\"UI Missing\"]').classList.contains('off')"),true);
  await js("document.querySelector('#cmtChips button[data-q=none]').click()");
  await waitFor("document.querySelectorAll('#cmtBody .cmt').length===0",'Keine Kommentatoren');
  await js("document.querySelector('#cmtChips button[data-q=all]').click()");
  await waitFor("document.querySelectorAll('#cmtBody .cmt').length===3",'Alle lokalen Kommentatoren');
  await js("document.querySelector('#cmtFilter').value='Rashi';document.querySelector('#cmtFilter').dispatchEvent(new Event('input',{bubbles:true}))");
  assert.equal(await js("[...document.querySelectorAll('#cmtChips .chip')].filter(n=>!n.hidden).length"),1);
  await js("document.querySelector('#cmtFilter').value='';document.querySelector('#cmtFilter').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#cmtChips button[data-q=classic]').click()");
  await waitFor("document.querySelectorAll('#cmtBody .cmt').length===2 && !document.querySelector('#cmtBody .cmt[data-n=\"UI Extra\"]')",'Klassische Auswahl');
  await js("document.querySelector('#cmtLang').value='de';document.querySelector('#cmtLang').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("document.querySelectorAll('#cmtBody .cmt').length===2 && document.querySelector('#cmtBody').textContent.includes('Rashi de')",'Deutsche Kommentare');
  await js("document.querySelector('#cmtChips button[data-q=none]').click()");
  await waitFor("document.querySelectorAll('#cmtBody .cmt').length===0",'Eigene deutsche Auswahl');
  await js("document.querySelector('#cmtLang').value='en';document.querySelector('#cmtLang').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("document.querySelectorAll('#cmtBody .cmt').length===2 && document.querySelector('#cmtBody').textContent.includes('Rashi en')",'Englische Auswahl wiederhergestellt');
  await js("document.querySelector('#cmtBody .cmt[data-n=Rashi] h4').click()");
  assert.equal(await js("document.querySelector('#cmtBody .cmt[data-n=Rashi]').classList.contains('closed')"),true);
  await js("document.querySelector('#cmtClose').click()");
  await waitFor("document.querySelector('#cmtPanel').hidden",'Kommentarbereich schließen');
  await js("document.querySelector('#cmtBtn').click()");
  await waitFor("!document.querySelector('#cmtPanel').hidden && document.querySelector('#cmtBody .cmt[data-n=Rashi].closed')",'Kommentarbereich erneut öffnen');
  const saved=await js("JSON.parse(localStorage.getItem('cmtByLang'))");
  assert.equal(saved.en.sel.length,2);assert.equal(saved.de.sel.length,0);
  assert(await js("!!document.querySelector('#cmtBody .cvn[data-l=\"2\"]')"),'Ganzes Kapitel enthält beide Verse');
  delayNext=true;
  await js("document.querySelector('#rOut .row[data-l=\"2\"] .verse-tool').click()");
  for(let i=0;i<1000&&!pending;i++)await new Promise(resolve=>setTimeout(resolve,20));
  assert(pending,'Verzögerter Textauftrag für Vers 2');
  await js("document.querySelector('#rOut .row[data-l=\"1\"] .verse-tool').click()");
  await waitFor("document.querySelector('#cmtBody').textContent.includes('Vers 1') && !document.querySelector('#cmtBody').textContent.includes('Vers 2')",'Neuester Vers wird angezeigt');
  pending();await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(await js("document.querySelector('#cmtBody').textContent.includes('Vers 2')"),false,'Späte Antwort darf den aktuellen Vers nicht überschreiben');
  console.log('Electron: Kommentatorenauswahl, Filter, getrennte Spracheinstellungen und Ein-/Ausblenden bestanden.');
  console.log('Electron: Kommentartexte für Einzelvers/Kapitel und Schutz vor verspäteten Antworten bestanden.');
};
