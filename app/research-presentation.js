(function(root){
 'use strict';
 const Cite=typeof module!=='undefined'?require('./research-citations'):root.ResearchCitations;
 function textHtml(s,esc){return String(s??'').split('\n').map(line=>/^\[Fußnote /.test(line)?'<span class="rw-segment-footnote" style="font-size:80%" dir="auto">'+esc(line)+'</span>':esc(line)).join('<br>');}
 function footnotes(s){return String(s??'').split('\n').filter(line=>/^\[Fußnote /.test(line)).join('\n');}
 function html(b,esc){
  const p=b.presentation;if(!p)return '';
  const cssFont=n=>typeof n==='number'&&Number.isFinite(n)&&n>=8&&n<=36?'font-size:'+n+'pt':'',font=n=>cssFont(n)?' style="'+cssFont(n)+'"':'',para=s=>textHtml(s,esc);
  const heads=label=>(p.readerHeadings||[]).filter(h=>h.before===label).map(h=>'<h3 class="rw-reader-heading" dir="auto">'+esc(h.text)+'</h3>').join('');
  function groups(pair,row){const reverse=/^(?:Hebrew|he)$/i.test(pair.companion.citation.language),originalSize=reverse?pair.translationSize:pair.sourceSize,glossSize=reverse?pair.sourceSize:pair.translationSize;
   return '<div class="rw-interlinear" dir="rtl"><span class="rw-verse">'+esc(row.label)+'</span>'+row.groups.map(g=>'<span class="rw-wordgroup"><span dir="rtl"'+font(originalSize)+'>'+esc(g.original)+'</span><span dir="auto"'+font(glossSize)+'>'+esc(g.translation)+'</span></span>').join('')+'</div>'+[row.original,row.translation].map(footnotes).filter(Boolean).map(s=>'<p class="rw-segment-footnotes">'+para(s)+'</p>').join('');
  }
  if(p.mode==='interlinear'){
   if(p.additional?.length)return [p,...p.additional].map(pair=>html({...b,presentation:{...pair,additional:[]}},esc)).join('');
   const reverse=/^(?:Hebrew|he)$/i.test(p.companion.citation.language),citations=reverse?[p.companion.citation,b.citation]:[b.citation,p.companion.citation];
   return '<div class="rw-bilingual nt"><div class="rw-pair-editions">'+citations.map(c=>'<span title="'+esc(Cite.full(c))+'">'+esc(Cite.heading(c))+'</span>').join('')+'</div>'+p.rows.map(r=>heads(r.label)+groups(p,r)).join('')+'</div>';
  }
  const pairs=[p,...(p.additional||[])],citations=[b.citation,...pairs.map(x=>x.companion.citation)],width=100/citations.length,cellFont=n=>pairs.length===1?font(n):' style="width:'+width+'%;'+cssFont(n)+'"';
  const original=(r,i)=>p.originalInterlinear?.length?'<div class="rw-reader-interlinear">'+p.originalInterlinear.map(pair=>groups({...pair,sourceSize:p.sourceSize||pair.sourceSize},pair.rows[i])).join('')+'</div>':'<p dir="auto">'+esc(r.label)+'  '+para(r.original)+'</p>';
  return '<div class="rw-bilingual '+(pairs.length>1?'rw-multilingual ':'')+'nt"><div class="rw-pair-editions">'+citations.map((c,i)=>'<span title="'+esc(Cite.full(c))+'">'+esc(Cite.heading(c))+(i===0&&p.originalInterlinear?.length?'<small class="rw-interlinear-sources">'+p.originalInterlinear.map(x=>esc(Cite.edition(x.companion.citation))).join(' · ')+'</small>':'')+'</span>').join('')+'</div><table class="rw-parallel"><tbody>'+p.rows.map((r,i)=>(heads(r.label)?'<tr><td colspan="'+citations.length+'">'+heads(r.label)+'</td></tr>':'')+'<tr><td'+cellFont(p.sourceSize)+'>'+original(r,i)+'</td>'+pairs.map(pair=>{const row=pair.rows[i];return '<td'+cellFont(pair.translationSize)+'><p dir="auto">'+esc(row?.targetLabel||r.label)+'  '+(row?.missing||!row?'<span class="rw-missing">[Keine Übersetzung für diese Zeile]</span>':para(row.translation))+'</p></td>';}).join('')+'</tr>').join('')+'</tbody></table></div>';
 }
 const api={html,textHtml,footnotes};if(typeof module!=='undefined')module.exports=api;else root.ResearchPresentation=api;
})(typeof window==='undefined'?globalThis:window);
