// Source-preserving manuscript apparatus against Kaufmann; no manuscript morphology or MT anchors inferred.
window.LibraryMishnahTextCrit=(()=>{
'use strict';
const supports=title=>title==='Mishnah Berakhot'||!!window.MISHNAH_TEXTCRIT_CATALOG?.[title];
function create(host){
 const esc=s=>host.esc(window.I18N?.textCrit?.(String(s))??s);let data=null,vocalized=null,request=0;const pending=new Map();
 async function load(title='Mishnah Berakhot'){
  if(!supports(title))throw Error('No Digital Mishnah source for '+title);
  const ticket=++request;
  if(!pending.has(title)){
   const file=window.MISHNAH_TEXTCRIT_CATALOG?.[title]?.file||'mishnah-textcrit-data.js';
   pending.set(title,host.load(file,()=>title==='Mishnah Berakhot'?window.MISHNAH_TEXTCRIT:window.MISHNAH_TEXTCRIT_BOOKS?.[title]).catch(err=>{pending.delete(title);throw err;}));
  }
  const selected=await pending.get(title);if(ticket===request)data=selected;return selected;
 }
 async function loadVocalized(title){
  const item=window.MISHNAH_VOCALIZED_CATALOG?.[title];if(!item)return null;
  const base=await load(title),key='vocalized/'+title;
  if(!pending.has(key))pending.set(key,host.load(item.file,()=>window.MISHNAH_VOCALIZED?.[title]).catch(err=>{pending.delete(key);throw err;}));
  const v=await pending.get(key);
  if(v.source.textHash!==item.textHash||v.source.rel!==item.rel||['D','P','C'].some(s=>v.witnessSha256?.[s]!==base.witnesses[s==='D'?'K':s].sha256))throw Error('Vocalized Mishnah comparison source mismatch');
  if(data===base)vocalized={...base,source:{...v.source,vocalized:true},witnesses:{...base.witnesses,D:base.witnesses.K,K:{...base.witnesses.K,name:'Kaufmann · vokalisierte Lesefassung',units:v.base}},verses:Object.fromEntries(Object.keys(v.base).map(r=>[r,{}])),interlinear:v.interlinear};return v;
 }
 function withVocalized(fn){const old=data;data=vocalized;try{return fn();}finally{data=old;}}
 function renderVocalized(ch,refs,enabled){if(!vocalized)return '';return withVocalized(()=>render(ch,refs,enabled));}
 const title=()=>data?.title||'Mishnah Berakhot';
 const labels={add:'Nachtrag / Ergänzung',del:'Streichung',choice:'Abkürzung und Auflösung',surplus:'Füllzeichen',damage:'Beschädigung',unclear:'Unsichere Lesung',gap:'Lücke'};
 const annotationLabel=a=>a.tag==='add'&&a.attrs.type==='comm'?'Randkommentar (Quelle)':a.tag==='add'&&a.attrs.place==='implied'?'Editorische Ergänzung':labels[a.tag]||a.tag;
 const words=(sig,pairs)=>pairs.map(([ref,i])=>data.witnesses[sig].units[ref].words[i].text).join(' ');
 const contextButton=(sig,refs)=>data.source?.vocalized&&sig==='K'?'<span class="tc-witness-label">'+esc('Kaufmann · vokalisiert')+'</span>':'<button type="button" class="tc-source tc-witness-label" data-tc-mishnah="'+esc(sig+'|'+refs.join(','))+'" aria-label="'+esc('Quellenbeleg und Kontext anzeigen')+'">'+esc(sig==='K'?'Kaufmann':sig==='D'?'Kaufmann · Digital Mishnah':sig==='P'?'Parma':'Cambridge')+'</button>';
 function apparatus(ch,refs,enabled){
  const head='<p class="tc-credit">'+esc('Bezugstext: Kaufmann A50 · maschineller Vergleich')+' <abbr class="ab" tabindex="0" title="'+esc('Lesestand mit Nachträgen und Ergänzungen; Abkürzungen bleiben erhalten. Referenzzählung der Transkriptionen, noch kein geprüfter Abgleich mit der Lesefassung. Keine vollständig geprüfte kritische Edition.')+'">ⓘ</abbr></p>';
  return head+refs.map(ref=>{
   const base=data.witnesses.K.units[ref];if(!base)return unbased(ch,ref,enabled);
   const sources=contextButton('K',[ref])+enabled.filter(s=>s!=='K').map(sig=>contextButton(sig,data.verses[ref].witnessRefs[sig]||[])).join(' ');
   const rs=data.records.filter(r=>r.ref===ref&&enabled.includes(r.witness));
   const loci=rs.map(r=>{
    const before=words('K',r.base),after=words(r.witness,r.reading),title=before||'Zusatz nach '+(base.words[r.after]?.text||'—');
    const status=r.uncertain?'Unsichere Zuordnung / beschädigter Text':r.operation==='delete'?'Auslassung (maschineller Vergleich)':r.operation==='insert'?'Zusatz (maschineller Vergleich)':'Form- oder Wortlautunterschied (maschinell)';
    const short=r.uncertain?'Beschädigt / unsicher':r.operation==='delete'?'Auslassung':r.operation==='insert'?'Zusatz':'Form / Wortlaut';
    return '<section class="tc-locus"><h4 class="tc-locus-title"><bdi dir="rtl" lang="he">'+esc(title)+'</bdi></h4><div class="tc-locus-readings"><article class="tc-entry tc-mishnah-entry"><div class="tc-note-text">'+contextButton(r.witness,r.sourceRefs)+' <bdi dir="rtl" lang="he" class="'+(r.uncertain?'muted':'mt-diff')+'">'+esc(after||'—')+'</bdi> <abbr class="ab muted" title="'+esc(status)+'">'+esc(short)+'</abbr></div></article></div></section>';
   }).join('');
   const annotations=base.annotations.filter(a=>a.tag!=='choice').map(a=>'<div class="tc-mishnah-annotation">'+contextButton('K',[ref])+' '+esc(annotationLabel(a))+': <bdi dir="rtl" lang="he">'+esc(a.text||'□')+'</bdi> <small>'+esc(Object.entries(a.attrs).map(([k,v])=>k+'='+v).join(' · '))+'</small></div>').join('');
   return '<section class="tc-reader-verse" data-rows="'+ref.split(':')[1]+'"><div class="tc-verse-summary">'+esc(title()+' '+ref+' · Kaufmann')+' · '+rs.length+' '+esc('Vergleichshinweise')+'</div><div class="tc-mishnah-sources">'+sources+'</div>'+loci+annotations+'</section>';
  }).join('')+'<p class="tc-credit">Digital Mishnah · Hayim Lapin / Meyerhoff Center · CC BY 4.0. '+esc('Eigene Handschriftenzählungen und Original-TEI bleiben erhalten. Quellenkontext über den Zeugensiglen.')+'</p>';
 }
 const name=s=>s==='K'?'Kaufmann':s==='D'?'Kaufmann · Digital Mishnah':s==='P'?'Parma':'Cambridge';
 const damagedReading=(sig,l)=>{
  if(!l.uncertain)return false;
  if(l.reading.some(([r,i])=>{const w=data.witnesses[sig].units[r].words[i];return w.text.includes('□')||w.flags.some(f=>['damage','gap','unclear'].includes(f));}))return true;
  if(l.reading.length!==1||!l.base.length)return false;
  const source=words(sig,l.reading).replace(/[^א-ת]/g,''),base=words('K',l.base).replace(/[^א-ת]/g,''),forms=[base,...(base.startsWith('ה')?[base.slice(1)]:[])];
  if(forms.includes(source))return false;
  return forms.some(b=>b.length>source.length&&(b.startsWith(source)||b.endsWith(source)));
 };
 const token=(sig,pair,diff=false,sourceUncertain=false)=>{
  const [ref,i]=pair,w=data.witnesses[sig].units[ref].words[i];
  if(data.source?.vocalized&&sig==='K'){
   const u=data.witnesses.K.units[ref],prefix=i===0?u.text.slice(0,w.start):'',suffix=u.text.slice(w.end,u.words[i+1]?.start??u.text.length);
   return esc(prefix)+'<span class="mci-base-word" lang="he" data-vocalized-word="'+esc(ref+'|'+i)+'">'+esc(w.text)+'</span>'+esc(suffix||' ');
  }
  const uncertain=sourceUncertain||w.text.includes('□')||w.flags.some(f=>['damage','unclear','gap'].includes(f));
  return '<button type="button" class="mci-word '+(uncertain?'muted':diff?'mt-diff':'')+'" lang="he" data-tc-mishnah="'+esc(sig+'|'+ref)+'" data-tc-mishnah-word="'+esc(ref+'|'+i)+'" title="'+esc('Quellenbeleg und Kontext anzeigen')+'">'+esc(w.text)+(w.flags.length?'<sup class="mci-annotation" aria-label="'+esc('Quellenzeichen')+'">·</sup>':'')+'</button>';
 };
 function interlinear(ch,refs,enabled){
  return '<p class="tc-credit">'+esc(data.source?.vocalized?'Bezugstext: vokalisierte Kaufmann-Lesefassung (Be’eri) · maschinelle Wort- und Gruppenzuordnung':data.interlinear.version===2?'Bezugstext: Kaufmann A50 · automatische Wortzuordnung nach Digital Mishnah':'Bezugstext: Kaufmann A50 · maschinelle Wort- und Gruppenzuordnung')+' <abbr class="ab" title="'+esc('Rot: abweichende Lesart oder Zusatz. …: Zuordnung offen. —: kein Gegenstück im maschinellen Vergleich. Quellenzeichen bleiben im Kontext erhalten.')+'">ⓘ</abbr></p>'+refs.map(ref=>{
   const u=data.witnesses.K.units[ref];if(!u)return unbased(ch,ref,enabled);
   const witnesses=enabled.filter(s=>s!=='K'),links=Object.fromEntries(witnesses.map(sig=>[sig,(data.interlinear.chapters[ch]?.[sig]?.links||[]).filter(l=>l.ref===ref)]));
   const baseNotes=(data.interlinear.baseNotes?.[ch]||[]).filter(n=>n.ref===ref),noteIndices=new Set(baseNotes.flatMap(n=>n.reading.map(p=>p[1])));
   const parent=u.words.map((_,i)=>i),find=i=>parent[i]===i?i:parent[i]=find(parent[i]);
   for(const sig of witnesses)for(const l of links[sig])for(let j=1;j<l.base.length;j++)parent[find(l.base[j][1])]=find(l.base[0][1]);
   // Render a shared group when any witness joins multiple base tokens.
   const groups=[];for(let i=0;i<u.words.length;i++){if(noteIndices.has(i))continue;const root=find(i),g=groups.find(g=>g.root===root);if(g)g.indices.push(i);else groups.push({root,indices:[i]});}
   const columns=[];
   const insertion=boundary=>{
    const ls=Object.fromEntries(witnesses.map(sig=>[sig,links[sig].filter(l=>!l.base.length&&(l.after?.[0]===ref?l.after[1]:-1)===boundary)]));
    if(!witnesses.some(sig=>ls[sig].length))return;
    const gapOnly=witnesses.every(sig=>ls[sig].every(l=>l.kind==='source-gap'));
    const comparePairs=(a,b)=>{const x=a.pair[0].split(':').map(Number),y=b.pair[0].split(':').map(Number);return x[0]-y[0]||x[1]-y[1]||a.pair[1]-b.pair[1];};
    columns.push('<div class="mci-column mci-insertion'+(gapOnly?' mci-source-gap':'')+'"><div class="mci-cell muted"'+(gapOnly?' title="'+esc('Lücke zwischen belegten Nachbarwörtern')+'"':'')+'>'+(gapOnly?'⋯':'+')+'</div>'+witnesses.map(sig=>'<div class="mci-cell mci-witness">'+ls[sig].flatMap(l=>l.reading.map(pair=>({pair,link:l}))).sort(comparePairs).map(({pair,link:l})=>token(sig,pair,l.kind!=='source-gap',damagedReading(sig,l))).join(' ')+'</div>').join('')+'</div>');
   };
   insertion(-1);
   for(const g of groups){
    columns.push('<div class="mci-column"><div class="mci-cell">'+g.indices.map(i=>token('K',[ref,i])).join(' ')+'</div>'+witnesses.map(sig=>{
     const ls=links[sig].filter(l=>l.base.some(([r,i])=>g.indices.includes(i))),covered=new Set(ls.flatMap(l=>l.base.map(x=>x[1]))),pairs=ls.flatMap(l=>l.reading),diff=ls.some(l=>l.kind!=='exact'&&l.kind!=='joined');
     return '<div class="mci-cell mci-witness">'+ls.flatMap(l=>l.reading.map(pair=>token(sig,pair,l.kind==='form'||l.kind==='reviewed'||words(sig,l.reading).replace(/[^א-ת]/g,'')!==words('K',l.base).replace(/[^א-ת]/g,''),damagedReading(sig,l)))).join(' ')+(covered.size<g.indices.length||ls.some(l=>!l.reading.length&&l.uncertain)?' <span class="muted" title="'+esc('Zuordnung offen')+'">…</span>':!pairs.length?'<span class="mt-diff" title="'+esc('Kein Gegenstück im maschinellen Vergleich')+'">—</span>':'')+'</div>';
    }).join('')+'</div>');for(const i of g.indices)insertion(i);
   }
   const open=witnesses.map(sig=>{
    const rows=(data.interlinear.chapters[ch]?.[sig]?.open||[]).filter(o=>o.nearRef===ref);if(!rows.length)return '';
    return '<div class="mci-open"><span class="tc-witness-label">'+esc(name(sig))+'</span> '+esc('Nicht sicher zugeordnet')+' <span dir="rtl">'+rows.map(o=>token(sig,o.reading)).join(' ')+'</span></div>';
   }).join('');
   const notes=[['K',baseNotes],...witnesses.map(sig=>[sig,(data.interlinear.chapters[ch]?.[sig]?.notes||[]).filter(n=>n.ref===ref)])].flatMap(([sig,rows])=>rows.map(n=>'<details class="mci-note"><summary>'+esc(name(sig))+' · '+esc('Randkommentar (Quelle)')+'</summary><div dir="rtl" lang="he">'+n.reading.map(pair=>token(sig,pair)).join(' ')+'</div></details>')).join('');
   return '<section class="tc-reader-verse" '+(data.source?.vocalized?'data-mci-vocalized="1" ':'')+'data-rows="'+ref.split(':')[1]+'"><div class="tc-verse-summary">'+esc(title()+' '+ref)+'</div><div class="mci-grid"><div class="mci-labels">'+['K',...witnesses].map(sig=>'<div class="mci-cell">'+contextButton(sig,sig==='K'?[ref]:[...new Set(links[sig].flatMap(l=>l.reading.map(x=>x[0])))] )+'</div>').join('')+'</div><div class="mci-columns" dir="rtl">'+columns.join('')+'</div></div>'+notes+open+'</section>';
  }).join('')+'<p class="tc-credit">Digital Mishnah · CC BY 4.0 · '+esc(data.interlinear.version===2?'Wortgruppen nach Digital Mishnah; Lücken und Quellenzeichen bleiben erhalten. Automatisch zugeordnet, nicht vollständig philologisch geprüft.':'Gruppen statt erzwungener Einzelwortpaare; offene Wörter stehen getrennt. Nicht vollständig philologisch geprüft.')+'</p>';
 }
 function tosefta(ch,refs){
  const t=data.tosefta;if(!t)return '<p class="muted">'+esc('Für diesen Traktat sind keine geprüften Mischna–Tosefta-Verknüpfungen eingebunden.')+'</p>';
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
 function unbased(ch,ref,enabled){
  return '<section class="tc-reader-verse" '+(data.source?.vocalized?'data-mci-vocalized="1" ':'')+'data-rows="'+ref.split(':')[1]+'"><div class="tc-verse-summary">'+esc(title()+' '+ref)+'</div><p class="muted mci-unbased-notice">'+esc('Kein Kaufmann-Referenztext für dieses Kapitel; die anderen Zeugen werden ohne Wortzuordnung gezeigt.')+'</p>'+enabled.filter(sig=>sig!=='K').map(sig=>Object.entries(data.witnesses[sig].units).filter(([r])=>r.startsWith(ch+':')).map(([r,u])=>'<div class="mci-open">'+contextButton(sig,[r])+' <span dir="rtl">'+u.words.map((_,i)=>token(sig,[r,i])).join(' ')+'</span></div>').join('')).join('')+'</section>';
 }
 function render(ch,refs,enabled,mode='interlinear'){
  if(!Object.values(data.witnesses).some(w=>Object.keys(w.units).some(r=>r.startsWith(ch+':'))))return '<p class="muted mci-coverage-notice">'+esc('Für dieses Kapitel ist in keinem der eingebundenen Zeugen Text vorhanden.')+'</p>';
  const missing=enabled.filter(sig=>sig!=='K'&&(data.interlinear.chapters[ch]?.[sig]?.unavailable||!Object.keys(data.witnesses[sig]?.units||{}).some(r=>r.startsWith(ch+':'))));
  enabled=enabled.filter(sig=>!missing.includes(sig));
  const notice=missing.map(sig=>'<p class="muted mci-coverage-notice">'+esc(name(sig))+': '+esc('Für dieses Kapitel ist kein Text im eingebundenen Zeugen vorhanden; keine belegte Auslassung.')+'</p>').join('');
  return notice+(mode==='apparatus'?apparatus(ch,refs,enabled):mode==='tosefta'?tosefta(ch,refs):interlinear(ch,refs,enabled));
 }
 function contextText(u,ref,anchor){
  const [r,i]=String(anchor.dataset.tcMishnahWord||'').split('|'),w=r===ref?u.words[+i]:null;
  if(!w||!Number.isInteger(w.start))return esc(u.text);
  return esc(u.offsetText.slice(0,w.start))+'<mark>'+esc(u.offsetText.slice(w.start,w.end))+'</mark>'+esc(u.offsetText.slice(w.end));
 }
 function metadataPreview(anchor){
  const [sig,refs]=String(anchor.dataset.tcMishnah||'').split('|'),source=data?.witnesses[sig];if(!source)return '';
  const [wordRef,index]=String(anchor.dataset.tcMishnahWord||'').split('|'),i=Number(index);
  const status=l=>!l?'Zuordnung offen':l.checked?'Geprüfte Zuordnung':l.kind==='source-gap'?'Lücke zwischen belegten Nachbarwörtern':l.uncertain?'Zuordnung (maschinell) · beschädigt / unsicher':l.kind==='joined'?'Wortgruppe (maschinell)':l.kind==='form'?'Form / Wortlaut':l.kind==='absent'?'Kein Gegenstück im maschinellen Vergleich':!l.base.length?'Zusatz (maschineller Vergleich)':'Wortzuordnung (maschinell)';
  return '<b>'+esc(source.name)+'</b>'+String(refs||'').split(',').map(ref=>{
   const u=source.units[ref];if(!u)return '';const w=wordRef===ref&&index!==undefined?u.words[i]:null;
   let h='<p>'+esc(title()+' '+ref)+'</p><small>'+esc(u.id)+'</small>';
   if(u.referenceCorrection)h+='<p>'+esc('Abschnittsnummer nach Handschriftenmarkierung; ursprüngliche XML-ID erhalten.')+'</p>';
   if(w){
    h+='<p>'+esc('Transkriptionswort')+' '+(i+1)+'</p>';
    if(sig!=='K'){
     const chapter=data.interlinear.chapters[ref.split(':')[0]]?.[sig],link=chapter?.links.find(l=>l.reading.some(([r,n])=>r===ref&&n===i));
     const note=chapter?.notes?.find(n=>n.reading.some(([r,j])=>r===ref&&j===i));
     h+='<p>'+esc(note?'Randkommentar (Quelle)':status(link))+'</p>';
    }else for(const other of (data.source?.vocalized?['D','P','C']:['P','C'])){
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
  return '<b>'+esc(w.name)+'</b>'+refs.split(',').map(ref=>{const u=w.units[ref];if(!u)return '';return '<p>'+esc(title()+' '+ref)+' · '+esc(u.id)+'</p><div class="tc-mishnah-context" lang="he" dir="rtl">'+contextText(u,ref,anchor)+'</div>'+u.annotations.map(a=>'<p>'+esc(annotationLabel(a))+': <bdi dir="rtl" lang="he">'+esc(a.text||'□')+'</bdi>'+ (a.expansion?' → <bdi dir="rtl" lang="he">'+esc(a.expansion)+'</bdi>':'')+' <small>'+esc(Object.entries(a.attrs).map(([k,v])=>k+'='+v).join(' · '))+'</small></p>').join('')+'<details><summary>'+esc('Original-TEI')+'</summary><pre class="tc-mishnah-xml">'+esc(u.raw)+'</pre></details>';}).join('')+'<small>Digital Mishnah · '+esc(w.license)+' · '+esc(w.url)+'</small>';
 }
 return {load,loadVocalized,renderVocalized,render,preview:anchor=>anchor.closest?.('[data-mci-vocalized]')?withVocalized(()=>preview(anchor)):preview(anchor),metadataPreview:anchor=>anchor.closest?.('[data-mci-vocalized]')?withVocalized(()=>metadataPreview(anchor)):metadataPreview(anchor),sourceUnit:(sig,ref)=>'<small class="mci-source-ref">'+esc(title()+' '+ref)+' · '+esc('Eigene Handschriftenzählung')+'</small><div dir="rtl">'+data.witnesses[sig].units[ref].words.map((_,i)=>token(sig,[ref,i])).join(' ')+'</div>',refs:ch=>Object.keys(data?.verses||{}).filter(r=>r.startsWith(ch+':'))};
}
return {create,supports};
})();
