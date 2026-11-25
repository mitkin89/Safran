// Editable presets shared by the sidebar and corpus checks. No search is started here.
(function(){
'use strict';
const term=(role,lemma='',more={})=>({op:'term',role,lemma,...more});
const all=(...children)=>({op:'all',children});
const clause=(verb,subject='',object='')=>({type:'clause',book:'',syntax:{verb,subject,object,referents:false,domain:'',relation:''},gram:{}});
const advanced=pattern=>({type:'advanced',book:'',pattern});
const finite=(stem,tense,person='3',gender='m',number='s')=>({stem,tense,person,gender,number,suffix:'0',article:'0'});
const noun=(gender,number,state,article='0',suffix='0')=>({pos:'Nc',...(gender?{gender}:{}),number,state,article,suffix});
const same=(role,child)=>({op:'same',role,child});
const related=(relation,child,more={})=>({op:'related',relation,child,...more});
const complexClause=(id,verb,subject,object,ref,title,description)=>({id:'rich-'+id,title,description,ref,level:'complex',query:{...clause(verb,subject,object),syntax:{...clause(verb,subject,object).syntax,domain:'N',referents:true},gram:{pos:'V',...finite('q','w')}}});
const examples=[
 {id:'god-speaks',title:'Wo spricht Gott?',description:'Subjekt אלהים oder יהוה, Verb אמר. Andere Filter werden geleert.',ref:'Genesis 1:3',query:clause('אמר','אלהים, יהוה')},
 {id:'god-creates',title:'Gott erschafft den Himmel',description:'Subjekt אלהים, Verb ברא, Objekt שמים.',ref:'Genesis 1:1',query:clause('ברא','אלהים','שמים')},
 {id:'hear-voice',title:'Eine Stimme hören',description:'Verb שמע mit dem Objekt קול; das Subjekt bleibt beliebig.',ref:'Genesis 3:10',query:clause('שמע','','קול')},
 {id:'noah-acts',title:'Noach tut etwas',description:'Subjekt נח und Verb עשה; das Objekt bleibt beliebig.',ref:'Genesis 6:22',query:clause('עשה','נח')},
 {id:'god-speaks-or-sees',title:'Gott spricht oder sieht',description:'UND verbindet das Subjekt אלהים mit einer ODER-Gruppe für אמר und ראה.',ref:'Genesis 1:3',query:advanced(all(term('subject','אלהים'),{op:'any',children:[term('verb','אמר'),term('verb','ראה')]}))},
 {id:'qal-without-wayyiqtol',title:'Qal, aber kein Wajjiqtol',description:'Am selben Verb: Stamm Qal und NICHT Zeit/Form Wajjiqtol.',ref:'Genesis 1:1',query:advanced({op:'same',role:'verb',child:all(term('verb','',{gram:{stem:'q'}}),{op:'not',children:[term('verb','',{gram:{tense:'w'}})]})})},
 {id:'verb-before-subject',title:'Verb direkt vor dem Subjekt',description:'אמר steht unmittelbar vor dem Kernwort des Subjekts: Abstand 0.',ref:'Genesis 1:3',query:advanced(term('verb','אמר',{position:{relative:'subject',order:'before',maxGap:0}}))},
 {id:'spirit-genitive',title:'רוח mit dem Genitiv אלהים',description:'Dasselbe Subjekt רוח muss ein zugehöriges Attribut אלהים besitzen.',ref:'Genesis 1:2',query:advanced({op:'same',role:'subject',child:all(term('subject','רוח'),{op:'dependent',child:term('attribute','אלהים')})})},
 {id:'attributive-hifil',title:'Attributive Hifil-Klausel',description:'Ein Verb mit einer direkt abhängigen Attr-Klausel, deren Verb im Hifil steht.',ref:'Genesis 1:11',query:advanced(all(term('verb'),{op:'related',relation:'child',child:all(term('relation','',{value:'Attr'}),term('verb','',{gram:{stem:'h'}}))}))},
 {id:'enoch-reference',title:'Henoch später als Objekt',description:'Die Wortvariable person bindet das Subjekt חנוך; eine spätere Klausel muss denselben Referenten als Objekt haben.',ref:'Genesis 5:24',query:advanced({op:'bind',name:'person',role:'subject',child:all(term('subject','חנוך'),{op:'related',relation:'later',child:term('object','',{sameAs:'person',identity:'referent'})})})},
 complexClause('create-man','ברא','אלהים','אדם','Genesis 1:27','Gott erschafft den Menschen – mit Wortmerkmalen','Subjekt, Verb und Objekt; Qal, Wajjiqtol, 3. Person maskulin Singular, ohne Suffix und Artikel; Erzählung und gemeinte Subjekte.'),
 complexClause('firmament','עשה','אלהים','רקיע','Genesis 1:7','Gott macht das Gewölbe – mit Wortmerkmalen','Drei Lemmata und alle passenden Merkmale des finiten Verbs; dazu Erzählung und gemeinte Subjekte.'),
 complexClause('jacob-love','אהב','יעקב','רחל','Genesis 29:18','Jakob liebt Rahel – mit Wortmerkmalen','Subjekt יעקב, Verb אהב, Objekt רחל; Qal-Wajjiqtol mit Person, Genus und Numerus; nur Erzählung.'),
 {id:'rich-creation',level:'complex',title:'Schöpfung: genau bestimmte Satzglieder',description:'Verbal- und Klauseltyp; ב mit ראשית; Qal-Perfekt mit Person und Numerus; bestimmtes Objekt und genaue Wortabstände.',ref:'Genesis 1:1',query:advanced(all(
   term('kind','',{value:'VC'}),term('clauseType','',{value:'xQtX'}),
   term('prepositional','ראשית',{preposition:'ב',gram:noun('f','s','a'),position:{relative:'verb',order:'before',maxGap:0}}),
   term('verb','ברא',{gram:finite('q','p'),position:{relative:'subject',order:'before',maxGap:0}}),
   term('subject','אלהים',{gram:noun('m','p','a')}),
   term('object','שמים',{gram:noun('m','p','a','1'),position:{relative:'verb',order:'after',maxGap:2}})
 ))},
 {id:'rich-speech',level:'complex',title:'Sprechen und die folgende Aufforderung',description:'Erzählendes אמר mit genau bestimmtem Subjekt und Wortabstand; danach eine Rede-Klausel mit היה im Jussiv und dem Subjekt אור.',ref:'Genesis 1:3',query:advanced(all(
   term('domain','',{value:'N'}),term('kind','',{value:'VC'}),term('clauseType','',{value:'WayX'}),
   term('verb','אמר',{gram:finite('q','w'),position:{relative:'subject',order:'before',maxGap:0}}),term('subject','אלהים',{gram:noun('m','p','a')}),
   related('later',all(term('domain','',{value:'Q'}),term('kind','',{value:'VC'}),term('clauseType','',{value:'ZYqX'}),term('verb','היה',{gram:finite('q','j')}),term('subject','אור',{gram:noun(null,'s','a')})))
 ))},
 {id:'rich-plant',level:'complex',title:'Hifil und abhängige attributive Klausel',description:'דשא im Hifil-Jussiv, 3. Person feminin Singular, mit bestimmtem Subjekt ארץ; darunter Attr-Klausel mit Hifil-Partizip זרע und Objekt זרע. Klauseltiefe 1–2.',ref:'Genesis 1:11',query:advanced(all(
   term('domain','',{value:'Q'}),term('kind','',{value:'VC'}),term('clauseType','',{value:'ZYqX'}),
   term('verb','דשא',{gram:finite('h','j','3','f')}),term('subject','ארץ',{gram:noun(null,'s','a','1')}),
   related('descendant',all(term('relation','',{value:'Attr'}),term('clauseType','',{value:'Ptcp'}),term('verb','זרע',{gram:{stem:'h',tense:'r',gender:'m',number:'s',state:'a',suffix:'0',article:'0'}}),term('object','זרע',{gram:noun('m','s','a'),position:{relative:'verb',order:'after',maxGap:0}})),{minDepth:1,maxDepth:2})
 ))},
 {id:'rich-spirit',level:'complex',title:'Gebundener Genitiv und Partizip',description:'רוח im Singular constructus, daran אלהים; רחף als feminines Piel-Partizip hinter dem Subjekt; dazu die Präposition על.',ref:'Genesis 1:2',query:advanced(all(
   term('kind','',{value:'VC'}),term('clauseType','',{value:'Ptcp'}),
   same('subject',all(term('subject','רוח',{gram:noun(null,'s','c')}),{op:'dependent',child:term('attribute','אלהים',{gram:noun('m','p','a')})})),
   term('verb','רחף',{gram:{stem:'p',tense:'r',gender:'f',number:'s',state:'a',suffix:'0',article:'0'},position:{relative:'subject',order:'after',maxGap:1}}),
   term('prepositional','',{preposition:'על'})
 ))},
 {id:'rich-enoch',level:'complex',title:'Henoch: Wortvariable über zwei Klauseln',description:'Hitpael-Wajjiqtol vor חנוך; Wortvariable enoch; später לקח im Qal-Perfekt mit אלהים als Subjekt und demselben Referenten als Objekt.',ref:'Genesis 5:24',query:advanced({op:'bind',name:'enoch',role:'subject',child:all(
   term('domain','',{value:'N'}),term('kind','',{value:'VC'}),term('clauseType','',{value:'WayX'}),
   term('subject','חנוך',{gram:{pos:'Np',suffix:'0',article:'0'}}),term('verb','הלך',{gram:finite('t','w'),position:{relative:'subject',order:'before',maxGap:0}}),
   related('later',all(term('clauseType','',{value:'xQtX'}),term('verb','לקח',{gram:finite('q','p')}),term('subject','אלהים',{gram:noun('m','p','a')}),term('object','',{sameAs:'enoch',identity:'referent',gram:{suffix:'1',article:'0'}})))
 )})},
 {id:'rich-root',level:'complex',title:'Wortfamilie mit UND, NICHT und Position',description:'Wortfamilie אמר: dasselbe Verb im Qal-Wajjiqtol, nicht im Perfekt, direkt vor dem pluralischen Subjekt אלהים; Erzählung und Klauseltyp WayX.',ref:'Genesis 1:3',query:advanced(all(
   term('domain','',{value:'N'}),term('kind','',{value:'VC'}),term('clauseType','',{value:'WayX'}),
   same('verb',all(term('verb','',{mode:'root',family:'heb:awn',gram:finite('q','w'),position:{relative:'subject',order:'before',maxGap:0}}),{op:'not',children:[term('verb','',{gram:{tense:'p'}})]})),
   term('subject','אלהים',{gram:noun('m','p','a')})
 ))},

];
const get=id=>{const e=examples.find(e=>e.id===id);return e?JSON.parse(JSON.stringify(e)):null;};
const api={examples,get};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.SyntaxExamples=api;
})();
