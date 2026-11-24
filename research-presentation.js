(function(root){
 'use strict';
 function html(b,esc){
  const p=b.presentation;if(!p)return '';
  const para=s=>esc(s).replace(/\n/g,'<br>');
  const content=p.mode==='interlinear'?p.rows.map(r=>'<div class="rw-interlinear" dir="rtl"><span class="rw-verse">'+esc(r.label)+'</span>'+r.groups.map(g=>'<span class="rw-wordgroup"><span dir="rtl">'+esc(g.original)+'</span><span dir="auto">'+esc(g.translation)+'</span></span>').join('')+'</div>').join(''):'<table class="rw-parallel"><tbody>'+p.rows.map(r=>'<tr><td><p dir="auto">'+esc(r.label)+'  '+para(r.original)+'</p></td><td><p dir="auto">'+esc(r.targetLabel)+'  '+para(r.translation)+'</p></td></tr>').join('')+'</tbody></table>';
  const reverse=p.mode==='interlinear'&&p.companion.citation.language==='Hebrew';
  return '<div class="rw-bilingual nt"><div class="rw-pair-editions"><span>'+esc(reverse?p.companion.citation.edition:b.citation?.edition)+'</span><span>'+esc(reverse?b.citation?.edition:p.companion.citation.edition)+'</span></div>'+content+'</div>';
 }
 const api={html};if(typeof module!=='undefined')module.exports=api;else root.ResearchPresentation=api;
})(typeof window==='undefined'?globalThis:window);
