// Display boundaries from source accents; never infer vowels, words or readings.
// Sources: tanach.us/Pages/Coding.html; Gesenius–Kautzsch–Cowley §15.
(function(root){
'use strict';
function boundaries(words,book,mode='all',chapter=0,verse=0){
 const jobPoetry=chapter?((chapter>3&&chapter<42&&!(chapter===32&&verse<6))||(chapter===3&&verse>=3)||(chapter===42&&verse<=6)):words.some(w=>/[\u059d\u05ab-\u05ae]/.test(w));
 const poetic=book==='Psalms'||book==='Proverbs'||book==='Job'&&jobPoetry;
 // Job's prose frame uses the ordinary accent system; detect the actual verse.
 const out=words.map(w=>/\u0591/.test(w)?'Atnach':'');
 if(!['major','all'].includes(mode))return words.map(()=> '');
 let ole=false;
 words.forEach((w,i)=>{
  if(poetic){
   if(/[\u0597\u05a1\u05ad\u05ae]/.test(w))out[i]='Trennender Taam';
   if(/\u05ab/.test(w))ole=true;
   if(ole&&/\u05a5/.test(w)){out[i]='Ole we-Jored';ole=false;}
   // Shalshelet, Azla and Mahpakh are disjunctive only with the stroke.
   if(/[\u0593\u05a4\u05a8]/.test(w)&&/\u05c0/.test(w))out[i]='Legarmeh';
  }else{
   if(/[\u0592-\u0597\u0599-\u059c\u059e-\u05a1\u05ae]/.test(w))out[i]='Trennender Taam';
   if(/\u05a3/.test(w)&&/\u05c0/.test(w))out[i]='Legarmeh';
  }
  if(/\u0591/.test(w))out[i]='Atnach';
  // Tipeha can be a secondary accent on a maqaf member (Me'ayla).
  if(/[־-]\s*$/.test(w))out[i]='';
 });
 return mode==='major'?out.map(v=>['Atnach','Ole we-Jored'].includes(v)?v:''):out;
}
const api={boundaries};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Taamim=api;
})(typeof window!=='undefined'?window:globalThis);
