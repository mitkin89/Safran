'use strict';
// Display source-attested alignments, never synonyms inferred from dictionary glosses.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const R=require('./reader'),PA=require('./peshitta-alignment');
const digest=d=>crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex');
const heWords=html=>[...String(html||'').matchAll(/<span class="w"[^>]*>(.*?)<\/span>/g)].map(m=>m[1].replace(/<[^>]+>/g,''));
const cons=s=>String(s).replace(/[^א-ת]/g,'');
async function attach({dir,entries,results,isCancelled=()=>false,alignmentRoot=__dirname,canonicalDir=path.join(__dirname,'bundled')}){
 const C=require('./concordance'),byBook=new Map(),cache=new Map(),loaded=new Map();
 for(const e of entries){const group=byBook.get(e.title)||[];group.push(e);byBook.set(e.title,group);}
 async function read(e){if(!e)return null;if(!cache.has(e.rel))cache.set(e.rel,fs.readFile(path.join(dir,e.rel),'utf8').then(JSON.parse).then(d=>({...d,entry:e,textHash:digest(d)})).catch(()=>null));return cache.get(e.rel);}
 async function canonical(d){if(!d)return false;try{const original=JSON.parse(await fs.readFile(path.join(canonicalDir,d.entry.rel),'utf8'));return digest(original)===d.textHash;}catch{return false;}}
 async function ps(title){const f=PA.file(title);if(!loaded.has(f)){try{const w={};new Function('window',await fs.readFile(path.join(alignmentRoot,f),'utf8'))(w);loaded.set(f,w.PESHITTA_ALIGNMENT_DATA||{version:2,books:w.PESHITTA_ALIGNMENT_BOOKS});}catch{loaded.set(f,null);}}return PA.book(loaded.get(f),title);}
 const prepared=new Map();
 async function prepare(title){
  if(prepared.has(title))return prepared.get(title);
  const es=byBook.get(title)||[],h=await read(es.find(e=>e.kind==='he'&&/^Westminster/.test(e.versionTitle||''))),g=await read(es.find(e=>/^Septuaginta \(CATSS/.test(e.versionTitle||''))),s=await read(es.find(e=>e.language==='Syriac'&&/^ETCBC Peshitta/.test(e.versionTitle||'')));
  const data=s&&h&&PA.has(title)?await ps(title):null,sy=data&&PA.prepare(data,h,s)?data:null;
  const gr=h&&g&&await canonical(h)&&await canonical(g)?g:null;
  const out={h,g:gr,s:sy?s:null,sy};prepared.set(title,out);return out;
 }
 function greekGroups(h,g,c,v){
  const html=g.text[c]?.[v];if(typeof html!=='string')return [];
  const hw=heWords(h.text[c]?.[v]),out=[];let cursor=0,offset=0;
  const supplied=[...html.matchAll(/data-h="([^"]*)"/g)].map(m=>cons(m[1])).join('');
  if(supplied!==hw.map(cons).join(''))return [];
  for(const m of html.matchAll(/<span class="wg\b[^"]*"([^>]*)>([\s\S]*?)<\/span>/g)){
   const text=C.textOf(m[2]),count=C.tokens(text).length,want=cons(m[1].match(/data-h="([^"]*)"/)?.[1]||'');let ix=[];
   if(want){outer:for(let i=cursor;i<Math.min(hw.length,cursor+8);i++){let joined='';for(let j=i;j<Math.min(hw.length,i+5);j++){joined+=cons(hw[j]);if(joined===want){ix=Array.from({length:j-i+1},(_,k)=>i+k+1);cursor=j+1;break outer;}if(!want.startsWith(joined))break;}}}
   out.push({text,ix,positions:Array.from({length:count},(_,i)=>offset+i+1)});offset+=count;
  }
  // Text outside the supplied groups must not shift occurrence numbers.
  if(offset!==C.tokens(C.textOf(html)).length)return [];
  return out;
 }
 function peer(d,c,v,words,source,mtRef,positions){
  const p=[c,v],loc=R.makeLocator(d.text,d.sectionNames)(p);if(!loc)return null;
  const text=C.textOf(d.text[c]?.[v]||''),hit=words.join(' ');
  return {rel:d.entry.rel,title:d.entry.title,versionTitle:d.entry.versionTitle,kind:d.entry.kind,language:d.entry.language,path:p,loc:{path:loc.path,label:loc.label},where:[loc.sectionLabel,loc.label].filter(Boolean).join(' · '),snippet:{before:'',hit,after:''},words,sub:false,concordance:true,basis:'alignment',analysisSource:source,mtRef,context:text,positions};
 }
 for(const r of results){
  if(isCancelled())break;
  if(!/^(Westminster|Septuaginta \(CATSS|ETCBC Peshitta)/.test(r.versionTitle||''))continue;
  r.parallels=[];
  const b=await prepare(r.title);if(!b.h)continue;
  let c=r.path[0],v=r.path[1],mt=[],gGroups=[],syRow;
  if(r.rel===b.h.entry.rel&&r.path.length===2){
   // MT word numbers count all source spans; only use a one-to-one token sequence.
   const hw=heWords(b.h.text[c]?.[v]);if(hw.length!==C.tokens(C.textOf(b.h.text[c]?.[v]||'')).length)continue;
   mt=[r.position];
  }else if(b.g&&r.rel===b.g.entry.rel&&r.path.length===2){gGroups=greekGroups(b.h,b.g,c,v);mt=gGroups.find(x=>x.positions.includes(r.position))?.ix||[];}
  else if(b.s&&r.rel===b.s.entry.rel&&r.path.length===2){
   const html=b.s.text[c]?.[v];
   const word=C.syriacWordSpans(html,C.tokens(C.textOf(html)))?.[r.position-1]?.id;
   if(!word)continue;
   for(const [ref,row]of Object.entries(b.sy.verses)){const j=row.ids?.indexOf(word);if(j>=0){[c,v]=ref.split(':').map(n=>+n-1);mt=row.links[j]||[];syRow=row;break;}}
  }else continue;
  if(!mt.length||!Number.isInteger(c)||!Number.isInteger(v))continue;
  if(syRow&&!PA.verse(b.sy,(c+1)+':'+(v+1),heWords(b.h.text[c]?.[v])))continue;
  const hw=heWords(b.h.text[c]?.[v]),ref=(c+1)+':'+(v+1),mtRef=r.title+' '+ref;
  if(r.rel!==b.h.entry.rel){const p=peer(b.h,c,v,mt.map(i=>hw[i-1]).filter(Boolean),'MT anchor',mtRef,mt);if(p)r.parallels.push(p);}
  if(b.g&&r.rel!==b.g.entry.rel){gGroups=gGroups.length?gGroups:greekGroups(b.h,b.g,c,v);const matched=gGroups.filter(x=>x.ix.some(i=>mt.includes(i))&&x.text),words=matched.map(x=>x.text);if(words.length){const p=peer(b.g,c,v,words,'CATSS / Tov–Kraft',mtRef,matched.flatMap(x=>x.positions));if(p)r.parallels.push(p);}}
  if(b.s&&r.rel!==b.s.entry.rel){
   syRow=syRow||PA.verse(b.sy,ref,hw);if(!syRow)continue;
   const groups=new Map();syRow.links.forEach((ix,j)=>{if(!ix.some(i=>mt.includes(i)))return;const native=syRow.refs?.[j]||ref,record=b.s.syriacMorphology?.words?.[syRow.ids?.[j]];if(!record||record[0]!==syRow.sy[j]||record[2]+':'+record[3]!==native)return;const group=groups.get(native)||{words:[],ids:[]};group.words.push(syRow.sy[j]);group.ids.push(syRow.ids[j]);groups.set(native,group);});
   for(const [native,group]of groups){const words=group.words;const [sc,sv]=native.split(':').map(n=>+n-1),verseKey=Array.isArray(b.s.text[sc])?sv:String(sv+1),p=peer(b.s,sc,verseKey,words,syRow.review?'Peshitta · checked ('+syRow.review.by+')':'Peshitta · automatic alignment',mtRef,(C.syriacWordSpans(b.s.text[sc]?.[verseKey],C.tokens(C.textOf(b.s.text[sc]?.[verseKey]||'')))||[]).flatMap((w,i)=>group.ids.includes(w.id)?[i+1]:[]));if(p)r.parallels.push(p);}
  }
  await new Promise(resolve=>setImmediate(resolve));
 }
 return results;
}
module.exports={attach};
