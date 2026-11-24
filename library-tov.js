// Source-preserving Tov/CATSS remarks, independent of the selected reader columns.
window.LibraryTov=(()=>{
'use strict';
function create(host){
  const esc=s=>host.esc(window.I18N?.textCrit?.(String(s))??s);let data=null,pending=null;
  // Classified LXX readings (lxx-readings/<code>.js, tools/lxx/readings/build.py; Claude, 2026) on the CATSS alignment
  const RT={lesart:['andere Lesart','Andere Konsonanten in der Vorlage oder Verlesung'],deutung:['andere Deutung','Gleiche Konsonanten, anders vokalisiert, abgeleitet oder getrennt'],zusatz:['Zusatz','Erweiterung ohne erkennbare Parallele'],auslassung:['Auslassung','MT-Text ohne Wiedergabe in der LXX'],harmonisierung:['Angleichung','An eine Parallelstelle angeglichen'],technik:['Übersetzungstechnik','Bewusste Übersetzungsentscheidung, keine andere Vorlage'],doublette:['Doppelübersetzung','Dieselbe Stelle zweifach wiedergegeben'],umstellung:['Umstellung','Andere Wortfolge oder über die Versgrenze verschoben'],zahl:['Zahl','Abweichende Zahl oder abweichendes Datum'],name:['Name','Abweichende Namensform'],grfehler:['innergriechischer Fehler','Wahrscheinlich Abschreibfehler innerhalb der griechischen Überlieferung']};
  const rpending=new Map();let rindex=null;
  const raw=s=>host.esc(String(s));
  const label=code=>code==='Jsha'?'LXX A (Josua)':code==='Jdga'?'LXX A':code==='Jdgb'?'LXX B':code==='DanTh'?'LXX Th':'LXX';
  function loadReadings(book){
    return host.load('lxx-readings/index.js',()=>window.LXX_READINGS_INDEX).then(ix=>{rindex=ix;
      const codes=Object.keys(ix||{}).filter(c=>ix[c].book===book);
      return Promise.all(codes.map(c=>{if(!rpending.has(c))rpending.set(c,host.load('lxx-readings/'+c+'.js',()=>window.LXX_READINGS?.[c]).catch(e=>{rpending.delete(c);throw e;}));return rpending.get(c);}));
    });
  }
  const readings=(code,ref)=>window.LXX_READINGS?.[code]?.verses[ref.replace(/^.* /,'')];
  const cons=s=>String(s).replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]);
  function readingLz(r,w,op){
    const base={f:'LXX',w:w+(r.sure?'':'?'),title:(RT[r.type]||[r.type])[0]},t=r.type;
    if(t==='grfehler')return null;
    if(t==='deutung'||t==='technik')return {...base,op:'interp'};
    if(t==='auslassung'||op==='om')return {...base,op:'om'};
    if(op==='add'||t==='zusatz')return {...base,op:'add',rd:r.vorlage||''};
    return r.vorlage?{...base,op:'var',rd:r.vorlage,ret:true}:{...base,op:'note'};
  }
  // queries as for entries(); mtWords(ref) = the MT words the apparatus anchors to
  function readingEntries(queries,mtWords){
    const out=new Map();
    for(const {ref,row} of queries){
      for(const code of Object.keys(rindex||{}).filter(c=>ref.startsWith(rindex[c].book+' '))){
        const v=readings(code,ref);if(!v)continue;  // 0 = classified, no significant deviation
        const ui=(mtWords(ref)||[]).map(cons),same=ui.length===v.H.length&&ui.every((w,i)=>w===cons(v.H[i]));
        const map=same?v.H.map((_,i)=>i):window.TextCrit.alignPositions(v.H,ui);
        const at=i=>map[i-1];
        v.r.forEach((r,k)=>{
          const id=code+' '+ref+'|'+k,prev=out.get(id);if(prev){if(!prev.rows.includes(row))prev.rows.push(row);return;}
          let anchor=null;
          if(r.he.length){const p=r.he.map(at);if(p.every(Number.isInteger))anchor={kind:'word',start:Math.min(...p),end:Math.max(...p)};}
          else{const p=r.a?at(r.a):-1;if(p===-1||Number.isInteger(p))anchor={kind:'gap',start:p,end:p};}
          const [lab,title]=RT[r.type]||[r.type,''],w=label(code);
          const greek=r.g?' <span class="tc-lxx-gr" lang="grc">'+raw(r.g)+'</span>':'';
          const vorlage=r.vorlage?' <span class="tc-tov-reading">≈ <bdi lang="he" dir="rtl">'+raw(r.vorlage)+'</bdi> <abbr class="ab" title="'+esc('Erschlossene hebräische Vorlage; kein Handschriftenbeleg')+'">'+esc('erschlossen')+'</abbr></span>':'';
          const note=' <span class="tc-ps-note">'+raw(window.I18N?.lang==='en'&&r.en?r.en:r.note)+(r.parallel?' ('+esc('vgl.')+' '+raw(r.parallel)+')':'')+(r.sure?'':' <span class="muted">('+esc('unsicher')+')</span>')+'</span>';
          const tradition=window.TextCritTraditions;
          const tags=tradition?.tags('LXX',code,ref.slice(rindex[code].book.length+1),r)||[];
          const html='<article class="tc-entry tc-tov-entry tc-lxx-reading" data-witness="'+raw(w)+'" data-lxx-type="'+raw(r.type)+'"><div class="tc-note-text"><span class="tc-witness-label" tabindex="0" data-tc-tov="'+raw(code+ref.slice(rindex[code].book.length))+'"'+(r.g?' data-tc-g="'+raw(r.g)+'"':'')+'>'+raw(w)+'</span> <abbr class="ab tc-tov-tag tc-ps-'+raw(r.type)+'" title="'+esc(title)+'">'+esc(lab)+'</abbr>'+greek+vorlage+note+(tradition?.badge(tags,raw)||'')+'</div><small class="tal-cite" tabindex="0" title="'+esc('Einordnung auf Grundlage der CATSS-Ausrichtung und Tovs Spalte b')+'">'+esc('LXX-Lesarten (Claude, 2026) · CATSS-Ausrichtung')+', '+raw(ref)+'</small></article>';
          out.set(id,{anchor:anchor&&{...anchor,ref},displayRef:ref,rows:[row],html,cmp:r.vorlage||null,cmpWitness:r.vorlage?w:null,lz:anchor?readingLz(r,w,anchor.kind==='gap'?'add':r.he.length&&!r.g?'om':'var'):null});
        });
      }
    }
    return [...out.values()];
  }
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
          const columnBody=columnCode&&n.bText.startsWith(columnCode)?n.bText.slice(columnCode.length).trim():n.bText;
          const columnText=columnBody.split(/\s+/).filter(token=>!token.startsWith('.')||!n.codes.includes(token)).join(' ');
          const flags=n.codes.filter(c=>c!==columnCode||!columnText).map(badge).join(' ');
          const greek=n.g?'<span class="tc-tov-lemma" lang="grc" tabindex="0" data-tov-key="'+esc(key)+'" data-catss-apparatus="1" data-tc-note="'+i+'" data-h="'+esc(n.h)+'">'+esc(n.g)+'</span>':'';
          const heb=!anchor&&n.h?'<bdi lang="he" dir="rtl">'+esc(n.h)+'</bdi>':'';
          const reading=esc(columnText).replace(/[א-ת]+/g,s=>'<bdi dir="rtl" lang="he">'+s+'</bdi>');
          const reconstructed=columnCode==='='&&/^[א-ת]/.test(columnText);
          const columnLabel=reconstructed?'erschlossen':shortLabels[columnCode]||'Tov-Hinweis';
          const columnTitle=reconstructed?'Von Tov erschlossene hebräische Entsprechung; kein Handschriftenbeleg. Quellcode: =':columnCode?explanation(columnCode):n.b;
          const detail=columnText?'<span class="tc-tov-reading"> · <abbr class="ab" title="'+esc(columnTitle)+'">'+esc(columnLabel)+'</abbr>: <bdi dir="ltr">'+reading+'</bdi></span>':'';
          const witness=code==='Jsha'?'LXX A (Josua)':code==='Jdga'?'LXX A':code==='Jdgb'?'LXX B':code==='DanTh'?'LXX Th':'LXX';
          const citation=n.origin==='bundled-CATSS'?'CATSS-Lesetext, '+ref+' · Gruppe '+n.group:'Tov/Kraft · CATSS, '+ref+' · '+n.file+':'+n.line;
          const sourceTitle=n.origin==='bundled-CATSS'?'Erhaltener Hinweis aus dem eingebundenen CATSS-Lesetext; keine vollständige Originalanmerkung. '+n.raw[0]:n.raw.join(' | ');
          const html='<article class="tc-entry tc-tov-entry" data-witness="'+esc(witness)+'"><div class="tc-note-text"><span class="tc-witness-label" tabindex="0" data-tc-tov="'+esc(key)+'" data-tc-note="'+i+'">'+esc(witness)+'</span> '+greek+(greek&&heb?' ↔ ':'')+heb+' <span class="tc-tov-codes">'+flags+'</span>'+detail+'</div><small class="tal-cite" tabindex="0" data-tc-tov="'+esc(key)+'" title="'+esc(sourceTitle)+'">'+esc(citation)+'</small></article>';
          const hebrew=/^[א-ת][א-ת ]*/.exec(columnText||'')?.[0].trim(),moved=n.codes.includes('{...}'),w=witness+(n.codes.includes('?')?'?':'');
          const lz=hebrew&&['=','=;','=:','=+'].includes(columnCode)?{op:'var',rd:hebrew,ret:true}:!moved&&n.codes.includes('---')?{op:'om'}:!moved&&n.codes.includes('--+')?{op:'add',rd:hebrew||''}:n.codes.some(c=>c==='=v'||c==='=@')?{op:'interp'}:n.codes.includes('=+')?{op:'note',title:'Zahl'}:null;
          out.set(id,{anchor:anchor?{...anchor,ref}:null,displayRef:ref,rows:[row],html,cmp:reconstructed?columnText:null,cmpWitness:witness,lz:lz&&readings(code,ref)===undefined?{f:'LXX',w,title:lz.ret?'Tov/Kraft':'',...lz}:null});
        });
      }
    }
    return [...out.values()];
  }
  const mt=ref=>data?.mt[ref];
  const credit=()=>'<p class="tc-credit">CATSS · Tov/Kraft · CC BY-NC-SA 3.0. Plus/Minus bezeichnen die Ausrichtung zum MT; erschlossene Lesarten sind keine erhaltenen Handschriftenlesarten. Quellcode und Erklärung beim Überfahren; Originalbeleg über der Zeugensigle. Auszüge aus dem CATSS-Lesetext sind gesondert bezeichnet.</p>';
  function preview(anchor){
    const v=data?.verses[anchor.dataset.tcTov];if(!v)return '';
    let note=anchor.dataset.tcNote==null?null:v.remarks[+anchor.dataset.tcNote];
    if(!note&&anchor.dataset.tcG){
      // Assessed reading: find its Greek words in the CATSS verse text to mark them.
      const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f᾿’]/g,'').toLowerCase(),want=window.GMorph.words(anchor.dataset.tcG).map(norm);
      const all=v.pairs.flatMap(([g])=>window.GMorph.words(g).map(norm));
      const at=all.findIndex((_,i)=>want.length&&want.every((w,j)=>all[i+j]===w));
      if(at>=0)note={g:anchor.dataset.tcG,start:at};
    }
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
    const v=data?.verses[anchor.dataset.tcTov||anchor.dataset.tovKey],n=v?.remarks[+anchor.dataset.tcNote];
    if(!n)return;
    const edition=data.editions[v.edition];if(edition.sourceOnly)return;const m=/ (\d+):(\d+)$/.exec(v.ref);
    host.openGreek?.(anchor,{text:v.text,group:n.g,start:n.start,ctx:{title:edition.book,vt:edition.versionTitle,ch:+m[1],v:+m[2]}});
  }
  return {load,entries,mt,credit,preview,open,loadReadings,readingEntries};
}
return {create};
})();
