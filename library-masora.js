// Published BIMA text editions, read entirely from the bundled offline projection.
window.LibraryMasora = (() => {
  'use strict';
  function create({ $, esc, getView, getRow, isBible, openExternal, load, showWord, getRows, getVisibleRow, selectRow }) {
    const panel=$('#masoraPanel'),body=$('#masoraBody'),D=window.MasoraData;
    const t=(...args)=>window.I18N.t(...args),safe=s=>esc(String(s??''));
    const kinds={mp:'Masora parva',mm:'Masora magna',mf:'Masora finalis',gl:'Glosse',cm:'Kommentar',sn:'Schreibernotiz',ge:'Glossareintrag',tg:'Targum',uncategorized:'Ohne Zuordnung'};
    let fontSize=16,index=null,indexPending=null,generation=0,limit=100,timer=null,contextKey='';
    const T=window.MasoraTranslations,translationParts=new Map(),translationPending=new Map();let translationIndex=null,translationMap=null,translationIndexPending=null;
    const datasets={},pending=new Map();let targets=[],follow=false,followTimer=null,lastFollow='';
    try{follow=localStorage.getItem('masoraFollow')==='1';}catch{}
    try{fontSize=Number(localStorage.getItem('masoraFs'))||16;}catch{}
    fontSize=Math.max(12,Math.min(28,fontSize));
    function context(){
      const view=getView(),section=view?.sections?.[view.idx];
      if(!isBible(view?.group?.title)||section?.path?.length!==1)return null;
      const chapter=section.path[0]+1;if(!Number.isInteger(chapter)||chapter<1)return null;
      const row=String(getRow()||'');return {book:view.group.title,chapter,verse:/^\d+$/.test(row)?Number(row):null};
    }
    function applyFont(){body.style.fontSize=fontSize+'px';$('#masoraFsMinus').disabled=fontSize<=12;$('#masoraFsPlus').disabled=fontSize>=28;}
    function getIndex(){
      return index?Promise.resolve(index):indexPending||(indexPending=load('masora-index.js',()=>window.MASORA_INDEX).then(async d=>{
        if(d?.schema!==1)throw Error('Unsupported Masorah index');
        D.setWordLinks(await load('masora-word-links.js',()=>window.MASORA_WORD_LINKS));index=d;
        $('#masoraMs').innerHTML='<option value="">'+safe(t('Alle Handschriften'))+'</option>'+d.manuscripts.map(m=>'<option value="'+safe(m.id)+'">'+safe(m.label)+'</option>').join('');
        return d;
      }).finally(()=>{indexPending=null;}));
    }
    function getManuscript(id){
      if(datasets[id])return Promise.resolve(datasets[id]);
      if(!pending.has(id)){
        const meta=index.manuscripts.find(m=>m.id===id);
        pending.set(id,load(meta.file,()=>window.MASORA_DATA?.[id]).then(d=>{if(d?.id!==id)throw Error('Wrong manuscript');return datasets[id]=d;}).finally(()=>pending.delete(id)));
      }
      return pending.get(id);
    }
    async function getTranslations(hits){
      if(!translationIndex)await (translationIndexPending||(translationIndexPending=load('masora-translations/index.js',()=>window.MASORA_TRANSLATION_INDEX).then(data=>{translationMap=T.index(data);translationIndex=data;}).finally(()=>{translationIndexPending=null;})));
      const parts=new Map();for(const hit of hits){const batch=translationMap.get(hit.entry.uuid);if(batch)parts.set(batch.part,batch);}
      await Promise.all([...parts.values()].map(batch=>{
        if(translationParts.has(batch.part))return null;
        if(!translationPending.has(batch.part))translationPending.set(batch.part,load(batch.file,()=>window.MASORA_TRANSLATION_PARTS?.[batch.part]).then(data=>{if(data?.schema!==1||data.part!==batch.part)throw Error('Wrong translation batch');translationParts.set(batch.part,data.notes);}).finally(()=>translationPending.delete(batch.part)));
        return translationPending.get(batch.part);
      }));
    }
    function translationFor(entry){const batch=translationMap?.get(entry.uuid);return batch?T.match(entry,translationParts.get(batch.part)?.[entry.uuid],D):null;}
    const note=value=>D.prose(value);
    function plain(value){
      // Original editorial prose may contain HTML; keep its text, never executable source markup.
      const template=document.createElement('template');template.innerHTML=String(value||'');
      for(const br of template.content.querySelectorAll('br'))br.replaceWith('\n');
      for(const p of template.content.querySelectorAll('p,div'))p.append('\n');
      return template.content.textContent.trim();
    }
    function wordButton(location,label){
      const id=targets.push(location)-1;
      return '<button type="button" class="masora-word" data-masora-target="'+id+'" title="'+safe(t('Wort im Lesetext markieren')+(location.method?.startsWith('westminster-cited')?' · '+t('Am MT geprüfter Vergleichsbeleg'):''))+'">'+label+'</button>';
    }
    function entryLabel(hit){
      const label='<bdi lang="he" dir="rtl">'+safe(hit.entry.label)+'</bdi>',all=D.locations(hit.page,hit.entry),ctx=context();
      const local=$('#masoraScope').value==='verse'?all.filter(m=>m.book===ctx?.book&&m.chapter===ctx.chapter&&m.verse===ctx.verse):[];
      const matches=local.length?local:all;
      if(matches.length&&new Set(matches.map(m=>m.label)).size===1){const loc=matches[0],ctx=context(),same=$('#masoraScope').value==='verse'&&ctx?.book===loc.book&&ctx.chapter===loc.chapter&&ctx.verse===loc.verse;return wordButton(loc,label)+(same?'':' <small class="muted">'+safe(t(loc.book)+' '+loc.chapter+':'+loc.verse)+'</small>');}
      if(!matches.length)return label;
      const verses=[...new Map(matches.map(m=>[m.label,m])).values()];
      return '<details class="masora-choices"><summary>'+label+'</summary><p class="muted">'+safe(t('Das Wort kommt auf dieser Seite mehrfach vor. Welche Stelle möchtest du anzeigen?'))+'</p>'+verses.map(m=>wordButton(m,safe(t(m.book)+' '+m.chapter+':'+m.verse))).join(' ')+'</details>';
    }
    function referenceButton(ref,hit){
      const loc=D.bibleRef(ref.label),checked=D.citationLocations(hit.page,hit.entry).filter(m=>loc&&m.book===loc.book&&m.chapter===loc.chapter&&m.verse===loc.verse);
      if(checked.length){
        const forms=[...new Map(checked.map(m=>[m.phrase,m])).values()];
        return forms.map(m=>wordButton(m,safe(t(m.book)+' '+m.chapter+':'+m.verse)+(forms.length>1?' · <bdi dir="rtl">'+safe(m.phrase)+'</bdi>':'')+' <span aria-label="'+safe(t('Am MT geprüfter Vergleichsbeleg'))+'">✓</span>')).join(' / ');
      }
      return loc?wordButton({...loc,phrase:''},safe(t(loc.book)+' '+loc.chapter+':'+loc.verse+(loc.endVerse!==loc.verse?'–'+loc.endVerse:''))):safe(ref.label);
    }
    function entryHtml(hit){
      const {page,entry,readings}=hit,info=D.explain(entry),kind=kinds[entry.type]||entry.type;
      const source='<details class="masora-page-source"><summary title="'+safe(hit.manuscript.label+' · '+(page.folio||page.label))+'">'+safe(t('Quelle'))+'</summary><p>'+safe(hit.manuscript.label)+' · '+safe(page.folio||page.label)+'</p><p class="muted">'+safe(D.referenceSummary(page.bibleRefs))+'</p><a class="masora-external" href="'+safe(page.url)+'">'+safe(t('Handschriftenseite in BIMA öffnen (online)'))+' ↗</a></details>';
      const explanation=T.html(translationFor(entry),safe,t)||'<div class="masora-explanation" role="note" title="'+safe(t('Automatisch erschlossene Lesehilfe; keine wissenschaftlich geprüfte Einzelerklärung.'))+'"><div class="masora-interpretation-label">'+safe(t('Lesehilfe'))+'</div><p>'+safe(t(info.meaning))+'</p></div>';
      return '<article class="masora-entry" data-masora-context="'+safe(entry.uuid)+'" data-masora-type="'+safe(entry.type)+'"><div class="masora-entry-line"><span class="masora-kind" title="'+safe(t(kind))+'">'+safe(({mp:'Mp',mm:'Mm',mf:'Mf'})[entry.type]||t(kind))+'</span><div class="masora-transcription">'+readings.map(({source:r,text,notes})=>
        '<span class="masora-reading">'+(text?'<bdi class="'+(/[\u0590-\u05ff]/.test(text)?'masora-he':'masora-note')+'" dir="'+(['rtl','ltr'].includes(r.dir)?r.dir:'auto')+'">'+safe(plain(text))+'</bdi>':'')+
        (r.references?.length?' <span class="masora-refs">'+r.references.map(ref=>referenceButton(ref,hit)).join(' · ')+'</span>':'')+
        (notes?' <span class="masora-note" dir="auto">'+safe(plain(notes))+'</span>':'')+'</span>').join('<span class="masora-separator" aria-hidden="true"> · </span>')+
        (note(entry.notes)?'<p class="masora-note" dir="auto">'+safe(plain(note(entry.notes)))+'</p>':'')+'</div></div><div class="masora-interpretation">'+explanation+'</div><div class="masora-actions">'+source+'</div></article>';
    }
    async function render(){
      const ctx=context();if(!ctx){close();return;}if(panel.hidden)return;
      $('#masoraPlace').textContent=t(ctx.book)+' '+ctx.chapter+(ctx.verse&&$('#masoraScope').value==='verse'?':'+ctx.verse:'');
      const options={scope:$('#masoraScope').value,manuscript:$('#masoraMs').value,type:$('#masoraType').value,q:$('#masoraQuery').value};
      const key=JSON.stringify([ctx.book,ctx.chapter,options.scope==='verse'?ctx.verse:null,options,limit]);
      syncControls();if(body.dataset.resultKey===key){markCurrent(ctx);return;}
      const listKey=JSON.stringify([ctx.book,ctx.chapter,options.scope==='verse'?ctx.verse:null,options]);
      const token=++generation;body.dataset.resultKey='';
      body.innerHTML='<p class="muted">'+safe(t('Masora wird geladen …'))+'</p>';
      try{
        await getIndex();if(token!==generation||panel.hidden)return;
        const ids=D.pageIds(index,ctx,options.scope),ms=D.manuscripts(index,ids).filter(id=>!options.manuscript||id===options.manuscript);
        await Promise.all(ms.map(getManuscript));if(token!==generation||panel.hidden)return;
        const hits=D.query(index,datasets,ctx,options),verseMode=options.scope==='verse'&&!!ctx.verse;
        const split=verseMode?D.forVerse(hits,ctx):{primary:hits,related:[]};
        let translationError=false;try{await getTranslations(split.primary.slice(0,limit));}catch{translationError=true;}if(token!==generation||panel.hidden)return;
        targets=[];
        const pageCount=new Set(hits.map(h=>h.page.id)).size;
        const count=verseMode?(split.primary.length===1?t('1 wortbezogene Notiz zum Vers'):t('{} wortbezogene Notizen zum Vers',split.primary.length)):t('{} Notizen auf {} Handschriftenseiten',hits.length,pageCount);
        const explanation=verseMode?'Automatisch ermittelter Wortbezug. Klicke auf das Wort, um es im Lesetext zu markieren.':options.scope==='citations'?'Die Notizen zitieren Bibelstellen aus diesem Kapitel. Das Zitat bestimmt nicht die Verankerung am Handschriftenwort.':'Die Auswahl folgt dem Bibeltext der Handschriftenseite. Die Masora-Notizen können auch benachbarte Verse betreffen.';
        const intro='<p class="masora-count">'+safe(count)+'</p><details class="masora-scope-info"><summary>'+safe(t('Wortbezug'))+'</summary><p class="muted masora-scope-note">'+safe(t(explanation))+'</p></details>';
        function renderHits(list){
          return D.wordGroups(list).map((group,i)=>'<section class="masora-word-group" data-word-group="'+i+'" data-masora-verse="'+(group.location?.verse||'')+'"><h3 class="masora-entry-head">'+entryLabel(group.hits[0])+'</h3><div class="masora-group-readings">'+group.hits.map(entryHtml).join('')+'</div></section>').join('');
        }
        const groups=D.wordGroups(split.primary.slice(0,limit));
        const wordNavigation=groups.length?'<nav class="masora-word-nav" aria-label="'+safe(t('Bezugswörter'))+'">'+groups.map((g,i)=>'<button type="button" data-masora-group="'+i+'"><bdi dir="rtl" lang="he">'+safe(g.label)+'</bdi> <small>'+g.hits.length+'</small></button>').join('')+'</nav>':'';
        const navigation=groups.length>12?'<details class="masora-word-index"><summary>'+safe(t('Bezugswörter'))+' · '+groups.length+'</summary>'+wordNavigation+'</details>':wordNavigation;
        const rows='<div class="masora-primary">'+renderHits(split.primary.slice(0,limit))+'</div>'+(verseMode&&!split.primary.length?'<p class="masora-no-word">'+safe(t('Für diesen Vers wurde kein eindeutiger Wortbezug ermittelt. Die Kapitelansicht zeigt die Notizen der Handschriftenseiten.'))+'</p>':'');
        const empty=hits.length?'':'<p class="masora-empty">'+safe(t('Keine passenden Notizen im importierten Bestand.'))+'</p>'+
          (['chapter','verse'].includes(options.scope)?'<button type="button" id="masoraBrowse">'+safe(t('Gesamten Bestand durchsuchen'))+'</button>':'');
        body.innerHTML='<p id="masoraWordStatus" role="status"></p>'+(translationError?'<p class="muted">'+safe(t('Arbeitsübersetzungen konnten nicht geladen werden. Die Originalnotizen bleiben verfügbar.'))+'</p>':'')+intro+navigation+rows+empty+(split.primary.length>limit?'<button type="button" id="masoraMore">'+safe(t('Weitere anzeigen'))+'</button>':'')+
          '<footer class="masora-credit"><p>'+safe(t('Offline-Bestand: {} Handschriften · {} Seiten · {} Masora-Einträge',index.counts.manuscripts,index.counts.pages,index.counts.transcribedMasoraContexts))+'</p>'+
          (!index.complete?'<p>'+safe(t('Teilimport: Weitere veröffentlichte Seiten werden noch geladen.'))+'</p>':'')+
          '<p>Corpus Masoreticum / BIMA · <a href="'+safe(index.source.licenseUrl)+'" class="masora-external">'+safe(index.source.license)+'</a> · '+safe(t('Import'))+' '+safe(index.source.retrieved)+'</p></footer>';
        body.dataset.resultKey=key;body.dataset.listKey=listKey;syncControls();markCurrent(ctx);
      }catch(e){
        if(token!==generation||panel.hidden)return;
        body.innerHTML='<p class="muted">'+safe(t('Masora-Daten konnten nicht geladen werden.'))+'</p><button type="button" id="masoraRetry">'+safe(t('Erneut versuchen'))+'</button>';
      }
    }
    function open(){if(!context())return false;panel.hidden=false;refresh();return true;}
    function close(){generation++;panel.hidden=true;}
    function syncControls(){
      const rows=getRows(),ctx=context(),at=rows.findIndex(r=>Number(r.dataset.l)===ctx?.verse);
      $('#masoraPrev').disabled=!rows.length||at<=0;$('#masoraNext').disabled=!rows.length||at===rows.length-1;
      $('#masoraWhole').textContent=t($('#masoraScope').value==='chapter'?'Ausgewählter Vers':'Ganzes Kapitel');
      $('#masoraFollow').classList.toggle('on',follow);$('#masoraFollow').setAttribute('aria-pressed',String(follow));
      const ms=$('#masoraMs');$('#masoraWitnesses').textContent=t('Handschriften')+' · '+(ms.value?'1':t('Alle'));
    }
    function markCurrent(ctx){
      const chapter=$('#masoraScope').value==='chapter';
      body.querySelectorAll('.masora-primary [data-masora-verse]').forEach(el=>el.classList.toggle('current',chapter&&Number(el.dataset.masoraVerse)===ctx.verse));
      const key=ctx.book+'|'+ctx.chapter+'|'+ctx.verse+'|'+chapter;
      if(follow&&chapter&&key!==lastFollow){const row=body.querySelector('.masora-word-group.current');if(row)panel.scrollTop+=row.getBoundingClientRect().top-panel.querySelector('.masora-head').getBoundingClientRect().bottom-6;}
      lastFollow=key;
    }
    function stepVerse(step){
      const ctx=context(),rows=getRows();if(!ctx||!rows.length)return;
      let at=rows.findIndex(r=>Number(r.dataset.l)===ctx.verse);if(at<0)at=rows.indexOf(getVisibleRow());
      const row=rows[Math.max(0,Math.min(rows.length-1,at+step))];
      $('#masoraScope').value='verse';showWord({...ctx,verse:Number(row.dataset.l),phrase:''}).catch(()=>{});
    }
    $('#masoraPrev').onclick=()=>stepVerse(-1);$('#masoraNext').onclick=()=>stepVerse(1);
    $('#masoraWhole').onclick=()=>{$('#masoraScope').value=$('#masoraScope').value==='chapter'?'verse':'chapter';filter();};
    $('#masoraSearchBtn').onclick=()=>{const search=$('#masoraSearch');search.hidden=!search.hidden;$('#masoraSearchBtn').setAttribute('aria-pressed',String(!search.hidden));if(!search.hidden)$('#masoraQuery').focus();};
    $('#masoraWitnesses').onclick=()=>{$('#masoraSettings').open=true;$('#masoraMs').focus();};
    document.addEventListener('pointerdown',e=>{const settings=$('#masoraSettings');if(settings.open&&!settings.contains(e.target)&&!e.target.closest('#masoraWitnesses'))settings.open=false;});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#masoraSettings').open){$('#masoraSettings').open=false;e.stopImmediatePropagation();$('#masoraSettings summary').focus();}},true);
    function followNow(){
      if(!follow||panel.hidden||getView()?.sres||(document.documentElement.dataset.tab||'read')!=='read')return;
      const row=getVisibleRow();if(row&&Number(row.dataset.l)!==context()?.verse)selectRow(row.dataset.l);
    }
    $('#masoraFollow').onclick=()=>{follow=!follow;syncControls();try{localStorage.setItem('masoraFollow',follow?'1':'0');}catch{}if(follow){lastFollow='';followNow();refresh();}};
    document.addEventListener('scroll',e=>{if(!follow||e.target.closest?.('aside,dialog'))return;clearTimeout(followTimer);followTimer=setTimeout(followNow,200);},{passive:true,capture:true});
    $('#masoraClose').onclick=close;
    for(const [id,step]of [['#masoraFsMinus',-1],['#masoraFsPlus',1]])$(id).onclick=()=>{fontSize=Math.max(12,Math.min(28,fontSize+step));applyFont();try{localStorage.setItem('masoraFs',String(fontSize));}catch{}};
    function refresh(){const ctx=context(),key=ctx?ctx.book+'|'+ctx.chapter+'|'+($('#masoraScope').value==='verse'?ctx.verse:''):'';if(key!==contextKey){contextKey=key;limit=100;}return render();}
    function filter(){limit=100;render();}
    $('#masoraQuery').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(filter,180);});
    for(const id of ['#masoraScope','#masoraMs','#masoraType'])$(id).addEventListener('change',filter);
    body.addEventListener('click',async e=>{
      const group=e.target.closest('[data-masora-group]');
      if(group){body.querySelector('.masora-primary [data-word-group="'+group.dataset.masoraGroup+'"]')?.scrollIntoView({block:'start',behavior:'smooth'});return;}
      const target=e.target.closest('[data-masora-target]');
      if(target){
        const location=targets[Number(target.dataset.masoraTarget)];if(!location)return;
        try{
          const marked=await showWord(location);
          const now=context();
          if(!now||now.book!==location.book||now.chapter!==location.chapter||now.verse!==location.verse)return;
          const status=$('#masoraWordStatus');if(status)status.textContent=marked?'':t('Das Bezugswort ist in der angezeigten hebräischen Fassung nicht vorhanden.');
        }catch{const status=$('#masoraWordStatus');if(status)status.textContent=t('Die Stelle konnte nicht geöffnet werden.');}
        return;
      }
      const link=e.target.closest('.masora-external');if(link){e.preventDefault();if(/^https:\/\/(bima2\.corpusmasoreticum\.de|creativecommons\.org)\//.test(link.href))openExternal(link.href);return;}
      if(e.target.closest('#masoraMore')){limit+=100;render();}
      if(e.target.closest('#masoraRetry'))render();
      if(e.target.closest('#masoraBrowse')){$('#masoraScope').value='all';filter();}
    });
    applyFont();syncControls();return {open,close,refresh,available:()=>!!context()};
  }
  return {create};
})();
