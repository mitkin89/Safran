// Full word cards in the dictionary workspace, sharing the existing card instance.
window.LibraryDictionaryCards={create({$,esc,cards,loadRoots,loadGreek,submit}){
 let mode='dictionary',serial=0,selected=false,timer=null;
 const panel=$('#formsPanel'),home=document.createComment('word-card-panel-home');panel.before(home);
 const input=$('#dictQ'),placeholder=input.getAttribute('placeholder');
 const active=()=>mode==='card'&&document.documentElement.dataset.tab==='dict';
 function sync(){
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
  if(token!==serial||!active())return;selected=true;
  $('#dictCardMatches').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.key===item.key)));
  if(item.kind==='peshitta')await cards.openPForms(item.id);
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
  selected=false;panel.hidden=true;out.replaceChildren();
  if(!q)return true;
  out.textContent=I18N.t('Lädt …');
  try{
   const D=await cards.loadForms(),lemmas=window.OSHB_LEMMAS||{};let matches=[];
   const key=fold(q),match=value=>key&&(live?fold(value).startsWith(key):fold(value)===key);
   if(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(q)){
    const G=await loadGreek();matches=window.GMorph.dictionaryLemmas(G,q).map(id=>({key:id,id,kind:'greek',label:id,count:window.GMorph.model(G,id)?.total||0}));
   }else if(/[\u0710-\u072f]/u.test(q)){
    matches=(await cards.loadPeshittaCards()).suggest(q,live);
   }else{
    matches=Object.entries(lemmas).filter(([id,l])=>q===id||match(l[0])).map(([id,l])=>({key:id,id,label:l[0],gloss:I18N.lang==='de'&&l[2]?l[2]:l[1],count:total(D,id)})).filter(x=>x.count);
    const roots=(await loadRoots()).roots,families=new Map();
    for(const [id,r] of Object.entries(roots))if(match(r.root)||q===r.id){
     const familyKey=r.lang+'|'+r.id,n=total(D,id);if(!n)continue;
     if(!families.has(familyKey))families.set(familyKey,{key:familyKey,id,root:true,label:r.root,count:0});
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
   if(token!==serial||!active())return true;
   matches.sort((a,b)=>Number(fold(b.label)===key)-Number(fold(a.label)===key)||Number(!!a.root)-Number(!!b.root)||b.count-a.count||a.key.localeCompare(b.key));
   if(!matches.length){out.textContent=I18N.t('Kein passendes Lemma oder keine passende Wurzel gefunden.');return true;}
   matches=matches.slice(0,40);
   out.innerHTML=matches.map(x=>`<button type="button" data-key="${esc(x.key)}" data-kind="${x.root?'root':'lemma'}" aria-pressed="false"><bdi>${esc(x.label)}</bdi>${x.gloss?' · '+esc(x.gloss):''}<small>${esc(I18N.t(x.root?'Wurzel':'Lemma'))}${x.language?' · '+esc(I18N.t(x.language)):''}${x.source?' · '+esc(I18N.t(x.source)):''}${x.count?' · '+x.count.toLocaleString(I18N.loc):''}${!x.kind&&!x.root?' · Strong '+esc(x.id):''}</small></button>`).join('');
   out.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>{input.value=matches[i].label;open(matches[i],serial);});
   if(!live)await open(matches[0],token);
  }catch(error){if(token===serial&&active())out.textContent=I18N.t('Wortkarte konnte nicht geladen werden.');}
  return true;
 }
 input.addEventListener('input',()=>{
  if(!active())return;
  clearTimeout(timer);serial++;selected=false;panel.hidden=true;$('#dictCardMatches').replaceChildren();
  if(input.value.trim())timer=setTimeout(()=>search(input.value,true),120);
 });
 input.addEventListener('keydown',e=>{
  if(active()&&e.key==='ArrowDown'){
   const first=$('#dictCardMatches button');if(first){e.preventDefault();first.focus();}
  }
 });
 $('#dictCardMatches').addEventListener('keydown',e=>{
  if(!['ArrowDown','ArrowUp','Escape'].includes(e.key))return;
  e.preventDefault();const buttons=[...$('#dictCardMatches').querySelectorAll('button')],i=buttons.indexOf(document.activeElement);
  if(e.key==='Escape'||(e.key==='ArrowUp'&&i===0))input.focus();
  else buttons[Math.max(0,Math.min(buttons.length-1,i+(e.key==='ArrowDown'?1:-1)))]?.focus();
 });
 $('#dictViewDictionary').onclick=()=>setMode('dictionary');$('#dictViewCard').onclick=()=>setMode('card');
 $('#dictCardSearch').onclick=()=>submit(input.value);
 return {sync,active,search,beforeLookup:()=>{if(mode==='card'){mode='dictionary';sync();}}};
}};
