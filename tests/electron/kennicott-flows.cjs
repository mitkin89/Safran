'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor,book})=>{
  await book('Genesis');
  await js("document.querySelector('#rSection').value='0';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}));for(const id of ['tcSmr','tcTov','tcDss']){document.getElementById(id).checked=false;document.getElementById(id).dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#tcKen').checked=true;document.querySelector('#tcKen').dispatchEvent(new Event('change',{bubbles:true}));if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click();document.querySelector('#rOut .row[data-l=\"2\"] .txt').click()");
  await waitFor("document.querySelector('#tcBody .tc-ken-entry')?.textContent.includes('Kennicott')",'Kennicott Genesis in echter Oberfläche');
  assert(await js("[...document.querySelectorAll('#tcBody .tc-ken-entry')].some(e=>e.textContent.includes('תוהו')&&e.textContent.includes('K 9'))"));
  assert(await js("[...document.querySelectorAll('#tcBody .tc-ken-entry')].some(e=>e.textContent.includes('Auslassung')&&e.textContent.includes('K 665'))"));
  await js("{const el=document.querySelector('#tcBody [data-ken-id=\"gen-app-4\"] .tal-cite');el.focus({preventScroll:true});el.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));}");
  await waitFor("document.querySelector('#tcHover')?.textContent.includes('kein vollständiger Handschriftentext')",'Kennicott-Editionskontext beim Fokus');
  assert(await js("document.querySelector('#tcHover .tc-ken-witness')?.title.includes('Handschrift')"));
  await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));document.querySelector('#tcBody [data-ken-id=\"gen-app-4\"]').closest('.tc-locus').querySelector('.tc-mt-jump').click()");
  await waitFor("document.querySelector('#rOut .tc-mt-selected')?.textContent.replace(/[^א-ת]/g,'')==='תהו'",'Kennicott-Anker markiert das MT-Wort');
  await js("document.querySelector('#tcWhole').click()");
  await waitFor("document.querySelectorAll('#tcBody .tc-ken-entry').length>20",'Kennicott Kapitelapparat');
  assert(await js("document.querySelectorAll('#tcBody [data-ken-id=\"gen-app-4\"]').length===1"),'Keine doppelten Einträge in Kapitelansicht');
  if(process.env.SAFRAN_KEN_CAPTURE){await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");fs.writeFileSync(process.env.SAFRAN_KEN_CAPTURE,(await win.webContents.capturePage()).toPNG());}
  await js("document.querySelector('#tcKen').checked=false;document.querySelector('#tcKen').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("!document.querySelector('#tcBody .tc-ken-entry')",'Kennicott-Filter');
  assert.equal(await js("localStorage.getItem('tcKen')"),'0');
  console.log('Electron: Kennicott Genesis, Siglen, Editionskontext, MT-Anker, Kapitelansicht und Filter bestanden.');
};
