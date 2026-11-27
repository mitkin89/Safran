// Source-position previews for aligned translations. No substring guessing.
(function(){
'use strict';
const tokens=text=>[...String(text||'').matchAll(/[\p{L}\p{M}\p{N}]+/gu)].filter(m=>/[\p{L}\p{N}]/u.test(m[0]));
function targetRange(text,form,position){
 const trim=s=>{const letters=[...s.matchAll(/[\p{L}\p{M}\p{N}]/gu)];return letters.length?[letters[0].index,letters.at(-1).index+letters.at(-1)[0].length]:[0,0];};
 const words=[...String(text).matchAll(/\S+/gu)].map(m=>{const [start,end]=trim(m[0]);return {text:m[0].slice(start,end),start:m.index+start,end:m.index+end};});
 const wanted=String(form||'').trim().split(/\s+/u).map(word=>{const [start,end]=trim(word);return word.slice(start,end);});
 if(!form||!wanted.length)return null;
 const fold=s=>s.normalize('NFC').replace(/[\u0591-\u05bd\u05bf-\u05c7]/gu,'');
 const matches=i=>i>=0&&i+wanted.length<=words.length&&wanted.every((word,j)=>word&&fold(word)===fold(words[i+j].text));
 let index;
 if(position!=null){if(!Number.isInteger(position)||position<1||!matches(position-1))return null;index=position-1;}
 else{const found=words.flatMap((_,i)=>matches(i)?[i]:[]);if(found.length!==1)return null;index=found[0];}
 return [words[index].start,words[index+wanted.length-1].end];
}
// All occurrences of attested source forms, preserving offsets in the original text.
function targetRanges(text,forms){
 const fold=s=>String(s).normalize('NFD').replace(/[\u0591-\u05c7\u0730-\u074a]/gu,'').normalize('NFC');
 const wanted=new Set((forms||[]).map(fold));
 return tokens(text).filter(m=>wanted.has(fold(m[0]))).map(m=>[m.index,m.index+m[0].length]);
}
function render(hit,esc){
 if(typeof hit?.context!=='string'||!Array.isArray(hit.positions)||!hit.positions.length)return null;
 const ts=tokens(hit.context),at=[...new Set(hit.positions)].sort((a,b)=>a-b);
 if(at.some(i=>!Number.isInteger(i)||i<1||!ts[i-1]))return null;
 if(at.map(i=>ts[i-1][0]).join(' ')!==tokens((hit.words||[]).join(' ')).map(m=>m[0]).join(' '))return null;
 let end=0,html='';
 for(const i of at){const token=ts[i-1];html+=esc(hit.context.slice(end,token.index))+'<span class="pvhl">'+esc(token[0])+'</span>';end=token.index+token[0].length;}
 html+=esc(hit.context.slice(end));
 const lang=hit.language==='Syriac'?'syr':hit.kind==='he'?'he':'grc',rtl=lang!=='grc';
 return `<div class="pvp concordancePreview" lang="${lang}" dir="${rtl?'rtl':'ltr'}">${html}</div>`;
}
function statusHtml(coverage,{esc,t,loc}){
 const editions=(coverage?.editions||[]).filter(e=>e.peshittaStatus?.stage==='documented-gaps');
 if(!editions.length)return '';
 const total={withLemma:0,unassigned:0},gaps=new Map(),provenance={};
 for(const e of editions){total.withLemma+=e.withLemma;total.unassigned+=e.peshittaStatus.unassigned;
  for(const gap of e.peshittaStatus.gaps){if(!gaps.has(gap.id))gaps.set(gap.id,{label:gap.label,count:0});gaps.get(gap.id).count+=gap.count;}
  for(const [kind,n]of Object.entries(e.peshittaStatus.provenance))provenance[kind]=(provenance[kind]||0)+n;
 }
 const count=n=>n.toLocaleString(loc),labels={original:'Quellenanalysen',parallel:'Übernahmen aus Paralleltexten',automatic:'Automatische Abgleiche',aiContext:'KI-Kontextentscheidungen'};
 const sources=Object.entries(provenance).filter(([,n])=>n).map(([kind,n])=>`<li>${esc(t(labels[kind]))}: ${count(n)}</li>`).join('');
 const pending=[...gaps.values()].map(g=>`<li>${esc(t(g.label))}: ${count(g.count)}</li>`).join('');
 return `<section class="ccDataStatus" aria-label="${esc(t('Peschitta-Datenstand'))}"><p><strong>${esc(t('Peschitta: {} Hauptlemma-Zuordnungen · {} dokumentierte Datenlücken',count(total.withLemma),count(total.unassigned)))}</strong></p>
 <p>${esc(t('Für die hier durchsuchten Peschitta-Fassungen. Die Herkunft steht am Treffer; Hauptlemma-Abdeckung bedeutet keine vollständige Wortanalyse oder unabhängige fachliche Prüfung.'))}</p>
 <details><summary>${esc(t('Herkunft und offene Stellen'))}</summary><ul>${sources}</ul>${pending?`<ul>${pending}</ul>`:''}
 <p>${esc(t('Stellen ohne Hauptlemma bleiben über ihre Wortform auffindbar.'))}</p></details></section>`;
}
function attach(root,{getHit,getHover}){
 let anchor=null;
 const selector='.ccPeer[data-cp], .ccRow[data-i]';
 const hide=()=>{if(anchor){getHover()?.hide();anchor=null;}};
 const start=e=>{
  const a=e.target.closest(selector);if(!a||a===anchor)return;
  const hit=getHit(+a.dataset.i,a.dataset.cp),hover=getHover();
  if(!hit||!hover)return;
  anchor=a;hover.start(a,[hit.title,hit.where].filter(Boolean).join(' · '),true,false,{concordance:hit});
 };
 const stop=e=>{const a=e.target.closest(selector);if(a&&a===anchor&&!a.contains(e.relatedTarget))hide();};
 root.addEventListener('mouseover',start);root.addEventListener('focusin',start);
 root.addEventListener('mouseout',stop);root.addEventListener('focusout',stop);
 root.addEventListener('click',hide);
 root.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const a=e.target.closest(selector);if(a&&e.target===a){e.preventDefault();hide();a.click();}}});
 root.ownerDocument.addEventListener('scroll',hide,true);
 if(typeof MutationObserver!=='undefined')new MutationObserver(hide).observe(root,{childList:true});
}
const api={render,statusHtml,attach,targetRange,targetRanges};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.ConcordancePreview=api;
})();
