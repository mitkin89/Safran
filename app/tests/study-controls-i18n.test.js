'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('chapter comparison, word highlights and panel resize controls have English labels',()=>{
 const window={alert(){},confirm(){},prompt(){}},sandbox={window,localStorage:{getItem:()=> 'en'},navigator:{language:'en'},location:{reload(){}},document:{body:null,addEventListener(){}},MutationObserver:class{observe(){}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../i18n.js'),'utf8'),sandbox);
 const labels=new Set(['Seltene Wörter','Auffällig häufig','MT markieren','Kapitel vergleichen','Verbstämme','Verbformen','hier','im Rest']);
 for(const file of ['library-chapter-comparison.js','library-passage-marks.js','library-panel-resize.js']){
  const text=fs.readFileSync(require.resolve('../'+file),'utf8');
  for(const m of text.matchAll(/(?:I18N\.t|\bt)\(\s*'([^']+)'/g))labels.add(m[1]);
  if(file==='library-chapter-comparison.js')for(const m of text.matchAll(/\['(?:shared|differences|onlyA|onlyB|roots|stems|forms)','([^']+)'\]/g))labels.add(m[1]);
 }
 assert.equal(window.I18N.t('im Rest'),'elsewhere');
 for(const label of labels)assert.notEqual(window.I18N.t(label),label,'English translation: '+label);
});
