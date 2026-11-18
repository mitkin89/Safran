// One independent, lazy-loaded apparatus pane per reading frame.
window.LibraryTextCrit=(()=>{
'use strict';
function create(host){
  const {$,esc}=host, panel=$('#textcritPanel'), body=$('#tcBody');
  const books=new Set(['Genesis','Exodus','Leviticus','Numbers','Deuteronomy']);
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
    const expanded=!$('#tcWitnessOptions').hidden,enabled=$('#tcSmr').checked;
    $('#tcWitnessSummary').setAttribute('aria-expanded',String(expanded));
    $('#tcWitnessSummary').innerHTML=(expanded?'▾':'▸')+' Textzeugen <span class="muted">'+(enabled?'Alle 1':'Keine')+' (Englisch)</span>';
  }
  try{$('#tcSmr').checked=localStorage.getItem('tcSmr')!=='0';$('#tcSpelling').checked=localStorage.getItem('tcSpelling')==='1';}catch{}
  syncWitness();
  $('#tcWitnessSummary').onclick=()=>{
    $('#tcWitnessOptions').hidden=!$('#tcWitnessOptions').hidden;syncWitness();
    try{localStorage.setItem('tcWitnessExpanded',$('#tcWitnessOptions').hidden?'0':'1');}catch{}
  };
  try{new ResizeObserver(()=>panel.style.setProperty('--tc-head-h',panel.querySelector('.tc-head').offsetHeight+'px')).observe(panel.querySelector('.tc-head'));}catch{}
  function rows(){return [...$('#rOut').querySelectorAll('.row[data-l]')].filter(r=>/^\d+$/.test(r.dataset.l));}
  function context(){
    const v=host.getView(),s=v?.sections?.[v.idx],chapter=s?.path?.length===1?s.path[0]+1:null;
    if(!books.has(v?.group?.title)||!Number.isInteger(chapter))return null;
    const next=v.group.key+'|'+s.k;
    if(next!==key){key=next;selected=null;clickedTal=null;lastContentKey=null;}
    const row=selected||host.getRow()||$('#rOut .row.hit')?.dataset.l||$('#rOut .row[data-l]')?.dataset.l;
    if(!/^\d+$/.test(row||''))return null;
    const autoTal=clickedTal??(v.loaded?.length>0&&v.loaded.every(d=>d.talWordNotes));
    const numbering=$('#tcNumbering').value==='auto'?(autoTal?'tal':'mt'):$('#tcNumbering').value;
    return {book:v.group.title,chapter,ref:v.group.title+' '+chapter+':'+row,numbering,row};
  }
  function load(){
    return pending||(pending=Promise.all([host.load('textcrit-data.js',()=>window.TEXTCRIT_DATA),host.load('samaritan-data.js',()=>window.SAMARITAN_DATA)]).catch(e=>{pending=null;throw e;}));
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
    if(!verse||!anchor.isConnected||panel.hidden)return;
    hoverAnchor=anchor;hover=document.createElement('div');hover.id='tcHover';hover.setAttribute('role','tooltip');
    hover.innerHTML='<b>SMR · '+esc(ref)+'</b><div class="tc-he" dir="rtl" lang="he">'+verse.words.map(w=>word(w,false)).join(' ')+'</div><p lang="en">'+english(verse.en)+'</p><small>Tal–Florentin · CC BY-NC 4.0</small>';
    document.body.appendChild(hover);anchor.setAttribute('aria-describedby','tcHover');
    const r=anchor.getBoundingClientRect(),h=hover.getBoundingClientRect();
    hover.style.left=Math.max(8,Math.min(window.innerWidth-h.width-8,r.left+r.width/2-h.width/2))+'px';
    hover.style.top=(r.bottom+h.height+8<window.innerHeight?r.bottom+8:Math.max(8,r.top-h.height-8))+'px';
    hover.addEventListener('pointerenter',()=>clearTimeout(hideTimer));
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
  async function render(){
    hidePreview();
    const token=++generation,c=context();$('#tcBtn').hidden=!c;
    if(panel.hidden)return;
    $('#tcWhole').hidden=!c||whole;
    $('#tcPlace').textContent=c?(whole?c.book+' '+c.chapter+' · ganzes Kapitel':c.ref)+' · '+(c.numbering==='tal'?'Tal–Florentin-Zählung':'MT-Zählung'):'Keine Stelle ausgewählt';
    syncWitness();
    const contentKey=c?[key,whole,c.numbering,whole?'':c.row,$('#tcSpelling').checked,$('#tcSmr').checked,$('#tcLang').value].join('|'):null;
    if(contentKey&&lastContentKey===contentKey){markCurrent(c);return;}
    lastContentKey=null;
    if(!c){body.innerHTML='<p class="muted">Der Samaritanus-Apparat steht für die fünf Bücher der Tora zur Verfügung.</p>';return;}
    body.innerHTML='<p class="muted">Apparat wird geladen …</p>';
    try{
      const [data,notes]=await load();if(token!==generation||panel.hidden)return;
      previewData=data;
      const showSpelling=$('#tcSpelling').checked;
      if(!$('#tcSmr').checked){body.innerHTML='<p class="muted">SMR ist ausgeblendet. Wähle den Zeugen oben aus.</p>';return;}
      const queries=whole?rows().map(r=>r.dataset.l):[c.row],refs=new Map(),unresolved=[];
      for(const row of queries){
        const ref=c.book+' '+c.chapter+':'+row,resolved=window.TextCrit.resolve(data,ref,c.numbering);
        if(resolved.unresolved)unresolved.push(ref);
        for(const sourceRef of resolved.refs){if(!refs.has(sourceRef))refs.set(sourceRef,[]);refs.get(sourceRef).push(row);}
      }
      if(!whole&&unresolved.length){body.innerHTML='<p class="tc-status">Für diesen MT-Vers liegt keine hinreichend sichere wortlautbasierte Zuordnung vor. Das bedeutet keine Übereinstimmung und keinen fehlenden Text. Über „Zählung“ lässt sich der Tal-Apparat unter seiner eigenen Versangabe öffnen.</p>';return;}
      let count=0;const renderedGroups=new Map();
      const sections=[...refs].map(([ref,readerRows])=>{
        const verse=data.verses[ref],groups=window.TextCrit.remarks(data,notes,ref,showSpelling);count+=groups.length;renderedGroups.set(ref,groups);
        if(whole&&!groups.length)return '';
        const shifted=!(verse.mtRefs.length===1&&verse.mtRefs[0]===ref);
        const rows=groups.map((g,i)=>{
          const notesHtml=g.notes.map(n=>'<section class="tc-note"><div class="tc-note-text">'+host.clean(n.html)+'</div><small class="tal-cite">'+esc(n.citation)+'</small></section>').join('');
          const fallback='<section class="tc-note"><div class="tc-note-text"><span class="tc-he" dir="rtl" lang="he">'+g.words.map(w=>word(w)).join(' ')+'</span></div><small class="tal-cite">Tal–Florentin, '+esc(ref)+' · rote Kennzeichnung; keine zugeordnete Anmerkung.</small></section>';
          return '<article class="tc-entry" data-tc-ref="'+esc(ref)+'" data-tc-group="'+i+'">'+(notesHtml||fallback)+'</article>';
        }).join('');
        return '<section class="tc-witness tc-reader-verse" data-rows="'+esc(readerRows.join(','))+'"><h3><button class="tc-jump" type="button" data-row="'+esc(readerRows[0])+'" title="Im Lesetext anzeigen">SMR · '+esc(ref)+'</button></h3>'+(shifted?'<p class="tc-status">Abweichende Versgrenzen oder Zählung. MT-Bezug über gemeinsame Wörter ermittelt: '+esc(verse.mtRefs.join('; ')||'nicht sicher zugeordnet')+'.</p>':'')+(rows||'<p class="muted">'+(showSpelling?'Keine erfasste Abweichung oder Anmerkung an dieser Stelle.':'Keine Anmerkung bei diesem Filter. Schreibunterschiede können eingeblendet werden.')+' Dies ist kein Nachweis vollständiger Übereinstimmung.</p>')+'</section>';
      }).join('');
      body.innerHTML='<p class="tc-count">'+count+' '+(count===1?'Textstelle':'Textstellen')+' · Tal–Florentin-Apparat</p>'+sections+(whole&&unresolved.length?'<p class="tc-status">Keine sichere Stellenzuordnung: '+esc(unresolved.join('; '))+'. Diese Stellen lassen sich unter Tals eigener Zählung ansehen.</p>':'')+'<p class="tc-credit">Erfasster Zeuge: Samaritanus, Tal–Florentin · CC BY-NC 4.0. MT-Stellenbezug automatisch über gemeinsame Wörter ermittelt. LXX, Qumran und Kennicott sind in diesem Pane noch nicht erschlossen.</p>';
      body.querySelectorAll('.tc-entry').forEach(entry=>{
        const ref=entry.dataset.tcRef,g=renderedGroups.get(ref)[+entry.dataset.tcGroup];
        entry.querySelectorAll('.tc-note').forEach(note=>decorateNote(note,g.words,ref));
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
  ['#tcNumbering','#tcSpelling','#tcSmr','#tcLang'].forEach(s=>$(s).onchange=()=>{
    try{localStorage.setItem('tcSmr',$('#tcSmr').checked?'1':'0');localStorage.setItem('tcSpelling',$('#tcSpelling').checked?'1':'0');}catch{}
    render();
  });
  $('#rOut').addEventListener('click',e=>{
    const row=e.target.closest('.row[data-l]');if(!row)return;
    whole=false;selected=row.dataset.l;const rel=e.target.closest('.cell[data-rel]')?.dataset.rel;
    const doc=host.getView()?.loaded?.find(d=>d.entry.rel===rel);clickedTal=doc?!!doc.talWordNotes:null;render();
  });
  body.addEventListener('click',e=>{const jump=e.target.closest('.tc-jump');if(jump){host.selectRow(jump.dataset.row);return;}const w=e.target.closest('.w[data-l]');if(w&&!String(window.getSelection())){hidePreview();host.openWord(w);}});
  body.addEventListener('pointerover',e=>{
    const target=e.target.closest('.tc-context-word');if(!target||target.contains(e.relatedTarget))return;
    clearTimeout(hideTimer);clearTimeout(showTimer);showTimer=setTimeout(()=>showPreview(target),200);
  });
  body.addEventListener('pointerout',e=>{
    const target=e.target.closest('.tc-context-word');if(!target||target.contains(e.relatedTarget))return;
    clearTimeout(showTimer);hideTimer=setTimeout(hidePreview,120);
  });
  body.addEventListener('focusin',e=>{
    const target=e.target.closest('.tc-context-word');if(!target)return;
    // Focusing a word can scroll it into view. Open after that scroll, so the
    // preview is not immediately dismissed by its own focus movement.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(document.activeElement===target&&target.isConnected)showPreview(target);
    }));
  });
  body.addEventListener('focusout',e=>{if(e.target.closest('.tc-context-word'))hidePreview();});
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
  return {refresh:render,select:label=>{if(label!=null)selected=String(label);render();},close:()=>toggle(false)};

}
return {create};
})();
