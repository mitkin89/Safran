// Exact-source morphology for Josephus and Philo. OGA and Gorman remain separate datasets.
(function(global){
'use strict';
const node=typeof module==='object'&&module.exports,GM=node?require('./gmorph'):global.GMorph;
const norm=s=>String(s).normalize('NFC').toLowerCase().replace(/ς/g,'σ').replace(/[᾿’'ʼ]/g,'').replace(/[^\p{L}\p{M}]/gu,'');
function entries(D,locus){
 const encoded=D?.P?.[locus];if(typeof encoded!=='string')return null;
 return encoded?encoded.split('.').map(x=>{const id=parseInt(x,36),e=D.E?.[id];if(!Array.isArray(e))return null;return {form:D.F?.[e[0]],lemma:D.L?.[e[1]]||null,tag:D.T?.[e[2]]||null};}):[];
}
function at(doc,path,label,displayWords,manual){
 const D=doc?.greekMorphology;
 if(D?.version!==1||!doc.textHash||D.textHash!==doc.textHash||!Array.isArray(path))return null;
 const selected=D.locator?.[JSON.stringify([...path,String(label)])],loci=Array.isArray(selected)?selected:[selected],out=[];
 if(!loci.length)return null;
 for(const locus of loci){
  const base=entries(D,locus);if(!base||base.some(r=>!r||typeof r.form!=='string'))return null;
  const part=base.map(r=>({...r,analysis:'auto',source:'oga',locus}));
  if(manual?.work===D.work){
   const ms=entries(manual,locus);
   if(ms&&ms.every(r=>r&&typeof r.form==='string')&&ms.map(r=>norm(r.form)).join('')===base.map(r=>norm(r.form)).join('')){
    const spans=new Map();let offset=0;
    for(const r of ms){const size=norm(r.form).length;spans.set(offset+':'+(offset+size),r);offset+=size;}
    offset=0;
    base.forEach((r,i)=>{const size=norm(r.form).length,m=spans.get(offset+':'+(offset+size));if(m?.lemma&&m.tag)part[i]={...m,form:r.form,analysis:'manual',source:'gorman',locus};offset+=size;});
   }
  }
  out.push(...part);
 }
 if(out.length!==displayWords.length||out.some((r,i)=>!r||r.form?.normalize('NFC')!==displayWords[i].normalize('NFC')))return null;
 return {work:D.work,locus:loci.join(', '),loci,records:out};
}
function key(tag){
 if(!/^[a-z0-9-]{9}$/.test(tag||''))return '';
 const pos={n:'N',v:'V',a:'A',l:'T',p:'P',r:'R',c:'C',d:'D',g:'X',i:'I',m:'M',x:'X'}[tag[0]]||'X',parts=[pos];
 const tense={p:'pres',i:'imperf',f:'fut',a:'aor',r:'perf',l:'plup',t:'futperf'},mood={i:'ind',s:'subj',o:'opt',m:'imperat',n:'inf',p:'ptc'},voice={a:'act',m:'mid',p:'pass',e:'mid/pass'},number={s:'sg',p:'pl',d:'dual'},gender={m:'masc',f:'fem',n:'neut'},cas={n:'nom',g:'gen',d:'dat',a:'acc',v:'voc'},degree={c:'comp',s:'superl'};
 if(tense[tag[3]])parts.push(tense[tag[3]]);if(mood[tag[4]])parts.push(mood[tag[4]]);if(voice[tag[5]])parts.push(voice[tag[5]]);
 if(/[123]/.test(tag[1]))parts.push({1:'1st',2:'2nd',3:'3rd'}[tag[1]]);
 for(const x of [number[tag[2]],gender[tag[6]],cas[tag[7]],degree[tag[8]]])if(x)parts.push(x);
 return parts.join(' ');
}
const api={at,key,describe:(tag,t)=>GM.describe(key(tag),t),entries};if(node)module.exports=api;else global.GreekCorpus=api;
})(typeof window==='object'?window:globalThis);
