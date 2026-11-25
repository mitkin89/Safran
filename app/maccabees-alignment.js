(function(root){
 'use strict';
 const data=typeof module!=='undefined'&&module.exports?require('./maccabees-alignment-data'):root.MACCABEES_ALIGNMENT_DATA;
 const T=typeof module!=='undefined'&&module.exports?require('./maccabees-text'):root.MaccabeesText;
 function passages(group,docs,columns,sectionPath){
  const book=data.books?.[group.title],c=sectionPath[0],chapter=book?.chapters[c];
  if(!book||sectionPath.length!==1||!chapter||docs.length<2)return null;
  const families=docs.map((d,i)=>book.sources.find(s=>s.title===(d.entry?.title||d.title)&&s.textHash===d.textHash&&s.chapters[c]?.signature===T.signature(columns[i]))?.family);
  if(families.some(f=>f===undefined))return null;
  const groups=new Set(families).size===1?Array.from({length:book.sources.find(s=>s.family===families[0]).chapters[c].slots},(_,i)=>families.map(()=>[i+1,i+1])):
   chapter.groups.map(ranges=>families.map(f=>ranges[f]));
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
