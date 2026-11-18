'use strict';
// Isolated, real Electron processes running the production base-font controls.
// Never receives a user profile: the parent creates a fresh OS-temp directory.
const {app,BrowserWindow}=require('electron');
const fs=require('fs'),path=require('path'),os=require('os');
const profile=process.argv[2],mode=process.argv[3];
if(!profile||!path.resolve(profile).startsWith(path.join(os.tmpdir(),'safran-font-')))throw Error('Isolated test profile required');
app.setPath('userData',profile);let win;
const send=m=>process.send?.(m);
const source=fs.readFileSync(path.join(__dirname,'../../library.js'),'utf8');
const start=source.indexOf('  let fs = 16;'),end=source.indexOf('\n\n',source.indexOf('  applyFs();',start));
if(start<0||end<0)throw Error('Production font controls missing');
const controls=source.slice(start,end);
async function open(){
 win=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
 await win.loadFile(path.join(profile,'font.html'));
 await win.webContents.executeJavaScript(`(()=>{const $=s=>document.querySelector(s);${controls}})()`);
}
const state=()=>win.webContents.executeJavaScript(`({font:document.querySelector('#fsV').textContent,stored:localStorage.getItem('fs')})`);
app.on('window-all-closed',()=>{});
const primary=mode==='baseline'||require('../../app-instance').claimSingleInstance(app,async()=>{
 if(!win||win.isDestroyed())await open();
 send({type:'activated',...await state()});
});
if(primary)app.whenReady().then(async()=>{app.dock?.hide();await open();send({type:'ready',...await state()});});
else send({type:'secondary'});
process.on('message',async m=>{try{
 if(m.type==='font'){
  await win.webContents.executeJavaScript(`{for(let i=0;i<20;i++)document.querySelector('#fsMinus').click();for(let i=11;i<${Number(m.value)};i++)document.querySelector('#fsPlus').click();}`);
  send({type:'font',...await state()});
 }else if(m.type==='quit'){app.quit();}
 else if(m.type==='read'){send({type:'read',...await state()});}
 else if(m.type==='close'){win.close();win=null;send({type:'closed'});}
}catch(error){send({type:'error',error:error.message});app.exit(1);}});
