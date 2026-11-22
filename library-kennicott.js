// Source-preserving per-book adapter; no fabricated manuscript verses or morphology.
window.LibraryKennicott=(()=>{
'use strict';
function create(host){
  const esc=s=>host.esc(window.I18N?.textCrit?.(String(s))??s);let data=null,wanted='Genesis';const cache=new Map(),pending=new Map();
  const inventory=()=>window.KENNICOTT_INDEX?.books||{Genesis:{file:'kennicott-data.js',counts:{entries:9129}}};
  const available=book=>!!inventory()[book]?.counts.entries;
  function load(book='Genesis'){
    wanted=book;
    if(!available(book)){data=null;return Promise.resolve(null);}
    if(cache.has(book)){data=cache.get(book);return Promise.resolve(data);}
    if(!pending.has(book))pending.set(book,host.load(inventory()[book].file,()=>book==='Genesis'?window.KENNICOTT_DATA:window.KENNICOTT_BOOKS?.[book]).then(d=>{cache.set(book,d);if(wanted===book)data=d;return d;}).catch(e=>{pending.delete(book);throw e;}));
    return pending.get(book).then(d=>{if(wanted===book)data=d;return d;});
  }
  const labels={caret:'Auslassung',transp:'Umstellung',ras:'Rasur',prm:'Frühere Lesung',frt:'Vermutete frühere Lesung (unsicher)',nnc:'Jetzige Lesung',vdtr:'Unsichere Lesung','ord-num':'Wortvorkommen','sup-ras':'Über Rasur','fin-lin':'Am Zeilenende',eras:'Getilgt',bis:'Zweimal'};
  const extra={'major':'vergrößert','major ornata':'vergrößert und verziert','ornata':'verziert','majusc.':'Großbuchstaben','lit.':'Buchstabe(n)'};
  const kcons=s=>String(s||'').replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]);
  const plain=n=>[n.text,...(n.children||[]).map(c=>plain(c)+c.tail)].join('').replace(/\s+/g,' ').trim();
  function node(n){
    if(!n)return '';
    const inner=esc(n.text)+(n.children||[]).map(c=>node(c)+esc(c.tail)).join('');
    if(n.tag==='term'){
      const ref=(n.attrs.ref||'').replace(/^#/,''),text=plain(n),title=labels[ref]||extra[text]||text;
      return '<abbr class="ab tc-ken-term" title="'+esc(title+(data.glossary[ref]?' · '+data.glossary[ref]:''))+'">'+esc(labels[ref]||text)+'</abbr>';
    }
    if(n.tag==='w')return '<bdi'+(/[א-ת]/.test(plain(n))?' lang="he" dir="rtl"':'')+'>'+inner+'</bdi>';
    if(n.tag==='pc'&&n.attrs.type==='lemSep')return '';
    if(n.tag==='note')return '<span class="tc-ken-note">'+inner+'</span>';
    return inner;
  }
  function witness(id){
    const key=id.replace(/^#/,''),descs=data.witnesses[key];
    const title=descs?.length?descs.map(d=>(d.type==='manuscript'?'Handschrift':'Druckausgabe')+': '+d.description).join('\n'):'Quellsigle '+key+'; kein zugehöriger Katalogeintrag in der Edition';
    return '<button type="button" class="ab tc-ken-witness" data-ken-witness="'+esc(key)+'" title="'+esc(title)+'" aria-label="'+esc(key.replace(/^K/,'K ')+': Handschrift oder Druckausgabe anzeigen')+'">'+esc(key.replace(/^K/,'K '))+'</button>';
  }
  function witnessCard(id){
    const key=String(id||'').replace(/^#/,''),descs=data?.witnesses[key]||[];
    const heading='<h3 id="kenWitnessTitle">Kennicott '+esc(key.replace(/^K/,'K '))+'</h3>';
    if(!descs.length)return heading+'<p>Kein zugehöriger Katalogeintrag in der Edition.</p>';
    return heading+descs.map(d=>{
      const fields=[['Ort',d.settlement],['Bibliothek',d.repository],['Signatur / Kennungen',d.idno],['Datierung',d.origDate||d.date],['Titel',d.title]].filter(([,values])=>values?.length);
      const seen=new Set(),links=(d.links||[]).filter(l=>/^https?:\/\//.test(l.url)&&!seen.has(l.url)&&seen.add(l.url));
      return '<section class="ken-witness-record"><h4>'+esc(d.type==='manuscript'?'Handschrift':'Druckausgabe')+'</h4>'+(fields.length?'<dl>'+fields.map(([label,values])=>'<dt>'+esc(label)+'</dt><dd>'+esc(values.join(' · '))+'</dd>').join('')+'</dl>':'')+'<details><summary>Beschreibung der Edition</summary><p>'+esc(d.description)+'</p></details>'+(links.length?'<div class="ken-witness-links">'+links.map(l=>{
        const digital=/facsimile/i.test(l.label),label=digital?'Digitalisat öffnen':l.label==='ktiv'?'Katalogeintrag öffnen · Ktiv':'Katalogeintrag öffnen · '+l.label;
        return '<button type="button" data-ken-url="'+esc(l.url)+'" title="'+esc(l.url)+'">'+esc(label)+' ↗</button>';
      }).join('')+'</div>':'<p class="muted">Kein externer Link in den Quelldaten.</p>')+'</section>';
    }).join('')+'<small>Digital Kennicott · Katalogangaben der Edition · CC BY-NC-SA 4.0</small>';
  }
  function reading(r,full=false){
    // More than three witnesses: a count that unfolds the sigla on click (all of them, each with its catalogue card).
    const list=r.witnesses.map(witness).join(' · '),many=!full&&r.witnesses.length>3;
    return '<span class="tc-ken-reading" data-group="'+r.group+'">'+node(r.nodes)+(r.witnesses.length?' '+(many?'<button type="button" class="tc-ken-count" aria-expanded="false" title="'+esc('Siglen anzeigen')+'">'+r.witnesses.length+' '+esc('Hss.')+'</button><span class="tc-ken-witnesses" hidden> '+list+'</span>':'<span class="tc-ken-witnesses">'+list+'</span>'):'')+'</span>';
  }
  function entries(queries,whole=false){
    const out=new Map(),requests=queries.slice();
    if(whole&&data){
      const chapters=new Set(queries.map(q=>q.ref.replace(/:\d+$/,'')));
      for(const id of data.unindexed||[]){const e=data.entries[id];if(e.refs.some(ref=>chapters.has(ref.replace(/:\d+$/,''))))requests.push({ref:e.refs[0],row:null,sourceOnly:id});}
    }
    for(const {ref,row,sourceOnly} of requests)for(const id of sourceOnly?[sourceOnly]:data?.index[ref]||[]){
      if(out.has(id)){if(row&&!out.get(id).rows.includes(row))out.get(id).rows.push(row);continue;}
      const e=data.entries[id],location=window.Kennicott.locateMapped(data,e);
      if(location.anchor&&location.anchor.ref!==ref)continue;
      // Keep the original rdgGrp divisions; never attach another reading's witnesses to an unassigned reading.
      const groups=new Map();for(const r of e.readings){if(!groups.has(r.group))groups.set(r.group,[]);groups.get(r.group).push(r);}
      const lemma=window.Kennicott.wholeVerse(e.lemma)?'<span class="tc-ken-lemma"><abbr class="ab" title="'+esc(e.lemma.join(' ')+' – Lemma der Edition: der ganze Vers')+'">Ganzer Vers</abbr> ] </span>':e.lemmaNode?'<span class="tc-ken-lemma">'+(e.lemmaNode.attrs.type==='reconstructed'?'<span class="muted">Erschlossenes Lemma: </span>':'')+node(e.lemmaNode)+' ] </span>':'';
      const html='<article class="tc-entry tc-ken-entry" data-witness="Kennicott" data-ken-id="'+id+'" data-alignment="'+esc(location.method)+'"><div class="tc-note-text"><span class="tc-witness-label" tabindex="0" data-tc-ken="'+id+'" title="Kennicott">Ken</span> '+lemma+[...groups.values()].map(rs=>'<span class="tc-ken-group">'+rs.map(r=>reading(r)).join(' ; ')+'</span>').join(' / ')+'</div><small class="tal-cite" tabindex="0" data-tc-ken="'+id+'" title="'+esc(location.method+(location.referenceMethod?' · '+location.referenceMethod:'')+' · Original-TEI: '+e.raw)+'">Digital Kennicott · '+esc(e.refs.join(' – '))+' · Eintrag '+esc(id.replace(/^.*-app-/,''))+(e.page?' · Seiten-ID '+esc(e.page):'')+'</small></article>';
      const lz=location.anchor?e.readings.map(r=>{const t=plain(r.nodes||{text:''}),he=(t.match(/[א-ת]+/g)||[]).join(' '),om=JSON.stringify(r.nodes||{}).includes('#caret');const mt=kcons((location.anchor.kind==='word'?(cache.get(location.anchor.ref.replace(/ \d+:\d+$/,''))?.mt[location.anchor.ref]||[]).slice(location.anchor.start,location.anchor.end+1):[]).join('')),fragment=he&&(he.split(' ').some(x=>x.length<2)||(mt&&mt.includes(kcons(he))));if(fragment)return null;return he?{f:'Ken',w:'Ken',op:location.anchor.kind==='gap'?'add':'var',rd:he,n:r.witnesses.length}:om?{f:'Ken',w:'Ken',op:'om',n:r.witnesses.length}:null;}).filter(Boolean):null;
      out.set(id,{anchor:location.anchor,displayRef:ref,rows:row?[row]:[],sourceOnly:!!sourceOnly,html,lz});
    }
    return [...out.values()];
  }
  function preview(anchor){
    const e=data?.entries[anchor.dataset.tcKen];if(!e)return '';
    // Mark the edition's lemma in its base text (whole verse for "Com.").
    const at=new Set(window.Kennicott.locateMapped(data,e).baseIndices||[]);
    return '<b>Kennicott · '+esc(e.refs.join(' – '))+'</b><div class="tc-he" dir="rtl" lang="he">'+(data.base[e.refs[0]]||[]).map((w,i)=>at.has(i)&&at.size<(data.base[e.refs[0]]||[]).length?'<span class="tc-dss-active">'+esc(w)+'</span>':esc(w)).join(' ')+'</div><small>Grundtext der Kennicott-Ausgabe, kein vollständiger Handschriftentext. Von Westminster / OSHB unabhängig.</small><p>'+node(e.lemmaNode)+(e.lemmaNode?' ] ':'')+e.readings.map(r=>reading(r,true)).join(' / ')+'</p><small>Digital Kennicott · Crestani / Legnaioli · CC BY-NC-SA 4.0. Quellensiglen und Zeichen: Erläuterung beim Überfahren.</small>';
  }
  const credit=()=>'<p class="tc-credit">Digital Kennicott · Crestani / Legnaioli, Universitäten Turin und Florenz · CC BY-NC-SA 4.0. Bezugstext: Kennicott / Van der Hooght; MT-Positionen maschinell abgeglichen. Frühere, jetzige und vermutete Lesungen bleiben getrennt; typographische Hinweise sind keine eigenständigen Wortvarianten. Vollständiger Editionskontext über der Zeugensigle.</p>';
  return {load,available,entries,preview,witnessCard,credit,mt:ref=>cache.get(ref.replace(/ \d+:\d+$/,''))?.mt[ref]};
}
return {create};
})();
