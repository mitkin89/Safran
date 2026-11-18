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
  const point=await js(`{const r=${target}.getBoundingClientRect();({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}`);
  win.webContents.sendInputEvent({type:'mouseMove',...point});
  await waitFor("document.querySelector('#tcHover .tc-dss-context')?.textContent.includes('יומם')",'Originaler Rollen-Kontext bei echtem Hover');
  assert(await js("document.querySelector('#tcHover').textContent.includes('4Q7')&&document.querySelector('#tcHover').textContent.includes('moderne Rekonstruktion')&&document.querySelector('#tcHover .tc-dss-active')"));
  if(process.env.SAFRAN_DSS_CAPTURE){await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");fs.writeFileSync(process.env.SAFRAN_DSS_CAPTURE,(await win.webContents.capturePage()).toPNG());}
  await js(`${target}.click()`);
  await waitFor("document.querySelector('#wpop')?.textContent.includes('Partikel')&&document.querySelector('#wpop')?.textContent.includes('4Q7')",'Vorhandene Abegg-Morphologie mit Quellenposition');
  await js("document.querySelector('#wpop .wx').click();document.querySelector('#tcDss').checked=false;document.querySelector('#tcDss').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("!document.querySelector('#tcBody .tc-dss-entry, #tcBody .tc-dss-coverage')",'DSS separat ausblenden');
  await js("document.querySelector('#tcDss').checked=true;document.querySelector('#tcDss').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#tcWhole').click()");
  await waitFor("document.querySelectorAll('#tcBody .tc-dss-entry').length>10",'DSS-Befunde im ganzen Genesis-Kapitel');
  assert(await js("document.querySelectorAll('#tcBody details,#tcBody summary').length===0&&localStorage.getItem('tcDss')==='1'"));
  await js("document.querySelector('#tcClose').click()");
  console.log('Electron: Genesis-DSS, echte Handschriftensiglen, MT-Wortgruppen, Quellzeichen/Hover, Morphologie, Filter und Kapitelansicht bestanden.');
};
