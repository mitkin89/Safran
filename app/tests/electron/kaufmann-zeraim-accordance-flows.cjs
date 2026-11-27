'use strict';
// Provisional pointing + existing interlinear analysis candidates. This test does
// not certify manuscript pointing or turn absent witness coverage into a gap.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../../mishnah-morph'),P=require('../../kaufmann-pointing'),{ipcMain}=require('electron');
module.exports=async({docs,win,js,waitFor,book})=>{
 const catalogContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../mishnah-accordance-catalog.js'),'utf8'),catalogContext);
 const opened=[];ipcMain.handle('open:external',(_event,url)=>{opened.push(url);return true;});
 const catalog=catalogContext.window.MISHNAH_ACCORDANCE_CATALOG,q=JSON.stringify,totals={titles:0,chapters:0,units:0,cards:0,sourceWords:0,witnessWords:0,pointingOpen:0};
 const selectedTitles=process.env.SAFRAN_SMOKE_KAUFMANN_ACCORDANCE_TITLES?.split('|'),titles=Object.keys(catalog).filter(t=>t!=='Mishnah Berakhot'&&(!selectedTitles||selectedTitles.includes(t)));assert(titles.length>0,'provisional tractate catalog populated');
 for(const title of titles){
  const item=catalog[title];assert(item,'catalog entry '+title);
  const A=require('../../'+item.file),source=[...docs.values()].find(d=>d.entry.title===title&&d.entry.rel===item.rel);
  assert(source,'bundled provisional edition '+title);assert.equal(A.title,title);assert.equal(source.textHash,A.source.textHash);
  await book(title);await waitFor(`document.querySelector('#rTitle').textContent.includes(${q(title)})`,title);
  await waitFor(`[...document.querySelectorAll('#verList input')].some(c=>c.dataset.rel===${q(item.rel)}&&c.checked)`,'provisional edition preferred '+title);
  // Keep one visible reading edition so each diplomatic/card position is counted once.
  for(let attempts=0;attempts<16;attempts++){
   const change=await js(`[...document.querySelectorAll('#verList input')].map(c=>({rel:c.dataset.rel,checked:c.checked,want:c.dataset.rel===${q(item.rel)}})).find(c=>c.want&&!c.checked)||[...document.querySelectorAll('#verList input')].map(c=>({rel:c.dataset.rel,checked:c.checked,want:c.dataset.rel===${q(item.rel)}})).find(c=>!c.want&&c.checked)`);
   if(!change)break;
   await js(`{const c=[...document.querySelectorAll('#verList input')].find(c=>c.dataset.rel===${q(change.rel)});c.click();}new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  }
  await waitFor(`window.MISHNAH_TEXTCRIT_BOOKS?.[${q(title)}]`,'diplomatic source loaded '+title);
  const witnessCounts=await js(`Object.fromEntries(Object.entries(window.MISHNAH_TEXTCRIT_BOOKS[${q(title)}].witnesses).map(([s,w])=>[s,Object.keys(w.units).length]))`),expectedSigs=['D',...['P','C'].filter(s=>witnessCounts[s]>0)];
  let counted={units:0,cards:0,sourceWords:0,witnessWords:0,pointingOpen:0};
  async function chapter(c){
   const refs=Object.keys(A.units).filter(r=>Number(r.split(':')[0])===c);
   await js(`{const section=document.querySelector('#rSection');section.value='${c-1}';section.dispatchEvent(new Event('change',{bubbles:true}));}`);
   try{await waitFor(`(()=>{const cells=[...document.querySelectorAll('#rOut .cell[data-rel]')].filter(c=>c.dataset.rel===${q(item.rel)});return cells.length===${refs.length}&&cells.every(c=>c.dataset.mishnahMorphReady==='1');})()`,'source-bound cards '+title+' chapter '+c);}catch(error){console.error('Card diagnostic',JSON.stringify(await js(`(()=>{const d=window[${q(item.global)}],out=[];for(const cell of [...document.querySelectorAll('#rOut .cell[data-rel]')].filter(c=>c.dataset.rel===${q(item.rel)}&&c.dataset.mishnahMorphReady!=='1')){const m=Number(cell.closest('.row').dataset.l),txt=cell.querySelector('.txt'),walk=document.createTreeWalker(txt,NodeFilter.SHOW_TEXT);let text='';for(let n;(n=walk.nextNode());)text+=n.parentElement.closest('small,sup,.note,.footnote,a.aref,.aref,.mci-labels,.mci-witness,.mci-open,.mci-insertion,.mci-note,.mci-coverage-notice,.mci-unbased-notice')&&!n.parentElement.closest('.mci-note .mci-base-word[data-vocalized-word]')?' ':n.nodeValue;const got=window.MishnahMorph.tokens(text).map(t=>t.word),want=d.sources[${q(title)}].chapters[${c-1}][m-1].map(id=>d.forms[id].word),i=want.findIndex((w,i)=>w!==got[i]);out.push({m,state:cell.dataset.mishnahMorphState,got:got.length,want:want.length,first:i,contextGot:got.slice(Math.max(0,i-2),i+4),contextWant:want.slice(Math.max(0,i-2),i+4)});}return out;})()`)));throw error;}
  }
  const chapters=[...new Set(Object.keys(A.units).map(r=>Number(r.split(':')[0])))].sort((a,b)=>a-b);
  for(const c of chapters){
   await chapter(c);
   const got=await js(`(()=>{
    const title=${q(title)},rel=${q(item.rel)},d=window[${q(item.global)}],original=window.MISHNAH_TEXTCRIT_BOOKS[title],counts={units:0,cards:0,sourceWords:0,witnessWords:0,pointingOpen:0,sigs:[]};
    for(const cell of [...document.querySelectorAll('#rOut .cell[data-rel]')].filter(c=>c.dataset.rel===rel)){
     const m=Number(cell.closest('.row').dataset.l),ref='${c}:'+m,u=d.units[ref],tokens=window.MishnahMorph.tokens(u.offsetText),ids=d.sources[title].chapters[${c-1}][m-1],cards=[...cell.querySelectorAll('.mhw')],base=[...cell.querySelectorAll('.mci-base-word')];
     if(cell.dataset.mciEdition!==d.edition)throw Error('Edition marker '+title+' '+ref);
     if(cards.length!==ids.length||cards.some((w,i)=>w.textContent!==d.forms[ids[i]].word||w.getAttribute('role')!=='button'||w.tabIndex!==0))throw Error('Exact card positions '+title+' '+ref);
     if(base.length!==u.words.length||base.some((w,i)=>w.textContent!==u.words[i].text))throw Error('Diplomatic words '+title+' '+ref);
     for(let i=0;i<cards.length;i++){const sourceIndex=u.words.findIndex(w=>w.start<=tokens[i].start&&w.end>=tokens[i].end);if(sourceIndex<0||cards[i].dataset.kaufmannWord!==u.id+'/word/'+sourceIndex)throw Error('Card source ID '+title+' '+ref+'#'+i);}
     const open=cell.querySelectorAll('.mci-base-word[data-pointing-status="open"]').length;
     if(open!==u.words.filter(w=>w.pointingStatus==='open').length)throw Error('Pointing-open count '+title+' '+ref);
     for(const w of cell.querySelectorAll('.mci-word[data-tc-mishnah-word]')){
      const sig=w.dataset.tcMishnah.split('|')[0],[r,i]=w.dataset.tcMishnahWord.split('|'),source=original.witnesses[sig==='D'?'K':sig]?.units[r]?.words[Number(i)],copy=w.cloneNode(true);copy.querySelectorAll('sup').forEach(s=>s.remove());
      if(!source||copy.textContent!==source.text)throw Error('Original witness token '+title+' '+sig+' '+r+'#'+i);
      counts.witnessWords++;if(!counts.sigs.includes(sig))counts.sigs.push(sig);
     }
     counts.units++;counts.cards+=cards.length;counts.sourceWords+=base.length;counts.pointingOpen+=open;
    }
    return counts;
   })()`);
   for(const key of Object.keys(counted))counted[key]+=got[key];
   for(const sig of got.sigs)assert(expectedSigs.includes(sig),'only available witnesses '+title+' '+sig);
   totals.chapters++;
  }
  assert.equal(counted.units,Object.keys(A.units).length,title+' units');assert.equal(counted.cards,A.forms.length,title+' lexical cards');
  assert.equal(counted.sourceWords,Object.values(A.units).reduce((n,u)=>n+u.words.length,0),title+' diplomatic words');
  assert.equal(counted.pointingOpen,Object.values(A.units).reduce((n,u)=>n+u.words.filter(w=>w.pointingStatus==='open').length,0),title+' open pointing positions');
  if(title==='Mishnah Pesachim'){
   await chapter(8);const note=await js(`(()=>{const c=[...document.querySelectorAll('#rOut .row[data-l="6"] .cell[data-rel]')].find(c=>c.dataset.rel===${q(item.rel)});return {main:c.querySelectorAll('.mci-grid .mci-base-word').length,notes:c.querySelectorAll('.mci-note .mci-base-word').length,noteCards:c.querySelectorAll('.mci-note .mhw').length,label:c.querySelector('.mci-note summary')?.textContent};})()`);
   assert.equal(note.main,73);assert.equal(note.notes,9);assert.equal(note.noteCards,9);assert(note.label.includes('Randkommentar'),'source commentary remains labelled separately from the Mishnah body');
   await js("document.querySelector('#ilBtn').click()");await waitFor("!document.querySelector('#ilPop').hidden",'Pesachim plain-view menu');await js("document.querySelector('#ilPop [data-a=none]').click()");
   await waitFor(`(()=>{const cell=[...document.querySelectorAll('#rOut .row[data-l="6"] .cell[data-rel]')].find(c=>c.dataset.rel===${q(item.rel)});return cell&&!cell.querySelector('.mci-grid')&&cell.dataset.mishnahMorphReady==='1';})()`,'Pesachim source-bound plain commentary cards');
   const plain=await js(`(()=>{const cell=[...document.querySelectorAll('#rOut .row[data-l="6"] .cell[data-rel]')].find(c=>c.dataset.rel===${q(item.rel)}),note=cell.querySelector('aside.mci-note.kpt-source-note');return {main:[...cell.querySelectorAll('.kpt-word')].filter(w=>!w.closest('.mci-note')).length,notes:note?.querySelectorAll('.mci-base-word[data-vocalized-word]').length,noteCards:note?.querySelectorAll('.mhw').length,label:note?.querySelector('.kpt-note-label')?.textContent,cards:[...cell.querySelectorAll('.mhw')].map(w=>({word:w.textContent,id:w.dataset.kaufmannWord})),html:cell.innerHTML,noteIndices:[...(note?.querySelectorAll('[data-vocalized-word]')||[])].map(w=>w.dataset.vocalizedWord)};})()`);
   if(!plain.notes)console.error('Plain commentary diagnostic',plain.html);
   assert.equal(plain.main,73);assert.equal(plain.notes,9);assert.equal(plain.noteCards,9);assert.equal(plain.label,'Randkommentar (Quelle)');
   assert.deepEqual(plain.noteIndices,Array.from({length:9},(_,i)=>'8:6|'+(73+i)),'plain commentary preserves exact diplomatic positions');
   assert.deepEqual(plain.cards,M.tokens(A.units['8:6'].offsetText).map((token,i)=>{const n=A.units['8:6'].words.findIndex(w=>w.start<=token.start&&w.end>=token.end);return {word:A.forms[A.sources[title].chapters[7][5][i]].word,id:A.units['8:6'].id+'/word/'+n};}),'plain main and commentary cards retain exact source IDs and words');
   await js("document.querySelector('#ilPop [data-a=all]').click()");await waitFor("document.querySelector('#rOut .mci-grid')",'restored Pesachim interlinear');await js("document.querySelector('#ilBtn').click()");await chapter(8);
   console.log('Pesachim 8:6 plain and interlinear: 73 main words, 9 labelled commentary words and exact source-bound cards.');
  }
  if(title==='Mishnah Moed Katan'){
   await chapter(1);await js(`document.querySelector('#mishnahMorphPopup .mhm-close')?.click();[...document.querySelectorAll('#rOut .row[data-l="1"] .cell[data-rel]')].find(c=>c.dataset.rel===${q(item.rel)}).querySelectorAll('.mhw')[2].click()`);await waitFor('document.querySelector("#mishnahMorphPopup")','irrigation-field morphology');
   const p=await js(`(()=>{const p=document.querySelector('#mishnahMorphPopup');return {word:p.querySelector('.mhm-word').textContent,text:p.textContent,analyses:p.querySelectorAll('.mhm-analysis').length};})()`);assert.equal(p.word,A.forms[A.sources[title].chapters[0][0][2]].word);assert.equal(p.analyses,1);assert(p.text.includes('Bewässer')&&p.text.includes('Nomen')&&p.text.includes('Artikel')&&p.text.includes('Pl.'),'article + masculine plural noun and contextual gloss rendered');assert(p.text.includes('Jastrow'));assert(!p.text.includes('Für dieses Wort liegt keine zugeordnete Bestimmung vor.'));await js("document.querySelector('#mishnahMorphPopup .mhm-close').click()");
   console.log('Moed Katan 1:1 hash-shelahim: article+noun masculine plural, contextual irrigation gloss, Jastrow evidence, immutable text.');
  }
  // Current compact source labels retain the complete provisional caution.
  const labels=await js(`(()=>{const g=[...document.querySelectorAll('#rOut .cell[data-rel]')].find(c=>c.dataset.rel===${q(item.rel)}).querySelector('.mci-grid'),l=g.querySelector('.mci-labels'),label=l.querySelector('.tc-witness-label');return {text:label.textContent,title:label.title,width:l.getBoundingClientRect().width,grid:g.getBoundingClientRect().width};})()`);
  assert.equal(labels.text,'Kaufmann · Accordance (vorl.)');assert(labels.title.includes('nicht am Manuskript geprüft'));assert(labels.width>0&&labels.width<=labels.grid*.27);
  // Source locations and any actual image observations stay separate from pointing.
  const records=[];for(const [ref,u] of Object.entries(A.units)){const [c,m]=ref.split(':').map(Number),ids=A.sources[title].chapters[c-1][m-1];M.tokens(u.offsetText).forEach((token,i)=>{const sourceIndex=u.words.findIndex(w=>w.start<=token.start&&w.end>=token.end);assert(sourceIndex>=0);assert.equal(P.stripPointing(u.words[sourceIndex].text),P.stripPointing(u.words[sourceIndex].originalWord));records.push({c,m,i,ref,sourceId:u.id+'/word/'+sourceIndex,form:A.forms[ids[i]],word:u.words[sourceIndex]});});}
  const featureIds=await js(`(()=>{const item=window.MISHNAH_ACCORDANCE_CATALOG[${q(title)}],images=window[item.imageGlobal];return Object.entries(images?.words||{}).filter(([id,e])=>(e.reviews||[]).some(r=>window.LibraryMishnahMorph.observedFeatures(e.originalWord,r.observedFeatures).length)).map(([id])=>id);})()`);
  const scenarios=[records.find(r=>r.form.analyses.length),records.find(r=>!r.form.analyses.length),records.find(r=>r.word.pointingStatus==='open'),records.find(r=>featureIds.includes(r.sourceId)),records.find(r=>r.form.provenance?.pointing.divisionNote),records.find(r=>r.form.status==='partial'),records.find(r=>r.form.morphologyWordGroup)].filter(Boolean);
  assert(scenarios.some(r=>r.form.analyses.length),'some existing analysis candidates '+title);
  for(const r of scenarios){
   await chapter(r.c);await js(`document.querySelector('#mishnahMorphPopup .mhm-close')?.click();[...document.querySelectorAll('#rOut .row[data-l="${r.m}"] .cell[data-rel]')].find(c=>c.dataset.rel===${q(item.rel)}).querySelectorAll('.mhw')[${r.i}].click()`);
   await waitFor('document.querySelector("#mishnahMorphPopup")','candidate popup '+title);
   const p=await js(`(()=>{const p=document.querySelector('#mishnahMorphPopup'),item=window.MISHNAH_ACCORDANCE_CATALOG[${q(title)}],images=window[item.imageGlobal],e=images?.words?.[${q(r.sourceId)}],folios=e?[...new Set([...(e.locations||[]),...(e.reviews||[])].map(l=>l.folio))]:[];return {word:p.querySelector('.mhm-word').textContent,text:p.textContent,analyses:p.querySelectorAll('.mhm-analysis').length,provenance:Object.fromEntries([...p.querySelectorAll('[data-provenance]')].map(x=>[x.dataset.provenance,x.textContent])),images:p.querySelectorAll('.mhm-image-source').length,imageReadings:p.querySelectorAll('.mhm-image-reading').length,imageFeatures:p.querySelectorAll('.mhm-image-feature').length,locationOnly:!!p.querySelector('.mhm-image-location-only'),imageButtons:p.querySelectorAll('[data-mhm-image]').length,expectedImage:item.imageFile?{exists:!!e,status:e?.reviewStatus,readings:(e?.reviews||[]).length,features:(e?.reviews||[]).reduce((n,r)=>n+window.LibraryMishnahMorph.observedFeatures(e.originalWord,r.observedFeatures).length,0),fullPointingVerified:!!e?.fullPointingVerified||(e?.reviews||[]).some(r=>r.fullPointingVerified===true&&r.status==='clear'),firstURL:images?.images?.[folios[0]]?.url}:null};})()`);
   assert.equal(p.word,r.form.word);assert.equal(p.analyses,r.form.analyses.length);if(r.form.status==='partial')assert(p.text.includes('Teilbestimmung')&&p.text.includes('Wortart im Kontext offen'));if(r.form.morphologyWordGroup)assert(p.text.includes('Die Bestimmung gehört zur ganzen Wortgruppe.'));
   if(p.expectedImage){assert(p.expectedImage.exists,'exact diplomatic image source '+title);assert.equal(p.images,1);assert.equal(p.imageReadings,p.expectedImage.readings);assert.equal(p.imageFeatures,p.expectedImage.features);if(p.imageFeatures){assert(p.text.includes('Einzelzeichen')&&p.text.includes('bestätigen nicht die vollständige Wortpunktierung'));if(!p.expectedImage.fullPointingVerified)assert.notEqual(p.expectedImage.status,'clear','partial feature never certifies whole word');}assert.equal(p.locationOnly,p.expectedImage.readings===0,'source location never promoted to visual reading '+title);if(p.expectedImage.status==='not-reviewed')assert.equal(p.imageReadings,0);if(p.expectedImage.firstURL)assert(p.imageButtons>0,'exact manuscript source link present '+title);if(p.imageButtons){await js("document.querySelector('#mishnahMorphPopup [data-mhm-image]').click()");assert.equal(opened.at(-1),new URL(p.expectedImage.firstURL).href);}}else assert.equal(p.images,0,'no image source invented '+title);
   assert(p.text.includes('vorläufige Accordance-Punktierung'));for(const kind of ['pointing','analysis','translation'])assert(p.provenance[kind]?.includes(r.form.provenance[kind].source),kind+' source '+title);
   assert.equal(p.text.includes('Punktierung offen'),r.word.pointingStatus==='open');if(r.form.provenance?.pointing.divisionNote)assert(p.provenance.pointing.includes(r.form.provenance.pointing.divisionNote),'original/projection division note shown '+title);
  }
  await js("document.querySelector('#mishnahMorphPopup .mhm-close')?.click();document.querySelector('#ilBtn').click()");await waitFor("!document.querySelector('#ilPop').hidden",'available witness choices '+title);
  const picks=await js("[...document.querySelectorAll('#ilPop input')].map(i=>i.value)");assert.deepEqual(picks.sort(),['K',...expectedSigs].sort(),'only available witnesses offered '+title);
  await js("document.querySelector('#ilBtn').click()");
  // Rebinding the same edition to a different hash must refuse word cards.
  const savedHash=source.textHash;source.textHash='changed';await win.reload();
  await waitFor(`(()=>{const c=[...document.querySelectorAll('#rOut .cell[data-rel]')].find(c=>c.dataset.rel===${q(item.rel)});return c&&c.dataset.mishnahMorphState==='source-mismatch'&&!c.querySelector('.mhw');})()`,'hash mismatch refusal '+title);
  source.textHash=savedHash;await win.reload();await waitFor(`document.querySelector('#rTitle').textContent.includes(${q(title)})`,'restored source '+title);await chapter(chapters[0]);
  for(const key of Object.keys(counted))totals[key]+=counted[key];totals.titles++;
  console.log('Electron provisional Accordance '+title+': '+counted.units+' units, '+counted.cards+' cards, exact original witness positions and separate provenance; source locations and actual image observations remain distinct.');
 }
 console.log('Electron provisional Mishnah totals: '+JSON.stringify(totals));
};
