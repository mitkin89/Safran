// One independent, lazy-loaded apparatus pane per reading frame.
window.LibraryTextCrit=(()=>{
'use strict';
function create(host){
  const {$}=host,esc=s=>host.esc(window.I18N?.textCrit?.(String(s))??s), panel=$('#textcritPanel'), body=$('#tcBody');
  const torah=new Set(['Genesis','Exodus','Leviticus','Numbers','Deuteronomy']);
  const books=new Set([...torah,'Joshua','Judges','I Samuel','II Samuel','I Kings','II Kings','Isaiah','Jeremiah','Ezekiel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Psalms','Proverbs','Job','Ruth','Song of Songs','Ecclesiastes','Lamentations','Esther','Daniel','Ezra','Nehemiah','I Chronicles','II Chronicles']);
  const mishnah=window.LibraryMishnahTextCrit.create(host);
  const tov=window.LibraryTov.create(host),dss=window.LibraryQumran.create(host),ken=window.LibraryKennicott.create(host),ps=window.LibraryPeshittaTC.create(host),hx=window.LibraryHexaplaTC.create(host),ma=window.LibraryAleppoTC.create(host);
  let key='',selected=null,clickedTal=null,generation=0,pending=null,previewData=null,hover=null,hoverAnchor=null,showTimer=null,hideTimer=null;
  let whole=false,follow=false,fontSize=14,lastContentKey=null,followTimer=null;
  try {follow=localStorage.getItem('tcFollow')==='1';fontSize=+localStorage.getItem('tcFs')||14;}catch{}
  fontSize=Math.max(10,Math.min(28,fontSize));
  const applyFont=()=>{
    document.documentElement.style.setProperty('--tc-fs',fontSize+'px');
    $('#tcFsMinus').disabled=fontSize<=10;$('#tcFsPlus').disabled=fontSize>=28;
  };
  applyFont();
  for(const [id,step] of [['#tcFsMinus',-1],['#tcFsPlus',1]])$(id).onclick=()=>{
    hidePreview();fontSize=Math.max(10,Math.min(28,fontSize+step));applyFont();
    try{localStorage.setItem('tcFs',String(fontSize));}catch{}
  };
  const syncFollow=()=>{$('#tcFollow').classList.toggle('on',follow);$('#tcFollow').setAttribute('aria-pressed',String(follow));};
  syncFollow();
  try{$('#tcWitnessOptions').hidden=localStorage.getItem('tcWitnessExpanded')!=='1';}catch{}
  function syncWitness(){
    const expanded=!$('#tcWitnessOptions').hidden,isMishnah=host.getView()?.group?.title==='Mishnah Berakhot',n=isMishnah?1+Number($('#tcMishnahParma').checked)+Number($('#tcMishnahCambridge').checked):Number($('#tcSmr').checked)+Number($('#tcTov').checked)+Number($('#tcDss').checked)+Number($('#tcKen').checked)+Number($('#tcPs').checked)+Number($('#tcHex').checked)+Number($('#tcMa').checked);
    $('#tcWitnessSummary').setAttribute('aria-expanded',String(expanded));
    $('#tcWitnessSummary').innerHTML=(expanded?'▾':'▸')+' '+esc('Textzeugen')+' <span class="muted">'+esc(n===(isMishnah?3:7)?I18N.t('Alle {}',n):n?I18N.t('{} ausgewählt',n):I18N.t('Keine'))+'</span>';
  }
  try{$('#tcSmr').checked=localStorage.getItem('tcSmr')!=='0';}catch{}
  try{$('#tcTov').checked=localStorage.getItem('tcTov')!=='0';}catch{}
  try{$('#tcDss').checked=localStorage.getItem('tcDss')!=='0';}catch{}
  try{$('#tcKen').checked=localStorage.getItem('tcKen')!=='0';}catch{}
  try{$('#tcPs').checked=localStorage.getItem('tcPs')!=='0';$('#tcPsTech').checked=localStorage.getItem('tcPsTech')==='1';$('#tcCompact').checked=localStorage.getItem('tcCompact')==='1';$('#tcTovTech').checked=localStorage.getItem('tcTovTech')==='1';}catch{}
  try{$('#tcHex').checked=localStorage.getItem('tcHex')!=='0';$('#tcMa').checked=localStorage.getItem('tcMa')!=='0';$('#tcMaAcc').checked=localStorage.getItem('tcMaAcc')==='1';}catch{}
  for(const [id,key]of [['#tcMishnahParma','tcMP'],['#tcMishnahCambridge','tcMC']]){try{$(id).checked=localStorage.getItem(key)!=='0';}catch{}}
  const settings=$('#tcSettings');
  document.addEventListener('pointerdown',e=>{if(settings.open&&!settings.contains(e.target))settings.open=false;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&settings.open){settings.open=false;e.stopImmediatePropagation();settings.querySelector('summary').focus();}},true);
  syncWitness();
  $('#tcWitnessSummary').onclick=()=>{
    $('#tcWitnessOptions').hidden=!$('#tcWitnessOptions').hidden;syncWitness();
    try{localStorage.setItem('tcWitnessExpanded',$('#tcWitnessOptions').hidden?'0':'1');}catch{}
  };
  try{let frame=0;new ResizeObserver(()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;panel.style.setProperty('--tc-head-h',panel.querySelector('.tc-head').offsetHeight+'px');});}).observe(panel.querySelector('.tc-head'));}catch{}
  function rows(){return [...$('#rOut').querySelectorAll('.row[data-l]')].filter(r=>/^\d+$/.test(r.dataset.l));}
  function context(){
    const v=host.getView(),s=v?.sections?.[v.idx],chapter=s?.path?.length===1?s.path[0]+1:null;
    const isMishnah=v?.group?.title==='Mishnah Berakhot';
    if((!books.has(v?.group?.title)&&!isMishnah)||!Number.isInteger(chapter))return null;
    const next=v.group.key+'|'+s.k;
    if(next!==key){key=next;selected=null;clickedTal=null;lastContentKey=null;}
    const row=selected||host.getRow()||$('#rOut .row.hit')?.dataset.l||$('#rOut .row[data-l]')?.dataset.l;
    if(!/^\d+$/.test(row||''))return null;
    const autoTal=clickedTal??(v.loaded?.length>0&&v.loaded.every(d=>d.talWordNotes));
    const numbering=!torah.has(v.group.title)?'mt':$('#tcNumbering').value==='auto'?(autoTal?'tal':'mt'):$('#tcNumbering').value;
    return {book:v.group.title,chapter,ref:v.group.title+' '+chapter+':'+row,numbering:isMishnah?'kaufmann':numbering,row,isMishnah};
  }
  function load(){
    return pending||(pending=Promise.all([host.load('textcrit-data.js',()=>window.TEXTCRIT_DATA),host.load('samaritan-data.js',()=>window.SAMARITAN_DATA),tov.load(),ken.load(),host.load('samaritan-il.js',()=>window.SAMARITAN_IL)]).catch(e=>{pending=null;throw e;}));
  }
  function word(w,interactive=true){
    const [text,mask,id]=w;let inner='',buf='',state=false;
    // BigInt: long source words must retain every printed red bit.
    const bits=BigInt(mask);
    const flush=()=>{if(buf)inner+=state?'<span class="mt-diff">'+esc(buf)+'</span>':esc(buf);buf='';};
    Array.from(text).forEach((c,i,a)=>{const red=!!(bits&(1n<<BigInt(a.length-i-1)));if(red!==state){flush();state=red;}buf+=c;});flush();
    if(!interactive)return inner;
    return '<span class="w" data-l="'+esc(id)+'" data-m="">'+inner+'</span>';
  }
  function english(spans){return spans.map(([s,f])=>{let h=esc(s);if(f&2)h='<em>'+h+'</em>';return f&1?'<span class="mt-diff">'+h+'</span>':h;}).join('');}
  function hidePreview(){
    clearTimeout(showTimer);clearTimeout(hideTimer);
    hoverAnchor?.removeAttribute('aria-describedby');hoverAnchor=null;
    hover?.remove();hover=null;
  }
  function showPreview(anchor){
    hidePreview();
    const ref=anchor.dataset.tcRef,verse=previewData?.verses[ref];
    if((!verse&&!anchor.dataset.tcTov&&!anchor.dataset.tcHx&&!anchor.dataset.tcPs&&!anchor.dataset.tcDss&&!anchor.dataset.tcKen&&!anchor.dataset.tcMishnah&&!anchor.dataset.tcCitation)||!anchor.isConnected||panel.hidden)return;
    const marked=new Set((anchor.dataset.tcWords||'').split(',').filter(Boolean));
    hoverAnchor=anchor;hover=document.createElement('div');hover.id='tcHover';hover.setAttribute('role','tooltip');
    hover.innerHTML=anchor.dataset.tcHx?hx.preview(anchor):anchor.dataset.tcPs?ps.preview(anchor):anchor.dataset.tcMishnah?mishnah.preview(anchor):anchor.dataset.tcKen?ken.preview(anchor):anchor.dataset.tcDss?dss.preview(anchor):anchor.dataset.tcTov?tov.preview(anchor):verse?'<b>SMR · '+esc(ref)+'</b><div class="tc-he" dir="rtl" lang="he">'+verse.words.map(w=>marked.has(String(w[2]))?'<span class="tc-dss-active">'+word(w,false)+'</span>':word(w,false)).join(' ')+'</div><p lang="en">'+english(verse.en)+'</p><small>Tal–Florentin · CC BY-NC 4.0</small>':'';
    if(!hover.innerHTML.trim()){hover=null;hoverAnchor=null;return;}
    if(anchor.dataset.tcCitation)hover.insertAdjacentHTML('afterbegin','<div class="tc-source-citation-detail"><b title="'+esc(anchor.dataset.tcSourceDetail||'')+'">'+esc(anchor.dataset.tcCitation)+'</b></div>');
    document.body.appendChild(hover);anchor.setAttribute('aria-describedby','tcHover');
    const r=anchor.getBoundingClientRect(),h=hover.getBoundingClientRect();
    hover.style.left=Math.max(8,Math.min(window.innerWidth-h.width-8,r.left+r.width/2-h.width/2))+'px';
    hover.style.top=(r.bottom+h.height+8<window.innerHeight?r.bottom+8:Math.max(8,r.top-h.height-8))+'px';
    hover.addEventListener('pointerenter',()=>clearTimeout(hideTimer));
    // Greek word card from the Hexapla analysis (same card as for LXX words)
    hover.addEventListener('click',e=>{const b=e.target.closest('[data-gr-card]');if(!b)return;let info=null;try{info=JSON.parse(b.dataset.grInfo||'null');}catch{}hidePreview();host.openGreekCard?.(b.dataset.grLemma,info,b.dataset.grCard);});
    hover.addEventListener('pointerleave',()=>{hideTimer=setTimeout(hidePreview,120);});
  }
  function contextAnchor(el,ref){
    el.classList.add('tc-context-word');el.dataset.tcRef=ref;el.tabIndex=0;
    el.setAttribute('aria-label','Samaritanus und englische Übersetzung: '+ref);
  }
  function decorateNote(note,words,ref){
    // Make the quoted source lemma itself the context trigger. Keep the original
    // red/italic/abbreviation markup and bidi isolates intact, without repeating
    // the lemma in a separate heading. Only matching source words get morphology.
    const walker=document.createTreeWalker(note.querySelector('.tc-note-text'),NodeFilter.SHOW_TEXT);
    const nodes=[];let node;while((node=walker.nextNode()))nodes.push(node);
    const normalize=s=>s.replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'})[c]);
    for(const text of nodes){
      if(text.parentElement.closest('.tc-witness-label'))continue;
      const match=/[א-ת][א-ת\u0591-\u05c7]*/.exec(text.data);
      if(/[A-Za-z]/.test(match?text.data.slice(0,match.index):text.data))break;
      if(!match)continue;
      const existing=text.parentElement.closest('.w');
      if(existing){contextAnchor(existing,ref);return;}
      const span=document.createElement('span');contextAnchor(span,ref);span.textContent=match[0];
      const actual=words.find(w=>normalize(w[0])===normalize(match[0]));
      if(actual){span.classList.add('w');span.dataset.l=actual[2];span.dataset.m='';}
      const after=text.splitText(match.index);after.splitText(match[0].length);after.replaceWith(span);return;
    }
    // Discursive notes without a leading Hebrew lemma retain a quiet context
    // trigger on their citation; never assign another word's grammatical data.
    contextAnchor(note.querySelector('.tal-cite'),ref);
  }
  let witnessDialog=null;
  function openWitness(button){
    const content=ken.witnessCard(button.dataset.kenWitness);hidePreview();settings.open=false;
    witnessDialog?.close();const dialog=document.createElement('dialog');dialog.id='kenWitness';dialog.setAttribute('aria-labelledby','kenWitnessTitle');
    dialog.innerHTML='<button type="button" class="ken-witness-close" aria-label="Schließen" autofocus>✕</button>'+content+'<p class="ken-witness-error" role="status" hidden></p>';
    document.body.appendChild(dialog);witnessDialog=dialog;
    dialog.querySelector('.ken-witness-close').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{dialog.remove();if(witnessDialog===dialog)witnessDialog=null;if(button.isConnected)button.focus({preventScroll:true});});
    dialog.addEventListener('click',async e=>{
      const link=e.target.closest('[data-ken-url]');if(!link)return;
      const status=dialog.querySelector('.ken-witness-error');status.hidden=true;link.disabled=true;
      try{const result=await window.api.openKennicott(link.dataset.kenUrl);if(!result?.opened)throw Error('Link nicht verfügbar');}
      catch{status.textContent='Der Link konnte nicht geöffnet werden.';status.hidden=false;}
      finally{link.disabled=false;}
    });
    dialog.showModal();
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest('#tcBody [data-ken-witness],#tcHover [data-ken-witness]');if(!button)return;
    e.preventDefault();e.stopImmediatePropagation();openWitness(button);
  },true);
  async function render(){
    hidePreview();
    const token=++generation,c=context();$('#tcBtn').hidden=!c;
    if(panel.hidden)return;
    $('#tcWhole').hidden=!c||whole;
    $('#tcLang').hidden=!!c?.isMishnah;$('#tcMishnahView').hidden=!c?.isMishnah;
    $('#tcLang').title=c?.isMishnah?'Quellenhinweise der Mischna-Transkriptionen':'Sprache: Tal mit englischen Originalanmerkungen; CATSS mit Quellcodes und deutschen Erläuterungen';
    $('#tcSettings').hidden=!!c?.isMishnah;$('#tcBibleWitnesses').hidden=!!c?.isMishnah;$('#tcMishnahWitnesses').hidden=!c?.isMishnah;
    $('#tcPlace').textContent=c?(whole?c.book+' '+c.chapter+' · ganzes Kapitel':c.ref)+' · '+(c.isMishnah?'Digital-Mishnah-Zählung':c.numbering==='tal'?'Tal–Florentin-Zählung':'MT-Zählung'):'Keine Stelle ausgewählt';
    syncWitness();
    if(c?.isMishnah){
      body.innerHTML='<p class="muted">'+esc('Apparat wird geladen …')+'</p>';
      try{await mishnah.load();if(token!==generation||panel.hidden)return;const refs=whole?mishnah.refs(c.chapter):[c.chapter+':'+c.row];body.innerHTML=mishnah.render(c.chapter,refs,['K',...($('#tcMishnahParma').checked?['P']:[]),...($('#tcMishnahCambridge').checked?['C']:[])],$('#tcMishnahView').value);markCurrent(c);host.refreshFind?.();}
      catch{if(token===generation)body.textContent=window.I18N.t('Apparat konnte nicht geladen werden.');}
      return;
    }
    const contentKey=c?[key,whole,c.numbering,whole?'':c.row,$('#tcSmr').checked,$('#tcTov').checked,$('#tcDss').checked,$('#tcKen').checked,$('#tcPs').checked,$('#tcPsTech').checked,$('#tcTovTech').checked,$('#tcHex').checked,$('#tcMa').checked,$('#tcMaAcc').checked,$('#tcCompact').checked,$('#tcLang').value].join('|'):null;
    if(contentKey&&lastContentKey===contentKey){markCurrent(c);return;}
    lastContentKey=null;
    if(!c){body.innerHTML='<p class="muted">Der Apparatus-Apparat steht für den Tanach zur Verfügung.</p>';return;}
    body.innerHTML='<p class="muted">Apparat wird geladen …</p>';
    try{
      const [[data,notes],,,psData,hxData,maData]=await Promise.all([load(),dss.load(c.book),ken.load(c.book),ps.load(c.book).catch(()=>null),hx.load(c.book).catch(()=>null),ma.load(c.book).catch(()=>null),tov.loadReadings(c.book).catch(()=>null)]);if(token!==generation||panel.hidden)return;
      previewData=data;
      const alignment=window.SAMARITAN_IL,smrIL=window.SamaritanInterlinear;
      const showSpelling=true;
      const showSmr=$('#tcSmr').checked&&torah.has(c.book),showTov=$('#tcTov').checked,showDss=$('#tcDss').checked,showKen=$('#tcKen').checked&&ken.available(c.book),showPs=$('#tcPs').checked&&!!psData,showHex=$('#tcHex').checked&&!!hxData,showMa=$('#tcMa').checked&&!!maData;
      const tovQueries=[];
      const queries=whole?rows().map(r=>r.dataset.l):[c.row],refs=new Map(),unresolved=[];
      for(const row of queries){
        const ref=c.book+' '+c.chapter+':'+row,resolved=window.TextCrit.resolve(data,ref,c.numbering);
        const extra=c.numbering==='mt'?(alignment.index[ref]||[]).filter(r=>smrIL.sourceMatches(alignment,data,r)):[];
        const sources=[...new Set([...resolved.refs,...extra])];
        if(!sources.length)unresolved.push(ref);
        if(showTov||showDss||showKen||showPs||showHex||showMa){const bases=c.numbering==='tal'?[...new Set([...resolved.baseRefs,...smrIL.targetRefs(alignment,data,ref)])]:[ref];for(const base of bases)tovQueries.push({ref:base,row});}
        for(const sourceRef of (showSmr?sources:[])){if(!refs.has(sourceRef))refs.set(sourceRef,[]);refs.get(sourceRef).push(row);}
      }
      let unresolvedHtml='';
      if(showSmr&&!whole&&unresolved.length){unresolvedHtml='<p class="tc-status">Für diesen MT-Vers liegt keine hinreichend sichere wortlautbasierte Zuordnung vor. Das bedeutet keine Übereinstimmung und keinen fehlenden Text. Über „Zählung“ lässt sich der Tal-Apparat unter seiner eigenen Versangabe öffnen.</p>';}
      const records=[],renderedGroups=new Map();
      const mtWords=ref=>tov.mt(ref)||dss.mt(ref)||ken.mt(ref)||window.TextCrit.words(data.mt[ref]||'');
      const notices=[];
      for(const [ref,readerRows] of refs){
        const verse=data.verses[ref],groups=window.TextCrit.remarks(data,notes,ref,showSpelling);renderedGroups.set(ref,groups);
        const bases=verse.mtRefs,displayBases=[...new Set([...bases,...smrIL.targetRefs(alignment,data,ref)])],targets=bases.flatMap(r=>mtWords(r).map((word,index)=>({ref:r,word,index})));
        const mapped=window.TextCrit.alignPositions(verse.words.map(w=>w[0]),targets.map(t=>t.word));
        if(!(displayBases.length===1&&displayBases[0]===ref))notices.push('Abweichende Versgrenzen oder Zählung: Tal–Florentin '+ref+'; MT '+(displayBases.join('; ')||'nicht sicher zugeordnet')+'.');
        groups.forEach((g,i)=>{
          const position=window.TextCrit.locate(mapped,g.indices,targets.length);
          let anchor=null;
          if(position?.kind==='word'&&targets[position.start]?.ref===targets[position.end]?.ref){
            anchor={kind:'word',ref:targets[position.start].ref,start:targets[position.start].index,end:targets[position.end].index};
          }else if(position?.kind==='gap'){
            const left=targets[position.start],right=targets[position.start+1];
            if(left&&(!right||left.ref===right.ref))anchor={kind:'gap',ref:left.ref,start:left.index,end:left.index};
            else if(!left&&right)anchor={kind:'gap',ref:right.ref,start:-1,end:-1};
          }
          let method='word-anchors';
          const assisted=smrIL.noteAnchor(alignment,data,ref,g.indices);
          if(!anchor&&assisted){anchor=assisted;method='samaritan-interlinear';}
          else if(anchor&&assisted&&JSON.stringify(anchor)!==JSON.stringify(assisted)){if(smrIL.qereExpansion(alignment,anchor,assisted)){anchor=assisted;method='samaritan-interlinear-ketiv-qere';}else{anchor=null;method='conflicting-alignments';}}
          if(anchor&&c.numbering==='mt'&&!readerRows.some(row=>anchor.ref===c.book+' '+c.chapter+':'+row))return;
          const notesHtml=g.notes.map(n=>'<section class="tc-note"><div class="tc-note-text"><span class="tc-witness-label">SMR</span> '+host.clean(n.html)+'</div><small class="tal-cite">'+esc(n.citation)+'</small></section>').join('');
          const fallback='<section class="tc-note"><div class="tc-note-text"><span class="tc-witness-label">SMR</span> <span class="tc-he" dir="rtl" lang="he">'+g.words.map(w=>word(w)).join(' ')+'</span></div><small class="tal-cite">Tal–Florentin, '+esc(ref)+' · rote Kennzeichnung; keine zugeordnete Anmerkung.</small></section>';
          const cmp=g.words.map(w=>w[0]).join(' ');
          records.push({anchor,displayRef:displayBases[0]||ref,rows:readerRows,cmp,cmpWitness:'SMR',lz:cmp?{f:'SMR',w:'SMR',op:g.spelling?'orth':anchor?.kind==='gap'?'add':'var',rd:cmp}:null,html:'<article class="tc-entry" data-witness="SMR" data-alignment="'+method+'" data-tc-ref="'+esc(ref)+'" data-tc-group="'+i+'">'+(notesHtml||fallback)+'</article>'});
        });
      }
      if(showTov)records.push(...tov.entries(tovQueries),...tov.readingEntries(tovQueries,mtWords).filter(r=>$('#tcTovTech').checked||!/data-lxx-type="technik"/.test(r.html)));
      if(showDss)records.push(...dss.entries(tovQueries,showSpelling));
      if(showKen)records.push(...ken.entries(tovQueries,whole));
      if(showHex)records.push(...hx.entries(hxData,tovQueries));
      if(showHex&&showTov)hx.agree(records);
      if(showMa)records.push(...ma.entries(maData,tovQueries,$('#tcMaAcc').checked));
      if(showPs){records.push(...ps.entries(psData,tovQueries).filter(r=>$('#tcPsTech').checked||!/data-ps-type="technik"/.test(r.html)));ps.agree(records);}
      const verses=new Map();
      for(const entry of records){const ref=entry.anchor?.ref||entry.displayRef;if(!verses.has(ref))verses.set(ref,[]);verses.get(ref).push(entry);}
      const coverage=new Map();
      if(showDss)for(const ref of new Set(tovQueries.map(q=>q.ref))){
        const html=dss.coverage(tovQueries.filter(q=>q.ref===ref),true);if(!html)continue;
        coverage.set(ref,html);if(!verses.has(ref))verses.set(ref,[]);
      }
      const ordered=[...verses].sort(([a],[b])=>{const x=/ (\d+):(\d+)$/.exec(a),y=/ (\d+):(\d+)$/.exec(b);return +x[1]-y[1]||+x[2]-y[2];});
      const sections=ordered.map(([ref,entries])=>{
        const sourceOnly=entries.length>0&&entries.every(e=>e.sourceOnly),sourceWords=mtWords(ref),readerRows=[...new Set(entries.flatMap(e=>e.rows))];
        const ORDER=['MA','SMR','DSS','LXX','Hex','Syr','Kennicott'],rank=e=>{const w=/data-witness="([^"]*)"/.exec(e.html)?.[1]||'';const i=ORDER.findIndex(o=>w===o||w.startsWith(o+' '));return i<0?(/^LXX/.test(w)?2:ORDER.length):i;};
        const compact=$('#tcCompact').checked,loci=window.TextCrit.groupLoci(entries).map(g=>{
          g.entries=g.entries.map((e,i)=>[e,i]).sort((a,b)=>rank(a[0])-rank(b[0])||a[1]-b[1]).map(x=>x[0]);
          const lemma=g.kind==='word'?'<bdi lang="he" dir="rtl">'+esc(sourceWords.slice(g.start,g.end+1).join(' '))+'</bdi>':g.kind==='gap'?(g.start<0?'Zusatz vor dem ersten MT-Wort':'Zusatz nach <bdi lang="he" dir="rtl">'+esc(sourceWords[g.start])+'</bdi>'):'Nicht sicher zugeordnet';
          return '<section class="tc-locus'+(g.span?' tc-locus-span':'')+'" data-kind="'+g.kind+'"'+(g.kind!=='unresolved'?' data-start="'+g.start+'" data-end="'+g.end+'"':'')+'><h4 class="tc-locus-title">'+(g.span?'<small class="tc-span-label">'+esc('Abschnitt')+'</small>':'')+(g.kind==='word'?'<button type="button" class="tc-mt-jump" data-ref="'+esc(ref)+'" data-start="'+g.start+'" data-end="'+g.end+'" title="Im MT markieren und anzeigen">'+lemma+'</button>':lemma)+'</h4><div class="tc-locus-readings">'+(g.kind!=='unresolved'?window.TextCritSummary.render(g.entries,sourceWords,g,esc,window.I18N?.textCrit||(x=>x)):'')+(compact?'<details class="tc-locus-detail"><summary>'+esc('Einzelbelege')+' ('+g.entries.length+')</summary>'+g.entries.map(e=>e.html).join('')+'</details>':g.entries.map(e=>e.html).join(''))+'</div></section>';
        }).join('');
        if(!readerRows.length)readerRows.push(...tovQueries.filter(q=>q.ref===ref).map(q=>q.row));
        return '<section class="tc-reader-verse tc-witness" data-rows="'+esc(readerRows.join(','))+'"><div class="tc-verse-summary">'+(sourceOnly?'<span>'+esc(ref)+' · Kennicott · MT-Bezug offen</span>':'<button class="tc-jump" type="button" data-row="'+esc(readerRows[0])+'">'+esc(ref)+' · MT</button>')+(entries.length?' <span class="tc-count">· '+entries.length+' Hinweise</span>':'')+(coverage.has(ref)?' · '+coverage.get(ref):'')+'</div>'+loci+'</section>';
      }).join('');
      const empty=!showSmr&&!showTov&&!showDss&&!showKen&&!showPs&&!showHex&&!showMa?'SMR ist ausgeblendet. Wähle einen Zeugen oben aus.':'';
      body.innerHTML=unresolvedHtml+notices.map(n=>'<p class="tc-status">'+esc(n)+'</p>').join('')+(sections||(empty?'<p class="muted">'+empty+'</p>':''))+(showTov?tov.credit():'')+(showDss?dss.credit():'')+(showKen?ken.credit():'')+(showPs?ps.credit():'')+(showHex?hx.credit():'')+(showMa?ma.credit():'')+(showSmr?'<p class="tc-credit">Samaritanus, Tal–Florentin · CC BY-NC 4.0. MT-Bezug wortlautbasiert; bei mehrdeutiger Wortposition bleibt die Zuordnung offen.</p>':'');
      body.querySelectorAll('.tc-entry[data-tc-group]').forEach(entry=>{
        const ref=entry.dataset.tcRef,g=renderedGroups.get(ref)[+entry.dataset.tcGroup];
        if(entry.dataset.alignment?.startsWith('samaritan-interlinear'))entry.querySelectorAll('.tal-cite').forEach(c=>c.title=(c.title?c.title+' · ':'')+'MT-Position aus dem quellengeprüften Samaritanus-Interlinear (maschinell)');
        entry.querySelectorAll('.tc-note').forEach(note=>decorateNote(note,g.words,ref));
        // The label preview marks this group's words in the Samaritan verse.
        entry.querySelectorAll('.tal-cite').forEach(c=>c.dataset.tcWords=g.words.map(w=>w[2]).join(','));
      });
      body.querySelectorAll('.tal-cite').forEach(cite=>{
        const note=cite.closest('.tc-note')||cite.closest('.tc-entry'),label=note?.querySelector('.tc-witness-label');if(!label)return;
        const button=document.createElement('button');for(const attr of label.attributes)button.setAttribute(attr.name,attr.value);
        button.type='button';button.classList.add('tc-source');button.textContent=label.textContent;
        Object.assign(button.dataset,cite.dataset);button.dataset.tcCitation=cite.textContent;
        button.dataset.tcSourceDetail=cite.title||'';
        if(!button.dataset.tcRef&&cite.closest('[data-tc-ref]'))button.dataset.tcRef=cite.closest('[data-tc-ref]').dataset.tcRef;
        button.setAttribute('aria-label',label.textContent+': Quellenbeleg und Kontext anzeigen');label.replaceWith(button);
        cite.hidden=true;cite.classList.add('tc-source-citation');cite.removeAttribute('tabindex');
      });
      lastContentKey=contentKey;panel.scrollTop=0;markCurrent(c);
      host.refreshFind?.();
    }catch(e){if(token===generation){body.innerHTML='<p class="muted">Apparat konnte nicht geladen werden.</p><button type="button" id="tcRetry">Erneut versuchen</button>';$('#tcRetry').onclick=render;}}
  }
  function toggle(force){host.withAnchor(()=>{
    panel.hidden=force==null?!panel.hidden:!force;
    $('#tcBtn').classList.toggle('active',!panel.hidden);$('#tcBtn').setAttribute('aria-expanded',String(!panel.hidden));
    if(!panel.hidden){lastContentKey=null;if(follow)followNow();}render();
  });}
  $('#tcBtn').onclick=()=>toggle();$('#tcClose').onclick=()=>toggle(false);
  try{const view=localStorage.getItem('tcMishnahView');if(['interlinear','apparatus','tosefta'].includes(view))$('#tcMishnahView').value=view;}catch{}
  ['#tcMishnahView','#tcMishnahParma','#tcMishnahCambridge','#tcNumbering','#tcSmr','#tcTov','#tcDss','#tcKen','#tcPs','#tcPsTech','#tcTovTech','#tcHex','#tcMa','#tcMaAcc','#tcCompact','#tcLang'].forEach(s=>$(s).onchange=()=>{
    try{localStorage.setItem('tcMishnahView',$('#tcMishnahView').value);localStorage.setItem('tcMP',$('#tcMishnahParma').checked?'1':'0');localStorage.setItem('tcMC',$('#tcMishnahCambridge').checked?'1':'0');localStorage.setItem('tcKen',$('#tcKen').checked?'1':'0');localStorage.setItem('tcPs',$('#tcPs').checked?'1':'0');localStorage.setItem('tcPsTech',$('#tcPsTech').checked?'1':'0');localStorage.setItem('tcCompact',$('#tcCompact').checked?'1':'0');localStorage.setItem('tcTovTech',$('#tcTovTech').checked?'1':'0');localStorage.setItem('tcHex',$('#tcHex').checked?'1':'0');localStorage.setItem('tcMa',$('#tcMa').checked?'1':'0');localStorage.setItem('tcMaAcc',$('#tcMaAcc').checked?'1':'0');localStorage.setItem('tcDss',$('#tcDss').checked?'1':'0');localStorage.setItem('tcTov',$('#tcTov').checked?'1':'0');localStorage.setItem('tcSmr',$('#tcSmr').checked?'1':'0');}catch{}
    render();
  });
  $('#rOut').addEventListener('click',e=>{
    const row=e.target.closest('.row[data-l]');if(!row)return;
    whole=false;selected=row.dataset.l;const rel=e.target.closest('.cell[data-rel]')?.dataset.rel;
    const doc=host.getView()?.loaded?.find(d=>d.entry.rel===rel);clickedTal=doc?!!doc.talWordNotes:null;render();
  });
  body.addEventListener('click',e=>{const source=e.target.closest('.tc-source,[data-tc-mishnah],.tc-hx-w');if(source){if(source.matches('.tc-hx-w')&&hoverAnchor===source){hidePreview();return;}showPreview(source);return;}const kc=e.target.closest('.tc-ken-count');if(kc){const l=kc.nextElementSibling;l.hidden=!l.hidden;kc.setAttribute('aria-expanded',String(!l.hidden));return;}const st=e.target.closest('.tc-hx-syn-toggle');if(st){const s=st.previousElementSibling,full=s.classList.toggle('full');st.setAttribute('aria-pressed',String(full));st.textContent=I18N.t(full?'Nur Unterschiede':'Volltext');return;}const la=e.target.closest('.tc-hx-la-toggle');if(la){const t=la.nextElementSibling;t.hidden=!t.hidden;la.setAttribute('aria-expanded',String(!t.hidden));return;}const fn=e.target.closest('.tc-hx-fn');if(fn){const d=fn.nextElementSibling;if(d?.matches('.tc-hx-note')){d.hidden=!d.hidden;fn.setAttribute('aria-expanded',String(!d.hidden));if(!d.hidden)d.scrollIntoView({block:'nearest'});}return;}const mt=e.target.closest('.tc-mt-jump');if(mt){hidePreview();const ref=mt.dataset.ref;host.markMt(ref,+mt.dataset.start,+mt.dataset.end,tov.mt(ref)||dss.mt(ref)||ken.mt(ref)||window.TextCrit.words(window.TEXTCRIT_DATA?.mt?.[ref]||''));return;}const qw=e.target.closest('.tc-dss-word');if(qw&&!String(window.getSelection())){hidePreview();host.openQumran(qw);return;}const greek=e.target.closest('.tc-tov-lemma');if(greek&&!String(window.getSelection())){hidePreview();tov.open(greek);return;}const jump=e.target.closest('.tc-jump');if(jump){host.selectRow(jump.dataset.row);return;}const w=e.target.closest('.w[data-l]');if(w&&!String(window.getSelection())){hidePreview();host.openWord(w);}});
  body.addEventListener('pointerover',e=>{
    const target=e.target.closest('.tc-source,.tc-dss-coverage-source,.tc-witness-label[data-tc-tov],[data-tc-ken]:not(.tc-ken-witness),[data-tc-mishnah]:not(.mci-word)');if(!target||target.contains(e.relatedTarget))return;
    clearTimeout(hideTimer);clearTimeout(showTimer);showTimer=setTimeout(()=>showPreview(target),200);
  });
  body.addEventListener('pointerout',e=>{
    const target=e.target.closest('.tc-source,.tc-dss-coverage-source,.tc-witness-label[data-tc-tov],[data-tc-ken]:not(.tc-ken-witness),[data-tc-mishnah]:not(.mci-word)');if(!target||target.contains(e.relatedTarget))return;
    clearTimeout(showTimer);hideTimer=setTimeout(hidePreview,120);
  });
  body.addEventListener('focusin',e=>{
    const target=e.target.closest('.tc-source,.tc-dss-coverage-source,.tc-witness-label[data-tc-tov],[data-tc-ken]:not(.tc-ken-witness),[data-tc-mishnah]:not(.mci-word)');if(!target)return;
    // Focusing a word can scroll it into view. Open after that scroll, so the
    // preview is not immediately dismissed by its own focus movement.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(document.activeElement===target&&target.isConnected)showPreview(target);
    }));
  });
  body.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.tc-tov-lemma,.tc-dss-word,.tc-hx-w,.tc-hx-fn')){e.preventDefault();e.target.click();}});
  body.addEventListener('focusout',e=>{if(e.target.closest('.tc-source,.tc-dss-coverage-source,.tc-witness-label[data-tc-tov],[data-tc-ken]:not(.tc-ken-witness),[data-tc-mishnah]:not(.mci-word)'))hidePreview();});
  window.addEventListener('resize',hidePreview);
  document.addEventListener('scroll',e=>{if(!e.target.closest?.('#tcHover'))hidePreview();},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&hover){hidePreview();e.preventDefault();e.stopImmediatePropagation();}},true);
  function markCurrent(c){
    body.querySelectorAll('.tc-reader-verse').forEach(el=>el.classList.toggle('current',whole&&el.dataset.rows.split(',').includes(c.row)));
    if(whole&&follow){const el=body.querySelector('.tc-reader-verse.current');if(el){panel.scrollTop+=el.getBoundingClientRect().top-panel.querySelector('.tc-head').getBoundingClientRect().bottom-8;}}
  }
  function stepVerse(step){
    const c=context(),list=rows();let i=list.findIndex(r=>r.dataset.l===c?.row);
    if(i<0)i=list.indexOf(host.readingRow());
    const next=list[Math.max(0,Math.min(list.length-1,i+step))];
    if(next){whole=false;selected=next.dataset.l;host.selectRow(selected);render();}
  }
  $('#tcPrev').onclick=()=>stepVerse(-1);$('#tcNext').onclick=()=>stepVerse(1);
  $('#tcWhole').onclick=()=>{whole=true;lastContentKey=null;render();};
  function followNow(){
    if(!follow||panel.hidden||host.getView()?.sres||(document.documentElement.dataset.tab||'read')!=='read')return;
    const row=host.readingRow();if(row&&row.dataset.l!==context()?.row){selected=row.dataset.l;host.selectRow(selected);render();}
  }
  $('#tcFollow').onclick=()=>{
    follow=!follow;syncFollow();try{localStorage.setItem('tcFollow',follow?'1':'0');}catch{}
    if(follow)followNow();
  };
  document.addEventListener('scroll',e=>{
    if(!follow||e.target.closest?.('aside, #tcHover, dialog'))return;
    clearTimeout(followTimer);followTimer=setTimeout(followNow,200);
  },{passive:true,capture:true});
  return {open:()=>toggle(true),refresh:render,select:label=>{if(label!=null)selected=String(label);render();},close:()=>toggle(false)};

}
return {create};
})();
