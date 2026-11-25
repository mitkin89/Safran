'use strict';
// Only catalogue/facsimile URLs explicitly supplied by the licensed source data.
const urls=require('./kennicott-links.json');
function canonical(value){
 if(typeof value!=='string')return null;
 try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
const allowed=new Set(urls.map(canonical).filter(Boolean));
function approved(value){const url=canonical(value);return url&&allowed.has(url)?url:null;}
module.exports={approved};
