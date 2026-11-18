// Genesis DSS source adapter. No missing MT word is inferred to be an omission.
window.LibraryQumran=(()=>{
'use strict';
function create(host){
  const {esc}=host;let data=null,pending=null;
  const load=()=>pending||(pending=host.load('qumran-apparatus.js',()=>window.QUMRAN_APPARATUS).then(d=>data=d).catch(e=>{pending=null;throw e;}));
  const sources=new Map();
  const sourceKey=(ref,i)=>ref+'|'+i;
  function labelFlags(t){
    const f=t.flags,out=[];
    if(f.rec)out.push(t.reconstructedLetters===t.letters?'Rekonstruiert':'Teilrekonstruiert');
    if(f.unc)out.push('Unsichere Lesung');if(f.missing)out.push('Lücke');
    if(f.cor)for(const c of f.cor)out.push(({'1':'Moderne Korrektur','2':'Antike Korrektur','3':'Antiker Nachtrag über der Zeile'})[c]||'Korrektur');
    if(f.rem)for(const c of f.rem)out.push(c==='1'?'Vom Herausgeber gestrichen':c==='2'?'Antike Streichung':'Gestrichener Text');
    if(f.alt)out.push('Alternative Lesung');if(f.vac)out.push('Unbeschriebener Raum');
    return out;
  }
  function citation(segment,token){
    const locs=token?.locations||segment.tokens.flatMap(t=>t.locations);
    const lines=[...new Set(locs.map(l=>l.line?.[1]).filter(Boolean))];
    return segment.scroll+' · '+segment.fragment+(lines.length?' · Z. '+lines.join(', '):'')+' · ETCBC/Abegg';
  }
  function tokenHtml(t,key,index,interactive=true,different=false){
    const state=labelFlags(t).join(' · ');
    const detail=state+(t.flags.unc?' · Unsicherheitsstufe der Quelle: '+t.flags.unc.join(', '):'');
    const inner=t.parts.map(p=>{
      const canOpen=interactive&&p.lemma&&p.morph.split('.')[0]!=='-';
      return '<span'+(canOpen?' class="tc-dss-word wq" data-l="'+esc(p.lemma)+'" data-m="'+esc(p.morph)+'" data-dss-status="'+esc(state)+'" data-dss-source="'+esc(citation(sources.get(key),t))+'"':'')+'>'+esc(p.text)+'</span>';
    }).join('');
    // Punctuation is a separate feature in the source; retain the complete
    // transcription instead of silently dropping anything outside a word span.
    const joined=t.parts.map(p=>p.text).join(''),suffix=t.text.startsWith(joined)?t.text.slice(joined.length):'';
    return '<span class="tc-dss-token'+(different?' mt-diff':'')+(t.flags.rec?' tc-dss-reconstructed':'')+'" tabindex="0" data-tc-dss="'+esc(key)+'" data-tc-token="'+index+'" title="'+esc(detail||'Erhaltener Text')+'" dir="rtl">'+inner+esc(suffix)+'</span>';
  }
  function entries(queries,spelling){
    const out=new Map();
    for(const {ref,row} of queries){
      (data?.verses[ref]||[]).forEach((s,si)=>{
        const key=sourceKey(ref,si);sources.set(key,s);
        for(const r of window.QumranApparatus.remarks(s,data.mt[ref])){
          const id=key+'|'+r.index;if(out.has(id)){if(!out.get(id).rows.includes(row))out.get(id).rows.push(row);continue;}
          const orthography=r.different&&r.anchor?.kind==='word'&&window.QumranApparatus.spelling(r.token,data.mt[ref][r.anchor.start],data.mtMeta[ref][r.anchor.start]);
          if(orthography&&!spelling)continue;
          const status=orthography?'Schreibunterschied (wahrscheinlich)':r.status;
          const flags=labelFlags(r.token).filter(t=>t!==status);
          const h='<article class="tc-entry tc-dss-entry" data-witness="DSS" data-scroll="'+esc(s.scroll)+'"><div class="tc-note-text"><span class="tc-witness-label">'+esc(s.scroll)+'</span> '+tokenHtml(r.token,key,r.index,true,r.different)+' <span class="muted">'+esc(status)+(flags.length?' · '+esc(flags.join(' · ')):'')+'</span></div><small class="tal-cite" data-tc-dss="'+esc(key)+'" tabindex="0" title="ETCBC '+esc(data.source.version)+' · Quellknoten '+r.token.parts.map(p=>p.node).join(', ')+'">'+esc(citation(s,r.token))+'</small></article>';
          out.set(id,{anchor:r.anchor?{...r.anchor,ref}:null,displayRef:ref,rows:[row],html:h});
        }
      });
    }
    return [...out.values()];
  }
  function coverage(queries){
    const seen=new Set();let out='';
    for(const {ref} of queries){
      const segments=data?.verses[ref]||[];if(!segments.length)continue;
      const links=segments.map((s,i)=>{const key=sourceKey(ref,i);if(seen.has(key))return '';seen.add(key);sources.set(key,s);return '<span tabindex="0" class="tc-dss-coverage-source" data-tc-dss="'+esc(key)+'">'+esc(s.scroll+' '+s.fragment)+'</span>';}).filter(Boolean);
      if(links.length)out+='<p class="tc-dss-coverage"><small>DSS · '+esc(ref)+': </small>'+links.join(' · ')+'</p>';
    }
    return out||'<p class="muted">Keine erschlossenen DSS-Daten für diese Stelle. Bisher ist Genesis eingebunden; fehlende Daten belegen keine Übereinstimmung.</p>';
  }
  function preview(anchor){
    const key=anchor.dataset.tcDss,s=sources.get(key);if(!s)return '';
    const selected=anchor.dataset.tcToken;
    return '<b>'+esc(citation(s))+'</b><div class="tc-dss-context" dir="rtl" lang="he">'+s.tokens.map((t,i)=>'<span class="'+(String(i)===selected?'tc-dss-active':'')+'">'+tokenHtml(t,key,i,false)+'</span>').join(' ')+'</div><small>Originaltranskription; [ ] = moderne Rekonstruktion. Unsicherheits- und Korrekturzeichen bleiben erhalten. ETCBC/Abegg · CC BY-NC 4.0.</small>';
  }
  const credit=()=>'<p class="tc-credit">DSS Genesis · ETCBC/Abegg · CC BY-NC 4.0. Maschineller MT-Vergleich. Rekonstruktionen und beschädigte Stellen sind keine erhaltenen Varianten; fehlende MT-Wörter werden nicht automatisch als Auslassung gewertet. Quelltext über den Siglen oder Lesarten ansehen.</p>';
  return {load,entries,coverage,preview,credit,mt:ref=>data?.mt[ref]};
}
return {create};
})();
