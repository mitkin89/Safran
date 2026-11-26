// Corpus-bound candidate analyses for the vocalized Kaufmann editions of Seder Zeraim.
window.LibraryMishnahMorph=(()=>{
 'use strict';
 const TITLES=['Mishnah Berakhot','Mishnah Peah','Mishnah Demai','Mishnah Kilayim','Mishnah Sheviit','Mishnah Terumot','Mishnah Maasrot','Mishnah Maaser Sheni','Mishnah Challah','Mishnah Orlah','Mishnah Bikkurim'],VERSION="Mishnah based on the Kaufmann manuscript, edited by Dan Be'eri";
 const IGNORE='small,sup,.note,.footnote,a.aref,.aref,.mci-labels,.mci-witness,.mci-open,.mci-insertion';
 function create({$,esc,getView,load,openDict,closeOther}){
  let data=null,generation=0,popup=null,anchor=null,formsDialog=null,formsAnchor=null;
  const pending=new Map(),records=new WeakMap(),t=(s,...args)=>window.I18N?.t(s,...args)??s;
  const api=()=>window.MishnahMorph;
  function closePopup(){popup?.remove();popup=null;if(anchor){anchor.classList.remove('mhw-selected');anchor.removeAttribute('aria-expanded');}anchor=null;}
  function closeForms(){if(formsDialog){if(formsDialog.open)formsDialog.close();formsDialog.remove();}formsDialog=null;formsAnchor=null;}
  function close(){closePopup();closeForms();}
  function ready(title){
   const berakhot=title==='Mishnah Berakhot',key=berakhot?'berakhot':'zeraim';
   if(pending.has(key))return pending.get(key);
   const promise=Promise.all([
    load('mishnah-morph.js',()=>window.MishnahMorph),
    berakhot?load('mishnah-morph-data.js',()=>window.MISHNAH_MORPH_DATA):load('mishnah-zeraim-data.js',()=>window.MISHNAH_ZERAIM_DATA),
    load('mishnah-meanings.js',()=>window.MishnahMeanings),
    load('mishnah-dictionary-data.js',()=>window.MISHNAH_DICTIONARY_DATA),
    load('oshb-lemmas.js',()=>window.OSHB_LEMMAS).catch(()=>null)
   ]).then(([,d])=>d).catch(err=>{pending.delete(key);throw err;});
   pending.set(key,promise);return promise;
  }
  // This is the same main-text projection as the corpus extractor: formatting
  // tags do not create word boundaries; editorial labels and notes do.
  function projection(txt){
   const walker=document.createTreeWalker(txt,NodeFilter.SHOW_TEXT),nodes=[];let text='';
   for(let n;(n=walker.nextNode());){if(n.parentElement.closest(IGNORE)){text+=' ';continue;}nodes.push({node:n,start:text.length,end:text.length+n.nodeValue.length});text+=n.nodeValue;}
   return {text,nodes};
  }
  function locate(nodes,pos){return nodes.find(n=>n.start<=pos&&pos<n.end);}
  function decorate(cell,doc,ch,m){
   if(cell.dataset.mishnahMorphReady)return;
   const txt=cell.querySelector('.txt');if(!txt)return;
   const projected=projection(txt),tokens=api().tokens(projected.text),ids=api().match(data,doc.entry.title,ch,m,tokens.map(x=>x.word));
   if(!ids||ids.length!==tokens.length){cell.dataset.mishnahMorphState='unmatched';return;}
   // Prepare all ranges before changing the DOM. Reverse order leaves earlier
   // text-node offsets intact and preserves inline styling across word cuts.
   const ranges=tokens.map(token=>{const first=locate(projected.nodes,token.start),last=locate(projected.nodes,token.end-1);if(!first||!last)return null;const r=document.createRange();r.setStart(first.node,token.start-first.start);r.setEnd(last.node,token.end-last.start);return r;});
   if(ranges.some((r,i)=>!r||r.toString()!==tokens[i].word)){cell.dataset.mishnahMorphState='unmatched';return;}
   for(let i=tokens.length-1;i>=0;i--){
    const span=document.createElement('span');span.className='mhw';span.tabIndex=0;span.setAttribute('role','button');span.setAttribute('aria-label',t('Wortbestimmung für {} öffnen',tokens[i].word));
    span.append(ranges[i].extractContents());ranges[i].insertNode(span);
    records.set(span,{id:ids[i],word:tokens[i].word,key:tokens[i].key,rel:doc.entry.rel,chapter:ch,mishnah:m});
   }
   cell.dataset.mishnahMorphReady='1';cell.dataset.mishnahMorphState='matched';
  }
  async function refresh(){
   const token=++generation;close();
   const view=getView(),path=view?.sections?.[view.idx]?.path;
   if(!TITLES.includes(view?.group?.title)||!Array.isArray(path)||path.length!==1||!Number.isInteger(path[0]))return;
   const cells=[...$('#rOut').querySelectorAll('.cell[data-mishnah-morph]')];if(!cells.length)return;
   let selected;try{selected=await ready(view.group.title);}catch{return;}
   if(token!==generation||getView()!==view||view.sections?.[view.idx]?.path?.[0]!==path[0])return;
   data=selected;const source=data?.sources?.[view.group.title];if(!source)return;
   for(const cell of cells){
    if(!cell.isConnected)continue;
    const doc=view.loaded.find(d=>d.entry.rel===cell.dataset.rel),version=doc?.entry.versionTitle||doc?.versionTitle;
    if(doc?.entry.title!==view.group.title||version!==VERSION||doc.textHash!==source.textHash){cell.dataset.mishnahMorphState='source-mismatch';continue;}
    const label=cell.closest('.row')?.dataset.l;if(!/^[1-9]\d*$/.test(label||''))continue;
    decorate(cell,doc,path[0]+1,Number(label));
   }
  }
  function description(a){
   const decoded=window.Morph?.decode(a.morph,a.lemma);
   return decoded?.segs?.map(s=>[s.pos,s.stem,s.tense,s.info].filter(Boolean).map(s=>t(s)).join(' · ')).join(' + ')||t('Keine vollständige Formenbestimmung.');
  }
  function headLemma(a){return api().headLemma?api().headLemma(a):String(a.lemma||'').split('/').at(-1);}
  function meaning(a){
   const result=window.MishnahMeanings?.lookup(a,window.OSHB_LEMMAS||{},window.I18N?.lang||'de');
   if(!result)return `<p class="mhm-meaning muted">${esc(t('Noch keine Kurzbedeutung hinterlegt.'))}</p>`;
   const source=result.source==='editorial'?'Redaktionelle Kurzbedeutung':'Biblisches Wörterbuch';
   return `<p class="mhm-meaning"><span class="muted">${esc(t('Bedeutung'))}</span> ${esc(result.text)} <small class="muted">${esc(t(source))}</small></p>`;
  }
  function loanword(a){
   const l=a.loanword;if(!l?.form||l.source!=='Krauss')return '';
   return `<p class="mhm-loanword"><small class="muted">${esc(t('Herkunftsangabe bei Krauss'))}</small><br>${esc(t(l.language))} · <bdi dir="ltr">${esc(l.form)}</bdi></p>`;
  }
  function grammar(analyses){
   const ids=[...new Set(analyses.flatMap(a=>a.rules||[]))],rules=ids.map(id=>data.rules?.[id]).filter(r=>r?.label);
   if(!rules.length)return '';
   return `<details class="mhm-grammar"><summary>${esc(t('Grammatik und Belege'))}</summary><ul>${rules.map(r=>`<li>${esc(r.label)}${r.refs?.length?`<small>${r.refs.map(ref=>esc(typeof ref==='string'?ref:ref.label||ref.citation||'')).filter(Boolean).join(' · ')}</small>`:''}</li>`).join('')}</ul></details>`;
  }
  function dictionaryHits(record){
   return window.MISHNAH_DICTIONARY_DATA?.forms?.[record.key]||[];
  }
  function dictionaryEvidence(record){
   const hits=dictionaryHits(record);if(!hits.length)return '';
   const labels={'reviewed-entry':'Redaktionell ausgewerteter Wörterbuchbeleg','pointed-head':'Stichwort mit gleicher Vokalisierung','exact-head':'Stichworttreffer','consonantal-head':'Stichwort mit gleichen Konsonanten'};
   return `<details class="mhm-grammar mhm-dictionaries"><summary>${esc(t('Rabbinische Wörterbücher'))} (${hits.length})</summary><p class="muted">${esc(t('Suchtreffer bestätigen noch keine Wortart oder Bedeutung im Satz.'))}</p><ul>${hits.map((h,i)=>`<li><button type="button" data-mhm-evidence="${i}"><bdi lang="he" dir="rtl">${esc(h.head)}</bdi> · ${esc(h.dict)}</button><small>${esc(t(labels[h.match]||'Stichworttreffer'))}${h.queryKind==='possible-proclitic-remainder'?' · '+esc(t('Mögliche Restform nach Vorsilbe')):''}</small></li>`).join('')}</ul></details>`;
  }
  function position(){if(!popup||!anchor?.isConnected)return;const r=anchor.getBoundingClientRect(),w=popup.offsetWidth,h=popup.offsetHeight;popup.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';popup.style.top=(r.bottom+h+8<=innerHeight?r.bottom+6:Math.max(8,r.top-h-6))+'px';}
  function showForms(lemma){
   const at=anchor,rows=api().forms(data,lemma);closePopup();closeForms();formsAnchor=at;
   formsDialog=document.createElement('dialog');formsDialog.id='mishnahMorphForms';formsDialog.setAttribute('aria-labelledby','mishnahMorphFormsTitle');
   formsDialog.innerHTML=`<div class="mhm-dialog-head"><h3 id="mishnahMorphFormsTitle">${esc(t('Belegte Formen'))}: <bdi dir="rtl" lang="he">${esc(lemma)}</bdi></h3><button type="button" class="mhm-close" aria-label="${esc(t('Schließen'))}">✕</button></div><p class="mhm-badge">${esc(t('Mögliche Zuordnungen · maschinell'))}</p><p class="muted">${esc(t(data.title==='Mishnah Berakhot'?'Vorkommen in der Kaufmann-Fassung von Mischna Berakhot.':'Vorkommen in der Kaufmann-Fassung von Seder Seraim.'))}</p>${rows.length?`<div class="mhm-table-scroll"><table><thead><tr><th>${esc(t('Form'))}</th><th>${esc(t('Vorkommen'))}</th><th>${esc(t('Mögliche Bestimmung'))}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><bdi dir="rtl" lang="he">${esc(r.word)}</bdi></td><td>${Number.isFinite(r.count)?r.count:'–'}</td><td>${[...new Set((r.analyses||[]).filter(a=>headLemma(a)===lemma).map(description))].map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table></div>`:`<p>${esc(t('Keine belegten Formen zugeordnet.'))}</p>`}`;
   formsDialog.querySelector('.mhm-close').onclick=closeForms;formsDialog.addEventListener('cancel',e=>{e.preventDefault();closeForms();});formsDialog.addEventListener('click',e=>{if(e.target===formsDialog)closeForms();});document.body.append(formsDialog);formsDialog.showModal();
  }
  function show(word){
   const record=records.get(word);if(!record||!word.isConnected||api().normalize(word.textContent)!==record.key)return;
   const same=word===anchor;closePopup();if(same)return;closeOther?.();
   const form=api().form(data,record.id)||{status:'unresolved',analyses:[],hints:[]},analyses=form.analyses||[],labels={candidate:'Maschineller Vorschlag',ambiguous:'Mehrere mögliche Bestimmungen',partial:'Teilweise bestimmbar',unresolved:'Keine Bestimmung'};
   anchor=word;word.classList.add('mhw-selected');word.setAttribute('aria-expanded','true');popup=document.createElement('div');popup.id='mishnahMorphPopup';popup.setAttribute('role','dialog');popup.setAttribute('aria-label',t('Wortbestimmung'));
   const unique=[...new Set(analyses.map(headLemma).filter(Boolean))];
   popup.innerHTML=`<div class="mhm-top"><bdi class="mhm-word" dir="rtl" lang="he">${esc(record.word)}</bdi><button type="button" class="mhm-close" aria-label="${esc(t('Schließen'))}">✕</button></div><div class="mhm-badge">${form.status==='candidate'?'':esc(t('Maschinell'))+' · '}${esc(t(labels[form.status]||labels.unresolved))}</div>${analyses.length?analyses.map(a=>`<div class="mhm-analysis"><div><span class="muted">${esc(t('Grundform'))}</span> <bdi dir="rtl" lang="he">${esc(headLemma(a))}</bdi>${a.root?` <span class="muted">· ${esc(t('Wurzel'))}</span> <bdi dir="rtl" lang="he">${esc(a.root)}</bdi>`:''}</div>${meaning(a)}${loanword(a)}<p>${esc(description(a))}</p>${a.note?`<p class="mhm-analysis-note muted">${esc(a.note)}</p>`:''}</div>`).join(''):`<p class="mhm-unknown">${esc(t('Für dieses Wort liegt keine zugeordnete Bestimmung vor.'))}</p>`}${(form.hints||[]).length?`<p class="mhm-hints">${form.hints.map(h=>esc(typeof h==='string'?h:h.label||h.text||'')).filter(Boolean).join(' · ')}</p>`:''}${grammar(analyses)}${dictionaryEvidence(record)}<div class="mhm-actions">${unique.length?unique.map((lemma,i)=>`<div><button type="button" data-mhm-dict="${i}">${esc(t('Wörterbuch'))}${unique.length>1?` · <bdi lang="he" dir="rtl">${esc(lemma)}</bdi>`:''}</button><button type="button" data-mhm-forms="${i}">${esc(t('Belegte Formen'))} (${api().forms(data,lemma).length})</button></div>`).join(''):`<button type="button" data-mhm-word>${esc(t('Im Wörterbuch nachschlagen'))}</button>`}</div>`;
   popup.onclick=e=>{if(e.target.closest('.mhm-close')){closePopup();return;}const evidence=e.target.closest('[data-mhm-evidence]');if(evidence){const h=dictionaryHits(record)[Number(evidence.dataset.mhmEvidence)];if(h){close();openDict(h.head.normalize('NFD').replace(/[^א-ת]/g,''),{id:h.dictId,name:h.dict});}return;}const dict=e.target.closest('[data-mhm-dict]'),forms=e.target.closest('[data-mhm-forms]');if(dict){const q=unique[Number(dict.dataset.mhmDict)];close();openDict(q);return;}if(forms){showForms(unique[Number(forms.dataset.mhmForms)]);return;}if(e.target.closest('[data-mhm-word]')){close();openDict(record.word);}};
   document.body.append(popup);position();
  }
  $('#rOut').addEventListener('click',e=>{const word=e.target.closest('.mhw');if(!word||e.detail>1||String(window.getSelection()||'').trim())return;show(word);});
  $('#rOut').addEventListener('keydown',e=>{const word=e.target.closest('.mhw');if(word&&(e.key==='Enter'||e.key===' ')){e.preventDefault();show(word);popup?.querySelector('button')?.focus();}});
  document.addEventListener('pointerdown',e=>{if(popup&&!e.target.closest('#mishnahMorphPopup,.mhw'))closePopup();},true);
  window.addEventListener('keydown',e=>{if(e.key!=='Escape'||e.defaultPrevented||e.isComposing)return;if(popup||formsDialog){const target=anchor||formsAnchor;close();if(target?.isConnected)target.focus({preventScroll:true});e.preventDefault();e.stopImmediatePropagation();}},true);
  addEventListener('resize',position);document.addEventListener('scroll',position,{capture:true,passive:true});
  new MutationObserver(()=>{if(anchor&&!anchor.isConnected)closePopup();if(formsAnchor&&!formsAnchor.isConnected)closeForms();}).observe($('#rOut'),{childList:true,subtree:true});
  new MutationObserver(()=>{if(document.documentElement.dataset.tab!=='read')close();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-tab']});
  return {refresh,close};
 }
 return {create,supports:(title,version)=>TITLES.includes(title)&&version===VERSION};
})();
