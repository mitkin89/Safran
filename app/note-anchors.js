(function(root){
 'use strict';
 const owner=n=>(n._store||'legacy')+':'+n.id;
 const signature=(key,sk,row)=>JSON.stringify([key,sk,String(row)]);
 function index(notes,groups){
  const byKey=new Map((groups||[]).map(g=>[g.key,g])),byRel=new Map();for(const g of groups||[])for(const v of g.versions||[])byRel.set(v.rel,g);
  const result=new Map();
  const add=(n,key,path,labels)=>{if(!key||!Array.isArray(path)||path.some(x=>typeof x!=='string'&&!Number.isInteger(x)))return;const sk=JSON.stringify(path);for(const label of labels||[]){if(label==null||String(label)==='')continue;const k=signature(key,sk,label),items=result.get(k)||[];if(!items.some(x=>owner(x)===owner(n)))items.push(n);result.set(k,items);}};
  for(const n of notes||[]){if(n.kind==='hl')continue;
   if(n.key&&n.sk&&n.row&&n.kind!=='block'){try{add(n,n.key,JSON.parse(n.sk),[n.row]);}catch{}}
   if(n.key&&n.sk&&n.kind==='block'&&n.set){try{add(n,n.key,JSON.parse(n.sk),n.set);}catch{}}
   for(const r of n.refs||[]){const relGroup=byRel.get(r.rel),keyGroup=byKey.get(r.key);if(relGroup&&keyGroup&&relGroup.key!==keyGroup.key)continue;const group=relGroup||keyGroup;if(group)add(n,group.key,r.sectionPath,r.labels);}
  }
  return result;
 }
 const api={index,signature,owner};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NoteAnchors=api;
})(typeof window==='undefined'?globalThis:window);
