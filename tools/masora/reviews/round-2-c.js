'use strict';
// Source-bound second review of residual Okhla rubrics and biblical incipits.
const manual=require('./round-2-c-manual.json');
const exact=new Map(manual.map(r=>[r.source,r]));
const spaced=new Map();
const normalizeSpacing=s=>String(s).normalize('NFC').trim().replace(/\s+/g,' ');
for(const row of manual){const k=normalizeSpacing(row.source);if(!spaced.has(k))spaced.set(k,[]);spaced.get(k).push(row);}
const delegated=new Set(require('./round-2-c-delegated.json'));
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
 if(!de){
  // Complete short count rubrics: bounded lemma, explicitly marked number, fully known remainder.
  const raw=s.split(' ');const end=/^(?:וסימני|וסימניהון|וסימנ|וסימנהון|וסימ|וסמנהון|וסי|וס)$/;
  for(let j=1;j<=Math.min(3,raw.length-1);j++){
   const lemma=raw.slice(0,j).join(' '),n=fold(raw[j])==='ל'?1:numeral(raw[j]);if(n===null||/^(?:וכל|כל|חד|מן|בתר|קדמ|תנינ)/.test(fold(lemma)))continue;
   if(lemma.split(' ').some(t=>fold(t).length===1))continue;
   if(!fold(e.label||'').startsWith(fold(lemma)))continue;
   let rest=raw.slice(j+1).map(fold),tail='';
   if(rest.length&&end.test(rest[rest.length-1])){rest.pop();tail=' Die Erkennungszitate sind:';}
   const q={בקריה:'in der Schrift',בקרייא:'in der Schrift',בקריא:'in der Schrift',בקרייה:'in der Schrift',בקריי:'in der Schrift',בתורה:'in der Tora',בתור:'in der Tora',בתו:'in der Tora',בק:'mit Qamatz',קמצין:'mit Qamatz',קמצ:'mit Qamatz',פתחין:'mit Patach',בט:'mit dieser Akzentuierung',בטע:'mit dieser Akzentuierung',מל:'voll geschrieben',מלאים:'voll geschrieben',מליאים:'voll geschrieben',חס:'defektiv geschrieben',חסירים:'defektiv geschrieben',חסרין:'defektiv geschrieben',חסירין:'defektiv geschrieben',דגשין:'mit Dagesch',רפין:'ohne Dagesch',דסמ:'in dieser Wortverbindung',דס:'in dieser Wortverbindung',דסמיכין:'in unmittelbarer Wortverbindung',דסמיכי:'in unmittelbarer Wortverbindung',דסמיך:'in unmittelbarer Wortverbindung',דסמי:'in unmittelbarer Wortverbindung',בסיפרא:'im Buch',בספרא:'im Buch',בספר:'im Buch',בספ:'im Buch',בלישנא:'in dieser Ausdrucksweise',בלישניה:'in dieser Ausdrucksweise',בלישני:'in dieser Ausdrucksweise',בליש:'in dieser Ausdrucksweise',בלי:'in dieser Ausdrucksweise',בעינינא:'in diesem Zusammenhang',בעינינ:'in diesem Zusammenhang',בעינ:'in diesem Zusammenhang',בעיניני:'in diesem Zusammenhang',לרע:'auf der letzten Silbe betont',מלעיל:'auf der vorletzten Silbe betont',מלרע:'auf der letzten Silbe betont',לעל:'auf der vorletzten Silbe betont',רישיפסוקא:'am Versanfang'};
   const phrases={'רא פס':'am Versanfang','ראש פס':'am Versanfang','ראש פסוקא':'am Versanfang','ראשי פסוקא':'am Versanfang','רישי פסוקא':'am Versanfang','סוף פס':'am Versende','ריש פסוקים':'am Versanfang','כת כן':'so geschrieben','חס יו':'ohne Jod geschrieben','חס ו':'ohne Waw geschrieben','חס יוד':'ohne Jod geschrieben','חס ויו':'ohne Waw geschrieben','חס יו בליש':'in dieser Wortform ohne Jod geschrieben','חס ו בלישני':'in dieser Wortform ohne Waw geschrieben','חס בלישני':'in dieser Wortform defektiv geschrieben','מל בליש':'in dieser Wortform voll geschrieben','דסמיכין בטע':'in unmittelbarer Wortverbindung mit dieser Akzentuierung'};
   const whole=phrases[rest.join(' ')];
   if(whole){de='„'+lemma+'“: '+n+'-mal '+whole+'.'+tail;break;}
   if(rest.every(t=>q[t])){de='„'+lemma+'“: '+n+'-mal'+(rest.length?' '+rest.map(t=>q[t]).join(', '):'')+'.'+tail;break;}
  }
 }
 if(!de)return null;return {uuid:r.uuid,de,status:'draft',uncertain:[],method:'reviewed-rubric-pattern'};
}
function manualFor(r,e){
 if(delegated.has(r.uuid))return null;
 const matches=exact.has(r.text)?[exact.get(r.text)]:(spaced.get(normalizeSpacing(r.text))||[]);
 const m=matches.find(m=>(!m.entryUUIDs||m.entryUUIDs.includes(e.uuid))&&(!m.contexts||m.contexts.some(c=>(c.references||[]).some(x=>(r.references||[]).includes(x)))));
 if(!m)return patterned(r,e)||require('./round-1-c').manualFor(r,e);
 if(m.contexts&&!m.contexts.some(c=>(c.references||[]).some(x=>(r.references||[]).includes(x))))return null;
 const {contexts,entryUUIDs,source,...out}=m;
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
