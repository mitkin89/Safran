'use strict';
// German working translations, not a critical edition. Source readings remain untouched.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..'),D=require(path.join(root,'library-masora-data'));
const manifest=require(path.join(root,'bundled/manifest.json')).items;
const strip=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,h,d)=>String.fromCodePoint(parseInt(h||d,h?16:10)));
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f׳״'"·]/g,'');
const words=s=>(fold(strip(s).replace(/־/g,' ')).match(/[א-ת]+/g)||[]).map(w=>['יי','ייי'].includes(w)?'יהוה':w);
const manual={
 'ודין':'Und diese Stelle.','ודא':'Und diese Stelle.','דין':'Diese Stelle.','וחד':'Und einmal.','חד':'Einmal.','אחד':'Eines.',
 'וחברו':'Und die Parallelstelle.','וחבירו':'Und die Parallelstelle.','חברו':'Die Parallelstelle.','חבירו':'Die Parallelstelle.',
 'וסימניהון':'Und dies sind ihre Erkennungsstellen:','וסימנהון':'Und dies sind ihre Erkennungsstellen:','וסימנין':'Und dies sind die Erkennungsstellen:',
 'סימן':'Merkwort:','וסימן':'Und das Merkwort:','סימניהון':'Ihre Erkennungsstellen:',
 'מל':'Voll geschrieben.','מלא':'Voll geschrieben.','חס':'Defektiv geschrieben.','חסר':'Defektiv geschrieben.',
 'כתיב':'Geschrieben:','קרי':'Gelesen:','כת כן':'So geschrieben.','וכת כן':'Und so geschrieben.',
 'רפי':'Ohne Dagesch.','רפה':'Ohne Dagesch.','רפ':'Ohne Dagesch.','דגש':'Mit Dagesch.',
 'מלעיל':'Auf der vorletzten Silbe betont.','מלרע':'Auf der letzten Silbe betont.',
 'וכולהון חסרין':'Und alle sind defektiv geschrieben.','וכולהון מלאין':'Und alle sind voll geschrieben.',
 'וכלהון חסרין':'Und alle sind defektiv geschrieben.','וכלהון מלאין':'Und alle sind voll geschrieben.',
 'בפתח':'Mit Patach.','בקמץ':'Mit Qamets.','בסגול':'Mit Segol.','בחירק':'Mit Chireq.','בצירי':'Mit Tsere.',
 'בשלוש נקודות':'Mit drei Punkten.','בשתי נקודות':'Mit zwei Punkten.',
 'בתורה':'In der Tora.','בתו':'In der Tora.','בספר':'In diesem Buch.','בספ':'In diesem Buch.',
 'רא פס':'Am Versanfang.','רא פסו':'Am Versanfang.','ריש פסוקא':'Am Versanfang.','ראש פסוק':'Am Versanfang.',
 'סוף פסוק':'Am Versende.','סוף פסוקא':'Am Versende.'
};
function numeral(s){const k=fold(s);if(k==='ל'||['ק','מל','מלא','חס','חסר','שם'].includes(k)||!k||!/^ת{0,2}[שרק]?(?:[צפעסנמלכ][אבגדהוזחט]?|י[אבגדהוזחט]?|ט[וז]|[אבגדהוזחט])?$/.test(k))return null;const m={א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ל:30,מ:40,נ:50,ס:60,ע:70,פ:80,צ:90,ק:100,ר:200,ש:300,ת:400};const n=[...k].reduce((a,c)=>a+m[c],0);return n>0&&n<1000?n:null;}
const times=n=>({1:'Einmal.',2:'Zweimal.',3:'Dreimal.'})[n]||n+'-mal.';
function formula(raw){
 const clean=fold(raw).trim().replace(/\s+/g,' ');if(Object.hasOwn(manual,clean))return {de:manual[clean],status:'draft',uncertain:[],method:'formula'};
 const ts=String(raw).trim().split(/\s+/),cs=ts.map(fold);if(['ל','לית'].includes(cs[0])||(((ts.length===1&&cs[0].length===1)||(cs[0].length===1&&['מל','חס','מלא','חסר','ומל','וחס'].includes(cs[1]))||/[\u05c4\u05c5\u0307׳״']/.test(ts[0]))&&numeral(ts[0])!==null)){
  const out=[['ל','לית'].includes(cs[0])?'Einmalig.':times(numeral(ts[0]))],uncertain=[];
  for(let i=1;i<ts.length;){let found=false;for(let size=Math.min(4,ts.length-i);size>0;size--){const chunk=cs.slice(i,i+size).join(' '),key=Object.hasOwn(manual,chunk)?chunk:chunk[0]==='ו'&&Object.hasOwn(manual,chunk.slice(1))?chunk.slice(1):null;if(key){out.push((key!==chunk?'Und '+manual[key][0].toLowerCase()+manual[key].slice(1):manual[key]));i+=size;found=true;break;}}
   if(!found){uncertain.push(ts[i]);out.push('[Unklar: '+ts[i]+']');i++;}}
  return {de:out.join(' '),status:uncertain.length?'partial':'draft',uncertain,method:'formula'};
 }
 return null;
}
let verses=null,startIndex=null;
function loadBible(){if(verses)return;verses=[];startIndex=new Map();for(const e of manifest.filter(e=>e.kind==='he'&&/^Westminster/.test(e.versionTitle))){const file=path.join(root,'interlin',e.title.replace(/ /g,'_')+'.js');if(!fs.existsSync(file))continue;const scope={window:{}};vm.runInNewContext(fs.readFileSync(file,'utf8'),scope,{timeout:5000});const editions=scope.window.INTERLIN_PARTS[e.title];if(!editions)continue;const d=require(path.join(root,'bundled',e.rel));for(let c=0;c<d.text.length;c++)for(let v=0;v<(d.text[c]||[]).length;v++){
 const html=d.text[c][v];if(typeof html!=='string')continue;const hw=[...html.matchAll(/<span class="w"[^>]*>(.*?)<\/span>/g)].map(m=>words(m[1]).join(''));const edition=['Philippson','Goldschmidt','Hirsch','Zunz','Mendelssohn'].find(k=>editions[k]?.[(c+1)+':'+(v+1)]),segs=editions[edition]?.[(c+1)+':'+(v+1)];if(!hw.length||!segs)continue;const item={book:e.title,chapter:c+1,verse:v+1,hw,segs,edition};verses.push(item);for(const w of new Set(hw)){const ar=startIndex.get(w)||[];ar.push(item);startIndex.set(w,ar);}
 }}}
function quote(raw,refs){
 if(/[A-Za-z<>#\[\]…�?∅]/.test(raw))return null;const needle=words(raw);if(!needle.length||needle.length>80)return null;loadBible();const rr=(refs||[]).map(D.bibleRef).filter(Boolean);let candidates=startIndex.get(needle[0])||[];
 if(rr.length)candidates=candidates.filter(v=>rr.some(r=>r.book===v.book&&r.chapter===v.chapter&&v.verse>=r.verse&&v.verse<=r.endVerse));
 const found=[];
 for(const v of candidates)for(let a=0;a<=v.hw.length-needle.length;a++)if(needle.every((w,i)=>v.hw[a+i]===w)){
  const ids=new Set(Array.from({length:needle.length},(_,j)=>a+j+1)),intersects=v.segs.filter(s=>s[0].some(i=>ids.has(i)));
  if(!intersects.length||intersects.some(s=>!s[0].length||s[0].some(i=>!ids.has(i))))continue;
  if([...ids].some(i=>!intersects.some(s=>s[0].includes(i))))continue;
  found.push({de:intersects.map(s=>s[1]).join(' ').replace(/\s+/g,' ').trim(),reference:v.book+' '+v.chapter+':'+v.verse,edition:v.edition});
 }
 const unique=new Map(found.map(x=>[x.de.replace(/[.,;:!?]+$/,'').toLowerCase(),x]));if(unique.size!==1)return null;const p=[...unique.values()][0];return {de:p.de,status:'draft',uncertain:[],method:'aligned-quotation',edition:p.edition,reference:p.reference};
}
const reviewed=require('./part-0-manual.json'),extra=new Map(require('./part-0-extra.json').map(row=>[row.source,row]));
function translateReadingCore(r,entry){
 if(!r.text.trim())return {uuid:r.uuid,de:'[Keine Transkription vorhanden.]',status:'partial',uncertain:[],method:'empty-source'};
 const f=formula(r.text);if(f?.status==='draft')return {uuid:r.uuid,...f};
 const exact=extra.get(r.text);if(exact)return {uuid:r.uuid,de:exact.de,status:exact.status,uncertain:exact.uncertain,method:'editorial-draft'};
 if(f)return {uuid:r.uuid,...f};
 if(/^(?:[א-ת][\u05c4\u05c5\u0307׳״']+){1,4}$/.test(r.text.trim()))return {uuid:r.uuid,de:'[Unklare masoretische Angabe: '+r.text+']',status:'partial',uncertain:[r.text],method:'unresolved-formula'};
 const tokens=r.text.trim().split(/\s+/),keys=tokens.map(fold),marker=tokens.findIndex((s,i)=>i>0&&i<=6&&((/[\u05c4\u05c5\u0307׳״']/.test(s)&&numeral(s)!==null)||keys[i]==='ל'));
 if(marker>0){const rest=formula(tokens.slice(marker).join(' '));if(rest){
  const prefix=tokens.slice(0,marker).join(' '),literal=entry?.label&&words(prefix).join(' ')===words(entry.label).join(' '),known=formula(prefix)||quote(prefix,r.references);
  if(literal||known){const uncertain=[...rest.uncertain,...(!literal&&known?.uncertain||[])];return {uuid:r.uuid,...rest,de:(literal?'„'+prefix+'“':known.de.replace(/[.:]+$/,''))+': '+rest.de,status:uncertain.length?'partial':rest.status,uncertain,method:'lemma-formula'};}
  return {uuid:r.uuid,de:'[Unklarer Zusatz: '+prefix+'] '+rest.de,status:'partial',uncertain:[prefix,...rest.uncertain],method:'partial-formula'};
 }}
 const qere=/^(.+?)\s+(?:קׄ|ק|קרי)\s*$/.exec(r.text.trim());
 if(qere)return {uuid:r.uuid,de:'Gelesen wird „'+qere[1]+'“.',status:'draft',uncertain:[],method:'reading-formula'};
const q=quote(r.text,r.references);if(q)return {uuid:r.uuid,...q};
 const key=fold(r.text).trim().replace(/\s+/g,' ');if(Object.hasOwn(reviewed,key)){const de=reviewed[key],partial=de.includes('[');return {uuid:r.uuid,de,status:partial?'partial':'draft',uncertain:partial?[r.text]:[],method:'editorial-draft'};}

 return {uuid:r.uuid,de:'[Unklar: '+r.text+']',status:'partial',uncertain:[r.text],method:'unresolved'};
}
function translateReading(r,entry){
 const out=translateReadingCore(r,entry);
 if(/[#\[\]…�?∅]/.test(r.text)&&out.status==='draft')return {...out,de:out.de+' [Lücke oder unsichere Zeichen im Original.]',status:'partial',uncertain:[r.text]};
 return out;
}
function build(input){return input.map(row=>({ordinal:row.ordinal,uuid:row.uuid,sourceHash:row.sourceHash,readings:row.readings.map(r=>translateReading(r,row))}));}
module.exports={build,formula,quote,translateReading};
if(require.main===module){const input=fs.readFileSync(process.argv[2]||'/tmp/safran-masora-translation-input-0.jsonl','utf8').trim().split('\n').map(JSON.parse),out=build(input);fs.writeFileSync(path.join(root,'masora-translations/part-0.json'),JSON.stringify(out,null,2)+'\n');const rs=out.flatMap(n=>n.readings);process.stdout.write(JSON.stringify({notes:out.length,readings:rs.length,draft:rs.filter(r=>r.status==='draft').length,partial:rs.filter(r=>r.status==='partial').length,unresolved:rs.filter(r=>r.method==='unresolved').length})+'\n');}
