(function(root){
 'use strict';
 // Editorial lexical glosses, not translations assigned to individual tokens.
 // Biblical dictionary fallback is explicitly labelled: meanings may differ in RH.
 const own={
  "רבעי":["Früchte des vierten Pflanzjahrs; im vierten Jahr", "fourth-year produce; in its fourth year"],
  "עריס":["Weinspalier; auch: Pächter (anderes Lexem)", "vine espalier; also: tenant (homonym)"],
  "כרשינה":["Wicke; Futterwicke", "vetch; fodder vetch"],
  "אורז":["Reis", "rice"],
  "לוף":["Luf; essbare Aronstab-/Knollenpflanze (Bestimmung umstritten)", "lof; edible arum-like plant (identification disputed)"],
  "הבקר":["Herrenloses Gut; Verzicht auf Eigentum", "ownerless property; renunciation of ownership"],
  "מנה":["Mine; Gewichts- oder Geldmaß", "maneh; a weight or monetary unit"],
  "שקמה":["Sykomore; Maulbeerfeigenbaum", "sycamore fig"],
  "סרק":["Fruchtlosigkeit; in אילן סרק: nicht fruchttragender Baum", "barrenness; in אילן סרק: non-fruit-bearing tree"],
  "לוכסן":["schräg; diagonal", "oblique; diagonally"],
  "כגון":["zum Beispiel; wie etwa", "for example; such as"],
  "אדם":["Mensch; Person", "human; person"],

  "אני":["ich", "I"],
  "אנו":["wir", "we"],
  "אנחנו":["wir", "we"],
  "אתה":["du (männlich)", "you (masculine singular)"],
  "אתם":["ihr (männlich)", "you (masculine plural)"],
  "הוא":["er; es", "he; it"],
  "היא":["sie; es", "she; it"],
  "הם":["sie (Mehrzahl)", "they"],
  "הן":["sie (weibliche Mehrzahl)", "they (feminine)"],
  "זה":["dieser; dieses", "this"],
  "זו":["diese", "this (feminine)"],
  "זאת":["diese; dieses", "this"],
  "אלו":["diese", "these"],
  "מי":["wer?", "who?"],
  "מה":["was?", "what?"],
  "לא":["nicht; nein", "not; no"],
  "אם":["wenn; falls", "if"],
  "או":["oder", "or"],
  "על":["auf; über; wegen", "on; over; concerning"],
  "עד":["bis", "until; as far as"],
  "מן":["von; aus", "from; out of"],
  "בין":["zwischen", "between"],
  "כן":["so; ja", "thus; yes"],
  "למה":["warum?", "why?"],
  "כל":["jeder; alles; ganz", "every; all; whole"],

  "ביכור":["Erstlingsfrucht; Erstlingsgabe","first fruit; first-fruit offering"],
  "לקט":["Nachlese; liegen gebliebene Ähren","gleanings; ears left in the field"],
  "אכילה":["Essen; Verzehr","eating; consumption"],
  "מותר":["Rest; Überschuss","remainder; surplus"],
  "מקצת":["ein Teil; teilweise","a part; partly"],
  "שביעית":["Sabbatjahr; siebtes Jahr","sabbatical year; seventh year"],
  "רביעה":["Regenzeit; herbstlicher Regen; Paarung","rainfall season; autumn rain; mating"],
  "מעשר":["Zehnt; Abgabe eines Zehntels", "tithe; a tenth given as a levy"],
  "תרומה":["Hebegabe; Priesterabgabe", "heave offering; priestly due"],
  "שביעי":["siebter; siebtes Jahr (Sabbatjahr)", "seventh; seventh year (sabbatical year)"],
  "שכחה":["Vergessenes; vergessene Ernte für die Armen", "forgotten produce left for the poor"],
  "סאה":["Sea (Hohlmaß)", "seah (dry measure)"],
  "ירק":["Gemüse; Grünpflanzen", "vegetables; greens"],
  "חולין":["Profanes; nicht geheiligte Erzeugnisse", "non-sacred produce; ordinary property"],
  "כלאים":["Mischarten; verbotene Vermischung", "mixed kinds; forbidden mixture"],
  "פאה":["Rand; Feldrand für die Armen", "edge; field corner left for the poor"],
  "שורה":["Reihe", "row"],
  "שדה":["Feld; Acker", "field"],
  "עשר":["verzehnten; den Zehnten absondern", "tithe; set aside a tenth"],
  "אסור":["verboten; gebunden", "forbidden; bound"],
  "פטור":["befreit; nicht verpflichtet", "exempt; not liable"],
  "טפח":["Handbreite", "handbreadth"],
  "פרי":["Frucht; Ertrag", "fruit; produce"],
  "תרם":["absondern; die Hebegabe entrichten", "set aside; give the priestly due"],
  "חלה":["Challa; Teigabgabe", "challah; dough offering"],
  "עיסה":["Teig; Teigmasse", "dough"],
  "מעה":["Münze; Geld", "coin; money"],
  "דמאי":["Demai; Erzeugnisse mit unsicherer Verzehntung", "demai; produce of uncertain tithing status"],
  "שיעור":["Maß; vorgeschriebene Menge", "measure; prescribed quantity"],
  "תבואה":["Getreide; Ernteertrag", "grain; crop"],
  "שאור":["Sauerteig", "leaven"],
  "קב":["Kab (Hohlmaß)", "kab (dry measure)"],
  "כרם":["Weinberg", "vineyard"],
  "ביכורים":["Erstlingsfrüchte", "first fruits"],
  "ערלה":["Orla; Früchte der ersten drei Baumjahre", "orlah; fruit of a tree’s first three years"],
  "פרוזבול":["Prosbul; Erklärung zur Sicherung einer Schuldforderung", "prosbul; declaration preserving a debt claim"],
  "חמץ":["säuern; gären lassen", "leaven; ferment"],
  "לקח":["nehmen; erwerben; kaufen", "take; acquire; buy"],
  "חומש":["Fünftel; Zuschlag von einem Fünftel", "fifth; an additional fifth"],
  "אילן":["Baum", "tree"],
  "חבית":["Krug; Fass", "jar; barrel"],
  "ביעור":["Entfernung; Beseitigung; Aufbrauchen", "removal; disposal; consumption"],
  "חרדל":["Senf; Senfpflanze", "mustard; mustard plant"],
  "עונה":["Zeit; Saison; Reifestadium", "season; time; stage of ripeness"],

  'אותו':['jener; derselbe','that; the same'],'אותה':['jene; dieselbe','that; the same'],
  'רבי':['Rabbi; Lehrer','Rabbi; teacher'],'רבן':['Rabban (Ehrentitel)','Rabban (honorific title)'],
  'פלל':['beten; ein Gebet sprechen','pray; say a prayer'],'ברך':['segnen; einen Segensspruch sprechen','bless; recite a blessing'],
  'קרא':['lesen; vorlesen; rufen','read; recite; call'],'שמע':['hören; vernehmen','hear; listen'],
  'תפלה':['Gebet','prayer'],'תפילה':['Gebet','prayer'],'תפילין':['Tefillin; Gebetsriemen','tefillin; phylacteries'],
  'ברכה':['Segen; Segensspruch','blessing; benediction'],'משנה':['Mischna; Lehrsatz','Mishnah; teaching'],
  'מלכות':['Königtum; Herrschaft','kingship; sovereignty'],'חצות':['Mitternacht; Mittag','midnight; midday'],
  'קריאה':['Lesung; Vorlesen','reading; recitation'],'כיצד':['wie?; auf welche Weise?','how?; in what manner?'],
  'רשאי':['berechtigt; befugt','permitted; entitled'],'כדי':['damit; um zu; ausreichend','in order to; sufficient'],
  'בלבד':['allein; nur','only; alone'],'למפרע':['rückwärts; in umgekehrter Reihenfolge','backwards; in reverse order'],
  'מעין':['nach Art von; in verkürzter Form','in the manner of; in abbreviated form'],
  'יכול':['können; imstande sein','be able; can'],'יכל':['können; imstande sein','be able; can'],
  'אלא':['sondern; außer; nur','but; except; only'],'אפילו':['sogar; selbst wenn','even; even if'],
  'לאו':['nein; nicht','no; not'],'אין':['nicht; es gibt nicht','not; there is no'],'יש':['es gibt; vorhanden sein','there is; exist'],
  'הרי':['siehe; nun; also','behold; now; thus'],'נתר':['lösen; freigeben','release; permit'],
  'דקדק':['genau sein; genau aussprechen','be precise; articulate carefully'],'הרהר':['nachdenken; im Sinn sprechen','reflect; recite mentally'],
  'מים':['Wasser','water'],'כהן':['Priester','priest'],'מוסף':['Zusatz; zusätzliches Gebet','addition; additional prayer'],
  'מזוזה':['Mesusa; Türpfosten','mezuzah; doorpost'],'פרפרת':['Beilage; Vor- oder Nachspeise','accompaniment; appetizer or dessert'],
  'טפל':['untergeordnet; nebensächlich','secondary; subordinate'],'מליח':['gesalzen; gesalzene Speise','salted; salted food'],
  'תנחום':['Trost; Trostbezeugung','comfort; consolation'],'תחנון':['Flehen; Bittgebet','supplication; plea'],
  'חיים':['Leben; Lebensunterhalt','life; livelihood'],'בראשית':['Schöpfung; Urzeit','creation; primeval period'],
  'גיבור':['mächtig; Held; Krieger','mighty; hero; warrior'],
  'מגמר':['Räucherwerk','incense'],'שגר':['geläufig sein; fließen','be fluent; flow'],
  'פטר':['befreien; entbinden','exempt; release'],'צריך':['nötig haben; erforderlich','need; necessary'],
  'חייב':['verpflichtet; schuldig','obligated; liable'],'סרבן':['zögernd; sich weigernd','reluctant; refusing'],
  'שליח':['Gesandter; Beauftragter','messenger; representative'],'שלוח':['Gesandter; Beauftragter','messenger; representative']
 };
 const key=s=>String(s||'').normalize('NFD').replace(/[^א-ת]/g,'');
 const indexes=new WeakMap();
 function lookup(analysis,dictionary={},lang='de'){
  const lemma=String(analysis?.lemma||'').split('/').at(-1),k=key(lemma),codes=String(analysis?.morph||'');
  if(!k)return null;
  const gloss=analysis?.gloss?.[lang==='de'?'de':'en'];
  if(typeof gloss==='string'&&gloss.trim())return {text:gloss,source:'editorial',alternatives:[]};
  if(k==='שמע'&&/Ncms/.test(codes))return {text:lang==='de'?'Schema-Gebet':'Shema prayer',source:'editorial',alternatives:[]};
  // Dictionary homographs must not inherit the newly added nominal gloss.
  if(k==='מנה'&&/V/.test(codes))return {text:lang==='de'?'zählen; zuteilen':'count; allot',source:'editorial',alternatives:[]};
  if(k==='מנה'&&/Ncf/.test(codes))return {text:lang==='de'?'Portion; Anteil':'portion; share',source:'editorial',alternatives:[]};
  if(k==='סרק'&&/V/.test(codes))return {text:lang==='de'?'kämmen; hecheln; auch färben (anderes Lexem)':'comb; card; also paint (homonym)',source:'editorial',alternatives:[]};
  if(k==='לוף'&&/V/.test(codes))return {text:lang==='de'?'verbinden; zusammenfügen':'join; connect',source:'editorial',alternatives:[]};
  if(own[k])return {text:own[k][lang==='de'?0:1],source:'editorial',alternatives:[]};
  let index=indexes.get(dictionary);if(!index){index=new Map();for(const item of Object.values(dictionary)){if(!Array.isArray(item)||!item[0])continue;const head=key(item[0]);if(!index.has(head))index.set(head,[]);index.get(head).push(item);}indexes.set(dictionary,index);}
  const entries=index.get(k)||[],texts=[...new Set(entries.map(x=>x[lang==='de'?2:1]).filter(Boolean))];
  return texts.length?{text:texts.join('; '),source:'biblical',alternatives:texts}:null;
 }
 const api={lookup};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MishnahMeanings=api;
})(typeof window==='undefined'?globalThis:window);
