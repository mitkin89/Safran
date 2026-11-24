// Nested clause-query editor. Native controls keep the tree keyboard accessible.
window.LibrarySyntaxBuilder=(()=>{
 'use strict';
 function create({root,esc,t,loadRoots}){
  const term=(role='verb')=>({op:'term',role,lemma:'',gram:{}});
  const wordRoles=window.SyntaxPattern.wordRoles;
  const roleNames={recipient:'Empfänger (Arbeitszuordnung)',beneficiary:'Nutznießer (Arbeitszuordnung)',location:'Ort (Arbeitszuordnung)',verb:'Verb',subject:'Ausdrückliches Subjekt',object:'Direktes Objekt',referent:'Gemeintes Subjekt',secondObject:'Zweites Objekt (MACULA o2)',prepositional:'Präpositionalgruppe',adverbial:'Adverbial (MACULA adv)',attribute:'Attribut / Genitiv',domain:'Textbereich',relation:'BHSA-Klauselbeziehung',kind:'Klauselart (BHSA)',clauseType:'Klauseltyp (BHSA)'};
  function boundRole(path){let n=tree,role=null;for(const key of path.split('.').filter(Boolean)){if(n.op==='same')role=n.role;if(n.op==='dependent')role='attribute';n=key==='child'?n.child:n.children[+key];}return role;}
  function variableNames(path){let n=tree,out=[];for(const key of path.split('.').filter(Boolean)){if(n.op==='bind'&&n.name)out.push(n.name);n=key==='child'?n.child:n.children[+key];}return out;}
  let tree={op:'all',children:[{op:'term',role:'subject',lemma:'אלהים, יהוה',gram:{}},{op:'term',role:'verb',lemma:'אמר',gram:{}}]};
  const names={all:'Alle Bedingungen (UND)',any:'Mindestens eine Bedingung (ODER)',not:'Ausschluss (NICHT)',child:'Direkt abhängige Klausel',parent:'Übergeordnete Klausel',later:'Spätere Klausel im selben Vers',ancestor:'Übergeordnete Klauselkette',descendant:'Abhängige Klauselkette'};
  const opt=(value,label,on)=>`<option value="${value}"${value===on?' selected':''}>${esc(t(label))}</option>`;
  const nameEdits=new WeakMap();
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
  const childPath=(path,key)=>path?path+'.'+key:String(key);
  function render(n,path='',shallow=false){
   const scope=boundRole(path);
   const remove=path?'<button type="button" data-action="remove" title="'+esc(t('Entfernen'))+'">×</button>':'';
   if(['all','any','not'].includes(n.op))return `<fieldset data-path="${path}"><legend>${esc(t('Bedingungsgruppe'))}</legend><div class="bar"><select data-field="op" aria-label="${esc(t('Verknüpfung'))}">${['all','any','not'].map(x=>opt(x,names[x],n.op)).join('')}</select>${remove}</div>${n.children.map((c,i)=>shallow?'<button type="button" data-graph-select="'+childPath(path,i)+'">'+esc(t(c.op==='term'?'Bedingung':c.op==='related'?'Verknüpfte Klausel':c.op==='bind'?'Wortvariable':c.op==='same'?'Dasselbe Wort':c.op==='dependent'?'Attribut dieses Wortes':'Bedingungsgruppe'))+' '+(i+1)+'</button>':render(c,childPath(path,i))).join('')}${n.op==='not'?'':`<div class="bar"><button type="button" data-action="term">+ ${esc(t('Bedingung'))}</button><button type="button" data-action="group">+ ${esc(t('Gruppe'))}</button>${scope?(['attribute','referent'].includes(scope)?'':`<button type="button" data-action="dependent">+ ${esc(t('Attribut dieses Wortes'))}</button>`):`<button type="button" data-action="related">+ ${esc(t('Verknüpfte Klausel'))}</button><button type="button" data-action="same">+ ${esc(t('Dasselbe Wort'))}</button><button type="button" data-action="bind">+ ${esc(t('Wortvariable'))}</button>`}</div>`}</fieldset>`;
   if(n.op==='bind')return `<fieldset data-path="${path}"><legend>${esc(t('Wortvariable'))}</legend><p class="muted">${esc(t('Die Variable gilt in diesem Teilbaum, auch in verknüpften Klauseln. Gleicher Referent erfordert einen eindeutigen MACULA-Verweis.'))}</p><div class="bar"><label>${esc(t('Variablenname'))}<input data-field="name" maxlength="24" value="${esc(n.name||'')}"></label><label>${esc(t('Ausgangsrolle'))}<select data-field="bindRole">${wordRoles.map(r=>opt(r,roleNames[r],n.role)).join('')}</select></label>${remove}</div>${shallow?'<button type="button" data-graph-select="'+childPath(path,'child')+'">'+esc(t('Bedingung bearbeiten'))+'</button>':render(n.child,childPath(path,'child'))}</fieldset>`;
   if(n.op==='dependent')return `<fieldset data-path="${path}"><legend>${esc(t('Attribut dieses Wortes'))}</legend>${remove}${shallow?'<button type="button" data-graph-select="'+childPath(path,'child')+'">'+esc(t('Bedingung bearbeiten'))+'</button>':render(n.child,childPath(path,'child'))}</fieldset>`;
   if(n.op==='same')return `<fieldset data-path="${path}"><legend>${esc(t('Dasselbe Wort'))}</legend><p class="muted">${esc(t('Alle Bedingungen innerhalb dieser Bindung prüfen dasselbe Kernwort.'))}</p><div class="bar"><select data-field="boundRole" aria-label="${esc(t('Gebundenes Satzglied'))}">${wordRoles.map(r=>opt(r,roleNames[r],n.role)).join('')}</select>${remove}</div>${shallow?'<button type="button" data-graph-select="'+childPath(path,'child')+'">'+esc(t('Bedingung bearbeiten'))+'</button>':render(n.child,childPath(path,'child'))}</fieldset>`;
   if(n.op==='related')return `<fieldset data-path="${path}"><legend>${esc(t('Verknüpfte Klausel'))}</legend><div class="bar"><select data-field="relation" aria-label="${esc(t('Klauselbeziehung'))}">${['child','parent','later','ancestor','descendant'].map(x=>opt(x,names[x],n.relation)).join('')}</select>${remove}</div>${['ancestor','descendant'].includes(n.relation)?`<div class="bar"><label>${esc(t('Mindestens Klauselstufen'))}<input type="number" data-field="minDepth" min="1" max="12" value="${n.minDepth??1}"></label><label>${esc(t('Höchstens Klauselstufen'))}<input type="number" data-field="maxDepth" min="1" max="12" value="${n.maxDepth??5}"></label></div>`:''}${shallow?'<button type="button" data-graph-select="'+childPath(path,'child')+'">'+esc(t('Bedingung bearbeiten'))+'</button>':render(n.child,childPath(path,'child'))}</fieldset>`;

   const grammatical=wordRoles.includes(n.role);
   const lexical=grammatical?`<label>${esc(t('Suchbasis'))}<select data-field="mode">${opt('lemma','Lemma',n.mode||'lemma')}${opt('root','Wortfamilie / Wurzel',n.mode||'lemma')}</select></label>`:'';
   const value=['kind','clauseType'].includes(n.role)?'<select data-field="value" aria-label="'+esc(t(roleNames[n.role]))+'">'+Object.entries(n.role==='kind'?window.SyntaxTypes.kinds:window.SyntaxTypes.types).map(([v,l])=>opt(v,l===v?v:l+' ('+v+')',n.value)).join('')+'</select>':n.role==='domain'?'<select data-field="value" aria-label="'+esc(t('Textbereich'))+'">'+[['N','Erzählung'],['D','Erläuterung des Erzählers'],['Q','Direkte Rede']].map(([v,l])=>opt(v,l,n.value)).join('')+'</select>':n.role==='relation'?'<select data-field="value" aria-label="'+esc(t('BHSA-Klauselbeziehung'))+'">'+window.SyntaxPattern.relations.map(v=>opt(v,v==='Attr'?'Attributiv (Attr)':v,n.value)).join('')+'</select>':`<label>${esc(t(n.mode==='root'?'Wurzel eingeben':'Lemma (leer: beliebig)'))}<input data-field="lemma" lang="he" dir="rtl" maxlength="256" value="${esc(n.lemma||families?.get(n.family)?.root||'')}"></label>`;
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
   const positions=wordRoles.filter(r=>r!=='referent').includes(n.role)?`<div class="bar sxPosition"><label>${esc(t('Position gegenüber'))}<select data-position="relative">${opt('','Keine Positionsbedingung',n.position?.relative||'')}${wordRoles.filter(r=>r!=='referent'&&r!==n.role).map(r=>opt(r,roleNames[r],n.position?.relative)).join('')}</select></label>${n.position?`<label>${esc(t('Reihenfolge'))}<select data-position="order">${[['either','Beliebig'],['before','davor'],['after','danach']].map(([v,l])=>opt(v,l,n.position.order)).join('')}</select></label><label>${esc(t('Höchstens Wörter dazwischen (leer: beliebig)'))}<input type="number" min="0" max="200" step="1" data-position="maxGap" value="${n.position.maxGap??''}"></label>`:''}</div>`:'';
   return `<div class="sxCondition" data-path="${path}"><div class="bar"><select data-field="role" aria-label="${esc(t('Bedingung'))}">${Object.entries(roleNames).filter(([v])=>!scope||v===scope).map(([v,l])=>opt(v,l,n.role)).join('')}</select>${lexical}${value}${n.role==='prepositional'?`<label>${esc(t('Präposition'))}<select data-field="preposition">${opt('','Beliebig',n.preposition||'')}${['ב','ל','כ','מ','אל','על','את','עם','מן','עד','בין','אחר','תחת','לפני'].map(v=>opt(v,v,n.preposition)).join('')}</select></label>`:''}${family}${remove}</div>${grammar}${positions}${grammatical?`<div class="bar"><label>${esc(t('Gleich Variable (optional)'))}<input data-field="sameAs" maxlength="24" placeholder="${esc(variableNames(path).join(', '))}" value="${esc(n.sameAs||'')}"></label><label>${esc(t('Gleichheitsprüfung'))}<select data-field="identity">${opt('referent','Gleicher Referent (MACULA)',n.identity||'referent')}${opt('token','Identisches Textwort',n.identity||'referent')}</select></label></div>`:''}${['recipient','beneficiary','location'].includes(n.role)?'<p class="muted">'+esc(t('Begrenzte Safran-Arbeitszuordnungen; nicht unabhängig geprüft. Keine automatische Ableitung aus Präpositionen.'))+'</p>':''}</div>`;
  }
  let view='form',selected='',zoom=1;
  const Graph=window.SyntaxGraph;
  function at(path){return path?path.split('.').filter(Boolean).reduce((n,k)=>k==='child'?n.child:n.children[+k],tree):tree;}
  const parentOf=path=>path.split('.').slice(0,-1).join('.');
  function replace(path,value){if(!path){tree=value;return;}const keys=path.split('.'),last=keys.pop(),parent=at(keys.join('.'));if(last==='child')parent.child=value;else parent.children[+last]=value;}
  function current(){try{return at(selected)||tree;}catch{return tree;}}
  function graphMarkup(){
    try{
      if(current()===tree&&selected)selected='';
      const g=Graph.render(tree,{selected,t,esc,rootLabel:key=>families?.get(key)?.root||''}),parent=selected?at(parentOf(selected)):null,index=Number(selected.split('.').at(-1));
      const sibling=!!(parent?.children&&Number.isInteger(index));
      return `<div class="bar sxGraphTools"><button type="button" data-graph-command="out" aria-label="${esc(t('Verkleinern'))}">−</button><button type="button" data-graph-command="in" aria-label="${esc(t('Vergrößern'))}">+</button><button type="button" data-graph-command="fit">${esc(t('Einpassen'))}</button><span>${g.count} ${esc(t('Knoten'))}</span></div><p class="muted">${esc(t('Knoten anklicken und unten bearbeiten. Linien zeigen Bedingungsgruppen und Klauselverknüpfungen.'))}</p><div class="sxGraphViewport">${g.svg}</div><section class="sxGraphInspector"><h4>${esc(t('Ausgewählter Knoten'))}</h4><div class="bar"><button type="button" data-graph-command="wrap-all">${esc(t('In UND-Gruppe einbetten'))}</button><button type="button" data-graph-command="wrap-any">${esc(t('In ODER-Gruppe einbetten'))}</button><button type="button" data-graph-command="wrap-not">${esc(t('Mit NICHT ausschließen'))}</button><button type="button" data-graph-command="up"${!sibling||index===0?' disabled':''}>↑ ${esc(t('Nach oben'))}</button><button type="button" data-graph-command="down"${!sibling||index===parent.children.length-1?' disabled':''}>↓ ${esc(t('Nach unten'))}</button></div>${render(current(),selected,true)}</section>`;
    }catch(error){return '<p role="alert">'+esc(t(error.message))+'</p>';}
  }
  function sizeGraph(){
    const canvas=root.querySelector?.('.sxGraphCanvas');if(!canvas)return;
    const [,,w,h]=canvas.getAttribute('viewBox').split(' ').map(Number);canvas.setAttribute('width',w*zoom);canvas.setAttribute('height',h*zoom);
  }
  function updateGraph(){
    if(view!=='graph')return;
    const viewport=root.querySelector?.('.sxGraphViewport');if(!viewport)return;
    const left=viewport.scrollLeft,top=viewport.scrollTop;
    viewport.innerHTML=Graph.render(tree,{selected,t,esc,rootLabel:key=>families?.get(key)?.root||''}).svg;sizeGraph();viewport.scrollLeft=left;viewport.scrollTop=top;
  }
  function draw(){
    const viewport=root.querySelector?.('.sxGraphViewport'),scroll=viewport?{left:viewport.scrollLeft,top:viewport.scrollTop}:null;
    root.innerHTML='<div class="bar sxBuilderViews" role="group" aria-label="'+esc(t('Suchaufbau anzeigen'))+'">'+['form','graph'].map(v=>'<button type="button" data-builder-view="'+v+'" aria-pressed="'+(view===v)+'">'+esc(t(v==='form'?'Formular':'Grafik'))+'</button>').join('')+'</div><p class="muted" data-graph-status role="status"></p>'+(view==='graph'?graphMarkup():render(tree));
    sizeGraph();const next=root.querySelector?.('.sxGraphViewport');if(next&&scroll){next.scrollLeft=scroll.left;next.scrollTop=scroll.top;}
  }
  function graphAction(action){
    if(action==='in'||action==='out'){zoom=Math.max(.2,Math.min(2,zoom+(action==='in' ? .15 : -.15)));sizeGraph();return;}
    if(action==='fit'){const viewport=root.querySelector?.('.sxGraphViewport');if(viewport){zoom=Math.max(.2,Math.min(1,(viewport.clientWidth-12)/Graph.layout(tree).width));sizeGraph();viewport.scrollLeft=0;viewport.scrollTop=0;}return;}
    const before=JSON.parse(JSON.stringify(tree)),old=selected;
    try{
      if(action.startsWith('wrap-'))replace(selected,{op:action.slice(5),children:[current()]});
      else if(action==='up'||action==='down'){
        const parent=at(parentOf(selected)),i=Number(selected.split('.').at(-1)),j=i+(action==='up'?-1:1);
        if(!selected||!parent.children||j<0||j>=parent.children.length)return;
        [parent.children[i],parent.children[j]]=[parent.children[j],parent.children[i]];selected=childPath(parentOf(selected),j);
      }
      Graph.structure(tree);draw();changed();
    }catch(error){tree=before;selected=old;draw();const status=root.querySelector?.('[data-graph-status]');if(status)status.textContent=t(error.message);}
  }
  function changed(){root.dispatchEvent(new Event('input',{bubbles:true}));}
  root.addEventListener('input',e=>{
   if(['boundRole','bindRole'].includes(e.target.dataset.field))return;
   const field=e.target.dataset.field,gram=e.target.dataset.gram,position=e.target.dataset.position;if(!field&&!gram&&!position)return;
   const n=at(e.target.closest('[data-path]').dataset.path);
   if(field==='name'&&!nameEdits.has(n))nameEdits.set(n,n.name);
   if(position){if(position==='relative'){if(e.target.value)n.position={relative:e.target.value,order:n.position?.order||'either',maxGap:n.position?.maxGap??null};else delete n.position;}else if(n.position)n.position[position]=position==='maxGap'?(e.target.value===''?null:Number(e.target.value)):e.target.value;}
   else if(gram){n.gram||={};n.gram[gram]=e.target.value;}else{n[field]=['minDepth','maxDepth'].includes(field)?Number(e.target.value):e.target.value;
     if(field==='lemma'&&n.mode==='root'){n.family='';const select=e.target.closest('[data-path]').querySelector('[data-field=family]');if(select){select.innerHTML=familyOptions(n);select.value=n.family;}}
   }
   updateGraph();
  });
  root.addEventListener('change',e=>{
   const position=e.target.dataset.position;if(position==='relative'){const n=at(e.target.closest('[data-path]').dataset.path);if(e.target.value)n.position={relative:e.target.value,order:n.position?.order||'either',maxGap:n.position?.maxGap??null};else delete n.position;draw();return;}
   const gram=e.target.dataset.gram;if(gram){const n=at(e.target.closest('[data-path]').dataset.path);n.gram||={};n.gram[gram]=e.target.value;updateGraph();return;}
   const field=e.target.dataset.field;if(!field)return;
   const n=at(e.target.closest('[data-path]').dataset.path),previousName=nameEdits.get(n)??n.name;n[field]=['minDepth','maxDepth'].includes(field)?Number(e.target.value):e.target.value;
   if(field==='name'){const rename=x=>{if(x.op==='bind'&&x.name===previousName)return;if(previousName&&x.sameAs===previousName)x.sameAs=n.name;if(x.child)rename(x.child);x.children?.forEach(rename);};rename(n.child);nameEdits.delete(n);draw();return;}
   if(field==='bindRole'){n.role=e.target.value;delete n.bindRole;draw();return;}
   if(field==='boundRole'){n.role=e.target.value;delete n.boundRole;const sync=x=>{if(x.op==='term'){x.role=n.role;delete x.preposition;if(x.position?.relative===n.role)delete x.position;}else if(x.op!=='dependent')x.children.forEach(sync);};sync(n.child);draw();return;}
   if(field==='relation'){if(['ancestor','descendant'].includes(n.relation)){n.minDepth??=1;n.maxDepth??=5;}else{delete n.minDepth;delete n.maxDepth;}draw();return;}
   if(field==='op'&&n.op==='not')n.children.length>1&&(n.children=[{op:'all',children:n.children}]);
   if(field==='role'){n.gram={};delete n.position;delete n.mode;delete n.family;delete n.preposition;if(!wordRoles.includes(n.role)){delete n.sameAs;delete n.identity;}n.value=n.role==='domain'?'N':n.role==='relation'?'Attr':n.role==='kind'?'VC':n.role==='clauseType'?'NmCl':'';}
   if(field==='mode'){delete n.family;draw();if(n.mode==='root')ensureRoots().then(()=>{draw();changed();});}
   if(['op','role'].includes(field))draw();else updateGraph();
  });
  root.addEventListener('click',e=>{
   const toggle=e.target.closest('[data-builder-view]');if(toggle){view=toggle.dataset.builderView;draw();return;}
   const pick=e.target.closest('[data-graph-select]');if(pick){selected=pick.dataset.graphSelect;view='graph';draw();return;}
   const command=e.target.closest('[data-graph-command]');if(command){graphAction(command.dataset.graphCommand);return;}
   const b=e.target.closest('[data-action]');if(!b)return;
   const path=b.closest('[data-path]').dataset.path,n=at(path),before=JSON.parse(JSON.stringify(tree)),old=selected;
   if(b.dataset.action==='remove'){
    const keys=path.split('.'),last=keys.pop(),parent=at(keys.join('.'));
    if(last==='child')parent.child=term(['same','bind'].includes(parent.op)?parent.role:parent.op==='dependent'?'attribute':'verb');else{parent.children.splice(+last,1);if(!parent.children.length)parent.children.push(term(boundRole(keys.join('.'))||'verb'));}
   }else{
    if(n.children.length>=12)return;
    const role=boundRole(path)||'verb';let variableName='x',suffix=2;while(variableNames(path).includes(variableName))variableName='x'+suffix++;
    n.children.push(b.dataset.action==='group'?{op:'any',children:[term(role)]}:b.dataset.action==='dependent'?{op:'dependent',child:{op:'all',children:[term('attribute')]}}:b.dataset.action==='bind'?{op:'bind',name:variableName,role:'subject',child:{op:'all',children:[term('subject')]}}:b.dataset.action==='same'?{op:'same',role:'subject',child:{op:'all',children:[term('subject')]}}:b.dataset.action==='related'?{op:'related',relation:'child',child:{op:'all',children:[term()]}}:term(role));
   }
   try{if(Graph)Graph.structure(tree);}catch(error){tree=before;selected=old;draw();const status=root.querySelector?.('[data-graph-status]');if(status)status.textContent=t(error.message);return;}
   if(view==='graph'&&b.dataset.action==='remove')selected=parentOf(path);
   draw();changed();
  });
  root.addEventListener('keydown',e=>{
    const node=e.target.closest('[data-graph-select]');if(!node)return;
    if(e.key==='Enter'||e.key===' '){e.preventDefault();selected=node.dataset.graphSelect;view='graph';draw();root.querySelector?.('.sxGraphInspector select, .sxGraphInspector input')?.focus();return;}
    const path=node.dataset.graphSelect,parent=parentOf(path),n=at(path);let target;
    if(e.key==='ArrowUp')target=path?parent:'';
    if(e.key==='ArrowDown')target=Graph.children(n,path)[0]?.path;
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      const siblings=path?Graph.children(at(parent),parent):[{path:''}],i=siblings.findIndex(x=>x.path===path);target=siblings[i+(e.key==='ArrowLeft'?-1:1)]?.path;
    }
    if(target!==undefined){e.preventDefault();root.querySelector?.('[data-graph-select="'+target+'"]')?.focus();}
  });
  draw();return {set:value=>{if(!window.SyntaxPattern.clean(value))return false;tree=JSON.parse(JSON.stringify(value));selected='';draw();if(hasRoot(tree))ensureRoots().then(()=>{draw();changed();});changed();return true;},setView:value=>{if(!['form','graph'].includes(value))return false;view=value;draw();return true;},get view(){return view;},query:()=>JSON.parse(JSON.stringify(tree)),error:()=>needsFamily(tree)?t('Wähle für jede Wurzelbedingung eine belegte Wortfamilie.'):window.SyntaxPattern.variableError(tree)?t(window.SyntaxPattern.variableError(tree)):null,valid:()=>!!window.SyntaxPattern.clean(tree)};
 }
 return {create};
})();
