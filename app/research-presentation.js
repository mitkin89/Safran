(function(root){
 'use strict';
 const Cite=typeof module!=='undefined'?require('./research-citations'):root.ResearchCitations;
 function textHtml(s,esc){return String(s??'').split('\n').map(line=>/^\[Fußnote /.test(line)?'<span class="rw-segment-footnote" style="font-size:80%" dir="auto">'+esc(line)+'</span>':esc(line)).join('<br>');}
 function footnotes(s){return String(s??'').split('\n').filter(line=>/^\[Fußnote /.test(line)).join('\n');}
 // Only reader witnesses share the reader's already merged word boundaries.
 function stacked(pairs){
  if(!pairs.length||pairs.some(p=>!p.readerWitness||p.mode!=='interlinear'))return null;
  const first=pairs[0];
  if(pairs.some(p=>p.rows.length!==first.rows.length||p.rows.some((r,i)=>r.label!==first.rows[i].label||r.groups.length!==first.rows[i].groups.length||r.groups.some((g,j)=>g.original!==first.rows[i].groups[j].original))))return null;
  return first.rows.map((r,i)=>({...r,groups:r.groups.map((g,j)=>({original:g.original,lines:pairs.map(p=>({text:p.rows[i].groups[j].translation,transliteration:p.rows[i].groups[j].transliteration||'',source:p.readerWitness,size:p.translationSize,language:p.companion.citation.language}))}))}));
 }
 function html(b,esc){
  const p=b.presentation;if(!p)return '';
  const cssFont=n=>typeof n==='number'&&Number.isFinite(n)&&n>=8&&n<=36?'font-size:'+n+'pt':'',font=n=>cssFont(n)?' style="'+cssFont(n)+'"':'',para=s=>textHtml(s,esc);
  const heads=label=>(p.readerHeadings||[]).filter(h=>h.before===label).map(h=>'<h3 class="rw-reader-heading" dir="auto">'+esc(h.text)+'</h3>').join('');
  function groups(pair,row){const reverse=!pair.readerWitness&&/^(?:Hebrew|he)$/i.test(pair.companion.citation.language),originalSize=reverse?pair.translationSize:pair.sourceSize,glossSize=reverse?pair.sourceSize:pair.translationSize;
   return '<div class="rw-interlinear" dir="rtl"><span class="rw-verse">'+esc(row.label)+'</span>'+row.groups.map(g=>'<span class="rw-wordgroup"><span dir="rtl"'+font(originalSize)+'>'+esc(g.original)+'</span><span dir="auto"'+font(glossSize)+'>'+esc(g.translation)+(g.transliteration?'<small class="rw-transliteration" lang="he" dir="rtl">'+esc(g.transliteration)+'</small>':'')+'</span></span>').join('')+'</div>'+[row.original,row.translation].map(footnotes).filter(Boolean).map(s=>'<p class="rw-segment-footnotes">'+para(s)+'</p>').join('');
  }
  function stackHtml(pairs,rows=stacked(pairs)){
   return rows.map(row=>'<div class="rw-interlinear rw-stacked" dir="rtl"><span class="rw-verse">'+esc(row.label)+'</span>'+row.groups.map(g=>'<span class="rw-wordgroup"><span class="rw-original" lang="he" dir="rtl"'+font(p.sourceSize||pairs[0].sourceSize)+'>'+esc(g.original)+'</span>'+g.lines.map(line=>'<span class="rw-gloss" data-witness="'+esc(line.source)+'" lang="'+esc(line.source==='Peshitta'?'syr':line.source==='LXX'?'grc':line.source==='Onkelos'?'arc':'he')+'" dir="'+(line.source==='LXX'?'ltr':'rtl')+'"'+font(line.size)+'>'+esc(line.text)+(line.transliteration?'<small class="rw-transliteration" lang="he" dir="rtl">'+esc(line.transliteration)+'</small>':'')+'</span>').join('')+'</span>').join('')+'</div>'+pairs.flatMap(pair=>[pair.rows.find(r=>r.label===row.label)?.original,pair.rows.find(r=>r.label===row.label)?.translation]).map(footnotes).filter((s,i,a)=>s&&a.indexOf(s)===i).map(s=>'<p class="rw-segment-footnotes">'+para(s)+'</p>').join('')).join('');
  }
  if(p.mode==='interlinear'){
   const combined=stacked([p,...(p.additional||[])]);
   if(combined)return '<div class="rw-bilingual nt"><div class="rw-pair-editions">'+[b.citation,p.companion.citation,...(p.additional||[]).map(x=>x.companion.citation)].map(c=>'<span>'+esc(Cite.heading(c))+'</span>').join('')+'</div>'+combined.map(row=>heads(row.label)+stackHtml([p,...(p.additional||[])],[row])).join('')+'</div>';
   if(p.additional?.length)return [p,...p.additional].map(pair=>html({...b,presentation:{...pair,additional:[]}},esc)).join('');
   const reverse=!p.readerWitness&&/^(?:Hebrew|he)$/i.test(p.companion.citation.language),citations=reverse?[p.companion.citation,b.citation]:[b.citation,p.companion.citation];
   return '<div class="rw-bilingual nt"><div class="rw-pair-editions">'+citations.map(c=>'<span title="'+esc(Cite.full(c))+'">'+esc(Cite.heading(c))+'</span>').join('')+'</div>'+p.rows.map(r=>heads(r.label)+groups(p,r)).join('')+'</div>';
  }
  const pairs=[p,...(p.additional||[])],citations=[b.citation,...pairs.map(x=>x.companion.citation)],width=100/citations.length,cellFont=n=>pairs.length===1?font(n):' style="width:'+width+'%;'+cssFont(n)+'"';
  const stackedOriginal=stacked(p.originalInterlinear||[]);
  const original=(r,i)=>p.originalInterlinear?.length?'<div class="rw-reader-interlinear">'+(stackedOriginal?stackHtml(p.originalInterlinear,[stackedOriginal[i]]):p.originalInterlinear.map(pair=>groups({...pair,sourceSize:p.sourceSize||pair.sourceSize},pair.rows[i])).join(''))+'</div>':'<p dir="auto">'+esc(r.label)+'  '+para(r.original)+'</p>';
  return '<div class="rw-bilingual '+(pairs.length>1?'rw-multilingual ':'')+'nt"><div class="rw-pair-editions">'+citations.map((c,i)=>'<span title="'+esc(Cite.full(c))+'">'+esc(Cite.heading(c))+(i===0&&p.originalInterlinear?.length?'<small class="rw-interlinear-sources">'+p.originalInterlinear.map(x=>esc(Cite.edition(x.companion.citation))).join(' · ')+'</small>':'')+'</span>').join('')+'</div><table class="rw-parallel"><tbody>'+p.rows.map((r,i)=>(heads(r.label)?'<tr><td colspan="'+citations.length+'">'+heads(r.label)+'</td></tr>':'')+'<tr><td'+cellFont(p.sourceSize)+'>'+original(r,i)+'</td>'+pairs.map(pair=>{const row=pair.rows[i];return '<td'+cellFont(pair.translationSize)+'><p dir="auto">'+esc(row?.targetLabel||r.label)+'  '+(row?.missing||!row?'<span class="rw-missing">[Keine Übersetzung für diese Zeile]</span>':para(row.translation))+'</p></td>';}).join('')+'</tr>').join('')+'</tbody></table></div>';
 }
 const interlinearCSS='.rw-stacked{gap:14px 20px;align-items:flex-start}.rw-stacked .rw-wordgroup{break-inside:avoid;page-break-inside:avoid;gap:4px;max-width:100%}.rw-stacked .rw-original{line-height:1.7}.rw-stacked .rw-gloss{font-size:.7em;display:block;min-height:1.7em;line-height:1.7;white-space:pre-wrap}.rw-stacked .rw-gloss[lang=syr]{font-family:"Safran Syriac",serif;min-height:3.1em}.rw-transliteration{display:block;font-family:"SBL Hebrew",serif;font-size:.8em;line-height:1.4;color:#777}.rw-stacked .rw-verse{align-self:flex-start}.rw-bilingual .rw-pair-editions{flex-wrap:wrap}.rw-bilingual .rw-pair-editions span{min-width:100px}';
 const api={html,textHtml,footnotes,stacked,interlinearCSS};if(typeof module!=='undefined')module.exports=api;else root.ResearchPresentation=api;
})(typeof window==='undefined'?globalThis:window);
