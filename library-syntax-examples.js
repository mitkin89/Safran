window.LibrarySyntaxExamples=(()=>{
'use strict';
function create({root,apply,esc,t}){
 let mode=null,busy=false;
 function show(next){
  root.hidden=!next;if(next===mode&&root.firstElementChild)return;mode=next;if(!mode)return;
  root.innerHTML=`<details${window.innerWidth>1150&&!document.documentElement.classList.contains('split')?' open':''}><summary>${esc(t(mode==='advanced'?'Beispiele für den Suchaufbau':'Beispiele für Klauseln'))}</summary><p class="muted">${esc(t('Anklicken füllt die Felder aus. Danach kannst du das Beispiel ändern und mit „Suchen“ starten.'))}</p><div class="sxExampleList">${[true,false].map(complex=>`<h4>${esc(t(complex?'Komplexe Beispiele':'Weitere Beispiele'))}</h4>`+window.SyntaxExamples.examples.filter(e=>e.query.type===mode&&(e.level==='complex')===complex).map(e=>`<button type="button" data-sx-example="${esc(e.id)}"><strong>${esc(t(e.title))}</strong><span>${esc(t(e.description))}</span>${e.ref?`<small>${esc(t('Beispielstelle: {}',e.ref))}</small>`:''}</button>`).join('')).join('')}</div><p data-example-status role="status" aria-live="polite"></p></details>`;
 }
 async function load(id,focus=false){
  if(busy)return;const example=window.SyntaxExamples.get(id);if(!example)return;
  busy=true;for(const b of root.querySelectorAll('button'))b.disabled=true;
  try{
   // The same validation/reset path is used when loading a saved search pattern.
   await apply(window.SyntaxPatterns.snapshot(example.query));
   root.querySelector('[data-example-status]').textContent=t('Beispiel „{}“ geladen. Mit „Suchen“ starten.',t(example.title));
  }catch(error){const status=root.querySelector('[data-example-status]');if(status)status.textContent=t(error.message||'Das Beispiel konnte nicht geladen werden.');}
  finally{busy=false;for(const b of root.querySelectorAll('button'))b.disabled=false;if(focus)root.querySelector('[data-sx-example="'+id+'"]')?.focus({preventScroll:true});}
 }
 root.addEventListener('click',event=>{const b=event.target.closest('[data-sx-example]');if(b)void load(b.dataset.sxExample,true);});
 return {show,load};
}
return {create};
})();
