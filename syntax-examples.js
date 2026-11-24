// Editable presets shared by the sidebar and corpus checks. No search is started here.
(function(){
'use strict';
const term=(role,lemma='',more={})=>({op:'term',role,lemma,...more});
const all=(...children)=>({op:'all',children});
const clause=(verb,subject='',object='')=>({type:'clause',book:'',syntax:{verb,subject,object,referents:false,domain:'',relation:''},gram:{}});
const advanced=pattern=>({type:'advanced',book:'',pattern});
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
];
const get=id=>{const e=examples.find(e=>e.id===id);return e?JSON.parse(JSON.stringify(e)):null;};
const api={examples,get};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.SyntaxExamples=api;
})();
