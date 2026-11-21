#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),index=require(path.join(root,'kennicott-index')),K=require(path.join(root,'kennicott-core'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const audit={algorithmSha256:hash(fs.readFileSync(path.join(root,'kennicott-core.js'))),books:{},totals:{entries:0,located:0,unlocated:0}};
for(const [book,meta]of Object.entries(index.books)){
 const file=path.join(root,meta.file),D=require(file),methods={},open=[];let located=0;
 for(const e of Object.values(D.entries)){
  const ref=e.refs[0],r=K.locateMapped(D,e);methods[r.method]=(methods[r.method]||0)+1;
  if(r.anchor){if(e.refs.length!==1||r.anchor.start< -1||r.anchor.end>=D.mt[r.anchor.ref].length)throw Error('Invalid position '+e.id);located++;}else open.push(e.id);
 }
 const stats={dataSha256:hash(fs.readFileSync(file)),entries:Object.keys(D.entries).length,located,unlocated:open.length,methods,open};audit.books[book]=stats;
 for(const k of ['entries','located','unlocated'])audit.totals[k]+=stats[k];
 delete require.cache[require.resolve(file)];console.log(book,located+'/'+stats.entries);
}
fs.writeFileSync(path.join(__dirname,'alignment-audit.json'),JSON.stringify(audit,null,2)+'\n');console.log(audit.totals);
