'use strict';
// Source-bound second review of residual Okhla rubrics and biblical incipits.
const manual=require('./round-1-c-manual.json');
const exact=new Map(manual.map(r=>[r.source,r]));
const {number,fold}=require('../translations/part-2');
const forms={חסרין:'defektiv geschriebenen',חסרים:'defektiv geschriebenen',מלאין:'voll geschriebenen',מלאים:'voll geschriebenen',קמצין:'mit Qamatz vokalisierten',פתחין:'mit Patach vokalisierten'};
const bookNames={בראשית:'Genesis',שמות:'Exodus',ויקרא:'Levitikus',וידבר:'Numeri',משנהתורה:'Deuteronomium',יהושע:'Josua',שפטים:'Richter',שמואל:'Samuel',מלכים:'Könige',ישעיה:'Jesaja',ירמיה:'Jeremia',יחזקאל:'Ezechiel',עזרא:'Esra',תהלות:'Psalmen',תהלים:'Psalmen',איוב:'Hiob',משלי:'Sprüche',דניאל:'Daniel',אסתר:'Ester',קהלת:'Kohelet',שירהשירים:'Hoheslied',דבריהימים:'Chronik',תריעשר:'Zwölf Propheten'};
function numeral(t){if(!/[\u05c4\u05c5\u0307׳״]/.test(t))return null;const c=fold(t);if(!/^(?:[אבגדהוזחט]|[יכלמנסעפצ][אבגדהוזחט]?|ט[וז]|[קרשת][יכלמנסעפצ]?[אבגדהוזחט]?)$/.test(c))return null;return number(t);}
function patterned(r,e){
 if(/אותיות|Alphabet/i.test(e.label||''))return null;
 let s=String(r.text||'').trim().replace(/\s+/g,' '),m=s.match(/^([^ ]+) חד מן ([^ ]+)(?: ([^ ]+))?$/),de;
 if(m){const n=numeral(m[2]);if(n!==null&&(!m[3]||forms[fold(m[3])])&&/^[א-ת\u0591-\u05c7\u0300-\u036f׳״]+$/.test(m[1]))de='„'+m[1]+'“: eines von '+n+' '+(m[3]?forms[fold(m[3])]+' ':'')+'Vorkommen.';}
 if(!de&&(m=s.match(/^([^ ]+) ([^ ]+) (חסרין|מלאין|קמצין|פתחין)(?: (?:וסימנ?ׄ?|וסמנהון|וסימנהון|וסיׄ))?$/))){const n=numeral(m[2]);if(n!==null&&/^[א-ת\u0591-\u05c7\u0300-\u036f׳״]+$/.test(m[1]))de='„'+m[1]+'“: '+n+'-mal '+forms[m[3]].replace(/en$/,'')+'.'+(/וס/.test(s)?' Die Erkennungszitate sind:':'');}
 if(!de&&(m=fold(s).match(/^וכל (.+) דכות(?:יה|י|ה)?$/))){const book=bookNames[m[1].replace(/ /g,'')];if(book)de='Alle entsprechenden Vorkommen im Buch '+book+' ebenso.';}
 if(!de)return null;return {uuid:r.uuid,de,status:'draft',uncertain:[],method:'reviewed-rubric-pattern'};
}
function manualFor(r,e){
 const m=exact.get(r.text);if(!m)return patterned(r,e);
 if(m.contexts&&!m.contexts.some(c=>(c.references||[]).some(x=>(r.references||[]).includes(x))))return null;
 const {contexts,source,...out}=m;
 const gaps=[...String(r.text).matchAll(/#+|[\[\]*]|�|…|\.{2,}|∅/g)].map(m=>m[0]);
 if(gaps.length){out.uncertain=[...new Set([...out.uncertain,...gaps])];out.status='partial';out.de+=' [Textverlust oder unsichere Zeichen in der Vorlage.]';}
 return {...out,uuid:r.uuid,method:'manual-source-review'};
}
function review(entry,priorRecord){
 return {...priorRecord,ordinal:entry.ordinal,uuid:entry.uuid,sourceHash:entry.sourceHash,readings:entry.readings.map((r,i)=>{
 const prior=priorRecord.readings[i];if(prior.uuid!==r.uuid)throw Error('Reading order mismatch');
 if(prior.status!=='partial')return prior;
 const revised=manualFor(r,entry);if(!revised)return prior;
 const {edition,reference,attribution,ref,...retained}=prior;
 return {...retained,...revised,source:r.text,sourceReferences:[...(r.references||[])]};
 })};
}
module.exports={review,manualFor};
