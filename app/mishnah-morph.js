// Corpus-bound Mishnaic Hebrew candidate analysis. No inferred token is marked reviewed.
(function(root){
 'use strict';
 const normalize=w=>String(w||'').normalize('NFD').replace(/[’']/g,'׳').replace(/[^א-ת\u05b0-\u05bc\u05c1\u05c2\u05c7׳״]/gu,'');
 function tokens(text){
  text=String(text);
  // Pointed book names in inline biblical references are editorial citations,
  // not words of the Mishnah. Preserve their source offsets and text unchanged.
  const citations=[];
  for(const m of text.matchAll(/\([^()]*\)/gu)){
   const plain=m[0].slice(1,-1).normalize('NFD').replace(/[\u0591-\u05c7]/gu,'').trim();
   if(/^(?:בראשית|שמות|ויקרא|במדבר|דברים|יהושע|שופטים|שמואל|מלכים|ישעיה|ירמיה|יחזקאל|הושע|יואל|עמוס|עובדיה|יונה|מיכה|נחום|חבקוק|צפניה|חגי|זכריה|מלאכי|תהלים|משלי|איוב|קהלת|רות|אסתר)\s+[א-ת׳״"']{1,5}\s*[,;:]\s*[א-ת׳״"']{1,5}$/u.test(plain))citations.push([m.index,m.index+m[0].length]);
  }
  return [...text.matchAll(/[א-ת][א-ת\u0591-\u05c7]*(?:[׳״’'][א-ת\u0591-\u05c7]*)?/gu)].filter(m=>!citations.some(([a,b])=>m.index>=a&&m.index<b)).map(m=>({word:m[0],start:m.index,end:m.index+m[0].length,key:normalize(m[0])}));
 }
 const form=(D,id)=>D?.forms?.[id]||null;
 function match(D,title,ch,m,words){const ids=D.sources?.[title]?.chapters?.[ch-1]?.[m-1];if(!ids||ids.length!==words.length)return null;return words.every((w,i)=>normalize(typeof w==='string'?w:w.word)===D.forms[ids[i]].key)?ids:null;}
 function headLemma(a){const parts=String(a.morph||'').slice(1).split('/'),ls=String(a.lemma||'').split('/');let i=parts.findIndex(p=>/^[NVA]/.test(p));if(i<0)i=parts.findIndex(p=>/^[PD]/.test(p));if(i<0)i=0;const at=parts.slice(0,i).filter(p=>!/^S/.test(p)).length;return ls[at]||ls.at(-1)||'';}
 function forms(D,lemma){
  const groups=new Map();
  for(const f of D.forms)if(f.analyses.some(a=>headLemma(a)===lemma)){
   const r=groups.get(f.key)||{word:f.word,count:0,analyses:[]};r.count+=f.count;
   for(const a of f.analyses)if(headLemma(a)===lemma&&!r.analyses.some(b=>a.lemma===b.lemma&&a.morph===b.morph))r.analyses.push(a);
   groups.set(f.key,r);
  }
  return [...groups.values()].sort((a,b)=>b.count-a.count||a.word.localeCompare(b.word,'he'));
 }
 const api={normalize,tokens,form,match,headLemma,forms};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MishnahMorph=api;
})(typeof window==='undefined'?globalThis:window);
