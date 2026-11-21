'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function runtime(lang){const window={I18N_TEXTCRIT_EN:require('../i18n-textcrit'),alert(){},confirm(){},prompt(){}},sandbox={window,localStorage:{getItem:()=>lang},navigator:{language:'en'},location:{reload(){}},document:{body:null,addEventListener(){}},MutationObserver:class{observe(){}}};vm.runInNewContext(fs.readFileSync(require.resolve('../i18n.js'),'utf8'),sandbox);return window.I18N;}
test('English apparatus covers all CATSS explanations, witness labels and composed references',()=>{
 const en=runtime('en'),s={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../tov-data.js'),'utf8'),s);
 for(const text of Object.values(s.window.TOV_DATA.codes))assert.notEqual(en.tr(text),text,text);
 assert.equal(en.textCrit('Genesis 1:1 · MT-Zählung'),'Genesis 1:1 · MT numbering');
 assert.equal(en.textCrit('· 6 Hinweise'),'· 6 notes');
 assert.equal(en.textCrit('Tal–Florentin, Fußnote Genesis 28:2 (S. 183)'),'Tal–Florentin, footnote Genesis 28:2 (p. 183)');
 assert.equal(en.textCrit('4Q7 · f1 · Z. 1, 2 · ETCBC/Abegg'),'4Q7 · f1 · Line(s) 1, 2 · ETCBC/Abegg');
 assert.equal(en.textCrit('בראשית ברא'),'בראשית ברא');
 const de=runtime('de');assert.equal(de.tr('Lesartunterschied'),'Lesartunterschied');
});
