'use strict';
// Extend the shared word-card index with source-bound Samaritan words and
// morphologically analysed, explicitly attributed Field readings.
module.exports=function({out,add,load,manifest,root}){
 const fs=require('node:fs'),path=require('node:path'),SM=require('../app/samaritan-core'),GM=require('../app/gmorph');
 const S=load('samaritan-data.js');
 for(const entry of manifest.filter(e=>e.versionTitle==='Samaritanischer Pentateuch (Tal–Florentin)')){
  const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel))),wi=out.works.push([entry.title,entry.versionTitle,entry.rel,'Samaritan'])-1;
  doc.text.forEach((ch,c)=>ch.forEach((html,v)=>{
   const loc=out.places.push([wi,[c],String(v+1)])-1;
   [...html.matchAll(/<span class="w" data-l="([^"]+)"[^>]*>([^<]*)<\/span>/g)].forEach((m,token)=>{
    const word=SM.word(S,m[1]);if(!word?.parts.length)return;
    // Index each attested segment under its own lexeme, preserving the full
    // surface token and counting that token once when several segments match.
    for(const part of word.parts){const lemma=SM.lemma(part);if(!lemma)continue;
     const f={},keys=['pos','stem','tense','person','gender','number'];
     const pos={subs:'Nomen',verb:'Verb',prep:'Präposition',conj:'Konjunktion',nmpr:'Eigenname',art:'Artikel',adjv:'Adjektiv'};
     const labels={qal:'Qal',hif:'Hif‘il',piel:'Pi‘el',nif:'Nif‘al',hit:'Hitpa‘el',hof:'Hof‘al',pual:'Pu‘al',perf:'Perfekt',impf:'Imperfekt',inf:'Infinitiv',ptca:'Partizip aktiv',ptcp:'Partizip passiv',impv:'Imperativ',p1:'1. Pers.',p2:'2. Pers.',p3:'3. Pers.',m:'m.',f:'f.',sg:'Sg.',pl:'Pl.',du:'Du.'};
     keys.forEach((k,i)=>{const value=part[i+2];if(value&&value!=='NA'&&value!=='unknown')f[k]=[i===0?(pos[value]||value):(labels[value]||value)];});
     add('hebrew',lemma,m[2],f,loc,token,'source');
    }
   });
  }));
 }
 const H=load('hexapla-word-index.js'),M=load('hexapla-morph.js'),work=new Map(),done=new Set();
 out.field={};
 // Reuse the validated reading selection: excludes cross-references, editorial
 // text and uncertain multiword Hebrew anchors. Greek tokens keep alternatives.
 for(const [source,lexemes]of Object.entries(H.renderings))for(const [,cells]of Object.values(lexemes))for(const cell of cells)for(const id of cell[5]){
  if(done.has(source+':'+id))continue;done.add(source+':'+id);
  const r=H.rows[id],match=/^(.*) (\d+):(\d+)$/.exec(r.ref);if(!match)continue;
  const book=match[1],entry=manifest.find(e=>e.title===book&&e.versionTitle?.startsWith('Westminster'));
  if(!entry)throw Error('Missing Field anchor '+r.ref);
  const wk=source+'|'+book;if(!work.has(wk))work.set(wk,out.works.push([book,entry.versionTitle,entry.rel,source])-1);
  const loc=out.places.push([work.get(wk),[+match[2]-1],match[3]])-1;
  out.field[loc]={...r,index:id};
  const tokens=r.reading.replace(/\^\d+/g,'').match(/[\p{Script=Greek}\p{M}]+[’'᾿]?/gu)||[];
  tokens.forEach((form,token)=>{const analyses=M.F[GM.form(form)]||[];for(const [lemma,morph]of analyses)if(lemma&&morph)add('greek',lemma.normalize('NFC'),form,morph,loc,token,analyses.length>1?'candidate':'analysed');});
 }
 out.coverage.samaritan='Tal–Florentin: only words with source morphology; changed forms without an analysis remain unindexed.';
 out.coverage.field='Field (1875): surviving attributed readings with validated single-word Hebrew anchors; alternative morphological analyses are retained.';
};
