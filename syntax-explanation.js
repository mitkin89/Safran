(function(){
'use strict';
const node=typeof module!=='undefined'&&module.exports;
const Types=node?require('./syntax-types'):window.SyntaxTypes;
const Morph=node?require('./morph'):window.Morph;
function render(explanation,{esc,t}){
 if(!explanation)return '';
 const roles={verb:'Verb',subject:'Subjekt',object:'Direktes Objekt',referent:'Gemeintes Subjekt',domain:'Textbereich',relation:'BHSA-Klauselbeziehung',kind:'Klauselart (BHSA)',clauseType:'Klauseltyp (BHSA)'};
 const code=(role,value)=>{
  const label=role==='kind'?Types.kinds[value]:role==='clauseType'?Types.types[value]:role==='domain'?{N:'Erzählung',D:'Erläuterung des Erzählers',Q:'Direkte Rede'}[value]:value;
  return label&&label!==value?t(label)+' ('+value+')':value||t('unbestimmt');
 };
 const feature=(key,value)=>{
  const labels={pos:'Wortart',stem:'Stamm',tense:'Zeitform',person:'Person',gender:'Genus',number:'Numerus',state:'Status',suffix:'Suffix',article:'Artikel'};
  const values={pos:{V:'Verb',N:'Nomen',Nc:'Nomen',Np:'Eigenname',A:'Adjektiv / Zahl',P:'Pronomen'},stem:{q:'Qal',N:'Nifal',p:'Piel',P:'Pual',h:'Hifil',H:'Hofal',t:'Hitpael'},tense:{p:'Perfekt',i:'Imperfekt',q:'Weqatal',w:'Wayyiqtol',r:'Partizip aktiv',s:'Partizip passiv',a:'Infinitiv absolutus',c:'Infinitiv constructus',v:'Imperativ'},number:{s:'Singular',p:'Plural',d:'Dual'},gender:{f:'f.',m:'m.',c:'c.'},state:{a:'absolut',c:'constructus',d:'bestimmt / Emphaticus'},suffix:{'0':'ohne','1':'mit'},article:{'0':'ohne','1':'mit'}};
  return t(labels[key]||key)+': '+t(values[key]?.[value]||String(value));
 };
 function rule(n,family){
  const label=t(roles[n.role]||n.role);
  if(['domain','relation','kind','clauseType'].includes(n.role))return label+': '+code(n.role,n.value);
  const target=n.mode==='root'?t('Wortfamilie / Wurzel')+' '+(family?.root||n.family)+(family?' · '+t(family.lang==='heb'?'Hebräisch':'Aramäisch'):''):n.lemmas?.length?n.lemmas.join(' / '):t('beliebig');
  const gram=Object.entries(n.gram||{}).map(([key,value])=>feature(key,value));
  if(n.position)gram.push(t('Position gegenüber')+' '+t(roles[n.position.relative])+' · '+t({before:'davor',after:'danach',either:'Beliebig'}[n.position.order])+(n.position.maxGap===null?'':' · '+t('höchstens {} Wörter dazwischen',n.position.maxGap)));
  return [label+': '+target,...gram].join(' · ');
 }
 function word(w,positive){
  const d=w.morph&&Morph?.decode(w.morph,w.lemmaId),s=d?.segs[d.main];
  const details=s?[s.pos,s.stem,s.tense,s.info].filter(Boolean).map(x=>t(x)).join(' · '):'';
  return `<span class="sxProofWord"><bdi lang="he"${positive?' class="pvhl"':''}>${esc(w.text)}</bdi> <small>${esc(w.ref||'')}${w.part==='constituent'?' · '+esc(t('Satzglied; Kernwortposition unbestimmt')):''}${details?' · '+esc(details):''}${w.position?' · '+esc(t('{} Wörter dazwischen',w.position.gap))+' → <bdi lang="he">'+esc(w.position.text)+'</bdi>':''}</small></span>`;
 }
 function expected(n){
  if(n.op==='term')return rule(n,n.familyInfo);
  if(n.op==='related')return t('Verknüpfte Klausel')+': '+expected(n.child);
  return t({all:'Alle Bedingungen (UND)',any:'Mindestens eine Bedingung (ODER)',not:'Ausschluss (NICHT)'}[n.op])+' ['+n.children.map(expected).join('; ')+']';
 }
 function tree(p,showClause=false){
  if(p.truncated)return `<li class="muted">${esc(t('Erklärung gekürzt.'))}</li>`;
  const positive=p.value===true,status=t(positive?'erfüllt':p.value===false?'nicht erfüllt':'nicht auswertbar');
  const label=p.op==='term'?rule(p.rule,p.family):p.op==='related'?t({child:'Direkt abhängige Klausel',parent:'Übergeordnete Klausel',later:'Spätere Klausel im selben Vers'}[p.relation]):t({all:'Alle Bedingungen (UND)',any:'Mindestens eine Bedingung (ODER)',not:'Ausschluss (NICHT)'}[p.op]);
  let body=(showClause&&p.clauseText?'<div class="sxClauseText" lang="he" dir="rtl">'+esc(p.clauseText)+'</div>':'')+(p.words||[]).map(w=>word(w,positive)).join('');
  if(p.op==='term'&&p.actual!==undefined)body+=`<small>${esc(t('Datenwert'))}: ${esc(code(p.rule.role,p.actual))}</small>`;
  if(p.op==='related'&&!p.children?.length)body+=`<small>${esc(t('Gesuchte Bedingung'))}: ${esc(expected(p.expected))}</small><small>${esc(t(p.candidates===null?'Verknüpfung nicht auswertbar.':'Keine passende Klausel unter den auswertbaren Verknüpfungen.'))}</small>`;
  if(p.omitted)body+=`<small>${esc(t('{} weitere passende Zuordnungen',p.omitted))}</small>`;
  if(p.children?.length)body+='<ul>'+p.children.map(child=>tree(child,p.op==='related')).join('')+'</ul>';
  return `<li class="sxProof ${positive?'ok':'muted'}"><div><b>${positive?'✓':p.value===false?'−':'?'}</b> ${esc(label)} <small>· ${esc(status)} · ${esc(t('Klausel {}',p.ref))}</small></div>${body}</li>`;
 }
 const content=explanation.simple?'<ul>'+explanation.conditions.map(c=>tree({op:'term',value:true,rule:c.rule,words:c.words,actual:c.actual,ref:c.ref})).join('')+'</ul>':'<ul>'+explanation.proofs.map(p=>tree(p,true)).join('')+'</ul>';
 return `<details class="sxExplain"><summary>${esc(t('Warum dieser Treffer?'))}</summary>${content}${explanation.omitted?'<p>'+esc(t('{} weitere Treffer im Vers',explanation.omitted))+'</p>':''}<p class="muted">${esc(t('Die Erklärung bezieht sich auf die ausgewerteten Annotationen. Fehlende Daten werden nicht als erfüllter Ausschluss gewertet.'))}</p></details>`;
}
const api={render};if(node)module.exports=api;else window.SyntaxExplanation=api;
})();
