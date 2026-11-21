// Exact-edition Peshitta links: automatic proposals, never confirmed variants.
(function(global){
'use strict';
function book(data,title){return data?.version===2?data.books?.[title]||null:data?.book===title?data:null;}
function prepare(data,he,sy){return !!(data?.version===1&&he?.textHash===data.source.he.textHash&&sy?.textHash===data.source.translation.textHash);}
function verse(data,ref,heWords,syWords){
 const r=data?.verses?.[ref];if(!r||r.he.length!==heWords.length||r.he.some((w,i)=>w!==heWords[i])||syWords&&(r.sy.length!==syWords.length||r.sy.some((w,i)=>w!==syWords[i])))return null;
 if(r.links.length!==r.sy.length||r.links.some(ix=>!Array.isArray(ix)||ix.some(i=>!Number.isInteger(i)||i<1||i>r.he.length)))return null;
 return r;
}
function segments(data,ref,cell,doc){
 const r=verse(data,ref,[...cell.querySelectorAll('.w')].map(w=>w.textContent));if(!r)return null;
 const [c,v]=ref.split(':').map(Number),html=doc.text[c-1]?.[v-1]||'',ids=r.ids||[...html.matchAll(/data-si="(\d+)"/g)].map(m=>m[1]);
 if(ids.length!==r.sy.length||r.refs&&r.refs.length!==r.sy.length)return null;
 if(ids.some((id,i)=>{const word=doc.syriacMorphology?.words?.[id];return !word||word[0]!==r.sy[i]||(r.refs?.[i]||ref)!==word[2]+':'+word[3];}))return null;
 return r.sy.map((w,i)=>[r.links[i],w,null,{id:ids[i],rel:doc.entry.rel,ref:r.refs?.[i]||ref,mtRef:ref,origin:r.origin||'patracosy',reviewed:!!r.review,reviewedBy:r.review?.by||''}]);
}
function wordHtml(s,meta,esc){return `<span class="syw" data-si="${esc(meta.id)}" data-sy-rel="${esc(meta.rel)}" data-sy-ref="${esc(meta.ref)}" lang="syr" dir="rtl">${esc(s)}</span><small class="ps-translit" lang="he" dir="rtl">${esc(global.SyriacMorph.hebrew(s))}</small>`;}
// Bücher außerhalb der Tora liegen je Buch in peshitta-alignment/<Buch>.js (von tools/peshitta/alignment/tanakh.py erzeugt).
const PENTATEUCH=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy'];
// Bücher mit eingeordneten Lesarten (peshitta-readings/<Buch>.js, tools/peshitta/readings/build.py)
const READINGS=/*READINGS*/["Genesis"]/*END*/;
const BOOKS=/*BOOKS*/["Amos", "Daniel", "Ecclesiastes", "Esther", "Ezekiel", "Ezra", "Habakkuk", "Haggai", "Hosea", "II Chronicles", "II Kings", "II Samuel", "I Chronicles", "I Kings", "I Samuel", "Isaiah", "Jeremiah", "Job", "Joel", "Jonah", "Joshua", "Judges", "Lamentations", "Malachi", "Micah", "Nahum", "Nehemiah", "Obadiah", "Proverbs", "Psalms", "Ruth", "Song of Songs", "Zechariah", "Zephaniah"]/*END*/;
function has(title){return PENTATEUCH.includes(title)||BOOKS.includes(title);}
function file(title){return PENTATEUCH.includes(title)?'peshitta-alignment-data.js':'peshitta-alignment/'+String(title).replace(/ /g,'_')+'.js';}
const api={book,prepare,verse,segments,wordHtml,has,file,PENTATEUCH,BOOKS,READINGS};if(typeof module==='object'&&module.exports)module.exports=api;else global.PeshittaAlignment=api;
})(typeof window==='object'?window:globalThis);
