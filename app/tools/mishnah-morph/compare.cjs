'use strict';
// Local, explicitly aligned reference comparison. Commercial reference data
// remain outside the repository and are never incorporated into the generator.
const fs=require('node:fs'),M=require('../../mishnah-morph');
function lemmaKey(s){return String(s||'').normalize('NFD').replace(/[\u0591-\u05c7]/gu,'').trim();}
function segments(a){
 const lemmas=a.lemma.split('/');let at=0;
 return a.morph.slice(1).split('/').map(p=>{
  const d={type:p[0],lemma:p[0]==='S'?null:lemmaKey(lemmas[at++]||'')};
  if(p[0]==='N'||p[0]==='A')Object.assign(d,{subtype:p[1],gender:p[2],number:p[3],state:p[4]});
  if(p[0]==='P')Object.assign(d,{subtype:p[1],person:p[2],gender:p[3],number:p[4]});
  if(p[0]==='S')Object.assign(d,{subtype:p[1],person:p[2],gender:p[3],number:p[4]});
  if(p[0]==='V'){Object.assign(d,{stem:p[1],form:p[2]});if(/[rs]/.test(p[2]))Object.assign(d,{gender:p[3],number:p[4],state:p[5]});else if(!/[ac]/.test(p[2]))Object.assign(d,{person:p[3],gender:p[4],number:p[5]});}
  if(p[0]==='T')d.subtype=p[1];if(p==='Rd')d.article=true;
  return d;
 });
}
function featureCompatible(a,parts){
 const actual=segments(a);actual.forEach((d,i)=>{if(d.type==='R'&&actual[i+1]?.type==='T'&&actual[i+1]?.subtype==='d')d.article=true;});let at=0;
 for(const expected of parts){
  if(expected.unreadable)continue;
  let found=false;
  for(;at<actual.length;at++){
   const d=actual[at];
   if(Object.entries(expected).every(([key,value])=>{
    if(['unreadable','note','referenceWord'].includes(key))return true;
    if(key==='lemma')return d.lemma===lemmaKey(value);
    if(key==='equivalentLemmas')return value.map(lemmaKey).includes(d.lemma);
    if(key==='form'&&value==='participle')return /[rs]/.test(d.form||'');
    return d[key]===value;
   })){found=true;at++;break;}
  }
  if(!found)return false;
 }
 return true;
}
function compare(D,reference){
 if(reference.module!=='MISH-T'||reference.version!=='4.3')throw Error('Expected an explicitly identified MISH-T 4.3 reference');
 if(reference.title!=='Mishnah Berakhot'||!Array.isArray(reference.rows))throw Error('Expected Berakhot reference rows');
 return reference.rows.map(r=>{
  const place=/^(\d+):(\d+)$/.exec(r.ref||''),ids=place&&D.sources[reference.title]?.chapters[+place[1]-1]?.[+place[2]-1];
  if(!ids)return {ref:r.ref,status:'text-not-aligned'};
  const readableParts=Array.isArray(r.parts)&&r.parts.some(p=>!p.unreadable&&Object.keys(p).some(k=>!['note','referenceWord','unreadable'].includes(k)));
  if(!r.word||(r.parts?!readableParts:(!r.lemma||!r.morph)))return {ref:r.ref,word:r.word,status:'reference-incomplete'};
  const matches=ids.map((id,i)=>({id,token:i+1})).filter(x=>D.forms[x.id].key===M.normalize(r.sourceWord||r.word));
  if(!matches.length)return {ref:r.ref,word:r.word,status:'text-not-aligned'};
  if(matches.length>1&&!r.token)return {ref:r.ref,word:r.word,status:'alignment-required',tokens:matches.map(x=>x.token)};
  const at=r.token?matches.find(x=>x.token===r.token):matches[0];if(!at)return {ref:r.ref,word:r.word,status:'text-not-aligned'};
  const f=D.forms[at.id],compatible=(actual,expected)=>{if(actual[0]!==expected[0])return false;const ap=actual.slice(1).split('/'),ep=expected.slice(1).split('/');return ap.length===ep.length&&ep.every((p,i)=>ap[i].startsWith(p));};
  const passing=f.analyses.filter(a=>r.parts?featureCompatible(a,r.parts):compatible(a.morph,r.morph)&&a.lemma===r.lemma);
  const found=passing.length>0;
  return {ref:r.ref,word:r.word,token:at.token,status:found?'candidate-compatible':'different-or-unresolved',...(r.parts?{partialReference:r.parts.some(p=>p.unreadable),incompatibleAlternatives:f.analyses.length-passing.length}:{}),reference:r.parts?{parts:r.parts}:{lemma:r.lemma,morph:r.morph},candidates:f.analyses.map(({lemma,morph})=>({lemma,morph}))};
 });
}
module.exports={compare,segments,featureCompatible};
if(require.main===module){
 if(!process.argv[2]){process.stderr.write('Usage: node tools/mishnah-morph/compare.cjs /path/to/private-aligned-reference.json\n');process.exit(1);}
 const D=require('../../mishnah-morph-data'),reference=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),rows=compare(D,reference);
 const counts={};for(const r of rows)counts[r.status]=(counts[r.status]||0)+1;
 process.stdout.write(JSON.stringify({module:reference.module,version:reference.version,title:reference.title,meaning:'Compatibility with supplied fields only; unspecified trailing features are not compared; not an accuracy score or independent validation',counts,rows},null,2)+'\n');
}
