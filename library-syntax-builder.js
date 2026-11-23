// Nested clause-query editor. Native controls keep the tree keyboard accessible.
window.LibrarySyntaxBuilder=(()=>{
 'use strict';
 function create({root,esc,t,loadRoots}){
  const term=()=>({op:'term',role:'verb',lemma:'',gram:{}});
  let tree={op:'all',children:[{op:'term',role:'subject',lemma:'אלהים, יהוה',gram:{}},{op:'term',role:'verb',lemma:'אמר',gram:{}}]};
  const names={all:'Alle Bedingungen (UND)',any:'Mindestens eine Bedingung (ODER)',not:'Ausschluss (NICHT)',child:'Direkt abhängige Klausel',parent:'Übergeordnete Klausel',later:'Spätere Klausel im selben Vers'};
  const opt=(value,label,on)=>`<option value="${value}"${value===on?' selected':''}>${esc(t(label))}</option>`;
  let families=null,rootRequest=null,rootError=false;
  const bare=value=>String(value||'').replace(/[^א-ת]/g,'');
  function options(n){
    if(!families)return [];
    const query=bare(n.lemma||families.get(n.family)?.root);
    return query?[...families.values()].filter(f=>bare(f.root)===query):[];
  }
  function familyOptions(n){
    if(!families)return opt(n.family||'',rootError?'Wurzelzuordnungen konnten nicht geladen werden.':'Lädt …',n.family||'');
    const xs=options(n);
    if(!xs.some(f=>f.key===n.family))n.family=xs.length===1?xs[0].key:'';
    return opt('',families?'Wortfamilie auswählen':rootError?'Wurzelzuordnungen konnten nicht geladen werden.':'Lädt …',n.family)+xs.map(f=>opt(f.key,f.root+' · '+t(f.lang==='heb'?'Hebräisch':'Aramäisch')+' · Strong '+f.members.slice(0,4).join(', ')+(f.members.length>4?' …':''),n.family)).join('');
  }
  function ensureRoots(){
    if(families)return Promise.resolve();
    if(!rootRequest)rootRequest=Promise.resolve().then(()=>loadRoots()).then(data=>{
      families=new Map();for(const [id,f]of Object.entries(data.roots)){
        const key=f.lang+':'+f.id;if(!families.has(key))families.set(key,{...f,key,members:[]});families.get(key).members.push(id);
      }rootError=false;
    }).catch(()=>{rootError=true;rootRequest=null;});
    return rootRequest;
  }
  const needsFamily=n=>(n.mode==='root'&&!n.family)||n.children?.some(needsFamily)||!!(n.child&&needsFamily(n.child));
  const hasRoot=n=>n.mode==='root'||n.children?.some(hasRoot)||!!(n.child&&hasRoot(n.child));
  function render(n,path=''){
   const remove=path?'<button type="button" data-action="remove" title="'+esc(t('Entfernen'))+'">×</button>':'';
   if(['all','any','not'].includes(n.op))return `<fieldset data-path="${path}"><legend>${esc(t('Bedingungsgruppe'))}</legend><div class="bar"><select data-field="op" aria-label="${esc(t('Verknüpfung'))}">${['all','any','not'].map(x=>opt(x,names[x],n.op)).join('')}</select>${remove}</div>${n.children.map((c,i)=>render(c,path?path+'.'+i:String(i))).join('')}${n.op==='not'?'':`<div class="bar"><button type="button" data-action="term">+ ${esc(t('Bedingung'))}</button><button type="button" data-action="group">+ ${esc(t('Gruppe'))}</button><button type="button" data-action="related">+ ${esc(t('Verknüpfte Klausel'))}</button></div>`}</fieldset>`;
   if(n.op==='related')return `<fieldset data-path="${path}"><legend>${esc(t('Verknüpfte Klausel'))}</legend><div class="bar"><select data-field="relation" aria-label="${esc(t('Klauselbeziehung'))}">${['child','parent','later'].map(x=>opt(x,names[x],n.relation)).join('')}</select>${remove}</div>${render(n.child,path+'.child')}</fieldset>`;
   const roleNames={verb:'Verb',subject:'Ausdrückliches Subjekt',object:'Direktes Objekt',referent:'Gemeintes Subjekt',domain:'Textbereich',relation:'BHSA-Klauselbeziehung'};
   const grammatical=['verb','subject','object','referent'].includes(n.role);
   const lexical=grammatical?`<label>${esc(t('Suchbasis'))}<select data-field="mode">${opt('lemma','Lemma',n.mode||'lemma')}${opt('root','Wortfamilie / Wurzel',n.mode||'lemma')}</select></label>`:'';
   const value=n.role==='domain'?'<select data-field="value" aria-label="'+esc(t('Textbereich'))+'">'+[['N','Erzählung'],['D','Erläuterung des Erzählers'],['Q','Direkte Rede']].map(([v,l])=>opt(v,l,n.value)).join('')+'</select>':n.role==='relation'?'<select data-field="value" aria-label="'+esc(t('BHSA-Klauselbeziehung'))+'">'+window.SyntaxPattern.relations.map(v=>opt(v,v==='Attr'?'Attributiv (Attr)':v,n.value)).join('')+'</select>':`<label>${esc(t(n.mode==='root'?'Wurzel eingeben':'Lemma (leer: beliebig)'))}<input data-field="lemma" lang="he" dir="rtl" maxlength="256" value="${esc(n.lemma||families?.get(n.family)?.root||'')}"></label>`;
   const family=n.mode==='root'?`<label>${esc(t('Belegte Wortfamilie'))}<select data-field="family">${familyOptions(n)}</select></label><small class="muted">${esc(t('Nur belegte Lexikonzuordnungen; gleich geschriebene Wurzeln getrennt auswählen.'))}</small>`:'';
   const features=[
    ['pos','Wortart',[['V','Verb'],['Nc','Nomen'],['Np','Eigenname'],['Ng','Gentilizium'],['A','Adjektiv / Zahl'],['P','Pronomen'],['R','Präposition'],['C','Konjunktion'],['D','Adverb'],['T','Partikel']]],
    ['person','Person',[['1','1.'],['2','2.'],['3','3.']]],
    ['gender','Genus',[['m','m.'],['f','f.'],['c','c.']]],
    ['number','Numerus',[['s','Singular'],['p','Plural'],['d','Dual']]],
    ['state','Status',[['a','absolut'],['c','constructus'],['d','bestimmt / Emphaticus']]],
    ['suffix','Suffix',[['1','mit'],['0','ohne']]],['article','Artikel',[['1','mit'],['0','ohne']]],
    ['stem','Stamm',[['q','Qal'],['N','Nifal'],['p','Piel'],['P','Pual'],['h','Hifil'],['H','Hofal'],['t','Hitpael'],['o','Polel'],['O','Polal'],['r','Hitpolel'],['a','Af‘el (aram.)'],['i','Itpe‘el (aram.)'],['G','Itaf‘al (aram.)']]],
    ['tense','Zeit/Form',[['p','Perfekt'],['i','Imperfekt'],['w','Wayyiqtol'],['q','Weqatal'],['v','Imperativ'],['h','Kohortativ'],['j','Jussiv'],['r','Partizip aktiv'],['s','Partizip passiv'],['c','Infinitiv constructus'],['a','Infinitiv absolutus']]],
   ].filter(([key])=>n.role!=='verb'||key!=='pos');
   const grammar=grammatical?`<details class="sxRoleFeatures"${Object.values(n.gram||{}).some(Boolean)?' open':''}><summary>${esc(t('Wortmerkmale am Kernwort'))}</summary><div class="bar">${features.map(([key,label,values])=>`<label>${esc(t(label))}<select data-gram="${key}">${opt('','Beliebig',n.gram?.[key]||'')}${values.map(([v,l])=>opt(v,l,n.gram?.[key])).join('')}</select></label>`).join('')}</div></details>`:'';
   const positions=['verb','subject','object'].includes(n.role)?`<div class="bar sxPosition"><label>${esc(t('Position gegenüber'))}<select data-position="relative">${opt('','Keine Positionsbedingung',n.position?.relative||'')}${['verb','subject','object'].filter(r=>r!==n.role).map(r=>opt(r,roleNames[r],n.position?.relative)).join('')}</select></label>${n.position?`<label>${esc(t('Reihenfolge'))}<select data-position="order">${[['either','Beliebig'],['before','davor'],['after','danach']].map(([v,l])=>opt(v,l,n.position.order)).join('')}</select></label><label>${esc(t('Höchstens Wörter dazwischen (leer: beliebig)'))}<input type="number" min="0" max="200" step="1" data-position="maxGap" value="${n.position.maxGap??''}"></label>`:''}</div>`:'';
   return `<div class="sxCondition" data-path="${path}"><div class="bar"><select data-field="role" aria-label="${esc(t('Bedingung'))}">${Object.entries(roleNames).map(([v,l])=>opt(v,l,n.role)).join('')}</select>${lexical}${value}${family}${remove}</div>${grammar}${positions}</div>`;
  }
  function draw(){root.innerHTML=render(tree);}
  function at(path){return path?path.split('.').reduce((n,k)=>k==='child'?n.child:n.children[+k],tree):tree;}
  function changed(){root.dispatchEvent(new Event('input',{bubbles:true}));}
  root.addEventListener('input',e=>{
   const field=e.target.dataset.field,gram=e.target.dataset.gram,position=e.target.dataset.position;if(!field&&!gram&&!position)return;
   const n=at(e.target.closest('[data-path]').dataset.path);
   if(position){if(position==='relative'){if(e.target.value)n.position={relative:e.target.value,order:n.position?.order||'either',maxGap:n.position?.maxGap??null};else delete n.position;}else if(n.position)n.position[position]=position==='maxGap'?(e.target.value===''?null:Number(e.target.value)):e.target.value;}
   else if(gram){n.gram||={};n.gram[gram]=e.target.value;}else{n[field]=e.target.value;
     if(field==='lemma'&&n.mode==='root'){n.family='';const select=e.target.closest('[data-path]').querySelector('[data-field=family]');if(select){select.innerHTML=familyOptions(n);select.value=n.family;}}
   }
  });
  root.addEventListener('change',e=>{
   const position=e.target.dataset.position;if(position==='relative'){const n=at(e.target.closest('[data-path]').dataset.path);if(e.target.value)n.position={relative:e.target.value,order:n.position?.order||'either',maxGap:n.position?.maxGap??null};else delete n.position;draw();return;}
   const gram=e.target.dataset.gram;if(gram){const n=at(e.target.closest('[data-path]').dataset.path);n.gram||={};n.gram[gram]=e.target.value;return;}
   const field=e.target.dataset.field;if(!field)return;
   const n=at(e.target.closest('[data-path]').dataset.path);n[field]=e.target.value;
   if(field==='op'&&n.op==='not')n.children.length>1&&(n.children=[{op:'all',children:n.children}]);
   if(field==='role'){n.gram={};delete n.position;delete n.mode;delete n.family;n.value=n.role==='domain'?'N':n.role==='relation'?'Attr':'';}
   if(field==='mode'){delete n.family;draw();if(n.mode==='root')ensureRoots().then(()=>{draw();changed();});}
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
  draw();return {set:value=>{if(!window.SyntaxPattern.clean(value))return false;tree=JSON.parse(JSON.stringify(value));draw();if(hasRoot(tree))ensureRoots().then(()=>{draw();changed();});changed();return true;},query:()=>JSON.parse(JSON.stringify(tree)),error:()=>needsFamily(tree)?t('Wähle für jede Wurzelbedingung eine belegte Wortfamilie.'):null,valid:()=>!!window.SyntaxPattern.clean(tree)};
 }
 return {create};
})();
