'use strict';
// Partial name translations require the named person/place in an explicit source
// verse, identified as a proper noun in the local Westminster morphology.
const path=require('node:path'),D=require('../../../library-masora-data');
const manifest=require('../../../bundled/manifest.json').items;
const root=path.resolve(__dirname,'../../..'),cache=new Map();
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f׳״'"·]/g,'').replace(/^[.,;:!?()]+|[.,;:!?()]+$/g,'');
const names={דוד:{id:'1732',de:'David'},דויד:{id:'1732',de:'David'},יהושע:{id:'3091',de:'Josua'},נבוכדנצר:{id:'5019',otherIds:['5020'],de:'Nebukadnezar'},נבוכדראצר:{id:'5019',otherIds:['5020'],de:'Nebukadnezar'},משה:{id:'4872',otherIds:['4873'],de:'Mose'},שאול:{id:'7586',de:'Saul'},שלמה:{id:'8010',de:'Salomo'},שמואל:{id:'8050',de:'Samuel'},אברהם:{id:'85',de:'Abraham'},יצחק:{id:'3327',de:'Isaak'},יעקב:{id:'3290',de:'Jakob'}};
function witnesses(ref){
 if(cache.has(ref))return cache.get(ref);
 const loc=D.bibleRef(ref),found=new Set();
 if(loc&&loc.chapter===loc.endChapter&&loc.verse===loc.endVerse){
  const item=manifest.find(e=>e.kind==='he'&&e.title===loc.book&&/^Westminster/.test(e.versionTitle||''));
  const html=item?require(path.join(root,'bundled',item.rel)).text?.[loc.chapter-1]?.[loc.verse-1]:null;
  if(typeof html==='string')for(const match of html.matchAll(/<span class="w"([^>]*)>(.*?)<\/span>/g)){
   const morphology=/data-m="([^"]+)"/.exec(match[1])?.[1],lemma=/data-l="([^"]+)"/.exec(match[1])?.[1];
   if(!morphology||!/(?:^[HA]|\/)Np(?:$|\/)/.test(morphology))continue;
   for(const id of String(lemma||'').split('/'))if(/^\d+$/.test(id))found.add(id);
  }
 }
 cache.set(ref,found);return found;
}
function improve(reading,prior){
 if(prior.status!=='partial'||!reading.references?.length)return prior;
 const words=new Set(String(reading.text||'').trim().split(/\s+/).map(fold)),ids=new Set(reading.references.flatMap(ref=>[...witnesses(ref)])),used=[];
 const de=prior.de.replace(/\[Unklar: ([^\]]+)\]/g,(whole,fragment)=>{
  const key=fold(fragment),name=names[key];if(!name||!words.has(key)||!ids.has(name.id)&&!(name.otherIds||[]).some(id=>ids.has(id)))return whole;
  used.push({source:fragment,de:name.de});return name.de;
 });
 if(!used.length)return prior;
 return {...prior,de,status:'partial',uncertain:[reading.text],method:'source-name-fragment-review',fragmentTranslations:[...(prior.fragmentTranslations||[]),...used]};
}
module.exports={improve,witnesses};
