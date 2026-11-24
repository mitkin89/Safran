(function(root){
 'use strict';
 const Cite=typeof module!=='undefined'?require('./research-citations'):root.ResearchCitations;
 function html(b,esc){
  const p=b.presentation;if(!p)return '';
  const font=n=>typeof n==='number'&&Number.isFinite(n)&&n>=8&&n<=36?' style="font-size:'+n+'pt"':'';
  const reverse=p.mode==='interlinear'&&/^(?:Hebrew|he)$/i.test(p.companion.citation.language);
  const originalSize=reverse?p.translationSize:p.sourceSize,glossSize=reverse?p.sourceSize:p.translationSize;
  const para=s=>esc(s).replace(/\n/g,'<br>');
  const content=p.mode==='interlinear'?p.rows.map(r=>'<div class="rw-interlinear" dir="rtl"><span class="rw-verse">'+esc(r.label)+'</span>'+r.groups.map(g=>'<span class="rw-wordgroup"><span dir="rtl"'+font(originalSize)+'>'+esc(g.original)+'</span><span dir="auto"'+font(glossSize)+'>'+esc(g.translation)+'</span></span>').join('')+'</div>').join(''):'<table class="rw-parallel"><tbody>'+p.rows.map(r=>'<tr><td'+font(p.sourceSize)+'><p dir="auto">'+esc(r.label)+'  '+para(r.original)+'</p></td><td'+font(p.translationSize)+'><p dir="auto">'+esc(r.targetLabel)+'  '+(r.missing?'<span class="rw-missing">[Keine Übersetzung für diese Zeile]</span>':para(r.translation))+'</p></td></tr>').join('')+'</tbody></table>';
  return '<div class="rw-bilingual nt"><div class="rw-pair-editions"><span title="'+esc(Cite.full(reverse?p.companion.citation:b.citation))+'">'+esc(Cite.heading(reverse?p.companion.citation:b.citation))+'</span><span title="'+esc(Cite.full(reverse?b.citation:p.companion.citation))+'">'+esc(Cite.heading(reverse?b.citation:p.companion.citation))+'</span></div>'+content+'</div>';
 }
 const api={html};if(typeof module!=='undefined')module.exports=api;else root.ResearchPresentation=api;
})(typeof window==='undefined'?globalThis:window);
