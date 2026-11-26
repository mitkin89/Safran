'use strict';
// Export-only grouping: snapshots and the user's arrangement are never rewritten.
const V=require('./versemap'),cfg=require('./bundled/versification.json'),Cite=require('./research-citations');
const key=(work,ch,verse)=>JSON.stringify([work,String(ch),String(verse)]);
const pathOf=b=>(b.reference?.sectionPath||[]).filter(x=>x!=='');
function sourceKeys(b,label){
 const p=pathOf(b),work=b.citation?.work||b.title;
 if(p.length!==1||!Number.isInteger(p[0])||!/^\d+$/.test(label)||!work)return [];
 const ch=p[0]+1,verse=Number(label);
 if(!V.known(work))return [key(work,ch,verse)];
 const trad=V.tradOf(cfg,{title:work,versionTitle:b.citation?.edition,language:b.citation?.language},'text');
 if(V.partial(work,ch,verse,trad,'heb'))return [];
 return V.verse(work,ch,verse,trad,'heb').map(([c,v])=>key(work,c,v));
}
function presentationRow(p,i){
 const out={...p,rows:[p.rows[i]]};
 for(const k of ['additional','originalInterlinear'])if(p[k])out[k]=p[k].map(pair=>presentationRow(pair,i));
 if(p.readerHeadings)out.readerHeadings=p.readerHeadings.filter(h=>h.before===p.rows[i].label);
 return out;
}
function fragments(b){
 if(b.type!=='source'||b.text!==b.originalText)return [{block:b,keys:[]}];
 if(b.presentation)return b.presentation.rows.map((row,i,all)=>({keys:sourceKeys(b,row.label),block:{...b,reference:{...b.reference,labels:[row.label]},title:i?'':b.title,presentation:presentationRow(b.presentation,i),citationText:i===all.length-1?b.citationText:'',companionCitationText:i===all.length-1?b.companionCitationText:'',companionCitations:i===all.length-1?b.companionCitations:[]}}));
 const labels=b.reference?.labels||[];
 if(!labels.length||labels.some(l=>!/^\d+$/.test(l)))return [{block:b,keys:[]}];
 // Captured verse starts have two spaces; embedded newlines/footnotes stay intact.
 const starts=[];let offset=0;
 for(const line of b.text.split('\n')){const m=/^(\d+)  /.exec(line);if(m)starts.push({label:m[1],offset});offset+=line.length+1;}
 if(starts.length!==labels.length||starts.some((s,i)=>s.label!==labels[i])||starts[0]?.offset!==0)return [{block:b,keys:[]}];
 return starts.map((s,i)=>({keys:sourceKeys(b,s.label),block:{...b,reference:{...b.reference,labels:[s.label]},title:i?'':b.title,text:b.text.slice(s.offset,starts[i+1]?.offset??b.text.length).replace(/\n$/,''),citationText:i===starts.length-1?b.citationText:''}}));
}
function anchors(b){
 const refs=b.type==='note'?b.noteSnapshot?.refs||[]:[b.reference];
 const out=[];
 for(const ref of refs){
  const c=b.type==='note'?ref?.citation:b.citation;
  const work=c?.work||'',m=/^.+?(?:\s+on\s+| על )(.+)$/i.exec(work),base=m?m[1]:work;
  if(!base)continue;
  const p=(ref?.sectionPath||[]).filter(x=>x!=='');
  if(m&&p.length===2&&p.every(Number.isInteger)){out.push(key(base,p[0]+1,p[1]+1));continue;}
  if(p.length===1&&Number.isInteger(p[0])&&ref?.labels?.length){for(const l of ref.labels)if(/^\d+$/.test(l))out.push(key(base,p[0]+1,l));continue;}
  // Old snapshots may only retain the explicit chapter:verse locator.
  const loc=/^(\d+):(\d+)(?=[:;\s–-]|$)/.exec(c?.locator||'');
  if(loc)out.push(key(base,loc[1],loc[2]));
 }
 return [...new Set(out)];
}
function aligned(blocks){
 const main=blocks.filter(b=>!b.region||b.region==='main').flatMap(fragments),rows=[],byKey=new Map();
 for(const f of main){const last=rows.at(-1),same=f.keys.length&&last?.keys[0]===f.keys[0];const row=same?last:{keys:f.keys,main:[],left:[],right:[]};if(!same)rows.push(row);row.main.push(f.block);for(const k of f.keys)if(!byKey.has(k))byKey.set(k,row);}
 const rest={keys:[],main:[],left:[],right:[]};let matches=0;
 for(const original of blocks){
  if(!['left','right'].includes(original.region))continue;
  const isCommentary=/^(?:.+?)(?:\s+on\s+| על )/i.test(original.citation?.work||'');
  const pieces=original.type==='source'&&pathOf(original).length===1?fragments(original):[{block:original,keys:[]}];
  for(const {block:b,keys}of pieces){
   // A directly quoted edition uses its own mapped verse keys. Commentary
   // instead points to the base work. Unsplit/edited excerpts stay intact.
   const targets=(!isCommentary&&b!==original?keys:anchors(b)).map(k=>byKey.get(k)).filter(Boolean),row=rows.find(r=>targets.includes(r));
   if(row){
    const ref=JSON.parse(row.keys[0]),folio=Cite.section(row.main[0]?.citation);
    row[b.region].push({...b,verseLabel:(/^\d+[ab]$/.test(folio)?folio:ref[1])+':'+ref[2]});matches++;
   }else rest[b.region].push(b);
  }
 }

 if(!matches)return null;
 if(rest.left.length||rest.right.length)rows.push(rest);
 return rows;
}
module.exports={aligned,fragments,anchors};
