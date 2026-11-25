(function(root){
 'use strict';
 function create({maxSteps=100,maxBytes=16*1024*1024,coalesceMs=750}={}){
  let current=null,past=[],future=[],lastKey='',lastTime=0;
  const encode=x=>JSON.stringify(x),decode=x=>x===null?null:JSON.parse(x);
  function trim(){let bytes=[current,...past,...future].reduce((n,s)=>n+(s?.length||0)*2,0);while((past.length+future.length>maxSteps||bytes>maxBytes)&&(past.length||future.length)){const old=past.length?past.shift():future.shift();bytes-=old.length*2;}}
  function reset(value){current=encode(value);past=[];future=[];lastKey='';lastTime=0;}
  function accept(value){current=encode(value);trim();}
  function record(value,key='',time=Date.now()){
   const next=encode(value);if(next===current)return false;
   if(current!==null&&!(key&&key===lastKey&&time-lastTime<=coalesceMs&&!future.length&&past.length))past.push(current);
   current=next;future=[];lastKey=key;lastTime=time;trim();return true;
  }
  function undo(){if(!past.length)return null;future.push(current);current=past.pop();lastKey='';trim();return decode(current);}
  function redo(){if(!future.length)return null;past.push(current);current=future.pop();lastKey='';trim();return decode(current);}
  return {reset,accept,record,undo,redo,breakGroup(){lastKey='';lastTime=0;},get canUndo(){return !!past.length;},get canRedo(){return !!future.length;}};
 }
 const api={create};if(typeof module!=='undefined')module.exports=api;else root.ResearchHistory=api;
})(typeof window==='undefined'?globalThis:window);
