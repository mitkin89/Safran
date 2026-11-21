#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'textcrit-data')),M=require(path.join(root,'bundled/manifest.json')),R=require(path.join(root,'reader')),{cons,align}=require('./align.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),textHash=t=>sha(JSON.stringify(t));
const Q=require('./mt-qere.json');
const books=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy'];
const overrides={'Exodus 26:35':['Exodus 26:35',...Array.from({length:10},(_,i)=>'Exodus 30:'+(i+1))],'Exodus 29:28':['Exodus 29:28','Exodus 29:21']};
const D={schema:1,source:{edition:'Tal–Florentin (2024)',license:'CC BY-NC 4.0',doi:'10.11647/OBP.0415',textcritSha256:sha(fs.readFileSync(path.join(root,'textcrit-data.js'))),books:{},qereSource:Q.source,method:'Machine alignment, all-optimal-position consensus; source text and red masks unchanged'},mt:{},qere:Q.groups,verses:{},index:{},open:{},missing:{}};
const missingScopes={};
const audit={source:D.source,counts:{sourceWords:0,exact:0,spelling:0,context:0,division:0,transposed:0,addition:0,unresolved:0},unresolved:[],overrides};
for(const book of books){
 const entry=prefix=>M.items.find(e=>e.title===book&&e.versionTitle.startsWith(prefix));
 const he=entry('Westminster'),sp=entry('Samaritanischer Pentateuch (Tal');
 const metadata=e=>{const raw=fs.readFileSync(path.join(root,'bundled',e.rel)),doc=JSON.parse(raw);return {doc,meta:{rel:e.rel,versionTitle:e.versionTitle,sha256:sha(raw),textHash:textHash(doc.text)}};};
 const A=metadata(he),B=metadata(sp);D.source.books[book]={he:A.meta,translation:B.meta};
 A.doc.text.forEach((ch,c)=>ch.forEach((verse,v)=>D.mt[`${book} ${c+1}:${v+1}`]=[...verse.matchAll(/<span class="w"[^>]*>(.*?)<\/span>/g)].map(m=>m[1].replace(/<[^>]*>/g,''))));
 const refs=Object.keys(T.verses).filter(r=>r.startsWith(book+' '));
 for(let ri=0;ri<refs.length;ri++){
  const ref=refs[ri],verse=T.verses[ref],scope=ref.replace(/:\d+$/,''),num=+ref.split(':').at(-1);
  let targets=overrides[ref]?.slice()||verse.mtRefs.slice();
  if(targets.length&&!overrides[ref]){
   const next=refs.slice(ri+1).find(r=>r.startsWith(scope+':')&&T.verses[r].words.length&&T.verses[r].mtRefs.length);
   const end=next?T.verses[next].mtRefs[0]:null,start=targets[0];
   if(end?.replace(/:\d+$/,'')===start.replace(/:\d+$/,'')){
    const first=+start.split(':').at(-1),last=+end.split(':').at(-1)-1;
    if(last>=first&&last-first<=5)targets=Array.from({length:last-first+1},(_,i)=>start.replace(/:\d+$/,':'+(first+i)));
   }
  }
  if(!targets.length&&verse.words.length){
   const around=[...refs.slice(0,ri).reverse(),...refs.slice(ri+1)].filter(r=>r.startsWith(scope+':')&&T.verses[r].mtRefs.length).slice(0,2);
   const offsets=around.map(r=>{const m=T.verses[r].mtRefs[0];return m.replace(/:\d+$/,'')===scope?+m.split(':').at(-1)-+r.split(':').at(-1):null;});
   const delta=offsets.length&&offsets.every(d=>d===offsets[0])?offsets[0]:0,candidate=scope+':'+(num+(delta||0));
   if(D.mt[candidate])targets=[candidate];
  }
  targets=targets.filter(r=>D.mt[r]?.length);
  const locations=targets.flatMap(r=>{
   const groups=D.qere[r]||[],inside=new Set(groups.flat()),starts=new Map(groups.map(g=>[g[0],g]));
   return D.mt[r].flatMap((text,i)=>starts.has(i+1)?[{ref:r,indices:starts.get(i+1),text}]:inside.has(i+1)?[]:[{ref:r,indices:[i+1],text}]);
  });
  const result=align(verse.words.map(w=>w[0]),locations.map(w=>w.text));
  const row={words:[],targets,method:overrides[ref]?'documented-passage-correspondence':'machine-word-alignment'};
  verse.words.forEach(([text,mask,id],i)=>{
   let match=result.mapped[i],target=null,indices=[],kind='unresolved',boundary=null;
   if(match){
    const selected=match.indices.map(j=>locations[j]);
    if(selected.length&&selected.every(l=>l.ref===selected[0].ref)){target=selected[0].ref;indices=selected.flatMap(l=>l.indices);kind=match.kind;}
    else if(!selected.length){
     const left=locations[match.boundary-1],right=locations[match.boundary];
     if(left&&(!right||left.ref===right.ref)){target=left.ref;boundary=left.indices.at(-1);kind='addition';}
     else if(!left&&right){target=right.ref;boundary=0;kind='addition';}
    }
   }
   // Every source graphic word is kept once, including words with no secure position.
   row.words.push([text,mask,id,target,indices,kind,boundary]);audit.counts.sourceWords++;audit.counts[kind]++;
  });
  D.verses[ref]=row;
  for(const target of new Set(row.words.map(w=>w[3]).filter(Boolean)))(D.index[target]??=[]).push(ref);
  const open=row.words.map((w,i)=>w[5]==='unresolved'?i:-1).filter(i=>i>=0);
  if(open.length){
   const first=row.words.find(w=>w[3])?.[3]||targets[0]||(D.mt[ref]?ref:Object.keys(D.mt).find(r=>r.startsWith(scope+':')));
   if(!first)throw Error('No reader location for '+ref);
   (D.open[first]??=[]).push({ref,words:open});audit.unresolved.push({ref,words:open.length});
  }
  for(const target of targets){const misses=result.missing.map(j=>locations[j]).filter(l=>l.ref===target).flatMap(l=>l.indices);(missingScopes[target]??=[]).push(new Set(misses));}
 }
}
// A missing counterpart must survive every Tal section considered for that MT
// verse. Ambiguous positions in another section therefore prevent a false dash.
for(const [ref,scopes]of Object.entries(missingScopes))D.missing[ref]=[...scopes[0]].filter(i=>scopes.every(s=>s.has(i)));
fs.writeFileSync(path.join(root,'samaritan-il.js'),'/* Tal–Florentin CC BY-NC 4.0; MT OSHB CC BY 4.0; generated by tools/samaritan/build_interlinear.cjs */\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.SAMARITAN_IL=d;})('+JSON.stringify(D)+');\n');
fs.writeFileSync(path.join(__dirname,'interlinear-audit.json'),JSON.stringify(audit,null,2)+'\n');
console.log(audit.counts,'open verses',audit.unresolved.length);
