// Corpus-bound candidate analyses for the vocalized Kaufmann editions of Seder Zeraim.
window.LibraryMishnahMorph=(()=>{
 'use strict';
 const TITLES=['Mishnah Berakhot','Mishnah Peah','Mishnah Demai','Mishnah Kilayim','Mishnah Sheviit','Mishnah Terumot','Mishnah Maasrot','Mishnah Maaser Sheni','Mishnah Challah','Mishnah Orlah','Mishnah Bikkurim'],VERSION="Mishnah based on the Kaufmann manuscript, edited by Dan Be'eri";
 const DERIVED_VERSION="Kaufmann A50 (Digital Mishnah), vocalized after Be'eri";
 const ACCORDANCE_VERSION='Kaufmann A50 (Digital Mishnah), provisional Accordance pointing';
 const derivedVersion=v=>v===DERIVED_VERSION||v===ACCORDANCE_VERSION;
 const editionLabel=v=>v===ACCORDANCE_VERSION?'Digital Mishnah · vorläufige Accordance-Punktierung · nicht am Manuskript geprüft':'Digital Mishnah · Punktierung nach Be’eri · teilweise/offen';
 const RABBINIC_DICTIONARIES=['d895bc1c727b','e8d290b744f6','d701423861c6']; // Jastrow, Levy, Krauss
 const IGNORE='small,sup,.note,.footnote,a.aref,.aref,.mci-labels,.mci-witness,.mci-open,.mci-insertion,.mci-note';
 function imageURL(url){
  try{const u=new URL(url),prefix='/download/Mishnah_Kaufman_ms/',file=decodeURIComponent(u.pathname.slice(prefix.length));return u.protocol==='https:'&&u.hostname==='archive.org'&&!u.port&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname.startsWith(prefix)&&/^[^/\\?#]+\.jpg$/i.test(file)&&!file.includes('..')?u.href:null;}catch{return null;}
 }
 function sourceWord(unit,token){const index=unit?.words?.findIndex(w=>w.start<=token.start&&w.end>=token.end);return index>=0?{id:unit.id+'/word/'+index,index,word:unit.words[index]}:null;}
 function boundImageEvidence(data,evidence,id){
  if(!derivedVersion(data?.source?.versionTitle)||evidence?.title!=='Mishnah Berakhot'||evidence.targetTextHash!==data.source.textHash||evidence.diplomaticSha256!==data.source.diplomaticSha256)return null;
  return evidence.words?.[id]||null;
 }
 function create({$,esc,getView,load,openDict,closeOther,openExternal}){
  let data=null,dictionaryData=null,selectedImages=null,generation=0,popup=null,anchor=null,formsDialog=null,formsAnchor=null;
  const pending=new Map(),records=new WeakMap(),t=(s,...args)=>window.I18N?.t(s,...args)??s;
  const api=()=>window.MishnahMorph;
  function closePopup(){popup?.remove();popup=null;if(anchor){anchor.classList.remove('mhw-selected');anchor.removeAttribute('aria-expanded');}anchor=null;}
  function closeForms(){if(formsDialog){if(formsDialog.open)formsDialog.close();formsDialog.remove();}formsDialog=null;formsAnchor=null;}
  function close(){closePopup();closeForms();}
  function ready(title,version){
   const berakhot=title==='Mishnah Berakhot',derived=berakhot&&derivedVersion(version),accordance=derived&&version===ACCORDANCE_VERSION,key=accordance?'berakhot-accordance':derived?'berakhot-derived':berakhot?'berakhot':'zeraim';
   if(pending.has(key))return pending.get(key);
   const promise=Promise.all([
    load('mishnah-morph.js',()=>window.MishnahMorph),
    derived?load(accordance?'mishnah-kaufmann-accordance-data.js':'mishnah-kaufmann-berakhot-data.js',()=>accordance?window.MISHNAH_KAUFMANN_ACCORDANCE_DATA:window.MISHNAH_KAUFMANN_BERAKHOT_DATA):berakhot?load('mishnah-morph-data.js',()=>window.MISHNAH_MORPH_DATA):load('mishnah-zeraim-data.js',()=>window.MISHNAH_ZERAIM_DATA),
    load('mishnah-meanings.js',()=>window.MishnahMeanings),
    load('mishnah-dictionary-data.js',()=>window.MISHNAH_DICTIONARY_DATA),
    derived?load(accordance?'mishnah-kaufmann-accordance-image-data.js':'mishnah-kaufmann-image-data.js',()=>accordance?window.MISHNAH_KAUFMANN_ACCORDANCE_IMAGE_DATA:window.MISHNAH_KAUFMANN_IMAGE_DATA).catch(()=>null):null
   ]).then(([,d,,dictionary,images])=>({data:d,dictionary,images})).catch(err=>{pending.delete(key);throw err;});
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
   const unit=derivedVersion(data.source?.versionTitle)?data.units?.[ch+':'+m]:null;
   // Lexical tokens can split one diplomatic abbreviation; retain source spans.
   const sourceTokens=unit?api().tokens(unit.offsetText):[],sourceWords=sourceTokens.map(t=>sourceWord(unit,t)),pointing=sourceWords.map(w=>w?.word.pointingStatus);
   for(let i=tokens.length-1;i>=0;i--){
    const span=document.createElement('span'),open=unit&&sourceTokens.length===tokens.length&&sourceTokens[i]?.word===tokens[i].word&&pointing[i]==='open';span.className='mhw'+(open&&!ranges[i].startContainer.parentElement?.closest('.kpt-open')?' muted kpt-open':'');if(open)span.title=t('Punktierung offen; Schreibweise oder Wortzuordnung nicht gesichert.');span.tabIndex=0;span.setAttribute('role','button');span.setAttribute('aria-label',t('Wortbestimmung für {} öffnen',tokens[i].word));
    if(unit&&sourceTokens.length===tokens.length&&sourceTokens[i]?.word===tokens[i].word&&sourceWords[i])span.dataset.kaufmannWord=sourceWords[i].id;
    span.append(ranges[i].extractContents());ranges[i].insertNode(span);
    records.set(span,{id:ids[i],word:tokens[i].word,key:tokens[i].key,rel:doc.entry.rel,chapter:ch,mishnah:m,data,dictionaryData,imageData:selectedImages,sourceWordId:span.dataset.kaufmannWord,pointingStatus:unit&&sourceTokens.length===tokens.length&&sourceTokens[i]?.word===tokens[i].word?pointing[i]:undefined});
   }
   cell.dataset.mishnahMorphReady='1';cell.dataset.mishnahMorphState='matched';
  }
  function mismatch(cell){
   for(const word of cell.querySelectorAll('.mhw')){records.delete(word);word.replaceWith(...word.childNodes);}
   delete cell.dataset.mishnahMorphReady;cell.dataset.mishnahMorphState='source-mismatch';
  }
  async function refresh(){
   const token=++generation;close();
   const view=getView(),path=view?.sections?.[view.idx]?.path;
   if(!TITLES.includes(view?.group?.title)||!Array.isArray(path)||path.length!==1||!Number.isInteger(path[0]))return;
   const cells=[...$('#rOut').querySelectorAll('.cell[data-mishnah-morph]')];if(!cells.length)return;
   for(const cell of cells){
    if(!cell.isConnected)continue;
    const doc=view.loaded.find(d=>d.entry.rel===cell.dataset.rel),version=doc?.entry.versionTitle||doc?.versionTitle;
    if(doc?.entry.title!==view.group.title||version!==VERSION&&!(view.group.title==='Mishnah Berakhot'&&derivedVersion(version))){mismatch(cell);continue;}
    let selected;try{selected=await ready(view.group.title,version);}catch{mismatch(cell);continue;}
    if(token!==generation||getView()!==view||view.sections?.[view.idx]?.path?.[0]!==path[0])return;
    data=selected.data;dictionaryData=selected.dictionary;selectedImages=selected.images;const source=data?.sources?.[view.group.title];
    if(!source||doc.textHash!==source.textHash||derivedVersion(version)&&(doc.entry.rel!==source.rel||data.source?.versionTitle!==version||version===ACCORDANCE_VERSION&&(!data.source.provisional||data.source.pointingDonor!=='Accordance'))){mismatch(cell);continue;}
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
   const result=window.MishnahMeanings?.lookup(a,window.I18N?.lang||'de');
   if(!result||result.source!=='editorial')return `<p class="mhm-meaning muted">${esc(t('Noch keine Kurzbedeutung hinterlegt.'))}</p>`;
   const source='Redaktionelle Kurzbedeutung';
   return `<p class="mhm-meaning"><span class="muted">${esc(t('Bedeutung'))}</span> ${esc(result.text)} <small class="muted">${esc(t(source))}</small></p>`;
  }
  function loanword(a){
   const l=a.loanword;if(!l?.form||l.source!=='Krauss')return '';
   return `<p class="mhm-loanword"><small class="muted">${esc(t('Herkunftsangabe bei Krauss'))}</small><br>${esc(t(l.language))} · <bdi dir="ltr">${esc(l.form)}</bdi></p>`;
  }
  function comparison(a){
   const c=a.comparison;if(c?.status!=='visually-checked'||c.module!=='Mishna-Tagged (Kaufmann)')return '';
   return `<details class="mhm-grammar mhm-comparison"><summary>${esc(t('Accordance-Bildbeleg'))}</summary><p>${esc(c.module)} · ${esc(c.ref)}</p><p><span class="muted">Lex</span> <bdi lang="he" dir="rtl">${esc(c.lex)}</bdi><br><span class="muted">Tag</span> ${esc(c.tags)}</p>${c.suffixFeatures?`<p>${esc(t('Suffixmerkmale redaktionell ergänzt; im Bild nicht gesondert ausgewiesen.'))}</p>`:''}<small>${esc(c.file)}<br>Drive-ID: ${esc(c.driveId)}</small></details>`;
  }
  function grammar(analyses){
   const ids=[...new Set(analyses.flatMap(a=>a.rules||[]))],rules=ids.map(id=>data.rules?.[id]).filter(r=>r?.label);
   if(!rules.length)return '';
   return `<details class="mhm-grammar"><summary>${esc(t('Grammatik und Belege'))}</summary><ul>${rules.map(r=>`<li>${esc(r.label)}${r.refs?.length?`<small>${r.refs.map(ref=>esc(typeof ref==='string'?ref:ref.label||ref.citation||'')).filter(Boolean).join(' · ')}</small>`:''}</li>`).join('')}</ul></details>`;
  }
  function openRabbinicDictionary(query,only){
   if(only&&!RABBINIC_DICTIONARIES.includes(only.id))return;
   openDict(query,only||{id:[...RABBINIC_DICTIONARIES],name:'Jastrow · Levy · Krauss'});
  }
  function dictionaryHits(record){
   const hits=[...(dictionaryData?.forms?.[record.key]||[]),...(record.data.forms[record.id]?.dictionaryEvidence||[])];
   return hits.filter((h,i)=>RABBINIC_DICTIONARIES.includes(h.dictId)&&hits.findIndex(x=>x.dictId===h.dictId&&x.entry===h.entry)===i);
  }
  function dictionaryEvidence(record){
   const hits=dictionaryHits(record);if(!hits.length)return '';
   const labels={'reviewed-entry':'Redaktionell ausgewerteter Wörterbuchbeleg','pointed-head':'Stichwort mit gleicher Vokalisierung','exact-head':'Stichworttreffer','consonantal-head':'Stichwort mit gleichen Konsonanten'};
   return `<details class="mhm-grammar mhm-dictionaries"><summary>${esc(t('Rabbinische Wörterbücher'))} (${hits.length})</summary><p class="muted">${esc(t('Suchtreffer bestätigen noch keine Wortart oder Bedeutung im Satz.'))}</p><ul>${hits.map((h,i)=>`<li><button type="button" data-mhm-evidence="${i}"><bdi lang="he" dir="rtl">${esc(h.head)}</bdi> · ${esc(h.dict)}</button><small>${esc(t(labels[h.match]||'Stichworttreffer'))}${h.queryKind==='possible-proclitic-remainder'?' · '+esc(t('Mögliche Restform nach Vorsilbe')):''}</small></li>`).join('')}</ul></details>`;
  }
  function provenance(form,record){
   if(record.data.source?.versionTitle!==ACCORDANCE_VERSION)return '';
   const p=form.provenance||{},pointing=p.pointing||{},analysis=p.analysis||{},translation=p.translation||{};
   const named=source=>typeof source==='string'&&source?source:'keine Quelle zugeordnet';
   const open=record.pointingStatus==='open'||pointing.status==='open';
   return `<details class="mhm-grammar mhm-provenance"><summary>${esc(t('Herkunft und Prüfstand'))}</summary><p data-provenance="pointing"><b>${esc(t('Punktierung'))}</b>: ${esc(named(pointing.source))} · ${esc(t(open?'offen; keine Ersatzpunktierung':'vorläufig übertragen; nicht am Manuskript geprüft'))}${Array.isArray(pointing.cautions)?pointing.cautions.filter(c=>typeof c==='string'&&c.trim()).map(c=>'<br><span class="mhm-pointing-caution">'+esc(c.includes('Offener Bildkonflikt')?c:'Offener Bildkonflikt: '+c)+'</span>').join(''):''}</p><p data-provenance="analysis"><b>${esc(t('Wortbestimmung'))}</b>: ${esc(named(analysis.source))} · ${esc(t(analysis.kind==='contextual-rabbinic-lexicon'?'KI-Kontextprüfung mit rabbinischem Wörterbuch; Analysekandidat':analysis.kind==='interlinear-position'?'automatisch aus eindeutiger Interlinearverknüpfung; Analysekandidat':form.analyses?.length?'bestehender Kandidat; nicht erneut geprüft':'keine Bestimmung zugeordnet'))}${analysis.pointingMatch===false?' · '+esc(t('abweichende Punktierung; Zuordnung offen')):''}${analysis.pointingMatch===false&&analysis.sourceWord?'<br>'+esc(t('Analyse bisher zu'))+': <bdi lang="he" dir="rtl">'+esc(analysis.sourceWord)+'</bdi>':''}</p><p data-provenance="translation"><b>${esc(t('Kurzbedeutung'))}</b>: ${esc(named(translation.source))} · ${esc(t(translation.kind==='contextual-rabbinic-lexicon'?'KI-Prüfung nach rabbinischem Wörterbuch':'nicht erneut geprüft'))}${translation.conditionalOnAnalysis?' · '+esc(t('abhängig von der vorgeschlagenen Bestimmung')):''}</p></details>`;
  }
  function imageLinks(record){
   const evidence=boundImageEvidence(record.data,record.imageData,record.sourceWordId);if(!evidence)return [];
   return [...new Set([...(evidence.locations||[]),...(evidence.reviews||[])].map(l=>l.folio))].map(folio=>({folio,url:imageURL(record.imageData.images?.[folio]?.url)})).filter(x=>x.url);
  }
  function imageEvidence(record){
   const e=boundImageEvidence(record.data,record.imageData,record.sourceWordId);if(!e)return '';
   const side=s=>s==='right'?'rechte Spalte':s==='left'?'linke Spalte':'Spalte offen',links=imageLinks(record),status=e.reviewStatus;
   const location=(e.locations||[]).map(l=>'Blatt '+l.folio+' · '+side(l.column)+(l.sourceLine?' · Quellzeile '+l.sourceLine:' · Zeile nicht nummeriert')+(l.placement==='margin-right'?' · rechter Rand':l.placement==='margin-left'?' · linker Rand':'')+(l.unnumberedLine?' · unnummerierte Zeile':'')).map(esc).join('<br>');
   const labels={clear:'KI-Bildlesung · als klar erfasst',uncertain:'KI-Bildlesung · unsicher / Teilpunktierung','not-visible':'KI-Bildlesung · nicht lesbar',conflicting:'Widersprüchliche KI-Bildlesungen'};
   const readings=(e.reviews||[]).map(r=>`<div class="mhm-image-reading"><p>${esc(t(labels[r.status]||'KI-Bildlesung · unsicher'))} · ${esc('Blatt '+r.folio+' · '+side(r.column)+' · Bildzeile '+r.line)}</p>${r.reading?`<bdi lang="he" dir="rtl">${esc(r.reading)}</bdi>`:''}${r.notes?.length?`<details><summary>${esc(t('Hinweise zur Lesung'))}</summary><p>${r.notes.map(esc).join('<br>')}</p></details>`:''}</div>`).join('');
   return `<details class="mhm-grammar mhm-image-source" data-image-status="${esc(status)}"><summary>${esc(t('Kaufmann · Bildquelle'))}</summary><p>${location}</p>${status==='conflicting'?`<p>${esc(t(labels.conflicting))}</p>`:''}${readings||`<p class="mhm-image-location-only">${esc(t('Bisher nur Quellenort zugeordnet; keine Bildlesung erfasst.'))}</p>`}<p class="muted">${esc(t('Quellenort aus der Transkription; KI-Bildlesungen zur Nachprüfung. Keine abschließende Handschriftenprüfung.'))}</p>${links.map((l,i)=>`<button type="button" data-mhm-image="${i}">${esc(t('Manuskriptbild öffnen'))} · ${esc(l.folio)}</button>`).join('')}</details>`;
  }
  function position(){if(!popup||!anchor?.isConnected)return;const r=anchor.getBoundingClientRect(),w=popup.offsetWidth,h=popup.offsetHeight;popup.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';popup.style.top=(r.bottom+h+8<=innerHeight?r.bottom+6:Math.max(8,r.top-h-6))+'px';}
  function showForms(lemma){
   const at=anchor,rows=api().forms(data,lemma);closePopup();closeForms();formsAnchor=at;
   formsDialog=document.createElement('dialog');formsDialog.id='mishnahMorphForms';formsDialog.setAttribute('aria-labelledby','mishnahMorphFormsTitle');
   formsDialog.innerHTML=`<div class="mhm-dialog-head"><h3 id="mishnahMorphFormsTitle">${esc(t('Belegte Formen'))}: <bdi dir="rtl" lang="he">${esc(lemma)}</bdi></h3><button type="button" class="mhm-close" aria-label="${esc(t('Schließen'))}">✕</button></div><p class="mhm-badge">${esc(t('Mögliche Zuordnungen · maschinell'))}</p><p class="muted">${esc(t(derivedVersion(data.source?.versionTitle)?editionLabel(data.source.versionTitle):data.title==='Mishnah Berakhot'?'Vorkommen in der Kaufmann-Fassung von Mischna Berakhot.':'Vorkommen in der Kaufmann-Fassung von Seder Seraim.'))}</p>${rows.length?`<div class="mhm-table-scroll"><table><thead><tr><th>${esc(t('Form'))}</th><th>${esc(t('Vorkommen'))}</th><th>${esc(t('Mögliche Bestimmung'))}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><bdi dir="rtl" lang="he">${esc(r.word)}</bdi></td><td>${Number.isFinite(r.count)?r.count:'–'}</td><td>${[...new Set((r.analyses||[]).filter(a=>headLemma(a)===lemma).map(description))].map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table></div>`:`<p>${esc(t('Keine belegten Formen zugeordnet.'))}</p>`}`;
   formsDialog.querySelector('.mhm-close').onclick=closeForms;formsDialog.addEventListener('cancel',e=>{e.preventDefault();closeForms();});formsDialog.addEventListener('click',e=>{if(e.target===formsDialog)closeForms();});document.body.append(formsDialog);formsDialog.showModal();
  }
  function show(word){
   const record=records.get(word);if(!record||!word.isConnected||api().normalize(word.textContent)!==record.key)return;
   data=record.data;dictionaryData=record.dictionaryData;
   const same=word===anchor;closePopup();if(same)return;closeOther?.();
   const form=api().form(data,record.id)||{status:'unresolved',analyses:[],hints:[]},analyses=form.analyses||[],labels={candidate:'Maschineller Vorschlag',ambiguous:'Mehrere mögliche Bestimmungen',partial:'Teilweise bestimmbar',unresolved:'Keine Bestimmung'};
   anchor=word;word.classList.add('mhw-selected');word.setAttribute('aria-expanded','true');popup=document.createElement('div');popup.id='mishnahMorphPopup';popup.setAttribute('role','dialog');popup.setAttribute('aria-label',t('Wortbestimmung'));
   const unique=[...new Set(analyses.map(headLemma).filter(Boolean))];
   popup.innerHTML=`<div class="mhm-top"><bdi class="mhm-word" dir="rtl" lang="he">${esc(record.word)}</bdi><button type="button" class="mhm-close" aria-label="${esc(t('Schließen'))}">✕</button></div><div class="mhm-badge">${form.status==='candidate'?'':esc(t('Maschinell'))+' · '}${esc(t(labels[form.status]||labels.unresolved))}</div>${derivedVersion(data.source?.versionTitle)?`<p class="mhm-analysis-note muted">${esc(t(editionLabel(data.source.versionTitle)))}${record.pointingStatus==='open'?' · '+esc(t('Punktierung offen')):''}</p>`:''}${analyses.length?analyses.map(a=>`<div class="mhm-analysis"><div><span class="muted">${esc(t('Grundform'))}</span> <bdi dir="rtl" lang="he">${esc(headLemma(a))}</bdi>${a.root?` <span class="muted">· ${esc(t('Wurzel'))}</span> <bdi dir="rtl" lang="he">${esc(a.root)}</bdi>`:''}</div>${meaning(a)}${loanword(a)}${comparison(a)}<p>${esc(description(a))}</p>${a.note?`<p class="mhm-analysis-note muted">${esc(a.note)}</p>`:''}</div>`).join(''):`<p class="mhm-unknown">${esc(t('Für dieses Wort liegt keine zugeordnete Bestimmung vor.'))}</p>`}${(form.hints||[]).length?`<p class="mhm-hints">${form.hints.map(h=>esc(typeof h==='string'?h:h.label||h.text||'')).filter(Boolean).join(' · ')}</p>`:''}${provenance(form,record)}${imageEvidence(record)}${grammar(analyses)}${dictionaryEvidence(record)}<div class="mhm-actions">${unique.length?unique.map((lemma,i)=>`<div><button type="button" data-mhm-dict="${i}">${esc(t('Wörterbuch'))}${unique.length>1?` · <bdi lang="he" dir="rtl">${esc(lemma)}</bdi>`:''}</button><button type="button" data-mhm-forms="${i}">${esc(t('Belegte Formen'))} (${api().forms(data,lemma).length})</button></div>`).join(''):`<button type="button" data-mhm-word>${esc(t('Im Wörterbuch nachschlagen'))}</button>`}</div>`;
   popup.onclick=e=>{if(e.target.closest('.mhm-close')){closePopup();return;}const image=e.target.closest('[data-mhm-image]');if(image){const link=imageLinks(record)[Number(image.dataset.mhmImage)];if(link&&imageURL(link.url))openExternal?.(link.url);return;}const evidence=e.target.closest('[data-mhm-evidence]');if(evidence){const h=dictionaryHits(record)[Number(evidence.dataset.mhmEvidence)];if(h){close();openRabbinicDictionary(h.head.normalize('NFD').replace(/[^א-ת]/g,''),{id:h.dictId,name:h.dict});}return;}const dict=e.target.closest('[data-mhm-dict]'),forms=e.target.closest('[data-mhm-forms]');if(dict){const q=unique[Number(dict.dataset.mhmDict)];close();openRabbinicDictionary(q);return;}if(forms){showForms(unique[Number(forms.dataset.mhmForms)]);return;}if(e.target.closest('[data-mhm-word]')){close();openRabbinicDictionary(record.word);}};
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
 return {create,imageURL,sourceWord,boundImageEvidence,supports:(title,version)=>TITLES.includes(title)&&version===VERSION||title==='Mishnah Berakhot'&&derivedVersion(version)};
})();
