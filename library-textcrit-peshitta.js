// Peshitta as an apparatus witness: pluses and minuses against the MT, taken from the
// word-by-word MT–Peshitta alignment (peshitta-alignment*.js; reviewed by Claude, 2026).
// This is not a critical apparatus of Peshitta manuscripts.
window.LibraryPeshittaTC=(()=>{
'use strict';
function create(host){
  const esc=s=>host.esc(window.I18N?.textCrit?.(String(s))??s);
  const raw=s=>host.esc(String(s));
  const P=()=>window.PeshittaAlignment,cache=new Map();
  const cons=s=>String(s).normalize('NFKD').replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]);
  const LONG=8;
  function available(book){return !!P()?.has(book);}
  function load(book){
    if(!available(book))return Promise.resolve(null);
    if(!cache.has(book)){
      const pent=P().PENTATEUCH.includes(book);
      cache.set(book,host.load(P().file(book),()=>pent?window.PESHITTA_ALIGNMENT_DATA:window.PESHITTA_ALIGNMENT_BOOKS?.[book])
        .then(d=>P().book(pent?d:{version:2,books:{[book]:d}},book))
        .catch(e=>{cache.delete(book);throw e;}));
    }
    return cache.get(book);
  }
  function syriac(words){
    const text=words.join(' '),span=t=>'<span class="tc-ps-sy" lang="syr" dir="rtl">'+raw(t)+'</span>';
    if(words.length<=LONG)return span(text);
    return '<details class="tc-ps-long"><summary>'+span(words.slice(0,LONG).join(' ')+' …')+' <small>('+words.length+' '+esc('Wörter')+')</small></summary>'+span(text)+'</details>';
  }
  function cite(ref,v,native){
    const title=(v.review?.note||'')+(v.review?.by?' · '+v.review.by:'');
    const shifted=native.length&&native.some(r=>r!==ref.replace(/^.* /,''))?' · '+esc('Peschitta-Zählung')+' '+raw([...new Set(native)].join(', ')):'';
    return '<small class="tal-cite" tabindex="0" title="'+raw(title)+'">'+esc('Peschitta (ETCBC) · Wortzuordnung zum MT')+', '+raw(ref)+shifted+'</small>';
  }
  // queries: [{ref:'Book c:v',row}] as for the other witnesses
  function entries(data,queries){
    if(!data)return [];
    const out=new Map();
    for(const {ref,row} of queries){
      const m=/^(.*) (\d+:\d+)$/.exec(ref);if(!m||m[1]!==data.book)continue;
      const v=data.verses[m[2]];if(!v)continue;
      const add=(id,anchor,html)=>{const prev=out.get(id);if(prev){if(!prev.rows.includes(row))prev.rows.push(row);return;}out.set(id,{anchor:{...anchor,ref},displayRef:ref,rows:[row],html});};
      // Plus: consecutive Syriac words without an MT counterpart, placed after the MT word of the preceding linked Syriac word
      for(let j=0;j<v.sy.length;){
        if(v.links[j].length){j++;continue;}
        let e=j;while(e+1<v.sy.length&&!v.links[e+1].length)e++;
        let k=j-1;while(k>=0&&!v.links[k].length)k--;
        const after=k>=0?Math.max(...v.links[k])-1:-1;
        const native=v.refs?.slice(j,e+1)||[];
        add(ref+'|+'+j,{kind:'gap',start:after,end:after},'<article class="tc-entry tc-ps-entry" data-witness="Syr"><div class="tc-note-text"><span class="tc-witness-label" title="'+esc('Peschitta')+'">Syr</span> <abbr class="ab tc-tov-tag" title="'+esc('Wörter der Peschitta ohne Gegenstück im MT')+'">'+esc('Peschitta-Zusatz')+'</abbr> '+syriac(v.sy.slice(j,e+1))+'</div>'+cite(ref,v,native)+'</article>');
        j=e+1;
      }
      // Minus: consecutive MT words the Peshitta does not render (the bare object marker et is not counted)
      const used=new Set(v.links.flat());
      const n=v.he.length,et=x=>['את','ואת'].includes(cons(v.he[x-1])),miss=x=>!used.has(x)&&!et(x);
      for(let i=1;i<=n;){
        if(!miss(i)){i++;continue;}
        let e=i;for(;;){let k=e+1;while(k<=n&&et(k)&&!used.has(k))k++;if(k<=n&&miss(k))e=k;else break;}
        add(ref+'|-'+i,{kind:'word',start:i-1,end:e-1},'<article class="tc-entry tc-ps-entry" data-witness="Syr"><div class="tc-note-text"><span class="tc-witness-label" title="'+esc('Peschitta')+'">Syr</span> <abbr class="ab tc-tov-tag" title="'+esc('MT-Wörter ohne Wiedergabe in der Peschitta')+'">'+esc('Peschitta-Auslassung')+'</abbr> <bdi lang="he" dir="rtl">'+raw(v.he.slice(i-1,e).join(' '))+'</bdi></div>'+cite(ref,v,[])+'</article>');
        i=e+1;
      }
    }
    return [...out.values()];
  }
  const credit=()=>'<p class="tc-credit">'+esc('Peschitta: ETCBC / Peshitta Institute · CC BY-NC 4.0. Zusätze und Auslassungen ergeben sich aus der Wort-für-Wort-Zuordnung zum MT (Claude, 2026); kein kritischer Apparat der Peschitta-Handschriften. Begründung der Zuordnung beim Überfahren der Quellenzeile.')+'</p>';
  return {available,load,entries,credit};
}
return {create};
})();
