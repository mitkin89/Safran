'use strict';
// Analysis transfer is independent of pointing transfer. Never change a word.
const M=require('../../mishnah-morph'),P=require('../../kaufmann-pointing');
const spellingReview=require('./kaufmann-interlinear-spelling-decisions.json');
const spellingDecisions=new Map(spellingReview.decisions.map(d=>[d.ref+'/'+d.wordIndex,d]));
if(spellingDecisions.size!==spellingReview.decisions.length)throw Error('Duplicate spelling decision');
const consonants=s=>P.stripPointing(s).replace(/[^א-ת]/g,'');
function compatible(target,source,position){
 if(consonants(target)===consonants(source))return 'same-consonants';
 if(/['׳]$/.test(target)&&consonants(source).startsWith(consonants(target)))return 'aligned-abbreviation';
 if(consonants(target)==='רשיי'&&consonants(source)==='רשי')return 'Levy-rashai-spelling';
 const decision=spellingDecisions.get(position);
 if(decision&&target===decision.target&&P.stripPointing(source)===decision.source)return 'reviewed-spelling-variant';
 return null;
}
function transfer(data,alignment,donor){
 const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 const bytes=fs.readFileSync(path.resolve(__dirname,'../../bundled/dict',spellingReview.dictionary.dictId+'.json.gz')),dictionary=JSON.parse(zlib.gunzipSync(bytes));
 if(spellingReview.dictionary.dictId!=='e8d290b744f6'||sha(bytes)!==spellingReview.dictionary.sha256)throw Error('Spelling review dictionary changed');
 for(const decision of spellingReview.decisions)for(const e of decision.dictionaryEvidence||[]){
  if(e.dictId!==spellingReview.dictionary.dictId||sha(dictionary.html[e.entry])!==e.entrySha256||!dictionary.heads[e.entry].includes(e.head))throw Error('Spelling review entry changed');
 }
 const title=data.title,source=donor.sources[title];
 if(alignment.source.textHash!==source.textHash||alignment.source.rel!==source.rel||alignment.witnessSha256.D!==data.source.diplomaticSha256)throw Error('Interlinear analysis source mismatch');
 const accepted=[],rejected=[];
 for(const chapter of Object.values(alignment.interlinear.chapters)){
  const links=chapter.D.links,targets=new Map(),sources=new Map();
  for(const l of links){for(const p of l.reading){const k=p.join('/');targets.set(k,(targets.get(k)||0)+1);}for(const p of l.base){const k=p.join('/');sources.set(k,(sources.get(k)||0)+1);}}
  for(const l of links){
   if(l.reading.length!==1)continue;
   const [ref,i]=l.reading[0],u=data.units[ref],w=u?.words[i];if(!w)continue;
   const tokens=M.tokens(u.offsetText),matches=tokens.map((t,j)=>({t,j})).filter(({t})=>w.start<=t.start&&w.end>=t.end);
   if(matches.length!==1)continue;
   const [c,m]=ref.split(':').map(Number),f=data.forms[data.sources[title].chapters[c-1][m-1][matches[0].j]];
   if(f.analyses.length)continue;
   const reject=reason=>rejected.push({ref,wordIndex:i,reason});
   if(l.base.length!==1||l.uncertain||targets.get(ref+'/'+i)!==1){reject('ambiguous-link');continue;}
   const [sr,si]=l.base[0];
   if(sr!==ref||sources.get(sr+'/'+si)!==1||w.flags.length){reject('source-annotation-or-reused-position');continue;}
   const sw=alignment.base[sr]?.words[si],[sc,sm]=sr.split(':').map(Number),sourceTokens=M.tokens(alignment.base[sr].offsetText||alignment.base[sr].text);
   const st=sourceTokens.map((t,j)=>({t,j})).filter(({t})=>sw.start<=t.start&&sw.end>=t.end);
   if(st.length!==1||sw.flags?.length){reject('source-token-not-singular');continue;}
   const sf=donor.forms[source.chapters[sc-1][sm-1][st[0].j]],kind=compatible(w.originalWord,sw.text,ref+'/'+i);
   if(!kind||sf?.word!==st[0].t.word||!sf.analyses.length){reject('unmatched-word-or-missing-analysis');continue;}
   const sourceWordId=u.id+'/word/'+i;
   f.analyses=sf.analyses.map(a=>({...JSON.parse(JSON.stringify(a)),method:'interlinear-position-candidate',rules:[...new Set([...(a.rules||[]),'interlinear-analysis-transfer'])],note:(a.note?a.note+' ':'')+'Analyse aus der eindeutigen Interlinearverknüpfung übernommen; keine Übernahme oder Bestätigung der Quellpunktierung.'}));
   f.status=f.analyses.length>1?'ambiguous':'candidate';f.hints=['Automatisch aus der eindeutigen Interlinearverknüpfung übernommen; Analysekandidat, nicht am Manuskript bestätigt.'];
   f.provenance.analysis={source:'Positionsgebundener Analysevorschlag aus dem Interlinear',kind:'interlinear-position',reviewed:false,sourceWord:sw.text,sourceWordId,sourceRef:sr,sourceTokenIndex:st[0].j,sourceTextHash:source.textHash,alignmentMethod:l.method,compatibility:kind,pointingMatch:null};
   if(kind==='reviewed-spelling-variant'){
    const decision=spellingDecisions.get(ref+'/'+i);
    f.provenance.analysis.spellingReview={ref,wordIndex:i,target:decision.target,source:decision.source,note:decision.note};
    f.dictionaryEvidence=JSON.parse(JSON.stringify(decision.dictionaryEvidence||[]));
    f.hints.push('Schreibvariante positionsgenau geprüft; Wörterbuchtreffer dienen als Suchbelege, nicht als automatische Bedeutungsbestätigung.');
   }
   accepted.push({ref,wordIndex:i,sourceWordId,sourceRef:sr,sourceTokenIndex:st[0].j,compatibility:kind});
  }
 }
 data.rules['interlinear-analysis-transfer']={label:'Analyse aus eindeutiger Interlinearverknüpfung',refs:['Positionsgebundene Übernahme vorhandener Analysekandidaten; Punktierung getrennt.','Nur unverletzte Einzelwortanker, gleiche Konsonanten, belegte Abkürzungen oder positionsgenau geprüfte Schreibvariante. Keine globale Normalisierung von Jod/Waw.']};
 data.interlinearAnalysisTransfer={sourceTextHash:source.textHash,spellingReview:{file:'kaufmann-interlinear-spelling-decisions.json',decisions:spellingReview.decisions.length,dictionary:spellingReview.dictionary},accepted,rejected};
 return data.interlinearAnalysisTransfer;
}
module.exports={transfer,compatible};
