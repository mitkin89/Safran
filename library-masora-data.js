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
  const locationCache=new WeakMap();
  function locations(page,entry){
    if(!locationCache.has(page))locationCache.set(page,new Map());
    const cache=locationCache.get(page);if(cache.has(entry.uuid))return cache.get(entry.uuid);
    const label=String(entry.label||'').trim(),needle=wordTokens(label),found=[];
    // A source label containing editorial prose or alternative lemmas has no safe phrase match.
    if(needle.length&&/^[\u0590-\u05ff\s]+$/.test(label)){
      for(const c of page.contexts.filter(c=>c.type==='BibleText'))for(const r of c.readings){
        if(r.references?.length!==1)continue;
        const ref=bibleRef(r.references[0].label);if(!ref||ref.chapter!==ref.endChapter||ref.verse!==ref.endVerse)continue;
        const words=wordTokens(text(r));
        for(let i=0;i<=words.length-needle.length;i++)if(needle.every((w,j)=>words[i+j]===w)){
          found.push({...ref,label:ref.book+' '+ref.chapter+':'+ref.verse,phrase:label,sourceReading:r.uuid,wordIndex:i});
        }
      }
    }
    cache.set(entry.uuid,found);return found;
  }
  function forVerse(hits,ctx){
    const primary=[],related=[];
    for(const hit of hits){
      const matches=locations(hit.page,hit.entry),h={...hit,locations:matches};
      if(matches.length===1&&matches[0].book===ctx.book&&matches[0].chapter===ctx.chapter&&matches[0].verse===ctx.verse)primary.push(h);
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
  // Conservative reading aid, separate from the unchanged source transcription.
  // A count is recognized only as a complete numeral note or an explicit list heading.
  function explain(entry){
    const lines=(entry.readings||[]).map(text),first=lines[0]||'',clean=fold(first).replace(/[׳״'"·]/g,'').trim();
    const list=/וסימנ(?:יהון|הון|ין|ים)/.test(clean),number=list?clean.match(/(?:^|\s)([אבגדהוזחט])\s+וסימנ/):clean.match(/^([אבגדהוזחט])$/);
    const count=number?'אבגדהוזחט'.indexOf(number[1])+1:null;
    const refs=[...new Set((entry.readings||[]).flatMap(r=>(r.references||[]).map(x=>x.label)))];
    const meaning=count?'Die Notiz nennt '+count+' Vorkommen der bezeichneten Form oder Wortgruppe'+(list?' und führt dazu Erkennungszitate auf.':'.'):list?'Die Notiz führt Erkennungszitate zu den aufgezählten Vorkommen auf.':'Für diese Notiz liegt noch keine gesicherte deutsche Einzelerklärung vor.';
    const features=[];
    if(/(?:^|\s)מלא(?:\s|$)/.test(clean))features.push('Die Notiz bezeichnet eine volle Schreibung mit Vokalbuchstaben.');
    if(/(?:^|\s)חסר(?:\s|$)/.test(clean))features.push('Die Notiz bezeichnet eine defektive Schreibung ohne den betreffenden Vokalbuchstaben.');
    if(/(?:^|\s)(?:קרי|כתיב)(?:\s|$)/.test(clean))features.push('Die Notiz betrifft die geschriebene beziehungsweise die überlieferte gelesene Form (Ketiv/Qere).');
    return {meaning,count,list,refs,features};
  }
  function wordGroups(hits){
    const groups=new Map();
    for(const hit of hits){const loc=locations(hit.page,hit.entry),key=loc.length===1?loc[0].label+'|'+wordTokens(hit.entry.label).join(' '):hit.page.id+'|'+hit.entry.uuid;
      if(!groups.has(key))groups.set(key,{label:hit.entry.label,location:loc.length===1?loc[0]:null,hits:[]});groups.get(key).hits.push(hit);
    }
    return [...groups.values()].sort((a,b)=>(a.location?.chapter??Infinity)-(b.location?.chapter??Infinity)||(a.location?.verse??Infinity)-(b.location?.verse??Infinity)||(a.location?.wordIndex??Infinity)-(b.location?.wordIndex??Infinity));
  }
  const api={pageIds,manuscripts,text,prose,referenceSummary,query,bibleRef,covers,locations,forVerse,wordTokens,explain,wordGroups};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MasoraData=api;
})(typeof window!=='undefined'?window:globalThis);
