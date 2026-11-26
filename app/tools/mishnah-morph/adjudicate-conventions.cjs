'use strict';
// A separate, conservative assessment of selected annotation conventions.
// Never changes strict comparison results or imports reference annotations.
const {compare,segments,featureCompatible}=require('./compare.cjs');
const nounUses=new Set(['2:5:6','2:5:29','2:6:3','2:8:8','5:1:8','5:3:25']);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7]/g,'');
// Explicitly inspected lexical equivalences, never a global spelling normalizer.
const aliases=[
 {places:['1:1:13'],from:'אשמורה',to:'אשמרת',source:'Jastrow 3641: אשמורה / אשמורת; directly cites Berakhot 1:1'},
 {places:['3:1:9','3:3:8'],from:'תפלין',to:'תפילין',source:'Jastrow 24200, 24302, 24310: full/defective spellings and Hebrew adaptation of the same phylactery term'},
 {places:['6:7:4'],from:'תחלה',to:'תחילה',source:'Jastrow 817 and 876: תחלה / תחילה'},
 {places:['6:8:4'],from:'רמון',to:'רימון',source:'Jastrow 16173: pomegranate; plene source spelling retained'},
 {places:['5:4:22'],from:'הבטחה',to:'אבטחה',source:'Ma’agarim, Berakhot 5:4, displayed combined entry הבטחה, אבטחה; live inspection 2026-11-26'},
 {places:['5:5:22'],from:'דוסא',to:'דוסה',source:'Ma’agarim, Berakhot 5:5, surface דוסה under proper-name entry דוסא; live inspection 2026-11-26'},
 {places:['4:6:7'],from:'אסדה',to:'אסדא',source:'Krauss, Lehnwörter II, entry 1048: אסדא; Kaufmann אסדה variant explicitly cited'}
];
function assess(D,reference){
 const strict=compare(D,reference),items=[];
 for(const row of strict){
  if(row.status!=='different-or-unresolved'||!row.reference.parts)continue;
  const parts=row.reference.parts,ids=D.sources[D.title].chapters[+row.ref.split(':')[0]-1][+row.ref.split(':')[1]-1];
  const form=D.forms[ids[row.token-1]];
  for(const a of form.analyses){
   const actual=segments(a);let rule=null,changes=0;
   const mapped=parts.map(p=>{
    if(p.unreadable)return {...p};
    const alias=aliases.find(x=>x.places.includes(`${row.ref}:${row.token}`)&&norm(p.lemma)===x.from&&actual.some(s=>s.lemma===x.to));
    if(alias){changes++;rule='citation-lemma-variant';return {...p,lemma:alias.to};}
    if(p.type==='D'&&norm(p.lemma)==='אין'&&actual.some(s=>s.type==='T'&&s.subtype==='n'&&s.lemma==='אין')){
     changes++;rule='negative-particle-class';return {...p,type:'T',subtype:'n'};
    }
    if(nounUses.has(`${row.ref}:${row.token}`)&&p.type==='N'&&p.subtype==='c'){
     const s=actual.find(s=>s.type==='A'&&['a','o'].includes(s.subtype)&&s.lemma===norm(p.lemma));
     if(s){changes++;rule='adjective-noun-class';return {...p,type:'A',subtype:s.subtype};}
    }
    return {...p};
   });
   if(!changes||!featureCompatible(a,mapped))continue;
   items.push({ref:row.ref,token:row.token,word:form.word,rule,
    scope:'Specified readable features only; no suffix confirmation or fully reviewed token status',
    unreadableReferenceFeatures:parts.some(p=>p.unreadable)});break;
  }
 }
 return {scope:'Selected grammar-supported classification conventions in the strict differences',
  strictDifferences:strict.filter(r=>r.status==='different-or-unresolved').length,
  conventionAccounted:items.length,
  otherStrictDifferences:strict.filter(r=>r.status==='different-or-unresolved').length-items.length,
  isAccuracyScore:false,referenceFileDistributed:false,
  rules:{
   'negative-particle-class':{reason:'אין is retained as a negative particle rather than the reference adverb label.',sources:['Pérez Fernández, Unit 1.6, p.19 (PDF39)']},
   'adjective-noun-class':{reason:'Adjectival/ordinal form versus noun use is an annotation-level distinction at the explicitly selected positions; other supplied features must still match.',sources:['Segal §374(viii), p.181 (PDF224)','Pérez Fernández, Unit 13.2–4, pp.80–81 (PDF100–101)','Jastrow, חסיד, entry 9536; Levy, סרבן, entry 13322']},
   'citation-lemma-variant':{reason:'A specifically documented headword or spelling variant at an explicitly selected position; all other supplied features still have to match.',sources:aliases.map(x=>x.source)}
  },items};
}
module.exports={assess};
if(require.main===module){
 const fs=require('node:fs');
 if(!process.argv[2])throw Error('Usage: node adjudicate-conventions.cjs /path/to/private-reference.json');
 const D=require('../../mishnah-morph-data'),reference=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 process.stdout.write(JSON.stringify(assess(D,reference),null,2)+'\n');
}
