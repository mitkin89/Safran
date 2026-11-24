'use strict';
// Reproducible German working translations for contexts 2501–5000.
// Exact quotations reuse existing public-domain German alignments only when whole Hebrew
// words and all selected German alignment segments agree; no verse paraphrases.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../../..'),D=require(path.join(root,'library-masora-data'));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f׳״'".,;:!?()[\]{}]/g,'').replace(/־/g,' ').replace(/\s+/g,' ').trim();
const hw=s=>norm(String(s).replace(/<[^>]*>/g,'')).split(' ').filter(Boolean).map(x=>['ייי','יי','ייי׳'].includes(x)?'יהוה':x);
const dictionaries={};
let verses,firstIndex;
function corpus(){
 if(verses)return;
 verses=[];firstIndex=new Map();
 const entries=require(path.join(root,'bundled/manifest.json')).items.filter(e=>e.kind==='he'&&/^Westminster/.test(e.versionTitle));
 for(const e of entries){
  const file=path.join(root,'interlin',e.title.replace(/ /g,'_')+'.js');if(!fs.existsSync(file))continue;
  const window={};vm.runInNewContext(fs.readFileSync(file,'utf8'),{window});const align=window.INTERLIN_PARTS[e.title];if(!align)continue;
  const he=require(path.join(root,'bundled',e.rel));
  for(let c=0;c<he.text.length;c++)for(let v=0;v<(he.text[c]?.length||0);v++){
   const html=he.text[c][v],key=(c+1)+':'+(v+1),segs=Object.fromEntries(['Philippson','Goldschmidt','Hirsch','Herxheimer','Mendelssohn','Zunz'].filter(k=>align[k]?.[key]).map(k=>[k,align[k][key]]));if(typeof html!=='string'||!Object.keys(segs).length)continue;
   const words=[...html.matchAll(/<span class="w"[^>]*>([\s\S]*?)<\/span>/g)].map(m=>hw(m[1]).join(''));
   const row={book:e.title,chapter:c+1,verse:v+1,words,segs};verses.push(row);
   for(let i=0;i<words.length;i++){const w=words[i];if(!firstIndex.has(w))firstIndex.set(w,[]);firstIndex.get(w).push([row,i]);}
  }
 }
}
const quoteCache=new Map();
function quotation(text,refs=[]){
 const key=JSON.stringify([text,refs]);if(quoteCache.has(key))return quoteCache.get(key);
 corpus();const needle=hw(text);if(!needle.length||needle.some(w=>!/^[א-ת]+$/.test(w)))return null;
 const anchors=refs.map(D.bibleRef).filter(Boolean),candidates=firstIndex.get(needle[0])||[],found=[];
 for(const [row,i]of candidates){
  if(anchors.length&&!anchors.some(r=>r.book===row.book&&r.chapter===row.chapter&&row.verse>=r.verse&&row.verse<=r.endVerse))continue;
  if(!anchors.length&&needle.length<2)continue;
  if(!needle.every((w,j)=>row.words[i+j]===w))continue;
  for(const [edition,allSegs]of Object.entries(row.segs)){
   const ids=new Set(needle.map((_,j)=>i+j+1));if(allSegs.some(([a])=>a.some(id=>ids.has(id))&&a.some(id=>!ids.has(id))))continue;const segs=allSegs.filter(([a])=>a.length&&a.every(id=>ids.has(id))),covered=new Set(segs.flatMap(([a])=>a));
   if([...ids].some(id=>!covered.has(id)))continue;
   const de=segs.map(([,t])=>String(t).replace(/<[^>]+>/g,'')).join(' ').replace(/\s+/g,' ').trim();
   if(de)found.push({de,ref:row.book+' '+row.chapter+':'+row.verse,edition,method:'aligned-quotation'});
  }
 }
 let result=null;for(const edition of ['Philippson','Goldschmidt','Hirsch','Herxheimer','Mendelssohn','Zunz']){const variants=new Map(found.filter(x=>x.edition===edition).map(x=>[x.de,x]));if(variants.size){if(variants.size===1)result=[...variants.values()][0];break;}}quoteCache.set(key,result);return result;
}
const number=s=>{const x=norm(s),n={א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ל:30,מ:40,נ:50,ס:60,ע:70,פ:80,צ:90,ק:100,ר:200,ש:300,ת:400};if(['ל','ק','מל','חס','מלא','שם','נח','חסר','דג','רפ','כת'].includes(x))return null;if(!/^(?:ת{0,2}[שרק]?)?(?:[צפעסנמלכ][אבגדהוזחט]?|י[אבגדהוזחט]?|ט[וז]|[אבגדהוזחט])?$/.test(x)||!x)return null;const v=[...x].reduce((a,c)=>a+n[c],0);return v>0&&v<1000?v:null;};
const atoms={ל:'einmalig',לית:'einmalig',ליתא:'einmalig',חסר:'defektiv geschrieben',חס:'defektiv geschrieben',וחס:'und defektiv geschrieben',וחסר:'und defektiv geschrieben',מל:'voll geschrieben',מלא:'voll geschrieben',ומל:'und voll geschrieben',ומלא:'und voll geschrieben',דגש:'mit Dagesch',דג:'mit Dagesch',דגוש:'mit Dagesch',רפי:'ohne Dagesch',רפה:'ohne Dagesch',רפ:'ohne Dagesch',ורפי:'und ohne Dagesch',ורפ:'und ohne Dagesch',פס:'Verse',פסו:'Verse',פסוק:'Vers',פסוקים:'Verse',בתו:'in der Torah',בתור:'in der Torah',בתורה:'in der Torah',אורית:'in der Torah',אוריתא:'in der Torah',אורי:'in der Torah',בתורי:'in der Torah',בליש:'in dieser Wortform',בלישניה:'in dieser Wortform',בלישני:'in dieser Wortform',בלישנ:'in dieser Wortform',וסימני:'und die Belegstellen sind',וסי:'und die Belegstellen sind',וסימנהון:'und die Belegstellen sind',בסיפרא:'in diesem Buch',בספר:'in diesem Buch',בספרה:'in diesem Buch',קריה:'in der Bibel',נביאים:'in den Propheten',וכתובים:'und den Schriften',בנביאים:'in den Propheten',ובאוריתא:'und in der Torah',בעינייניה:'im selben Zusammenhang',בעיניני:'im selben Zusammenhang',בעינייני:'im selben Zusammenhang',בעינייא:'im selben Zusammenhang',בעיניי:'im selben Zusammenhang',בעינין:'im selben Zusammenhang',בלש:'in dieser Wortform',בלישנא:'in dieser Wortform',בלשון:'in dieser Wortform',וסימ:'und die Belegstellen sind',וסימן:'und die Belegstellen sind',וסימניהון:'und die Belegstellen sind',וסימנהון:'und die Belegstellen sind',וסימנ:'und die Belegstellen sind',וסימני:'und die Belegstellen sind',וסימניה:'und die Belegstellen sind',סימן:'Belegstelle',סימנהון:'ihre Belegstellen',סימניהון:'ihre Belegstellen',סימ:'Belegstelle',בטע:'mit dieser Akzentuierung',בטעם:'mit dieser Akzentuierung',בטעמה:'mit dieser Akzentuierung',בטעמו:'mit dieser Akzentuierung',טעם:'Akzent',קרי:'gelesen',קרייה:'in der Lesung',וקריי:'und gelesen',כת:'geschrieben',כתב:'geschrieben',כתיב:'geschrieben',וכת:'und geschrieben',כן:'so',כל:'alle',וכל:'und alle',כול:'alle',כולהון:'sie alle',וכולהון:'und sie alle',שאר:'die übrigen',ושאר:'und die übrigen',תיניינא:'das zweite',תינינא:'das zweite',תיניאנא:'das zweite',תנינא:'das zweite',תינין:'das zweite',תיניא:'das zweite',תינינ:'das zweite',תיניאנ:'das zweite',תינ:'das zweite',תיניינ:'das zweite',קמא:'das erste',קדמאה:'das erste','יו״ד':'Jod',יוד:'Jod',אלף:'Aleph',אלפ:'Aleph',ואו:'Waw',וו:'Waw',הא:'He',הי:'He',ואחד:'und einmal',וחד:'und einmal',אחד:'einmal',חד:'einmal',וא:'und einmal',ואינון:'und es sind',ואינין:'und es sind',והדין:'und diese Stelle hier',ודין:'und diese Stelle hier',וחבירו:'und die Parallelstelle',וחברו:'und die Parallelstelle',וחבריה:'und die Parallelstelle',דכותיה:'entsprechend ebenso',דכוותיה:'entsprechend ebenso',דכוותיהון:'entsprechend ebenso',דאוריתא:'der Torah',דאורית:'der Torah',כלל:'insgesamt',ריש:'am Anfang',בריש:'am Anfang',סוף:'am Ende',בסוף:'am Ende'};
const exact={
 '':'[Keine Texttranskription überliefert.]',
 'ו״א':'Und einmal.', 'וא':'Und einmal.',
 'כל אורית חס':'In der ganzen Torah defektiv geschrieben.',
 'כל אורי חס':'In der ganzen Torah defektiv geschrieben.',
 'כל אורית מל':'In der ganzen Torah voll geschrieben.',
 'כל מל':'Überall voll geschrieben.',
 'כת כן':'So geschrieben.',
 'ל כת כן':'Einmalig in dieser Schreibung.',
 'ל וכת כן':'Einmalig und so geschrieben.',
 'בר מן חד':'Mit einer Ausnahme.',
 'במ':'Mit Ausnahme von',
 'רא פס':'Am Versanfang.',
 'רא פסו':'Am Versanfang.',
 'ר פס':'Am Versanfang.',
 'ר פ':'Am Versanfang.',
 'ודין':'Und diese Stelle hier.',
 'וחבירו':'Und die Parallelstelle.',
 'וחברו':'Und die Parallelstelle.'
};
function formula(text){
 const clean=norm(text),tokens=clean.split(' ').filter(Boolean),raw=String(text).trim().split(/\s+/);
 if(Object.hasOwn(exact,clean))return {de:exact[clean],uncertain:[],method:'formula-translation'};
 if(!tokens.length)return null;
 // Only formula-shaped text is handled compositionally. Unmarked arbitrary words
 // are never interpreted as numbers, and opaque shorthand is left explicitly open.
 if(!atoms[tokens[0]]&&!(number(tokens[0])!==null&&(/[\u05c4\u05c5\u0307׳״]/.test(raw[0]||'')||(tokens.length===1&&tokens[0].length===1))))return null;
 const out=[],uncertain=[];let matched=0;
 for(let i=0;i<tokens.length;i++){
  const tok=tokens[i],pair=tokens.slice(i,i+2).join(' '),triple=tokens.slice(i,i+3).join(' ');
  if(triple==='בר מן חד'){out.push('mit einer Ausnahme');matched+=3;i+=2;continue;}
  if(pair==='כת כן'){out.push('so geschrieben');matched+=2;i++;continue;}
  if(pair==='רא פס'||pair==='רא פסו'||pair==='ר פס'||pair==='ר פ'){out.push('am Versanfang');matched+=2;i++;continue;}
  if(i>0&&['חס','חסר','וחס','וחסר','מל','מלא','ומל','ומלא','כת','וכת'].includes(tokens[i-1])&&/^[א-ת]$/.test(tok)){const letters={א:'Aleph',ב:'Bet',ג:'Gimel',ד:'Dalet',ה:'He',ו:'Waw',ז:'Sajin',ח:'Chet',ט:'Tet',י:'Jod',כ:'Kaf',ל:'Lamed',מ:'Mem',נ:'Nun',ס:'Samech',ע:'Ajin',פ:'Pe',צ:'Tsade',ק:'Qof',ר:'Resch',ש:'Schin',ת:'Taw'};out.push(letters[tok]);matched++;continue;}
  const exception=/^במ([א-ת]+)$/.exec(tok);if(exception&&number(exception[1])!==null){out.push('mit '+number(exception[1])+' Ausnahmen');matched++;continue;}
  if(atoms[tok]){out.push(atoms[tok]);matched++;continue;}
  const n=number(tok);if(n!==null&&(/[\u05c4\u05c5\u0307׳״]/.test(raw[i]||'')||(tokens.length===1&&tok.length===1))){out.push(n+'-mal');matched++;continue;}
  uncertain.push(raw[i]||tok);out.push('[Unklar: '+(raw[i]||tok)+']');
 }
 if(!matched)return null;
 let de=out.join(', ').replace(/, und /g,' und ').replace(/, in /g,', in ').replace(/^(.)/u,c=>c.toUpperCase())+'.';
 return {de,uncertain,method:'formula-translation'};
}
function translateReading(r,entry){
 const text=r.text||'',clean=norm(text),head=String(text).trim().split(/\s+/)[0]||'',headClean=norm(head);
 // Masoretic count/abbreviation marks have semantic priority over Bible-word
 // normalization. A dotted לוׄ is 36, not the biblical pronoun translated 'ihm'.
 const markedFormula=/[\u05c4\u05c5\u0307׳״]/.test(head)&&(Object.hasOwn(atoms,headClean)||/^(?:[א-ת][\u05c4\u05c5\u0307׳״]+)+$/.test(head));
 if(markedFormula){
  const f=formula(text),value=manual[text]??manual[clean];
  if(f&&!f.uncertain.length)return {uuid:r.uuid,...f,status:'draft'};
  if(value!==undefined)return {uuid:r.uuid,...(typeof value==='string'?{de:value,status:value.includes('[Unklar:')?'partial':'draft',uncertain:[...value.matchAll(/\[Unklar: ([^\]]+)\]/g)].map(m=>m[1]),method:'editorial-draft'}:value)};
  if(f)return {uuid:r.uuid,...f,status:'partial'};
  return {uuid:r.uuid,de:'[Unklar: '+text+']',status:'partial',uncertain:[text],method:'unresolved-formula'};
 }
 const quote=quotation(text,r.references);
 if(quote)return {uuid:r.uuid,...quote,status:'draft',uncertain:[]};
 if(Object.hasOwn(manual,text)||Object.hasOwn(manual,clean)){const value=manual[text]??manual[clean];return {uuid:r.uuid,...(typeof value==='string'?{de:value,status:value.includes('[Unklar:')?'partial':'draft',uncertain:[...value.matchAll(/\[Unklar: ([^\]]+)\]/g)].map(m=>m[1]),method:'editorial-draft'}:value)};}
 // A lemma followed by an explicit formula is translated in separate source spans.
 const raw=String(text).trim().split(/\s+/),label=norm(entry.label).split(' ');
 let split=label.length&&label.every((w,i)=>w===norm(raw[i]||''))?label.length:-1;
 if(split<1)split=raw.findIndex((w,i)=>i>0&&(/[\u05c4\u05c5\u0307׳״]/.test(w)||norm(w)==='כל'));
 if(split>0){const prefix=raw.slice(0,split).join(' '),suffix=raw.slice(split).join(' '),q=quotation(prefix,r.references),f=formula(suffix);if(q&&f)return {uuid:r.uuid,de:'„'+q.de+'“ — '+f.de,status:f.uncertain.length?'partial':'draft',uncertain:f.uncertain,method:'aligned-quotation-and-formula',attribution:q.edition+' · '+q.ref};}
 const f=formula(text);if(f)return {uuid:r.uuid,...f,status:f.uncertain.length?'partial':'draft'};
 return {uuid:r.uuid,de:'[Unklar: '+text+']',status:'partial',uncertain:[text],method:'unresolved-source'};
}
// Exact-text editorial working translations, added after inspection of residual readings.
const manual={
 "וׄאׄ השביעני במרורים": "Und einmal: „Er sättigte mich mit Bitterkeiten.“",
 "לקבר כל אוריׄ חסׄ": "„Begraben“: in der ganzen Torah defektiv geschrieben.",
 "גם רכב יׄ פסׄ בתוׄ גם גם ומלה ביניהון": "„Auch Wagen“: In zehn Versen der Torah stehen zweimal „auch“ mit einem Wort dazwischen.",
 "יושב הארץ יׄזׄ מלׄ": "„Bewohner des Landes“: siebzehnmal voll geschrieben.",
 "צום גׄ וסימׄ": "„Er befahl ihnen“: dreimal; die Belegstellen sind:",
 "ויקמו": "Und sie standen auf.",
 "לקבר כל אוריתׄ חסׄ": "„Begraben“: in der ganzen Torah defektiv geschrieben.",
 "כלׄ בשתא דאָנָא כתׄ אלף בׄמׄה כתׄ היׄ": "Alle Fälle von „ich“ sind mit Aleph geschrieben, außer an fünf Stellen mit He. [Unklar: בשתא].",
 "הננו בׄ דגשׄ וסימׄ": "„Hier sind wir“: zweimal mit Dagesch; die Belegstellen sind:",
 "לׄ וכל קריׄ ואל שדי": "Einmalig; sonst überall: „und El Schaddai“.",
 "יׄ פסׄ בתוׄ גם גם ומלה ביניהון": "Zehn Verse in der Torah mit zweimal „auch“ und einem Wort dazwischen.",
 "וויעקב התחת אלהים אנכי": "Und Jakob: „Bin ich etwa an Gottes Stelle?“",
 "אנכי עשיתי ארץ אני ידי נטו שמים": "Ich habe die Erde gemacht; meine Hände haben die Himmel ausgespannt.",
 "עשה כתׄ היׄ שאׄ להם יוסף הקׄבׄהׄ עשה ולא אני": "„Gemacht“ ist mit He geschrieben; denn Joseph sagte ihnen: Der Heilige, gelobt sei er, hat es gemacht, nicht ich.",
 "על ברכי כל דגשׄ בׄמׄב רפׄ": "„Auf den Knien“: überall mit Dagesch, außer zweimal ohne Dagesch.",
 "על ברכוה": "Auf seinen Knien.",
 "ילדו גׄ וסימניׄ": "„Sie wurden geboren“: dreimal; die Belegstellen sind:",
 "עצמתי וׄ חסׄ בלישׄ וסימניהון": "„Meine Gebeine“: sechsmal in dieser Wortform defektiv geschrieben; die Belegstellen sind:",
 "והעליתם": "Dann bringt hinauf.",
 "עצור": "Zurückgehalten.",
 "ושפי עצמתיו לא ראו": "Und seine bloßliegenden Gebeine sieht man nicht.",
 "וישבע": "Und er ließ schwören.",
 "ואלה שמות וׄ רׄ פסׄ": "„Und dies sind die Namen“: sechsmal am Versanfang.",
 "כי תקראנה הׄ וכל כי וכי דכוותיהׄ בׄמׄא": "„Wenn eintreffen“: fünfmal; alle Fälle mit „denn“ und „und wenn“ ebenso, mit einer Ausnahme.",
 "כי ירבה לסלח": "Denn er vergibt reichlich.",
 "ענתו בׄ וחסׄ": "„Ihn bedrücken“: zweimal, defektiv geschrieben.",
 "ויעשו": "Und sie taten.",
 "לׄ ושאר לפשע": "Einmalig; die übrigen Fälle: „zum Vergehen“.",
 "ה דג": "Fünfmal mit Dagesch.",
 "יׄ קׄ": {
  "de": "Zehnmal [Unklar: קׄ].",
  "status": "partial",
  "uncertain": [
   "קׄ"
  ],
  "method": "editorial-draft"
 },
 "מסכנת לׄ מלׄ": "„Vorratsstädte“: einmalig, voll geschrieben.",
 "רעמֿסס לׄ רפי": "„Raamses“: einmalig ohne Dagesch.",
 "האבנים בׄ בבׄ לישׄ וסימׄ": "„Die Gebärsteine“: zweimal in zwei Bedeutungen; die Belegstellen sind:",
 "על האבנים דבית היוצר": "„Auf den Steinen“ beim Töpferhaus.",
 "וא והמתם דאמנון": "Und einmal: „Dann tötet ihn“, bei Amnon.",
 "עשיתן הדבר יׄ חסׄ את": "„Ihr habt die Sache getan“: zehnmal ohne das Wort „et“.",
 "ותאמרן גׄ כתׄ כן": "„Und sie sagten“: dreimal so geschrieben.",
 "תבא אליהן לׄ חסׄ בתוׄ": "„Zu ihnen kommen“: einmalig, in der Torah defektiv geschrieben.",
 "הילוד בׄ ומלׄ": "„Der Geborene“: zweimal voll geschrieben.",
 "טוב הוא לׄ טׄ רב": "„Er ist gut“: einmalig mit großem Tet.",
 "מרחק דׄ חסׄ": "„Von fern“: viermal defektiv geschrieben.",
 "הלכת גׄ חסׄ": "„Du gehst“: dreimal defektiv geschrieben.",
 "העלמה בׄ": "„Die junge Frau“: zweimal.",
 "ותניקהו בׄ חסׄ וסימׄ": "„Und sie säugte ihn“: zweimal defektiv geschrieben; die Belegstellen sind:",
 "בית ייי שילה": "Das Haus des HERRN in Schilo.",
 "מכֶה הׄ": "„Schlagend“: fünfmal.",
 "נצים גׄ ובׄ בׄ לישׄ": "„Sie streiten“: dreimal, davon zweimal in zwei Bedeutungen.",
 "הׄ וכל כי וכי": "Fünfmal; alle Fälle mit „denn“ und „und wenn“.",
 "לׄ וחסׄ יׄ תיניׄ": "Einmalig; das zweite Jod fehlt.",
 "ותבאנה לׄ": "„Und sie kamen“: einmalig.",
 "ותמלאנה הׄ וכתׄ כן": "„Und sie füllten“: fünfmal so geschrieben.",
 "אביהן לׄ ומלׄ": "„Ihr Vater“: einmalig, voll geschrieben.",
 "ותאמרן כל אוריתא כתׄ כן בׄמׄא": "„Und sie sagten“: in der ganzen Torah so geschrieben, mit einer Ausnahme.",
 "וכל נביאים וכתובים דכוותיה בׄמׄא": "Und in allen Propheten und Schriften ebenso, mit einer Ausnahme.",
 "ויזכר אלהים דׄ": "„Und Gott gedachte“: viermal.",
 "משה": "Mose.",
 "אל הר יׄזׄ וכל הכרמל דכוותיה": "„Zum Berg“: siebzehnmal; alle Fälle mit „Karmel“ ebenso.",
 "הגדל כל חסׄ בׄמׄג": "„Der große“: überall defektiv geschrieben, mit drei Ausnahmen.",
 "סר כל קמץ בׄמׄב": "„Abgewichen“: überall mit Qamets, mit zwei Ausnahmen.",
 "וחברו דאחאב": "Und die Parallelstelle bei Ahab.",
 "משה לׄ ולא פסקׄ ושאר פסק": "„Mose“: einmalig ohne trennenden Strich; die übrigen Fälle mit trennendem Strich.",
 "עמד בׄ עמד": "„Stehend“: zweimal „stehend“.",
 "יחזקאל ישעיה ויהושע נעלך": "Bei Ezechiel, Jesaja und Josua: „deine Schuhe“.",
 "ולהעלתו חׄ חסׄ בלישניה": "„Und es heraufzuführen“: achtmal in dieser Wortform defektiv geschrieben.",
 "כתמפוס סימן": {
  "de": "Merkzeichen: [Unklar: כתמפוס].",
  "status": "partial",
  "uncertain": [
   "כתמפוס"
  ],
  "method": "editorial-draft"
 },
 "גׄ ובׄ בׄ לישׄ": "Dreimal, davon zweimal in zwei Bedeutungen.",
 "ודברת אליו דׄ וסימ": "„Und du sollst zu ihm sprechen“: viermal; die Belegstellen sind:",
 "הרצחת בׄ בו": "„Hast du gemordet?“: zweimal darin.",
 "והוריתי בׄ ומלׄ וסימניהון": "„Und ich werde unterweisen“: zweimal voll geschrieben; die Belegstellen sind:",
 "והוריתי אתכם בדרך טובה": "Und ich werde euch auf dem guten Weg unterweisen.",
 "אל יתר חתנו בׄ חסׄ וסיׄ": "„Zu Jeter, seinem Schwiegervater“: zweimal defektiv geschrieben; die Belegstellen sind:",
 "ובׄ על יתר": "Und zweimal: „auf Jeter“.",
 "ויאמר ייי֮ דׄ בטעמׄ וסימניהון": "„Und der HERR sprach“: viermal mit dieser Akzentuierung; die Belegstellen sind:",
 "צפרדעים": "Frösche.",
 "כנים": "Mücken.",
 "כבשן": "Ofen.",
 "ואׄ עשיתם וברחמיך": "Und einmal: „Du hast es gemacht“ und „in deinem Erbarmen“.",
 "צר בׄ חסׄ בלישניה וסימניהון": "„Feuerstein“: zweimal in dieser Wortform defektiv geschrieben; die Belegstellen sind:",
 "ואׄ ותִגע בראש": "Und einmal: „Und sie berührte die Spitze“.",
 "גׄ כתׄ האתת בתורׄ": "Dreimal ist „die Zeichen“ in der Torah so geschrieben.",
 "ינאצוני": "Sie werden mich verachten.",
 "ובמפתים": "Und mit Wundern.",
 "ואׄ כתׄ אותת": "Und einmal ist „Zeichen“ mit Waw geschrieben.",
 "ושאר אתת כתׄ": "In den übrigen Fällen ist „Zeichen“ ohne Waw geschrieben.",
 "ובׄ": "Und zweimal.",
 "האתת כל אוריתא חסׄ במׄדׄ": "„Die Zeichen“: in der ganzen Torah defektiv geschrieben, mit vier Ausnahmen.",
 "כל הדברים כל יׄגׄ חסׄ האלה": "„Alle Worte“: alle dreizehn Fälle ohne das Wort „diese“.",
 "ואׄ יחגו וינועו": "Und einmal: „Sie taumeln und schwanken“.",
 "נקרא כל כתׄ אׄ בׄמׄאׄ": "„Gerufen“: überall mit Aleph geschrieben, mit einer Ausnahme.",
 "ויצו פרעה בׄ": "„Und Pharao befahl“: zweimal.",
 "ואין מושיע": "Und niemand rettet.",
 "לאלהינו גׄ זוגין דמיין קדמאה לאלהינו תיניינא לייי": "„Unserem Gott“: drei ähnliche Paare; im ersten Teil „unserem Gott“, im zweiten „dem HERRN“.",
 "אתם דׄ רׄ פסׄ": "„Ihr“: viermal am Versanfang.",
 "ואׄ כלו": "Und einmal: „sie vergingen“.",
 "ירא ייי כל לשון דירא אל בׄמׄד על": "„Der HERR sehe“: jede Form von „sehen“ mit „el“, außer viermal mit „al“.",
 "ויאמר ייי דאחרי מות": "„Und der HERR sprach“ aus dem Abschnitt „Nach dem Tod“.",
 "וישפט שפט": "Und er richte.",
 "כל כתׄ אלף בׄמׄאׄ": "Überall mit Aleph geschrieben, mit einer Ausnahme.",
 "כלׄ טעמׄ לעיל בׄמׄא": "Überall liegt der Akzent auf der vorletzten Silbe, mit einer Ausnahme.",
 "כל לשון דירא וירא אל ק בׄמׄד על": {
  "de": "Jede Form von „sehen“ und „und er sah“ mit „el“ [Unklar: ק], außer viermal mit „al“.",
  "status": "partial",
  "uncertain": [
   "ק"
  ],
  "method": "editorial-draft"
 },
 "וירא": "Und er sah.",
 "וארא והנה על הרקיע": "Und ich sah, und siehe, über dem Himmelsgewölbe.",
 "וייי עליהם יראה": "Und der HERR wird über ihnen erscheinen.",
 "ירא כל טעׄ לעיל בׄמׄא": "„Sehen“: überall liegt der Akzent auf der vorletzten Silbe, mit einer Ausnahme.",
 "קׄלׄדׄ בקׄ כנגד מזרח דרום ומערב התחלתן וסופן קׄלׄדׄ לכן רוח צפון אינו מסוכך": {
  "de": "134 [Unklar: בקׄ]. Gegenüber Osten, Süden und Westen ergeben ihre Anfangs- und Endbuchstaben 134; deshalb ist die Nordseite nicht überdacht.",
  "status": "partial",
  "uncertain": [
   "בקׄ"
  ],
  "method": "editorial-draft"
 },
 "ובשפטים גׄ מלׄ בתורה": "„Und mit Strafgerichten“: dreimal in der Torah voll geschrieben.",
 "וסבלות לׄ מלׄ בתוׄ": "„Und Lasten“: einmalig, in der Torah voll geschrieben.",
 "סבלת דׄ ענייׄ מן בׄ מלין קדמא חסׄ תיניינא מלא": "„Lasten“: vier Zusammenhänge mit zwei Wörtern; das erste defektiv, das zweite voll geschrieben.",
 "סבלת": "Lasten.",
 "סרחים": "Die sich ausstrecken.",
 "הסליחות": "Die Vergebungen.",
 "וידבר משה בׄ בעינייניה": "„Und Mose sprach“: zweimal im selben Zusammenhang.",
 "ואׄ למה הרעות לעבדך": "Und einmal: „Warum hast du deinem Knecht Übles getan?“",
 "כל חסׄ בׄמׄבׄ": "Überall defektiv geschrieben, mit zwei Ausnahmen.",
 "בׄ פסׄ ומטעׄ בהון": "Zwei Verse, bei denen man sich irren kann.",
 "דין קדמׄ וחברׄ ועזיׄ": "Dies ist der erste Fall; die Parallelstelle hat „und Ussiel“.",
 "תיניׄ דמדבר חברון עזיאל": "Der zweite Fall in der Wüste: „Hebron und Ussiel“.",
 "ואׄ ביום דבר ייי את משה בהר סיני": "Und einmal: „An dem Tag, als der HERR am Berg Sinai zu Mose sprach“.",
 "והרביתי כל מלׄ": "„Und ich werde vermehren“: überall voll geschrieben.",
 "מופתי בׄ מלׄ": "„Meine Wunder“: zweimal voll geschrieben.",
 "לתנינם חסׄ שאׄעׄפי שעשו החרטמים מטותם תנינים לא היה כי אם רגע שבלע מטה אהרן את מטותם": "„Zu Schlangen“: defektiv geschrieben; denn obwohl die Zauberer ihre Stäbe zu Schlangen machten, dauerte es nur einen Augenblick, bis Aarons Stab ihre Stäbe verschlang.",
 "קדמא יהי לתנין": "Der erste Fall: „Er werde zur Schlange“.",
 "תיניינׄ ויהי לתנין": "Der zweite Fall: „Und er wurde zur Schlange“.",
 "וישליכו זׄ מלׄ": "„Und sie warfen“: siebenmal voll geschrieben.",
 "אלהם כל אוריתא חסׄ במׄיׄזׄ": "„Zu ihnen“: in der ganzen Torah defektiv geschrieben, mit siebzehn Ausnahmen.",
 "יצא טׄ חסׄ בלישניׄ": "„Er ging hinaus“: neunmal in dieser Wortform defektiv geschrieben.",
 "לשתות כל מלׄ בׄמׄד": "„Trinken“: überall voll geschrieben, mit vier Ausnahmen.",
 "ואׄ סתרי": "Und einmal: „Mein Schutz“.",
 "קדמׄ יהי לתנין": "Der erste Fall: „Er werde zur Schlange“.",
 "תינינׄ ויהי לתנין": "Der zweite Fall: „Und er wurde zur Schlange“.",
 "וסׄ": "Und sechzigmal.",
 "ויהיו דם גׄ בתורה חסׄ את": "„Und sie werden zu Blut“: dreimal in der Torah ohne das Wort „et“.",
 "דם": "Blut.",
 "ארבה": "Heuschrecken.",
 "חשך": "Finsternis.",
 "לשתת דׄ חסׄ": "„Trinken“: viermal defektiv geschrieben.",
 "בלטיהם דׄ": "„Mit ihren Zauberkünsten“: viermal.",
 "דדם": "Bei der Verwandlung in Blut.",
 "צפרדע": "Frosch.",
 "דכינים": "Bei den Mücken.",
 "סימן דׄצׄךׄ": "Merkzeichen: Detsach, die Anfangsbuchstaben von Blut, Fröschen und Mücken.",
 "גבולך גׄ מלׄ בתורה": "„Dein Gebiet“: dreimal in der Torah voll geschrieben.",
 "זתים": "Ölbäume.",
 "ובמשארותיך לׄ ומלׄ ו והטם לפי שנׄ התחלת הפורענות עיניׄ אחר לפי שנגיפי שלטו": {
  "de": "„Und in deinen Backtrögen“: einmalig, voll mit Waw geschrieben. [Unklar: והטם לפי שנׄ התחלת הפורענות עיניׄ אחר לפי שנגיפי שלטו].",
  "status": "partial",
  "uncertain": [
   "והטם לפי שנׄ התחלת הפורענות עיניׄ אחר לפי שנגיפי שלטו"
  ],
  "method": "editorial-draft"
 },
 "כל הצפרדעים רפי צדֿי ופתחה היׄ בגעיא לפני הפתח רק": {
  "de": "Bei allen Fällen von „die Frösche“ ist das Tsade ohne Dagesch und das He mit Patach; vor dem Patach steht ein Gaja. [Unklar: רק].",
  "status": "partial",
  "uncertain": [
   "רק"
  ],
  "method": "editorial-draft"
 },
 "ותעל הצׄ": "Und der Frosch stieg herauf.",
 "כל מלׄ בׄמׄדׄ": "Überall voll geschrieben, mit vier Ausnahmen.",
 "כל מלׄ בׄמׄד": "Überall voll geschrieben, mit vier Ausnahmen.",
 "בׄ בפׄ": {
  "de": "Zweimal [Unklar: בפׄ].",
  "status": "partial",
  "uncertain": [
   "בפׄ"
  ],
  "method": "editorial-draft"
 },
 "החרטמים בׄ חסׄ בעינייניׄ": "„Die Zauberer“: zweimal in diesem Zusammenhang defektiv geschrieben.",
 "השחין": "Die Geschwüre.",
 "השכם בבקר כל קריה כן בׄמׄא": "„Stehe früh am Morgen auf“: überall in der Bibel so, mit einer Ausnahme.",
 "בבקר השכם קללה תחשב": "Wer sich früh am Morgen aufmacht, dem wird es als Fluch angerechnet.",
 "יוצא המימה טׄ מלׄ יוצא טׄ מלׄ בנביאים ובאוריתא": "„Zum Wasser hinausgehen“: neunmal voll geschrieben; „hinausgehend“ ist neunmal in Propheten und Torah voll geschrieben.",
 "ובׄ מלׄ": "Und zweimal voll geschrieben.",
 "לזבח כל חסׄ בׄמׄא": "„Opfern“: überall defektiv geschrieben, mit einer Ausnahme.",
 "לזבח לעגלים אשר עשה ירבעם": "Um den Kälbern zu opfern, die Jerobeam gemacht hatte.",
 "לא נשאר חׄ": "„Es blieb nicht übrig“: achtmal.",
 "ערוב לא נשאר אחד": "Beim Ungeziefer: „Nicht eines blieb übrig“.",
 "פרעה לא נשאר בהם": "Bei Pharao: „Keiner von ihnen blieb übrig“.",
 "ועודך כל מלׄ בׄמׄא": "„Und noch du“: überall voll geschrieben, mit einer Ausnahme.",
 "מחזיק בתמתך דאיוב": "„Du hältst fest an deiner Frömmigkeit“ bei Hiob.",
 "ואׄ כתׄ אלף והפלא מכתך": "Und einmal mit Aleph geschrieben: „Und er wird deine Plagen außerordentlich machen“.",
 "יׄבׄ בטעׄ בסׄ": {
  "de": "Zwölfmal mit dieser Akzentuierung [Unklar: בסׄ].",
  "status": "partial",
  "uncertain": [
   "בסׄ"
  ],
  "method": "editorial-draft"
 },
 "פרעה לא נשאר עד אחד": "Bei Pharao: „Nicht einer blieb übrig“.",
 "כי ידבר": "Wenn er spricht.",
 "הראתך בׄ": "„Dich sehen lassen“: zweimal.",
 "דעיׄ חסׄ": {
  "de": "[Unklar: דעיׄ], defektiv geschrieben.",
  "status": "partial",
  "uncertain": [
   "דעיׄ"
  ],
  "method": "editorial-draft"
 },
 "דיחזקאל מלׄ": "Der Fall bei Ezechiel ist voll geschrieben.",
 "לפי שלא ראה פרעה כח השם רק יׄ מכות ואין צריך שמירה": "Weil Pharao von der Macht des Namens nur die zehn Plagen sah, bedurfte es keiner Bewahrung.",
 "כל דיחזקאל צריך ראייה בעין ושמירה בלב ושמיעה באזן לכן מלׄ": "Jeder Fall bei Ezechiel erfordert Sehen mit dem Auge, Bewahren im Herzen und Hören mit dem Ohr; deshalb voll geschrieben.",
 "דׄאׄ שהדברים שחסדך בבית שני": {
  "de": "Eine andere Erklärung: [Unklar: שהדברים שחסדך בבית שני].",
  "status": "partial",
  "uncertain": [
   "שהדברים שחסדך בבית שני"
  ],
  "method": "editorial-draft"
 },
 "כל את עמי בׄמׄבׄ": "Alle Fälle von „et ammi“, „mein Volk“, mit zwei Ausnahmen.",
 "ואׄ קשרם על לבְך": "Und einmal: „Binde sie auf dein Herz“.",
 "ואולם הׄ רׄ פסׄ וכל איוב בׄמׄג": "„Jedoch“: fünfmal am Versanfang und in allen Fällen bei Hiob, mit drei Ausnahmen.",
 "ואׄ משתולל": "Und einmal: „Wer sich vom Bösen fernhält“.",
 "קדמא ברד כמהו במצרים": "Der erste Fall: „Hagel, wie es ihn in Ägypten noch nicht gab“.",
 "תיניינא הברד אשר לא היה כמהו": "Der zweite Fall: „Der Hagel, wie es ihn noch nicht gab“.",
 "כל מלׄ בׄמׄא": "Überall voll geschrieben, mit einer Ausnahme.",
 "ועודך מחזיק בתומתך": "Und noch hältst du fest an deiner Frömmigkeit."
};
Object.assign(manual,{
 "כל מלׄ בׄמׄג חסׄ בלישׄ": "Überall voll geschrieben, außer dreimal in dieser Wortform defektiv.",
 "ואׄ מסתולל": "Und einmal: „Wer sich vom Bösen fernhält“.",
 "בצאתי לׄ": "„Als ich hinausging“: einmalig.",
 "היצא לׄ": "„Führe hinaus“: einmalig.",
 "המוצא לׄ": "„Der Gefundene“: einmalig.",
 "שיוצא לׄ": "„Die ausgeht“: einmalig.",
 "התוציא לׄ": "„Wirst du herausführen?“: einmalig.",
 "ואצאה לׄ": "„Und ich zog hinaus“: einmalig.",
 "המוציא לׄ": "„Der herausführt“: einmalig.",
 "קלת דׄ חסׄ בלישניׄ וסיׄ": "„Donnerstimmen“: viermal in dieser Wortform defektiv geschrieben; die Belegstellen sind:",
 "תסיפון גׄ חסׄ וׄ קדמא וסימׄ": "„Ihr sollt fortfahren“: dreimal ohne das erste Waw; die Belegstellen sind:",
 "תסיפון לתת תבן": "Ihr sollt fortfahren, Stroh zu geben.",
 "לא תסיפון לעמוד": "Ihr sollt nicht länger bleiben.",
 "לא תסיפון ראות פני": "Ihr sollt mein Angesicht nicht wieder sehen.",
 "ואׄ ותהלך": "Und einmal: „Und sie geht“.",
 "גׄ חסׄ וסיׄ": "Dreimal defektiv geschrieben; die Belegstellen sind:",
 "ויאמר ייי יׄבׄ בטעׄ בסיפרא": "„Und der HERR sprach“: zwölfmal mit dieser Akzentuierung in diesem Buch.",
 "יׄחׄ פסׄ על על": "Achtzehn Verse mit zweimal „auf“.",
 "רוח קדים כל קריה רוח קדים בׄמׄא": "„Ostwind“: überall in der Bibel „Ostwind“, mit einer Ausnahme.",
 "יבא קדים רוח בטנו": "Ein Ostwind wird kommen, ein Wind des HERRN.",
 "כמהו דׄ פסׄ דמיין לפניו ואחריו": "„Wie er“: vier Verse sind ähnlich in dem, was davor und danach steht.",
 "ובעץ ובשדה": "Und am Baum und auf dem Feld.",
 "העתירו לייי": "Fleht zum HERRN.",
 "ושאר אל ייי": "In den übrigen Fällen: „zu dem HERRN“, mit anderer Präposition.",
 "וכל קריה ים יסוף": "Und überall in der Bibel: „Schilfmeer“.",
 "על ארץ מצרים חלוף": "„Über das Land Ägypten“: abweichende Form.",
 "חשך אל ארץ מצרים": "Finsternis über das Land Ägypten.",
 "ויקרא פרעה חלוף": "„Und Pharao rief“: abweichende Form.",
 "ערוב ויקרא פרעה אל משה ואל אהרן": "Beim Ungeziefer: „Und Pharao rief Mose und Aaron“.",
 "חשך ויקרא פרעה אל משה": "Bei der Finsternis: „Und Pharao rief Mose“.",
 "ושאר אל משה ואל אהרן": "In den übrigen Fällen: „Mose und Aaron“.",
 "לׄ וכל קריה לא כן בׄמׄא": "Einmalig; überall sonst in der Bibel „nicht so“, mit einer Ausnahme.",
 "לא כן בדין": "„Nicht so“ an dieser Stelle.",
 "הראשן בׄ חסׄ וׄ בעינייניה בלישׄ": "„Der erste“: zweimal ohne Waw, in diesem Zusammenhang und in dieser Wortform.",
 "בראשן בארבעה": "Im ersten Monat, am vierzehnten Tag.",
 "בראשון בׄ חסׄ בׄ בעינייניה": "„Im ersten“: zweimal defektiv geschrieben, zweimal im selben Zusammenhang.",
 "מושבותיכם כל מלׄ בׄמׄג": "„Eure Wohnsitze“: überall voll geschrieben, mit drei Ausnahmen.",
 "ואׄ אל המשקוף": "Und einmal: „An die Oberschwelle“.",
 "והי֞ה דׄ בטעׄ בתורה": "„Und es wird sein“: viermal mit dieser Akzentuierung in der Torah.",
 "גדולות": "Große.",
 "כל מלׄ בׄמׄדׄ חסׄ": "Überall voll geschrieben, außer viermal defektiv.",
 "בׄ חסׄ וׄ בעינׄ": "Zweimal ohne Waw, im selben Zusammenhang.",
 "כל מלׄ בׄמׄג": "Überall voll geschrieben, mit drei Ausnahmen.",
 "צרורות בׄ וסימניהון בבׄ לישׄ": "„Gebunden“: zweimal in zwei Bedeutungen; die Belegstellen sind:",
 "ותהיינה צרורות": "Und sie blieben eingeschlossen.",
 "סכתה בׄ": "„Nach Sukkot“: zweimal.",
 "עֵרב רב בׄ קמצין": "„Viel Mischvolk“: mit zwei Qamets-Zeichen.",
 "וכל שתי וערב דכוותיה": "Und alle Fälle von „Kette und Schuss“ ebenso.",
 "עגת לׄ חסׄ דחס": "„Kuchen“: einmalig, doppelt defektiv geschrieben.",
 "מצות כל מלׄ בׄמׄד": "„Gebote“: überall voll geschrieben, mit vier Ausnahmen.",
 "מאות כל מלׄ בׄמׄג": "„Hunderte“: überall voll geschrieben, mit drei Ausnahmen.",
 "לשני שרי": "Den beiden Heerführern.",
 "נחלת צבי בׄ בפׄ וחסר": {
  "de": "„Ein herrliches Erbe“: zweimal [Unklar: בפׄ], defektiv geschrieben.",
  "status": "partial",
  "uncertain": [
   "בפׄ"
  ],
  "method": "editorial-draft"
 },
 "לׄ ושאׄ ואל אהרן": "Einmalig; sonst „und zu Aaron“.",
 "שלשם לׄ חסׄ דחסׄ": "„Vorgestern“: einmalig, doppelt defektiv geschrieben.",
 "ואׄ ושלישים על כלו": "Und einmal: „Und Wagenkämpfer über alle“.",
 "אותם לׄטׄ מלׄ": "„Sie“: neununddreißigmal voll geschrieben.",
 "ממתינו לׄ וחסׄ חד מן חסׄ בלישניה": "„Als unser Sterben“: einmalig, defektiv geschrieben; eine der defektiven Formen dieses Ausdrucks.",
 "בוזה דרכיו י[מו]ת": {
  "de": "Wer seine Wege verachtet, wird sterben [Textlesung in der Quelle ergänzt: י[מו]ת].",
  "status": "partial",
  "uncertain": [
   "י[מו]ת"
  ],
  "method": "editorial-draft"
 },
 "ואׄ מלׄ מי יתן החרש תחרשון": "Und einmal voll geschrieben: „O dass ihr doch ganz schwieget“.",
 "וגׄ חסׄ": "Und dreimal defektiv geschrieben.",
 "חומה בׄ": "„Mauer“: zweimal.",
 "בעינייניה": "Im selben Zusammenhang.",
 "וישקף בׄ וסימניׄ": "„Und er blickte herab“: zweimal; die Belegstellen sind:",
 "ויהי ממחרת": "Und es geschah am folgenden Tag.",
 "ויהם בׄ": "„Und er verwirrte“: zweimal.",
 "בׄ בעינייׄ": "Zweimal im selben Zusammenhang.",
 "ותינייׄ חסׄ": "Und der zweite Fall ist defektiv geschrieben.",
 "חׄ רפיין": "Achtmal ohne Dagesch.",
 "ויושע כל מלׄ בׄמׄג וסימׄ": "„Und er rettete“: überall voll geschrieben, mit drei Ausnahmen; die Belegstellen sind:",
 "ויושע דוד את יושבי קעילה": "Und David rettete die Bewohner von Keila.",
 "וישם דוד נציבים": "Und David setzte Statthalter ein.",
 "מחרב פיהם": "Vor dem Schwert ihres Mundes.",
 "במשה בׄ": "„An Mose“: zweimal.",
 "מרכבת חסׄ ויׄו": "„Wagen“: ohne Waw geschrieben.",
 "וׄ שעברו בויׄו מעלות בלילה כמו שנׄ": {
  "de": "Sechs Fälle mit Waw, die in der Nacht geschahen, wie es heißt: [Unklar: מעלות].",
  "status": "partial",
  "uncertain": [
   "מעלות"
  ],
  "method": "editorial-draft"
 },
 "ויהי באשמורת הבקר וישקף": "Und es geschah zur Morgenwache, da blickte er herab.",
 "דׄאׄ שכל המרכבות שטבעו לא היו להם לפני הקׄ אלא ברכב אחד": "Eine andere Erklärung: Alle Wagen, die versanken, waren vor dem Heiligen, gelobt sei er, nur wie ein einziger Wagen.",
 "מרכבת חׄ חסׄ בלישניה": "„Wagen“: achtmal in dieser Wortform defektiv geschrieben.",
 "במצלות לׄ וחסר": "„In die Tiefen“: einmalig, defektiv geschrieben.",
 "הבאים בראש העמוד וההיׄ מן ביה שמו": "Die Buchstaben am Anfang der Spalte; das He gehört zu „Bejah schemo“, „Jah ist sein Name“.",
 "לקול יׄדׄ בלשון שמיעה ושאר בקול": "„Auf die Stimme“: vierzehnmal im Sinn von Hören; die übrigen Fälle mit „bei der Stimme“.",
 "כל המחלה יׄ פסׄ כל בכל ומלה ביניהון": "„Alle Krankheit“: zehn Verse mit „alle“ und „bei allem“, mit einem Wort dazwischen.",
 "אילם כל אוריתא כלׄ אוריתא כתׄ כן בׄמׄדׄ": "„Nach Elim“: in der ganzen Torah so geschrieben, mit vier Ausnahmen.",
 "על סיר הבשר לׄ": "„Beim Fleischtopf“: einmalig.",
 "ואׄ אל סיר הבשר ויצא אחד אל השדה": "Und einmal: „In den Fleischtopf“, und einer ging auf das Feld hinaus.",
 "ואׄ רשת הכינו": "Und einmal: „Ein Netz stellten sie auf“.",
 "הוציא כל מלׄ בׄמׄ": {
  "de": "„Er führte hinaus“: überall voll geschrieben, mit [Anzahl unklar] Ausnahmen.",
  "status": "partial",
  "uncertain": [
   "בׄמׄ"
  ],
  "method": "editorial-draft"
 },
 "האלה בׄ": "„Diese“: zweimal.",
 "כבוד": "Herrlichkeit.",
 "תלינו וׄ ק": {
  "de": "„Ihr murrt“: sechsmal [Unklar: ק].",
  "status": "partial",
  "uncertain": [
   "ק"
  ],
  "method": "editorial-draft"
 },
 "כל מלׄ בׄמׄה חסׄ": "Überall voll geschrieben, außer fünfmal defektiv.",
 "וילונו ק": {
  "de": "„Und sie murrten“ [Unklar: ק].",
  "status": "partial",
  "uncertain": [
   "ק"
  ],
  "method": "editorial-draft"
 },
 "כל קמׄ בׄמׄ": {
  "de": "Überall mit Qamets, mit [Anzahl unklar] Ausnahmen.",
  "status": "partial",
  "uncertain": [
   "בׄמׄ"
  ],
  "method": "editorial-draft"
 },
 "כׄוׄ פסׄ דאית בהון אלפׄ ביתא כולׄ": "Sechsundzwanzig Verse, die das gesamte Alphabet enthalten.",
 "לגלגלת בׄ בקע וסימׄ": "„Je Kopf“: zweimal mit „ein Beka“; die Belegstellen sind:",
 "ויתרו בׄ חסׄ": "„Und sie ließen übrig“: zweimal defektiv geschrieben.",
 "ויאכלו דמלכים": "„Und sie aßen“ im Königsbuch.",
 "ונמס גׄ": "„Und es schmolz“: dreimal.",
 "וסימניׄ בשמשא מלכא דמך": "Und ihr Merkzeichen lautet: „In der Sonne schläft der König“.",
 "תמצאהו זׄ חסׄ בלישׄ מציאה": "„Du wirst es finden“: siebenmal in der Wortform des Findens defektiv geschrieben.",
 "חמרים": "Bogenschützen.",
 "ויבקשו שלשת ימים": "Und sie suchten drei Tage.",
 "ושאר שבת שבתון": "In den übrigen Fällen: „Sabbat der Ruhe“.",
 "לׄ ושאר שבת שבתון": "Einmalig; in den übrigen Fällen: „Sabbat der Ruhe“.",
 "לׄ וחׄ": "Einmalig und defektiv geschrieben.",
 "צנצנת אחת וׄ זקפׄ פתׄ וכל חמׄשׄתׄ דכוותיה בׄמׄאׄ": {
  "de": "„Ein Krug“: sechsmal mit Zaqef und Patach; alle [Unklar: חמׄשׄתׄ] ebenso, mit einer Ausnahme.",
  "status": "partial",
  "uncertain": [
   "חמׄשׄתׄ"
  ],
  "method": "editorial-draft"
 },
 "ושאר את משה בלשׄ ציווי וכל דבור אל משה בׄמׄאׄ את משה": "Sonst „Mose“ mit der Präposition „et“ in Befehlen; bei jedem Sprechen „zu Mose“ mit „el“, mit einer Ausnahme mit „et“.",
 "ואלה תולדות אהרן": "Und dies sind die Nachkommen Aarons.",
 "ואׄ נושבת מימים": "Und einmal: „Bewohnt von den Meeren her“.",
 "עשרית לׄ כתׄ כן בתורה וכל נביאים וכתובים דכוותיה בׄמׄאׄ": "„Ein Zehntel“: einmalig, in der Torah so geschrieben; alle Fälle in Propheten und Schriften ebenso, mit einer Ausnahme.",
 "והחמר": "Und das Homermaß.",
 "כל סין מלׄ כל צן חסׄ": "Alle Fälle von „Sin“ sind voll geschrieben, alle Fälle von „Zin“ defektiv.",
 "ברפידים בׄ מלׄ": "„In Refidim“: zweimal voll geschrieben.",
 "לשתת גׄ חסׄ בספרׄ": "„Trinken“: dreimal in diesem Buch defektiv geschrieben.",
 "כל מלׄ בׄמׄאׄ": "Überall voll geschrieben, mit einer Ausnahme.",
 "דׄ חסׄ וכל דׄהׄ דכווׄ": "Viermal defektiv geschrieben; alle Fälle in den Chronikbüchern ebenso.",
 "לשפט כל חסׄ בׄמׄג": "„Richten“: überall defektiv geschrieben, mit drei Ausnahmen.",
 "לבדך יׄזׄ מלׄ": "„Du allein“: siebzehnmal voll geschrieben.",
 "מן בקר לׄ חד מן # מיחדין מן": {
  "de": "„Vom Morgen“: einmalig; eine der mit „min“ verbundenen Formen. [Unklar: #].",
  "status": "partial",
  "uncertain": [
   "#"
  ],
  "method": "editorial-draft"
 },
 "והזהרת לׄ מלׄ": "„Und du sollst verwarnen“: einmalig, voll geschrieben.",
 "ובׄ חסׄ": "Und zweimal defektiv geschrieben.",
 "עלהם יׄגׄ חסׄ": "„Über ihnen“: dreizehnmal defektiv geschrieben.",
 "סימן שרי שרי שרי ושרי": "Merkzeichen: dreimal „Fürsten“ ohne und einmal „und Fürsten“ mit verbindendem Waw.",
 "אל תסתר פניך ממני אל תט באף עבדך אל תטשני ואל תעזביני": "Verbirg dein Angesicht nicht vor mir; weise deinen Knecht nicht im Zorn ab; verstoße mich nicht und verlasse mich nicht.",
 "סימן דרך הנשר בשמים": "Merkzeichen: Der Weg des Adlers am Himmel.",
 "ביום הזה כל קריה ביום הזה בׄמׄא": "„An diesem Tag“: überall in der Bibel „an diesem Tag“, mit einer Ausnahme.",
 "כל מלׄ בׄמׄג חסׄ": "Überall voll geschrieben, außer dreimal defektiv.",
 "כל לעלם שבתורה חסׄ רק בׄ והטעם של": {
  "de": "Alle Fälle von „für immer“ sind in der Torah defektiv geschrieben, außer zweimal. Die Begründung lautet: [Unklar: של].",
  "status": "partial",
  "uncertain": [
   "של"
  ],
  "method": "editorial-draft"
 },
 "וגם בך יאמינו לעלם": "Und auch dir werden sie für immer glauben.",
 "כולוׄ בטל ודבר אחד מן התורה אינו בטל": "Alles ist vergänglich, aber ein einziges Wort der Torah vergeht nicht.",
 "אעׄפׄ שמתגרשים שנאה טמונה בלבם": "Obwohl sie sich scheiden lassen, bleibt Hass in ihren Herzen verborgen.",
 "יחדו לׄ בסׄ וכל קריה דכוותיה בׄמׄא": {
  "de": "„Zusammen“: einmalig [Unklar: בסׄ]; alle Fälle in der Bibel ebenso, mit einer Ausnahme.",
  "status": "partial",
  "uncertain": [
   "בסׄ"
  ],
  "method": "editorial-draft"
 },
 "לעולם בׄ בתורה מלׄ וסיׄ": "„Für immer“: zweimal in der Torah voll geschrieben; die Belegstellen sind:",
 "השלישי כל מלׄ במגׄ וסימניהון": "„Der dritte“: überall voll geschrieben, mit drei Ausnahmen; die Belegstellen sind:",
 "מטעי ביה": "Hierbei kann man sich irren.",
 "ודוד המלך הולך וחזק": "Und König David wurde immer stärker.",
 "יׄדׄ פסׄ על אל אל": "Vierzehn Verse mit der Folge „al, el, el“.",
 "ראש": "Am Anfang.",
 "וסוף": "Und am Ende.",
 "בׄ פסׄ בתוׄ דאית בהון וׄ מלין": "Zwei Verse in der Torah mit jeweils sechs Wörtern.",
 "בראשית ברא שהוא ראש התורה": "„Im Anfang schuf“ steht am Anfang der Torah.",
 "וידבר אלהים שהוא ראש הדברות": "„Und Gott sprach“ steht am Anfang der Zehn Worte.",
 "להודיע שהאחד הוא המניין ואחד הוא העניין וסימניהון": "Um zu zeigen, dass die Zahl eins ist und auch der Inhalt eins ist; ihre Belegstellen sind:",
 "וידבר בׄ וסימניהון": "„Und er sprach“: zweimal; die Belegstellen sind:",
 "וידבר אל נח": "Und er sprach zu Noah.",
 "וידבר אל משה": "Und er sprach zu Mose.",
 "הוצאתיך גׄ ומלׄ": "„Ich habe dich herausgeführt“: dreimal voll geschrieben.",
 "עבדים כל מלׄ בׄמׄא": "„Knechte“: überall voll geschrieben, mit einer Ausnahme.",
 "אבת בׄ חסׄ וסימניהון": "„Väter“: zweimal defektiv geschrieben; die Belegstellen sind:",
 "שה לבית אבות שה לבית": "Ein Lamm für das Vaterhaus, ein Lamm für das Haus.",
 "משנה תורה פסל כל": "Im Deuteronomium: „Schnitzbild, alles“.",
 "כל פתׄ במא": "Überall mit Patach, mit einer Ausnahme.",
 "ובטעׄ קדמׄ הוא קמץ": "Und bei der Akzentuierung ist der erste Fall mit Qamets.",
 "גׄ זוגין מתחלפׄ חד זיׄן וחד שיׄן": "Drei wechselnde Wortpaare: einmal mit Sajin, einmal mit Schin.",
 "תינׄ יארכן": "Der zweite Fall: „Sie werden lang sein“.",
 "גׄ מלעׄ": "Dreimal mit Betonung auf der vorletzten Silbe.",
 "לׄ חסׄ דחסׄ": "Einmalig, doppelt defektiv geschrieben.",
 "יעבד חסׄ וׄ שלא יעבד עבדה שלימה כמו שנׄ": "„Er soll dienen“: ohne Waw geschrieben, weil er keinen vollständigen Dienst leisten soll, wie es heißt:",
 "אדוני בהׄ לפי שהקונה עבד עברי קונה אדון לעצמו": "„Sein Herr“ steht mit He, denn wer einen hebräischen Knecht erwirbt, erwirbt für sich selbst einen Herrn.",
 "שנאתה": "Du hasstest sie.",
 "ואׄ על המזוזה": "Und einmal: „An den Türpfosten“.",
 "ואׄ על הדלת המה מטיבים": "Und einmal: „An die Tür – sie machten sich gütlich“.",
 "לעלם טעם שהוא חסׄ שאין זה לעולם ועד רק לעולמו של יובל": "Die Begründung dafür, dass „für immer“ defektiv geschrieben ist: Es bedeutet hier nicht ewig und immer, sondern nur bis zu seinem Jubeljahr.",
 "יׄדׄ פׄ אם אם": "Vierzehn Verse mit zweimal „wenn“.",
 "לו קׄ": {
  "de": "„Ihm“ [Unklar: קׄ].",
  "status": "partial",
  "uncertain": [
   "קׄ"
  ],
  "method": "editorial-draft"
 },
 "וסוף יצא יצוא ומקלל": "Und der Schluss: „Er ging weiter und fluchte“.",
 "כל לישׄ מלׄ בׄמׄג חסׄ": "In jeder Wortform voll geschrieben, außer dreimal defektiv.",
 "שמע הׄ חסׄ": "„Hören“: fünfmal defektiv geschrieben.",
 "והיה אם שמע דירמיה": "„Und es wird sein, wenn ihr hört“ bei Jeremia."
});
Object.assign(manual,{
 "ושארא מלאים": "Und die übrigen sind voll geschrieben.",
 "זבח לאלהים כל אוריתא חסׄ": "„Wer Göttern opfert“: in der ganzen Torah defektiv geschrieben.",
 "יחרם גׄ אׄ קמץ": "„Er verfällt dem Bann“: dreimal; das Aleph steht mit Qamets.",
 "הייתם כלׄ מלׄ בׄמׄב": "„Ihr wart“: überall voll geschrieben, mit zwei Ausnahmen.",
 "שמע הׄ חסׄ ושאר מלׄ": "„Hören“: fünfmal defektiv geschrieben; die übrigen Fälle voll.",
 "יתמים בׄ חסׄ וסימניהון": "„Waisen“: zweimal defektiv geschrieben; die Belegstellen sind:",
 "כל אלה שמות ותורת כהנים רׄפׄ במׄטׄוׄ": "Im ganzen Exodus und Levitikus ohne Dagesch, mit fünfzehn Ausnahmen.",
 "ולא יכלה הצפינו": "Und sie konnte ihn nicht länger verbergen.",
 "ולא ישמע אליכם פר[עה]": {
  "de": "Und Pharao wird nicht auf euch hören. [Die Quelle ergänzt den Namen: פר[עה].]",
  "status": "partial",
  "uncertain": [
   "פר[עה]"
  ],
  "method": "editorial-draft"
 },
 "לא תותירו": "Ihr sollt nichts übrig lassen.",
 "ולא תעלה": "Und du sollst nicht hinaufsteigen.",
 "ולא ###": {
  "de": "Und nicht [Textlücke: ###].",
  "status": "partial",
  "uncertain": [
   "###"
  ],
  "method": "editorial-draft"
 },
 "ולא תלכו בחקות הגוים": "Und ihr sollt nicht in den Satzungen der Völker wandeln.",
 "ולא תונו איש את רעהו": "Und ihr sollt einander nicht übervorteilen.",
 "מטעי ביה דכתׄ את": "Hierbei kann man sich irren, weil „et“ geschrieben steht.",
 "לׄ וׄ זעיר": "Einmalig; kleines Waw.",
 "את הכנעני מטעי ביה וסיׄ את דפסׄ": "„Den Kanaaniter“: hierbei kann man sich irren; Merkzeichen ist das „et“ im Vers.",
 "וישא לוט את עיניו וירא את כל נכיאום כי כל הארץ משקה": {
  "de": "Und Lot erhob seine Augen und sah …, dass das ganze Land bewässert war. [Unklar: נכיאום].",
  "status": "partial",
  "uncertain": [
   "נכיאום"
  ],
  "method": "editorial-draft"
 },
 "ואׄ שתי בייי": "Und einmal: „Ich habe auf den HERRN gesetzt“.",
 "למוקש כל לישׄ מלׄ בׄמׄד": "„Zum Fallstrick“: in jeder Wortform voll geschrieben, mit vier Ausnahmen.",
 "מקשי מות דשמואל": "„Schlingen des Todes“ bei Samuel.",
 "וכל ממקשי דכוותיה": "Und alle Fälle von „aus den Schlingen“ ebenso.",
 "מרחק כל אוריתא חסׄ": "„Von fern“: in der ganzen Torah defektiv geschrieben.",
 "ונגש בׄ": "„Und er trat heran“: zweimal.",
 "באגנת לׄ וחסׄ לפי שבאוגן אחת נתנו": "„In die Becken“: einmalig, defektiv geschrieben, weil man es in ein einziges Becken gab.",
 "כלׄ אוריתא פרשי כנפים וכל קריה פרשים כנפים": "In der ganzen Torah: „Flügel ausbreitend“ in der kürzeren Schreibung; sonst in der Bibel in der längeren.",
 "ונתתה כל דאוריתא חסר דנביאים וכתובים מלא": "„Und du sollst geben“: in der Torah überall defektiv geschrieben, in Propheten und Schriften voll.",
 "ואׄ חסׄ שמה לבד": "Und einmal defektiv geschrieben: „Dort allein“.",
 "אותך יׄזׄ מלׄ בלישניה": "„Dich“: siebzehnmal in dieser Wortform voll geschrieben.",
 "ואמה וחצי כל ואלה שמות ואמה וחצי וכל שאר קריה אמה וחצי": "„Und anderthalb Ellen“: im ganzen Exodus mit „und“, sonst überall in der Bibel ohne „und“.",
 "יסך טׄוׄ": "„Er bedeckt“: fünfzehnmal.",
 "אשר יסך": "Womit gegossen wird.",
 "זה ###": {
  "de": "Dies [Textlücke: ###].",
  "status": "partial",
  "uncertain": [
   "###"
  ],
  "method": "editorial-draft"
 },
 "ואׄ שני כרובים": "Und einmal: „Zwei Cherubim“.",
 "כל הארן דאוריתׄ חסׄ דנביׄ וכתׄ מלׄ": "Alle Fälle von „die Lade“ sind in der Torah defektiv, in Propheten und Schriften voll geschrieben.",
 "דציוי חמשית": "In der Anweisung: „Die fünfte“.",
 "וכל דכוותיה בׄמׄב": "Und alle entsprechenden Fälle ebenso, mit zwei Ausnahmen.",
 "הכיורות": "Die Becken.",
 "למספרים": "Nach den Zahlen.",
 "כל דסמיך למניין לֻלַאת ושאר לֻלֹאת": "Alle Fälle, die neben einer Zahl stehen, lauten „Lula'at“; die übrigen „Lula'ot“.",
 "אשה אל אחתה סימׄן": "Merkzeichen: „Eine an die andere“.",
 "דין קדמאה אשה אל אחתה": "Dies ist der erste Fall: „Eine an die andere“.",
 "דעשיה אחת אל אחת": "Bei der Ausführung: „Eine an die andere“, mit der anderen Wortform für „eine“.",
 "לְאהל הׄ": "„Zum Zelt“: fünfmal.",
 "ועשית יריעות": "Und du sollst Zeltbahnen machen.",
 "ויקרא המלך ליהוידע הכהן": "Und der König rief den Priester Jojada.",
 "כל כתׄ כן בׄמׄח": "Überall so geschrieben, mit acht Ausnahmen.",
 "ודין קדמׄ נגבה תימנה": "Dies ist der erste Fall: „Südwärts, nach Süden“.",
 "תינינׄ נגב תימנה": "Der zweite Fall: „Süden, nach Süden“.",
 "מלמטה גׄ וסימניהון": "„Von unten“: dreimal; die Belegstellen sind:",
 "בריחם כל חסׄ יׄ בתראה": "„Riegel“: überall fehlt das letzte Jod.",
 "לקרשי צלע המשכן חלוף": "„Für die Bretter der Seite der Wohnung“: abweichende Form.",
 "דין קדמ לקרשי צלע המשכן האחד": "Dies ist der erste Fall: „Für die Bretter der einen Seite der Wohnung“, mit männlicher Form von „eine“.",
 "תיניינא לקרשי צלע המשכן האחת": "Der zweite Fall: „Für die Bretter der einen Seite der Wohnung“, mit weiblicher Form von „eine“.",
 "וישליכהו באחד ההרים או או באחת הגאיות": "Und er hat ihn auf einen der Berge oder in eines der Täler geworfen.",
 "לבריחם כל חסׄ יוד תיניינא בׄמׄא": "„Für die Riegel“: überall fehlt das zweite Jod, mit einer Ausnahme.",
 "והקמת בׄ חסׄ וסימניהון": "„Und du sollst aufrichten“: zweimal defektiv geschrieben; die Belegstellen sind:",
 "והקמת אבנים גדולות ושדת אותם בשיד": "Und du sollst große Steine aufrichten und sie mit Kalk bestreichen.",
 "חלוף": "Abweichende Form.",
 "דין קדמׄ לקרשי": "Dies ist der erste Fall: „Für die Bretter“.",
 "כלׄ מלׄ בׄמׄב": "Überall voll geschrieben, mit zwei Ausnahmen.",
 "כל לשון עמדי חסׄ בׄמׄאילו כל לשון עמודי חסׄ בׄמׄ אילו": {
  "de": "Jede Wortform von „Säulen“ ohne Waw ist defektiv, mit diesen Ausnahmen; jede Wortform mit Waw ist defektiv, mit diesen Ausnahmen. [Anzahl und Bezug unklar.]",
  "status": "partial",
  "uncertain": [
   "בׄמׄאילו",
   "בׄמׄ אילו"
  ],
  "method": "editorial-draft"
 },
 "עמודי דפרכת": "Die Säulen des Vorhangs.",
 "ואת עמדיו חמשה": "Und seine fünf Säulen.",
 "ולפאת ים עמודיו עשרה": "Und an der Westseite zehn Säulen.",
 "והאדנים לעמודים": "Und die Sockel für die Säulen.",
 "תיניינא זה ווי העמודים": "Der zweite Fall ist: „Die Haken der Säulen“.",
 "ואׄ בַשאת": "Und einmal: „An der Erhebung“.",
 "ואׄ לְפאה": "Und einmal: „Für eine Seite“.",
 "ואׄ הקרב": "Und einmal: „Bringe heran“.",
 "מעשה חָרַש֮ גָ גָׄ ַ וסימניהון": {
  "de": "„Arbeit eines Handwerkers“: dreimal; die Belegstellen sind. [Zusätzliche Akzentzeichen in der Quelle nicht sicher gedeutet.]",
  "status": "partial",
  "uncertain": [
   "גָ גָׄ ַ"
  ],
  "method": "editorial-draft"
 },
 "עובדא דקיסיא פרזלא": "Die Arbeit in Holz und Eisen.",
 "אבן": "Stein.",
 "שמֹת גׄ חסׄ וסימניהון": "„Namen“: dreimal defektiv geschrieben; die Belegstellen sind:",
 "מעשה": "Arbeit.",
 "שמותם בׄ מלׄ בתורה וסימניהון": "„Ihre Namen“: zweimal in der Torah voll geschrieben; die Belegstellen sind:",
 "כל משבצת חסׄ בׄמׄג משבצות": "Alle Fälle von „Fassungen“ sind defektiv geschrieben, außer dreimal in der längeren Schreibung.",
 "דמעשה חרש": "Der Fall von „Arbeit eines Handwerkers“.",
 "ואׄ חשן המשפט": "Und einmal: „Das Brustschild der Entscheidung“.",
 "זהב בׄ בטעמׄ בסיפרא": "„Gold“: zweimal mit dieser Akzentuierung in diesem Buch.",
 "כל חסׄ במׄגׄ": "Überall defektiv geschrieben, mit drei Ausnahmen.",
 "ונתת כׄטׄ חסׄ": "„Und du sollst geben“: neunundzwanzigmal defektiv geschrieben.",
 "ואׄ אל החשן": "Und einmal: „An das Brustschild“.",
 "האפוד וׄ מלׄ": "„Das Efod“: sechsmal voll geschrieben.",
 "תחרא בׄ כתׄ אׄ בעינייניה": "„Halsöffnung“: zweimal im selben Zusammenhang mit Aleph geschrieben.",
 "ונשמע בׄ וסימניהון": "„Und es wird gehört“: zweimal; die Belegstellen sind:",
 "מצח בׄ וסימניהון": "„Stirn“: zweimal; die Belegstellen sind:",
 "כי חזקי מצח המה": "Denn sie sind hart an der Stirn.",
 "ואׄ ומצח אשה זונה": "Und einmal: „Und die Stirn einer Hure“.",
 "ואׄ אל מצחו וישלח דוד": "Und einmal: „An seine Stirn – und David schleuderte“.",
 "לׄ ץׄ רב": "Einmalig; großes Tsade.",
 "כל קריה חסׄ בׄמׄג": "Überall in der Bibel defektiv geschrieben, mit drei Ausnahmen.",
 "ואׄ ולקח עץ": "Und einmal: „Und nimm ein Holz“.",
 "והלבשתם בׄ וסימניהון": "„Und du sollst sie bekleiden“: zweimal; die Belegstellen sind:",
 "והפשט אהרן": "Und ziehe Aaron aus.",
 "מגבעות כל כתׄ כן בׄמׄב": "„Kopfbedeckungen“: überall so geschrieben, mit zwei Ausnahmen.",
 "וסמך בׄ": "„Und er soll auflegen“: zweimal.",
 "ניחוח גׄ מלׄ וסימניׄ": "„Wohlgeruch“: dreimal voll geschrieben; die Belegstellen sind:",
 "אשה לייי לׄ": "„Ein Feueropfer dem HERRN“: einmalig.",
 "וכל קריה אשה הוא לייי": "Und überall in der Bibel: „Ein Feueropfer ist es dem HERRN“.",
 "ונתתה יׄבׄ מלׄ בתורה": "„Und du sollst geben“: zwölfmal in der Torah voll geschrieben.",
 "המכסה בדגשה מם": "„Die bedeckt“ steht mit Dagesch im Mem.",
 "להפריש בינו ובין": "Um zwischen ihm und dem folgenden zu unterscheiden.",
 "ובן": "Und zwischen.",
 "להפריש בין": "Um zu unterscheiden zwischen.",
 "בעניי כן בדגשים הם": {
  "de": "In diesem Zusammenhang stehen sie so mit Dagesch. [Unklarer Bezug: בעניי].",
  "status": "partial",
  "uncertain": [
   "בעניי"
  ],
  "method": "editorial-draft"
 },
 "כל כתׄ כן בׄמׄב": "Überall so geschrieben, mit zwei Ausnahmen.",
 "כל אוריׄ חסׄ בׄמׄב": "In der ganzen Torah defektiv geschrieben, mit zwei Ausnahmen.",
 "סימן כל תרומה היא בׄמׄא": "Merkzeichen: Bei jeder Form von „Hebegabe“ steht „sie ist“, mit einer Ausnahme.",
 "כל אחוזה היא בׄמׄא": "Bei jeder Form von „Besitz“ steht „sie ist“, mit einer Ausnahme.",
 "כל קדש הוא בׄמׄא": "Bei jeder Form von „Heiliges“ steht „es ist“, mit einer Ausnahme.",
 "ושמרתם את השבת כי קדש היא": "Und ihr sollt den Sabbat bewahren, denn heilig ist er.",
 "כל מלח היא בׄמׄא": {
  "de": "Bei jeder Form von „Salz“ steht „sie ist“, mit einer Ausnahme. [Bezug der Geschlechtsform unklar.]",
  "status": "partial",
  "uncertain": [
   "כל מלח היא"
  ],
  "method": "editorial-draft"
 },
 "שבעת ימים גׄ פסׄ ריש וסוף שין": "„Sieben Tage“: drei Verse beginnen und enden mit Schin.",
 "יבא כל אוריתא חסׄ": "„Er wird kommen“: in der ganzen Torah defektiv geschrieben.",
 "ואׄ וכפר בריתכם": "Und einmal: „Und euer Bund wird aufgehoben“.",
 "הם סימׄן": "„Sie“ ist das Merkzeichen.",
 "דין חלוף קדמׄ כי קדש הם": "Dies ist die abweichende Form im ersten Fall: „Denn heilig sind sie“.",
 "תיניינא כי קדש הוא": "Der zweite Fall: „Denn heilig ist es“.",
 "ואׄ מלׄ ונועדתי לך שם": "Und einmal voll geschrieben: „Und ich werde dir dort begegnen“.",
 "משטר לׄ": "„Polizist“: einmalig.",
 "כי תשא גׄ בטעמ": "„Wenn du erhebst“: dreimal mit dieser Akzentuierung.",
 "זה בׄ בטעׄ רׄפׄ וסימניהון": "„Dies“: zweimal mit dieser Akzentuierung am Versanfang; die Belegstellen sind:",
 "ונתת כׄטׄ חסׄ וסי": "„Und du sollst geben“: neunundzwanzigmal defektiv geschrieben; die Belegstellen sind:",
 "בבאם כל אוריׄ חסׄ": "„Wenn sie kommen“: in der ganzen Torah defektiv geschrieben.",
 "מר דרר כל אוריתׄ חסׄ": "„Fließende Myrrhe“: in der ganzen Torah defektiv geschrieben.",
 "כל חסׄ בׄמׄג": "Überall defektiv geschrieben, mit drei Ausnahmen.",
 "יׄ בלישׄ על ושאׄ אל": "Zehnmal mit der Präposition „al“; sonst mit „el“.",
 "לרחצה כלל לא יתחברו חטף קמץ וחטף קׄמ פתח יחד רק בשני מקומות וסימניהון": {
  "de": "„Zum Waschen“: Im Allgemeinen treten Chataf-Qamets und Patach nicht zusammen auf, außer an zwei Stellen; die Belegstellen sind. [Die Wiederholung von חטף קׄמ in der Quelle ist unklar.]",
  "status": "partial",
  "uncertain": [
   "חטף קׄמ"
  ],
  "method": "editorial-draft"
 },
 "למשחך דשמואל": "„Dich zu salben“ bei Samuel.",
 "דין קדמאה ואת השלחן ואת כל כליו ואת המנרה ואת כל כליה": "Dies ist der erste Fall: „Und den Tisch und alle seine Geräte und den Leuchter und alle seine Geräte“.",
 "תיניינא דסׄ ואת השלחן ואת כליו ואת המנרה הטהורה ואת כליה": {
  "de": "Der zweite Fall: „Und den Tisch und seine Geräte und den reinen Leuchter und alle seine Geräte“. [Unklar: דסׄ].",
  "status": "partial",
  "uncertain": [
   "דסׄ"
  ],
  "method": "editorial-draft"
 },
 "סימן דקדמאה אולי ישמע ייי אלהי דמלכים": "Merkzeichen für den ersten Fall: „Vielleicht hört der HERR, mein Gott“ im Königsbuch.",
 "סימן תיניינא אולי ישמע דישעיה": "Merkzeichen für den zweiten Fall: „Vielleicht hört er“ bei Jesaja.",
 "קדש הוא כל קדש הוא בׄמׄאׄ": "„Heilig ist es“: überall „heilig ist es“, mit einer Ausnahme.",
 "מזבח דעל בגדי השרד": "„Altar“ im Abschnitt über die Amtsgewänder.",
 "לׄ ושאר הוא": "Einmalig; in den übrigen Fällen: „Er ist“.",
 "ואׄ וְיִנָפֵש": "Und einmal: „Und er atme auf“.",
 "לחת האבן לׄ": "„Die steinernen Tafeln“: einmalig.",
 "ואׄ האבן": "Und einmal: „Der Stein“.",
 "ויצר בׄ וסימניהון": "„Und er formte“: zweimal; die Belegstellen sind:",
 "ויצר העמדים": "Und er formte die Säulen.",
 "העלוך אוריתׄ ונביׄ העלוך כתובׄ הֶעֶלך": "„Die dich heraufgeführt haben“: in Torah und Propheten mit der längeren Form; in den Schriften mit der kürzeren Form „er führte dich herauf“.",
 "ויאמר יׄ פסׄ אית בהון ויקרא ויאמר": "„Und er sprach“: zehn Verse mit „und er rief“ und „und er sprach“.",
 "העלית": "Du hast heraufgeführt.",
 "דין קדמׄ העלֵית": "Dies ist der erste Fall: „Du hast heraufgeführt“, mit Tsere.",
 "תיניינא העלִית": "Der zweite Fall: „Du hast heraufgeführt“, mit Chireq.",
 "ויֵטב אלהים ויִרב": "Und Gott tat Gutes; und er vermehrte.",
 "ויחל דׄ וסימניהון": "„Und er flehte“: viermal; die Belegstellen sind:",
 "חזקיה דפסׄ ההמת המיתהו": {
  "de": "Bei Hiskia, im Vers „Hat er ihn etwa töten lassen?“. [Der Bezug des Namens auf den Beleg ist unklar.]",
  "status": "partial",
  "uncertain": [
   "חזקיה"
  ],
  "method": "editorial-draft"
 }
});
function translateRows(rows){return rows.map(e=>({ordinal:e.ordinal,uuid:e.uuid,sourceHash:e.sourceHash,readings:e.readings.map(r=>{
 const tr=translateReading(r,e),loss=[...String(r.text||'').matchAll(/#+|\[[^\]]*\]|[\[\]]|�|\.{2,}|…|\?+/g)].map(m=>m[0]);
 if(!String(r.text||'').trim())loss.push('Keine Texttranskription');
 if(loss.length){tr.status='partial';tr.uncertain=[...new Set([...(tr.uncertain||[]),...loss])];tr.de+=' [Textlücke oder unsichere Lesung in der Quelle: '+loss.join(' / ')+'.]';}
 return tr;
})}));}
module.exports={build:translateRows,translateRows,translateReading,quotation,norm,formula};
if(require.main===module){const input=process.argv[2]||'/tmp/safran-masora-translation-input-1.jsonl',rows=fs.readFileSync(input,'utf8').trim().split('\n').map(JSON.parse),out=translateRows(rows);fs.writeFileSync(path.join(root,'masora-translations/part-1.json'),JSON.stringify(out,null,2)+'\n');const counts={contexts:out.length,readings:0,draft:0,partial:0};for(const e of out)for(const r of e.readings){counts.readings++;counts[r.status]++;}console.log(counts);}
