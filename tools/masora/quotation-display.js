'use strict';
// Identify quoted Bible text from the actual Hebrew corpus, independently of the
// German translation's wording. Only presentation metadata is generated.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const words=s=>(String(s).replace(/<[^>]*>/g,' ').replace(/־/g,' ').match(/[א-ת\u0591-\u05c7]+/g)||[]).map(w=>w.replace(/[^א-ת]/g,'')).filter(Boolean);
function build(records){
 const first=new Map(),byRef=new Map(),D=require('../../library-masora-data');
 for(const e of require('../../bundled/manifest.json').items.filter(e=>e.kind==='he'&&/^Westminster/.test(e.versionTitle))){
  const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel),'utf8'));
  for(let c=0;c<doc.text.length;c++)for(let v=0;v<(doc.text[c]||[]).length;v++){
   const verse=doc.text[c][v];
   if(typeof verse!=='string')continue;
   const ws=words(verse);byRef.set(e.title+' '+(c+1)+':'+(v+1),ws);for(let i=0;i<ws.length;i++){const list=first.get(ws[i])||[];list.push({ws,i});first.set(ws[i],list);}
  }
 }
 function quotation(ws,refs){
  if(ws.length<2)return false;
  if((first.get(ws[0])||[]).some(({ws:verse,i})=>ws.every((w,k)=>verse[i+k]===w)))return true;
  // Source quotations can have plene spellings or abbreviated word endings.
  // Only the explicitly cited verse permits this bounded comparison. It
  // identifies quotation *role*, never a textual variant or a word alignment.
  if(ws.length<3)return false;
  const close=(a,b)=>a===b||a.replace(/[וי]/g,'')===b.replace(/[וי]/g,'')||a.length>=3&&b.startsWith(a);
  return (refs||[]).some(ref=>{const loc=D.bibleRef(ref),verse=loc&&byRef.get(loc.book+' '+loc.chapter+':'+loc.verse);if(!verse)return false;
   for(let i=0;i+ws.length<=verse.length;i++){const matches=ws.reduce((n,w,k)=>n+Number(close(w,verse[i+k])),0);if(matches>=Math.ceil(ws.length*.75))return true;}return false;
  });
 }
 const notes={};
 for(const record of records)for(const r of record.readings){
  // The runtime already handles the explicit machine-aligned quotation types.
  if(/^(?:aligned-|exact-referenced-quotation-spans|lemma-plus-quotation)/.test(r.method||''))continue;
  let source=String(r.source||'').trim(),prefix='';
  // Book rubrics identify the quotation, rather than changing its wording.
  source=source.replace(/\s+(?:דיהוש[ׅׄ׳״']*|בתרי\s+עשר)\s*$/u,'');
  if(/^וחד\s/.test(source)){source=source.replace(/^וחד\s+/,'');prefix='Und einmal.';}
  // Count/abbreviation marks, source losses and editorial notation belong to
  // the Masorah rule and must never be mistaken for a biblical quotation.
  if(/[\u05c4\u05c5\u0307׳״'#\[\]…�]|[A-Za-z]/u.test(source))continue;
  if(quotation(words(source),r.sourceReferences))notes[r.uuid]=[r.source,prefix];
 }
 return {schema:1,notes};
}
function write(records){const data=build(records);fs.writeFileSync(path.join(root,'masora-quotation-display.js'),'// Verified Hebrew Bible quotations: omit their German repetition in the Masorah.\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.MASORA_QUOTATION_DISPLAY=d;})('+JSON.stringify(data)+');\n');return Object.keys(data.notes).length;}
module.exports={build,write};
if(require.main===module){const index=require('../../masora-translations/index');console.log('Verified quotation readings:',write(index.batches.flatMap(b=>Object.values(require(path.join(root,b.file)).notes))));}
