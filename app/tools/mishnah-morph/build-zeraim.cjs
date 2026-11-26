'use strict';
// Independent candidate corpus. Berakhot's reviewed occurrence corrections
// remain confined to its original source positions.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../../mishnah-morph'),B=require('./build.cjs'),ber=require('../../mishnah-morph-data');
const root=path.resolve(__dirname,'../..'),manifest=require('../../bundled/manifest.json');
B.rules['biblical-form']={label:'Gleich vokalisierte biblische Form als Analysekandidat',refs:['Open Scriptures Hebrew Bible (OSHB), CC BY 4.0; vollständige Wortsegmente; keine Bestätigung des mischnahebräischen Kontexts']};
B.rules['zeraim-lexical']={label:'Lexikalischer Vorschlag für Seder Seraim',refs:['Safran: redaktionelle Grundformen und Flexionskandidaten; Segal §§281, 367–383; Pérez Fernández Units 10–13; Kontextprüfung bleibt erforderlich','Jastrow (Safran d895bc1c727b): ausgewählte Lemmata und Genusangaben, siehe zeraim-review.md','Ma’agarim: gezielte Lemma-/Stammprüfungen, siehe zeraim-maagarim-review.json; keine vollständige Kontextvalidierung']};
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'oshb-lemmas.js'),'utf8'),sandbox);
const dictionary=sandbox.window.OSHB_LEMMAS,prefixes={b:'ב',k:'כ',l:'ל',m:'מן',c:'ו',d:'ה',s:'ש',i:'ה'};
const biblical=new Map();
function collect(value){if(Array.isArray(value)){value.forEach(collect);return;}if(typeof value!=='string')return;
 for(const m of value.matchAll(/<span class="w" data-l="([^"]*)" data-m="([^"]*)">([^<]*)<\/span>/g)){
  const [_,lemmas,morph,word]=m;if(!morph.startsWith('H')||/V.[qw]/.test(morph))continue;
  const ls=lemmas.split('/').map(l=>prefixes[l]||dictionary[l.replace(/\s+[a-z]$/,'')]?.[0]);if(ls.some(l=>!l))continue;
  const a={lemma:ls.join('/'),morph,rules:['biblical-form'],method:'biblical-form',note:'Gleich vokalisierte OSHB-Form; Bedeutung und Flexion im Mischna-Kontext sind nicht damit bestätigt.'};
  const key=M.normalize(word),list=biblical.get(key)||[];if(!list.some(x=>x.lemma===a.lemma&&x.morph===a.morph))list.push(a);biblical.set(key,list);
 }
}
for(const e of manifest.items.filter(e=>e.versionTitle==='Westminster Leningrad Codex (OSHB, mit Morphologie)'))collect(JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel))).text);
// Only use biblical hints for forms not already covered by the RH lexicon.
B.addCandidates([...biblical].filter(([word])=>!B.analyze(word).length).map(([word,analyses])=>({word,analyses})));
B.rules['rabbinic-dictionary']={label:'Rabbinische Wörterbücher: redaktionell ausgewerteter Beleg',refs:['Jastrow, Levy und Krauss in Safran; konkrete Artikel und Entscheidungen in zeraim-dictionary-decisions.json; Flexion und Satzkontext getrennt beurteilt']};
const reviewedDictionary=require('./zeraim-dictionary-decisions.json');
B.addCandidates(reviewedDictionary);
const editorial=require('./zeraim-lexicon.json');
B.addCandidates(editorial.map(([word,lemma,morph])=>({word,analyses:[{lemma,morph,rules:['zeraim-lexical'],method:'lexicon'}]})));
B.rules['context-review']={label:'Im Satzkontext begründeter Analysekandidat',refs:['Jastrow: konkrete Artikel in zeraim-context-review-1.json','Segal §§67–78, 132–134 (S.64–65), 281, 337–338, 374–383; Pérez Fernández Units 4, 11, 13, 16, 19; Satzfunktion getrennt von der Wortform beurteilt']};
B.rules['krauss-card']={label:'Wortkarte aus Krauss mit geprüftem Mischna-Kontext',refs:['Krauss, Griechische und lateinische Lehnwörter, Teil II; konkrete Artikel und Positionen in krauss-cards-1.json','Wortart und Flexion im Mischna-Kontext bestimmt; Herkunftsangaben nach Krauss, keine automatische Wortgleichsetzung']};
const contextual=[...require('./zeraim-context-review-1.json'),...require('./krauss-cards-1.json')],contexts=new Map();
for(const r of contextual){const k=r.title+'/'+r.ref+'/'+r.token;if(!r.analyses?.length||r.analyses.some(a=>!a.lemma||!a.morph?.startsWith('H')||!a.rules?.length||a.rules.some(id=>!B.rules[id])))throw Error('Invalid context analysis');if(contexts.has(k)||r.title==='Mishnah Berakhot')throw Error('Invalid Seraim context review position');contexts.set(k,r);}
const seenContexts=new Set();
const forms=structuredClone(ber.forms),sources=structuredClone(ber.sources),byKey=new Map(),coverage=[];
for(let i=0;i<forms.length;i++)if(!byKey.has(forms[i].key))byKey.set(forms[i].key,i);
for(const title of M.titles){
 const e=manifest.items.find(e=>e.title===title&&e.versionTitle===B.version);if(!e)throw Error('Missing Kaufmann source '+title);
 const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel))),statuses={candidate:0,ambiguous:0,partial:0,unresolved:0};let words=0;
 if(title!=='Mishnah Berakhot'){
  const chapters=doc.text.map((ch,c)=>ch.map((html,m)=>M.tokens(B.main(html)).map((t,i)=>{
   // Never transfer a Berakhot context-specific analysis by its spelling.
   const position=title+'/'+`${c+1}:${m+1}`+'/'+(i+1),correction=contexts.get(position);
   if(correction){if(correction.sourceHash!==B.hash(doc.text)||M.normalize(correction.word)!==t.key)throw Error('Seraim context correction no longer matches source '+position);seenContexts.add(position);}
   const formKey='zeraim:'+t.key+(correction?'|'+JSON.stringify(correction.analyses):'');
   let id=byKey.get(formKey);
   if(id==null){const analyses=correction?correction.analyses:B.analyze(t.word),hints=analyses.length?[]:['Grundform und Flexion bleiben offen; Wörterbuch und Quellenvergleich erforderlich.'];
    id=forms.length;forms.push({word:t.word,key:t.key,status:analyses.length>1?'ambiguous':analyses.length?'candidate':'unresolved',analyses,hints,count:0});byKey.set(formKey,id);
   }forms[id].count++;return id;
  })));
  sources[title]={rel:e.rel,textHash:B.hash(doc.text),chapters};
 }
 for(const ch of sources[title].chapters)for(const unit of ch)for(const id of unit){words++;statuses[forms[id].status]++;}
 coverage.push({title,chapters:doc.text.length,mishnayot:doc.text.reduce((n,ch)=>n+ch.length,0),words,statuses});
}
if(seenContexts.size!==contextual.length)throw Error('Seraim context review contains unmatched positions');
const D={version:1,title:'Seder Zeraim',edition:B.version,rules:B.rules,sources,forms,coverage,provenance:{method:'Form-level candidates; no corpus-wide human validation',biblicalHints:'OSHB CC BY 4.0, https://github.com/openscriptures/morphhb; only exact pointed surface matches with full segments; no sequential verbal forms',berakhot:'Original source-bound Berakhot analyses preserved; occurrence corrections never generalized',contextReview:{positions:contextual.length,files:['zeraim-context-review-1.json','krauss-cards-1.json'],status:'Source-bound editorial candidates; not externally validated'},maagarim:'Targeted uncertainty checks recorded separately; not a full corpus comparison',accordance:'New tractates not yet compared'}};
fs.writeFileSync(path.join(root,'mishnah-zeraim-data.js'),'// Generated by tools/mishnah-morph/build-zeraim.cjs; candidates, not reviewed annotations.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.MISHNAH_ZERAIM_DATA=D;})('+JSON.stringify(D)+');\n');
fs.writeFileSync(path.join(__dirname,'zeraim-coverage.json'),JSON.stringify(coverage,null,2)+'\n');
// Group unresolved and competing analyses for targeted source checks.
const uncertain=new Map();
for(const [title,source]of Object.entries(sources))source.chapters.forEach((ch,c)=>ch.forEach((unit,m)=>unit.forEach((id,t)=>{const f=forms[id];if(['unresolved','partial','ambiguous'].includes(f.status)){
 const key=f.key+'|'+f.status+'|'+JSON.stringify(f.analyses),row=uncertain.get(key)||{word:f.word,key:f.key,status:f.status,analyses:f.analyses,count:0,positions:[]};
 row.count++;row.positions.push({title,ref:`${c+1}:${m+1}`,token:t+1});uncertain.set(key,row);
}})));
fs.writeFileSync(path.join(__dirname,'zeraim-uncertain.json'),JSON.stringify([...uncertain.values()].sort((a,b)=>b.count-a.count),null,2)+'\n');
console.log(JSON.stringify(coverage));
