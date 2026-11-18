// One independent, lazy-loaded apparatus pane per reading frame.
window.LibraryTextCrit=(()=>{
'use strict';
function create(host){
  const {$,esc}=host, panel=$('#textcritPanel'), body=$('#tcBody');
  const books=new Set(['Genesis','Exodus','Leviticus','Numbers','Deuteronomy']);
  let key='',selected=null,clickedTal=null,generation=0,pending=null;
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
  async function render(){
    const token=++generation,c=context();$('#tcBtn').hidden=!c;
    if(panel.hidden)return;
    $('#tcPlace').textContent=c?c.ref+' · '+(c.numbering==='tal'?'Tal–Florentin-Zählung':'MT-Zählung'):'Keine Stelle ausgewählt';
    if(!c){body.innerHTML='<p class="muted">Der Samaritanus-Apparat steht für die fünf Bücher der Tora zur Verfügung.</p>';return;}
    body.innerHTML='<p class="muted">Apparat wird geladen …</p>';
    try{
      const [data,notes]=await load();if(token!==generation||panel.hidden)return;
      const resolved=window.TextCrit.resolve(data,c.ref,c.numbering),showSpelling=$('#tcSpelling').checked,showContext=$('#tcContext').checked;
      const base=resolved.baseRefs.filter(r=>data.mt[r]);
      const baseHtml='<section class="tc-base"><b>MT · Westminster / OSHB</b>'+base.map(r=>'<div class="tc-ref">'+esc(r)+'</div><blockquote dir="rtl" lang="he">'+esc(data.mt[r])+'</blockquote>').join('')+(base.length?'':'<p class="muted">Keine sichere MT-Stellenzuordnung.</p>')+'</section>';
      if(!$('#tcSmr').checked){body.innerHTML=baseHtml+'<p class="muted">SMR ist ausgeblendet. Wähle den Zeugen oben aus.</p>';return;}
      if(resolved.unresolved){body.innerHTML=baseHtml+'<p class="tc-status">Für diesen MT-Vers liegt keine hinreichend sichere wortlautbasierte Zuordnung vor. Das bedeutet keine Übereinstimmung und keinen fehlenden Text. Über „Zählung“ lässt sich der Tal-Apparat unter seiner eigenen Versangabe öffnen.</p>';return;}
      let count=0;
      const sections=resolved.refs.map(ref=>{
        const verse=data.verses[ref],groups=window.TextCrit.remarks(data,notes,ref,showSpelling);count+=groups.length;
        const shifted=!(verse.mtRefs.length===1&&verse.mtRefs[0]===ref);
        const contextHtml=showContext?'<div class="tc-context"><div dir="rtl" lang="he" class="tc-he">'+verse.words.map(w=>word(w)).join(' ')+'</div><p lang="en">'+english(verse.en)+'</p></div>':'';
        const rows=groups.map(g=>{
          const label=g.words.length?'<span dir="rtl" lang="he" class="tc-lemma">'+g.words.map(w=>word(w,false)).join(' ')+'</span>':'Anmerkung zum Vers';
          const red=g.words.some(w=>w[1]);
          return '<details class="tc-entry"><summary><span class="tc-siglum">SMR</span> '+label+' <span class="tc-kind">'+(g.spelling?'Schreibung':red?'Abweichende Lesart':'Anmerkung')+'</span></summary><div class="tc-detail">'+(g.words.length?'<div dir="rtl" lang="he" class="tc-he">'+g.words.map(w=>word(w)).join(' ')+'</div>':'')+g.notes.map(n=>'<section class="tc-note">'+host.clean(n.html)+'<small class="tal-cite">'+esc(n.citation)+'</small></section>').join('')+(g.notes.length?'':'<p class="muted">Rote Kennzeichnung in Tal–Florentin; keine zugeordnete Anmerkung.</p>')+'</div></details>';
        }).join('');
        return '<section class="tc-witness"><h3>SMR · '+esc(ref)+'</h3>'+(shifted?'<p class="tc-status">Abweichende Versgrenzen oder Zählung. MT-Bezug über gemeinsame Wörter ermittelt: '+esc(verse.mtRefs.join('; ')||'nicht sicher zugeordnet')+'.</p>':'')+contextHtml+(rows||'<p class="muted">'+(showSpelling?'Keine erfasste Abweichung oder Anmerkung an dieser Stelle.':'Keine Anmerkung bei diesem Filter. Schreibunterschiede können eingeblendet werden.')+' Dies ist kein Nachweis vollständiger Übereinstimmung.</p>')+'</section>';
      }).join('');
      body.innerHTML=baseHtml+'<p class="tc-count">'+count+' '+(count===1?'Textstelle':'Textstellen')+' · Tal–Florentin-Apparat</p>'+sections+'<p class="tc-credit">Erfasster Zeuge: Samaritanus, Tal–Florentin · CC BY-NC 4.0. MT-Stellenbezug automatisch über gemeinsame Wörter ermittelt. LXX, Qumran und Kennicott sind in diesem Pane noch nicht erschlossen.</p>';
    }catch(e){if(token===generation){body.innerHTML='<p class="muted">Apparat konnte nicht geladen werden.</p><button type="button" id="tcRetry">Erneut versuchen</button>';$('#tcRetry').onclick=render;}}
  }
  function toggle(force){panel.hidden=force==null?!panel.hidden:!force;$('#tcBtn').classList.toggle('active',!panel.hidden);$('#tcBtn').setAttribute('aria-expanded',String(!panel.hidden));render();}
  $('#tcBtn').onclick=()=>toggle();$('#tcClose').onclick=()=>toggle(false);
  ['#tcNumbering','#tcSpelling','#tcContext','#tcSmr'].forEach(s=>$(s).onchange=render);
  $('#rOut').addEventListener('click',e=>{
    const row=e.target.closest('.row[data-l]');if(!row)return;
    selected=row.dataset.l;const rel=e.target.closest('.cell[data-rel]')?.dataset.rel;
    const doc=host.getView()?.loaded?.find(d=>d.entry.rel===rel);clickedTal=doc?!!doc.talWordNotes:null;render();
  });
  body.addEventListener('click',e=>{const w=e.target.closest('.w[data-l]');if(w&&!String(window.getSelection()))host.openWord(w);});
  for(const [selector,step] of [['#tcPrev',-1],['#tcNext',1]])$(selector).onclick=()=>{
    const c=context(),rows=[...$('#rOut').querySelectorAll('.row[data-l]')].filter(r=>/^\d+$/.test(r.dataset.l));
    const i=rows.findIndex(r=>r.dataset.l===c?.row),next=rows[Math.max(0,Math.min(rows.length-1,i+step))];
    if(next){selected=next.dataset.l;host.selectRow(selected);render();}
  };
  return {refresh:render,select:()=>{render();},close:()=>toggle(false)};
}
return {create};
})();
