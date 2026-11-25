'use strict';
// Bounded formula corrections based on scholarly descriptions, not guessed expansions.
// דס: The Small Masorah, p.163 (Cambridge repository), exact word combinations.
// ר״פ: Kelley/Mynatt/Crawford, The Masorah of BHS, glossary, verse beginning.
const D=require('../../../library-masora-data');
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f׳״'"·]/g,'').trim();
const times=n=>({1:'Einmal',2:'Zweimal',3:'Dreimal'})[n]||n+'-mal';
function boundedFormula(reading){
 const tokens=String(reading.text||'').trim().split(/\s+/),key=tokens.map(fold);
 const adjacent=k=>['דס','דסמיך','דסמיכין'].includes(k);
 const verseStart=raw=>/^ר[\u05c4\u05c5\u0307״"']+פ[\u05c4\u05c5\u0307׳'"״]*$/.test(raw);
 if(tokens.length===1&&adjacent(key[0]))return {de:'In dieser Wortverbindung.',status:'draft',uncertain:[],method:'sourced-formula'};
 if(tokens.length===1&&verseStart(tokens[0]))return {de:'Am Versanfang.',status:'draft',uncertain:[],method:'sourced-formula'};
 if(tokens.length!==2||!adjacent(key[1])&&!verseStart(tokens[1]))return null;
 const count=D.explain({readings:[{text:tokens[0]}]}).count;
 if(count===null)return null;
 return {de:times(count)+(adjacent(key[1])?' in dieser Wortverbindung.':' am Versanfang.'),status:'draft',uncertain:[],method:'sourced-formula'};
}
function protectSource(reading,result){
 if(/[#\[\]…�∅]|\.{2,}/.test(reading.text)&&result.status==='draft')return {...result,de:result.de+' [Lücke oder unsichere Zeichen im Original.]',status:'partial',uncertain:[reading.text]};
 if(result.status==='draft'&&/\[(?:Unklar|Nicht übersetzt|Unleserlich|Ungeklärt)/i.test(result.de))return {...result,status:'partial',uncertain:[reading.text]};
 return result;
}
function germanScore(result){return String(result.de||'').replace(/\[[^\]]*\]/g,'').replace(/[^A-Za-zÄÖÜäöüß]/g,'').length;}
function improve(reading,entry,prior){
 const bounded=boundedFormula(reading);if(bounded)return protectSource(reading,{uuid:reading.uuid,...bounded});
 prior=protectSource(reading,prior);if(prior.status==='draft')return prior;
 const P2=require('./part-2'),P1=require('./part-1'),P0=require('./part-0'),P3=require('./part-3');
 let best=prior,score=germanScore(prior);
 for(const name of ['./part-4','./part-5','./part-6']){const manual=require(name).manualFor?.(reading,entry);if(!manual)continue;const candidate=protectSource(reading,{uuid:reading.uuid,...manual});if(candidate.status==='draft')return candidate;const s=germanScore(candidate);if(s>score+8){best=candidate;score=s;}}
 const candidates=[()=>P2.translate(reading,entry),()=>P1.build([{...entry,readings:[reading]}])[0].readings[0],()=>P0.translateReading(reading,entry)];
 if(reading.text.split(/\s+/).length<=60)candidates.push(()=>P3.translate(reading));
 for(const get of candidates){const candidate=protectSource(reading,{uuid:reading.uuid,...get()});if(candidate.status==='draft')return candidate;const s=germanScore(candidate);if(s>score+8){best=candidate;score=s;}}
 return best;
}
const verseCache=new Map();
function canonicalSpacing(reading){
 if(!reading.references?.length||/[#\[\]{}…�∅A-Za-z0-9\u05c4\u05c5]/.test(reading.text))return null;
 const raw=D.wordTokens(reading.text);if(raw.length<2)return null;
 const joined=raw.join(''),found=new Map(),path=require('node:path');
 const root=path.resolve(__dirname,'../../..'),manifest=require('../../../bundled/manifest.json').items;
 for(const ref of reading.references){
  const loc=D.bibleRef(ref);if(!loc||loc.chapter!==loc.endChapter||loc.verse!==loc.endVerse)continue;
  if(!verseCache.has(ref)){
   const entry=manifest.find(e=>e.kind==='he'&&e.title===loc.book&&/^Westminster/.test(e.versionTitle||''));
   const html=entry?require(path.join(root,'bundled',entry.rel)).text?.[loc.chapter-1]?.[loc.verse-1]:null;
   verseCache.set(ref,typeof html==='string'?[...html.matchAll(/<span class="w"[^>]*>(.*?)<\/span>/g)].map(m=>m[1].replace(/<[^>]*>/g,'').replace(/[^א-ת]/g,'')):[]);
  }
  const words=verseCache.get(ref);
  for(let a=0;a<words.length;a++){let span='';for(let b=a;b<words.length;b++){
   span+=words[b];if(span.length>joined.length)break;if(span!==joined)continue;
   const source=words.slice(a,b+1).join(' ');if(source===raw.join(' '))break;
   const q=require('./part-2').quote(source,[ref]);if(q?.status==='draft')found.set(q.de.replace(/[.,;:!?]+$/,''),q);break;
  }}
 }
 if(found.size!==1)return null;
 const q=[...found.values()][0];return {...q,de:q.de+' [Abweichende Worttrennung in der Quelle; Arbeitslesung.]',status:'partial',uncertain:[reading.text],method:'aligned-quotation-resegmented'};
}
function refineSpacing(reading,prior){if(prior.status==='draft')return prior;const next=canonicalSpacing(reading);return next&&germanScore(next)>germanScore(prior)?{...next,uuid:reading.uuid}:prior;}
module.exports={boundedFormula,protectSource,improve,germanScore,canonicalSpacing,refineSpacing};
