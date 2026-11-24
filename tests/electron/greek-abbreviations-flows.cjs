'use strict';
const {ipcMain}=require('electron');
const path=require('path'),fs=require('fs'),zlib=require('zlib'),assert=require('assert/strict');
const {Dictionaries}=require('../../dsl');
module.exports=async function setup({profile}){
 const service=new Dictionaries(path.join(profile,'greek-abbreviation-fixture'));
 for(const [id,name,needle]of [['0c00a5de7c2b','Liddell&Scott Greek-English Lexicon',/Arist\.Ath\./],['d564a9f87d78','Pape, Griechisch-deutsches Handwörterbuch',/Plat\. Phaedr/]]){
  const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'../../bundled/dict',id+'.json.gz'))));
  const excerpt=data.html.find(h=>needle.test(h.replace(/<[^>]*>/g,'')));assert(excerpt);
  const item=await service.add(Buffer.from(`#NAME "${name}"\n#INDEX_LANGUAGE "Greek"\n\nδοκιμή\n\t[m1]Fixture[/m]\n`),id+'.dsl');
  const {idx,bytes,...loaded}=await service.load(item.id);loaded.html[0]=excerpt;
  await require('fs/promises').writeFile(service.file(item.id),JSON.stringify(loaded));service.cache.delete(item.id);
 }
 const handle=(channel,fn)=>{ipcMain.removeHandler(channel);ipcMain.handle(channel,fn);};
 handle('dict:list',async()=>({list:await service.list()}));
 handle('dict:lookup',async(_e,q,only,full)=>({results:await service.search(q,{only,full})}));
 handle('dict:suggest',async(_e,q)=>({list:await service.suggest(q)}));
 handle('dict:heads',async(_e,id)=>({list:await service.headList(id)}));
 return async({js,waitFor})=>{
  await js("document.querySelector('nav [data-tab=dict]').click();document.querySelector('#dictQ').value='δοκιμή';document.querySelector('#dictGo').click()");
  await waitFor("document.querySelectorAll('#dictOut .dentry').length===2",'Greek articles');
  assert(await js("[...document.querySelectorAll('#dictOut .greek-abbr')].some(e=>e.dataset.t.includes('Ἀθηναίων Πολιτεία'))"),'LSJ contextual work title');
  assert(await js("[...document.querySelectorAll('#dictOut .greek-abbr')].some(e=>e.dataset.t.includes('Phaedrus'))"),'Pape contextual work title');
  await js("document.querySelector('#dictOut .greek-abbr').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))");
  await waitFor("document.querySelector('#gabTip')?.hidden===false && document.querySelector('#gabTip').textContent.length>0",'Greek abbreviation hover');
  await js("document.querySelector('#dictOut .greek-abbr').dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body}))");
  assert(await js("document.querySelector('#gabTip').hidden"));
  console.log('Electron: LSJ/Pape, echte Artikel, Werkkontext und Hover-Erklärungen bestanden.');
 };
};
