'use strict';
const assert=require('node:assert/strict');
module.exports=async({js,waitFor,win})=>{
 const load=async id=>{await js(`document.querySelector('[data-sx-example="${id}"]').click()`);await waitFor(`document.querySelector('[data-example-status]').textContent.includes('„'+window.SyntaxExamples.get('${id}').title+'“')`,'Beispiel '+id);};
 const shot=async name=>{if(!process.env.SAFRAN_EXAMPLES_QA_DIR)return;win.webContents.setBackgroundThrottling(false);await js("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");const fs=require('node:fs/promises'),path=require('node:path');await fs.mkdir(process.env.SAFRAN_EXAMPLES_QA_DIR,{recursive:true});await fs.writeFile(path.join(process.env.SAFRAN_EXAMPLES_QA_DIR,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 await js("document.querySelector('nav [data-tab=search]').click();document.querySelector('#sSyntaxTab').click()");
 assert(await js("document.querySelector('#sxExamples').hidden"));
 await js("document.querySelector('[data-syntax-kind=clause]').click()");
 await waitFor("document.querySelectorAll('[data-sx-example]').length===4",'Beispiele neben der Klauselsuche');
 const layout=await js("({left:document.querySelector('.sleft').getBoundingClientRect().right,right:document.querySelector('#sxExamples').getBoundingClientRect().left})");assert(layout.right>=layout.left,'Beispiele stehen seitlich');
 await js("document.querySelector('#sxgStem').value='N';document.querySelector('#sxgTense').value='w';document.querySelector('#sxReferents').checked=true;document.querySelector('#sxDomain').value='Q';document.querySelector('#sxResumption').checked=true;document.querySelector('#sxBook').value='Isaiah';document.querySelector('#sOut').innerHTML='<p id=exampleSentinel>Bestehende Treffer</p>'");
 await load('god-creates');
 assert.deepEqual(await js("['sxSubject','sxVerb','sxObject'].map(id=>document.getElementById(id).value)"),['אלהים','ברא','שמים']);
 assert(await js("[...document.querySelectorAll('#sxGrammar select')].every(s=>s.value==='') && !document.querySelector('#sxReferents').checked && !document.querySelector('#sxResumption').checked && document.querySelector('#sxDomain').value==='' && document.querySelector('#sxBook').value===''") ,'Filter vollständig zurückgesetzt');
 assert(await js("!!document.querySelector('#exampleSentinel')"),'kein automatischer Suchstart');
 assert.equal(await js("document.activeElement.dataset.sxExample"),'god-creates');
 await shot('clause-examples');
 await js("document.querySelector('#sxBook').value='Genesis';document.querySelector('#sxGo').click()");
 await waitFor("document.querySelector('#sxGo').textContent==='Suchen' && document.querySelector('#sOut .sres')",'Vorausgefüllte einfache Suche');
 assert(await js("document.querySelector('#sOut').textContent.includes('Kapitel 1 · 1')"));
 await js("document.querySelector('#sxAdvanced').checked=true;document.querySelector('#sxAdvanced').dispatchEvent(new Event('change'));document.querySelector('#sxSavedPatterns summary').click();document.querySelector('#sOut').innerHTML='<p id=exampleSentinel>Bestehende Treffer</p>'");
 assert.equal(await js("document.querySelectorAll('[data-sx-example]').length"),6);
 const advanced=await js("window.SyntaxExamples.examples.filter(e=>e.query.type==='advanced').map(e=>e.id)");
 for(const id of advanced){
  await load(id);assert(await js("!!document.querySelector('#exampleSentinel')"),'kein Suchstart '+id);
  await js(`document.querySelector('#sxSavedPatterns [data-name]').value='QA ${id}';document.querySelector('#sxSavedPatterns [data-act=save]').click()`);
  const pair=await js(`({actual:JSON.parse(localStorage.getItem('syntaxPatterns')).items.find(e=>e.name==='QA ${id}').query,expected:window.SyntaxPatterns.snapshot(window.SyntaxExamples.get('${id}').query)})`);
  assert.deepEqual(pair.actual,pair.expected,'Gesamter Suchaufbau übernommen: '+id);
 }
 await load('spirit-genitive');await shot('advanced-examples');
 await js("document.querySelector('#sxAdvancedBook').value='Genesis';document.querySelector('#sxAdvancedGo').click()");
 await waitFor("document.querySelector('#sxAdvancedGo').textContent==='Suchen' && document.querySelector('#sOut .sres')",'Vorausgefüllte erweiterte Suche');
 assert(await js("document.querySelector('#sOut').textContent.includes('Kapitel 1 · 2')"));
 await load('god-speaks-or-sees');
 await js("{const saved=JSON.parse(localStorage.getItem('syntaxPatterns')).items.find(e=>e.name==='QA spirit-genitive');document.querySelector('#sxSavedPatterns [data-pattern]').value=saved.id;document.querySelector('#sxSavedPatterns [data-pattern]').dispatchEvent(new Event('change'));document.querySelector('#sxSavedPatterns [data-act=load]').click();}");
 await waitFor("[...document.querySelectorAll('#sxBuilder [data-field=lemma]')].some(i=>i.value==='רוח')",'Gespeicherte Suchmuster bleiben ladbar');
 await js("document.querySelector('#sTextTab').click()");assert(await js("document.querySelector('#sxExamples').hidden"));
 console.log('Electron: examples in both sidebars, complete filter reset, exact editable trees, no auto-search, source hits, focus and saved patterns passed.');
};
