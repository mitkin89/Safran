(function(root){
 'use strict';
 const data=typeof module!=='undefined'&&module.exports?require('./maccabees-alignment-data'):root.MACCABEES_ALIGNMENT_DATA;
 const T=typeof module!=='undefined'&&module.exports?require('./maccabees-text'):root.MaccabeesText;
 const C=typeof module!=='undefined'&&module.exports?require('./maccabees-compose'):root.MaccabeesCompose;
 function selectedGroups(book,chapter,c,families){
  // Retain only the smallest connected source tree needed by this selection.
  // An unselected edition must not broaden otherwise matching verse rows.
  const selected=new Set(families),edges=chapter.pairs.slice();
  for(let changed=true;changed;){
   changed=false;const degrees=new Map();
   edges.forEach(e=>e.families.forEach(f=>degrees.set(f,(degrees.get(f)||0)+1)));
   for(let i=edges.length-1;i>=0;i--)if(edges[i].families.some(f=>degrees.get(f)===1&&!selected.has(f))){edges.splice(i,1);changed=true;}
  }
  const needed=new Set(edges.flatMap(e=>e.families));
  const counts=book.sources.map(s=>needed.has(s.family)?s.chapters[c].slots:0);
  return C.compose(counts,edges);
 }
 function passages(group,docs,columns,sectionPath){
  const book=data.books?.[group.title],c=sectionPath[0],chapter=book?.chapters[c];
  if(!book||sectionPath.length!==1||!chapter||docs.length<2)return null;
  const families=docs.map((d,i)=>book.sources.find(s=>s.title===(d.entry?.title||d.title)&&s.textHash===d.textHash&&s.chapters[c]?.signature===T.signature(columns[i]))?.family);
  if(families.some(f=>f===undefined))return null;
  const groups=new Set(families).size===1?Array.from({length:book.sources.find(s=>s.family===families[0]).chapters[c].slots},(_,i)=>families.map(()=>[i+1,i+1])):
   selectedGroups(book,chapter,c,families).map(ranges=>families.map(f=>ranges[f]));
  return groups.map(ranges=>{
   ranges.continuations=families.map((f,i)=>{
    if(ranges[i][0])return null;
    const link=chapter.continuations.find(({from,to})=>to.family===f&&families.some((sf,j)=>sf===from.family&&ranges[j][0]<=from.range[0]&&ranges[j][1]>=from.range[1]));
    return link?.to||null;
   });return ranges;
  });
 }
 const api={passages};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaccabeesAlignment=api;
})(typeof window==='undefined'?globalThis:window);
