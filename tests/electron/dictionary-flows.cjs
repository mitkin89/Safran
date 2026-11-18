'use strict';
// Kleine lokale DSL-Dateien, echter Wörterbuchdienst und Produktionsoberfläche.
const {ipcMain}=require('electron');
const path=require('path'),assert=require('assert/strict');
const {Dictionaries}=require('../../dsl');
module.exports=async function setup({profile}){
  const service=new Dictionaries(path.join(profile,'dictionary-fixture'));
  const make=name=>Buffer.from(`#NAME "${name}"\n#INDEX_LANGUAGE "Hebrew"\n\nאב\n\t[m1]Vatertext <<בית>> {{ref:Exodus 1:1}}Exodus 1:1{{/ref}}[/m]\nבית\n\t[m1]Haustext[/m]\n`);
  const a=await service.add(make('UI Lexikon A'),'a.dsl'),b=await service.add(make('UI Lexikon B'),'b.dsl'),requests=[];
  const handle=(channel,fn)=>{ipcMain.removeHandler(channel);ipcMain.handle(channel,fn);};
  handle('dict:list',async()=>({list:await service.list()}));
  handle('dict:lookup',async(_e,q,only,full)=>{requests.push({q,only,full});return {results:await service.search(q,{only,full})};});
  handle('dict:suggest',async(_e,q)=>({list:await service.suggest(q)}));
  handle('dict:heads',async(_e,id)=>({list:await service.headList(id)}));
  handle('dict:order',async(_e,ids)=>{await service.setOrder(ids);return {};});

  return async function run({js,waitFor}){
    const lookup=async q=>js(`document.querySelector('#dictQ').value=${JSON.stringify(q)};document.querySelector('#dictGo').click()`);
    const article=async (head,count=2)=>waitFor(`document.querySelectorAll('#dictOut .dentry').length===${count} && document.querySelector('#dictOut .dhead b')?.textContent===${JSON.stringify(head)}`,'Wörterbuchartikel '+head);
    await js("document.querySelector('nav [data-tab=dict]').click()");
    await lookup('אב');await article('אב');
    assert((await js("document.querySelector('#dictRecentL').textContent")).includes('אב'));
    await js("document.querySelector('#dictStar').click()");
    assert.equal(await js("document.querySelector('#dictStar').textContent"),'★');
    assert((await js("document.querySelector('#dictFavL').textContent")).includes('אב'));
    await js("document.querySelector('#dictOut .dref[data-q=בית]').click()");await article('בית');
    await js("document.querySelector('#dictBack').click()");await article('אב');
    await js("document.querySelector('#dictFwd').click()");await article('בית');
    await js("document.querySelector('#dictBack').click()");await article('אב');

    await js("document.querySelector('#dtabNew').click()");await lookup('בית');await article('בית');
    await js("document.querySelector('#dictTabs .dtab[data-i=\"0\"]').click()");await article('אב');
    assert.equal(await js("document.querySelectorAll('#dictTabs .dtab').length"),2);
    await js("document.querySelector('#dictTabs .dtab[data-i=\"1\"] .dtx').click()");
    assert.equal(await js("document.querySelectorAll('#dictTabs .dtab').length"),1);
    await js("document.querySelector('#dictQ').value='א';document.querySelector('#dictQ').dispatchEvent(new Event('input',{bubbles:true}))");
    await waitFor("!document.querySelector('#dictSug').hidden && document.querySelector('#dictSug .sg')",'Wörterbuchvorschläge');
    await js("document.querySelector('#dictSug .sg').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");await article('אב');
    console.log('Electron: Wörterbuchartikel, Verweise, Verlauf, Favoriten, Tabs und Vorschläge bestanden.');

    await js("document.querySelector('#dictSelB').click()");
    await waitFor("!document.querySelector('#dictSelP').hidden && document.querySelectorAll('#dictList input[data-id]').length===2",'Wörterbuchauswahl');
    await js(`{const c=document.querySelector('#dictList input[data-id="${b.id}"]');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));}`);
    await article('אב',1);
    assert.deepEqual(requests.at(-1).only,[a.id]);
    await js("document.querySelector('#dictSelB').click()");
    await lookup('Vatertext');
    await waitFor("document.querySelector('#dictOut').textContent.includes('Kein Eintrag')",'Nur Stichwörter ohne Volltext');
    await js("document.querySelector('#dictFull').checked=true;document.querySelector('#dictFull').dispatchEvent(new Event('change',{bubbles:true}))");
    await article('אב',1);assert.equal(requests.at(-1).full,true);
    await lookup('אב');await article('אב',1);
    await js("document.querySelector('#dictOut .dwk[data-ids]').click()");
    await waitFor("!document.querySelector('#formsPanel').hidden && document.querySelector('#wcBody .wcDGo')",'Wortkarte aus Wörterbuch');
    await js("document.querySelector('#wcBody .wcDGo').click()");await article('אב',1);
    assert.equal(await js("document.documentElement.dataset.tab"),'dict');
    assert.equal(requests.at(-1).only,a.id);
    await js("document.querySelector('#dictOut .dsrc[data-sref]').click()");
    await waitFor("document.documentElement.dataset.tab==='read' && document.querySelector('#rTitle').textContent.includes('Exodus') && document.querySelector('#rOut .row.hit[data-l=\"1\"]')",'Quellenangabe öffnet Vers');
    console.log('Electron: Wörterbuchauswahl, Volltext, Wortkarte in beiden Richtungen und Quellen-Navigation bestanden.');
  };
};
