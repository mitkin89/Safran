// Full word cards in the dictionary workspace, sharing the existing card instance.
window.LibraryDictionaryCards={create({$,esc,cards,loadRoots,loadGreek,submit}){
 let mode='dictionary',serial=0,selected=false,timer=null;
 const panel=$('#formsPanel'),home=document.createComment('word-card-panel-home');panel.before(home);
 const input=$('#dictQ'),placeholder=input.getAttribute('placeholder');
 const out=$('#dictCardMatches');$('#dictBar').append(out);out.hidden=true;out.setAttribute('role','listbox');
 const sources=document.createElement('div');sources.id='dictCardSources';$('#dictCardMount').before(sources);
 input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls','dictCardMatches');input.setAttribute('aria-expanded','false');
 function position(){const r=input.getBoundingClientRect();out.style.left=r.left+'px';out.style.top=(r.bottom+4)+'px';out.style.width=Math.min(Math.max(r.width,920),window.innerWidth-r.left-16)+'px';}
 function showSuggestions(){position();out.hidden=false;input.setAttribute('aria-expanded','true');}
 function hideSuggestions(){out.hidden=true;input.setAttribute('aria-expanded','false');}
 window.addEventListener('resize',position);
 document.addEventListener('mousedown',e=>{if(!out.contains(e.target)&&e.target!==input){clearTimeout(timer);hideSuggestions();}});
 const active=()=>mode==='card'&&document.documentElement.dataset.tab==='dict';
 function sync(){
  hideSuggestions();
  const on=active();$('#dictPanel').classList.toggle('word-card-mode',on);
  $('#dictCardWorkspace').hidden=!on;$('#dictOut').hidden=on;
  $('#dictCardSearch').hidden=!on;
  $('#dictViewDictionary').setAttribute('aria-pressed',String(mode==='dictionary'));
  $('#dictViewCard').setAttribute('aria-pressed',String(mode==='card'));
  input.placeholder=on?I18N.t('Lemma oder Wurzel eingeben …'):placeholder;
  if(on)$('#dictSug').hidden=true;
  if(on&&!panel.dataset.embedded){
   panel.hidden=true;panel.dataset.embedded='dictionary';panel.classList.remove('docked');$('#dictCardMount').append(panel);
   if(selected)cards.reopen();
  }else if(!on&&panel.dataset.embedded){
   clearTimeout(timer);serial++;panel.hidden=true;home.after(panel);delete panel.dataset.embedded;
  }
 }
 function setMode(next){mode=next;sync();if(active()&&input.value.trim())search(input.value);}
 async function open(item,token){
  if(token!==serial||!active())return;selected=true;hideSuggestions();
  if(item.members){
   sources.innerHTML=item.members.map((m,i)=>`<button type="button" data-source-member="${i}" aria-pressed="${i===0}"><bdi>${esc(m.label)}</bdi> · ${esc(I18N.t(m.source))} · ${m.count.toLocaleString(I18N.loc)}</button>`).join('');
   sources.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>{sources.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));open({...item.members[i],keepSources:true},serial);});
   return open({...item.members[0],keepSources:true},token);
  }
  if(!item.keepSources)sources.replaceChildren();
  $('#dictCardMatches').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.key===item.key)));
  if(item.kind==='corpus')await cards.openCorpusForms(item.id,item.greek);
  else if(item.kind==='peshitta')await cards.openPForms(item.id);
  else if(item.kind==='targum')await cards.openTForms(item.id,null,'card');
  else if(item.kind==='greek')await cards.openGForms(item.id,null,'card');
  else if(item.kind==='syriac')await cards.openSForms(item.id,null,'card');
  else if(item.root)await cards.openRoot(item.id);
  else await cards.openForms(item.id,null,'card');
 }
 const fold=s=>String(s).normalize('NFD').replace(/[^\u05d0-\u05ea]/g,'').replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]);
 const counts=new Map();
 const total=(D,id)=>{if(!counts.has(id))counts.set(id,window.Forms.model(D,id)?.total||0);return counts.get(id);};
 async function search(query,live=false){
  if(!active())return false;
  clearTimeout(timer);
  const q=String(query||'').trim(),token=++serial,out=$('#dictCardMatches');
  out.replaceChildren();
  if(!q){hideSuggestions();return true;}
  showSuggestions();
  out.textContent=I18N.t('Lädt …');
  try{
   const D=await cards.loadForms(),lemmas=window.OSHB_LEMMAS||{};let matches=[];
   if(/[\u0710-\u072f]/u.test(q))await cards.loadPeshittaCards();
   const key=fold(window.SyriacMorph?window.SyriacMorph.hebrew(q):q),match=value=>key&&(live?fold(value).startsWith(key):fold(value)===key);
   if(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(q)){
    const G=await loadGreek();matches=window.GMorph.dictionaryLemmas(G,q).map(id=>({key:id,id,kind:'greek',language:'Griechisch',source:'Septuaginta',label:id,count:window.GMorph.model(G,id)?.total||0}));
   }else{
    matches=Object.entries(lemmas).filter(([id,l])=>q===id||match(l[0])).map(([id,l])=>({key:id,id,language:/^A/.test(D.lem[id]||'')?'Aramäisch':'Hebräisch',source:'Tanach',label:l[0],groupGloss:l[1],gloss:I18N.lang==='de'&&l[2]?l[2]:l[1],count:total(D,id)})).filter(x=>x.count);
    const roots=(await loadRoots()).roots,families=new Map();
    for(const [id,r] of Object.entries(roots))if(match(r.root)||q===r.id){
     const familyKey=r.lang+'|'+r.id,n=total(D,id);if(!n)continue;
     if(!families.has(familyKey))families.set(familyKey,{key:familyKey,id,root:true,label:r.root,language:r.lang==='arc'?'Aramäisch':'Hebräisch',source:'Tanach',count:0});
     families.get(familyKey).count+=n;
    }
    matches.push(...families.values());
    if(key){const T=await cards.loadTForms();
      for(const [id,[lex,forms]] of Object.entries(T.L))if(match(lex[0])||forms.some(f=>match(f[0]))){
        const model=window.TargumForms.model(T,id);
        if(model?.total)matches.push({key:'tg:'+id,id,label:lex[0],gloss:lex[2],count:model.total,kind:'targum',language:'Aramäisch',source:'Targumim'});
      }
    }
    matches.push(...(await cards.loadPeshittaCards()).suggest(q,live));
   }
   if(/[\u0370-\u03ff\u1f00-\u1fffא-ת]/u.test(q)){const greek=/[\u0370-\u03ff\u1f00-\u1fff]/u.test(q);const extra=(await cards.corpusModel()).suggest(q,greek,live);for(const x of extra){const same=greek&&matches.find(m=>m.kind==='greek'&&m.label.normalize('NFC')===x.label.normalize('NFC'));if(same){same.count+=x.count;same.source='Septuaginta / Josephus / Philo';}else matches.push(x);}}
   if(token!==serial||!active())return true;
   matches=window.WordCardSuggestions.group(matches,s=>window.SyriacMorph?window.SyriacMorph.hebrew(s):s);
   matches.sort((a,b)=>Number(fold(b.label)===key)-Number(fold(a.label)===key)||Number(!!a.root)-Number(!!b.root)||b.count-a.count||a.key.localeCompare(b.key));
   if(!matches.length){out.textContent=I18N.t('Kein passendes Lemma oder keine passende Wurzel gefunden.');return true;}
   matches=matches.slice(0,40);
   const badge=(kind,label)=>`<span class="dictSuggestTag" data-tag="${kind}">${esc(label)}</span>`;
   out.innerHTML=matches.map(x=>{
    const language={'Hebräisch':'hebrew','Aramäisch':'aramaic','Griechisch':'greek'}[x.language]||'language';
    const sources=[...new Set((x.members||[x]).flatMap(m=>(m.source||'').split(' / ')).filter(Boolean))];
    return `<button type="button" data-key="${esc(x.key)}" data-member-keys="${esc((x.members||[x]).map(m=>m.key).join(' '))}" data-kind="${x.root?'root':'lemma'}" role="option" aria-selected="false" aria-pressed="false">
     <span class="dictSuggestWord"><bdi>${esc(x.members?[...new Set(x.members.map(m=>m.label))].join(' / '):x.label)}</bdi>${x.gloss?`<span class="dictSuggestGloss">${esc(x.gloss)}</span>`:''}</span>
     <span class="dictSuggestMeta">${badge(x.root?'root':'lemma',I18N.t(x.root?'Wurzel':'Lemma'))}${x.language?badge(language,I18N.t(x.language)):''}${sources.map(source=>badge('source',I18N.t(source))).join('')}<span class="dictSuggestDetails">${x.count?x.count.toLocaleString(I18N.loc):''}${!x.kind&&!x.root?' · Strong '+esc(x.id):''}</span></span>
    </button>`;
   }).join('');
   out.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>{input.value=matches[i].label;open(matches[i],serial);});
   if(!live)await open(matches[0],token);
  }catch(error){if(token===serial&&active())out.textContent=I18N.t('Wortkarte konnte nicht geladen werden.');}
  return true;
 }
 input.addEventListener('input',()=>{
  if(!active())return;
  clearTimeout(timer);serial++;$('#dictCardMatches').replaceChildren();hideSuggestions();
  if(input.value.trim())timer=setTimeout(()=>search(input.value,true),120);
 });
 input.addEventListener('focus',()=>{if(active()&&out.childElementCount)showSuggestions();});
 input.addEventListener('keydown',e=>{
  if(active()&&e.key==='Escape'){clearTimeout(timer);serial++;hideSuggestions();e.stopImmediatePropagation();return;}
  if(active()&&e.key==='ArrowDown'){showSuggestions();
   const first=$('#dictCardMatches button');if(first){e.preventDefault();first.focus();}
  }
 });
 $('#dictCardMatches').addEventListener('keydown',e=>{
  if(!['ArrowDown','ArrowUp','Escape'].includes(e.key))return;
  e.preventDefault();const buttons=[...$('#dictCardMatches').querySelectorAll('button')],i=buttons.indexOf(document.activeElement);
  if(e.key==='Escape'){input.focus();hideSuggestions();}else if(e.key==='ArrowUp'&&i===0)input.focus();
  else buttons[Math.max(0,Math.min(buttons.length-1,i+(e.key==='ArrowDown'?1:-1)))]?.focus();
 });
 $('#dictViewDictionary').onclick=()=>setMode('dictionary');$('#dictViewCard').onclick=()=>setMode('card');
 $('#dictCardSearch').onclick=()=>submit(input.value);
 return {sync,active,search,beforeLookup:()=>{if(mode==='card'){mode='dictionary';sync();}}};
}};
