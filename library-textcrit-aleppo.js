// Aleppo text („MA“: Miqra according to the Masorah, CACCHT) as an apparatus witness against the Leningrad
// text of the OSHB („ML“): one entry per differing word (aleppo-diff/<Book>.js, tools/aleppo/compare.py).
window.LibraryAleppoTC=(()=>{
'use strict';
const BOOKS=["Amos", "Daniel", "Deuteronomy", "Ecclesiastes", "Esther", "Exodus", "Ezekiel", "Ezra", "Genesis", "Habakkuk", "Haggai", "Hosea", "I Chronicles", "I Kings", "I Samuel", "II Chronicles", "II Kings", "II Samuel", "Isaiah", "Jeremiah", "Job", "Joel", "Jonah", "Joshua", "Judges", "Lamentations", "Leviticus", "Malachi", "Micah", "Nahum", "Nehemiah", "Numbers", "Obadiah", "Proverbs", "Psalms", "Ruth", "Song of Songs", "Zechariah", "Zephaniah"];
// Where the Aleppo Codex itself is lost, MAM follows other Tiberian manuscripts.
const LOST=[['Genesis',1,1,'Deuteronomy',28,16],['II Kings',14,21,'II Kings',18,13],['Jeremiah',29,9,'Jeremiah',31,34],['Jeremiah',32,2,'Jeremiah',32,13],['Amos',8,13,'Micah',5,1],['Zephaniah',3,20,'Zechariah',9,17],['Song of Songs',3,11,'Song of Songs',99,99],['Ecclesiastes',1,1,'Ecclesiastes',99,99],['Lamentations',1,1,'Lamentations',99,99],['Esther',1,1,'Esther',99,99],['Daniel',1,1,'Daniel',99,99],['Ezra',1,1,'Ezra',99,99],['Nehemiah',1,1,'Nehemiah',99,99]];
const ORDER=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','I Samuel','II Samuel','I Kings','II Kings','Isaiah','Jeremiah','Ezekiel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Psalms','Proverbs','Job','Song of Songs','Ruth','Lamentations','Ecclesiastes','Esther','Daniel','Ezra','Nehemiah','I Chronicles','II Chronicles'];
const pos=(b,c,v)=>ORDER.indexOf(b)*1e6+c*1e3+v;
const lost=(b,c,v)=>LOST.some(([b1,c1,v1,b2,c2,v2])=>pos(b,c,v)>=pos(b1,c1,v1)&&pos(b,c,v)<=pos(b2,c2,v2));
const KIND={k:['Konsonanten','Andere Buchstaben als im Leningradensis'],p:['plene/defektiv','Nur ו oder י mehr oder weniger (Vollschreibung)'],v:['Vokale','Andere Vokalisierung (Akzente und Meteg nicht gezählt)'],a:['Akzente','Nur die Akzente weichen ab'],w:['Wortbestand','Andere Worttrennung oder andere Wörter']};
function create(host){
  const esc=s=>host.esc(window.I18N?.textCrit?.(String(s))??s),raw=s=>host.esc(String(s));
  const cache=new Map();
  const available=book=>BOOKS.includes(book);
  function load(book){
    if(!available(book))return Promise.resolve(null);
    if(!cache.has(book))cache.set(book,host.load('aleppo-diff/'+book.replace(/ /g,'_')+'.js',()=>window.ALEPPO_DIFF?.[book]).catch(e=>{cache.delete(book);throw e;}));
    return cache.get(book);
  }
  // queries: [{ref:'Book c:v',row}]; accents only when asked for
  function entries(data,queries,accents){
    if(!data)return [];
    const out=new Map();
    for(const {ref,row} of queries){
      const m=/^(.*) (\d+):(\d+)$/.exec(ref);if(!m||m[1]!==data.book)continue;
      const away=lost(m[1],+m[2],+m[3]);
      (data.verses[m[2]+':'+m[3]]||[]).forEach(([s,e,k,ml,ma],i)=>{
        if(k==='a'&&!accents)return;
        const id=ref+'|'+i,prev=out.get(id);if(prev){if(!prev.rows.includes(row))prev.rows.push(row);return;}
        const anchor=e<0?{kind:'gap',start:s,end:s,ref}:{kind:'word',start:s,end:e,ref};
        const [lab,title]=KIND[k];
        const reading=ma?'<bdi class="tc-ma-he" lang="he" dir="rtl">'+raw(ma)+'</bdi>':'<span class="muted">'+esc('fehlt')+'</span>';
        const html='<article class="tc-entry tc-ma-entry" data-witness="MA" data-ma-kind="'+k+'"><div class="tc-note-text"><span class="tc-witness-label" title="'+esc('Aleppo-Text (Miqra according to the Masorah)')+'">MA</span> <abbr class="ab tc-tov-tag" title="'+esc(title)+'">'+esc(lab)+'</abbr> '+reading+(ml?' <small class="muted">ML <bdi lang="he" dir="rtl">'+raw(ml)+'</bdi></small>':'')+(away?' <abbr class="ab tc-ma-lost" title="'+esc('Hier ist der Aleppo-Kodex verloren; MAM folgt anderen tiberischen Handschriften.')+'">*</abbr>':'')+'</div><small class="tal-cite" tabindex="0" title="'+esc('Aleppo-Text: Miqra according to the Masorah (he.wikisource), CACCHT, CC BY-SA 4.0; Vergleich mit Westminster/OSHB maschinell')+'">'+esc('Aleppo-Text (MAM) gegen Leningradensis')+', '+raw(ref)+'</small></article>';
        const lz=k==='k'||k==='w'?{f:'MA',w:'MA',op:e<0?'add':ma?'var':'om',rd:ma}:k==='p'?{f:'MA',w:'MA',op:'orth',rd:ma}:null;
        out.set(id,{anchor,displayRef:ref,rows:[row],html,lz,cmp:k==='k'?ma:null,cmpWitness:k==='k'?'MA':null});
      });
    }
    return [...out.values()];
  }
  const credit=()=>'<p class="tc-credit">'+esc('MA: Aleppo-Text nach „Miqra according to the Masorah“ (he.wikisource, CC BY-SA 4.0; Text-Fabric: CACCHT), maschinell mit dem Leningradensis (Westminster/OSHB) verglichen. Ketiv/Qere, Qamets qatan, Paseq, Meteg und die Vokalisierung des Gottesnamens zählen nicht. * = Aleppo-Kodex an dieser Stelle verloren, MAM folgt anderen tiberischen Handschriften.')+'</p>';
  return {available,load,entries,credit};
}
return {create,BOOKS};
})();
