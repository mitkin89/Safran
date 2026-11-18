'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async({win,js,waitFor,book})=>{
 await book('Genesis');await waitFor("document.querySelector('#rTitle').textContent.includes('Genesis')",'Genesis für Samaritanus');
 await js("if(!document.querySelector('#textcritPanel').hidden)document.querySelector('#tcClose').click();if(!document.querySelector('#formsPanel').hidden)document.querySelector('#fmClose').click();document.querySelector('#rSection').value='0';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"1\"] .w')",'MT für Interlinear');
 await js("document.querySelector('#ilBtn').click()");await waitFor("document.querySelector('#ilPop input[value=Samaritan]')",'Samaritanus auswählbar');
 await js("{const c=document.querySelector('#ilPop input[value=Samaritan]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#ilBtn').click();}");
 await waitFor("document.querySelector('#rOut .ilt[data-tr=Samaritan] .smr-word')",'Samaritanus unter dem MT');
 assert(await js("document.querySelector('#rOut .row[data-l=\"1\"] .cell[data-k=he]').querySelectorAll('.w').length===7"),'Keine fremden Wortmarker im MT-Index');
 await js("window.getSelection().removeAllRanges();[...document.querySelectorAll('#rOut .row[data-l=\"1\"] .smr-word')].find(w=>w.textContent==='ברא').click()");
 await waitFor("document.querySelector('#wpop.samaritan-word')?.textContent.includes('Qal')",'Eigene samaritanische Morphologie aus Interlinear');await js("document.querySelector('#wpop .wx').click()");
 await js("[...document.querySelectorAll('#rOut .row[data-l=\"12\"] .smr-word')].find(w=>w.textContent==='ותוציא').click()");
 await waitFor("document.querySelector('#wpop.samaritan-word')",'Geänderte Tal-Form im Interlinear');
 assert(await js("!document.querySelector('#wpop .wseg')"),'Keine OSHB-Morphologie auf geänderte Tal-Lesart übertragen');await js("document.querySelector('#wpop .wx').click()");
 await js("document.querySelector('#rSection').value='1';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("[...document.querySelectorAll('#rOut .row[data-l=\"2\"] .smr-word')].some(w=>w.textContent==='הששי'&&w.querySelector('.mt-diff'))",'Originale rote Tal-Markierung');
 if(process.env.SAFRAN_SMR_IL_CAPTURE){await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");fs.writeFileSync(process.env.SAFRAN_SMR_IL_CAPTURE,(await win.webContents.capturePage()).toPNG());}
 // A formerly open note now uses the checked source-word positions.
 await js("document.querySelector('#rSection').value='7';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"19\"] .w')",'Genesis 8 für Apparat');
 await js("document.querySelector('#tcBtn').click()");
 await waitFor("!document.querySelector('#textcritPanel').hidden",'Apparat öffnen');
 await js("{const c=document.querySelector('#tcSmr');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#rOut .row[data-l=\"19\"] .txt').click()");
 await waitFor("document.querySelector('#tcBody .tc-entry[data-alignment=\"samaritan-interlinear\"][data-tc-ref=\"Genesis 8:19\"]')",'Zuvor offene SMR-Anmerkung zugeordnet');
 assert(await js("document.querySelector('#tcBody .tc-entry[data-alignment=\"samaritan-interlinear\"]')?.closest('.tc-locus')?.dataset.start==='0'"),'Apparat nutzt genaue MT-Wortposition');
 await js("document.querySelector('#tcClose').click()");
 await book('Exodus');await waitFor("document.querySelector('#rTitle').textContent.includes('Exodus')",'Exodus');
 // This test profile may only have the German Exodus; select the MT fixture when available.
 await waitFor("document.querySelector('#rSection option[value=\"19\"]')",'Exodus-Kapitel');
 await js("document.querySelector('#rSection').value='19';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
 await waitFor("document.querySelector('#rOut .row[data-l=\"12\"] .smr-word[data-smr-ref=\"Exodus 20:11\"]')",'Tal 20:11 am MT 20:12');
 await js("document.querySelector('#ilBtn').click();document.querySelector('#ilPop input[value=Samaritan]').checked=false;document.querySelector('#ilPop input[value=Samaritan]').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#ilBtn').click()");
 await waitFor("!document.querySelector('#rOut .smr-word')",'Samaritanus ausblenden');
 console.log('Electron: Samaritanus-Interlinear, unveränderte MT-Indizes, eigene Morphologie, rote Tal-Zeichen, geänderte Formen und Verszählung bestanden.');
};
