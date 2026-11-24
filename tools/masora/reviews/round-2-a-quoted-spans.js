'use strict';
// Read-only translation aid for interrupted Biblical quotation lists.
// P2.quote requires exact consecutive Westminster word IDs and COMPLETE German
// interlinear groups: neither a missing source word nor a crossing group is added.
// The new step only finds multiple exact spans INSIDE a source reading. Every
// unmatched source token, including damage and masoretic rubrics, remains explicit.
const P2=require('../translations/part-2');
const aliases={Gen:'Genesis',Ge:'Genesis',Ex:'Exodus',Exod:'Exodus',Lev:'Leviticus',Num:'Numbers',Deut:'Deuteronomy',Dtn:'Deuteronomy',Josh:'Joshua',Judg:'Judges',Ruth:'Ruth','1 Sam':'I Samuel','2 Sam':'II Samuel','1 Kings':'I Kings','2 Kings':'II Kings','1 Kgs':'I Kings','2 Kgs':'II Kings','1 Chr':'I Chronicles','2 Chr':'II Chronicles',Ezra:'Ezra',Neh:'Nehemiah',Esth:'Esther',Job:'Job',Ps:'Psalms',Prov:'Proverbs',Eccl:'Ecclesiastes',Song:'Song of Songs',Isa:'Isaiah',Jer:'Jeremiah',Lam:'Lamentations',Ezek:'Ezekiel',Dan:'Daniel',Hos:'Hosea',Joel:'Joel',Am:'Amos',Amos:'Amos',Ob:'Obadiah',Jon:'Jonah',Mic:'Micah',Nah:'Nahum',Hab:'Habakkuk',Zeph:'Zephaniah',Hag:'Haggai',Zech:'Zechariah',Mal:'Malachi'};
function canonicalRef(s){const m=/^(.+?)\.?\s+(\d+):(\d+)(?:[-–].*)?$/.exec(String(s));return m?(aliases[m[1]]||m[1])+' '+m[2]+':'+m[3]:null;}
const technical=new Set(['סימן','וסימן','וסימני','וסימנין','וסימנהון','וסימניהון','סימנהון','וסימנ','דסמיך','דסמיכין','דכות','דכותהון','לישנא','בלישנא','בלישניה','בלישני','פסוקא','פסוקיא','תיבותא','תיבותיה','בתורה','בקריה','מלין','כתיב','קריין','כתבן','רפיין','קמצין','דגשין','מליאין','מלאין','חסרין','חסירין']);
function tokens(source){return [...source.matchAll(/\S+/g)].map(m=>{
 const raw=m[0],clean=P2.fold(raw).replace(/[^א-ת]/g,'');
 const safe=!!clean&&!/[#*\[\]�…∅⌀]|\.{2,}|[\u05c4\u05c5\u0307׳״'’]/u.test(raw)&&!technical.has(clean)&&/^[א-ת\u0591-\u05c3\u05c6\u05c7־.,;:!?()\-–]+$/u.test(raw);
 return {raw,start:m.index,end:m.index+raw.length,safe};
 });}
const quoteCache=new Map();
function quote(source,refs,allowed){const key=JSON.stringify([source,refs]);if(quoteCache.has(key))return quoteCache.get(key);const q=P2.quote(source,refs);const result=q&&q.status==='draft'&&q.edition&&allowed.has(q.ref)&&!/[א-ת]|\[Unklar:/.test(q.de)?q:null;quoteCache.set(key,result);return result;}
function germanLength(s){return String(s||'').replace(/\[[\s\S]*?\]/g,'').replace(/[^A-Za-zÄÖÜäöüß]/g,'').length;}
function improve(reading,prior,entry){
 if(!prior||prior.status!=='partial'||!(reading.references||[]).length)return null;
 const source=String(reading.text||''),ts=tokens(source),refs=[...new Set(reading.references)],allowed=new Set(refs.map(canonicalRef).filter(Boolean));
 if(!allowed.size||ts.length<4||ts.length>350)return null;
 const spans=[];
 for(let i=0;i<ts.length;){
  if(!ts[i].safe){i++;continue;}
  let stop=i;while(stop<ts.length&&ts[stop].safe&&stop-i<28)stop++;
  let found=null;
  for(let end=stop;end>=i+3;end--){
   const raw=source.slice(ts[i].start,ts[end-1].end),q=quote(raw,refs,allowed);
   if(q){found={from:i,to:end,source:raw,de:q.de,edition:q.edition,ref:q.ref};break;}
  }
  if(found){spans.push(found);i=found.to;}else i++;
 }
 if(!spans.length)return null;
 const covered=new Set(spans.flatMap(s=>Array.from({length:s.to-s.from},(_,i)=>i+s.from)));
 // Whole exact readings already have a complete translator. This fallback is only
 // for interruption/damage, so it never downgrades a complete quote to partial.
 const fullyCovered=covered.size===ts.length;
 if(fullyCovered&&spans.length===1)return null;
 const uncertain=[];
 for(let i=0;i<ts.length;){if(covered.has(i)){i++;continue;}let end=i+1;while(end<ts.length&&!covered.has(end))end++;uncertain.push(source.slice(ts[i].start,ts[end-1].end));i=end;}
 if(fullyCovered)uncertain.push(source);
 const useful=spans.reduce((n,s)=>n+germanLength(s.de),0);
 if(useful<germanLength(prior.de)+25)return null;
 const pieces=[];let cursor=0;
 for(const span of spans){
  if(cursor<span.from)pieces.push('[Unklar: '+source.slice(ts[cursor].start,ts[span.from-1].end)+']');
  pieces.push('„'+span.de+'“ ('+span.edition+', '+span.ref+')');cursor=span.to;
 }
 if(cursor<ts.length)pieces.push('[Unklar: '+source.slice(ts[cursor].start,ts[ts.length-1].end)+']');
 if(fullyCovered)pieces.push('[Zusammengesetzte oder wiederholte Zitation; Gesamtzuordnung offen.]');
 return {uuid:reading.uuid,de:'Exakt zuordenbare Textteile in Quellreihenfolge: '+pieces.join(' · '),status:'partial',uncertain,method:'exact-referenced-quotation-spans',quotationSources:spans.map(({source,de,edition,ref})=>({source,de,edition,ref}))};
}
module.exports={improve};
