'use strict';
// Conservative partial translations of explicitly unresolved technical vocabulary.
// These additions never certify the surrounding old parsing or promote a reading.
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f׳״'"·]/g,'').replace(/^[.,;:!?()]+|[.,;:!?()]+$/g,'');
const vocabulary={
 וסימני:'und ihre Erkennungsstellen:',וסימניה:'und ihre Erkennungsstellen:',וסימניהון:'und ihre Erkennungsstellen:',וסימנ:'und die Erkennungsstellen:',וסימנהון:'und ihre Erkennungsstellen:',
 פסוקיא:'Verse',תיבותיה:'seine Wörter',תיבותיהון:'ihre Wörter',תיבותא:'Wörter',
 דכותהון:'ebenso',דכוותהון:'ebenso',דכותיה:'ebenso',דכוותיה:'ebenso',
 בריש:'am Anfang',במצע:'in der Mitte',בסוף:'am Ende'
};
function improve(reading,prior){
 if(prior.status!=='partial')return prior;
 const tokens=String(reading.text||'').trim().split(/\s+/),available=new Set(tokens.map(fold)),used=[];
 const de=prior.de.replace(/\[Unklar: ([^\]]+)\]/g,(whole,fragment)=>{
  const key=fold(fragment);if(!available.has(key)||!vocabulary[key])return whole;
  used.push({source:fragment,de:vocabulary[key]});return vocabulary[key];
 });
 if(!used.length||de===prior.de)return prior;
 return {...prior,de,status:'partial',uncertain:[reading.text],method:'source-rubric-fragment-review',fragmentTranslations:used};
}
module.exports={improve,vocabulary};
