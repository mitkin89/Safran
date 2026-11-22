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
  let morph=null;
  function load(book){
    if(!available(book))return Promise.resolve(null);
    // Greek morphology of the readings (hexapla-morph.js): optional, the apparatus works without it
    morph=morph||host.load('hexapla-morph.js',()=>window.HEXAPLA_MORPH).catch(()=>{morph=null;return null;});
    if(!cache.has(book))cache.set(book,Promise.all([host.load(file(book),()=>window.HEXAPLA_DATA?.[book]),morph]).then(([d])=>d).catch(e=>{cache.delete(book);throw e;}));
    return cache.get(book);
  }
  // Greek word -> tooltip with lemma, analysis (German via GMorph.describe) and short gloss
  const GWORD=/(<b class="tc-hx-sig"[^>]*>[^<]*<\/b>|<[^>]*>)|([\u0370-\u03FF\u1F00-\u1FFF][\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F]*[᾿’]?)/g;
  function lookup(w){
    const F=window.HEXAPLA_MORPH?.F;if(!F)return null;
    const k=window.GMorph?.form?window.GMorph.form(w):w;
    return F[k]||null;
  }
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
      return a?'<span class="tc-hx-w" tabindex="0" role="button" data-tc-hx="'+raw(analyse(a))+'">'+w+'</span>':w;
    });
  }
  const italic=s=>s.replace(/_([^_]+)_/g,'<i>$1</i>');
  function reading(data,u){
    // markup on the escaped reading first; footnote tooltips are inserted last so their text stays untouched
    let h=italic(raw(u.t)).replace(SIGLA,m=>{const t=SIGTITLE.find(([re])=>re.test(m));return '<b class="tc-hx-sig"'+(t?' tabindex="0" title="'+esc(t[1])+'"':'')+'>'+m+'</b>';})
      .replace(/※/g,'<span class="tc-hx-sign" title="'+esc('Asterisk: von Origenes nach dem Hebräischen ergänzt')+'">※</span>')
      .replace(/÷/g,'<span class="tc-hx-sign" title="'+esc('Obelus: in der LXX ohne hebräisches Gegenstück')+'">÷</span>');
    h=words(h);
    return h.replace(/\^(\d+)/g,(m,n)=>{
      const key=(u.fn||[]).find(k=>k.endsWith('.'+n)),note=key&&data.notes[key];
      if(!note)return '<sup>'+n+'</sup>';
      return '<sup class="tc-hx-fn" tabindex="0" role="button" data-hx-fn="'+raw(n)+'" title="'+esc('Fußnote aufklappen')+'">'+n+'</sup>';
    });
  }
  // Field's footnotes, collapsed: English translation first, the Latin original folded inside.
  function notes(data,u){
    return (u.fn||[]).map(key=>{
      const note=data.notes[key];if(!note)return '';
      const n=key.split('.').at(-1),la=italic(raw(note.la)),en=note.en&&note.en!==note.la?italic(raw(note.en)):'';
      return '<details class="tc-hx-note" data-hx-fn="'+raw(n)+'"><summary>'+esc('Fußnote')+' '+raw(n)+'</summary>'+(en?'<p lang="en">'+en+'</p><details class="tc-hx-la"><summary>'+esc('Lateinischer Text (Field)')+'</summary><p lang="la">'+la+'</p></details>':'<p lang="la">'+la+'</p>')+'</details>';
    }).join('');
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
        const html='<article class="tc-entry tc-hx-entry" data-witness="Hex"><div class="tc-note-text"><span class="tc-witness-label" title="'+esc('Hexapla (Field 1875)')+'">Hex</span> '+(u.l?'<span class="tc-hx-lat" title="'+raw(u.h)+'">'+italic(raw(u.l))+'</span> ':'')+'<span class="tc-hx-read" lang="grc">'+reading(data,u)+'</span></div>'+((u.fn||[]).length?'<div class="tc-hx-notes">'+notes(data,u)+'</div>':'')+'<small class="tal-cite" tabindex="0" title="'+raw('Blatt '+u.leaf+(u.cont?' · Fortsetzung':''))+'">'+raw(cite)+'</small></article>';
        const sig=[...new Set((u.t.match(SIGLA)||[]).map(x=>HEXSIG.find(([re])=>re.test(x))?.[1]).filter(Boolean))];
        out.set(id,{anchor,displayRef:ref,rows:[row],html,lz:sig.map(w=>({f:'Hex',w,op:'cite',title:'Hexapla (Field)'}))});
      });
    }
    return [...out.values()];
  }
  const credit=()=>'<p class="tc-credit">'+esc('Hexapla: Frederick Field, Origenis Hexaplorum quae supersunt I–II (Oxford 1875), gemeinfrei; Scan archive.org. Transkription und englische Übersetzung der lateinischen Fußnoten: Claude, 2026. Fußnoten zum Aufklappen (englisch, lateinisches Original eingeklappt). Siglen beim Überfahren erklärt. Griechische Wörter: Bestimmung beim Anklicken nach der LXX-Morphologie (Seth Kushniryk, CC BY 4.0) bzw. Perseus Morpheus (CC BY-SA 3.0 US).')+'</p>';
  function preview(anchor){
    const lines=String(anchor.dataset.tcHx||'').split('\n');
    return '<b lang="grc">'+raw(anchor.textContent)+'</b>'+lines.map(l=>'<div>'+raw(l)+'</div>').join('')+'<small>'+esc('Bestimmung maschinell; ein Wort kann mehrdeutig sein.')+'</small>';
  }
  return {available,load,entries,credit,preview};
}
return {create,BOOKS};
})();
