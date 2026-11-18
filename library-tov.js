// Source-preserving Tov/CATSS remarks, independent of the selected reader columns.
window.LibraryTov=(()=>{
'use strict';
function create(host){
  const {esc}=host;let data=null,pending=null;
  const load=()=>pending||(pending=host.load('tov-data.js',()=>window.TOV_DATA).then(d=>data=d).catch(e=>{pending=null;throw e;}));
  function render(queries){
    if(!data)return '';
    const seen=new Set();let out='',count=0;
    for(const {ref,row} of queries){
      const variants=Object.entries(data.editions).filter(([,e])=>ref.startsWith(e.book+' '));
      for(const [code,edition] of variants){
        const key=code+ref.slice(edition.book.length),v=data.verses[key];
        if(seen.has(key))continue;seen.add(key);
        if(!v)continue;
        const entries=v.remarks.map((n,i)=>{
          count++;
          const flags=n.codes.map(c=>'<abbr class="ab" title="'+esc(data.codes[c]||'Quellcode; keine gesicherte Auflösung im Quellschlüssel')+'">'+esc(c)+'</abbr>').join(' ');
          const greek=n.g?'<span class="tc-tov-lemma" lang="grc" tabindex="0" data-tc-tov="'+esc(key)+'" data-catss-apparatus="1" data-tc-note="'+i+'" data-h="'+esc(n.h)+'">'+esc(n.g)+'</span>':'';
          const heb=n.h?'<bdi lang="he" dir="rtl">'+esc(n.h)+'</bdi>':'';
          const label=n.b?(n.codes.some(c=>['=@','=v','=%','=%vap','=%vpa','=%p','=%p+','=p%-','=+'].includes(c))?'Spalte b':'Erschlossene Lesart / Spalte b'):'';
          const detail=n.b?'<div>'+label+': <bdi dir="ltr">'+esc(n.bText).replace(/[א-ת]+/g,s=>'<bdi dir="rtl" lang="he">'+s+'</bdi>')+'</bdi></div>':'';
          return '<article class="tc-entry tc-tov-entry"><div class="tc-note-text">'+greek+(greek&&heb?' ↔ ':'')+heb+' <span class="tc-tov-codes">'+flags+'</span>'+detail+'</div><small class="tal-cite" tabindex="0" data-tc-tov="'+esc(key)+'" title="'+esc(n.raw.join(' | '))+'">Tov/Kraft · CATSS, '+esc(ref)+' · '+esc(n.file)+':'+n.line+'</small></article>';
        }).join('');
        out+='<section class="tc-witness tc-reader-verse" data-rows="'+esc(row)+'"><h3><button class="tc-jump" type="button" data-row="'+esc(row)+'">LXX · '+esc(ref)+(code==='Jdga'?' · A':code==='Jdgb'?' · B':code==='DanTh'?' · Theodotion':'')+'</button></h3>'+entries+'</section>';
      }
    }
    if(!out)out='<p class="muted">Keine Tov-Anmerkung für diese Stelle in der eingebundenen Oxford-Fassung. Nicht erschlossen: Psalmen, Sprüche, Hiob, Hosea und Esther. Das belegt keine Übereinstimmung mit dem MT.</p>';
    return '<div class="tc-tov"><p class="tc-count">'+count+' Hinweise · Tov/Kraft (CATSS)</p>'+out+'<p class="tc-credit">CATSS · Tov/Kraft · CC BY-NC-SA 3.0. Plus/Minus bezeichnen die Ausrichtung zum MT; erschlossene Lesarten sind keine erhaltenen Handschriftenlesarten. Quellcodes: Erklärung beim Überfahren; Originalspalten: beim Überfahren der Quellenzeile.</p></div>';
  }
  function preview(anchor){
    const v=data?.verses[anchor.dataset.tcTov];if(!v)return '';
    return '<b>LXX · '+esc(v.ref)+'</b><div lang="grc">'+esc(v.text)+'</div><small>Tov/Kraft · CATSS · CC BY-NC-SA 3.0</small>';
  }
  function open(anchor){
    const v=data?.verses[anchor.dataset.tcTov],n=v?.remarks[+anchor.dataset.tcNote];
    if(!n)return;
    const edition=data.editions[v.edition],m=/ (\d+):(\d+)$/.exec(v.ref);
    host.openGreek?.(anchor,{text:v.text,group:n.g,start:n.start,ctx:{title:edition.book,vt:edition.versionTitle,ch:+m[1],v:+m[2]}});
  }
  return {load,render,preview,open};
}
return {create};
})();
