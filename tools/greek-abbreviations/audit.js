'use strict';
// Audit every supplied article; candidates are not automatically missing abbreviations.
const fs=require('fs'),zlib=require('zlib'),assert=require('assert/strict');
const {mark}=require('../../greek-abbreviations');
const text=s=>s.replace(/<[^>]*>/g,'');
const report={};
for(const [lex,id,name]of [['lsj','0c00a5de7c2b','Liddell&Scott Greek'],['pape','d564a9f87d78','Pape']]){
 const d=JSON.parse(zlib.gunzipSync(fs.readFileSync(`${__dirname}/../../bundled/dict/${id}.json.gz`)));
 const unknown=new Map();let articles=0,annotations=0;
 for(let i=0;i<d.html.length;i++){
  const source=d.html[i],result=mark(source,name);
  assert.equal(text(result),text(source),`${lex} article ${i}: text preserved`);
  const count=(result.match(/class="gab greek-abbr"/g)||[]).length;
  if(count)articles++;annotations+=count;
  const bare=result.replace(/<abbr\b[^>]*>[\s\S]*?<\/abbr>/g,'').replace(/<[^>]*>/g,'');
  for(const m of bare.matchAll(/\b([A-Za-zÄÖÜäöüß]{2,15})\.(?![A-Za-z])/g))unknown.set(m[1],(unknown.get(m[1])||0)+1);
 }
 report[lex]={total:d.html.length,annotatedArticles:articles,annotations,candidates:[...unknown].sort((a,b)=>b[1]-a[1]).slice(0,100)};
 console.log(lex,JSON.stringify(report[lex]));
}
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
