'use strict';
// Reproducible German working translations. Exact cited Hebrew spans use the
// repository's checked Zunz word mapping; uncertain clauses are never guessed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../../..'),D=require(path.join(root,'library-masora-data.js'));
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f]/g,'').replace(/[׳״'"·]/g,'').replace(/\s+/g,' ').trim();
const cons=s=>String(s).replace(/[^א-ת]/g,'');
const words=s=>(String(s).match(/[א-ת\u0591-\u05c7]+/g)||[]).map(cons).map(w=>w.replace(/^([ובכלמשה]{0,2})(?:ייי|יי|יוי)$/,'$1יהוה'));
const manifest=require(path.join(root,'bundled/manifest.json')).items,books=new Map();
function book(name){if(books.has(name))return books.get(name);const e=manifest.find(e=>e.title===name&&/^Westminster/.test(e.versionTitle||''));if(!e){books.set(name,null);return null;}const h=JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel)));const file=path.join(root,'interlin',name.replaceAll(' ','_')+'.js');if(!fs.existsSync(file)){books.set(name,null);return null;}const context={window:{}};vm.runInNewContext(fs.readFileSync(file,'utf8'),context);const out={he:h.text,maps:context.window.INTERLIN_PARTS[name]};books.set(name,out);return out;}
const EDITIONS=['Philippson','Zunz','Mendelssohn','Hirsch','Goldschmidt','Herxheimer','Breuer','Wolf','JuliusHirsch'];
function quoted(reading){
 const needle=words(reading.text);if(!needle.length||/[#…]/.test(reading.text))return null;
 for(const edition of EDITIONS){const choices=[];
 for(const ref of reading.references){const p=D.bibleRef(ref);if(!p||p.chapter!==p.endChapter||p.verse!==p.endVerse)continue;const b=book(p.book),html=b?.he?.[p.chapter-1]?.[p.verse-1],segs=b?.maps?.[edition]?.[p.chapter+':'+p.verse];if(!html||!segs)continue;const hs=[...html.matchAll(/<span class="w"[^>]*>(.*?)<\/span>/g)].map(m=>cons(m[1].replace(/<[^>]*>/g,'')));
  for(let start=0;start<=hs.length-needle.length;start++)if(needle.every((w,j)=>w===hs[start+j])){
   const ids=new Set(Array.from({length:needle.length},(_,j)=>start+j+1));if(segs.some(([ix])=>ix.some(i=>ids.has(i))&&ix.some(i=>!ids.has(i))))continue;const included=segs.filter(([ix])=>ix.length&&ix.every(i=>ids.has(i))),covered=new Set(included.flatMap(([ix])=>ix));
   if(included.length&&[...ids].every(i=>covered.has(i))){const de=included.map(([,s])=>s).join(' ').replace(/\s+/g,' ').trim();if(de)choices.push(de);}
  }
 }
 const distinct=[...new Set(choices)];if(distinct.length===1)return {de:distinct[0],status:'draft',uncertain:[],edition};
 }
 return null;
}
function fragments(reading){
 const needle=words(reading.text);if(needle.length<2||/[#…]/.test(reading.text)||!reading.references.length)return null;
 const cache=new Map();
 function piece(start,end){const key=start+':'+end;if(!cache.has(key))cache.set(key,quoted({...reading,text:needle.slice(start,end).join(' ')}));return cache.get(key);}
 const memo=new Map();function solve(i){if(i===needle.length)return {parts:[],unknown:[]};if(memo.has(i))return memo.get(i);
  let best=null;
  for(let j=needle.length;j>i;j--){const q=piece(i,j);if(!q)continue;const tail=solve(j),candidate={parts:[q.de,...tail.parts],unknown:tail.unknown};if(!best||candidate.unknown.length<best.unknown.length||candidate.unknown.length===best.unknown.length&&candidate.parts.length<best.parts.length)best=candidate;}
  const tail=solve(i+1),fallback={parts:['[Unklar: '+needle[i]+']',...tail.parts],unknown:[needle[i],...tail.unknown]};
  if(!best||fallback.unknown.length<best.unknown.length)best=fallback;memo.set(i,best);return best;
 }
 const result=solve(0);if(result.unknown.length===needle.length)return null;
 return {de:result.parts.join(' / '),status:'partial',uncertain:[reading.text]};
}
const exact={
 'אמר ייי אלהי ישראל':'Der HERR, der Gott Israels, sprach.',
 'וחברו':'Und die entsprechende Parallelstelle.',
 'וחברו דדברי הימים':'Und die Parallelstelle in den Chronikbüchern.',
 'וחברו דה':'Und die Parallelstelle in den Chronikbüchern.',
 'כן כת':'So geschrieben.',
 'כת כן':'So geschrieben.',
 'סימן':'Merkzeichen:',
 'סימנהון':'Ihre Erkennungsstellen:',
 'וסימנהון':'Und ihre Erkennungsstellen:',
 'וסימניהון':'Und ihre Erkennungsstellen:',
 'פס':'Vers.',
 'חלוף':'Abweichende Lesart.',
 'והנותרת כלו מלא':'„Und das Übrigbleibende“ ist überall voll geschrieben.',
 'א בתורה א בנביאים וא בכתובים':'Einmal in der Tora, einmal in den Propheten und einmal in den Schriften.',
 'ב א חס וא מל':'Zweimal: einmal defektiv und einmal voll geschrieben.',
 'ב חד חס וחד מל':'Zweimal: einmal defektiv und einmal voll geschrieben.',
 'ג ב חס וא מל':'Dreimal: zweimal defektiv und einmal voll geschrieben.',
 'ה ד מל וא חס':'Fünfmal: viermal voll und einmal defektiv geschrieben.',
 'ודין':'Und diese Stelle.',
 'דין':'Diese Stelle.',
 '###':'[Unleserlich in der Quellentranskription: ###]',
 '### ###':'[Unleserlich in der Quellentranskription: ### ###]',
 'כח פסוקים בתורה אית בהון ד מלין ומלה קדמא לא נסב וו ושאר נסבין וו וסימנהון':'Achtundzwanzig Verse in der Tora enthalten vier Wörter: Das erste Wort erhält kein Waw, die übrigen erhalten Waw. Ihre Erkennungsstellen:',
 'ב דין מל וא חס':'Zweimal: hier voll, einmal defektiv geschrieben.',
 'ל ושא המה':'Einmalig; die übrigen haben „המה“.',
 'קדמא ובתרא קמ':'Die erste und die letzte Stelle mit Qamets.',
 'טעה':'Irrtum.',
 'מטע ביה ספרי':'Hierin irren die Schreiber.',
 'מטע ביה ספרי דכתבי את':'Hierin irren die Schreiber, die „את“ schreiben.',
 'ו מלין בתרין טעמ':'Sechs Wörter mit zwei unterschiedlichen Akzentuierungen.',
 'חד בתורה חד בנביאים וחד בכתובים':'Einmal in der Tora, einmal in den Propheten und einmal in den Schriften.',
 'בן אשר לסבב':'Ben Ascher: „לסבב“.',
 'ד ג מל וא חס':'Viermal: dreimal voll und einmal defektiv geschrieben.',
 'ד ב קמ וב פת':'Viermal: zweimal mit Qamets und zweimal mit Patach.',
 'ב בתרי ליש':'Zweimal in zweierlei Ausdrucksweise.',
 'ב בו':'Zweimal darin.',
 'ב ובע':'Zweimal; und in diesem Zusammenhang.',
 'ג ב חס':'Dreimal; zweimal defektiv geschrieben.',
 'יא מלר':'Elfmal mit Betonung auf der letzten Silbe.',
 'ג מלע':'Dreimal mit Betonung auf der vorletzten Silbe.',
 'ל וכת כן':'Einmalig und so geschrieben.',
 'פסוק':'Vers.',
 'פסק':'Paseq (Trennstrich).',
 'ל נון רבתי':'Einmalig; mit großem Nun.',
 'ג בנקבות':'Dreimal bei weiblichen Personen oder Formen.',
 'כך הוא':'So lautet es.',
 'וב בנבי':'Und zweimal in den Propheten.',
 'קדמא חס דחס':'Die erste Stelle ist doppelt defektiv geschrieben.',
 'וכלם עשרון':'Und alle haben „עשרון“.',
 'וכלם שנים':'Und alle haben „שנים“.',
 'וכלם חטאת':'Und alle haben „חטאת“.',
 'וכלם ושעיר':'Und alle haben „ושעיר“.',
 'וכלם מלבד':'Und alle haben „מלבד“.',
 'וכלם מלבד התמיד':'Und alle haben „מלבד התמיד“.',
 'וכלם איל שני':'Und alle haben „איל שני“.',
 'מים ברמז כאן בוז סימן מכאן רמז לנסוך המים מן התורה':'„Wasser“ ist hier durch die Merkzeichen בוז angedeutet. Von hier ergibt sich ein Hinweis auf das Wassergussopfer aus der Tora.',
 'יא זוגין מתח בטע':'Elf Wortpaare unterscheiden sich durch die Akzentuierung.',
 'יא זוג מתח בטע':'Elf Wortpaare unterscheiden sich durch die Akzentuierung.'
,
 'כמות ג ומש אנך וסימנהון':'„כמות“: dreimal, verteilt auf Tora, Propheten und Schriften. Ihre Erkennungsstellen:',
 'חד מן ד פסוקים דאית בהון מן ה מלין משניין וסימנהון':'Einer von vier Versen, die fünf voneinander abweichende Wörter enthalten. Ihre Erkennungsstellen:',
 'חד מן ב פסוקים כל מליהון נסבין מם בסופא וסימנהון':'Einer von zwei Versen, deren sämtliche Wörter am Ende ein Mem haben. Ihre Erkennungsstellen:',
 'יט זוגין מן בב בענינ וסימנהון קדמא נסיב וו ותנינ לא נסיב וו ולית דכות וסימנהון':'Neunzehn Wortpaare aus jeweils zwei Stellen in demselben Zusammenhang. Beim ersten steht ein Waw, beim zweiten steht kein Waw; es gibt keine entsprechende weitere Stelle. Ihre Erkennungsstellen:',
 'נגעת הנגעת ג חס בלישנא וסי משמשין אנך וסימנהון':'„נגעת / הנגעת“: dreimal defektiv in dieser Wortform, verteilt auf Tora, Propheten und Schriften. Ihre Erkennungsstellen:',
 'בן אשר לסבב':'Ben Ascher schreibt „לסבב“.',
 'ב בלש דחילו':'Zweimal in der Bedeutung „sich fürchten“.',
 'כל חס במב מל':'Überall defektiv geschrieben, außer zweimal voll.',
 'וכל יהושע ושפטים דכותהון מל במב חס':'Alle entsprechenden Stellen in Josua und Richter sind voll geschrieben, außer zwei defektiven.',
 'וכל כתובים דכות מל':'Alle entsprechenden Stellen in den Schriften sind voll geschrieben.',
 'וכל אתנחתא וסוף פסוק דכותהון':'Und alle entsprechenden Stellen bei Etnachta und Sof Pasuq ebenso.',
 'וכל הן אל הן אלה דכותהון':'Und alle Stellen „הן אל / הן אלה“ ebenso.',
 'כל הדין ענינא בני פלני למשפחתם במב אלה בני פלני וסימנהון':'In diesem ganzen Abschnitt steht „die Söhne des N. nach ihren Geschlechtern“, außer zweimal „dies sind die Söhne des N.“. Ihre Erkennungsstellen:',
 'דברת ב בתרי ליש א חס דחס וא מל וו בתרא וסימ':'„דברת“: zweimal in zweierlei Ausdrucksweise; einmal doppelt defektiv und einmal voll mit dem letzten Waw geschrieben. Ihre Erkennungsstellen:',
 'כל קריה ונסכיהם מל בר במא חס':'In der ganzen Schrift ist „ונסכיהם“ voll geschrieben, außer einer defektiven Stelle.',
 'כל מל במג חס':'Alle voll geschrieben, außer drei defektiven Stellen.',
 'התשיעי כל מלאים במג חס וסימ':'„התשיעי“: überall voll geschrieben, außer drei defektiven Stellen. Ihre Erkennungsstellen:',
 'השמיני כל תור מל':'„השמיני“: in der ganzen Tora voll geschrieben.',
 'השביעי כלה מל במח חס וסימנהון':'„השביעי“: überall voll geschrieben, außer acht defektiven Stellen. Ihre Erkennungsstellen:',
 'הששי כלהון חס':'„הששי“: überall defektiv geschrieben.',
 'החמישי כל מל במג חס וסימ':'„החמישי“: überall voll geschrieben, außer drei defektiven Stellen. Ihre Erkennungsstellen:',
 'הרביעי כל מל במג חס וסימנהון':'„הרביעי“: überall voll geschrieben, außer drei defektiven Stellen. Ihre Erkennungsstellen:',
 'מנחתם ונסכיהם':'Ihre Speiseopfer und ihre Trankopfer.',
 'כל חס וו במא':'Überall ohne Waw geschrieben, außer einmal.',
 'כל כתי כן במא מל':'Überall so geschrieben, außer einer voll geschriebenen Stelle.',
 'כל אורית וירמיה אם אם מצע פסוק במי אם ואם וסימ':'In der ganzen Tora und bei Jeremia steht in der Versmitte „אם אם“, außer zehnmal „אם ואם“. Ihre Erkennungsstellen:',
 'כל אורית וירמיה אם אם מצע פסו במי אם ואם':'In der ganzen Tora und bei Jeremia steht in der Versmitte „אם אם“, außer zehnmal „אם ואם“.',
 'וכל שאר קריה דכותהון אם ואם במצע פסוק בר מן יח אם אם וסימנהון':'In den übrigen entsprechenden Stellen der Schrift steht „אם ואם“ in der Versmitte, außer achtzehnmal „אם אם“. Ihre Erkennungsstellen:',
 'קדמא תשובן כתי':'An der ersten Stelle wird „תשובן“ geschrieben.',
 'תנינ תשבון כתי':'An der zweiten Stelle wird „תשבון“ geschrieben.',
 'תליתא תשובון כתי':'An der dritten Stelle wird „תשובון“ geschrieben.',
 'אוריתא הישמת כתי חס יהושע הישמות כתי יחזקאל הישימת כתי':'In der Tora wird „הישמת“ defektiv geschrieben; bei Josua „הישמות“, bei Ezechiel „הישימת“.',
 'וכל שארא ערי את ערי המקלט ה דיהושע':'An allen übrigen Stellen steht „ערי / את ערי המקלט“; fünf davon bei Josua.',
 'צאת':'Hinausgehen.',
 'וישב':'[Unklar ohne Satzkontext: וישב — zurückkehren, sich setzen oder wohnen.]',
 'טהר':'Rein.',
 'חנוני חנוני':'Erbarmt euch meiner, erbarmt euch meiner!',
 'לטוטפות':'Als Merkzeichen.',
 'תולדת':'Geschlechterfolge.',
 'ויגש':'Und er trat heran.',
 'וארא':'[Unklar ohne Vokalisierung und Satzkontext: וארא — ich sah oder ich erschien.]',
 'בקולי':'Auf meine Stimme.',
 'הארץ':'Die Erde.',
 'טהר':'Rein.',
 'טהרו':'Reinigt euch!',
 'הנעל':'Der Schuh.',
 'ויאנחו':'Und sie seufzten.',
 'יחיה':'Er wird leben.',
 'ושלאחריו':'Und die darauf folgende Stelle.',
 'קרב אתה ושמע את':'Tritt du heran und höre!',
 'וקראו צם':'Und ruft ein Fasten aus!',
 'בארבעם':'In vierzig.',
 'ופני תהום יתלכדו':'Und die Fläche der Tiefe schließt sich zusammen.',
 'חנון':'Gnädig.',
 'נתץ':'Er riss nieder.',
 'לך לך':'Zieh für dich hin!',
 'שאו עיניכם':'Erhebt eure Augen!',
 'אמיר ונשאר בו עוללות':'Baumwipfel: Und Nachlese bleibt an ihm.',
 'צאת':'Hinausgehen.',
 'ורוח אלהים':'Und der Geist Gottes.',
 'כי חמה פן יסיתך בשפק':'Denn Zorn soll dich nicht zur Lästerung verleiten.',
 'ואיד יעלה':'Und ein Dunst stieg auf.',
 'זרוע אור זרוע לצדיק':'Gesät: Licht ist dem Gerechten gesät.',
 'האותי הם מכעיסים':'Erzürnen sie mich etwa?',
 'ואשביעך בייי אלהי השמים':'Und ich werde dich bei JHWH, dem Gott des Himmels, schwören lassen.',
 'וירא יושב הארץ הכנעני':'Und die Bewohner des Landes, die Kanaaniter, sahen es.',
 'הבית הזה אשר אתה בונה':'Dieses Haus, das du baust.',
 'כי אעלה ארוכה לך':'Denn ich werde dir Heilung bringen.',
 'הובשת אתה בקעת מעין ונחל':'Du hast austrocknen lassen: Du hast Quelle und Bach gespalten.',
 'ונח דניאל ואיוב':'Und Noach, Daniel und Ijob.',
 'אלה בימי יהויקים':'Diese waren in den Tagen Jojakims.',
 'ויביאו את ראש איש בשת':'Und sie brachten den Kopf Isch-Boschets.',
 'וירב ותהי שם המלחמה':'Und es mehrte sich: Dort tobte die Schlacht.',
 'הלוא אחיך רעים בשכם':'Weiden deine Brüder nicht bei Sichem?',
 'הלוא ידעתם כי נחש ינחש':'Wusstet ihr nicht, dass er gewiss wahrsagen kann?'

};
const numbers={א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ל:30,מ:40,נ:50,ס:60,ע:70,פ:80,צ:90,ק:100,ר:200,ש:300,ת:400};
function numeral(s){if(!s||s==='ל'||!/^ת{0,2}[שרק]?(?:[צפעסנמלכ][אבגדהוזחט]?|י[אבגדהוזחט]?|ט[וז]|[אבגדהוזחט])?$/.test(s))return null;const n=[...s].reduce((n,c)=>n+numbers[c],0);return n>0&&n<1000?n:null;}
function amount(n){return ({1:'Einmal',2:'Zweimal',3:'Dreimal',4:'Viermal',5:'Fünfmal',6:'Sechsmal',7:'Siebenmal',8:'Achtmal',9:'Neunmal',10:'Zehnmal',11:'Elfmal',12:'Zwölfmal'})[n]||n+'-mal';}
const qualifiers={
 'מל':'voll geschrieben','ומל':'und voll geschrieben','מלא':'voll geschrieben','חס':'defektiv geschrieben','וחס':'und defektiv geschrieben','חסר':'defektiv geschrieben',
 'בתו':'in der Tora','בתורה':'in der Tora','בספ':'in diesem Buch','בספר':'in diesem Buch','בקריה':'in der Schrift','בק':'in der Schrift',
 'בטע':'mit dieser Akzentuierung','בטעמ':'mit dieser Akzentuierung','בטעמא':'mit dieser Akzentuierung','בט':'mit dieser Akzentuierung',
 'רא פס':'am Versanfang','רא פסו':'am Versanfang','ראש פסוק':'am Versanfang','סו פס':'am Versende','סו פסו':'am Versende',
 'כת כן':'so geschrieben','כתי כן':'so geschrieben','כתיב כן':'so geschrieben','מלעי':'mit Betonung auf der vorletzten Silbe','מלרע':'mit Betonung auf der letzten Silbe',
 'רפי':'ohne Dagesch','רפ':'ohne Dagesch','רפה':'ohne Dagesch','בליש':'in dieser Wortform','בלישנא':'in dieser Wortform','בלי':'in dieser Wortform','דגש':'mit Dagesch',
 'בתחילת פסוק':'am Versanfang','בסוף פסוק':'am Versende','בפסו':'im Vers','ובפסו':'und im Vers',
 'בו':'darin','ובע':'und in diesem Zusammenhang','בע':'in diesem Zusammenhang','בענ':'in diesem Zusammenhang','בענינא':'in diesem Zusammenhang',
 'דסמיכין':'als zusammenhängende Wortgruppe',
 'מלר':'mit Betonung auf der letzten Silbe','מלע':'mit Betonung auf der vorletzten Silbe','ומלעי':'und mit Betonung auf der vorletzten Silbe',
 'ראש פסוקים':'am Versanfang','רא פסוקים':'am Versanfang','ריש פסו':'am Versanfang','ריש פס':'am Versanfang','ראשי פסוקים':'am Versanfang',
 'סוף פסוק':'am Versende','סופי פסוקים':'am Versende','בפס':'im Vers','ובפס':'und im Vers',
 'חד':'einmal','מן':'von','א בתורה':'einmal in der Tora','א בנביאים':'einmal in den Propheten','וא בכתובים':'und einmal in den Schriften',
 'דג':'mit Dagesch','דגשין':'mit Dagesch','קמצין':'mit Qamets','קמ':'mit Qamets','פתחין':'mit Patach','פת':'mit Patach','בג נקדות':'mit drei Vokalpunkten',
 'בלשון דחילו':'in der Bedeutung „sich fürchten“','בלש דחילו':'in der Bedeutung „sich fürchten“',
 'זוגין':'Wortpaare','זוג':'Wortpaare','בתרי ליש':'in zweierlei Ausdrucksweise','בתרין טעמ':'mit zwei Akzentuierungen',
 'תבירא':'Tevir','תבי':'Tevir','בגברי':'bei männlichen Personen oder Formen','בנקבות':'bei weiblichen Personen oder Formen',
 'בתור':'in der Tora','באוריתא':'in der Tora','בתורה':'in der Tora','בנביאים':'in den Propheten','בכתובים':'in den Schriften',
 'משמשין אנך':'verteilt auf Tora, Propheten und Schriften','ומש אנך':'und verteilt auf Tora, Propheten und Schriften',
 'וסימניה':'und ihre Erkennungsstellen','וסימניהון':'und ihre Erkennungsstellen','וסימנהון':'und ihre Erkennungsstellen','וסימנהו':'und ihre Erkennungsstellen','וסימ':'und ihre Erkennungsstellen','וסי':'und ihre Erkennungsstellen',
 'סימן':'Merkzeichen','סימנהון':'ihre Erkennungsstellen','סימניהון':'ihre Erkennungsstellen','מלין':'Wörter','פסוקים':'Verse','פסו':'Verse','פס':'Verse',
 'לית דכוותיה':'ohne weitere entsprechende Stelle','לית דכותיה':'ohne weitere entsprechende Stelle','לית דכותה':'ohne weitere entsprechende Stelle','לית דכות':'ohne weitere entsprechende Stelle',
 'ולית דכות':'und ohne weitere entsprechende Stelle','כל':'alle','כולהון':'alle','כלהון':'alle','כלם':'alle','כולהם':'alle',
 'כתי כן':'so geschrieben','כת כן':'so geschrieben'
,
 'חס ו':'defektiv ohne Waw geschrieben','חס י':'defektiv ohne Jod geschrieben','חס דחס':'doppelt defektiv geschrieben','מל דמל':'doppelt voll geschrieben',
 'א חס':'einmal defektiv geschrieben','וא חס':'und einmal defektiv geschrieben','א מל':'einmal voll geschrieben','וא מל':'und einmal voll geschrieben',
 'ב חס':'zweimal defektiv geschrieben','וב חס':'und zweimal defektiv geschrieben','ג חס':'dreimal defektiv geschrieben','ד חס':'viermal defektiv geschrieben',
 'ב מל':'zweimal voll geschrieben','וב מל':'und zweimal voll geschrieben','ג מל':'dreimal voll geschrieben','ד מל':'viermal voll geschrieben',
 'נון רבתי':'mit großem Nun','יתיר':'zusätzlich geschrieben','לית דכוותיה בקריה':'ohne weitere entsprechende Stelle in der Schrift',
 'רא פסו בספ':'am Versanfang in diesem Buch','רא פס בספ':'am Versanfang in diesem Buch','ריש פסו בספ':'am Versanfang in diesem Buch'
,
 'כולו מלא':'ganz voll geschrieben','כלו מלא':'ganz voll geschrieben','כלו חסר':'ganz defektiv geschrieben',
 'בסיפרא':'in diesem Buch','בס':'in diesem Buch','בקריא':'in der Schrift','אוריתא':'Tora','דיהושע':'bei Josua','דשמואל':'bei Samuel','דמלכים':'in den Königsbüchern','דדברי הימים':'in den Chronikbüchern',
 'בב':'jeweils zwei','בענין':'in diesem Zusammenhang','זוגין מן בב':'Wortpaare aus jeweils zwei Stellen',
 'ולא':'und nicht','לא':'nicht','כתיב':'geschrieben','כתי':'geschrieben','נסיב וו':'erhält Waw','לא נסיב וו':'erhält kein Waw','ושאר':'und die übrigen','קדמא':'die erste Stelle','ובתרא':'und die letzte Stelle',
 'יתיר ו':'mit zusätzlichem Waw','יתיר י':'mit zusätzlichem Jod','וכל':'und alle','דכותהון':'ebenso','דכות':'ebenso','חד מן':'eine von',
 'קמצים':'mit Qamets','פתחין':'mit Patach','ה קמצין':'fünfmal mit Qamets','בתו':'in der Tora','בטע תבי':'mit Tevir',
 'מלרע':'mit Endbetonung','מלר':'mit Endbetonung','מלעיל':'mit Betonung auf der vorletzten Silbe','ומלעיל':'und mit Betonung auf der vorletzten Silbe',
 'כד':'vierundzwanzigmal','ולית':'und es gibt keine weitere Stelle','דסמיכין אהדדי':'unmittelbar nebeneinanderstehend'

};
function formula(raw){
 const s=fold(raw);if(Object.hasOwn(exact,s)){const de=exact[s];return {de,status:de.startsWith('[Un')?'partial':'draft',uncertain:de.startsWith('[Un')?[raw]:[]};}
 const tokens=s.split(' '),rawTokens=raw.trim().split(/\s+/);let prefix='';
 const numberAt=rawTokens.findIndex((t,i)=>i>0&&(/[\u05c4\u05c5\u0307׳״']/.test(t)&&numeral(fold(t))!==null||i>0&&['לית','ל'].includes(fold(t))));
 let oneOf=false;
 if(numberAt>0&&!numeral(tokens[0])&&!['ל','לית'].includes(tokens[0])){
  let subject=tokens.slice(0,numberAt).join(' ');
  if(subject.endsWith(' חד מן')){oneOf=true;subject=subject.slice(0,-' חד מן'.length).trim();}
  if(numberAt>6||/(?:דכות|כל אורית|ואינון|משמשין|בר מן|בר מין|במ(?:\s|$)|רישי פסוק)/.test(subject))return null;
  tokens.splice(0,numberAt);prefix=(subject?'„'+subject+'“: ':'');
 }
 const first=tokens.shift();let lead;
 if(first==='ל'||first==='לית')lead='Einmalig';else{
  const n=numeral(first),original=rawTokens[prefix?numberAt:0],marked=/[\u05c4\u05c5\u0307׳״']/.test(original);
  if(!n||(['מל','חס','מלא','חסר','שם','כת','ק'].includes(first))||!marked&&(tokens.length||first.length>1))return null;
  lead=oneOf?'Eine von '+n+' Stellen':amount(n);
 }
 if(!tokens.length)return {de:prefix+lead+'.',status:'draft',uncertain:[]};
 let rest=tokens.join(' '),out=[],unknown=[];
 const keys=Object.keys(qualifiers).sort((a,b)=>b.length-a.length);
 while(rest){const key=keys.find(k=>rest===k||rest.startsWith(k+' '));if(key){out.push(qualifiers[key]);rest=rest.slice(key.length).trim();}else{const t=rest.split(' ')[0];unknown.push(t);out.push('[Unklar: '+t+']');rest=rest.slice(t.length).trim();}}
 return {de:prefix+lead+', '+out.join(', ')+'.',status:unknown.length?'partial':'draft',uncertain:unknown.length?[raw]:[]};
}
function translate(reading){
 const raw=String(reading.text||'');
 if(!raw.trim())return {de:'[Keine Transkription vorhanden.]',status:'partial',uncertain:[]};
 if(/[#\uFFFD…\[\]]|\.\.\./.test(raw))return {de:'[Unklarer oder unleserlicher Quelltext: '+raw+']',status:'partial',uncertain:[raw]};
 const first=raw.trim().split(/\s+/)[0],bare=fold(first),marked=/[\u05c4\u05c5\u0307׳״']/.test(first);
 // Marked number-like source tokens must never become a Biblical word gloss.
 if(marked&&(/^[א-ת\u05c4\u05c5\u0307׳״']+$/.test(first))){
  const lexical={מל:'Voll geschrieben.',מלא:'Voll geschrieben.',חס:'Defektiv geschrieben.',חסר:'Defektiv geschrieben.',רפ:'Ohne Dagesch.',רפי:'Ohne Dagesch.',קרי:'Gelesen:',כתיב:'Geschrieben:'};
  if(raw.trim().split(/\s+/).length===1&&lexical[bare])return {de:lexical[bare],status:'draft',uncertain:[]};
  if(bare==='ל'||bare==='לית'||numeral(bare)!==null){const f=formula(raw);if(f)return f;}
  if(raw.trim().split(/\s+/).length===1&&bare.length<=4)return {de:'[Unklare masoretische Zeichenfolge: '+raw+']',status:'partial',uncertain:[raw]};
 }
 return quoted(reading)||formula(raw)||fragments(reading)||{de:'[Unklar: '+raw+']',status:'partial',uncertain:[raw]};
}

function build(input='/tmp/safran-masora-translation-input-3.jsonl'){
 const entries=Array.isArray(input)?input:fs.readFileSync(input,'utf8').trim().split('\n').map(JSON.parse);return entries.map(e=>{return {ordinal:e.ordinal,uuid:e.uuid,sourceHash:e.sourceHash,readings:e.readings.map(r=>({uuid:r.uuid,...translate(r)}))};});
}
if(require.main===module){const out=build(process.argv[2]);fs.writeFileSync(process.argv[3]||path.join(root,'masora-translations/part-3.json'),JSON.stringify(out,null,1)+'\n');let draft=0,partial=0;for(const e of out)for(const r of e.readings)r.status==='draft'?draft++:partial++;console.log({contexts:out.length,draft,partial});}
module.exports={translate,build};
