// Field's witness sigla as display labels. Source identities and attestations stay unchanged.
(function(){
'use strict';
const HEX={
 'α′':['Ἀ.','Aquila'], 'σ′':['Σ.','Symmachus'], 'θ′':['Θ.','Theodotion'],
 'οἱ γ′':['Οἱ Γ΄','Aquila, Symmachus und Theodotion'],
 'οἱ λ′':['Οἱ λοιποί','Die übrigen griechischen Übersetzer'],
 'ε′':['Ε΄','Quinta'], 'ϛ′':['Ϛ΄','Sexta'], 'ζ′':['Ζ΄','Septima'],
 'ὁ Σύρος':['Ὁ Σύρος','Der von Field zitierte syrische Gewährsmann'], 'ὁ Ἑβραῖος':['Ὁ Ἑβραῖος','Der von Field zitierte hebräische Gewährsmann'], 'ἄλλος':['Ἄλλος','Ein anderer, nicht namentlich genannter Übersetzer'],
};
function info(f,w){
 const uncertain=String(w).endsWith('?'),key=uncertain?w.slice(0,-1):w;let value;
 if(f==='LXX'&&key==='LXX')value=['Ο΄','Septuaginta (LXX)'];
 if(f==='Hex')value=HEX[key]||(key==='Hex'?['Field','Hexapla: Frederick Field (1875)']:null);
 return value?{label:value[0]+(uncertain?'?':''),title:value[1]}:{label:w,title:''};
}
function label(f,w){return info(f,w).label;}
function legend(esc,t=s=>s){
 const rows=[['Ο΄','Septuaginta (LXX)'],...Object.values(HEX),['※','Asterisk: von Origenes nach dem Hebräischen ergänzt'],['÷','Obelus: in der LXX ohne hebräisches Gegenstück'],['↙','Metobelus: Ende eines mit kritischem Zeichen markierten Abschnitts']];
 return '<summary>'+esc(t('Siglen und Zeichen nach Field'))+'</summary><dl>'+rows.map(([s,title])=>'<div><dt lang="grc">'+esc(s)+'</dt><dd>'+esc(t(title))+'</dd></div>').join('')+'</dl><p>'+esc(t('Kritische Zeichen erscheinen nur, wo sie in der Field-Quelle stehen. Syr bezeichnet hier die Peschitta; Fields „Ὁ Σύρος“ bleibt ein eigener Quellenbeleg.'))+'</p>';
}
const api={info,label,legend};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.TextCritSigla=api;
})();
