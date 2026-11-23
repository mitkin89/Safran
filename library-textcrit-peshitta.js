// Peshitta as an apparatus witness: pluses and minuses against the MT, taken from the
// word-by-word MT–Peshitta alignment (peshitta-alignment*.js), plus classified readings
// (peshitta-readings/<Book>.js, tools/peshitta/readings/build.py; reviewed by Claude, 2026).
// This is not a critical apparatus of Peshitta manuscripts.
window.LibraryPeshittaTC=(()=>{
'use strict';
const TYPES={
  lesart:['andere Lesart','Andere Konsonanten in der Vorlage oder Verlesung'],
  deutung:['andere Deutung','Gleiche Konsonanten, anders vokalisiert, abgeleitet oder getrennt'],
  zusatz:['Zusatz','Erweiterung ohne erkennbare Parallele'],
  auslassung:['Auslassung','MT-Text ohne Wiedergabe in der Peschitta'],
  harmonisierung:['Angleichung','An eine Parallelstelle angeglichen'],
  technik:['Übersetzungstechnik','Bewusste Übersetzungsentscheidung, keine andere Vorlage'],
  doublette:['Doppelübersetzung','Dieselbe Stelle zweifach wiedergegeben'],
  umstellung:['Umstellung','Andere Wortfolge oder über die Versgrenze verschoben'],
  zahl:['Zahl','Abweichende Zahl oder abweichendes Datum'],
  name:['Name','Abweichende Namensform'],
  syrfehler:['innersyrischer Fehler','Wahrscheinlich Abschreibfehler innerhalb der syrischen Überlieferung'],
};
function create(host){
  const esc=s=>host.esc(window.I18N?.textCrit?.(String(s))??s);
  const raw=s=>host.esc(String(s));
  const P=()=>window.PeshittaAlignment,cache=new Map();
  const cons=s=>String(s).normalize('NFKD').replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]);
  const LONG=8;
  const file=book=>'peshitta-readings/'+String(book).replace(/ /g,'_')+'.js';
  function available(book){return !!P()?.has(book);}
  function load(book){
    if(!available(book))return Promise.resolve(null);
    if(!cache.has(book)){
      const pent=P().PENTATEUCH.includes(book);
      const links=host.load(P().file(book),()=>pent?window.PESHITTA_ALIGNMENT_DATA:window.PESHITTA_ALIGNMENT_BOOKS?.[book]).then(d=>P().book(pent?d:{version:2,books:{[book]:d}},book));
      const readings=(P().READINGS||[]).includes(book)?host.load(file(book),()=>window.PESHITTA_READINGS?.[book]).catch(()=>null):Promise.resolve(null);
      cache.set(book,Promise.all([links,readings]).then(([d,r])=>d&&{...d,readings:r||{}}).catch(e=>{cache.delete(book);throw e;}));
    }
    return cache.get(book);
  }
  function syriac(words){
    const text=words.join(' '),span=t=>'<span class="tc-ps-sy" lang="syr" dir="rtl">'+raw(t)+'</span>';
    if(words.length<=LONG)return span(text);
    return '<details class="tc-ps-long"><summary>'+span(words.slice(0,LONG).join(' ')+' …')+' <small>('+words.length+' '+esc('Wörter')+')</small></summary>'+span(text)+'</details>';
  }
  function cite(ref,v,native,marks){
    const title=(v.review?.note||'')+(v.review?.by?' · '+v.review.by:'');
    const shifted=native.length&&native.some(r=>r!==ref.replace(/^.* /,''))?' · '+esc('Peschitta-Zählung')+' '+raw([...new Set(native)].join(', ')):'';
    return '<small class="tal-cite" tabindex="0" data-tc-ps="'+raw(ref)+'" data-tc-ps-sy="'+raw((marks||[]).join(','))+'" title="'+raw(title)+'">'+esc('Peschitta (ETCBC) · Wortzuordnung zum MT')+', '+raw(ref)+shifted+'</small>';
  }
  const tag=(label,title,type)=>'<abbr class="ab tc-tov-tag'+(type?' tc-ps-'+type:'')+'" title="'+esc(title)+'">'+esc(label)+'</abbr>';
  function reading(r){
    const [label,title]=TYPES[r.type]||[r.type,''];
    const vorlage=r.vorlage?' <span class="tc-tov-reading">≈ <bdi lang="he" dir="rtl">'+raw(r.vorlage)+'</bdi> <abbr class="ab" title="'+esc('Erschlossene hebräische Vorlage; kein Handschriftenbeleg')+'">'+esc('erschlossen')+'</abbr></span>':'';
    const traditions=window.TextCritTraditions, tags=r.traditionTags||[];
    const explanation=window.I18N?.lang==='en'&&r.en?r.en:r.note;
    const note=' <span class="tc-ps-note">'+raw(traditions?.note(explanation,tags)??explanation)+(r.parallel?' ('+esc('vgl.')+' '+raw(r.parallel)+')':'')+(r.sure?'':' <span class="muted">('+esc('unsicher')+')</span>')+'</span>';
    return {tag:tag(label,title,r.type),detail:vorlage+note+(traditions?.badge(tags,raw)||'')};
  }
  const entry=(ref,v,native,body,type,marks)=>'<article class="tc-entry tc-ps-entry"'+(type?' data-ps-type="'+raw(type)+'"':'')+' data-witness="Syr"><div class="tc-note-text"><span class="tc-witness-label" title="'+esc('Peschitta')+'">Syr</span> '+body+'<!--agree--></div>'+cite(ref,v,native,marks)+'</article>';
  // Reading line (textcrit-summary.js): generic plus/minus, or the classified type
  function lzOf(r,op){
    const w=r&&!r.sure?'Syr?':'Syr',base={f:'Syr',w,title:r?(TYPES[r.type]||[r.type])[0]:''};
    if(!r)return {...base,op};
    const t=r.type;
    if(t==='syrfehler')return null;
    if(t==='deutung'||t==='technik')return {...base,op:'interp'};
    if(t==='auslassung')return {...base,op:'om'};
    if(op==='add'||t==='zusatz')return {...base,op:'add',rd:r.vorlage||''};
    if(op==='om')return {...base,op:'om'};
    return r.vorlage?{...base,op:'var',rd:r.vorlage,ret:true}:{...base,op:'note'};
  }
  // queries: [{ref:'Book c:v',row}] as for the other witnesses
  function entries(data,queries){
    if(!data)return [];
    const out=new Map();
    for(const {ref,row} of queries){
      const m=/^(.*) (\d+:\d+)$/.exec(ref);if(!m||m[1]!==data.book)continue;
      const v=data.verses[m[2]];if(!v)continue;seen.set(ref,v);
      const R=(data.readings?.[m[2]]||[]).map(r=>({...r,used:false,traditionTags:window.TextCritTraditions?.tags('Syr',data.book,m[2],r)}));
      const add=(id,anchor,html,syr,r,op)=>{const prev=out.get(id);if(prev){if(!prev.rows.includes(row))prev.rows.push(row);return;}out.set(id,{anchor:{...anchor,ref},displayRef:ref,rows:[row],html,syr:syr||null,lz:lzOf(r,op||(anchor.kind==='gap'?'add':'var'))});};
      // Words already covered by a classified reading of linked words get no second, generic entry
      const covSy=new Set(R.filter(r=>r.he.length&&r.sy.length).flatMap(r=>r.sy)),covHe=new Set(R.filter(r=>r.he.length&&r.sy.length).flatMap(r=>r.he));
      const afterLinked=j=>{let k=j-1;while(k>=0&&!v.links[k].length)k--;return k>=0?Math.max(...v.links[k])-1:-1;};
      // Plus: consecutive Syriac words without an MT counterpart, placed after the MT word of the preceding linked Syriac word
      for(let j=0;j<v.sy.length;){
        if(v.links[j].length){j++;continue;}
        let e=j;while(e+1<v.sy.length&&!v.links[e+1].length)e++;
        const after=afterLinked(j),native=v.refs?.slice(j,e+1)||[];
        const r=R.find(x=>!x.used&&!x.he.length&&x.sy.length&&x.sy.every(s=>s-1>=j&&s-1<=e));if(r)r.used=true;
        if(!r&&Array.from({length:e-j+1},(_,q)=>j+q+1).every(s=>covSy.has(s))){j=e+1;continue;}
        const x=r&&reading(r);
        add(ref+'|+'+j,{kind:'gap',start:after,end:after},entry(ref,v,native,(x?x.tag:tag('Peschitta-Zusatz','Wörter der Peschitta ohne Gegenstück im MT'))+' '+syriac(v.sy.slice(j,e+1))+(x?x.detail:''),r?.type,Array.from({length:e-j+1},(_,q)=>j+q)),r?.vorlage,r,'add');
        j=e+1;
      }
      // Minus: consecutive MT words the Peshitta does not render (the bare object marker et is not counted)
      const used=new Set(v.links.flat()),n=v.he.length,et=x=>['את','ואת'].includes(cons(v.he[x-1])),miss=x=>!used.has(x)&&!et(x);
      for(let i=1;i<=n;){
        if(!miss(i)){i++;continue;}
        let e=i;for(;;){let k=e+1;while(k<=n&&et(k)&&!used.has(k))k++;if(k<=n&&miss(k))e=k;else break;}
        const r=R.find(x=>!x.used&&!x.sy.length&&x.he.some(h=>h>=i&&h<=e));if(r)r.used=true;
        if(!r&&Array.from({length:e-i+1},(_,q)=>i+q).every(h=>covHe.has(h)||et(h))){i=e+1;continue;}
        const x=r&&reading(r);
        add(ref+'|-'+i,{kind:'word',start:i-1,end:e-1},entry(ref,v,[],(x?x.tag:tag('Peschitta-Auslassung','MT-Wörter ohne Wiedergabe in der Peschitta'))+' <bdi lang="he" dir="rtl">'+raw(v.he.slice(i-1,e).join(' '))+'</bdi>'+(x?x.detail:''),r?.type),r?.vorlage,r,'om');
        i=e+1;
      }
      // Classified readings of linked words (and pluses/minuses not covered above)
      R.filter(r=>!r.used).forEach((r,k)=>{
        const x=reading(r),sy=r.sy.length?' '+syriac(r.sy.map(s=>v.sy[s-1])):'',he=r.he.length?r.he:null;
        const anchor=he?{kind:'word',start:Math.min(...he)-1,end:Math.max(...he)-1}:(()=>{const a=afterLinked(r.sy[0]-1);return {kind:'gap',start:a,end:a};})();
        add(ref+'|r'+k,anchor,entry(ref,v,(r.sy||[]).map(s=>v.refs?.[s-1]).filter(Boolean),x.tag+sy+x.detail,r.type,(r.sy||[]).map(s=>s-1)),r.vorlage,r,anchor.kind==='gap'?'add':'var');
      });
    }
    return [...out.values()];
  }
  // Agreement with other witnesses at the same MT position (reconstructed Vorlage vs. LXX retroversion / SMR wording)
  function agree(records){
    // equal, or one contains the other (e.g. LXX retroversion „הששי“ inside the Syriac Vorlage „ביום הששי“)
    const same=(a,b)=>{const x=cons(a).replace(/^ו/,''),y=cons(b).replace(/^ו/,'');if(!x||!y)return false;const [s,l]=x.length<=y.length?[x,y]:[y,x];return x===y||(s.length>=3&&l.includes(s));};
    for(const r of records){
      if(!r.html?.includes('<!--agree-->'))continue;
      const a=r.anchor,hits=new Set(),near=new Set();
      if(a)for(const o of records){
        if(o===r||!o.cmpWitness||!o.anchor||o.anchor.ref!==a.ref||o.anchor.kind!==a.kind)continue;
        const overlap=a.kind==='gap'?o.anchor.start===a.start:o.anchor.start<=a.end&&o.anchor.end>=a.start;
        if(!overlap)continue;
        if(r.syr&&o.cmp&&same(o.cmp,r.syr))hits.add(o.cmpWitness);else near.add(o.cmpWitness);
      }
      hits.forEach(w=>near.delete(w));
      r.html=r.html.replace('<!--agree-->',(hits.size?' <span class="tc-ps-agree" title="'+esc('Gleiche erschlossene Vorlage bzw. gleicher Wortlaut an dieser MT-Stelle')+'">= '+[...hits].map(raw).join(' ')+'</span>':'')+(near.size?' <span class="tc-ps-agree tc-ps-near" title="'+esc('Dieser Zeuge weicht an derselben MT-Stelle ebenfalls ab; Übereinstimmung nicht geprüft')+'">'+esc('vgl.')+' '+[...near].map(raw).join(' ')+'</span>':''));
    }
  }
  const credit=()=>'<p class="tc-credit">'+esc('Peschitta: ETCBC / Peshitta Institute · CC BY-NC 4.0. Zusätze und Auslassungen ergeben sich aus der Wort-für-Wort-Zuordnung zum MT (Claude, 2026); kein kritischer Apparat der Peschitta-Handschriften. Begründung der Zuordnung beim Überfahren der Quellenzeile.')+(Object.keys(window.PESHITTA_READINGS||{}).length?' '+esc('Lesarten-Einordnung und erschlossene Vorlagen: Claude, 2026; Vermutungen sind als unsicher gekennzeichnet.'):'')+'</p>';
  // Label preview: the Syriac verse with this entry's words marked.
  const seen=new Map();
  function preview(anchor){
    const ref=anchor.dataset.tcPs,v=seen.get(ref);if(!v)return '';
    const at=new Set(String(anchor.dataset.tcPsSy||'').split(',').filter(Boolean).map(Number));
    return '<b>'+esc('Peschitta')+' · '+raw(ref)+'</b><div class="tc-ps-sy" lang="syr" dir="rtl">'+v.sy.map((w,i)=>at.has(i)?'<span class="tc-dss-active">'+raw(w)+'</span>':raw(w)).join(' ')+'</div>'+(at.size?'':'<small>'+esc('Die MT-Wörter dieses Eintrags haben in der Peschitta keine Wiedergabe.')+'</small>');
  }
  return {available,load,entries,agree,credit,preview};
}
return {create};
})();
