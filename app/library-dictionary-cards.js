// Full word cards in the dictionary workspace, sharing the existing card instance.
window.LibraryDictionaryCards={create({$,esc,cards,loadRoots,loadGreek,submit}){
 let mode='dictionary',serial=0,selected=false;
 const panel=$('#formsPanel'),home=document.createComment('word-card-panel-home');panel.before(home);
 const input=$('#dictQ'),placeholder=input.getAttribute('placeholder');
 const active=()=>mode==='card'&&document.documentElement.dataset.tab==='dict';
 function sync(){
  const on=active();$('#dictPanel').classList.toggle('word-card-mode',on);
  $('#dictCardWorkspace').hidden=!on;$('#dictOut').hidden=on;
  $('#dictCardScope').hidden=!on;$('#dictCardSearch').hidden=!on;
  $('#dictViewDictionary').setAttribute('aria-pressed',String(mode==='dictionary'));
  $('#dictViewCard').setAttribute('aria-pressed',String(mode==='card'));
  input.placeholder=on?I18N.t('Lemma oder Wurzel eingeben …'):placeholder;
  if(on)$('#dictSug').hidden=true;
  if(on&&!panel.dataset.embedded){
   panel.hidden=true;panel.dataset.embedded='dictionary';panel.classList.remove('docked');$('#dictCardMount').append(panel);
   if(selected)cards.reopen();
  }else if(!on&&panel.dataset.embedded){
   serial++;panel.hidden=true;home.after(panel);delete panel.dataset.embedded;
  }
 }
 function setMode(next){mode=next;sync();if(active()&&input.value.trim())search(input.value);}
 async function open(item,token){
  if(token!==serial||!active())return;selected=true;
  $('#dictCardMatches').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.key===item.key)));
  if(item.kind==='greek')await cards.openGForms(item.id,null,'card');
  else if(item.kind==='syriac')await cards.openSForms(item.id,null,'card');
  else if(item.root)await cards.openRoot(item.id);
  else await cards.openForms(item.id,null,'card');
 }
 const fold=s=>String(s).normalize('NFD').replace(/[^\u05d0-\u05ea]/g,'').replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]);
 async function search(query){
  if(!active())return false;
  const q=String(query||'').trim(),token=++serial,root=$('#dictCardScope').value==='root',out=$('#dictCardMatches');
  if(!q)return true;
  selected=false;panel.hidden=true;out.textContent=I18N.t('Lädt …');
  try{
   const D=await cards.loadForms(),lemmas=window.OSHB_LEMMAS||{};let matches=[];
   if(root){
    const roots=(await loadRoots()).roots,families=new Map();
    for(const [id,r] of Object.entries(roots))if((fold(q)&&fold(r.root)===fold(q))||q===r.id){
     const key=r.lang+'|'+r.id,total=window.Forms.model(D,id)?.total||0;if(!total)continue;
     if(!families.has(key))families.set(key,{key,id,root:true,label:r.root,count:0});families.get(key).count+=total;
    }
    matches=[...families.values()];
   }else if(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(q)){
    const G=await loadGreek();matches=window.GMorph.dictionaryLemmas(G,q).map(id=>({key:id,id,kind:'greek',label:id,count:window.GMorph.model(G,id)?.total||0}));
   }else if(/[\u0710-\u072f]/u.test(q)){
    matches=[{key:q,id:q,kind:'syriac',label:q,count:0}];
   }else{
    const key=fold(q);
    matches=Object.entries(lemmas).filter(([id,l])=>q===id||(key&&fold(l[0])===key)).map(([id,l])=>({key:id,id,label:l[0],gloss:I18N.lang==='de'&&l[2]?l[2]:l[1],count:window.Forms.model(D,id)?.total||0})).filter(x=>x.count);
   }
   if(token!==serial||!active())return true;
   matches.sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key));
   if(!matches.length){out.textContent=I18N.t(root?'Keine belegte Wurzelfamilie gefunden.':'Kein belegtes Lemma gefunden.');return true;}
   out.innerHTML=matches.map(x=>`<button type="button" data-key="${esc(x.key)}" aria-pressed="false"><bdi>${esc(x.label)}</bdi>${x.gloss?' · '+esc(x.gloss):''}${x.count?' · '+x.count.toLocaleString(I18N.loc):''}${!x.kind&&!x.root?' · Strong '+esc(x.id):''}</button>`).join('');
   out.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>open(matches[i],serial));
   await open(matches[0],token);
  }catch(error){if(token===serial&&active())out.textContent=I18N.t('Wortkarte konnte nicht geladen werden.');}
  return true;
 }
 $('#dictViewDictionary').onclick=()=>setMode('dictionary');$('#dictViewCard').onclick=()=>setMode('card');
 $('#dictCardSearch').onclick=()=>submit(input.value);$('#dictCardScope').onchange=()=>search(input.value);
 return {sync,active,search,beforeLookup:()=>{if(mode==='card'){mode='dictionary';sync();}}};
}};
