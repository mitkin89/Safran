// Source-preserving Tov/CATSS remarks, independent of the selected reader columns.
window.LibraryTov=(()=>{
'use strict';
function create(host){
  const esc=s=>host.esc(window.I18N?.textCrit?.(String(s))??s);let data=null,pending=null;
  const shortLabels={
    '--+':'LXX-Zusatz','---':'LXX-Auslassung','{x}':'Scheinbares Plus/Minus',
    '{d}':'Doublette','{!}':'Infinitivus absolutus','{t}':'Transliteration',
    '{p}':'Präverb','{s}':'Steigerungsform','{v}':'Möglicherweise sekundär',
    '{*}':'Wie Ketiv','{**}':'Wie Qere','{g}':'Rahlfs / Göttingen','{#}':'Asterisk',
    '{...}':'Gegenstück an anderer Stelle','{..d}':'Verteilte Wiedergabe',
    '{..r}':'Wiederholung','{..p}':'Ergänzte Präposition','{..~}':'Sprachliche Umstellung',
    '~~~':'Umstellung','~':'Andere Wortfolge',"''":'Längeres Plus/Minus',
    '=':'Tov-Hinweis','=;':'erschlossen','=@':'Etymologische Deutung',
    '=:':'Eigenname (erschlossen)','=v':'Vokalisierung','=r':'erschlossen (unvollständig)',
    '=+':'Zahlenunterschied','=%':'Übersetzungstechnik','=%vap':'Aktiv → Passiv',
    '=%vpa':'Passiv → Aktiv','=%p':'Präposition / Partikel','=%p+':'Ergänzte Präposition / Partikel',
    '=p%-':'Ausgelassene Präposition / Partikel',
    '.m':'Metathese','.z':'Mögliche Abkürzung','.s':'Wort aufgeteilt','.j':'Wörter verbunden',
    '.w':'Andere Worttrennung','.rd':'ר / ד','?':'Unsicher',
    '[u]':'CATSS-Platzhalter','[n]':'LXX-Verszählung','[[n]]':'MT-Verszählung','G':'Hebräische Variante',
  };
  const explanation=c=>c+' · '+(data.codes[c]||'Quellcode; keine gesicherte Auflösung im Quellschlüssel');
  const badge=c=>'<abbr class="ab tc-tov-tag" title="'+esc(explanation(c))+'">'+esc(shortLabels[c]||c)+'</abbr>';
  const load=()=>pending||(pending=host.load('tov-data.js',()=>window.TOV_DATA).then(d=>data=d).catch(e=>{pending=null;throw e;}));
  function entries(queries){
    if(!data)return [];
    const out=new Map();
    for(const {ref,row} of queries){
      for(const [code,edition] of Object.entries(data.editions).filter(([,e])=>ref.startsWith(e.book+' '))){
        const key=code+ref.slice(edition.book.length),v=data.verses[key];if(!v)continue;
        const mt=data.mt[ref]||[],mapped=window.TextCrit.alignPositions(v.hWords,mt);
        v.remarks.forEach((n,i)=>{
          const id=key+'|'+i,previous=out.get(id);
          if(previous){if(!previous.rows.includes(row))previous.rows.push(row);return;}
          const anchor=window.TextCrit.locate(mapped,Array.from({length:n.hCount},(_,j)=>n.hStart+j),mt.length,n.codes.includes('--+')?n.hStart:null);
          const columnCode=n.b?n.codes.find(c=>c.startsWith('=')):null;
          const columnText=columnCode&&n.bText.startsWith(columnCode)?n.bText.slice(columnCode.length).trim():n.bText;
          const flags=n.codes.filter(c=>c!==columnCode||!columnText).map(badge).join(' ');
          const greek=n.g?'<span class="tc-tov-lemma" lang="grc" tabindex="0" data-tc-tov="'+esc(key)+'" data-catss-apparatus="1" data-tc-note="'+i+'" data-h="'+esc(n.h)+'">'+esc(n.g)+'</span>':'';
          const heb=!anchor&&n.h?'<bdi lang="he" dir="rtl">'+esc(n.h)+'</bdi>':'';
          const reading=esc(columnText).replace(/[א-ת]+/g,s=>'<bdi dir="rtl" lang="he">'+s+'</bdi>');
          const reconstructed=columnCode==='='&&/^[א-ת]/.test(columnText);
          const columnLabel=reconstructed?'erschlossen':shortLabels[columnCode]||'Tov-Hinweis';
          const columnTitle=reconstructed?'Von Tov erschlossene hebräische Entsprechung; kein Handschriftenbeleg. Quellcode: =':columnCode?explanation(columnCode):n.b;
          const detail=columnText?'<span class="tc-tov-reading"> · <abbr class="ab" title="'+esc(columnTitle)+'">'+esc(columnLabel)+'</abbr>: <bdi dir="ltr">'+reading+'</bdi></span>':'';
          const witness=code==='Jsha'?'LXX A (Josua)':code==='Jdga'?'LXX A':code==='Jdgb'?'LXX B':code==='DanTh'?'LXX Th':'LXX';
          const citation=n.origin==='bundled-CATSS'?'CATSS-Lesetext, '+ref+' · Gruppe '+n.group:'Tov/Kraft · CATSS, '+ref+' · '+n.file+':'+n.line;
          const sourceTitle=n.origin==='bundled-CATSS'?'Erhaltener Hinweis aus dem eingebundenen CATSS-Lesetext; keine vollständige Originalanmerkung. '+n.raw[0]:n.raw.join(' | ');
          const html='<article class="tc-entry tc-tov-entry" data-witness="'+esc(witness)+'"><div class="tc-note-text"><span class="tc-witness-label">'+esc(witness)+'</span> '+greek+(greek&&heb?' ↔ ':'')+heb+' <span class="tc-tov-codes">'+flags+'</span>'+detail+'</div><small class="tal-cite" tabindex="0" data-tc-tov="'+esc(key)+'" title="'+esc(sourceTitle)+'">'+esc(citation)+'</small></article>';
          out.set(id,{anchor:anchor?{...anchor,ref}:null,displayRef:ref,rows:[row],html,cmp:reconstructed?columnText:null,cmpWitness:witness});
        });
      }
    }
    return [...out.values()];
  }
  const mt=ref=>data?.mt[ref];
  const credit=()=>'<p class="tc-credit">CATSS · Tov/Kraft · CC BY-NC-SA 3.0. Plus/Minus bezeichnen die Ausrichtung zum MT; erschlossene Lesarten sind keine erhaltenen Handschriftenlesarten. Quellcode und Erklärung beim Überfahren; Originalbeleg über der Zeugensigle. Auszüge aus dem CATSS-Lesetext sind gesondert bezeichnet.</p>';
  function preview(anchor){
    const v=data?.verses[anchor.dataset.tcTov];if(!v)return '';
    const note=anchor.dataset.tcNote==null?null:v.remarks[+anchor.dataset.tcNote];
    const count=note?window.GMorph.words(note.g).length:0;let position=0;
    const pairs=v.pairs.map(([g,h,flags,retro])=>{
      const length=window.GMorph.words(g).length,start=position;position+=length;
      const active=note&&count&&start<note.start+count&&position>note.start;
      const extra=retro?'<small class="tc-il-retro">erschlossen: <bdi lang="he" dir="rtl">'+esc(retro)+'</bdi></small>':'';
      return '<span class="tc-il-unit'+(active?' active':'')+'"><span lang="grc">'+esc(g||'—')+'</span><bdi class="tc-il-he" lang="he" dir="rtl"'+(!h?' title="Kein direktes hebräisches Gegenstück in dieser CATSS-Wortgruppe"':'')+'>'+esc(h||'—')+'</bdi>'+extra+'</span>';
    }).join('');
    return '<b>LXX · '+esc(v.ref)+(v.origin==='bundled-CATSS'?' · CATSS-Lesetext interlinear':' · Tov/CATSS interlinear')+'</b><div class="tc-tov-il" dir="ltr">'+pairs+'</div><small>Griechisch / hebräisches Gegenstück · Tov/Kraft · CATSS · CC BY-NC-SA 3.0</small>';

  }
  function open(anchor){
    const v=data?.verses[anchor.dataset.tcTov],n=v?.remarks[+anchor.dataset.tcNote];
    if(!n)return;
    const edition=data.editions[v.edition];if(edition.sourceOnly)return;const m=/ (\d+):(\d+)$/.exec(v.ref);
    host.openGreek?.(anchor,{text:v.text,group:n.g,start:n.start,ctx:{title:edition.book,vt:edition.versionTitle,ch:+m[1],v:+m[2]}});
  }
  return {load,entries,mt,credit,preview,open};
}
return {create};
})();
