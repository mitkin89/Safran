// Pilot apparatus against Kaufmann; no manuscript morphology or MT anchors inferred.
window.LibraryMishnahTextCrit=(()=>{
'use strict';
function create(host){
 const esc=s=>host.esc(window.I18N?.textCrit?.(String(s))??s);let data=null,pending=null;
 const load=()=>pending||(pending=host.load('mishnah-textcrit-data.js',()=>window.MISHNAH_TEXTCRIT).then(d=>data=d).catch(e=>{pending=null;throw e;}));
 const labels={add:'Nachtrag / Ergänzung',del:'Streichung',choice:'Abkürzung und Auflösung',surplus:'Füllzeichen',damage:'Beschädigung',unclear:'Unsichere Lesung',gap:'Lücke'};
 const annotationLabel=a=>a.tag==='add'&&a.attrs.place==='implied'?'Editorische Ergänzung':labels[a.tag]||a.tag;
 const words=(sig,pairs)=>pairs.map(([ref,i])=>data.witnesses[sig].units[ref].words[i].text).join(' ');
 const contextButton=(sig,refs)=>'<button type="button" class="tc-source tc-witness-label" data-tc-mishnah="'+esc(sig+'|'+refs.join(','))+'" aria-label="'+esc('Quellenbeleg und Kontext anzeigen')+'">'+esc(sig==='K'?'Kaufmann':sig==='P'?'Parma':'Cambridge')+'</button>';
 function render(ch,refs,enabled){
  const head='<p class="tc-credit">'+esc('Bezugstext: Kaufmann A50 · maschineller Vergleich')+' <abbr class="ab" tabindex="0" title="'+esc('Lesestand mit Nachträgen und Ergänzungen; Abkürzungen bleiben erhalten. Referenzzählung der Transkriptionen, noch kein geprüfter Abgleich mit der Lesefassung. Keine vollständig geprüfte kritische Edition.')+'">ⓘ</abbr></p>';
  return head+refs.map(ref=>{
   const base=data.witnesses.K.units[ref];if(!base)return '';
   const sources=contextButton('K',[ref])+enabled.filter(s=>s!=='K').map(sig=>contextButton(sig,data.verses[ref].witnessRefs[sig]||[])).join(' ');
   const rs=data.records.filter(r=>r.ref===ref&&enabled.includes(r.witness));
   const loci=rs.map(r=>{
    const before=words('K',r.base),after=words(r.witness,r.reading),title=before||'Zusatz nach '+(base.words[r.after]?.text||'—');
    const status=r.uncertain?'Unsichere Zuordnung / beschädigter Text':r.operation==='delete'?'Auslassung (maschineller Vergleich)':r.operation==='insert'?'Zusatz (maschineller Vergleich)':'Form- oder Wortlautunterschied (maschinell)';
    const short=r.uncertain?'Beschädigt / unsicher':r.operation==='delete'?'Auslassung':r.operation==='insert'?'Zusatz':'Form / Wortlaut';
    return '<section class="tc-locus"><h4 class="tc-locus-title"><bdi dir="rtl" lang="he">'+esc(title)+'</bdi></h4><div class="tc-locus-readings"><article class="tc-entry tc-mishnah-entry"><div class="tc-note-text">'+contextButton(r.witness,r.sourceRefs)+' <bdi dir="rtl" lang="he" class="'+(r.uncertain?'muted':'mt-diff')+'">'+esc(after||'—')+'</bdi> <abbr class="ab muted" title="'+esc(status)+'">'+esc(short)+'</abbr></div></article></div></section>';
   }).join('');
   const annotations=base.annotations.filter(a=>a.tag!=='choice').map(a=>'<div class="tc-mishnah-annotation">'+contextButton('K',[ref])+' '+esc(annotationLabel(a))+': <bdi dir="rtl" lang="he">'+esc(a.text||'□')+'</bdi> <small>'+esc(Object.entries(a.attrs).map(([k,v])=>k+'='+v).join(' · '))+'</small></div>').join('');
   return '<section class="tc-reader-verse" data-rows="'+ref.split(':')[1]+'"><div class="tc-verse-summary">'+esc('Mishnah Berakhot '+ref+' · Kaufmann')+' · '+rs.length+' '+esc('Vergleichshinweise')+'</div><div class="tc-mishnah-sources">'+sources+'</div>'+loci+annotations+'</section>';
  }).join('')+'<p class="tc-credit">Digital Mishnah · Hayim Lapin / Meyerhoff Center · CC BY 4.0. '+esc('Eigene Handschriftenzählungen und Original-TEI bleiben erhalten. Quellenkontext über den Zeugensiglen.')+'</p>';
 }
 function preview(anchor){
  const [sig,refs]=anchor.dataset.tcMishnah.split('|'),w=data?.witnesses[sig];if(!w)return '';
  return '<b>'+esc(w.name)+'</b>'+refs.split(',').map(ref=>{const u=w.units[ref];if(!u)return '';return '<p>'+esc('Mishnah Berakhot '+ref)+' · '+esc(u.id)+'</p><div class="tc-mishnah-context" lang="he" dir="rtl">'+esc(u.text)+'</div>'+u.annotations.map(a=>'<p>'+esc(annotationLabel(a))+': <bdi dir="rtl" lang="he">'+esc(a.text||'□')+'</bdi>'+ (a.expansion?' → <bdi dir="rtl" lang="he">'+esc(a.expansion)+'</bdi>':'')+' <small>'+esc(Object.entries(a.attrs).map(([k,v])=>k+'='+v).join(' · '))+'</small></p>').join('')+'<details><summary>'+esc('Original-TEI')+'</summary><pre class="tc-mishnah-xml">'+esc(u.raw)+'</pre></details>';}).join('')+'<small>Digital Mishnah · '+esc(w.license)+' · '+esc(w.url)+'</small>';
 }
 return {load,render,preview,refs:ch=>Object.keys(data?.verses||{}).filter(r=>r.startsWith(ch+':'))};
}
return {create};
})();
