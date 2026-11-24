// Context annotations are tied to an exact source verse and word occurrence.
(function(global){
  'use strict';
  const F=typeof module!=='undefined'&&module.exports?require('./semantic-fields'):global.SemanticFields;
  const labels={fear:'Angst / Bedrohung',reverence:'Ehrfurcht / Gottesfurcht',uncertain:'Nicht eindeutig',other:'Anderer Gebrauch',unreviewed:'Noch nicht zugeordnet'};
  const key=r=>JSON.stringify([r.book,r.versionTitle,r.kind,r.path,r.position,r.id]);
  function clean(value){
    if(!value||typeof value!=='object')return null;
    const {book,versionTitle,kind,signature,sense,note}=value;
    if(typeof book!=='string'||!book||book.length>100||typeof versionTitle!=='string'||!versionTitle||versionTitle.length>300||!['he','other'].includes(kind))return null;
    if(!Array.isArray(value.path)||value.path.length!==2||!value.path.every(i=>Number.isInteger(i)&&i>=0&&i<1000)||!Number.isInteger(value.position)||value.position<1||value.position>1000)return null;
    const id=String(value.id||'');
    if(kind==='he'?!/^\d{1,4}(?: [a-z])?$/.test(id):!id||id.length>80||!/^\p{Script=Greek}[\p{Script=Greek}\p{M}]*$/u.test(id))return null;
    if(typeof signature!=='string'||!/^([a-f0-9]{64})$/.test(signature)||!Object.hasOwn(labels,sense)||typeof note!=='string'||note.trim().length<3||note.length>500)return null;
    return {book,versionTitle,kind,path:[...value.path],position:value.position,id,signature,sense,note:note.trim(),...(typeof value.en==='string'?{en:value.en.slice(0,500)}:{})};
  }
  function corrections(values){
    const out=new Map();for(const value of Array.isArray(values)?values.slice(-2000):[]){const r=clean(value);if(r)out.set(key(r),r);}return [...out.values()];
  }
  function request(value){
    if(value==null)return null;
    const f=F.resolve(value);if(!f)return {};
    if(value.sense!=null&&value.sense!=='all'&&!Object.hasOwn(labels,value.sense))return {};
    return {...(f.custom?{custom:f}:{fieldId:f.id}),sense:f.id==='fear'&&!f.custom?value.sense||'all':'all',corrections:f.id==='fear'&&!f.custom?corrections(value.corrections):[]};
  }
  function classify(record,local,seeds){
    const k=key(record),own=local.get(k),seed=seeds.get(k);
    if(own?.signature===record.signature)return {...own,basis:'local'};
    if(seed?.signature===record.signature)return {...seed,basis:'editorial',stale:!!own};
    return {sense:'unreviewed',basis:'unreviewed',note:'',stale:!!(own||seed)};
  }
  const api={labels,key,clean,corrections,request,classify};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else global.SemanticContext=api;
})(typeof window!=='undefined'?window:globalThis);
