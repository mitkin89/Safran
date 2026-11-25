'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const cache=new Map();
function load(book){
 if(!require('./tanakh-syntax').load(book))return null;
 if(!cache.has(book)){
  try{const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'bundled/syntax-trees',book+'.json.gz'))));
   if(!Array.isArray(data.trees)||!data.byRef||!data.text||data.version!==1||data.source!==require('./tanakh-syntax').load(book).source)throw Error('source');
   if(cache.size>=3)cache.delete(cache.keys().next().value);cache.set(book,data);
  }catch{return null;}
 }return cache.get(book);
}
function projectTree(book,ref,text,readWords,positions){
 const data=load(book);if(!data)return {trees:[],unavailable:true};
 const verified=new Map();
 const valid=r=>{if(!verified.has(r)){const [c,v]=r.split(':').map(Number),html=text[c-1]?.[v-1];verified.set(r,typeof html==='string'&&readWords(html).map(w=>w.normalized).join(' ')===data.text[r]);}return verified.get(r);};
 if(!valid(ref))return {trees:[],unavailable:true};
 let budget=1600,omitted=0,unmapped=0;
 const project=n=>{
  if(--budget<0){omitted++;return {kind:'omitted'};}
  if(n.kind==='word'){
   const aligned=!!n.indices.length&&valid(n.ref);
   if(!aligned)unmapped++;
   return {...n,indices:aligned?n.indices:[],aligned,matched:aligned&&n.ref===ref&&n.indices.some(i=>positions.has(i))};
  }
  return {...n,children:n.children.map(project)};
 };
 const ids=data.byRef[ref]||[];
 return {source:data.source,trees:ids.slice(0,3).map(i=>project(data.trees[i])),omittedTrees:Math.max(0,ids.length-3),omitted,unmapped};
}
function get(...args){try{return projectTree(...args);}catch{return {trees:[],unavailable:true};}}
module.exports={get,load};
