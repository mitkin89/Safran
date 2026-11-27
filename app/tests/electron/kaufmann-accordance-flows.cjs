'use strict';
const assert=require('node:assert/strict'),{ipcMain}=require('electron');
const A=require('../../mishnah-kaufmann-accordance-data'),D=require('../../mishnah-kaufmann-berakhot-data'),B=require('../../mishnah-morph-data'),M=require('../../mishnah-morph'),E=require('../../mishnah-kaufmann-accordance-image-data'),P=require('../../kaufmann-pointing');
module.exports=async({docs,win,js,waitFor,book})=>{
 const title='Mishnah Berakhot',editions=[A,D,B],globals=['MISHNAH_KAUFMANN_ACCORDANCE_DATA','MISHNAH_KAUFMANN_BERAKHOT_DATA','MISHNAH_MORPH_DATA'];
 const sources=editions.map(d=>[...docs.values()].find(s=>s.entry.title===title&&s.entry.versionTitle===d.edition));
 assert(sources.every(Boolean),'three independent editions loaded');
 const rels=sources.map(s=>s.entry.rel),q=JSON.stringify,opened=[];
 ipcMain.handle('open:external',(_event,url)=>{opened.push(url);return true;});
 await book(title);await waitFor("document.querySelector('#rTitle').textContent.includes('Mishnah Berakhot')",'Berakhot');
 await waitFor(`[...document.querySelectorAll('#verList input')].some(c=>c.dataset.rel===${q(rels[0])}&&c.checked)`,'new working edition initially selected');
 // Include all three editions; do not depend on the order of initial defaults.
 for(let i=0;i<12;i++){
  const change=await js(`[...document.querySelectorAll('#verList input')].map(c=>({rel:c.dataset.rel,checked:c.checked,want:${q(rels)}.includes(c.dataset.rel)})).find(c=>c.want&&!c.checked)||[...document.querySelectorAll('#verList input')].map(c=>({rel:c.dataset.rel,checked:c.checked,want:${q(rels)}.includes(c.dataset.rel)})).find(c=>!c.want&&c.checked)`);
  if(!change)break;
  await js(`{const c=[...document.querySelectorAll('#verList input')].find(c=>c.dataset.rel===${q(change.rel)});c.click();}new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
 }
 async function chapter(c){
  await js(`document.querySelector('#rSection').value='${c-1}';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))`);
  await waitFor(`document.querySelectorAll('#rOut .cell[data-mishnah-morph-ready]').length===${A.sources[title].chapters[c-1].length*3}`,'three edition cells chapter '+c);
 }
 await chapter(1);
 const originalSize=win.getSize();
 for(const width of [2048,1250,768]){
  win.setSize(width,1000);
  await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))))');
  const layout=await js(`(()=>{const cell=[...document.querySelectorAll('#rOut .cell')].find(c=>c.dataset.rel===${q(rels[0])}),grid=cell.querySelector('.mci-grid'),labels=grid.querySelector('.mci-labels'),columns=grid.querySelector('.mci-columns'),label=labels.querySelector('.tc-witness-label');return {grid:grid.getBoundingClientRect().width,labels:labels.getBoundingClientRect().width,columns:columns.getBoundingClientRect().width,label:label.textContent,description:label.title,words:cell.querySelectorAll('.mhw').length};})()`);
  assert(layout.labels>0&&layout.labels<=layout.grid*.27,'source labels reserve at most 27% at '+width);
  assert(layout.columns>=layout.grid*.65,'text retains space at '+width);
  assert.equal(layout.label,'Kaufmann · Accordance (vorl.)');
  assert(layout.description.includes('nicht am Manuskript geprüft'),'full source caution remains available');
  assert(layout.words>0);
  if(width===2048&&process.env.SAFRAN_LAYOUT_SCREENSHOT)require('node:fs').writeFileSync(process.env.SAFRAN_LAYOUT_SCREENSHOT,(await win.webContents.capturePage()).toPNG());
 }
 win.setSize(...originalSize);
 let units=0,sourceWords=0,cards=0,pointingOpen=0,witnessWords=0,otherCards=[0,0];
 for(let c=1;c<=9;c++){
  await chapter(c);
  const result=await js(`(()=>{
   const rels=${q(rels)},names=${q(globals)},counts={units:0,sourceWords:0,cards:0,pointingOpen:0,witnessWords:0,otherCards:[0,0]};
   const original=window.MISHNAH_TEXTCRIT;
   for(const cell of document.querySelectorAll('#rOut .cell[data-mishnah-morph]')){
    const edition=rels.indexOf(cell.dataset.rel);if(edition<0)throw Error('Unexpected edition');
    const d=window[names[edition]],m=Number(cell.closest('.row').dataset.l),ref='${c}:'+m,ids=d.sources['Mishnah Berakhot'].chapters[${c-1}][m-1],ws=[...cell.querySelectorAll('.mhw')];
    if(ws.length!==ids.length)throw Error('Card count '+ref+' '+edition);
    for(let i=0;i<ws.length;i++)if(ws[i].textContent!==d.forms[ids[i]].word||ws[i].getAttribute('role')!=='button'||ws[i].tabIndex!==0)throw Error('Card position/accessibility '+ref+'#'+i+' '+edition);
    if(edition===2){counts.otherCards[1]+=ws.length;continue;}
    const u=d.units[ref],tokens=window.MishnahMorph.tokens(u.offsetText),base=[...cell.querySelectorAll('.mci-base-word')];
    if(cell.querySelector('[data-mci-edition]')?.dataset.mciEdition!==d.edition&&cell.dataset.mciEdition!==d.edition)throw Error('Edition label crossed '+ref);
    if(base.length!==u.words.length||base.some((w,i)=>w.textContent!==u.words[i].text))throw Error('Source word preservation '+ref+' '+edition);
    for(let i=0;i<ws.length;i++){
     const n=u.words.findIndex(w=>w.start<=tokens[i].start&&w.end>=tokens[i].end);
     if(n<0||ws[i].dataset.kaufmannWord!==u.id+'/word/'+n)throw Error('Diplomatic card identity '+ref+'#'+i);
    }
    const marked=cell.querySelectorAll('.mci-base-word[data-pointing-status="open"]').length;
    if(marked!==u.words.filter(w=>w.pointingStatus==='open').length)throw Error('Open marks '+ref+' '+edition);
    const sigs=new Set();for(const w of cell.querySelectorAll('.mci-word[data-tc-mishnah-word]')){
     const sig=w.dataset.tcMishnah.split('|')[0],[r,i]=w.dataset.tcMishnahWord.split('|'),src=original.witnesses[sig==='D'?'K':sig]?.units[r]?.words[Number(i)];
     const clone=w.cloneNode(true);clone.querySelectorAll('sup').forEach(s=>s.remove());
     if(!src||clone.textContent!==src.text)throw Error('Witness source identity '+sig+' '+r+'#'+i);
     sigs.add(sig);if(edition===0)counts.witnessWords++;
    }
    for(const sig of ['D','P','C'])if(!sigs.has(sig))throw Error('Missing witness '+sig+' '+ref);
    if(edition===0){counts.units++;counts.sourceWords+=u.words.length;counts.cards+=ws.length;counts.pointingOpen+=marked;}else counts.otherCards[0]+=ws.length;
   }return counts;
  })()`);
  units+=result.units;sourceWords+=result.sourceWords;cards+=result.cards;pointingOpen+=result.pointingOpen;witnessWords+=result.witnessWords;otherCards=otherCards.map((n,i)=>n+result.otherCards[i]);
  console.log('Electron Accordance chapter '+c+': '+result.units+' units / '+result.cards+' cards, three editions and exact D/P/C source positions.');
 }
 assert.equal(units,57);assert.equal(sourceWords,2170);assert.equal(cards,2171);assert.equal(pointingOpen,326);assert(otherCards.every(n=>n>2000));
 // Check the lexical-card-to-diplomatic-word bridge independently of the DOM.
 const records=[];
 for(const [ref,u]of Object.entries(A.units)){
  const [c,m]=ref.split(':').map(Number),ids=A.sources[title].chapters[c-1][m-1];
  M.tokens(u.offsetText).forEach((t,i)=>{
   const sourceIndex=u.words.findIndex(w=>w.start<=t.start&&w.end>=t.end);
   assert(sourceIndex>=0);const word=u.words[sourceIndex];
   assert.equal(P.stripPointing(word.text),P.stripPointing(word.originalWord));
   records.push({ref,c,m,i,id:ids[i],sourceIndex,sourceId:u.id+'/word/'+sourceIndex,word,form:A.forms[ids[i]]});
  });
 }
 async function popup(record,edition=0){
  await chapter(record.c);
  await js(`document.querySelector('#mishnahMorphPopup .mhm-close')?.click();[...document.querySelectorAll('#rOut .row[data-l="${record.m}"] .cell')].find(c=>c.dataset.rel===${q(rels[edition])}).querySelectorAll('.mhw')[${record.i}].click()`);
  await waitFor("document.querySelector('#mishnahMorphPopup')",'word card');
  return js(`(()=>{const p=document.querySelector('#mishnahMorphPopup');return {word:p.querySelector('.mhm-word').textContent,text:p.textContent,analyses:p.querySelectorAll('.mhm-analysis').length,provenance:Object.fromEntries([...p.querySelectorAll('[data-provenance]')].map(x=>[x.dataset.provenance,x.textContent])),image:p.querySelector('.mhm-image-source')?.dataset.imageStatus||null,location:!!p.querySelector('.mhm-image-location-only'),readings:p.querySelectorAll('.mhm-image-reading').length};})()`);
 }
 const scenarios={transferred:records.find(r=>r.word.pointingStatus==='transferred'),open:records.find(r=>r.word.pointingStatus==='open'),changed:records.find(r=>r.form.provenance?.analysis.pointingMatch===false),unresolved:records.find(r=>!r.form.analyses.length)};
 for(const [name,r]of Object.entries(scenarios)){
  assert(r,'real '+name+' scenario');const p=await popup(r);
  assert.equal(p.word,r.form.word);assert.equal(p.analyses,r.form.analyses.length);
  assert(p.text.includes('vorläufige Accordance-Punktierung · nicht am Manuskript geprüft'));
  for(const kind of ['pointing','analysis','translation'])assert(p.provenance[kind]?.includes(r.form.provenance[kind].source),'separate '+kind+' provenance');
  assert.equal(p.text.includes('Punktierung offen'),r.word.pointingStatus==='open');
  if(name==='changed')assert(p.provenance.analysis.includes('abweichende Punktierung; Zuordnung offen'));
  if(name==='unresolved')assert(p.provenance.analysis.includes('keine Bestimmung zugeordnet'));
  if(r.form.analyses.length)assert(p.provenance.analysis.includes('bestehender Kandidat; nicht erneut geprüft'));
 }
 const conflict=records.find(r=>r.ref==='3:1'&&r.sourceIndex===14);
 for(const decision of require('../../tools/mishnah/kaufmann-lexical-decisions.json').decisions){
  const record=records.find(r=>r.ref===decision.ref&&r.sourceIndex===decision.wordIndex),p=await popup(record);
  assert.equal(p.word,record.form.word);assert.equal(p.analyses,1);
  assert(p.text.includes('רשאי')&&p.text.includes('berechtigt'),'rashai lemma and meaning displayed');
  assert(p.provenance.analysis.includes('Levy')&&p.provenance.analysis.includes('KI-Kontextprüfung'));
  assert(p.text.includes('Rabbinische Wörterbücher'),'direct Levy evidence displayed');
 }
 const automatic=records.find(r=>r.form.provenance?.analysis.kind==='interlinear-position');
 const automaticPopup=await popup(automatic);assert(automaticPopup.provenance.analysis.includes('eindeutiger Interlinearverknüpfung'));
 for(const [ref,index] of [['1:4',26],['4:2',10],['6:5',0],['9:1',4]]){
  const record=records.find(r=>r.ref===ref&&r.sourceIndex===index),p=await popup(record);
  assert.equal(record.form.provenance.analysis.compatibility,'reviewed-spelling-variant');
  assert(p.analyses>0&&p.text.includes('Schreibvariante positionsgenau geprüft'));
  assert(p.provenance.analysis.includes('Interlinear'));
 }
 const differing=records.find(r=>r.ref==='2:5'&&r.sourceIndex===16),differingPopup=await popup(differing);
 assert.equal(differingPopup.analyses,0);assert(differingPopup.text.includes('Verknüpfte Wortform weicht ab'));
 assert(conflict,'real manuscript/Accordance pointing conflict');
 const conflictPopup=await popup(conflict);
 assert.equal(conflictPopup.word,'אֵת','working text retains provisional Accordance tsere');
 assert(conflictPopup.text.includes('Offener Bildkonflikt'),'image segol/Accordance tsere disagreement stays visible');
 // Real page readings and the exact archive link remain a separate evidence layer.
 for(const state of ['clear','uncertain']){
  const r=records.find(r=>E.words[r.sourceId]?.reviewStatus===state);assert(r,'real '+state+' image scenario');
  const p=await popup(r);assert.equal(p.image,state);assert(p.readings>0);
  if(state==='clear'){
   const e=E.words[r.sourceId],folios=[...new Set([...(e.locations||[]),...(e.reviews||[])].map(x=>x.folio))];
   await js("document.querySelector('#mishnahMorphPopup [data-mhm-image]').click()");assert.equal(opened.at(-1),E.images[folios[0]].url);
  }
 }
 const r=scenarios.transferred;
 await js(`window.kpaSavedEvidence=window.MISHNAH_KAUFMANN_ACCORDANCE_IMAGE_DATA.words[${q(r.sourceId)}];window.MISHNAH_KAUFMANN_ACCORDANCE_IMAGE_DATA.words[${q(r.sourceId)}]={...window.kpaSavedEvidence,reviewStatus:'not-reviewed',reviews:[]}`);
 let p=await popup(r);assert(p.location&&!p.readings,'source location never promoted to visual review');
 await js(`window.MISHNAH_KAUFMANN_ACCORDANCE_IMAGE_DATA.words[${q(r.sourceId)}]=window.kpaSavedEvidence;window.kpaSavedHash=window.MISHNAH_KAUFMANN_ACCORDANCE_IMAGE_DATA.targetTextHash;window.MISHNAH_KAUFMANN_ACCORDANCE_IMAGE_DATA.targetTextHash='wrong'`);
 p=await popup(r);assert.equal(p.image,null,'wrong target hash rejects image evidence');
 await js("window.MISHNAH_KAUFMANN_ACCORDANCE_IMAGE_DATA.targetTextHash=window.kpaSavedHash");
 p=await popup(r,1);assert(p.text.includes('Punktierung nach Be’eri')&&!p.provenance.pointing,'old derivative retains own provenance label');
 p=await popup(r,2);assert(!p.provenance.pointing&&!p.image&&!p.text.includes('vorläufige Accordance-Punktierung'),'legacy never inherits derived evidence/provenance');
 // The split diplomatic abbreviation still yields two independently clickable cards.
 const split=records.find(r=>records.filter(s=>s.sourceId===r.sourceId).length>1);assert(split);
 for(const part of records.filter(r=>r.sourceId===split.sourceId)){const p=await popup(part);assert.equal(p.word,part.form.word);assert(p.image);}
 const savedHash=sources[0].textHash;sources[0].textHash='changed';await win.reload();
 await waitFor(`(()=>{const cells=[...document.querySelectorAll('#rOut .cell[data-mishnah-morph]')];return cells.some(c=>c.dataset.rel===${q(rels[0])}&&c.dataset.mishnahMorphState==='source-mismatch'&&!c.querySelector('.mhw'))&&${q(rels.slice(1))}.every(rel=>cells.some(c=>c.dataset.rel===rel&&c.querySelector('.mhw')));})()`,'edition-specific source hash refusal');
 sources[0].textHash=savedHash;await win.reload();await waitFor("document.querySelector('#rOut .cell[data-mishnah-morph-ready]')",'restored source');await chapter(1);
 await js("document.querySelector('#ilBtn').click()");await waitFor("!document.querySelector('#ilPop').hidden",'witness menu');await js("document.querySelector('#ilPop [data-a=none]').click()");
 await waitFor("!document.querySelector('#rOut .mci-grid')&&document.querySelector('#rOut .mhw')",'plain source view');
 const plain=await js(`(()=>{const c=[...document.querySelectorAll('#rOut .row[data-l="1"] .cell')].find(c=>c.dataset.rel===${q(rels[0])});return {words:[...c.querySelectorAll('.mhw')].map(w=>w.textContent),open:c.querySelectorAll('.kpt-open').length};})()`);
 assert.deepEqual(plain.words,M.tokens(A.units['1:1'].offsetText).map(t=>t.word));assert.equal(plain.open,A.units['1:1'].words.filter(w=>w.pointingStatus==='open').length);
 console.log('Electron Accordance: '+units+' units, '+sourceWords+' diplomatic words, '+cards+' cards, '+pointingOpen+' open positions, '+witnessWords+' D/P/C tokens; old derivative/legacy coexistence, provenance, real image evidence, split cards, plain view and isolated hash refusal passed.');
};
