// Source-preserving Tov/CATSS remarks, independent of the selected reader columns.
window.LibraryTov=(()=>{
'use strict';
function create(host){
  const {esc}=host;let data=null,pending=null;
  const shortLabels={
    '--+':'LXX-Zusatz','---':'LXX-Auslassung','{x}':'Scheinbares Plus/Minus',
    '{d}':'Doublette','{!}':'Infinitivus absolutus','{t}':'Transliteration',
    '{p}':'Präverb','{s}':'Steigerungsform','{v}':'Möglicherweise sekundär',
    '{*}':'Wie Ketiv','{**}':'Wie Qere','{g}':'Rahlfs / Göttingen','{#}':'Asterisk',
    '{...}':'Gegenstück an anderer Stelle','{..d}':'Verteilte Wiedergabe',
    '{..r}':'Wiederholung','{..p}':'Ergänzte Präposition','{..~}':'Sprachliche Umstellung',
    '~~~':'Umstellung','~':'Andere Wortfolge',"''":'Längeres Plus/Minus',
    '=':'Spalte b','=;':'erschlossen','=@':'Etymologische Deutung',
    '=:':'Eigenname (erschlossen)','=v':'Vokalisierung','=r':'erschlossen (unvollständig)',
    '=+':'Zahlenunterschied','=%':'Übersetzungstechnik','=%vap':'Aktiv → Passiv',
    '=%vpa':'Passiv → Aktiv','=%p':'Präposition / Partikel','=%p+':'Ergänzte Präposition / Partikel',
    '=p%-':'Ausgelassene Präposition / Partikel',
    '.m':'Metathese','.z':'Mögliche Abkürzung','.s':'Wort aufgeteilt','.j':'Wörter verbunden',
    '.w':'Andere Worttrennung','.rd':'ר / ד','?':'Unsicher',
    '[n]':'LXX-Verszählung','[[n]]':'MT-Verszählung','G':'Hebräische Variante',
  };
  const explanation=c=>c+' · '+(data.codes[c]||'Quellcode; keine gesicherte Auflösung im Quellschlüssel');
  const badge=c=>'<abbr class="ab tc-tov-tag" title="'+esc(explanation(c))+'">'+esc(shortLabels[c]||c)+'</abbr>';
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
          const columnCode=n.b?n.codes.find(c=>c.startsWith('=')):null;
          const flags=n.codes.filter(c=>c!==columnCode).map(badge).join(' ');
          const greek=n.g?'<span class="tc-tov-lemma" lang="grc" tabindex="0" data-tc-tov="'+esc(key)+'" data-catss-apparatus="1" data-tc-note="'+i+'" data-h="'+esc(n.h)+'">'+esc(n.g)+'</span>':'';
          const heb=n.h?'<bdi lang="he" dir="rtl">'+esc(n.h)+'</bdi>':'';
          const columnText=columnCode&&n.bText.startsWith(columnCode)?n.bText.slice(columnCode.length).trim():n.bText;
          const reading=esc(columnText).replace(/[א-ת]+/g,s=>'<bdi dir="rtl" lang="he">'+s+'</bdi>');
          const detail=n.b?'<span class="tc-tov-reading"> · <abbr class="ab" title="'+esc(columnCode?explanation(columnCode):n.b)+'">'+esc(shortLabels[columnCode]||'Spalte b')+'</abbr>: <bdi dir="ltr">'+reading+'</bdi></span>':'';
          return '<article class="tc-entry tc-tov-entry"><div class="tc-note-text">'+greek+(greek&&heb?' ↔ ':'')+heb+' <span class="tc-tov-codes">'+flags+'</span>'+detail+'</div><small class="tal-cite" tabindex="0" data-tc-tov="'+esc(key)+'" title="'+esc(n.raw.join(' | '))+'">Tov/Kraft · CATSS, '+esc(ref)+' · '+esc(n.file)+':'+n.line+'</small></article>';
        }).join('');
        out+='<section class="tc-witness tc-reader-verse" data-rows="'+esc(row)+'"><h3><button class="tc-jump" type="button" data-row="'+esc(row)+'">LXX · '+esc(ref)+(code==='Jdga'?' · A':code==='Jdgb'?' · B':code==='DanTh'?' · Theodotion':'')+'</button></h3>'+entries+'</section>';
      }
    }
    if(!out)out='<p class="muted">Keine Tov-Anmerkung für diese Stelle in der eingebundenen Oxford-Fassung. Nicht erschlossen: Psalmen, Sprüche, Hiob, Hosea und Esther. Das belegt keine Übereinstimmung mit dem MT.</p>';
    return '<div class="tc-tov"><p class="tc-count">'+count+' Hinweise · Tov/Kraft (CATSS)</p>'+out+'<p class="tc-credit">CATSS · Tov/Kraft · CC BY-NC-SA 3.0. Plus/Minus bezeichnen die Ausrichtung zum MT; erschlossene Lesarten sind keine erhaltenen Handschriftenlesarten. Kurzbezeichnungen: ursprünglicher Quellcode und Erklärung beim Überfahren; Originalspalten: beim Überfahren der Quellenzeile.</p></div>';
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
