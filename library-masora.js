// Published BIMA text editions, read entirely from the bundled offline projection.
window.LibraryMasora = (() => {
  'use strict';
  function create({ $, esc, getView, getRow, isBible, openExternal, load }) {
    const panel=$('#masoraPanel'),body=$('#masoraBody'),D=window.MasoraData;
    const t=(...args)=>window.I18N.t(...args),safe=s=>esc(String(s??''));
    const kinds={mp:'Masora parva',mm:'Masora magna',mf:'Masora finalis',gl:'Glosse',cm:'Kommentar',sn:'Schreibernotiz',ge:'Glossareintrag',tg:'Targum',uncategorized:'Ohne Zuordnung'};
    let fontSize=16,index=null,indexPending=null,generation=0,limit=100,timer=null,contextKey='';
    const datasets={},pending=new Map();
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
      return index?Promise.resolve(index):indexPending||(indexPending=load('masora-index.js',()=>window.MASORA_INDEX).then(d=>{
        if(d?.schema!==1)throw Error('Unsupported Masorah index');index=d;
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
    const note=value=>D.prose(value);
    function plain(value){
      // Original editorial prose may contain HTML; keep its text, never executable source markup.
      const template=document.createElement('template');template.innerHTML=String(value||'');
      for(const br of template.content.querySelectorAll('br'))br.replaceWith('\n');
      for(const p of template.content.querySelectorAll('p,div'))p.append('\n');
      return template.content.textContent.trim();
    }
    function entryHtml(hit){
      const {page,entry,readings}=hit;
      return '<article class="masora-entry" data-masora-context="'+safe(entry.uuid)+'"><h4><span class="masora-kind">'+safe(t(kinds[entry.type]||entry.type))+'</span> <bdi lang="he" dir="auto">'+safe(entry.label)+'</bdi></h4>'+readings.map(({source:r,text,notes})=>
        '<div class="masora-reading">'+(text?'<p class="'+(/[\u0590-\u05ff]/.test(text)?'masora-he':'masora-note')+'" dir="'+(['rtl','ltr'].includes(r.dir)?r.dir:'auto')+'"'+(/[\u0590-\u05ff]/.test(text)?' lang="he"':'')+'>'+safe(plain(text))+'</p>':'')+
        (notes?'<p class="masora-note" dir="auto">'+safe(plain(notes))+'</p>':'')+
        (r.references?.length?'<p class="muted masora-refs">'+safe(t('Bibelstellen in der Notiz'))+': '+r.references.map(x=>safe(x.label)).join(' · ')+'</p>':'')+'</div>').join('')+
        (note(entry.notes)?'<p class="masora-note" dir="auto">'+safe(plain(note(entry.notes)))+'</p>':'')+'</article>';
    }
    async function render(){
      const ctx=context();if(!ctx){close();return;}if(panel.hidden)return;
      $('#masoraPlace').textContent=t(ctx.book)+' '+ctx.chapter;
      const options={scope:$('#masoraScope').value,manuscript:$('#masoraMs').value,type:$('#masoraType').value,q:$('#masoraQuery').value};
      const key=JSON.stringify([ctx.book,ctx.chapter,options,limit]);
      if(body.dataset.resultKey===key)return;
      const token=++generation;body.dataset.resultKey='';
      body.innerHTML='<p class="muted">'+safe(t('Masora wird geladen …'))+'</p>';
      try{
        await getIndex();if(token!==generation||panel.hidden)return;
        const ids=D.pageIds(index,ctx,options.scope),ms=D.manuscripts(index,ids).filter(id=>!options.manuscript||id===options.manuscript);
        await Promise.all(ms.map(getManuscript));if(token!==generation||panel.hidden)return;
        const hits=D.query(index,datasets,ctx,options),shown=hits.slice(0,limit);let lastPage=null;
        const pageCount=new Set(hits.map(h=>h.page.id)).size;
        const count=pageCount===1?(hits.length===1?t('1 Notiz auf 1 Handschriftenseite'):t('{} Notizen auf 1 Handschriftenseite',hits.length)):t('{} Notizen auf {} Handschriftenseiten',hits.length,pageCount);
        const intro='<p class="masora-count">'+safe(count)+'</p>'+
          '<p class="muted masora-scope-note">'+safe(t(options.scope==='citations'?'Die Notizen zitieren Bibelstellen aus diesem Kapitel. Das Zitat bestimmt nicht die Verankerung am Handschriftenwort.':'Die Auswahl folgt dem Bibeltext der Handschriftenseite. Die Masora-Notizen können auch benachbarte Verse betreffen.'))+'</p>';
        const rows=shown.map(hit=>{
          let head='';if(hit.page.id!==lastPage){lastPage=hit.page.id;head='<section class="masora-page"><h3>'+safe(hit.manuscript.label)+' · '+safe(hit.page.folio||hit.page.label)+'</h3><details class="muted masora-refs"><summary>'+safe(t('Bibeltext auf dieser Seite'))+': '+safe(D.referenceSummary(hit.page.bibleRefs)||t('Kein Bibeltextbezug angegeben'))+'</summary><p>'+safe(hit.page.bibleRefs.join(' · '))+'</p></details><a class="masora-external" href="'+safe(hit.page.url)+'">'+safe(t('Handschriftenseite in BIMA öffnen (online)'))+' ↗</a></section>';}
          return head+entryHtml(hit);
        }).join('');
        const empty=hits.length?'':'<p class="masora-empty">'+safe(t('Keine passenden Notizen im importierten Bestand.'))+'</p>'+
          (options.scope==='chapter'?'<button type="button" id="masoraBrowse">'+safe(t('Gesamten Bestand durchsuchen'))+'</button>':'');
        body.innerHTML=intro+rows+empty+(hits.length>limit?'<button type="button" id="masoraMore">'+safe(t('Weitere anzeigen'))+'</button>':'')+
          '<footer class="masora-credit"><p>'+safe(t('Offline-Bestand: {} Handschriften · {} Seiten · {} Masora-Einträge',index.counts.manuscripts,index.counts.pages,index.counts.transcribedMasoraContexts))+'</p>'+
          (!index.complete?'<p>'+safe(t('Teilimport: Weitere veröffentlichte Seiten werden noch geladen.'))+'</p>':'')+
          '<p>Corpus Masoreticum / BIMA · <a href="'+safe(index.source.licenseUrl)+'" class="masora-external">'+safe(index.source.license)+'</a> · '+safe(t('Import'))+' '+safe(index.source.retrieved)+'</p></footer>';
        body.dataset.resultKey=key;
      }catch(e){
        if(token!==generation||panel.hidden)return;
        body.innerHTML='<p class="muted">'+safe(t('Masora-Daten konnten nicht geladen werden.'))+'</p><button type="button" id="masoraRetry">'+safe(t('Erneut versuchen'))+'</button>';
      }
    }
    function open(){if(!context())return false;panel.hidden=false;refresh();return true;}
    function close(){generation++;panel.hidden=true;}
    $('#masoraClose').onclick=close;
    for(const [id,step]of [['#masoraFsMinus',-1],['#masoraFsPlus',1]])$(id).onclick=()=>{fontSize=Math.max(12,Math.min(28,fontSize+step));applyFont();try{localStorage.setItem('masoraFs',String(fontSize));}catch{}};
    function refresh(){const ctx=context(),key=ctx?ctx.book+'|'+ctx.chapter:'';if(key!==contextKey){contextKey=key;limit=100;}render();}
    function filter(){limit=100;render();}
    $('#masoraQuery').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(filter,180);});
    for(const id of ['#masoraScope','#masoraMs','#masoraType'])$(id).addEventListener('change',filter);
    body.addEventListener('click',e=>{
      const link=e.target.closest('.masora-external');if(link){e.preventDefault();if(/^https:\/\/(bima2\.corpusmasoreticum\.de|creativecommons\.org)\//.test(link.href))openExternal(link.href);return;}
      if(e.target.closest('#masoraMore')){limit+=100;render();}
      if(e.target.closest('#masoraRetry'))render();
      if(e.target.closest('#masoraBrowse')){$('#masoraScope').value='all';filter();}
    });
    applyFont();return {open,close,refresh,available:()=>!!context()};
  }
  return {create};
})();
