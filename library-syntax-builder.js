// Nested clause-query editor. Native controls keep the tree keyboard accessible.
window.LibrarySyntaxBuilder=(()=>{
 'use strict';
 function create({root,esc,t}){
  const term=()=>({op:'term',role:'verb',lemma:'',gram:{}});
  let tree={op:'all',children:[{op:'term',role:'subject',lemma:'אלהים, יהוה',gram:{}},{op:'term',role:'verb',lemma:'אמר',gram:{}}]};
  const names={all:'Alle Bedingungen (UND)',any:'Mindestens eine Bedingung (ODER)',not:'Ausschluss (NICHT)',child:'Direkt abhängige Klausel',parent:'Übergeordnete Klausel',later:'Spätere Klausel im selben Vers'};
  const opt=(value,label,on)=>`<option value="${value}"${value===on?' selected':''}>${esc(t(label))}</option>`;
  function render(n,path=''){
   const remove=path?'<button type="button" data-action="remove" title="'+esc(t('Entfernen'))+'">×</button>':'';
   if(['all','any','not'].includes(n.op))return `<fieldset data-path="${path}"><legend>${esc(t('Bedingungsgruppe'))}</legend><div class="bar"><select data-field="op" aria-label="${esc(t('Verknüpfung'))}">${['all','any','not'].map(x=>opt(x,names[x],n.op)).join('')}</select>${remove}</div>${n.children.map((c,i)=>render(c,path?path+'.'+i:String(i))).join('')}${n.op==='not'?'':`<div class="bar"><button type="button" data-action="term">+ ${esc(t('Bedingung'))}</button><button type="button" data-action="group">+ ${esc(t('Gruppe'))}</button><button type="button" data-action="related">+ ${esc(t('Verknüpfte Klausel'))}</button></div>`}</fieldset>`;
   if(n.op==='related')return `<fieldset data-path="${path}"><legend>${esc(t('Verknüpfte Klausel'))}</legend><div class="bar"><select data-field="relation" aria-label="${esc(t('Klauselbeziehung'))}">${['child','parent','later'].map(x=>opt(x,names[x],n.relation)).join('')}</select>${remove}</div>${render(n.child,path+'.child')}</fieldset>`;
   const roleNames={verb:'Verb',subject:'Ausdrückliches Subjekt',object:'Direktes Objekt',referent:'Gemeintes Subjekt',domain:'Textbereich',relation:'BHSA-Klauselbeziehung'};
   const grammatical=n.role==='verb';
   const value=n.role==='domain'?'<select data-field="value" aria-label="'+esc(t('Textbereich'))+'">'+[['N','Erzählung'],['D','Erläuterung des Erzählers'],['Q','Direkte Rede']].map(([v,l])=>opt(v,l,n.value)).join('')+'</select>':n.role==='relation'?'<select data-field="value" aria-label="'+esc(t('BHSA-Klauselbeziehung'))+'">'+window.SyntaxPattern.relations.map(v=>opt(v,v==='Attr'?'Attributiv (Attr)':v,n.value)).join('')+'</select>':`<label>${esc(t('Lemma (leer: beliebig)'))}<input data-field="lemma" lang="he" dir="rtl" maxlength="256" value="${esc(n.lemma||'')}"></label>`;
   const grammar=grammatical?[['stem','Stamm',[['q','Qal'],['N','Nifal'],['p','Piel'],['P','Pual'],['h','Hifil'],['H','Hofal'],['t','Hitpael']]],['tense','Zeit/Form',[['p','Perfekt'],['i','Imperfekt'],['w','Wayyiqtol'],['q','Weqatal'],['v','Imperativ'],['r','Partizip aktiv'],['s','Partizip passiv'],['c','Infinitiv constructus'],['a','Infinitiv absolutus']]]].map(([key,label,values])=>`<label>${esc(t(label))}<select data-gram="${key}">${opt('','Beliebig',n.gram?.[key]||'')}${values.map(([v,l])=>opt(v,l,n.gram?.[key])).join('')}</select></label>`).join(''):'';
   return `<div class="sxCondition" data-path="${path}"><div class="bar"><select data-field="role" aria-label="${esc(t('Bedingung'))}">${Object.entries(roleNames).map(([v,l])=>opt(v,l,n.role)).join('')}</select>${value}${grammar}${remove}</div></div>`;
  }
  function draw(){root.innerHTML=render(tree);}
  function at(path){return path?path.split('.').reduce((n,k)=>k==='child'?n.child:n.children[+k],tree):tree;}
  function changed(){root.dispatchEvent(new Event('input',{bubbles:true}));}
  root.addEventListener('input',e=>{
   const field=e.target.dataset.field,gram=e.target.dataset.gram;if(!field&&!gram)return;
   const n=at(e.target.closest('[data-path]').dataset.path);
   if(gram){n.gram||={};n.gram[gram]=e.target.value;}else n[field]=e.target.value;
  });
  root.addEventListener('change',e=>{
   const field=e.target.dataset.field;if(!field)return;
   const n=at(e.target.closest('[data-path]').dataset.path);n[field]=e.target.value;
   if(field==='op'&&n.op==='not')n.children.length>1&&(n.children=[{op:'all',children:n.children}]);
   if(field==='role'){n.gram={};n.value=n.role==='domain'?'N':n.role==='relation'?'Attr':'';}
   if(['op','role'].includes(field))draw();
  });
  root.addEventListener('click',e=>{
   const b=e.target.closest('[data-action]');if(!b)return;
   const path=b.closest('[data-path]').dataset.path,n=at(path);
   if(b.dataset.action==='remove'){
    const keys=path.split('.'),last=keys.pop(),parent=at(keys.join('.'));
    if(last==='child')parent.child=term();else{parent.children.splice(+last,1);if(!parent.children.length)parent.children.push(term());}
   }else{
    if(n.children.length>=12)return;
    n.children.push(b.dataset.action==='group'?{op:'any',children:[term()]}:b.dataset.action==='related'?{op:'related',relation:'child',child:{op:'all',children:[term()]}}:term());
   }
   draw();changed();
  });
  draw();return {set:value=>{if(!window.SyntaxPattern.clean(value))return false;tree=JSON.parse(JSON.stringify(value));draw();changed();return true;},query:()=>JSON.parse(JSON.stringify(tree)),valid:()=>!!window.SyntaxPattern.clean(tree)};
 }
 return {create};
})();
