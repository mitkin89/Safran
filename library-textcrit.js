// One independent, lazy-loaded apparatus pane per reading frame.
window.LibraryTextCrit=(()=>{
'use strict';
function create(host){
  const {$,esc}=host, panel=$('#textcritPanel'), body=$('#tcBody');
  const books=new Set(['Genesis','Exodus','Leviticus','Numbers','Deuteronomy']);
  let key='',selected=null,clickedTal=null,generation=0,pending=null,previewData=null,hover=null,hoverAnchor=null,showTimer=null,hideTimer=null;
  function context(){
    const v=host.getView(),s=v?.sections?.[v.idx],chapter=s?.path?.length===1?s.path[0]+1:null;
    if(!books.has(v?.group?.title)||!Number.isInteger(chapter))return null;
    const next=v.group.key+'|'+s.k;
    if(next!==key){key=next;selected=null;clickedTal=null;}
    const row=selected||host.getRow()||$('#rOut .row.hit')?.dataset.l||$('#rOut .row[data-l]')?.dataset.l;
    if(!/^\d+$/.test(row||''))return null;
    const autoTal=clickedTal??(v.loaded?.length>0&&v.loaded.every(d=>d.talWordNotes));
    const numbering=$('#tcNumbering').value==='auto'?(autoTal?'tal':'mt'):$('#tcNumbering').value;
    return {ref:v.group.title+' '+chapter+':'+row,numbering,row};
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
    $('#tcPlace').textContent=c?c.ref+' · '+(c.numbering==='tal'?'Tal–Florentin-Zählung':'MT-Zählung'):'Keine Stelle ausgewählt';
    if(!c){body.innerHTML='<p class="muted">Der Samaritanus-Apparat steht für die fünf Bücher der Tora zur Verfügung.</p>';return;}
    body.innerHTML='<p class="muted">Apparat wird geladen …</p>';
    try{
      const [data,notes]=await load();if(token!==generation||panel.hidden)return;
      previewData=data;
      const resolved=window.TextCrit.resolve(data,c.ref,c.numbering),showSpelling=$('#tcSpelling').checked;
      if(!$('#tcSmr').checked){body.innerHTML='<p class="muted">SMR ist ausgeblendet. Wähle den Zeugen oben aus.</p>';return;}
      if(resolved.unresolved){body.innerHTML='<p class="tc-status">Für diesen MT-Vers liegt keine hinreichend sichere wortlautbasierte Zuordnung vor. Das bedeutet keine Übereinstimmung und keinen fehlenden Text. Über „Zählung“ lässt sich der Tal-Apparat unter seiner eigenen Versangabe öffnen.</p>';return;}
      let count=0;const renderedGroups=new Map();
      const sections=resolved.refs.map(ref=>{
        const verse=data.verses[ref],groups=window.TextCrit.remarks(data,notes,ref,showSpelling);count+=groups.length;renderedGroups.set(ref,groups);
        const shifted=!(verse.mtRefs.length===1&&verse.mtRefs[0]===ref);
        const rows=groups.map((g,i)=>{
          const notesHtml=g.notes.map(n=>'<section class="tc-note"><div class="tc-note-text">'+host.clean(n.html)+'</div><small class="tal-cite">'+esc(n.citation)+'</small></section>').join('');
          const fallback='<section class="tc-note"><div class="tc-note-text"><span class="tc-he" dir="rtl" lang="he">'+g.words.map(w=>word(w)).join(' ')+'</span></div><small class="tal-cite">Tal–Florentin, '+esc(ref)+' · rote Kennzeichnung; keine zugeordnete Anmerkung.</small></section>';
          return '<article class="tc-entry" data-tc-ref="'+esc(ref)+'" data-tc-group="'+i+'">'+(notesHtml||fallback)+'</article>';
        }).join('');
        return '<section class="tc-witness"><h3>SMR · '+esc(ref)+'</h3>'+(shifted?'<p class="tc-status">Abweichende Versgrenzen oder Zählung. MT-Bezug über gemeinsame Wörter ermittelt: '+esc(verse.mtRefs.join('; ')||'nicht sicher zugeordnet')+'.</p>':'')+(rows||'<p class="muted">'+(showSpelling?'Keine erfasste Abweichung oder Anmerkung an dieser Stelle.':'Keine Anmerkung bei diesem Filter. Schreibunterschiede können eingeblendet werden.')+' Dies ist kein Nachweis vollständiger Übereinstimmung.</p>')+'</section>';
      }).join('');
      body.innerHTML='<p class="tc-count">'+count+' '+(count===1?'Textstelle':'Textstellen')+' · Tal–Florentin-Apparat</p>'+sections+'<p class="tc-credit">Erfasster Zeuge: Samaritanus, Tal–Florentin · CC BY-NC 4.0. MT-Stellenbezug automatisch über gemeinsame Wörter ermittelt. LXX, Qumran und Kennicott sind in diesem Pane noch nicht erschlossen.</p>';
      body.querySelectorAll('.tc-entry').forEach(entry=>{
        const ref=entry.dataset.tcRef,g=renderedGroups.get(ref)[+entry.dataset.tcGroup];
        entry.querySelectorAll('.tc-note').forEach(note=>decorateNote(note,g.words,ref));
      });
    }catch(e){if(token===generation){body.innerHTML='<p class="muted">Apparat konnte nicht geladen werden.</p><button type="button" id="tcRetry">Erneut versuchen</button>';$('#tcRetry').onclick=render;}}
  }
  function toggle(force){panel.hidden=force==null?!panel.hidden:!force;$('#tcBtn').classList.toggle('active',!panel.hidden);$('#tcBtn').setAttribute('aria-expanded',String(!panel.hidden));render();}
  $('#tcBtn').onclick=()=>toggle();$('#tcClose').onclick=()=>toggle(false);
  ['#tcNumbering','#tcSpelling','#tcSmr'].forEach(s=>$(s).onchange=render);
  $('#rOut').addEventListener('click',e=>{
    const row=e.target.closest('.row[data-l]');if(!row)return;
    selected=row.dataset.l;const rel=e.target.closest('.cell[data-rel]')?.dataset.rel;
    const doc=host.getView()?.loaded?.find(d=>d.entry.rel===rel);clickedTal=doc?!!doc.talWordNotes:null;render();
  });
  body.addEventListener('click',e=>{const w=e.target.closest('.w[data-l]');if(w&&!String(window.getSelection())){hidePreview();host.openWord(w);}});
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
  for(const [selector,step] of [['#tcPrev',-1],['#tcNext',1]])$(selector).onclick=()=>{
    const c=context(),rows=[...$('#rOut').querySelectorAll('.row[data-l]')].filter(r=>/^\d+$/.test(r.dataset.l));
    const i=rows.findIndex(r=>r.dataset.l===c?.row),next=rows[Math.max(0,Math.min(rows.length-1,i+step))];
    if(next){selected=next.dataset.l;host.selectRow(selected);render();}
  };
  return {refresh:render,select:()=>{render();},close:()=>toggle(false)};
}
return {create};
})();
