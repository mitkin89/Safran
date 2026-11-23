// BHSA 2021 clause categories; see https://etcbc.github.io/bhsa/features/typ/.
(function(){
'use strict';
const kinds={VC:'Verbalsatz',NC:'Nominalsatz',WP:'Ohne Prädikation'};
const types={NmCl:'Nominalsatz',AjCl:'Adjektivsatz',Ptcp:'Partizipialsatz',InfA:'Infinitivus absolutus',InfC:'Infinitivus constructus',Ellp:'Ellipse',CPen:'Casus pendens',MSyn:'Makrosyntaktisches Zeichen',Reop:'Neuanlauf',Voct:'Vokativ',XPos:'Extraposition'};
for(const code of ['xQtX','WXQt','WayX','ZYqX','xQt0','WxQ0','WYq0','Way0','WYqX','WQt0','WXYq','ZIm0','WIm0','ZYq0','xYq0','WxY0','xYqX','ZQtX','WQtX','XQtl','XYqt','ZQt0','WxQX','WXIm','ZImX','xIm0','WxYX','WxI0','XImp','WImX','xImX'])types[code]=code;
const api={kinds,types};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.SyntaxTypes=api;
})();
