// Hexapla as an apparatus witness: Frederick Field, Origenis Hexaplorum quae supersunt (Oxford 1875).
// Lemma, readings of the LXX with hexaplaric signs and of Aquila, Symmachus, Theodotion and others,
// footnotes in Latin with an English translation (hexapla-data/<Book>.js, tools/hexapla/build.py).
window.LibraryHexaplaTC=(()=>{
'use strict';
const BOOKS=/*BOOKS*/["Amos", "Daniel", "Deuteronomy", "Ecclesiastes", "Esther", "Exodus", "Ezekiel", "Ezra", "Genesis", "Habakkuk", "Haggai", "Hosea", "I Chronicles", "I Kings", "I Samuel", "II Chronicles", "II Kings", "II Samuel", "Isaiah", "Jeremiah", "Job", "Joel", "Jonah", "Joshua", "Judges", "Lamentations", "Leviticus", "Malachi", "Micah", "Nahum", "Nehemiah", "Numbers", "Obadiah", "Proverbs", "Psalms", "Ruth", "Song of Songs", "Zechariah", "Zephaniah"]/*END*/;
const HEXSIG=[[/^[’'‘]?Α\.|^Ἀ\./,'α′'],[/^Σ\./,'σ′'],[/^Θ\./,'θ′'],[/^Οἱ [Γγ]/,'οἱ γ′'],[/^Οἱ λ/,'οἱ λ′'],[/^Ὁ Σύρος/,'ὁ Σύρος'],[/^Ὁ Ἑβραῖος/,'ὁ Ἑβραῖος'],[/Σαμαρειτικ/,'τὸ Σαμ.'],[/^Ε΄/,'ε′'],[/^Ϛ΄/,'ϛ′'],[/^Ἄλλ|^Alia|^Aliter/,'ἄλλος']];
const SIGLA=/(Ο΄\.|Οἱ [Γγ]΄\.?|Οἱ λοιποί|Οἱ λ΄\.?|Ὁ Σύρος|Ὁ Ἑβραῖος|Ὁ Σαμαρειτικός|Τὸ Σαμαρειτικόν|Ἄλλος|Ἄλλως|[’'‘]?Α\.|Ἀ\.|Σ\.|Θ\.|Alia exempl\.|Aliter:|Ε΄\.|Ϛ΄\.|Ζ΄\.)/g;
// What each siglum stands for (hover).
const SIGTITLE=[[/^Ο΄/,'Ο΄ = die Septuaginta (LXX, „die Siebzig“)'],[/^Οἱ [Γγ]/,'Οἱ Γ΄ = „die Drei“: Aquila, Symmachus und Theodotion'],[/^Οἱ λ/,'Οἱ λοιποί = „die Übrigen“: die anderen griechischen Übersetzer (meist Aquila, Symmachus, Theodotion)'],[/^[’'‘]?Α\.|^Ἀ\./,'Ἀ. = Aquila (griechische Übersetzung, 2. Jh. n. Chr., sehr wörtlich)'],[/^Σ\./,'Σ. = Symmachus (griechische Übersetzung, um 200 n. Chr., freier und idiomatisch)'],[/^Θ\./,'Θ. = Theodotion (griechische Revision der LXX nach dem Hebräischen)'],[/^Ε΄/,'Ε΄ = Quinta, die fünfte griechische Übersetzung der Hexapla (anonym)'],[/^Ϛ΄/,'Ϛ΄ = Sexta, die sechste griechische Übersetzung der Hexapla (anonym)'],[/^Ζ΄/,'Ζ΄ = Septima, eine siebte griechische Übersetzung (anonym)'],[/^Ὁ Σύρος/,'Ὁ Σύρος = „der Syrer“: von griechischen Kirchenvätern zitierte syrische Wiedergabe'],[/^Ὁ Ἑβραῖος/,'Ὁ Ἑβραῖος = „der Hebräer“: anonymer, von Kirchenvätern zitierter Gewährsmann'],[/Σαμαρειτικ/,'Τὸ Σαμαρειτικόν = griechische Übersetzung des samaritanischen Pentateuch'],[/^Ἄλλος/,'Ἄλλος = „ein anderer“: nicht namentlich bekannter Übersetzer'],[/^Ἄλλως|^Aliter/,'„anders“: abweichende Wiedergabe'],[/^Alia/,'Alia exemplaria = andere Handschriften']];
function create(host){
  const esc=s=>host.esc(window.I18N?.textCrit?.(String(s))??s);
  const raw=s=>host.esc(String(s));
  const cache=new Map();
  const file=book=>'hexapla-data/'+String(book).replace(/ /g,'_')+'.js';
  function available(book){return BOOKS.includes(book);}
  let morph=null,vorlage=null;
  function load(book){
    if(!available(book))return Promise.resolve(null);
    // Greek morphology of the readings (hexapla-morph.js): optional, the apparatus works without it
    morph=morph||host.load('hexapla-morph.js',()=>window.HEXAPLA_MORPH).catch(()=>{morph=null;return null;});
    vorlage=vorlage||host.load('hexapla-vorlage.js',()=>window.HEXAPLA_VORLAGE).catch(()=>{vorlage=null;return null;});
    if(!cache.has(book))cache.set(book,Promise.all([host.load(file(book),()=>window.HEXAPLA_DATA?.[book]),morph,vorlage]).then(([d])=>d).catch(e=>{cache.delete(book);throw e;}));
    return cache.get(book);
  }
  // Greek word -> tooltip with lemma, analysis (German via GMorph.describe) and short gloss
  const GWORD=/(<b class="tc-hx-sig"[^>]*>[^<]*<\/b>|<[^>]*>)|([\u0370-\u03FF\u1F00-\u1FFF][\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F]*[᾿’]?)/g;
  function lookup(w){
    const F=window.HEXAPLA_MORPH?.F;if(!F)return null;
    const k=window.GMorph?.form?window.GMorph.form(w):w;
    return F[k]||null;
  }
  const distinct=a=>{const seen=new Set();return a.filter(([l,k])=>{const id=l+'|'+k;if(seen.has(id))return false;seen.add(id);return true;}).slice(0,4);};
  function analyse(a){
    const G=window.GMorph,t=window.I18N?.t?(x=>window.I18N.t(x)):(x=>x);
    const seen=new Set();
    return a.filter(([l,k])=>{const id=l+'|'+k;if(seen.has(id))return false;seen.add(id);return true;}).slice(0,4).map(([lemma,key,gloss])=>{
      const d=G?.describe?G.describe(key,t):{pos:key,info:''};
      return lemma+' – '+[d.pos,d.info].filter(Boolean).join(', ')+(gloss?' – '+gloss:'');
    }).join('\n');
  }
  function words(h){
    return h.replace(GWORD,(m,tag,w)=>{
      if(tag)return tag;
      const a=lookup(w);
      // Morphology opens on click, not on hover (library-textcrit.js, data-tc-hx).
      return a?'<span class="tc-hx-w" tabindex="0" role="button" data-tc-hx="'+raw(analyse(a))+'" data-hx-an="'+raw(JSON.stringify(distinct(a)))+'">'+w+'</span>':w;
    });
  }
  const italic=s=>s.replace(/_([^_]+)_/g,'<i>$1</i>');
  function reading(data,u){return markup(data,u,u.t);}
  function markup(data,u,text){
    // markup on the escaped reading first; footnote tooltips are inserted last so their text stays untouched
    let h=italic(raw(text)).replace(SIGLA,m=>{const t=SIGTITLE.find(([re])=>re.test(m));return '<b class="tc-hx-sig"'+(t?' tabindex="0" title="'+esc(t[1])+'"':'')+'>'+m+'</b>';})
      .replace(/※/g,'<span class="tc-hx-sign" title="'+esc('Asterisk: von Origenes nach dem Hebräischen ergänzt')+'">※</span>')
      .replace(/÷/g,'<span class="tc-hx-sign" title="'+esc('Obelus: in der LXX ohne hebräisches Gegenstück')+'">÷</span>');
    h=words(h);
    return h.replace(/\^(\d+)/g,(m,n)=>{
      const key=(u.fn||[]).find(k=>k.endsWith('.'+n)),note=key&&data.notes[key];
      if(!note)return '<sup>'+n+'</sup>';
      // The footnote opens in place, right after its number (English first, Latin folded).
      return '<sup class="tc-hx-fn" tabindex="0" role="button" aria-expanded="false" data-hx-fn="'+raw(n)+'" title="'+esc('Fußnote aufklappen')+'">'+n+'</sup>'+inlineNote(note,n);
    });
  }
  // Synopsis: one row per translator under the LXX; words the same as in the LXX row are folded to „…“
  // (shown again with „Volltext“). Only for plain readings that start with Ο΄ and have at least two rows.
  const norm=t=>t.normalize('NFD').replace(/[^\p{L}]/gu,'').toLowerCase();
  function synopsis(data,u,key){
    // italic Latin (_…_) stays one token: its spaces become no-break spaces
    const t=u.t.replace(/_[^_]+_/g,x=>x.replace(/ /g,'\u00a0'));
    const re=new RegExp(SIGLA.source,'g'),marks=[];let m;
    while((m=re.exec(t)))marks.push([m.index,m.index+m[0].length]);
    if(!marks.length||t.slice(0,marks[0][0]).trim())return null;
    const rows=[];
    for(let i=0;i<marks.length;i++){
      const last=rows.at(-1),between=last?t.slice(last.hend,marks[i][0]):'';
      if(last&&!between.trim()){last.hend=marks[i][1];continue;}       // Ο΄. Θ. – one row for several translators
      if(last)last.text=between;
      rows.push({hstart:marks[i][0],hend:marks[i][1]});
    }
    rows.at(-1).text=t.slice(rows.at(-1).hend);
    rows.forEach(r=>{r.head=t.slice(r.hstart,r.hend);r.tok=r.text.trim().split(/[ \t\n]+/).filter(Boolean);});
    if(rows.length<2||!/Ο΄/.test(rows[0].head)||rows[0].tok.length<1||rows.some(r=>!r.tok.length))return null;
    const base=rows[0].tok.map(norm);
    const row=(r,i)=>{
      let body;
      if(!i)body=markup(data,u,r.tok.join(' '));
      else{
        // longest common subsequence with the LXX row
        const a=base,b=r.tok.map(norm),L=Array.from({length:a.length+1},()=>new Array(b.length+1).fill(0));
        for(let x=a.length-1;x>=0;x--)for(let y=b.length-1;y>=0;y--)L[x][y]=a[x]&&a[x]===b[y]?L[x+1][y+1]+1:Math.max(L[x+1][y],L[x][y+1]);
        const same=new Array(b.length).fill(false);for(let x=0,y=0;x<a.length&&y<b.length;){if(a[x]&&a[x]===b[y]){same[y]=true;x++;y++;}else if(L[x+1][y]>=L[x][y+1])x++;else y++;}
        const parts=[];r.tok.forEach((w,k)=>{const p=parts.at(-1);if(p&&p.same===same[k])p.w.push(w);else parts.push({same:same[k],w:[w]});});
        const words=r.tok.filter(w=>norm(w)),differ=r.tok.filter((w,k)=>norm(w)&&!same[k]);
        const translit=differ.length&&differ.filter(w=>(lookup(w.replace(/[^\p{L}\p{M}’]/gu,''))||[])[0]?.[1]==='Y').length*2>=differ.length;
        r.type=!words.length?'':!differ.length?'gleich':translit?'translit':'wiedergabe';
        body=parts.map(p=>p.same?'<span class="tc-hx-same"><span class="tc-hx-same-t">'+markup(data,u,p.w.join(' '))+'</span></span>':markup(data,u,p.w.join(' '))).join(' ');
      }
      if(!i)r.type=/※/.test(r.text)?'asterisk':/÷/.test(r.text)?'obelus':'';
      // reviewed: other Vorlage / other reading of the same consonants (hexapla-vorlage.js)
      const vl=i&&key?window.HEXAPLA_VORLAGE?.[key+' '+r.head.replace(/\s+/g,' ').trim()]:null;
      if(vl)return '<span class="tc-hx-row-sig">'+markup(data,u,r.head)+'</span><span class="tc-hx-row" lang="grc">'+body+' '+typeTag(vl.t,vl)+'</span>';
      return '<span class="tc-hx-row-sig">'+markup(data,u,r.head)+'</span><span class="tc-hx-row" lang="grc">'+body+(r.type?' '+typeTag(r.type):'')+'</span>';
    };
    return '<div class="tc-hx-syn">'+rows.map(row).join('')+'</div><button type="button" class="tc-hx-syn-toggle" aria-pressed="false">'+esc('Volltext')+'</button>';
  }
  // Type of a translator row against the LXX row (machine; see agree() for the MT check)
  const HXTYPES={gleich:['wie LXX','Gleicher Wortlaut wie die LXX-Zeile'],
    wiedergabe:['andere Wiedergabe','Anderes griechisches Wort für denselben hebräischen Text (Wortwahl des Übersetzers), maschinell eingeordnet'],
    mt:['folgt dem MT','Weicht dort von der LXX ab, wo die LXX selbst vom MT abweicht (bewertete LXX-Lesart): wohl Angleichung an den hebräischen Text; maschinell eingeordnet'],
    translit:['Transkription','Hebräisches Wort in griechischen Buchstaben'],
    vorlage:['andere Vorlage','Setzt einen anderen hebräischen Konsonantentext voraus (meist ein verwechselbarer Buchstabe); von Claude geprüft'],
    deutung:['andere Deutung','Gleiche oder fast gleiche Konsonanten, anders gelesen oder von einer anderen Wurzel her verstanden; von Claude geprüft'],
    asterisk:['Zusatz nach dem Hebräischen','※ Asterisk: von Origenes in die LXX-Spalte nach dem Hebräischen eingefügt'],
    obelus:['LXX-Plus','÷ Obelus: in der LXX ohne Gegenstück im Hebräischen']};
  const typeTag=(t,vl)=>'<abbr class="ab tc-tov-tag tc-hx-type" data-hx-type="'+t+'" title="'+esc(HXTYPES[t][1])+(vl?.n?' · '+raw(vl.n):'')+'">'+esc(HXTYPES[t][0])+'</abbr>'+(vl?.he?' <span class="tc-tov-reading">≈ <bdi lang="he" dir="rtl">'+raw(vl.he)+'</bdi></span>':'');
  // Where an assessed LXX reading (not mere translation technique) covers the same MT words, a translator
  // that differs from the LXX there most likely renders the Hebrew: „folgt dem MT“.
  function agree(records){
    const lxx=records.filter(r=>r.anchor&&/tc-lxx-reading/.test(r.html)&&!/data-lxx-type="(technik|grfehler)"/.test(r.html));
    for(const r of records){
      if(!r.anchor||!/tc-hx-entry/.test(r.html)||!r.html.includes('data-hx-type="wiedergabe"'))continue;
      const a=r.anchor,hit=lxx.some(o=>o.anchor.ref===a.ref&&(a.kind==='gap'?o.anchor.kind==='gap'&&o.anchor.start===a.start:o.anchor.kind==='word'&&o.anchor.start<=a.end&&o.anchor.end>=a.start));
      if(hit)r.html=r.html.split(typeTag('wiedergabe')).join(typeTag('mt'));
    }
  }
  // Field's footnote as an inline note: English translation first, the Latin original folded inside.
  function inlineNote(note,n){
    const la=italic(raw(note.la)),en=note.en&&note.en!==note.la?italic(raw(note.en)):'';
    return '<span class="tc-hx-note" data-hx-fn="'+raw(n)+'" role="note" hidden><span class="tc-hx-note-n">'+raw(n)+'</span> '+(en?'<span lang="en">'+en+'</span> <button type="button" class="tc-hx-la-toggle" aria-expanded="false">'+esc('Latein')+'</button><span class="tc-hx-la" lang="la" hidden> '+la+'</span>':'<span lang="la">'+la+'</span>')+'</span>';
  }
  function entries(data,queries){
    if(!data)return [];
    const out=new Map();
    for(const {ref,row} of queries){
      const m=/^(.*) (\d+:\d+)$/.exec(ref);if(!m||m[1]!==data.book)continue;
      (data.verses[m[2]]||[]).forEach((u,i)=>{
        const id=ref+'|'+i,prev=out.get(id);if(prev){if(!prev.rows.includes(row))prev.rows.push(row);return;}
        const anchor=u.s==null?null:u.gap?{kind:'gap',start:u.e,end:u.e,ref}:{kind:'word',start:u.s,end:u.e,ref};
        const cite='Field, Hexapla '+(data.vol===2?'II':'I')+', S. '+u.pg+(u.field&&u.field!==m[2]?' · Field '+u.field:'');
        const html='<article class="tc-entry tc-hx-entry" data-witness="Hex"><div class="tc-note-text"><span class="tc-witness-label" title="'+esc('Hexapla (Field 1875)')+'">Hex</span> '+((syn=>syn?'<div class="tc-hx-read">'+syn+'</div>':'<span class="tc-hx-read" lang="grc">'+reading(data,u)+'</span>')(synopsis(data,u,data.book+' '+m[2]+'#'+i)))+(u.l?'<div class="tc-hx-foot"><button type="button" class="tc-hx-la-toggle tc-hx-lat-toggle" aria-expanded="false" title="'+esc('Fields lateinische Übersetzung des hebräischen Stichworts')+'">'+esc('Latein')+'</button><span class="tc-hx-lat" hidden title="'+raw(u.h)+'">'+italic(raw(u.l))+'</span></div>':'')+'</div>'+'<small class="tal-cite" tabindex="0" title="'+raw('Blatt '+u.leaf+(u.cont?' · Fortsetzung':''))+'">'+raw(cite)+'</small></article>';
        const sig=[...new Set((u.t.match(SIGLA)||[]).map(x=>HEXSIG.find(([re])=>re.test(x))?.[1]).filter(Boolean))];
        out.set(id,{anchor,displayRef:ref,rows:[row],html,lz:sig.map(w=>({f:'Hex',w,op:'cite',title:'Hexapla (Field)'}))});
      });
    }
    return [...out.values()];
  }
  const credit=()=>'<p class="tc-credit">'+esc('Hexapla: Frederick Field, Origenis Hexaplorum quae supersunt I–II (Oxford 1875), gemeinfrei; Scan archive.org. Transkription und englische Übersetzung der lateinischen Fußnoten: Claude, 2026. Fußnoten öffnen sich an der Fußnotenzahl (englisch, lateinisches Original eingeklappt). Siglen beim Überfahren erklärt. Griechische Wörter: Bestimmung und Wortkarte beim Anklicken nach der LXX-Morphologie (Seth Kushniryk, CC BY 4.0) bzw. Perseus Morpheus (CC BY-SA 3.0 US); Bedeutungen außerhalb der LXX aus LSJ (Perseus Digital Library, CC BY-SA).')+'</p>';
  function preview(anchor){
    let an=[];try{an=JSON.parse(anchor.dataset.hxAn||'[]');}catch{}
    const G=window.GMorph,t=window.I18N?.t?(x=>window.I18N.t(x)):(x=>x),form=anchor.textContent;
    const rows=an.map(([lemma,key,gloss])=>{const d=G?.describe?G.describe(key,t):{pos:key,info:''};const info=raw(JSON.stringify({lemma,form,key}));
      return '<div class="wseg"><span class="wlem wgl" lang="grc">'+raw(lemma)+'</span> <span class="muted">'+raw(gloss||'')+'</span><br><b>'+raw(d.pos)+'</b>'+(d.info?' · '+raw(d.info):'')+'<div class="tc-hx-cards"><button type="button" class="wforms" data-gr-card="card" data-gr-lemma="'+raw(lemma)+'" data-gr-info="'+info+'">'+esc('Wortkarte')+'</button><button type="button" class="wforms" data-gr-card="forms" data-gr-lemma="'+raw(lemma)+'" data-gr-info="'+info+'">'+esc('Alle Formen (Tabelle)')+'</button><button type="button" class="wforms" data-gr-card="all" data-gr-lemma="'+raw(lemma)+'">'+esc('Alle Stellen')+'</button></div></div>';}).join('');
    return '<b lang="grc">'+raw(form)+'</b>'+rows+'<small>'+esc('Bestimmung maschinell; ein Wort kann mehrdeutig sein.')+'</small>';
  }
  return {available,load,entries,credit,preview,agree};
}
return {create,BOOKS};
})();
