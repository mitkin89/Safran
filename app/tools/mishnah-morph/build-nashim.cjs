'use strict';
// Form-level candidates only. No Be'eri pointing is transferred into Kaufmann.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../../mishnah-morph'),B=require('./build.cjs');
const root=path.resolve(__dirname,'../..');
function main(){
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'mishnah-textcrit-catalog.js'),'utf8'),ctx);
 const titles=Object.entries(ctx.window.MISHNAH_TEXTCRIT_CATALOG).filter(([,x])=>x.coordinate[0]===3).map(([t])=>t);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'bundled/manifest.json'))),forms=[],sources={},coverage=[],byKey=new Map();
 // Reuse form-level rabbinic lexical decisions; never occurrence-specific reviews.
 B.rules['rabbinic-dictionary']={label:'Rabbinischer lexikalischer Kandidat',refs:['Jastrow, Levy und Krauss; konkrete Artikel in zeraim-dictionary-decisions.json. Keine Kontextprüfung für Naschim.']};
 B.rules['nashim-form-lexicon']={label:'Grammatischer und lexikalischer Formkandidat',refs:['Bestehende redaktionelle Mischna-Grundformen aus zeraim-lexicon.json; keine positionsbezogene Bestätigung in Naschim.']};
 B.addCandidates(require('./zeraim-dictionary-decisions.json'));
 B.addCandidates(require('./zeraim-lexicon.json').map(([word,lemma,morph])=>({word,analyses:[{lemma,morph,rules:['nashim-form-lexicon'],method:'lexicon'}]})));
 for(const title of titles){
  const entry=manifest.items.find(x=>x.title===title&&x.versionTitle===B.version);if(!entry)throw Error('Missing analysis alignment source '+title);
  const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel))),statuses={candidate:0,ambiguous:0,unresolved:0};let words=0;
  const chapters=doc.text.map(ch=>ch.map(html=>M.tokens(B.main(html)).map(t=>{
   let id=byKey.get(t.key);if(id==null){const analyses=B.analyze(t.word),status=analyses.length>1?'ambiguous':analyses.length?'candidate':'unresolved';id=forms.length;forms.push({word:t.word,key:t.key,status,analyses,hints:analyses.length?['Formkandidat; kein Accordance-Tag und keine Prüfung des Naschim-Satzkontextes.']:['Grundform und Wortart bleiben offen.'],count:0});byKey.set(t.key,id);}
   forms[id].count++;statuses[forms[id].status]++;words++;return id;
  })));
  sources[title]={rel:entry.rel,textHash:B.hash(doc.text),chapters};coverage.push({title,words,statuses});
 }
 const data={version:1,title:'Seder Nashim',edition:B.version,rules:B.rules,sources,forms,coverage,provenance:{method:'Form-level grammar and rabbinic lexical candidates; no Nashim occurrence review',pointing:'Reading-edition words serve only as source-bound analysis positions. No Beeri pointing is transferred into Kaufmann.',lexicalPolicy:'No biblical dictionaries or biblical-form imports. Existing Hebrew Bavli lexical hints and explicit Mishnah grammar remain unconfirmed candidates.',accordance:'No Accordance morphology tags supplied; surface-pointed texts are not morphology tags.'}};
 fs.writeFileSync(path.join(root,'mishnah-nashim-data.js'),'// Generated form-level candidates, not reviewed Naschim annotations.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.MISHNAH_NASHIM_DATA=D;})('+JSON.stringify(data)+');\n');
 console.log(JSON.stringify(coverage));return data;
}
module.exports={main};if(require.main===module)main();
