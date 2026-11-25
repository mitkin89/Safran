// Context-aware reading aid for LSJ and Pape. Published dictionary text stays intact.
(function(root){
 'use strict';
 const D=typeof module!=='undefined'&&module.exports?require('./greek-abbreviations-data'):root.GreekAbbreviationsData;
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const canon=s=>s.replace(/\s+/g,'').replace(/\.$/,'');
 const cache={};
 function dictionary(name){return /Liddell\s*&\s*Scott|\bLSJ\b/i.test(name)?'lsj':/\bPape\b/i.test(name)?'pape':null;}
 function prepare(lex){
  if(cache[lex])return cache[lex];
  const d=D[lex],works={};
  for(const [author,entries]of Object.entries(d.works))for(const [key,titles]of Object.entries(entries)){
   const list=works[key]||(works[key]=[]);for(const title of titles)if(!list.some(x=>x.title===title&&x.author===author))list.push({author,title});
  }
  const keys=[...new Set([...Object.keys(d.terms),...Object.keys(d.authors),...Object.keys(works)])].sort((a,b)=>b.length-a.length);
  const pattern=keys.map(k=>k.split('.').map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\.?\\s*')+'\\.?').join('|');
  return cache[lex]={d,works,re:new RegExp('(?<![\\p{L}\\p{N}])(?:'+pattern+')(?![\\p{L}])','gu')};
 }
 function mark(html,name){
  const lex=dictionary(name);if(!lex)return html;
  const {d,works,re}=prepare(lex);
  // Re-evaluate earlier general-list markup too: Arist.Ath. denotes a work,
  // whereas standalone Ath. can denote Athenaeus.
  const clean=String(html).replace(/<abbr\b[^>]*class="[^"]*\bgab\b[^"]*"[^>]*>([\s\S]*?)<\/abbr>/g,'$1');
  const parts=clean.split(/(<[^>]+>)/g),runs=[];let plain='',skip=0;
  for(let i=0;i<parts.length;i++){
   const p=parts[i];if(p.startsWith('<')){if(/^<(?:script|style)\b/i.test(p))skip++;else if(/^<\/(?:script|style)>/i.test(p))skip=Math.max(0,skip-1);continue;}
   runs.push({i,start:plain.length,end:plain.length+p.length,skip});plain+=p;
  }
  const skipped=runs.filter(r=>r.skip),matches=[];let context=[],contextEnd=-1000;
  re.lastIndex=0;
  for(const m of plain.matchAll(re)){
   const raw=m[0],key=canon(raw),start=m.index,end=start+raw.length,after=plain.slice(end);
   if(skipped.some(r=>start>=r.start&&start<r.end))continue;
   const hasDot=/\./.test(raw)||after.startsWith('.'),citation=/^[.\s]*(?:(?:pp?|fr|vv?|vol|cap)\.[.\s]*)?(?:\d|[ivx]+\b)/i.test(after),authors=d.authors[key],entries=works[key]||[];
   // Bare words are not abbreviations. Undotted source sigla need a following locator.
   if(!hasDot&&!citation)continue;
   // Pape explicitly defines these position labels AFTER a numbered locator.
   if(lex==='pape'&&/^[AEM]$/.test(key)&&!/[0-9]\s*$/.test(plain.slice(Math.max(0,start-12),start)))continue;
   const live=start-contextEnd<400&&!/[\n]/.test(plain.slice(contextEnd,start));
   const contextual=live?entries.filter(x=>context.includes(x.author)):[];
   let explanation;
   if(contextual.length&&(citation||hasDot)){
    explanation=[...new Set(contextual.map(x=>x.author+' — '+x.title))].join('; ');contextEnd=end;
   }else if(authors){
    const nextKey=canon((/^[.\s]*([A-Za-z]+\.?)/.exec(after)||[])[1]||'');
    const followedByWork=authors.some(a=>d.works[a]?.[nextKey]);
    if(key.length===1&&!citation&&!followedByWork)continue;
    context=authors;contextEnd=end;explanation=authors.length>1?'Mehrdeutig: '+authors.join(' / '):authors[0];
   }else if(d.terms[key]){
    if(key.length===1&&!hasDot)continue;
    explanation=[...new Set(d.terms[key])].join(' / ');
   }else if(entries.length&&citation){
    const titles=[...new Set(entries.map(x=>x.title))];
    explanation=titles.length===1?titles[0]+' (Werkangabe; Autor aus dem Beleg bestimmen)':'Mehrdeutige Werkangabe: '+titles.join(' / ');
   }
   if(explanation)matches.push({start,end,explanation});
  }
  let n=0;
  for(const run of runs){
   if(run.skip)continue;while(n<matches.length&&matches[n].end<=run.start)n++;
   let pos=run.start,out='';
   for(let j=n;j<matches.length&&matches[j].start<run.end;j++){
    const m=matches[j],a=Math.max(run.start,m.start),b=Math.min(run.end,m.end);if(a>=b)continue;
    out+=plain.slice(pos,a)+'<abbr class="gab greek-abbr" data-t="'+esc(m.explanation)+'" aria-label="'+esc(m.explanation)+'">'+plain.slice(a,b)+'</abbr>';pos=b;
   }
   parts[run.i]=out+plain.slice(pos,run.end);
  }
  return parts.join('');
 }
 const api={mark,dictionary};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GreekAbbreviations=api;
})(typeof window==='undefined'?globalThis:window);
