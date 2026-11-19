// ETCBC Peshitta word records; original source IDs and separate morpheme analyses.
(function(global){
'use strict';
function at(doc,id,form,path,label){
 const D=doc?.syriacMorphology,r=D?.words?.[id];
 if(D?.version!==1||!doc.textHash||D.textHash!==doc.textHash||!r||r[0]!==form||!Array.isArray(path)||path.length!==1||path[0]+1!==r[2]||String(label)!==String(r[3]))return null;
 return {form:r[0],chapter:r[2],verse:r[3],id:String(id),parts:r[1].map((n,j)=>({...Object.fromEntries(D.fields.map((f,i)=>[f,D.analyses[n][i]])),sourceId:r[4]?.[j]}))};
}
const pos={pron:'Pronomen',subs:'Nomen',nmpr:'Eigenname',verb:'Verb',adjv:'Adjektiv',advb:'Adverb',prep:'Präposition',conj:'Konjunktion',prps:'Personalpronomen',prde:'Demonstrativpronomen',prin:'Interrogativpronomen',intj:'Interjektion',inrg:'Interrogativpartikel',nega:'Negationspartikel',art:'Artikel'};
const values={m:'m.',f:'f.',c:'gemeinsam',sg:'Sg.',pl:'Pl.',du:'Du.',sing:'Sg.',plur:'Pl.',first:'1. Person',second:'2. Person',third:'3. Person',p1:'1. Person',p2:'2. Person',p3:'3. Person',abs:'Status absolutus',cst:'Status constructus',emph:'Status emphaticus',em:'Status emphaticus',st:'Status emphaticus',perf:'Perfekt',impf:'Imperfekt',impv:'Imperativ',infc:'Infinitiv',inf:'Infinitiv',ptca:'Partizip aktiv',ptcp:'Partizip passiv',act:'Aktiv',pass:'Passiv'};
function describe(p,t=s=>s){
 const field={vs:{pe:'Peʿal',pa:'Paʿel',af:'Afʿel'},vt:{pf:'Perfekt',ipf:'Imperfekt',imp:'Imperativ',inf:'Infinitiv',ptc:'Partizip'},vo:{act:'Aktiv',pas:'Passiv'},st:{abs:'Status absolutus',cst:'Status constructus',emph:'Status emphaticus'}};
 return {pos:t(pos[p.sp]||p.sp||''),info:['vs','vt','ps','gn','nu','vo','st'].filter(k=>p[k]&&!['NA','n/a','unknown'].includes(p[k])).map(k=>t(field[k]?.[p[k]]||(!field[k]&&values[p[k]])||(k+': '+p[k]))).join(' · ')};
}
const alphabet={'>':'ܐ',B:'ܒ',G:'ܓ',D:'ܕ',H:'ܗ',W:'ܘ',Z:'ܙ',X:'ܚ',V:'ܛ',J:'ܝ',K:'ܟ',L:'ܠ',M:'ܡ',N:'ܢ',S:'ܣ','<':'ܥ',P:'ܦ',Y:'ܨ',Q:'ܩ',R:'ܪ',C:'ܫ',T:'ܬ'};
function lemma(s){return [...String(s||'')].map(c=>alphabet[c]||'').join('');}
// Consonantal Hebrew transliteration. Syriac pointing (including seyame) has no inferred Hebrew vowels.
const hebrewLetters=Object.fromEntries([..."ܐܒܓܕܗܘܙܚܛܝܟܠܡܢܣܥܦܨܩܪܫܬ"].map((c,i)=>[c,[..."אבגדהוזחטיכלמנסעפצקרשת"][i]]));
function hebrew(s){
 const finals={'כ':'ך','מ':'ם','נ':'ן','פ':'ף','צ':'ץ'};
 return [...String(s||'').normalize('NFC')].map(c=>hebrewLetters[c]||(/\p{M}/u.test(c)?'':c)).join('').replace(/[כמנפצ](?=$|[^א-ת])/g,c=>finals[c]);
}
const api={at,describe,lemma,hebrew};if(typeof module==='object'&&module.exports)module.exports=api;else global.SyriacMorph=api;
})(typeof window==='object'?window:globalThis);
