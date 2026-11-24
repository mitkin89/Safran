// Source references in masoretic lists are citations, not automatically the note's target verse.
(function(root){
  'use strict';
  const fold=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f]/g,'').toLowerCase();
  const MASORA=new Set(['mp','mm','mf']);
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
  const api={pageIds,manuscripts,text,prose,referenceSummary,query};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MasoraData=api;
})(typeof window!=='undefined'?window:globalThis);
