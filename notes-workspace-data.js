(function(root){
 'use strict';
 const normalize=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').replace(/[־–—]/g,' ').toLocaleLowerCase().replace(/\s+/g,' ').trim();
 function refs(note){
  if(Array.isArray(note.refs))return note.refs;
  if(!note.key&&!note.secLabel&&!note.excerpt)return [];
  let sectionPath=[];try{sectionPath=JSON.parse(note.sk||'[]');}catch{}
  return [{label:[note.title,note.secLabel,note.vs||note.row].filter(Boolean).join(' · '),key:note.key||'',sectionPath,labels:note.set?.length?note.set.map(String):note.row?[String(note.row)]:[],quote:note.excerpt||'',citation:{work:note.title||'',locator:[note.secLabel,note.vs||note.row].filter(Boolean).join(' · ')}}];
 }
 const owner=n=>(n._store||'legacy')+':'+n.id;
 function records(legacy,state){return [...(legacy||[]).filter(n=>n.kind!=='hl').map(n=>({...n,_store:'legacy',refs:refs(n)})),...(state?.notes||[]).map(n=>({...n,_store:'research',refs:refs(n)}))];}
 function referenceLabel(r={}){return String(r.label||r.citation?.locator||'Fundstelle').replace(/ · (?:Kapitel|Chapter) (\d+) · ([\d, –—-]+)$/,' $1,$2').replace(/ · (?:Blatt|Daf) (\d+[ab]) · (.+)$/,' $1:$2');}
 const title=n=>n.noteTitle||(n.key&&refs(n).length?referenceLabel(refs(n)[0]):n.title)||'Eigene Notiz';
 const excerpt=n=>String(n.note||refs(n).find(r=>r.quote)?.quote||n.he||n.excerpt||'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\*\*?|^\s*[-•>]\s+/gm,'').trim();
 const kind=n=>!String(n.note||'').trim()&&(n.key||refs(n).length)?'bookmark':refs(n).length?'linked':'free';
 function locations(n){return refs(n).map(r=>{
  const work=r.citation?.work||(/^(.+?)\s+(?:\d|Kapitel|Chapter)/.exec(r.label||'')?.[1])||(n.key?n.title:'')||'';
  const native=/\b(?:Daf|Blatt)\s+(\d+[ab])/i.exec(r.citation?.locator||r.label||'');
  const chapter=native?.[1]||(typeof r.sectionPath?.[0]==='number'?String(r.sectionPath[0]+1):/\b(?:Kapitel|Chapter)\s+(\d+)/i.exec(r.citation?.locator||r.label||'')?.[1]||/\b(\d+):/.exec(r.label||'')?.[1]||'');
  return {work,chapter};
 });}
 function filter(items,options={},projects=[]){
  const terms=normalize(options.query).split(' ').filter(Boolean),projectMap=new Map(projects.map(p=>[p.id,p.title]));
  return items.filter(n=>{
   const project=n.projectId||'',ls=locations(n),hay=normalize([title(n),n.note,n.he,n.excerpt,projectMap.get(project),...(n.tags||[]),...(n.topics||[]),...refs(n).flatMap(r=>[r.label,r.quote,r.citation?.work,r.citation?.edition])].filter(Boolean).join(' '));
   return terms.every(t=>hay.includes(t))&&(!options.kind||options.kind==='all'||kind(n)===options.kind)&&(!options.only||!!n.note?.trim())&&(!options.project||(options.project==='none'?!project:project===options.project))&&(!options.tag||(n.tags||[]).includes(options.tag)||(n.topics||[]).includes(options.tag))&&(!options.work&&!options.chapter||ls.some(l=>(!options.work||l.work===options.work)&&(!options.chapter||l.chapter===options.chapter)));
  });
 }
 function lastNotebook(storage,projects){try{const id=storage.getItem('notesLastNotebook')||'';return projects.some(p=>p.id===id&&!p.archived)?id:'';}catch{return '';}}
 function rememberNotebook(storage,id){try{storage.setItem('notesLastNotebook',id||'');}catch{}}
 const api={normalize,refs,owner,records,title,kind,locations,filter,referenceLabel,excerpt,lastNotebook,rememberNotebook};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NotesWorkspaceData=api;
})(typeof window==='undefined'?globalThis:window);
