'use strict';
// Read-only comparison: source-bound screenshot facts never become draft inputs.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {segments}=require('./compare.cjs');
const M=require('../../mishnah-morph');
const ROOT=path.resolve(__dirname,'../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const plain=s=>String(s||'').normalize('NFD').replace(/[^א-ת]/gu,'');
const stems={qal:'q',nif:'N',pi:'p',pual:'P',pul:'P',hif:'h',hof:'H',htpl:'t',hitp:'t',nitp:'D',ntpal:'D',plpl:'l'};
function parseHead(raw){
 const words=String(raw||'').trim().split(/[\s;|]+/),features={},unsupported=[];
 // Prefix tags are often printed after the head in a right-to-left row.
 // They are explicitly outside this conservative head-only comparison.
 const skip=new Set(['prp','art','cnj','rel','ng','prpArt']);
 const heads=words.filter(w=>!skip.has(w));
 if(heads.includes('cm'))features.type='N';
 if(heads.includes('prop')){features.type='N';features.subtype='p';}
 if(heads.includes('indp')){features.type='P';features.subtype='p';}
 if(heads.includes('adv'))features.type='D';
 for(const w of heads){
  if(stems[w]){features.type='V';features.stem=stems[w];}
  else if(w==='ms')features.gender='m';else if(w==='fm')features.gender='f';else if(w==='com')features.gender='c';
  // bth denotes the lexical range, not the contextual gender of this token.
  else if(w==='sg')features.number='s';else if(w==='pl')features.number='p';else if(w==='du')features.number='d';
  else if(w==='cnst')features.state='c';else if(w==='prf')features.form='p';else if(w==='imprf')features.form='i';else if(w==='impr')features.form='v';
  else if(w==='pasP')features.form='s';else if(w==='infC')features.form='c';else if(w==='infA')features.form='a';
  else if(w==='prt')features.form='participle';else if(/^[123]$/.test(w))features.person=w;
  else if(!['cm','prop','indp','adv','bth','abs','crd','ord','intr','gent',''].includes(w))unsupported.push(w);
 }
 if(features.type!=='V')delete features.form;
 // Pure function words have no lexical head; compare only a sole clear tag.
 if(!heads.length&&words.length===1){const only={prp:{type:'R'},art:{type:'T',subtype:'d'},cnj:{type:'C'},rel:{type:'T',subtype:'r'},ng:{type:'T',subtype:'n'}};Object.assign(features,only[words[0]]||{});}
 return {features,unsupported:[...new Set(unsupported)],scope:'lexical-head-visible-features-only; prefixes, suffixes, lexical gender range and numeral conventions excluded'};
}
function normalizeObservation(o,document){
 const image=typeof o.image==='string'?(Array.isArray(document.images)?document.images.find(i=>path.basename(i.file||i.name||'')===o.image):document.images?.[o.image])||{file:o.image}:o.image||o.observation||{};
 return {title:o.title||document.title,ref:o.ref,textHash:o.targetTextHash||o.sourceTextHash||document.targetSourceTextHash||document.sourceTextHash,
  wordId:o.targetSourceWordId||o.sourceWordId,wordIndex:o.targetWordIndex??o.sourceWordIndex??o.wordIndex,
  word:o.observedWord||o.accordance?.surface||o.observation?.surface||o.observedConsonants||o.sourceWord||o.word||'',
  lex:o.lex||o.rawLex||o.observed?.lex||o.observation?.lex||(o.accordance?.lexemes||[]).join(' '),
  tags:o.tags||o.rawTag||o.observed?.tag||o.observation?.tags||(o.accordance?.rawTags||[]).join(' '),
  confidence:o.confidence||o.readingStatus||(/uncertain|unreadable|unclear|illegible/.test(o.status||'')?'uncertain':'clear'),alignment:o.alignment||((o.sourceWordIds?.length>1||o.sourceBindings?.length>1)?'many-to-one':'one-to-one'),image,observedRef:o.observation?.ref||o.observedRef||o.accordance?.ref||null,observationStatus:o.status||null,notes:o.notes||o.note||null,
  method:o.comparisonMethod||o.accordance?.observation||o.status||document.method};
}
function compareObservation(data,o){
 const result={title:o.title,ref:o.ref,sourceWordId:o.wordId,reference:{word:o.word,lex:o.lex,tags:o.tags,observedRef:o.observedRef||null,image:o.image,method:o.method,observationStatus:o.observationStatus||null,notes:o.notes||null}};
 const unit=data.units?.[o.ref],match=/\/word\/(\d+)$/.exec(o.wordId||''),index=match?Number(match[1]):o.wordIndex;
 if(o.title!==data.title||o.textHash!==data.source.textHash||!unit||!Number.isInteger(index)||o.wordId!==unit.id+'/word/'+index||!unit.words[index])return {...result,status:'binding-refused'};
 if(o.wordIndex!==undefined&&o.wordIndex!==index)return {...result,status:'binding-refused'};
 if(o.confidence!=='clear'||o.alignment!=='one-to-one')return {...result,status:'reference-needs-review'};
 const sourceWord=unit.words[index];
 if(!plain(o.word)||plain(o.word)!==plain(sourceWord.text))return {...result,status:'surface-or-segmentation-difference',targetWord:sourceWord.text};
 const [ch,mi]=o.ref.split(':').map(Number),ids=data.sources[data.title]?.chapters[ch-1]?.[mi-1]||[],tokens=M.tokens(unit.offsetText);
 const forms=tokens.map((t,i)=>({t,f:data.forms[ids[i]]})).filter(({t})=>t.start>=sourceWord.start&&t.end<=sourceWord.end).map(({f})=>f).filter(Boolean);
 if(forms.length!==1)return {...result,status:'lexical-token-binding-required',lexicalCards:forms.length};
 const f=forms[0],parsed=parseHead(o.tags),expected=parsed.features,analyses=f.analyses||[];
 if(!Object.keys(expected).length||parsed.unsupported.length)return {...result,status:'reference-features-not-parsed',parsed};
 const reports=analyses.map(a=>{
  const parts=a.partialFeatures?[{...a.partialFeatures,partial:true}]:segments(a),lexicalParts=parts.filter(p=>p.type!=='S'),head=lexicalParts.filter(p=>!['C','R','T'].includes(p.type)).at(-1)||lexicalParts.at(-1)||{};
  const missing=[],different=[];
  for(const [key,v]of Object.entries(expected)){const actual=head[key];if(actual===undefined)missing.push(key);else if(key==='form'&&v==='participle'? !['r','s'].includes(actual):actual!==v)different.push({feature:key,expected:v,actual});}
  return {lemma:a.lemma,morph:a.morph,partial:!!a.partialFeatures,missing,different};
 });
 const visibleLexemes=String(o.lex||'').split(/[\s;|/]+/).map(plain).filter(Boolean),candidateHeads=analyses.map(a=>({lemma:a.lemma,head:plain(a.lemma.split('/').at(-1))})),lexicalMatches=candidateHeads.filter(a=>visibleLexemes.includes(a.head));
 const matches=reports.filter(r=>!r.missing.length&&!r.different.length),partial=reports.filter(r=>!r.different.length&&r.missing.length);
 return {...result,targetWord:f.word,status:!analyses.length?'draft-unresolved':matches.length?'visible-head-features-compatible':partial.length?'draft-partial-visible-features':'visible-head-feature-difference',parsed,
  lexicalComparison:{observed:o.lex,visibleLexemes,candidateLemmas:analyses.map(a=>a.lemma),candidateHeads,matchingCandidateLemmas:lexicalMatches.map(a=>a.lemma),status:!visibleLexemes.length?'not-readable':!analyses.length?'draft-unresolved':lexicalMatches.length?'candidate-head-lexeme-present-in-visible-components':'candidate-head-lexeme-differs',limitations:'Exact consonantal component comparison only. Prefix order, homonym sense, spelling equivalence and root equivalence require separate contextual review.'},candidates:reports};
}
function load(file){const ctx={window:{}};vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx);return Object.values(ctx.window)[0];}
function main(){
 const indexArg=process.argv.find(a=>a.startsWith('--image-index='));if(!indexArg)throw Error('Supply --image-index=/path/to/full-download-index.json to verify original image hashes');
 const imageIndexFile=path.resolve(indexArg.slice('--image-index='.length)),imageIndexBytes=fs.readFileSync(imageIndexFile),imageIndex=new Map(JSON.parse(imageIndexBytes).map(r=>[r.name,r])),verifiedImages=new Map();
 function verifiedImage(o){const name=path.basename(o.image.file||''),record=imageIndex.get(name);if(!record||o.image.sha256!==record.sha256||o.image.driveId!==record.id)return false;if(!verifiedImages.has(name))verifiedImages.set(name,hash(fs.readFileSync(path.join(path.dirname(imageIndexFile),name)))===record.sha256);return verifiedImages.get(name);}
 const files=fs.readdirSync(__dirname).filter(f=>/^accordance-moed-current-.*-observations\.json$/.test(f)),catalog=load(path.join(ROOT,'mishnah-accordance-catalog.js')),books=new Map(),rows=[],inputs=[{imageIndexSha256:hash(imageIndexBytes)}];
 for(const file of files){const bytes=fs.readFileSync(path.join(__dirname,file)),doc=JSON.parse(bytes);inputs.push({file,sha256:hash(bytes),observations:doc.observations?.length||0,coverage:doc.coverage||doc.summary||null});
  for(const raw of doc.observations||[]){const o=normalizeObservation(raw,doc),item=catalog[o.title];if(!verifiedImage(o))throw Error('Original image binding refused: '+file+' '+o.ref+' '+o.wordId);if(!item){rows.push({title:o.title,ref:o.ref,status:'title-not-found'});continue;}if(!books.has(o.title))books.set(o.title,load(path.join(ROOT,item.file)));rows.push({...compareObservation(books.get(o.title),o),observationFile:file});}
 }
 const counts={};for(const row of rows)counts[row.status]=(counts[row.status]||0)+1;
 const scopeBooks=JSON.parse(fs.readFileSync(path.join(__dirname,'moed-nashim-morphology-completion-moed-audit.json'),'utf8')).books;
 const coverage=scopeBooks.map(({title})=>{if(!books.has(title))books.set(title,load(path.join(ROOT,catalog[title].file)));const d=books.get(title),observed=new Set(rows.filter(r=>r.title===title&&r.status!=='binding-refused').map(r=>r.sourceWordId)),all=Object.values(d.units).flatMap(u=>u.words.map((_,i)=>u.id+'/word/'+i));return {title,sourceWords:all.length,positionsWithObservation:all.filter(id=>observed.has(id)).length,withoutObservation:all.filter(id=>!observed.has(id)),wordCoverageComplete:all.every(id=>observed.has(id))};});
 const report={version:1,scope:'Moed available screenshot observations',complete:false,meaning:'Conservative compatibility with visible lexical-head fields only, not an accuracy score, complete morphology check, manuscript check, or human validation. No input cards or source text modified.',inputs,draftFiles:[...books].map(([title])=>({title,file:catalog[title].file,sha256:hash(fs.readFileSync(path.join(ROOT,catalog[title].file)))})),verifiedOriginalImages:verifiedImages.size,coverage,counts,rows};
 const out=path.join(__dirname,'moed-current-accordance-comparison.json');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({output:out,counts})+'\n');
}
module.exports={parseHead,normalizeObservation,compareObservation};if(require.main===module)main();
