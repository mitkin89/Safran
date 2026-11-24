// Source references in masoretic lists are citations, not automatically the note's target verse.
(function(root){
  'use strict';
  const fold=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f]/g,'').toLowerCase();
  const MASORA=new Set(['mp','mm','mf']);
  // Word matches support navigation; they are not publisher-confirmed note anchors.
  const BOOKS={"Gen":"Genesis","Ge":"Genesis","Ex":"Exodus","Exod":"Exodus","Lev":"Leviticus","Lv":"Leviticus","Num":"Numbers","Nu":"Numbers","Deut":"Deuteronomy","Dt":"Deuteronomy","Dtn":"Deuteronomy","Jos":"Joshua","Josh":"Joshua","Jdg":"Judges","Judg":"Judges","Jud":"Judges","Ruth":"Ruth","Rt":"Ruth","1Sam":"I Samuel","1 Sam":"I Samuel","I Sam":"I Samuel","2Sam":"II Samuel","2 Sam":"II Samuel","II Sam":"II Samuel","1 Kings":"I Kings","2 Kings":"II Kings","1 Chronicles":"I Chronicles","2 Chronicles":"II Chronicles","1 Samuel":"I Samuel","2 Samuel":"II Samuel","1Kgs":"I Kings","1 Kgs":"I Kings","I Kings":"I Kings","2Kgs":"II Kings","2 Kgs":"II Kings","II Kings":"II Kings","1Chr":"I Chronicles","1 Chr":"I Chronicles","2Chr":"II Chronicles","2 Chr":"II Chronicles","Ezra":"Ezra","Esr":"Ezra","Neh":"Nehemiah","Esth":"Esther","Est":"Esther","Job":"Job","Hi":"Job","Ps":"Psalms","Psa":"Psalms","Prov":"Proverbs","Pr":"Proverbs","Prv":"Proverbs","Eccl":"Ecclesiastes","Qoh":"Ecclesiastes","Song":"Song of Songs","Cant":"Song of Songs","Isa":"Isaiah","Is":"Isaiah","Jes":"Isaiah","Jer":"Jeremiah","Lam":"Lamentations","Ezek":"Ezekiel","Ez":"Ezekiel","Dan":"Daniel","Dn":"Daniel","Hos":"Hosea","Joel":"Joel","Amos":"Amos","Am":"Amos","Obad":"Obadiah","Ob":"Obadiah","Jonah":"Jonah","Jon":"Jonah","Mic":"Micah","Mi":"Micah","Nah":"Nahum","Hab":"Habakkuk","Zeph":"Zephaniah","Zech":"Zechariah","Hag":"Haggai","Mal":"Malachi","Genesis":"Genesis","Exodus":"Exodus","Leviticus":"Leviticus","Numbers":"Numbers","Deuteronomy":"Deuteronomy","Joshua":"Joshua","Judges":"Judges","I Samuel":"I Samuel","II Samuel":"II Samuel","I Chronicles":"I Chronicles","II Chronicles":"II Chronicles","Nehemiah":"Nehemiah","Esther":"Esther","Psalms":"Psalms","Proverbs":"Proverbs","Ecclesiastes":"Ecclesiastes","Song of Songs":"Song of Songs","Isaiah":"Isaiah","Jeremiah":"Jeremiah","Lamentations":"Lamentations","Ezekiel":"Ezekiel","Daniel":"Daniel","Hosea":"Hosea","Obadiah":"Obadiah","Micah":"Micah","Nahum":"Nahum","Habakkuk":"Habakkuk","Zephaniah":"Zephaniah","Zechariah":"Zechariah","Haggai":"Haggai","Malachi":"Malachi"};
  const wordTokens=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05bd\u05bf-\u05c2\u05c4-\u05c7]/g,'').match(/[\u05d0-\u05ea]+/g)||[];
  function bibleRef(label){
    const m=/^(.+?)\.?\s+(\d+):(\d+)(?:\s*[-–]\s*(?:(\d+):)?(\d+))?$/.exec(String(label||'').trim());
    return m&&BOOKS[m[1]]?{book:BOOKS[m[1]],chapter:+m[2],verse:+m[3],endChapter:+(m[4]||m[2]),endVerse:+(m[5]||m[3])}:null;
  }
  function covers(page,ctx){
    return page.bibleRefs.some(label=>{const r=bibleRef(label);return r&&r.book===ctx.book&&ctx.chapter>=r.chapter&&ctx.chapter<=r.endChapter&&(ctx.chapter!==r.chapter||ctx.verse>=r.verse)&&(ctx.chapter!==r.endChapter||ctx.verse<=r.endVerse);});
  }
  // Bibliographic suffixes are metadata, not part of the Hebrew head. Unknown prose stays unresolved.
  const matchTokens=s=>wordTokens(s).map(w=>w.replace(/^([ובכלמשה]{0,2})(?:יי|ייי)$/u,'$1יהוה'));
  const citationWords=new Set(('Gins Ginsburg OH OP Okhla Okhlah OkhlaH Halle Paris Ognibeni Weil Aleph Alef Ayin Yod Mem Shin Nun Resh Bet Beth Chet Qof Lamed Lamaed He Samekh Tet Pe Caph Kaf Khaf Dalet Gimel Zayin Tav Daleth Tzade Zajin Sin Tsade Waw Vav Kaph Taw Samech Tsadi Peh Ajin Qoph Yud Het Heh Quf Zain Tzadi Gimael Gimmel Dalaeth Jod reish kuf resh sameh het hei ain zain tzadi kof pei quf tsade chet caf cf Part of p pp vol bis Supp Supplement Suppl Sup M I II III IV and et al Margin Marginal List Ms tiqqunim Tiqqunim nosafot Nusafot Halufim Hilufim f r l v').toLowerCase().split(' '));
  function labelTarget(value){
    let label=String(value||'').replace(/\ufeff/g,'').trim().replace(/\s+\(M\d+\)(?:\+{1,2})?$/u,'').replace(/\s+Repeated(?:,)?(?=\s|$)/u,'');
    const citation=/[ _,]+((?:Part of )?(?:Gins(?:burg|\.)?|OH\d*|OP|Okhla\w*|Weil|Ognibeni)\b.*)$/iu.exec(label);
    if(citation){
      const tail=citation[1].normalize('NFD').replace(/\p{M}/gu,''),words=tail.match(/[A-Za-z]+/g)||[];
      if(!/[#§]\s*\d|\bp\.\s*\d/.test(tail)||!/^[A-Za-z0-9\s.,;:#§/()[\]\u0026–—_+\-]+$/.test(tail)||!words.every(w=>citationWords.has(w.toLowerCase())||/^[A-Z]{1,2}$/.test(w)))return null;
      label=label.slice(0,citation.index).trim();
    }
    let reference=null,numberTag=null;
    const parseReference=raw=>{
      const normalized=raw.replace(/\s*[:,]\s*/g,':'),pair=/^(\d+):(\d+)$/.exec(normalized);
      return pair?{chapter:+pair[1],verse:+pair[2]}:bibleRef(normalized);
    };
    const leading=/^\(?((?:[A-Za-z][A-Za-z .]*\s+)?\d+\s*[:,]\s*\d+)\)?\s+(.+)$/u.exec(label);
    const trailing=/^(.+?)\s+\(?((?:[A-Za-z][A-Za-z .]*\s+)?\d+\s*[:,]\s*\d+)\)?$/u.exec(label);
    if(leading){reference=parseReference(leading[1]);if(!reference)return null;label=leading[2];}
    else if(trailing){reference=parseReference(trailing[2]);if(!reference)return null;label=trailing[1];}
    // Numeric note identifiers are retained, not interpreted as occurrence ordinals.
    // As elsewhere, every exact spelling match is offered as a browsing target.
    const numbered=/^(.+?)\s+\((\d+)\)$/u.exec(label);
    if(numbered){label=numbered[1];numberTag=+numbered[2];}
    label=label.replace(/-/g,'־');
    const parsed=/^([\u0590-\u05ff\s]+?)(?:\s+\(([\u0590-\u05ff\s]+)\))?$/u.exec(label);
    if(!parsed)return null;
    const phrase=parsed[1].trim(),head=wordTokens(phrase),needle=wordTokens(parsed[2]||phrase),offsets=[];
    for(let i=0;i<=needle.length-head.length;i++)if(head.length&&head.every((w,j)=>needle[i+j]===w))offsets.push(i);
    return offsets.length===1?{phrase,head,needle,offset:offsets[0],...(reference?{reference}:{}),...(numberTag!==null?{numberTag}:{})}:null;
  }
  const matchingLabel=value=>{const target=labelTarget(value);return target?wordTokens(target.phrase).join(' '):'';};
  const targetMatches=(target,ref)=>!target.reference||((!target.reference.book||target.reference.book===ref.book)&&target.reference.chapter===ref.chapter&&target.reference.verse===ref.verse);
  const sourceSnapshot=page=>JSON.stringify(page.contexts.filter(c=>c.type==='BibleText').flatMap(c=>c.readings.map(r=>[r.uuid,text(r),r.references])));
  const locationCache=new WeakMap();let wordLinks=null;
  function setWordLinks(data){if(data?.schema!==1)throw Error('Unsupported Masorah word links');wordLinks=data;}
  function locations(page,entry){
    const source=sourceLocations(page,entry);if(source.length)return source;
    const link=wordLinks?.notes?.[entry.uuid];
    return link&&link.page===page.id&&link.label===entry.label&&link.coverage===page.bibleRefs.join('|')&&link.sourceSnapshot===sourceSnapshot(page)?link.locations:source;
  }
  function sourceLocations(page,entry){
    if(!locationCache.has(page))locationCache.set(page,new Map());
    const cache=locationCache.get(page);if(cache.has(entry.uuid))return cache.get(entry.uuid);
    const target=labelTarget(entry.label),found=[];
    if(target){
      const {phrase,needle,offset}=target;
      for(const c of page.contexts.filter(c=>c.type==='BibleText'))for(const r of c.readings){
        if(r.references?.length!==1)continue;
        const ref=bibleRef(r.references[0].label);if(!ref||ref.chapter!==ref.endChapter||ref.verse!==ref.endVerse||!targetMatches(target,ref))continue;
        const words=wordTokens(text(r));
        for(let i=0;i<=words.length-needle.length;i++)if(needle.every((w,j)=>words[i+j]===w)){
          found.push({...ref,label:ref.book+' '+ref.chapter+':'+ref.verse,phrase,sourceReading:r.uuid,wordIndex:i+offset});
        }
      }
    }
    cache.set(entry.uuid,found);return found;
  }
  function forVerse(hits,ctx){
    const primary=[],related=[];
    for(const hit of hits){
      const matches=locations(hit.page,hit.entry),verseLocations=matches.filter(m=>m.book===ctx.book&&m.chapter===ctx.chapter&&m.verse===ctx.verse),h={...hit,locations:matches,verseLocations};
      if(verseLocations.length)primary.push(h);
      else related.push(h);
    }
    return {primary,related};
  }
  function pageIds(index,context,scope='chapter'){
    if(scope==='all')return null;
    if(scope==='citations')return new Set((index.citations?.[context.book+' '+context.chapter]||[]).map(row=>row[1]));
    const keys=scope==='book'?Object.keys(index.chapters).filter(k=>k.startsWith(context.book+' ')):[context.book+' '+context.chapter];
    return new Set(keys.flatMap(k=>(index.chapters[k]||[]).map(pair=>pair[1])));
  }
  function manuscripts(index,ids){
    if(ids===null)return index.manuscripts.map(m=>m.id);
    return [...new Set([...ids].map(id=>index.pages[id]?.manuscript).filter(Boolean))];
  }
  function text(reading){
    if(typeof reading.text==='string'&&reading.text.trim())return reading.text;
    // Text paths can supply a transcription when the source has no combined reading text.
    return (reading.features||[]).filter(f=>f.status!==-1).map(f=>f.pathText??f.text??'').join(' ').trim();
  }
  function prose(value){
    if(value==null)return '';
    if(typeof value==='string')return value;
    if(Array.isArray(value))return value.map(prose).filter(Boolean).join('\n');
    // Display source-authored prose, without account metadata, style or geometry.
    return ['title','label','text','content','body','description','translation','comment','value'].filter(k=>typeof value[k]==='string').map(k=>value[k]).join('\n');
  }
  function referenceSummary(refs){
    const groups=[];
    for(const label of refs){
      const match=/^(.+?) (\d+):(\d+)$/.exec(label),last=groups.at(-1);
      if(match&&last?.book===match[1]&&last.chapter===match[2]&&Number(match[3])===last.end+1)last.end++;
      else groups.push(match?{book:match[1],chapter:match[2],start:Number(match[3]),end:Number(match[3])}:{literal:label});
    }
    return groups.map(g=>g.literal??g.book+' '+g.chapter+':'+g.start+(g.end>g.start?'–'+g.end:'')).join(' · ');
  }
  function query(index,datasets,context,{scope='chapter',manuscript='',type='masora',q=''}={}){
    const ids=pageIds(index,context,scope),words=fold(q).split(/\s+/).filter(Boolean),hits=[];
    const cited=scope==='citations'?new Set((index.citations?.[context.book+' '+context.chapter]||[]).map(row=>row[1]+'|'+row[2])):null;
    for(const meta of index.manuscripts){
      if(manuscript&&meta.id!==manuscript)continue;
      for(const page of datasets[meta.id]?.pages||[]){
        if(ids!==null&&!ids.has(page.id))continue;
        if(scope==='verse'&&context.verse&&!covers(page,context))continue;
        for(const entry of page.contexts){
          if(entry.type==='BibleText'||cited&&!cited.has(page.id+'|'+entry.uuid))continue;
          if(type==='masora'?!MASORA.has(entry.type):type&&entry.type!==type)continue;
          const readings=entry.readings.map(r=>({source:r,text:text(r),notes:prose(r.notes)}));
          if(!readings.some(r=>r.text||r.notes)&&!prose(entry.notes))continue;
          const hay=fold([meta.label,page.label,entry.label,entry.description,prose(entry.notes),...readings.flatMap(r=>[r.text,r.notes,...(r.source.references||[]).map(x=>x.label)])].join(' '));
          if(words.every(w=>hay.includes(w)))hits.push({manuscript:meta,page,entry,readings});
        }
      }
    }
    return hits;
  }
  // A source-based reading aid, kept separate from the unchanged transcription.
  function numeral(value){
    const s=fold(value).replace(/[׳״'"·]/g,'');
    if(!s||s==='ל'||!/^[א-ת]+$/.test(s))return null;
    const values={א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ל:30,מ:40,נ:50,ס:60,ע:70,פ:80,צ:90,ק:100,ר:200,ש:300,ת:400};
    // Standard descending numeral groups; admit the traditional 15/16 spellings.
    if(!/^ת{0,2}[שרק]?(?:[צפעסנמלכ][אבגדהוזחט]?|י[אבגדהוזחט]?|ט[וז]|[אבגדהוזחט])?$/.test(s))return null;
    const n=[...s].reduce((sum,c)=>sum+values[c],0);return n>0&&n<1000?n:null;
  }
  function explain(entry){
    const readings=entry.readings||[],lines=readings.map(text),first=lines[0]||'',label=String(entry.label||'').trim();
    let tokens=first.trim().split(/\s+/).filter(Boolean);
    const labelTokens=label.split(/\s+/).filter(Boolean);
    if(labelTokens.length&&labelTokens.every((w,i)=>fold(w)===fold(tokens[i]||'')))tokens=tokens.slice(labelTokens.length);
    const head=tokens.join(' '),clean=fold(head).replace(/[׳״'"·]/g,'').trim(),parts=clean.split(/\s+/).filter(Boolean);
    const list=/וסימנ(?:יהון|הון|ין|ים)|(?:^|\s)סימן(?:\s|$)/.test(clean);
    const explicit=/[\u05c4\u05c5\u0307׳'״"]/.test(tokens[0]||'');
    const standalone=parts.length===1,unique=parts[0]==='ל'||parts[0]==='לית';
    const lexical=new Set(['ק','מלא','מל','חסר','חס','רפה','רפי','רפ','קרי','כתיב','סימן','שם','כת','כות']);
    const numeric=!lexical.has(parts[0])&&((standalone&&parts[0]?.length===1)||explicit||list);
    const listNumber=list?clean.match(/(?:^|\s)([א-ת]{1,3})\s+וסימנ/):null;
    const count=unique?1:listNumber?numeral(listNumber[1]):numeric?numeral(tokens[0]||''):null;
    const refs=[...new Set(readings.flatMap(r=>(r.references||[]).map(x=>x.label)))];
    const features=[],recognized=new Set();
    function feature(pattern,description){if(pattern.test(clean)){features.push(description);for(let i=1;i<parts.length;i++)if(pattern.test(parts[i]))recognized.add(i);}}
    const isFormula=count!==null||list||parts.length<=4;
    if(isFormula){
      feature(/(?:^|\s)(?:ו?חסר|ו?חס)(?:\s|$)/,'Die Notiz kennzeichnet eine defektive Form, gewöhnlich eine Schreibung mit weniger Vokalbuchstaben. Welche Stelle betroffen ist, muss am Beleg geprüft werden.');
      feature(/(?:^|\s)(?:ו?מלא|ו?מל)(?:\s|$)/,'Die Notiz kennzeichnet die Form als voll geschrieben, gewöhnlich mit Vokalbuchstaben.');
      feature(/(?:^|\s)(?:קרי|כתיב)(?:\s|$)/,'Die Notiz unterscheidet die geschriebene und die überlieferte gelesene Form (Ketiv/Qere).');
      feature(/(?:^|\s)(?:רפה|רפי)(?:\s|$)/,'Die Notiz kennzeichnet die Aussprache ohne Dagesch (Rafe).');
      feature(/(?:^|\s)דס(?:מיך|מיכין)?(?:\s|$)/,'Die Zählung betrifft genau diese zusammenhängende Wortverbindung.');
      if(/ר[\u05c4\u05c5\u0307״"']+פ/.test(head))feature(/(?:^|\s)רפ(?:\s|$)/,'Die Zählung betrifft Vorkommen am Versanfang.');
      feature(/(?:^|\s)(?:דגש|דגוש)(?:\s|$)/,'Die Notiz kennzeichnet eine Form mit Dagesch.');
      feature(/(?:^|\s)(?:כת|וכת) כן(?:\s|$)/,'Die Notiz hebt die hier überlieferte Schreibung ausdrücklich hervor.');
      const vowels={פתח:'Patach',קמץ:'Qamets',סגול:'Segol',חירק:'Chireq',צירי:'Tsere',חולם:'Cholem',שורק:'Schureq',קבוץ:'Qibbuts',שוא:'Schewa'};
      for(const [he,de]of Object.entries(vowels))feature(new RegExp('(?:^|\\s)ב?'+he+'(?:\\s|$)'),'Die Notiz betrifft die Vokalisierung mit '+de+'.');
    }
    const qualifier=count!==null&&!list&&parts.length>1;
    const messages=[];
    if(unique)messages.push('Die Notiz bezeichnet die Form oder Wortverbindung als einmalig'+(qualifier?' unter den zusätzlich genannten Bedingungen.':'.'));
    else if(count!==null)messages.push('Die Notiz zählt '+count+' Vorkommen'+(qualifier?' unter den zusätzlich genannten Bedingungen.':' der bezeichneten Form oder Wortgruppe.'));
    if(list)messages.push('Die folgenden Zitate sind Erkennungsstellen der aufgezählten Vorkommen.');
    if(features.length)messages.push(...features);
    const unresolved=qualifier&&parts.slice(1).some((w,i)=>!recognized.has(i+1));
    if(unresolved)messages.push('Die zusätzliche Einschränkung der Zählung ist noch nicht vollständig bestimmt.');
    if(refs.length)messages.push('Die verlinkten Bibelstellen sind Vergleichsbelege der Notiz; sie bezeichnen nicht automatisch ihren Ort in der Handschrift.');
    if(!messages.length)messages.push(label?'Die Notiz gehört zum Bezugswort „'+label+'“.':'Die Notiz ist ohne eindeutig bezeichnetes Bezugswort überliefert.');
    const partial=unresolved||(count===null&&!list&&!features.length);
    if(count===null&&!list&&!features.length)messages.push('Die einzelnen Aussagen dieser Notiz sind noch nicht zuverlässig ins Deutsche übertragen. Der Originaltext bleibt für die Prüfung sichtbar.');
    return {meaning:messages.join(' '),count,list,refs,features,partial};
  }
  function wordGroups(hits){
    const groups=new Map();
    for(const hit of hits){const loc=hit.verseLocations?.length?hit.verseLocations:locations(hit.page,hit.entry),number=labelTarget(hit.entry.label)?.numberTag,key=loc.length&&new Set(loc.map(m=>m.label)).size===1?loc[0].label+'|'+wordTokens(hit.entry.label).join(' ')+(number!==undefined?'|note:'+number:''):hit.page.id+'|'+hit.entry.uuid;
      if(!groups.has(key))groups.set(key,{label:hit.entry.label,location:loc.length&&new Set(loc.map(m=>m.label)).size===1?loc[0]:null,hits:[]});groups.get(key).hits.push(hit);
    }
    return [...groups.values()].sort((a,b)=>(a.location?.chapter??Infinity)-(b.location?.chapter??Infinity)||(a.location?.verse??Infinity)-(b.location?.verse??Infinity)||(a.location?.wordIndex??Infinity)-(b.location?.wordIndex??Infinity));
  }
  const api={matchingLabel,labelTarget,targetMatches,sourceLocations,sourceSnapshot,setWordLinks,matchTokens,pageIds,manuscripts,text,prose,referenceSummary,query,bibleRef,covers,locations,forVerse,wordTokens,explain,wordGroups};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MasoraData=api;
})(typeof window!=='undefined'?window:globalThis);
