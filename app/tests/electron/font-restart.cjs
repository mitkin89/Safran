'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert/strict'),{spawn}=require('child_process');
module.exports=async function fontRestart(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'safran-font-')),children=[];
  fs.writeFileSync(path.join(profile,'font.html'),'<div id="rOut"></div><output id="fsV"></output><button id="fsMinus">-</button><button id="fsPlus">+</button>');
  const executable=process.versions.electron?process.execPath:require('electron');
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  function launch(){
    const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
    const c=spawn(executable,[path.join(__dirname,'font-process.cjs'),profile,'locked'],{stdio:['ignore','ignore','pipe','ipc'],env});
    children.push(c);c.queue=[];c.log='';c.on('message',m=>c.queue.push(m));c.on('error',e=>{c.error=e});
    c.on('exit',code=>{c.exited=true;c.code=code});c.stderr.on('data',s=>{c.log=(c.log+s).slice(-2000)});return c;
  }
  async function message(c,type){
    const until=Date.now()+20000;
    while(Date.now()<until){
      const i=c.queue.findIndex(m=>m.type===type||m.type==='error');
      if(i>=0){const m=c.queue.splice(i,1)[0];if(m.type==='error')throw Error(m.error);return m;}
      if(c.error||c.exited)throw Error(`Font process exited (${c.code}): ${c.error||c.log}`);
      await pause(25);
    }throw Error(`Font process timeout: ${type}\n${c.log}`);
  }
  async function exited(c){const until=Date.now()+15000;while(!c.exited&&Date.now()<until)await pause(25);assert(c.exited,'Electron process quit');assert.equal(c.code,0,c.log);}
  try{
    const a=launch();assert.equal((await message(a,'ready')).stored,'16');
    a.send({type:'font',value:23});assert.equal((await message(a,'font')).font,'23 px');
    const b=launch();await exited(b);assert(!b.queue.some(m=>m.type==='ready'),'Second process never opens the preferences');
    assert.equal((await message(a,'activated')).font,'23 px');
    a.send({type:'close'});await message(a,'closed');
    const c=launch();await exited(c);assert.equal((await message(a,'activated')).font,'23 px','Reopened existing process retains font');
    a.send({type:'quit'});await exited(a);
    const d=launch();assert.equal((await message(d,'ready')).font,'23 px','Actual process restart retains font');
    d.send({type:'quit'});await exited(d);
    console.log('Electron: Grundschrift nach Cmd+Q-Prozessneustart, mehrfacher Start und geschlossenes Fenster geprüft.');
  }finally{
    for(const c of children)if(!c.exited)c.kill();
    for(let i=0;i<80&&children.some(c=>!c.exited);i++)await pause(25);
    fs.rmSync(profile,{recursive:true,force:true});
  }
};
if(require.main===module)module.exports().catch(e=>{console.error(e);process.exitCode=1});
