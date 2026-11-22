'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor,book})=>{
  await book('Genesis');
  await waitFor("document.querySelector('#rSection option[value=\"0\"]')",'Genesis für DSS');
  await js("document.querySelector('#rSection').value='0';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}));for(const id of ['tcSmr','tcTov']){document.getElementById(id).checked=false;document.getElementById(id).dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#tcDss').checked=true;document.querySelector('#tcDss').dispatchEvent(new Event('change',{bubbles:true}));if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click()");
  await waitFor("document.querySelector('#rOut .row[data-l=\"5\"]')",'Genesis 1 für DSS geladen');
  await js("document.querySelector('#rOut .row[data-l=\"5\"] .txt').click()");
  await waitFor("[...document.querySelectorAll('#tcBody .tc-dss-word')].some(n=>n.textContent==='יומם')",'4Q7-Lesart in Genesis 1:5');
  const target="[...document.querySelectorAll('#tcBody .tc-dss-word')].find(n=>n.textContent==='יומם')";
  assert(await js(`{const w=${target},g=w.closest('.tc-locus');g.dataset.kind==='word'&&g.querySelector('.tc-locus-title').textContent.replace(/[^א-ת]/g,'')==='יום'&&w.closest('.tc-dss-entry').dataset.scroll==='4Q7'}`),'Actual DSS reading is grouped under the correct MT word');
  assert(await js("document.querySelector('#tcBody').textContent.includes('Maschineller MT-Vergleich')&&document.querySelector('#tcBody .tc-dss-coverage')"));
  await js(`${target}.scrollIntoView({block:'center'})`);await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
  // Hovering the scroll word shows nothing; the scroll label opens the fragment context with the word marked.
  {const p=await js(`{const r=${target}.getBoundingClientRect();({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}`);win.webContents.sendInputEvent({type:'mouseMove',...p});await new Promise(r=>setTimeout(r,500));assert(!(await js("document.querySelector('#tcHover')")),'Kein Hover am Rollenwort');}
  const label=`${target}.closest('.tc-dss-entry').querySelector('.tc-source')`;
  const point=await js(`{const r=${label}.getBoundingClientRect();({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}`);
  win.webContents.sendInputEvent({type:'mouseMove',...point});
  await waitFor("document.querySelector('#tcHover .tc-dss-context')?.textContent.includes('יומם')",'Originaler Rollen-Kontext beim Überfahren der Sigle');
  assert(await js("document.querySelector('#tcHover .tc-dss-active')?.textContent.includes('יומם')"),'Rollenwort im Kontext markiert');
  assert(await js("document.querySelector('#tcHover').textContent.includes('4Q7')&&document.querySelector('#tcHover').textContent.includes('moderne Rekonstruktion')&&document.querySelector('#tcHover .tc-dss-active')"));
  if(process.env.SAFRAN_DSS_CAPTURE){await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");fs.writeFileSync(process.env.SAFRAN_DSS_CAPTURE,(await win.webContents.capturePage()).toPNG());}
  await js(`${target}.click()`);
  await waitFor("document.querySelector('#wpop')?.textContent.includes('Partikel')&&document.querySelector('#wpop')?.textContent.includes('4Q7')",'Vorhandene Abegg-Morphologie mit Quellenposition');
  await js("document.querySelector('#wpop .wx').click();document.querySelector('#tcDss').checked=false;document.querySelector('#tcDss').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("!document.querySelector('#tcBody .tc-dss-entry, #tcBody .tc-dss-coverage')",'DSS separat ausblenden');
  await js("document.querySelector('#tcDss').checked=true;document.querySelector('#tcDss').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#tcWhole').click()");
  await waitFor("document.querySelectorAll('#tcBody .tc-dss-entry').length>10",'DSS-Befunde im ganzen Genesis-Kapitel');
  assert(await js("document.querySelectorAll('#tcBody details,#tcBody summary').length===0&&localStorage.getItem('tcDss')==='1'"));
  await js("document.querySelector('#rOut .row[data-l=\"9\"] .txt').click()");
  await waitFor("document.querySelector('#tcPlace').textContent.includes('Genesis 1:9')&&document.querySelector('#tcBody [data-alignment=interlinear]')",'Vorhandene Interlinear-Zuordnung im Apparat');
  assert(await js("{const e=[...document.querySelectorAll('#tcBody .tc-dss-entry[data-scroll=\"4Q7\"]')].find(n=>n.textContent.includes('לשמים'));e?.dataset.alignment==='interlinear'&&e.closest('.tc-locus').dataset.start==='5'&&e.querySelector('.tal-cite').title.includes('Interlinear (maschinell)')}"),'Illustrated לשמים now belongs to its MT word');
  await js("document.querySelector('#rOut .row[data-l=\"10\"] .txt').click()");
  await waitFor("document.querySelector('#tcPlace').textContent.includes('Genesis 1:10')&&document.querySelector('#tcBody .tc-dss-coverage')",'Gleichlautende unsichere Lesung');
  assert(await js("![...document.querySelectorAll('#tcBody .tc-dss-entry[data-scroll=\"4Q2\"]')].some(n=>n.textContent.replace(/[^א-ת]/g,'').includes('קרא'))"),'קרא agreement is not listed as a variant');
  await js("document.querySelector('#rSection').value='3';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("document.querySelector('#rOut .row[data-l=\"2\"]') && document.querySelector('#rSection').value==='3'",'Genesis 4 für Zeichenanzeige');
  await js("document.querySelector('#rOut .row[data-l=\"2\"] .txt').click()");
  await waitFor("[...document.querySelectorAll('#tcBody .tc-dss-coverage-source')].some(n=>n.textContent==='4Q2 f3i')",'Originalkontext trotz ausgeblendeter gleichlautender Unsicherheiten');
  const readable="[...document.querySelectorAll('#tcBody .tc-dss-coverage-source')].find(n=>n.textContent==='4Q2 f3i')";
  await js(`${readable}.scrollIntoView({block:'center'})`);await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
  const rp=await js(`{const r=${readable}.getBoundingClientRect();({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}`);
  win.webContents.sendInputEvent({type:'mouseMove',...rp});
  await waitFor("document.querySelector('#tcHover .tc-dss-context')?.textContent.includes('ללדת')",'Lesbare Rollen-Vorschau');
  assert(await js("[...document.querySelectorAll('#tcHover .tc-dss-token')].find(n=>n.textContent==='ללדת')?.querySelector('.tc-dss-unc')?.textContent==='ת'"),'Only the uncertain source letter is marked in context');
  assert(await js("!document.querySelector('#tcHover .tc-dss-context').textContent.includes('#')&&document.querySelector('#tcHover .tc-dss-rec')&&document.querySelector('#tcHover b').title.includes('ללדת#')"),'Original notation is retained while reader text is clean');
  if(process.env.SAFRAN_DSS_READABLE_CAPTURE){await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");fs.writeFileSync(process.env.SAFRAN_DSS_READABLE_CAPTURE,(await win.webContents.capturePage()).toPNG());}
  await js("document.querySelector('#tcClose').click()");
  console.log('Electron: Genesis-DSS, echte Handschriftensiglen, MT-Wortgruppen, Quellzeichen/Hover, Morphologie, Filter und Kapitelansicht bestanden.');
};
