(function(root){
 'use strict';
 // Editorial lexical glosses, not translations assigned to individual tokens.
 // Biblical dictionary fallback is explicitly labelled: meanings may differ in RH.
 const own={
  'אותו':['jener; derselbe','that; the same'],'אותה':['jene; dieselbe','that; the same'],
  'רבי':['Rabbi; Lehrer','Rabbi; teacher'],'רבן':['Rabban (Ehrentitel)','Rabban (honorific title)'],
  'פלל':['beten; ein Gebet sprechen','pray; say a prayer'],'ברך':['segnen; einen Segensspruch sprechen','bless; recite a blessing'],
  'קרא':['lesen; vorlesen; rufen','read; recite; call'],'שמע':['hören; vernehmen','hear; listen'],
  'תפלה':['Gebet','prayer'],'תפילה':['Gebet','prayer'],'תפילין':['Tefillin; Gebetsriemen','tefillin; phylacteries'],
  'ברכה':['Segen; Segensspruch','blessing; benediction'],'משנה':['Mischna; Lehrsatz','Mishnah; teaching'],
  'מלכות':['Königtum; Herrschaft','kingship; sovereignty'],'חצות':['Mitternacht; Mittag','midnight; midday'],
  'קריאה':['Lesung; Vorlesen','reading; recitation'],'כיצד':['wie?; auf welche Weise?','how?; in what manner?'],
  'רשאי':['berechtigt; befugt','permitted; entitled'],'כדי':['damit; um zu; ausreichend','in order to; sufficient'],
  'בלבד':['allein; nur','only; alone'],'למפרע':['rückwärts; in umgekehrter Reihenfolge','backwards; in reverse order'],
  'מעין':['nach Art von; in verkürzter Form','in the manner of; in abbreviated form'],
  'יכול':['können; imstande sein','be able; can'],'יכל':['können; imstande sein','be able; can'],
  'אלא':['sondern; außer; nur','but; except; only'],'אפילו':['sogar; selbst wenn','even; even if'],
  'לאו':['nein; nicht','no; not'],'אין':['nicht; es gibt nicht','not; there is no'],'יש':['es gibt; vorhanden sein','there is; exist'],
  'הרי':['siehe; nun; also','behold; now; thus'],'נתר':['lösen; freigeben','release; permit'],
  'דקדק':['genau sein; genau aussprechen','be precise; articulate carefully'],'הרהר':['nachdenken; im Sinn sprechen','reflect; recite mentally'],
  'מים':['Wasser','water'],'כהן':['Priester','priest'],'מוסף':['Zusatz; zusätzliches Gebet','addition; additional prayer'],
  'מזוזה':['Mesusa; Türpfosten','mezuzah; doorpost'],'פרפרת':['Beilage; Vor- oder Nachspeise','accompaniment; appetizer or dessert'],
  'טפל':['untergeordnet; nebensächlich','secondary; subordinate'],'מליח':['gesalzen; gesalzene Speise','salted; salted food'],
  'מגמר':['Räucherwerk','incense'],'שגר':['geläufig sein; fließen','be fluent; flow'],
  'פטר':['befreien; entbinden','exempt; release'],'צריך':['nötig haben; erforderlich','need; necessary'],
  'חייב':['verpflichtet; schuldig','obligated; liable'],'סרבן':['zögernd; sich weigernd','reluctant; refusing'],
  'שליח':['Gesandter; Beauftragter','messenger; representative'],'שלוח':['Gesandter; Beauftragter','messenger; representative']
 };
 const key=s=>String(s||'').normalize('NFD').replace(/[^א-ת]/g,'');
 const indexes=new WeakMap();
 function lookup(analysis,dictionary={},lang='de'){
  const lemma=String(analysis?.lemma||'').split('/').at(-1),k=key(lemma),codes=String(analysis?.morph||'');
  if(!k)return null;
  if(k==='שמע'&&/Ncms/.test(codes))return {text:lang==='de'?'Schema-Gebet':'Shema prayer',source:'editorial',alternatives:[]};
  if(own[k])return {text:own[k][lang==='de'?0:1],source:'editorial',alternatives:[]};
  let index=indexes.get(dictionary);if(!index){index=new Map();for(const item of Object.values(dictionary)){if(!Array.isArray(item)||!item[0])continue;const head=key(item[0]);if(!index.has(head))index.set(head,[]);index.get(head).push(item);}indexes.set(dictionary,index);}
  const entries=index.get(k)||[],texts=[...new Set(entries.map(x=>x[lang==='de'?2:1]).filter(Boolean))];
  return texts.length?{text:texts.join('; '),source:'biblical',alternatives:texts}:null;
 }
 const api={lookup};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MishnahMeanings=api;
})(typeof window==='undefined'?globalThis:window);
