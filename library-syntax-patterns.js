window.LibrarySyntaxPatterns=(()=>{
'use strict';
function create({root,capture,apply,storage,files,t,esc}){
 root.innerHTML=`<details><summary>${esc(t('Gespeicherte Suchmuster'))} <span data-count></span></summary><div class="bar"><label>${esc(t('Suchmuster'))}<select data-pattern><option value="">${esc(t('Neues Suchmuster'))}</option></select></label><button type="button" data-act="load">${esc(t('Laden'))}</button><button type="button" data-act="new">${esc(t('Neu'))}</button><button type="button" data-act="delete">${esc(t('Löschen'))}</button></div><div class="bar"><label>${esc(t('Name'))}<input data-name maxlength="100" autocomplete="off"></label><button type="button" data-act="save">${esc(t('Speichern'))}</button><button type="button" data-act="export">${esc(t('Auswahl exportieren'))}</button><button type="button" data-act="export-all">${esc(t('Alle exportieren'))}</button><button type="button" data-act="import">${esc(t('Importieren'))}</button></div><p class="muted" data-status role="status"></p></details>`;
 const store=window.SyntaxPatterns.create(storage),select=root.querySelector('[data-pattern]'),name=root.querySelector('[data-name]'),status=root.querySelector('[data-status]');
 let items=[],busy=false;
 const message=msg=>status.textContent=t(msg);
 function controls(){
  for(const b of root.querySelectorAll('button'))b.disabled=busy||(['load','delete','export'].includes(b.dataset.act)&&!select.value)||(b.dataset.act==='export-all'&&!items.length);
  root.querySelector('[data-act=save]').textContent=t(select.value?'Aktualisieren':'Speichern');
 }
 function refresh(selected=select.value){
  items=store.list();select.innerHTML=`<option value="">${esc(t('Neues Suchmuster'))}</option>`+items.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
  select.value=items.some(x=>x.id===selected)?selected:'';root.querySelector('[data-count]').textContent='('+items.length+')';controls();
 }
 select.addEventListener('change',()=>{name.value=items.find(x=>x.id===select.value)?.name||'';message('');controls();});
 root.addEventListener('click',async event=>{
  const action=event.target.closest('[data-act]')?.dataset.act;if(!action||busy)return;
  busy=true;controls();
  try{
   if(action==='new'){select.value='';name.value='';message('');name.focus();}
   if(action==='save'){const saved=store.save(name.value,capture(),select.value);refresh(saved.id);name.value=saved.name;message('Suchmuster gespeichert.');}
   if(action==='load'){
    const saved=store.list().find(x=>x.id===select.value);if(!saved)throw Error('Dieses Suchmuster ist nicht mehr vorhanden.');
    await apply(saved.query);name.value=saved.name;message('Suchmuster geladen. Mit „Suchen“ starten.');
   }
   if(action==='delete'){store.remove(select.value);refresh('');name.value='';message('Suchmuster gelöscht.');}
   if(action==='export'||action==='export-all'){
    const result=await files.saveFile('Safran-Suchmuster.json',store.export(action==='export'?select.value:''));
    if(result?.error)throw Error(result.error);if(result)message('Suchmuster exportiert.');
   }
   if(action==='import'){
    const f=await files.openFile('syntax-patterns');if(f){if(f.error)throw Error(f.error);const result=store.import(f.text);refresh();status.textContent=t('{} Suchmuster importiert, {} bereits vorhanden.',result.added,result.skipped);}
   }
  }catch(error){message(error.message||'Suchmuster konnten nicht gespeichert werden.');}
  finally{busy=false;controls();}
 });
 try{refresh();}catch(error){message(error.message);controls();}
 return {refresh};
}
return {create};
})();
