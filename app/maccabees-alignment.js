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

 // Split a checked raw-HTML interval while carrying formatting across cuts.
 // Footnotes remain with the interval containing their original markup.
 function fragmentHtml(html,start=0,end=html.length){
  if(start===0&&end===html.length)return html;
  const stack=[],voids=new Set(['br','hr','img','input','meta','link','wbr','area','base','col','embed','param','source','track']);
  let before=[],after=[];const tags=[...html.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi)];
  for(const m of tags){
   const at=m.index,to=at+m[0].length;
   if(at<start&&to>start||at<end&&to>end)throw Error('Maccabees boundary inside HTML tag');
   if(to<=start){apply(m);before=stack.slice();}
   else if(to<=end)apply(m);
  }
  after=stack;
  function apply(m){const name=m[1].toLowerCase();if(voids.has(name)||/\/\s*>$/.test(m[0]))return;if(/^<\//.test(m[0])){const i=stack.map(t=>t.name).lastIndexOf(name);if(i>=0)stack.splice(i);}else stack.push({name,tag:m[0]});}
  return before.map(t=>t.tag).join('')+html.slice(start,end)+after.slice().reverse().map(t=>'</'+t.name+'>').join('');
 }
 function verseRows(group,docs,columns,sectionPath){
  const book=data.books?.[group.title],c=sectionPath[0],chapter=book?.chapters[c];
  if(!book?.canonical||sectionPath.length!==1||!chapter)return null;
  const families=docs.map((d,i)=>book.sources.find(s=>s.title===(d.entry?.title||d.title)&&s.textHash===d.textHash&&s.chapters[c]?.signature===T.signature(columns[i]))?.family);
  if(families.some(f=>f===undefined))return null;
  const total=book.sources.find(s=>s.family===1).chapters[c].slots;
  const rows=Array.from({length:total},(_,i)=>({label:String(i+1),cells:docs.map(()=>null)}));
  docs.forEach((doc,i)=>{
   const family=families[i],partsByVerse=Array.from({length:total},()=>[]);
   const native=(slot,ch=c+1)=>ch===c+1?columns[i].find(r=>Number(r.label)===slot)?.html||'':String(doc.text[ch-1]?.[slot-1]||'');
   const add=(v,slot,start=0,end,sourceChapter=c+1)=>{const html=native(slot,sourceChapter);end=end??html.length;if(!html||start===end)return;if(v<1||v>total||start<0||end>html.length||start>end)throw Error('Invalid checked Maccabees verse boundary');partsByVerse[v-1].push({slot,chapter:sourceChapter,start,end,html});};
   if(family===1)columns[i].forEach(r=>add(Number(r.label),Number(r.label)));
   else {
    const groups=selectedGroups(book,chapter,c,[family,1]);
    for(const g of groups){const [a,b]=g[1],[from,to]=g[family];if(a!==b||!a||!from)continue;for(let slot=from;slot<=to;slot++)add(a,slot);}
    for(const o of book.canonical[family]||[])if(o.chapter===c+1){
     if(o.parts.length!==o.greek[1]-o.greek[0]+1)throw Error('Incomplete canonical Maccabees override');
     for(let v=o.greek[0];v<=o.greek[1];v++)partsByVerse[v-1]=[];
     o.parts.forEach((parts,j)=>parts.forEach(([slot,start,end,ch])=>add(o.greek[0]+j,slot,start,end,ch)));
    }
    // A different chapter division is displayed at its canonical verse,
    // retaining the original chapter as source provenance.
    for(const link of chapter.continuations)if(link.from.family===1&&link.to.family===family){
     const v=link.from.range[0];if(!partsByVerse[v-1].length)for(let slot=link.to.range[0];slot<=link.to.range[1];slot++)add(v,slot,0,undefined,link.to.chapter);
    }
   }
   partsByVerse.forEach((parts,v)=>{if(parts.length)rows[v].cells[i]={parts,html:parts.map(p=>fragmentHtml(p.html,p.start,p.end)).join(' ')};});
  });
  return rows;
 }
 const api={passages,verseRows,fragmentHtml};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaccabeesAlignment=api;
})(typeof window==='undefined'?globalThis:window);
