'use strict';
// Source-bound draft morphology. Never a donor for text or pointing.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),vm=require('node:vm');
const M=require('../../mishnah-morph'),B=require('./build.cjs'),BC=require('../../bavli-core');
const ROOT=path.resolve(__dirname,'../..'),sha=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex'),clone=x=>JSON.parse(JSON.stringify(x));
const plain=w=>M.normalize(w).replace(/[^א-ת]/g,''),clusters=w=>[...M.normalize(w).matchAll(/([א-ת])([\u05b0-\u05bc\u05c1\u05c2\u05c7]*)/gu)].map(m=>({letter:m[1],marks:m[2]}));
const scoped=title=>['Shabbat','Eruvin','Pesachim','Yoma','Shekalim','Sukkah','Beitzah','Rosh Hashanah',"Ta'anit",'Megillah','Moed Katan','Chagigah','Yevamot','Ketubot','Nedarim','Nazir','Sotah','Gittin','Kiddushin'].includes(title.replace(/^Mishnah /,''));
const medial=s=>s.replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'})[c]),join=(s,e)=>e?medial(s)+e:s;
const nominal=a=>a.morph.slice(1).split('/').some(p=>/^[NA]|^V.[rs]/.test(p)),unique=aa=>[...new Map(aa.map(a=>[a.lemma+'|'+a.morph+'|'+(a._scopeTitles||[]).join(',')+'|'+(a.gloss?.de||'')+'|'+(a._sourceWord||''),a])).values()];
const stripHtml=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const vowels=s=>[...s].filter(c=>/[\u05b0-\u05bb\u05c7]/u.test(c)),vclass=c=>'ֲַָ'.includes(c)?'a':'ֱֵֶ'.includes(c)?'e':c==='ִ'?'i':'ֳׇֹ'.includes(c)?'o':'ֻ'.includes(c)?'u':c==='ְ'?'zero':c;
const clusterVowels=c=>[...vowels(c.marks),...(c.letter==='ו'&&c.marks.includes('ּ')&&!vowels(c.marks).length?['ֻ']:[])];
function compatibleVowels(a,b){const x=clusters(a),y=clusters(b);if(x.map(c=>c.letter).join('')!==y.map(c=>c.letter).join(''))return false;return x.every((c,i)=>{const da=[...c.marks].find(m=>/[ׁׂ]/.test(m)),db=[...y[i].marks].find(m=>/[ׁׂ]/.test(m));if(da&&db&&da!==db)return false;const va=clusterVowels(c),vb=clusterVowels(y[i]);return !va.length||!vb.length||va.some(a=>vb.some(b=>vclass(a)===vclass(b)));});}
function rootDots(word,root){const cs=clusters(word),r=medial(root),matches=[];function walk(i,at,map){if(i===r.length){matches.push(map);return;}for(let j=at;j<cs.length;j++)if(medial(cs[j].letter)===r[i])walk(i+1,j+1,[...map,j]);}walk(0,0,[]);if(!matches.length)return[];return[...r].map((c,i)=>{if(c!=='ש')return null;const dots=[...new Set(matches.map(m=>[...cs[m[i]].marks].find(x=>/[ׁׂ]/.test(x))).filter(Boolean))];return dots.length===1?dots[0]:null;});}
function rootDotCompatible(word,root,base){const a=rootDots(word,root),b=rootDots(base.lemma,root).some(Boolean)?rootDots(base.lemma,root):rootDots(base._sourceWord||'',root);return a.every((d,i)=>!d||!b[i]||d===b[i]);}
const RULE='moed-nashim-draft-morphology';
function buildEngine(){
 const exact=new Map(),consonants=new Map(),roots=new Map(),nominals=new Map(),evidenceById=new Map(),positionEntries=[],seedEntries=[],inputs=[],dictionaries={};
 function evidence(dictId,entry,dict){const id=dictId+'/'+entry;if(!evidenceById.has(id))evidenceById.set(id,{dictId,dict:dictId==='d895bc1c727b'?'Jastrow':dictId==='e8d290b744f6'?'Levy':'Krauss',entry,head:dict.heads[entry][0],entrySha256:sha(dict.html[entry]),dictionarySha256:dict.sha256,match:'lexical-base',queryKind:'bounded-dictionary-pos-header'});return evidenceById.get(id);}
 function add(word,aa,origin='general-lexical-form',titles=null){const key=M.normalize(word),p=plain(word);if(!p||!aa.length)return;
  const rows=aa.map(a=>({...clone(a),method:a.method||origin,rules:[...new Set([...(a.rules||[]),RULE])],_sourceWord:word,_scopeTitles:titles,_priority:origin==='reviewed-rabbinic-form'?3:origin==='rabbinic-dictionary-head'?1:2}));
  for(const [map,k]of [[exact,key],[consonants,p]])map.set(k,unique([...(map.get(k)||[]),...rows]));
  for(const a of rows){const code=a.morph.slice(1).split('/').at(-1),lemma=a.lemma.split('/').at(-1),lp=plain(lemma);
   if(/^V/.test(code)&&lp.length===3&&!a.lemma.includes('/')){const r=roots.get(medial(lp))||[];roots.set(medial(lp),unique([...r,a]));}
   if(/^N[cp][mf][spda][ac]?$/.test(code)&&!a.lemma.includes('/')&&p.length>1){const ns=nominals.get(p)||[];nominals.set(p,unique([...ns,a]));}
  }
 }
 for(const file of ['build.cjs','lexical-review-a.json','lexical-review-b.json','zeraim-lexicon.json','moed-nashim-seed-sources.json'])inputs.push({file,sha256:sha(fs.readFileSync(path.join(__dirname,file)))});
 inputs.push({file:'app/bavli-morph.js',sha256:sha(fs.readFileSync(path.join(ROOT,'bavli-morph.js')))});
 // Existing general form lexicon only: never borrow occurrence-specific decisions.
 const words=new Set();for(const o of require('../../bavli-morph').occurrences)words.add(o.word);
 for(const file of ['lexical-review-a.json','lexical-review-b.json'])for(const r of require('./'+file))words.add(r.word);
 for(const [word,lemma,morph]of require('./zeraim-lexicon.json')){words.add(word);add(word,[{lemma,morph,rules:['nominal'],method:'existing-mishnah-form-candidate'}]);}
 for(const word of words){const aa=B.analyze(word);if(aa.length)add(word,aa);}
 // Fixed grammatical forms; their source is grammar, not a biblical dictionary.
 for(const [word,lemma,morph]of [['ו','ו','HC'],['ה','ה','HTd'],['ש','ש','HTr'],['יָיי','יי','HNp'],['יי','יי','HNp'],["ר׳",'רבי','HNcmsa'],["ר'",'רבי','HNcmsa'],["אומ׳",'אמר','HVqrmsa'],["או׳",'אמר','HVqrmsa'],["אמ׳",'אמר','HVqrmsa']])add(word,[{lemma,morph,rules:['prefix'],note:'Geschlossene Form oder geläufige Schreibabkürzung; Satzfunktion bleibt zu prüfen.'}]);
 for(const [id,name]of [['d895bc1c727b','Jastrow'],['e8d290b744f6','Levy'],['d701423861c6','Krauss']]){const bytes=fs.readFileSync(path.join(ROOT,'bundled/dict',id+'.json.gz')),dict=JSON.parse(zlib.gunzipSync(bytes));dict.sha256=sha(bytes);dictionaries[id]=dict;inputs.push({dictionary:name,dictId:id,sha256:dict.sha256});
  if(id!=='d895bc1c727b')continue; // Only the bounded Jastrow header has machine-readable POS here.
  for(let i=0;i<dict.html.length;i++){const html=dict.html[i],first=/<div\b[^>]*>([\s\S]*?)<\/div>/i.exec(html)?.[1]||'',bold=/<b>([\s\S]*?)<\/b>/i.exec(first);if(!bold)continue;
   const tail=stripHtml(first.slice(bold.index+bold[0].length)),head=stripHtml(dict.heads[i]?.[0]||bold[1]).replace(/\s+[IVX]+\b.*$/,'').trim(),p=plain(head);if(!p||/\s/.test(head)||p.length>14||/[()]/.test(head))continue;
   const ev=evidence(id,i,dict);let aa=[];if(/(?:^|[.)]\s*)pr\.\s*n\./i.test(tail)){for(const alias of dict.heads[i]){const ap=plain(alias);if(ap.length>1&&!/[()]/.test(alias))add(alias,[{lemma:ap,morph:'HNp',rules:['nominal'],dictionaryEvidence:[ev],note:'Explizit als Eigenname markierter rabbinischer Wörterbucheintrag; Identifikation der Person im Kontext offen.'}],'rabbinic-dictionary-head');}continue;}
   if(/^m\.(?:\s|$)/.test(tail)||/^f\.(?:\s|$)/.test(tail)){
    const gender=tail[0],plural=/\bpl\./.test(tail),suspectNumber=/(ים|ין|ות|יי)$/.test(p);if(!suspectNumber||plural){aa=[{lemma:p,morph:'HNc'+gender+(plural?'p':'s')+'a',_genderOnly:true,rules:['nominal'],dictionaryEvidence:[ev],note:'Automatischer Formkandidat aus expliziter Wortart/Genus im Jastrow-Stichwortkopf; noch keine Satzkontextprüfung.'}];}
   }else if(/^adj\./.test(tail))aa=[{lemma:p,morph:'HAamsa',rules:['nominal'],dictionaryEvidence:[ev],note:'Adjektivischer Stichwortkopf; Formkandidat, Kontext offen.'}];
   else if(/^adv\./.test(tail))aa=[{lemma:p,morph:'HD',rules:['adverb'],dictionaryEvidence:[ev]}];
   else if(/^prep\./.test(tail))aa=[{lemma:p,morph:'HR',rules:['prefix'],dictionaryEvidence:[ev]}];
   else if(/^conj\./.test(tail))aa=[{lemma:p,morph:'HC',rules:['prefix'],dictionaryEvidence:[ev]}];
   if(aa.length)add(head,aa,'rabbinic-dictionary-head');
   const cs=clusters(head),body=stripHtml(html.slice(0,900)).slice(stripHtml(first).length).trim();
   if(p.length===3&&cs.length===3&&/[ַָ]/.test(cs[0].marks)&&/[ֵֶַ]/.test(cs[1].marks)&&!/^m\.|^f\.|^adj\./.test(tail)&&(/^to\b/i.test(tail)||/^to\b/i.test(body))){add(head,[{lemma:p,root:p,morph:'HVqp3ms',rules:['verb'],dictionaryEvidence:[ev],note:'Hebräischer Verb-Stichwortkopf; daraus gebildete Formen sind reguläre Kandidaten.'}]);}
  }
 }
 add('אמ׳',[{lemma:'אמר',morph:'HVqp3ms',rules:['verb'],note:'Abkürzung für אמר; Perfekt und Partizip bleiben ohne Kontext Alternativen.'}]);
 // Agent-reviewed seed files: lexical entries are scope-bound; context rows remain positional.
 for(const file of JSON.parse(fs.readFileSync(path.join(__dirname,'moed-nashim-seed-sources.json'))).files){
  const bytes=fs.readFileSync(path.join(__dirname,file)),doc=JSON.parse(bytes);inputs.push({file,sha256:sha(bytes)});
  for(const entry of doc.entries||[]){if(!entry.word||!entry.analyses?.length)continue;const ev=(entry.evidence||[]).map(e=>{const dict=dictionaries[e.dictId];if(!dict||!Number.isInteger(e.entry)||!dict.html[e.entry]||e.entrySha256!==sha(dict.html[e.entry]))throw Error('Seed dictionary evidence changed '+file+' '+entry.word);return {...e,dict:e.dict||({'d895bc1c727b':'Jastrow','e8d290b744f6':'Levy','d701423861c6':'Krauss'})[e.dictId],dictionarySha256:dict.sha256,match:'reviewed-entry'};});
   const row={...entry,scopeTitles:doc.scopeTitles||[],sourceFile:file,analyses:entry.analyses.map(a=>({...a,rules:[...new Set([...(a.rules||[]),RULE])],dictionaryEvidence:ev}))};
   if(entry.positions?.length)positionEntries.push(row);else{seedEntries.push(row);add(entry.word,row.analyses,'reviewed-rabbinic-form',doc.scopeTitles?.length?doc.scopeTitles:null);}
  }
 }
 const nounForms=new Map();function put(map,key,a){if(!key)return;map.set(key,unique([...(map.get(key)||[]),a]));}
 const simpleSuffix=[['י','1cs'],['ך','2ms'],['ך','2fs'],['ו','3ms'],['ה','3fs'],['נו','1cp'],['כם','2mp'],['כן','2fp'],['ם','3mp'],['ן','3fp'],['ן','3mp'],['הם','3mp'],['הן','3fp'],['הן','3mp'],['כן','2mp']],pluralSuffix=[['י','1cs'],['יך','2ms'],['יך','2fs'],['יו','3ms'],['יה','3fs'],['ינו','1cp'],['יכם','2mp'],['יכן','2fp'],['יהם','3mp'],['יהן','3fp'],['יהן','3mp'],['יכן','2mp']];
 for(const [p,aa]of nominals)for(const a of aa){const code=a.morph.slice(1),gender=code[2],number=code[3];if(!/^Nc[mf][sp]/.test(code))continue;
  const derived=(code,note)=>({...clone(a),morph:'H'+code,method:'rabbinic-nominal-inflection-candidate',rules:[...new Set([...a.rules,'nominal','suffix',RULE])],note:'Regulärer Flexionskandidat zur lexikalisch belegten Ausgangsform '+a._sourceWord+'. '+note});
  if(number==='s'){
   const stem=gender==='f'&&p.endsWith('ה')?p.slice(0,-1)+'ת':p;
   for(const[s,person]of simpleSuffix)put(nounForms,join(stem,s),derived('Nc'+gender+'sc/Sp'+person,'Pronominalsuffix; Kasus-/Satzfunktion bleibt offen.'));
   if(gender==='m'&&!/(ים|ין|ות)$/.test(p)){for(const end of ['ים','ין'])put(nounForms,join(p,end),derived('Ncmpa','Männlicher Plural auf ־ים/־ין.'));put(nounForms,join(p,'י'),derived('Ncmpc','Männlicher Plural im Status constructus.'));}
   if(gender==='f'&&p.endsWith('ה'))for(const state of ['a','c'])put(nounForms,p.slice(0,-1)+'ות',derived('Ncfp'+state,'Weiblicher Plural; Status ohne Kontext nicht entschieden.'));
  }else if(number==='p'){
   const stem=/(ים|ין)$/.test(p)?p.slice(0,-2):p;
   for(const[s,person]of pluralSuffix)put(nounForms,join(stem,s),derived('Nc'+gender+'pc/Sp'+person,'Plural mit Pronominalsuffix.'));
   if(gender==='m'&&/(ים|ין)$/.test(p)){put(nounForms,join(stem,'י'),derived('Ncmpc','Plural constructus.'));put(nounForms,join(stem,p.endsWith('ים')?'ין':'ים'),derived('Ncmpa','Mischnahebräische Pluralvariante ־ים/־ין.'));}
  }
 }
 // Common prepositions with pronominal suffixes; no nominal root is inferred.
 for(const[base,stem]of [['על','עלי'],['אל','אלי'],['אחר','אחרי'],['לפני','לפני'],['מן','ממנ'],['ב','ב'],['ל','ל'],['כ','כ']])for(const[s,person]of [['ו','3ms'],['ה','3fs'],['הם','3mp'],['הן','3fp'],['נו','1cp'],['ך','2ms'],['ך','2fs'],['כם','2mp'],['כן','2fp']])put(nounForms,join(stem,s),{lemma:base,morph:'HR/Sp'+person,rules:['prefix','suffix',RULE],method:'closed-prepositional-inflection',note:'Gebundene Präposition mit Pronominalsuffix; kein Wörterbuchhomonym übernommen.'});
 for(const[word,lemma,morph]of [['עָלַי','על','HR/Sp1cs'],['עָלֵינוּ','על','HR/Sp1cp'],['עֲלֵיהֶם','על','HR/Sp3mp'],['עֲלֵיהֶן','על','HR/Sp3fp'],['בּוֹ','ב','HR/Sp3ms'],['בָּהּ','ב','HR/Sp3fs'],['לִי','ל','HR/Sp1cs'],['לוֹ','ל','HR/Sp3ms'],['לָהּ','ל','HR/Sp3fs']])add(word,[{lemma,morph,rules:['prefix','suffix'],method:'closed-prepositional-inflection'}]);
 function nominalSuffixCompatible(word,a){
  const cs=clusters(word),prev=cs.at(-2),pv=prev&&clusterVowels(prev);if(plain(word).endsWith('י')&&pv?.length){if(/Nc[mf]sc\/Sp1cs$/.test(a.morph)&&!pv.includes('ִ'))return false;if(/Nc[mf]pc\/Sp1cs$/.test(a.morph)&&!pv.some(m=>'ַָ'.includes(m)))return false;if(/Ncmpc$/.test(a.morph)&&!pv.some(m=>'ֵֶ'.includes(m)))return false;}if(!a.morph.includes('/Sp'))return true;const base=clusters(a._sourceWord||'');
  if(a.morph.endsWith('/Sp3ms')&&cs.at(-1)?.letter==='ו'&&cs.at(-1).marks.includes('ּ')&&!vowels(cs.at(-1).marks).length&&!plain(a._sourceWord||'').endsWith('ה'))return false;
  for(let i=1;i<base.length-1&&i<cs.length;i++){if(base[i].letter!==cs[i].letter)continue;if(cs[i].marks.includes('ּ')&&!base[i].marks.includes('ּ'))return false;if(base[i].marks.includes('ּ')&&base[i].marks.includes('ָ')&&cs[i].marks.includes('ְ'))return false;}
  if(base[0]?.letter==='מ'&&base[0].marks.includes('ִ')&&base[1]?.marks.includes('ְ')&&cs[0]?.letter==='מ'&&cs[0].marks.includes('ְ'))return false;
  return true;
 }
 const positionIndex=new Map();for(const entry of positionEntries)for(const p of entry.positions){if(!Number.isInteger(p.tokenIndex)||p.tokenIndex<0||!p.sourceTextHash)throw Error('Invalid positional seed');const k=p.title+'|'+p.ref+'|'+p.tokenIndex;positionIndex.set(k,[...(positionIndex.get(k)||[]),entry]);}
 const memo=new Map();
 const allowed=(a,title)=>!a._scopeTitles||a._scopeTitles.includes(title);
 const preferred=aa=>aa.filter(a=>a._priority===Math.max(...aa.map(a=>a._priority||0)));
 function direct(word,title){if(!clusters(word).some(c=>clusterVowels(c).length))return (consonants.get(plain(word))||[]).filter(a=>allowed(a,title)).map(a=>({...clone(a),note:(a.note||'')+' Ohne sichere Vokale bleiben lexikalische Alternativen offen.'}));const k=M.normalize(word),p=plain(word),same=(exact.get(k)||[]).filter(a=>allowed(a,title));if(same.length)return clone(preferred(same));return preferred((consonants.get(p)||[]).filter(a=>allowed(a,title)&&compatibleVowels(word,a._sourceWord))).map(a=>({...clone(a),note:(a.note||'')+' Schreib-/Punktierungsvariante der allgemeinen lexikalischen Form; kein Punktierungsimport.'}));}
 function grammarVerbs(word,title){const p=plain(word),cs=clusters(word),out=[],at=(i,re)=>re.test(cs[i]?.marks||''),emit=(r,code)=>{for(const base of roots.get(medial(r))||[])if(allowed(base,title)&&rootDotCompatible(word,r,base))out.push({...clone(base),lemma:base.lemma,root:base.root||base.lemma,morph:'H'+code,method:'attested-root-inflection-candidate',rules:[...new Set([...base.rules,'verb',RULE])],note:'Reguläres hebräisches Flexionsmuster zu belegtem Verbstamm; noch keine Satzkontext- oder Accordance-Prüfung.'});};
  // Participles: explicit prefix and vowel pattern plus an attested root.
  for(const [ending,gn]of [['ים','mp'],['ין','mp'],['ות','fp'],['ת','fs'],['ה','fs'],['','ms']]){if(ending&&!p.endsWith(ending))continue;const stem=ending?p.slice(0,-ending.length):p;
   if(stem.length===4&&stem[0]==='מ'){
    const r=stem.slice(1);if(at(0,/[ַָ]/)&&at(2,/ִ/))emit(r,'Vhr'+gn+'a');if(at(0,/ְ/)&&at(1,/ַ/))emit(r,'Vpr'+gn+'a');if(at(0,/[ֻ]/))emit(r,'VHs'+gn+'a');if(at(0,/ְ/)&&at(1,/ֻ/))emit(r,'VPs'+gn+'a');
   }
   if(stem.length===5&&stem.startsWith('מ')&&stem[3]==='י'&&at(0,/[ַָ]/))emit(stem[1]+stem[2]+stem[4],'Vhr'+gn+'a');
   if(stem.length===3&&stem[0]==='מ'&&ending&&at(0,/[ַָ]/)&&at(2,/ִ/))emit(stem.slice(1)+'ה','Vhr'+gn+'a');
   if(stem.length===4&&stem[0]==='נ'&&at(0,/ִ/)&&at(2,/[ַָ]/))emit(stem.slice(1),'VNr'+gn+'a');
   if(stem.length===5&&stem.startsWith('מת')&&at(0,/ִ/)&&at(1,/ְ/))emit(stem.slice(2),'Vtr'+gn+'a');
   if(stem.length===4&&stem[1]==='ו'&&(at(1,/ֹ/)||at(0,/ֹ/)))emit(stem[0]+stem.slice(2),'Vqr'+gn+'a');
   if(stem.length===4&&stem[2]==='ו'&&at(0,/[ַָ]/)&&at(2,/ּ/))emit(stem.slice(0,2)+stem[3],'Vqs'+gn+'a');
  }
  // Perfect: supported strong-root suffixes. Do not infer from consonants alone.
  for(const[end,persons]of [['תי',['1cs']],['נו',['1cp']],['תם',['2mp']],['תן',['2fp']],['ת',['2ms','2fs']],['ה',['3fs']],['ו',['3cp']],['',['3ms']]]){if(end&&!p.endsWith(end))continue;const stem=end?p.slice(0,-end.length):p;
   for(const person of persons){if(end==='ת'&&person==='2ms'&&cs.at(-1)?.marks.includes('ְ'))continue;if(end==='ת'&&person==='2fs'&&cs.at(-1)?.marks.includes('ָ'))continue;if(stem.length===3){if(at(0,/[ַָ]/)&&at(1,end?/[ְֵַָ]/:/[ֵַָ]/))emit(stem,'Vqp'+person);if(at(0,/ִ/)&&at(1,/[ְֵַ]/)&&at(1,/ּ/))emit(stem,'Vpp'+person);if(end==='ו'&&at(0,/ִ/)&&at(1,/ְ/)&&!at(1,/ּ/))emit(stem,'Vqv2mp');}
    if(stem.length===4&&stem[1]==='י'&&at(0,/ִ/)&&at(2,/ּ/))emit(stem[0]+stem.slice(2),'Vpp'+person);
    if(stem.length===5&&stem[0]==='ה'&&stem[3]==='י'&&at(0,/ִ/))emit(stem[1]+stem[2]+stem[4],'Vhp'+person);
    if(stem.length===4&&stem[0]==='ה'&&at(0,/ִ/)&&at(2,/ִ/))emit(stem.slice(1),'Vhp'+person);
    if(stem.length===4&&stem[0]==='נ'&&at(0,/ִ/))emit(stem.slice(1),'VNp'+person);
    if(stem.length===5&&stem.startsWith('הת')&&at(0,/ִ/))emit(stem.slice(2),'Vtp'+person);
   }
  }
  // Imperfect: finite person-prefix plus an attested root, constrained by vowels.
  const persons={י:['3ms'],ת:['2ms','3fs'],א:['1cs'],נ:['1cp']};
  for(const[end,plural]of [['ו',true],['י','f'],['',false]]){if(end&&!p.endsWith(end))continue;const stem=end?p.slice(0,-end.length):p,ps=persons[stem[0]];if(!ps)continue;let codes=plural===true?({י:['3mp'],ת:['2mp']})[stem[0]]:plural==='f'?(stem[0]==='ת'?['2fs']:null):ps;if(!codes)continue;
   for(const person of codes){if(stem.length===4){const r=stem.slice(1);if(at(0,/ִ/)&&at(2,/[ַֹ]/))emit(r,'Vqi'+person);if(at(0,/ְ/)&&at(1,/ַ/))emit(r,'Vpi'+person);if(at(0,/[ַָ]/)&&at(2,/ִ/))emit(r,'Vhi'+person);}
    if(stem.length===5&&stem[3]==='י'&&at(0,/[ַָ]/))emit(stem[1]+stem[2]+stem[4],'Vhi'+person);
    if(stem.length===5&&stem[1]==='ת'&&at(0,/ִ/))emit(stem.slice(2),'Vti'+person);
   }
  }
  for(const[end,person]of [['י','2fs'],['ו','2mp'],['נה','2fp'],['','2ms']]){if(end&&!p.endsWith(end))continue;const stem=end?p.slice(0,-end.length):p;if(stem.length===3){if(at(0,/ַ/)&&at(1,/[ְֵֶ]/)&&at(1,/ּ/))emit(stem,'Vpv'+person);if(end&&at(0,/ִ/)&&at(1,/ְ/)&&!at(1,/ּ/))emit(stem,'Vqv'+person);}if(stem.length===5&&stem[0]==='ה'&&stem[3]==='י'&&at(0,/ַ/))emit(stem[1]+stem[2]+stem[4],'Vhv'+person);}
  // Infinitives/imperatives remain alternatives until a preposition selects the infinitive.
  if(p.length===4&&p[2]==='ו'&&at(0,/ְ/)&&at(2,/ֹ/)){emit(p.slice(0,2)+p[3],'Vqc');emit(p.slice(0,2)+p[3],'Vqv2ms');}
  if(p.length===3&&at(0,/ַ/)&&at(1,/[ֵֶ]/)){emit(p,'Vpc');emit(p,'Vpv2ms');}
  if(p.length===5&&p[0]==='ה'&&p[3]==='י'&&at(0,/ַ/)){emit(p[1]+p[2]+p[4],'Vhc');emit(p[1]+p[2]+p[4],'Vhv2ms');}
  if(p.length===5&&p.startsWith('הת')&&at(0,/ִ/))emit(p.slice(2),'Vtc');
  return unique(out);
 }
 function analyze(word,title,depth=0){const memoKey=title+'|'+M.normalize(word)+'|'+depth;if(memo.has(memoKey))return clone(memo.get(memoKey));let aa=direct(word,title);if(aa.length&&!aa.every(a=>a._genderOnly)){memo.set(memoKey,aa);return clone(aa);}
  const p=plain(word),cs=clusters(word);aa=[...aa,...(nounForms.get(p)||[]).filter(a=>allowed(a,title)).filter(a=>nominalSuffixCompatible(word,a)),...grammarVerbs(word,title)];
  if(depth<3&&cs.length>2){const c=cs[0].letter,v=cs[0].marks,rest=word.normalize('NFD').replace(/^[א-ת][\u05b0-\u05c7]*/,''),choices=[];
   if(c==='ו'&&/[ְַָּ]/.test(v))choices.push(['C','ו']);
   if('בכל'.includes(c)&&/[ְִֶַָ]/.test(v)){choices.push(['R',c]);if(/[ַָ]/.test(v)&&!(v.includes('ַ')&&/[ֱֲֳ]/.test(cs[1]?.marks||'')))choices.push(['R/Td',c+'/ה']);}
   if(c==='מ'&&/[ִֵ]/.test(v))choices.push(['R','מן']);
   if(c==='ש'&&!v.includes('ׂ')&&/[ֶַ]/.test(v))choices.push(['Tr','ש']);
   if(c==='ה'&&/[ַָ]/.test(v))choices.push(['Td','ה']);
   const rd=rest.replace(/^([א-ת])([^א-ת]*)/u,(_,l,m)=>l+m.replace(/ּ/g,''));
   for(const [code,lemma]of choices)for(const a of unique([...analyze(rest,title,depth+1),...analyze(rd,title,depth+1)])){
    if(code.includes('Td')&&(!nominal(a)||a.morph.includes('/Sp')||/^HNp/.test(a.morph)))continue;if(code.startsWith('R')&&!nominal(a)&&!/^HV.c(?:\/|$)/.test(a.morph))continue;
    aa.push({...a,lemma:lemma+'/'+a.lemma,morph:'H'+code+'/'+a.morph.slice(1),method:'rabbinic-prefix-inflection-candidate',rules:[...new Set([...a.rules,'prefix',...(code.includes('Td')?['article']:[]),RULE])],note:(a.note||'')+' Gebundene Vorsilbe nur vor belegtem Restformkandidaten.'});
   }
  }
  aa=unique(aa);memo.set(memoKey,aa);return clone(aa);
 }
 return{analyze,positionEntries,positionIndex,inputs,evidenceById,stats:{dictionaryHeads:exact.size,attestedRoots:roots.size,nominalForms:nounForms.size,reviewedSeedEntries:seedEntries.length}};
}
function sourceCore(data){return sha({source:data.source,units:data.units,transfers:data.transfers,interlinear:data.interlinear,sources:data.sources,words:data.forms.map(f=>[f.word,f.key,f.provenance?.pointing])});}
function splitWordGroups(data,engine){
 const name=data.title.slice(8).toLowerCase().replace(/[^a-z0-9]+/g,'-'),ctx={window:{}};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'mishnah-vocalized/mishnah-'+name+'.js'),'utf8'),ctx);
 const alignment=ctx.window.MISHNAH_VOCALIZED[data.title],donor=require(data.title.match(/Yevamot|Ketubot|Nedarim|Nazir|Sotah|Gittin|Kiddushin/)?'../../mishnah-nashim-data':'../../mishnah-moed-data'),source=donor.sources[data.title],groups=new Map();
 if(alignment.source.textHash!==source.textHash||alignment.source.rel!==source.rel||alignment.witnessSha256.D!==data.source.diplomaticSha256)throw Error('Split-word morphology alignment source mismatch');
 for(const chapter of Object.values(alignment.interlinear.chapters)){
  const targets=new Map(),bases=new Map();for(const l of chapter.D.links){for(const p of l.reading)targets.set(p.join('/'),(targets.get(p.join('/'))||0)+1);for(const p of l.base)bases.set(p.join('/'),(bases.get(p.join('/'))||0)+1);}
  for(const link of chapter.D.links){if(link.uncertain||link.base.length!==1||!link.reading.length)continue;
   const[sr,si]=link.base[0],ref=link.reading[0][0],indexes=link.reading.map(p=>p[1]);if(sr!==ref||link.reading.some(p=>p[0]!==ref)||indexes.some((i,j)=>j&&i!==indexes[j-1]+1)||link.reading.some(p=>targets.get(p.join('/'))!==1)||bases.get(sr+'/'+si)!==1)continue;
   const u=data.units[ref],parts=indexes.map(i=>u?.words[i]);if(parts.some(w=>!w||w.flags.some(f=>['unclear','choice','gap'].includes(f))||w.originalWord.includes('□')))continue;
   const sw=alignment.base[sr]?.words[si],written=plain(parts.map(w=>w.originalWord).join('')),expanded=plain(sw?.text||''),short=written.replace(/^ו/,'');const abbreviation=parts.length===1&&(['ר','רב','אמ','או','אומ','חכמ'].includes(short)||/[׳'’]/.test(parts[0].originalWord))&&expanded.startsWith(written)&&(expanded.length>written.length||/[׳'’]/.test(sw?.text||''));if(!sw||sw.flags?.some(f=>['unclear','choice','gap'].includes(f))||(!abbreviation&&written!==expanded)||parts.length===1&&!abbreviation)continue;
   const st=M.tokens(alignment.base[sr].offsetText||alignment.base[sr].text),matched=st.map((t,i)=>({t,i})).filter(({t})=>sw.start<=t.start&&sw.end>=t.end);if(matched.length!==1)continue;
   const[c,m]=sr.split(':').map(Number),sf=donor.forms[source.chapters[c-1][m-1][matched[0].i]],combined=parts.map(w=>w.text).join(''),aa=sf?.word===matched[0].t.word&&sf.analyses.length?clone(sf.analyses):engine.analyze(abbreviation?sw.text:combined,data.title);
   const group={type:abbreviation?'expanded-abbreviation':'split-word',expandedConsonants:abbreviation?expanded:null,ref,wordIndices:indexes,sourceWordIds:indexes.map(i=>u.id+'/word/'+i),parts:parts.map(w=>w.text),combinedConsonants:plain(combined),sourceRef:sr,sourceTokenIndex:matched[0].i,sourceTextHash:source.textHash,method:'Existing unique interlinear split-word link plus exact concatenated original consonants; no text joining or pointing import',analyses:aa};
   for(const i of indexes)groups.set(ref+'/'+i,group);
  }
 }
 return groups;
}
function supplementData(data,engine){if(!scoped(data.title))return{changed:[],remaining:[]};engine||=buildEngine();const before=sourceCore(data),changed=[],remaining=[],groups=splitWordGroups(data,engine);
 data.rules[RULE]={label:'Rabbinischer Lexikon- und Grammatikkandidat',refs:['Jastrow, Levy und Krauss: genaue Stichwort- und Artikelhashes bei den einzelnen Belegen. Keine biblischen Wörterbücher.','Reguläre Flexion nach den vorhandenen Regeln für Nomina, Verbformen, Vorsilben und Pronominalsuffixe. Noch kein neuer Accordance-Abgleich; keine Vokalisierungsbestätigung.']};
 for(const[ref,u]of Object.entries(data.units)){const[c,m]=ref.split(':').map(Number),ids=data.sources[data.title].chapters[c-1][m-1],ts=M.tokens(u.offsetText);
  ids.forEach((id,i)=>{const f=data.forms[id];if(f.morphologyBeforeCompletion){const original=clone(f.morphologyBeforeCompletion),{analysisProvenance,translationProvenance,...state}=original;Object.assign(f,state);f.provenance.analysis=analysisProvenance;f.provenance.translation=translationProvenance;if(!Object.hasOwn(original,'dictionaryEvidence'))delete f.dictionaryEvidence;delete f.morphologyWordGroup;delete f.morphologyBeforeCompletion;}
   if(f.word!==ts[i]?.word||f.key!==M.normalize(ts[i]?.word))throw Error('Morphology source token identity mismatch');if(f.analyses.length)return;const sourceIndex=u.words.findIndex(w=>w.start<=ts[i].start&&w.end>=ts[i].end),w=u.words[sourceIndex];if(!w)throw Error('Missing source-bound form');
   let aa=[],origin='rabbinic-grammar-candidate',group=groups.get(ref+'/'+sourceIndex);const positional=(engine.positionIndex.get(data.title+'|'+ref+'|'+i)||[]).filter(e=>M.normalize(e.word)===f.key&&(!e.scopeTitles?.length||e.scopeTitles.includes(data.title))&&e.positions.some(p=>p.title===data.title&&p.ref===ref&&p.tokenIndex===i&&p.sourceTextHash===data.source.textHash&&(!p.sourceWordId||p.sourceWordId===u.id+'/word/'+sourceIndex)));
   if(group){aa=group.analyses;origin='interlinear-word-group';}else if(positional.length&&!w.flags.some(f=>['unclear','choice','gap'].includes(f))&&!w.originalWord.includes('□')){aa=positional.flatMap(e=>e.analyses);origin='contextual-rabbinic-lexicon';}else if(!group&&(!w.flags.some(f=>['unclear','choice','gap'].includes(f))&&!w.originalWord.includes('□')&&(plain(f.word).length>1||/[׳'’]/.test(f.word))))aa=engine.analyze(f.word,data.title);
   if(!aa.length){remaining.push({title:data.title,ref,tokenIndex:i,formId:id,word:f.word,sourceWordId:u.id+'/word/'+sourceIndex,groupCombined:group?.combinedConsonants||null,reason:group?'split-word-group-not-yet-analysed':w.flags.some(f=>['unclear','choice','gap'].includes(f))||w.originalWord.includes('□')?'critical-source-annotation':plain(f.word).length<2?'diplomatic-fragment-or-single-letter':'no-safe-lexical-inflection-candidate'});return;}
   const original={analyses:[],status:f.status,hints:clone(f.hints),analysisProvenance:clone(f.provenance.analysis),translationProvenance:clone(f.provenance.translation),...(f.dictionaryEvidence?{dictionaryEvidence:clone(f.dictionaryEvidence)}:{})};
   const evidence=uniqueEvidence(aa.flatMap(a=>a.dictionaryEvidence||[]));aa=unique(aa).map(a=>{const{_sourceWord,_scopeTitles,_priority,_genderOnly,dictionaryEvidence,...clean}=a;if(_genderOnly){const code=a.morph.slice(1).split('/').find(c=>/^Nc/.test(c));clean.partialFeatures={kind:'nominal-gender-only',gender:code?.[2]||null,number:code?.[3]||null,state:code?.[4]||null,prefixes:a.morph.slice(1).split('/').filter(c=>!/^N/.test(c)&&!/^Sp/.test(c)),suffix:a.morph.match(/Sp([123][mfc][spd])/)?.[1]||null};clean.morph='H';clean.note=(a.note||'')+' Die Wörterbuch-Genusangabe allein entscheidet nicht zwischen Nomen, Adjektiv und substantivierter Form; deshalb nur Teilbestimmung.';}clean.rules=[...new Set([...(clean.rules||[]),RULE])];clean.lemma=clean.lemma.normalize('NFD').replace(/[\u0591-\u05c7]/g,'');return clean;});const fused=new Map();for(const a of aa){const k=a.lemma+'|'+a.morph+'|'+JSON.stringify(a.partialFeatures||null),old=fused.get(k);if(!old||(!old.gloss&&a.gloss))fused.set(k,a);else if(old.gloss&&a.gloss&&old.gloss.de!==a.gloss.de)fused.set(k+'|'+a.gloss.de,a);}aa=[...fused.values()];if(aa.some(a=>!a.lemma||!/^H/.test(a.morph)))throw Error('Invalid supplemented morphology');
   f.morphologyBeforeCompletion=original;f.analyses=aa;f.status=aa.every(a=>a.partialFeatures)?'partial':aa.length>1?'ambiguous':'candidate';f.hints=['Lexikon- und Grammatikkandidat; noch nicht mit Accordance abgeglichen. Keine Bestätigung der Manuskriptpunktierung.'];f.dictionaryEvidence=evidence;if(group){const{analyses,...metadata}=group;f.morphologyWordGroup=metadata;f.hints.push((group.type==='expanded-abbreviation'?'Bestimmung der belegten Schreibabkürzung: ':'Gemeinsame Wortbestimmung der Quellteile ')+group.parts.join(' + ')+'; die Textteile bleiben getrennt.');}if(w.flags.length)f.hints.push('Quellstatus: '+w.flags.join(', ')+'. Die Bestimmung bezieht sich auf die kodierte Lesung; der Quellenstatus bleibt unverändert.');
   f.provenance.analysis={source:origin==='interlinear-word-group'?'Bestimmung des zusammengehörigen Quellworts aus eindeutiger Interlineargruppe':origin==='contextual-rabbinic-lexicon'?'Positionsgebundene rabbinische Wörterbuch- und Kontextprüfung':'Rabbinische Lexikonformen und reguläre Flexionsmuster',kind:origin,reviewed:false,sourceWord:w.originalWord,sourceWordId:u.id+'/word/'+sourceIndex,sourceTextHash:data.source.textHash,sourceRef:ref,sourceTokenIndex:i,sourceFlags:clone(w.flags),pointingMatch:null};f.provenance.translation={source:'Redaktionelle Kurzbedeutung zum lexikalischen Kandidaten, sofern hinterlegt',kind:origin,reviewed:false,conditionalOnAnalysis:true};
   changed.push({title:data.title,ref,tokenIndex:i,formId:id,sourceWordId:u.id+'/word/'+sourceIndex,word:f.word,analyses:aa.map(a=>({lemma:a.lemma,morph:a.morph,method:a.method})),dictionaryEvidence:evidence});
  });
 }
 data.coverage.statuses=data.forms.reduce((s,f)=>(s[f.status]=(s[f.status]||0)+1,s),{});data.morphologyCompletion={method:'Source-preserving draft morphology from rabbinic lexical entries and constrained grammatical forms; no new Accordance comparison',inputs:engine.inputs,engine:engine.stats,changed:changed.length,remaining:remaining.length,fullScopeProcessed:true,allMorphologyValidated:false};
 if(sourceCore(data)!==before)throw Error('Morphology completion changed text/pointing/source identity');return{changed,remaining,coreHash:before};
}
function uniqueEvidence(rows){return[...new Map(rows.map(e=>[e.dictId+'/'+e.entry,e])).values()];}
function main(options={}){const seder=options.seder||'both';if(!['moed','nashim','both'].includes(seder))throw Error('Unknown seder selector');const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'mishnah-accordance-catalog.js'),'utf8'),ctx);const engine=buildEngine(),books=[],remaining=[],changes=[],baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'moed-nashim-morphology-baseline.json')));
 for(const[title,item]of Object.entries(ctx.window.MISHNAH_ACCORDANCE_CATALOG)){if(!scoped(title))continue;const isNashim=/Yevamot|Ketubot|Nedarim|Nazir|Sotah|Gittin|Kiddushin/.test(title);if(seder==='moed'&&isNashim||seder==='nashim'&&!isNashim)continue;const file=path.join(ROOT,item.file),bytes=fs.readFileSync(file),data=require(file);if(!baseline.books[title]||sourceCore(data)!==baseline.books[title].sourceCoreSha256)throw Error('Published morphology baseline source changed '+title);const result=supplementData(data,engine);data.morphologyCompletion.baselineCommit=baseline.commit;data.morphologyCompletion.baselineFileSha256=baseline.books[title].fileSha256;fs.writeFileSync(file,'// Source-preserving working edition with draft rabbinic morphology; no text or pointing edits.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.'+item.global+'=D;})('+JSON.stringify(data)+');\n');books.push({title,file:item.file,beforeFileSha256:sha(bytes),baselineFileSha256:baseline.books[title].fileSha256,afterFileSha256:sha(fs.readFileSync(file)),sourceTextHash:data.source.textHash,sourceCoreSha256:result.coreHash,forms:data.forms.length,changed:result.changed.length,remaining:result.remaining.length,statuses:data.coverage.statuses});remaining.push(...result.remaining);changes.push(...result.changed);console.log(JSON.stringify(books.at(-1)));}
 const audit={version:1,scope:seder,baselineCommit:baseline.commit,method:'Draft morphology only; text, pointing, source word IDs, annotations, transfer records and interlinear unchanged',accordance:'Deferred independent comparison; supplied Moed Accordance material retained for that next phase, never represented as new tag validation here',engine:engine.stats,engineScriptSha256:sha(fs.readFileSync(__filename)),inputs:engine.inputs,books,summary:{forms:books.reduce((s,b)=>s+b.forms,0),supplemented:changes.length,remaining:remaining.length},changes};fs.writeFileSync(path.join(__dirname,'moed-nashim-morphology-completion-'+seder+'-audit.json'),JSON.stringify(audit,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'moed-nashim-morphology-remaining-'+seder+'.json'),JSON.stringify(remaining,null,2)+'\n');console.log(JSON.stringify(audit.summary));
}
let defaultEngine;const getDefaultEngine=()=>defaultEngine||(defaultEngine=buildEngine());
module.exports={buildEngine,getDefaultEngine,supplementData,sourceCore,main};if(require.main===module)main({seder:process.argv.find(a=>a.startsWith('--seder='))?.slice(8)||'both'});
