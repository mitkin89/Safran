const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../app'),GC=require('../app/greek-corpus'),MM=require('../app/mishnah-morph'),crypto=require('node:crypto');
const load=file=>{const c={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),c);return Object.values(c.window)[0];};
const manual=load('greek-corpus-manual.js'),manifest=require('../app/bundled/manifest.json').items;
const out={works:[],places:[],greek:{},hebrew:{},coverage:{}};
function add(lang,lemma,form,morph,loc,token,status){
 const lex=out[lang][lemma]||(out[lang][lemma]=new Map()),key=JSON.stringify([form,morph,status]);
 if(!lex.has(key))lex.set(key,[form,morph,[],status]);lex.get(key)[2].push(loc,token);
}
const sources=require('../app/bundled/greek-corpus-sources.json').works;
for(const source of sources){
 const entry=manifest.find(e=>e.rel.includes('GreekCorpus-'+source.id+'/'));
 if(!entry)throw Error('Missing edition '+source.title);
 const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel))),D=doc.greekMorphology;
 if(crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex')!==D.textHash)throw Error('Greek text hash mismatch '+entry.title);
 const wi=out.works.push([entry.title,entry.versionTitle,entry.rel,source.author==='Philo'?'Philo':'Josephus'])-1;
 for(const [address,loci0]of Object.entries(D.locator)){
  const adr=JSON.parse(address),loci=Array.isArray(loci0)?loci0:[loci0],loc=out.places.push([wi,adr.slice(0,-1),String(adr.at(-1))])-1;
  let token=0;
  for(const locus of loci){
   const base=GC.entries(D,locus);if(!base)continue;
   // Same source/token-boundary checks as the reader, including manual overrides.
   const records=GC.at({...doc,textHash:D.textHash},adr.slice(0,-1),String(adr.at(-1)),loci.flatMap(l=>GC.entries(D,l)||[]).map(r=>r.form),manual);
   if(records){for(const r of records.records){if(r.lemma&&r.tag)add('greek',r.lemma.normalize('NFC'),r.form,GC.key(r.tag),loc,token,r.analysis==='manual'?'manual':'automatic');token++;}break;}
   for(const r of base){if(r.lemma&&r.tag)add('greek',r.lemma.normalize('NFC'),r.form,GC.key(r.tag),loc,token,'automatic');token++;}
  }
 }
}
const done=new Set();
for(const file of ['mishnah-morph-data.js','mishnah-zeraim-data.js']){
 const D=load(file);
 for(const [title,source] of Object.entries(D.sources)){
  if(done.has(title))continue;done.add(title);
  const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',source.rel))),wi=out.works.push([title,doc.versionTitle,source.rel,'Mishnah'])-1;
  source.chapters.forEach((chapter,c)=>chapter.forEach((ids,v)=>{
   const loc=out.places.push([wi,[c],String(v+1)])-1;
   ids.forEach((id,token)=>{const f=D.forms[id];const seen=new Set();for(const a of f.analyses){const lemma=MM.headLemma(a),parts=a.morph.slice(1).split('/'),head=parts.find(p=>/^[NVA]/.test(p))||parts.find(p=>/^[PD]/.test(p))||parts[0],morph=a.morph[0]+head;if(!lemma||!head)continue;const key=lemma+'|'+morph;if(seen.has(key))continue;seen.add(key);add('hebrew',lemma,f.word,morph,loc,token,f.status==='reviewed'?'reviewed':'candidate');}});
  }));
 }
}
for(const lang of ['greek','hebrew'])for(const key of Object.keys(out[lang]))out[lang][key]=[...out[lang][key].values()];
out.coverage.mishnah=[...done];
fs.writeFileSync(path.join(root,'word-card-corpora-data.js'),'window.WORD_CARD_CORPORA='+JSON.stringify(out)+';\n');
console.log(out.works.length+' works; '+Object.keys(out.greek).length+' Greek, '+Object.keys(out.hebrew).length+' Mishnaic lemmas');
