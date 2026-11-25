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
 function apparatus(ch,refs,enabled){
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
 const name=s=>s==='K'?'Kaufmann':s==='P'?'Parma':'Cambridge';
 const token=(sig,pair,diff=false)=>{
  const [ref,i]=pair,w=data.witnesses[sig].units[ref].words[i],uncertain=w.text.includes('□')||w.flags.some(f=>['damage','unclear','gap'].includes(f));
  return '<button type="button" class="mci-word '+(uncertain?'muted':diff?'mt-diff':'')+'" lang="he" data-tc-mishnah="'+esc(sig+'|'+ref)+'" data-tc-mishnah-word="'+esc(ref+'|'+i)+'" title="'+esc('Quellenbeleg und Kontext anzeigen')+'">'+esc(w.text)+(w.flags.length?'<sup class="mci-annotation" aria-label="'+esc('Quellenzeichen')+'">·</sup>':'')+'</button>';
 };
 function interlinear(ch,refs,enabled){
  return '<p class="tc-credit">'+esc('Bezugstext: Kaufmann A50 · maschinelle Wort- und Gruppenzuordnung')+' <abbr class="ab" title="'+esc('Rot: abweichende Lesart oder Zusatz. …: Zuordnung offen. —: kein Gegenstück im maschinellen Vergleich. Quellenzeichen bleiben im Kontext erhalten.')+'">ⓘ</abbr></p>'+refs.map(ref=>{
   const u=data.witnesses.K.units[ref];if(!u)return '';
   const witnesses=enabled.filter(s=>s!=='K'),links=Object.fromEntries(witnesses.map(sig=>[sig,(data.interlinear.chapters[ch]?.[sig]?.links||[]).filter(l=>l.ref===ref)]));
   const parent=u.words.map((_,i)=>i),find=i=>parent[i]===i?i:parent[i]=find(parent[i]);
   for(const sig of witnesses)for(const l of links[sig])for(let j=1;j<l.base.length;j++)parent[find(l.base[j][1])]=find(l.base[0][1]);
   // Render a shared group when any witness joins multiple base tokens.
   const groups=[];for(let i=0;i<u.words.length;i++){const root=find(i),g=groups.find(g=>g.root===root);if(g)g.indices.push(i);else groups.push({root,indices:[i]});}
   const columns=[];
   const insertion=boundary=>{
    const ls=Object.fromEntries(witnesses.map(sig=>[sig,links[sig].filter(l=>!l.base.length&&(l.after?.[0]===ref?l.after[1]:-1)===boundary)]));
    if(!witnesses.some(sig=>ls[sig].length))return;
    columns.push('<div class="mci-column mci-insertion"><div class="mci-cell muted">+</div>'+witnesses.map(sig=>'<div class="mci-cell">'+ls[sig].flatMap(l=>l.reading).map(pair=>token(sig,pair,true)).join(' ')+'</div>').join('')+'</div>');
   };
   insertion(-1);
   for(const g of groups){
    columns.push('<div class="mci-column"><div class="mci-cell">'+g.indices.map(i=>token('K',[ref,i])).join(' ')+'</div>'+witnesses.map(sig=>{
     const ls=links[sig].filter(l=>l.base.some(([r,i])=>g.indices.includes(i))),covered=new Set(ls.flatMap(l=>l.base.map(x=>x[1]))),pairs=ls.flatMap(l=>l.reading),diff=ls.some(l=>l.kind!=='exact'&&l.kind!=='joined');
     return '<div class="mci-cell">'+ls.flatMap(l=>l.reading.map(pair=>token(sig,pair,l.kind==='form'||l.kind==='reviewed'||words(sig,l.reading).replace(/[^א-ת]/g,'')!==words('K',l.base).replace(/[^א-ת]/g,'')))).join(' ')+(covered.size<g.indices.length?' <span class="muted" title="'+esc('Zuordnung offen')+'">…</span>':!pairs.length?'<span class="mt-diff" title="'+esc('Kein Gegenstück im maschinellen Vergleich')+'">—</span>':'')+'</div>';
    }).join('')+'</div>');for(const i of g.indices)insertion(i);
   }
   const open=witnesses.map(sig=>{
    const rows=(data.interlinear.chapters[ch]?.[sig]?.open||[]).filter(o=>o.nearRef===ref);if(!rows.length)return '';
    return '<div class="mci-open"><span class="tc-witness-label">'+esc(name(sig))+'</span> '+esc('Nicht sicher zugeordnet')+' <span dir="rtl">'+rows.map(o=>token(sig,o.reading)).join(' ')+'</span></div>';
   }).join('');
   return '<section class="tc-reader-verse" data-rows="'+ref.split(':')[1]+'"><div class="tc-verse-summary">Mishnah Berakhot '+esc(ref)+'</div><div class="mci-grid"><div class="mci-labels">'+['K',...witnesses].map(sig=>'<div class="mci-cell">'+contextButton(sig,sig==='K'?[ref]:[...new Set(links[sig].flatMap(l=>l.reading.map(x=>x[0])))] )+'</div>').join('')+'</div><div class="mci-columns" dir="rtl">'+columns.join('')+'</div></div>'+open+'</section>';
  }).join('')+'<p class="tc-credit">Digital Mishnah · CC BY 4.0 · '+esc('Gruppen statt erzwungener Einzelwortpaare; offene Wörter stehen getrennt. Nicht vollständig philologisch geprüft.')+'</p>';
 }
 function tosefta(ch,refs){
  const t=data.tosefta;
  const rs=t.records.filter(r=>r.baseWordIds.some(id=>refs.includes(id.split('.').slice(3,5).join(':'))));
  return '<p class="tc-credit">'+esc('Mischna–Tosefta: vorhandene Passagenverknüpfungen des Projekts, keine Einzelwortvarianten.')+'</p>'+rs.map(r=>{
   const mr=[...new Set(r.baseWordIds.map(id=>id.split('.').slice(3,5).join(':')))];
   const detail='Mishnah '+mr.join(', ')+' ↔ Tosefta '+r.projectRefs.join(', ');
   const status=r.unresolvedIds.length?'Wortverweise im Referenztext nicht auflösbar':'Projektverweise vorhanden; Wortzuordnung nicht geprüft';
   return '<section class="tc-reader-verse"><div class="tc-verse-summary">'+esc(detail)+' · '+esc('Projektzählung')+'</div><p class="muted">'+esc(status)+'</p>'+r.pdRefs.map(ref=>{
    const [a,b]=ref.split(':').map(Number),txt=t.reading.text[a-1]?.[b-1];
    return '<div class="tc-mishnah-context" dir="rtl" lang="he">'+esc(txt||'')+'</div><small>'+esc('Geprüfte Parallelpassage; eigene Zählung der Leseausgabe')+' · Tosefta '+esc(ref)+" · Tosefta B’rachot · Public Domain</small>";
   }).join('')+'<details><summary>'+esc('Quellenverweise')+'</summary><p>'+esc(r.file)+' · '+esc(r.id)+'</p><p class="tc-mishnah-xml">'+esc(r.baseWordIds.join(' '))+'</p><p class="tc-mishnah-xml">'+esc(r.toseftaWordIds.join(' '))+'</p></details></section>';
  }).join('')+'<p class="tc-credit">Digital Mishnah · '+esc('Projektverknüpfungen und Leseausgabe haben unterschiedliche Textstände und Zählungen. Nur geprüfte Parallelpassagen erhalten eine Textvorschau.')+'</p>';
 }
 const render=(ch,refs,enabled,mode='interlinear')=>mode==='apparatus'?apparatus(ch,refs,enabled):mode==='tosefta'?tosefta(ch,refs):interlinear(ch,refs,enabled);
 function contextText(u,ref,anchor){
  const [r,i]=String(anchor.dataset.tcMishnahWord||'').split('|'),w=r===ref?u.words[+i]:null;
  if(!w||!Number.isInteger(w.start))return esc(u.text);
  return esc(u.offsetText.slice(0,w.start))+'<mark>'+esc(u.offsetText.slice(w.start,w.end))+'</mark>'+esc(u.offsetText.slice(w.end));
 }
 function metadataPreview(anchor){
  const [sig,refs]=String(anchor.dataset.tcMishnah||'').split('|'),source=data?.witnesses[sig];if(!source)return '';
  const [wordRef,index]=String(anchor.dataset.tcMishnahWord||'').split('|'),i=Number(index);
  const status=l=>!l?'Zuordnung offen':l.checked?'Geprüfte Zuordnung':l.kind==='joined'?'Wortgruppe (maschinell)':l.kind==='form'?'Form / Wortlaut':l.kind==='absent'?'Kein Gegenstück im maschinellen Vergleich':!l.base.length?'Zusatz (maschineller Vergleich)':'Wortzuordnung (maschinell)';
  return '<b>'+esc(source.name)+'</b>'+String(refs||'').split(',').map(ref=>{
   const u=source.units[ref];if(!u)return '';const w=wordRef===ref&&index!==undefined?u.words[i]:null;
   let h='<p>Mishnah Berakhot '+esc(ref)+'</p><small>'+esc(u.id)+'</small>';
   if(w){
    h+='<p>'+esc('Transkriptionswort')+' '+(i+1)+'</p>';
    if(sig!=='K'){
     const chapter=data.interlinear.chapters[ref.split(':')[0]]?.[sig],link=chapter?.links.find(l=>l.reading.some(([r,n])=>r===ref&&n===i));
     h+='<p>'+esc(status(link))+'</p>';
    }else for(const other of ['P','C']){
     const link=data.interlinear.chapters[ref.split(':')[0]]?.[other]?.links.find(l=>l.base.some(([r,n])=>r===ref&&n===i));
     h+='<p>'+esc(name(other))+': '+esc(status(link))+'</p>';
    }
    const notes=u.annotations.filter(a=>a.start<w.end&&a.end>w.start||a.start===a.end&&a.start>=w.start&&a.start<w.end);
    h+=notes.map(a=>'<p>'+esc(annotationLabel(a))+(a.expansion?': <bdi lang="he" dir="rtl">'+esc(a.expansion)+'</bdi>':'')+(a.tag==='del'&&a.text?': <bdi lang="he" dir="rtl">'+esc(a.text)+'</bdi>':'')+(Object.keys(a.attrs).length?' <small>'+esc(Object.entries(a.attrs).map(([k,v])=>k+'='+v).join(' · '))+'</small>':'')+'</p>').join('');
   }else{
    const counts=new Map();for(const a of u.annotations)counts.set(annotationLabel(a),(counts.get(annotationLabel(a))||0)+1);
    h+=[...counts].map(([label,n])=>'<p>'+esc(label)+' · '+n+'</p>').join('');
   }
   return h;
  }).join('')+'<small>Digital Mishnah · '+esc(source.license)+'</small>';
 }
 function preview(anchor){
  const [sig,refs]=anchor.dataset.tcMishnah.split('|'),w=data?.witnesses[sig];if(!w)return '';
  return '<b>'+esc(w.name)+'</b>'+refs.split(',').map(ref=>{const u=w.units[ref];if(!u)return '';return '<p>'+esc('Mishnah Berakhot '+ref)+' · '+esc(u.id)+'</p><div class="tc-mishnah-context" lang="he" dir="rtl">'+contextText(u,ref,anchor)+'</div>'+u.annotations.map(a=>'<p>'+esc(annotationLabel(a))+': <bdi dir="rtl" lang="he">'+esc(a.text||'□')+'</bdi>'+ (a.expansion?' → <bdi dir="rtl" lang="he">'+esc(a.expansion)+'</bdi>':'')+' <small>'+esc(Object.entries(a.attrs).map(([k,v])=>k+'='+v).join(' · '))+'</small></p>').join('')+'<details><summary>'+esc('Original-TEI')+'</summary><pre class="tc-mishnah-xml">'+esc(u.raw)+'</pre></details>';}).join('')+'<small>Digital Mishnah · '+esc(w.license)+' · '+esc(w.url)+'</small>';
 }
 return {load,render,preview,metadataPreview,sourceUnit:(sig,ref)=>'<small class="mci-source-ref">'+esc('Mishnah Berakhot '+ref)+' · '+esc('Eigene Handschriftenzählung')+'</small><div dir="rtl">'+data.witnesses[sig].units[ref].words.map((_,i)=>token(sig,[ref,i])).join(' ')+'</div>',refs:ch=>Object.keys(data?.verses||{}).filter(r=>r.startsWith(ch+':'))};
}
return {create};
})();
