(function(){
'use strict';
function render(data,{esc,t}){
 if(!data)return '';
 if(data.unavailable||!data.trees?.length)return '<p class="muted">'+esc(t('Für diesen Treffer ist kein abgeglichener Satzbaum verfügbar.'))+'</p>';
 const roles={s:'Subjekt',v:'Verb',o:'Direktes Objekt',o2:'Zweites Objekt (MACULA o2)',pp:'Präpositionalgruppe',adv:'Adverbial (MACULA adv)',p:'Prädikativ'};
 const kinds={cl:'Klausel',np:'Nominalgruppe',pp:'Präpositionalgruppe',vp:'Verbgruppe',adjp:'Adjektivgruppe',relp:'Relativgruppe',sentence:'Satz'};
 const node=n=>{
  if(n.kind==='omitted')return '<li class="muted">…</li>';
  const label=[...new Set([roles[n.role]?t(roles[n.role]):n.role||'',n.kind!=='word'?t(kinds[n.kind]||n.kind):'',n.rule||''].filter(Boolean))].join(' · ');
  const word=n.kind==='word'?`<bdi lang="he" class="${n.matched?'pvhl ':''}${!n.aligned?'sxTreeUnmapped':''}">${esc(n.form)}</bdi> <small>${esc(n.ref)}${!n.aligned?' · '+esc(t('nicht am Lesetext verankert')):''}</small>`:'';
  return '<li><span class="sxTreeNode">'+(label?'<small>'+esc(label)+'</small> ':'')+word+'</span>'+(n.children?.length?'<ul>'+n.children.map(node).join('')+'</ul>':'')+'</li>';
 };
 return '<details class="sxSourceTree"><summary>'+esc(t('Satzbaum der Quelle'))+'</summary><p class="muted">'+esc(t('MACULA-Satzstruktur; markiert sind die am Lesetext verankerten Trefferwörter. Quellsegmente können ein Lesewort aufteilen.'))+'</p><div class="sxTreeScroll">'+data.trees.map(tree=>'<h4>'+esc(tree.id)+'</h4><ul class="sxSentenceTree">'+tree.children.map(node).join('')+'</ul>').join('')+'</div>'+(data.omitted||data.omittedTrees?'<p class="muted">'+esc(t('Satzbaumanzeige gekürzt.'))+'</p>':'')+'<small>MACULA Hebrew · '+esc(data.source)+'</small></details>';
}
const api={render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.SyntaxTree=api;
})();
