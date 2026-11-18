// Source-preserving Genesis adapter; no fabricated manuscript verses or morphology.
window.LibraryKennicott=(()=>{
'use strict';
function create(host){
  const {esc}=host;let data=null,pending=null;
  const load=()=>pending||(pending=host.load('kennicott-data.js',()=>window.KENNICOTT_DATA).then(d=>data=d).catch(e=>{pending=null;throw e;}));
  const labels={caret:'Auslassung',transp:'Umstellung',ras:'Rasur',prm:'Frühere Lesung',frt:'Vermutete frühere Lesung (unsicher)',nnc:'Jetzige Lesung',vdtr:'Unsichere Lesung','ord-num':'Wortvorkommen','sup-ras':'Über Rasur','fin-lin':'Am Zeilenende',eras:'Getilgt',bis:'Zweimal'};
  const extra={'major':'vergrößert','major ornata':'vergrößert und verziert','ornata':'verziert','majusc.':'Großbuchstaben','lit.':'Buchstabe(n)'};
  const plain=n=>[n.text,...(n.children||[]).map(c=>plain(c)+c.tail)].join('').replace(/\s+/g,' ').trim();
  function node(n){
    if(!n)return '';
    const inner=esc(n.text)+(n.children||[]).map(c=>node(c)+esc(c.tail)).join('');
    if(n.tag==='term'){
      const ref=(n.attrs.ref||'').replace(/^#/,''),text=plain(n),title=labels[ref]||extra[text]||text;
      return '<abbr class="ab tc-ken-term" title="'+esc(title+(data.glossary[ref]?' · '+data.glossary[ref]:''))+'">'+esc(labels[ref]||text)+'</abbr>';
    }
    if(n.tag==='w')return '<bdi'+(/[א-ת]/.test(plain(n))?' lang="he" dir="rtl"':'')+'>'+inner+'</bdi>';
    if(n.tag==='note')return '<span class="tc-ken-note">'+inner+'</span>';
    return inner;
  }
  function witness(id){
    const key=id.replace(/^#/,''),descs=data.witnesses[key];
    const title=descs?.length?descs.map(d=>(d.type==='manuscript'?'Handschrift':'Druckausgabe')+': '+d.description).join('\n'):'Quellsigle '+key+'; kein zugehöriger Katalogeintrag in der Edition';
    return '<abbr class="ab tc-ken-witness" title="'+esc(title)+'">'+esc(key.replace(/^K/,'K '))+'</abbr>';
  }
  function reading(r,full=false){
    const visible=full?r.witnesses:r.witnesses.slice(0,8),rest=full?[]:r.witnesses.slice(8);
    return '<span class="tc-ken-reading" data-group="'+r.group+'">'+node(r.nodes)+(r.witnesses.length?' <span class="tc-ken-witnesses">'+visible.map(witness).join(' · ')+(rest.length?' <span class="tc-ken-more" title="'+esc(rest.map(w=>w.replace(/^#K/,'K ')).join(' · ')+' · Vollständige Siglen mit Katalogangaben im Editionskontext über der Quellenzeile.')+'">+'+rest.length+' Zeugen</span>':'')+'</span>':'')+'</span>';
  }
  function entries(queries){
    const out=new Map();
    for(const {ref,row} of queries)for(const id of data?.index[ref]||[]){
      if(out.has(id)){if(!out.get(id).rows.includes(row))out.get(id).rows.push(row);continue;}
      const e=data.entries[id],location=window.Kennicott.locate(e,data.base[ref]||[],data.mt[ref]||[]);
      // Keep the original rdgGrp divisions; never attach another reading's witnesses to an unassigned reading.
      const groups=new Map();for(const r of e.readings){if(!groups.has(r.group))groups.set(r.group,[]);groups.get(r.group).push(r);}
      const lemma=e.lemmaNode?'<span class="tc-ken-lemma">'+(e.lemmaNode.attrs.type==='reconstructed'?'<span class="muted">Erschlossenes Lemma: </span>':'')+node(e.lemmaNode)+' ] </span>':'';
      const html='<article class="tc-entry tc-ken-entry" data-witness="Kennicott" data-ken-id="'+id+'" data-alignment="'+esc(location.method)+'"><div class="tc-note-text"><span class="tc-witness-label" tabindex="0" data-tc-ken="'+id+'">Kennicott</span> '+lemma+[...groups.values()].map(rs=>'<span class="tc-ken-group">'+rs.map(r=>reading(r)).join(' ; ')+'</span>').join(' / ')+'</div><small class="tal-cite" tabindex="0" data-tc-ken="'+id+'" title="'+esc(location.method+' · Original-TEI: '+e.raw)+'">Digital Kennicott · '+esc(e.refs.join(' – '))+' · Eintrag '+esc(id.replace('gen-app-',''))+(e.page?' · Seiten-ID '+esc(e.page):'')+'</small></article>';
      out.set(id,{anchor:location.anchor,displayRef:e.refs[0],rows:[row],html});
    }
    return [...out.values()];
  }
  function preview(anchor){
    const e=data?.entries[anchor.dataset.tcKen];if(!e)return '';
    return '<b>Kennicott · '+esc(e.refs.join(' – '))+'</b><div class="tc-he" dir="rtl" lang="he">'+esc((data.base[e.refs[0]]||[]).join(' '))+'</div><small>Grundtext der Kennicott-Ausgabe, kein vollständiger Handschriftentext. Von Westminster / OSHB unabhängig.</small><p>'+node(e.lemmaNode)+(e.lemmaNode?' ] ':'')+e.readings.map(r=>reading(r,true)).join(' / ')+'</p><small>Digital Kennicott · Crestani / Legnaioli · CC BY-NC-SA 4.0. Quellensiglen und Zeichen: Erläuterung beim Überfahren.</small>';
  }
  const credit=()=>'<p class="tc-credit">Digital Kennicott · Genesis · Crestani / Legnaioli, Universitäten Turin und Florenz · CC BY-NC-SA 4.0. Bezugstext: Kennicott / Van der Hooght; MT-Positionen maschinell abgeglichen. Frühere, jetzige und vermutete Lesungen bleiben getrennt; typographische Hinweise sind keine eigenständigen Wortvarianten. Vollständiger Editionskontext über der Quellenangabe.</p>';
  return {load,entries,preview,credit,mt:ref=>data?.mt[ref]};
}
return {create};
})();
