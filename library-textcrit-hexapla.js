// Hexapla as an apparatus witness: Frederick Field, Origenis Hexaplorum quae supersunt (Oxford 1875).
// Lemma, readings of the LXX with hexaplaric signs and of Aquila, Symmachus, Theodotion and others,
// footnotes in Latin with an English translation (hexapla-data/<Book>.js, tools/hexapla/build.py).
window.LibraryHexaplaTC=(()=>{
'use strict';
const BOOKS=/*BOOKS*/["Genesis"]/*END*/;
const SIGLA=/(Ο΄\.|Οἱ [Γγ]΄\.?|Οἱ λοιποί|Οἱ λ΄\.?|Ὁ Σύρος|Ὁ Ἑβραῖος|Ὁ Σαμαρειτικός|Τὸ Σαμαρειτικόν|Ἄλλος|Ἄλλως|[’'‘]?Α\.|Ἀ\.|Σ\.|Θ\.|Alia exempl\.|Aliter:)/g;
function create(host){
  const esc=s=>host.esc(window.I18N?.textCrit?.(String(s))??s);
  const raw=s=>host.esc(String(s));
  const cache=new Map();
  const file=book=>'hexapla-data/'+String(book).replace(/ /g,'_')+'.js';
  function available(book){return BOOKS.includes(book);}
  function load(book){
    if(!available(book))return Promise.resolve(null);
    if(!cache.has(book))cache.set(book,host.load(file(book),()=>window.HEXAPLA_DATA?.[book]).catch(e=>{cache.delete(book);throw e;}));
    return cache.get(book);
  }
  const italic=s=>s.replace(/_([^_]+)_/g,'<i>$1</i>');
  function reading(data,u){
    // markup on the escaped reading first; footnote tooltips are inserted last so their text stays untouched
    let h=italic(raw(u.t)).replace(SIGLA,'<b class="tc-hx-sig">$1</b>')
      .replace(/※/g,'<span class="tc-hx-sign" title="'+esc('Asterisk: von Origenes nach dem Hebräischen ergänzt')+'">※</span>')
      .replace(/÷/g,'<span class="tc-hx-sign" title="'+esc('Obelus: in der LXX ohne hebräisches Gegenstück')+'">÷</span>');
    return h.replace(/\^(\d+)/g,(m,n)=>{
      const key=(u.fn||[]).find(k=>k.endsWith('.'+n)),note=key&&data.notes[key];
      if(!note)return '<sup>'+n+'</sup>';
      const la=note.la.replace(/_/g,''),en=(note.en||'').replace(/_/g,'');
      return '<sup class="tc-hx-fn" tabindex="0" title="'+raw(la+(en&&en!==la?'\n\n'+en:''))+'">'+n+'</sup>';
    });
  }
  function entries(data,queries){
    if(!data)return [];
    const out=new Map();
    for(const {ref,row} of queries){
      const m=/^(.*) (\d+:\d+)$/.exec(ref);if(!m||m[1]!==data.book)continue;
      (data.verses[m[2]]||[]).forEach((u,i)=>{
        const id=ref+'|'+i,prev=out.get(id);if(prev){if(!prev.rows.includes(row))prev.rows.push(row);return;}
        const anchor=u.s==null?null:u.gap?{kind:'gap',start:u.e,end:u.e,ref}:{kind:'word',start:u.s,end:u.e,ref};
        const cite='Field, Hexapla I, S. '+u.pg+(u.field&&u.field!==m[2]?' · Field '+u.field:'');
        const html='<article class="tc-entry tc-hx-entry" data-witness="Hex"><div class="tc-note-text"><span class="tc-witness-label" title="'+esc('Hexapla (Field 1875)')+'">Hex</span> '+(u.l?'<span class="tc-hx-lat" title="'+raw(u.h)+'">'+italic(raw(u.l))+'</span> ':'')+'<span class="tc-hx-read" lang="grc">'+reading(data,u)+'</span></div><small class="tal-cite" tabindex="0" title="'+raw('Blatt '+u.leaf+(u.cont?' · Fortsetzung':''))+'">'+raw(cite)+'</small></article>';
        out.set(id,{anchor,displayRef:ref,rows:[row],html});
      });
    }
    return [...out.values()];
  }
  const credit=()=>'<p class="tc-credit">'+esc('Hexapla: Frederick Field, Origenis Hexaplorum quae supersunt I (Oxford 1875), gemeinfrei; Scan archive.org. Transkription und englische Übersetzung der lateinischen Fußnoten: Claude, 2026. Fußnoten beim Überfahren der hochgestellten Zahl.')+'</p>';
  return {available,load,entries,credit};
}
return {create,BOOKS};
})();
