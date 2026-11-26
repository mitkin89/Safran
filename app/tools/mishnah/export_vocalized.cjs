'use strict';
// Reuse exactly the word projection used by the existing source-bound cards.
const fs=require('node:fs'),path=require('node:path'),B=require('../mishnah-morph/build.cjs'),M=require('../../mishnah-morph');
const root=path.resolve(__dirname,'../..'),manifest=require('../../bundled/manifest.json');
const books=manifest.items.filter(e=>e.versionTitle===B.version).map(e=>{
 const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel))),units={};
 doc.text.forEach((ch,c)=>ch.forEach((html,m)=>{const text=B.main(html),ref=`${c+1}:${m+1}`;units[ref]={text,words:M.tokens(text).map(t=>({text:t.word,key:t.word.replace(/[^א-ת]/gu,''),flags:[],start:t.start,end:t.end})),id:e.rel+'#'+ref};}));
 return {title:e.title,rel:e.rel,textHash:B.hash(doc.text),versionTitle:B.version,chapters:doc.text.length,units};
});
process.stdout.write(JSON.stringify(books));
